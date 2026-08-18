<?php

declare(strict_types=1);

namespace Hanazar\Chat;

use RuntimeException;

final class RateLimiter
{
    private const POLICIES = [
        'login_ip' => [10, 60],
        'api' => [120, 60],
        'share_create' => [30, 3600],
        'share_read' => [240, 60],
        'feedback_submit' => [3, 3600],
        'feedback_edit' => [12, 3600],
        'feedback_read' => [120, 60],
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
            if (!is_string($raw)) {
                throw new RuntimeException('Rate limit state is unavailable.');
            }
            $state = $raw === '' ? null : json_decode($raw, true);
            if ($raw !== '' && (
                !is_array($state)
                || !isset($state['started_at'], $state['count'])
                || !is_int($state['started_at'])
                || !is_int($state['count'])
                || $state['started_at'] < 0
                || $state['count'] < 0
                || $state['started_at'] > $now + $window
                || $state['count'] > $limit
            )) {
                throw new RuntimeException('Rate limit state is invalid.');
            }
            $startedAt = is_array($state) ? $state['started_at'] : $now;
            $count = is_array($state) ? $state['count'] : 0;
            if ($startedAt + $window <= $now) {
                $startedAt = $now;
                $count = 0;
            }
            if ($count >= $limit) {
                throw new RateLimitException(max(1, $startedAt + $window - $now));
            }
            $encoded = json_encode(['started_at' => $startedAt, 'count' => $count + 1], JSON_THROW_ON_ERROR);
            if (!rewind($handle) || !ftruncate($handle, 0)) {
                throw new RuntimeException('Rate limit state cannot be updated.');
            }
            $written = fwrite($handle, $encoded);
            if ($written !== strlen($encoded) || !fflush($handle)) {
                throw new RuntimeException('Rate limit state cannot be updated.');
            }
            @chmod($path, 0600);
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }
}
