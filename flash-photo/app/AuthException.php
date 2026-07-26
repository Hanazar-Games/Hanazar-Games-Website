<?php

declare(strict_types=1);

namespace FlashPhoto;

final class AuthException extends HttpException
{
    public function __construct()
    {
        parent::__construct(401, '请先登录');
    }
}
