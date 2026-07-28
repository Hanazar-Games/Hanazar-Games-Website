<?php

declare(strict_types=1);

$autoload = dirname(__DIR__) . '/vendor/autoload.php';

if (!is_file($autoload)) {
    throw new \RuntimeException('Run composer install in chat/ before executing tests.');
}

require $autoload;

date_default_timezone_set('UTC');
