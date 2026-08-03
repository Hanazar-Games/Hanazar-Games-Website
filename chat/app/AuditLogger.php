<?php

declare(strict_types=1);

namespace Hanazar\Chat;

final class AuditLogger
{
    public function __construct(private readonly Database $database) {}

    public function write(string $action, ?int $userId = null, ?string $ipHash = null, ?int $now = null): void
    {
        $statement = $this->database->connection()->prepare(
            'INSERT INTO audit_logs (user_id, action, ip_hash, created_at) VALUES (:user_id, :action, :ip_hash, :created_at)',
        );
        $statement->execute([
            'user_id' => $userId,
            'action' => $action,
            'ip_hash' => $ipHash,
            'created_at' => $now ?? time(),
        ]);
    }
}
