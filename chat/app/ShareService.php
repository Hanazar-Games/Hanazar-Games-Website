<?php

declare(strict_types=1);

namespace Hanazar\Chat;

final readonly class ShareService
{
    private const MIN_EXPIRATION_SECONDS = 60;
    private const MAX_EXPIRATION_SECONDS = 86400;
    private const MAX_CIPHERTEXT_LENGTH = 8 * 1024 * 1024;

    public function __construct(private Database $database) {}

    /** @return array{token: string, created_at: int, expires_at: int} */
    public function create(string $ciphertext, int $expiresInSeconds, ?int $now = null): array
    {
        $now ??= time();
        if ($expiresInSeconds < self::MIN_EXPIRATION_SECONDS || $expiresInSeconds > self::MAX_EXPIRATION_SECONDS) {
            throw new HttpException(422, 'invalid_expiration');
        }
        $length = strlen($ciphertext);
        if ($length < 38
            || $length > self::MAX_CIPHERTEXT_LENGTH
            || $length % 4 === 1
            || strspn($ciphertext, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_') !== $length
        ) {
            throw new HttpException(422, 'invalid_ciphertext');
        }

        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        $expiresAt = $now + $expiresInSeconds;
        $statement = $this->database->connection()->prepare(
            'INSERT INTO ephemeral_shares (token_hash, ciphertext, created_at, expires_at) '
            . 'VALUES (:token_hash, :ciphertext, :created_at, :expires_at)',
        );
        $statement->execute([
            'token_hash' => hash('sha256', $token),
            'ciphertext' => $ciphertext,
            'created_at' => $now,
            'expires_at' => $expiresAt,
        ]);

        return ['token' => $token, 'created_at' => $now, 'expires_at' => $expiresAt];
    }

    /** @return array{ciphertext: string, created_at: int, expires_at: int} */
    public function fetch(string $token, ?int $now = null): array
    {
        $now ??= time();
        if (preg_match('/^[A-Za-z0-9_-]{43}$/D', $token) !== 1) {
            throw new HttpException(404, 'share_not_found');
        }

        $tokenHash = hash('sha256', $token);
        $statement = $this->database->connection()->prepare(
            'SELECT ciphertext, created_at, expires_at FROM ephemeral_shares WHERE token_hash = :token_hash',
        );
        $statement->execute(['token_hash' => $tokenHash]);
        $row = $statement->fetch();
        if (!is_array($row)) {
            throw new HttpException(404, 'share_not_found');
        }
        if ((int) $row['expires_at'] <= $now) {
            $delete = $this->database->connection()->prepare(
                'DELETE FROM ephemeral_shares WHERE token_hash = :token_hash AND expires_at <= :now',
            );
            $delete->execute(['token_hash' => $tokenHash, 'now' => $now]);
            throw new HttpException(410, 'share_expired');
        }

        return [
            'ciphertext' => (string) $row['ciphertext'],
            'created_at' => (int) $row['created_at'],
            'expires_at' => (int) $row['expires_at'],
        ];
    }

    public function cleanupExpired(?int $now = null): int
    {
        $statement = $this->database->connection()->prepare(
            'DELETE FROM ephemeral_shares WHERE expires_at <= :now',
        );
        $statement->execute(['now' => $now ?? time()]);
        return $statement->rowCount();
    }
}
