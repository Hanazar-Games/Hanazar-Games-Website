<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    exit(1);
}

umask(0077);
[$config, $database] = require __DIR__ . '/bootstrap.php';
$lock = fopen($config->backupPath() . '/backup.lock', 'c');
if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
    exit(3);
}
$target = $config->backupPath() . '/chat-' . gmdate('Ymd-His') . '.sqlite';
$quoted = str_replace("'", "''", $target);
$database->connection()->exec("VACUUM INTO '" . $quoted . "'");
chmod($target, 0600);
$probe = new PDO('sqlite:' . $target, options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
if ($probe->query('PRAGMA integrity_check')->fetchColumn() !== 'ok') {
    unlink($target);
    throw new RuntimeException('Backup integrity check failed.');
}
fwrite(STDOUT, basename($target) . "\n");
