import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { serviceTerms } from "../app/lib/skinServiceTerms.ts";
import * as translations from "../app/lib/skinServiceI18n.ts";

const exports = {};
runInNewContext(ts.transpileModule(readFileSync(new URL("../app/lib/skinTermsConsent.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, require: () => ({ serviceTerms }) });
const { consentStorageKey, readTermsConsent, saveTermsConsent, clearTermsConsent } = exports;

function storage() {
  const entries = new Map();
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
}

test("the supplied PDF and Word originals retain their exact fingerprints", () => {
  for (const [path, expected] of [[serviceTerms.pdf, serviceTerms.pdfSha256], [serviceTerms.word, serviceTerms.wordSha256]]) {
    const bytes = readFileSync(new URL(`../public${path}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected);
  }
  assert.equal(serviceTerms.version, "2026.10.07 V4");
  assert.equal(serviceTerms.pageCount, 4);
  assert.equal(serviceTerms.sections.length, 14);
  assert.equal(serviceTerms.importantParagraphs.length, 2);
  assert.ok(serviceTerms.sections[1].paragraphs.some(text => text.startsWith("2.14")));
  assert.ok(serviceTerms.sections[13].paragraphs.some(text => text.startsWith("14.3")));
});

test("the mobile text preserves every paragraph of the supplied agreement", () => {
  const text = [serviceTerms.title, serviceTerms.subtitle, serviceTerms.revisionLine, serviceTerms.importantTitle,
    ...serviceTerms.importantParagraphs, ...serviceTerms.sections.flatMap(section => [section.title, ...section.paragraphs]),
  ].join("").replace(/\s/g, "");
  assert.equal(createHash("sha256").update(text).digest("hex"), "43d37b797e1c49cb536d5479ef3be5264104000a7f21ca46f711c7d8522da5a1");
  const paragraphs = [serviceTerms.title, serviceTerms.subtitle, serviceTerms.revisionLine, serviceTerms.importantTitle,
    ...serviceTerms.importantParagraphs, ...serviceTerms.sections.flatMap(section => [section.title, ...section.paragraphs])];
  assert.equal(createHash("sha256").update(paragraphs.join("\n")).digest("hex"), "0ea88ea259e25b4500a482fdd0ac865b797a76f6f54cb80198e6ff92108d16ba");
});

test("the terms surface cannot horizontally scroll its content behind clipped decorations", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.skinServiceDocumentSection#terms\s*\{\s*overflow: clip;/);
});

test("read-only document typography preserves spaces and cannot inherit font transitions", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.skinTermsText article :is\(h3, h4, p\)\s*\{\s*white-space: pre-wrap;/);
  assert.match(css, /\.skinTermsText article,\s*\.skinTermsText article \*\s*\{\s*transition-property: none;/);
});

test("agreement defaults to unaccepted and persists only after explicit confirmation", () => {
  const local = storage();
  assert.equal(readTermsConsent(local), null);
  assert.equal(saveTermsConsent(local, false, true, 1000), false);
  assert.equal(saveTermsConsent(local, true, false, 1000), false);
  assert.equal(readTermsConsent(local), null);
  assert.equal(saveTermsConsent(local, true, true, 1000), true);
  assert.equal(readTermsConsent(local, 2000), 1000);
  const saved = JSON.parse(local.getItem(consentStorageKey));
  assert.deepEqual(Object.keys(saved).sort(), ["acceptedAt", "documentSha256", "version"]);
  assert.equal(saved.version, serviceTerms.version);
  assert.equal(saved.documentSha256, serviceTerms.pdfSha256);
});

test("old versions, changed files, malformed and future-dated consent are not accepted", () => {
  const local = storage();
  const valid = { version: serviceTerms.version, documentSha256: serviceTerms.pdfSha256, acceptedAt: 1000 };
  for (const record of [null, [], true, {}, { ...valid, version: "old" }, { ...valid, documentSha256: "different" }, { ...valid, acceptedAt: "1000" }, { ...valid, acceptedAt: -1 }, { ...valid, acceptedAt: 3000 }, { ...valid, acceptedAt: 1.5 }]) {
    local.setItem(consentStorageKey, JSON.stringify(record));
    assert.equal(readTermsConsent(local, 2000), null);
  }
  local.setItem(consentStorageKey, "broken json");
  assert.equal(readTermsConsent(local, 2000), null);
});

test("blocked or absent browser storage never reports a persisted acceptance", () => {
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("quota"); }, removeItem() { throw new Error("blocked"); } };
  for (const local of [null, blocked]) {
    assert.equal(readTermsConsent(local), null);
    assert.equal(saveTermsConsent(local, true, true, 1000), false);
    assert.equal(clearTermsConsent(local), false);
  }
});

test("clearing local confirmation preserves unrelated preferences", () => {
  const local = storage();
  local.setItem("hanazar-settings-v1", "keep");
  saveTermsConsent(local, true, true, 1000);
  assert.equal(clearTermsConsent(local), true);
  assert.equal(readTermsConsent(local), null);
  assert.equal(local.getItem("hanazar-settings-v1"), "keep");
});

const require = createRequire(import.meta.url);
const readerSource = ts.transpileModule(readFileSync(new URL("../app/components/SkinTermsReader.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function readerHarness(local = storage()) {
  const slots = [];
  const effects = [];
  const listeners = new Map();
  let cursor = 0;
  const react = {
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => { slots[i] = typeof value === "function" ? value(slots[i]) : value; }]; },
    useRef(value) { return slots[cursor++] ??= { current: value }; },
    useEffect(fn) { const i = cursor++; if (!(i in slots)) effects.push(() => { slots[i] = { cleanup: fn() }; }); },
  };
  const mocks = {
    react,
    "../lib/paths": { assetPath: value => `/pages-base${value}` },
    "../lib/skinServiceTerms": { serviceTerms },
    "../lib/skinTermsConsent": exports,
    "../lib/skinServiceI18n": translations,
  };
  const module = {};
  runInNewContext(readerSource, {
    exports: module, require: name => mocks[name] ?? require(name),
    window: { localStorage: local, addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) },
  });
  return {
    local, listeners,
    render(language = "zh-CN") { cursor = 0; const tree = module.default({ language }); effects.splice(0).forEach(fn => fn()); return tree; },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

function findAll(tree, predicate) {
  if (!tree || typeof tree !== "object") return [];
  return [...(predicate(tree) ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(child => findAll(child, predicate))];
}
const button = tree => findAll(tree, node => node.type === "button" && node.props.type === "submit")[0];
const form = tree => findAll(tree, node => node.type === "form")[0];
const fields = tree => findAll(tree, node => node.type === "input" && node.props.type === "checkbox");

test("the read-only article renders only the original paragraphs, including internal spaces", () => {
  const app = readerHarness();
  for (const language of ["zh-CN", "en", "ja"]) {
    const tree = app.render(language);
    const article = findAll(tree, node => node.type === "article")[0];
    assert.equal(article.props.contentEditable, false);
    assert.equal(article.props.lang, "zh-CN");
    const actual = findAll(article, node => ["h3", "h4", "p"].includes(node.type)).map(node => node.props.children);
    const expected = [serviceTerms.title, serviceTerms.subtitle, serviceTerms.revisionLine, serviceTerms.importantTitle,
      ...serviceTerms.importantParagraphs, ...serviceTerms.sections.flatMap(section => [section.title, ...section.paragraphs])];
    assert.deepEqual(actual, expected);
    assert.equal(findAll(article, node => ["input", "textarea", "nav", "button"].includes(node.type)).length, 0);
    assert.equal(findAll(tree, node => node.props?.id === "terms-full-text")[0].props.open, true);
  }
  app.unmount();
});

test("the collapsible contents tree links every clause and subclause to a unique focusable target", () => {
  const app = readerHarness();
  const tree = app.render();
  const nav = findAll(tree, node => node.type === "nav")[0];
  const groups = findAll(nav, node => node.type === "details");
  assert.equal(groups.length, serviceTerms.sections.length);
  assert.ok(groups.every(node => !node.props.open));
  const expectedIds = serviceTerms.sections.flatMap(section => [section.id, ...section.paragraphs.map(paragraph => `terms-subclause-${paragraph.match(/^\d+\.\d+/)[0].replace(".", "-")}`)]);
  const links = findAll(nav, node => node.type === "a");
  assert.deepEqual(links.map(link => link.props.href), expectedIds.map(id => `#${id}`));
  for (const id of expectedIds) {
    const targets = findAll(tree, node => node.props?.id === id);
    assert.equal(targets.length, 1, id);
    assert.equal(targets[0].props.tabIndex, -1, id);
  }
  app.unmount();
});

test("font size controls are bounded, resettable, and never change document text or consent", () => {
  const app = readerHarness();
  const control = (tree, key) => findAll(tree, node => node.type === "button" && node.props["aria-label"] === translations.skinText("zh-CN", key))[0];
  const size = tree => findAll(tree, node => node.type === "article")[0].props.style.fontSize;
  app.render();
  let tree = app.render();
  assert.equal(size(tree), "1rem");
  const smaller = control(tree, "termsFontDecrease");
  assert.ok(smaller);
  smaller.props.onClick();
  assert.equal(size(app.render()), "0.875rem");
  assert.equal(control(app.render(), "termsFontDecrease").props.disabled, true);
  smaller.props.onClick();
  assert.equal(size(app.render()), "0.875rem");
  const larger = control(app.render(), "termsFontIncrease");
  for (let i = 0; i < 20; i++) larger.props.onClick();
  tree = app.render();
  assert.equal(size(tree), "2rem");
  assert.equal(control(tree, "termsFontIncrease").props.disabled, true);
  assert.ok(fields(tree).every(node => !node.props.checked));
  assert.equal(button(tree).props.disabled, true);
  assert.equal(readTermsConsent(app.local), null);
  control(tree, "termsFontReset").props.onClick();
  assert.equal(size(app.render()), "1rem");
  fields(app.render()).forEach(field => field.props.onChange({ target: { checked: true } }));
  form(app.render()).props.onSubmit({ preventDefault() {} });
  const confirmed = app.local.getItem(consentStorageKey);
  control(app.render(), "termsFontIncrease").props.onClick();
  assert.equal(size(app.render()), "1.125rem");
  assert.equal(app.local.getItem(consentStorageKey), confirmed);
  app.unmount();
});

test("reader requires both unchecked acknowledgements and a separate submit action", () => {
  const app = readerHarness();
  assert.equal(button(app.render()).props.disabled, true);
  let tree = app.render();
  assert.ok(fields(tree).every(node => node.props.checked === false));
  fields(tree)[0].props.onChange({ target: { checked: true } });
  tree = app.render();
  assert.equal(button(tree).props.disabled, true);
  form(tree).props.onSubmit({ preventDefault() {} });
  assert.equal(readTermsConsent(app.local), null);
  fields(tree)[1].props.onChange({ target: { checked: true } });
  tree = app.render();
  assert.equal(button(tree).props.disabled, false);
  assert.equal(readTermsConsent(app.local), null);
  form(tree).props.onSubmit({ preventDefault() {} });
  assert.ok(readTermsConsent(app.local));
  assert.equal(button(app.render()).props.disabled, true);
  assert.equal(findAll(app.render("en"), node => node.props?.role === "status")[0].props.children, translations.skinText("en", "termsSaved"));
  app.unmount();
  assert.equal(app.listeners.size, 0);
});

test("reader keeps confirmation retryable when persistence fails", () => {
  const app = readerHarness({ getItem: () => null, setItem() { throw new Error("quota"); } });
  app.render();
  fields(app.render()).forEach(field => field.props.onChange({ target: { checked: true } }));
  form(app.render()).props.onSubmit({ preventDefault() {} });
  const tree = app.render();
  assert.equal(button(tree).props.disabled, false);
  assert.equal(findAll(tree, node => node.props?.role === "status")[0].props.children, translations.skinText("zh-CN", "termsSaveFailed"));
  app.unmount();
});

test("reader resynchronizes confirmation after another tab clears its local record", () => {
  const local = storage();
  saveTermsConsent(local, true, true);
  const app = readerHarness(local);
  app.render();
  assert.ok(fields(app.render()).every(node => node.props.checked));
  local.removeItem(consentStorageKey);
  app.listeners.get("storage")({ key: consentStorageKey, storageArea: local });
  assert.ok(fields(app.render()).every(node => !node.props.checked));
  app.unmount();
});

test("reader keeps both originals base-path safe and includes the complete searchable text", () => {
  const app = readerHarness();
  const tree = app.render();
  const links = findAll(tree, node => node.type === "a");
  assert.ok(links.some(node => node.props.href === `/pages-base${serviceTerms.pdf}` && node.props.download));
  assert.ok(links.some(node => node.props.href === `/pages-base${serviceTerms.word}` && node.props.download));
  const frame = findAll(tree, node => node.type === "iframe")[0];
  assert.equal(frame.props.src, `/pages-base${serviceTerms.pdf}#view=FitH`);
  assert.ok(frame.props.title);
  assert.equal(findAll(tree, node => node.type === "section").length, 14);
  assert.equal(findAll(tree, node => node.props?.id === "terms-full-text").length, 1);
  app.unmount();
});
