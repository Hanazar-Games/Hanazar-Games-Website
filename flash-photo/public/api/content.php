<?php

declare(strict_types=1);

use FlashPhoto\HttpException;
use FlashPhoto\NotFoundException;
use FlashPhoto\RateLimitException;
use FlashPhoto\Request;
use FlashPhoto\Response;
use FlashPhoto\SecurityHeaders;
use FlashPhoto\ValidationException;

$app = require dirname(__DIR__, 2) . '/app/bootstrap.php';
try {
    Request::requirePost();
    $app['rate_limiter']->consume('content', $app['identity']->ipHash());
    $data = Request::postData();
    $token = $data['token'] ?? null;
    $content = $app['flash']->content($token, $app['viewer']->id($token, $data['viewer_key'] ?? null));
    $body = @file_get_contents($content['path'], false, null, 0, $content['file_size'] + 1);
    if (!is_string($body)) {
        $app['logger']->error('content.read_failed');
        throw new NotFoundException();
    }
    $length = strlen($body);
    if ($length !== $content['file_size']) {
        $app['logger']->error('content.size_changed');
        throw new NotFoundException();
    }
    $app['flash']->authorizeContentDelivery((int) $content['id'], (string) $content['viewer_hash']);
    http_response_code(200);
    Response::headers(SecurityHeaders::forImage());
    header('Content-Type: ' . $content['mime_type']);
    header('Content-Length: ' . $length);
    echo $body;
    exit;
} catch (RateLimitException $exception) {
    if ($exception->firstExceeded) {
        $app['flash']->recordAudit('rate_limit_triggered', null, null, ['scope' => 'content']);
    }
    Response::json(['error' => 'rate_limited'], 429, $exception->headers);
} catch (NotFoundException|ValidationException) {
    $app['flash']->recordAudit('illegal_request', null, null, ['scope' => 'content']);
    try {
        $app['rate_limiter']->consume('probe', $app['identity']->ipHash());
    } catch (RateLimitException $exception) {
        if ($exception->firstExceeded) {
            $app['flash']->recordAudit('rate_limit_triggered', null, null, ['scope' => 'probe']);
        }
        Response::json(['error' => 'rate_limited'], 429, $exception->headers);
    }
    Response::json(['error' => 'not_found'], 404);
} catch (HttpException $exception) {
    Response::json(['error' => 'request_failed'], $exception->status, $exception->headers);
} catch (Throwable $exception) {
    $app['logger']->error('content.failure', ['exception_class' => $exception::class]);
    Response::json(['error' => 'server_error'], 500);
}
