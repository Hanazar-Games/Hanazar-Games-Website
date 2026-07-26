<?php

declare(strict_types=1);

use FlashPhoto\AdminView;
use FlashPhoto\HttpException;
use FlashPhoto\RateLimitException;
use FlashPhoto\Request;
use FlashPhoto\Response;
use FlashPhoto\SecurityHeaders;

$app = require __DIR__ . '/_bootstrap.php';
$base = $app['config']->string('admin_path');
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if (!in_array($method, ['GET', 'POST'], true)) {
    Response::methodNotAllowed(['GET', 'POST'], false);
}

$error = null;
$sessionReady = false;
if ($method === 'POST') {
    $sessionReady = $app['auth']->startExistingSession();
    if (!$sessionReady) {
        http_response_code(409);
        $error = '登录请求已失效，请刷新页面后重试';
    }
} else {
    try {
        $app['rate_limiter']->consume('admin_session', $app['identity']->ipHash());
        $app['auth']->startSession();
        $sessionReady = true;
    } catch (RateLimitException $exception) {
        if ($exception->firstExceeded) {
            $app['flash']->recordAudit('rate_limit_triggered', null, null, ['scope' => 'admin_session']);
        }
        http_response_code(429);
        header('Retry-After: ' . $exception->headers['Retry-After']);
        $error = '请求过于频繁，请稍后重试';
    }
}
if ($sessionReady && $app['auth']->check()) {
    Response::redirect($base . '/index.php');
}

if ($sessionReady && $method === 'POST') {
    Request::requirePost(false);
    try {
        $username = is_string($_POST['username'] ?? null) ? $_POST['username'] : '';
        $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';
        if ($app['auth']->login($username, $password, static function () use ($app): void {
            $app['csrf']->requireValid($_POST['csrf_token'] ?? null);
        })) {
            Response::redirect($base . '/index.php');
        }
        $error = '用户名或密码错误';
    } catch (RateLimitException $exception) {
        if ($exception->firstExceeded) {
            $app['flash']->recordAudit('rate_limit_triggered', null, null, ['scope' => 'login']);
        }
        http_response_code(429);
        header('Retry-After: ' . $exception->headers['Retry-After']);
        $error = '登录失败，请稍后重试';
    } catch (HttpException $exception) {
        $app['flash']->recordAudit('illegal_request', null, null, [
            'scope' => 'login',
            'reason' => 'csrf',
        ]);
        http_response_code($exception->status);
        $error = $exception->getMessage();
    }
}

Response::headers(SecurityHeaders::forAdmin());
$action = AdminView::escape($base . '/login.php');
?>
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>登录 · 闪照管理</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/app.css">
</head>
<body class="login-body">
  <main class="login-card">
    <div class="mark" aria-hidden="true">F</div>
    <p class="eyebrow">FLASH PHOTO</p>
    <h1>管理登录</h1>
    <?php if ($error !== null): ?>
      <div class="alert alert-error" role="alert"><?= AdminView::escape($error) ?></div>
    <?php endif; ?>
    <?php if ($sessionReady): ?>
      <form class="form-stack" method="post" action="<?= $action ?>" data-submit-once>
        <input type="hidden" name="csrf_token" value="<?= AdminView::escape($app['csrf']->token()) ?>">
        <label>用户名<input name="username" type="text" maxlength="180" autocomplete="username" required autofocus></label>
        <label>密码<input name="password" type="password" autocomplete="current-password" required></label>
        <button class="primary-button" type="submit">登录</button>
      </form>
    <?php endif; ?>
  </main>
  <script src="/assets/admin.js" defer></script>
</body>
</html>
