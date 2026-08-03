<?php

declare(strict_types=1);

use Hanazar\Chat\Config;
use Hanazar\Chat\Database;

require dirname(__DIR__) . '/vendor/autoload.php';

$config = Config::fromEnvironment();
$database = new Database($config);
$database->initialize();

return [$config, $database];
