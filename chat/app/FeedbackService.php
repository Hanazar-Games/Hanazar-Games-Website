<?php

declare(strict_types=1);

namespace Hanazar\Chat;

use PDO;

final readonly class FeedbackService
{
    private const EDIT_WINDOW_SECONDS = 300;
    private const DUPLICATE_WINDOW_SECONDS = 86400;
    private const MIN_LENGTH = 4;
    private const MAX_LENGTH = 500;

    public function __construct(private Database $database) {}

    /** @return array{id: int, content: string, edit_token: string, created_at: int, updated_at: int, publish_at: int} */
    public function create(string $content, ?int $now = null): array
    {
        $now ??= time();
        [$normalized, $contentHash] = $this->validatedContent($content);
        return $this->database->immediate(function (PDO $pdo) use ($normalized, $contentHash, $now): array {
            if ($this->duplicateExists($contentHash, $now)) {
                throw new HttpException(409, 'duplicate_feedback');
            }

            $editToken = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
            $publishAt = $now + self::EDIT_WINDOW_SECONDS;
            $statement = $pdo->prepare(
                'INSERT INTO public_feedback '
                . '(content, content_hash, edit_token_hash, status, created_at, updated_at, publish_at) '
                . 'VALUES (:content, :content_hash, :edit_token_hash, :status, :created_at, :updated_at, :publish_at)',
            );
            $statement->execute([
                'content' => $normalized,
                'content_hash' => $contentHash,
                'edit_token_hash' => hash('sha256', $editToken),
                'status' => 'visible',
                'created_at' => $now,
                'updated_at' => $now,
                'publish_at' => $publishAt,
            ]);

            return [
                'id' => (int) $pdo->lastInsertId(),
                'content' => $normalized,
                'edit_token' => $editToken,
                'created_at' => $now,
                'updated_at' => $now,
                'publish_at' => $publishAt,
            ];
        });
    }

    /** @return array{id: int, content: string, created_at: int, updated_at: int, publish_at: int} */
    public function edit(int $id, string $editToken, string $content, ?int $now = null): array
    {
        $now ??= time();
        if ($id < 1 || preg_match('/^[A-Za-z0-9_-]{43}$/D', $editToken) !== 1) {
            throw new HttpException(404, 'feedback_not_found');
        }

        [$normalized, $contentHash] = $this->validatedContent($content);
        return $this->database->immediate(function (PDO $pdo) use ($id, $editToken, $normalized, $contentHash, $now): array {
            $statement = $pdo->prepare(
                'SELECT edit_token_hash, status, created_at, publish_at FROM public_feedback WHERE id = :id',
            );
            $statement->execute(['id' => $id]);
            $row = $statement->fetch();
            if (!is_array($row)
                || !hash_equals((string) $row['edit_token_hash'], hash('sha256', $editToken))
                || (string) $row['status'] !== 'visible'
            ) {
                throw new HttpException(404, 'feedback_not_found');
            }
            if ((int) $row['publish_at'] <= $now) {
                throw new HttpException(409, 'edit_window_closed');
            }
            if ($this->duplicateExists($contentHash, $now, $id)) {
                throw new HttpException(409, 'duplicate_feedback');
            }

            $update = $pdo->prepare(
                'UPDATE public_feedback SET content = :content, content_hash = :content_hash, updated_at = :updated_at '
                . 'WHERE id = :id AND status = :status AND publish_at > :now',
            );
            $update->execute([
                'content' => $normalized,
                'content_hash' => $contentHash,
                'updated_at' => $now,
                'id' => $id,
                'status' => 'visible',
                'now' => $now,
            ]);
            if ($update->rowCount() !== 1) {
                throw new HttpException(409, 'edit_window_closed');
            }

            return [
                'id' => $id,
                'content' => $normalized,
                'created_at' => (int) $row['created_at'],
                'updated_at' => $now,
                'publish_at' => (int) $row['publish_at'],
            ];
        });
    }

    /** @return array{items: list<array{id: int, content: string, created_at: int, updated_at: int, publish_at: int}>, next_cursor: ?int} */
    public function page(int $limit = 20, ?int $beforeId = null, ?int $now = null): array
    {
        $now ??= time();
        if ($beforeId !== null && $beforeId < 1) {
            throw new HttpException(422, 'invalid_request');
        }
        $limit = max(1, min(50, $limit));
        $cursorClause = $beforeId === null ? '' : 'AND id < :before_id ';
        $statement = $this->database->connection()->prepare(
            'SELECT id, content, created_at, updated_at, publish_at FROM public_feedback '
            . 'WHERE status = :status AND publish_at <= :now ' . $cursorClause
            . 'ORDER BY id DESC LIMIT :limit',
        );
        $statement->bindValue(':status', 'visible');
        $statement->bindValue(':now', $now, PDO::PARAM_INT);
        if ($beforeId !== null) {
            $statement->bindValue(':before_id', $beforeId, PDO::PARAM_INT);
        }
        $statement->bindValue(':limit', $limit + 1, PDO::PARAM_INT);
        $statement->execute();

        $items = array_map(
            static fn (array $row): array => [
                'id' => (int) $row['id'],
                'content' => (string) $row['content'],
                'created_at' => (int) $row['created_at'],
                'updated_at' => (int) $row['updated_at'],
                'publish_at' => (int) $row['publish_at'],
            ],
            $statement->fetchAll(),
        );
        $hasMore = count($items) > $limit;
        if ($hasMore) {
            array_pop($items);
        }

        return [
            'items' => $items,
            'next_cursor' => $hasMore ? $items[array_key_last($items)]['id'] : null,
        ];
    }

    /** @return array{string, string} */
    private function validatedContent(string $content): array
    {
        if (strlen($content) > 2000
            || preg_match('//u', $content) !== 1
            || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $content) === 1
            || preg_match('/[\x{061C}\x{200B}\x{200E}\x{200F}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FEFF}]/u', $content) === 1
        ) {
            throw new HttpException(422, 'invalid_feedback');
        }
        $normalized = str_replace(["\r\n", "\r"], "\n", trim($content));
        $normalized = preg_replace('/[ \t]+/u', ' ', $normalized);
        $normalized = is_string($normalized) ? preg_replace('/\n{3,}/u', "\n\n", $normalized) : null;
        $length = is_string($normalized) ? preg_match_all('/./us', $normalized) : false;
        if (!is_string($normalized)
            || $length === false
            || $length < self::MIN_LENGTH
            || $length > self::MAX_LENGTH
            || preg_match('/(.)\1{19,}/us', $normalized) === 1
            || preg_match_all('~(?:https?://|www\.)~iu', $normalized) > 1
        ) {
            throw new HttpException(422, 'invalid_feedback');
        }

        return [$normalized, hash('sha256', $normalized)];
    }

    private function duplicateExists(string $contentHash, int $now, ?int $excludeId = null): bool
    {
        $sql = 'SELECT 1 FROM public_feedback WHERE content_hash = :content_hash '
            . 'AND created_at >= :cutoff AND status = :status';
        if ($excludeId !== null) {
            $sql .= ' AND id <> :exclude_id';
        }
        $sql .= ' LIMIT 1';
        $statement = $this->database->connection()->prepare($sql);
        $values = [
            'content_hash' => $contentHash,
            'cutoff' => $now - self::DUPLICATE_WINDOW_SECONDS,
            'status' => 'visible',
        ];
        if ($excludeId !== null) {
            $values['exclude_id'] = $excludeId;
        }
        $statement->execute($values);
        return $statement->fetchColumn() !== false;
    }
}
