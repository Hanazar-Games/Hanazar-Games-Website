<?php

declare(strict_types=1);

use FlashPhoto\Response;

$app = require __DIR__ . '/_bootstrap.php';
$adminId = admin_require($app);
admin_verify_post($app);
$idValue = $_POST['id'] ?? null;
$id = is_string($idValue)
    ? filter_var($idValue, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])
    : false;
if ($id === false) {
    admin_error('销毁参数无效', 422);
}
$pageValue = $_POST['page'] ?? null;
$page = is_string($pageValue)
    ? filter_var($pageValue, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 1000000]])
    : false;
if (!is_int($page)) {
    $page = 1;
}
$destroyed = $app['flash']->destroy($id, 'manual', $adminId);
$_SESSION['admin_notice'] = $destroyed ? '闪照已销毁。' : '记录不存在或文件清理失败，请检查服务日志。';
Response::redirect($app['config']->string('admin_path') . '/list.php?page=' . $page);
