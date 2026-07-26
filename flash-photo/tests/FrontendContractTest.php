<?php

declare(strict_types=1);

namespace FlashPhoto\Tests;

use PHPUnit\Framework\TestCase;

final class FrontendContractTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        $this->root = dirname(__DIR__);
    }

    public function testViewerMarkupExposesPersistentStatusAndOptInSound(): void
    {
        $page = $this->source('public/view.php');

        self::assertStringNotContainsString("['viewer']->id()", $page);
        self::assertStringContainsString('id="viewer-status"', $page);
        self::assertStringContainsString('aria-live="polite"', $page);
        self::assertStringContainsString('aria-busy="false"', $page);
        self::assertStringContainsString('id="sound-toggle"', $page);
        self::assertStringContainsString('aria-pressed="false"', $page);
        self::assertStringContainsString('不保存设置', $page);
        self::assertStringNotContainsString('<audio', $page);
        self::assertStringNotContainsString('autoplay', $page);
    }

    public function testHtmlPagesDeclareTheLocalFavicon(): void
    {
        foreach ([
            'public/view.php',
            'public/index.php',
            'public/404.php',
            'public/admin/login.php',
            'public/admin/_bootstrap.php',
            'app/AdminView.php',
            'app/Response.php',
            'app/bootstrap.php',
        ] as $path) {
            self::assertStringContainsString(
                'rel="icon" href="/favicon.svg" type="image/svg+xml"',
                $this->source($path),
                $path
            );
        }
        self::assertFileExists($this->root . '/public/favicon.svg');
    }

    public function testReducedMotionGifFrameScaleCapsExtremeAspectRatios(): void
    {
        $script = $this->source('public/assets/viewer.js');

        self::assertStringContainsString('const reducedMotionFrameMaxPixels = 2073600', $script);
        self::assertStringContainsString('const reducedMotionFrameMaxWidth = 2048', $script);
        self::assertStringContainsString('const reducedMotionFrameMaxHeight = 2048', $script);
        self::assertStringContainsString('reducedMotionFrameMaxWidth / sourceWidth', $script);
        self::assertStringContainsString('reducedMotionFrameMaxHeight / sourceHeight', $script);

        foreach ([[100000, 1], [1, 100000]] as [$width, $height]) {
            $scale = min(1, 2048 / $width, 2048 / $height, sqrt(2073600 / ($width * $height)));
            $scaledWidth = max(1, (int) floor($width * $scale));
            $scaledHeight = max(1, (int) floor($height * $scale));

            self::assertLessThanOrEqual(2048, $scaledWidth);
            self::assertLessThanOrEqual(2048, $scaledHeight);
            self::assertLessThanOrEqual(2073600, $scaledWidth * $scaledHeight);
        }
    }

    public function testRuntimeReducedMotionFreezesTheDisplayedGifWithoutRefetching(): void
    {
        $script = $this->source('public/assets/viewer.js');

        self::assertStringContainsString('let displayedImageBlob = null', $script);
        self::assertStringContainsString('displayedImageBlob = blob', $script);
        self::assertStringContainsString('const freezeDisplayedGif = () => {', $script);
        self::assertStringContainsString('const sourceBlob = displayedImageBlob', $script);
        self::assertStringContainsString(
            'createAbortScope(requestController.signal, expiresAtMs - serverNowMs())',
            $script
        );
        self::assertStringContainsString('displayedImageBlob !== sourceBlob', $script);
        self::assertStringContainsString('freezeScope.signal.aborted', $script);
        self::assertStringContainsString('freezeScope.cleanup()', $script);
        self::assertStringContainsString('displayedGifAnimated = false', $script);
        self::assertStringContainsString("if (!document.hidden) await checkStatus('/api/status.php', true);", $script);
        self::assertSame(1, substr_count($script, "fetch('/api/content.php'"));

        $freezeStart = strpos($script, 'const freezeDisplayedGif = () => {');
        $listenerStart = strpos($script, "reducedMotionQuery?.addEventListener('change', () => {");
        $listenerEnd = strpos($script, "window.addEventListener('pagehide'", $listenerStart ?: 0);
        self::assertIsInt($freezeStart);
        self::assertIsInt($listenerStart);
        self::assertIsInt($listenerEnd);
        $listener = substr($script, $listenerStart, $listenerEnd - $listenerStart);
        self::assertStringContainsString('freezeDisplayedGif()', $listener);
        self::assertStringNotContainsString("fetch('/api/content.php'", $listener);

        $replaceStart = strpos($script, 'const nextBlobUrl = URL.createObjectURL(frozen)', $freezeStart);
        $assignSource = strpos($script, 'image.src = nextBlobUrl', $replaceStart ?: 0);
        $revokePrevious = strpos($script, 'URL.revokeObjectURL(previousBlobUrl)', $assignSource ?: 0);
        self::assertIsInt($replaceStart);
        self::assertIsInt($assignSource);
        self::assertIsInt($revokePrevious);
        self::assertLessThan($revokePrevious, $assignSource);
    }

    public function testViewerLifecycleAndAudioAreGuarded(): void
    {
        $script = $this->source('public/assets/viewer.js');

        self::assertStringNotContainsString("addEventListener('contextmenu'", $script);
        self::assertStringContainsString('new AbortController()', $script);
        self::assertStringContainsString('signal:', $script);
        self::assertStringContainsString("addEventListener('pagehide'", $script);
        self::assertStringContainsString('statusRequest', $script);
        self::assertStringContainsString('AudioContext', $script);
        self::assertStringContainsString("audioContext.suspend()", $script);
        self::assertStringContainsString('requestController?.abort()', $script);
        self::assertStringContainsString('visibilityEpoch', $script);
        self::assertStringContainsString('statusController?.abort()', $script);
        self::assertStringContainsString('requestEpoch !== visibilityEpoch', $script);
        self::assertStringContainsString('startedAt', $script);
        self::assertStringContainsString('receivedAt', $script);
        self::assertStringContainsString('receivedWallAt', $script);
        self::assertStringContainsString('serverNowMs()', $script);
        self::assertStringContainsString('serverOffsetMs', $script);
        self::assertStringContainsString('maxServerNowMs', $script);
        self::assertStringContainsString('clockVerificationRequired', $script);
        self::assertStringContainsString('clockDriftToleranceMs', $script);
        self::assertStringContainsString('Math.abs(wallServerMs - monotonicServerMs) > clockDriftToleranceMs', $script);
        self::assertStringContainsString('maxServerNowMs = Math.max(maxServerNowMs, monotonicServerMs)', $script);
        self::assertStringNotContainsString('Math.max(maxServerNowMs, monotonicServerMs, wallServerMs)', $script);
        self::assertStringContainsString('serverOffsetMs = serverBaseMs - receivedWallAt', $script);
        self::assertStringContainsString('serverBaseMs = Math.max(maxServerNowMs, currentServerMs, conservativeServerMs)', $script);
        self::assertStringContainsString('data.server_time * 1000 + 1000 + Math.ceil(roundTripMs)', $script);
        self::assertStringNotContainsString('data.server_time * 1000 + 999', $script);
        self::assertStringContainsString('resumeEpoch !== visibilityEpoch', $script);
        self::assertStringContainsString('document.hidden || !statusVerified || resumeEpoch !== visibilityEpoch', $script);
        self::assertStringContainsString('audioActivationGeneration', $script);
        self::assertStringContainsString('activeAudioOwner', $script);
        self::assertStringContainsString('invalidateAudioActivation()', $script);
        self::assertStringContainsString("if (revealed && !statusVerified) {\n      if (soundEnabled) {\n        stopAudio();", $script);
        self::assertStringContainsString('const activationOwner = ++audioActivationGeneration', $script);
        self::assertStringContainsString('const resumed = context.resume()', $script);
        self::assertStringContainsString('const requestTimeoutMs = 10000', $script);
        self::assertStringContainsString('createAbortScope', $script);
        self::assertStringContainsString('createAbortScope(signal, requestTimeoutMs)', $script);
        self::assertStringContainsString('signal: requestScope.signal', $script);
        self::assertStringContainsString("parentSignal.removeEventListener('abort', abortFromParent)", $script);
        self::assertStringContainsString('window.clearTimeout(timeoutId)', $script);
        self::assertStringContainsString('createAbortScope(signal, expiresAtMs - serverNowMs())', $script);
        self::assertStringContainsString('signal: contentScope.signal', $script);
        self::assertStringContainsString('contentScope.timedOut()', $script);
        self::assertStringContainsString("if (contentScope.timedOut() && isCurrent(version)) renderEnded();", $script);
        self::assertStringContainsString("contentScope.signal.addEventListener('abort', expireContent, {once: true})", $script);
        self::assertStringContainsString('contentScope.signal.removeEventListener(\'abort\', expireContent)', $script);
        self::assertStringContainsString('contentScope.cleanup()', $script);
        self::assertGreaterThan(
            strpos($script, 'renderImage(blobUrl)'),
            strpos($script, 'contentScope.cleanup()')
        );
        self::assertStringContainsString('expiresAtMs > 0 && expiresAtMs <= serverNowMs()', $script);
        self::assertStringContainsString('const verifyClock = () => {', $script);
        self::assertStringContainsString("stage.dataset.obscuredMessage = '检测到设备时间变化，正在重新验证闪照状态。'", $script);
        self::assertStringContainsString("checkStatus('/api/status.php', true)", $script);
        self::assertStringContainsString("if (clockVerificationRequired) {\n      verifyClock();\n      return;", $script);
        $expiryCleanup = strpos($script, "const remainingMs = expiresAtMs - now;\n    if (remainingMs <= 0) {");
        $clockVerification = strpos($script, 'if (clockVerificationRequired) {');
        self::assertIsInt($expiryCleanup);
        self::assertIsInt($clockVerification);
        self::assertLessThan($clockVerification, $expiryCleanup);
        self::assertStringNotContainsString('AbortSignal.timeout', $script);
        self::assertStringContainsString("cache: 'no-store'", $script);
        self::assertStringContainsString("credentials: 'same-origin'", $script);
        self::assertStringNotContainsString('localStorage', $script);
        self::assertStringNotContainsString('sessionStorage', $script);
        self::assertStringNotContainsString('document.cookie', $script);
        self::assertStringContainsString("matchMedia?.('(prefers-reduced-motion: reduce)')", $script);
        self::assertStringContainsString("reducedMotionQuery?.addEventListener('change'", $script);
        self::assertStringContainsString('displayedGifAnimated', $script);
        self::assertStringContainsString(
            "if (!revealed || !displayedGifAnimated) return;\n    invalidateAudioActivation();\n    visibilityEpoch += 1;\n    statusController?.abort();",
            $script
        );
        self::assertStringContainsString('displayedGifAnimated && reducedMotionQuery?.matches', $script);
        self::assertStringContainsString('const reducedAnimatedGif = displayedGifAnimated && reducedMotionQuery?.matches', $script);
        self::assertStringContainsString('if (document.hidden || reducedAnimatedGif)', $script);
        self::assertStringContainsString("stage.dataset.obscuredMessage = '已根据减少动态效果设置暂停 GIF。'", $script);
        self::assertStringContainsString(
            "setStatusMessage('正在重新验证闪照状态…');\n    if (!document.hidden) checkStatus('/api/status.php', true);",
            $script
        );
        self::assertStringContainsString('freezeGifFrame', $script);
        self::assertStringContainsString('const reducedMotionFrameMaxPixels = 2073600', $script);
        self::assertStringContainsString('Math.sqrt(reducedMotionFrameMaxPixels / (sourceWidth * sourceHeight))', $script);
        self::assertStringNotContainsString('const maxPixels = 16000000', $script);
        self::assertStringContainsString('canvas.toBlob', $script);
        self::assertStringContainsString('abortable(', $script);
        self::assertStringContainsString('freezeGifFrame(blob, contentScope.signal)', $script);
        self::assertStringContainsString('contentScope.signal.aborted', $script);
        self::assertStringContainsString("decoder.removeAttribute('src')", $script);
        self::assertStringContainsString('URL.revokeObjectURL(sourceUrl)', $script);
        self::assertStringContainsString("card.setAttribute('role', 'region')", $script);
        self::assertStringContainsString("card.setAttribute('aria-label', label)", $script);
        self::assertStringContainsString('card.tabIndex = -1', $script);
        self::assertStringContainsString('card.focus({preventScroll: true})', $script);
        self::assertStringContainsString('const renderEndedCard = (message) => {', $script);
        self::assertStringContainsString('renderEndedCard(message)', $script);
        self::assertStringContainsString("renderEndedCard('请重新打开有效链接。')", $script);
        self::assertStringContainsString("window.history.replaceState(null, '', '/')", $script);
        self::assertStringContainsString('setStatusMessage(`查看已结束。${message}`)', $script);
        self::assertStringContainsString("replaceStage(card, '闪照查看结束')", $script);
        self::assertStringContainsString("replaceStage(card, '限时闪照查看区域')", $script);
        self::assertStringContainsString('if (!soundEnabled || !statusVerified || !audioContext', $script);
        self::assertStringContainsString('if (!soundEnabled || !statusVerified || !revealed', $script);
        self::assertStringContainsString('if (!soundEnabled || !statusVerified || !audioContext || document.hidden)', $script);
    }

    public function testViewerProofMakesRedeemRetrySafeAndTokenScoped(): void
    {
        $endpoint = $this->source('public/api/redeem.php');
        $content = $this->source('public/api/content.php');
        $status = $this->source('public/api/status.php');
        $heartbeat = $this->source('public/api/heartbeat.php');
        $script = $this->source('public/assets/viewer.js');

        $redeem = strpos($endpoint, "['flash']->redeem(");
        $remember = strpos($endpoint, "['viewer']->remember(");
        $canonical = strpos($endpoint, "\$result['viewer_key'] = \$viewerId");
        self::assertIsInt($redeem);
        self::assertIsInt($remember);
        self::assertIsInt($canonical);
        self::assertLessThan($remember, $redeem);
        self::assertLessThan($canonical, $remember);
        self::assertStringContainsString("\$data['viewer_key'] ?? null", $endpoint);
        foreach ([$content, $status, $heartbeat] as $api) {
            self::assertStringContainsString("\$data['viewer_key'] ?? null", $api);
        }
        self::assertStringContainsString('crypto.getRandomValues', $script);
        self::assertStringContainsString('history.state?.flashViewerKey', $script);
        self::assertStringContainsString('flashViewerKey: viewerKey', $script);
        self::assertStringContainsString('JSON.stringify({token, viewer_key: viewerKey})', $script);
        self::assertStringContainsString('navigator.locks.request', $script);
        self::assertStringContainsString('redeemWithBrowserLock', $script);
        self::assertStringContainsString('adoptViewerKey(redeemed.data.viewer_key)', $script);
        self::assertStringContainsString("crypto.subtle.digest('SHA-256'", $script);
        self::assertStringNotContainsString('`flash-photo-viewer:${token}`', $script);
        self::assertStringNotContainsString('identity_ready', $script);
    }

    public function testPublicViewerValidationUsesUniformNotFoundResponses(): void
    {
        $api = $this->source('app/Api.php');
        $content = $this->source('public/api/content.php');

        self::assertStringContainsString('catch (NotFoundException|ValidationException)', $api);
        self::assertStringContainsString('catch (NotFoundException|ValidationException)', $content);
        self::assertStringNotContainsString("['error' => 'invalid_request'", $api);
        self::assertStringNotContainsString("['error' => 'invalid_request'", $content);
    }

    public function testAdminMarkupHasNavigationAndTableSemantics(): void
    {
        $view = $this->source('app/AdminView.php');
        $dashboard = $this->source('public/admin/index.php');
        $list = $this->source('public/admin/list.php');

        self::assertStringContainsString('class="skip-link"', $view);
        self::assertStringContainsString('aria-label="管理导航"', $view);
        self::assertStringContainsString('aria-current="page"', $view);
        foreach ([$dashboard, $list] as $page) {
            self::assertStringContainsString('<caption', $page);
            self::assertStringContainsString('scope="col"', $page);
            self::assertStringContainsString('data-label=', $page);
        }
    }

    public function testAdminJavascriptGuardsSubmissionAndCleansPreview(): void
    {
        $script = $this->source('public/assets/admin.js');
        $upload = $this->source('public/admin/upload.php');
        $list = $this->source('public/admin/list.php');

        self::assertStringContainsString('data-copy-status', $upload);
        self::assertStringContainsString('aria-live="polite"', $upload);
        self::assertStringContainsString('data-submit-once', $upload);
        self::assertStringContainsString('data-submit-once', $list);
        self::assertStringContainsString('input?.files?.[0]', $script);
        self::assertStringContainsString('form.dataset.submitting', $script);
        self::assertStringContainsString('URL.revokeObjectURL', $script);
        self::assertStringContainsString("addEventListener('pagehide'", $script);
        self::assertStringContainsString('data-server-time', $list);
        self::assertStringContainsString('data-deadline', $list);
        self::assertStringContainsString('serverClockReady', $script);
        self::assertStringContainsString("addEventListener('pageshow'", $script);
        self::assertStringContainsString('initializeCountdowns', $script);
        self::assertStringContainsString("const initializeCountdowns = () => {\n    stopCountdowns();", $script);
        self::assertStringContainsString('performance.now()', $script);
        self::assertStringContainsString("getEntriesByType?.('navigation')", $script);
        self::assertStringContainsString('requestStartMs', $script);
        self::assertStringContainsString('sampledAt - requestStartMs', $script);
        self::assertStringContainsString(': sampledAt;', $script);
        self::assertStringContainsString('serverTimeMs + 1000 + Math.ceil(elapsedSinceRequestMs)', $script);
        self::assertStringNotContainsString('responseStartMs', $script);
        self::assertStringNotContainsString('serverTimeMs + 999', $script);
        self::assertStringContainsString('Math.max(lastServerNowMs, monotonicServerMs)', $script);
        self::assertStringNotContainsString('wallServerMs', $script);
        self::assertStringContainsString('clockDriftToleranceMs', $script);
        self::assertStringContainsString('Math.abs(wallElapsedMs - monotonicElapsedMs) > clockDriftToleranceMs', $script);
        self::assertStringContainsString('window.location.reload()', $script);
        self::assertStringContainsString('submitLockDisabled', $script);
        self::assertStringContainsString("querySelectorAll('[data-submit-lock-disabled]')", $script);
        self::assertStringContainsString('delete form.dataset.submitting', $script);
        self::assertStringContainsString('if (control.disabled) return;', $script);
        self::assertStringContainsString("matchMedia?.('(prefers-reduced-motion: reduce)')", $script);
        self::assertStringContainsString("file.type === 'image/gif'", $script);
        self::assertStringContainsString('减少动态效果时不播放动画预览', $script);
        self::assertStringContainsString("reducedMotionQuery?.addEventListener('change', updatePreview)", $script);
    }

    public function testAdminUploadNonceAndOneTimeResultAreEnforced(): void
    {
        $script = $this->source('public/assets/admin.js');
        $upload = $this->source('public/admin/upload.php');

        self::assertStringContainsString("\$_SESSION['admin_upload_nonces']", $upload);
        self::assertStringContainsString('$uploadNonceTtlSeconds', $upload);
        self::assertStringContainsString('$uploadNonceLimit', $upload);
        self::assertStringContainsString('hash_equals(', $upload);
        $consume = strpos($upload, 'unset($uploadNonces[$matchedNonce])');
        $create = strpos($upload, "['flash']->create(");
        self::assertIsInt($consume);
        self::assertIsInt($create);
        self::assertLessThan($create, $consume);
        self::assertStringNotContainsString("unset(\$_SESSION['admin_upload_nonces'])", $upload);
        self::assertStringContainsString('http_response_code(409)', $upload);
        self::assertStringContainsString('name="upload_nonce"', $upload);
        self::assertStringContainsString('data-one-time-success', $upload);
        self::assertStringContainsString("target.value = ''", $script);
        self::assertStringContainsString("target.removeAttribute('value')", $script);
        self::assertStringContainsString('successPanel.remove()', $script);
        self::assertStringContainsString('event.persisted', $script);
    }

    public function testAdminMobileCellsAndExpiredCountdownHaveExplicitTargets(): void
    {
        $script = $this->source('public/assets/admin.js');
        $list = $this->source('public/admin/list.php');
        $styles = $this->source('public/assets/app.css');

        self::assertSame(6, substr_count($list, '<div class="cell-value">'));
        self::assertStringContainsString('data-active-status', $list);
        self::assertStringContainsString("status.textContent = '已到期'", $script);
        self::assertStringContainsString("status.classList.add('status-expired')", $script);
        self::assertStringContainsString('.records-table td > .cell-value', $styles);
        self::assertStringContainsString('grid-column: 2', $styles);
    }

    public function testStylesRespectViewportMotionAndTouchTargets(): void
    {
        $styles = $this->source('public/assets/app.css');

        self::assertStringContainsString('100dvh', $styles);
        self::assertStringContainsString('env(safe-area-inset-', $styles);
        self::assertStringContainsString('min-height: 44px', $styles);
        self::assertStringContainsString('@media (prefers-reduced-motion: reduce)', $styles);
    }

    private function source(string $path): string
    {
        $contents = file_get_contents($this->root . '/' . $path);
        self::assertIsString($contents);
        return $contents;
    }
}
