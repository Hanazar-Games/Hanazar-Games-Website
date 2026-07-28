<?php

declare(strict_types=1);

namespace Hanazar\Chat\Tests;

use Hanazar\Chat\HttpException;
use PDO;
use Throwable;

final class MessageReadPaginationTest extends TestCase
{
    public function testMessageBodyAcceptsUnicodeAndRejectsInvalidOrUnsafeInput(): void
    {
        $alice = $this->createUser('alice');
        $bob = $this->createUser('bob');
        $roomId = $this->createDm($alice['id'], $bob['id']);
        $context = $this->contextFor($alice['id']);
        $body = "你好，Bob 👋🏽\n第二行";

        $message = $this->messages->send($context, $roomId, $body, $this->nonce(1));

        self::assertSame($body, $message['body']);
        self::assertSame(1, $message['version']);
        self::assertNull($message['deleted_at']);
        $limitBody = str_repeat('界', 4000);
        self::assertSame(
            $limitBody,
            $this->messages->send($context, $roomId, $limitBody, $this->nonce(9))['body'],
        );

        $nonceValue = 10;
        foreach (
            [
                'blank' => " \t\r\n ",
                'Unicode blank' => "\u{00A0}\u{3000}",
                'invalid UTF-8' => "\xC3\x28",
                'NUL control' => "safe\0unsafe",
                'oversized' => str_repeat('界', 4001),
            ] as $invalidBody
        ) {
            $nonce = $this->nonce($nonceValue++);
            $this->assertHttpError(
                422,
                'invalid_message_body',
                fn () => $this->messages->send($context, $roomId, $invalidBody, $nonce),
            );
        }
    }

    public function testClientNonceMakesRetryIdempotentAndCannotChangePayload(): void
    {
        $alice = $this->createUser('alice');
        $bob = $this->createUser('bob');
        $roomId = $this->createDm($alice['id'], $bob['id']);
        $context = $this->contextFor($alice['id']);
        $nonce = $this->nonce(2);

        $first = $this->messages->send($context, $roomId, 'sent once', $nonce);
        $eventsAfterFirst = (int) $this->database->connection()
            ->query('SELECT COUNT(*) FROM user_events')
            ->fetchColumn();
        $retry = $this->messages->send($context, $roomId, 'sent once', $nonce);

        self::assertSame($first, $retry);
        self::assertSame(
            $eventsAfterFirst,
            (int) $this->database->connection()->query('SELECT COUNT(*) FROM user_events')->fetchColumn(),
        );
        self::assertSame(
            1,
            (int) $this->database->connection()->query(
                'SELECT COUNT(*) FROM messages WHERE sender_user_id = ' . (int) $alice['id'],
            )->fetchColumn(),
        );

        $this->assertHttpError(
            409,
            'message_nonce_conflict',
            fn () => $this->messages->send($context, $roomId, 'changed payload', $nonce),
        );

        $carol = $this->createUser('carol');
        $otherRoomId = $this->createDm($alice['id'], $carol['id']);
        $this->assertHttpError(
            409,
            'message_nonce_conflict',
            fn () => $this->messages->send($context, $otherRoomId, 'sent once', $nonce),
        );
    }

    public function testOnlyAuthorCanEditOrDeleteAndVersionMustMatch(): void
    {
        $alice = $this->createUser('alice');
        $bob = $this->createUser('bob');
        $roomId = $this->createDm($alice['id'], $bob['id']);
        $message = $this->messages->send(
            $this->contextFor($alice['id']),
            $roomId,
            'original',
            $this->nonce(3),
        );

        $this->assertHttpError(
            403,
            'message_forbidden',
            fn () => $this->messages->edit($this->contextFor($bob['id']), $message['id'], 'hijacked', 1),
        );
        $this->assertHttpError(
            403,
            'message_forbidden',
            fn () => $this->messages->delete($this->contextFor($bob['id']), $message['id'], 1),
        );
        $this->assertHttpError(
            409,
            'message_version_conflict',
            fn () => $this->messages->edit($this->contextFor($alice['id']), $message['id'], 'stale', 2),
        );

        $edited = $this->messages->edit(
            $this->contextFor($alice['id']),
            $message['id'],
            'edited',
            1,
        );
        self::assertSame('edited', $edited['body']);
        self::assertSame(2, $edited['version']);

        $this->assertHttpError(
            409,
            'message_version_conflict',
            fn () => $this->messages->delete($this->contextFor($alice['id']), $message['id'], 1),
        );
    }

    public function testDeleteReturnsAndListsATombstoneWithoutLeakingBody(): void
    {
        $alice = $this->createUser('alice');
        $bob = $this->createUser('bob');
        $roomId = $this->createDm($alice['id'], $bob['id']);
        $secret = 'the body must disappear';
        $message = $this->messages->send(
            $this->contextFor($alice['id']),
            $roomId,
            $secret,
            $this->nonce(4),
        );

        $tombstone = $this->messages->delete($this->contextFor($alice['id']), $message['id'], 1);
        $page = $this->messages->list($this->contextFor($bob['id']), $roomId, null, 20);

        self::assertNull($tombstone['body']);
        self::assertNotNull($tombstone['deleted_at']);
        self::assertSame(2, $tombstone['version']);
        self::assertCount(1, $page['messages']);
        self::assertNull($page['messages'][0]['body']);
        self::assertNotNull($page['messages'][0]['deleted_at']);
        self::assertStringNotContainsString($secret, json_encode($page, JSON_THROW_ON_ERROR));

        $stored = $this->database->connection()
            ->query('SELECT body, deleted_at FROM messages WHERE id = ' . (int) $message['id'])
            ->fetch(PDO::FETCH_ASSOC);
        self::assertNull($stored['body']);
        self::assertNotNull($stored['deleted_at']);
    }

    public function testMessageAndEventMutationsRollBackTogether(): void
    {
        $alice = $this->createUser('alice');
        $bob = $this->createUser('bob');
        $roomId = $this->createDm($alice['id'], $bob['id']);
        $context = $this->contextFor($alice['id']);
        $pdo = $this->database->connection();
        $messagesBefore = (int) $pdo->query('SELECT COUNT(*) FROM messages')->fetchColumn();
        $eventsBefore = (int) $pdo->query('SELECT COUNT(*) FROM user_events')->fetchColumn();

        $pdo->exec(
            "CREATE TRIGGER reject_message_events BEFORE INSERT ON user_events\n"
            . "WHEN NEW.event_type LIKE 'message.%'\n"
            . "BEGIN SELECT RAISE(ABORT, 'event rejected'); END",
        );

        $failed = false;
        try {
            $this->messages->send($context, $roomId, 'must roll back', $this->nonce(5));
        } catch (Throwable) {
            $failed = true;
        }

        self::assertTrue($failed, 'A message committed without its event fan-out.');
        self::assertSame($messagesBefore, (int) $pdo->query('SELECT COUNT(*) FROM messages')->fetchColumn());
        self::assertSame($eventsBefore, (int) $pdo->query('SELECT COUNT(*) FROM user_events')->fetchColumn());
        self::assertFalse($pdo->inTransaction());

        $pdo->exec('DROP TRIGGER reject_message_events');
        $message = $this->messages->send($context, $roomId, 'stable', $this->nonce(6));
        $pdo->exec(
            "CREATE TRIGGER reject_message_events BEFORE INSERT ON user_events\n"
            . "WHEN NEW.event_type LIKE 'message.%'\n"
            . "BEGIN SELECT RAISE(ABORT, 'event rejected'); END",
        );

        foreach (
            [
                fn () => $this->messages->edit($context, $message['id'], 'must not persist', 1),
                fn () => $this->messages->delete($context, $message['id'], 1),
            ] as $mutation
        ) {
            $failed = false;
            try {
                $mutation();
            } catch (Throwable) {
                $failed = true;
            }

            self::assertTrue($failed, 'A message mutation committed without its event fan-out.');
            $stored = $pdo->query(
                'SELECT body, version, deleted_at FROM messages WHERE id = ' . (int) $message['id'],
            )->fetch(PDO::FETCH_ASSOC);
            self::assertSame('stable', $stored['body']);
            self::assertSame(1, (int) $stored['version']);
            self::assertNull($stored['deleted_at']);
            self::assertFalse($pdo->inTransaction());
        }
    }

    public function testKeysetPaginationIsStableWhenANewerMessageArrives(): void
    {
        $alice = $this->createUser('alice');
        $bob = $this->createUser('bob');
        $roomId = $this->createDm($alice['id'], $bob['id']);
        $context = $this->contextFor($alice['id']);
        $sent = [];

        for ($index = 1; $index <= 4; $index++) {
            $sent[] = $this->messages->send($context, $roomId, 'message ' . $index, $this->nonce(20 + $index));
        }

        $latest = $this->messages->list($context, $roomId, null, 2);
        self::assertSame([$sent[2]['id'], $sent[3]['id']], array_column($latest['messages'], 'id'));
        self::assertSame($sent[2]['id'], $latest['next_before_id']);

        $newer = $this->messages->send($context, $roomId, 'message 5', $this->nonce(25));
        $older = $this->messages->list($context, $roomId, $latest['next_before_id'], 2);

        self::assertSame([$sent[0]['id'], $sent[1]['id']], array_column($older['messages'], 'id'));
        self::assertNull($older['next_before_id']);
        self::assertNotContains($newer['id'], array_column($older['messages'], 'id'));
    }

    public function testReadCursorIsMonotonicAndRejectsAMessageFromAnotherRoom(): void
    {
        $alice = $this->createUser('alice');
        $bob = $this->createUser('bob');
        $carol = $this->createUser('carol');
        $roomId = $this->createDm($alice['id'], $bob['id']);
        $otherRoomId = $this->createDm($alice['id'], $carol['id']);
        $first = $this->messages->send(
            $this->contextFor($alice['id']),
            $roomId,
            'first',
            $this->nonce(30),
        );
        $second = $this->messages->send(
            $this->contextFor($alice['id']),
            $roomId,
            'second',
            $this->nonce(31),
        );
        $foreign = $this->messages->send(
            $this->contextFor($alice['id']),
            $otherRoomId,
            'foreign',
            $this->nonce(32),
        );
        $bobContext = $this->contextFor($bob['id']);

        $advanced = $this->messages->markRead($bobContext, $roomId, $second['id']);
        $staleRetry = $this->messages->markRead($bobContext, $roomId, $first['id']);

        self::assertSame($second['id'], $advanced['last_read_message_id']);
        self::assertSame($second['id'], $staleRetry['last_read_message_id']);
        $this->assertHttpError(
            422,
            'invalid_read_cursor',
            fn () => $this->messages->markRead($bobContext, $roomId, $foreign['id']),
        );
    }

    public function testUnreadCountsExcludeOwnMessagesAndClearAfterMarkRead(): void
    {
        $alice = $this->createUser('alice');
        $bob = $this->createUser('bob');
        $roomId = $this->createDm($alice['id'], $bob['id']);
        $message = $this->messages->send(
            $this->contextFor($alice['id']),
            $roomId,
            'unread for Bob',
            $this->nonce(40),
        );

        self::assertSame(0, $this->roomFromList($alice['id'], $roomId)['unread_count']);
        self::assertSame(1, $this->roomFromList($bob['id'], $roomId)['unread_count']);

        $this->messages->markRead($this->contextFor($bob['id']), $roomId, $message['id']);

        self::assertSame(0, $this->roomFromList($bob['id'], $roomId)['unread_count']);
    }

    public function testReceiptsExposeMemberReadProgressWithoutGrantingOutsiderAccess(): void
    {
        $alice = $this->createUser('alice');
        $bob = $this->createUser('bob');
        $carol = $this->createUser('carol');
        $roomId = $this->createDm($alice['id'], $bob['id']);
        $message = $this->messages->send(
            $this->contextFor($alice['id']),
            $roomId,
            'receipt target',
            $this->nonce(50),
        );

        self::assertSame([], $this->messages->receipts($this->contextFor($alice['id']), $message['id'])['receipts']);
        $this->messages->markRead($this->contextFor($bob['id']), $roomId, $message['id']);
        $receipts = $this->messages->receipts($this->contextFor($alice['id']), $message['id']);

        self::assertCount(1, $receipts['receipts']);
        self::assertSame($bob['id'], $receipts['receipts'][0]['user_id']);
        self::assertSame($message['id'], $receipts['receipts'][0]['last_read_message_id']);
        $this->assertHttpError(
            403,
            'room_forbidden',
            fn () => $this->messages->receipts($this->contextFor($carol['id']), $message['id']),
        );
    }

    /** @return array<string, mixed> */
    private function roomFromList(int $userId, int $roomId): array
    {
        $rooms = $this->rooms->list($this->contextFor($userId), null, 50);
        foreach ($rooms as $room) {
            if ($room['id'] === $roomId) {
                return $room;
            }
        }

        self::fail('Expected room was absent from room list.');
    }

    private function assertHttpError(int $status, string $errorCode, callable $operation): void
    {
        try {
            $operation();
            self::fail('Expected HTTP error ' . $errorCode . '.');
        } catch (HttpException $exception) {
            self::assertSame($status, $exception->status());
            self::assertSame($errorCode, $exception->errorCode());
        }
    }

    private function nonce(int $value): string
    {
        return sprintf('00000000-0000-4000-8000-%012d', $value);
    }
}
