<?php

declare(strict_types=1);

const EXIT_USAGE = 2;
const EXIT_LOCKED = 75;
const CLEANUP_RETRY_DELAY = 60;
const PENDING_MAX_AGE = 3600;

function usage(): never
{
    fwrite(STDERR, "Usage: php scripts/cleanup.php [--dry-run] [--verbose] [--limit=N] [--session-path=DIR]\n");
    exit(EXIT_USAGE);
}

/** @return array<int|string, int>|false */
function exactStat(string $path): array|false
{
    clearstatcache(true, $path);
    return @lstat($path);
}

/** @param array<int|string, int> $stat */
function isRegularStat(array $stat): bool
{
    return (((int) $stat['mode']) & 0170000) === 0100000;
}

/** @param array<int|string, int> $stat */
function isSymlinkStat(array $stat): bool
{
    return (((int) $stat['mode']) & 0170000) === 0120000;
}

function syncDirectoryExact(string $directory): bool
{
    $pathStat = exactStat($directory);
    if ($pathStat === false
        || (((int) $pathStat['mode']) & 0170000) !== 0040000
        || is_link($directory)
        || !function_exists('fsync')) {
        return false;
    }
    $handle = @fopen($directory, 'r');
    if ($handle === false) {
        return false;
    }
    try {
        $openStat = @fstat($handle);
        return $openStat !== false
            && (int) $openStat['dev'] === (int) $pathStat['dev']
            && (int) $openStat['ino'] === (int) $pathStat['ino']
            && @fsync($handle);
    } finally {
        fclose($handle);
    }
}

function unlinkExactFile(string $path): bool
{
    $stat = exactStat($path);
    if ($stat === false) {
        return syncDirectoryExact(dirname($path));
    }
    if (!isRegularStat($stat) && !isSymlinkStat($stat)) {
        return false;
    }
    return @unlink($path)
        && exactStat($path) === false
        && syncDirectoryExact(dirname($path));
}

$restIndex = 0;
$options = getopt('', ['dry-run', 'verbose', 'limit:', 'session-path:', 'help'], $restIndex);
if ($options === false || $restIndex !== count($argv)) {
    usage();
}
if (isset($options['help'])) {
    fwrite(STDOUT, "Usage: php scripts/cleanup.php [--dry-run] [--verbose] [--limit=N] [--session-path=DIR]\n");
    exit(0);
}
foreach (['dry-run', 'verbose', 'limit', 'session-path'] as $name) {
    if (isset($options[$name]) && is_array($options[$name])) {
        usage();
    }
}
$dryRun = isset($options['dry-run']);
$verbose = isset($options['verbose']);
$limitValue = $options['limit'] ?? '500';
if (!is_string($limitValue) || preg_match('/^[1-9][0-9]{0,4}$/D', $limitValue) !== 1) {
    usage();
}
$limit = (int) $limitValue;
if ($limit > 10000) {
    usage();
}
$sessionPath = $options['session-path'] ?? null;
if ($sessionPath !== null && (!is_string($sessionPath) || $sessionPath === '' || $sessionPath[0] !== '/')) {
    usage();
}

if ($dryRun) {
    define('FLASH_PHOTO_DATABASE_READ_ONLY', true);
    require_once dirname(__DIR__) . '/app/Config.php';
    try {
        $preflightConfig = FlashPhoto\Config::load(dirname(__DIR__) . '/config/config.php');
        $preflightStorage = $preflightConfig->string('storage_path');
        $preflightSession = dirname($preflightStorage) . '/sessions';
        $preflightPaths = [
            [$preflightConfig->string('database_path'), 0100000],
            [$preflightStorage, 0040000],
            [$preflightStorage . '/.pending', 0040000],
            [$preflightConfig->string('log_path'), 0040000],
            [$preflightConfig->string('rate_limit_path'), 0040000],
            [$preflightSession, 0040000],
            [$preflightSession . '/.cleanup', 0040000],
        ];
        foreach ($preflightPaths as [$preflightPath, $preflightType]) {
            $preflightStat = @lstat($preflightPath);
            if ($preflightStat === false || (((int) $preflightStat['mode']) & 0170000) !== $preflightType) {
                throw new RuntimeException('Dry-run runtime state is incomplete.');
            }
        }
    } catch (Throwable $exception) {
        fwrite(STDERR, 'cleanup error: ' . $exception->getMessage() . PHP_EOL);
        exit(1);
    }
}

$lock = null;
$persistentLogger = null;
$errors = 0;
$summary = [
    'expired_records' => 0,
    'stored_files' => 0,
    'orphaned_files' => 0,
    'temporary_files' => 0,
    'rate_limit_files' => 0,
    'session_files' => 0,
    'log_files' => 0,
    'audit_records' => 0,
    'retained_records' => 0,
];
$error = static function (string $message) use (&$errors, &$persistentLogger, $dryRun): void {
    $errors++;
    fwrite(STDERR, "cleanup error: {$message}\n");
    if (!$dryRun && $persistentLogger !== null) {
        $persistentLogger->error('cleanup.error', ['error_number' => $errors]);
    }
};

try {
    $app = require dirname(__DIR__) . '/app/bootstrap.php';
    $config = $app['config'];
    $pdo = $app['database']->pdo();
    $storage = $app['storage'];
    $flash = $app['flash'];
    $cleanupQueue = $app['cleanup_queue'];
    $sessionRegistry = $app['session_cleanup_registry'];
    $persistentLogger = $app['logger'];
    $logDeleted = static function (string $category, string $itemHash) use ($persistentLogger): void {
        $persistentLogger->info('cleanup.delete', ['category' => $category, 'item_hash' => $itemHash]);
    };
    $now = time();
    $deferTerminal = static function (int $id) use ($pdo, $now): void {
        $retry = $pdo->prepare(
            "UPDATE flash_images SET cleanup_retry_at = :retry
             WHERE id = :id AND status IN ('expired', 'destroyed') AND storage_deleted_at IS NULL"
        );
        $retry->execute(['retry' => $now + CLEANUP_RETRY_DELAY, 'id' => $id]);
    };

    $lockPath = dirname($config->string('database_path')) . '/.cleanup.lock';
    $lock = @fopen($lockPath, $dryRun ? 'r' : 'c');
    if ($lock === false && !$dryRun) {
        throw new RuntimeException('Unable to open the cleanup lock.');
    }
    if (!$dryRun) {
        @chmod($lockPath, 0600);
    }
    if (is_resource($lock) && !flock($lock, LOCK_EX | LOCK_NB)) {
        fclose($lock);
        fwrite(STDERR, "Cleanup is already running.\n");
        exit(EXIT_LOCKED);
    }

    $expiringRows = [];
    foreach ([
        [
            'status' => 'unused',
            'deadline' => 'unused_expires_at',
            'index' => 'idx_flash_images_cleanup_unused',
        ],
        [
            'status' => 'opened',
            'deadline' => 'expires_at',
            'index' => 'idx_flash_images_cleanup_opened',
        ],
    ] as $expiry) {
        $select = $pdo->prepare(
            "SELECT id, storage_name, status FROM flash_images INDEXED BY {$expiry['index']}
             WHERE status = '{$expiry['status']}' AND {$expiry['deadline']} <= :now
             ORDER BY {$expiry['deadline']}, id LIMIT :limit"
        );
        $select->bindValue('now', $now, PDO::PARAM_INT);
        $select->bindValue('limit', $limit, PDO::PARAM_INT);
        $select->execute();
        array_push($expiringRows, ...$select->fetchAll());
    }
    foreach ($expiringRows as $row) {
        try {
            $reason = $row['status'] === 'unused' ? 'unused_timeout' : 'view_timeout';
            if (!$dryRun) {
                $update = $pdo->prepare(
                    "UPDATE flash_images SET status = 'expired', destroy_reason = :reason
                     WHERE id = :id AND status = :status"
                );
                $update->execute([
                    'reason' => $reason,
                    'id' => $row['id'],
                    'status' => $row['status'],
                ]);
                if ($update->rowCount() !== 1) {
                    continue;
                }
            }
            $summary['expired_records']++;
            if ($verbose) {
                fwrite(STDOUT, ($dryRun ? 'would expire' : 'expired') . " flash record {$row['id']} ({$reason})\n");
            }
            $name = (string) $row['storage_name'];
            $path = rtrim($config->string('storage_path'), '/') . '/' . $name;
            $exists = @lstat($path) !== false;
            if (!$storage->isSafeStorageName($name)) {
                $error("flash {$row['id']}: unsafe storage name");
            } elseif ($dryRun) {
                if ($exists) {
                    $summary['stored_files']++;
                }
            } elseif (!$storage->delete($name)) {
                $deferTerminal((int) $row['id']);
                $error("flash {$row['id']}: unable to remove stored file");
            } else {
                if ($exists) {
                    $summary['stored_files']++;
                    $persistentLogger->info('cleanup.delete', [
                        'category' => 'stored_files',
                        'flash_id' => (int) $row['id'],
                    ]);
                }
                if (!$flash->finalizeAutomaticDestroy((int) $row['id'], $reason)) {
                    $deferTerminal((int) $row['id']);
                }
            }
        } catch (Throwable $exception) {
            if (!$dryRun) {
                try {
                    $deferTerminal((int) $row['id']);
                } catch (Throwable) {
                }
            }
            $error("flash {$row['id']}: {$exception->getMessage()}");
        }
    }

    $select = $pdo->prepare(
        "SELECT id, storage_name, status, destroy_reason
         FROM flash_images INDEXED BY idx_flash_images_pending_terminal
         WHERE status IN ('expired', 'destroyed') AND storage_deleted_at IS NULL
         AND COALESCE(cleanup_retry_at, 0) <= :now
         ORDER BY COALESCE(cleanup_retry_at, 0), id LIMIT :limit"
    );
    $select->bindValue('now', $now, PDO::PARAM_INT);
    $select->bindValue('limit', $limit, PDO::PARAM_INT);
    $select->execute();
    foreach ($select->fetchAll() as $row) {
        try {
            $name = (string) $row['storage_name'];
            if (!$storage->isSafeStorageName($name)) {
                if (!$dryRun) {
                    $deferTerminal((int) $row['id']);
                }
                $error("flash {$row['id']}: unsafe storage name");
                continue;
            }
            $path = rtrim($config->string('storage_path'), '/') . '/' . $name;
            $exists = @lstat($path) !== false;
            if ($dryRun) {
                if ($exists) {
                    $summary['stored_files']++;
                }
                if ($verbose) {
                    fwrite(STDOUT, "would finalize flash record {$row['id']}\n");
                }
                continue;
            }
            if (!$storage->delete($name)) {
                $deferTerminal((int) $row['id']);
                $error("flash {$row['id']}: unable to remove residual file");
                continue;
            }
            if ($exists) {
                $summary['stored_files']++;
                $persistentLogger->info('cleanup.delete', [
                    'category' => 'stored_files',
                    'flash_id' => (int) $row['id'],
                ]);
            }
            if ($row['status'] === 'expired') {
                $reason = in_array($row['destroy_reason'], ['unused_timeout', 'view_timeout'], true)
                    ? (string) $row['destroy_reason']
                    : 'view_timeout';
                $finalized = $flash->finalizeAutomaticDestroy((int) $row['id'], $reason);
            } else {
                $finalized = $flash->finalizeStorageDeletion((int) $row['id']);
            }
            if (!$finalized) {
                $deferTerminal((int) $row['id']);
                continue;
            }
            if ($verbose) {
                fwrite(STDOUT, "finalized stored file for flash {$row['id']}\n");
            }
        } catch (Throwable $exception) {
            if (!$dryRun) {
                try {
                    $deferTerminal((int) $row['id']);
                } catch (Throwable) {
                }
            }
            $error("flash {$row['id']}: {$exception->getMessage()}");
        }
    }

    $pendingPath = rtrim($config->string('storage_path'), '/') . '/.pending';
    if (is_dir($pendingPath) && !is_link($pendingPath)) {
        foreach ($cleanupQueue->due('pending', $now, $limit) as $item) {
            $name = $item['item_name'];
            $dueAt = $item['due_at'];
            $path = $pendingPath . '/' . $name;
            $itemHash = substr(hash('sha256', $name), 0, 16);
            $handle = null;
            $label = null;
            $itemError = null;
            try {
                $stat = exactStat($path);
                if ($stat === false) {
                    if (!$dryRun) {
                        if (!unlinkExactFile($path)) {
                            throw new RuntimeException("pending_files: unable to persist missing item {$itemHash}");
                        }
                        $cleanupQueue->removeIfDue('pending', $name, $dueAt);
                    }
                    continue;
                }
                if (preg_match('/^\.tmp-[a-f0-9]{48}$/D', $name) === 1) {
                    if (!isRegularStat($stat) && !isSymlinkStat($stat)) {
                        if (!$dryRun) {
                            $cleanupQueue->deferIfDue(
                                'pending',
                                $name,
                                $dueAt,
                                $now + CLEANUP_RETRY_DELAY
                            );
                        }
                        throw new RuntimeException("temporary_files: unable to inspect item {$itemHash}");
                    }
                    $markerLocked = false;
                    foreach (['jpg', 'png', 'webp', 'gif'] as $extension) {
                        $markerPath = $pendingPath . '/' . substr($name, 5) . ".{$extension}.pending";
                        $markerStat = exactStat($markerPath);
                        if ($markerStat === false || !isRegularStat($markerStat)) {
                            continue;
                        }
                        $handle = @fopen($markerPath, $dryRun ? 'r' : 'r+');
                        if ($handle === false) {
                            if (!$dryRun) {
                                $cleanupQueue->deferIfDue(
                                    'pending',
                                    $name,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                            }
                            throw new RuntimeException("temporary_files: unable to open item {$itemHash}");
                        }
                        if (!flock($handle, LOCK_EX | LOCK_NB)) {
                            fclose($handle);
                            $handle = null;
                            if (!$dryRun) {
                                $cleanupQueue->deferIfDue(
                                    'pending',
                                    $name,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                            }
                            $markerLocked = true;
                        }
                        break;
                    }
                    if ($markerLocked) {
                        continue;
                    }
                    if (isRegularStat($stat) && (int) $stat['mtime'] + PENDING_MAX_AGE > $now) {
                        if (!$dryRun) {
                            $cleanupQueue->deferIfDue(
                                'pending',
                                $name,
                                $dueAt,
                                max($now + CLEANUP_RETRY_DELAY, (int) $stat['mtime'] + PENDING_MAX_AGE)
                            );
                        }
                        continue;
                    }
                    if (!$dryRun) {
                        if (!unlinkExactFile($path)) {
                            $cleanupQueue->deferIfDue(
                                'pending',
                                $name,
                                $dueAt,
                                $now + CLEANUP_RETRY_DELAY
                            );
                            throw new RuntimeException("temporary_files: unable to remove item {$itemHash}");
                        }
                        $cleanupQueue->removeIfDue('pending', $name, $dueAt);
                    }
                    $label = 'temporary_files';
                } elseif (preg_match('/^([a-f0-9]{48}\.(?:jpg|png|webp|gif))\.pending$/D', $name, $matches) === 1) {
                    $storageName = $matches[1];
                    if (!isRegularStat($stat)) {
                        if (!isSymlinkStat($stat)) {
                            if (!$dryRun) {
                                $cleanupQueue->deferIfDue(
                                    'pending',
                                    $name,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                            }
                            throw new RuntimeException("temporary_files: unable to inspect item {$itemHash}");
                        }
                        if (!$dryRun) {
                            if (!unlinkExactFile($path)) {
                                $cleanupQueue->deferIfDue(
                                    'pending',
                                    $name,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                                throw new RuntimeException("temporary_files: unable to remove item {$itemHash}");
                            }
                            $cleanupQueue->removeIfDue('pending', $name, $dueAt);
                        }
                        $label = 'temporary_files';
                    } else {
                        $handle = @fopen($path, $dryRun ? 'r' : 'r+');
                        if ($handle === false) {
                            if (!$dryRun) {
                                $cleanupQueue->deferIfDue(
                                    'pending',
                                    $name,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                            }
                            throw new RuntimeException("orphaned_files: unable to open item {$itemHash}");
                        }
                        if (!flock($handle, LOCK_EX | LOCK_NB)) {
                            if (!$dryRun) {
                                $cleanupQueue->deferIfDue(
                                    'pending',
                                    $name,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                            }
                            continue;
                        }
                        $stat = exactStat($path);
                        if ($stat === false) {
                            if (!$dryRun) {
                                if (!unlinkExactFile($path)) {
                                    throw new RuntimeException(
                                        "pending_files: unable to persist missing item {$itemHash}"
                                    );
                                }
                                $cleanupQueue->removeIfDue('pending', $name, $dueAt);
                            }
                            continue;
                        }
                        $validMarker = isRegularStat($stat)
                            && (((int) $stat['mode']) & 0777) === 0600
                            && (int) $stat['size'] === 0;
                        if (!$validMarker) {
                            if (!$dryRun) {
                                if (!unlinkExactFile($path)) {
                                    $cleanupQueue->deferIfDue(
                                        'pending',
                                        $name,
                                        $dueAt,
                                        $now + CLEANUP_RETRY_DELAY
                                    );
                                    throw new RuntimeException("temporary_files: unable to remove item {$itemHash}");
                                }
                                $cleanupQueue->removeIfDue('pending', $name, $dueAt);
                            }
                            $label = 'temporary_files';
                        } elseif ((int) $stat['mtime'] + PENDING_MAX_AGE > $now) {
                            if (!$dryRun) {
                                $cleanupQueue->deferIfDue(
                                    'pending',
                                    $name,
                                    $dueAt,
                                    max($now + CLEANUP_RETRY_DELAY, (int) $stat['mtime'] + PENDING_MAX_AGE)
                                );
                            }
                            continue;
                        } elseif ($dryRun) {
                            $known = $pdo->prepare('SELECT 1 FROM flash_images WHERE storage_name = :name LIMIT 1');
                            $known->execute(['name' => $storageName]);
                            $label = $known->fetchColumn() === false ? 'orphaned_files' : 'temporary_files';
                        } else {
                            $result = $app['database']->immediate(static function (PDO $pdo) use (
                                $storageName,
                                $name,
                                $dueAt,
                                $path,
                                $config,
                                $cleanupQueue
                            ): string {
                                $known = $pdo->prepare(
                                    'SELECT 1 FROM flash_images WHERE storage_name = :name LIMIT 1'
                                );
                                $known->execute(['name' => $storageName]);
                                $isKnown = $known->fetchColumn() !== false;
                                $payload = rtrim($config->string('storage_path'), '/') . '/' . $storageName;
                                if (!$isKnown && !unlinkExactFile($payload)) {
                                    return 'failed-payload';
                                }
                                if (!unlinkExactFile($path)) {
                                    return 'failed-marker';
                                }
                                if (!$cleanupQueue->removeIfDue('pending', $name, $dueAt)) {
                                    return 'stale';
                                }
                                return $isKnown ? 'temporary_files' : 'orphaned_files';
                            });
                            if ($result === 'stale') {
                                continue;
                            }
                            if (str_starts_with($result, 'failed')) {
                                $cleanupQueue->deferIfDue(
                                    'pending',
                                    $name,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                                throw new RuntimeException("orphaned_files: unable to remove item {$itemHash}");
                            }
                            $label = $result;
                        }
                    }
                } else {
                    throw new RuntimeException('pending_files: invalid queued item');
                }
            } catch (Throwable $exception) {
                if (!$dryRun) {
                    try {
                        $cleanupQueue->deferIfDue(
                            'pending',
                            $name,
                            $dueAt,
                            $now + CLEANUP_RETRY_DELAY
                        );
                    } catch (Throwable) {
                    }
                }
                $itemError = $exception->getMessage();
            } finally {
                if (is_resource($handle)) {
                    flock($handle, LOCK_UN);
                    fclose($handle);
                }
            }
            if ($itemError !== null) {
                $error($itemError);
                continue;
            }
            if ($label !== null) {
                if (!$dryRun) {
                    $logDeleted($label, $itemHash);
                }
                $summary[$label]++;
                if ($verbose) {
                    fwrite(STDOUT, ($dryRun ? 'would remove ' : 'removed ') . "{$label}: {$itemHash}\n");
                }
            }
        }
    } elseif ($verbose) {
        fwrite(STDOUT, "skip pending_files: directory unavailable or unsafe\n");
    }

    $maxWindow = 60;
    foreach ($config->array('rate_limits') as $definition) {
        if (is_array($definition)) {
            $maxWindow = max($maxWindow, (int) ($definition['window'] ?? 0));
        }
    }
    $rateItems = $cleanupQueue->due('rate_limit', $now, $limit);
    foreach ($rateItems as $item) {
        $name = $item['item_name'];
        $dueAt = $item['due_at'];
        $path = rtrim($config->string('rate_limit_path'), '/') . '/' . $name;
        $temporary = $path . '.tmp';
        $itemHash = substr(hash('sha256', $name), 0, 16);
        $cleanRateItem = static function () use (
            $cleanupQueue,
            $name,
            $dueAt,
            $path,
            $temporary,
            $now,
            $maxWindow,
            $dryRun,
            $itemHash
        ): array {
            $stat = exactStat($path);
            $temporaryStat = exactStat($temporary);
            $fail = static function (string $message) use (
                $cleanupQueue,
                $name,
                $dueAt,
                $now,
                $dryRun
            ): array {
                if (!$dryRun) {
                    $cleanupQueue->deferIfDue(
                        'rate_limit',
                        $name,
                        $dueAt,
                        $now + CLEANUP_RETRY_DELAY
                    );
                }
                return ['status' => 'error', 'message' => $message];
            };
            if ($temporaryStat !== false
                && !isRegularStat($temporaryStat)
                && !isSymlinkStat($temporaryStat)) {
                return $fail("rate_limit_files: unable to inspect temporary item {$itemHash}");
            }
            $removeBoth = static function () use ($path, $temporary): bool {
                return unlinkExactFile($path)
                    && unlinkExactFile($temporary)
                    && exactStat($path) === false
                    && exactStat($temporary) === false
                    && syncDirectoryExact(dirname($path));
            };
            if ($stat === false) {
                if ($dryRun) {
                    return ['status' => $temporaryStat === false ? 'missing' : 'removed'];
                }
                if (!$removeBoth()) {
                    return $fail("rate_limit_files: unable to remove interrupted item {$itemHash}");
                }
                $cleanupQueue->removeIfDue('rate_limit', $name, $dueAt);
                return ['status' => $temporaryStat === false ? 'missing' : 'removed'];
            }
            if (!isRegularStat($stat)) {
                if (!isSymlinkStat($stat)) {
                    return $fail("rate_limit_files: unable to inspect item {$itemHash}");
                }
                if ($dryRun) {
                    return ['status' => 'removed'];
                }
                if (!$removeBoth()) {
                    return $fail("rate_limit_files: unable to remove item {$itemHash}");
                }
                $cleanupQueue->removeIfDue('rate_limit', $name, $dueAt);
                return ['status' => 'removed'];
            }
            $contents = @file_get_contents($path);
            $state = is_string($contents) ? json_decode($contents, true) : null;
            $started = is_array($state) && isset($state['started']) && is_int($state['started'])
                ? $state['started']
                : 0;
            $freshUntil = max((int) $stat['mtime'] + $maxWindow, $started + $maxWindow);
            if ($freshUntil > $now) {
                if (!$dryRun) {
                    if ($temporaryStat !== false
                        && (!unlinkExactFile($temporary) || exactStat($temporary) !== false)) {
                        return $fail("rate_limit_files: unable to remove interrupted item {$itemHash}");
                    }
                    $cleanupQueue->deferIfDue(
                        'rate_limit',
                        $name,
                        $dueAt,
                        max($now + CLEANUP_RETRY_DELAY, $freshUntil)
                    );
                }
                return ['status' => 'deferred'];
            }
            if ($dryRun) {
                return ['status' => 'removed'];
            }
            if (!$removeBoth()) {
                return $fail("rate_limit_files: unable to remove item {$itemHash}");
            }
            $cleanupQueue->removeIfDue('rate_limit', $name, $dueAt);
            return ['status' => 'removed'];
        };
        try {
            $result = $dryRun ? $cleanRateItem() : $app['rate_limiter']->synchronized($cleanRateItem);
        } catch (Throwable $exception) {
            if (!$dryRun) {
                try {
                    $cleanupQueue->deferIfDue(
                        'rate_limit',
                        $name,
                        $dueAt,
                        $now + CLEANUP_RETRY_DELAY
                    );
                } catch (Throwable) {
                }
            }
            $error("rate_limit_files: {$exception->getMessage()}");
            continue;
        }
        if ($result['status'] === 'error') {
            $error((string) $result['message']);
            continue;
        }
        if ($result['status'] !== 'removed') {
            continue;
        }
        $summary['rate_limit_files']++;
        if (!$dryRun) {
            $logDeleted('rate_limit_files', $itemHash);
        }
        if ($verbose) {
            fwrite(
                STDOUT,
                ($dryRun ? 'would remove ' : 'removed ') . "rate_limit_files: {$itemHash}\n"
            );
        }
    }

    $cleanupQueuedFiles = static function (
        string $category,
        string $directory,
        int $lifetime,
        string $label
    ) use (
        $cleanupQueue,
        $now,
        $limit,
        $dryRun,
        $verbose,
        &$summary,
        $error,
        $logDeleted
    ): void {
        $deletedItems = [];
        $itemErrors = [];
        foreach ($cleanupQueue->due($category, $now, $limit) as $item) {
            $name = $item['item_name'];
            $dueAt = $item['due_at'];
            $path = rtrim($directory, '/') . '/' . $name;
            $itemHash = substr(hash('sha256', $name), 0, 16);
            $handle = null;
            $removed = false;
            try {
                $stat = exactStat($path);
                if ($stat === false) {
                    if (!$dryRun) {
                        if (!unlinkExactFile($path)) {
                            throw new RuntimeException("{$label}: unable to persist missing item {$itemHash}");
                        }
                        $cleanupQueue->removeIfDue($category, $name, $dueAt);
                    }
                    continue;
                }
                if (isRegularStat($stat)) {
                    $handle = @fopen($path, $dryRun ? 'r' : 'r+');
                    if ($handle === false) {
                        if (!$dryRun) {
                            $cleanupQueue->deferIfDue(
                                $category,
                                $name,
                                $dueAt,
                                $now + CLEANUP_RETRY_DELAY
                            );
                        }
                        $itemErrors[] = "{$label}: unable to open item {$itemHash}";
                        continue;
                    }
                    if (!flock($handle, LOCK_EX | LOCK_NB)) {
                        if (!$dryRun) {
                            $cleanupQueue->deferIfDue(
                                $category,
                                $name,
                                $dueAt,
                                $now + CLEANUP_RETRY_DELAY
                            );
                        }
                        continue;
                    }
                }
                $stat = exactStat($path);
                if ($stat === false) {
                    if (!$dryRun) {
                        if (!unlinkExactFile($path)) {
                            throw new RuntimeException("{$label}: unable to persist missing item {$itemHash}");
                        }
                        $cleanupQueue->removeIfDue($category, $name, $dueAt);
                    }
                    continue;
                }
                if (!$dryRun && $cleanupQueue->currentDue($category, $name) !== $dueAt) {
                    continue;
                }
                if (!isRegularStat($stat) && !isSymlinkStat($stat)) {
                    if (!$dryRun) {
                        $cleanupQueue->deferIfDue(
                            $category,
                            $name,
                            $dueAt,
                            $now + CLEANUP_RETRY_DELAY
                        );
                    }
                    $itemErrors[] = "{$label}: unable to inspect item {$itemHash}";
                    continue;
                }
                if (isRegularStat($stat) && (int) $stat['mtime'] + $lifetime > $now) {
                    if (!$dryRun) {
                        $cleanupQueue->deferIfDue(
                            $category,
                            $name,
                            $dueAt,
                            max($now + CLEANUP_RETRY_DELAY, (int) $stat['mtime'] + $lifetime)
                        );
                    }
                    continue;
                }
                if (!$dryRun) {
                    if (!unlinkExactFile($path)) {
                        $cleanupQueue->deferIfDue(
                            $category,
                            $name,
                            $dueAt,
                            $now + CLEANUP_RETRY_DELAY
                        );
                        $itemErrors[] = "{$label}: unable to remove item {$itemHash}";
                        continue;
                    }
                    $cleanupQueue->removeIfDue($category, $name, $dueAt);
                }
                $removed = true;
            } catch (Throwable $exception) {
                if (!$dryRun) {
                    try {
                        $cleanupQueue->deferIfDue(
                            $category,
                            $name,
                            $dueAt,
                            $now + CLEANUP_RETRY_DELAY
                        );
                    } catch (Throwable) {
                    }
                }
                $itemErrors[] = "{$label}: {$exception->getMessage()}";
            } finally {
                if (is_resource($handle)) {
                    flock($handle, LOCK_UN);
                    fclose($handle);
                }
            }
            if (!$removed) {
                continue;
            }
            $summary[$label]++;
            if ($dryRun) {
                if ($verbose) {
                    fwrite(STDOUT, "would remove {$label}: {$itemHash}\n");
                }
            } else {
                $deletedItems[] = $itemHash;
            }
        }
        foreach ($itemErrors as $message) {
            $error($message);
        }
        foreach ($deletedItems as $itemHash) {
            $logDeleted($label, $itemHash);
            if ($verbose) {
                fwrite(STDOUT, "removed {$label}: {$itemHash}\n");
            }
        }
    };

    $expectedSessionPath = dirname($config->string('storage_path')) . '/sessions';
    $configuredSessionPath = $sessionPath;
    if ($configuredSessionPath === null) {
        $raw = (string) ini_get('session.save_path');
        $configuredSessionPath = $raw === $expectedSessionPath ? $raw : null;
    }
    if ($configuredSessionPath !== null) {
        $realSessionPath = realpath($configuredSessionPath);
        $sessionMode = $realSessionPath === false ? false : @fileperms($realSessionPath);
        if (
            ini_get('session.save_handler') !== 'files'
            || $configuredSessionPath !== $expectedSessionPath
            || $realSessionPath === false
            || $realSessionPath !== $expectedSessionPath
            || !is_dir($realSessionPath)
            || is_link($configuredSessionPath)
            || $sessionMode === false
            || ($sessionMode & 0077) !== 0
            || !is_readable($realSessionPath)
            || !is_writable($realSessionPath)
            || !is_executable($realSessionPath)
        ) {
            $error('session directory is unavailable or unsafe');
        } else {
            $deletedSessions = [];
            $sessionErrors = [];
            foreach ($cleanupQueue->due('session_pending', $now, $limit) as $item) {
                $reference = $item['item_name'];
                $dueAt = $item['due_at'];
                $itemHash = substr(hash('sha256', $reference), 0, 16);
                if ($dryRun) {
                    continue;
                }
                try {
                    $cleanupQueue->transitionIfDue(
                        'session_pending',
                        'session_delete',
                        $reference,
                        $dueAt,
                        $dueAt
                    );
                } catch (Throwable) {
                    $sessionErrors[] = "session_files: pending cleanup failed {$itemHash}";
                }
            }
            foreach (['session_delete', 'session'] as $initialCategory) {
                foreach ($cleanupQueue->due($initialCategory, $now, $limit) as $item) {
                    $category = $initialCategory;
                    $reference = $item['item_name'];
                    $dueAt = $item['due_at'];
                    $itemHash = substr(hash('sha256', $reference), 0, 16);
                    $sidecarPath = $sessionRegistry->sidecarPath($reference);
                    $sidecarHandle = null;
                    $sessionHandle = null;
                    $removed = false;
                    try {
                        $sidecarStat = exactStat($sidecarPath);
                        if ($sidecarStat === false) {
                            if ($category === 'session_delete') {
                                if (!$dryRun) {
                                    if (!$sessionRegistry->removeSidecar($reference)) {
                                        throw new RuntimeException('Unable to persist missing cleanup reference.');
                                    }
                                    $cleanupQueue->removeIfDue('session_delete', $reference, $dueAt);
                                }
                                continue;
                            }
                            if (!$dryRun) {
                                $cleanupQueue->deferIfDue(
                                    'session',
                                    $reference,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                            }
                            $sessionErrors[] = "session_files: missing cleanup reference {$itemHash}";
                            continue;
                        }
                        if (!isRegularStat($sidecarStat) || (((int) $sidecarStat['mode']) & 0777) !== 0600) {
                            if ($category === 'session_delete') {
                                if (!$dryRun) {
                                    if (!$sessionRegistry->removeSidecar($reference)) {
                                        $cleanupQueue->deferIfDue(
                                            'session_delete',
                                            $reference,
                                            $dueAt,
                                            $now + CLEANUP_RETRY_DELAY
                                        );
                                        $sessionErrors[] = "session_files: unsafe cleanup reference {$itemHash}";
                                        continue;
                                    }
                                    $cleanupQueue->removeIfDue('session_delete', $reference, $dueAt);
                                }
                                continue;
                            }
                            if (!$dryRun) {
                                $cleanupQueue->deferIfDue(
                                    'session',
                                    $reference,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                            }
                            $sessionErrors[] = "session_files: unsafe cleanup reference {$itemHash}";
                            continue;
                        }
                        $sidecarHandle = @fopen($sidecarPath, 'r');
                        if ($sidecarHandle === false || !flock($sidecarHandle, LOCK_EX | LOCK_NB)) {
                            if (!$dryRun) {
                                $cleanupQueue->deferIfDue(
                                    $category,
                                    $reference,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                            }
                            continue;
                        }
                        $openedSidecarStat = fstat($sidecarHandle);
                        $currentSidecarStat = exactStat($sidecarPath);
                        if ($openedSidecarStat === false
                            || $currentSidecarStat === false
                            || !isRegularStat($currentSidecarStat)
                            || (int) $openedSidecarStat['dev'] !== (int) $currentSidecarStat['dev']
                            || (int) $openedSidecarStat['ino'] !== (int) $currentSidecarStat['ino']) {
                            if (!$dryRun) {
                                $cleanupQueue->deferIfDue(
                                    $category,
                                    $reference,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                            }
                            $sessionErrors[] = "session_files: changed cleanup reference {$itemHash}";
                            continue;
                        }
                        $sessionFileName = stream_get_contents($sidecarHandle, 262);
                        if (!is_string($sessionFileName)
                            || !feof($sidecarHandle)
                            || !$sessionRegistry->isSessionFileName($sessionFileName)) {
                            if ($category === 'session_delete') {
                                if (!$dryRun) {
                                    if (!$sessionRegistry->removeSidecar($reference)) {
                                        $cleanupQueue->deferIfDue(
                                            'session_delete',
                                            $reference,
                                            $dueAt,
                                            $now + CLEANUP_RETRY_DELAY
                                        );
                                        $sessionErrors[] = "session_files: invalid cleanup reference {$itemHash}";
                                        continue;
                                    }
                                    $cleanupQueue->removeIfDue('session_delete', $reference, $dueAt);
                                }
                                continue;
                            }
                            if (!$dryRun) {
                                $cleanupQueue->deferIfDue(
                                    'session',
                                    $reference,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                            }
                            $sessionErrors[] = "session_files: invalid cleanup reference {$itemHash}";
                            continue;
                        }
                        $sessionFilePath = $realSessionPath . '/' . $sessionFileName;
                        $sessionStat = exactStat($sessionFilePath);
                        if ($sessionStat === false) {
                            if (!$dryRun) {
                                if ($category === 'session'
                                    && !$cleanupQueue->transitionIfDue(
                                        'session',
                                        'session_delete',
                                        $reference,
                                        $dueAt,
                                        $dueAt
                                    )) {
                                    continue;
                                }
                                $category = 'session_delete';
                                try {
                                    $sessionRegistry->persistSessionDirectory();
                                    $sidecarRemoved = $sessionRegistry->removeSidecar($reference);
                                } catch (Throwable) {
                                    $sidecarRemoved = false;
                                }
                                if (!$sidecarRemoved) {
                                    $cleanupQueue->deferIfDue(
                                        'session_delete',
                                        $reference,
                                        $dueAt,
                                        $now + CLEANUP_RETRY_DELAY
                                    );
                                    $sessionErrors[] = "session_files: unable to remove reference {$itemHash}";
                                    continue;
                                }
                                $cleanupQueue->removeIfDue('session_delete', $reference, $dueAt);
                            }
                            continue;
                        }
                        if (!isRegularStat($sessionStat)) {
                            if (!$dryRun) {
                                $cleanupQueue->deferIfDue(
                                    $category,
                                    $reference,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                            }
                            $sessionErrors[] = "session_files: unsafe Session file {$itemHash}";
                            continue;
                        }
                        $sessionHandle = @fopen($sessionFilePath, 'r');
                        if ($sessionHandle === false || !flock($sessionHandle, LOCK_EX | LOCK_NB)) {
                            if (!$dryRun) {
                                $cleanupQueue->deferIfDue(
                                    $category,
                                    $reference,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                            }
                            continue;
                        }
                        $openedSessionStat = fstat($sessionHandle);
                        $currentSessionStat = exactStat($sessionFilePath);
                        if ($openedSessionStat === false
                            || $currentSessionStat === false
                            || !isRegularStat($currentSessionStat)
                            || (int) $openedSessionStat['dev'] !== (int) $currentSessionStat['dev']
                            || (int) $openedSessionStat['ino'] !== (int) $currentSessionStat['ino']) {
                            if (!$dryRun) {
                                $cleanupQueue->deferIfDue(
                                    $category,
                                    $reference,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                            }
                            $sessionErrors[] = "session_files: changed Session file {$itemHash}";
                            continue;
                        }
                        if ($category === 'session') {
                            if (!$dryRun && $cleanupQueue->currentDue('session', $reference) !== $dueAt) {
                                continue;
                            }
                            $expiresAt = (int) $currentSessionStat['mtime']
                                + $config->int('session_lifetime');
                            if ($expiresAt > $now) {
                                if (!$dryRun) {
                                    $cleanupQueue->deferIfDue(
                                        'session',
                                        $reference,
                                        $dueAt,
                                        max($now + CLEANUP_RETRY_DELAY, $expiresAt)
                                    );
                                }
                                continue;
                            }
                        }
                        if (!$dryRun) {
                            if ($category === 'session'
                                && !$cleanupQueue->transitionIfDue(
                                    'session',
                                    'session_delete',
                                    $reference,
                                    $dueAt,
                                    $dueAt
                                )) {
                                continue;
                            }
                            $category = 'session_delete';
                            if (!unlinkExactFile($sessionFilePath)
                                || !$sessionRegistry->removeSidecar($reference)) {
                                $cleanupQueue->deferIfDue(
                                    'session_delete',
                                    $reference,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                                $sessionErrors[] = "session_files: unable to remove item {$itemHash}";
                                continue;
                            }
                            $cleanupQueue->removeIfDue('session_delete', $reference, $dueAt);
                        }
                        $removed = true;
                    } catch (Throwable) {
                        if (!$dryRun) {
                            try {
                                $cleanupQueue->deferIfDue(
                                    $category,
                                    $reference,
                                    $dueAt,
                                    $now + CLEANUP_RETRY_DELAY
                                );
                            } catch (Throwable) {
                            }
                        }
                        $sessionErrors[] = "session_files: cleanup failed {$itemHash}";
                    } finally {
                        if (is_resource($sessionHandle)) {
                            flock($sessionHandle, LOCK_UN);
                            fclose($sessionHandle);
                        }
                        if (is_resource($sidecarHandle)) {
                            flock($sidecarHandle, LOCK_UN);
                            fclose($sidecarHandle);
                        }
                    }
                    if (!$removed) {
                        continue;
                    }
                    $summary['session_files']++;
                    if ($dryRun) {
                        if ($verbose) {
                            fwrite(STDOUT, "would remove session_files: {$itemHash}\n");
                        }
                    } else {
                        $deletedSessions[] = $itemHash;
                    }
                }
            }
            foreach ($sessionErrors as $message) {
                $error($message);
            }
            foreach ($deletedSessions as $itemHash) {
                $logDeleted('session_files', $itemHash);
                if ($verbose) {
                    fwrite(STDOUT, "removed session_files: {$itemHash}\n");
                }
            }
        }
    } elseif ($verbose) {
        fwrite(STDOUT, "skip session_files: no dedicated session directory was confirmed\n");
    }

    $cleanupQueuedFiles(
        'log',
        $config->string('log_path'),
        $config->int('log_retention_days') * 86400,
        'log_files'
    );

    $auditCutoff = $now - ($config->int('log_retention_days') * 86400);
    $select = $pdo->prepare(
        'SELECT id FROM audit_logs INDEXED BY idx_audit_logs_cleanup
         WHERE created_at <= :cutoff ORDER BY created_at, id LIMIT :limit'
    );
    $select->bindValue('cutoff', $auditCutoff, PDO::PARAM_INT);
    $select->bindValue('limit', $limit, PDO::PARAM_INT);
    $select->execute();
    foreach ($select->fetchAll() as $row) {
        try {
            if (!$dryRun) {
                $delete = $pdo->prepare('DELETE FROM audit_logs WHERE id = :id AND created_at <= :cutoff');
                $delete->execute(['id' => $row['id'], 'cutoff' => $auditCutoff]);
                if ($delete->rowCount() !== 1) {
                    continue;
                }
            }
            $summary['audit_records']++;
            if (!$dryRun) {
                $persistentLogger->info('cleanup.delete', [
                    'category' => 'audit_records',
                    'audit_id' => (int) $row['id'],
                ]);
            }
            if ($verbose) {
                fwrite(STDOUT, ($dryRun ? 'would delete' : 'deleted') . " retained audit record {$row['id']}\n");
            }
        } catch (Throwable $exception) {
            $error("audit {$row['id']}: {$exception->getMessage()}");
        }
    }

    $retentionCutoff = $now - ($config->int('destroyed_record_retention_days') * 86400);
    $select = $pdo->prepare(
        "SELECT id FROM flash_images INDEXED BY idx_flash_images_cleanup_retention
         WHERE status IN ('expired', 'destroyed') AND destroyed_at IS NOT NULL
         AND storage_deleted_at IS NOT NULL AND destroyed_at <= :cutoff
         ORDER BY destroyed_at, id LIMIT :limit"
    );
    $select->bindValue('cutoff', $retentionCutoff, PDO::PARAM_INT);
    $select->bindValue('limit', $limit, PDO::PARAM_INT);
    $select->execute();
    foreach ($select->fetchAll() as $row) {
        try {
            if (!$dryRun) {
                $delete = $pdo->prepare(
                    "DELETE FROM flash_images WHERE id = :id AND status IN ('expired', 'destroyed')
                     AND storage_deleted_at IS NOT NULL AND destroyed_at IS NOT NULL AND destroyed_at <= :cutoff"
                );
                $delete->execute(['id' => $row['id'], 'cutoff' => $retentionCutoff]);
                if ($delete->rowCount() !== 1) {
                    continue;
                }
            }
            $summary['retained_records']++;
            if (!$dryRun) {
                $persistentLogger->info('cleanup.delete', [
                    'category' => 'retained_records',
                    'flash_id' => (int) $row['id'],
                ]);
            }
            if ($verbose) {
                fwrite(STDOUT, ($dryRun ? 'would delete' : 'deleted') . " retained flash record {$row['id']}\n");
            }
        } catch (Throwable $exception) {
            $error("flash {$row['id']}: {$exception->getMessage()}");
        }
    }
} catch (Throwable $exception) {
    $error($exception->getMessage());
}

if (is_resource($lock)) {
    flock($lock, LOCK_UN);
    fclose($lock);
}
if ($verbose || $dryRun) {
    $prefix = $dryRun ? 'dry-run ' : '';
    fwrite(STDOUT, $prefix . 'summary: ' . json_encode($summary, JSON_UNESCAPED_SLASHES) . ", errors={$errors}\n");
}
exit($errors === 0 ? 0 : 1);
