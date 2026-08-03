<?php

declare(strict_types=1);

use Hanazar\Chat\SchemaValidator;

if (PHP_SAPI !== 'cli') {
    exit(1);
}

[$config, $database] = require __DIR__ . '/bootstrap.php';
(new SchemaValidator())->validate($database->connection());
if ($database->connection()->query('PRAGMA integrity_check')->fetchColumn() !== 'ok') {
    throw new RuntimeException('integrity_check failed');
}
if ($database->connection()->query('PRAGMA foreign_key_check')->fetchAll() !== []) {
    throw new RuntimeException('foreign_key_check failed');
}
foreach ([$config->sessionPath(), $config->logPath(), $config->rateLimitPath(), $config->backupPath()] as $directory) {
    if (!is_dir($directory) || (fileperms($directory) & 0777) !== 0700) {
        throw new RuntimeException('Runtime directory must be mode 0700.');
    }
}
$databasePath = $config->databasePath();
if ((fileperms($databasePath) & 0777) !== 0600 || str_starts_with($databasePath, $config->publicRoot() . '/')) {
    throw new RuntimeException('DB_PATH permissions or PUBLIC_ROOT isolation failed.');
}
fwrite(STDOUT, "ok\n");
