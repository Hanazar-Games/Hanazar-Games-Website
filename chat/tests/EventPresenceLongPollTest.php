<?php

declare(strict_types=1);

namespace Hanazar\Chat\Tests;

use Hanazar\Chat\HttpException;
use PDO;
use Throwable;

final class EventPresenceLongPollTest extends TestCase
{
    public function testFanOutStoresAndReturnsOnlyLightweightEventReferences(): void
    {
        $user = $this->createUser('event-recipient');
        $context = $this->contextFor((int) $user['id']);
        $cursor = $this->events->cursor($context);

        $this->database->immediate(function (PDO $pdo) use ($user): void {
            $this->events->fanOut(
                $pdo,
                [(int) $user['id']],
                null,
                'message.created',
                73,
                1_700_000_000,
            );
        });

        $batch = $this->events->fetch($context, $cursor, 100);
        self::assertCount(1, $batch['events']);
        self::assertGreaterThan($cursor, $batch['cursor']);
        self::assertSame('message.created', $batch['events'][0]['type']);
        self::assertSame(73, $batch['events'][0]['entity_id']);

        foreach (['body', 'payload', 'url', 'flash_url'] as $forbidden) {
            self::assertArrayNotHasKey($forbidden, $batch['events'][0]);
        }

        $columns = $this->database->connection()
            ->query('PRAGMA table_info(user_events)')
            ->fetchAll(PDO::FETCH_ASSOC);
        $columnNames = array_column($columns, 'name');
        self::assertNotContains('body', $columnNames);
        self::assertNotContains('payload', $columnNames);
        self::assertNotContains('url', $columnNames);
        self::assertStringNotContainsString(
            'https://s.hanazargames.com/',
            json_encode($batch, JSON_THROW_ON_ERROR),
        );
    }

    public function testBusinessMutationRollsBackWhenItsEventCannotBeWritten(): void
    {
        $user = $this->createUser('atomic-event');
        $pdo = $this->database->connection();
        $pdo->exec(
            "CREATE TEMP TRIGGER fail_event BEFORE INSERT ON user_events "
            . "BEGIN SELECT RAISE(ABORT, 'forced event failure'); END",
        );

        try {
            $this->database->immediate(function (PDO $transaction) use ($user): void {
                $transaction->exec(
                    "INSERT INTO app_meta (key, value) VALUES ('atomic_event_probe', 'written')",
                );
                $this->events->fanOut(
                    $transaction,
                    [(int) $user['id']],
                    null,
                    'probe.changed',
                    null,
                    1_700_000_000,
                );
            });
            self::fail('The business mutation committed without its event.');
        } catch (Throwable $exception) {
            self::assertStringContainsString('forced event failure', $exception->getMessage());
        }

        self::assertFalse($pdo->inTransaction());
        self::assertFalse(
            (bool) $pdo->query(
                "SELECT 1 FROM app_meta WHERE key = 'atomic_event_probe'",
            )->fetchColumn(),
        );
    }

    public function testFetchReauthorizesRoomMembershipAndDropsStaleEvents(): void
    {
        $owner = $this->createUser('event-owner');
        $member = $this->createUser('event-member');
        $ownerContext = $this->contextFor((int) $owner['id']);
        $memberContext = $this->contextFor((int) $member['id']);
        $room = $this->rooms->createGroup(
            $ownerContext,
            'Private group',
            [(int) $member['id']],
        );
        $roomId = (int) $room['id'];
        $cursor = $this->events->cursor($memberContext);

        $this->database->immediate(function (PDO $pdo) use ($member, $roomId): void {
            $this->events->fanOut(
                $pdo,
                [(int) $member['id']],
                $roomId,
                'message.created',
                991,
                1_700_000_001,
            );
        });
        $this->rooms->removeMember($ownerContext, $roomId, (int) $member['id']);

        $batch = $this->events->fetch($memberContext, $cursor, 100);
        self::assertNotContains('message.created', array_column($batch['events'], 'type'));
        self::assertStringNotContainsString('991', json_encode($batch, JSON_THROW_ON_ERROR));
    }

    public function testFetchRejectsCursorOlderThanRetentionFloor(): void
    {
        $user = $this->createUser('expired-cursor');
        $context = $this->contextFor((int) $user['id']);
        $cursor = $this->events->cursor($context);
        $statement = $this->database->connection()->prepare(
            "INSERT INTO app_meta (key, value) VALUES ('events_floor_id', :floor) "
            . 'ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        );
        $statement->execute(['floor' => (string) ($cursor + 1)]);

        $exception = $this->captureHttpException(
            fn () => $this->events->fetch($context, $cursor, 100),
        );
        self::assertSame(409, $exception->status());
        self::assertSame('event_cursor_expired', $exception->errorCode());
    }

    public function testFreshCursorNeverStartsBehindRetentionFloor(): void
    {
        $user = $this->createUser('fresh-cursor');
        $context = $this->contextFor((int) $user['id']);
        $this->database->connection()->exec(
            "UPDATE app_meta SET value = '500' WHERE key = 'events_floor_id'",
        );

        self::assertSame(500, $this->events->cursor($context));
        self::assertSame([], $this->events->fetch($context, 500)['events']);
    }

    public function testEmptyPollIsBoundedAndSleepsOutsideDatabaseTransactions(): void
    {
        $user = $this->createUser('bounded-poll');
        $context = $this->contextFor((int) $user['id']);
        $cursor = $this->events->cursor($context);
        $waitChecks = 0;
        $started = hrtime(true);

        $batch = $this->events->poll(
            $context,
            $cursor,
            60,
            100,
            function () use (&$waitChecks): void {
                ++$waitChecks;
                self::assertFalse($this->database->connection()->inTransaction());
            },
        );
        $elapsedMs = (hrtime(true) - $started) / 1_000_000;

        self::assertSame([], $batch['events']);
        self::assertSame($cursor, $batch['cursor']);
        self::assertGreaterThan(0, $waitChecks);
        self::assertGreaterThanOrEqual(40, $elapsedMs);
        self::assertLessThan(500, $elapsedMs);
        self::assertFalse($this->database->connection()->inTransaction());
    }

    public function testOnlyOneLongPollMayWaitPerUserAcrossProcesses(): void
    {
        $this->requireProcessSupport();
        $user = $this->createUser('poll-cap');
        $context = $this->contextFor((int) $user['id']);
        $cursor = $this->events->cursor($context);
        $readyPath = $this->runtimeRoot . '/poll-cap.ready';
        $worker = $this->startWorker(
            'poll',
            (int) $user['id'],
            $cursor,
            1_500,
            $readyPath,
        );

        try {
            $this->waitForFile($readyPath);
            usleep(150_000);
            $exception = $this->captureHttpException(
                fn () => $this->events->poll($context, $cursor, 20, 100),
            );
            self::assertSame(429, $exception->status());
            self::assertSame('poll_limit_exceeded', $exception->errorCode());

            $this->database->immediate(function (PDO $pdo) use ($user): void {
                $this->events->fanOut(
                    $pdo,
                    [(int) $user['id']],
                    null,
                    'poll.release',
                    null,
                );
            });
            $result = $this->finishWorker($worker, 3_000);
            self::assertSame(0, $result['exit_code'], $result['stderr']);
            self::assertTrue($result['json']['ok'] ?? false, $result['stdout']);
        } finally {
            $this->stopWorker($worker);
        }
    }

    public function testPollCallerCanReleaseSessionLockBeforeWaiting(): void
    {
        $this->requireProcessSupport();
        $user = $this->createUser('session-poll');
        $context = $this->contextFor((int) $user['id']);
        $cursor = $this->events->cursor($context);
        $readyPath = $this->runtimeRoot . '/session-poll.ready';
        $sessionId = 'chatpoll' . bin2hex(random_bytes(12));
        $worker = $this->startWorker(
            'session-poll',
            (int) $user['id'],
            $cursor,
            1_500,
            $readyPath,
            $sessionId,
        );

        try {
            $this->waitForFile($readyPath);
            $started = hrtime(true);
            $probe = $this->runWorker(
                'session-acquire',
                (int) $user['id'],
                $cursor,
                0,
                $this->runtimeRoot . '/unused.ready',
                $sessionId,
            );
            $elapsedMs = (hrtime(true) - $started) / 1_000_000;

            self::assertSame(0, $probe['exit_code'], $probe['stderr']);
            self::assertTrue($probe['json']['ok'] ?? false, $probe['stdout']);
            self::assertLessThan(300, (float) ($probe['json']['elapsed_ms'] ?? INF));
            self::assertLessThan(700, $elapsedMs);

            $this->database->immediate(function (PDO $pdo) use ($user): void {
                $this->events->fanOut(
                    $pdo,
                    [(int) $user['id']],
                    null,
                    'poll.release',
                    null,
                );
            });
            $result = $this->finishWorker($worker, 3_000);
            self::assertSame(0, $result['exit_code'], $result['stderr']);
            self::assertTrue($result['json']['ok'] ?? false, $result['stdout']);
        } finally {
            $this->stopWorker($worker);
        }
    }

    public function testPresenceIsVisibleOnlyInsideSharedRoomAndDerivesOfflineState(): void
    {
        $owner = $this->createUser('presence-owner');
        $member = $this->createUser('presence-member');
        $outsider = $this->createUser('presence-outsider');
        $ownerContext = $this->contextFor((int) $owner['id']);
        $memberContext = $this->contextFor((int) $member['id']);
        $outsiderContext = $this->contextFor((int) $outsider['id']);
        $room = $this->rooms->createGroup(
            $ownerContext,
            'Presence group',
            [(int) $member['id']],
        );
        $roomId = (int) $room['id'];
        $now = 1_700_000_000;

        $this->presence->heartbeat($memberContext, 'online', $now);
        $this->presence->heartbeat($outsiderContext, 'online', $now);
        $state = $this->presence->roomState($ownerContext, $roomId, $now + 10);
        $members = $this->membersById($state['members']);

        self::assertSame('online', $members[(int) $member['id']]['status']);
        self::assertArrayNotHasKey((int) $outsider['id'], $members);
        $offline = $this->membersById(
            $this->presence->roomState($ownerContext, $roomId, $now + 61)['members'],
        );
        self::assertSame('offline', $offline[(int) $member['id']]['status']);

        $exception = $this->captureHttpException(
            fn () => $this->presence->roomState($outsiderContext, $roomId, $now + 10),
        );
        self::assertSame(404, $exception->status());
    }

    public function testTypingIsCoalescedExpiresAndStopsImmediately(): void
    {
        $owner = $this->createUser('typing-owner');
        $member = $this->createUser('typing-member');
        $ownerContext = $this->contextFor((int) $owner['id']);
        $memberContext = $this->contextFor((int) $member['id']);
        $room = $this->rooms->createGroup(
            $ownerContext,
            'Typing group',
            [(int) $member['id']],
        );
        $roomId = (int) $room['id'];
        $now = 1_700_000_000;
        $before = $this->eventCount($roomId, 'typing.changed');

        $this->presence->setTyping($memberContext, $roomId, true, $now);
        $afterFirst = $this->eventCount($roomId, 'typing.changed');
        $this->presence->setTyping($memberContext, $roomId, true, $now);

        self::assertGreaterThan($before, $afterFirst);
        self::assertSame($afterFirst, $this->eventCount($roomId, 'typing.changed'));
        self::assertTrue(
            $this->membersById(
                $this->presence->roomState($ownerContext, $roomId, $now + 1)['members'],
            )[(int) $member['id']]['typing'],
        );
        self::assertSame(1, $this->typingRowCount($roomId, (int) $member['id']));

        $this->presence->setTyping($memberContext, $roomId, false, $now + 2);
        self::assertFalse(
            $this->membersById(
                $this->presence->roomState($ownerContext, $roomId, $now + 2)['members'],
            )[(int) $member['id']]['typing'],
        );
        self::assertSame(0, $this->typingRowCount($roomId, (int) $member['id']));

        $this->presence->setTyping($memberContext, $roomId, true, $now + 3);
        $expired = $this->membersById(
            $this->presence->roomState($ownerContext, $roomId, $now + 12)['members'],
        );
        self::assertFalse($expired[(int) $member['id']]['typing']);
        $this->presence->cleanup($now + 12);
        self::assertSame(0, $this->typingRowCount($roomId, (int) $member['id']));
    }

    public function testMembershipRemovalAndArchiveClearTypingState(): void
    {
        $owner = $this->createUser('cleanup-owner');
        $member = $this->createUser('cleanup-member');
        $ownerContext = $this->contextFor((int) $owner['id']);
        $memberContext = $this->contextFor((int) $member['id']);
        $room = $this->rooms->createGroup(
            $ownerContext,
            'Removal group',
            [(int) $member['id']],
        );
        $roomId = (int) $room['id'];

        $this->presence->setTyping($memberContext, $roomId, true, 1_700_000_000);
        $this->rooms->removeMember($ownerContext, $roomId, (int) $member['id']);
        self::assertSame(0, $this->typingRowCount($roomId, (int) $member['id']));
        self::assertSame(
            404,
            $this->captureHttpException(
                fn () => $this->presence->setTyping(
                    $memberContext,
                    $roomId,
                    true,
                    1_700_000_001,
                ),
            )->status(),
        );

        $archived = $this->rooms->createGroup(
            $ownerContext,
            'Archived group',
            [(int) $member['id']],
        );
        $archivedId = (int) $archived['id'];
        $this->presence->setTyping($memberContext, $archivedId, true, 1_700_000_002);
        $this->rooms->archive($ownerContext, $archivedId);

        self::assertSame(0, $this->typingRowCount($archivedId, (int) $member['id']));
        self::assertSame(
            409,
            $this->captureHttpException(
                fn () => $this->presence->setTyping(
                    $memberContext,
                    $archivedId,
                    true,
                    1_700_000_003,
                ),
            )->status(),
        );
    }

    private function captureHttpException(callable $operation): HttpException
    {
        try {
            $operation();
        } catch (HttpException $exception) {
            return $exception;
        }

        self::fail('Expected an HTTP exception.');
    }

    /** @param list<array<string, mixed>> $members
     *  @return array<int, array<string, mixed>>
     */
    private function membersById(array $members): array
    {
        $indexed = [];
        foreach ($members as $member) {
            $indexed[(int) $member['user_id']] = $member;
        }

        return $indexed;
    }

    private function eventCount(int $roomId, string $type): int
    {
        $statement = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM user_events WHERE room_id = :room_id AND event_type = :type',
        );
        $statement->execute(['room_id' => $roomId, 'type' => $type]);

        return (int) $statement->fetchColumn();
    }

    private function typingRowCount(int $roomId, int $userId): int
    {
        $statement = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM typing_indicators WHERE room_id = :room_id AND user_id = :user_id',
        );
        $statement->execute(['room_id' => $roomId, 'user_id' => $userId]);

        return (int) $statement->fetchColumn();
    }

    private function requireProcessSupport(): void
    {
        if (!function_exists('proc_open') || !is_file(PHP_BINARY)) {
            self::markTestSkipped('proc_open is unavailable.');
        }
    }

    /** @return array{process: resource, pipes: array<int, resource>} */
    private function startWorker(
        string $mode,
        int $userId,
        int $cursor,
        int $timeoutMs,
        string $readyPath,
        string $sessionId = '',
    ): array {
        $command = [
            PHP_BINARY,
            __DIR__ . '/fixtures/poll-worker.php',
            $mode,
            base64_encode(json_encode($this->validConfigValues(), JSON_THROW_ON_ERROR)),
            (string) $userId,
            (string) $cursor,
            (string) $timeoutMs,
            $readyPath,
            $sessionId,
        ];
        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $process = proc_open($command, $descriptors, $pipes, dirname(__DIR__));
        if (!is_resource($process)) {
            self::fail('Unable to start poll worker.');
        }
        fclose($pipes[0]);

        return ['process' => $process, 'pipes' => $pipes];
    }

    /** @return array{exit_code: int, stdout: string, stderr: string, json: array<string, mixed>} */
    private function runWorker(
        string $mode,
        int $userId,
        int $cursor,
        int $timeoutMs,
        string $readyPath,
        string $sessionId = '',
    ): array {
        $worker = $this->startWorker(
            $mode,
            $userId,
            $cursor,
            $timeoutMs,
            $readyPath,
            $sessionId,
        );

        return $this->finishWorker($worker, 2_000);
    }

    /**
     * @param array{process: resource, pipes: array<int, resource>} $worker
     * @return array{exit_code: int, stdout: string, stderr: string, json: array<string, mixed>}
     */
    private function finishWorker(array &$worker, int $timeoutMs): array
    {
        $deadline = hrtime(true) + ($timeoutMs * 1_000_000);
        do {
            $status = proc_get_status($worker['process']);
            if (!$status['running']) {
                break;
            }
            usleep(10_000);
        } while (hrtime(true) < $deadline);

        if ($status['running']) {
            proc_terminate($worker['process']);
            self::fail('Poll worker did not terminate within the test deadline.');
        }

        $stdout = stream_get_contents($worker['pipes'][1]);
        $stderr = stream_get_contents($worker['pipes'][2]);
        fclose($worker['pipes'][1]);
        fclose($worker['pipes'][2]);
        $exitCode = $status['exitcode'];
        $closedCode = proc_close($worker['process']);
        $worker = [];
        if ($exitCode < 0) {
            $exitCode = $closedCode;
        }
        $decoded = json_decode($stdout, true);

        return [
            'exit_code' => $exitCode,
            'stdout' => $stdout,
            'stderr' => $stderr,
            'json' => is_array($decoded) ? $decoded : [],
        ];
    }

    /** @param array{process?: resource, pipes?: array<int, resource>} $worker */
    private function stopWorker(array &$worker): void
    {
        if (!isset($worker['process']) || !is_resource($worker['process'])) {
            return;
        }
        $status = proc_get_status($worker['process']);
        if ($status['running']) {
            proc_terminate($worker['process']);
        }
        foreach ($worker['pipes'] ?? [] as $pipe) {
            if (is_resource($pipe)) {
                fclose($pipe);
            }
        }
        proc_close($worker['process']);
        $worker = [];
    }

    private function waitForFile(string $path): void
    {
        $deadline = hrtime(true) + 2_000_000_000;
        while (!is_file($path) && hrtime(true) < $deadline) {
            usleep(10_000);
        }

        self::assertFileExists($path, 'Poll worker did not reach its wait phase.');
    }
}
