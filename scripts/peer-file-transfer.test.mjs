import assert from "node:assert/strict";
import test from "node:test";
import { sendPeerFile } from "../app/lib/peerFileTransfer.ts";

class Channel extends EventTarget {
  readyState = "open";
  bufferedAmount = 0;
  sent = [];
  send(data) { this.sent.push(data); this.onSend?.(data); }
  reply(kind, id = "file-1") { this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ kind, id }) })); }
}

const tick = () => new Promise(resolve => setImmediate(resolve));
const transfer = (channel, options = {}) => sendPeerFile(channel, new File([new Uint8Array(150_000)], "file.txt"), {
  id: "file-1", name: "file.txt", signal: new AbortController().signal, onProgress() {}, ...options,
});

test("successful sends wait for the matching receiver receipt and preserve file bytes", async () => {
  const channel = new Channel();
  const progress = [];
  let complete = false;
  const result = transfer(channel, { onProgress: value => progress.push(value) }).then(() => { complete = true; });
  while (!channel.sent.some(data => typeof data === "string" && JSON.parse(data).kind === "file-end")) await tick();
  assert.equal(complete, false);
  channel.reply("file-received", "unrelated");
  await tick();
  assert.equal(complete, false);
  channel.reply("file-received");
  await result;
  assert.deepEqual(Buffer.concat(channel.sent.filter(data => data instanceof ArrayBuffer).map(data => Buffer.from(data))), Buffer.alloc(150_000));
  assert.equal(progress.at(-1), 99);
});

test("receiver rejection stops bytes and the file footer immediately", async () => {
  const channel = new Channel();
  channel.onSend = data => { if (typeof data === "string") channel.reply("file-reject"); };
  await assert.rejects(transfer(channel), /file rejected/);
  assert.equal(channel.sent.length, 1);
});

test("a canceled file read cannot send bytes or complete in a replacement session", async () => {
  const channel = new Channel();
  const controller = new AbortController();
  let finishRead;
  const file = { size: 4, type: "", slice: () => ({ arrayBuffer: () => new Promise(resolve => { finishRead = resolve; }) }) };
  const result = sendPeerFile(channel, file, { id: "file-1", name: "slow.txt", signal: controller.signal, onProgress() {} });
  const rejected = assert.rejects(result, { name: "AbortError" });
  await tick();
  controller.abort();
  await rejected;
  finishRead(new ArrayBuffer(4));
  await tick();
  assert.equal(channel.sent.length, 1);
});

test("rejection interrupts backpressure without waiting for the buffer timeout", async () => {
  const channel = new Channel();
  channel.bufferedAmount = 2 * 1024 * 1024;
  const result = transfer(channel);
  const rejected = assert.rejects(result, /file rejected/);
  await tick();
  channel.reply("file-reject");
  await rejected;
  channel.bufferedAmount = 0;
  channel.dispatchEvent(new Event("bufferedamountlow"));
  await tick();
  assert.equal(channel.sent.length, 1);
});

test("closed channels fail while waiting for the receipt", async () => {
  const channel = new Channel();
  channel.onSend = data => {
    if (typeof data === "string" && JSON.parse(data).kind === "file-end") channel.dispatchEvent(new Event("close"));
  };
  await assert.rejects(transfer(channel), /channel closed/);
});

test("empty files also require acknowledgement", async () => {
  const channel = new Channel();
  channel.onSend = data => { if (JSON.parse(data).kind === "file-end") channel.reply("file-received"); };
  await sendPeerFile(channel, new File([], "empty.txt"), { id: "file-1", name: "empty.txt", signal: new AbortController().signal, onProgress() {} });
  assert.deepEqual(channel.sent.map(data => JSON.parse(data).kind), ["file-start", "file-end"]);
});

test("missing receipts time out instead of reporting success", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const channel = new Channel();
  const result = transfer(channel);
  const rejected = assert.rejects(result, /receipt timed out/);
  while (!channel.sent.some(data => typeof data === "string" && JSON.parse(data).kind === "file-end")) await tick();
  t.mock.timers.tick(15_000);
  await rejected;
});
