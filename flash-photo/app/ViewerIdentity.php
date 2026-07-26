<?php

declare(strict_types=1);

namespace FlashPhoto;

final class ViewerIdentity
{
    private const COOKIE_PREFIX = 'flash_viewer_';
    private const COOKIE_LIFETIME = 120;

    public function __construct(private readonly Config $config)
    {
    }

    public function id(mixed $token, mixed $candidate): string
    {
        $cookie = $this->cookieName($token);
        $current = $cookie === null ? null : ($_COOKIE[$cookie] ?? null);
        if ($this->isValidId($current)) {
            return $current;
        }
        if ($this->isValidId($candidate)) {
            return $candidate;
        }
        throw new ValidationException('查看身份无效');
    }

    public function remember(mixed $token, string $id): void
    {
        $cookie = $this->cookieName($token);
        if ($cookie === null || !$this->isValidId($id)) {
            throw new \InvalidArgumentException('Viewer identity is invalid.');
        }
        if (($_COOKIE[$cookie] ?? null) === $id) {
            return;
        }
        if (!setcookie($cookie, $id, [
            'expires' => time() + self::COOKIE_LIFETIME,
            'path' => '/api/',
            'secure' => str_starts_with($this->config->string('app_url'), 'https://'),
            'httponly' => true,
            'samesite' => 'Strict',
        ])) {
            throw new \RuntimeException('Unable to set viewer identity.');
        }
        $_COOKIE[$cookie] = $id;
    }

    private function cookieName(mixed $token): ?string
    {
        if (!is_string($token) || preg_match('/^[A-Za-z0-9_-]{43}$/D', $token) !== 1) {
            return null;
        }
        return self::COOKIE_PREFIX . substr(hash('sha256', $token), 0, 24);
    }

    private function isValidId(mixed $id): bool
    {
        return is_string($id) && preg_match('/^[a-f0-9]{64}$/D', $id) === 1;
    }
}
