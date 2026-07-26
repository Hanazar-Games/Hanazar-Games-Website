<?php

declare(strict_types=1);

namespace FlashPhoto;

final class Auth
{
    private const MAX_FAILURES = 5;
    private const LOCK_SECONDS = 900;
    private const CLEANUP_REFERENCE_KEY = '__flash_cleanup_reference';

    public function __construct(
        private readonly Config $config,
        private readonly Database $database,
        private readonly RateLimiter $rateLimiter,
        private readonly Logger $logger,
        private readonly ClientIdentity $identity,
        private readonly SessionCleanupRegistry $sessionRegistry
    ) {
    }

    public function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            $this->trackActiveSession();
            return;
        }
        $this->configureSession();
        if (!session_start()) {
            throw new \RuntimeException('Unable to start session.');
        }
        $this->trackActiveSession();
    }

    public function startExistingSession(): bool
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            $this->trackActiveSession();
            return true;
        }
        $this->configureSession();
        $cookieName = $this->config->string('session_name');
        $candidate = $_COOKIE[$cookieName] ?? null;
        if (!is_string($candidate) || !$this->sessionRegistry->isSessionId($candidate)) {
            return false;
        }
        $path = $this->sessionRegistry->sessionPath($candidate);
        clearstatcache(true, $path);
        $stat = @lstat($path);
        if ($stat === false || (((int) $stat['mode']) & 0170000) !== 0100000) {
            return false;
        }
        session_id($candidate);
        if (!session_start() || session_id() !== $candidate) {
            $_SESSION = [];
            if (session_status() === PHP_SESSION_ACTIVE) {
                if (!@session_destroy()) {
                    throw new \RuntimeException('Unable to destroy invalid session.');
                }
                $this->sessionRegistry->persistSessionDirectory();
            }
            session_id('');
            return false;
        }
        $this->trackActiveSession();
        return true;
    }

    private function configureSession(): void
    {
        $this->sessionRegistry->assertConfiguredHandler();
        ini_set('session.use_only_cookies', '1');
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_trans_sid', '0');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_samesite', 'Strict');
        ini_set('session.gc_probability', '0');
        $sessionLifetime = $this->config->int('session_lifetime');
        ini_set('session.gc_maxlifetime', (string) $sessionLifetime);
        session_name($this->config->string('session_name'));
        session_set_cookie_params([
            'lifetime' => $sessionLifetime,
            'path' => $this->config->string('admin_path'),
            'secure' => str_starts_with($this->config->string('app_url'), 'https://'),
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
    }

    /** @param null|callable(): void $requestValidator */
    public function login(string $username, string $password, ?callable $requestValidator = null): bool
    {
        $this->rateLimiter->consume('login', $this->identity->ipHash());
        if ($requestValidator !== null) {
            $requestValidator();
        }
        $normalized = mb_substr(trim($username), 0, 180, 'UTF-8');
        $statement = $this->database->pdo()->prepare('SELECT * FROM admins WHERE username = :username LIMIT 1');
        $statement->execute(['username' => $normalized]);
        $admin = $statement->fetch();
        $dummy = '$2y$12$1Vv5JxYj1fuM8/yJaCGQ0OzZDz.r/Q7Xb1Pz.3YwzVQkVGRS5QbEG';
        if (is_array($admin)) {
            $hash = (string) $admin['password_hash'];
        } else {
            $knownHash = $this->database->pdo()->query('SELECT password_hash FROM admins ORDER BY id LIMIT 1')->fetchColumn();
            $hash = is_string($knownHash) ? $knownHash : $dummy;
        }
        $now = time();
        $locked = is_array($admin) && $admin['locked_until'] !== null && (int) $admin['locked_until'] > $now;
        $valid = strlen($password) <= 4096 && password_verify($password, $hash);
        if (!is_array($admin) || $locked || !$valid) {
            if (is_array($admin) && !$locked) {
                $update = $this->database->pdo()->prepare(
                    'UPDATE admins SET failed_login_count = CASE
                        WHEN locked_until IS NOT NULL AND locked_until <= :now THEN 1
                        ELSE failed_login_count + 1
                     END,
                     locked_until = CASE
                        WHEN locked_until IS NOT NULL AND locked_until <= :now THEN NULL
                        WHEN failed_login_count + 1 >= :max_failures THEN :locked_until
                        ELSE locked_until
                     END
                     WHERE id = :id AND (locked_until IS NULL OR locked_until <= :now)'
                );
                $update->execute([
                    'now' => $now,
                    'max_failures' => self::MAX_FAILURES,
                    'locked_until' => $now + self::LOCK_SECONDS,
                    'id' => $admin['id'],
                ]);
            }
            $this->audit('login_failed', null, ['ip_hash' => $this->identity->ipHash()]);
            return false;
        }
        $update = $this->database->pdo()->prepare(
            'UPDATE admins SET last_login_at = :now, failed_login_count = 0, locked_until = NULL
             WHERE id = :id AND (locked_until IS NULL OR locked_until <= :now)'
        );
        $update->execute(['now' => $now, 'id' => $admin['id']]);
        if ($update->rowCount() !== 1) {
            $this->audit('login_failed', null, ['ip_hash' => $this->identity->ipHash()]);
            return false;
        }
        unset($_SESSION['admin_id'], $_SESSION['authenticated_at'], $_SESSION['last_activity_at']);
        $oldReference = $this->cleanupReference();
        if (!session_regenerate_id(true)) {
            throw new \RuntimeException('Unable to regenerate session ID.');
        }
        unset($_SESSION[self::CLEANUP_REFERENCE_KEY]);
        $this->trackActiveSession();
        if ($oldReference !== null) {
            $this->sessionRegistry->discard($oldReference);
        }
        $this->audit('admin_login', (int) $admin['id'], ['ip_hash' => $this->identity->ipHash()]);
        $_SESSION['admin_id'] = (int) $admin['id'];
        $_SESSION['authenticated_at'] = $now;
        $_SESSION['last_activity_at'] = $now;
        return true;
    }

    public function logout(): void
    {
        $reference = $this->cleanupReference();
        $adminId = $this->id();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 42000,
                'path' => $params['path'],
                'secure' => (bool) $params['secure'],
                'httponly' => true,
                'samesite' => 'Strict',
            ]);
        }
        if (!session_destroy()) {
            throw new \RuntimeException('Unable to destroy session.');
        }
        if ($reference !== null) {
            $this->sessionRegistry->discard($reference);
        } else {
            $this->sessionRegistry->persistSessionDirectory();
        }
        if ($adminId !== null) {
            $this->audit('admin_logout', $adminId);
        }
    }

    public function check(): bool
    {
        if (!isset($_SESSION['admin_id'], $_SESSION['last_activity_at'])
            || !is_int($_SESSION['admin_id'])
            || !is_int($_SESSION['last_activity_at'])) {
            return false;
        }
        if (time() - $_SESSION['last_activity_at'] > $this->config->int('session_lifetime')) {
            unset($_SESSION['admin_id'], $_SESSION['authenticated_at'], $_SESSION['last_activity_at']);
            return false;
        }
        $_SESSION['last_activity_at'] = time();
        return true;
    }

    public function id(): ?int
    {
        return $this->check() ? $_SESSION['admin_id'] : null;
    }

    public function requireAdmin(): int
    {
        $id = $this->id();
        if ($id === null) {
            throw new AuthException();
        }
        return $id;
    }

    private function trackActiveSession(): void
    {
        try {
            $reference = $this->sessionRegistry->track(
                session_id(),
                $this->cleanupReference(),
                time() + $this->config->int('session_lifetime')
            );
            $_SESSION[self::CLEANUP_REFERENCE_KEY] = $reference;
        } catch (\Throwable $exception) {
            $_SESSION = [];
            if (session_status() === PHP_SESSION_ACTIVE && @session_destroy()) {
                $this->sessionRegistry->persistSessionDirectory();
            }
            session_id('');
            throw new \RuntimeException('Unable to track session cleanup.', 0, $exception);
        }
    }

    private function cleanupReference(): ?string
    {
        $reference = $_SESSION[self::CLEANUP_REFERENCE_KEY] ?? null;
        if ($reference === null) {
            return null;
        }
        if (!is_string($reference) || preg_match('/^[a-f0-9]{64}$/D', $reference) !== 1) {
            throw new \RuntimeException('Invalid Session cleanup reference.');
        }
        return $reference;
    }

    /** @param array<string, scalar|null> $metadata */
    private function audit(string $event, ?int $adminId, array $metadata = []): void
    {
        $statement = $this->database->pdo()->prepare(
            'INSERT INTO audit_logs (event_type, admin_id, created_at, request_id, metadata_json) VALUES (:event, :admin, :created, :request, :metadata)'
        );
        $statement->execute([
            'event' => $event,
            'admin' => $adminId,
            'created' => time(),
            'request' => Response::requestId(),
            'metadata' => json_encode($metadata, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        ]);
        $this->logger->info($event, ['admin_id' => $adminId]);
    }
}
