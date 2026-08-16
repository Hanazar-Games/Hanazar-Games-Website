<?php

declare(strict_types=1);

use PDO;

if (PHP_SAPI !== 'cli') {
    exit(1);
}

[$config, $database] = require __DIR__ . '/bootstrap.php';
$dryRun = in_array('--dry-run', $argv, true);
$lock = fopen($config->rateLimitPath() . '/cleanup.lock', 'c');
if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
    fwrite(STDERR, "cleanup already running\n");
    exit(3);
}

const RETENTION = [
    'user_events' => 604800,
    'typing_indicators' => 60,
    'user_presence' => 2592000,
    'audit_logs' => 7776000,
    'public_feedback' => 15552000,
    'sessions' => 86400,
    'rate-limits' => 86400,
    'logs' => 2592000,
    'backups' => 2592000,
];

$now = time();
try {
    $counts = $database->immediate(function (PDO $pdo) use ($now, $dryRun): array {
        $eventCutoff = $now - RETENTION['user_events'];
        $floorQuery = $pdo->prepare('SELECT COALESCE(MAX(id), 0) FROM user_events WHERE created_at < :cutoff');
        $floorQuery->execute(['cutoff' => $eventCutoff]);
        $floor = (int) $floorQuery->fetchColumn();
        $counts = [];
        foreach (
            [
                'DELETE FROM user_events WHERE created_at < :cutoff' => $eventCutoff,
                'DELETE FROM typing_indicators WHERE updated_at < :cutoff' => $now - RETENTION['typing_indicators'],
                'DELETE FROM user_presence WHERE last_seen_at < :cutoff' => $now - RETENTION['user_presence'],
                'DELETE FROM audit_logs WHERE created_at < :cutoff' => $now - RETENTION['audit_logs'],
                'DELETE FROM ephemeral_shares WHERE expires_at <= :cutoff' => $now,
                'DELETE FROM public_feedback WHERE created_at < :cutoff' => $now - RETENTION['public_feedback'],
            ] as $sql => $cutoff
        ) {
            $statement = $pdo->prepare($sql);
            $statement->execute(['cutoff' => $cutoff]);
            $counts[$sql] = $statement->rowCount();
        }
        if ($floor > 0) {
            $statement = $pdo->prepare(
                "INSERT INTO app_meta (key, value) VALUES ('events_floor_id', :floor) "
                . 'ON CONFLICT(key) DO UPDATE SET value = MAX(CAST(value AS INTEGER), CAST(excluded.value AS INTEGER))',
            );
            $statement->execute(['floor' => (string) $floor]);
        }
        if ($dryRun) {
            throw new RuntimeException('__DRY_RUN__' . json_encode($counts, JSON_THROW_ON_ERROR));
        }
        return $counts;
    });
} catch (RuntimeException $exception) {
    if (!$dryRun || !str_starts_with($exception->getMessage(), '__DRY_RUN__')) {
        throw $exception;
    }
    $decoded = json_decode(substr($exception->getMessage(), 11), true, flags: JSON_THROW_ON_ERROR);
    $counts = is_array($decoded) ? $decoded : [];
}

cleanupFiles($config->sessionPath(), $now - RETENTION['sessions'], $dryRun);
cleanupFiles($config->rateLimitPath(), $now - RETENTION['rate-limits'], $dryRun, ['cleanup.lock']);
cleanupFiles($config->logPath(), $now - RETENTION['logs'], $dryRun);
cleanupFiles($config->backupPath(), $now - RETENTION['backups'], $dryRun);
fwrite(STDOUT, json_encode(['dry_run' => $dryRun, 'database' => $counts], JSON_THROW_ON_ERROR) . "\n");

/** @param list<string> $protected */
function cleanupFiles(string $directory, int $cutoff, bool $dryRun, array $protected = []): void
{
    $root = realpath($directory);
    if ($root === false) {
        return;
    }
    foreach (new FilesystemIterator($root, FilesystemIterator::SKIP_DOTS) as $entry) {
        $name = $entry->getFilename();
        $path = $entry->getPathname();
        if (in_array($name, $protected, true) || str_ends_with($name, '.lock') || (!is_file($path) && !is_link($path)) || lstat($path) === false) {
            continue;
        }
        $resolved = realpath($path);
        if ($resolved === false || !str_starts_with($resolved, $root . DIRECTORY_SEPARATOR) || $entry->getMTime() >= $cutoff) {
            continue;
        }
        if (!$dryRun) {
            unlink($path);
        }
    }
}
