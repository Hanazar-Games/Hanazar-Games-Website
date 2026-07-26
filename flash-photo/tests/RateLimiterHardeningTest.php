<?php

declare(strict_types=1);

namespace FlashPhoto\Tests;

use FlashPhoto\Config;
use FlashPhoto\Logger;
use FlashPhoto\RateLimiter;
use FlashPhoto\RateLimitException;
use InvalidArgumentException;
use RuntimeException;

final class RateLimiterHardeningTest extends TestCase
{
    public function testConfigRejectsExcessiveRateLimitValues(): void
    {
        foreach ([
            ['limit' => 1_000_001, 'window' => 60],
            ['limit' => 1, 'window' => 31_536_001],
        ] as $definition) {
            $values = $this->configValues;
            $values['rate_limits']['probe'] = $definition;
            try {
                Config::fromArray($values);
                self::fail('Excessive rate-limit configuration was accepted.');
            } catch (InvalidArgumentException $exception) {
                self::assertSame(
                    'Every rate limit requires limit <= 1000000 and window <= 31536000.',
                    $exception->getMessage()
                );
            }
        }
    }

    public function testBlockedWindowIsReadOnlyAfterFirstCrossing(): void
    {
        $limiter = $this->rateLimiter();
        $identifier = 'read-only-blocked-client';
        $path = $this->statePath($identifier);
        $limiter->consume('probe', $identifier);
        $limiter->consume('probe', $identifier);
        try {
            $limiter->consume('probe', $identifier);
            self::fail('First rate-limit crossing was accepted.');
        } catch (RateLimitException $exception) {
            self::assertTrue($exception->firstExceeded);
        }

        clearstatcache(true, $path);
        $beforeStat = lstat($path);
        self::assertIsArray($beforeStat);
        $beforeState = file_get_contents($path);
        $beforeChanges = (int) $this->database->pdo()->query('SELECT total_changes()')->fetchColumn();
        $beforeLogs = $this->logContents();
        $lockPath = $this->config->string('rate_limit_path') . '/.rate-limit.lock';
        $beforeLockStat = lstat($lockPath);
        self::assertIsArray($beforeLockStat);
        sleep(1);

        try {
            $limiter->consume('probe', $identifier);
            self::fail('Repeated blocked request was accepted.');
        } catch (RateLimitException $exception) {
            self::assertFalse($exception->firstExceeded);
        }

        clearstatcache(true, $path);
        $afterStat = lstat($path);
        self::assertIsArray($afterStat);
        $afterLockStat = lstat($lockPath);
        self::assertIsArray($afterLockStat);
        self::assertSame($beforeStat['dev'], $afterStat['dev']);
        self::assertSame($beforeStat['ino'], $afterStat['ino']);
        self::assertSame($beforeState, file_get_contents($path));
        foreach (['dev', 'ino', 'mode', 'mtime', 'ctime'] as $field) {
            self::assertSame($beforeLockStat[$field], $afterLockStat[$field], $field);
        }
        self::assertSame(
            $beforeChanges,
            (int) $this->database->pdo()->query('SELECT total_changes()')->fetchColumn()
        );
        self::assertSame($beforeLogs, $this->logContents());
    }

    public function testRetryAfterAndExpiredWindowReset(): void
    {
        $limiter = $this->rateLimiter();
        $identifier = 'window-boundary-client';
        $path = $this->statePath($identifier);
        $limiter->consume('probe', $identifier);
        $limiter->consume('probe', $identifier);
        try {
            $limiter->consume('probe', $identifier);
            self::fail('First rate-limit crossing was accepted.');
        } catch (RateLimitException $exception) {
            $initialRetry = (int) $exception->headers['Retry-After'];
            self::assertGreaterThanOrEqual(1, $initialRetry);
            self::assertLessThanOrEqual(60, $initialRetry);
        }

        file_put_contents($path, json_encode([
            'started' => time() - 30,
            'count' => 3,
        ], JSON_THROW_ON_ERROR));
        chmod($path, 0600);
        try {
            $limiter->consume('probe', $identifier);
            self::fail('Active blocked window was accepted.');
        } catch (RateLimitException $exception) {
            self::assertFalse($exception->firstExceeded);
            $laterRetry = (int) $exception->headers['Retry-After'];
            self::assertGreaterThanOrEqual(1, $laterRetry);
            self::assertLessThan($initialRetry, $laterRetry);
        }

        $expiredStartedAt = time() - 60;
        file_put_contents($path, json_encode([
            'started' => $expiredStartedAt,
            'count' => 3,
        ], JSON_THROW_ON_ERROR));
        chmod($path, 0600);
        $limiter->consume('probe', $identifier);

        $state = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame(1, $state['count']);
        self::assertGreaterThan($expiredStartedAt, $state['started']);
        self::assertSame(
            $state['started'] + 60,
            $this->cleanupQueue->currentDue('rate_limit', basename($path))
        );
    }

    public function testTruncatedExistingStateFailsClosedWithoutReplacement(): void
    {
        $this->assertCorruptStateRejected('truncated-client', '{"started":');
    }

    public function testMalformedExistingStateFailsClosedWithoutReplacement(): void
    {
        $this->assertCorruptStateRejected(
            'malformed-client',
            json_encode(['started' => 'now', 'count' => 1], JSON_THROW_ON_ERROR)
        );
    }

    public function testUnsafeExistingStatePathFailsClosed(): void
    {
        $path = $this->statePath('unsafe-path-client');
        $target = $this->root . '/external-rate-limit.json';
        $contents = json_encode(['started' => time(), 'count' => 1], JSON_THROW_ON_ERROR);
        file_put_contents($target, $contents);
        chmod($target, 0600);
        if (!function_exists('symlink') || !@symlink($target, $path)) {
            self::markTestSkipped('Symbolic links are unavailable.');
        }

        try {
            $this->rateLimiter()->consume('probe', 'unsafe-path-client');
            self::fail('Symbolic-link rate-limit state was accepted.');
        } catch (RuntimeException $exception) {
            self::assertSame('Rate limiter state is corrupt.', $exception->getMessage());
        }
        self::assertSame($contents, file_get_contents($target));
        self::assertTrue(is_link($path));
    }

    public function testAtomicWriteInterruptionBeforeRenameIsRecovered(): void
    {
        $path = $this->statePath('interrupted-client');
        $temporary = $path . '.tmp';
        file_put_contents($path, json_encode(['started' => time(), 'count' => 1], JSON_THROW_ON_ERROR));
        chmod($path, 0600);
        file_put_contents($temporary, '{"started":');
        chmod($temporary, 0600);

        $this->rateLimiter()->consume('probe', 'interrupted-client');

        self::assertFalse(@lstat($temporary));
        $state = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame(2, $state['count']);
    }

    public function testAtomicDurabilityAndCleanupSourceContracts(): void
    {
        $rateLimiter = (string) file_get_contents(dirname(__DIR__) . '/app/RateLimiter.php');
        $cleanup = (string) file_get_contents(dirname(__DIR__) . '/scripts/cleanup.php');

        self::assertStringNotContainsString('ftruncate(', $rateLimiter);
        self::assertStringContainsString("@fopen(\$temporary, 'x+b')", $rateLimiter);
        self::assertStringContainsString('@fsync($handle)', $rateLimiter);
        self::assertStringContainsString('@rename($temporary, $path)', $rateLimiter);
        self::assertStringContainsString('$this->syncDirectory()', $rateLimiter);
        self::assertStringContainsString("\$temporary = \$path . '.tmp';", $cleanup);
        self::assertStringContainsString('exactStat($temporary)', $cleanup);
        self::assertStringNotContainsString('scandir(', $cleanup);
    }

    public function testCleanupRemovesInterruptedWriteWhenFormalStateIsMissing(): void
    {
        $name = str_repeat('d', 64) . '.json';
        $path = $this->config->string('rate_limit_path') . '/' . $name;
        $temporary = $path . '.tmp';
        file_put_contents($temporary, '{"started":');
        chmod($temporary, 0600);
        $this->cleanupQueue->schedule('rate_limit', $name, time() - 1);

        [$exit, , $stderr] = $this->runCleanup();

        self::assertSame(0, $exit, $stderr);
        self::assertFalse(@lstat($path));
        self::assertFalse(@lstat($temporary));
        self::assertNull($this->cleanupQueue->currentDue('rate_limit', $name));
    }

    public function testCleanupRemovesFormalAndInterruptedStateBeforeQueueRow(): void
    {
        $name = str_repeat('e', 64) . '.json';
        $path = $this->config->string('rate_limit_path') . '/' . $name;
        $temporary = $path . '.tmp';
        file_put_contents($path, json_encode([
            'started' => time() - 7200,
            'count' => 1,
        ], JSON_THROW_ON_ERROR));
        chmod($path, 0600);
        touch($path, time() - 7200);
        file_put_contents($temporary, '{"started":');
        chmod($temporary, 0600);
        $this->cleanupQueue->schedule('rate_limit', $name, time() - 1);

        [$exit, , $stderr] = $this->runCleanup();

        self::assertSame(0, $exit, $stderr);
        self::assertFalse(@lstat($path));
        self::assertFalse(@lstat($temporary));
        self::assertNull($this->cleanupQueue->currentDue('rate_limit', $name));
    }

    public function testCleanupRejectsUnsafeInterruptedStatePath(): void
    {
        $name = str_repeat('f', 64) . '.json';
        $path = $this->config->string('rate_limit_path') . '/' . $name;
        $temporary = $path . '.tmp';
        file_put_contents($path, json_encode([
            'started' => time() - 120,
            'count' => 1,
        ], JSON_THROW_ON_ERROR));
        chmod($path, 0600);
        touch($path, time() - 120);
        mkdir($temporary, 0700);
        $dueAt = time() - 1;
        $this->cleanupQueue->schedule('rate_limit', $name, $dueAt);

        [$exit, , $stderr] = $this->runCleanup();

        self::assertSame(1, $exit);
        self::assertStringContainsString('unable to inspect temporary item', $stderr);
        self::assertFileExists($path);
        self::assertDirectoryExists($temporary);
        self::assertGreaterThan($dueAt, (int) $this->cleanupQueue->currentDue('rate_limit', $name));
    }

    private function assertCorruptStateRejected(string $identifier, string $contents): void
    {
        $path = $this->statePath($identifier);
        file_put_contents($path, $contents);
        chmod($path, 0600);
        try {
            $this->rateLimiter()->consume('probe', $identifier);
            self::fail('Corrupt rate-limit state was accepted.');
        } catch (RuntimeException $exception) {
            self::assertSame('Rate limiter state is corrupt.', $exception->getMessage());
        }
        self::assertSame($contents, file_get_contents($path));
    }

    private function rateLimiter(): RateLimiter
    {
        return new RateLimiter(
            $this->config,
            new Logger($this->config, $this->cleanupQueue),
            $this->cleanupQueue
        );
    }

    private function statePath(string $identifier): string
    {
        $key = hash_hmac('sha256', 'probe|' . $identifier, $this->config->string('app_secret'));
        return $this->config->string('rate_limit_path') . '/' . $key . '.json';
    }

    /** @return list<string> */
    private function logContents(): array
    {
        return array_map(
            static fn (string $log): string => (string) file_get_contents($log),
            glob($this->config->string('log_path') . '/*.log') ?: []
        );
    }

    /** @return array{int, string, string} */
    private function runCleanup(): array
    {
        if (!function_exists('proc_open')) {
            self::markTestSkipped('proc_open is unavailable.');
        }
        $command = [
            PHP_BINARY,
            '-d',
            'session.save_path=' . $this->root . '/storage/sessions',
            dirname(__DIR__) . '/scripts/cleanup.php',
            '--limit=1',
        ];
        $pipes = [];
        $process = proc_open($command, [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ], $pipes, dirname(__DIR__), $this->processEnvironment());
        self::assertIsResource($process);
        fclose($pipes[0]);
        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        return [proc_close($process), (string) $stdout, (string) $stderr];
    }
}
