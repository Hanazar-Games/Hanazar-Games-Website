<?php

declare(strict_types=1);

use FlashPhoto\AdminView;
use FlashPhoto\Response;

$app = require __DIR__ . '/_bootstrap.php';
admin_require($app);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    Response::methodNotAllowed(['GET'], false);
}
$counts = $app['flash']->dashboard();
$recent = $app['flash']->listRecords(5);
AdminView::header('概览', $app['config'], $app['csrf'], 'dashboard');
?>
<section class="stat-grid" aria-label="闪照状态概览">
  <article class="stat-card"><span>未打开</span><strong><?= $counts['unused'] ?></strong></article>
  <article class="stat-card"><span>查看中</span><strong><?= $counts['opened'] ?></strong></article>
  <article class="stat-card"><span>已过期</span><strong><?= $counts['expired'] ?></strong></article>
  <article class="stat-card"><span>已销毁</span><strong><?= $counts['destroyed'] ?></strong></article>
  <article class="stat-card stat-wide"><span>活动文件占用</span><strong><?= AdminView::escape(AdminView::formatBytes($counts['total_bytes'])) ?></strong></article>
</section>
<section class="panel">
  <div class="panel-heading"><h2>最近记录</h2><a href="<?= AdminView::escape($app['config']->string('admin_path')) ?>/list.php">查看全部</a></div>
  <?php if ($recent === []): ?>
    <p class="empty">还没有上传记录。</p>
  <?php else: ?>
    <div class="table-wrap">
      <table>
        <caption class="sr-only">最近上传的闪照记录</caption>
        <thead><tr><th scope="col">ID</th><th scope="col">文件名</th><th scope="col">状态</th><th scope="col">创建时间</th></tr></thead>
        <tbody>
        <?php foreach ($recent as $row): ?>
          <tr>
            <td data-label="ID"><?= (int) $row['id'] ?></td>
            <td data-label="文件名"><?= AdminView::escape($row['original_name']) ?></td>
            <td data-label="状态"><span class="status status-<?= AdminView::escape($row['status']) ?>"><?= AdminView::escape(['unused' => '未打开', 'opened' => '查看中', 'expired' => '已过期', 'destroyed' => '已销毁'][$row['status']] ?? $row['status']) ?></span></td>
            <td data-label="创建时间"><?= AdminView::escape(AdminView::formatTime($row['created_at'], $app['config'])) ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  <?php endif; ?>
</section>
<?php AdminView::footer(); ?>
