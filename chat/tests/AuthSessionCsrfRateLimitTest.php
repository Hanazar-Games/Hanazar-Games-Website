<?php

declare(strict_types=1);

namespace Hanazar\Chat\Tests;

use Hanazar\Chat\AuditLogger;
use Hanazar\Chat\Auth;
use Hanazar\Chat\AuthContext;
use Hanazar\Chat\Config;
use Hanazar\Chat\Csrf;
use Hanazar\Chat\HttpException;
use Hanazar\Chat\RateLimiter;
use Hanazar\Chat\RateLimitException;
use Hanazar\Chat\SessionManager;

final class AuthSessionCsrfRateLimitTest extends TestCase
{
    private const PASSWORD = 'Str0ng-Test-Pass!';
    private const NOW = 2_000_000_000;

    /** @var array<string, mixed> */
    private array $sessionState = [];
    private RateLimiter $rateLimiter;
    private SessionManager $sessions;
    private Auth $auth;
    private Csrf $csrf;

    protected function setUp(): void
    {
        parent::setUp();

        $this->rateLimiter = new RateLimiter($this->config);
        $this->sessions = new SessionManager($this->config, $this->sessionState);
        $this->auth = new Auth(
            $this->database,
            $this->rateLimiter,
            $this->sessions,
            new AuditLogger($this->database),
            $this->config,
        );
        $this->csrf = new Csrf($this->sessions);
    }

    public function testUserPasswordsAreStoredAsStrongOneWayHashes(): void
    {
        $user = $this->createUser(password: self::PASSWORD);
        $statement = $this->database->connection()->prepare(
            'SELECT password_hash FROM users WHERE id = :id',
        );
        $statement->execute(['id' => $user['id']]);
        $hash = $statement->fetchColumn();

        self::assertIsString($hash);
        self::assertNotSame(self::PASSWORD, $hash);
        self::assertGreaterThanOrEqual(60, strlen($hash));
        self::assertTrue(password_verify(self::PASSWORD, $hash));
        self::assertNotSame('unknown', password_get_info($hash)['algoName']);
    }

    public function testUnknownUserAndWrongPasswordHaveUniformPublicFailure(): void
    {
        $user = $this->createUser(username: 'known_user');

        $unknown = $this->loginFailure('missing_user', self::PASSWORD, $this->ipHash('uniform-a'));
        $wrong = $this->loginFailure(
            (string) $user['username'],
            'Definitely-Wrong-Pass!',
            $this->ipHash('uniform-b'),
        );

        self::assertSame([401, 'invalid_credentials'], $unknown);
        self::assertSame($unknown, $wrong);
    }

    public function testRepeatedFailuresLockTheAccountEvenFromDifferentIps(): void
    {
        $user = $this->createUser(username: 'lock_target');
        $locked = false;

        for ($attempt = 1; $attempt <= 20; $attempt++) {
            $failure = $this->loginFailure(
                (string) $user['username'],
                'Definitely-Wrong-Pass!',
                $this->ipHash('account-attempt-' . $attempt),
                self::NOW + $attempt,
            );

            self::assertSame([401, 'invalid_credentials'], $failure);
            if ($this->lockedUntil((int) $user['id']) > self::NOW + $attempt) {
                $locked = true;
                break;
            }
        }

        self::assertTrue($locked, 'The account did not lock after repeated failures.');
        self::assertSame(
            [401, 'invalid_credentials'],
            $this->loginFailure(
                (string) $user['username'],
                self::PASSWORD,
                $this->ipHash('account-correct-password'),
                self::NOW + 21,
            ),
        );
    }

    public function testLoginIpLimitCannotBeAvoidedWithDifferentUsernames(): void
    {
        $ipHash = $this->ipHash('shared-login-ip');
        $limited = null;

        for ($attempt = 1; $attempt <= 100; $attempt++) {
            try {
                $this->auth->login(
                    'missing_' . $attempt,
                    'Definitely-Wrong-Pass!',
                    $ipHash,
                    self::NOW,
                );
            } catch (RateLimitException $exception) {
                $limited = $exception;
                break;
            } catch (HttpException $exception) {
                self::assertSame(401, $exception->status);
                self::assertSame('invalid_credentials', $exception->errorCode);
            }
        }

        self::assertInstanceOf(RateLimitException::class, $limited);
        self::assertGreaterThanOrEqual(1, $limited->retryAfter());
    }

    public function testLoginRegeneratesSessionAndLogoutInvalidatesIt(): void
    {
        $user = $this->createUser(username: 'session_user');
        $this->csrf->token();
        $anonymousId = $this->sessions->id();

        $context = $this->auth->login(
            (string) $user['username'],
            self::PASSWORD,
            $this->ipHash('session-login'),
            self::NOW,
        );

        self::assertInstanceOf(AuthContext::class, $context);
        self::assertSame((int) $user['id'], $context->userId());
        self::assertNotSame($anonymousId, $this->sessions->id());
        self::assertSame((int) $user['id'], $this->auth->validate(self::NOW + 1)->userId());

        $authenticatedId = $this->sessions->id();
        $this->auth->logout();
        self::assertNotSame($authenticatedId, $this->sessions->id());
        self::assertSame([401, 'session_invalid'], $this->validationFailure($this->auth));
    }

    public function testIdleAndAbsoluteSessionDeadlinesAreBothEnforced(): void
    {
        $user = $this->createUser(username: 'expiry_user');
        $config = $this->configWithSessionDeadlines(10, 30);

        [$idleAuth] = $this->authBundle($config);
        $idleAuth->login(
            (string) $user['username'],
            self::PASSWORD,
            $this->ipHash('idle-login'),
            self::NOW,
        );
        self::assertSame((int) $user['id'], $idleAuth->validate(self::NOW + 9)->userId());
        self::assertSame(
            [401, 'session_expired'],
            $this->validationFailure($idleAuth, self::NOW + 20),
        );

        [$absoluteAuth] = $this->authBundle($config);
        $absoluteAuth->login(
            (string) $user['username'],
            self::PASSWORD,
            $this->ipHash('absolute-login'),
            self::NOW,
        );
        foreach ([9, 18, 27] as $offset) {
            self::assertSame(
                (int) $user['id'],
                $absoluteAuth->validate(self::NOW + $offset)->userId(),
            );
        }
        self::assertSame(
            [401, 'session_expired'],
            $this->validationFailure($absoluteAuth, self::NOW + 31),
        );
    }

    public function testDisabledStatusAndAuthVersionImmediatelyInvalidateSessions(): void
    {
        $user = $this->createUser(username: 'revoked_user');
        $this->auth->login(
            (string) $user['username'],
            self::PASSWORD,
            $this->ipHash('disabled-login'),
            self::NOW,
        );
        $this->updateUser((int) $user['id'], "status = 'disabled'");

        self::assertSame([401, 'session_invalid'], $this->validationFailure($this->auth));

        $this->updateUser((int) $user['id'], "status = 'active'");
        [$versionAuth] = $this->authBundle($this->config);
        $versionAuth->login(
            (string) $user['username'],
            self::PASSWORD,
            $this->ipHash('version-login'),
            self::NOW,
        );
        $this->updateUser((int) $user['id'], 'auth_version = auth_version + 1');

        self::assertSame([401, 'session_invalid'], $this->validationFailure($versionAuth));
    }

    public function testCsrfTokensRotateAcrossLoginAndRejectAfterLogout(): void
    {
        $user = $this->createUser(username: 'csrf_user');
        $loginToken = $this->csrf->token();
        self::assertTrue($this->csrf->validate($loginToken));
        self::assertFalse($this->csrf->validate(null));
        self::assertFalse($this->csrf->validate('not-a-token'));

        $this->auth->login(
            (string) $user['username'],
            self::PASSWORD,
            $this->ipHash('csrf-login'),
            self::NOW,
        );
        self::assertFalse($this->csrf->validate($loginToken));

        $apiToken = $this->csrf->token();
        self::assertTrue($this->csrf->validate($apiToken));
        $logoutToken = $this->csrf->rotate();
        self::assertFalse($this->csrf->validate($apiToken));
        self::assertTrue($this->csrf->validate($logoutToken));

        $this->auth->logout();
        self::assertFalse($this->csrf->validate($logoutToken));
    }

    public function testRateLimitStateIsSharedAndProvidesRetryAfter(): void
    {
        $first = new RateLimiter($this->config);
        $second = new RateLimiter($this->config);
        $identifier = 'persistent-shared-state';

        $first->consume('login_ip', $identifier, self::NOW);
        $remainingAccepted = 0;
        $limited = null;

        for ($attempt = 1; $attempt <= 100; $attempt++) {
            try {
                $second->consume('login_ip', $identifier, self::NOW);
                $remainingAccepted++;
            } catch (RateLimitException $exception) {
                $limited = $exception;
                break;
            }
        }

        self::assertInstanceOf(RateLimitException::class, $limited);
        self::assertGreaterThanOrEqual(1, $limited->retryAfter());

        $freshAccepted = $this->acceptedBeforeLimit(
            new RateLimiter($this->config),
            'fresh-persistent-state',
        );
        self::assertSame($freshAccepted - 1, $remainingAccepted);
    }

    /** @return array{0: Auth, 1: SessionManager, 2: Csrf} */
    private function authBundle(Config $config): array
    {
        $state = [];
        $sessions = new SessionManager($config, $state);
        $auth = new Auth(
            $this->database,
            new RateLimiter($config),
            $sessions,
            new AuditLogger($this->database),
            $config,
        );

        return [$auth, $sessions, new Csrf($sessions)];
    }

    private function configWithSessionDeadlines(int $idleSeconds, int $absoluteSeconds): Config
    {
        $values = $this->validConfigValues();
        $values['SESSION_IDLE_SECONDS'] = (string) $idleSeconds;
        $values['SESSION_ABSOLUTE_SECONDS'] = (string) $absoluteSeconds;

        return Config::fromArray($values);
    }

    /** @return array{int, string} */
    private function loginFailure(
        string $username,
        string $password,
        string $ipHash,
        int $now = self::NOW,
    ): array {
        try {
            $this->auth->login($username, $password, $ipHash, $now);
            self::fail('Login unexpectedly succeeded.');
        } catch (HttpException $exception) {
            return [$exception->status, $exception->errorCode];
        }
    }

    /** @return array{int, string} */
    private function validationFailure(Auth $auth, int $now = self::NOW + 1): array
    {
        try {
            $auth->validate($now);
            self::fail('Session unexpectedly remained valid.');
        } catch (HttpException $exception) {
            return [$exception->status, $exception->errorCode];
        }
    }

    private function acceptedBeforeLimit(RateLimiter $limiter, string $identifier): int
    {
        $accepted = 0;

        for ($attempt = 1; $attempt <= 100; $attempt++) {
            try {
                $limiter->consume('login_ip', $identifier, self::NOW);
                $accepted++;
            } catch (RateLimitException) {
                return $accepted;
            }
        }

        self::fail('Configured rate limit was not reached.');
    }

    private function updateUser(int $userId, string $assignment): void
    {
        $this->database->connection()->exec(
            'UPDATE users SET ' . $assignment . ' WHERE id = ' . $userId,
        );
    }

    private function lockedUntil(int $userId): int
    {
        $statement = $this->database->connection()->prepare(
            'SELECT locked_until FROM users WHERE id = :id',
        );
        $statement->execute(['id' => $userId]);

        return (int) $statement->fetchColumn();
    }

    private function ipHash(string $value): string
    {
        return hash('sha256', $value);
    }
}
