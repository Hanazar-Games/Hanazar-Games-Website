<?php

declare(strict_types=1);

namespace Hanazar\Chat;

final readonly class AuthContext
{
    public function __construct(
        private int $userId,
        private string $systemRole,
        private int $authVersion,
    ) {
    }

    public function userId(): int
    {
        return $this->userId;
    }

    public function systemRole(): string
    {
        return $this->systemRole;
    }

    public function authVersion(): int
    {
        return $this->authVersion;
    }
}
