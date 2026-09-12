import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as batches from "../app/lib/reviewBatches.ts";
import * as translations from "../app/lib/skinServiceI18n.ts";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL("../app/components/SkinServiceCenter.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function render(language = "zh-CN") {
  const exports = {};
  const mocks = {
    "next/link": { default: ({ children, ...props }) => createElement("a", props, children) },
    "next/image": { default: ({ priority, ...props }) => createElement("img", props) },
    "next/navigation": { useRouter: () => ({}) },
    "./SettingsContext": { useSettingsContext: () => ({ settings: { language, theme: "light", animationsEnabled: true }, update() {} }) },
    "../lib/paths": { assetPath: path => path },
    "../lib/reviewBatches": batches,
    "../lib/skinServiceI18n": translations,
  };
  runInNewContext(source, { exports, require: name => mocks[name] ?? require(name) });
  return renderToStaticMarkup(createElement(exports.default, { activeSection: "review-notices", serviceUrl: null }));
}

test("recent review results render outside the collapsed historical archive with exact counts", () => {
  const html = render();
  const [recent, archive] = html.split('<details class="skinReviewArchive">');
  assert.ok(archive, "historical records must stay collapsible");
  assert.equal([...recent.matchAll(/id="review-batch-/g)].length, 15);
  assert.equal([...archive.matchAll(/id="review-batch-/g)].length, 208);
  for (const [number, count, total] of [
    [207, 29, "10,405"], [208, 50, "10,455"], [209, 58, "10,513"],
    [210, 60, "10,573"], [211, 47, "10,620"], [212, 5, "10,625"],
    [213, 2, "10,627"], [214, 2, "10,629"], [215, 19, "10,648"], [216, 24, "10,672"],
  ]) {
    const row = recent.match(new RegExp(`<details id="review-batch-${number}"[^>]*>(.*?)</details>`))?.[1];
    assert.ok(row, `Batch ${number} must appear before the archive`);
    assert.ok(row.includes('class="skinReviewStatus">已出</span>'));
    assert.ok(row.includes(`<span>${count} 个</span>`));
    assert.ok(row.includes(`<span>${total} 个</span>`));
  }
  for (const number of [217, 218, 219, 220, 221]) {
    const row = recent.match(new RegExp(`<details id="review-batch-${number}"[^>]*>(.*?)</details>`))?.[1];
    assert.ok(row?.includes('class="skinReviewStatus">审核中</span>'));
    assert.ok(row.includes("待公布"));
    assert.ok(row.includes("10,672 个"));
  }
  const ids = [...html.matchAll(/id="review-batch-([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, 223);
  assert.equal(ids.length, 223);
  assert.ok(archive.includes('id="review-batch-204B"'));
  assert.ok(archive.includes('id="review-batch-121"'));
});

test("review totals use exact localized wording when all completed counts are known", () => {
  for (const language of translations.skinServiceLanguages) {
    const html = render(language);
    assert.ok(html.includes(translations.skinText(language, "reviewTrackerExactSummary", { batches: 218, count: "10,672", reviewing: 5 })));
    assert.ok(html.includes(translations.skinText(language, "reviewCumulativeColumn")));
    assert.ok(html.includes(translations.skinText(language, "reviewRecentTitle", { batches: 15 })));
  }
});

function searchClickHarness(activeSection = "review-notices") {
  const exports = {};
  const updates = [];
  const frames = [];
  let stateIndex = 0;
  const mocks = {
    react: {
      ...require("react"),
      useState: value => [stateIndex++ === 0 ? "216" : value, value => updates.push(value)],
      useRef: value => ({ current: value }),
      useMemo: fn => fn(),
      useCallback: fn => fn,
      useEffect() {},
    },
    "next/link": { default: "a" },
    "next/image": { default: "img" },
    "next/navigation": { useRouter: () => ({}) },
    "./SettingsContext": { useSettingsContext: () => ({ settings: { language: "zh-CN", theme: "light", animationsEnabled: true }, update() {} }) },
    "../lib/paths": { assetPath: path => path },
    "../lib/reviewBatches": batches,
    "../lib/skinServiceI18n": translations,
  };
  runInNewContext(source, {
    exports,
    require: name => mocks[name] ?? require(name),
    window: { requestAnimationFrame: callback => frames.push(callback) },
  });
  const findLink = node => {
    if (Array.isArray(node)) return node.map(findLink).find(Boolean);
    if (node?.props?.href === "/skin-service/review-notices#review-batch-216") return node;
    return node?.props ? findLink(node.props.children) : undefined;
  };
  const link = findLink(exports.default({ activeSection, serviceUrl: null }));
  assert.ok(link, "search must include the matching batch link");
  return { click: link.props.onClick, updates, frames };
}

test("modified and canceled search clicks preserve native navigation and the search query", () => {
  for (const properties of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    const app = searchClickHarness();
    let prevented = false;
    app.click({ button: 0, ...properties, preventDefault() { prevented = true; } });
    assert.equal(prevented, false, JSON.stringify(properties));
    assert.deepEqual(app.updates, [], "native navigation must leave the current search intact");
    assert.equal(app.frames.length, 0);
  }
});

test("plain same-section search clicks still clear the query and schedule target reveal", () => {
  const app = searchClickHarness();
  let prevented = false;
  app.click({ button: 0, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.deepEqual(app.updates, ["", "all"]);
  assert.equal(app.frames.length, 1);
});

test("plain cross-section search clicks retain router navigation", () => {
  const app = searchClickHarness("questions");
  let prevented = false;
  app.click({ button: 0, preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.deepEqual(app.updates, ["", "all"]);
  assert.equal(app.frames.length, 0);
});
