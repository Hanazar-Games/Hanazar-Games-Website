<?php

declare(strict_types=1);

namespace FlashPhoto\Tests;

use FlashPhoto\NotFoundException;

final class RedeemTest extends TestCase
{
    public function testInvalidTokenReturnsNotFound(): void
    {
        $this->expectException(NotFoundException::class);
        $this->service->redeem(str_repeat('a', 43), 'viewer', 'ip', 'ua');
    }

    public function testTwoSequentialRedeemsObserveOneExpiry(): void
    {
        $created = $this->service->create($this->validPng(), 15, 3600, 'global');
        $serviceTwo = clone $this->service;
        $a = $this->service->redeem($created['token'], 'a', 'ip-a', 'ua-a');
        $b = $serviceTwo->redeem($created['token'], 'b', 'ip-b', 'ua-b');

        self::assertSame($a['opened_at'], $b['opened_at']);
        self::assertSame($a['expires_at'], $b['expires_at']);
    }

    public function testConcurrentRedeemsSetExpiryOnlyOnce(): void
    {
        if (!function_exists('proc_open')) {
            self::markTestSkipped('proc_open is unavailable.');
        }
        $created = $this->service->create($this->validPng(), 15, 3600, 'global');
        $barrier = $this->root . '/redeem-barrier';
        $workers = [];

        for ($index = 0; $index < 2; $index++) {
            $environment = $this->processEnvironment();
            $environment['TEST_BARRIER'] = $barrier;
            $environment['TEST_WORKER_ID'] = (string) $index;
            $pipes = [];
            $process = proc_open(
                [PHP_BINARY, __DIR__ . '/redeem-worker.php'],
                [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
                $pipes,
                dirname(__DIR__),
                $environment
            );
            self::assertIsResource($process);
            fwrite($pipes[0], $created['token']);
            fclose($pipes[0]);
            $workers[] = [$process, $pipes];
        }
        $readyDeadline = microtime(true) + 10;
        while ((!is_file($barrier . '.ready-0') || !is_file($barrier . '.ready-1'))
            && microtime(true) < $readyDeadline) {
            usleep(1000);
        }
        self::assertFileExists($barrier . '.ready-0');
        self::assertFileExists($barrier . '.ready-1');
        touch($barrier);

        $results = [];
        foreach ($workers as [$process, $pipes]) {
            $stdout = stream_get_contents($pipes[1]);
            $stderr = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            self::assertSame(0, proc_close($process), (string) $stderr);
            $result = json_decode((string) $stdout, true, 512, JSON_THROW_ON_ERROR);
            self::assertIsArray($result);
            $results[] = $result;
        }

        self::assertSame($results[0]['opened_at'], $results[1]['opened_at']);
        self::assertSame($results[0]['expires_at'], $results[1]['expires_at']);
        self::assertSame(1, (int) $this->database->pdo()->query(
            "SELECT COUNT(*) FROM audit_logs WHERE event_type = 'first_open'"
        )->fetchColumn());
    }

    public function testFirstViewerModeRejectsAnotherViewer(): void
    {
        $created = $this->service->create($this->validPng(), 30, 3600, 'first');
        $this->service->redeem($created['token'], 'viewer-a', 'ip', 'ua');

        $this->expectException(NotFoundException::class);
        $this->service->redeem($created['token'], 'viewer-b', 'ip', 'ua');
    }

    public function testManualDestroyImmediatelyRevokesAndRemovesFile(): void
    {
        $created = $this->service->create($this->validPng(), 30, 3600, 'global');
        $this->service->destroy((int) $created['id'], 'manual');
        self::assertSame([], glob($this->config->string('storage_path') . '/*') ?: []);

        $this->expectException(NotFoundException::class);
        $this->service->redeem($created['token'], 'viewer', 'ip', 'ua');
    }
}
