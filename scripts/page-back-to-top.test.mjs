import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL("../app/components/PageBackToTop.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function harness() {
  const slots = [];
  const effects = [];
  const listeners = new Map();
  const frames = new Map();
  const settings = { animationsEnabled: true, reduceAnimations: false };
  let cursor = 0;
  let id = 0;
  let pathname = "/";
  const attributes = new Map();
  const heading = {
    getAttribute: key => attributes.get(key) ?? null,
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: key => attributes.delete(key),
    focus(options) { this.focusOptions = options; },
    addEventListener(key, fn) { this.onBlur = fn; },
    removeEventListener() { this.onBlur = null; },
  };
  const window = {
    scrollY: 0, innerHeight: 800,
    matchMedia: () => ({ matches: false }),
    addEventListener: (key, fn) => listeners.set(key, fn),
    removeEventListener: key => listeners.delete(key),
    requestAnimationFrame(fn) { frames.set(++id, fn); return id; },
    cancelAnimationFrame: key => frames.delete(key),
    scrollTo(options) { this.lastScroll = options; this.scrollY = options.top; },
  };
  const exports = {};
  runInNewContext(source, {
    exports, window, document: { querySelector: () => heading },
    require: name => {
      if (name === "react/jsx-runtime") return require(name);
      if (name === "react") return {
        useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => { slots[i] = value; }]; },
        useRef(value) { return slots[cursor++] ??= { current: value }; },
        useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
      };
      if (name === "next/navigation") return { usePathname: () => pathname };
      if (name.endsWith("SettingsContext")) return { useSettingsContext: () => ({ settings }) };
      if (name.endsWith("useTranslation")) return { useTranslation: () => ({ tr: () => "Back to top" }) };
      throw new Error(name);
    },
  });
  const render = () => {
    cursor = 0;
    const tree = exports.default();
    effects.splice(0).forEach(fn => fn());
    return tree;
  };
  return {
    render, window, settings, heading, attributes, listeners, frames,
    navigate(path) { pathname = path; render(); },
    flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

test("the page return control is hidden until a full viewport has been scrolled", () => {
  const app = harness();
  app.render();
  assert.equal(app.render().props.hidden, true);
  app.window.scrollY = 900;
  app.listeners.get("scroll")();
  app.listeners.get("scroll")();
  assert.equal(app.frames.size, 1, "scroll updates are batched");
  app.flush();
  assert.equal(app.render().props.hidden, false);
  app.window.innerHeight = 1000;
  app.listeners.get("resize")();
  app.flush();
  assert.equal(app.render().props.hidden, true);
  app.window.innerHeight = 400;
  app.window.scrollY = 600;
  app.listeners.get("resize")();
  app.flush();
  assert.equal(app.render().props.hidden, true, "short viewports keep a 640px threshold");
  app.unmount();
});

test("returning to the top focuses the heading without changing its original tab order", () => {
  const app = harness();
  app.render().props.onClick();
  assert.equal(app.heading.focusOptions.preventScroll, true);
  assert.equal(app.attributes.get("tabindex"), "-1");
  assert.equal(app.window.lastScroll.top, 0);
  assert.equal(app.window.lastScroll.behavior, "smooth");
  app.heading.onBlur();
  assert.equal(app.attributes.has("tabindex"), false);
  app.attributes.set("tabindex", "0");
  app.render().props.onClick();
  app.heading.onBlur();
  assert.equal(app.attributes.get("tabindex"), "0");
  app.unmount();
});

test("return scrolling respects both site and system reduced-motion preferences", () => {
  for (const mode of ["reduced", "disabled", "system"]) {
    const app = harness();
    if (mode === "reduced") app.settings.reduceAnimations = true;
    if (mode === "disabled") app.settings.animationsEnabled = false;
    if (mode === "system") app.window.matchMedia = () => ({ matches: true });
    app.render().props.onClick();
    assert.equal(app.window.lastScroll.behavior, "instant", mode);
    app.unmount();
  }
});

test("page changes and unmounts cancel pending scrolling and release temporary focus state", () => {
  const app = harness();
  app.render().props.onClick();
  app.window.scrollY = 1200;
  app.listeners.get("scroll")();
  app.window.scrollY = 0;
  app.navigate("/skin-service/questions/");
  assert.equal(app.frames.size, 0);
  assert.equal(app.render().props.hidden, true);
  assert.equal(app.attributes.has("tabindex"), false);
  app.listeners.get("scroll")();
  app.unmount();
  assert.equal(app.frames.size, 0);
  assert.equal(app.listeners.size, 0);
});

test("the return label is localized in all supported site languages", async () => {
  const { langNames, getTranslation } = await import("../app/lib/i18n.ts");
  for (const language of Object.keys(langNames)) {
    const label = getTranslation(language, "backToTop");
    assert.ok(label && label !== "backToTop");
    if (language !== "en") assert.notEqual(label, "Back to top", language);
  }
});

test("the return control is integrated once and hidden behind all modal surfaces", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.equal((layout.match(/<PageBackToTop \/>/g) ?? []).length, 1);
  assert.match(css, /body:has\(dialog\[open\], \[role="dialog"\]\[aria-modal="true"\], \.settingsOverlay\) \.pageBackToTop \{ display: none; \}/);
  assert.match(css, /\.pageBackToTop\[hidden\]/);
  assert.match(css, /\.pageBackToTop \{[^}]*width: 44px;[^}]*height: 44px;/);
});
