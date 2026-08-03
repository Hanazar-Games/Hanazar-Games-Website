<?php

declare(strict_types=1);

namespace Hanazar\Chat;

use PDOException;

final class UserService
{
    public function __construct(private readonly Database $database, private readonly EventService $events) {}

    /** @param array<string, mixed> $input @return array<string, mixed> */
    public function create(array $input): array
    {
        $username = trim((string) ($input['username'] ?? ''));
        $displayName = trim((string) ($input['display_name'] ?? $username));
        $password = (string) ($input['password'] ?? '');
        $role = (string) ($input['system_role'] ?? 'user');
        if (!preg_match('/^[\p{L}\p{N}_.-]{2,40}$/u', $username)
            || !$this->validDisplayName($displayName)
            || strlen($password) < 12
            || !in_array($role, ['user', 'admin'], true)
        ) {
            throw new HttpException(422, 'invalid_user', 'Invalid account details.');
        }
        $now = time();
        try {
            $statement = $this->database->connection()->prepare(
                'INSERT INTO users (username, display_name, password_hash, system_role, created_at, updated_at) '
                . 'VALUES (:username, :display_name, :password_hash, :system_role, :created_at, :updated_at)',
            );
            $statement->execute([
                'username' => $username,
                'display_name' => $displayName,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'system_role' => $role,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } catch (PDOException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) === 19) {
                throw new HttpException(409, 'username_conflict', 'Username is unavailable.');
            }
            throw $exception;
        }
        return [
            'id' => (int) $this->database->connection()->lastInsertId(),
            'username' => $username,
            'display_name' => $displayName,
            'system_role' => $role,
            'status' => 'active',
        ];
    }

    /** @return list<array<string, mixed>> */
    public function search(AuthContext $context, string $query = ''): array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT id, username, display_name FROM users WHERE status = \'active\' AND id <> :id '
            . 'AND (username LIKE :query OR display_name LIKE :query) ORDER BY username LIMIT 30',
        );
        $statement->execute(['id' => $context->userId(), 'query' => '%' . trim($query) . '%']);
        return $statement->fetchAll();
    }

    private function length(string $value): int
    {
        preg_match_all('/./us', $value, $characters);
        return count($characters[0]);
    }

    private function validDisplayName(string $name): bool
    {
        return preg_match('//u', $name) === 1
            && preg_match('/^[\s\p{Z}]*$/u', $name) !== 1
            && preg_match('/[\x{0000}-\x{001F}\x{007F}]/u', $name) !== 1
            && $this->length($name) <= 80;
    }
}
