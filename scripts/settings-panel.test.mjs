import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL("../app/components/SettingsPanel.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function harness() {
  const slots = [];
  const effects = [];
  const frames = new Map();
  const timers = new Map();
  const observers = new Set();
  const settings = { animationsEnabled: true, animModal: true, animSpeed: 100, language: "en", font: "sans", customFont: "" };
  let cursor = 0;
  let id = 0;
  let open = false;
  const react = {
    useState(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = value;
      return [slots[i], next => { slots[i] = next; }];
    },
    useRef(value) { return slots[cursor++] ??= { current: value }; },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) slots[i] = { fn, deps };
      return slots[i].fn;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) {
        effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
      }
    },
  };
  const attributes = new Map();
  const main = {
    getAttribute: key => attributes.get(key) ?? null,
    hasAttribute: key => attributes.has(key),
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: key => attributes.delete(key),
  };
  class HTMLElement { focus() { this.focused = true; } }
  const trigger = new HTMLElement();
  const document = {
    activeElement: trigger,
    body: { style: { overflow: "", paddingRight: "" } },
    documentElement: { clientWidth: 1000 },
    querySelector: () => main,
    addEventListener() {}, removeEventListener() {},
  };
  const exports = {};
  runInNewContext(source, {
    exports, HTMLElement, document, window: { innerWidth: 1020 },
    getComputedStyle: () => ({ paddingRight: "4px" }),
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; observers.add(this); }
      observe() {}
      disconnect() { observers.delete(this); }
    },
    requestAnimationFrame(fn) { frames.set(++id, fn); return id; },
    cancelAnimationFrame: key => frames.delete(key),
    setTimeout(fn) { timers.set(++id, fn); return id; },
    clearTimeout: key => timers.delete(key),
    require: name => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return require(name);
      if (name.endsWith("useTranslation")) return { useTranslation: () => ({ tr: key => key }) };
      if (name.endsWith("SettingsContext")) return { useSettingsContext: () => ({ settings }) };
      return { default: "div" };
    },
  });
  const onClose = () => {};
  const render = (nextOpen = open) => {
    open = nextOpen;
    cursor = 0;
    const tree = exports.default({ open, onClose });
    effects.splice(0).forEach(fn => fn());
    return tree;
  };
  return {
    render, document, main, trigger, frames, observers, settings,
    flushFrames: () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); },
    unmount: () => slots.forEach(slot => slot?.cleanup?.()),
  };
}

function find(tree, predicate) {
  if (!tree || typeof tree !== "object") return;
  if (predicate(tree)) return tree;
  for (const child of [tree.props?.children].flat(Infinity)) {
    const match = find(child, predicate);
    if (match) return match;
  }
}

test("settings content is a keyboard focus stop even when it has no controls", () => {
  const app = harness();
  app.render(true);
  const panel = find(app.render(), element => element.props?.role === "tabpanel");
  assert.equal(panel.props.tabIndex, 0);
  app.unmount();
});

test("settings category icons do not prefix the translated accessible tab names", () => {
  const app = harness();
  app.render(true);
  const navigation = find(app.render(), element => element.props?.role === "tablist");
  assert.equal(navigation.props.children.length, 9);
  for (const tab of navigation.props.children) {
    const icon = find(tab, element => element.props?.className === "settingsTabIcon");
    const label = find(tab, element => element.props?.className === "settingsTabLabel");
    assert.equal(icon.props["aria-hidden"], "true");
    assert.ok(label.props.children);
  }
  app.unmount();
});

test("an unopened settings panel never restores another dialog's scroll lock or inert state", () => {
  const app = harness();
  app.render(false);
  app.document.body.style.overflow = "hidden";
  app.document.body.style.paddingRight = "12px";
  app.main.setAttribute("inert", "");
  app.main.setAttribute("aria-hidden", "true");
  app.unmount();
  assert.equal(app.document.body.style.overflow, "hidden");
  assert.equal(app.document.body.style.paddingRight, "12px");
  assert.equal(app.main.getAttribute("aria-hidden"), "true");
  assert.equal(app.main.hasAttribute("inert"), true);
});

test("closing before the next animation frame cancels the pending entrance", () => {
  const app = harness();
  app.render(true);
  assert.equal(app.frames.size, 1);
  app.render(false);
  assert.equal(app.frames.size, 0);
  app.unmount();
});

test("closing settings restores the captured scroll, background and focus state", () => {
  const app = harness();
  app.document.body.style.overflow = "clip";
  app.document.body.style.paddingRight = "4px";
  app.main.setAttribute("aria-hidden", "false");
  app.render(true);
  assert.equal(app.document.body.style.overflow, "hidden");
  assert.equal(app.document.body.style.paddingRight, "24px");
  assert.equal(app.main.hasAttribute("inert"), true);
  app.render(false);
  assert.equal(app.document.body.style.overflow, "clip");
  assert.equal(app.document.body.style.paddingRight, "4px");
  assert.equal(app.main.getAttribute("aria-hidden"), "false");
  assert.equal(app.main.hasAttribute("inert"), false);
  assert.equal(app.trigger.focused, true);
  app.unmount();
});

function navigationHarness() {
  const app = harness();
  app.render(true);
  const navTree = find(app.render(), node => node.props?.role === "tablist");
  const tabs = navTree.props.children;
  let selected = "style";
  let rect = { left: 10, right: 310, top: 100, bottom: 166 };
  const bounds = new Map(tabs.map(tab => [tab.props.id, { left: 30, right: 118, top: 110, bottom: 154 }]));
  const scrolls = [];
  const nav = {
    getBoundingClientRect: () => rect,
    querySelector: () => ({ getBoundingClientRect: () => bounds.get(`settings-tab-${selected}`) }),
    scrollBy: options => scrolls.push(options),
  };
  navTree.props.ref.current = nav;
  app.document.getElementById = id => ({ focus: () => {}, getBoundingClientRect: () => bounds.get(id) });
  return {
    ...app, tabs, scrolls, bounds,
    resize(next) { rect = next; app.observers.forEach(observer => observer.callback()); app.flushFrames(); },
    select(key) { selected = key; tabs.find(tab => tab.props.id === `settings-tab-${key}`).props.onClick(); app.render(); app.flushFrames(); },
  };
}

test("resizing settings reveals the selected category inside its own navigation", () => {
  const app = navigationHarness();
  app.bounds.set("settings-tab-about", { left: 820, right: 908, top: 110, bottom: 154 });
  app.select("about");
  assert.equal(app.scrolls.at(-1)?.left, 606);
  assert.equal(app.scrolls.at(-1)?.behavior, "instant");
  app.scrolls.length = 0;
  app.resize({ left: 10, right: 250, top: 100, bottom: 166 });
  assert.equal(app.scrolls.at(-1)?.left, 666);
  app.bounds.set("settings-tab-about", { left: 20, right: 108, top: 780, bottom: 824 });
  app.resize({ left: 10, right: 190, top: 100, bottom: 700 });
  assert.equal(app.scrolls.at(-1)?.top, 132);
  app.unmount();
  assert.equal(app.observers.size, 0);
  assert.equal(app.frames.size, 0);
});

test("changing language or font and reopening settings keeps the selected tab visible", () => {
  const app = navigationHarness();
  app.bounds.set("settings-tab-language", { left: -130, right: 5, top: 110, bottom: 154 });
  app.select("language");
  assert.equal(app.scrolls.at(-1)?.left, -148);
  for (const [key, value] of [["language", "ja"], ["font", "serif"], ["customFont", "Example Font"]]) {
    app.scrolls.length = 0;
    app.settings[key] = value;
    app.render();
    app.flushFrames();
    assert.equal(app.scrolls.at(-1)?.left, -148, key);
  }
  app.render(false);
  assert.equal(app.observers.size, 0);
  app.scrolls.length = 0;
  app.render(true);
  app.flushFrames();
  assert.equal(app.scrolls.at(-1)?.left, -148);
  app.unmount();
});
