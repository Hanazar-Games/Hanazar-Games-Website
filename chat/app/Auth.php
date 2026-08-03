<?php

declare(strict_types=1);

namespace Hanazar\Chat;

use PDO;

final class Auth
{
    private const DUMMY_HASH = '$2y$12$cwb5oNCyMhUwgphMryXPuOnrNaQpqM8OkbwSiQIvMuV4hHlV50i7K';

    public function __construct(
        private readonly Database $database,
        private readonly RateLimiter $rateLimiter,
        private readonly SessionManager $sessions,
        private readonly AuditLogger $audit,
        private readonly Config $config,
    ) {
    }

    public function login(string $username, string $password, string $ipHash, ?int $now = null): AuthContext
    {
        $now ??= time();
        $this->rateLimiter->consume('login_ip', $ipHash, $now);
        $statement = $this->database->connection()->prepare('SELECT * FROM users WHERE username = :username COLLATE NOCASE');
        $statement->execute(['username' => trim($username)]);
        $user = $statement->fetch(PDO::FETCH_ASSOC);
        $valid = is_array($user)
            && (string) $user['status'] === 'active'
            && (int) ($user['locked_until'] ?? 0) <= $now
            && password_verify($password, (string) $user['password_hash']);

        if (!$valid) {
            if (!is_array($user)) {
                password_verify($password, self::DUMMY_HASH);
            } else {
                $failures = (int) $user['failed_login_count'] + 1;
                $lockedUntil = $failures >= 5 ? $now + min(3600, 30 * (2 ** min(6, $failures - 5))) : null;
                $update = $this->database->connection()->prepare(
                    'UPDATE users SET failed_login_count = :failures, locked_until = :locked_until, updated_at = :now WHERE id = :id',
                );
                $update->execute(['failures' => $failures, 'locked_until' => $lockedUntil, 'now' => $now, 'id' => $user['id']]);
            }
            $this->audit->write('auth.login_failed', is_array($user) ? (int) $user['id'] : null, $ipHash, $now);
            throw new HttpException(401, 'invalid_credentials', 'Invalid username or password.');
        }

        $update = $this->database->connection()->prepare(
            'UPDATE users SET failed_login_count = 0, locked_until = NULL, updated_at = :now WHERE id = :id',
        );
        $update->execute(['now' => $now, 'id' => $user['id']]);
        $this->sessions->regenerate(true);
        $this->sessions->set('user_id', (int) $user['id']);
        $this->sessions->set('auth_version', (int) $user['auth_version']);
        $this->sessions->set('created_at', $now);
        $this->sessions->set('last_seen_at', $now);
        $this->audit->write('auth.login', (int) $user['id'], $ipHash, $now);

        return new AuthContext((int) $user['id'], (string) $user['system_role'], (int) $user['auth_version']);
    }

    public function validate(?int $now = null): AuthContext
    {
        $now ??= time();
        $userId = $this->sessions->get('user_id');
        if (!is_int($userId)) {
            throw new HttpException(401, 'session_invalid', 'Authentication required.');
        }
        $created = (int) $this->sessions->get('created_at');
        $lastSeen = (int) $this->sessions->get('last_seen_at');
        if ($created + $this->config->sessionAbsoluteSeconds() < $now
            || $lastSeen + $this->config->sessionIdleSeconds() < $now
        ) {
            $this->sessions->destroy();
            throw new HttpException(401, 'session_expired', 'Session expired.');
        }

        $statement = $this->database->connection()->prepare(
            'SELECT system_role, status, auth_version FROM users WHERE id = :id',
        );
        $statement->execute(['id' => $userId]);
        $user = $statement->fetch(PDO::FETCH_ASSOC);
        if (!is_array($user)
            || $user['status'] !== 'active'
            || (int) $user['auth_version'] !== (int) $this->sessions->get('auth_version')
        ) {
            $this->sessions->destroy();
            throw new HttpException(401, 'session_invalid', 'Authentication required.');
        }
        $this->sessions->set('last_seen_at', $now);
        return new AuthContext($userId, (string) $user['system_role'], (int) $user['auth_version']);
    }

    public function logout(): void
    {
        $userId = $this->sessions->get('user_id');
        $this->sessions->destroy();
        $this->audit->write('auth.logout', is_int($userId) ? $userId : null);
    }
}
