<?php

declare(strict_types=1);

namespace FlashPhoto\Tests;

use FlashPhoto\Config;
use FlashPhoto\Database;
use FlashPhoto\FileStorage;
use FlashPhoto\FlashService;
use FlashPhoto\Logger;
use FlashPhoto\RuntimeCleanupQueue;
use FlashPhoto\SessionCleanupRegistry;
use FlashPhoto\Validator;
use PHPUnit\Framework\TestCase as PhpUnitTestCase;

abstract class TestCase extends PhpUnitTestCase
{
    protected string $root;
    /** @var array<string, mixed> */
    protected array $configValues;
    protected Config $config;
    protected Database $database;
    protected RuntimeCleanupQueue $cleanupQueue;
    protected SessionCleanupRegistry $sessionRegistry;
    protected FileStorage $storage;
    protected FlashService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->root = sys_get_temp_dir() . '/flash-photo-test-' . bin2hex(random_bytes(8));
        foreach (['storage/encrypted', 'storage/logs', 'storage/rate-limits', 'storage/sessions'] as $directory) {
            mkdir($this->root . '/' . $directory, 0700, true);
        }
        ini_set('session.save_handler', 'files');
        ini_set('session.save_path', $this->root . '/storage/sessions');

        $this->configValues = [
            'app_env' => 'testing',
            'app_debug' => false,
            'app_url' => 'https://s.example.test',
            'app_timezone' => 'UTC',
            'database_path' => $this->root . '/storage/database.sqlite',
            'storage_path' => $this->root . '/storage/encrypted',
            'log_path' => $this->root . '/storage/logs',
            'rate_limit_path' => $this->root . '/storage/rate-limits',
            'max_upload_bytes' => 1048576,
            'max_image_pixels' => 1000000,
            'default_view_seconds' => 30,
            'default_unused_expiry_seconds' => 86400,
            'session_name' => 'flash_test',
            'session_lifetime' => 3600,
            'app_secret' => str_repeat('a', 64),
            'ip_hash_secret' => str_repeat('b', 64),
            'health_token' => '',
            'trusted_proxies' => [],
            'admin_path' => '/admin',
            'reencode_uploads' => false,
            'preserve_gif_animation' => true,
            'log_retention_days' => 30,
            'destroyed_record_retention_days' => 30,
            'rate_limits' => [
                'admin_session' => ['limit' => 30, 'window' => 60],
                'login' => ['limit' => 10, 'window' => 60],
                'redeem' => ['limit' => 30, 'window' => 60],
                'content' => ['limit' => 120, 'window' => 60],
                'status' => ['limit' => 120, 'window' => 60],
                'upload' => ['limit' => 20, 'window' => 3600],
                'probe' => ['limit' => 2, 'window' => 60],
            ],
        ];
        $this->config = Config::fromArray($this->configValues);
        $this->database = new Database($this->config);
        $this->database->initialize(dirname(__DIR__) . '/database/schema.sql');
        $this->cleanupQueue = new RuntimeCleanupQueue($this->database);
        $this->sessionRegistry = new SessionCleanupRegistry($this->config, $this->cleanupQueue);
        $logger = new Logger($this->config, $this->cleanupQueue);
        $this->storage = new FileStorage($this->config, $logger, $this->cleanupQueue);
        $this->service = new FlashService($this->config, $this->database, $this->storage, $logger);
    }

    protected function tearDown(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION = [];
            session_destroy();
            session_id('');
        }
        $this->removeTree($this->root);
        parent::tearDown();
    }

    /** @return array<string, int|string> */
    protected function validPng(): array
    {
        $path = $this->root . '/sample.png';
        file_put_contents($path, base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            true
        ));
        return (new Validator($this->config))->validatePath($path, 'sample.png');
    }

    /** @return array<string, string> */
    protected function processEnvironment(): array
    {
        return [
            'APP_ENV' => 'testing',
            'APP_DEBUG' => 'false',
            'APP_URL' => 'https://s.example.test',
            'APP_TIMEZONE' => 'UTC',
            'DATABASE_PATH' => $this->config->string('database_path'),
            'STORAGE_PATH' => $this->config->string('storage_path'),
            'LOG_PATH' => $this->config->string('log_path'),
            'RATE_LIMIT_PATH' => $this->config->string('rate_limit_path'),
            'REENCODE_UPLOADS' => 'false',
            'PRESERVE_GIF_ANIMATION' => 'true',
            'SESSION_NAME' => 'flash_test',
            'APP_SECRET' => str_repeat('a', 64),
            'IP_HASH_SECRET' => str_repeat('b', 64),
            'ADMIN_PATH' => 'admin',
            'LOG_RETENTION_DAYS' => '30',
            'DESTROYED_RECORD_RETENTION_DAYS' => '30',
        ];
    }

    private function removeTree(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }
        $items = scandir($path) ?: [];
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $target = $path . '/' . $item;
            is_dir($target) && !is_link($target) ? $this->removeTree($target) : @unlink($target);
        }
        @rmdir($path);
    }
}
