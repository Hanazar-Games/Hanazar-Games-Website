<?php

declare(strict_types=1);

namespace Hanazar\Chat;

final class Csrf
{
    public function __construct(private readonly SessionManager $sessions) {}

    public function token(): string
    {
        $token = $this->sessions->get('csrf_token');
        if (!is_string($token)) {
            $token = bin2hex(random_bytes(32));
            $this->sessions->set('csrf_token', $token);
        }
        return $token;
    }

    public function rotate(): string
    {
        $token = bin2hex(random_bytes(32));
        $this->sessions->set('csrf_token', $token);
        return $token;
    }

    public function validate(?string $candidate): bool
    {
        $token = $this->sessions->get('csrf_token');
        return is_string($candidate) && is_string($token) && hash_equals($token, $candidate);
    }
}
