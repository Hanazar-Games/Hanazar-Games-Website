<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$vendor = $root . '/vendor/autoload.php';

if (is_file($vendor)) {
    require $vendor;
} else {
    spl_autoload_register(static function (string $class) use ($root): void {
        $testPrefix = 'FlashPhoto\\Tests\\';
        if (str_starts_with($class, $testPrefix)) {
            $path = $root . '/tests/' . str_replace('\\', '/', substr($class, strlen($testPrefix))) . '.php';
        } else {
            $prefix = 'FlashPhoto\\';
            if (!str_starts_with($class, $prefix)) {
                return;
            }
            $path = $root . '/app/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
        }
        if (is_file($path)) {
            require $path;
        }
    });
}
