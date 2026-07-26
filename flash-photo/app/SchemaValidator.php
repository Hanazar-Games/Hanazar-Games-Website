<?php

declare(strict_types=1);

namespace FlashPhoto;

use PDO;
use Throwable;

final class SchemaValidator
{
    private const VERSION = 1;

    public static function isCompatible(PDO $pdo): bool
    {
        if ((int) $pdo->query('PRAGMA user_version')->fetchColumn() !== self::VERSION) {
            return false;
        }

        $expected = self::expectedObjects();
        return $expected !== null && self::schemaObjects($pdo) === $expected;
    }

    /** @return list<array{type: string, name: string, table_name: string, sql: string}>|null */
    private static function expectedObjects(): ?array
    {
        $schema = @file_get_contents(dirname(__DIR__) . '/database/schema.sql');
        if (!is_string($schema)) {
            return null;
        }

        try {
            $pdo = new PDO('sqlite::memory:', null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_STRINGIFY_FETCHES => false,
            ]);
            $pdo->exec($schema);
            if ((int) $pdo->query('PRAGMA user_version')->fetchColumn() !== self::VERSION) {
                return null;
            }
            return self::schemaObjects($pdo);
        } catch (Throwable) {
            return null;
        }
    }

    /** @return list<array{type: string, name: string, table_name: string, sql: string}> */
    private static function schemaObjects(PDO $pdo): array
    {
        $rows = $pdo->query(
            "SELECT type, name, tbl_name, COALESCE(sql, '') AS sql
             FROM sqlite_master WHERE name NOT GLOB 'sqlite_*'
             ORDER BY type, name"
        )->fetchAll(PDO::FETCH_ASSOC);

        return array_map(static fn (array $row): array => [
            'type' => (string) $row['type'],
            'name' => (string) $row['name'],
            'table_name' => (string) $row['tbl_name'],
            'sql' => trim((string) $row['sql']),
        ], $rows);
    }
}
