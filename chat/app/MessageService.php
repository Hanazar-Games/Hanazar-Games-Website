<?php

declare(strict_types=1);

namespace Hanazar\Chat;

use PDO;

final class MessageService
{
    public function __construct(
        private readonly Database $database,
        private readonly PermissionService $permissions,
        private readonly EventService $events,
    ) {
    }

    /** @return array<string, mixed> */
    public function send(AuthContext $context, int $roomId, string $body, string $clientNonce): array
    {
        $this->permissions->writable($context, $roomId);
        $this->validateBody($body);
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $clientNonce) !== 1) {
            throw new HttpException(422, 'invalid_client_nonce');
        }
        return $this->database->immediate(function (PDO $pdo) use ($context, $roomId, $body, $clientNonce): array {
            $existing = $pdo->prepare(
                'SELECT m.*, u.display_name AS sender_display_name FROM messages m JOIN users u ON u.id = m.sender_user_id '
                . 'WHERE m.sender_user_id = :sender AND m.client_nonce = :nonce',
            );
            $existing->execute(['sender' => $context->userId(), 'nonce' => $clientNonce]);
            $message = $existing->fetch(PDO::FETCH_ASSOC);
            if (is_array($message)) {
                if ((int) $message['room_id'] !== $roomId || $message['body'] !== $body) {
                    throw new HttpException(409, 'message_nonce_conflict');
                }
                return $this->format($message);
            }
            $now = time();
            $statement = $pdo->prepare(
                'INSERT INTO messages (room_id, sender_user_id, body, client_nonce, created_at, updated_at) '
                . 'VALUES (:room_id, :sender, :body, :nonce, :now, :now)',
            );
            $statement->execute([
                'room_id' => $roomId,
                'sender' => $context->userId(),
                'body' => $body,
                'nonce' => $clientNonce,
                'now' => $now,
            ]);
            $messageId = (int) $pdo->lastInsertId();
            $pdo->prepare('UPDATE rooms SET updated_at = :now WHERE id = :id')->execute(['now' => $now, 'id' => $roomId]);
            $this->events->fanOut($pdo, $this->permissions->memberIds($pdo, $roomId), $roomId, 'message.created', $messageId, $now);
            return $this->messageById($pdo, $messageId);
        });
    }

    /** @return array<string, mixed> */
    public function edit(AuthContext $context, int $messageId, string $body, int $expectedVersion): array
    {
        $this->validateBody($body);
        return $this->change($context, $messageId, $expectedVersion, 'message.updated', function (PDO $pdo, array $message, int $now) use ($body): void {
            $statement = $pdo->prepare('UPDATE messages SET body = :body, version = version + 1, updated_at = :now WHERE id = :id');
            $statement->execute(['body' => $body, 'now' => $now, 'id' => $message['id']]);
        });
    }

    /** @return array<string, mixed> */
    public function delete(AuthContext $context, int $messageId, int $expectedVersion): array
    {
        return $this->change($context, $messageId, $expectedVersion, 'message.deleted', function (PDO $pdo, array $message, int $now): void {
            $statement = $pdo->prepare('UPDATE messages SET body = NULL, version = version + 1, updated_at = :now, deleted_at = :now WHERE id = :id');
            $statement->execute(['now' => $now, 'id' => $message['id']]);
        });
    }

    /** @return array{messages: list<array<string, mixed>>, next_before_id: ?int} */
    public function list(AuthContext $context, int $roomId, ?int $beforeId = null, int $limit = 50): array
    {
        $this->permissions->room($context, $roomId);
        $limit = max(1, min(100, $limit));
        $sql = 'SELECT m.*, u.display_name AS sender_display_name FROM messages m JOIN users u ON u.id = m.sender_user_id WHERE m.room_id = :room_id ';
        if ($beforeId !== null) {
            $sql .= 'AND m.id < :before_id ';
        }
        $sql .= 'ORDER BY m.id DESC LIMIT :limit';
        $statement = $this->database->connection()->prepare($sql);
        $statement->bindValue(':room_id', $roomId, PDO::PARAM_INT);
        if ($beforeId !== null) {
            $statement->bindValue(':before_id', $beforeId, PDO::PARAM_INT);
        }
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->execute();
        $rows = array_reverse($statement->fetchAll(PDO::FETCH_ASSOC));
        $messages = array_map(fn (array $row): array => $this->format($row), $rows);
        $next = null;
        if ($rows !== []) {
            $probe = $this->database->connection()->prepare('SELECT 1 FROM messages WHERE room_id = :room_id AND id < :id LIMIT 1');
            $probe->execute(['room_id' => $roomId, 'id' => $rows[0]['id']]);
            if ($probe->fetchColumn() !== false) {
                $next = (int) $rows[0]['id'];
            }
        }
        return ['messages' => $messages, 'next_before_id' => $next];
    }

    /** @return array{last_read_message_id: int} */
    public function markRead(AuthContext $context, int $roomId, int $messageId): array
    {
        $this->permissions->room($context, $roomId);
        $statement = $this->database->connection()->prepare('SELECT room_id FROM messages WHERE id = :id');
        $statement->execute(['id' => $messageId]);
        if ((int) $statement->fetchColumn() !== $roomId) {
            throw new HttpException(422, 'invalid_read_cursor');
        }
        return $this->database->immediate(function (PDO $pdo) use ($context, $roomId, $messageId): array {
            $read = $pdo->prepare(
                'SELECT last_read_message_id FROM room_members '
                . 'WHERE room_id = :room_id AND user_id = :user_id AND left_at IS NULL',
            );
            $read->execute(['room_id' => $roomId, 'user_id' => $context->userId()]);
            $row = $read->fetch(PDO::FETCH_ASSOC);
            if (!is_array($row)) {
                throw new HttpException(404, 'room_not_found');
            }
            $cursor = $row['last_read_message_id'] === null ? 0 : (int) $row['last_read_message_id'];
            if ($cursor >= $messageId) {
                return ['last_read_message_id' => $cursor];
            }
            $pdo->prepare(
                'UPDATE room_members SET last_read_message_id = :message_id '
                . 'WHERE room_id = :room_id AND user_id = :user_id AND left_at IS NULL',
            )->execute(['message_id' => $messageId, 'room_id' => $roomId, 'user_id' => $context->userId()]);
            $this->events->fanOut($pdo, $this->permissions->memberIds($pdo, $roomId), $roomId, 'room.read', $messageId);
            return ['last_read_message_id' => $messageId];
        });
    }

    /** @return array{receipts: list<array<string, int>>} */
    public function receipts(AuthContext $context, int $messageId): array
    {
        $statement = $this->database->connection()->prepare('SELECT room_id, sender_user_id FROM messages WHERE id = :id');
        $statement->execute(['id' => $messageId]);
        $message = $statement->fetch(PDO::FETCH_ASSOC);
        if (!is_array($message)) {
            throw new HttpException(404, 'message_not_found');
        }
        try {
            $this->permissions->room($context, (int) $message['room_id']);
        } catch (HttpException) {
            throw new HttpException(403, 'room_forbidden');
        }
        $receipts = $this->database->connection()->prepare(
            'SELECT user_id, last_read_message_id FROM room_members WHERE room_id = :room_id '
            . 'AND left_at IS NULL AND user_id <> :sender AND last_read_message_id >= :message_id ORDER BY user_id',
        );
        $receipts->execute(['room_id' => $message['room_id'], 'sender' => $message['sender_user_id'], 'message_id' => $messageId]);
        return ['receipts' => array_map(
            fn (array $row): array => ['user_id' => (int) $row['user_id'], 'last_read_message_id' => (int) $row['last_read_message_id']],
            $receipts->fetchAll(PDO::FETCH_ASSOC),
        )];
    }

    /** @return array<string, mixed> */
    private function change(AuthContext $context, int $messageId, int $expectedVersion, string $event, callable $mutation): array
    {
        return $this->database->immediate(function (PDO $pdo) use ($context, $messageId, $expectedVersion, $event, $mutation): array {
            $statement = $pdo->prepare('SELECT * FROM messages WHERE id = :id');
            $statement->execute(['id' => $messageId]);
            $message = $statement->fetch(PDO::FETCH_ASSOC);
            if (!is_array($message)) {
                throw new HttpException(404, 'message_not_found');
            }
            $this->permissions->writable($context, (int) $message['room_id']);
            if ((int) $message['sender_user_id'] !== $context->userId()) {
                throw new HttpException(403, 'message_forbidden');
            }
            if ((int) $message['version'] !== $expectedVersion || $message['deleted_at'] !== null) {
                throw new HttpException(409, 'message_version_conflict');
            }
            $now = time();
            $mutation($pdo, $message, $now);
            $this->events->fanOut($pdo, $this->permissions->memberIds($pdo, (int) $message['room_id']), (int) $message['room_id'], $event, $messageId, $now);
            return $this->messageById($pdo, $messageId);
        });
    }

    /** @return array<string, mixed> */
    private function messageById(PDO $pdo, int $messageId): array
    {
        $statement = $pdo->prepare(
            'SELECT m.*, u.display_name AS sender_display_name FROM messages m JOIN users u ON u.id = m.sender_user_id WHERE m.id = :id',
        );
        $statement->execute(['id' => $messageId]);
        return $this->format($statement->fetch(PDO::FETCH_ASSOC));
    }

    /** @param array<string, mixed> $message @return array<string, mixed> */
    private function format(array $message): array
    {
        return [
            'id' => (int) $message['id'],
            'room_id' => (int) $message['room_id'],
            'sender_user_id' => (int) $message['sender_user_id'],
            'sender_display_name' => (string) ($message['sender_display_name'] ?? ''),
            'body' => $message['body'],
            'version' => (int) $message['version'],
            'created_at' => (int) $message['created_at'],
            'updated_at' => (int) $message['updated_at'],
            'deleted_at' => $message['deleted_at'] === null ? null : (int) $message['deleted_at'],
        ];
    }

    private function validateBody(string $body): void
    {
        $validUtf8 = preg_match('//u', $body) === 1;
        $blank = $validUtf8 && preg_match('/^[\s\p{Z}]*$/u', $body) === 1;
        $control = !$validUtf8 || preg_match('/[\x{0000}-\x{0008}\x{000B}\x{000C}\x{000E}-\x{001F}\x{007F}]/u', $body) === 1;
        $length = 0;
        if ($validUtf8) {
            preg_match_all('/./us', $body, $matches);
            $length = count($matches[0]);
        }
        if (!$validUtf8 || $blank || $control || $length < 1 || $length > 4000) {
            throw new HttpException(422, 'invalid_message_body', 'Message body is invalid.');
        }
    }
}
