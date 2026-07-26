<?php

declare(strict_types=1);

namespace FlashPhoto;

final class Response
{
    private static string $requestId = '';

    public static function setRequestId(string $requestId): void
    {
        self::$requestId = $requestId;
    }

    public static function requestId(): string
    {
        return self::$requestId;
    }

    /** @param array<string, string> $headers */
    public static function headers(array $headers): void
    {
        if (headers_sent()) {
            return;
        }
        if (self::$requestId !== '') {
            header('X-Request-ID: ' . self::$requestId);
        }
        foreach ($headers as $name => $value) {
            header($name . ': ' . $value);
        }
    }

    /** @param array<string, mixed> $data @param array<string, string> $headers */
    public static function json(array $data, int $status = 200, array $headers = []): never
    {
        http_response_code($status);
        self::headers(SecurityHeaders::forApi() + $headers);
        header('Content-Type: application/json; charset=utf-8');
        $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        echo $json;
        exit;
    }

    public static function notFound(bool $json = false): never
    {
        if ($json) {
            self::json(['error' => 'not_found'], 404);
        }
        http_response_code(404);
        self::headers(SecurityHeaders::forPublicPage());
        require dirname(__DIR__) . '/public/404.php';
        exit;
    }

    public static function methodNotAllowed(array $allowed, bool $json = true): never
    {
        header('Allow: ' . implode(', ', $allowed));
        if ($json) {
            self::json(['error' => 'method_not_allowed'], 405);
        }
        http_response_code(405);
        self::headers(SecurityHeaders::forPublicPage());
        echo '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>请求方式不受支持</title>';
        echo '<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/app.css">';
        echo '<main class="state-page"><h1>请求方式不受支持</h1></main></html>';
        exit;
    }

    public static function redirect(string $location, int $status = 303): never
    {
        self::headers(SecurityHeaders::forAdmin());
        header('Location: ' . $location, true, $status);
        exit;
    }
}
