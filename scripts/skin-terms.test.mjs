import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { serviceTerms, serviceTermsSections } from "../app/lib/skinServiceTerms.ts";
import * as translations from "../app/lib/skinServiceI18n.ts";
import * as documentSearch from "../app/lib/documentSearch.ts";

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
  for (const [path, fingerprint, expected] of [[serviceTerms.pdf, serviceTerms.pdfSha256, "432589e81523119b52987f8acf37f99370a2bd8156a2c590532ac4aac7dfb9cc"], [serviceTerms.word, serviceTerms.wordSha256, "cf107501c4257935529719df45f9ea60f45cda5b85355856c1988273193bbdda"]]) {
    assert.equal(fingerprint, expected);
    const bytes = readFileSync(new URL(`../public${path}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected);
  }
  assert.equal(serviceTerms.version, "2026.10.12 V5");
  assert.equal(serviceTerms.revisionDate, "2026-10-12");
  assert.equal(serviceTerms.pageCount, 4);
  assert.equal(serviceTerms.sections.length, 14);
  assert.equal(serviceTerms.importantParagraphs.length, 3);
  assert.ok(serviceTerms.sections[3].paragraphs.some(text => text.startsWith("4.3")));
  assert.ok(serviceTerms.sections[6].paragraphs.some(text => text.startsWith("7.3")));
  assert.ok(serviceTerms.sections[1].paragraphs.some(text => text.startsWith("2.14")));
  assert.ok(serviceTerms.sections[13].paragraphs.some(text => text.startsWith("14.3")));
});

test("the mobile text preserves every paragraph of the supplied agreement", () => {
  const text = [serviceTerms.title, serviceTerms.subtitle, serviceTerms.revisionLine, serviceTerms.importantTitle,
    ...serviceTerms.importantParagraphs, ...serviceTerms.sections.flatMap(section => [section.title, ...section.paragraphs]),
  ].join("").replace(/\s/g, "");
  assert.equal(createHash("sha256").update(text).digest("hex"), "a37c370d1b9ea37fe92c3fdd57d28dd498f8bb4572e4c5b4693d1bda063c9ae9");
  const paragraphs = [serviceTerms.title, serviceTerms.subtitle, serviceTerms.revisionLine, serviceTerms.importantTitle,
    ...serviceTerms.importantParagraphs, ...serviceTerms.sections.flatMap(section => [section.title, ...section.paragraphs])];
  assert.equal(createHash("sha256").update(paragraphs.join("\n")).digest("hex"), "f5b958538d06577e6d2aa5ee4879c5b50560db7bb613b2bcd1f8128b14cb3cef");
  const xml = execFileSync("unzip", ["-p", new URL(`../public${serviceTerms.word}`, import.meta.url).pathname, "word/document.xml"], { encoding: "utf8" });
  const decode = value => value.replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  const original = [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)]
    .map(([paragraph]) => [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(match => decode(match[1])).join(""))
    .filter(Boolean);
  assert.deepEqual(paragraphs, original);
});

test("V4 confirmation cannot accept the V5 agreement", () => {
  const local = storage();
  local.setItem(consentStorageKey, JSON.stringify({ version: "2026.10.07 V4", documentSha256: "0c9bf9af81c31c9cac45fd5d5d0df11217df4159b8de1588df63976af07cbb98", acceptedAt: 1000 }));
  assert.equal(readTermsConsent(local, 2000), null);
});

test("document surfaces cannot horizontally scroll their content behind clipped decorations", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.skinServiceDocumentSection#questions,\s*\.skinServiceDocumentSection#terms\s*\{\s*overflow: clip;/);
});

test("large browser text cannot force the agreement grid wider than the viewport", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const surface = css.match(/\.skinServiceDocumentSection#terms\s*\{([^}]+)\}/)?.[1] ?? "";
  assert.match(surface, /min-width: 0;/);
  assert.match(surface, /overflow-wrap: anywhere;/);
});

test("read-only document typography preserves spaces and cannot inherit font transitions", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.skinTermsText article :is\(h3, h4, p\)\s*\{\s*white-space: pre-wrap;/);
  assert.match(css, /\.skinTermsText article,\s*\.skinTermsText article \*\s*\{\s*transition-property: none;/);
});

test("agreement and Q&A entrances never transform documents while hash navigation positions a target", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.ok(/\.skinServiceDocumentSection:where\(#terms, #questions\),\s*\.skinServiceDocumentSection:where\(#terms, #questions\) > \*\s*\{\s*animation-name: skinPromptFade;/.test(css));
  const fade = css.match(/@keyframes skinPromptFade\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(fade);
  assert.ok(!/transform/.test(fade));
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
  const navigations = [];
  let cursor = 0;
  const react = {
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => { slots[i] = typeof value === "function" ? value(slots[i]) : value; }]; },
    useRef(value) { return slots[cursor++] ??= { current: value }; },
    useEffect(fn) { const i = cursor++; if (!(i in slots)) effects.push(() => { slots[i] = { cleanup: fn() }; }); },
  };
  const mocks = {
    react,
    "../lib/paths": { assetPath: value => `/pages-base${value}` },
    "../lib/documentSearch": documentSearch,
    "../lib/skinServiceTerms": { serviceTerms, serviceTermsSections },
    "../lib/skinTermsConsent": exports,
    "../lib/skinServiceI18n": translations,
  };
  const module = {};
  runInNewContext(readerSource, {
    exports: module, require: name => mocks[name] ?? require(name),
    window: { localStorage: local, addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) },
  });
  return {
    local, listeners, navigations,
    render(language = "zh-CN") { cursor = 0; const tree = module.default({ language, onNavigate: id => navigations.push(id) }); effects.splice(0).forEach(fn => fn()); return tree; },
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

test("every internal agreement link schedules target reveal on repeated plain clicks without accepting or clearing search", () => {
  const app = readerHarness();
  let tree = app.render();
  const search = findAll(tree, node => node.props?.id === "terms-search")[0];
  search.props.onChange({ target: { value: "2.14" } });
  tree = app.render();
  const links = findAll(tree, node => node.type === "a" && node.props.href.startsWith("#"));
  assert.ok(links.some(link => link.props.href === "#terms-subclause-2-14"));
  for (const link of links) {
    assert.equal(typeof link.props.onClick, "function", link.props.href);
    const count = app.navigations.length;
    for (const properties of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) link.props.onClick({ button: 0, ...properties });
    assert.equal(app.navigations.length, count, link.props.href);
    for (let i = 0; i < 2; i++) link.props.onClick({ button: 0, preventDefault() { assert.fail("keep native browser history"); } });
    assert.deepEqual(app.navigations.slice(count), [link.props.href.slice(1), link.props.href.slice(1)]);
  }
  assert.equal(findAll(app.render(), node => node.props?.id === "terms-search")[0].props.value, "2.14");
  assert.ok(fields(app.render()).every(field => !field.props.checked));
  assert.equal(readTermsConsent(app.local), null);
  app.unmount();
});

test("pure clause numbers match exactly, including full-width digits, in every reader language", () => {
  const app = readerHarness();
  for (const language of translations.skinServiceLanguages) {
    const tree = app.render(language);
    const search = findAll(tree, node => node.props?.id === "terms-search")[0];
    for (const clause of serviceTermsSections.flatMap(section => section.clauses)) {
      for (const query of [clause.number, clause.number.replace(/[0-9.]/g, character => String.fromCharCode(character.charCodeAt(0) + 0xfee0))]) {
        search.props.onChange({ target: { value: ` ${query} ` } });
        const results = findAll(app.render(language), node => node.props?.id === "terms-search-results")[0];
        assert.deepEqual(findAll(results, node => node.type === "a").map(node => node.props.href), [`#${clause.id}`], `${language}: ${query}`);
      }
    }
    search.props.onChange({ target: { value: "99.1" } });
    const results = findAll(app.render(language), node => node.props?.id === "terms-search-results")[0];
    assert.equal(findAll(results, node => node.type === "a").length, 0);
  }
  assert.equal(readTermsConsent(app.local), null);
  app.unmount();
});

test("agreement search indexes full-width clause numbers and original wording without changing the reader", () => {
  const app = readerHarness();
  app.render();
  let tree = app.render();
  const search = findAll(tree, node => node.props?.id === "terms-search")[0];
  assert.ok(search);
  assert.ok(search.props.ref);
  fields(tree)[0].props.onChange({ target: { checked: true } });
  for (const query of ["２．１４", "核验材料"]) {
    search.props.onChange({ target: { value: query } });
    tree = app.render();
    const results = findAll(tree, node => node.props?.id === "terms-search-results")[0];
    assert.ok(results);
    assert.ok(findAll(results, node => node.type === "a" && node.props.href === "#terms-subclause-2-14").length);
    const original = findAll(tree, node => node.props?.id === "terms-original-text")[0];
    assert.deepEqual(findAll(original, node => ["h3", "h4", "p"].includes(node.type)).map(node => node.props.children),
      [serviceTerms.title, serviceTerms.subtitle, serviceTerms.revisionLine, serviceTerms.importantTitle,
        ...serviceTerms.importantParagraphs, ...serviceTerms.sections.flatMap(section => [section.title, ...section.paragraphs])]);
    assert.equal(original.props.style.fontSize, "1rem");
    assert.equal(fields(tree)[0].props.checked, true);
    assert.equal(fields(tree)[1].props.checked, false);
    assert.equal(readTermsConsent(app.local), null);
  }
  search.props.onChange({ target: { value: "unmatched-query" } });
  tree = app.render();
  assert.equal(findAll(findAll(tree, node => node.props?.id === "terms-search-results")[0], node => node.type === "a").length, 0);
  let focused = false;
  search.props.ref.current = { focus() { focused = true; } };
  findAll(tree, node => node.type === "button" && node.props["aria-label"] === translations.skinText("zh-CN", "termsSearchClear"))[0].props.onClick();
  assert.equal(focused, true);
  assert.equal(findAll(app.render(), node => node.props?.id === "terms-search")[0].props.value, "");
  app.unmount();
});

test("agreement search remains outside the collapsible text and preserves native modified navigation", () => {
  const app = readerHarness();
  let tree = app.render();
  const search = findAll(tree, node => node.props?.id === "terms-search")[0];
  assert.ok(search);
  assert.equal(findAll(findAll(tree, node => node.props?.id === "terms-full-text")[0], node => node.props?.id === "terms-search").length, 0);
  search.props.onChange({ target: { value: "2.14" } });
  tree = app.render();
  const text = findAll(tree, node => node.props?.id === "terms-full-text")[0];
  let focused = false;
  text.props.ref.current = { open: false, querySelector: () => ({ focus() { focused = true; } }) };
  const result = findAll(findAll(tree, node => node.props?.id === "terms-search-results")[0], node => node.type === "a")[0];
  for (const properties of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    result.props.onClick({ button: 0, ...properties });
    assert.equal(text.props.ref.current.open, false);
    assert.equal(focused, false);
  }
  result.props.onClick({ button: 0 });
  assert.equal(text.props.ref.current.open, true);
  assert.equal(focused, true);
  assert.equal(readTermsConsent(app.local), null);
  for (const language of translations.skinServiceLanguages) {
    tree = app.render(language);
    assert.equal(findAll(tree, node => node.type === "label" && node.props.htmlFor === "terms-search")[0].props.children, translations.skinText(language, "termsSearchLabel"));
    assert.equal(findAll(tree, node => node.props?.id === "terms-search")[0].props.value, "2.14");
  }
  app.unmount();
});

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
  const nav = findAll(tree, node => node.type === "nav" && node.props["aria-label"] === translations.skinText("zh-CN", "termsContents"))[0];
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

test("reading shortcuts expose the directory, inline PDF and confirmation without accepting anything", () => {
  const app = readerHarness();
  const tree = app.render();
  const shortcuts = findAll(tree, node => node.type === "nav" && node.props.className === "skinTermsReadingNav")[0];
  assert.ok(shortcuts);
  const links = findAll(shortcuts, node => node.type === "a");
  assert.deepEqual(links.map(link => link.props.href), ["#terms-search", "#terms-contents", "#terms-pdf", "#terms-consent"]);
  for (const link of links) assert.equal(findAll(tree, node => node.props?.id === link.props.href.slice(1)).length, 1);
  assert.equal(form(tree).props.tabIndex, -1);
  assert.ok(fields(tree).every(field => !field.props.checked));
  assert.equal(readTermsConsent(app.local), null);
  app.unmount();
});

test("the reading search shortcut restores input focus without clearing the query or accepting terms", () => {
  const app = readerHarness();
  let tree = app.render();
  const search = findAll(tree, node => node.props?.id === "terms-search")[0];
  search.props.onChange({ target: { value: "2.14" } });
  tree = app.render();
  const shortcut = findAll(tree, node => node.type === "a" && node.props.href === "#terms-search")[0];
  assert.ok(shortcut);
  let focused = false;
  search.props.ref.current = { focus() { focused = true; } };
  for (const properties of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    shortcut.props.onClick({ button: 0, ...properties });
    assert.equal(focused, false);
  }
  shortcut.props.onClick({ button: 0 });
  assert.equal(focused, true);
  assert.equal(findAll(app.render(), node => node.props?.id === "terms-search")[0].props.value, "2.14");
  assert.equal(readTermsConsent(app.local), null);
  app.unmount();
});

test("inline PDF shortcut reopens its disclosure and preserves modified native navigation", () => {
  const app = readerHarness();
  const tree = app.render();
  const pdf = findAll(tree, node => node.props?.id === "terms-pdf")[0];
  const shortcut = findAll(tree, node => node.type === "a" && node.props.href === "#terms-pdf")[0];
  assert.ok(pdf?.props.ref);
  let focused = false;
  pdf.props.ref.current = { open: false, querySelector: () => ({ focus: () => { focused = true; } }) };
  for (const properties of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    shortcut.props.onClick({ button: 0, ...properties });
    assert.equal(pdf.props.ref.current.open, false);
    assert.equal(focused, false);
  }
  shortcut.props.onClick({ button: 0 });
  assert.equal(pdf.props.ref.current.open, true);
  assert.equal(focused, true);
  pdf.props.ref.current.open = false;
  shortcut.props.onClick({ button: 0 });
  assert.equal(pdf.props.ref.current.open, true);
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

test("confirming and clearing keep keyboard focus in the agreement form", () => {
  const app = readerHarness();
  app.render();
  let tree = app.render();
  assert.ok(form(tree).props.ref);
  let focused = 0;
  form(tree).props.ref.current = { focus() { focused++; } };
  fields(tree).forEach(field => field.props.onChange({ target: { checked: true } }));
  form(app.render()).props.onSubmit({ preventDefault() {} });
  assert.equal(focused, 1);
  tree = app.render();
  findAll(tree, node => node.type === "button" && node.props.className === "secondary")[0].props.onClick();
  assert.equal(focused, 2);
  assert.ok(fields(app.render()).every(field => !field.props.checked));
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
