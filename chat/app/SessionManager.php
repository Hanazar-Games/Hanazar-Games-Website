<?php

declare(strict_types=1);

namespace Hanazar\Chat;

final class SessionManager
{
    /** @var array<string, mixed> */
    private array $state;
    private string $sessionId;

    /** @param array<string, mixed> $state */
    public function __construct(private readonly Config $config, array &$state)
    {
        $this->state =& $state;
        $this->sessionId = bin2hex(random_bytes(24));
    }

    public function id(): string
    {
        return $this->sessionId;
    }

    public function regenerate(bool $destroy = true): void
    {
        if ($destroy) {
            $this->state = [];
        }
        $this->sessionId = bin2hex(random_bytes(24));
    }

    public function destroy(): void
    {
        $this->state = [];
        $this->sessionId = bin2hex(random_bytes(24));
    }

    public function get(string $key): mixed
    {
        return $this->state[$key] ?? null;
    }

    public function set(string $key, mixed $value): void
    {
        $this->state[$key] = $value;
    }

    public function remove(string $key): void
    {
        unset($this->state[$key]);
    }
}
