<?php

declare(strict_types=1);

namespace FlashPhoto\Tests;

final class PaginationTest extends TestCase
{
    public function testRecordsBeyondFirstPageAreReturnedInDescendingIdOrder(): void
    {
        $this->insertRecords(205);

        $firstPage = $this->service->listRecords(100);
        $secondPage = $this->service->listRecords(100, 100);

        self::assertSame(range(205, 106), array_column($firstPage, 'id'));
        self::assertSame(range(105, 6), array_column($secondPage, 'id'));
    }

    public function testExtraRecordIndicatesAnotherPageWithoutChangingOrder(): void
    {
        $this->insertRecords(205);

        $records = $this->service->listRecords(101, 100);

        self::assertCount(101, $records);
        self::assertSame(range(105, 5), array_column($records, 'id'));
    }

    public function testDestroyFormAndRedirectPreserveValidatedPage(): void
    {
        $list = file_get_contents(dirname(__DIR__) . '/public/admin/list.php');
        $destroy = file_get_contents(dirname(__DIR__) . '/public/admin/destroy.php');

        self::assertIsString($list);
        self::assertIsString($destroy);
        self::assertStringContainsString('name="page" value="<?= $page ?>"', $list);
        self::assertStringContainsString("\$_POST['page'] ?? null", $destroy);
        self::assertStringContainsString("'min_range' => 1", $destroy);
        self::assertStringContainsString("'max_range' => 1000000", $destroy);
        self::assertStringContainsString("if (!is_int(\$page)) {\n    \$page = 1;", $destroy);
        self::assertStringContainsString(
            "\$app['config']->string('admin_path') . '/list.php?page=' . \$page",
            $destroy
        );
    }

    public function testPaginationControlsMeetMinimumTouchHeight(): void
    {
        $css = file_get_contents(dirname(__DIR__) . '/public/assets/app.css');

        self::assertIsString($css);
        self::assertMatchesRegularExpression(
            '/\.pagination a, \.pagination span \{[^}]*display: inline-flex;[^}]*min-height: 44px;'
                . '[^}]*align-items: center;[^}]*justify-content: center;/s',
            $css
        );
    }

    private function insertRecords(int $count): void
    {
        $pdo = $this->database->pdo();
        $statement = $pdo->prepare(
            "INSERT INTO flash_images (
                token_hash, storage_name, original_name, mime_type, file_size, width, height,
                status, created_at, unused_expires_at, view_seconds, access_mode
            ) VALUES (
                :token_hash, :storage_name, :original_name, 'image/png', 1, 1, 1,
                'destroyed', :created_at, :unused_expires_at, 30, 'global'
            )"
        );
        $pdo->beginTransaction();
        for ($id = 1; $id <= $count; $id++) {
            $statement->execute([
                'token_hash' => hash('sha256', 'pagination-' . $id),
                'storage_name' => 'pagination-' . $id . '.png',
                'original_name' => 'record-' . $id . '.png',
                'created_at' => $id,
                'unused_expires_at' => $id + 3600,
            ]);
        }
        $pdo->commit();
    }
}
