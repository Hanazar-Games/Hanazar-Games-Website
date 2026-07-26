<?php

declare(strict_types=1);

function usage(): never
{
    fwrite(STDERR, "Usage: php scripts/rotate-secret.php --target=app|ip|both [--output=PATH] [--apply]\n");
    exit(2);
}

function impact(string $target): void
{
    if ($target === 'app' || $target === 'both') {
        fwrite(STDOUT, "APP_SECRET: existing opened first-view links will no longer match their viewer binding; rate-limit keys will change.\n");
    }
    if ($target === 'ip' || $target === 'both') {
        fwrite(STDOUT, "IP_HASH_SECRET: stored IP/User-Agent hashes will no longer be comparable; IP-based rate-limit identities will change.\n");
    }
    fwrite(STDOUT, "Restart PHP-FPM after rotation so workers load the new environment. The generated secret is never printed.\n");
}

$restIndex = 0;
$options = getopt('', ['target:', 'output:', 'apply', 'help'], $restIndex);
if ($options === false || $restIndex !== count($argv)) {
    usage();
}
if (isset($options['help'])) {
    fwrite(STDOUT, "Usage: php scripts/rotate-secret.php --target=app|ip|both [--output=PATH] [--apply]\n");
    exit(0);
}
foreach (['target', 'output', 'apply'] as $name) {
    if (isset($options[$name]) && is_array($options[$name])) {
        usage();
    }
}
$target = $options['target'] ?? null;
$output = $options['output'] ?? '/etc/flash-photo.env';
if (!is_string($target) || !in_array($target, ['app', 'ip', 'both'], true) || !is_string($output) || $output === '' || $output[0] !== '/') {
    usage();
}

impact($target);
if (!isset($options['apply'])) {
    fwrite(STDOUT, "Preview only. Re-run with --apply to atomically update {$output}.\n");
    exit(0);
}

$temporary = null;
try {
    if (!is_file($output) || is_link($output)) {
        throw new RuntimeException('Environment file must be an existing regular file, not a symbolic link.');
    }
    $stat = @stat($output);
    $contents = @file_get_contents($output);
    if (!is_array($stat) || !is_string($contents) || strlen($contents) > 1048576) {
        throw new RuntimeException('Unable to safely read the environment file.');
    }
    $mode = (int) $stat['mode'] & 0777;
    if (($mode & 0022) !== 0) {
        throw new RuntimeException('Environment file must not be group- or world-writable.');
    }

    $keys = match ($target) {
        'app' => ['APP_SECRET'],
        'ip' => ['IP_HASH_SECRET'],
        default => ['APP_SECRET', 'IP_HASH_SECRET'],
    };
    foreach ($keys as $key) {
        $pattern = '/^[ \t]*' . preg_quote($key, '/') . '[ \t]*=[^\r\n]*/m';
        if (preg_match_all($pattern, $contents) > 1) {
            throw new RuntimeException("Duplicate {$key} entries must be resolved before rotation.");
        }
        $replacement = $key . '=' . bin2hex(random_bytes(32));
        if (preg_match($pattern, $contents) === 1) {
            $contents = preg_replace($pattern, $replacement, $contents, 1);
            if (!is_string($contents)) {
                throw new RuntimeException("Unable to replace {$key}.");
            }
        } else {
            $contents = rtrim($contents, "\r\n") . PHP_EOL . $replacement . PHP_EOL;
        }
    }

    $directory = dirname($output);
    if (!is_dir($directory) || is_link($directory)) {
        throw new RuntimeException('Environment file directory is unavailable or unsafe.');
    }
    $temporary = tempnam($directory, '.flash-photo-env-');
    if ($temporary === false) {
        throw new RuntimeException('Unable to create a temporary environment file.');
    }
    $handle = @fopen($temporary, 'wb');
    if ($handle === false) {
        throw new RuntimeException('Unable to open the temporary environment file.');
    }
    try {
        if (fwrite($handle, $contents) !== strlen($contents) || !fflush($handle) || (function_exists('fsync') && !fsync($handle))) {
            throw new RuntimeException('Unable to persist the temporary environment file.');
        }
    } finally {
        fclose($handle);
    }
    if (!@chown($temporary, (int) $stat['uid']) || !@chgrp($temporary, (int) $stat['gid']) || !@chmod($temporary, $mode)) {
        throw new RuntimeException('Unable to preserve environment file ownership and permissions.');
    }
    if (!@rename($temporary, $output)) {
        throw new RuntimeException('Unable to atomically replace the environment file.');
    }
    $temporary = null;
    fwrite(STDOUT, "Rotation complete: {$output} updated without displaying secrets.\n");
    exit(0);
} catch (Throwable $exception) {
    if (is_string($temporary) && file_exists($temporary)) {
        @unlink($temporary);
    }
    fwrite(STDERR, "Rotation failed: {$exception->getMessage()}\n");
    exit(1);
}
