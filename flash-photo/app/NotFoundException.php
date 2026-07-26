<?php

declare(strict_types=1);

namespace FlashPhoto;

final class NotFoundException extends HttpException
{
    public function __construct()
    {
        parent::__construct(404, '内容不存在');
    }
}
