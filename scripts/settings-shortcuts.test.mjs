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

function shortcut(target) {
  const updates = [];
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
    "./SettingsContext": { useSettingsContext: () => ({ settings: { masterVolume: 75, theme: "dark" }, update: (...args) => updates.push(args) }) },
    "../hooks/useTranslation": { useTranslation: () => ({ tr: key => key }) },
  };
  const exports = {};
  runInNewContext(source, {
    exports, require: name => mocks[name] ?? require(name), HTMLElement, HTMLInputElement,
    document: { body: { dataset: { theme: "dark" } }, querySelector: () => null },
    window: {
      addEventListener(name, fn) { if (name === "keydown") onKeyDown = fn; },
      removeEventListener() {}, setTimeout: () => 1, clearTimeout() {},
    },
  });
  exports.default().type();
  const element = target.type ? new HTMLInputElement(target.type) : new HTMLElement(target.tag ?? "BUTTON");
  element.isContentEditable = target.editable ?? false;
  let prevented = false;
  onKeyDown({ target: element, key: "m", ctrlKey: true, preventDefault() { prevented = true; } });
  return { updates, prevented };
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
    assert.deepEqual(shortcut(target), { updates: [], prevented: false });
  }
});
