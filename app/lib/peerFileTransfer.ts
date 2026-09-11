export const CHUNK_SIZE = 64 * 1024;
export const BUFFER_LOW_WATER = 256 * 1024;
const BUFFER_HIGH_WATER = 1024 * 1024;
const TIMEOUT_MS = 15_000;

function waitForChannelBuffer(channel: RTCDataChannel, signal: AbortSignal) {
  signal.throwIfAborted();
  if (channel.readyState !== "open") throw new Error("channel closed");
  if (channel.bufferedAmount <= BUFFER_HIGH_WATER) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      channel.removeEventListener("bufferedamountlow", handleLow);
      signal.removeEventListener("abort", handleAbort);
      if (error) reject(error);
      else resolve();
    };
    const handleLow = () => finish();
    const handleAbort = () => finish(signal.reason);
    const timeout = setTimeout(() => finish(new Error("channel stalled")), TIMEOUT_MS);
    channel.addEventListener("bufferedamountlow", handleLow);
    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

export function sendPeerFile(
  channel: RTCDataChannel,
  file: File,
  options: { id: string; name: string; signal: AbortSignal; onProgress: (progress: number) => void },
) {
  const { id, name, signal, onProgress } = options;
  return new Promise<void>((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;
    let awaitingReceipt = false;
    let receiptTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(receiptTimer);
      channel.removeEventListener("message", handleMessage);
      channel.removeEventListener("close", handleClose);
      channel.removeEventListener("error", handleClose);
      signal.removeEventListener("abort", handleAbort);
      controller.abort();
      if (error) reject(error);
      else resolve();
    };
    const handleClose = () => finish(new Error("channel closed"));
    const handleAbort = () => finish(signal.reason);
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== "string" || event.data.length > 12_000) return;
      let payload;
      try { payload = JSON.parse(event.data); } catch { return; }
      if (!payload || payload.id !== id) return;
      if (payload.kind === "file-reject") finish(new Error("file rejected"));
      if (payload.kind === "file-received" && awaitingReceipt) finish();
    };
    channel.addEventListener("message", handleMessage);
    channel.addEventListener("close", handleClose);
    channel.addEventListener("error", handleClose);
    signal.addEventListener("abort", handleAbort, { once: true });
    if (signal.aborted) { handleAbort(); return; }

    const send = (data: string | ArrayBuffer) => {
      controller.signal.throwIfAborted();
      if (channel.readyState !== "open") throw new Error("channel closed");
      if (typeof data === "string") channel.send(data);
      else channel.send(data);
    };
    const stream = async () => {
      try {
        send(JSON.stringify({ kind: "file-start", id, name, size: file.size, mime: file.type || "application/octet-stream" }));
        let sent = 0;
        let lastProgress = 0;
        while (sent < file.size) {
          await waitForChannelBuffer(channel, controller.signal);
          controller.signal.throwIfAborted();
          const buffer = await file.slice(sent, sent + CHUNK_SIZE).arrayBuffer();
          send(buffer);
          sent += buffer.byteLength;
          const progress = Math.min(99, Math.round((sent / file.size) * 100));
          if (progress - lastProgress >= 2 || progress === 99) {
            lastProgress = progress;
            onProgress(progress);
          }
        }
        await waitForChannelBuffer(channel, controller.signal);
        controller.signal.throwIfAborted();
        awaitingReceipt = true;
        receiptTimer = setTimeout(() => finish(new Error("receipt timed out")), TIMEOUT_MS);
        send(JSON.stringify({ kind: "file-end", id }));
      } catch (error) {
        finish(error instanceof Error ? error : new Error("file send failed"));
      }
    };
    void stream();
  });
}
