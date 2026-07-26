<?php

declare(strict_types=1);

use FlashPhoto\SchemaValidator;

$app = require dirname(__DIR__) . '/app/bootstrap.php';
$pdo = $app['database']->pdo();
$objectCount = static fn (): int => (int) $pdo->query(
    "SELECT COUNT(*) FROM sqlite_master WHERE name NOT GLOB 'sqlite_*'"
)->fetchColumn();
$existingObjects = $objectCount();
$existingVersion = (int) $pdo->query('PRAGMA user_version')->fetchColumn();
if ($existingObjects === 0 && $existingVersion === 0) {
    $app['database']->initialize(__DIR__ . '/schema.sql');
} elseif (!SchemaValidator::isCompatible($pdo)) {
    throw new RuntimeException('Existing database schema is incompatible; initialize this version with a fresh database.');
}
if (!SchemaValidator::isCompatible($pdo)) {
    throw new RuntimeException('Database schema initialization did not produce the expected version.');
}
$path = $app['config']->string('database_path');
if (!@chmod($path, 0600)) {
    throw new RuntimeException('Unable to secure the database file.');
}
fwrite(STDOUT, "Database initialized successfully.\n");
