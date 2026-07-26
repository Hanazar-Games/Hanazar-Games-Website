<?php

declare(strict_types=1);

namespace FlashPhoto;

final class RateLimiter
{
    private string $directory;

    public function __construct(
        private readonly Config $config,
        private readonly Logger $logger,
        private readonly RuntimeCleanupQueue $cleanupQueue,
    ) {
        $this->directory = $config->string('rate_limit_path');
        if (!is_dir($this->directory) && !mkdir($this->directory, 0700, true) && !is_dir($this->directory)) {
            throw new \RuntimeException('Unable to create rate limit directory.');
        }
        $mode = @fileperms($this->directory);
        if (is_link($this->directory)
            || $mode === false
            || ($mode & 0077) !== 0
            || !is_readable($this->directory)
            || !is_writable($this->directory)
            || !is_executable($this->directory)) {
            throw new \RuntimeException('Rate limit directory permissions or access are unsafe.');
        }
    }

    public function consume(string $scope, string $identifier): void
    {
        $limits = $this->config->array('rate_limits');
        $definition = $limits[$scope] ?? null;
        if (!is_array($definition)
            || !isset($definition['limit'], $definition['window'])
            || !is_int($definition['limit'])
            || !is_int($definition['window'])
            || $definition['limit'] < 1
            || $definition['window'] < 1) {
            throw new \RuntimeException('Rate limit scope is not configured.');
        }
        $limit = $definition['limit'];
        $window = $definition['window'];
        $key = hash_hmac('sha256', $scope . '|' . $identifier, $this->config->string('app_secret'));
        $path = $this->directory . '/' . $key . '.json';
        $result = $this->synchronized(function () use ($path, $limit, $window): array {
            $now = time();
            [$state, $originalStat] = $this->readState($path, $now, $window);
            if ($state !== null
                && $now - $state['started'] < $window
                && $state['count'] > $limit) {
                return ['state' => $state, 'first_exceeded' => false];
            }
            if ($state === null || $now - $state['started'] >= $window) {
                $state = ['started' => $now, 'count' => 0];
            }
            $state['count']++;
            $this->cleanupQueue->schedule(
                'rate_limit',
                basename($path),
                $state['started'] + $window,
            );
            $this->persistState($path, $state, $originalStat);
            return [
                'state' => $state,
                'first_exceeded' => $state['count'] === $limit + 1,
            ];
        });
        $state = $result['state'];

        if ($state['count'] > $limit) {
            $now = time();
            $retry = $window - ($now - (int) $state['started']);
            $firstExceeded = $result['first_exceeded'];
            if ($firstExceeded) {
                $this->logger->info('rate_limit.triggered', [
                    'scope' => $scope,
                    'identity_hash' => substr($key, 0, 16),
                ]);
            }
            throw new RateLimitException($retry, $firstExceeded);
        }
    }

    /** @template T @param callable(): T $callback @return T */
    public function synchronized(callable $callback): mixed
    {
        $path = $this->directory . '/.rate-limit.lock';
        $lock = @fopen($path, 'c+b');
        $pathStat = $this->exactStat($path);
        $openStat = is_resource($lock) ? @fstat($lock) : false;
        $needsChmod = is_array($openStat) && (((int) $openStat['mode']) & 0777) !== 0600;
        if (!is_resource($lock)
            || !$this->isExactRegularFile($pathStat, $openStat)
            || ($needsChmod && !@chmod($path, 0600))
            || !$this->isExactRegularFile($this->exactStat($path), $openStat, true)
            || !flock($lock, LOCK_EX)
            || !$this->isExactRegularFile($this->exactStat($path), $openStat, true)) {
            if (is_resource($lock)) {
                fclose($lock);
            }
            throw new \RuntimeException('Rate limiter lock is unavailable.');
        }
        try {
            return $callback();
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /** @return array{0: ?array{started: int, count: int}, 1: array<int|string, int>|false} */
    private function readState(string $path, int $now, int $window): array
    {
        $pathStat = $this->exactStat($path);
        if ($pathStat === false) {
            return [null, false];
        }
        if (!$this->isSecureRegularStat($pathStat)) {
            throw new \RuntimeException('Rate limiter state is corrupt.');
        }
        $handle = @fopen($path, 'rb');
        if ($handle === false) {
            throw new \RuntimeException('Rate limiter storage is unavailable.');
        }
        try {
            $openStat = @fstat($handle);
            if (!$this->isExactRegularFile($pathStat, $openStat, true)) {
                throw new \RuntimeException('Rate limiter state is corrupt.');
            }
            $contents = stream_get_contents($handle, 1025);
            if (!is_string($contents) || strlen($contents) > 1024 || !feof($handle)) {
                throw new \RuntimeException('Rate limiter state is corrupt.');
            }
        } finally {
            fclose($handle);
        }
        try {
            $state = json_decode($contents, true, 8, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new \RuntimeException('Rate limiter state is corrupt.');
        }
        if (!is_array($state)
            || count($state) !== 2
            || !array_key_exists('started', $state)
            || !array_key_exists('count', $state)
            || !is_int($state['started'])
            || !is_int($state['count'])
            || $state['started'] < 1
            || $state['started'] > $now + $window
            || $state['count'] < 1
            || $state['count'] >= PHP_INT_MAX
            || json_encode([
                'started' => $state['started'],
                'count' => $state['count'],
            ], JSON_THROW_ON_ERROR) !== $contents) {
            throw new \RuntimeException('Rate limiter state is corrupt.');
        }
        return [['started' => $state['started'], 'count' => $state['count']], $pathStat];
    }

    /**
     * @param array{started: int, count: int} $state
     * @param array<int|string, int>|false $originalStat
     */
    private function persistState(string $path, array $state, array|false $originalStat): void
    {
        $temporary = $path . '.tmp';
        $this->removeInterruptedWrite($temporary);
        $handle = @fopen($temporary, 'x+b');
        if ($handle === false) {
            throw new \RuntimeException('Unable to create rate limit state.');
        }
        $published = false;
        try {
            if (!@chmod($temporary, 0600)) {
                throw new \RuntimeException('Unable to secure rate limit state.');
            }
            $encoded = json_encode($state, JSON_THROW_ON_ERROR);
            if (fwrite($handle, $encoded) !== strlen($encoded)
                || !fflush($handle)
                || !function_exists('fsync')
                || !@fsync($handle)) {
                throw new \RuntimeException('Unable to persist rate limit state.');
            }
            $openStat = @fstat($handle);
            if (!$this->isExactRegularFile($this->exactStat($temporary), $openStat, true)
                || !$this->pathStillMatches($path, $originalStat)) {
                throw new \RuntimeException('Rate limiter state path changed unexpectedly.');
            }
            fclose($handle);
            $handle = null;
            if (!@rename($temporary, $path)) {
                throw new \RuntimeException('Unable to publish rate limit state.');
            }
            $published = true;
            if (!$this->isExactRegularFile($this->exactStat($path), $openStat, true)
                || !$this->syncDirectory()) {
                throw new \RuntimeException('Unable to persist rate limit publication.');
            }
        } finally {
            if (is_resource($handle)) {
                fclose($handle);
            }
            if (!$published && $this->exactStat($temporary) !== false) {
                @unlink($temporary);
                $this->syncDirectory();
            }
        }
    }

    private function removeInterruptedWrite(string $path): void
    {
        $stat = $this->exactStat($path);
        if ($stat === false) {
            return;
        }
        $type = ((int) $stat['mode']) & 0170000;
        if (($type !== 0100000 && $type !== 0120000)
            || !@unlink($path)
            || $this->exactStat($path) !== false
            || !$this->syncDirectory()) {
            throw new \RuntimeException('Unable to recover interrupted rate limit write.');
        }
    }

    /** @param array<int|string, int>|false $expected */
    private function pathStillMatches(string $path, array|false $expected): bool
    {
        $current = $this->exactStat($path);
        if ($expected === false) {
            return $current === false;
        }
        return $current !== false
            && (int) $current['dev'] === (int) $expected['dev']
            && (int) $current['ino'] === (int) $expected['ino']
            && $this->isSecureRegularStat($current);
    }

    /**
     * @param array<int|string, int>|false $pathStat
     * @param array<int|string, int>|false $openStat
     */
    private function isExactRegularFile(array|false $pathStat, array|false $openStat, bool $secure = false): bool
    {
        return $pathStat !== false
            && $openStat !== false
            && (int) $pathStat['dev'] === (int) $openStat['dev']
            && (int) $pathStat['ino'] === (int) $openStat['ino']
            && (((int) $openStat['mode']) & 0170000) === 0100000
            && (int) $pathStat['nlink'] === 1
            && (int) $openStat['nlink'] === 1
            && (!$secure || $this->isSecureRegularStat($pathStat));
    }

    /** @param array<int|string, int> $stat */
    private function isSecureRegularStat(array $stat): bool
    {
        return (((int) $stat['mode']) & 0170000) === 0100000
            && (((int) $stat['mode']) & 0777) === 0600
            && (int) $stat['nlink'] === 1;
    }

    /** @return array<int|string, int>|false */
    private function exactStat(string $path): array|false
    {
        clearstatcache(true, $path);
        return @lstat($path);
    }

    private function syncDirectory(): bool
    {
        if (PHP_OS_FAMILY !== 'Linux') {
            return true;
        }
        if (!function_exists('fsync')) {
            return false;
        }
        $pathStat = $this->exactStat($this->directory);
        if ($pathStat === false
            || (((int) $pathStat['mode']) & 0170000) !== 0040000
            || is_link($this->directory)) {
            return false;
        }
        $handle = @fopen($this->directory, 'r');
        if ($handle === false) {
            return false;
        }
        try {
            $openStat = @fstat($handle);
            return $openStat !== false
                && (int) $openStat['dev'] === (int) $pathStat['dev']
                && (int) $openStat['ino'] === (int) $pathStat['ino']
                && @fsync($handle);
        } finally {
            fclose($handle);
        }
    }
}
