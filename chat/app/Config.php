<?php

declare(strict_types=1);

namespace Hanazar\Chat;

use InvalidArgumentException;

final readonly class Config
{
    /** @param list<string> $trustedProxies */
    private function __construct(
        private string $appEnvironment,
        private string $appOrigin,
        private string $appHost,
        private string $appKey,
        private string $publicRoot,
        private string $databasePath,
        private string $sessionPath,
        private string $logPath,
        private string $rateLimitPath,
        private string $backupPath,
        private array $trustedProxies,
        private array $shareOrigins,
        private int $sessionIdleSeconds,
        private int $sessionAbsoluteSeconds,
    ) {
    }

    /** @param array<string, string> $values */
    public static function fromArray(array $values): self
    {
        $required = ['APP_ENV', 'APP_ORIGIN', 'APP_HOST', 'APP_KEY', 'PUBLIC_ROOT', 'DB_PATH', 'SESSION_PATH', 'LOG_PATH', 'RATE_LIMIT_PATH', 'BACKUP_PATH'];
        foreach ($required as $key) {
            if (!isset($values[$key]) || trim($values[$key]) === '') {
                throw new InvalidArgumentException('Missing configuration: ' . $key);
            }
        }

        $host = strtolower(trim($values['APP_HOST']));
        $parts = parse_url($values['APP_ORIGIN']);
        if (!is_array($parts)
            || ($parts['scheme'] ?? '') !== 'https'
            || strtolower((string) ($parts['host'] ?? '')) !== $host
            || isset($parts['user'])
            || isset($parts['pass'])
            || isset($parts['query'])
            || isset($parts['fragment'])
            || (($parts['path'] ?? '') !== '' && ($parts['path'] ?? '') !== '/')
            || isset($parts['port'])
        ) {
            throw new InvalidArgumentException('APP_ORIGIN must be the canonical HTTPS origin.');
        }

        if (!str_starts_with($values['APP_KEY'], 'base64:')) {
            throw new InvalidArgumentException('APP_KEY must be base64 encoded.');
        }
        $key = base64_decode(substr($values['APP_KEY'], 7), true);
        if ($key === false || strlen($key) < 32) {
            throw new InvalidArgumentException('APP_KEY must contain at least 32 random bytes.');
        }

        $publicRoot = self::absolute($values['PUBLIC_ROOT'], 'PUBLIC_ROOT');
        $paths = [];
        foreach (['DB_PATH', 'SESSION_PATH', 'LOG_PATH', 'RATE_LIMIT_PATH', 'BACKUP_PATH'] as $name) {
            $paths[$name] = self::absolute($values[$name], $name);
            if ($paths[$name] === $publicRoot || str_starts_with($paths[$name], rtrim($publicRoot, '/') . '/')) {
                throw new InvalidArgumentException($name . ' must not be under PUBLIC_ROOT.');
            }
        }

        $proxies = [];
        foreach (array_filter(array_map('trim', explode(',', $values['TRUSTED_PROXIES'] ?? ''))) as $proxy) {
            $proxies[] = self::trustedProxy($proxy);
        }
        $shareOrigins = [];
        foreach (array_filter(array_map('trim', explode(',', $values['SHARE_ORIGINS'] ?? ''))) as $origin) {
            $shareOrigins[] = self::httpsOrigin($origin);
        }

        return new self(
            $values['APP_ENV'],
            rtrim($values['APP_ORIGIN'], '/'),
            $host,
            $key,
            $publicRoot,
            $paths['DB_PATH'],
            $paths['SESSION_PATH'],
            $paths['LOG_PATH'],
            $paths['RATE_LIMIT_PATH'],
            $paths['BACKUP_PATH'],
            $proxies,
            array_values(array_unique($shareOrigins)),
            self::positiveInt($values['SESSION_IDLE_SECONDS'] ?? '1800', 1800),
            self::positiveInt($values['SESSION_ABSOLUTE_SECONDS'] ?? '43200', 43200),
        );
    }

    public static function fromEnvironment(): self
    {
        $keys = ['APP_ENV', 'APP_ORIGIN', 'APP_HOST', 'APP_KEY', 'PUBLIC_ROOT', 'DB_PATH', 'SESSION_PATH', 'LOG_PATH', 'RATE_LIMIT_PATH', 'BACKUP_PATH', 'TRUSTED_PROXIES', 'SHARE_ORIGINS', 'SESSION_IDLE_SECONDS', 'SESSION_ABSOLUTE_SECONDS'];
        $values = [];
        foreach ($keys as $key) {
            $value = getenv($key);
            if ($value !== false) {
                $values[$key] = $value;
            }
        }

        return self::fromArray($values);
    }

    private static function absolute(string $path, string $name): string
    {
        if ($path === '' || $path[0] !== '/' || preg_match('/[\x00-\x1F\x7F]/', $path) === 1) {
            throw new InvalidArgumentException($name . ' must be an absolute path.');
        }

        $segments = [];
        foreach (explode('/', $path) as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }
            if ($segment === '..') {
                array_pop($segments);
                continue;
            }
            $segments[] = $segment;
        }

        return '/' . implode('/', $segments);
    }

    private static function positiveInt(string $value, int $fallback): int
    {
        $parsed = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        return $parsed === false ? $fallback : (int) $parsed;
    }

    private static function httpsOrigin(string $value): string
    {
        $parts = parse_url($value);
        if (!is_array($parts)
            || ($parts['scheme'] ?? '') !== 'https'
            || !isset($parts['host'])
            || str_contains((string) $parts['host'], '*')
            || preg_match('/[\x00-\x20\x7F]/', $value) === 1
            || isset($parts['user'])
            || isset($parts['pass'])
            || isset($parts['query'])
            || isset($parts['fragment'])
            || (($parts['path'] ?? '') !== '' && ($parts['path'] ?? '') !== '/')
            || (isset($parts['port']) && ((int) $parts['port'] < 1 || (int) $parts['port'] > 65535))
        ) {
            throw new InvalidArgumentException('SHARE_ORIGINS must contain canonical HTTPS origins.');
        }

        $host = strtolower((string) $parts['host']);
        if (filter_var($host, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME) === false
            && filter_var($host, FILTER_VALIDATE_IP) === false
        ) {
            throw new InvalidArgumentException('SHARE_ORIGINS contains an invalid host.');
        }
        $port = isset($parts['port']) ? ':' . (int) $parts['port'] : '';
        return 'https://' . $host . $port;
    }

    private static function trustedProxy(string $value): string
    {
        if (preg_match('/[\x00-\x20\x7F]/', $value) === 1 || substr_count($value, '/') > 1) {
            throw new InvalidArgumentException('TRUSTED_PROXIES contains an invalid IP range.');
        }
        [$network, $bits] = array_pad(explode('/', $value, 2), 2, null);
        $packed = @inet_pton($network);
        if ($packed === false) {
            throw new InvalidArgumentException('TRUSTED_PROXIES contains an invalid IP range.');
        }
        if ($bits === null) {
            if (hash_equals(str_repeat("\0", strlen($packed)), $packed)) {
                throw new InvalidArgumentException('TRUSTED_PROXIES must not trust an unspecified address.');
            }
            return $network;
        }
        if ($bits === '' || preg_match('/^[0-9]{1,3}$/D', $bits) !== 1) {
            throw new InvalidArgumentException('TRUSTED_PROXIES contains an invalid CIDR prefix.');
        }
        $prefix = (int) $bits;
        if ($prefix < 1 || $prefix > strlen($packed) * 8) {
            throw new InvalidArgumentException('TRUSTED_PROXIES contains an invalid CIDR prefix.');
        }

        return $network . '/' . $prefix;
    }

    public function appEnvironment(): string { return $this->appEnvironment; }
    public function appOrigin(): string { return $this->appOrigin; }
    public function appHost(): string { return $this->appHost; }
    public function appKey(): string { return $this->appKey; }
    public function publicRoot(): string { return $this->publicRoot; }
    public function databasePath(): string { return $this->databasePath; }
    public function sessionPath(): string { return $this->sessionPath; }
    public function logPath(): string { return $this->logPath; }
    public function rateLimitPath(): string { return $this->rateLimitPath; }
    public function backupPath(): string { return $this->backupPath; }
    /** @return list<string> */
    public function trustedProxies(): array { return $this->trustedProxies; }
    /** @return list<string> */
    public function shareOrigins(): array { return $this->shareOrigins; }
    public function sessionIdleSeconds(): int { return $this->sessionIdleSeconds; }
    public function sessionAbsoluteSeconds(): int { return $this->sessionAbsoluteSeconds; }
}
