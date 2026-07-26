<?php

declare(strict_types=1);

namespace FlashPhoto;

use PDO;
use Throwable;

final class Database
{
    private PDO $pdo;

    public function __construct(Config $config, bool $readOnly = false)
    {
        $path = $config->string('database_path');
        $directory = dirname($path);
        if (!is_dir($directory)) {
            if ($readOnly || !mkdir($directory, 0700, true) || !is_dir($directory)) {
                throw new \RuntimeException('Database directory is unavailable.');
            }
        }
        if (is_link($directory)) {
            throw new \RuntimeException('Database directory cannot be a symbolic link.');
        }
        $directoryMode = @fileperms($directory);
        if ($directoryMode === false || ($directoryMode & 0077) !== 0) {
            throw new \RuntimeException('Database directory must use owner-only permissions.');
        }
        $databaseExists = file_exists($path);
        if ($readOnly && !$databaseExists) {
            throw new \RuntimeException('Database file is unavailable.');
        }
        if (is_link($path) || ($databaseExists && !is_file($path))) {
            throw new \RuntimeException('Database path must be a regular file.');
        }
        if ($databaseExists) {
            $mode = @fileperms($path);
            if ($mode === false || ($mode & 0077) !== 0) {
                throw new \RuntimeException('Database file must use owner-only permissions.');
            }
        }
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_STRINGIFY_FETCHES => false,
        ];
        if ($readOnly) {
            $options[PDO::SQLITE_ATTR_OPEN_FLAGS] = PDO::SQLITE_OPEN_READONLY;
        }
        $this->pdo = new PDO('sqlite:' . $path, null, null, $options);
        if (!$databaseExists && !@chmod($path, 0600)) {
            throw new \RuntimeException('Unable to secure the database file.');
        }
        $this->pdo->exec('PRAGMA foreign_keys = ON');
        $this->pdo->exec('PRAGMA busy_timeout = 5000');
        if ($readOnly) {
            $this->pdo->exec('PRAGMA query_only = ON');
            return;
        }
        $this->pdo->exec('PRAGMA journal_mode = WAL');
        $this->pdo->exec('PRAGMA synchronous = FULL');
        $this->pdo->exec('PRAGMA temp_store = MEMORY');
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }

    public function initialize(string $schemaPath): void
    {
        $schema = @file_get_contents($schemaPath);
        if ($schema === false) {
            throw new \RuntimeException('Unable to read database schema.');
        }
        $this->immediate(static function (PDO $pdo) use ($schema): void {
            $pdo->exec($schema);
        });
    }

    /** @template T @param callable(PDO): T $callback @return T */
    public function immediate(callable $callback): mixed
    {
        $this->pdo->exec('BEGIN IMMEDIATE');
        try {
            $result = $callback($this->pdo);
            $this->pdo->exec('COMMIT');
            return $result;
        } catch (Throwable $exception) {
            try {
                $this->pdo->exec('ROLLBACK');
            } catch (Throwable) {
                // Preserve the original transaction failure.
            }
            throw $exception;
        }
    }
}
