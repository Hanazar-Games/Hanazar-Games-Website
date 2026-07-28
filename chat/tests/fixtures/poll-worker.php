<?php

declare(strict_types=1);

use Hanazar\Chat\AuthContext;
use Hanazar\Chat\Config;
use Hanazar\Chat\Database;
use Hanazar\Chat\EventService;

require dirname(__DIR__, 2) . '/vendor/autoload.php';

$mode = $argv[1] ?? '';
$encodedConfig = $argv[2] ?? '';
$userId = filter_var($argv[3] ?? null, FILTER_VALIDATE_INT);
$cursor = filter_var($argv[4] ?? null, FILTER_VALIDATE_INT);
$timeoutMs = filter_var($argv[5] ?? null, FILTER_VALIDATE_INT);
$readyPath = $argv[6] ?? '';
$sessionId = $argv[7] ?? '';

try {
    $decoded = base64_decode($encodedConfig, true);
    if ($decoded === false || $userId === false || $cursor === false || $timeoutMs === false) {
        throw new RuntimeException('Invalid worker arguments.');
    }
    $values = json_decode($decoded, true, flags: JSON_THROW_ON_ERROR);
    if (!is_array($values)) {
        throw new RuntimeException('Invalid worker configuration.');
    }

    if ($mode === 'session-acquire') {
        configureSession((string) $values['SESSION_PATH'], $sessionId);
        $started = hrtime(true);
        session_start();
        $elapsedMs = (hrtime(true) - $started) / 1_000_000;
        session_write_close();
        emit(['ok' => true, 'elapsed_ms' => $elapsedMs]);
    }

    $config = Config::fromArray($values);
    $database = new Database($config);
    $statement = $database->connection()->prepare(
        'SELECT system_role, auth_version FROM users WHERE id = :id',
    );
    $statement->execute(['id' => $userId]);
    $user = $statement->fetch();
    if (!is_array($user)) {
        throw new RuntimeException('Worker user does not exist.');
    }
    $context = new AuthContext(
        (int) $userId,
        (string) $user['system_role'],
        (int) $user['auth_version'],
    );

    if ($mode === 'session-poll') {
        configureSession((string) $values['SESSION_PATH'], $sessionId);
        session_start();
        $_SESSION['poll_probe'] = true;
        session_write_close();
    } elseif ($mode !== 'poll') {
        throw new RuntimeException('Unknown worker mode.');
    }

    if ($readyPath === '' || !touch($readyPath)) {
        throw new RuntimeException('Unable to signal worker readiness.');
    }
    $batch = (new EventService($database))->poll(
        $context,
        (int) $cursor,
        (int) $timeoutMs,
        100,
    );
    emit(['ok' => true, 'batch' => $batch]);
} catch (\Throwable $exception) {
    emit([
        'ok' => false,
        'error' => $exception::class,
        'message' => $exception->getMessage(),
    ], 1);
}

function configureSession(string $path, string $id): void
{
    if ($id === '') {
        throw new RuntimeException('Missing session id.');
    }
    ini_set('session.use_cookies', '0');
    ini_set('session.use_strict_mode', '0');
    session_save_path($path);
    session_name('hanazar_chat_test');
    session_id($id);
}

/** @param array<string, mixed> $payload */
function emit(array $payload, int $exitCode = 0): never
{
    fwrite(STDOUT, json_encode($payload, JSON_THROW_ON_ERROR));
    exit($exitCode);
}
