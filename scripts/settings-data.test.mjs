import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { getTranslation } from "../app/lib/i18n.ts";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL("../app/components/settings/OtherTab.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function find(node, predicate) {
  if (!node || typeof node !== "object") return;
  if (predicate(node)) return node;
  return [node.props?.children].flat(Infinity).map(child => find(child, predicate)).find(Boolean);
}

function harness(initialLanguage = "en") {
  const slots = [];
  let cursor = 0;
  let language = initialLanguage;
  let tree;
  let focusCount = 0;
  let confirmation = true;
  const values = {
    reset() { language = "en"; },
    clearCache() {},
    exportJson: () => JSON.stringify({ language }),
    importJson(json) {
      try {
        const settings = JSON.parse(json);
        language = settings.language ?? language;
        return true;
      } catch { return false; }
    },
  };
  const mocks = {
    react: {
      useState(value) {
        const i = cursor++;
        if (!(i in slots)) slots[i] = value;
        return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }];
      },
      useRef(value) { return slots[cursor++] ??= { current: value }; },
    },
    "../SettingsContext": { useSettingsContext: () => values },
    "../../hooks/useTranslation": { useTranslation() {
      const currentLanguage = language;
      return { tr: key => getTranslation(currentLanguage, key) };
    } },
  };
  const exports = {};
  runInNewContext(source, {
    exports, require: name => mocks[name] ?? require(name),
    navigator: { clipboard: { async writeText() { throw new Error("Clipboard blocked"); } } },
    window: { confirm: () => confirmation },
  });
  const render = () => {
    cursor = 0;
    tree = exports.default();
    const toggle = find(tree, node => node.props?.className === "dataActions").props.children[2];
    if (toggle.props.ref) toggle.props.ref.current = { focus() { focusCount++; } };
    return tree;
  };
  render();
  return {
    render,
    select: predicate => find(tree, predicate),
    button: key => find(tree, node => node.type === "button" && node.props.children === getTranslation(language, key)),
    text: () => find(tree, node => node.type === "textarea"),
    status: () => find(tree, node => node.props?.role === "status")?.props.children,
    focused: () => focusCount,
    cancelConfirmation() { confirmation = false; },
  };
}

function openImport(app, json) {
  app.button("stImportJson").props.onClick();
  app.render();
  if (json !== undefined) {
    app.text().props.onChange({ target: { value: json } });
    app.render();
  }
}

test("opening settings import exposes its expanded state and focuses the input", () => {
  const app = harness();
  assert.equal(app.button("stImportJson").props["aria-expanded"], false);
  assert.equal(app.button("stImportJson").props["aria-controls"], undefined);
  openImport(app);
  const toggle = app.button("stCancel");
  assert.equal(toggle.props["aria-expanded"], true);
  assert.equal(toggle.props["aria-controls"], "settings-import-area");
  assert.equal(app.text().props.autoFocus, true);
  assert.ok(app.select(node => node.props?.id === toggle.props["aria-controls"]));
});

test("successful import restores trigger focus and translates feedback in the imported language", () => {
  const app = harness();
  openImport(app, '{"language":"zh-CN"}');
  app.button("stConfirmImport").props.onClick();
  app.render();
  assert.equal(app.text(), undefined);
  assert.equal(app.focused(), 1);
  assert.equal(app.status(), "设置导入成功。");
});

test("invalid import preserves editable input and reports the localized error", () => {
  const app = harness("ja");
  openImport(app, "invalid-json");
  app.button("stConfirmImport").props.onClick();
  app.render();
  assert.equal(app.text().props.value, "invalid-json");
  assert.equal(app.status(), getTranslation("ja", "stImportFail"));
  assert.equal(app.focused(), 0);
});

test("clipboard fallback opens a focused input with the settings ready to copy", async () => {
  const app = harness();
  await app.button("stCopyJson").props.onClick();
  app.render();
  assert.equal(app.text().props.autoFocus, true);
  assert.equal(app.text().props.value, '{"language":"en"}');
  assert.equal(app.status(), getTranslation("en", "stCopyFallback"));
});

test("reset confirmation feedback follows the restored language", () => {
  const app = harness("ja");
  app.button("stResetBtn").props.onClick();
  app.render();
  assert.equal(app.status(), getTranslation("en", "stResetDone"));
});

test("canceling a reset leaves the current UI and feedback unchanged", () => {
  const app = harness("ja");
  app.cancelConfirmation();
  app.button("stResetBtn").props.onClick();
  app.render();
  assert.ok(app.button("stResetBtn"));
  assert.equal(app.status(), undefined);
});
