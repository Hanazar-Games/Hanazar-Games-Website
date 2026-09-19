import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as release from "../app/lib/release.ts";

test("the new release publishes all requested projects in the right collections", async () => {
  const { games, homepageGames, aigcExperiments, toolGroups, homepageToolGroups } = await import("../app/lib/catalog.ts");
  for (const href of ["https://openworldcraft.com/", "https://hanazar-games.github.io/GPT6-Max-Test-Project-1/", "https://hanazar-games.github.io/xham/"]) {
    assert.ok(games.some(project => project.href === href), href);
  }
  assert.deepEqual(homepageGames.map(project => project.title), ["gameCloudRoadsTitle", "gameOpenWorldCraftTitle", "gameXhamTitle"]);
  const experiment = aigcExperiments.find(project => project.href === "https://hanazar-games.github.io/GPT6-Max-Test-Project-1/");
  assert.ok(experiment);
  assert.equal(games.find(project => project.href === experiment.href).image, experiment.image);
  for (const groups of [toolGroups, homepageToolGroups]) {
    const web = groups.find(group => group.title === "toolsWebTitle");
    assert.ok(web.tools.some(tool => tool.href === "https://mirako-official.github.io/OpenWorld-GLB-Checker/"));
    assert.equal(web.moreHref, "/tools#web-tools");
  }
  for (const collection of [games, aigcExperiments, toolGroups.flatMap(group => group.tools)]) {
    assert.equal(new Set(collection.map(project => project.href)).size, collection.length);
  }
});

test("release acknowledgement persists by version without discarding other preferences", async () => {
  const { currentRelease, hasSeenRelease, markReleaseSeen } = await import("../app/lib/release.ts");
  const entries = new Map([["hanazar-settings-v1", "existing-settings"]]);
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  assert.equal(currentRelease.version, "2.20.0");
  assert.equal(hasSeenRelease(storage, currentRelease.version), false);
  markReleaseSeen(storage, currentRelease.version);
  assert.equal(hasSeenRelease(storage, currentRelease.version), true);
  assert.equal(hasSeenRelease(storage, "2.20.1"), false);
  assert.equal(entries.get("hanazar-settings-v1"), "existing-settings");
});

test("blocked browser storage cannot crash the release notice", async () => {
  const { hasSeenRelease, markReleaseSeen } = await import("../app/lib/release.ts");
  const storage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("quota exceeded"); } };
  assert.equal(hasSeenRelease(storage, "2.19.0"), false);
  assert.doesNotThrow(() => markReleaseSeen(storage, "2.19.0"));
});

test("Xham uses the requested English and Chinese names without changing its destination", async () => {
  const { games, homepageGames } = await import("../app/lib/catalog.ts");
  const { getTranslation } = await import("../app/lib/i18n.ts");
  for (const collection of [games, homepageGames]) {
    const entry = collection.find(game => game.title === "gameXhamTitle");
    assert.ok(entry);
    assert.equal(entry.href, "https://hanazar-games.github.io/xham/");
    for (const [language, title] of [["en", "Xham！2 Dimention！"], ["zh-CN", "Hanazar二次元中心！"], ["zh-TW", "Hanazar二次元中心！"]]) {
      assert.equal(getTranslation(language, entry.title), title);
      assert.ok(getTranslation(language, entry.description).includes(title));
    }
  }
});

test("Xham artwork and archived announcement retain its requested identity", async () => {
  const { getTranslation } = await import("../app/lib/i18n.ts");
  const cover = readFileSync(new URL("../public/games/xham.svg", import.meta.url), "utf8");
  const poster = readFileSync(new URL("../public/updates/2.19.1.svg", import.meta.url), "utf8");
  assert.ok(cover.includes("2 Dimention！") && cover.includes("Hanazar二次元中心！"));
  assert.ok(poster.includes("Xham！2 Dimention！"));
  for (const [language, title] of [["en", "Xham！2 Dimention！"], ["zh-CN", "Hanazar二次元中心！"]]) {
    const copy = getTranslation(language, "release2191Name");
    assert.ok(copy.includes(title));
  }
});

test("current release presents Cloud Roads and MazeIdentity while retaining the previous announcement", async () => {
  const { getTranslation } = await import("../app/lib/i18n.ts");
  const poster = readFileSync(new URL(`../public${release.currentRelease.image}`, import.meta.url), "utf8");
  assert.ok(poster.includes("Cloud Roads") && poster.includes("MazeIdentity"));
  for (const language of ["en", "zh-CN", "zh-TW", "ja", "ko"]) {
    const copy = release.currentRelease.itemKeys.map(key => getTranslation(language, key)).join(" ");
    assert.ok(copy.includes("Cloud Roads") && copy.includes("MazeIdentity") && copy.includes("Steam"));
  }
  const announcement = readFileSync(new URL("../app/components/settings/AnnouncementTab.tsx", import.meta.url), "utf8");
  assert.match(announcement, /version: "2.19.1"/);
  assert.match(announcement, /release2191Name/);
});

test("supported languages resolve the new identity, release copy, and SFX preview label", async () => {
  const { getTranslation, langNames } = await import("../app/lib/i18n.ts");
  for (const language of Object.keys(langNames)) {
    const title = language.startsWith("zh-") ? "Hanazar二次元中心！" : "Xham！2 Dimention！";
    assert.equal(getTranslation(language, "gameXhamTitle"), title);
    for (const key of ["gameXhamDesc", release.currentRelease.titleKey, ...release.currentRelease.itemKeys, "stPreviewSfx"]) {
      assert.ok(getTranslation(language, key).trim());
      assert.notEqual(getTranslation(language, key), key);
    }
    if (language !== "en") assert.notEqual(getTranslation(language, "stPreviewSfx"), "Preview SFX", language);
  }
});

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL("../app/components/ReleaseNotice.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function noticeHarness({ entries = new Map(), blocked = false, visible = true, loaded = true, storageDenied = false } = {}) {
  const frames = new Map();
  const effects = [];
  const closeListeners = new Set();
  const documentListeners = new Map();
  const refs = [];
  let refIndex = 0;
  let effectIndex = 0;
  let pathname = "/skin-service";
  let frameId = 0;
  let observer;
  const dialog = {
    open: false, shown: 0,
    showModal() { this.open = true; this.shown++; },
    close() { this.open = false; closeListeners.forEach(fn => fn()); },
    addEventListener(name, fn) { if (name === "close") closeListeners.add(fn); },
    removeEventListener(name, fn) { if (name === "close") closeListeners.delete(fn); },
  };
  const document = {
    body: { style: { overflow: "auto" } },
    visibilityState: visible ? "visible" : "hidden",
    querySelector() { return blocked || dialog.open ? {} : null; },
    addEventListener(name, fn) { documentListeners.set(name, fn); },
    removeEventListener(name) { documentListeners.delete(name); },
  };
  const mocks = {
    react: {
      useRef: value => {
        const index = refIndex++;
        return refs[index] ??= { current: index === 0 ? dialog : value };
      },
      useEffect: (fn, deps) => {
        const index = effectIndex++;
        const previous = effects[index];
        if (previous && deps.every((dep, i) => Object.is(dep, previous.deps[i]))) return;
        previous?.cleanup?.();
        effects[index] = { deps, cleanup: fn() };
      },
    },
    "next/image": { default: "img" },
    "next/link": { default: "a" },
    "next/navigation": { usePathname: () => pathname },
    "./SettingsContext": { useSettingsContext: () => ({ loaded }) },
    "../hooks/useTranslation": { useTranslation: () => ({ tr: key => key }) },
    "../lib/paths": { assetPath: value => value },
    "../lib/release": release,
  };
  const exports = {};
  runInNewContext(source, {
    exports, require: name => mocks[name] ?? require(name), document,
    window: {
      get localStorage() {
        if (storageDenied) throw new Error("blocked");
        return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
      },
      requestAnimationFrame(fn) { const id = ++frameId; frames.set(id, fn); return id; },
      cancelAnimationFrame(id) { frames.delete(id); },
    },
    MutationObserver: class {
      constructor(fn) { this.notify = fn; observer = this; }
      observe() { this.active = true; }
      disconnect() { this.active = false; }
    },
  });
  exports.default();
  return {
    dialog, document,
    flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); },
    unblock() { blocked = false; if (observer?.active) observer.notify(); },
    visible() { document.visibilityState = "visible"; documentListeners.get("visibilitychange")?.(); },
    navigate() { pathname = "/skin-service/communities/"; refIndex = 0; effectIndex = 0; exports.default(); },
    unmount() { effects.forEach(effect => effect.cleanup?.()); },
  };
}

test("the actual release component opens once and restores scrolling on dismissal", () => {
  const entries = new Map();
  const app = noticeHarness({ entries });
  app.flush();
  assert.equal(app.dialog.shown, 1);
  assert.equal(app.document.body.style.overflow, "hidden");
  app.dialog.close();
  assert.equal(app.document.body.style.overflow, "auto");
  app.visible(); app.flush();
  assert.equal(app.dialog.shown, 1);
  app.unmount();
  const nextPage = noticeHarness({ entries });
  nextPage.flush();
  assert.equal(nextPage.dialog.shown, 0);
  nextPage.unmount();
});

test("the release waits for other dialogs and visible tabs without acknowledging early", () => {
  const entries = new Map();
  const app = noticeHarness({ entries, blocked: true, visible: false });
  app.flush();
  app.visible(); app.flush();
  assert.equal(app.dialog.shown, 0);
  assert.equal(entries.size, 0);
  app.unblock(); app.flush();
  assert.equal(app.dialog.shown, 1);
  app.unmount();
  assert.equal(app.dialog.open, false);
  assert.equal(app.document.body.style.overflow, "auto");
});

test("denied storage still allows one notice per mounted session", () => {
  const app = noticeHarness({ storageDenied: true });
  app.flush();
  app.dialog.close();
  app.visible(); app.flush();
  assert.equal(app.dialog.shown, 1);
  app.unmount();
});

test("release notice waits for preferences to finish loading", () => {
  const app = noticeHarness({ loaded: false });
  app.flush();
  assert.equal(app.dialog.shown, 0);
  app.unmount();
});

test("community navigation cannot consume a release notice before it can be read", () => {
  const app = noticeHarness({ blocked: true });
  app.flush();
  app.unblock(); app.flush();
  assert.equal(app.dialog.shown, 1);
  app.navigate();
  assert.equal(app.dialog.open, true);
  assert.equal(app.document.body.style.overflow, "hidden");
  app.dialog.close();
  assert.equal(app.document.body.style.overflow, "auto");
  app.unmount();
});
