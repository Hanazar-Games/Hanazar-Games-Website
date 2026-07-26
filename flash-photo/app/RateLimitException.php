<?php

declare(strict_types=1);

namespace FlashPhoto;

final class RateLimitException extends HttpException
{
    public function __construct(int $retryAfter, public readonly bool $firstExceeded)
    {
        parent::__construct(429, '请求过于频繁，请稍后重试', ['Retry-After' => (string) max(1, $retryAfter)]);
    }
}
