<?php

declare(strict_types=1);

namespace Hanazar\Chat\Tests;

use Hanazar\Chat\HttpException;
use Hanazar\Chat\ShareService;

final class EphemeralShareServiceTest extends TestCase
{
    private ShareService $shares;

    protected function setUp(): void
    {
        parent::setUp();
        $this->shares = new ShareService($this->database);
    }

    public function testCreateStoresOnlyAHashAndFetchReturnsTheCiphertext(): void
    {
        $ciphertext = $this->ciphertext();
        $created = $this->shares->create($ciphertext, 900, 1_700_000_000);

        self::assertMatchesRegularExpression('~^[A-Za-z0-9_-]{43}$~', $created['token']);
        self::assertSame(1_700_000_000, $created['created_at']);
        self::assertSame(1_700_000_900, $created['expires_at']);

        $row = $this->database->connection()->query(
            'SELECT token_hash, ciphertext, created_at, expires_at FROM ephemeral_shares',
        )->fetch();
        self::assertIsArray($row);
        self::assertSame(hash('sha256', $created['token']), $row['token_hash']);
        self::assertNotSame($created['token'], $row['token_hash']);
        self::assertSame($ciphertext, $row['ciphertext']);

        self::assertSame(
            [
                'ciphertext' => $ciphertext,
                'created_at' => 1_700_000_000,
                'expires_at' => 1_700_000_900,
            ],
            $this->shares->fetch($created['token'], 1_700_000_100),
        );
    }

    public function testCreateRejectsInvalidExpirationAndCiphertext(): void
    {
        foreach ([59, 86_401] as $seconds) {
            try {
                $this->shares->create($this->ciphertext(), $seconds, 1_700_000_000);
                self::fail('Expiration outside the supported range must be rejected.');
            } catch (HttpException $exception) {
                self::assertSame(422, $exception->status());
                self::assertSame('invalid_expiration', $exception->errorCode());
            }
        }

        foreach (['not base64url!', str_repeat('A', 8 * 1024 * 1024 + 1)] as $ciphertext) {
            try {
                $this->shares->create($ciphertext, 60, 1_700_000_000);
                self::fail('Invalid ciphertext must be rejected.');
            } catch (HttpException $exception) {
                self::assertSame(422, $exception->status());
                self::assertSame('invalid_ciphertext', $exception->errorCode());
            }
        }
    }

    public function testExpiredShareIsDestroyedDuringRead(): void
    {
        $created = $this->shares->create($this->ciphertext(), 60, 1_700_000_000);

        try {
            $this->shares->fetch($created['token'], 1_700_000_060);
            self::fail('Expired shares must not be returned.');
        } catch (HttpException $exception) {
            self::assertSame(410, $exception->status());
            self::assertSame('share_expired', $exception->errorCode());
        }

        self::assertSame(0, (int) $this->database->connection()->query('SELECT COUNT(*) FROM ephemeral_shares')->fetchColumn());
    }

    public function testCleanupRemovesOnlyExpiredShares(): void
    {
        $this->shares->create($this->ciphertext(), 60, 1_700_000_000);
        $kept = $this->shares->create($this->ciphertext(), 120, 1_700_000_000);

        self::assertSame(1, $this->shares->cleanupExpired(1_700_000_061));
        self::assertSame($kept['expires_at'], $this->shares->fetch($kept['token'], 1_700_000_061)['expires_at']);
    }

    public function testInvalidOrUnknownTokensDoNotExposeDatabaseDetails(): void
    {
        foreach (['short', str_repeat('A', 43)] as $token) {
            try {
                $this->shares->fetch($token, 1_700_000_000);
                self::fail('Invalid or unknown tokens must not be returned.');
            } catch (HttpException $exception) {
                self::assertSame(404, $exception->status());
                self::assertSame('share_not_found', $exception->errorCode());
            }
        }
    }

    private function ciphertext(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(128)), '+/', '-_'), '=');
    }
}
