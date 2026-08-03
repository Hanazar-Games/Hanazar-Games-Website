<?php

declare(strict_types=1);

namespace Hanazar\Chat;

use PDO;

final class EventService
{
    public function __construct(private readonly Database $database) {}

    public function cursor(AuthContext $context): int
    {
        $statement = $this->database->connection()->prepare('SELECT COALESCE(MAX(id), 0) FROM user_events WHERE user_id = :user_id');
        $statement->execute(['user_id' => $context->userId()]);
        $floor = (int) $this->database->connection()->query("SELECT value FROM app_meta WHERE key = 'events_floor_id'")->fetchColumn();
        return max($floor, (int) $statement->fetchColumn());
    }

    /** @param list<int> $userIds */
    public function fanOut(PDO $pdo, array $userIds, ?int $roomId, string $type, ?int $entityId = null, ?int $now = null): void
    {
        $statement = $pdo->prepare(
            'INSERT INTO user_events (user_id, room_id, event_type, entity_id, created_at) '
            . 'VALUES (:user_id, :room_id, :event_type, :entity_id, :created_at)',
        );
        foreach (array_values(array_unique(array_map('intval', $userIds))) as $userId) {
            $statement->execute([
                'user_id' => $userId,
                'room_id' => $roomId,
                'event_type' => $type,
                'entity_id' => $entityId,
                'created_at' => $now ?? time(),
            ]);
        }
    }

    /** @return array{events: list<array<string, mixed>>, cursor: int} */
    public function fetch(AuthContext $context, int $cursor, int $limit = 100): array
    {
        $floor = (int) $this->database->connection()->query("SELECT value FROM app_meta WHERE key = 'events_floor_id'")->fetchColumn();
        if ($cursor < $floor) {
            throw new HttpException(409, 'event_cursor_expired', 'Event cursor expired.');
        }
        $limit = max(1, min(200, $limit));
        $statement = $this->database->connection()->prepare(
            'SELECT e.id, e.room_id, e.event_type, e.entity_id, e.created_at, '
            . 'CASE WHEN e.room_id IS NULL OR EXISTS (SELECT 1 FROM room_members rm '
            . 'WHERE rm.room_id = e.room_id AND rm.user_id = e.user_id AND rm.left_at IS NULL) '
            . 'THEN 1 ELSE 0 END AS authorized FROM user_events e '
            . 'WHERE e.user_id = :user_id AND e.id > :cursor '
            . 'ORDER BY e.id LIMIT :limit',
        );
        $statement->bindValue(':user_id', $context->userId(), PDO::PARAM_INT);
        $statement->bindValue(':cursor', $cursor, PDO::PARAM_INT);
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->execute();
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);
        $events = [];
        $next = $cursor;
        foreach ($rows as $row) {
            $next = max($next, (int) $row['id']);
            if ((int) $row['authorized'] !== 1) {
                continue;
            }
            $events[] = [
                'id' => (int) $row['id'],
                'room_id' => $row['room_id'] === null ? null : (int) $row['room_id'],
                'type' => (string) $row['event_type'],
                'entity_id' => $row['entity_id'] === null ? null : (int) $row['entity_id'],
                'created_at' => (int) $row['created_at'],
            ];
        }
        return ['events' => $events, 'cursor' => $next];
    }

    /** @return array{events: list<array<string, mixed>>, cursor: int} */
    public function poll(AuthContext $context, int $cursor, int $timeoutMs = 25000, int $limit = 100, ?callable $beforeWait = null): array
    {
        $timeoutMs = max(0, min(30000, $timeoutMs));
        $lockPath = $this->database->config()->rateLimitPath() . '/poll-' . $context->userId() . '.lock';
        $lock = fopen($lockPath, 'c');
        if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
            if (is_resource($lock)) {
                fclose($lock);
            }
            throw new HttpException(429, 'poll_limit_exceeded', 'Only one event poll is allowed.');
        }
        @chmod($lockPath, 0600);
        try {
            $deadline = hrtime(true) + ($timeoutMs * 1_000_000);
            do {
                $batch = $this->fetch($context, $cursor, $limit);
                if ($batch['events'] !== [] || hrtime(true) >= $deadline) {
                    return $batch;
                }
                if ($beforeWait !== null) {
                    $beforeWait();
                }
                usleep((int) min(50_000, max(1_000, ($deadline - hrtime(true)) / 1_000)));
            } while (true);
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}
