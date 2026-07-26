<?php

declare(strict_types=1);

use FlashPhoto\Api;

$app = require dirname(__DIR__, 2) . '/app/bootstrap.php';
Api::run($app, 'redeem', static function (array $app, array $data): array {
    $token = $data['token'] ?? null;
    $viewerId = $app['viewer']->id($token, $data['viewer_key'] ?? null);
    $result = $app['flash']->redeem(
        $token,
        $viewerId,
        $app['identity']->ipHash(),
        $app['identity']->userAgentHash()
    );
    $app['viewer']->remember($token, $viewerId);
    $result['server_time'] = time();
    $result['viewer_key'] = $viewerId;
    return $result;
});
