(() => {
  'use strict';

  const match = window.location.pathname.match(/\/v\/([A-Za-z0-9_-]{43})\/?$/);
  const root = document.getElementById('viewer');
  const initialStage = document.getElementById('viewer-stage');
  const revealButton = document.getElementById('reveal-button');
  const soundToggle = document.getElementById('sound-toggle');
  const statusNotice = document.getElementById('viewer-status');
  if (!root || !initialStage || !revealButton || !soundToggle || !statusNotice) return;

  let token = match?.[1] || null;
  let stage = initialStage;
  let busy = false;
  let revealed = false;
  let blobUrl = null;
  let countdownTimer = null;
  let heartbeatTimer = null;
  let serverOffsetMs = null;
  let serverBaseMs = 0;
  let serverSampleAt = performance.now();
  let maxServerNowMs = 0;
  let clockVerificationRequired = false;
  let clockVerificationStarted = false;
  let clockVerificationRetryAt = 0;
  let expiresAtMs = 0;
  let lifecycle = 0;
  let visibilityEpoch = 0;
  let requestController = new AbortController();
  let statusRequest = null;
  let statusController = null;
  let obscureStatusFailure = false;
  let displayedImageBlob = null;
  let displayedGifAnimated = false;
  let gifFreezeTask = null;
  let soundEnabled = false;
  let audioNeedsResume = false;
  let statusVerified = true;
  let audioActivationGeneration = 0;
  let activeAudioOwner = 0;
  let audioContext = null;
  let ambientOscillator = null;
  let ambientGain = null;
  let audioCloseTimer = null;
  let lastTickSecond = null;
  let lastTickAt = 0;
  const requestTimeoutMs = 10000;
  const clockDriftToleranceMs = 1500;
  const reducedMotionFrameMaxPixels = 2073600;
  const reducedMotionFrameMaxWidth = 2048;
  const reducedMotionFrameMaxHeight = 2048;
  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
  const viewerKeyPattern = /^[a-f0-9]{64}$/;
  let viewerKey = history.state?.flashViewerKey;
  if (token && !viewerKeyPattern.test(viewerKey || '') && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    viewerKey = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  const adoptViewerKey = (candidate) => {
    if (!viewerKeyPattern.test(candidate || '')) throw new Error('invalid_viewer_identity');
    viewerKey = candidate;
    try {
      window.history.replaceState({flashViewerKey: viewerKey}, '', window.location.href);
    } catch {}
  };
  if (token && viewerKeyPattern.test(viewerKey || '')) {
    adoptViewerKey(viewerKey);
  } else {
    viewerKey = null;
  }
  const viewerLockNamePromise = token && window.crypto?.subtle && typeof TextEncoder === 'function'
    ? window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)).then((digest) =>
      `flash-photo-viewer:${Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, '0')).join('')}`
    ).catch(() => null)
    : Promise.resolve(null);

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const responseError = (response) => {
    const error = new Error(`http_${response.status}`);
    error.status = response.status;
    return error;
  };

  const abortError = () => new DOMException('Request aborted.', 'AbortError');

  const abortable = (promise, signal) => {
    if (signal.aborted) return Promise.reject(abortError());
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', abort);
        callback(value);
      };
      const abort = () => finish(reject, abortError());
      signal.addEventListener('abort', abort, {once: true});
      Promise.resolve(promise).then(
        (value) => finish(resolve, value),
        (error) => finish(reject, error)
      );
    });
  };

  const createAbortScope = (parentSignal, timeoutMs) => {
    const controller = new AbortController();
    let timeoutId = null;
    let timedOut = false;
    const abortFromParent = () => controller.abort();
    if (parentSignal.aborted) {
      abortFromParent();
    } else {
      parentSignal.addEventListener('abort', abortFromParent, {once: true});
    }
    if (!controller.signal.aborted && Number.isFinite(timeoutMs)) {
      const delayMs = Math.floor(timeoutMs);
      if (delayMs <= 0) {
        timedOut = true;
        controller.abort();
      } else {
        timeoutId = window.setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, delayMs);
      }
    }
    return {
      signal: controller.signal,
      timedOut: () => timedOut,
      cleanup: () => {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        parentSignal.removeEventListener('abort', abortFromParent);
      }
    };
  };

  const post = async (endpoint, signal) => {
    const startedAt = performance.now();
    const requestScope = createAbortScope(signal, requestTimeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: JSON.stringify({token, viewer_key: viewerKey}),
        credentials: 'same-origin',
        cache: 'no-store',
        signal: requestScope.signal
      });
      if (!response.ok) throw responseError(response);
      const data = await response.json();
      return {data, startedAt, receivedAt: performance.now(), receivedWallAt: Date.now()};
    } finally {
      requestScope.cleanup();
    }
  };

  const redeemWithBrowserLock = async (signal) => {
    const redeem = async () => {
      const redeemed = await post('/api/redeem.php', signal);
      adoptViewerKey(redeemed.data.viewer_key);
      return redeemed;
    };
    const lockName = await viewerLockNamePromise;
    if (signal.aborted) throw abortError();
    if (!navigator.locks?.request || !lockName) return redeem();
    return navigator.locks.request(lockName, {mode: 'exclusive', signal}, redeem);
  };

  const freezeGifFrame = async (blob, signal) => {
    if (blob.type !== 'image/gif' || !reducedMotionQuery?.matches) return blob;
    const sourceUrl = URL.createObjectURL(blob);
    const decoder = element('img');
    try {
      if (typeof decoder.decode === 'function') {
        decoder.src = sourceUrl;
        await abortable(decoder.decode(), signal);
      } else {
        await abortable(new Promise((resolve, reject) => {
          decoder.addEventListener('load', resolve, {once: true});
          decoder.addEventListener('error', reject, {once: true});
          decoder.src = sourceUrl;
        }), signal);
      }
      if (signal.aborted) throw new Error('request_aborted');
      const sourceWidth = decoder.naturalWidth;
      const sourceHeight = decoder.naturalHeight;
      if (sourceWidth < 1 || sourceHeight < 1) throw new Error('invalid_gif');
      const scale = Math.min(
        1,
        reducedMotionFrameMaxWidth / sourceWidth,
        reducedMotionFrameMaxHeight / sourceHeight,
        Math.sqrt(reducedMotionFrameMaxPixels / (sourceWidth * sourceHeight))
      );
      const canvas = element('canvas');
      canvas.width = Math.max(1, Math.floor(sourceWidth * scale));
      canvas.height = Math.max(1, Math.floor(sourceHeight * scale));
      const context = canvas.getContext('2d', {alpha: true});
      if (!context) throw new Error('canvas_unavailable');
      context.drawImage(decoder, 0, 0, canvas.width, canvas.height);
      const frozen = await abortable(new Promise((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error('gif_freeze_failed')), 'image/png');
      }), signal);
      if (signal.aborted) throw new Error('request_aborted');
      return frozen;
    } finally {
      decoder.removeAttribute('src');
      URL.revokeObjectURL(sourceUrl);
    }
  };

  const isCurrent = (version) => version === lifecycle && requestController && !requestController.signal.aborted && token;

  const serverNowMs = () => {
    const sampledAt = performance.now();
    const monotonicServerMs = serverBaseMs + Math.max(0, sampledAt - serverSampleAt);
    const wallServerMs = serverOffsetMs === null ? 0 : Date.now() + serverOffsetMs;
    if (serverOffsetMs !== null
        && Math.abs(wallServerMs - monotonicServerMs) > clockDriftToleranceMs) {
      clockVerificationRequired = true;
    }
    maxServerNowMs = Math.max(maxServerNowMs, monotonicServerMs);
    return maxServerNowMs;
  };

  const syncClock = ({data, startedAt, receivedAt, receivedWallAt}) => {
    if (!Number.isFinite(data.server_time)
        || !Number.isFinite(data.expires_at)
        || !Number.isFinite(receivedWallAt)) {
      throw new Error('invalid_time');
    }
    const roundTripMs = Math.max(0, receivedAt - startedAt);
    const conservativeServerMs = data.server_time * 1000 + 1000 + Math.ceil(roundTripMs);
    const currentServerMs = serverBaseMs
      ? serverBaseMs + Math.max(0, receivedAt - serverSampleAt)
      : 0;
    serverBaseMs = Math.max(maxServerNowMs, currentServerMs, conservativeServerMs);
    serverSampleAt = receivedAt;
    maxServerNowMs = serverBaseMs;
    serverOffsetMs = serverBaseMs - receivedWallAt;
    clockVerificationRequired = false;
    clockVerificationStarted = false;
    clockVerificationRetryAt = 0;
    expiresAtMs = data.expires_at * 1000;
  };

  const clearTimers = () => {
    if (countdownTimer) window.clearInterval(countdownTimer);
    if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    countdownTimer = null;
    heartbeatTimer = null;
  };

  const abortRequests = () => {
    lifecycle += 1;
    requestController?.abort();
    statusController?.abort();
    requestController = null;
    statusController = null;
    statusRequest = null;
  };

  const releaseImage = () => {
    root.querySelector('.flash-image')?.removeAttribute('src');
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = null;
    displayedImageBlob = null;
    displayedGifAnimated = false;
  };

  const setStatusMessage = (message = '') => {
    statusNotice.textContent = message;
  };

  const replaceStage = (card, label) => {
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', label);
    card.tabIndex = -1;
    stage.replaceWith(card);
    stage = card;
    card.focus({preventScroll: true});
  };

  const updateSoundToggle = () => {
    soundToggle.setAttribute('aria-pressed', String(soundEnabled));
    soundToggle.textContent = !soundEnabled
      ? '声音：关'
      : audioNeedsResume
        ? (statusVerified ? '声音：点击恢复' : '声音：等待验证')
        : '声音：开';
  };

  const stopAmbient = () => {
    try {
      ambientOscillator?.stop();
    } catch {}
    ambientOscillator = null;
    ambientGain = null;
  };

  const tone = (frequency, duration, volume, type = 'sine') => {
    if (!soundEnabled || !statusVerified || !audioContext || audioContext.state !== 'running') return;
    try {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch {}
  };

  const startAmbient = () => {
    if (!soundEnabled || !statusVerified || !revealed || document.hidden || !audioContext || audioContext.state !== 'running' || ambientOscillator) return;
    try {
      ambientOscillator = audioContext.createOscillator();
      ambientGain = audioContext.createGain();
      ambientOscillator.type = 'sine';
      ambientOscillator.frequency.value = 92;
      ambientGain.gain.value = 0.008;
      ambientOscillator.connect(ambientGain).connect(audioContext.destination);
      ambientOscillator.start();
    } catch {
      stopAmbient();
    }
  };

  const suspendAudio = () => {
    if (!audioContext || audioContext.state !== 'running') return;
    try {
      Promise.resolve(audioContext.suspend()).catch(() => {});
    } catch {}
  };

  const invalidateAudioActivation = () => {
    audioActivationGeneration += 1;
    activeAudioOwner = 0;
  };

  const activateAudio = () => {
    if (!soundEnabled || !statusVerified || !audioContext || document.hidden) return;
    const context = audioContext;
    if (context.state === 'closed') return;
    const resumeEpoch = visibilityEpoch;
    const activationOwner = ++audioActivationGeneration;
    activeAudioOwner = activationOwner;
    try {
      const resumed = context.resume();
      Promise.resolve(resumed).then(() => {
        const newerOwnerActive = activeAudioOwner !== 0 && activeAudioOwner !== activationOwner;
        if (document.hidden || !statusVerified || resumeEpoch !== visibilityEpoch || audioContext !== context || !soundEnabled || activeAudioOwner !== activationOwner) {
          if (!newerOwnerActive && context.state === 'running') {
            try {
              Promise.resolve(context.suspend()).catch(() => {});
            } catch {}
          }
          return;
        }
        startAmbient();
      }).catch(() => {
        if (activeAudioOwner !== activationOwner) return;
        activeAudioOwner = 0;
        if (audioContext === context && soundEnabled) {
          audioNeedsResume = true;
          updateSoundToggle();
        }
      });
    } catch {
      if (activeAudioOwner === activationOwner) activeAudioOwner = 0;
      audioNeedsResume = true;
      updateSoundToggle();
    }
  };

  const stopAudio = (playEnd = false) => {
    invalidateAudioActivation();
    if (audioCloseTimer) {
      window.clearTimeout(audioCloseTimer);
      audioCloseTimer = null;
    }
    if (playEnd) tone(196, 0.3, 0.025, 'triangle');
    stopAmbient();
    const context = audioContext;
    soundEnabled = false;
    audioNeedsResume = false;
    updateSoundToggle();
    if (!context) return;
    const close = () => {
      if (context.state === 'closed') return;
      try {
        Promise.resolve(context.close()).catch(() => {});
      } catch {}
    };
    if (playEnd && context.state === 'running') {
      audioCloseTimer = window.setTimeout(() => {
        close();
        if (audioContext === context) audioContext = null;
        audioCloseTimer = null;
      }, 320);
    } else {
      close();
      audioContext = null;
    }
  };

  const toggleSound = () => {
    if (revealed && !statusVerified) {
      if (soundEnabled) {
        stopAudio();
      } else {
        setStatusMessage('正在验证闪照状态，验证完成后才能开启声音。');
      }
      return;
    }
    if (soundEnabled) {
      if (audioNeedsResume) {
        audioNeedsResume = false;
        updateSoundToggle();
        activateAudio();
        return;
      }
      stopAudio();
      return;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioContext = new AudioContext();
      soundEnabled = true;
      audioNeedsResume = false;
      updateSoundToggle();
      activateAudio();
    } catch {
      audioContext = null;
      soundEnabled = false;
      updateSoundToggle();
    }
  };

  const renderEndedCard = (message) => {
    document.body.classList.remove('viewer-hidden');
    document.title = '闪照已结束';
    const card = element('section', 'viewer-card state-card');
    const mark = element('div', 'mark', 'F');
    mark.setAttribute('aria-hidden', 'true');
    card.append(mark, element('h1', '', '查看已结束'), element('p', 'viewer-copy', message));
    replaceStage(card, '闪照查看结束');
    root.setAttribute('aria-busy', 'false');
    soundToggle.disabled = true;
    setStatusMessage(`查看已结束。${message}`);
  };

  const renderEnded = (message = '闪照已过期或不可用。') => {
    if (!requestController && !token) return;
    const playEnd = revealed;
    abortRequests();
    clearTimers();
    releaseImage();
    token = null;
    revealed = false;
    busy = true;
    window.history.replaceState(null, '', '/');
    renderEndedCard(message);
    stopAudio(playEnd);
  };

  const transientMessage = (error) => {
    if (error?.status === 429) return '请求过于频繁，正在等待重新验证。';
    if (error?.status >= 500) return '服务暂时不可用，正在等待重新验证。';
    return '网络连接异常，正在等待重新验证。';
  };

  const verifyClock = () => {
    if (!revealed || !token || !requestController) return;
    if (!clockVerificationStarted) {
      clockVerificationStarted = true;
      invalidateAudioActivation();
      visibilityEpoch += 1;
      statusController?.abort();
      statusController = null;
      statusRequest = null;
      obscureStatusFailure = false;
    }
    document.body.classList.add('viewer-hidden');
    stage.classList.add('is-obscured');
    stage.dataset.obscuredMessage = '检测到设备时间变化，正在重新验证闪照状态。';
    statusVerified = false;
    setStatusMessage('检测到设备时间变化，正在重新验证闪照状态…');
    if (soundEnabled) {
      audioNeedsResume = true;
      updateSoundToggle();
      suspendAudio();
    }
    const sampledAt = performance.now();
    if (document.hidden
        || statusRequest
        || sampledAt < clockVerificationRetryAt
        || (displayedGifAnimated && reducedMotionQuery?.matches)) {
      return;
    }
    clockVerificationRetryAt = sampledAt + 5000;
    checkStatus('/api/status.php', true);
  };

  const updateCountdown = () => {
    if (!revealed) return;
    const now = serverNowMs();
    const remainingMs = expiresAtMs - now;
    if (remainingMs <= 0) {
      renderEnded();
      return;
    }
    if (clockVerificationRequired) {
      verifyClock();
      return;
    }
    const seconds = Math.ceil(remainingMs / 1000);
    const counter = document.getElementById('countdown');
    if (counter) counter.textContent = String(seconds);
    stage.classList.toggle('last-seconds', seconds <= 5);
    const wallNow = Date.now();
    if (seconds <= 5 && seconds !== lastTickSecond && wallNow - lastTickAt >= 1000 && !document.hidden) {
      lastTickSecond = seconds;
      lastTickAt = wallNow;
      tone(660, 0.07, 0.018, 'square');
    }
  };

  const checkStatus = (endpoint, obscureOnFailure = false) => {
    if (!revealed || !token || document.hidden || !requestController || (displayedGifAnimated && reducedMotionQuery?.matches)) {
      return Promise.resolve(false);
    }
    obscureStatusFailure ||= obscureOnFailure;
    if (statusRequest) return statusRequest;
    const version = lifecycle;
    const requestEpoch = visibilityEpoch;
    const controller = new AbortController();
    statusController = controller;
    statusRequest = (async () => {
      try {
        const sample = await post(endpoint, controller.signal);
        if (!isCurrent(version) || requestEpoch !== visibilityEpoch || document.hidden) return false;
        syncClock(sample);
        updateCountdown();
        if (!isCurrent(version) || requestEpoch !== visibilityEpoch || document.hidden) return false;
        statusVerified = true;
        updateSoundToggle();
        setStatusMessage();
        delete stage.dataset.obscuredMessage;
        if (!document.hidden && revealed && !(displayedGifAnimated && reducedMotionQuery?.matches)) {
          document.body.classList.remove('viewer-hidden');
          stage.classList.remove('is-obscured');
        }
        return true;
      } catch (error) {
        if (!isCurrent(version) || requestEpoch !== visibilityEpoch || controller.signal.aborted) return false;
        if (error?.status >= 400 && error.status < 500 && error.status !== 429) {
          renderEnded();
          return false;
        }
        const message = transientMessage(error);
        setStatusMessage(message);
        if (obscureStatusFailure) {
          document.body.classList.add('viewer-hidden');
          stage.classList.add('is-obscured');
          stage.dataset.obscuredMessage = message;
        }
        return false;
      } finally {
        if (statusController === controller) {
          statusController = null;
          statusRequest = null;
          obscureStatusFailure = false;
        }
      }
    })();
    return statusRequest;
  };

  const freezeDisplayedGif = () => {
    if (gifFreezeTask) return gifFreezeTask;
    const sourceBlob = displayedImageBlob;
    if (!revealed
        || !displayedGifAnimated
        || sourceBlob?.type !== 'image/gif'
        || !reducedMotionQuery?.matches
        || !requestController) {
      return Promise.resolve(false);
    }
    const version = lifecycle;
    const freezeScope = createAbortScope(requestController.signal, expiresAtMs - serverNowMs());
    gifFreezeTask = (async () => {
      try {
        const frozen = await freezeGifFrame(sourceBlob, freezeScope.signal);
        if (!isCurrent(version)
            || freezeScope.signal.aborted
            || !reducedMotionQuery?.matches
            || displayedImageBlob !== sourceBlob) {
          return false;
        }
        const image = root.querySelector('.flash-image');
        if (!image) throw new Error('image_unavailable');
        const nextBlobUrl = URL.createObjectURL(frozen);
        const previousBlobUrl = blobUrl;
        image.src = nextBlobUrl;
        blobUrl = nextBlobUrl;
        displayedImageBlob = frozen;
        displayedGifAnimated = false;
        if (previousBlobUrl) URL.revokeObjectURL(previousBlobUrl);
        setStatusMessage('正在重新验证闪照状态…');
        if (!document.hidden) await checkStatus('/api/status.php', true);
        return true;
      } catch (error) {
        if (!isCurrent(version)) return false;
        if (freezeScope.timedOut() || expiresAtMs <= serverNowMs()) {
          renderEnded();
          return false;
        }
        stage.dataset.obscuredMessage = '无法生成静态画面，请关闭减少动态效果后重试。';
        setStatusMessage('无法生成静态画面，请关闭减少动态效果后重试。');
        return false;
      } finally {
        freezeScope.cleanup();
        gifFreezeTask = null;
      }
    })();
    return gifFreezeTask;
  };

  const renderImage = (url) => {
    const card = element('section', 'viewer-card viewer-open');
    const bar = element('div', 'viewer-timer');
    bar.append(element('span', '', '剩余时间'), element('strong', '', ''));
    bar.lastElementChild.id = 'countdown';
    bar.append(element('span', '', '秒'));
    const frame = element('div', 'image-frame');
    const image = element('img', 'flash-image');
    image.src = url;
    image.alt = '限时闪照';
    image.draggable = false;
    image.addEventListener('dragstart', (event) => event.preventDefault());
    frame.append(image);
    const warning = element('p', 'warning', '无法阻止截图、录屏、开发者工具或另一台设备拍摄。');
    card.append(bar, frame, warning);
    replaceStage(card, '限时闪照查看区域');
  };

  const reveal = async () => {
    if (busy || revealed || !token || !requestController) return;
    busy = true;
    root.setAttribute('aria-busy', 'true');
    revealButton.disabled = true;
    revealButton.textContent = '正在打开…';
    setStatusMessage('正在安全打开闪照…');
    const version = lifecycle;
    const signal = requestController.signal;
    let redeemCompleted = false;
    try {
      const redeemed = await redeemWithBrowserLock(signal);
      if (!isCurrent(version)) return;
      redeemCompleted = true;
      syncClock(redeemed);
      const contentScope = createAbortScope(signal, expiresAtMs - serverNowMs());
      const expireContent = () => {
        if (contentScope.timedOut() && isCurrent(version)) renderEnded();
      };
      contentScope.signal.addEventListener('abort', expireContent, {once: true});
      if (contentScope.timedOut()) expireContent();
      try {
        const response = await fetch('/api/content.php', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({token, viewer_key: viewerKey}),
          credentials: 'same-origin',
          cache: 'no-store',
          signal: contentScope.signal
        });
        if (!response.ok) throw responseError(response);
        let blob = await response.blob();
        if (!isCurrent(version)) return;
        if (!blob.type.startsWith('image/')) throw new Error('invalid_content');
        blob = await freezeGifFrame(blob, contentScope.signal);
        if (!isCurrent(version) || contentScope.signal.aborted || expiresAtMs <= serverNowMs()) {
          throw new Error('invalid_content');
        }
        blobUrl = URL.createObjectURL(blob);
        displayedImageBlob = blob;
        displayedGifAnimated = blob.type === 'image/gif';
        revealed = true;
        statusVerified = true;
        document.title = '正在查看闪照';
        renderImage(blobUrl);
        if (contentScope.signal.aborted || expiresAtMs <= serverNowMs()) throw abortError();
        root.setAttribute('aria-busy', 'false');
        setStatusMessage('闪照已打开。');
        tone(392, 0.16, 0.025, 'triangle');
        const reducedAnimatedGif = displayedGifAnimated && reducedMotionQuery?.matches;
        if (document.hidden || reducedAnimatedGif) {
          document.body.classList.add('viewer-hidden');
          stage.classList.add('is-obscured');
          statusVerified = false;
          audioNeedsResume = soundEnabled;
          updateSoundToggle();
          suspendAudio();
          if (reducedAnimatedGif) {
            stage.dataset.obscuredMessage = '已根据减少动态效果设置暂停 GIF。';
            setStatusMessage('已暂停动态 GIF。');
          }
        } else {
          startAmbient();
        }
        countdownTimer = window.setInterval(updateCountdown, 250);
        heartbeatTimer = window.setInterval(() => checkStatus('/api/heartbeat.php'), 5000);
        updateCountdown();
      } finally {
        contentScope.signal.removeEventListener('abort', expireContent);
        contentScope.cleanup();
      }
    } catch (error) {
      if (!isCurrent(version)) return;
      if (expiresAtMs > 0 && expiresAtMs <= serverNowMs()) {
        renderEnded();
        return;
      }
      if (error?.status === 404) {
        renderEnded();
        return;
      }
      busy = false;
      root.setAttribute('aria-busy', 'false');
      revealButton.disabled = false;
      revealButton.textContent = '重试查看';
      setStatusMessage(redeemCompleted
        ? '服务器倒计时可能已经开始，请立即重试查看。'
        : transientMessage(error));
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      invalidateAudioActivation();
      visibilityEpoch += 1;
      statusController?.abort();
      statusController = null;
      statusRequest = null;
      obscureStatusFailure = false;
      if (revealed) {
        document.body.classList.add('viewer-hidden');
        stage.classList.add('is-obscured');
        statusVerified = false;
      }
      if (soundEnabled) {
        audioNeedsResume = true;
        updateSoundToggle();
        suspendAudio();
      }
      return;
    }
    if (!revealed) {
      statusVerified = true;
      updateSoundToggle();
      return;
    }
    if (displayedGifAnimated && reducedMotionQuery?.matches) {
      freezeDisplayedGif();
      return;
    }
    checkStatus('/api/status.php', true);
  });
  reducedMotionQuery?.addEventListener('change', () => {
    if (!revealed || !displayedGifAnimated) return;
    invalidateAudioActivation();
    visibilityEpoch += 1;
    statusController?.abort();
    statusController = null;
    statusRequest = null;
    obscureStatusFailure = false;
    statusVerified = false;
    if (reducedMotionQuery.matches) {
      document.body.classList.add('viewer-hidden');
      stage.classList.add('is-obscured');
      stage.dataset.obscuredMessage = '已根据减少动态效果设置暂停 GIF。';
      setStatusMessage('已暂停动态 GIF。');
      if (soundEnabled) audioNeedsResume = true;
      updateSoundToggle();
      suspendAudio();
      freezeDisplayedGif();
      return;
    }
    setStatusMessage('正在重新验证闪照状态…');
    if (!document.hidden) checkStatus('/api/status.php', true);
  });
  window.addEventListener('pagehide', () => {
    abortRequests();
    clearTimers();
    releaseImage();
    stopAudio();
    token = null;
    revealed = false;
    stage.replaceChildren();
    root.setAttribute('aria-busy', 'false');
    soundToggle.disabled = true;
    setStatusMessage('查看已结束。');
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && !token) {
      window.history.replaceState(null, '', '/');
      renderEndedCard('请重新打开有效链接。');
    }
  });
  revealButton.addEventListener('click', reveal);
  soundToggle.addEventListener('click', toggleSound);
  if (!token) {
    renderEnded('链接格式无效。');
  } else if (!viewerKey) {
    renderEnded('浏览器无法生成安全查看身份。');
  }
})();
