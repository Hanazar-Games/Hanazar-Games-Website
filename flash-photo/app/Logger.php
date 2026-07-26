<?php

declare(strict_types=1);

namespace FlashPhoto;

final class Logger
{
    private string $directory;

    public function __construct(
        private readonly Config $config,
        private readonly RuntimeCleanupQueue $cleanupQueue
    ) {
        $this->directory = $config->string('log_path');
        if (!is_dir($this->directory) && !mkdir($this->directory, 0700, true) && !is_dir($this->directory)) {
            throw new \RuntimeException('Unable to create log directory.');
        }
        $mode = @fileperms($this->directory);
        if (is_link($this->directory)
            || !is_readable($this->directory)
            || !is_writable($this->directory)
            || !is_executable($this->directory)
            || $mode === false
            || ($mode & 0027) !== 0) {
            throw new \RuntimeException('Log directory permissions or access are unsafe.');
        }
    }

    /** @param array<string, scalar|null> $context */
    public function info(string $event, array $context = []): void
    {
        $this->write('info', $event, $context);
    }

    /** @param array<string, scalar|null> $context */
    public function error(string $event, array $context = []): void
    {
        $this->write('error', $event, $context);
    }

    /** @param array<string, scalar|null> $context */
    private function write(string $level, string $event, array $context): void
    {
        foreach (array_keys($context) as $key) {
            if (preg_match('/token|password|session|path/i', $key)) {
                unset($context[$key]);
            }
        }
        $eventName = preg_replace('/[^A-Za-z0-9_.-]/', '_', $event) ?? 'invalid_event';
        $record = [
            'time' => gmdate('c'),
            'level' => $level,
            'event' => $eventName,
            'request_id' => Response::requestId(),
            'context' => $context,
        ];
        $json = json_encode($record, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        if (!is_string($json)) {
            $this->fallback($eventName, 'encode_failed');
            return;
        }
        $file = $this->directory . '/app-' . gmdate('Y-m-d') . '.log';
        try {
            $this->cleanupQueue->schedule(
                'log',
                basename($file),
                time() + ($this->config->int('log_retention_days') * 86400)
            );
        } catch (\Throwable) {
            $this->fallback($eventName, 'cleanup_queue_failed');
            return;
        }
        $handle = @fopen($file, 'ab');
        if ($handle === false) {
            $this->fallback($eventName, 'open_failed');
            return;
        }
        $locked = false;
        try {
            if (!@flock($handle, LOCK_EX)) {
                $this->fallback($eventName, 'lock_failed');
                return;
            }
            $locked = true;
            $line = $json . PHP_EOL;
            $offset = 0;
            while ($offset < strlen($line)) {
                $written = @fwrite($handle, substr($line, $offset));
                if (!is_int($written) || $written < 1) {
                    $this->fallback($eventName, 'write_failed');
                    return;
                }
                $offset += $written;
            }
            if (!@fflush($handle)) {
                $this->fallback($eventName, 'flush_failed');
                return;
            }
            if (!@chmod($file, 0640)) {
                $this->fallback($eventName, 'chmod_failed');
            }
        } finally {
            if ($locked && !@flock($handle, LOCK_UN)) {
                $this->fallback($eventName, 'unlock_failed');
            }
            if (!@fclose($handle)) {
                $this->fallback($eventName, 'close_failed');
            }
        }
    }

    private function fallback(string $event, string $reason): void
    {
        @error_log(sprintf(
            'flash-photo logger failure request_id=%s event=%s reason=%s',
            Response::requestId(),
            $event,
            $reason
        ));
    }
}
