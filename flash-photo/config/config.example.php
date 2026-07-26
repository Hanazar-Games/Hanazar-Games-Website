<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$env = static function (string $name, ?string $default = null): string {
    $value = getenv($name);
    if ($value === false || $value === '') {
        if ($default === null) {
            throw new RuntimeException("Required environment variable {$name} is missing.");
        }
        return $default;
    }
    return $value;
};
$boolean = static function (string $name, bool $default): bool {
    $raw = getenv($name);
    if ($raw === false || $raw === '') {
        return $default;
    }
    $value = filter_var($raw, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
    if (!is_bool($value)) {
        throw new RuntimeException("Environment variable {$name} must be a boolean.");
    }
    return $value;
};
$integer = static function (string $name, string $default) use ($env): int {
    $value = filter_var($env($name, $default), FILTER_VALIDATE_INT);
    if (!is_int($value)) {
        throw new RuntimeException("Environment variable {$name} must be an integer.");
    }
    return $value;
};
$csv = static function (string $value): array {
    return array_values(array_filter(array_map('trim', explode(',', $value)), static fn (string $item): bool => $item !== ''));
};

return [
    'app_env' => $env('APP_ENV', 'production'),
    'app_debug' => $boolean('APP_DEBUG', false),
    'app_url' => rtrim($env('APP_URL', 'https://s.hanazargames.com'), '/'),
    'app_timezone' => $env('APP_TIMEZONE', 'Asia/Shanghai'),
    'database_path' => $env('DATABASE_PATH', $root . '/storage/database.sqlite'),
    'storage_path' => $env('STORAGE_PATH', $root . '/storage/encrypted'),
    'log_path' => $env('LOG_PATH', $root . '/storage/logs'),
    'rate_limit_path' => $env('RATE_LIMIT_PATH', $root . '/storage/rate-limits'),
    'max_upload_bytes' => $integer('MAX_UPLOAD_BYTES', '10485760'),
    'max_image_pixels' => $integer('MAX_IMAGE_PIXELS', '40000000'),
    'default_view_seconds' => $integer('DEFAULT_VIEW_SECONDS', '30'),
    'default_unused_expiry_seconds' => $integer('DEFAULT_UNUSED_EXPIRY_SECONDS', '86400'),
    'session_name' => $env('SESSION_NAME', '__Secure-flash_admin'),
    'session_lifetime' => $integer('SESSION_LIFETIME', '3600'),
    'app_secret' => $env('APP_SECRET'),
    'ip_hash_secret' => $env('IP_HASH_SECRET'),
    'trusted_proxies' => $csv($env('TRUSTED_PROXIES', '')),
    'admin_path' => '/' . trim($env('ADMIN_PATH', 'admin'), '/'),
    'reencode_uploads' => $boolean('REENCODE_UPLOADS', true),
    'preserve_gif_animation' => $boolean('PRESERVE_GIF_ANIMATION', true),
    'log_retention_days' => $integer('LOG_RETENTION_DAYS', '30'),
    'destroyed_record_retention_days' => $integer('DESTROYED_RECORD_RETENTION_DAYS', '90'),
    'health_token' => $env('HEALTH_TOKEN', ''),
    'rate_limits' => [
        'admin_session' => ['limit' => $integer('RATE_ADMIN_SESSION_LIMIT', '30'), 'window' => $integer('RATE_ADMIN_SESSION_WINDOW', '60')],
        'login' => ['limit' => $integer('RATE_LOGIN_LIMIT', '10'), 'window' => $integer('RATE_LOGIN_WINDOW', '900')],
        'redeem' => ['limit' => $integer('RATE_REDEEM_LIMIT', '30'), 'window' => $integer('RATE_REDEEM_WINDOW', '60')],
        'content' => ['limit' => $integer('RATE_CONTENT_LIMIT', '120'), 'window' => $integer('RATE_CONTENT_WINDOW', '60')],
        'status' => ['limit' => $integer('RATE_STATUS_LIMIT', '120'), 'window' => $integer('RATE_STATUS_WINDOW', '60')],
        'upload' => ['limit' => $integer('RATE_UPLOAD_LIMIT', '20'), 'window' => $integer('RATE_UPLOAD_WINDOW', '3600')],
        'probe' => ['limit' => $integer('RATE_PROBE_LIMIT', '20'), 'window' => $integer('RATE_PROBE_WINDOW', '60')],
    ],
];
