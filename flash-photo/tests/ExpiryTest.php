<?php

declare(strict_types=1);

namespace FlashPhoto\Tests;

use FlashPhoto\NotFoundException;

final class ExpiryTest extends TestCase
{
    public function testViewingMetadataDoesNotStartCountdown(): void
    {
        $created = $this->service->create($this->validPng(), 30, 3600, 'global');
        $this->service->findViewable($created['token']);
        $row = $this->database->pdo()->query('SELECT status, opened_at, expires_at FROM flash_images')->fetch();

        self::assertSame('unused', $row['status']);
        self::assertNull($row['opened_at']);
        self::assertNull($row['expires_at']);
    }

    public function testRedeemStartsOnceAndNeverExtends(): void
    {
        $created = $this->service->create($this->validPng(), 30, 3600, 'global');
        $first = $this->service->redeem($created['token'], 'viewer-a', 'ip', 'ua');
        usleep(20000);
        $second = $this->service->redeem($created['token'], 'viewer-b', 'ip', 'ua');

        self::assertSame($first['expires_at'], $second['expires_at']);
        self::assertSame('opened', $second['status']);
    }

    public function testExpiredContentIsRejected(): void
    {
        $created = $this->service->create($this->validPng(), 30, 3600, 'global');
        $this->service->redeem($created['token'], 'viewer', 'ip', 'ua');
        $this->database->pdo()->exec('UPDATE flash_images SET expires_at = 1');

        $this->expectException(NotFoundException::class);
        $this->service->content($created['token'], 'viewer');
    }

    public function testDestroyedContentIsRejected(): void
    {
        $created = $this->service->create($this->validPng(), 30, 3600, 'global');
        $this->service->redeem($created['token'], 'viewer', 'ip', 'ua');
        self::assertTrue($this->service->destroy((int) $created['id'], 'manual'));

        $this->expectException(NotFoundException::class);
        $this->service->content($created['token'], 'viewer');
    }

    public function testMissingFileIsDestroyedAndAuditedOnce(): void
    {
        $created = $this->service->create($this->validPng(), 30, 3600, 'global');
        $this->service->redeem($created['token'], 'viewer', 'ip', 'ua');
        $activeBytes = (int) $this->database->pdo()->query(
            'SELECT file_size FROM flash_images'
        )->fetchColumn();
        $auditCount = (int) $this->database->pdo()->query(
            'SELECT COUNT(*) FROM audit_logs'
        )->fetchColumn();
        self::assertSame($activeBytes, $this->service->dashboard()['total_bytes']);
        foreach (glob($this->config->string('storage_path') . '/*') ?: [] as $file) {
            unlink($file);
        }

        for ($attempt = 0; $attempt < 2; $attempt++) {
            try {
                $this->service->content($created['token'], 'viewer');
                self::fail('Missing content was served.');
            } catch (NotFoundException) {
            }
        }

        $row = $this->database->pdo()->query(
            'SELECT status, destroyed_at, storage_deleted_at, destroy_reason FROM flash_images'
        )->fetch();
        self::assertSame('destroyed', $row['status']);
        self::assertSame('missing_file', $row['destroy_reason']);
        self::assertGreaterThan(0, (int) $row['destroyed_at']);
        self::assertGreaterThanOrEqual((int) $row['destroyed_at'], (int) $row['storage_deleted_at']);

        $dashboard = $this->service->dashboard();
        self::assertSame(0, $dashboard['opened']);
        self::assertSame(1, $dashboard['destroyed']);
        self::assertSame(0, $dashboard['total_bytes']);
        self::assertSame($auditCount + 1, (int) $this->database->pdo()->query(
            'SELECT COUNT(*) FROM audit_logs'
        )->fetchColumn());
        self::assertSame(1, (int) $this->database->pdo()->query(
            "SELECT COUNT(*) FROM audit_logs
             WHERE event_type = 'automatic_destroy' AND flash_id = {$created['id']}
             AND metadata_json = '{\"reason\":\"missing_file\"}'"
        )->fetchColumn());

        $source = (string) file_get_contents(dirname(__DIR__) . '/app/FlashService.php');
        self::assertStringContainsString("\$this->destroy((int) \$row['id'], 'missing_file')", $source);
        self::assertStringNotContainsString('private function markMissingFile', $source);
    }

    public function testContentIsCountedOnlyAfterFinalAuthorization(): void
    {
        $created = $this->service->create($this->validPng(), 30, 3600, 'global');
        $this->service->redeem($created['token'], 'viewer', 'ip', 'ua');
        $content = $this->service->content($created['token'], 'viewer');

        self::assertSame(0, (int) $this->database->pdo()->query(
            'SELECT access_count FROM flash_images'
        )->fetchColumn());
        $this->service->authorizeContentDelivery((int) $content['id'], (string) $content['viewer_hash']);
        self::assertSame(1, (int) $this->database->pdo()->query(
            'SELECT access_count FROM flash_images'
        )->fetchColumn());
    }

    public function testDestroyDuringReadRejectsFinalContentAuthorization(): void
    {
        $created = $this->service->create($this->validPng(), 30, 3600, 'global');
        $this->service->redeem($created['token'], 'viewer', 'ip', 'ua');
        $content = $this->service->content($created['token'], 'viewer');
        self::assertTrue($this->service->destroy((int) $created['id'], 'manual'));

        try {
            $this->service->authorizeContentDelivery((int) $content['id'], (string) $content['viewer_hash']);
            self::fail('Destroyed content passed final authorization.');
        } catch (NotFoundException) {
            self::assertSame(0, (int) $this->database->pdo()->query(
                'SELECT access_count FROM flash_images'
            )->fetchColumn());
        }
    }

    public function testExpiryDuringReadRejectsFinalContentAuthorization(): void
    {
        $created = $this->service->create($this->validPng(), 30, 3600, 'global');
        $this->service->redeem($created['token'], 'viewer', 'ip', 'ua');
        $content = $this->service->content($created['token'], 'viewer');
        $this->database->pdo()->exec('UPDATE flash_images SET expires_at = 1');

        $this->expectException(NotFoundException::class);
        $this->service->authorizeContentDelivery((int) $content['id'], (string) $content['viewer_hash']);
    }
}
