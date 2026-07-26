<?php

declare(strict_types=1);

use FlashPhoto\Config;
use FlashPhoto\SchemaValidator;

function usage(): never
{
    fwrite(STDERR, "Usage: php scripts/check-permissions.php [--web-root=PATH] [--session-path=DIR]\n");
    exit(2);
}

$restIndex = 0;
$options = getopt('', ['web-root:', 'session-path:', 'help'], $restIndex);
if ($options === false || $restIndex !== count($argv)) {
    usage();
}
foreach (['web-root', 'session-path'] as $name) {
    if (isset($options[$name]) && is_array($options[$name])) {
        usage();
    }
}
if (isset($options['help'])) {
    fwrite(STDOUT, "Usage: php scripts/check-permissions.php [--web-root=PATH] [--session-path=DIR]\n");
    exit(0);
}
$sessionPathOption = $options['session-path'] ?? null;
if ($sessionPathOption !== null
    && (!is_string($sessionPathOption) || $sessionPathOption === '' || $sessionPathOption[0] !== '/')) {
    usage();
}

$root = dirname(__DIR__);
$failures = 0;
$warnings = 0;
$report = static function (string $level, string $message) use (&$failures, &$warnings): void {
    if ($level === 'FAIL') {
        $failures++;
    } elseif ($level === 'WARN') {
        $warnings++;
    }
    fwrite($level === 'FAIL' ? STDERR : STDOUT, "[{$level}] {$message}\n");
};
$inside = static function (string $path, string $directory): bool {
    return $path === $directory || str_starts_with($path, rtrim($directory, '/') . DIRECTORY_SEPARATOR);
};
$checkWritableDirectory = static function (
    string $label,
    string $path,
    int $forbiddenMode = 0002,
    ?int $requiredMode = null
) use ($report): void {
    if (!is_dir($path) || is_link($path)) {
        $report('FAIL', "{$label} must be an existing non-symlink directory: {$path}");
        return;
    }
    if (!is_readable($path) || !is_writable($path) || !is_executable($path)) {
        $report('FAIL', "{$label} is not readable, writable, and traversable by the current user: {$path}");
        return;
    }
    $mode = @fileperms($path);
    if ($mode === false
        || ($requiredMode !== null && ($mode & 0777) !== $requiredMode)
        || (($mode & $forbiddenMode) !== 0)) {
        $report('FAIL', "{$label} has insecure permissions: {$path}");
        return;
    }
    $report('OK', "{$label}: {$path}");
};

if (version_compare(PHP_VERSION, '8.2.0', '<')) {
    $report('FAIL', 'PHP 8.2 or newer is required; found ' . PHP_VERSION);
} else {
    $report('OK', 'PHP ' . PHP_VERSION);
}
foreach (['pdo', 'pdo_sqlite', 'fileinfo', 'mbstring', 'session'] as $extension) {
    $report(extension_loaded($extension) ? 'OK' : 'FAIL', "extension {$extension}");
}
$report(function_exists('fsync') ? 'OK' : 'FAIL', 'function fsync');

try {
    require_once $root . '/app/Config.php';
    require_once $root . '/app/SchemaValidator.php';
    $configFile = $root . '/config/config.php';
    if (!is_file($configFile) || is_link($configFile) || !is_readable($configFile)) {
        throw new RuntimeException('Configuration file must be a readable regular file.');
    }
    $configMode = @fileperms($configFile);
    if ($configMode !== false && (($configMode & 0022) !== 0)) {
        $report('FAIL', 'configuration file must not be group- or world-writable');
    }
    $config = Config::load($configFile);
    $report('OK', 'configuration loaded and validated');

    if ($config->bool('reencode_uploads')) {
        $report(extension_loaded('gd') ? 'OK' : 'FAIL', 'extension gd (required by REENCODE_UPLOADS)');
        $codecs = [
            'jpeg' => ['imagecreatefromjpeg', 'imagejpeg'],
            'png' => ['imagecreatefrompng', 'imagepng'],
            'webp' => ['imagecreatefromwebp', 'imagewebp'],
        ];
        if (!$config->bool('preserve_gif_animation')) {
            $codecs['gif'] = ['imagecreatefromgif', 'imagegif'];
        }
        foreach ($codecs as $format => $functions) {
            $available = array_reduce(
                $functions,
                static fn (bool $ready, string $function): bool => $ready && function_exists($function),
                true
            );
            $report($available ? 'OK' : 'FAIL', "GD {$format} codec");
        }
    }

    $public = realpath($root . '/public');
    $webRootOption = $options['web-root'] ?? ($root . '/public');
    $webRoot = is_string($webRootOption) ? realpath($webRootOption) : false;
    if ($public === false || $webRoot === false || $public !== $webRoot) {
        $report('FAIL', 'web root must resolve exactly to ' . $root . '/public');
    } else {
        $report('OK', 'web root is isolated to public/');
    }

    $paths = [
        'database' => $config->string('database_path'),
        'encrypted storage' => $config->string('storage_path'),
        'logs' => $config->string('log_path'),
        'rate limits' => $config->string('rate_limit_path'),
        'configuration' => $configFile,
    ];
    if ($public !== false) {
        foreach ($paths as $label => $path) {
            $resolved = realpath($path);
            $candidate = $resolved !== false ? $resolved : realpath(dirname($path));
            if ($candidate !== false && $inside($candidate, $public)) {
                $report('FAIL', "{$label} is inside the web root: {$path}");
            }
        }
    }

    $expectedSession = dirname($config->string('storage_path')) . '/sessions';
    $runtimePaths = [
        'encrypted storage' => $config->string('storage_path'),
        'logs' => $config->string('log_path'),
        'rate limits' => $config->string('rate_limit_path'),
        'sessions' => $expectedSession,
    ];
    $resolvedRuntimePaths = [];
    foreach ($runtimePaths as $label => $path) {
        $resolved = realpath($path);
        if ($resolved !== false) {
            $resolvedRuntimePaths[$label] = $resolved;
        }
    }
    $runtimeLabels = array_keys($resolvedRuntimePaths);
    foreach ($runtimeLabels as $index => $label) {
        foreach (array_slice($runtimeLabels, $index + 1) as $otherLabel) {
            $path = $resolvedRuntimePaths[$label];
            $otherPath = $resolvedRuntimePaths[$otherLabel];
            if ($inside($path, $otherPath) || $inside($otherPath, $path)) {
                $report('FAIL', "{$label} and {$otherLabel} must not overlap physically");
            }
        }
    }

    $database = $config->string('database_path');
    $resolvedDatabase = realpath($database);
    if ($resolvedDatabase !== false) {
        foreach ($resolvedRuntimePaths as $label => $path) {
            if ($inside($resolvedDatabase, $path) || $inside($path, $resolvedDatabase)) {
                $report('FAIL', "database and {$label} must not overlap physically");
            }
        }
    }
    if (!is_file($database) || is_link($database) || !is_readable($database) || !is_writable($database)) {
        $report('FAIL', "database must be an existing readable/writable regular file: {$database}");
    } else {
        $mode = @fileperms($database);
        if ($mode !== false && (($mode & 0077) !== 0)) {
            $report('FAIL', "database must use owner-only permissions: {$database}");
        } else {
            $report('OK', "database: {$database}");
        }
        try {
            $databaseHandle = new PDO('sqlite:' . $database, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            $schemaReady = SchemaValidator::isCompatible($databaseHandle);
            $report($schemaReady ? 'OK' : 'FAIL', 'database schema version, tables, columns, and indexes');
        } catch (Throwable $exception) {
            $report('FAIL', 'database connection failed: ' . $exception->getMessage());
        }
    }
    $checkWritableDirectory('database directory', dirname($database), 0077);
    $checkWritableDirectory('encrypted storage', $config->string('storage_path'), 0077);
    $checkWritableDirectory('pending storage', $config->string('storage_path') . '/.pending', 0077);
    $checkWritableDirectory('log directory', $config->string('log_path'), 0027);
    $checkWritableDirectory('rate-limit directory', $config->string('rate_limit_path'), 0077);

    if (ini_get('session.save_handler') !== 'files') {
        $report(
            $sessionPathOption === null ? 'WARN' : 'FAIL',
            'session cleanup requires session.save_handler=files'
        );
    } else {
        $iniSessionPath = (string) ini_get('session.save_path');
        $sessionPath = is_string($sessionPathOption) ? $sessionPathOption : $iniSessionPath;
        $realSession = $sessionPath === '' ? false : realpath($sessionPath);
        if (
            $realSession === false
            || ($sessionPathOption === null && $iniSessionPath !== $expectedSession)
            || $sessionPath !== $expectedSession
            || $realSession !== $expectedSession
            || is_link($sessionPath)
        ) {
            $report(
                $sessionPathOption === null ? 'WARN' : 'FAIL',
                'no exact dedicated storage/sessions path is configured for cleanup'
            );
        } else {
            $checkWritableDirectory('session directory', $realSession, 0077, 0700);
            $checkWritableDirectory('session cleanup registry', $realSession . '/.cleanup', 0077, 0700);
        }
    }
} catch (Throwable $exception) {
    $report('FAIL', $exception->getMessage());
}

fwrite(STDOUT, "Result: {$failures} failure(s), {$warnings} warning(s).\n");
exit($failures === 0 ? 0 : 1);
