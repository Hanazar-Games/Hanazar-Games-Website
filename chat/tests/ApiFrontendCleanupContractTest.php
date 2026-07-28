<?php

declare(strict_types=1);

namespace Hanazar\Chat\Tests;

use PHPUnit\Framework\TestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;

final class ApiFrontendCleanupContractTest extends TestCase
{
    private string $chatRoot;

    protected function setUp(): void
    {
        parent::setUp();
        $this->chatRoot = dirname(__DIR__);
    }

    public function testApiPublishesAConsistentJsonRouteContract(): void
    {
        $api = $this->corpus(['app', 'public/api'], ['php']);

        foreach (['ok', 'data', 'error', 'code', 'message'] as $envelopeKey) {
            self::assertMatchesRegularExpression(
                '~[\'\"]' . preg_quote($envelopeKey, '~') . '[\'\"]\s*=>~',
                $api,
                'Every JSON response must use the stable ok/data/error envelope.',
            );
        }

        self::assertStringContainsString('application/json; charset=utf-8', $api);
        foreach (['GET', 'POST', 'PATCH', 'DELETE'] as $method) {
            self::assertMatchesRegularExpression('~[\'\"]' . $method . '[\'\"]~', $api);
        }

        foreach (
            [
                '/auth/login',
                '/auth/logout',
                '/auth/session',
                '/users',
                '/rooms',
                '/rooms/dm',
                '/rooms/group',
                '/messages',
                '/read',
                '/events',
                '/presence',
                '/typing',
                '/health',
            ] as $route
        ) {
            self::assertStringContainsString($route, $api, 'Missing API route contract: ' . $route);
        }
    }

    public function testApiRejectsUnsafeMethodsMediaTypesBodiesAndCsrf(): void
    {
        $api = $this->corpus(['app', 'public/api'], ['php']);

        self::assertMatchesRegularExpression('~405|method_not_allowed~i', $api);
        self::assertMatchesRegularExpression('~415|unsupported_media_type~i', $api);
        self::assertMatchesRegularExpression('~413|payload_too_large~i', $api);
        self::assertMatchesRegularExpression('~CONTENT_TYPE~', $api);
        self::assertMatchesRegularExpression('~CONTENT_LENGTH~', $api);
        self::assertMatchesRegularExpression('~1048576|1\s*\*\s*1024\s*\*\s*1024~', $api);
        self::assertMatchesRegularExpression('~X[-_]CSRF[-_]TOKEN|HTTP_X_CSRF_TOKEN~i', $api);
        self::assertMatchesRegularExpression('~csrf_(?:invalid|mismatch|missing)|invalid_csrf~i', $api);
        self::assertMatchesRegularExpression('~hash_equals\s*\(~', $api);
        self::assertMatchesRegularExpression('~json_last_error|JSON_THROW_ON_ERROR~', $api);
    }

    public function testApiUsesSafeAuthenticationAndAuthorizationFailures(): void
    {
        $api = $this->corpus(['app', 'public/api'], ['php']);

        self::assertMatchesRegularExpression('~invalid_credentials~i', $api);
        self::assertDoesNotMatchRegularExpression(
            '~(?:unknown_user|user_not_found|wrong_password|password_incorrect)~i',
            $api,
            'Login failures must not reveal whether a username exists.',
        );
        self::assertMatchesRegularExpression('~401|authentication_required~i', $api);
        self::assertMatchesRegularExpression('~403|forbidden~i', $api);
        self::assertMatchesRegularExpression('~404|not_found~i', $api);
        self::assertMatchesRegularExpression('~room_(?:not_found|unavailable)|not_found~i', $api);
        self::assertMatchesRegularExpression('~message_(?:not_found|unavailable)|not_found~i', $api);
        self::assertMatchesRegularExpression('~session_regenerate_id\s*\(\s*true\s*\)~i', $api);
        self::assertDoesNotMatchRegularExpression('~(?:getMessage|traceAsString)\s*\(\s*\).*json~is', $api);
    }

    public function testHealthEndpointIsPrivateAndDoesNotDiscloseInternals(): void
    {
        $api = $this->corpus(['app', 'public/api'], ['php']);
        $nginx = $this->readRequired('nginx/chat.conf');

        self::assertMatchesRegularExpression('~(?:/health|health_check)~i', $api);
        self::assertMatchesRegularExpression('~location\s*=\s*/(?:api/)?health\b~i', $nginx);
        self::assertMatchesRegularExpression('~allow\s+127\.0\.0\.1\s*;~i', $nginx);
        self::assertMatchesRegularExpression('~allow\s+::1\s*;~i', $nginx);
        self::assertMatchesRegularExpression('~deny\s+all\s*;~i', $nginx);
        self::assertDoesNotMatchRegularExpression(
            '~(?:DB_PATH|APP_KEY|password_hash|sqlite:|BACKUP_PATH)[\'\"]?\s*=>~i',
            $api,
            'Health output must not expose paths, secrets, hashes, or DSNs.',
        );
    }

    public function testFrontendRendersMessagesAsTextAndTreatsFlashUrlsAsLinksOnly(): void
    {
        $html = $this->readRequired('public/index.php');
        $javascript = $this->readRequired('public/assets/app.js');

        self::assertStringContainsString('textContent', $javascript);
        self::assertDoesNotMatchRegularExpression('~\.innerHTML\s*=|insertAdjacentHTML|document\.write~', $javascript);
        self::assertDoesNotMatchRegularExpression(
            '~createElement\s*\(\s*[\'\"](?:img|iframe|video|embed)[\'\"]|new\s+Image\s*\(|linkPreview|unfurl|oembed~i',
            $javascript,
        );
        self::assertDoesNotMatchRegularExpression('~rel\s*=\s*[\'\"]prefetch|<link[^>]+prefetch~i', $html . "\n" . $javascript);
        self::assertMatchesRegularExpression('~createElement\s*\(\s*[\'\"]a[\'\"]\s*\)~i', $javascript);
        self::assertMatchesRegularExpression('~noopener\s+noreferrer|noreferrer\s+noopener~i', $javascript);
        self::assertMatchesRegularExpression('~target\s*=\s*[\'\"]_blank[\'\"]~i', $javascript);
        self::assertMatchesRegularExpression('~https?:|URL\s*\(~i', $javascript);
    }

    public function testFrontendUsesOnlySameOriginAndLocalAssets(): void
    {
        $html = $this->readRequired('public/index.php');
        $javascript = $this->readRequired('public/assets/app.js');

        self::assertDoesNotMatchRegularExpression('~<(?:script|link|audio|source)[^>]+https?://~i', $html);
        self::assertDoesNotMatchRegularExpression('~(?:fetch|EventSource|WebSocket)\s*\(\s*[\'\"]https?://~i', $javascript);
        self::assertDoesNotMatchRegularExpression('~\b(?:import|from)\s*[\'(]?\s*[\'\"]https?://~i', $javascript);
        self::assertMatchesRegularExpression('~<meta\s+name=[\'\"]viewport[\'\"]~i', $html);
        self::assertMatchesRegularExpression('~/(?:api|assets)/~', $html . "\n" . $javascript);
    }

    public function testFrontendDoesNotPersistSensitiveDataOrRegisterAServiceWorker(): void
    {
        $javascript = $this->readRequired('public/assets/app.js');

        self::assertDoesNotMatchRegularExpression('~indexedDB|sessionStorage|serviceWorker|\bcaches\s*\.~i', $javascript);
        self::assertDoesNotMatchRegularExpression(
            '~localStorage[^\n]*(?:message|room|account|user|draft|token|session|password|csrf)~i',
            $javascript,
        );

        preg_match_all('~^.*localStorage.*$~mi', $javascript, $storageLines);
        foreach ($storageLines[0] as $line) {
            self::assertMatchesRegularExpression(
                '~sound|audio|sfx|bgm|music~i',
                $line,
                'Only non-sensitive audio preferences may use localStorage.',
            );
        }
    }

    public function testSoundIsOptInAndTheInterfaceHonorsAccessibilityPreferences(): void
    {
        $html = $this->readRequired('public/index.php');
        $javascript = $this->readRequired('public/assets/app.js');
        $css = $this->readRequired('public/assets/app.css');

        self::assertMatchesRegularExpression('~(?:sfx|effects|soundEffects)[^\n=]{0,40}=\s*false~i', $javascript);
        self::assertMatchesRegularExpression('~(?:bgm|music|backgroundMusic)[^\n=]{0,40}=\s*false~i', $javascript);
        self::assertDoesNotMatchRegularExpression('~<audio[^>]+autoplay|\.autoplay\s*=\s*true~i', $html . "\n" . $javascript);
        self::assertMatchesRegularExpression('~AudioContext|webkitAudioContext~', $javascript);
        self::assertMatchesRegularExpression('~prefers-reduced-motion\s*:\s*reduce~i', $css);
        self::assertMatchesRegularExpression('~focus-visible~i', $css);
        self::assertMatchesRegularExpression('~@media[^\{]*(?:max-width|width\s*<)~i', $css);
        self::assertMatchesRegularExpression('~aria-live=[\'\"](?:polite|assertive)[\'\"]~i', $html);
        self::assertMatchesRegularExpression('~<label\b|aria-label=~i', $html);
        self::assertMatchesRegularExpression('~keydown|keyup~', $javascript);
    }

    public function testFrontendStopsAndResynchronizesPollingAcrossBrowserLifecycleChanges(): void
    {
        $javascript = $this->readRequired('public/assets/app.js');

        foreach (['visibilitychange', 'online', 'offline', 'pageshow', 'pagehide'] as $event) {
            self::assertStringContainsString($event, $javascript);
        }
        self::assertStringContainsString('document.hidden', $javascript);
        self::assertMatchesRegularExpression('~\.persisted\b~', $javascript);
        self::assertStringContainsString('AbortController', $javascript);
        self::assertMatchesRegularExpression('~\.abort\s*\(~', $javascript);
        self::assertMatchesRegularExpression('~(?:resync|sync|poll)\s*\(~i', $javascript);
    }

    public function testCleanupIsDryRunnableLockedIdempotentAndAdvancesTheEventFloor(): void
    {
        $cleanup = $this->readRequired('scripts/cleanup.php');

        self::assertStringContainsString('--dry-run', $cleanup);
        self::assertStringContainsString('flock', $cleanup);
        self::assertStringContainsString('LOCK_EX', $cleanup);
        self::assertStringContainsString('LOCK_NB', $cleanup);
        self::assertMatchesRegularExpression('~PHP_SAPI\s*!==?\s*[\'\"]cli[\'\"]~i', $cleanup);
        self::assertMatchesRegularExpression('~BEGIN\s+IMMEDIATE|->immediate\s*\(~i', $cleanup);
        self::assertMatchesRegularExpression('~events_floor_id~', $cleanup);
        self::assertMatchesRegularExpression('~DELETE\s+FROM\s+user_events~i', $cleanup);
        self::assertMatchesRegularExpression('~(?:deleted_at|created_at|updated_at|last_seen_at)\s*<~i', $cleanup);
        self::assertDoesNotMatchRegularExpression('~DROP\s+TABLE|DELETE\s+FROM\s+messages\s*;~i', $cleanup);
    }

    public function testCleanupCoversAllEphemeralAndRetentionControlledData(): void
    {
        $cleanup = $this->readRequired('scripts/cleanup.php');

        foreach (
            [
                'user_events',
                'typing_indicators',
                'user_presence',
                'audit_logs',
                'sessions',
                'rate-limits',
                'logs',
                'backups',
            ] as $subject
        ) {
            self::assertStringContainsString($subject, $cleanup, 'Cleanup omits retention target: ' . $subject);
        }
        self::assertMatchesRegularExpression('~RETENTION|retention~', $cleanup);
        self::assertMatchesRegularExpression('~(?:is_file|is_link|realpath|lstat)\s*\(~', $cleanup);
        self::assertMatchesRegularExpression('~(?:unlink|DELETE\s+FROM)~i', $cleanup);
    }

    public function testBackupAndCheckScriptsProtectFilesAndValidateTheDatabase(): void
    {
        $backup = $this->readRequired('scripts/backup.php');
        $check = $this->readRequired('scripts/check.php');

        self::assertMatchesRegularExpression('~PHP_SAPI\s*!==?\s*[\'\"]cli[\'\"]~i', $backup . "\n" . $check);
        self::assertMatchesRegularExpression('~umask\s*\(\s*0?077\s*\)~', $backup);
        self::assertMatchesRegularExpression('~chmod\s*\([^,]+,\s*0?600\s*\)~', $backup);
        self::assertMatchesRegularExpression('~flock\s*\(~', $backup);
        self::assertMatchesRegularExpression('~VACUUM\s+INTO|sqlite3_backup|\.backup~i', $backup);
        self::assertDoesNotMatchRegularExpression('~copy\s*\([^\n]+\.sqlite~i', $backup);
        self::assertMatchesRegularExpression('~(?:quick_check|integrity_check)~i', $backup . "\n" . $check);
        self::assertMatchesRegularExpression('~foreign_key_check~i', $check);
        self::assertMatchesRegularExpression('~(?:fileperms|0?700|0?600)~', $check);
        self::assertMatchesRegularExpression('~PUBLIC_ROOT|publicRoot~', $check);
        self::assertMatchesRegularExpression('~DB_PATH|databasePath~', $check);
    }

    public function testPhpFpmSystemdAndCronRunAsARestrictedServiceAccount(): void
    {
        $fpm = $this->readRequired('php-fpm/chat.conf');
        $service = $this->matchingCorpus('systemd', '~\.service$~');
        $timer = $this->matchingCorpus('systemd', '~\.timer$~');
        $cron = $this->readRequired('cron/chat');

        self::assertMatchesRegularExpression('~^user\s*=\s*[^\s]+~mi', $fpm);
        self::assertMatchesRegularExpression('~^group\s*=\s*[^\s]+~mi', $fpm);
        self::assertMatchesRegularExpression('~clear_env\s*=\s*yes~i', $fpm);
        self::assertMatchesRegularExpression('~display_errors\]\s*=\s*Off~i', $fpm);
        self::assertMatchesRegularExpression('~session\.use_strict_mode\]\s*=\s*1~i', $fpm);
        self::assertMatchesRegularExpression('~session\.cookie_secure\]\s*=\s*1~i', $fpm);
        self::assertMatchesRegularExpression('~session\.cookie_httponly\]\s*=\s*1~i', $fpm);

        foreach (['User=', 'Group=', 'NoNewPrivileges=true', 'PrivateTmp=true', 'ProtectSystem=strict'] as $hardening) {
            self::assertStringContainsString($hardening, $service);
        }
        self::assertMatchesRegularExpression('~ReadWritePaths=~', $service);
        self::assertMatchesRegularExpression('~(?:cleanup|backup|check)\.php~', $service);
        self::assertMatchesRegularExpression('~OnCalendar=|OnUnitActiveSec=~', $timer);
        self::assertMatchesRegularExpression('~RandomizedDelaySec=~', $timer);
        foreach (['cleanup.php', 'backup.php', 'check.php'] as $job) {
            self::assertStringContainsString($job, $cron);
        }
    }

    public function testNginxExposesOnlyThePublicRootAndSuppressesSensitiveRequestLogs(): void
    {
        $nginx = $this->readRequired('nginx/chat.conf');

        self::assertMatchesRegularExpression('~server_name\s+chat\.hanazargames\.com\s*;~i', $nginx);
        self::assertMatchesRegularExpression('~root\s+[^;]+/public\s*;~i', $nginx);
        self::assertMatchesRegularExpression('~client_max_body_size\s+1[mM]\s*;~', $nginx);
        self::assertMatchesRegularExpression('~location\s+~', $nginx);
        self::assertMatchesRegularExpression('~location[^\{]*php|location\s*=\s*/(?:api/)?index\.php~i', $nginx);
        self::assertMatchesRegularExpression('~deny\s+all\s*;~i', $nginx);
        self::assertMatchesRegularExpression('~(?:storage|database|\.env|vendor|scripts|backups)~i', $nginx);
        self::assertMatchesRegularExpression('~Cache-Control[^;]*no-store|add_header\s+Cache-Control\s+[\'\"]no-store~i', $nginx);
        self::assertMatchesRegularExpression('~access_log\s+off\s*;|log_format\s+privacy~i', $nginx);
        self::assertDoesNotMatchRegularExpression('~fastcgi_param\s+SCRIPT_FILENAME\s+\$request_filename~i', $nginx);
        self::assertMatchesRegularExpression('~fastcgi_param\s+SCRIPT_FILENAME\s+[^;]*\$document_root\$fastcgi_script_name~i', $nginx);
    }

    /** @param list<string> $relativeDirectories @param list<string> $extensions */
    private function corpus(array $relativeDirectories, array $extensions): string
    {
        $parts = [];

        foreach ($relativeDirectories as $relativeDirectory) {
            $directory = $this->chatRoot . '/' . $relativeDirectory;
            self::assertDirectoryExists($directory);

            $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory));
            foreach ($iterator as $entry) {
                if (!$entry instanceof SplFileInfo || !$entry->isFile()) {
                    continue;
                }
                if (!in_array(strtolower($entry->getExtension()), $extensions, true)) {
                    continue;
                }
                $contents = file_get_contents($entry->getPathname());
                self::assertIsString($contents);
                $parts[] = $contents;
            }
        }

        self::assertNotEmpty($parts, 'Expected contract source files were not found.');

        return implode("\n", $parts);
    }

    private function matchingCorpus(string $relativeDirectory, string $filePattern): string
    {
        $directory = $this->chatRoot . '/' . $relativeDirectory;
        self::assertDirectoryExists($directory);
        $parts = [];

        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory)) as $entry) {
            if (!$entry instanceof SplFileInfo || !$entry->isFile()) {
                continue;
            }
            if (preg_match($filePattern, $entry->getFilename()) !== 1) {
                continue;
            }
            $contents = file_get_contents($entry->getPathname());
            self::assertIsString($contents);
            $parts[] = $contents;
        }

        self::assertNotEmpty($parts, 'No files matched ' . $filePattern . ' in ' . $relativeDirectory . '.');

        return implode("\n", $parts);
    }

    private function readRequired(string $relativePath): string
    {
        $path = $this->chatRoot . '/' . $relativePath;
        self::assertFileExists($path);
        $contents = file_get_contents($path);
        self::assertIsString($contents);

        return $contents;
    }
}
