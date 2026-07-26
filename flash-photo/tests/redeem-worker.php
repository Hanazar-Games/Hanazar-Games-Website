<?php

declare(strict_types=1);

$app = require dirname(__DIR__) . '/app/bootstrap.php';
$barrier = getenv('TEST_BARRIER');
$workerId = getenv('TEST_WORKER_ID');
$token = trim((string) stream_get_contents(STDIN));
if (!is_string($barrier)
    || $barrier === ''
    || !is_string($workerId)
    || preg_match('/^[01]$/D', $workerId) !== 1
    || $token === '') {
    exit(2);
}
if (!touch($barrier . '.ready-' . $workerId)) {
    exit(4);
}
$deadline = microtime(true) + 10;
while (!is_file($barrier)) {
    if (microtime(true) >= $deadline) {
        exit(3);
    }
    usleep(1000);
}
$result = $app['flash']->redeem($token, bin2hex(random_bytes(16)), 'test-ip', 'test-ua');
fwrite(STDOUT, json_encode($result, JSON_THROW_ON_ERROR));
