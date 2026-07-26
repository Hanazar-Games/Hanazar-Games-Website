<?php

declare(strict_types=1);

use FlashPhoto\Response;
use FlashPhoto\SecurityHeaders;

require dirname(__DIR__) . '/app/bootstrap.php';
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    Response::methodNotAllowed(['GET'], false);
}
Response::headers(SecurityHeaders::forPublicPage());
?>
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>Flash Photo</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/app.css">
</head>
<body>
  <main class="state-page">
    <div class="mark" aria-hidden="true">F</div>
    <h1>Flash Photo</h1>
    <p>这是一个私人临时图片服务。需要完整链接才能访问内容。</p>
  </main>
</body>
</html>
