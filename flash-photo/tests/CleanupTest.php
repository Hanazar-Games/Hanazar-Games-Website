<?php

declare(strict_types=1);

namespace FlashPhoto\Tests;

final class CleanupTest extends TestCase
{
    public function testCleanupPersistsExactParentBeforeRemovingQueueReferences(): void
    {
        $source = (string) file_get_contents(dirname(__DIR__) . '/scripts/cleanup.php');
        $unlink = strpos($source, 'return @unlink($path)');
        $sync = strpos($source, '&& syncDirectoryExact(dirname($path));', $unlink);
        $queueRemoval = strpos($source, "\$cleanupQueue->removeIfDue('pending', \$name, \$dueAt);", $sync);

        self::assertIsInt($unlink);
        self::assertIsInt($sync);
        self::assertIsInt($queueRemoval);
        self::assertLessThan($sync, $unlink);
        self::assertLessThan($queueRemoval, $sync);
        self::assertStringContainsString('&& @fsync($handle);', $source);
        self::assertStringNotContainsString("if (\$dryRun) {\n        syncDirectoryExact", $source);
        self::assertStringContainsString('return syncDirectoryExact(dirname($path));', $source);
    }

    public function testSessionCleanupPersistsBothDirectoriesBeforeQueueRemoval(): void
    {
        $source = (string) file_get_contents(dirname(__DIR__) . '/scripts/cleanup.php');
        $sessionDelete = strpos($source, 'if (!unlinkExactFile($sessionFilePath)');
        $sidecarDelete = strpos($source, '|| !$sessionRegistry->removeSidecar($reference)', $sessionDelete);
        $queueRemoval = strpos(
            $source,
            "\$cleanupQueue->removeIfDue('session_delete', \$reference, \$dueAt);",
            $sidecarDelete
        );

        self::assertIsInt($sessionDelete);
        self::assertIsInt($sidecarDelete);
        self::assertIsInt($queueRemoval);
        self::assertLessThan($sidecarDelete, $sessionDelete);
        self::assertLessThan($queueRemoval, $sidecarDelete);
    }

    public function testSessionCleanupUsesOpaqueSidecarAndHonorsDryRun(): void
    {
        $sessionId = str_repeat('s', 32);
        $sessionFile = $this->root . '/storage/sessions/sess_' . $sessionId;
        file_put_contents($sessionFile, 'admin_id|i:1;');
        chmod($sessionFile, 0600);
        touch($sessionFile, time() - 7200);
        $reference = $this->sessionRegistry->track($sessionId, null, time() - 1);

        self::assertMatchesRegularExpression('/^[a-f0-9]{64}$/D', $reference);
        self::assertSame($reference, $this->database->pdo()->query(
            "SELECT item_name FROM cleanup_queue WHERE category = 'session'"
        )->fetchColumn());
        self::assertStringNotContainsString($sessionId, $reference);

        [$exit, , $stderr] = $this->runCleanup(['--dry-run', '--limit=1']);
        self::assertSame(0, $exit, $stderr);
        self::assertFileExists($sessionFile);
        self::assertFileExists($this->root . '/storage/sessions/.cleanup/' . $reference);

        [$exit, , $stderr] = $this->runCleanup(['--limit=1']);
        self::assertSame(0, $exit, $stderr);
        self::assertFalse(@lstat($sessionFile));
        self::assertFalse(@lstat($this->root . '/storage/sessions/.cleanup/' . $reference));
        self::assertNull($this->cleanupQueue->currentDue('session', $reference));
    }

    public function testExplicitSessionPathWorksWithoutCliIniOverride(): void
    {
        $sessionId = str_repeat('e', 32);
        $sessionFile = $this->root . '/storage/sessions/sess_' . $sessionId;
        file_put_contents($sessionFile, 'x');
        chmod($sessionFile, 0600);
        touch($sessionFile, time() - 7200);
        $reference = $this->sessionRegistry->track($sessionId, null, time() - 1);

        [$exit, , $stderr] = $this->runCleanup([
            '--limit=1',
            '--session-path=' . $this->root . '/storage/sessions',
        ], false);

        self::assertSame(0, $exit, $stderr);
        self::assertFalse(@lstat($sessionFile));
        self::assertFalse(@lstat($this->root . '/storage/sessions/.cleanup/' . $reference));
        self::assertNull($this->cleanupQueue->currentDue('session', $reference));
    }

    public function testUnqueuedSessionFileIsNotEnumerated(): void
    {
        $path = $this->root . '/storage/sessions/sess_' . str_repeat('u', 32);
        file_put_contents($path, 'x');
        chmod($path, 0600);
        touch($path, time() - 7200);

        [$exit, , $stderr] = $this->runCleanup(['--limit=1']);

        self::assertSame(0, $exit, $stderr);
        self::assertFileExists($path);
    }

    public function testLockedSessionCleanupIsNonblockingAndDeferred(): void
    {
        $sessionId = str_repeat('l', 32);
        $path = $this->root . '/storage/sessions/sess_' . $sessionId;
        file_put_contents($path, 'x');
        chmod($path, 0600);
        touch($path, time() - 7200);
        $reference = $this->sessionRegistry->track($sessionId, null, time() - 1);
        $handle = fopen($path, 'r');
        self::assertIsResource($handle);
        self::assertTrue(flock($handle, LOCK_EX | LOCK_NB));

        try {
            [$exit, , $stderr] = $this->runCleanup(['--limit=1']);
            self::assertSame(0, $exit, $stderr);
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }

        self::assertFileExists($path);
        self::assertGreaterThan(time() - 1, (int) $this->cleanupQueue->currentDue('session', $reference));
    }

    public function testMissingPendingSessionSidecarIsRetiredWithoutError(): void
    {
        $reference = str_repeat('d', 64);
        $dueAt = time() - 1;
        self::assertTrue($this->cleanupQueue->scheduleNew('session_pending', $reference, $dueAt));

        [$exit, , $stderr] = $this->runCleanup(['--limit=1']);

        self::assertSame(0, $exit, $stderr);
        self::assertStringNotContainsString($reference, $stderr);
        self::assertNull($this->cleanupQueue->currentDue('session_pending', $reference));
    }

    public function testPartialPendingSessionSidecarIsRetiredWithoutError(): void
    {
        $reference = str_repeat('c', 64);
        $dueAt = time() - 1;
        self::assertTrue($this->cleanupQueue->scheduleNew('session_pending', $reference, $dueAt));
        $sidecar = $this->sessionRegistry->sidecarPath($reference);
        file_put_contents($sidecar, 'partial');
        chmod($sidecar, 0600);

        [$exit, , $stderr] = $this->runCleanup(['--limit=1']);

        self::assertSame(0, $exit, $stderr);
        self::assertFalse(@lstat($sidecar));
        self::assertNull($this->cleanupQueue->currentDue('session_pending', $reference));
    }

    public function testDurablePendingSessionSidecarIsRecoveredAndCleaned(): void
    {
        $sessionId = str_repeat('p', 32);
        $sessionFile = $this->root . '/storage/sessions/sess_' . $sessionId;
        file_put_contents($sessionFile, 'x');
        chmod($sessionFile, 0600);
        touch($sessionFile, time() - 7200);
        $activeDueAt = time() + 60;
        $dueAt = time() - 1;
        $reference = $this->sessionRegistry->track($sessionId, null, $activeDueAt);
        $statement = $this->database->pdo()->prepare(
            "UPDATE cleanup_queue SET category = 'session_pending', due_at = :due
             WHERE category = 'session' AND item_name = :reference"
        );
        $statement->execute(['due' => $dueAt, 'reference' => $reference]);

        [$exit, , $stderr] = $this->runCleanup(['--limit=1']);

        self::assertSame(0, $exit, $stderr);
        self::assertFalse(@lstat($sessionFile));
        self::assertFalse(@lstat($this->sessionRegistry->sidecarPath($reference)));
        self::assertNull($this->cleanupQueue->currentDue('session', $reference));
    }

    public function testMissingActiveSessionSidecarIsStillReportedAndDeferred(): void
    {
        $reference = str_repeat('d', 64);
        $dueAt = time() - 1;
        self::assertTrue($this->cleanupQueue->scheduleNew('session', $reference, $dueAt));

        [$exit, , $stderr] = $this->runCleanup(['--limit=1']);

        self::assertSame(1, $exit);
        self::assertStringContainsString(
            'session_files: missing cleanup reference ' . substr(hash('sha256', $reference), 0, 16),
            $stderr
        );
        self::assertGreaterThan($dueAt, (int) $this->cleanupQueue->currentDue('session', $reference));
    }

    public function testMissingDeletionSidecarFinalizesQueueIdempotently(): void
    {
        $reference = str_repeat('f', 64);
        $dueAt = time() - 1;
        self::assertTrue($this->cleanupQueue->scheduleNew('session_delete', $reference, $dueAt));

        [$exit, , $stderr] = $this->runCleanup(['--limit=1']);

        self::assertSame(0, $exit, $stderr);
        self::assertNull($this->cleanupQueue->currentDue('session_delete', $reference));
    }

    public function testDeletionPhaseFinishesInterruptedSessionRemoval(): void
    {
        $sessionId = str_repeat('q', 32);
        $sessionFile = $this->root . '/storage/sessions/sess_' . $sessionId;
        file_put_contents($sessionFile, 'x');
        chmod($sessionFile, 0600);
        $activeDueAt = time() + 60;
        $deleteDueAt = time() - 1;
        $reference = $this->sessionRegistry->track($sessionId, null, $activeDueAt);
        self::assertTrue($this->cleanupQueue->transitionIfDue(
            'session',
            'session_delete',
            $reference,
            $activeDueAt,
            $deleteDueAt
        ));

        [$exit, , $stderr] = $this->runCleanup(['--limit=1']);

        self::assertSame(0, $exit, $stderr);
        self::assertFalse(@lstat($sessionFile));
        self::assertFalse(@lstat($this->sessionRegistry->sidecarPath($reference)));
        self::assertNull($this->cleanupQueue->currentDue('session_delete', $reference));
    }

    public function testPendingCleanupClaimsDeletionBeforeRetiringSidecar(): void
    {
        $source = (string) file_get_contents(dirname(__DIR__) . '/scripts/cleanup.php');
        $pendingLoop = strpos($source, "due('session_pending', \$now, \$limit)");
        $claim = strpos($source, "'session_pending',\n                        'session_delete'", $pendingLoop);
        $deleteLoop = strpos($source, "['session_delete', 'session']", $claim);
        $sidecarRemoval = strpos($source, '$sessionRegistry->removeSidecar($reference)', $deleteLoop);

        self::assertIsInt($pendingLoop);
        self::assertIsInt($claim);
        self::assertIsInt($deleteLoop);
        self::assertIsInt($sidecarRemoval);
        self::assertLessThan($claim, $pendingLoop);
        self::assertLessThan($deleteLoop, $claim);
        self::assertLessThan($sidecarRemoval, $deleteLoop);
    }

    public function testProvisioningRollbackNeverDeletesAnActiveSidecar(): void
    {
        $sessionId = str_repeat('w', 32);
        $dueAt = time() + 3600;
        $reference = $this->sessionRegistry->track($sessionId, null, $dueAt);
        $sidecar = $this->sessionRegistry->sidecarPath($reference);
        $retire = new \ReflectionMethod($this->sessionRegistry, 'retireProvisioning');

        self::assertFalse($retire->invoke($this->sessionRegistry, $reference));
        self::assertFileExists($sidecar);
        self::assertSame($dueAt, $this->cleanupQueue->currentDue('session', $reference));
    }

    public function testProvisioningRollbackLeavesCleanupOwnedSidecarQueued(): void
    {
        $sessionId = str_repeat('y', 32);
        $dueAt = time() + 3600;
        $reference = $this->sessionRegistry->track($sessionId, null, $dueAt);
        $sidecar = $this->sessionRegistry->sidecarPath($reference);
        $deleteDueAt = time();
        self::assertTrue($this->cleanupQueue->transitionIfDue(
            'session',
            'session_delete',
            $reference,
            $dueAt,
            $deleteDueAt
        ));
        $retire = new \ReflectionMethod($this->sessionRegistry, 'retireProvisioning');

        self::assertTrue($retire->invoke($this->sessionRegistry, $reference));
        self::assertFileExists($sidecar);
        $deferredDueAt = $this->cleanupQueue->currentDue('session_delete', $reference);
        self::assertGreaterThan($deleteDueAt, (int) $deferredDueAt);
        self::assertFalse($this->cleanupQueue->removeIfDue(
            'session_delete',
            $reference,
            $deleteDueAt
        ));
    }

    public function testProvisioningRollbackRemovesSidecarAfterQueueWasFinalized(): void
    {
        $reference = str_repeat('9', 64);
        $sidecar = $this->sessionRegistry->sidecarPath($reference);
        file_put_contents($sidecar, 'sess_' . str_repeat('z', 32));
        chmod($sidecar, 0600);
        $retire = new \ReflectionMethod($this->sessionRegistry, 'retireProvisioning');

        self::assertTrue($retire->invoke($this->sessionRegistry, $reference));
        self::assertFalse(@lstat($sidecar));
    }

    public function testDryRunAndRepeatedCleanupAreSafe(): void
    {
        if (!function_exists('proc_open')) {
            self::markTestSkipped('proc_open is unavailable.');
        }
        $created = $this->service->create($this->validPng(), 30, 3600, 'global');
        $this->service->redeem($created['token'], 'viewer', 'ip', 'ua');
        $this->database->pdo()->exec('UPDATE flash_images SET expires_at = 1');
        $row = $this->database->pdo()->query('SELECT storage_name FROM flash_images')->fetch();
        $storedPath = $this->config->string('storage_path') . '/' . $row['storage_name'];

        [$exit, $stdout, $stderr] = $this->runCleanup(['--dry-run', '--verbose', '--limit=10']);
        self::assertSame(0, $exit, $stderr);
        self::assertStringContainsString('dry-run summary:', $stdout);
        self::assertFileExists($storedPath);
        self::assertSame('opened', $this->database->pdo()->query('SELECT status FROM flash_images')->fetchColumn());

        [$exit, , $stderr] = $this->runCleanup(['--limit=10']);
        self::assertSame(0, $exit, $stderr);
        self::assertFalse(@lstat($storedPath));
        $record = $this->database->pdo()->query('SELECT status, destroyed_at FROM flash_images')->fetch();
        self::assertSame('expired', $record['status']);
        self::assertGreaterThan(0, (int) $record['destroyed_at']);
        self::assertGreaterThan(0, (int) $this->database->pdo()->query(
            'SELECT storage_deleted_at FROM flash_images'
        )->fetchColumn());
        self::assertSame(1, $this->automaticDestroyCount());

        [$exit, , $stderr] = $this->runCleanup(['--limit=10']);
        self::assertSame(0, $exit, $stderr);
        self::assertSame(1, $this->automaticDestroyCount());
    }

    public function testDryRunDoesNotCreateMissingRuntimeDirectories(): void
    {
        $registry = $this->root . '/storage/sessions/.cleanup';
        self::assertTrue(rmdir($registry));

        [$exit, , $stderr] = $this->runCleanup(['--dry-run', '--limit=1']);

        self::assertSame(1, $exit);
        self::assertStringContainsString('runtime state is incomplete', $stderr);
        self::assertDirectoryDoesNotExist($registry);
    }

    public function testDryRunErrorsDoNotWriteLogsOrMutateCleanupQueue(): void
    {
        $this->service->create($this->validPng(), 30, 3600, 'global');
        $this->database->pdo()->exec(
            "UPDATE flash_images SET status = 'opened', expires_at = 1, storage_name = 'unsafe-name'"
        );
        $queueBefore = $this->database->pdo()->query(
            'SELECT category, item_name, due_at, updated_at FROM cleanup_queue ORDER BY category, item_name'
        )->fetchAll();
        $logsBefore = [];
        foreach (glob($this->config->string('log_path') . '/*.log') ?: [] as $path) {
            $logsBefore[basename($path)] = hash_file('sha256', $path);
        }

        [$exit, , $stderr] = $this->runCleanup(['--dry-run', '--limit=10']);

        self::assertSame(1, $exit);
        self::assertStringContainsString('unsafe storage name', $stderr);
        self::assertSame($queueBefore, $this->database->pdo()->query(
            'SELECT category, item_name, due_at, updated_at FROM cleanup_queue ORDER BY category, item_name'
        )->fetchAll());
        $logsAfter = [];
        foreach (glob($this->config->string('log_path') . '/*.log') ?: [] as $path) {
            $logsAfter[basename($path)] = hash_file('sha256', $path);
        }
        self::assertSame($logsBefore, $logsAfter);
    }

    public function testDryRunKeepsDeleteJournalDatabaseByteIdentical(): void
    {
        $path = $this->root . '/storage/dry-run.sqlite';
        $pdo = new \PDO('sqlite:' . $path, null, null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        ]);
        $schema = file_get_contents(dirname(__DIR__) . '/database/schema.sql');
        self::assertIsString($schema);
        $pdo->exec($schema);
        self::assertSame('delete', $pdo->query('PRAGMA journal_mode = DELETE')->fetchColumn());
        unset($pdo);
        self::assertTrue(chmod($path, 0600));
        self::assertFileDoesNotExist($path . '-wal');
        self::assertFileDoesNotExist($path . '-shm');
        $hash = hash_file('sha256', $path);
        self::assertIsString($hash);

        [$exit, , $stderr] = $this->runCleanup(
            ['--dry-run', '--limit=1'],
            true,
            ['DATABASE_PATH' => $path]
        );

        self::assertSame(0, $exit, $stderr);
        self::assertSame($hash, hash_file('sha256', $path));
        self::assertFileDoesNotExist($path . '-wal');
        self::assertFileDoesNotExist($path . '-shm');
        $pdo = new \PDO('sqlite:' . $path, null, null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        ]);
        self::assertSame('delete', $pdo->query('PRAGMA journal_mode')->fetchColumn());
    }

    public function testDryRunKeepsLiveWalDatabaseByteIdenticalWithConcurrentWriter(): void
    {
        $path = $this->root . '/storage/dry-run-wal.sqlite';
        $pdo = new \PDO('sqlite:' . $path, null, null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        ]);
        $schema = file_get_contents(dirname(__DIR__) . '/database/schema.sql');
        self::assertIsString($schema);
        $pdo->exec($schema);
        self::assertSame('wal', $pdo->query('PRAGMA journal_mode = WAL')->fetchColumn());
        $pdo->exec(
            "INSERT INTO audit_logs (event_type, created_at, request_id) VALUES ('test', 9999999999, 'wal')"
        );
        $pdo->exec('BEGIN IMMEDIATE');
        $pdo->exec(
            "INSERT INTO audit_logs (event_type, created_at, request_id) VALUES ('test', 9999999999, 'writer')"
        );
        self::assertTrue(chmod($path, 0600));
        self::assertFileExists($path . '-wal');
        $databaseHash = hash_file('sha256', $path);
        $walHash = hash_file('sha256', $path . '-wal');
        self::assertIsString($databaseHash);
        self::assertIsString($walHash);

        [$exit, , $stderr] = $this->runCleanup(
            ['--dry-run', '--limit=1'],
            true,
            ['DATABASE_PATH' => $path]
        );

        self::assertSame(0, $exit, $stderr);
        self::assertSame($databaseHash, hash_file('sha256', $path));
        self::assertSame($walHash, hash_file('sha256', $path . '-wal'));
        self::assertSame('wal', $pdo->query('PRAGMA journal_mode')->fetchColumn());
        $pdo->exec('ROLLBACK');
    }

    public function testDryRunOpensCheckpointedWalDatabaseWithoutAuxiliaryFiles(): void
    {
        $path = $this->root . '/storage/dry-run-clean-wal.sqlite';
        $pdo = new \PDO('sqlite:' . $path, null, null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        ]);
        $schema = file_get_contents(dirname(__DIR__) . '/database/schema.sql');
        self::assertIsString($schema);
        $pdo->exec($schema);
        self::assertSame('wal', $pdo->query('PRAGMA journal_mode = WAL')->fetchColumn());
        $pdo->exec('PRAGMA wal_checkpoint(TRUNCATE)');
        unset($pdo);
        self::assertTrue(chmod($path, 0600));
        foreach ([$path . '-wal', $path . '-shm'] as $auxiliaryPath) {
            if (file_exists($auxiliaryPath)) {
                self::assertTrue(unlink($auxiliaryPath));
            }
        }
        $databaseHash = hash_file('sha256', $path);
        self::assertIsString($databaseHash);

        [$exit, , $stderr] = $this->runCleanup(
            ['--dry-run', '--limit=1'],
            true,
            ['DATABASE_PATH' => $path]
        );

        self::assertSame(0, $exit, $stderr);
        self::assertSame($databaseHash, hash_file('sha256', $path));
        $pdo = new \PDO('sqlite:' . $path, null, null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        ]);
        self::assertSame('wal', $pdo->query('PRAGMA journal_mode')->fetchColumn());
    }

    public function testOldOrphanMarkerRemovesPayloadOnlyOutsideDryRun(): void
    {
        if (!function_exists('proc_open')) {
            self::markTestSkipped('proc_open is unavailable.');
        }
        $name = str_repeat('c', 48) . '.png';
        $path = $this->config->string('storage_path') . '/' . $name;
        $marker = $this->config->string('storage_path') . '/.pending/' . $name . '.pending';
        $image = $this->validPng();
        self::assertTrue(copy((string) $image['path'], $path));
        self::assertTrue(chmod($path, 0600));
        self::assertSame(0, file_put_contents($marker, ''));
        self::assertTrue(chmod($marker, 0600));
        touch($marker, time() - 3601);
        $this->cleanupQueue->schedule('pending', basename($marker), time() - 1);

        [$exit, $stdout, $stderr] = $this->runCleanup(['--dry-run', '--verbose', '--limit=1']);
        self::assertSame(0, $exit, $stderr);
        self::assertStringContainsString('would remove orphaned_files:', $stdout);
        self::assertFileExists($path);
        self::assertFileExists($marker);

        [$exit, $stdout, $stderr] = $this->runCleanup(['--verbose', '--limit=1']);
        self::assertSame(0, $exit, $stderr);
        self::assertStringContainsString('removed orphaned_files:', $stdout);
        self::assertFalse(@lstat($path));
        self::assertFalse(@lstat($marker));
    }

    public function testKnownOldMarkerNeverDeletesDatabaseOwnedPayload(): void
    {
        $created = $this->service->create($this->validPng(), 30, 3600, 'global');
        $name = (string) $this->database->pdo()->query('SELECT storage_name FROM flash_images')->fetchColumn();
        $path = $this->config->string('storage_path') . '/' . $name;
        $marker = $this->config->string('storage_path') . '/.pending/' . $name . '.pending';
        self::assertSame(0, file_put_contents($marker, ''));
        chmod($marker, 0600);
        touch($marker, time() - 3601);
        $this->cleanupQueue->schedule('pending', basename($marker), time() - 1);

        [$exit, , $stderr] = $this->runCleanup(['--limit=10']);

        self::assertSame(0, $exit, $stderr);
        self::assertFileExists($path);
        self::assertFalse(@lstat($marker));
        self::assertNotSame('', $created['token']);
    }

    public function testDeferredQueueHeadDoesNotStarveNextPendingItem(): void
    {
        $pending = $this->config->string('storage_path') . '/.pending';
        $firstName = str_repeat('a', 48) . '.png';
        $secondName = str_repeat('b', 48) . '.png';
        foreach ([$firstName, $secondName] as $name) {
            file_put_contents($this->config->string('storage_path') . '/' . $name, 'x');
            file_put_contents($pending . '/' . $name . '.pending', '');
            chmod($pending . '/' . $name . '.pending', 0600);
            touch($pending . '/' . $name . '.pending', time() - 3601);
        }
        $this->cleanupQueue->schedule('pending', $firstName . '.pending', time() - 2);
        $this->cleanupQueue->schedule('pending', $secondName . '.pending', time() - 1);
        $firstMarker = $pending . '/' . $firstName . '.pending';
        $handle = fopen($firstMarker, 'r+');
        self::assertIsResource($handle);
        self::assertTrue(flock($handle, LOCK_EX | LOCK_NB));

        try {
            [$exit, , $stderr] = $this->runCleanup(['--limit=1']);
            self::assertSame(0, $exit, $stderr);
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }

        [$exit, , $stderr] = $this->runCleanup(['--limit=1']);
        self::assertSame(0, $exit, $stderr);
        self::assertFileExists($firstMarker);
        self::assertFalse(@lstat($pending . '/' . $secondName . '.pending'));
        self::assertFalse(@lstat($this->config->string('storage_path') . '/' . $secondName));

        $this->cleanupQueue->schedule('pending', $firstName . '.pending', time() - 1);
        [$exit, , $stderr] = $this->runCleanup(['--limit=1']);
        self::assertSame(0, $exit, $stderr);
        self::assertFalse(@lstat($firstMarker));
        self::assertFalse(@lstat($this->config->string('storage_path') . '/' . $firstName));
    }

    public function testRateLimitQueueSelectionAndLoggingStayOutsideGlobalLock(): void
    {
        $source = (string) file_get_contents(dirname(__DIR__) . '/scripts/cleanup.php');
        $selection = strpos($source, "\$rateItems = \$cleanupQueue->due('rate_limit', \$now, \$limit)");
        $lock = strpos($source, "\$app['rate_limiter']->synchronized(\$cleanRateItem)");
        $log = strpos($source, "\$logDeleted('rate_limit_files', \$itemHash)");

        self::assertIsInt($selection);
        self::assertIsInt($lock);
        self::assertIsInt($log);
        self::assertLessThan($lock, $selection);
        self::assertLessThan($log, $lock);
        foreach (['FilesystemIterator', 'DirectoryIterator', 'scandir(', 'glob(', ' OFFSET '] as $forbidden) {
            self::assertStringNotContainsString($forbidden, $source);
        }
        self::assertStringContainsString("due('pending', \$now, \$limit)", $source);
        self::assertStringContainsString('due($category, $now, $limit)', $source);
        self::assertStringContainsString(
            '$cleanupQueue->currentDue($category, $name) !== $dueAt',
            $source
        );
    }

    public function testFreshRateHeadIsDeferredSoStaleNextItemCanRun(): void
    {
        $dueAt = time() - 10;
        $firstName = str_repeat('a', 64) . '.json';
        $secondName = str_repeat('b', 64) . '.json';
        $directory = $this->config->string('rate_limit_path');
        $firstPath = $directory . '/' . $firstName;
        $secondPath = $directory . '/' . $secondName;
        file_put_contents($firstPath, json_encode(['started' => time(), 'count' => 1], JSON_THROW_ON_ERROR));
        file_put_contents($secondPath, json_encode(['started' => time() - 7200, 'count' => 1], JSON_THROW_ON_ERROR));
        touch($secondPath, time() - 7200);
        $this->cleanupQueue->schedule('rate_limit', $firstName, $dueAt);
        $this->cleanupQueue->schedule('rate_limit', $secondName, $dueAt);

        [$exit, , $stderr] = $this->runCleanup(['--limit=1']);
        self::assertSame(0, $exit, $stderr);
        self::assertFileExists($firstPath);
        self::assertFileExists($secondPath);
        self::assertGreaterThan($dueAt, (int) $this->cleanupQueue->currentDue('rate_limit', $firstName));

        [$exit, , $stderr] = $this->runCleanup(['--limit=1']);
        self::assertSame(0, $exit, $stderr);
        self::assertFileExists($firstPath);
        self::assertFalse(@lstat($secondPath));
    }

    public function testQueueConditionalMutationsDoNotClobberProducerRefresh(): void
    {
        $name = str_repeat('c', 64) . '.json';
        $oldDueAt = time() - 10;
        $refreshedDueAt = time() + 120;
        $deferredDueAt = $refreshedDueAt + 120;
        $this->cleanupQueue->schedule('rate_limit', $name, $oldDueAt);
        $this->cleanupQueue->schedule('rate_limit', $name, $refreshedDueAt);

        self::assertFalse($this->cleanupQueue->removeIfDue('rate_limit', $name, $oldDueAt));
        self::assertFalse($this->cleanupQueue->deferIfDue(
            'rate_limit',
            $name,
            $oldDueAt,
            $deferredDueAt
        ));
        self::assertSame($refreshedDueAt, $this->cleanupQueue->currentDue('rate_limit', $name));
        self::assertTrue($this->cleanupQueue->deferIfDue(
            'rate_limit',
            $name,
            $refreshedDueAt,
            $deferredDueAt
        ));
        self::assertTrue($this->cleanupQueue->removeIfDue('rate_limit', $name, $deferredDueAt));
    }

    public function testNewQueueRegistrationNeverClobbersAnExistingOpaqueReference(): void
    {
        $reference = str_repeat('a', 64);
        $originalDueAt = time() + 60;
        self::assertTrue($this->cleanupQueue->scheduleNew('session', $reference, $originalDueAt));
        self::assertFalse($this->cleanupQueue->scheduleNew('session', $reference, $originalDueAt + 60));
        self::assertSame($originalDueAt, $this->cleanupQueue->currentDue('session', $reference));
    }

    public function testOpaqueReferenceCanOccupyOnlyOneSessionPhase(): void
    {
        $reference = str_repeat('f', 64);
        $dueAt = time() + 60;
        self::assertTrue($this->cleanupQueue->scheduleNew('session_pending', $reference, $dueAt));

        self::assertFalse($this->cleanupQueue->scheduleNew('session', $reference, $dueAt));
        self::assertFalse($this->cleanupQueue->scheduleNew('session_delete', $reference, $dueAt));
        self::assertSame(1, (int) $this->database->pdo()->query(
            "SELECT COUNT(*) FROM cleanup_queue WHERE item_name = '" . $reference . "'"
        )->fetchColumn());
    }

    public function testQueuePhaseTransitionRequiresFreshDueTime(): void
    {
        $reference = str_repeat('b', 64);
        $dueAt = time() + 60;
        self::assertTrue($this->cleanupQueue->scheduleNew('session_pending', $reference, $dueAt));
        self::assertFalse($this->cleanupQueue->transitionIfDue(
            'session_pending',
            'session',
            $reference,
            $dueAt - 1,
            $dueAt
        ));
        self::assertTrue($this->cleanupQueue->transitionIfDue(
            'session_pending',
            'session',
            $reference,
            $dueAt,
            $dueAt
        ));
        self::assertNull($this->cleanupQueue->currentDue('session_pending', $reference));
        self::assertSame($dueAt, $this->cleanupQueue->currentDue('session', $reference));
    }

    public function testSessionRefreshCannotResurrectDeletionPhase(): void
    {
        $reference = str_repeat('e', 64);
        $dueAt = time() + 60;
        self::assertTrue($this->cleanupQueue->scheduleNew('session_delete', $reference, $dueAt));

        self::assertFalse($this->cleanupQueue->rescheduleExisting('session', $reference, $dueAt + 60));
        self::assertNull($this->cleanupQueue->currentDue('session', $reference));
        self::assertSame($dueAt, $this->cleanupQueue->currentDue('session_delete', $reference));
    }

    public function testUnqueuedRuntimeFileIsNotEnumerated(): void
    {
        $path = $this->config->string('storage_path') . '/.pending/untracked-old-file';
        file_put_contents($path, 'x');
        touch($path, time() - 7200);

        [$exit, , $stderr] = $this->runCleanup(['--limit=1']);

        self::assertSame(0, $exit, $stderr);
        self::assertFileExists($path);
    }

    public function testLockedOldMarkerIsSkipped(): void
    {
        $name = str_repeat('e', 48) . '.png';
        $path = $this->config->string('storage_path') . '/' . $name;
        $marker = $this->config->string('storage_path') . '/.pending/' . $name . '.pending';
        file_put_contents($path, 'x');
        file_put_contents($marker, '');
        chmod($marker, 0600);
        touch($marker, time() - 3601);
        $this->cleanupQueue->schedule('pending', basename($marker), time() - 1);
        $handle = fopen($marker, 'r+');
        self::assertIsResource($handle);
        self::assertTrue(flock($handle, LOCK_EX | LOCK_NB));

        try {
            [$exit, , $stderr] = $this->runCleanup(['--limit=10']);
            self::assertSame(0, $exit, $stderr);
            self::assertFileExists($path);
            self::assertFileExists($marker);
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    public function testManualDestroyRetryDoesNotDuplicateAuditAndFinalizesStorageDeletion(): void
    {
        $created = $this->service->create($this->validPng(), 30, 3600, 'global');

        self::assertTrue($this->service->destroy((int) $created['id'], 'manual'));
        self::assertTrue($this->service->destroy((int) $created['id'], 'manual'));
        $row = $this->database->pdo()->query(
            'SELECT status, destroyed_at, storage_deleted_at FROM flash_images'
        )->fetch();

        self::assertSame('destroyed', $row['status']);
        self::assertGreaterThan(0, (int) $row['destroyed_at']);
        self::assertGreaterThan(0, (int) $row['storage_deleted_at']);
        self::assertSame(1, (int) $this->database->pdo()->query(
            "SELECT COUNT(*) FROM audit_logs WHERE event_type = 'manual_destroy'"
        )->fetchColumn());
    }

    public function testCleanupRejectsNonCanonicalSessionPath(): void
    {
        [$exit, , $stderr] = $this->runCleanup([
            '--limit=1',
            '--session-path=' . $this->root . '/storage/sessions/.',
        ]);

        self::assertSame(1, $exit);
        self::assertStringContainsString('session directory is unavailable or unsafe', $stderr);
    }

    public function testCleanupRejectsSiblingAndOtherApplicationSessionPaths(): void
    {
        foreach ([$this->root . '/storage', $this->root] as $path) {
            [$exit, , $stderr] = $this->runCleanup(['--limit=1', '--session-path=' . $path]);
            self::assertSame(1, $exit);
            self::assertStringContainsString('session directory is unavailable or unsafe', $stderr);
        }
    }

    public function testSuccessfulCreateLeavesNoPendingArtifacts(): void
    {
        $this->service->create($this->validPng(), 30, 3600, 'global');
        $entries = array_values(array_diff(
            scandir($this->config->string('storage_path') . '/.pending') ?: [],
            ['.', '..']
        ));

        self::assertSame([], $entries);
        self::assertSame(0, (int) $this->database->pdo()->query(
            "SELECT COUNT(*) FROM cleanup_queue WHERE category = 'pending'"
        )->fetchColumn());
    }

    public function testResidualCleanupLimitBoundsUnfinalizedTerminalRecords(): void
    {
        if (!function_exists('proc_open')) {
            self::markTestSkipped('proc_open is unavailable.');
        }
        $this->service->create($this->validPng(), 30, 3600, 'global');
        $this->service->create($this->validPng(), 30, 3600, 'global');
        $this->service->create($this->validPng(), 30, 3600, 'global');
        $rows = $this->database->pdo()->query('SELECT storage_name FROM flash_images ORDER BY id')->fetchAll();
        foreach ($rows as $row) {
            unlink($this->config->string('storage_path') . '/' . $row['storage_name']);
        }
        $this->database->pdo()->exec(
            "UPDATE flash_images SET status = 'expired', destroyed_at = NULL, storage_deleted_at = NULL,
             destroy_reason = 'view_timeout'"
        );
        $this->database->pdo()->exec(
            'UPDATE flash_images SET destroyed_at = 2, storage_deleted_at = 2
             WHERE id = (SELECT MIN(id) FROM flash_images)'
        );

        [$exit, , $stderr] = $this->runCleanup(['--limit=1']);
        self::assertSame(0, $exit, $stderr);
        self::assertSame(1, (int) $this->database->pdo()->query(
            'SELECT COUNT(*) FROM flash_images WHERE destroyed_at IS NULL'
        )->fetchColumn());
        self::assertSame(1, $this->automaticDestroyCount());

        [$exit, , $stderr] = $this->runCleanup(['--limit=1']);
        self::assertSame(0, $exit, $stderr);
        self::assertSame(0, (int) $this->database->pdo()->query(
            'SELECT COUNT(*) FROM flash_images WHERE destroyed_at IS NULL'
        )->fetchColumn());
        self::assertSame(2, $this->automaticDestroyCount());
    }

    public function testRetentionDeleteRechecksOriginalCutoff(): void
    {
        $source = (string) file_get_contents(dirname(__DIR__) . '/scripts/cleanup.php');

        self::assertStringContainsString(
            "AND storage_deleted_at IS NOT NULL AND destroyed_at IS NOT NULL AND destroyed_at <= :cutoff",
            $source
        );
        self::assertStringContainsString("['id' => \$row['id'], 'cutoff' => \$retentionCutoff]", $source);
    }

    public function testCleanupQueriesFollowTheirCoveringIndexOrder(): void
    {
        $source = (string) file_get_contents(dirname(__DIR__) . '/scripts/cleanup.php');
        self::assertStringContainsString(
            'WHERE created_at <= :cutoff ORDER BY created_at, id LIMIT :limit',
            $source
        );
        self::assertStringContainsString('ORDER BY destroyed_at, id LIMIT :limit', $source);

        $plans = [
            "SELECT id FROM flash_images INDEXED BY idx_flash_images_cleanup_unused
             WHERE status = 'unused' AND unused_expires_at <= 9999999999
             ORDER BY unused_expires_at, id LIMIT 500" => 'idx_flash_images_cleanup_unused',
            "SELECT id FROM flash_images INDEXED BY idx_flash_images_cleanup_opened
             WHERE status = 'opened' AND expires_at <= 9999999999
             ORDER BY expires_at, id LIMIT 500" => 'idx_flash_images_cleanup_opened',
            "SELECT id FROM audit_logs INDEXED BY idx_audit_logs_cleanup WHERE created_at <= 9999999999
             ORDER BY created_at, id LIMIT 500" => 'idx_audit_logs_cleanup',
            "SELECT id FROM flash_images INDEXED BY idx_flash_images_cleanup_retention
             WHERE status IN ('expired', 'destroyed') AND destroyed_at IS NOT NULL
             AND storage_deleted_at IS NOT NULL AND destroyed_at <= 9999999999
             ORDER BY destroyed_at, id LIMIT 500" => 'idx_flash_images_cleanup_retention',
            "SELECT id FROM flash_images INDEXED BY idx_flash_images_pending_terminal
             WHERE status IN ('expired', 'destroyed') AND storage_deleted_at IS NULL
             AND COALESCE(cleanup_retry_at, 0) <= 9999999999
             ORDER BY COALESCE(cleanup_retry_at, 0), id LIMIT 500" => 'idx_flash_images_pending_terminal',
            "SELECT item_name, due_at FROM cleanup_queue INDEXED BY idx_cleanup_queue_due
             WHERE category = 'pending' AND due_at <= 9999999999
             ORDER BY due_at, item_name LIMIT 500" => 'idx_cleanup_queue_due',
        ];
        foreach ($plans as $query => $index) {
            $details = $this->database->pdo()->query('EXPLAIN QUERY PLAN ' . $query)->fetchAll();
            $plan = implode(' | ', array_column($details, 'detail'));
            self::assertStringContainsString($index, $plan, $plan);
            self::assertStringNotContainsString('USE TEMP B-TREE', $plan, $plan);
            if ($index === 'idx_flash_images_pending_terminal') {
                self::assertStringContainsString('SEARCH flash_images', $plan, $plan);
            }
        }
    }

    /**
     * @param list<string> $arguments
     * @param array<string, string> $environment
     * @return array{int, string, string}
     */
    private function runCleanup(
        array $arguments,
        bool $configureSessionIni = true,
        array $environment = []
    ): array
    {
        $command = [PHP_BINARY];
        if ($configureSessionIni) {
            array_push($command, '-d', 'session.save_path=' . $this->root . '/storage/sessions');
        }
        array_push($command, dirname(__DIR__) . '/scripts/cleanup.php', ...$arguments);
        $pipes = [];
        $process = proc_open($command, [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ], $pipes, dirname(__DIR__), array_replace($this->processEnvironment(), $environment));
        self::assertIsResource($process);
        fclose($pipes[0]);
        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exit = proc_close($process);
        return [$exit, (string) $stdout, (string) $stderr];
    }

    private function automaticDestroyCount(): int
    {
        return (int) $this->database->pdo()->query(
            "SELECT COUNT(*) FROM audit_logs WHERE event_type = 'automatic_destroy'"
        )->fetchColumn();
    }
}
