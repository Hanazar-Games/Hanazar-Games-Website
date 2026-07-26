<?php

declare(strict_types=1);

use FlashPhoto\Api;

$app = require dirname(__DIR__, 2) . '/app/bootstrap.php';
Api::run($app, 'status', static function (array $app, array $data): array {
    $token = $data['token'] ?? null;
    $result = $app['flash']->status($token, $app['viewer']->id($token, $data['viewer_key'] ?? null));
    $result['server_time'] = time();
    return $result;
});
