<?php

declare(strict_types=1);

use Hanazar\Chat\EventService;
use Hanazar\Chat\UserService;

if (PHP_SAPI !== 'cli') {
    exit(1);
}

[, $database] = require __DIR__ . '/bootstrap.php';
$username = $argv[1] ?? '';
if ($username === '' || count($argv) !== 2) {
    fwrite(STDERR, "Usage: php scripts/create-admin.php USERNAME\n");
    exit(2);
}
$password = readPassword();
if ($password === '') {
    fwrite(STDERR, "Password is required.\n");
    exit(2);
}
$user = (new UserService($database, new EventService($database)))->create([
    'username' => $username,
    'display_name' => $username,
    'password' => $password,
    'system_role' => 'admin',
]);
fwrite(STDOUT, 'Created admin #' . $user['id'] . "\n");

function readPassword(): string
{
    $interactive = function_exists('stream_isatty') && stream_isatty(STDIN);
    if ($interactive) {
        fwrite(STDERR, 'Password: ');
        @system('stty -echo');
    }
    try {
        $password = fgets(STDIN);
    } finally {
        if ($interactive) {
            @system('stty echo');
            fwrite(STDERR, "\n");
        }
    }
    return is_string($password) ? rtrim($password, "\r\n") : '';
}
