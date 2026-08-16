<?php

declare(strict_types=1);

namespace Hanazar\Chat\Tests;

use Hanazar\Chat\ClientIdentity;
use Hanazar\Chat\Config;
use Hanazar\Chat\Database;
use Hanazar\Chat\SchemaValidator;
use Hanazar\Chat\SecurityHeaders;
use InvalidArgumentException;
use PDO;
use RuntimeException;

final class DatabaseConfigSecurityTest extends TestCase
{
    public function testConfigExposesCanonicalValidatedValues(): void
    {
        self::assertSame('https://chat.example.test', $this->config->appOrigin());
        self::assertSame('chat.example.test', $this->config->appHost());
        self::assertSame(dirname(__DIR__) . '/public', $this->config->publicRoot());
        self::assertSame($this->runtimeRoot . '/data/chat.sqlite', $this->config->databasePath());
        self::assertSame($this->runtimeRoot . '/sessions', $this->config->sessionPath());
        self::assertSame($this->runtimeRoot . '/logs', $this->config->logPath());
        self::assertSame($this->runtimeRoot . '/rate-limits', $this->config->rateLimitPath());
        self::assertSame($this->runtimeRoot . '/backups', $this->config->backupPath());
        self::assertSame(['127.0.0.1', '::1', '10.0.0.0/8'], $this->config->trustedProxies());
        self::assertSame(
            ['https://hanazar-games.github.io', 'https://hanazargames.com'],
            $this->config->shareOrigins(),
        );
    }

    public function testConfigRejectsRelativeOrPublicRuntimePaths(): void
    {
        $relative = $this->validConfigValues();
        $relative['DB_PATH'] = 'storage/chat.sqlite';

        try {
            Config::fromArray($relative);
            self::fail('A relative database path must be rejected.');
        } catch (InvalidArgumentException) {
        }

        $public = $this->validConfigValues();
        $public['DB_PATH'] = $public['PUBLIC_ROOT'] . '/chat.sqlite';

        $this->expectException(InvalidArgumentException::class);
        Config::fromArray($public);
    }

    public function testConfigNormalizesPathsBeforeCheckingPublicRootIsolation(): void
    {
        $values = $this->validConfigValues();
        $values['DB_PATH'] = dirname($values['PUBLIC_ROOT']) . '/shared/../public/chat.sqlite';

        $this->expectException(InvalidArgumentException::class);
        Config::fromArray($values);
    }

    public function testConfigRejectsWeakOrMalformedSecrets(): void
    {
        foreach (['change-me', 'base64:not-valid!', 'base64:' . base64_encode('too short')] as $secret) {
            $values = $this->validConfigValues();
            $values['APP_KEY'] = $secret;

            try {
                Config::fromArray($values);
                self::fail('An unsafe application key must be rejected.');
            } catch (InvalidArgumentException) {
            }
        }

        self::addToAssertionCount(1);
    }

    public function testConfigRejectsUnsafeOrMismatchedOrigins(): void
    {
        foreach (
            [
                'http://chat.example.test',
                'https://user@chat.example.test',
                'https://chat.example.test/path',
                'https://other.example.test',
            ] as $origin
        ) {
            $values = $this->validConfigValues();
            $values['APP_ORIGIN'] = $origin;

            try {
                Config::fromArray($values);
                self::fail('An unsafe application origin must be rejected.');
            } catch (InvalidArgumentException) {
            }
        }

        self::addToAssertionCount(1);
    }

    public function testConfigRejectsUnsafeShareOrigins(): void
    {
        foreach (
            [
                '*',
                'http://hanazar-games.github.io',
                'https://user@hanazargames.com',
                'https://hanazargames.com/chat',
                'https://*.hanazargames.com',
            ] as $origin
        ) {
            $values = $this->validConfigValues();
            $values['SHARE_ORIGINS'] = $origin;

            try {
                Config::fromArray($values);
                self::fail('An unsafe share origin must be rejected.');
            } catch (InvalidArgumentException) {
            }
        }

        self::addToAssertionCount(1);
    }

    public function testDatabaseInitializesRequiredPragmasAndSchemaIdempotently(): void
    {
        $pdo = $this->database->connection();

        self::assertSame('wal', strtolower((string) $pdo->query('PRAGMA journal_mode')->fetchColumn()));
        self::assertSame(1, (int) $pdo->query('PRAGMA foreign_keys')->fetchColumn());
        self::assertGreaterThanOrEqual(1000, (int) $pdo->query('PRAGMA busy_timeout')->fetchColumn());

        $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type = 'table'")->fetchAll(PDO::FETCH_COLUMN);
        foreach (
            [
                'app_meta',
                'users',
                'rooms',
                'room_members',
                'messages',
                'user_events',
                'user_presence',
                'typing_indicators',
                'audit_logs',
                'ephemeral_shares',
                'public_feedback',
            ] as $table
        ) {
            self::assertContains($table, $tables);
        }

        $before = (string) $pdo->query("SELECT value FROM app_meta WHERE key = 'schema_version'")->fetchColumn();
        $this->database->initialize();
        $after = (string) $pdo->query("SELECT value FROM app_meta WHERE key = 'schema_version'")->fetchColumn();
        self::assertSame($before, $after);
    }

    public function testSchemaHasCriticalUniquePartialAndLookupIndexes(): void
    {
        $rows = $this->database->connection()
            ->query("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL")
            ->fetchAll(PDO::FETCH_KEY_PAIR);

        foreach (
            [
                'idx_rooms_dm_pair_unique',
                'idx_room_members_active_user',
                'idx_room_members_active_owner',
                'idx_messages_sender_nonce_unique',
                'idx_messages_room_id',
                'idx_user_events_user_id',
                'idx_ephemeral_shares_expires_at',
                'idx_public_feedback_publish',
                'idx_public_feedback_duplicate',
            ] as $index
        ) {
            self::assertArrayHasKey($index, $rows);
        }

        self::assertStringContainsString('WHERE', strtoupper((string) $rows['idx_rooms_dm_pair_unique']));
        self::assertStringContainsString('WHERE', strtoupper((string) $rows['idx_room_members_active_owner']));
        self::assertStringContainsString('UNIQUE', strtoupper((string) $rows['idx_messages_sender_nonce_unique']));
    }

    public function testSchemaForeignKeysAreEnabledAndValid(): void
    {
        $pdo = $this->database->connection();

        foreach (['room_members', 'messages', 'user_events'] as $table) {
            self::assertNotEmpty($pdo->query('PRAGMA foreign_key_list(' . $table . ')')->fetchAll(PDO::FETCH_ASSOC));
        }

        self::assertSame([], $pdo->query('PRAGMA foreign_key_check')->fetchAll(PDO::FETCH_ASSOC));
        (new SchemaValidator())->validate($pdo);
    }

    public function testSchemaValidatorRejectsAnUnrelatedDatabase(): void
    {
        $path = $this->runtimeRoot . '/data/unrelated.sqlite';
        $pdo = new PDO('sqlite:' . $path, options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $pdo->exec('CREATE TABLE unrelated_payload (id INTEGER PRIMARY KEY)');

        $this->expectException(RuntimeException::class);
        (new SchemaValidator())->assertKnownDatabase($pdo);
    }

    public function testImmediateTransactionRollsBackOnFailure(): void
    {
        try {
            $this->database->immediate(function (PDO $pdo): never {
                $pdo->exec("INSERT INTO app_meta (key, value) VALUES ('rollback_probe', 'present')");
                throw new RuntimeException('probe');
            });
            self::fail('The callback exception must escape the transaction.');
        } catch (RuntimeException $exception) {
            self::assertSame('probe', $exception->getMessage());
        }

        self::assertFalse($this->database->connection()->inTransaction());
        self::assertFalse(
            (bool) $this->database->connection()
                ->query("SELECT 1 FROM app_meta WHERE key = 'rollback_probe'")
                ->fetchColumn(),
        );
    }

    public function testSecurityHeadersForHtmlAreRestrictive(): void
    {
        $headers = SecurityHeaders::html(true);

        self::assertSame('nosniff', $headers['X-Content-Type-Options']);
        self::assertSame('DENY', $headers['X-Frame-Options']);
        self::assertSame('no-referrer', $headers['Referrer-Policy']);
        self::assertSame('no-store', $headers['Cache-Control']);
        self::assertArrayHasKey('Strict-Transport-Security', $headers);
        self::assertStringContainsString("default-src 'self'", $headers['Content-Security-Policy']);
        self::assertStringContainsString("object-src 'none'", $headers['Content-Security-Policy']);
        self::assertStringNotContainsString("'unsafe-inline'", $headers['Content-Security-Policy']);
        self::assertArrayNotHasKey('Strict-Transport-Security', SecurityHeaders::html(false));
        self::assertSame('application/json; charset=utf-8', SecurityHeaders::json(true)['Content-Type']);
    }

    public function testUntrustedPeerCannotSpoofForwardedIdentity(): void
    {
        $identity = ClientIdentity::resolve(
            [
                'REMOTE_ADDR' => '203.0.113.8',
                'HTTPS' => '',
                'HTTP_X_FORWARDED_FOR' => '198.51.100.9',
                'HTTP_X_FORWARDED_PROTO' => 'https',
            ],
            ['127.0.0.1', '10.0.0.0/8'],
        );

        self::assertSame('203.0.113.8', $identity->ip());
        self::assertFalse($identity->isSecure());
    }

    public function testTrustedProxyUsesRightmostUntrustedForwardedHop(): void
    {
        $identity = ClientIdentity::resolve(
            [
                'REMOTE_ADDR' => '10.2.3.4',
                'HTTP_X_FORWARDED_FOR' => '198.51.100.22, 10.9.8.7',
                'HTTP_X_FORWARDED_PROTO' => 'https',
            ],
            ['10.0.0.0/8'],
        );

        self::assertSame('198.51.100.22', $identity->ip());
        self::assertTrue($identity->isSecure());
    }

    public function testTrustedProxyRejectsMalformedForwardedAddresses(): void
    {
        $identity = ClientIdentity::resolve(
            [
                'REMOTE_ADDR' => '127.0.0.1',
                'HTTP_X_FORWARDED_FOR' => "198.51.100.2\r\nX-Evil: injected",
                'HTTP_X_FORWARDED_PROTO' => 'https,http',
            ],
            ['127.0.0.1'],
        );

        self::assertSame('127.0.0.1', $identity->ip());
        self::assertFalse($identity->isSecure());
    }
}
