<?php

declare(strict_types=1);

namespace FlashPhoto;

use RuntimeException;

class HttpException extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        string $publicMessage,
        public readonly array $headers = [],
        ?\Throwable $previous = null
    ) {
        parent::__construct($publicMessage, 0, $previous);
    }
}
