import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = ts.transpileModule(readFileSync(new URL("../app/components/AudioEngine.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness(overrides = {}) {
  const listeners = new Map();
  const timers = new Map();
  const slots = [];
  const effects = [];
  const contexts = [];
  let cursor = 0;
  let timerId = 0;
  let now = 1000;
  let settings = { sfxEnabled: true, sfxVolume: 28, sfxStyle: "Classic", masterVolume: 75, bgmEnabled: false, bgmVolume: 12, ...overrides };
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useCallback(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
    },
  };
  const param = () => ({ setValueAtTime() {}, setTargetAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ gain: param(), frequency: param(), detune: param(), Q: param(), connect() {}, disconnect() { this.disconnected = true; }, start() {}, stop() { this.stopped = true; } });
  class AudioContext {
    state = "running";
    currentTime = 0;
    oscillators = [];
    constructor() { contexts.push(this); }
    createOscillator() { const n = node(); this.oscillators.push(n); return n; }
    createGain = node;
    createBiquadFilter = node;
    async resume() { this.state = "running"; }
    async close() { this.state = "closed"; }
  }
  class Element {
    closest(selector) {
      if (selector.includes("button:not(:disabled)")) return this;
      return null;
    }
    matches() { return false; }
  }
  const environment = {
    AudioContext,
    visibilityState: "visible",
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    dispatchEvent(event) { for (const fn of listeners.get(event.type) ?? []) fn(event); },
    setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval() { return ++timerId; },
    clearInterval() {},
    querySelector() { return null; },
  };
  const exports = {};
  runInNewContext(source, {
    exports, require: name => name === "react" ? react : { useSettingsContext: () => ({ settings }) },
    window: environment, document: environment, Element, Event,
    CustomEvent: class extends Event { constructor(type, init) { super(type); this.detail = init.detail; } },
    performance: { now: () => now += 250 },
  });
  const render = patch => { settings = { ...settings, ...patch }; cursor = 0; exports.default(); effects.splice(0).forEach(fn => fn()); };
  render();
  return {
    contexts, environment, render,
    async fire(type, properties = {}) { await Promise.all([...listeners.get(type) ?? []].map(fn => fn({type, target: new Element(), button: 0, isPrimary: true, ...properties}))); },
    flushTimers() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
    count() { return contexts.reduce((sum, ctx) => sum + ctx.oscillators.length, 0); },
  };
}

test("right and middle clicks do not start audio or play activation sounds", async () => {
  const app = harness();
  await app.fire("pointerdown", { button: 2 });
  await app.fire("pointerdown", { button: 1 });
  assert.equal(app.contexts.length, 0);
});

test("pointer press and canceled drag stay silent; committed click plays once", async () => {
  const app = harness();
  await app.fire("pointerdown");
  assert.equal(app.count(), 0);
  await app.fire("click");
  assert.equal(app.count(), 1);
  app.unmount();
});

test("keyboard activation plays once on click, after keydown", async () => {
  const app = harness();
  await app.fire("keydown", { key: "Enter" });
  assert.equal(app.count(), 0);
  await app.fire("click", { detail: 0 });
  assert.equal(app.count(), 1);
  app.unmount();
});

test("settings shortcuts stay silent when unavailable, blocked, or held down", async () => {
  for (const state of ["service", "modal", "repeat"]) {
    const app = harness();
    app.environment.querySelector = selector => {
      if (selector === ".settingsFloatingButton") return state === "service" ? null : {};
      if (selector.includes("dialog")) return state === "modal" ? {} : null;
      return null;
    };
    await app.fire("keydown", { key: ",", ctrlKey: true, repeat: state === "repeat" });
    assert.equal(app.contexts.length, 0, state);
    assert.equal(app.count(), 0, state);
    app.unmount();
  }
});

test("available settings shortcuts honor mute and SFX preferences", async () => {
  for (const [settings, expected] of [[{}, 1], [{ sfxEnabled: false }, 0], [{ masterVolume: 0 }, 0], [{ sfxVolume: 0 }, 0]]) {
    const app = harness(settings);
    app.environment.querySelector = selector => selector === ".settingsFloatingButton" ? {} : null;
    await app.fire("keydown", { key: ",", ctrlKey: true });
    assert.equal(app.count(), expected);
    assert.equal(app.contexts.length, expected);
    app.unmount();
  }
});

test("BGM maintains one ambient group, cleans up on hide and mute, and resumes", async () => {
  const app = harness({ bgmEnabled: true, sfxEnabled: false });
  const states = [];
  app.environment.addEventListener("hanazar:bgm-state", event => states.push(event.detail.state));
  await app.fire("pointerdown");
  assert.equal(app.count(), 5);
  await app.fire("hanazar:bgm-state-request");
  assert.equal(app.count(), 5);
  app.environment.visibilityState = "hidden";
  await app.fire("visibilitychange");
  app.flushTimers();
  assert.ok(app.contexts[0].oscillators.every(n => n.stopped && n.disconnected));
  assert.equal(states.at(-1), "paused");
  app.environment.visibilityState = "visible";
  await app.fire("visibilitychange");
  assert.equal(app.count(), 10);
  app.render({ masterVolume: 0 });
  app.flushTimers();
  assert.equal(states.at(-1), "muted");
  assert.ok(app.contexts[0].oscillators.every(n => n.stopped));
  app.render({ masterVolume: 75 });
  assert.equal(app.count(), 15);
  app.unmount();
  app.flushTimers();
  assert.equal(app.contexts[0].state, "closed");
  assert.ok(app.contexts[0].oscillators.every(n => n.disconnected));
});
