<?php

declare(strict_types=1);

namespace FlashPhoto {
    function fsync(mixed $handle): bool
    {
        return \FlashPhoto\Tests\FileStorageDurabilityTest::interceptFsync($handle);
    }
}

namespace FlashPhoto\Tests {
    final class FileStorageDurabilityTest extends TestCase
    {
        private static ?\Closure $syncFailure = null;
        private static int $syncFailuresRemaining = 0;
        private static int $syncFailuresTriggered = 0;

        public function testStorageRequiresFsyncOnLinux(): void
        {
            $source = (string) file_get_contents(dirname(__DIR__) . '/app/FileStorage.php');

            self::assertStringContainsString("return function_exists('fsync') && @fsync(\$handle);", $source);
            self::assertStringContainsString("if (!function_exists('fsync')) {\n            return false;", $source);
            self::assertStringNotContainsString("return !function_exists('fsync') ||", $source);
        }

        public function testStoreFailsClosedWhenTemporaryImageSyncFails(): void
        {
            if (!function_exists('fsync')) {
                self::markTestSkipped('fsync is unavailable.');
            }
            $pending = $this->config->string('storage_path') . '/.pending/.tmp-';
            self::$syncFailure = static fn (string $uri): bool => str_starts_with($uri, $pending);
            self::$syncFailuresRemaining = 1;

            try {
                $this->storage->store($this->validPng());
                self::fail('Upload succeeded after its temporary image failed to sync.');
            } catch (\RuntimeException $exception) {
                self::assertSame('Unable to persist uploaded image.', $exception->getMessage());
            } finally {
                self::$syncFailure = null;
            }

            self::assertSame(1, self::$syncFailuresTriggered);
            $this->assertStorageRollbackComplete();
        }

        public function testStoreFailsClosedWhenPublicationDirectorySyncFails(): void
        {
            if (PHP_OS_FAMILY !== 'Linux' || !function_exists('fsync')) {
                self::markTestSkipped('Linux directory fsync is unavailable.');
            }
            $root = $this->config->string('storage_path');
            self::$syncFailure = static fn (string $uri): bool => $uri === $root;
            self::$syncFailuresRemaining = 1;

            try {
                $this->storage->store($this->validPng());
                self::fail('Upload succeeded after publication metadata failed to sync.');
            } catch (\RuntimeException $exception) {
                self::assertSame('Unable to persist stored image publication.', $exception->getMessage());
            } finally {
                self::$syncFailure = null;
            }

            self::assertSame(1, self::$syncFailuresTriggered);
            $this->assertStorageRollbackComplete();
        }

        public function testRollbackRetainsMarkerUntilPayloadDeletionIsDurable(): void
        {
            if (PHP_OS_FAMILY !== 'Linux' || !function_exists('fsync')) {
                self::markTestSkipped('Linux directory fsync is unavailable.');
            }
            $root = $this->config->string('storage_path');
            self::$syncFailure = static fn (string $uri): bool => $uri === $root;
            self::$syncFailuresRemaining = 2;

            try {
                $this->storage->store($this->validPng());
                self::fail('Upload succeeded after publication metadata failed to sync.');
            } catch (\RuntimeException $exception) {
                self::assertSame('Unable to persist stored image publication.', $exception->getMessage());
            } finally {
                self::$syncFailure = null;
            }

            self::assertSame(2, self::$syncFailuresTriggered);
            $markers = array_values(array_diff(scandir($root . '/.pending') ?: [], ['.', '..']));
            self::assertCount(1, $markers);
            self::assertMatchesRegularExpression('/^[a-f0-9]{48}\.png\.pending$/D', $markers[0]);
            self::assertSame([$markers[0]], $this->database->pdo()->query(
                "SELECT item_name FROM cleanup_queue WHERE category = 'pending' ORDER BY item_name"
            )->fetchAll(\PDO::FETCH_COLUMN));

            $this->storage->abort(substr($markers[0], 0, -8));
            $this->assertStorageRollbackComplete();
        }

        public static function interceptFsync(mixed $handle): bool
        {
            $uri = (string) (stream_get_meta_data($handle)['uri'] ?? '');
            if (self::$syncFailuresRemaining > 0
                && self::$syncFailure !== null
                && (self::$syncFailure)($uri)) {
                self::$syncFailuresRemaining--;
                self::$syncFailuresTriggered++;
                return false;
            }
            return \fsync($handle);
        }

        protected function tearDown(): void
        {
            self::$syncFailure = null;
            self::$syncFailuresRemaining = 0;
            self::$syncFailuresTriggered = 0;
            parent::tearDown();
        }

        private function assertStorageRollbackComplete(): void
        {
            $root = $this->config->string('storage_path');
            self::assertSame(['.pending'], array_values(array_diff(scandir($root) ?: [], ['.', '..'])));
            self::assertSame([], array_values(array_diff(scandir($root . '/.pending') ?: [], ['.', '..'])));
            self::assertSame(0, (int) $this->database->pdo()->query(
                "SELECT COUNT(*) FROM cleanup_queue WHERE category = 'pending'"
            )->fetchColumn());
        }
    }
}
