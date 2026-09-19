import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as catalog from "../app/lib/catalog.ts";
import { getTranslation } from "../app/lib/i18n.ts";

const require = createRequire(import.meta.url);
const homeSource = ts.transpileModule(readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function home(language) {
  const mocks = {
    "next/image": { default: "img" },
    "next/link": { default: "a" },
    "./hooks/useTranslation": { useTranslation: () => ({ tr: key => getTranslation(language, key) }) },
    "./hooks/useRevealOnScroll": { useRevealOnScroll() {} },
    "./lib/catalog": catalog,
    "./lib/paths": { assetPath: path => `/Hanazar-Games-Website${path}` },
  };
  const exports = {};
  runInNewContext(homeSource, { exports, require: name => mocks[name] ?? require(name) });
  return exports.default();
}

function descendants(node) {
  if (!node || typeof node !== "object") return [];
  return [node, ...[node.props?.children].flat(Infinity).flatMap(descendants)];
}

test("Cloud Roads is featured with a clean direct link and dedicated cover", () => {
  const entry = catalog.games.find(game => game.title === "gameCloudRoadsTitle");
  assert.ok(entry);
  assert.equal(entry.href, "https://hanazar-games.github.io/CLOUD-ROADS/");
  assert.equal(entry.image, "/games/cloud-roads.svg");
  assert.equal(catalog.homepageGames[0], entry);
  assert.equal(catalog.homepageGames.length, 3);
  assert.ok(catalog.homepageGames.some(game => game.title === "gameXhamTitle"));
  assert.equal(catalog.aigcExperiments.some(game => game.href === entry.href), false);
  assert.equal(getTranslation("en", entry.title), "Cloud Roads");
  assert.match(getTranslation("zh-CN", entry.description), /无限生成.*盘山/);
  assert.match(readFileSync(new URL(`../public${entry.image}`, import.meta.url), "utf8"), /<svg/);
});

test("MazeIdentity is the first homepage section and has no clickable poster or invented store link", () => {
  const page = home("en");
  const section = page.props.children[0];
  assert.equal(section.props.id, "mazeidentity");
  const nodes = descendants(section);
  const title = nodes.find(node => node.props?.id === section.props["aria-labelledby"]);
  assert.equal(title.props.children, "MazeIdentity");
  assert.ok(nodes.some(node => node.props?.children === "Coming soon to Steam"));
  assert.ok(nodes.some(node => node.type === "img" && node.props.src === "/Hanazar-Games-Website/games/mazeidentity-poster.svg"));
  for (const node of nodes) {
    assert.ok(!["a", "button"].includes(node.type));
    assert.equal(node.props?.onClick, undefined);
    assert.equal(node.props?.tabIndex, undefined);
    assert.equal(node.props?.href, undefined);
  }
});

test("new project introductions resolve in English, Chinese, Japanese, and Korean", () => {
  const keys = ["gameCloudRoadsDesc", "gameTagDriving", "mazeComingSoon", "mazeIntro"];
  for (const language of ["en", "zh-CN", "zh-TW", "ja", "ko"]) {
    for (const key of keys) {
      const text = getTranslation(language, key);
      assert.ok(text.trim());
      assert.notEqual(text, key);
      if (language !== "en") assert.notEqual(text, getTranslation("en", key));
    }
  }
  assert.equal(getTranslation("zh-CN", "mazeComingSoon"), "Steam 即将上线");
});
