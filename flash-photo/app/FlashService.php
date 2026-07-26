<?php

declare(strict_types=1);

namespace FlashPhoto;

use PDO;
use Throwable;

final class FlashService
{
    private Validator $validator;

    public function __construct(
        private readonly Config $config,
        private readonly Database $database,
        private readonly FileStorage $storage,
        private readonly Logger $logger
    ) {
        $this->validator = new Validator($config);
    }

    public function generateToken(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }

    /** @param array<string, int|string> $image @return array{id: int, token: string, url: string, unused_expires_at: int} */
    public function create(
        array $image,
        int $viewSeconds,
        int $unusedExpirySeconds,
        string $accessMode,
        ?int $adminId = null
    ): array {
        if (!in_array($viewSeconds, [15, 30, 60], true)) {
            throw new ValidationException('查看时长只能为15、30或60秒');
        }
        if ($unusedExpirySeconds < 300 || $unusedExpirySeconds > 2592000) {
            throw new ValidationException('未打开保存时间必须在5分钟到30天之间');
        }
        if (!in_array($accessMode, ['global', 'first'], true)) {
            throw new ValidationException('访问模式无效');
        }
        $stored = $this->storage->store($image);
        $token = $this->generateToken();
        $tokenHash = hash('sha256', $token);
        $now = time();
        $unusedExpires = $now + $unusedExpirySeconds;
        try {
            $id = $this->database->immediate(function (PDO $pdo) use (
                $tokenHash,
                $stored,
                $image,
                $now,
                $unusedExpires,
                $viewSeconds,
                $accessMode,
                $adminId
            ): int {
                $statement = $pdo->prepare(
                    'INSERT INTO flash_images (
                        token_hash, storage_name, original_name, mime_type, file_size, width, height,
                        status, created_at, unused_expires_at, view_seconds, access_mode
                    ) VALUES (
                        :token_hash, :storage_name, :original_name, :mime_type, :file_size, :width, :height,
                        :status, :created_at, :unused_expires_at, :view_seconds, :access_mode
                    )'
                );
                $statement->execute([
                    'token_hash' => $tokenHash,
                    'storage_name' => $stored['storage_name'],
                    'original_name' => (string) $image['original_name'],
                    'mime_type' => (string) $image['mime_type'],
                    'file_size' => $stored['file_size'],
                    'width' => (int) $image['width'],
                    'height' => (int) $image['height'],
                    'status' => 'unused',
                    'created_at' => $now,
                    'unused_expires_at' => $unusedExpires,
                    'view_seconds' => $viewSeconds,
                    'access_mode' => $accessMode,
                ]);
                $id = (int) $pdo->lastInsertId();
                $this->audit('upload', $adminId, $id, ['file_size' => $stored['file_size']], $pdo);
                $this->audit('link_generated', $adminId, $id, ['access_mode' => $accessMode], $pdo);
                return $id;
            });
            $this->logger->info('upload', ['admin_id' => $adminId, 'flash_id' => $id]);
            $this->logger->info('link_generated', ['admin_id' => $adminId, 'flash_id' => $id]);
        } catch (Throwable $exception) {
            $this->storage->abort($stored['storage_name']);
            throw $exception;
        }
        $this->storage->confirm($stored['storage_name']);
        return [
            'id' => $id,
            'token' => $token,
            'url' => rtrim($this->config->string('app_url'), '/') . '/v/' . $token,
            'unused_expires_at' => $unusedExpires,
        ];
    }

    /** @return array<string, mixed> */
    public function findViewable(mixed $token): array
    {
        $row = $this->findByToken($this->validator->token($token));
        if ($row === null || !$this->isViewableState($row, time())) {
            if ($row !== null) {
                $this->markExpiredIfNeeded((int) $row['id'], $row, time());
            }
            throw new NotFoundException();
        }
        return $row;
    }

    /** @return array{status: string, opened_at: int, expires_at: int, remaining: int} */
    public function redeem(mixed $token, string $viewerId, string $ipHash, string $userAgentHash): array
    {
        $token = $this->validator->token($token);
        $tokenHash = hash('sha256', $token);
        $viewerHash = $this->viewerHash($viewerId, $tokenHash);
        $openedId = null;
        $result = $this->database->immediate(function (PDO $pdo) use (
            $tokenHash,
            $viewerHash,
            $ipHash,
            $userAgentHash,
            &$openedId
        ): ?array {
            $now = time();
            $row = $this->findByHash($tokenHash, $pdo);
            if ($row === null || in_array($row['status'], ['expired', 'destroyed'], true)) {
                return null;
            }
            if ($row['status'] === 'unused' && (int) $row['unused_expires_at'] <= $now) {
                $this->expireRow($pdo, (int) $row['id'], 'unused_timeout');
                return null;
            }
            if ($row['status'] === 'opened' && (int) $row['expires_at'] <= $now) {
                $this->expireRow($pdo, (int) $row['id'], 'view_timeout');
                return null;
            }
            if ($row['status'] === 'unused') {
                $expiresAt = $now + (int) $row['view_seconds'];
                $owner = $row['access_mode'] === 'first' ? $viewerHash : null;
                $update = $pdo->prepare(
                    "UPDATE flash_images SET status = 'opened', opened_at = :opened, expires_at = :expires,
                     open_ip_hash = :ip, open_user_agent_hash = :ua, viewer_hash = :viewer,
                     last_access_at = :opened WHERE id = :id AND status = 'unused'"
                );
                $update->execute([
                    'opened' => $now,
                    'expires' => $expiresAt,
                    'ip' => $ipHash,
                    'ua' => $userAgentHash,
                    'viewer' => $owner,
                    'id' => $row['id'],
                ]);
                if ($update->rowCount() !== 1) {
                    return null;
                }
                $this->audit('first_open', null, (int) $row['id'], [
                    'ip_hash' => $ipHash,
                    'user_agent_hash' => $userAgentHash,
                ], $pdo);
                $openedId = (int) $row['id'];
                return [
                    'status' => 'opened',
                    'opened_at' => $now,
                    'expires_at' => $expiresAt,
                    'remaining' => (int) $row['view_seconds'],
                ];
            }
            if ($row['access_mode'] === 'first' && !hash_equals((string) $row['viewer_hash'], $viewerHash)) {
                return null;
            }
            return [
                'status' => 'opened',
                'opened_at' => (int) $row['opened_at'],
                'expires_at' => (int) $row['expires_at'],
                'remaining' => max(0, (int) $row['expires_at'] - $now),
            ];
        });
        if ($result === null) {
            throw new NotFoundException();
        }
        if ($openedId !== null) {
            $this->logger->info('first_open', ['admin_id' => null, 'flash_id' => $openedId]);
        }
        return $result;
    }

    /** @return array{id: int, path: string, mime_type: string, file_size: int, expires_at: int, viewer_hash: string} */
    public function content(mixed $token, string $viewerId): array
    {
        $token = $this->validator->token($token);
        $row = $this->findByToken($token);
        $now = time();
        if ($row === null || $row['status'] !== 'opened' || (int) $row['expires_at'] <= $now) {
            if ($row !== null) {
                $this->markExpiredIfNeeded((int) $row['id'], $row, $now);
            }
            throw new NotFoundException();
        }
        $viewerHash = $this->viewerHash($viewerId, (string) $row['token_hash']);
        if ($row['access_mode'] === 'first' && !hash_equals((string) $row['viewer_hash'], $viewerHash)) {
            throw new NotFoundException();
        }
        $path = $this->storage->resolve((string) $row['storage_name']);
        if ($path === null) {
            $this->logger->error('content.file_missing', ['flash_id' => (int) $row['id']]);
            $this->destroy((int) $row['id'], 'missing_file');
            throw new NotFoundException();
        }
        $size = @filesize($path);
        if ($size === false
            || $size < 1
            || $size > $this->config->int('max_upload_bytes')
            || time() >= (int) $row['expires_at']) {
            throw new NotFoundException();
        }
        return [
            'id' => (int) $row['id'],
            'path' => $path,
            'mime_type' => (string) $row['mime_type'],
            'file_size' => $size,
            'expires_at' => (int) $row['expires_at'],
            'viewer_hash' => $viewerHash,
        ];
    }

    public function authorizeContentDelivery(int $id, string $viewerHash): void
    {
        $authorized = $this->database->immediate(function (PDO $pdo) use ($id, $viewerHash): bool {
            $statement = $pdo->prepare(
                "UPDATE flash_images SET last_access_at = CAST(strftime('%s', 'now') AS INTEGER),
                 access_count = access_count + 1
                 WHERE id = :id AND status = 'opened'
                 AND expires_at > CAST(strftime('%s', 'now') AS INTEGER)
                 AND (access_mode = 'global' OR (access_mode = 'first' AND viewer_hash = :viewer))"
            );
            $statement->execute(['id' => $id, 'viewer' => $viewerHash]);
            if ($statement->rowCount() !== 1) {
                return false;
            }
            $this->audit('image_access', null, $id, [], $pdo);
            return true;
        });
        if (!$authorized) {
            throw new NotFoundException();
        }
        $this->logger->info('image_access', ['admin_id' => null, 'flash_id' => $id]);
    }

    /** @return array{status: string, expires_at: int, remaining: int} */
    public function status(mixed $token, string $viewerId): array
    {
        $row = $this->findByToken($this->validator->token($token));
        $now = time();
        if ($row === null || $row['status'] !== 'opened' || (int) $row['expires_at'] <= $now) {
            if ($row !== null) {
                $this->markExpiredIfNeeded((int) $row['id'], $row, $now);
            }
            throw new NotFoundException();
        }
        if ($row['access_mode'] === 'first'
            && !hash_equals((string) $row['viewer_hash'], $this->viewerHash($viewerId, (string) $row['token_hash']))) {
            throw new NotFoundException();
        }
        return [
            'status' => 'opened',
            'expires_at' => (int) $row['expires_at'],
            'remaining' => max(0, (int) $row['expires_at'] - $now),
        ];
    }

    public function destroy(int $id, string $reason, ?int $adminId = null): bool
    {
        if ($id < 1 || !in_array($reason, ['manual', 'automatic', 'missing_file'], true)) {
            throw new ValidationException('销毁参数无效');
        }
        $now = time();
        $auditEvent = null;
        $row = $this->database->immediate(function (PDO $pdo) use (
            $id,
            $reason,
            $adminId,
            $now,
            &$auditEvent
        ): ?array {
            $select = $pdo->prepare(
                'SELECT id, storage_name, status, storage_deleted_at FROM flash_images WHERE id = :id'
            );
            $select->execute(['id' => $id]);
            $record = $select->fetch();
            if (!is_array($record)) {
                return null;
            }
            if ($record['status'] !== 'destroyed') {
                $update = $pdo->prepare(
                    "UPDATE flash_images SET status = 'destroyed', destroyed_at = :now, destroy_reason = :reason WHERE id = :id"
                );
                $update->execute(['now' => $now, 'reason' => $reason, 'id' => $id]);
                $auditEvent = $reason === 'manual' ? 'manual_destroy' : 'automatic_destroy';
                $metadata = $reason === 'manual' ? [] : ['reason' => $reason];
                $this->audit($auditEvent, $adminId, $id, $metadata, $pdo);
            }
            return $record;
        });
        if ($row === null) {
            return false;
        }
        if ($auditEvent !== null) {
            $this->logger->info($auditEvent, ['admin_id' => $adminId, 'flash_id' => $id]);
        }
        if (!$this->storage->delete((string) $row['storage_name'])) {
            return false;
        }
        if ($row['storage_deleted_at'] === null) {
            $this->finalizeStorageDeletion($id);
        }
        return true;
    }

    public function finalizeAutomaticDestroy(int $id, string $reason): bool
    {
        if ($id < 1 || !in_array($reason, ['unused_timeout', 'view_timeout'], true)) {
            throw new ValidationException('自动销毁参数无效');
        }
        $finalized = $this->database->immediate(function (PDO $pdo) use ($id, $reason): bool {
            $statement = $pdo->prepare(
                "UPDATE flash_images SET destroyed_at = :now, storage_deleted_at = :now, cleanup_retry_at = NULL,
                 destroy_reason = COALESCE(destroy_reason, :reason)
                 WHERE id = :id AND status = 'expired' AND storage_deleted_at IS NULL"
            );
            $statement->execute(['now' => time(), 'reason' => $reason, 'id' => $id]);
            if ($statement->rowCount() !== 1) {
                return false;
            }
            $this->audit('automatic_destroy', null, $id, ['reason' => $reason], $pdo);
            return true;
        });
        if ($finalized) {
            $this->logger->info('automatic_destroy', ['admin_id' => null, 'flash_id' => $id]);
        }
        return $finalized;
    }

    public function finalizeStorageDeletion(int $id): bool
    {
        if ($id < 1) {
            throw new ValidationException('销毁参数无效');
        }
        $statement = $this->database->pdo()->prepare(
            "UPDATE flash_images SET storage_deleted_at = :now, cleanup_retry_at = NULL
             WHERE id = :id AND status IN ('expired', 'destroyed') AND storage_deleted_at IS NULL"
        );
        $statement->execute(['now' => time(), 'id' => $id]);
        return $statement->rowCount() === 1;
    }

    /** @return array<string, int> */
    public function dashboard(): array
    {
        $this->synchronizeExpiredStates();
        $counts = ['unused' => 0, 'opened' => 0, 'expired' => 0, 'destroyed' => 0, 'total_bytes' => 0];
        $rows = $this->database->pdo()->query('SELECT status, COUNT(*) AS count, COALESCE(SUM(file_size), 0) AS bytes FROM flash_images GROUP BY status')->fetchAll();
        foreach ($rows as $row) {
            $counts[(string) $row['status']] = (int) $row['count'];
            if (!in_array($row['status'], ['expired', 'destroyed'], true)) {
                $counts['total_bytes'] += (int) $row['bytes'];
            }
        }
        return $counts;
    }

    /** @return list<array<string, mixed>> */
    public function listRecords(int $limit = 100, int $offset = 0): array
    {
        $this->synchronizeExpiredStates();
        $statement = $this->database->pdo()->prepare(
            'SELECT id, original_name, mime_type, file_size, width, height, status, created_at, opened_at,
                    expires_at, unused_expires_at, destroyed_at, access_count, destroy_reason, view_seconds, access_mode
             FROM flash_images ORDER BY id DESC LIMIT :limit OFFSET :offset'
        );
        $statement->bindValue('limit', max(1, min(500, $limit)), PDO::PARAM_INT);
        $statement->bindValue('offset', max(0, min(100000000, $offset)), PDO::PARAM_INT);
        $statement->execute();
        return $statement->fetchAll();
    }

    public function synchronizeExpiredStates(): int
    {
        $now = time();
        $statement = $this->database->pdo()->prepare(
            "UPDATE flash_images SET status = 'expired',
             destroy_reason = CASE WHEN status = 'unused' THEN 'unused_timeout' ELSE 'view_timeout' END
             WHERE (status = 'opened' AND expires_at <= :now) OR (status = 'unused' AND unused_expires_at <= :now)"
        );
        $statement->execute(['now' => $now]);
        return $statement->rowCount();
    }

    /** @param array<string, scalar|null> $metadata */
    public function recordAudit(string $event, ?int $adminId = null, ?int $flashId = null, array $metadata = []): void
    {
        try {
            $this->audit($event, $adminId, $flashId, $metadata);
            $this->logger->info($event, ['admin_id' => $adminId, 'flash_id' => $flashId]);
        } catch (Throwable $exception) {
            $this->logger->error('audit.write_failed', ['event' => $event, 'exception_class' => $exception::class]);
        }
    }

    /** @return array<string, mixed>|null */
    private function findByToken(string $token): ?array
    {
        return $this->findByHash(hash('sha256', $token), $this->database->pdo());
    }

    /** @return array<string, mixed>|null */
    private function findByHash(string $hash, PDO $pdo): ?array
    {
        $statement = $pdo->prepare('SELECT * FROM flash_images WHERE token_hash = :hash LIMIT 1');
        $statement->execute(['hash' => $hash]);
        $row = $statement->fetch();
        return is_array($row) ? $row : null;
    }

    /** @param array<string, mixed> $row */
    private function isViewableState(array $row, int $now): bool
    {
        return ($row['status'] === 'unused' && (int) $row['unused_expires_at'] > $now)
            || ($row['status'] === 'opened' && (int) $row['expires_at'] > $now);
    }

    /** @param array<string, mixed> $row */
    private function markExpiredIfNeeded(int $id, array $row, int $now): void
    {
        $expired = ($row['status'] === 'unused' && (int) $row['unused_expires_at'] <= $now)
            || ($row['status'] === 'opened' && (int) $row['expires_at'] <= $now);
        if (!$expired) {
            return;
        }
        $reason = $row['status'] === 'unused' ? 'unused_timeout' : 'view_timeout';
        $this->database->immediate(fn (PDO $pdo) => $this->expireRow($pdo, $id, $reason));
    }

    private function expireRow(PDO $pdo, int $id, string $reason): void
    {
        $statement = $pdo->prepare(
            "UPDATE flash_images SET status = 'expired',
             destroy_reason = :reason WHERE id = :id AND status IN ('unused', 'opened')"
        );
        $statement->execute(['reason' => $reason, 'id' => $id]);
    }

    private function viewerHash(string $viewerId, string $tokenHash): string
    {
        return hash_hmac('sha256', $viewerId . '|' . $tokenHash, $this->config->string('app_secret'));
    }

    /** @param array<string, scalar|null> $metadata */
    private function audit(
        string $event,
        ?int $adminId,
        ?int $flashId,
        array $metadata = [],
        ?PDO $pdo = null
    ): void {
        $pdo ??= $this->database->pdo();
        $statement = $pdo->prepare(
            'INSERT INTO audit_logs (event_type, admin_id, flash_id, created_at, request_id, metadata_json)
             VALUES (:event, :admin, :flash, :created, :request, :metadata)'
        );
        $statement->execute([
            'event' => $event,
            'admin' => $adminId,
            'flash' => $flashId,
            'created' => time(),
            'request' => Response::requestId(),
            'metadata' => json_encode($metadata, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        ]);
    }
}
