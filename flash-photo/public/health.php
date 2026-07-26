<?php

declare(strict_types=1);

use FlashPhoto\Response;
use FlashPhoto\SchemaValidator;

$app = require dirname(__DIR__) . '/app/bootstrap.php';
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    Response::methodNotAllowed(['GET']);
}
$expected = $app['config']->string('health_token');
$provided = $_SERVER['HTTP_X_HEALTH_TOKEN'] ?? '';
if ($expected !== '' && (!is_string($provided) || !hash_equals($expected, $provided))) {
    Response::notFound(true);
}
try {
    $pdo = $app['database']->pdo();
    if (!SchemaValidator::isCompatible($pdo)) {
        throw new RuntimeException('Database schema is not initialized.');
    }
    Response::json(['status' => 'ok', 'time' => time()]);
} catch (Throwable $exception) {
    $app['logger']->error('health.database_unavailable', ['exception_class' => $exception::class]);
    Response::json(['status' => 'unavailable'], 503);
}
