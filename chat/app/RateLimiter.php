<?php

declare(strict_types=1);

namespace Hanazar\Chat;

use RuntimeException;

final class RateLimiter
{
    private const POLICIES = [
        'login_ip' => [10, 60],
        'api' => [120, 60],
    ];

    public function __construct(private readonly Config $config) {}

    public function consume(string $bucket, string $identifier, ?int $now = null): void
    {
        $now ??= time();
        [$limit, $window] = self::POLICIES[$bucket] ?? [60, 60];
        $path = $this->config->rateLimitPath() . '/' . hash('sha256', $bucket . ':' . $identifier) . '.json';
        $handle = fopen($path, 'c+');
        if ($handle === false || !flock($handle, LOCK_EX)) {
            throw new RuntimeException('Rate limit storage is unavailable.');
        }
        try {
            $raw = stream_get_contents($handle);
            $state = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
            $startedAt = is_array($state) ? (int) ($state['started_at'] ?? $now) : $now;
            $count = is_array($state) ? (int) ($state['count'] ?? 0) : 0;
            if ($startedAt + $window <= $now) {
                $startedAt = $now;
                $count = 0;
            }
            if ($count >= $limit) {
                throw new RateLimitException(max(1, $startedAt + $window - $now));
            }
            rewind($handle);
            ftruncate($handle, 0);
            fwrite($handle, json_encode(['started_at' => $startedAt, 'count' => $count + 1], JSON_THROW_ON_ERROR));
            fflush($handle);
            @chmod($path, 0600);
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }
}
