<?php

declare(strict_types=1);

namespace FlashPhoto\Tests;

use FlashPhoto\Csrf;
use FlashPhoto\Auth;
use FlashPhoto\AuthException;
use FlashPhoto\ClientIdentity;
use FlashPhoto\Config;
use FlashPhoto\Database;
use FlashPhoto\FileStorage;
use FlashPhoto\HttpException;
use FlashPhoto\Logger;
use FlashPhoto\RateLimiter;
use FlashPhoto\RateLimitException;
use FlashPhoto\SecurityHeaders;
use FlashPhoto\ViewerIdentity;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\RunInSeparateProcess;
use RuntimeException;

final class SecurityTest extends TestCase
{
    public function testCsrfRejectsInvalidValue(): void
    {
        $_SESSION = [];
        $csrf = new Csrf();
        $token = $csrf->token();

        self::assertTrue($csrf->verify($token));
        self::assertFalse($csrf->verify('invalid'));
        try {
            $csrf->requireValid('invalid');
            self::fail('Invalid CSRF token was accepted.');
        } catch (HttpException $exception) {
            self::assertSame(403, $exception->status);
        }
    }

    public function testSecurityHeadersContainNoStoreAndStrictCsp(): void
    {
        $headers = SecurityHeaders::forPublicPage();
        self::assertSame('no-store, private, max-age=0', $headers['Cache-Control']);
        self::assertStringContainsString("default-src 'none'", $headers['Content-Security-Policy']);
        self::assertStringNotContainsString('unsafe-inline', $headers['Content-Security-Policy']);
        self::assertSame('DENY', $headers['X-Frame-Options']);
        $imageHeaders = SecurityHeaders::forImage();
        self::assertSame('no-store, private, max-age=0', $imageHeaders['Cache-Control']);
        self::assertSame('nosniff', $imageHeaders['X-Content-Type-Options']);
    }

    public function testHealthRequiresInitializedSchemaAndLogsFailures(): void
    {
        $health = file_get_contents(dirname(__DIR__) . '/public/health.php');
        self::assertIsString($health);
        self::assertStringContainsString('SchemaValidator::isCompatible($pdo)', $health);
        self::assertStringContainsString("['logger']->error('health.database_unavailable'", $health);
    }

    public function testStorageRejectsTraversalNames(): void
    {
        self::assertFalse($this->storage->isSafeStorageName('../secret'));
        self::assertFalse($this->storage->isSafeStorageName('file.php'));
        self::assertTrue($this->storage->isSafeStorageName(str_repeat('a', 48) . '.png'));
    }

    public function testStorageRemovesDanglingSymlinkWithoutFollowingIt(): void
    {
        $name = str_repeat('c', 48) . '.png';
        $path = $this->config->string('storage_path') . '/' . $name;
        if (!function_exists('symlink') || !@symlink($this->root . '/missing-target', $path)) {
            self::markTestSkipped('Symbolic links are unavailable.');
        }

        self::assertTrue($this->storage->delete($name));
        self::assertFalse(@lstat($path));
    }

    public function testStorageLogsUnsafeDeletionFailure(): void
    {
        $name = str_repeat('d', 48) . '.png';
        mkdir($this->config->string('storage_path') . '/' . $name, 0700);

        self::assertFalse($this->storage->delete($name));
        $logs = glob($this->config->string('log_path') . '/*') ?: [];
        self::assertNotSame([], $logs);
        self::assertStringContainsString('storage.delete_failed', (string) file_get_contents($logs[0]));
    }

    public function testDatabaseRejectsInsecureParentDirectory(): void
    {
        self::assertTrue(chmod(dirname($this->config->string('database_path')), 0777));
        $this->expectException(RuntimeException::class);
        new Database($this->config);
    }

    public function testDatabaseUsesPowerLossDurableSynchronousMode(): void
    {
        self::assertSame(2, (int) $this->database->pdo()->query('PRAGMA synchronous')->fetchColumn());
    }

    public function testStorageRejectsDirectoryWithoutCurrentProcessAccess(): void
    {
        if (function_exists('posix_geteuid') && posix_geteuid() === 0) {
            self::markTestSkipped('Root can bypass directory permission checks.');
        }
        $path = $this->root . '/storage/inaccessible-encrypted';
        mkdir($path, 0700);
        chmod($path, 0500);
        clearstatcache(true, $path);
        if (is_writable($path)) {
            chmod($path, 0700);
            self::markTestSkipped('The current process can bypass directory write permissions.');
        }
        $values = $this->configValues;
        $values['storage_path'] = $path;

        try {
            new FileStorage(
                Config::fromArray($values),
                new Logger($this->config, $this->cleanupQueue),
                $this->cleanupQueue
            );
            self::fail('Inaccessible storage directory was accepted.');
        } catch (RuntimeException) {
            self::assertTrue(true);
        } finally {
            chmod($path, 0700);
        }
    }

    public function testStorageRejectsInsecurePendingDirectory(): void
    {
        $path = $this->root . '/storage/pending-check';
        mkdir($path, 0700);
        mkdir($path . '/.pending', 0777);
        chmod($path . '/.pending', 0777);
        $values = $this->configValues;
        $values['storage_path'] = $path;

        $this->expectException(RuntimeException::class);
        new FileStorage(
            Config::fromArray($values),
            new Logger($this->config, $this->cleanupQueue),
            $this->cleanupQueue
        );
    }

    public function testRateLimiterRejectsDirectoryWithoutCurrentProcessAccess(): void
    {
        if (function_exists('posix_geteuid') && posix_geteuid() === 0) {
            self::markTestSkipped('Root can bypass directory permission checks.');
        }
        $path = $this->root . '/storage/inaccessible-rate-limits';
        mkdir($path, 0700);
        chmod($path, 0200);
        clearstatcache(true, $path);
        if (is_readable($path) || is_executable($path)) {
            chmod($path, 0700);
            self::markTestSkipped('The current process can bypass directory access permissions.');
        }
        $values = $this->configValues;
        $values['rate_limit_path'] = $path;

        try {
            new RateLimiter(
                Config::fromArray($values),
                new Logger($this->config, $this->cleanupQueue),
                $this->cleanupQueue
            );
            self::fail('Inaccessible rate-limit directory was accepted.');
        } catch (RuntimeException) {
            self::assertTrue(true);
        } finally {
            chmod($path, 0700);
        }
    }

    public function testBootstrapRejectsOverlappingPhysicalDirectoryAliases(): void
    {
        if (!function_exists('proc_open') || !function_exists('symlink')) {
            self::markTestSkipped('Process or symbolic-link support is unavailable.');
        }
        $physical = $this->root . '/physical-runtime';
        mkdir($physical, 0700);
        $alias = $this->root . '/runtime-alias';
        if (!@symlink($physical, $alias)) {
            self::markTestSkipped('Symbolic links are unavailable.');
        }
        $environment = $this->processEnvironment();
        $environment['STORAGE_PATH'] = $physical . '/shared';
        $environment['LOG_PATH'] = $alias . '/shared/nested';
        $pipes = [];
        $process = proc_open(
            [PHP_BINARY, '-r', 'require ' . var_export(dirname(__DIR__) . '/app/bootstrap.php', true) . ';'],
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
            dirname(__DIR__),
            $environment
        );
        self::assertIsResource($process);
        fclose($pipes[0]);
        stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        self::assertSame(78, proc_close($process));
        self::assertStringContainsString('must not overlap', (string) $stderr);
    }

    public function testPermissionCheckRejectsOverlappingPhysicalDirectoryAliases(): void
    {
        if (!function_exists('proc_open') || !function_exists('symlink')) {
            self::markTestSkipped('Process or symbolic-link support is unavailable.');
        }
        $physical = $this->root . '/permission-physical';
        mkdir($physical . '/shared/.pending', 0700, true);
        mkdir($physical . '/shared/nested', 0700);
        mkdir($physical . '/sessions', 0700);
        $alias = $this->root . '/permission-alias';
        if (!@symlink($physical, $alias)) {
            self::markTestSkipped('Symbolic links are unavailable.');
        }
        $environment = $this->processEnvironment();
        $environment['STORAGE_PATH'] = $physical . '/shared';
        $environment['LOG_PATH'] = $alias . '/shared/nested';
        $sessionPath = $physical . '/sessions';
        $pipes = [];
        $process = proc_open(
            [
                PHP_BINARY,
                '-d',
                'session.save_path=' . $sessionPath,
                dirname(__DIR__) . '/scripts/check-permissions.php',
                '--session-path=' . $sessionPath,
            ],
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
            dirname(__DIR__),
            $environment
        );
        self::assertIsResource($process);
        fclose($pipes[0]);
        stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        self::assertSame(1, proc_close($process));
        self::assertStringContainsString('must not overlap physically', (string) $stderr);
    }

    public function testPermissionCheckAcceptsExplicitSessionPathWithoutCliIniOverride(): void
    {
        if (!function_exists('proc_open')) {
            self::markTestSkipped('Process support is unavailable.');
        }
        $sessionPath = $this->root . '/storage/sessions';
        $pipes = [];
        $process = proc_open(
            [
                PHP_BINARY,
                dirname(__DIR__) . '/scripts/check-permissions.php',
                '--session-path=' . $sessionPath,
            ],
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
            dirname(__DIR__),
            $this->processEnvironment()
        );
        self::assertIsResource($process);
        fclose($pipes[0]);
        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        self::assertSame(0, proc_close($process), (string) $stdout . (string) $stderr);
        self::assertStringContainsString('[OK] session directory:', (string) $stdout);
        self::assertStringContainsString('[OK] session cleanup registry:', (string) $stdout);
    }

    public function testConfigRejectsCredentialedAppUrl(): void
    {
        $values = $this->configValues;
        $values['app_url'] = 'https://user:password@s.example.test';

        $this->expectException(InvalidArgumentException::class);
        Config::fromArray($values);
    }

    public function testConfigRejectsInvalidSessionCookieNames(): void
    {
        foreach (['123456', '__Host-flash_admin'] as $sessionName) {
            $values = $this->configValues;
            $values['session_name'] = $sessionName;

            try {
                Config::fromArray($values);
                self::fail("Invalid Session cookie name was accepted: {$sessionName}");
            } catch (InvalidArgumentException) {
                self::assertTrue(true);
            }
        }
    }

    public function testConfigRejectsFullRangeTrustedProxy(): void
    {
        $values = $this->configValues;
        $values['trusted_proxies'] = ['0.0.0.0/0'];

        $this->expectException(InvalidArgumentException::class);
        Config::fromArray($values);
    }

    public function testConfigRequiresEveryApplicationRateLimitScope(): void
    {
        foreach (['login', 'admin_session', 'redeem', 'content', 'status', 'upload', 'probe'] as $scope) {
            $values = $this->configValues;
            unset($values['rate_limits'][$scope]);

            try {
                Config::fromArray($values);
                self::fail("Missing rate-limit scope was accepted: {$scope}");
            } catch (InvalidArgumentException) {
                self::assertTrue(true);
            }
        }
    }

    public function testConfigRejectsUnknownRateLimitScope(): void
    {
        $values = $this->configValues;
        $values['rate_limits']['unknown'] = ['limit' => 1, 'window' => 60];

        $this->expectException(InvalidArgumentException::class);
        Config::fromArray($values);
    }

    public function testConfigRejectsNonNormalizedPrivatePaths(): void
    {
        $paths = [
            $this->configValues['storage_path'] . '/.',
            str_replace('/storage/', '/storage//', $this->configValues['storage_path']),
            $this->configValues['storage_path'] . '/',
        ];

        foreach ($paths as $path) {
            $values = $this->configValues;
            $values['log_path'] = $path;
            $rejected = false;
            try {
                Config::fromArray($values);
            } catch (InvalidArgumentException) {
                $rejected = true;
            }
            self::assertTrue($rejected, "Non-normalized path was accepted: {$path}");
        }
    }

    public function testConfigRejectsOverlappingRuntimePaths(): void
    {
        $cases = [
            ['rate_limit_path', $this->configValues['storage_path'] . '/.pending'],
            ['log_path', $this->configValues['storage_path'] . '/nested-logs'],
            ['log_path', dirname($this->configValues['storage_path']) . '/sessions'],
            ['database_path', $this->configValues['storage_path'] . '/database.sqlite'],
        ];

        foreach ($cases as [$key, $path]) {
            $values = $this->configValues;
            $values[$key] = $path;
            $rejected = false;
            try {
                Config::fromArray($values);
            } catch (InvalidArgumentException) {
                $rejected = true;
            }
            self::assertTrue($rejected, "Overlapping path was accepted: {$path}");
        }
    }

    public function testNginxRedirectsRejectUnknownHostsAndUseCanonicalDomain(): void
    {
        $nginx = file_get_contents(dirname(__DIR__) . '/nginx/flash-photo.conf');

        self::assertIsString($nginx);
        self::assertStringContainsString('listen 80 default_server;', $nginx);
        self::assertStringContainsString('return 301 https://s.hanazargames.com$request_uri;', $nginx);
        self::assertStringContainsString('return 308 https://s.hanazargames.com$request_uri;', $nginx);
        self::assertStringNotContainsString('https://$host$request_uri', $nginx);
        self::assertStringContainsString('expires 1h;', $nginx);
        self::assertStringNotContainsString('expires -1;', $nginx);
        self::assertStringContainsString('expires epoch;', $nginx);
        self::assertStringNotContainsString('add_header Cache-Control "no-cache"', $nginx);
        self::assertStringContainsString('location = /favicon.svg {', $nginx);

        $assetsStart = strpos($nginx, 'location ~ ^/assets/(?:app\.css|viewer\.js|admin\.js)$ {');
        self::assertIsInt($assetsStart);
        $assetsEnd = strpos($nginx, "\n    }", $assetsStart);
        self::assertIsInt($assetsEnd);
        $assetsLocation = substr($nginx, $assetsStart, $assetsEnd - $assetsStart);
        self::assertStringContainsString('expires epoch;', $assetsLocation);
        self::assertStringNotContainsString('add_header ', $assetsLocation);
    }

    public function testUninstallStopsEitherCleanupSchedulerBeforeDeletingData(): void
    {
        $readme = file_get_contents(dirname(__DIR__) . '/README.md');
        self::assertIsString($readme);

        $systemdStop = strpos($readme, 'sudo systemctl disable --now flash-photo-cleanup.timer');
        $cronStop = strpos($readme, 'sudo rm -f /etc/cron.d/flash-photo');
        $cronWait = strpos($readme, "pgrep -u www-data -f '/var/www/flash-photo/current/scripts/cleanup\\.php'");
        $dataRemoval = strpos($readme, 'sudo rm -r --one-file-system /var/lib/flash-photo');
        self::assertIsInt($systemdStop);
        self::assertIsInt($cronStop);
        self::assertIsInt($cronWait);
        self::assertIsInt($dataRemoval);
        self::assertLessThan($dataRemoval, $systemdStop);
        self::assertLessThan($dataRemoval, $cronStop);
        self::assertLessThan($dataRemoval, $cronWait);
    }

    public function testUnauthenticatedAdminIsRejected(): void
    {
        $auth = $this->auth();
        $this->expectException(AuthException::class);
        $auth->requireAdmin();
    }

    #[RunInSeparateProcess]
    public function testSessionCleanupQueueNeverStoresReplayableSessionId(): void
    {
        $auth = $this->auth();
        $auth->startSession();
        $sessionId = session_id();
        $reference = (string) $this->database->pdo()->query(
            "SELECT item_name FROM cleanup_queue WHERE category = 'session'"
        )->fetchColumn();

        self::assertMatchesRegularExpression('/^[a-f0-9]{64}$/D', $reference);
        self::assertStringNotContainsString($sessionId, $reference);
        $this->assertSensitiveValueAbsentFromDatabaseAndLogs($sessionId);
        $sidecar = $this->root . '/storage/sessions/.cleanup/' . $reference;
        self::assertSame('sess_' . $sessionId, file_get_contents($sidecar));
        self::assertSame(0600, fileperms($sidecar) & 0777);
        self::assertSame(0700, fileperms(dirname($sidecar)) & 0777);
    }

    public function testSessionCleanupQueueRejectsReplayableLegacyItemNames(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->cleanupQueue->schedule('session', 'sess_' . str_repeat('a', 32), time() + 60);
    }

    #[RunInSeparateProcess]
    public function testExistingSessionStartRejectsMissingOrRandomCookieWithoutCreatingState(): void
    {
        $_COOKIE = [];
        $auth = $this->auth();
        self::assertFalse($auth->startExistingSession());

        $_COOKIE[$this->config->string('session_name')] = str_repeat('a', 32);
        self::assertFalse($auth->startExistingSession());
        self::assertSame(PHP_SESSION_NONE, session_status());
        self::assertSame([], array_values(array_diff(
            scandir($this->root . '/storage/sessions') ?: [],
            ['.', '..', '.cleanup']
        )));
        self::assertSame(0, (int) $this->database->pdo()->query(
            "SELECT COUNT(*) FROM cleanup_queue WHERE category = 'session'"
        )->fetchColumn());
    }

    #[RunInSeparateProcess]
    public function testExistingSessionStartReopensOnlyTheExactCookieSession(): void
    {
        $auth = $this->auth();
        $auth->startSession();
        $sessionId = session_id();
        self::assertTrue(session_write_close());
        $_COOKIE[$this->config->string('session_name')] = $sessionId;

        self::assertTrue($auth->startExistingSession());
        self::assertSame($sessionId, session_id());
        self::assertSame(1, (int) $this->database->pdo()->query(
            "SELECT COUNT(*) FROM cleanup_queue WHERE category = 'session'"
        )->fetchColumn());
    }

    #[RunInSeparateProcess]
    public function testLogoutFullyRetiresUnauthenticatedSessionRegistryState(): void
    {
        $auth = $this->auth();
        $auth->startSession();
        $sessionFile = $this->root . '/storage/sessions/sess_' . session_id();
        $reference = (string) $this->database->pdo()->query(
            "SELECT item_name FROM cleanup_queue WHERE category = 'session'"
        )->fetchColumn();

        $auth->logout();

        self::assertSame(PHP_SESSION_NONE, session_status());
        self::assertFalse(@lstat($sessionFile));
        self::assertFalse(@lstat($this->root . '/storage/sessions/.cleanup/' . $reference));
        self::assertSame(0, (int) $this->database->pdo()->query(
            "SELECT COUNT(*) FROM cleanup_queue WHERE category = 'session'"
        )->fetchColumn());
    }

    public function testSessionRegistryPersistsSessionAndSidecarDirectoriesBeforeQueueRemoval(): void
    {
        $source = (string) file_get_contents(dirname(__DIR__) . '/app/SessionCleanupRegistry.php');
        $phaseTransition = strpos(
            $source,
            "transitionIfDue('session', 'session_delete', \$reference"
        );
        $sessionSync = strpos($source, 'if (!$this->syncDirectory($this->sessionDirectory)');
        $sidecarRemoval = strpos($source, '|| !$this->removeSidecar($reference)', $sessionSync);
        $queueRemoval = strpos(
            $source,
            "\$this->cleanupQueue->removeIfDue('session_delete', \$reference",
            $sidecarRemoval
        );

        self::assertIsInt($phaseTransition);
        self::assertIsInt($sessionSync);
        self::assertIsInt($sidecarRemoval);
        self::assertIsInt($queueRemoval);
        self::assertLessThan($sessionSync, $phaseTransition);
        self::assertLessThan($sidecarRemoval, $sessionSync);
        self::assertLessThan($queueRemoval, $sidecarRemoval);
        self::assertStringContainsString('return $this->syncDirectory($this->sidecarDirectory);', $source);
        self::assertStringContainsString('&& @fsync($handle);', $source);

        $auth = (string) file_get_contents(dirname(__DIR__) . '/app/Auth.php');
        $destroy = strpos($auth, 'if (!session_destroy())');
        $discard = strpos($auth, '$this->sessionRegistry->discard($reference);', $destroy);
        self::assertIsInt($destroy);
        self::assertIsInt($discard);
        self::assertLessThan($discard, $destroy);
    }

    #[RunInSeparateProcess]
    public function testExpiredSessionKeepsCleanupReferenceUntilLogout(): void
    {
        $auth = $this->auth();
        $auth->startSession();
        $sessionFile = $this->root . '/storage/sessions/sess_' . session_id();
        $reference = (string) $this->database->pdo()->query(
            "SELECT item_name FROM cleanup_queue WHERE category = 'session'"
        )->fetchColumn();
        $_SESSION['admin_id'] = 1;
        $_SESSION['last_activity_at'] = time() - $this->config->int('session_lifetime') - 1;

        self::assertFalse($auth->check());
        $auth->logout();

        self::assertFalse(@lstat($sessionFile));
        self::assertFalse(@lstat($this->root . '/storage/sessions/.cleanup/' . $reference));
        self::assertNull($this->cleanupQueue->currentDue('session', $reference));
    }

    #[RunInSeparateProcess]
    public function testLoginRegeneratesSessionIdAndUsesPasswordHash(): void
    {
        $hash = defined('PASSWORD_ARGON2ID')
            ? password_hash('correct horse battery staple', PASSWORD_ARGON2ID)
            : password_hash('correct horse battery staple', PASSWORD_DEFAULT);
        $statement = $this->database->pdo()->prepare(
            'INSERT INTO admins (username, password_hash, created_at) VALUES (:username, :hash, :created)'
        );
        $statement->execute(['username' => 'admin', 'hash' => $hash, 'created' => time()]);
        $auth = $this->auth();
        $auth->startSession();
        self::assertSame(PHP_SESSION_ACTIVE, session_status());
        $before = session_id();
        $oldReference = (string) $this->database->pdo()->query(
            "SELECT item_name FROM cleanup_queue WHERE category = 'session'"
        )->fetchColumn();

        self::assertTrue($auth->login('admin', 'correct horse battery staple'));
        self::assertNotSame($before, session_id());
        self::assertFalse(@lstat($this->root . '/storage/sessions/.cleanup/' . $oldReference));
        self::assertSame(1, (int) $this->database->pdo()->query(
            "SELECT COUNT(*) FROM cleanup_queue WHERE category = 'session'"
        )->fetchColumn());
        $this->assertSensitiveValueAbsentFromDatabaseAndLogs($before);
        $this->assertSensitiveValueAbsentFromDatabaseAndLogs(session_id());
        self::assertTrue($auth->check());
    }

    #[RunInSeparateProcess]
    public function testLoginAuditFailureLeavesNoAuthenticatedSession(): void
    {
        $hash = password_hash('correct horse battery staple', PASSWORD_DEFAULT);
        $statement = $this->database->pdo()->prepare(
            'INSERT INTO admins (username, password_hash, created_at) VALUES (:username, :hash, :created)'
        );
        $statement->execute(['username' => 'admin', 'hash' => $hash, 'created' => time()]);
        $this->database->pdo()->exec(
            "CREATE TRIGGER reject_admin_login_audit
             BEFORE INSERT ON audit_logs
             WHEN NEW.event_type = 'admin_login'
             BEGIN
                 SELECT RAISE(FAIL, 'audit unavailable');
             END"
        );
        $auth = $this->auth();
        $auth->startSession();
        $before = session_id();
        $oldReference = (string) $this->database->pdo()->query(
            "SELECT item_name FROM cleanup_queue WHERE category = 'session'"
        )->fetchColumn();
        $_SESSION['admin_id'] = 999;
        $_SESSION['authenticated_at'] = time();
        $_SESSION['last_activity_at'] = time();

        try {
            $auth->login('admin', 'correct horse battery staple');
            self::fail('Login succeeded without a persisted audit record.');
        } catch (\PDOException) {
            self::assertFalse($auth->check());
            self::assertArrayNotHasKey('admin_id', $_SESSION);
            self::assertArrayNotHasKey('authenticated_at', $_SESSION);
            self::assertArrayNotHasKey('last_activity_at', $_SESSION);
            self::assertNotSame($before, session_id());
            self::assertFalse(@lstat($this->root . '/storage/sessions/.cleanup/' . $oldReference));
            self::assertSame(1, (int) $this->database->pdo()->query(
                "SELECT COUNT(*) FROM cleanup_queue WHERE category = 'session'"
            )->fetchColumn());

            $failedSessionId = session_id();
            self::assertTrue(session_write_close());
            $_COOKIE[$this->config->string('session_name')] = $failedSessionId;
            $reloaded = $this->auth();
            self::assertTrue($reloaded->startExistingSession());
            self::assertFalse($reloaded->check());
        }
    }

    public function testRepeatedLoginFailuresLockAccount(): void
    {
        $hash = password_hash('secret-value', PASSWORD_DEFAULT);
        $statement = $this->database->pdo()->prepare(
            'INSERT INTO admins (username, password_hash, created_at) VALUES (:username, :hash, :created)'
        );
        $statement->execute(['username' => 'locked', 'hash' => $hash, 'created' => time()]);
        $auth = $this->auth();
        for ($attempt = 0; $attempt < 5; $attempt++) {
            self::assertFalse($auth->login('locked', 'wrong-value'));
        }
        $row = $this->database->pdo()->query("SELECT failed_login_count, locked_until FROM admins WHERE username = 'locked'")->fetch();
        self::assertSame(5, (int) $row['failed_login_count']);
        self::assertGreaterThan(time(), (int) $row['locked_until']);
    }

    public function testActiveLockIsFixedAndExpiredLockStartsANewFailureSequence(): void
    {
        $hash = password_hash('correct-value', PASSWORD_DEFAULT);
        $statement = $this->database->pdo()->prepare(
            'INSERT INTO admins (username, password_hash, created_at) VALUES (:username, :hash, :created)'
        );
        $statement->execute(['username' => 'fixed-lock', 'hash' => $hash, 'created' => time()]);
        $auth = $this->auth();
        for ($attempt = 0; $attempt < 5; $attempt++) {
            self::assertFalse($auth->login('fixed-lock', 'wrong-value'));
        }

        $fixedUntil = time() + 600;
        $this->database->pdo()->exec("UPDATE admins SET locked_until = {$fixedUntil} WHERE username = 'fixed-lock'");
        self::assertFalse($auth->login('fixed-lock', 'correct-value'));
        $locked = $this->database->pdo()->query(
            "SELECT failed_login_count, locked_until FROM admins WHERE username = 'fixed-lock'"
        )->fetch();
        self::assertSame(5, (int) $locked['failed_login_count']);
        self::assertSame($fixedUntil, (int) $locked['locked_until']);

        $expiredAt = time() - 1;
        $this->database->pdo()->exec(
            "UPDATE admins SET failed_login_count = 5, locked_until = {$expiredAt} WHERE username = 'fixed-lock'"
        );
        self::assertFalse($auth->login('fixed-lock', 'wrong-value'));
        $expired = $this->database->pdo()->query(
            "SELECT failed_login_count, locked_until FROM admins WHERE username = 'fixed-lock'"
        )->fetch();
        self::assertSame(1, (int) $expired['failed_login_count']);
        self::assertNull($expired['locked_until']);
    }

    public function testLoginUsesIpRateLimit(): void
    {
        $auth = $this->auth();
        for ($attempt = 0; $attempt < 10; $attempt++) {
            self::assertFalse($auth->login('missing', 'wrong-value'));
        }

        $this->expectException(RateLimitException::class);
        $auth->login('missing', 'wrong-value');
    }

    public function testLoginRequestValidationRunsAfterIpRateLimit(): void
    {
        $auth = $this->auth();
        $validated = 0;
        for ($attempt = 0; $attempt < 10; $attempt++) {
            try {
                $auth->login('missing', 'wrong-value', static function () use (&$validated): void {
                    $validated++;
                    throw new HttpException(403, 'CSRF verification failed.');
                });
                self::fail('Invalid request validation unexpectedly passed.');
            } catch (HttpException $exception) {
                self::assertSame(403, $exception->status);
            }
        }

        try {
            $auth->login('missing', 'wrong-value', static function () use (&$validated): void {
                $validated++;
            });
            self::fail('Login request rate limit was not enforced.');
        } catch (RateLimitException) {
            self::assertSame(10, $validated);
        }
    }

    #[RunInSeparateProcess]
    public function testViewerCookieIsStoredOnlyWhenExplicitlyRemembered(): void
    {
        $_COOKIE = [];
        $viewer = new ViewerIdentity($this->config);
        $token = str_repeat('a', 43);
        $candidate = str_repeat('b', 64);

        self::assertSame($candidate, $viewer->id($token, $candidate));
        self::assertSame([], $_COOKIE);
        $viewer->remember($token, $candidate);
        self::assertCount(1, $_COOKIE);
        self::assertSame($candidate, $viewer->id($token, str_repeat('c', 64)));

        $otherToken = str_repeat('d', 43);
        self::assertSame(str_repeat('c', 64), $viewer->id($otherToken, str_repeat('c', 64)));
    }

    public function testFileRateLimiterWorksAcrossInstances(): void
    {
        $logger = new Logger($this->config, $this->cleanupQueue);
        (new RateLimiter($this->config, $logger, $this->cleanupQueue))->consume('probe', 'same-client');
        (new RateLimiter($this->config, $logger, $this->cleanupQueue))->consume('probe', 'same-client');
        $this->expectException(RateLimitException::class);
        (new RateLimiter($this->config, $logger, $this->cleanupQueue))->consume('probe', 'same-client');
    }

    public function testRateLimiterFailsClosedForUndefinedScope(): void
    {
        $this->expectException(RuntimeException::class);
        (new RateLimiter(
            $this->config,
            new Logger($this->config, $this->cleanupQueue),
            $this->cleanupQueue
        ))->consume('unknown', 'same-client');
    }

    public function testLoggerReportsJsonEncodingFailureToFallbackChannel(): void
    {
        $fallback = $this->root . '/logger-fallback.log';
        $previous = ini_set('error_log', $fallback);
        try {
            (new Logger($this->config, $this->cleanupQueue))->info('encoding-test', ['invalid_number' => NAN]);
            self::assertStringContainsString('reason=encode_failed', (string) file_get_contents($fallback));
        } finally {
            if (is_string($previous)) {
                ini_set('error_log', $previous);
            }
        }
    }

    private function auth(): Auth
    {
        $_SERVER['REMOTE_ADDR'] = '192.0.2.10';
        $logger = new Logger($this->config, $this->cleanupQueue);
        $identity = new ClientIdentity($this->config);
        return new Auth(
            $this->config,
            $this->database,
            new RateLimiter($this->config, $logger, $this->cleanupQueue),
            $logger,
            $identity,
            $this->sessionRegistry
        );
    }

    private function assertSensitiveValueAbsentFromDatabaseAndLogs(string $value): void
    {
        foreach (glob($this->config->string('database_path') . '*') ?: [] as $path) {
            self::assertStringNotContainsString($value, (string) file_get_contents($path), $path);
        }
        foreach (glob($this->config->string('log_path') . '/*.log') ?: [] as $path) {
            self::assertStringNotContainsString($value, (string) file_get_contents($path), $path);
        }
    }
}
