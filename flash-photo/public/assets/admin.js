(() => {
  'use strict';

  const input = document.querySelector('[data-preview-input]');
  const image = document.querySelector('[data-preview-image]');
  const placeholder = document.querySelector('[data-preview-placeholder]');
  const countdownRoot = document.querySelector('[data-server-time]');
  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
  const previewPlaceholderText = placeholder?.textContent || '选择图片后在此预览';
  const clockDriftToleranceMs = 1500;
  let previewUrl = null;
  let countdownTimer = null;
  let serverClockReady = false;
  let lastServerNowMs = 0;
  let serverClockSampleAt = 0;
  let wallClockSampleAt = 0;
  let clockReloading = false;

  const releasePreview = (clearImage = true) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    if (clearImage) image?.removeAttribute('src');
  };

  const updatePreview = () => {
    releasePreview();
    const file = input?.files?.[0];
    if (!file || !file.type.startsWith('image/') || !image || !placeholder) {
      if (image) image.hidden = true;
      if (placeholder) {
        placeholder.textContent = previewPlaceholderText;
        placeholder.hidden = false;
      }
      return;
    }
    if (file.type === 'image/gif' && reducedMotionQuery?.matches) {
      image.hidden = true;
      placeholder.textContent = '已选择 GIF；减少动态效果时不播放动画预览。';
      placeholder.hidden = false;
      return;
    }
    placeholder.textContent = previewPlaceholderText;
    previewUrl = URL.createObjectURL(file);
    image.src = previewUrl;
    image.hidden = false;
    placeholder.hidden = true;
  };

  input?.addEventListener('change', updatePreview);
  reducedMotionQuery?.addEventListener('change', updatePreview);

  image?.addEventListener('load', () => releasePreview(false));
  image?.addEventListener('error', () => {
    releasePreview();
    image.hidden = true;
    if (placeholder) placeholder.hidden = false;
  });

  document.querySelectorAll('[data-copy-target]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      const status = document.getElementById(button.dataset.copyStatus || '');
      if (!(target instanceof HTMLInputElement)) return;
      try {
        await navigator.clipboard.writeText(target.value);
        if (status) status.textContent = '链接已复制到剪贴板。';
      } catch {
        target.select();
        target.setSelectionRange(0, target.value.length);
        if (status) status.textContent = '无法自动复制，请手动复制已选中的链接。';
      }
    });
  });

  const scrubOneTimeSuccess = () => {
    const successPanel = document.querySelector('[data-one-time-success]');
    if (!successPanel) return;
    const target = successPanel.querySelector('#generated-link');
    if (target instanceof HTMLInputElement) {
      target.value = '';
      target.removeAttribute('value');
    }
    successPanel.remove();
  };

  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (!window.confirm(form.dataset.confirm || '确定继续吗？')) event.preventDefault();
    });
  });

  document.querySelectorAll('form[data-submit-once]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (event.defaultPrevented) return;
      if (form.dataset.submitting === 'true') {
        event.preventDefault();
        return;
      }
      form.dataset.submitting = 'true';
      form.setAttribute('aria-busy', 'true');
      form.querySelectorAll('button[type="submit"], input[type="submit"]').forEach((control) => {
        if (control.disabled) return;
        control.dataset.submitLockDisabled = 'true';
        control.disabled = true;
      });
    });
  });

  const stopCountdowns = () => {
    if (countdownTimer) window.clearInterval(countdownTimer);
    countdownTimer = null;
  };

  const serverNowMs = () => {
    if (clockReloading) return null;
    const sampledAt = performance.now();
    const sampledWallAt = Date.now();
    const monotonicElapsedMs = Math.max(0, sampledAt - serverClockSampleAt);
    const wallElapsedMs = sampledWallAt - wallClockSampleAt;
    if (Math.abs(wallElapsedMs - monotonicElapsedMs) > clockDriftToleranceMs) {
      clockReloading = true;
      window.location.reload();
      return null;
    }
    const monotonicServerMs = lastServerNowMs + monotonicElapsedMs;
    lastServerNowMs = Math.max(lastServerNowMs, monotonicServerMs);
    serverClockSampleAt = sampledAt;
    wallClockSampleAt = sampledWallAt;
    return lastServerNowMs;
  };

  const initializeCountdowns = () => {
    stopCountdowns();
    if (!countdownRoot) return;
    const serverTimeMs = Number(countdownRoot.dataset.serverTime) * 1000;
    if (!serverClockReady) {
      const sampledAt = performance.now();
      const navigationEntry = performance.getEntriesByType?.('navigation')?.[0];
      const requestStartMs = Number(navigationEntry?.requestStart);
      const elapsedSinceRequestMs = Number.isFinite(requestStartMs)
        && requestStartMs > 0
        && requestStartMs <= sampledAt
        ? sampledAt - requestStartMs
        : sampledAt;
      const conservativeServerMs = serverTimeMs + 1000 + Math.ceil(elapsedSinceRequestMs);
      if (Number.isFinite(conservativeServerMs)) {
        lastServerNowMs = conservativeServerMs;
        serverClockSampleAt = sampledAt;
        wallClockSampleAt = Date.now();
        serverClockReady = true;
      }
    }
    const countdowns = [...countdownRoot.querySelectorAll('[data-deadline]')];
    const markExpired = (countdown) => {
      const status = countdown.closest('tr')?.querySelector('[data-active-status]');
      if (!(status instanceof HTMLElement)) return;
      status.textContent = '已到期';
      status.classList.remove('status-unused', 'status-opened');
      status.classList.add('status-expired');
      delete status.dataset.activeStatus;
    };
    const updateCountdowns = () => {
      let active = false;
      const now = serverNowMs();
      if (now === null) return false;
      countdowns.forEach((countdown) => {
        const deadlineMs = Number(countdown.dataset.deadline) * 1000;
        const remaining = Number.isFinite(deadlineMs) ? Math.max(0, Math.ceil((deadlineMs - now) / 1000)) : 0;
        countdown.textContent = String(remaining);
        if (remaining > 0) {
          active = true;
        } else {
          markExpired(countdown);
        }
      });
      return active;
    };
    if (serverClockReady && updateCountdowns()) {
      countdownTimer = window.setInterval(() => {
        if (!updateCountdowns()) {
          window.clearInterval(countdownTimer);
          countdownTimer = null;
        }
      }, 1000);
    }
  };

  const resetSubmissionLocks = () => {
    document.querySelectorAll('form[data-submit-once]').forEach((form) => {
      if (form.dataset.submitting !== 'true') return;
      delete form.dataset.submitting;
      form.removeAttribute('aria-busy');
      form.querySelectorAll('[data-submit-lock-disabled]').forEach((control) => {
        control.disabled = false;
        delete control.dataset.submitLockDisabled;
      });
    });
  };

  updatePreview();
  initializeCountdowns();

  window.addEventListener('pagehide', () => {
    scrubOneTimeSuccess();
    releasePreview();
    stopCountdowns();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) scrubOneTimeSuccess();
    resetSubmissionLocks();
    updatePreview();
    initializeCountdowns();
  });
})();
