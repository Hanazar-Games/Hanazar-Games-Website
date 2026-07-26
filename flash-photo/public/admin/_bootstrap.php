<?php

declare(strict_types=1);

use FlashPhoto\AdminView;
use FlashPhoto\HttpException;
use FlashPhoto\Request;
use FlashPhoto\Response;
use FlashPhoto\SecurityHeaders;

$app = require dirname(__DIR__, 2) . '/app/bootstrap.php';

/** @param array<string, mixed> $app */
function admin_require(array $app): int
{
    if (!$app['auth']->startExistingSession()) {
        Response::redirect($app['config']->string('admin_path') . '/login.php');
    }
    if (!$app['auth']->check()) {
        $app['auth']->logout();
        Response::redirect($app['config']->string('admin_path') . '/login.php');
    }
    return $app['auth']->requireAdmin();
}

/** @param array<string, mixed> $app */
function admin_verify_post(array $app): void
{
    Request::requirePost(false);
    try {
        $app['csrf']->requireValid($_POST['csrf_token'] ?? null);
    } catch (HttpException $exception) {
        $app['flash']->recordAudit('illegal_request', $app['auth']->id(), null, [
            'scope' => 'admin',
            'reason' => 'csrf',
        ]);
        admin_error($exception->getMessage(), $exception->status);
    }
}

function admin_error(string $message, int $status): never
{
    http_response_code($status);
    Response::headers(SecurityHeaders::forAdmin());
    $safe = AdminView::escape($message);
    echo '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<title>请求失败 · 闪照管理</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">';
    echo '<link rel="stylesheet" href="/assets/app.css"></head>';
    echo '<body><main class="state-page"><div class="mark" aria-hidden="true">F</div>';
    echo '<h1>请求失败</h1><p>' . $safe . '</p><a class="primary-button" href="/">返回首页</a>';
    echo '</main></body></html>';
    exit;
}

return $app;
