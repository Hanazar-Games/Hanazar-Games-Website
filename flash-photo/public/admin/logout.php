<?php

declare(strict_types=1);

use FlashPhoto\Response;

$app = require __DIR__ . '/_bootstrap.php';
$base = $app['config']->string('admin_path');
admin_require($app);
admin_verify_post($app);
$app['auth']->logout();
Response::redirect($base . '/login.php');
