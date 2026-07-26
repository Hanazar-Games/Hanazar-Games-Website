<?php

declare(strict_types=1);

namespace FlashPhoto\Tests;

use FlashPhoto\Config;
use FlashPhoto\Database;
use FlashPhoto\SchemaValidator;
use PDOException;

final class DatabaseInitializationTest extends TestCase
{
    public function testFailedInitializationRollsBackAndCanBeRetried(): void
    {
        $values = $this->configValues;
        $values['database_path'] = $this->root . '/storage/initialization.sqlite';
        $database = new Database(Config::fromArray($values));
        $invalidSchemaPath = $this->root . '/invalid-schema.sql';
        file_put_contents($invalidSchemaPath, <<<'SQL'
CREATE TABLE initialization_probe (id INTEGER PRIMARY KEY);
PRAGMA user_version = 99;
CREATE TABL invalid_statement (id INTEGER PRIMARY KEY);
SQL);

        try {
            $database->initialize($invalidSchemaPath);
            self::fail('Invalid schema initialization succeeded.');
        } catch (PDOException) {
        }

        $pdo = $database->pdo();
        $tableCount = (int) $pdo->query(
            "SELECT COUNT(*) FROM sqlite_master
             WHERE type = 'table' AND name NOT GLOB 'sqlite_*'"
        )->fetchColumn();
        self::assertSame(0, $tableCount);
        self::assertSame(0, (int) $pdo->query('PRAGMA user_version')->fetchColumn());

        $database->initialize(dirname(__DIR__) . '/database/schema.sql');
        self::assertTrue(SchemaValidator::isCompatible($pdo));
    }

    public function testUnknownObjectWithSqliteWildcardPrefixPreventsInitialization(): void
    {
        if (!function_exists('proc_open')) {
            self::markTestSkipped('proc_open is unavailable.');
        }

        $values = $this->configValues;
        $values['database_path'] = $this->root . '/storage/unknown-object.sqlite';
        $database = new Database(Config::fromArray($values));
        $database->pdo()->exec('CREATE VIEW sqliteXunknown AS SELECT 1 AS id');

        $environment = $this->processEnvironment();
        $environment['DATABASE_PATH'] = $values['database_path'];
        $process = proc_open(
            [PHP_BINARY, dirname(__DIR__) . '/database/init.php'],
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
            dirname(__DIR__),
            $environment
        );
        self::assertIsResource($process);
        fclose($pipes[0]);
        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        self::assertNotSame(0, proc_close($process), (string) $stdout . (string) $stderr);
        self::assertSame(
            0,
            (int) $database->pdo()->query(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'flash_images'"
            )->fetchColumn()
        );
    }
}
