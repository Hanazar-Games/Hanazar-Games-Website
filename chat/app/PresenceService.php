<?php

declare(strict_types=1);

namespace Hanazar\Chat;

use PDO;

final class PresenceService
{
    private const ONLINE_SECONDS = 60;
    private const TYPING_SECONDS = 8;

    public function __construct(private readonly Database $database, private readonly EventService $events) {}

    /** @return array{status: string, last_seen_at: int} */
    public function heartbeat(AuthContext $context, string $status = 'online', ?int $now = null): array
    {
        $now ??= time();
        if (!in_array($status, ['online', 'away'], true)) {
            throw new HttpException(422, 'invalid_presence');
        }
        $statement = $this->database->connection()->prepare(
            'INSERT INTO user_presence (user_id, status, last_seen_at) VALUES (:user_id, :status, :now) '
            . 'ON CONFLICT(user_id) DO UPDATE SET status = excluded.status, last_seen_at = excluded.last_seen_at',
        );
        $statement->execute(['user_id' => $context->userId(), 'status' => $status, 'now' => $now]);
        return ['status' => $status, 'last_seen_at' => $now];
    }

    /** @return array{members: list<array<string, mixed>>} */
    public function roomState(AuthContext $context, int $roomId, ?int $now = null): array
    {
        $now ??= time();
        (new PermissionService($this->database))->room($context, $roomId);
        $statement = $this->database->connection()->prepare(
            'SELECT rm.user_id, u.username, u.display_name, rm.role, p.status, p.last_seen_at, t.updated_at AS typing_at '
            . 'FROM room_members rm JOIN users u ON u.id = rm.user_id '
            . 'LEFT JOIN user_presence p ON p.user_id = rm.user_id '
            . 'LEFT JOIN typing_indicators t ON t.room_id = rm.room_id AND t.user_id = rm.user_id '
            . 'WHERE rm.room_id = :room_id AND rm.left_at IS NULL ORDER BY u.username',
        );
        $statement->execute(['room_id' => $roomId]);
        $members = [];
        foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $lastSeen = $row['last_seen_at'] === null ? null : (int) $row['last_seen_at'];
            $members[] = [
                'user_id' => (int) $row['user_id'],
                'username' => (string) $row['username'],
                'display_name' => (string) $row['display_name'],
                'role' => (string) $row['role'],
                'status' => $lastSeen !== null && $lastSeen + self::ONLINE_SECONDS >= $now ? (string) $row['status'] : 'offline',
                'last_seen_at' => $lastSeen,
                'typing' => $row['typing_at'] !== null && (int) $row['typing_at'] + self::TYPING_SECONDS > $now,
            ];
        }
        return ['members' => $members];
    }

    public function setTyping(AuthContext $context, int $roomId, bool $typing, ?int $now = null): void
    {
        $now ??= time();
        $permissions = new PermissionService($this->database);
        $permissions->writable($context, $roomId);
        $this->database->immediate(function (PDO $pdo) use ($permissions, $context, $roomId, $typing, $now): void {
            $current = $pdo->prepare('SELECT updated_at FROM typing_indicators WHERE room_id = :room_id AND user_id = :user_id');
            $current->execute(['room_id' => $roomId, 'user_id' => $context->userId()]);
            $previous = $current->fetchColumn();
            if ($typing) {
                if ($previous !== false && (int) $previous === $now) {
                    return;
                }
                $pdo->prepare(
                    'INSERT INTO typing_indicators (room_id, user_id, updated_at) VALUES (:room_id, :user_id, :now) '
                    . 'ON CONFLICT(room_id, user_id) DO UPDATE SET updated_at = excluded.updated_at',
                )->execute(['room_id' => $roomId, 'user_id' => $context->userId(), 'now' => $now]);
            } else {
                if ($previous === false) {
                    return;
                }
                $pdo->prepare('DELETE FROM typing_indicators WHERE room_id = :room_id AND user_id = :user_id')
                    ->execute(['room_id' => $roomId, 'user_id' => $context->userId()]);
            }
            $this->events->fanOut($pdo, $permissions->memberIds($pdo, $roomId), $roomId, 'typing.changed', $context->userId(), $now);
        });
    }

    public function cleanup(?int $now = null): void
    {
        $now ??= time();
        $statement = $this->database->connection()->prepare('DELETE FROM typing_indicators WHERE updated_at <= :cutoff');
        $statement->execute(['cutoff' => $now - self::TYPING_SECONDS]);
    }
}
