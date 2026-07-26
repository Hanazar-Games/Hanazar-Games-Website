<?php

declare(strict_types=1);

use FlashPhoto\AdminView;
use FlashPhoto\Response;

$app = require __DIR__ . '/_bootstrap.php';
admin_require($app);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    Response::methodNotAllowed(['GET'], false);
}
$pageSize = 100;
$maxPage = 1000000;
$page = 1;
$pageInput = $_GET['page'] ?? null;
if (is_string($pageInput)) {
    $validatedPage = filter_var($pageInput, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1, 'max_range' => $maxPage],
    ]);
    if (is_int($validatedPage)) {
        $page = $validatedPage;
    }
}
$records = $app['flash']->listRecords($pageSize + 1, ($page - 1) * $pageSize);
$hasMore = count($records) > $pageSize;
if ($hasMore) {
    array_pop($records);
}
$hasMore = $hasMore && $page < $maxPage;
$notice = is_string($_SESSION['admin_notice'] ?? null) ? $_SESSION['admin_notice'] : null;
unset($_SESSION['admin_notice']);
$base = $app['config']->string('admin_path');
$labels = ['unused' => '未打开', 'opened' => '查看中', 'expired' => '已过期', 'destroyed' => '已销毁'];
$modeLabels = ['global' => '全局', 'first' => '首位'];
$serverTime = time();
AdminView::header('闪照记录', $app['config'], $app['csrf'], 'list');
?>
<?php if ($notice !== null): ?><div class="alert alert-info" role="status"><?= AdminView::escape($notice) ?></div><?php endif; ?>
<section class="panel">
  <?php if ($records === []): ?>
    <p class="empty"><?= $page === 1 ? '还没有上传记录。' : '此页没有记录。' ?></p>
  <?php else: ?>
    <div class="table-wrap">
      <table class="records-table" data-server-time="<?= $serverTime ?>">
        <caption class="sr-only">全部闪照记录</caption>
        <thead><tr><th scope="col">文件</th><th scope="col">状态</th><th scope="col">规则</th><th scope="col">时间</th><th scope="col">访问</th><th scope="col">操作</th></tr></thead>
        <tbody>
        <?php foreach ($records as $row): ?>
          <?php
            $deadline = $row['expires_at'] ?? $row['unused_expires_at'];
            $active = in_array($row['status'], ['unused', 'opened'], true);
            $remaining = $active ? max(0, (int) $deadline - $serverTime) : 0;
          ?>
          <tr>
            <td data-label="文件"><div class="cell-value"><strong>#<?= (int) $row['id'] ?> <?= AdminView::escape($row['original_name']) ?></strong><small><?= AdminView::escape(AdminView::formatBytes((int) $row['file_size'])) ?> · <?= (int) $row['width'] ?>×<?= (int) $row['height'] ?></small></div></td>
            <td data-label="状态"><div class="cell-value"><span class="status status-<?= AdminView::escape($row['status']) ?>"<?php if ($active): ?> data-active-status<?php endif; ?>><?= AdminView::escape($labels[$row['status']] ?? $row['status']) ?></span><?php if ($row['destroy_reason'] !== null): ?><small><?= AdminView::escape($row['destroy_reason']) ?></small><?php endif; ?></div></td>
            <td data-label="规则"><div class="cell-value"><?= (int) $row['view_seconds'] ?> 秒<small><?= AdminView::escape($modeLabels[$row['access_mode']] ?? $row['access_mode']) ?>模式</small></div></td>
            <td data-label="时间"><div class="cell-value"><span>创建 <?= AdminView::escape(AdminView::formatTime($row['created_at'], $app['config'])) ?></span><small>打开 <?= AdminView::escape(AdminView::formatTime($row['opened_at'], $app['config'])) ?></small><small>截止 <?= AdminView::escape(AdminView::formatTime($deadline, $app['config'])) ?></small><small>剩余 <span data-deadline="<?= $active ? (int) $deadline : 0 ?>"><?= $remaining ?></span> 秒</small></div></td>
            <td data-label="访问"><div class="cell-value"><?= (int) $row['access_count'] ?> 次</div></td>
            <td data-label="操作">
              <div class="cell-value">
              <?php if ($row['status'] !== 'destroyed'): ?>
                <form method="post" action="<?= AdminView::escape($base) ?>/destroy.php" data-confirm="确定立即销毁此闪照吗？此操作无法撤销。" data-submit-once>
                  <input type="hidden" name="csrf_token" value="<?= AdminView::escape($app['csrf']->token()) ?>">
                  <input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
                  <input type="hidden" name="page" value="<?= $page ?>">
                  <button class="danger-button" type="submit">销毁</button>
                </form>
              <?php else: ?>—<?php endif; ?>
              <small>链接不可恢复</small>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  <?php endif; ?>
  <nav class="pagination" aria-label="闪照记录分页">
    <?php if ($page > 1): ?>
      <a rel="prev" href="<?= AdminView::escape($base . '/list.php?page=' . ($page - 1)) ?>">上一页</a>
    <?php else: ?>
      <span aria-disabled="true">上一页</span>
    <?php endif; ?>
    <span aria-current="page">第 <?= $page ?> 页</span>
    <?php if ($hasMore): ?>
      <a rel="next" href="<?= AdminView::escape($base . '/list.php?page=' . ($page + 1)) ?>">下一页</a>
    <?php else: ?>
      <span aria-disabled="true">下一页</span>
    <?php endif; ?>
  </nav>
</section>
<?php AdminView::footer(); ?>
