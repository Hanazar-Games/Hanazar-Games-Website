<?php

declare(strict_types=1);

namespace Hanazar\Chat;

use PDO;
use RuntimeException;

final class SchemaValidator
{
    private const TABLES = ['app_meta', 'users', 'rooms', 'room_members', 'messages', 'user_events', 'user_presence', 'typing_indicators', 'audit_logs', 'ephemeral_shares'];

    public function assertKnownDatabase(PDO $pdo): void
    {
        $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type = 'table'")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('app_meta', $tables, true) || !in_array('users', $tables, true)) {
            throw new RuntimeException('Database schema is not recognized.');
        }
    }

    public function validate(PDO $pdo): void
    {
        $this->assertKnownDatabase($pdo);
        $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type = 'table'")->fetchAll(PDO::FETCH_COLUMN);
        foreach (self::TABLES as $table) {
            if (!in_array($table, $tables, true)) {
                throw new RuntimeException('Missing table: ' . $table);
            }
        }
        if ($pdo->query('PRAGMA foreign_key_check')->fetchAll() !== []) {
            throw new RuntimeException('Foreign key integrity check failed.');
        }
    }
}
