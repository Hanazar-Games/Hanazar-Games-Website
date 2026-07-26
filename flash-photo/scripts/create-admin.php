<?php

declare(strict_types=1);

function usage(): never
{
    fwrite(STDERR, "Usage: php scripts/create-admin.php [--username=NAME] [--password-stdin]\n");
    exit(2);
}

function readHidden(string $prompt): string
{
    if (!function_exists('stream_isatty') || !stream_isatty(STDIN)) {
        throw new RuntimeException('Interactive password entry requires a TTY; use --password-stdin for automation.');
    }
    fwrite(STDOUT, $prompt);
    $stty = is_executable('/usr/bin/stty') ? '/usr/bin/stty' : (is_executable('/bin/stty') ? '/bin/stty' : null);
    if ($stty === null) {
        throw new RuntimeException('stty is required for hidden password entry.');
    }
    $output = [];
    exec(escapeshellarg($stty) . ' -g 2>/dev/null', $output, $status);
    $terminalState = implode('', $output);
    if ($status !== 0 || $terminalState === '') {
        throw new RuntimeException('Unable to read terminal settings.');
    }
    exec(escapeshellarg($stty) . ' -echo 2>/dev/null', $output, $status);
    if ($status !== 0) {
        throw new RuntimeException('Unable to disable terminal echo.');
    }
    try {
        $value = fgets(STDIN);
    } finally {
        exec(escapeshellarg($stty) . ' ' . escapeshellarg($terminalState) . ' 2>/dev/null');
        fwrite(STDOUT, PHP_EOL);
    }
    if ($value === false) {
        throw new RuntimeException('Unable to read password.');
    }
    return rtrim($value, "\r\n");
}

$restIndex = 0;
$options = getopt('', ['username:', 'password-stdin', 'help'], $restIndex);
if ($options === false || $restIndex !== count($argv)) {
    usage();
}
if (isset($options['help'])) {
    fwrite(STDOUT, "Usage: php scripts/create-admin.php [--username=NAME] [--password-stdin]\n");
    exit(0);
}
foreach (['username', 'password-stdin'] as $name) {
    if (isset($options[$name]) && is_array($options[$name])) {
        usage();
    }
}

try {
    $username = $options['username'] ?? null;
    if ($username === null) {
        if (!function_exists('stream_isatty') || !stream_isatty(STDIN)) {
            throw new InvalidArgumentException('Username is required when input is not interactive.');
        }
        fwrite(STDOUT, 'Username: ');
        $username = fgets(STDIN);
        if ($username === false) {
            throw new RuntimeException('Unable to read username.');
        }
    }
    if (!is_string($username)) {
        usage();
    }
    $username = trim($username);
    if (preg_match('/^[A-Za-z0-9_.-]{3,64}$/D', $username) !== 1) {
        throw new InvalidArgumentException('Username must be 3-64 characters using letters, numbers, dot, underscore, or hyphen.');
    }

    if (isset($options['password-stdin'])) {
        $password = fgets(STDIN);
        if ($password === false) {
            throw new RuntimeException('Unable to read password from STDIN.');
        }
        $password = rtrim($password, "\r\n");
    } else {
        $password = readHidden('Password: ');
        $confirmation = readHidden('Confirm password: ');
        if (!hash_equals($password, $confirmation)) {
            throw new InvalidArgumentException('Passwords do not match.');
        }
        unset($confirmation);
    }
    if (strlen($password) < 12 || strlen($password) > 4096) {
        throw new InvalidArgumentException('Password must be 12-4096 bytes.');
    }

    $algorithm = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
    if ($algorithm === PASSWORD_DEFAULT && strlen($password) > 72) {
        throw new InvalidArgumentException('This PHP build lacks Argon2id; fallback passwords cannot exceed 72 bytes.');
    }
    $hash = password_hash($password, $algorithm);
    $password = str_repeat("\0", strlen($password));
    unset($password);
    if (!is_string($hash)) {
        throw new RuntimeException('Unable to hash password.');
    }

    $app = require dirname(__DIR__) . '/app/bootstrap.php';
    $pdo = $app['database']->pdo();
    $statement = $pdo->prepare('INSERT INTO admins (username, password_hash, created_at) VALUES (:username, :hash, :created)');
    $statement->execute(['username' => $username, 'hash' => $hash, 'created' => time()]);
    fwrite(STDOUT, "Administrator {$username} created using " . password_get_info($hash)['algoName'] . ".\n");
    exit(0);
} catch (PDOException $exception) {
    if ($exception->getCode() === '23000') {
        fwrite(STDERR, "Administrator already exists.\n");
        exit(3);
    }
    fwrite(STDERR, "Unable to create administrator: {$exception->getMessage()}\n");
    exit(1);
} catch (InvalidArgumentException $exception) {
    fwrite(STDERR, $exception->getMessage() . PHP_EOL);
    exit(2);
} catch (Throwable $exception) {
    fwrite(STDERR, "Unable to create administrator: {$exception->getMessage()}\n");
    exit(1);
}
