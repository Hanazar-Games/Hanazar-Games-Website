<?php

declare(strict_types=1);

namespace Hanazar\Chat;

use PDO;

final class PermissionService
{
    public function __construct(private readonly Database $database) {}

    /** @return array<string, mixed> */
    public function room(AuthContext $context, int $roomId): array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT r.*, CASE WHEN r.kind = \'dm\' THEN (SELECT u.display_name FROM users u WHERE u.id = '
            . 'CASE WHEN r.dm_user_low = :viewer_id THEN r.dm_user_high ELSE r.dm_user_low END) ELSE r.name END AS display_name, '
            . 'rm.role, rm.last_read_message_id FROM rooms r '
            . 'JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = :user_id AND rm.left_at IS NULL '
            . 'WHERE r.id = :room_id',
        );
        $statement->execute(['viewer_id' => $context->userId(), 'user_id' => $context->userId(), 'room_id' => $roomId]);
        $room = $statement->fetch(PDO::FETCH_ASSOC);
        if (!is_array($room)) {
            throw new HttpException(404, 'room_not_found', 'Room not found.');
        }
        return $room;
    }

    /** @return array<string, mixed> */
    public function writable(AuthContext $context, int $roomId): array
    {
        $room = $this->room($context, $roomId);
        if ($room['archived_at'] !== null) {
            throw new HttpException(409, 'room_archived', 'Room is archived.');
        }
        return $room;
    }

    /** @return array<string, mixed> */
    public function manager(AuthContext $context, int $roomId, bool $ownerOnly = false): array
    {
        $room = $this->writable($context, $roomId);
        $allowed = $ownerOnly ? ['owner'] : ['owner', 'admin'];
        if ($room['kind'] !== 'group' || !in_array($room['role'], $allowed, true)) {
            throw new HttpException(403, 'room_forbidden', 'Insufficient room permission.');
        }
        return $room;
    }

    /** @return list<int> */
    public function memberIds(PDO $pdo, int $roomId): array
    {
        $statement = $pdo->prepare('SELECT user_id FROM room_members WHERE room_id = :room_id AND left_at IS NULL ORDER BY user_id');
        $statement->execute(['room_id' => $roomId]);
        return array_map('intval', $statement->fetchAll(PDO::FETCH_COLUMN));
    }

    public function activeRole(PDO $pdo, int $roomId, int $userId): ?string
    {
        $statement = $pdo->prepare(
            'SELECT role FROM room_members WHERE room_id = :room_id AND user_id = :user_id AND left_at IS NULL',
        );
        $statement->execute(['room_id' => $roomId, 'user_id' => $userId]);
        $role = $statement->fetchColumn();
        return $role === false ? null : (string) $role;
    }
}
