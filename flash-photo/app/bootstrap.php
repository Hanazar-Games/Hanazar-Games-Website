<?php

declare(strict_types=1);

use FlashPhoto\Auth;
use FlashPhoto\ClientIdentity;
use FlashPhoto\Config;
use FlashPhoto\Csrf;
use FlashPhoto\Database;
use FlashPhoto\FileStorage;
use FlashPhoto\FlashService;
use FlashPhoto\Logger;
use FlashPhoto\RateLimiter;
use FlashPhoto\Response;
use FlashPhoto\RuntimeCleanupQueue;
use FlashPhoto\SecurityHeaders;
use FlashPhoto\SessionCleanupRegistry;
use FlashPhoto\ViewerIdentity;

$root = dirname(__DIR__);
umask(0077);
$vendor = $root . '/vendor/autoload.php';
if (is_file($vendor)) {
    require_once $vendor;
} else {
    spl_autoload_register(static function (string $class) use ($root): void {
        $prefix = 'FlashPhoto\\';
        if (!str_starts_with($class, $prefix)) {
            return;
        }
        $path = $root . '/app/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($path)) {
            require_once $path;
        }
    });
}

ini_set('display_errors', '0');
ini_set('log_errors', '0');
error_reporting(E_ALL);

$requestId = bin2hex(random_bytes(12));
Response::setRequestId($requestId);
$canonicalizeDirectory = static function (string $path): string {
    $suffix = [];
    $candidate = $path;
    while (($resolved = realpath($candidate)) === false) {
        $parent = dirname($candidate);
        if ($parent === $candidate) {
            throw new RuntimeException('Private storage path cannot be resolved.');
        }
        array_unshift($suffix, basename($candidate));
        $candidate = $parent;
    }
    return $suffix === [] ? $resolved : $resolved . '/' . implode('/', $suffix);
};
$pathsOverlap = static fn (string $left, string $right): bool => $left === $right
    || str_starts_with($left, $right . '/')
    || str_starts_with($right, $left . '/');
$assertDirectoryAccess = static function (string $path): void {
    clearstatcache(true, $path);
    if (!is_dir($path) || !is_readable($path) || !is_writable($path) || !is_executable($path)) {
        throw new RuntimeException('Runtime directory is unavailable to the current process.');
    }
};
try {
    $config = Config::load($root . '/config/config.php');
    $publicPath = realpath($root . '/public');
    if ($publicPath === false) {
        throw new RuntimeException('Public directory is unavailable.');
    }
    $publicRoot = rtrim($publicPath, '/') . '/';
    foreach (['database_path', 'storage_path', 'log_path', 'rate_limit_path'] as $pathKey) {
        $configured = $config->string($pathKey);
        $candidate = $pathKey === 'database_path' ? dirname($configured) : $configured;
        while (($resolved = realpath($candidate)) === false && dirname($candidate) !== $candidate) {
            $candidate = dirname($candidate);
        }
        if (str_starts_with($configured, $publicRoot)
            || ($resolved !== false && ($resolved === $publicPath || str_starts_with($resolved, $publicRoot)))) {
            throw new RuntimeException('Private storage cannot be located inside the public directory.');
        }
    }
    $privateDirectories = [
        $canonicalizeDirectory($config->string('storage_path')),
        $canonicalizeDirectory($config->string('log_path')),
        $canonicalizeDirectory($config->string('rate_limit_path')),
        $canonicalizeDirectory(dirname($config->string('storage_path')) . '/sessions'),
    ];
    foreach ($privateDirectories as $index => $directory) {
        foreach (array_slice($privateDirectories, $index + 1) as $other) {
            if ($pathsOverlap($directory, $other)) {
                throw new RuntimeException('Private runtime paths must not overlap physically.');
            }
        }
    }
    $databasePath = $canonicalizeDirectory($config->string('database_path'));
    foreach ($privateDirectories as $directory) {
        if ($pathsOverlap($databasePath, $directory)) {
            throw new RuntimeException('The database file and runtime directories must not overlap physically.');
        }
    }
    $databaseReadOnly = defined('FLASH_PHOTO_DATABASE_READ_ONLY')
        && constant('FLASH_PHOTO_DATABASE_READ_ONLY') === true;
    $database = new Database($config, $databaseReadOnly);
    $cleanupQueue = new RuntimeCleanupQueue($database);
    $logger = new Logger($config, $cleanupQueue);
    $assertDirectoryAccess($config->string('log_path'));
} catch (Throwable $exception) {
    if (PHP_SAPI === 'cli') {
        fwrite(STDERR, 'Configuration error: ' . $exception->getMessage() . PHP_EOL);
        exit(78);
    }
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Request-ID: ' . $requestId);
    echo 'Service configuration is incomplete. Request ID: ' . $requestId;
    exit;
}
date_default_timezone_set($config->string('app_timezone'));

set_exception_handler(static function (Throwable $exception) use ($logger): never {
    $logger->error('uncaught_exception', [
        'exception_class' => $exception::class,
        'exception_code' => (int) $exception->getCode(),
    ]);
    if (PHP_SAPI === 'cli') {
        fwrite(STDERR, "Operation failed. Request ID: " . Response::requestId() . PHP_EOL);
        exit(1);
    }
    http_response_code(500);
    Response::headers(SecurityHeaders::forPublicPage());
    echo '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>服务暂不可用</title>';
    echo '<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/app.css">';
    echo '<main class="state-page"><h1>服务暂不可用</h1>';
    echo '<p>请稍后重试。请求编号：' . htmlspecialchars(Response::requestId(), ENT_QUOTES, 'UTF-8') . '</p></main></html>';
    exit;
});

set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

register_shutdown_function(static function () use ($logger): void {
    $error = error_get_last();
    if (!is_array($error) || !in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        return;
    }
    $logger->error('fatal_error', ['error_type' => (int) $error['type']]);
    if (PHP_SAPI !== 'cli' && !headers_sent()) {
        http_response_code(500);
        Response::headers(SecurityHeaders::forPublicPage());
        echo 'Service unavailable. Request ID: ' . Response::requestId();
    }
});

$storage = new FileStorage($config, $logger, $cleanupQueue);
$identity = new ClientIdentity($config);
$rateLimiter = new RateLimiter($config, $logger, $cleanupQueue);
$sessionRegistry = new SessionCleanupRegistry($config, $database, $cleanupQueue);
$assertDirectoryAccess($config->string('storage_path'));
$assertDirectoryAccess($config->string('rate_limit_path'));
$auth = new Auth($config, $database, $rateLimiter, $logger, $identity, $sessionRegistry);

return [
    'root' => $root,
    'config' => $config,
    'database' => $database,
    'logger' => $logger,
    'cleanup_queue' => $cleanupQueue,
    'storage' => $storage,
    'identity' => $identity,
    'rate_limiter' => $rateLimiter,
    'session_cleanup_registry' => $sessionRegistry,
    'auth' => $auth,
    'csrf' => new Csrf(),
    'viewer' => new ViewerIdentity($config),
    'flash' => new FlashService($config, $database, $storage, $logger),
];
