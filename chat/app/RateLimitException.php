<?php

declare(strict_types=1);

namespace Hanazar\Chat;

final class RateLimitException extends HttpException
{
    public function __construct(private readonly int $retryAfterSeconds)
    {
        parent::__construct(429, 'rate_limit_exceeded', 'Please try again later.');
    }

    public function retryAfter(): int
    {
        return $this->retryAfterSeconds;
    }
}
