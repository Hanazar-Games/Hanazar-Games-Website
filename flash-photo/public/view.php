<?php

declare(strict_types=1);

use FlashPhoto\NotFoundException;
use FlashPhoto\RateLimitException;
use FlashPhoto\Response;
use FlashPhoto\SecurityHeaders;

$app = require dirname(__DIR__) . '/app/bootstrap.php';
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    Response::methodNotAllowed(['GET'], false);
}
try {
    $app['rate_limiter']->consume('probe', $app['identity']->ipHash());
    $token = isset($_GET['token']) && is_string($_GET['token']) ? $_GET['token'] : '';
    $app['flash']->findViewable($token);
} catch (NotFoundException) {
    $app['flash']->recordAudit('illegal_request', null, null, ['scope' => 'view']);
    Response::notFound();
} catch (RateLimitException $exception) {
    if ($exception->firstExceeded) {
        $app['flash']->recordAudit('rate_limit_triggered', null, null, ['scope' => 'probe']);
    }
    http_response_code(429);
    Response::headers(SecurityHeaders::forPublicPage() + $exception->headers);
    require __DIR__ . '/404.php';
    exit;
}
Response::headers(SecurityHeaders::forPublicPage());
?>
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow,noarchive,noimageindex,nosnippet">
  <title>查看闪照</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/app.css">
  <script src="/assets/viewer.js" defer></script>
</head>
<body class="viewer-body">
  <main class="viewer-shell" id="viewer" aria-busy="false">
    <section class="viewer-card" id="viewer-stage">
      <div class="mark" aria-hidden="true">F</div>
      <p class="eyebrow">FLASH PHOTO</p>
      <h1>点击查看闪照</h1>
      <p class="viewer-copy">点击后由服务器开始倒计时。刷新或换设备不会重置有效期。</p>
      <button class="primary-button" id="reveal-button" type="button">点击查看</button>
      <p class="warning">无法阻止截图、录屏、开发者工具或另一台设备拍摄。</p>
    </section>
    <div class="viewer-controls">
      <span class="sound-note">本地音效与环境音，不保存设置</span>
      <button class="sound-toggle" id="sound-toggle" type="button" aria-pressed="false">声音：关</button>
    </div>
    <p class="viewer-status" id="viewer-status" role="status" aria-live="polite" aria-atomic="true"></p>
  </main>
</body>
</html>
