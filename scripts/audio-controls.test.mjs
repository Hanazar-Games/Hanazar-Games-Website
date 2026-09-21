import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL("../app/components/settings/AudioTab.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function changeVolume(id, value, overrides = {}) {
  const settings = { masterVolume: 75, bgmVolume: 12, bgmEnabled: true, sfxEnabled: false, sfxVolume: 28, sfxStyle: "Classic", ...overrides };
  const events = [];
  const updates = [];
  const mocks = {
    react: { useState: fn => [fn(), () => {}], useEffect() {} },
    "../SettingsContext": { sfxStyles: ["Classic"], useSettingsContext: () => ({ settings, update: (...args) => updates.push(args) }) },
    "../../hooks/useTranslation": { useTranslation: () => ({ tr: key => key }) },
  };
  const exports = {};
  runInNewContext(source, { exports, require: name => mocks[name] ?? require(name), Event, window: { dispatchEvent: event => events.push(event.type) } });
  const find = node => {
    if (!node || typeof node !== "object") return;
    if (node.props?.id === id) return node;
    return [node.props?.children].flat(Infinity).map(find).find(Boolean);
  };
  find(exports.default()).props.onChange({ target: { value: String(value) } });
  return { updates, events };
}

test("raising either volume from mute can resume enabled BGM without another click", () => {
  assert.deepEqual(changeVolume("master-vol", 40, { masterVolume: 0 }), { updates: [["masterVolume", 40]], events: ["hanazar:audio-unlock"] });
  assert.deepEqual(changeVolume("bgm-vol", 8, { bgmVolume: 0 }), { updates: [["bgmVolume", 8]], events: ["hanazar:audio-unlock"] });
});

test("volume changes never start disabled or still-muted background music", () => {
  for (const [id, value, settings] of [
    ["master-vol", 0, {}], ["bgm-vol", 0, {}],
    ["master-vol", 40, { bgmEnabled: false }], ["bgm-vol", 8, { bgmEnabled: false }],
    ["master-vol", 40, { bgmVolume: 0 }], ["bgm-vol", 8, { masterVolume: 0 }],
  ]) assert.deepEqual(changeVolume(id, value, settings).events, []);
});
