<?php

declare(strict_types=1);

use FlashPhoto\AdminView;
use FlashPhoto\HttpException;
use FlashPhoto\RateLimitException;
use FlashPhoto\Response;
use FlashPhoto\Validator;

$app = require __DIR__ . '/_bootstrap.php';
$adminId = admin_require($app);
$base = $app['config']->string('admin_path');
$error = null;
$selectedDuration = $app['config']->int('default_view_seconds');
$selectedExpiry = $app['config']->int('default_unused_expiry_seconds');
$selectedMode = 'global';
$created = null;
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if (!in_array($method, ['GET', 'POST'], true)) {
    Response::methodNotAllowed(['GET', 'POST'], false);
}

$uploadNonceTtlSeconds = 1800;
$uploadNonceLimit = 8;
$now = time();
$storedUploadNonces = $_SESSION['admin_upload_nonces'] ?? [];
$uploadNonces = is_array($storedUploadNonces) ? $storedUploadNonces : [];
foreach ($uploadNonces as $nonce => $expiresAt) {
    if (!is_string($nonce)
        || preg_match('/^[a-f0-9]{64}$/D', $nonce) !== 1
        || !is_int($expiresAt)
        || $expiresAt <= $now) {
        unset($uploadNonces[$nonce]);
    }
}
arsort($uploadNonces, SORT_NUMERIC);
$uploadNonces = array_slice($uploadNonces, 0, $uploadNonceLimit, true);

if ($method === 'POST') {
    admin_verify_post($app);
    $selectedDuration = filter_var($_POST['view_seconds'] ?? null, FILTER_VALIDATE_INT) ?: 0;
    $selectedExpiry = filter_var($_POST['unused_expiry_seconds'] ?? null, FILTER_VALIDATE_INT) ?: 0;
    $selectedMode = is_string($_POST['access_mode'] ?? null) ? $_POST['access_mode'] : '';
    $providedNonce = $_POST['upload_nonce'] ?? null;
    $matchedNonce = null;
    if (is_string($providedNonce)) {
        foreach (array_keys($uploadNonces) as $storedNonce) {
            if (hash_equals($storedNonce, $providedNonce)) {
                $matchedNonce = $storedNonce;
                break;
            }
        }
    }
    if ($matchedNonce === null) {
        http_response_code(409);
        $error = '上传表单已失效，请重新选择图片后提交';
        $app['flash']->recordAudit('upload_rejected', $adminId, null, ['status' => 409]);
    } else {
        unset($uploadNonces[$matchedNonce]);
        $_SESSION['admin_upload_nonces'] = $uploadNonces;
        try {
            $app['rate_limiter']->consume('upload', $app['identity']->ipHash());
            $validator = new Validator($app['config']);
            $image = $validator->validateUpload(is_array($_FILES['image'] ?? null) ? $_FILES['image'] : []);
            $created = $app['flash']->create($image, $selectedDuration, $selectedExpiry, $selectedMode, $adminId);
        } catch (RateLimitException $exception) {
            if ($exception->firstExceeded) {
                $app['flash']->recordAudit('rate_limit_triggered', $adminId, null, ['scope' => 'upload']);
            }
            $app['flash']->recordAudit('upload_rejected', $adminId, null, ['status' => $exception->status]);
            http_response_code($exception->status);
            header('Retry-After: ' . $exception->headers['Retry-After']);
            $error = $exception->getMessage();
        } catch (HttpException $exception) {
            $app['flash']->recordAudit('upload_rejected', $adminId, null, ['status' => $exception->status]);
            http_response_code($exception->status);
            $error = $exception->getMessage();
        }
    }
}

$uploadNonce = bin2hex(random_bytes(32));
if (count($uploadNonces) >= $uploadNonceLimit) {
    asort($uploadNonces, SORT_NUMERIC);
    $oldestNonce = array_key_first($uploadNonces);
    if ($oldestNonce !== null) {
        unset($uploadNonces[$oldestNonce]);
    }
}
$uploadNonces[$uploadNonce] = time() + $uploadNonceTtlSeconds;
$_SESSION['admin_upload_nonces'] = $uploadNonces;

$durations = [15, 30, 60];
$expiries = [300 => '5 分钟', 3600 => '1 小时', 86400 => '24 小时', 604800 => '7 天', 2592000 => '30 天'];
if (!isset($expiries[$selectedExpiry])) {
    if ($selectedExpiry >= 300 && $selectedExpiry <= 2592000) {
        $expiries = [$selectedExpiry => $selectedExpiry . ' 秒（默认）'] + $expiries;
    } else {
        $selectedExpiry = 86400;
    }
}
AdminView::header('上传闪照', $app['config'], $app['csrf'], 'upload');
?>
<?php if ($created !== null): ?>
  <section class="panel success-panel" aria-labelledby="created-title" data-one-time-success>
    <p class="eyebrow">LINK GENERATED</p>
    <h2 id="created-title">链接已生成</h2>
    <p>此完整链接仅在本页显示一次。离开或刷新后无法找回，只能重新上传。</p>
    <div class="copy-row">
      <input id="generated-link" type="text" readonly value="<?= AdminView::escape($created['url'] ?? '') ?>" aria-label="生成的闪照链接">
      <button class="secondary-button" type="button" data-copy-target="generated-link" data-copy-status="copy-status">复制链接</button>
    </div>
    <p class="copy-status" id="copy-status" aria-live="polite" aria-atomic="true"></p>
    <p class="field-hint">未打开有效期至 <?= AdminView::escape(AdminView::formatTime($created['unused_expires_at'] ?? null, $app['config'])) ?></p>
  </section>
<?php endif; ?>

<?php if ($error !== null): ?><div class="alert alert-error" role="alert"><?= AdminView::escape($error) ?></div><?php endif; ?>

<section class="panel upload-layout">
  <form class="form-stack" method="post" action="<?= AdminView::escape($base) ?>/upload.php" enctype="multipart/form-data" data-submit-once>
    <input type="hidden" name="csrf_token" value="<?= AdminView::escape($app['csrf']->token()) ?>">
    <input type="hidden" name="upload_nonce" value="<?= AdminView::escape($uploadNonce) ?>">
    <label>图片
      <input id="image-input" name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required data-preview-input>
      <span class="field-hint">JPEG、PNG、WebP 或 GIF，最大 <?= AdminView::escape(AdminView::formatBytes($app['config']->int('max_upload_bytes'))) ?></span>
    </label>
    <fieldset>
      <legend>查看时长</legend>
      <div class="choice-row">
      <?php foreach ($durations as $duration): ?>
        <label class="choice"><input type="radio" name="view_seconds" value="<?= $duration ?>" <?= $duration === $selectedDuration ? 'checked' : '' ?> required><span><?= $duration ?> 秒</span></label>
      <?php endforeach; ?>
      </div>
    </fieldset>
    <label>未打开有效期
      <select name="unused_expiry_seconds" required>
      <?php foreach ($expiries as $seconds => $label): ?>
        <option value="<?= $seconds ?>" <?= $seconds === $selectedExpiry ? 'selected' : '' ?>><?= AdminView::escape($label) ?></option>
      <?php endforeach; ?>
      </select>
    </label>
    <fieldset>
      <legend>访问模式</legend>
      <div class="mode-grid">
        <label class="choice mode-choice"><input type="radio" name="access_mode" value="global" <?= $selectedMode === 'global' ? 'checked' : '' ?> required><span><strong>全局倒计时</strong><small>链接打开后，所有访问者共享剩余时间。</small></span></label>
        <label class="choice mode-choice"><input type="radio" name="access_mode" value="first" <?= $selectedMode === 'first' ? 'checked' : '' ?> required><span><strong>首位查看者</strong><small>仅首次打开该链接的浏览器可继续查看。</small></span></label>
      </div>
    </fieldset>
    <button class="primary-button" type="submit">上传并生成链接</button>
  </form>
  <div class="preview-box" data-preview-box>
    <img alt="待上传图片预览" data-preview-image hidden>
    <p data-preview-placeholder>选择图片后在此预览</p>
  </div>
</section>
<?php AdminView::footer(); ?>
