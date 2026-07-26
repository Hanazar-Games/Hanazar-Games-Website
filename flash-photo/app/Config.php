<?php

declare(strict_types=1);

namespace FlashPhoto;

use InvalidArgumentException;

final class Config
{
    /** @param array<string, mixed> $values */
    private function __construct(private readonly array $values)
    {
        $this->validate();
    }

    public static function load(string $path): self
    {
        if (!is_file($path)) {
            throw new InvalidArgumentException('Configuration file is missing.');
        }
        $values = require $path;
        if (!is_array($values)) {
            throw new InvalidArgumentException('Configuration file must return an array.');
        }
        return new self($values);
    }

    /** @param array<string, mixed> $values */
    public static function fromArray(array $values): self
    {
        return new self($values);
    }

    public function string(string $key): string
    {
        $value = $this->values[$key] ?? null;
        if (!is_string($value)) {
            throw new InvalidArgumentException("Configuration value {$key} must be a string.");
        }
        return $value;
    }

    public function int(string $key): int
    {
        $value = $this->values[$key] ?? null;
        if (!is_int($value)) {
            throw new InvalidArgumentException("Configuration value {$key} must be an integer.");
        }
        return $value;
    }

    public function bool(string $key): bool
    {
        $value = $this->values[$key] ?? null;
        if (!is_bool($value)) {
            throw new InvalidArgumentException("Configuration value {$key} must be a boolean.");
        }
        return $value;
    }

    /** @return array<mixed> */
    public function array(string $key): array
    {
        $value = $this->values[$key] ?? null;
        if (!is_array($value)) {
            throw new InvalidArgumentException("Configuration value {$key} must be an array.");
        }
        return $value;
    }

    public function has(string $key): bool
    {
        return array_key_exists($key, $this->values);
    }

    private function validate(): void
    {
        foreach ([
            'app_env', 'app_url', 'app_timezone', 'database_path', 'storage_path', 'log_path',
            'rate_limit_path', 'session_name', 'app_secret', 'ip_hash_secret', 'admin_path',
        ] as $key) {
            if (!isset($this->values[$key]) || !is_string($this->values[$key]) || $this->values[$key] === '') {
                throw new InvalidArgumentException("Missing configuration value: {$key}");
            }
        }
        foreach ([
            'max_upload_bytes', 'max_image_pixels', 'default_view_seconds',
            'default_unused_expiry_seconds', 'session_lifetime', 'log_retention_days',
            'destroyed_record_retention_days',
        ] as $key) {
            if (!isset($this->values[$key]) || !is_int($this->values[$key]) || $this->values[$key] < 1) {
                throw new InvalidArgumentException("Invalid positive integer configuration: {$key}");
            }
        }
        foreach (['app_debug', 'reencode_uploads', 'preserve_gif_animation'] as $key) {
            if (!isset($this->values[$key]) || !is_bool($this->values[$key])) {
                throw new InvalidArgumentException("Configuration value {$key} must be a boolean.");
            }
        }
        if (!in_array($this->values['app_env'], ['production', 'development', 'testing'], true)) {
            throw new InvalidArgumentException('APP_ENV must be production, development, or testing.');
        }
        $url = parse_url($this->values['app_url']);
        if (!filter_var($this->values['app_url'], FILTER_VALIDATE_URL)
            || !is_array($url)
            || !in_array($url['scheme'] ?? null, ['http', 'https'], true)
            || !isset($url['host'])
            || isset($url['user'])
            || isset($url['pass'])
            || (isset($url['path']) && $url['path'] !== '' && $url['path'] !== '/')
            || isset($url['query'])
            || isset($url['fragment'])) {
            throw new InvalidArgumentException('APP_URL must be an absolute URL.');
        }
        if ($this->values['app_env'] === 'production' && ($url['scheme'] ?? null) !== 'https') {
            throw new InvalidArgumentException('Production APP_URL must use HTTPS.');
        }
        try {
            new \DateTimeZone($this->values['app_timezone']);
        } catch (\Throwable $exception) {
            throw new InvalidArgumentException('APP_TIMEZONE must be a valid IANA timezone.', 0, $exception);
        }
        if (preg_match('/^(?=[A-Za-z0-9_-]{1,128}$)(?=.*[A-Za-z])[A-Za-z0-9_-]+$/D', $this->values['session_name']) !== 1) {
            throw new InvalidArgumentException('SESSION_NAME contains invalid characters.');
        }
        if (str_starts_with($this->values['session_name'], '__Host-')) {
            throw new InvalidArgumentException('__Host- session cookies require Path=/.');
        }
        if (str_starts_with($this->values['session_name'], '__Secure-')
            && !str_starts_with($this->values['app_url'], 'https://')) {
            throw new InvalidArgumentException('__Secure- session cookies require an HTTPS APP_URL.');
        }
        foreach (['database_path', 'storage_path', 'log_path', 'rate_limit_path'] as $key) {
            $path = $this->values[$key];
            if ($path === '/'
                || !str_starts_with($path, '/')
                || str_contains($path, "\0")
                || str_contains($path, '//')
                || str_ends_with($path, '/')
                || preg_match('#(?:^|/)\.{1,2}(?:/|$)#', $path)) {
                throw new InvalidArgumentException("Configuration path {$key} must be an absolute normalized path.");
            }
        }
        $storagePath = $this->values['storage_path'];
        $runtimeDirectories = [
            $storagePath,
            $this->values['log_path'],
            $this->values['rate_limit_path'],
            dirname($storagePath) . '/sessions',
        ];
        $overlaps = static fn (string $left, string $right): bool => $left === $right
            || str_starts_with($left, $right . '/')
            || str_starts_with($right, $left . '/');
        foreach ($runtimeDirectories as $index => $directory) {
            foreach (array_slice($runtimeDirectories, $index + 1) as $other) {
                if ($overlaps($directory, $other)) {
                    throw new InvalidArgumentException('Runtime storage, log, rate-limit, and Session paths must not overlap.');
                }
            }
            if ($overlaps($this->values['database_path'], $directory)) {
                throw new InvalidArgumentException('The database file and runtime directories must not overlap.');
            }
        }
        if (strlen($this->values['app_secret']) < 32 || strlen($this->values['ip_hash_secret']) < 32) {
            throw new InvalidArgumentException('APP_SECRET and IP_HASH_SECRET must contain at least 32 characters.');
        }
        if (hash_equals($this->values['app_secret'], $this->values['ip_hash_secret'])) {
            throw new InvalidArgumentException('APP_SECRET and IP_HASH_SECRET must be different.');
        }
        $healthToken = $this->values['health_token'] ?? null;
        if (!is_string($healthToken)
            || ($healthToken !== '' && strlen($healthToken) < 32)
            || ($this->values['app_env'] === 'production' && strlen($healthToken) < 32)) {
            throw new InvalidArgumentException('HEALTH_TOKEN must contain at least 32 characters in production.');
        }
        if ($healthToken !== ''
            && (hash_equals($healthToken, $this->values['app_secret'])
                || hash_equals($healthToken, $this->values['ip_hash_secret']))) {
            throw new InvalidArgumentException('HEALTH_TOKEN must be an independent secret.');
        }
        if (!preg_match('#^/[A-Za-z0-9_-]+$#', $this->values['admin_path'])) {
            throw new InvalidArgumentException('ADMIN_PATH must be a single safe URL path segment.');
        }
        if (in_array(ltrim(strtolower($this->values['admin_path']), '/'), [
            'v', 'api', 'assets', 'app', 'config', 'database', 'storage', 'scripts', 'tests', 'vendor', 'nginx',
        ], true)) {
            throw new InvalidArgumentException('ADMIN_PATH conflicts with a reserved route.');
        }
        if (!in_array($this->values['default_view_seconds'], [15, 30, 60], true)) {
            throw new InvalidArgumentException('DEFAULT_VIEW_SECONDS must be 15, 30, or 60.');
        }
        if ($this->values['default_unused_expiry_seconds'] < 300
            || $this->values['default_unused_expiry_seconds'] > 2592000) {
            throw new InvalidArgumentException('DEFAULT_UNUSED_EXPIRY_SECONDS must be between 300 and 2592000.');
        }
        $trustedProxies = $this->values['trusted_proxies'] ?? null;
        $rateLimits = $this->values['rate_limits'] ?? null;
        if (!is_array($trustedProxies) || !is_array($rateLimits)) {
            throw new InvalidArgumentException('TRUSTED_PROXIES and rate_limits must be arrays.');
        }
        $requiredRateLimitScopes = ['login', 'admin_session', 'redeem', 'content', 'status', 'upload', 'probe'];
        $configuredRateLimitScopes = array_keys($rateLimits);
        if (array_diff($requiredRateLimitScopes, $configuredRateLimitScopes) !== []) {
            throw new InvalidArgumentException('Every application rate limit scope is required.');
        }
        if (array_diff($configuredRateLimitScopes, $requiredRateLimitScopes) !== []) {
            throw new InvalidArgumentException('Unknown rate limit scope.');
        }
        foreach ($trustedProxies as $range) {
            if (!is_string($range) || $range === '') {
                throw new InvalidArgumentException('Every trusted proxy must be a valid IP address or CIDR range.');
            }
            if (!str_contains($range, '/')) {
                if (filter_var($range, FILTER_VALIDATE_IP) === false) {
                    throw new InvalidArgumentException('Every trusted proxy must be a valid IP address or CIDR range.');
                }
                continue;
            }
            if (substr_count($range, '/') !== 1) {
                throw new InvalidArgumentException('Every trusted proxy must be a valid IP address or CIDR range.');
            }
            [$network, $prefixText] = explode('/', $range, 2);
            $networkBytes = @inet_pton($network);
            $prefix = filter_var($prefixText, FILTER_VALIDATE_INT);
            $maxBits = is_string($networkBytes) ? strlen($networkBytes) * 8 : 0;
            if (!is_string($networkBytes) || !is_int($prefix) || $prefix < 1 || $prefix > $maxBits) {
                throw new InvalidArgumentException('Every trusted proxy must be a valid non-global CIDR range.');
            }
        }
        foreach ($rateLimits as $scope => $definition) {
            if (!is_string($scope) || !is_array($definition)
                || !isset($definition['limit'], $definition['window'])
                || !is_int($definition['limit'])
                || !is_int($definition['window'])
                || $definition['limit'] < 1
                || $definition['window'] < 1) {
                throw new InvalidArgumentException('Every rate limit requires positive integer limit and window values.');
            }
        }
    }
}
