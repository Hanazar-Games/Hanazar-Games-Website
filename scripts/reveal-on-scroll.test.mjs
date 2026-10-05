import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = ts.transpileModule(readFileSync(new URL("../app/hooks/useRevealOnScroll.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness({ supported = true, broken = false } = {}) {
  const listeners = new Map();
  const timers = new Map();
  const nodes = Array.from({ length: 3 }, () => {
    const classes = new Set();
    return {
      classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) },
      matches() { return Boolean(this.focused); },
    };
  });
  let cleanup;
  let observer;
  let timerId = 0;
  class IntersectionObserver {
    targets = new Set();
    constructor(callback, options) {
      if (broken) throw new Error("Observer unavailable");
      this.callback = callback;
      this.options = options;
      observer = this;
    }
    observe(node) { this.targets.add(node); }
    unobserve(node) { this.targets.delete(node); }
    disconnect() { this.targets.clear(); }
  }
  const environment = {
    ...(supported ? { IntersectionObserver } : {}),
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  };
  const exports = {};
  runInNewContext(source, {
    exports, IntersectionObserver,
    require: () => ({ useEffect(fn) { cleanup = fn(); } }),
    window: environment,
    document: {
      querySelectorAll: () => nodes,
      addEventListener: (name, fn) => listeners.set(name, fn),
      removeEventListener: name => listeners.delete(name),
    },
  });
  exports.useRevealOnScroll();
  return {
    nodes, observer, timers, listeners,
    notify(entries) { observer.callback(entries.map(([index, isIntersecting]) => ({ target: nodes[index], isIntersecting }))); },
    focus(index) { nodes[index].focused = true; listeners.get("focusin")?.(); },
    flushTimers() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); },
    unmount() { cleanup?.(); },
  };
}

test("a healthy observer preserves offscreen entrances after the startup timeout", () => {
  const app = harness();
  app.notify([[0, true], [1, false], [2, false]]);
  app.flushTimers();
  assert.equal(app.nodes[0].classList.contains("revealVisible"), true);
  assert.equal(app.nodes[1].classList.contains("revealPending"), true);
  assert.equal(app.observer.targets.size, 2);
  app.notify([[1, true]]);
  assert.equal(app.nodes[1].classList.contains("revealPending"), false);
  assert.equal(app.nodes[1].classList.contains("revealVisible"), true);
  assert.equal(app.observer.targets.size, 1);
  app.unmount();
});

test("very tall cards can enter as soon as they intersect the viewport", () => {
  const app = harness();
  assert.equal(app.observer.options.threshold, 0);
  assert.equal(app.observer.options.rootMargin, "0px 0px -24px 0px");
  app.unmount();
});

test("missing, failed and nonresponsive observers never leave content hidden", () => {
  for (const options of [{ supported: false }, { broken: true }, {}]) {
    const app = harness(options);
    app.flushTimers();
    assert.ok(app.nodes.every(node => !node.classList.contains("revealPending")));
    assert.equal(app.observer?.targets.size ?? 0, 0);
    app.unmount();
  }
});

test("keyboard focus reveals pending content immediately without an entrance replay", () => {
  const app = harness();
  app.notify([[0, false], [1, false], [2, false]]);
  app.focus(1);
  assert.equal(app.nodes[1].classList.contains("revealPending"), false);
  assert.equal(app.nodes[1].classList.contains("revealVisible"), false);
  assert.equal(app.observer.targets.has(app.nodes[1]), false);
  app.unmount();
});

test("cleanup removes pending visibility, observers, timers and focus listeners", () => {
  const app = harness();
  app.unmount();
  assert.ok(app.nodes.every(node => !node.classList.contains("revealPending")));
  assert.equal(app.observer.targets.size, 0);
  assert.equal(app.timers.size, 0);
  assert.equal(app.listeners.size, 0);
});
