<?php

declare(strict_types=1);

namespace Hanazar\Chat;

use PDO;

final class RoomService
{
    public function __construct(
        private readonly Database $database,
        private readonly PermissionService $permissions,
        private readonly EventService $events,
    ) {
    }

    /** @return array<string, mixed> */
    public function createDm(AuthContext $context, int $otherUserId): array
    {
        if ($context->userId() === $otherUserId) {
            throw new HttpException(422, 'invalid_dm', 'A direct message requires another user.');
        }
        $low = min($context->userId(), $otherUserId);
        $high = max($context->userId(), $otherUserId);
        return $this->database->immediate(function (PDO $pdo) use ($context, $otherUserId, $low, $high): array {
            $existing = $pdo->prepare("SELECT id FROM rooms WHERE kind = 'dm' AND dm_user_low = :low AND dm_user_high = :high");
            $existing->execute(['low' => $low, 'high' => $high]);
            $roomId = $existing->fetchColumn();
            if ($roomId !== false) {
                return $this->get($context, (int) $roomId);
            }
            $active = $pdo->prepare("SELECT COUNT(*) FROM users WHERE id = :id AND status = 'active'");
            $active->execute(['id' => $otherUserId]);
            if ((int) $active->fetchColumn() !== 1) {
                throw new HttpException(404, 'user_not_available', 'User is unavailable.');
            }
            $now = time();
            $statement = $pdo->prepare(
                "INSERT INTO rooms (kind, dm_user_low, dm_user_high, created_at, updated_at) VALUES ('dm', :low, :high, :now, :now)",
            );
            $statement->execute(['low' => $low, 'high' => $high, 'now' => $now]);
            $roomId = (int) $pdo->lastInsertId();
            $member = $pdo->prepare(
                "INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES (:room_id, :user_id, 'member', :joined_at)",
            );
            foreach ([$context->userId(), $otherUserId] as $userId) {
                $member->execute(['room_id' => $roomId, 'user_id' => $userId, 'joined_at' => $now]);
            }
            $this->events->fanOut($pdo, [$context->userId(), $otherUserId], $roomId, 'room.created', $roomId, $now);
            return $this->get($context, $roomId);
        });
    }

    /** @param list<int> $memberIds @return array<string, mixed> */
    public function createGroup(AuthContext $context, string $name, array $memberIds = []): array
    {
        $name = trim($name);
        if (!$this->validName($name)) {
            throw new HttpException(422, 'invalid_room_name', 'Room name is invalid.');
        }
        $memberIds = array_values(array_unique(array_filter(array_map('intval', $memberIds), fn (int $id): bool => $id !== $context->userId())));
        return $this->database->immediate(function (PDO $pdo) use ($context, $name, $memberIds): array {
            if ($memberIds !== []) {
                $placeholders = implode(',', array_fill(0, count($memberIds), '?'));
                $active = $pdo->prepare("SELECT COUNT(*) FROM users WHERE status = 'active' AND id IN ($placeholders)");
                $active->execute($memberIds);
                if ((int) $active->fetchColumn() !== count($memberIds)) {
                    throw new HttpException(422, 'invalid_members', 'One or more members are unavailable.');
                }
            }
            $now = time();
            $room = $pdo->prepare("INSERT INTO rooms (kind, name, created_at, updated_at) VALUES ('group', :name, :now, :now)");
            $room->execute(['name' => $name, 'now' => $now]);
            $roomId = (int) $pdo->lastInsertId();
            $member = $pdo->prepare('INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES (:room_id, :user_id, :role, :joined_at)');
            $member->execute(['room_id' => $roomId, 'user_id' => $context->userId(), 'role' => 'owner', 'joined_at' => $now]);
            foreach ($memberIds as $userId) {
                $member->execute(['room_id' => $roomId, 'user_id' => $userId, 'role' => 'member', 'joined_at' => $now]);
            }
            $recipients = array_merge([$context->userId()], $memberIds);
            $this->events->fanOut($pdo, $recipients, $roomId, 'room.created', $roomId, $now);
            return $this->get($context, $roomId);
        });
    }

    /** @return array<string, mixed> */
    public function get(AuthContext $context, int $roomId): array
    {
        $room = $this->permissions->room($context, $roomId);
        return $this->formatRoom($room);
    }

    /** @return list<array<string, mixed>> */
    public function list(AuthContext $context, ?int $beforeId = null, int $limit = 50): array
    {
        $limit = max(1, min(100, $limit));
        $sql = 'SELECT r.*, CASE WHEN r.kind = \'dm\' THEN (SELECT u.display_name FROM users u WHERE u.id = '
            . 'CASE WHEN r.dm_user_low = :viewer_id THEN r.dm_user_high ELSE r.dm_user_low END) ELSE r.name END AS display_name, '
            . 'rm.role, rm.last_read_message_id, '
            . '(SELECT COUNT(*) FROM messages m WHERE m.room_id = r.id AND m.sender_user_id <> :sender_id '
            . 'AND m.id > COALESCE(rm.last_read_message_id, 0)) AS unread_count '
            . 'FROM rooms r JOIN room_members rm ON rm.room_id = r.id '
            . 'WHERE rm.user_id = :user_id AND rm.left_at IS NULL ';
        if ($beforeId !== null) {
            $sql .= 'AND r.id < :before_id ';
        }
        $sql .= 'ORDER BY r.updated_at DESC, r.id DESC LIMIT :limit';
        $statement = $this->database->connection()->prepare($sql);
        $statement->bindValue(':viewer_id', $context->userId(), PDO::PARAM_INT);
        $statement->bindValue(':sender_id', $context->userId(), PDO::PARAM_INT);
        $statement->bindValue(':user_id', $context->userId(), PDO::PARAM_INT);
        if ($beforeId !== null) {
            $statement->bindValue(':before_id', $beforeId, PDO::PARAM_INT);
        }
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->execute();
        return array_map(fn (array $room): array => $this->formatRoom($room), $statement->fetchAll(PDO::FETCH_ASSOC));
    }

    /** @return array<string, mixed> */
    public function rename(AuthContext $context, int $roomId, string $name): array
    {
        $this->permissions->manager($context, $roomId);
        $name = trim($name);
        if (!$this->validName($name)) {
            throw new HttpException(422, 'invalid_room_name');
        }
        return $this->mutate($context, $roomId, 'room.updated', function (PDO $pdo) use ($roomId, $name): void {
            $statement = $pdo->prepare('UPDATE rooms SET name = :name, updated_at = :now WHERE id = :id');
            $statement->execute(['name' => $name, 'now' => time(), 'id' => $roomId]);
        });
    }

    /** @return array<string, mixed> */
    public function addMember(AuthContext $context, int $roomId, int $userId): array
    {
        $this->permissions->manager($context, $roomId);
        return $this->database->immediate(function (PDO $pdo) use ($context, $roomId, $userId): array {
            if ($this->permissions->activeRole($pdo, $roomId, $userId) !== null) {
                throw new HttpException(409, 'member_conflict');
            }
            $actorRole = $this->permissions->activeRole($pdo, $roomId, $context->userId());
            if (!in_array($actorRole, ['owner', 'admin'], true)) {
                throw new HttpException(403, 'room_forbidden');
            }
            $statement = $pdo->prepare("INSERT INTO room_members (room_id, user_id, role, joined_at) SELECT :room_id, id, 'member', :now FROM users WHERE id = :user_id AND status = 'active'");
            $statement->execute(['room_id' => $roomId, 'user_id' => $userId, 'now' => time()]);
            if ($statement->rowCount() !== 1) {
                throw new HttpException(404, 'user_not_available');
            }
            $pdo->prepare('UPDATE rooms SET updated_at = :now WHERE id = :id')->execute(['now' => time(), 'id' => $roomId]);
            $recipients = $this->permissions->memberIds($pdo, $roomId);
            $this->events->fanOut($pdo, $recipients, $roomId, 'room.member_added', $userId);
            return $this->get($context, $roomId);
        });
    }

    public function removeMember(AuthContext $context, int $roomId, int $userId): void
    {
        $room = $this->permissions->manager($context, $roomId);
        $targetRole = $this->permissions->activeRole($this->database->connection(), $roomId, $userId);
        if ($targetRole === null) {
            throw new HttpException(404, 'member_not_found');
        }
        if (($room['role'] === 'admin' && $targetRole !== 'member') || $targetRole === 'owner') {
            throw new HttpException(403, 'room_forbidden');
        }
        $this->database->immediate(function (PDO $pdo) use ($context, $roomId, $userId): void {
            $recipients = $this->permissions->memberIds($pdo, $roomId);
            $pdo->prepare('UPDATE room_members SET left_at = :now WHERE room_id = :room_id AND user_id = :user_id AND left_at IS NULL')
                ->execute(['now' => time(), 'room_id' => $roomId, 'user_id' => $userId]);
            $pdo->prepare('DELETE FROM typing_indicators WHERE room_id = :room_id AND user_id = :user_id')
                ->execute(['room_id' => $roomId, 'user_id' => $userId]);
            $this->events->fanOut($pdo, $recipients, $roomId, 'room.member_removed', $userId);
        });
    }

    public function setRole(AuthContext $context, int $roomId, int $userId, string $role): void
    {
        $room = $this->permissions->manager($context, $roomId);
        if (!in_array($role, ['admin', 'member'], true)) {
            throw new HttpException(409, 'invalid_room_role');
        }
        $targetRole = $this->permissions->activeRole($this->database->connection(), $roomId, $userId);
        if ($targetRole === null) {
            throw new HttpException(404, 'member_not_found');
        }
        if ($room['role'] !== 'owner' || $targetRole === 'owner') {
            throw new HttpException(403, 'room_forbidden');
        }
        $this->mutate($context, $roomId, 'room.role_changed', function (PDO $pdo) use ($roomId, $userId, $role): void {
            $pdo->prepare('UPDATE room_members SET role = :role WHERE room_id = :room_id AND user_id = :user_id AND left_at IS NULL')
                ->execute(['role' => $role, 'room_id' => $roomId, 'user_id' => $userId]);
        }, $userId);
    }

    public function transferOwnership(AuthContext $context, int $roomId, int $userId): void
    {
        $this->permissions->manager($context, $roomId, true);
        if ($this->permissions->activeRole($this->database->connection(), $roomId, $userId) === null) {
            throw new HttpException(404, 'member_not_found');
        }
        $this->database->immediate(function (PDO $pdo) use ($context, $roomId, $userId): void {
            $pdo->prepare("UPDATE room_members SET role = 'admin' WHERE room_id = :room_id AND user_id = :user_id AND left_at IS NULL")
                ->execute(['room_id' => $roomId, 'user_id' => $context->userId()]);
            $pdo->prepare("UPDATE room_members SET role = 'owner' WHERE room_id = :room_id AND user_id = :user_id AND left_at IS NULL")
                ->execute(['room_id' => $roomId, 'user_id' => $userId]);
            $this->events->fanOut($pdo, $this->permissions->memberIds($pdo, $roomId), $roomId, 'room.owner_transferred', $userId);
        });
    }

    public function archive(AuthContext $context, int $roomId): void
    {
        $this->permissions->manager($context, $roomId, true);
        $this->database->immediate(function (PDO $pdo) use ($roomId): void {
            $now = time();
            $pdo->prepare('UPDATE rooms SET archived_at = :now, updated_at = :now WHERE id = :id')->execute(['now' => $now, 'id' => $roomId]);
            $pdo->prepare('DELETE FROM typing_indicators WHERE room_id = :room_id')->execute(['room_id' => $roomId]);
            $this->events->fanOut($pdo, $this->permissions->memberIds($pdo, $roomId), $roomId, 'room.archived', $roomId, $now);
        });
    }

    public function leave(AuthContext $context, int $roomId): void
    {
        $room = $this->permissions->writable($context, $roomId);
        if ($room['kind'] === 'dm') {
            throw new HttpException(409, 'dm_cannot_leave');
        }
        if ($room['role'] === 'owner') {
            throw new HttpException(409, 'owner_must_transfer');
        }
        $this->database->immediate(function (PDO $pdo) use ($context, $roomId): void {
            $recipients = $this->permissions->memberIds($pdo, $roomId);
            $pdo->prepare('UPDATE room_members SET left_at = :now WHERE room_id = :room_id AND user_id = :user_id AND left_at IS NULL')
                ->execute(['now' => time(), 'room_id' => $roomId, 'user_id' => $context->userId()]);
            $pdo->prepare('DELETE FROM typing_indicators WHERE room_id = :room_id AND user_id = :user_id')
                ->execute(['room_id' => $roomId, 'user_id' => $context->userId()]);
            $this->events->fanOut($pdo, $recipients, $roomId, 'room.member_left', $context->userId());
        });
    }

    /** @return array<string, mixed> */
    private function mutate(AuthContext $context, int $roomId, string $type, callable $callback, ?int $entityId = null): array
    {
        return $this->database->immediate(function (PDO $pdo) use ($context, $roomId, $type, $callback, $entityId): array {
            $callback($pdo);
            $this->events->fanOut($pdo, $this->permissions->memberIds($pdo, $roomId), $roomId, $type, $entityId ?? $roomId);
            return $this->get($context, $roomId);
        });
    }

    /** @param array<string, mixed> $room @return array<string, mixed> */
    private function formatRoom(array $room): array
    {
        return [
            'id' => (int) $room['id'],
            'kind' => (string) $room['kind'],
            'name' => $room['display_name'] ?? $room['name'],
            'role' => (string) $room['role'],
            'archived' => $room['archived_at'] !== null,
            'unread_count' => (int) ($room['unread_count'] ?? 0),
            'last_read_message_id' => $room['last_read_message_id'] === null ? null : (int) $room['last_read_message_id'],
            'updated_at' => (int) $room['updated_at'],
        ];
    }

    private function length(string $value): int
    {
        preg_match_all('/./us', $value, $characters);
        return count($characters[0]);
    }

    private function validName(string $name): bool
    {
        return preg_match('//u', $name) === 1
            && preg_match('/^[\s\p{Z}]*$/u', $name) !== 1
            && preg_match('/[\x{0000}-\x{001F}\x{007F}]/u', $name) !== 1
            && $this->length($name) <= 100;
    }
}
