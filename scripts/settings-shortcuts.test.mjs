import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL("../app/components/SettingsLauncher.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function shortcut(target, event = {}, settings = {}) {
  const updates = [];
  let unlocks = 0;
  let onKeyDown;
  class HTMLElement {
    constructor(tagName) { this.tagName = tagName; this.isContentEditable = false; }
  }
  class HTMLInputElement extends HTMLElement {
    constructor(type) { super("INPUT"); this.type = type; }
  }
  const mocks = {
    react: { useRef: value => ({ current: value }), useState: () => [false, () => {}], useCallback: fn => fn, useEffect: fn => fn() },
    "next/navigation": { usePathname: () => "/" },
    "./SettingsPanel": { default: "div" },
    "./SettingsContext": { useSettingsContext: () => ({ settings: { masterVolume: 75, theme: "dark", ...settings }, update: (...args) => updates.push(args) }) },
    "../hooks/useTranslation": { useTranslation: () => ({ tr: key => key }) },
  };
  const exports = {};
  runInNewContext(source, {
    exports, require: name => mocks[name] ?? require(name), HTMLElement, HTMLInputElement, Event,
    document: { body: { dataset: { theme: "dark" } }, querySelector: () => null },
    window: {
      addEventListener(name, fn) { if (name === "keydown") onKeyDown = fn; },
      removeEventListener() {}, setTimeout: () => 1, clearTimeout() {},
      dispatchEvent(event) { if (event.type === "hanazar:audio-unlock") unlocks++; },
    },
  });
  exports.default().type();
  const element = target.type ? new HTMLInputElement(target.type) : new HTMLElement(target.tag ?? "BUTTON");
  element.isContentEditable = target.editable ?? false;
  let prevented = false;
  onKeyDown({ target: element, key: "m", ctrlKey: true, preventDefault() { prevented = true; }, ...event });
  return { updates, prevented, unlocks };
}

test("mute shortcut works while checkboxes, radio buttons, and sliders have focus", () => {
  for (const target of [{ type: "checkbox" }, { type: "radio" }, { type: "range" }, { tag: "BUTTON" }]) {
    const result = shortcut(target);
    assert.deepEqual(result.updates, [["masterVolume", 0]], JSON.stringify(target));
    assert.equal(result.prevented, true);
  }
});

test("global mute does not intercept typing or select controls", () => {
  for (const target of [{ type: "text" }, { type: "search" }, { type: "email" }, { tag: "TEXTAREA" }, { tag: "SELECT" }, { tag: "DIV", editable: true }]) {
    assert.deepEqual(shortcut(target), { updates: [], prevented: false, unlocks: 0 });
  }
});

test("holding mute or theme shortcuts prevents repeats without leaking the browser shortcut", () => {
  for (const event of [{ key: "m" }, { key: "l", shiftKey: true }]) {
    assert.deepEqual(shortcut({}, { ...event, repeat: true }), { updates: [], prevented: true, unlocks: 0 });
  }
});

test("only a valid BGM unmute shortcut requests audio recovery", () => {
  const result = shortcut({}, {}, { masterVolume: 0, bgmEnabled: true, bgmVolume: 12 });
  assert.deepEqual(result, { updates: [["masterVolume", 80]], prevented: true, unlocks: 1 });
  for (const settings of [{ masterVolume: 75, bgmEnabled: true, bgmVolume: 12 }, { masterVolume: 0, bgmEnabled: false }, { masterVolume: 0, bgmEnabled: true, bgmVolume: 0 }]) {
    assert.equal(shortcut({}, {}, settings).unlocks, 0);
  }
  assert.equal(shortcut({ type: "text" }, {}, { masterVolume: 0, bgmEnabled: true, bgmVolume: 12 }).unlocks, 0);
});
