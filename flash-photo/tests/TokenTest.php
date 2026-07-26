<?php

declare(strict_types=1);

namespace FlashPhoto\Tests;

use PDOException;

final class TokenTest extends TestCase
{
    public function testTokenUsesFortyThreeBase64UrlCharacters(): void
    {
        $tokens = [];
        for ($i = 0; $i < 100; $i++) {
            $token = $this->service->generateToken();
            self::assertMatchesRegularExpression('/^[A-Za-z0-9_-]{43}$/', $token);
            $tokens[$token] = true;
        }
        self::assertCount(100, $tokens);
    }

    public function testDatabaseNeverStoresRawToken(): void
    {
        $created = $this->service->create($this->validPng(), 30, 3600, 'global');
        $row = $this->database->pdo()->query('SELECT token_hash FROM flash_images')->fetch();

        self::assertNotSame($created['token'], $row['token_hash']);
        self::assertSame(hash('sha256', $created['token']), $row['token_hash']);
        $artifacts = glob($this->config->string('database_path') . '*') ?: [];
        $artifacts = array_merge($artifacts, glob($this->config->string('log_path') . '/*') ?: []);
        foreach ($artifacts as $artifact) {
            $contents = file_get_contents($artifact);
            self::assertIsString($contents);
            self::assertStringNotContainsString($created['token'], $contents);
        }
    }

    public function testAuditFailureRollsBackRecordAndStoredFile(): void
    {
        $this->database->pdo()->exec(
            "CREATE TRIGGER reject_audits BEFORE INSERT ON audit_logs BEGIN
             SELECT RAISE(ABORT, 'audit rejected'); END"
        );
        try {
            $this->service->create($this->validPng(), 30, 3600, 'global');
            self::fail('Upload unexpectedly succeeded.');
        } catch (PDOException) {
            self::assertSame(0, (int) $this->database->pdo()->query('SELECT COUNT(*) FROM flash_images')->fetchColumn());
            self::assertSame([], glob($this->config->string('storage_path') . '/*') ?: []);
        }
    }
}
