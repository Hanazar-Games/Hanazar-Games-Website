<?php

declare(strict_types=1);

namespace FlashPhoto;

final class Csrf
{
    private const KEY = 'csrf_token';

    public function token(): string
    {
        if (!isset($_SESSION[self::KEY]) || !is_string($_SESSION[self::KEY])) {
            $_SESSION[self::KEY] = bin2hex(random_bytes(32));
        }
        return $_SESSION[self::KEY];
    }

    public function verify(mixed $provided): bool
    {
        return is_string($provided)
            && isset($_SESSION[self::KEY])
            && is_string($_SESSION[self::KEY])
            && hash_equals($_SESSION[self::KEY], $provided);
    }

    public function requireValid(mixed $provided): void
    {
        if (!$this->verify($provided)) {
            throw new HttpException(403, '请求验证失败，请刷新页面后重试');
        }
    }
}
