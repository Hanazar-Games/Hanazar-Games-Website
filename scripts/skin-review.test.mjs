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
import * as terms from "../app/lib/skinServiceTerms.ts";
import * as developerDocs from "../app/lib/skinDeveloperResources.ts";
import * as documentSearch from "../app/lib/documentSearch.ts";

const require = createRequire(import.meta.url);
const localArticleCases = [
  ["service-introduction", "introduction", "article1Title"],
  ["submission-preparation", "preparation", "article2Title"],
  ["review-status", "review", "article3Title"],
  ["returned-materials", "review", "article4Title"],
  ["change-submission", "review", "article5Title"],
  ["privacy-protection", "privacy", "article6Title"],
  ["private-skin-publication", "privacy", "privateSkinTitle"],
  ["service-fees-reading", "pricing", "serviceFeesTitle"],
  ["service-authorization-proof", "preparation", "authorizationProofTitle"],
  ["service-review-timing", "review", "reviewTimingTitle"],
  ["service-publisher-handover", "review", "publisherHandoverTitle"],
  ["service-cancellation-settlement", "pricing", "cancellationSettlementTitle"],
  ["service-minor-consent", "introduction", "minorConsentTitle"],
];

function assertSourceUrl(source) {
  const url = new URL(source.href);
  assert.ok(["https://mc.163.com", "https://mcwiki.easecation.net", "https://github.com", "https://blockbench.net", "https://web.blockbench.net", "https://docs.gimp.org", "https://www.youtube.com", "https://www.bilibili.com"].includes(url.origin));
  assert.equal(url.hash + url.username + url.password, "");
  assert.ok(!decodeURI(url.pathname).includes("_catalog"));
  if (source.format === "video" && url.origin === "https://www.youtube.com") {
    assert.equal(url.pathname, "/watch");
    assert.deepEqual([...url.searchParams.keys()], ["v"]);
    assert.match(url.searchParams.get("v"), /^[A-Za-z0-9_-]{11}$/);
  } else {
    assert.equal(url.search, "");
    if (source.format === "video") {
      assert.equal(url.origin, "https://www.bilibili.com");
      assert.match(url.pathname, /^\/video\/BV1[A-Za-z0-9]{9}\/$/);
    }
  }
}

test("developer resources have unique stable IDs, classified HTTPS sources and complete translations", () => {
  const { developerResources: resources, developerSources: sources } = developerDocs;
  assert.ok(resources.length >= 30);
  assert.equal(new Set(resources.map(resource => resource.id)).size, resources.length);
  assert.ok(Object.keys(sources).length >= 20);
  assert.equal(new Set(Object.values(sources).map(source => source.href)).size, Object.keys(sources).length);
  assert.equal(new Set(resources.map(resource => resource.sourceId)).size, Object.keys(sources).length);
  for (const resource of resources) {
    assert.match(resource.id, /^developer-[a-z0-9-]+$/);
    assert.ok(sources[resource.sourceId]);
    for (const language of translations.skinServiceLanguages) {
      assert.ok(resource.title[language].trim());
      assert.ok(resource.summary[language].trim());
    }
  }
  for (const source of Object.values(sources)) {
    assertSourceUrl(source);
    assert.ok(["official", "tutorial", "tools", "community"].includes(source.kind));
    assert.ok(["article", "video", "tool", "repository", "news"].includes(source.format));
    assert.ok(source.publisher.trim());
    assert.ok(["zh-CN", "en"].includes(source.language));
    assert.ok(source.title.trim());
    if (source.referenceHref) assert.equal(new URL(source.referenceHref).origin, "https://blockbench.net");
  }
});

test("video sources reject search pages, tracking parameters and lookalike domains", () => {
  for (const href of [
    "https://search.bilibili.com/all?keyword=skin",
    "https://www.bilibili.com/video/BV1sb411B7Ya/?spm_id_from=tracking",
    "https://www.bilibili.com/video/BV1sb411B7Ya/#comments",
    "https://www.bilibili.com/video/invalid/",
    "https://www.bilibili.com.evil.test/video/BV1sb411B7Ya/",
    "https://user:password@www.bilibili.com/video/BV1sb411B7Ya/",
    "http://www.bilibili.com/video/BV1sb411B7Ya/",
  ]) assert.throws(() => assertSourceUrl({ href, format: "video" }), href);
});

const source = ts.transpileModule(readFileSync(new URL("../app/components/SkinServiceCenter.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function render(language = "zh-CN", activeSection = "review-notices", filters = ["", "all", "all", "all", ""]) {
  const exports = {};
  let stateIndex = 0;
  const mocks = {
    react: { ...require("react"), useState: value => [filters[stateIndex++] ?? value, () => {}] },
    "next/link": { default: ({ children, ...props }) => createElement("a", props, children) },
    "next/image": { default: ({ priority, ...props }) => createElement("img", props) },
    "next/navigation": { useRouter: () => ({}) },
    "./SettingsContext": { useSettingsContext: () => ({ settings: { language, theme: "light", animationsEnabled: true }, update() {} }) },
    "../lib/paths": { assetPath: path => path },
    "../lib/documentSearch": documentSearch,
    "../lib/reviewBatches": batches,
    "../lib/skinServiceTerms": terms,
    "../lib/skinDeveloperResources": developerDocs,
    "./SkinTermsReader": { default: () => null },
    "../lib/skinServiceI18n": translations,
  };
  runInNewContext(source, { exports, require: name => mocks[name] ?? require(name), URL });
  return renderToStaticMarkup(createElement(exports.default, { activeSection, serviceUrl: null }));
}

test("common resource shortcuts open existing sources directly in every language even with empty filters", () => {
  const ids = ["developer-video-register", "developer-video-ethan-upload", "developer-video-ethan-publish", "developer-blockbench-web", "developer-video-skinseed-export", "developer-video-blockbench-export", "developer-skin-format", "developer-save-submit", "developer-review-appeal"];
  for (const language of translations.skinServiceLanguages) {
    for (const filters of [undefined, ["", "privacy", "official", "video"]]) {
      const html = render(language, "questions", filters);
      const shortcuts = html.match(/<div class="skinArticleQuickLinks"[^>]*>([^]*?)<\/div><\/div>/)?.[1];
      assert.ok(shortcuts);
      assert.equal([...shortcuts.matchAll(/class="skinArticleGuide"/g)].length, 9);
      for (const id of ids) {
        const resource = developerDocs.developerResources.find(resource => resource.id === id);
        const source = developerDocs.developerSources[resource.sourceId];
        assert.ok(shortcuts.includes(`href="${source.href}" target="_blank" rel="noopener noreferrer"`), id);
        assert.ok(shortcuts.includes(renderToStaticMarkup(createElement("h4", null, resource.title[language]))), id);
      }
      assert.ok(shortcuts.includes('href="/skin-service/terms#terms-subclause-4-2"'));
      assert.ok(html.includes('href="#questions-quick-links"'));
      assert.equal([...html.matchAll(/<article id=/g)].length, filters ? 0 : developerDocs.developerResources.length + localArticleCases.length);
    }
  }
});

test("fee guidance links to both V5 pricing and separate fee consent without changing official sources", () => {
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "questions");
    const fees = html.match(/<article id="service-fees-reading"[^]*?<\/article>/)?.[0] ?? "";
    assert.ok(fees.includes('href="/skin-service/terms#terms-subclause-4-2"'));
    assert.ok(fees.includes('href="/skin-service/terms#terms-subclause-4-3"'));
    assert.ok(translations.skinText(language, "serviceFeesBody").includes("4.3"));
    for (const price of [300, 600, 900, 1000, 2000, 5000, 10000, 20000]) assert.ok(translations.skinText(language, "serviceFeesBody").includes(String(price)));
  }
});

test("common link navigation is globally searchable in all service languages", () => {
  for (const language of translations.skinServiceLanguages) {
    searchClickHarness("questions", translations.skinText(language, "articleQuickLinksTitle"), "/skin-service/questions#questions-quick-links", {}, language);
  }
});

test("common link cards form balanced desktop rows and fit narrow screens", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.ok(/\.skinArticleQuickLinks \.skinArticleGuideGrid\s*\{\s*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 320px\), 1fr\)\);/.test(css));
});

test("resource publication and check dates stay intact when narrow-screen text wraps", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.ok(/\.skinArticleQuickLinks time,\s*\.skinArticleSource time\s*\{\s*white-space: nowrap;/.test(css), "resource dates must not split across lines");
});

test("terms replace the fifth hub entry while updates remain available in the header", () => {
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, null);
    const nav = html.match(/<nav class="skinServiceIndex[^]*?<\/nav>/)?.[0] ?? "";
    assert.equal([...nav.matchAll(/class="skinServiceIndexLink/g)].length, 6);
    assert.ok(nav.includes('/skin-service/terms'));
    assert.ok(!nav.includes('/skin-service/updates'));
    assert.match(html, /class="skinServiceUpdatesLink" href="\/skin-service\/updates"/);
    assert.ok(render(language, "updates").includes(`<h1 class="gamesHeroTitle">${translations.skinText(language, "updatesTitle")}</h1>`));
  }
});

test("service updates publish the new version and retain the previous announcement", () => {
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "updates");
    assert.ok(html.indexOf('id="update-2-20-12"') < html.indexOf('id="update-2-20-11"'));
    assert.ok(html.includes(translations.skinText(language, "update22012Title").replaceAll("&", "&amp;")));
    assert.ok(html.includes(translations.skinText(language, "update22011Title").replaceAll("&", "&amp;")));
    assert.ok(html.includes(translations.skinText(language, "update22010Title").replaceAll("&", "&amp;")));
    assert.ok(html.includes(translations.skinText(language, "update2209Title").replaceAll("&", "&amp;")));
    assert.ok(html.includes(translations.skinText(language, "update2208Title").replaceAll("&", "&amp;")));
    assert.ok(html.includes(translations.skinText(language, "update2207Title").replaceAll("&", "&amp;")));
    assert.ok(html.includes(translations.skinText(language, "update2206Title")));
    assert.ok(html.includes(translations.skinText(language, "update2205Title")));
    assert.equal([...html.matchAll(/id="update-2-20-12"/g)].length, 1);
    const [current, history] = html.split('<details class="skinServiceUpdateHistory"');
    assert.ok(current.includes('id="update-2-20-12"'));
    assert.ok(!current.includes('id="update-2-20-11"'));
    assert.ok(history?.includes('id="update-2-20-11"'));
    assert.ok(!history.split(">")[0].includes(" open"));
  }
});

test("questions organize sourced Q&As into named topic regions and preserve local guidance", () => {
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "questions");
    const cards = [...html.matchAll(/<article id="developer-[^>]*>([\s\S]*?)<\/article>/g)];
    assert.equal(cards.length, developerDocs.developerResources.length);
    assert.equal([...html.matchAll(/class="skinArticleSourceLink"/g)].length, cards.length);
    for (const category of ["introduction", "tools", "creation", "preparation", "publishing", "pricing", "review", "privacy"]) {
      assert.ok(html.includes(`id="questions-topic-${category}"`), category);
      assert.ok(html.includes(`aria-labelledby="questions-topic-${category}-title"`));
    }
    assert.ok(html.includes('id="service-introduction"'));
    assert.ok(html.includes('id="privacy-protection"'));
    assert.ok(html.includes(`dateTime="${developerDocs.developerResourcesCompiledAt}"`) || html.includes(`datetime="${developerDocs.developerResourcesCompiledAt}"`));
    for (const [, card] of cards) {
      assert.match(card, /<h4[^>]*>[^<]+<\/h4>/);
      assert.match(card, /<p>[^<]+<\/p>/);
      assert.match(card, /href="https:\/\/[^\"]+"/);
      assert.match(card, /target="_blank" rel="noopener noreferrer"/);
      assert.match(card, /class="skinArticleSource"/);
    }
  }
});

test("archive includes direct videos, source projects and historical update formats", () => {
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "questions");
    assert.ok(html.includes('class="skinArticleFormatFilters"'));
    for (const id of ["developer-video-hd-skin", "developer-video-interface", "developer-video-low-poly", "developer-blockbench-project", "developer-4d-test-update"]) assert.ok(html.includes(`id="${id}"`));
    for (const video of ["xC81Q3HGraE", "U9FLteWmFzg", "WbyCbA1c8BM"]) assert.ok(html.includes(`https://www.youtube.com/watch?v=${video}`));
    for (const id of ["developer-video-hd-skin", "developer-blockbench-project", "developer-blockbench-web"]) {
      const card = html.match(new RegExp(`<article id="${id}"[^>]*>([\\s\\S]*?)</article>`))?.[1];
      assert.ok(card?.includes('lang="en"'));
      const origin = card.match(/class="skinArticleOrigin"[^>]*>([^<]+)</)?.[1];
      assert.ok(origin);
      assert.ok(!origin.includes("网易"));
    }
    assert.equal([...html.matchAll(/class="skinArticleReferenceLink"/g)].length, 3);
    assert.ok(!html.includes("<iframe"), "video playback remains on its original source");
  }
});

const chineseVideoIds = [
  "developer-video-china-upload", "developer-video-china-upload-followup", "developer-video-mcskin3d",
  "developer-video-skinseed-clothing", "developer-video-skin-eyes", "developer-video-skin-gradient",
  "developer-video-skin-resolution", "developer-video-blockbench-paint", "developer-video-blockbench-model-layers",
  "developer-video-blockbench-mobile",
  "developer-video-blockbench-mobile-import", "developer-video-skinseed-hair", "developer-video-head-basics",
  "developer-video-hair-gradient", "developer-video-skinseed-export", "developer-video-blockbench-export",
  "developer-video-skinseed-ios-alpha",
];
const troubleshootingIds = [
  "developer-alpha-preview", "developer-review-delay", "developer-upload-cdn", "developer-review-appeal",
  "developer-resubmit-cooldown", "developer-source-backup", "developer-unlisting", "developer-delegated-rights",
  "developer-account-transfer", "developer-infringement-report", "developer-authorized-materials",
  "developer-promotional-links", "developer-transparent-review", "developer-machine-review", "developer-demo-video-format",
  "developer-missing-alpha", "developer-listing-interface-failure", "developer-package-path-errors",
  "developer-package-structure-errors", "developer-missing-skin-preview", "developer-originality-vanilla",
  "developer-recolor-rejection", "developer-incentivized-reviews", "developer-mobile-self-test", "developer-edition-test-clients",
];

test("Chinese video references and official troubleshooting render with original source attribution", () => {
  assert.equal(developerDocs.developerResources.length, 103);
  assert.equal(Object.keys(developerDocs.developerSources).length, 71);
  assert.equal(developerDocs.developerResourcesCompiledAt, "2026-10-13");
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "questions");
    for (const id of [...chineseVideoIds, ...troubleshootingIds]) {
      const resource = developerDocs.developerResources.find(resource => resource.id === id);
      assert.ok(resource, id);
      const source = developerDocs.developerSources[resource.sourceId];
      const card = html.match(new RegExp(`<article id="${id}"[^>]*>([\\s\\S]*?)</article>`))?.[1];
      assert.ok(card?.includes(source.href));
      assert.ok(card.includes('lang="zh-CN"'));
      if (chineseVideoIds.includes(id)) {
        assert.equal(source.kind, "community");
        assert.equal(source.format, "video");
        assert.ok(source.publisher.endsWith(" · 哔哩哔哩"));
        assert.equal(new URL(source.href).origin, "https://www.bilibili.com");
      } else assert.equal(source.kind, "official");
    }
  }
});

test("new export and troubleshooting references preserve authors, dates and applicability limits", () => {
  const references = [
    ["developer-video-blockbench-mobile-import", "BV15uwbzoEHW", "屑牲-", "2026", "03", "14"],
    ["developer-video-skinseed-hair", "BV1XSNwzsEuF", "屑牲-", "2026", "03", "07"],
    ["developer-video-head-basics", "BV1JHTbzjEGW", "Jzium芥子", "2025", "06", "06"],
    ["developer-video-hair-gradient", "BV1TMAQzSE2u", "斯末坚坚子", "2026", "02", "27"],
    ["developer-video-skinseed-export", "BV1FY411Q7Rq", "TAC_两小伙", "2023", "01", "28"],
    ["developer-video-blockbench-export", "BV1iVGyzvEfB", "小夜禾", "2025", "04", "29"],
    ["developer-video-skinseed-ios-alpha", "BV1t2r2YpEPw", "StrSpring-13", "2025", "01", "07"],
  ];
  for (const [id, bv, author, ...dateParts] of references) {
    const resource = developerDocs.developerResources.find(resource => resource.id === id);
    assert.ok(resource, id);
    const source = developerDocs.developerSources[resource.sourceId];
    assert.equal(source.href, `https://www.bilibili.com/video/${bv}/`);
    assert.equal(source.publisher, `${author} · 哔哩哔哩`);
    for (const language of translations.skinServiceLanguages) {
      assert.ok(resource.summary[language].includes(author), `${id}: ${language}`);
      assert.ok(resource.summary[language].includes(dateParts.join("-")), `${id}: original publication date`);
    }
  }
  for (const id of ["developer-missing-alpha", "developer-video-skinseed-ios-alpha"]) {
    const resource = developerDocs.developerResources.find(resource => resource.id === id);
    for (const language of translations.skinServiceLanguages) assert.match(resource.summary[language], /Alpha/);
  }
  const ios = developerDocs.developerResources.find(resource => resource.id === "developer-video-skinseed-ios-alpha");
  for (const language of translations.skinServiceLanguages) {
    assert.match(ios.summary[language], /64×64/);
    assert.match(ios.summary[language], /128/);
  }
  const paths = developerDocs.developerResources.find(resource => resource.id === "developer-package-path-errors");
  for (const language of translations.skinServiceLanguages) {
    assert.match(paths.summary[language], /FileOrPathNameError/);
    assert.match(paths.summary[language], /NameOverSizeError/);
    assert.match(paths.summary[language], /PNG/);
  }
});

test("newly checked video sources retain clean links, dates, attribution and searchable translations", () => {
  const references = [
    ["developer-video-ethan-upload", "BV1sLg46VEJF", "一只Ethan", "2026-07-23", "publishing"],
    ["developer-video-ethan-publish", "BV1C3ge6FEfi", "一只Ethan", "2026-07-24", "publishing"],
    ["developer-video-jiang-upload", "BV1yubK6aEX7", "Minecraft_江弦月", "2026-09-07", "publishing"],
    ["developer-video-register", "BV1WtzrBXE3q", "好小的石头人", "2026-01-24", "introduction"],
  ];
  for (const [id, bv, author, publishedAt, category] of references) {
    const resource = developerDocs.developerResources.find(item => item.id === id);
    assert.ok(resource, id);
    const source = developerDocs.developerSources[resource.sourceId];
    assertSourceUrl(source);
    assert.equal(source.href, `https://www.bilibili.com/video/${bv}/`);
    assert.equal(source.publisher, `${author} · 哔哩哔哩`);
    assert.equal(source.publishedAt, publishedAt);
    assert.equal(source.checkedAt, "2026-10-13");
    assert.equal(source.kind, "community");
    assert.equal(resource.category, category);
    for (const language of translations.skinServiceLanguages) {
      assert.ok(resource.summary[language].includes(author));
      assert.ok(resource.summary[language].includes(publishedAt));
      const html = render(language, "questions", ["", "all", "community", "video", resource.title[language]]);
      const card = html.match(new RegExp(`<article id="${id}"[^]*?</article>`))?.[0];
      assert.ok(card?.includes(`dateTime="${publishedAt}"`));
      assert.ok(card.includes('dateTime="2026-10-13"'));
      searchClickHarness("terms", resource.title[language], `/skin-service/questions#${id}`, {}, language);
    }
  }
  assert.equal(developerDocs.developerSources.videoChinaUpload.checkedAt, undefined, "old links must not inherit a fresh check date");
});

test("new official creation references retain checked dates, clean destinations and localized navigation", () => {
  for (const [id, category, title] of [
    ["developer-mcskin3d-workshop", "tools", "软件学习：MCskin3D软件教程"],
    ["developer-color-uv-basics", "creation", "了解基础"],
    ["developer-outer-layer-design", "creation", "独特设计"],
    ["developer-study-skin-styles", "creation", "分析优秀作品"],
    ["developer-pos-layout", "preparation", "展示图（pos图）设计"],
  ]) {
    const resource = developerDocs.developerResources.find(resource => resource.id === id);
    assert.ok(resource, id);
    const source = developerDocs.developerSources[resource.sourceId];
    assertSourceUrl(source);
    assert.equal(resource.category, category);
    assert.equal(new URL(source.href).hostname, "mc.163.com");
    assert.equal(source.title, title);
    assert.equal(source.checkedAt, "2026-10-13");
    assert.equal(source.publishedAt, undefined);
    for (const language of translations.skinServiceLanguages) {
      const html = render(language, "questions", ["", category, source.kind, "article", resource.title[language]]);
      const card = html.match(new RegExp(`<article id="${id}"[^]*?</article>`))?.[0];
      assert.ok(card?.includes(source.href));
      assert.ok(card.includes('dateTime="2026-10-13"'));
      searchClickHarness("terms", resource.title[language], `/skin-service/questions#${id}`, {}, language);
    }
  }
});

test("presentation and Blockbench help references are attributed, dated, classified and searchable", () => {
  for (const [id, category, sourceId, title, path, publisher] of [
    ["developer-key-art-layout", "preparation", "keyArtLayout", "关键艺术作品（Key Art）设计", "/3-关键艺术作品.html", "网易《我的世界》开发者官网"],
    ["developer-carousel-layout", "preparation", "carouselLayout", "轮播图设计与排列", "/4-轮播图设计.html", "网易《我的世界》开发者官网"],
    ["developer-blockbench-web-preview", "tools", "blockbenchFaq", "Blockbench FAQ", "/wiki/blockbench/faq/", "Blockbench · JannisX11"],
    ["developer-blockbench-mobile-pwa", "tools", "blockbenchFaq", "Blockbench FAQ", "/wiki/blockbench/faq/", "Blockbench · JannisX11"],
    ["developer-blockbench-backups", "tools", "blockbenchOverview", "Blockbench Overview & Tips", "/wiki/guides/blockbench-overview-tips/", "Blockbench · MasterianoX"],
    ["developer-blockbench-paint-tools", "creation", "blockbenchOverview", "Blockbench Overview & Tips", "/wiki/guides/blockbench-overview-tips/", "Blockbench · MasterianoX"],
  ]) {
    const resource = developerDocs.developerResources.find(item => item.id === id);
    assert.ok(resource, id);
    assert.equal(resource.sourceId, sourceId);
    assert.equal(resource.category, category);
    const source = developerDocs.developerSources[sourceId];
    assertSourceUrl(source);
    assert.ok(decodeURI(new URL(source.href).pathname).endsWith(path));
    assert.equal(source.title, title);
    assert.equal(source.publisher, publisher);
    assert.equal(source.checkedAt, "2026-10-13");
    assert.equal(source.publishedAt, undefined, "a check date is not a publication date");
    assert.equal(source.kind, sourceId.startsWith("blockbench") ? "tools" : "tutorial");
    for (const language of translations.skinServiceLanguages) {
      const html = render(language, "questions", ["", category, source.kind, "article", resource.title[language]]);
      const card = html.match(new RegExp(`<article id="${id}"[^]*?</article>`))?.[0];
      assert.ok(card?.includes(source.href), `${language}: ${id}`);
      assert.ok(card.includes('dateTime="2026-10-13"'));
      assert.ok(card.includes(`lang="${source.language}"`));
      searchClickHarness("terms", resource.title[language], `/skin-service/questions#${id}`, {}, language);
    }
  }
  for (const [id, terms] of [
    ["developer-key-art-layout", ["Key Art"]],
    ["developer-blockbench-web-preview", ["WebGL"]],
    ["developer-blockbench-mobile-pwa", ["PWA", "APK"]],
    ["developer-blockbench-backups", ["10", "Help", "Open Backup Folder"]],
    ["developer-blockbench-paint-tools", ["Paint Mode", "Lock Alpha Channel"]],
  ]) {
    const resource = developerDocs.developerResources.find(item => item.id === id);
    for (const language of translations.skinServiceLanguages) {
      for (const term of terms) assert.ok(resource.summary[language].includes(term), `${language}: ${id}: ${term}`);
    }
  }
});

test("desktop PNG and publishing checks retain official sources and searchable localized guidance", () => {
  for (const [id, category, sourceId, title, path] of [
    ["developer-gimp-project-export", "tools", "gimpProjectExport", "Getting Images out of GIMP", "/3.0/en/gimp-images-out.html"],
    ["developer-gimp-pixel-size", "preparation", "gimpPixelSize", "Scale Image", "/3.0/en/gimp-image-scale.html"],
    ["developer-gimp-add-alpha", "tools", "gimpAddAlpha", "Add Alpha Channel", "/3.0/en/gimp-layer-alpha-add.html"],
    ["developer-gimp-transparent-export", "preparation", "gimpTransparentExport", "Saving Images with Transparency", "/3.0/en/gimp-using-web-transparency.html"],
    ["developer-publishing-image-check", "publishing", "publishingImageCheck", "发布与优化", "/6-发布与优化.html"],
  ]) {
    const resource = developerDocs.developerResources.find(item => item.id === id);
    assert.ok(resource, id);
    assert.equal(resource.sourceId, sourceId);
    assert.equal(resource.category, category);
    const source = developerDocs.developerSources[sourceId];
    assert.ok(decodeURI(new URL(source.href).pathname).endsWith(path));
    assert.equal(source.title, title);
    assert.equal(source.checkedAt, "2026-10-13");
    assert.equal(source.publishedAt, undefined);
    assert.equal(source.format, "article");
    assert.equal(source.kind, sourceId.startsWith("gimp") ? "tools" : "tutorial");
    assert.equal(source.publisher, sourceId.startsWith("gimp") ? "GIMP 官方用户手册" : "网易《我的世界》开发者官网");
    for (const language of translations.skinServiceLanguages) {
      const html = render(language, "questions", ["", category, source.kind, "article", resource.title[language]]);
      const card = html.match(new RegExp(`<article id="${id}"[^]*?</article>`))?.[0];
      assert.ok(card?.includes(source.href));
      assert.ok(card.includes('dateTime="2026-10-13"'));
      assert.ok(card.includes(`lang="${source.language}"`));
      searchClickHarness("terms", resource.title[language], `/skin-service/questions#${id}`, {}, language);
      const byUrl = render(language, "questions", ["", "all", "all", "all", `${source.href}?utm_source=share#reading`]);
      assert.deepEqual([...byUrl.matchAll(/<article id="([^"]+)"/g)].map(match => match[1]), [id]);
    }
  }
  for (const [id, words] of [
    ["developer-gimp-project-export", ["XCF", "PNG", "undo"]],
    ["developer-gimp-pixel-size", ["DPI"]],
    ["developer-gimp-add-alpha", ["Alpha", "Layer", "Transparency"]],
    ["developer-gimp-transparent-export", ["Alpha", "PNG"]],
  ]) {
    const resource = developerDocs.developerResources.find(item => item.id === id);
    for (const language of translations.skinServiceLanguages) {
      for (const word of words) assert.ok(resource.summary[language].includes(word), `${id}: ${language} ${word}`);
    }
  }
});

test("format filters compose with topic and source filters while keeping the disclaimer visible", () => {
  for (const format of ["all", "article", "video", "tool", "repository", "news"]) {
    const count = developerDocs.developerResources.filter(resource => format === "all" || developerDocs.developerSources[resource.sourceId].format === format).length + (format === "all" || format === "article" ? localArticleCases.length : 0);
    const html = render("zh-CN", "questions", ["", "all", "all", format]);
    assert.equal([...html.matchAll(/<article id=/g)].length, count, format);
    assert.ok(html.includes('id="questions-disclaimer"'));
  }
  const videos = render("zh-CN", "questions", ["", "creation", "community", "video"]);
  assert.equal([...videos.matchAll(/<article id=/g)].length, developerDocs.developerResources.filter(resource => resource.category === "creation" && developerDocs.developerSources[resource.sourceId].kind === "community" && developerDocs.developerSources[resource.sourceId].format === "video").length);
  const empty = render("zh-CN", "questions", ["", "privacy", "official", "video"]);
  assert.equal([...empty.matchAll(/<article id=/g)].length, 0);
  assert.ok(empty.includes('class="skinArticleEmpty"'));
  assert.ok(empty.includes('id="questions-disclaimer"'));
});

test("Q&A keyword search combines with filters and searches source titles and authors", () => {
  for (const [query, id] of [["Skinseed", "developer-skinseed-mobile"], ["ArtsByKev", "developer-video-hd-skin"], ["同步 审核", "developer-sync-review"]]) {
    const html = render("zh-CN", "questions", ["", "all", "all", "all", query]);
    assert.ok(html.includes(`id="${id}"`), query);
    assert.ok(!html.includes('id="service-introduction"'));
  }
  const empty = render("zh-CN", "questions", ["", "privacy", "official", "video", "Skinseed"]);
  assert.match(empty, /class="skinArticleEmpty"/);
  assert.match(empty, /id="questions-disclaimer"/);
});

test("source context remains complete inside a default-collapsed accessible disclosure", () => {
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "questions");
    const notice = html.match(/<details class="skinDeveloperNotice"([^>]+)>([\s\S]*?)<\/details>/);
    assert.ok(notice);
    assert.ok(!notice[1].includes(" open"));
    assert.match(notice[2], /<summary id="developer-docs-title">/);
    assert.ok(notice[2].includes(developerDocs.developerResourcesCompiledAt));
    assert.ok(notice[2].includes(renderToStaticMarkup(createElement("p", null, translations.skinText(language, "developerDocsNotice", { questions: developerDocs.developerResources.length, sources: Object.keys(developerDocs.developerSources).length })))));
  }
});

test("source cards disclose the actual destination hostname without changing original links", () => {
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "questions");
    for (const resource of developerDocs.developerResources) {
      const card = html.match(new RegExp(`<article id="${resource.id}"[^>]*>([^]*?)</article>`))?.[1];
      const source = developerDocs.developerSources[resource.sourceId];
      const domain = card?.match(/<p class="skinArticleSourceDomain">([^]*?)<\/p>/)?.[1];
      assert.ok(domain, `${language} ${resource.id}`);
      assert.ok(domain.includes(new URL(source.href).hostname));
      assert.ok(domain.includes(translations.skinText(language, "sourceWebsite")));
      assert.ok(card.includes(`href="${source.href.replaceAll("&", "&amp;")}"`));
    }
    for (const [id] of localArticleCases) {
      const card = html.match(new RegExp(`<article id="${id}"[^>]*>([^]*?)</article>`))?.[1];
      assert.ok(!card.includes('class="skinArticleSourceDomain"'));
    }
  }
});

test("Q&A and global search find the same resources by destination hostname", () => {
  for (const language of translations.skinServiceLanguages) {
    for (const hostname of ["mc.163.com", "www.bilibili.com", "github.com"]) {
      const expected = developerDocs.developerResources.filter(resource => new URL(developerDocs.developerSources[resource.sourceId].href).hostname === hostname).map(resource => resource.id).sort();
      const query = hostname.toUpperCase();
      const local = render(language, "questions", ["", "all", "all", "all", query]);
      const localIds = [...local.matchAll(/<article id="([^"]+)"/g)].map(match => match[1]).sort();
      assert.deepEqual(localIds, expected, `${language} ${hostname}`);
      const global = render(language, "questions", [query]);
      const results = global.match(/<div class="skinServiceSearchResults">([^]*?)<\/div>/)?.[1] ?? "";
      const globalIds = [...results.matchAll(/href="\/skin-service\/questions#(developer-[^"]+)"/g)].map(match => match[1]).sort();
      assert.deepEqual(globalIds, expected);
    }
  }
});

test("Q&A and global search index source URLs, video identifiers and documented dates", () => {
  const { developerResources: resources, developerSources: sources } = developerDocs;
  const queries = [
    "BV1sLg46VEJF",
    sources.videoEthanUpload.href,
    sources.planning.href,
    decodeURI(sources.planning.href),
    "2026-07-23",
    "2026-10-13",
  ];
  for (const language of translations.skinServiceLanguages) {
    for (const query of queries) {
      const expected = resources.filter(resource => {
        const source = sources[resource.sourceId];
        return documentSearch.matchesDocumentQuery([
          resource.title[language], resource.summary[language], source.href,
          decodeURI(source.href), source.publishedAt, source.checkedAt,
        ].join(" "), query, language);
      }).map(resource => resource.id).sort();
      assert.ok(expected.length, query);
      const local = render(language, "questions", ["", "all", "all", "all", query]);
      const localIds = [...local.matchAll(/<article id="([^"]+)"/g)].map(match => match[1]).sort();
      assert.deepEqual(localIds, expected, `${language} local ${query}`);
      const global = render(language, "questions", [query]);
      const results = global.match(/<div class="skinServiceSearchResults">([^]*?)<\/div>/)?.[1] ?? "";
      const globalIds = [...results.matchAll(/href="\/skin-service\/questions#(developer-[^"]+)"/g)].map(match => match[1]).filter(id => resources.some(resource => resource.id === id)).sort();
      assert.deepEqual(globalIds, expected, `${language} global ${query}`);
    }
  }
});

test("both document search inputs accept the complete encoded official URLs", () => {
  const html = render("zh-CN", "questions");
  const longestUrl = Math.max(...Object.values(developerDocs.developerSources).map(source => source.href.length));
  const global = html.match(/<input type="search" maxLength="(\d+)"/);
  const local = html.match(/<input id="skin-article-search"[^>]*maxLength="(\d+)"/);
  assert.ok(global && local);
  assert.ok(longestUrl > 200, "fixture must reproduce the old truncation limit");
  for (const input of [global, local]) {
    assert.ok(Number(input[1]) >= longestUrl);
    assert.ok(Number(input[1]) <= 2048, "keep a bounded query input");
  }
});

test("source search shows readable summaries without exposing its encoded URL index", () => {
  const resource = developerDocs.developerResources.find(resource => resource.id === "developer-mcskin3d-workshop");
  const source = developerDocs.developerSources[resource.sourceId];
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "questions", [source.href]);
    const results = html.match(/<div class="skinServiceSearchResults">([^]*?)<\/div>/)?.[1] ?? "";
    assert.ok(results.includes(renderToStaticMarkup(createElement("span", null, resource.summary[language]))));
    assert.ok(!results.includes(source.href), "source URL belongs to the index, not the summary");
  }
});

test("copied source URLs remain searchable with tracking parameters and time fragments", () => {
  for (const sourceId of ["planning", "videoEthanUpload", "videoSkin", "blockbenchFaq", "blockbenchOverview"]) {
    const source = developerDocs.developerSources[sourceId];
    const query = `${source.href}${source.href.includes("?") ? "&" : "?"}utm_source=share&spm_id_from=333.337&t=30#reading`;
    const expected = developerDocs.developerResources.filter(resource => resource.sourceId === sourceId).map(resource => resource.id).sort();
    for (const language of translations.skinServiceLanguages) {
      const local = render(language, "questions", ["", "all", "all", "all", query]);
      const localIds = [...local.matchAll(/<article id="([^"]+)"/g)].map(match => match[1]).sort();
      assert.deepEqual(localIds, expected, `${language} local ${sourceId}`);
      const global = render(language, "questions", [query]);
      const results = global.match(/<div class="skinServiceSearchResults">([^]*?)<\/div>/)?.[1] ?? "";
      const globalIds = [...results.matchAll(/href="\/skin-service\/questions#(developer-[^"]+)"/g)].map(match => match[1]).sort();
      assert.deepEqual(globalIds, expected, `${language} global ${sourceId}`);
    }
  }
});

test("source URL normalization stays inside the registered destinations and preserves video IDs", () => {
  const normalize = developerDocs.developerSourceQuery;
  assert.equal(typeof normalize, "function");
  const youtube = developerDocs.developerSources.videoSkin.href;
  assert.equal(normalize(`${youtube}&si=share#t=30`), youtube);
  const official = developerDocs.developerSources.planning.href;
  assert.equal(normalize(`${decodeURI(official)}?catalog=1#section`), official);
  const bili = developerDocs.developerSources.videoEthanUpload.href;
  assert.equal(normalize(`${bili.slice(0, -1)}?share_source=copy`), bili);
  for (const query of [
    "2.1", "2.1 授权", "PNG Alpha", "<script>alert(1)</script>",
    "https://mc.163.com/unknown?catalog=1",
    "https://www.bilibili.com.evil.test/video/BV1sLg46VEJF/?share=1",
    "https://user:password@www.bilibili.com/video/BV1sLg46VEJF/",
    "http://www.bilibili.com/video/BV1sLg46VEJF/",
    "https://www.youtube.com/watch?v=unknown&si=share",
    `${youtube}&v=other&si=share`,
    "https://mc.163.com/%ZZ?catalog=1",
  ]) assert.equal(normalize(query), query, query);
});

test("source URL normalization never discards extra search terms or embedded control characters", () => {
  const { developerSources: sources, developerSourceQuery: normalize } = developerDocs;
  const queries = [
    `${sources.videoEthanUpload.href}?utm_source=share absent-search-keyword`,
    `${sources.videoSkin.href}#t=30 absent-search-keyword`,
    `${sources.planning.href}?catalog=1\u3000absent-search-keyword`,
    `${sources.blockbenchFaq.href}#section\nabsent-search-keyword`,
    sources.videoEthanUpload.href.replace("/video/", "/vi\tdeo/"),
  ];
  for (const query of queries) assert.equal(normalize(query), query, query);
  const officialWithSpaces = sources.head.href;
  assert.ok(decodeURI(officialWithSpaces).includes(" "), "registered paths may legitimately contain spaces");
  assert.equal(normalize(`${decodeURI(officialWithSpaces)}?utm_source=share#reading`), officialWithSpaces);
  for (const language of translations.skinServiceLanguages) {
    for (const query of queries.slice(0, 4)) {
      const local = render(language, "questions", ["", "all", "all", "all", query]);
      assert.equal([...local.matchAll(/<article id=/g)].length, 0, `${language}: local`);
      const global = render(language, "questions", [query]);
      const results = global.match(/<div class="skinServiceSearchResults">([^]*?)<\/div>/)?.[1] ?? "";
      assert.ok(!results.includes("developer-"), `${language}: global`);
    }
  }
});

test("source reading guidance distinguishes edition, authority, dates and broken-link reporting", () => {
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "questions");
    const guide = html.match(/<details class="skinDeveloperNotice"[^>]*id="developer-docs-guide"[^>]*>([^]*?)<\/details>/)?.[1];
    assert.ok(guide, language);
    assert.equal([...guide.matchAll(/<li>/g)].length, 3);
    for (const key of ["sourceReadEditionTitle", "sourceReadAuthorityTitle", "sourceReadDateTitle", "sourceReadEditionBody", "sourceReadAuthorityBody", "sourceReadDateBody", "sourceUnavailableBody"]) {
      const copy = translations.skinText(language, key);
      assert.ok(copy?.trim(), `${language} ${key}`);
      assert.ok(guide.includes(renderToStaticMarkup(createElement(key.endsWith("Title") ? "h3" : "p", null, copy))), `${language} ${key}`);
    }
    assert.ok(guide.includes('href="/skin-service/feedback#wechat-feedback-reply"'));
    searchClickHarness("questions", translations.skinText(language, "sourceReadDateTitle"), "/skin-service/questions#developer-docs-guide", {}, language);
    const app = searchClickHarness("questions", "", node => node?.props?.id === "questions", { 1: "privacy", 2: "official", 3: "video", 4: "PNG" }, language);
    app.browser.location.hash = "#developer-docs-guide";
    app.runHashEffect();
    assert.deepEqual(app.updates, [], "source guidance must not remove article filters");
  }
});

test("empty Q&A results offer only recoveries with real predicted matches", () => {
  for (const language of translations.skinServiceLanguages) {
    for (const [category, source, format, query] of [
      ["privacy", "official", "video", "Skinseed"],
      ["tools", "tools", "tool", "unmatched-qa-query"],
      ["privacy", "official", "video", "unmatched-qa-query"],
      ["all", "all", "all", "unmatched-qa-query"],
      ["privacy", "official", "video", ""],
    ]) {
      const html = render(language, "questions", ["", category, source, format, query]);
      const empty = html.match(/<div class="skinArticleEmpty">([^]*?)<\/div>\s*<\/div>/)?.[1];
      assert.ok(empty, `${language} ${category}/${source}/${format}/${query}`);
      const keywordCount = [...render(language, "questions", ["", "all", "all", "all", query]).matchAll(/<article id=/g)].length;
      const facetCount = [...render(language, "questions", ["", category, source, format, ""]).matchAll(/<article id=/g)].length;
      const relaxFilters = empty.match(/<button[^>]*data-article-recovery="filters"[^>]*>([^]*?)<\/button>/)?.[1];
      const clearQuery = empty.match(/<button[^>]*data-article-recovery="query"[^>]*>([^]*?)<\/button>/)?.[1];
      const hasFacets = [category, source, format].some(value => value !== "all");
      assert.equal(Boolean(relaxFilters), hasFacets && keywordCount > 0);
      assert.equal(Boolean(clearQuery), Boolean(query.trim()) && facetCount > 0);
      if (relaxFilters) assert.ok(relaxFilters.includes(translations.skinText(language, "articleRelaxFilters", { count: keywordCount })));
      if (clearQuery) assert.ok(clearQuery.includes(translations.skinText(language, "articleClearQueryKeepFilters", { count: facetCount })));
      const diagnostic = translations.skinText(language, keywordCount ? "articleMatchesOutsideFilters" : "articleNoKeywordMatches", { count: keywordCount });
      assert.ok(empty.includes(renderToStaticMarkup(createElement("p", { className: "skinArticleRecoveryHint" }, diagnostic))));
      assert.ok(empty.includes('href="#questions-guides"'));
      assert.ok(empty.includes('href="/skin-service/feedback#wechat-feedback-reply"'));
    }
  }
});

test("empty-result recoveries change only their own conditions and restore stable keyboard focus", () => {
  for (const [action, filters, expected] of [
    ["filters", { 1: "privacy", 2: "official", 3: "video", 4: "Skinseed" }, ["all", "all", "all"]],
    ["query", { 1: "tools", 2: "tools", 3: "tool", 4: "unmatched-qa-query" }, [""]],
  ]) {
    const app = searchClickHarness("questions", "", node => node?.props?.["data-article-recovery"] === action, filters);
    const find = node => Array.isArray(node) ? node.map(find).find(Boolean) : (action === "filters" ? node?.props?.className === "skinArticleFilters" : node?.props?.id === "skin-article-search") ? node : node?.props ? find(node.props.children) : undefined;
    const target = find(app.tree);
    let focused = false;
    const control = { focus() { focused = true; } };
    target.props.ref.current = action === "filters" ? { querySelector: () => control } : control;
    app.click();
    assert.deepEqual(app.updates, expected);
    assert.equal(focused, true);
  }
});

test("each Q&A keeps a native bookmark link and a searchable title in every service language", () => {
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "questions");
    assert.match(html, /id="skin-article-search"/);
    for (const resource of developerDocs.developerResources) {
      assert.ok(html.includes(`href="#${resource.id}"`), resource.id);
      const filtered = render(language, "questions", ["", "all", "all", "all", resource.title[language]]);
      assert.ok(filtered.includes(`id="${resource.id}"`), `${language} ${resource.id}`);
      searchClickHarness("questions", resource.title[language], `/skin-service/questions#${resource.id}`, {}, language);
    }
    for (const [id, , title] of localArticleCases) {
      assert.ok(html.includes(`href="#${id}"`), id);
      const filtered = render(language, "questions", ["", "all", "all", "all", translations.skinText(language, title)]);
      assert.ok(filtered.includes(`id="${id}"`), `${language} ${id}`);
      searchClickHarness("questions", translations.skinText(language, title), `/skin-service/questions#${id}`, {}, language);
    }
  }
});

test("all 972 filter combinations retain correct results and forecast counts for each alternative", () => {
  const entries = [
    ...developerDocs.developerResources.map(resource => ({ category: resource.category, source: developerDocs.developerSources[resource.sourceId].kind, format: developerDocs.developerSources[resource.sourceId].format })),
    ...localArticleCases.map(([, category]) => ({ category, source: "service", format: "article" })),
  ];
  for (const language of translations.skinServiceLanguages) {
    for (const category of ["all", "introduction", "tools", "creation", "preparation", "publishing", "pricing", "review", "privacy"]) {
      for (const source of ["all", "official", "tutorial", "tools", "community", "service"]) {
        for (const format of ["all", "article", "video", "tool", "repository", "news"]) {
          const count = entries.filter(entry => (category === "all" || entry.category === category) && (source === "all" || entry.source === source) && (format === "all" || entry.format === format)).length;
          const html = render(language, "questions", ["", category, source, format, ""]);
          assert.equal([...html.matchAll(/<article id=/g)].length, count, `${language} ${category} ${source} ${format}`);
          assert.ok(html.includes('id="questions-disclaimer"'));
          assert.ok(html.includes(translations.skinText(language, "articleCount", { count, total: entries.length })));
          for (const [group, facet, current] of [["skinArticleFilters", "category", { source, format }], ["skinArticleSourceFilters", "source", { category, format }], ["skinArticleFormatFilters", "format", { category, source }]]) {
            const body = html.match(new RegExp(`<div class="${group}"[^>]*>([^]*?)</div>`))?.[1];
            assert.ok(body, group);
            const buttons = [...body.matchAll(/<button([^>]*)>([^]*?)<\/button>/g)];
            const options = facet === "category" ? ["all", "introduction", "tools", "creation", "preparation", "publishing", "pricing", "review", "privacy"] : facet === "source" ? ["all", "official", "tutorial", "tools", "community", "service"] : ["all", "article", "video", "tool", "repository", "news"];
            assert.equal(buttons.length, options.length);
            for (const [index, value] of options.entries()) {
              const expected = entries.filter(entry => (value === "all" || entry[facet] === value) && Object.entries(current).every(([key, selected]) => selected === "all" || entry[key] === selected)).length;
              const forecast = buttons[index][2].match(/class="skinArticleFilterCount"[^>]*>(\d+)</)?.[1];
              assert.equal(Number(forecast), expected, `${language} ${category}/${source}/${format}: ${facet}=${value}`);
              assert.ok(buttons[index][1].includes("aria-label="));
              assert.ok(!buttons[index][1].includes("disabled"), "zero-count choices must still allow changing multiple conditions");
            }
          }
        }
      }
    }
  }
});

test("facet forecasts respect keywords and changing a facet changes only that condition", () => {
  for (const language of translations.skinServiceLanguages) {
    const empty = render(language, "questions", ["", "all", "all", "all", "unmatched-query"]);
    assert.equal([...empty.matchAll(/class="skinArticleFilterCount"[^>]*>0</g)].length, 21);
    const videos = render(language, "questions", ["", "all", "community", "video", "Skinseed"]);
    const expected = developerDocs.developerResources.filter(resource => {
      const source = developerDocs.developerSources[resource.sourceId];
      return source.kind === "community" && source.format === "video" && `${resource.title[language]} ${resource.summary[language]} ${source.title} ${source.publisher}`.toLowerCase().includes("skinseed");
    }).length;
    const formats = videos.match(/<div class="skinArticleFormatFilters"[^>]*>([^]*?)<\/div>/)?.[1];
    const selected = formats?.match(/<button[^>]*aria-pressed="true"[^>]*>([^]*?)<\/button>/)?.[1];
    assert.equal(Number(selected?.match(/class="skinArticleFilterCount"[^>]*>(\d+)</)?.[1]), expected);
  }
  for (const [group, label, value] of [["skinArticleFilters", "materials", "preparation"], ["skinArticleSourceFilters", "officialRules", "official"], ["skinArticleFormatFilters", "articleFormat", "article"]]) {
    const app = searchClickHarness("questions", "", node => node?.props?.className === group, { 1: "privacy", 2: "community", 3: "video", 4: "Skinseed" });
    const find = node => Array.isArray(node) ? node.map(find).find(Boolean) : node?.type === "button" && node.props["aria-label"]?.startsWith(translations.skinText("zh-CN", label)) ? node : node?.props ? find(node.props.children) : undefined;
    const selected = find(app.tree);
    assert.ok(selected);
    selected.props.onClick();
    assert.deepEqual(app.updates, [value]);
  }
});

test("local service questions link to relevant existing guides, notices and original agreement clauses", () => {
  const links = {
    "service-introduction": ["/skin-service/terms", "#questions-guide-publishing"],
    "submission-preparation": ["#questions-guide-publishing", "/skin-service/terms"],
    "review-status": ["/skin-service/review-notices", "/skin-service/feedback#wechat-feedback-reply"],
    "returned-materials": ["#questions-guide-troubleshooting", "/skin-service/feedback#wechat-feedback-reply"],
    "change-submission": ["/skin-service/terms#terms-subclause-8-1", "/skin-service/feedback#wechat-feedback-reply"],
    "privacy-protection": ["/skin-service/terms#terms-subclause-12-1", "/skin-service/feedback#wechat-feedback-reply"],
    "private-skin-publication": ["/skin-service/terms#terms-clause-7", "/skin-service/terms#terms-subclause-8-2"],
    "service-fees-reading": ["/skin-service/terms#terms-subclause-4-2", "/skin-service/terms#terms-subclause-4-3", "/skin-service/support"],
    "service-authorization-proof": ["/skin-service/terms#terms-clause-2", "/skin-service/terms#terms-subclause-2-14"],
    "service-review-timing": ["/skin-service/terms#terms-clause-5", "/skin-service/review-notices", "/skin-service/feedback#wechat-feedback-reply"],
    "service-publisher-handover": ["/skin-service/terms#terms-subclause-6-1", "/skin-service/feedback#wechat-feedback-reply"],
    "service-cancellation-settlement": ["/skin-service/terms#terms-clause-8", "/skin-service/feedback#wechat-feedback-reply"],
    "service-minor-consent": ["/skin-service/terms#terms-subclause-14-2", "/skin-service/terms#terms-subclause-14-1"],
  };
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "questions");
    assert.equal([...html.matchAll(/class="skinArticleRelatedLinks"/g)].length, Object.keys(links).length);
    for (const [id, expected] of Object.entries(links)) {
      const card = html.match(new RegExp(`<article id="${id}"[^>]*>([^]*?)</article>`))?.[1];
      const actions = card?.match(/<div class="skinArticleRelatedLinks"[^>]*>([^]*?)<\/div>/)?.[1];
      assert.ok(actions, `${language} ${id}`);
      assert.deepEqual([...actions.matchAll(/href="([^"]+)"/g)].map(match => match[1]), expected);
      for (const href of expected) {
        if (href.startsWith("#")) assert.ok(html.includes(`id="${href.slice(1)}"`));
        else if (href.includes("/terms#")) assert.ok(terms.serviceTermsSections.some(section => `#${section.id}` === href.slice(href.indexOf("#")) || section.clauses.some(clause => `#${clause.id}` === href.slice(href.indexOf("#")))));
      }
    }
  }
});

test("local Q&A guide links open the guide without discarding filters or modified navigation", () => {
  const app = searchClickHarness("questions", "", node => node?.props?.className === "skinArticleRelatedLinks", { 2: "service", 4: "" });
  const find = node => Array.isArray(node) ? node.map(find).find(Boolean) : node?.props?.href === "#questions-guide-publishing" ? node : node?.props ? find(node.props.children) : undefined;
  const guideLink = find(app.tree);
  assert.ok(guideLink?.props.onClick);
  for (const properties of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) guideLink.props.onClick({ button: 0, ...properties });
  assert.equal(app.frames.length, 0);
  guideLink.props.onClick({ button: 0, preventDefault() { assert.fail("native link behavior must be preserved"); } });
  app.frames[0]();
  assert.equal(app.reveals[0].behavior, "instant");
  assert.deepEqual(app.updates, []);
});

test("disclaimer follows all archived topics and offers takedown contact without denying agreement fees", () => {
  const html = render("zh-CN", "questions");
  assert.ok(html.indexOf('id="questions-disclaimer"') > html.indexOf('id="questions-topic-privacy"'));
  assert.match(html, /id="questions-disclaimer"[^>]*aria-labelledby="questions-disclaimer-title"/);
  for (const label of ["著作权", "核实后", "删除", "免费查阅", "付费解锁", "赞赏", "自愿", "事前确认", "侵权反馈／联系删除"]) assert.ok(html.includes(label), label);
  assert.ok(html.includes('href="/skin-service/feedback#wechat-feedback-reply"'));
  assert.ok(html.includes('href="/skin-service/terms"'));
  assert.ok(!html.includes("无任何盈利"));
  for (const language of translations.skinServiceLanguages) assert.ok(render(language, "questions").includes('id="questions-disclaimer-title"'));
});

test("source filters identify official rules, art tutorials, tools and community references", () => {
  const html = render("zh-CN", "questions");
  for (const label of ["来源类型", "全部来源", "官方规范", "制作教程", "工具指南", "社区参考", "本站服务说明", "皮肤制作", "绘图工具"]) assert.ok(html.includes(label), label);
  assert.ok(html.includes('class="skinArticleSourceFilters"'));
  assert.ok(html.includes("社区文档镜像"));
});

test("developer material and publishing filters are available beside the original service categories", () => {
  const html = render("zh-CN", "questions");
  for (const label of ["全部资料", "服务入门", "材料准备", "上传与发布", "定价与等级", "审核与处理", "隐私安全"]) assert.ok(html.includes(label));
});

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

function searchClickHarness(activeSection = "review-notices", query = "216", href = "/skin-service/review-notices#review-batch-216", filters = {}, language = "zh-CN") {
  const exports = {};
  const updates = [];
  const frames = [];
  const cancelledFrames = [];
  const hashEffects = [];
  const listeners = new Map();
  const reveals = [];
  class HTMLElement {
    parentElement = null;
    scrollIntoView(options) { reveals.push(options); }
    hasAttribute() { return true; }
    focus() {}
  }
  class HTMLDetailsElement extends HTMLElement {}
  const document = { getElementById: () => new HTMLElement() };
  const browser = {
    location: { hash: "" },
    matchMedia: () => ({ matches: false }),
    history: { replaceState(_state, _title, hash) { browser.location.hash = hash; } },
    requestAnimationFrame: callback => frames.push(callback),
    cancelAnimationFrame: frame => cancelledFrames.push(frame),
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
  };
  let stateIndex = 0;
  const mocks = {
    react: {
      ...require("react"),
      useState: value => { const index = stateIndex++; return [index === 0 ? query : filters[index] ?? value, value => updates.push(value)]; },
      useRef: value => ({ current: value }),
      useMemo: fn => fn(),
      useCallback: fn => fn,
      useEffect(effect) { if (effect.toString().includes('"hashchange"')) hashEffects.push(effect); },
    },
    "next/link": { default: "a" },
    "next/image": { default: "img" },
    "next/navigation": { useRouter: () => ({}) },
    "./SettingsContext": { useSettingsContext: () => ({ settings: { language, theme: "light", animationsEnabled: true }, update() {} }) },
    "../lib/paths": { assetPath: path => path },
    "../lib/documentSearch": documentSearch,
    "../lib/reviewBatches": batches,
    "../lib/skinServiceTerms": terms,
    "../lib/skinDeveloperResources": developerDocs,
    "./SkinTermsReader": { default: () => null },
    "../lib/skinServiceI18n": translations,
  };
  runInNewContext(source, {
    exports,
    URL,
    require: name => mocks[name] ?? require(name),
    window: browser,
    document,
    HTMLElement, HTMLDetailsElement,
  });
  const findLink = node => {
    if (Array.isArray(node)) return node.map(findLink).find(Boolean);
    if (typeof href === "function" ? href(node) : node?.props?.href === href) return node;
    return node?.props ? findLink(node.props.children) : undefined;
  };
  const tree = exports.default({ activeSection, serviceUrl: null });
  const link = findLink(tree);
  assert.ok(link, "search must include the matching result link");
  return { click: link.props.onClick, updates, frames, tree, cancelledFrames, browser, document, listeners, reveals, runHashEffect: () => hashEffects[0]() };
}

test("document links preserve active filters unless a known Q&A is hidden", () => {
  for (const hash of ["#developer-skin-format", "#questions-topic-creation", "#questions-contents", "#questions-disclaimer"]) {
    const app = searchClickHarness("questions", "", node => node?.props?.id === "questions", { 1: "creation", 3: "video" });
    app.browser.location.hash = hash;
    app.runHashEffect();
    assert.deepEqual(app.updates, [], hash);
    assert.equal(app.frames.length, 1);
  }
  for (const id of ["developer-skin-format", "service-introduction", "unknown-document"]) {
    const app = searchClickHarness("questions", "", node => node?.props?.id === "questions", { 1: "creation", 3: "video" });
    app.document.getElementById = () => null;
    app.browser.location.hash = `#${id}`;
    app.runHashEffect();
    assert.deepEqual(app.updates, id === "unknown-document" ? [] : ["all", "all", "all", ""], id);
  }
});

test("the collapsed Q&A directory lists each visible question under its topic with accurate counts", () => {
  for (const language of translations.skinServiceLanguages) {
    for (const [category, source, format, query] of [["all", "all", "all", ""], ["all", "all", "video", ""], ["all", "all", "repository", ""], ["privacy", "service", "article", ""], ["all", "all", "all", "Skinseed"]]) {
      const html = render(language, "questions", ["", category, source, format, query]);
      const directory = html.match(/<details class="skinArticleDirectory"[^>]*>([^]*?)<\/nav><\/details>/);
      assert.ok(directory, `${language} ${format}`);
      assert.ok(!directory[0].split(">")[0].includes(" open"));
      const targets = [...html.matchAll(/<section class="skinArticleTopic" id="([^"]+)"[^]*?<h3[^>]*>[^]*?<span>(\d+)<\/span>/g)];
      assert.ok(targets.length > 0);
      const groups = [...directory[1].matchAll(/<details class="skinArticleDirectoryTopic" id="questions-directory-([^"]+)"([^>]*)>([^]*?)<\/details>/g)];
      assert.deepEqual(groups.map(match => [`questions-topic-${match[1]}`, match[3].match(/class="skinArticleFilterCount"[^>]*>(\d+)</)?.[1]]), targets.map(match => [match[1], match[2]]));
      for (const [, topic, attributes, content] of groups) {
        assert.ok(!attributes.includes(" open"));
        assert.ok(content.includes(`href="#questions-topic-${topic}"`));
        assert.ok(content.includes(translations.skinText(language, "articleReadTopic")));
        const ids = [...content.matchAll(/<li><a class="skinArticleDirectoryQuestionLink" href="#([^"]+)"/g)].map(match => match[1]);
        const articles = [...html.matchAll(/<article id="([^"]+)"[^]*?<\/article>/g)].filter(match => match[0].includes(`href="#questions-directory-${topic}"`));
        assert.deepEqual(ids, articles.map(match => match[1]));
        for (const article of articles) {
          assert.ok(content.includes(article[0].match(/<h4[^>]*>([^]*?)<\/h4>/)[1]));
        }
      }
      assert.equal([...directory[1].matchAll(/<li><a class="skinArticleDirectoryQuestionLink" href="#/g)].length, [...html.matchAll(/<article id=/g)].length);
      assert.ok(directory[1].includes(renderToStaticMarkup(createElement("p", null, translations.skinText(language, "articleDirectoryHelp")))));
      assert.equal([...html.matchAll(/class="skinArticleBackToDirectory" href="#questions-contents"/g)].length, targets.length);
    }
  }
});

test("each question keeps native bookmark and return-to-topic links without discarding filters", () => {
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "questions", ["", "all", "service"]);
    for (const [id, category] of localArticleCases) {
      const article = html.match(new RegExp(`<article id="${id}"[^]*?</article>`))?.[0];
      assert.ok(article);
      const actions = article.match(/<div class="skinArticleActions">([^]*?)<\/div>/)?.[1];
      assert.ok(actions);
      assert.deepEqual([...actions.matchAll(/href="#([^"]+)"/g)].map(match => match[1]), [id, `questions-directory-${category}`]);
      assert.ok(html.includes(`id="questions-directory-${category}"`));
    }
  }
  for (const selector of [
    node => node?.props?.className === "skinArticleDirectoryTopicLink",
    node => node?.props?.className === "skinArticleDirectoryQuestionLink",
    node => node?.props?.className === "skinArticlePermalink",
    node => node?.props?.className === "skinArticleReturnToTopic",
  ]) {
    const app = searchClickHarness("questions", "", selector, { 2: "service" });
    assert.equal(typeof app.click, "function");
    for (const properties of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) app.click({ button: 0, ...properties });
    assert.equal(app.frames.length, 0);
    for (let i = 0; i < 2; i++) {
      app.click({ button: 0, preventDefault() { assert.fail("native history must be preserved"); } });
      app.frames.at(-1)();
    }
    assert.deepEqual(app.reveals.map(reveal => reveal.behavior), ["instant", "instant"]);
    assert.deepEqual(app.updates, []);
  }
});

test("the agreement reader reuses the center's cancelable instant target reveal", () => {
  const app = searchClickHarness("terms", "", node => typeof node?.props?.onNavigate === "function");
  const find = node => Array.isArray(node) ? node.map(find).find(Boolean) : typeof node?.props?.onNavigate === "function" ? node : node?.props ? find(node.props.children) : undefined;
  const reader = find(app.tree);
  assert.ok(reader);
  for (let i = 0; i < 2; i++) {
    reader.props.onNavigate("terms-subclause-2-14");
    assert.equal(app.reveals.length, i);
    app.frames.at(-1)();
  }
  assert.deepEqual(app.reveals.map(reveal => reveal.behavior), ["instant", "instant"]);
  assert.equal(app.cancelledFrames.length, 2);
  assert.deepEqual(app.updates, []);
});

test("nonempty Q&A results also provide one reset action with a stable focus target", () => {
  const html = render("zh-CN", "questions", ["", "all", "all", "video"]);
  assert.ok(!html.includes('class="skinArticleEmpty"'));
  assert.equal(html.split(translations.skinText("zh-CN", "resetArticleFilters")).length - 1, 1);
  const app = searchClickHarness("questions", "", node => node?.type === "button" && node.props.children === translations.skinText("zh-CN", "resetArticleFilters"), { 3: "video" });
  app.click();
  assert.deepEqual(app.updates, ["all", "all", "all", ""]);
  assert.ok(!render("zh-CN", "questions").includes(translations.skinText("zh-CN", "resetArticleFilters")));
  const empty = render("zh-CN", "questions", ["", "privacy", "official", "video"]);
  assert.ok(!empty.includes('id="questions-contents"'));
  assert.ok(!empty.includes('href="#questions-topic-'));
  assert.equal(empty.split(translations.skinText("zh-CN", "resetArticleFilters")).length - 1, 1);
});

test("full-width and mixed-case keywords work in both document search surfaces", () => {
  for (const [query, id] of [["ＴＡＣ＿两小伙 Ｓｋｉｎｓｅｅｄ", "developer-video-skinseed-export"], ["ＰＮＧ Ａｌｐｈａ", "developer-missing-alpha"]]) {
    const html = render("zh-CN", "questions", ["", "all", "all", "all", query]);
    assert.ok(html.includes(`id="${id}"`), query);
    searchClickHarness("questions", query, `/skin-service/questions#${id}`);
  }
});

test("Q&A and global search index the same translated topics, source types, formats and languages", () => {
  for (const language of translations.skinServiceLanguages) {
    for (const [key, keyword, expectedId] of [
      ["videoFormat", "Skinseed", "developer-video-skinseed-export"],
      ["officialRules", "PNG", "developer-skin-format"],
      ["repositoryFormat", "Blockbench", "developer-blockbench-project"],
      ["sourceEnglish", "Blockbench", "developer-blockbench-project"],
      ["drawingTools", "Blockbench", "developer-blockbench-project"],
    ]) {
      const query = `${translations.skinText(language, key)} ${keyword}`;
      const local = render(language, "questions", ["", "all", "all", "all", query]);
      const localIds = [...local.matchAll(/<article id="([^"]+)"/g)].map(match => match[1]).sort();
      assert.ok(localIds.includes(expectedId), `${language}: ${query}`);
      const global = render(language, "questions", [query]);
      const results = global.match(/<div class="skinServiceSearchResults">([^]*?)<\/div>/)?.[1] ?? "";
      const globalIds = [...results.matchAll(/href="\/skin-service\/questions#([^"]+)"/g)].map(match => match[1]).filter(id => id.startsWith("developer-") || localArticleCases.some(([localId]) => id === localId)).sort();
      assert.deepEqual(localIds, globalIds, `${language}: ${query}`);
    }
  }
});

test("Q&A reading shortcuts link only existing targets, including when no questions match", () => {
  for (const language of translations.skinServiceLanguages) {
    for (const query of ["", "unmatched-query"]) {
      const html = render(language, "questions", ["", "all", "all", "all", query]);
      const nav = html.match(/<nav class="skinArticleReadingNav"[^>]*>([^]*?)<\/nav>/)?.[1];
      assert.ok(nav, language);
      const links = [...nav.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
      assert.deepEqual(links, ["skin-article-search", "questions-quick-links", ...(query ? [] : ["questions-contents"]), "questions-guides", "questions-disclaimer"]);
      for (const id of links) assert.ok(html.includes(`id="${id}"`), id);
    }
  }
});

test("the Q&A search shortcut focuses search without changing any filters or intercepting modified clicks", () => {
  const app = searchClickHarness("questions", "", node => node?.props?.href === "#skin-article-search", { 1: "tools", 3: "video", 4: "Skinseed" });
  const find = node => Array.isArray(node) ? node.map(find).find(Boolean) : node?.props?.id === "skin-article-search" ? node : node?.props ? find(node.props.children) : undefined;
  let focused = false;
  find(app.tree).props.ref.current = { focus() { focused = true; } };
  for (const properties of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    app.click({ button: 0, ...properties });
    assert.equal(focused, false);
  }
  app.click({ button: 0 });
  assert.equal(focused, true);
  assert.deepEqual(app.updates, []);
});

test("reading and topic-directory links reveal on every plain click without changing filters or native history", () => {
  for (const selector of [
    node => node?.props?.href === "#questions-contents",
    node => node?.props?.href === "#questions-guides",
    node => node?.props?.href === "#questions-disclaimer",
    node => node?.props?.className === "skinArticleBackToDirectory",
  ]) {
    const app = searchClickHarness("questions", "", selector, { 3: "video", 4: "Skinseed" });
    assert.equal(typeof app.click, "function");
    for (const properties of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) app.click({ button: 0, ...properties });
    assert.equal(app.reveals.length, 0);
    for (let i = 0; i < 2; i++) {
      app.click({ button: 0, preventDefault() { assert.fail("plain anchor navigation must preserve browser history"); } });
      assert.equal(app.reveals.length, i, "focus must be restored after native fragment navigation");
      app.frames.at(-1)();
    }
    assert.deepEqual(app.reveals.map(reveal => reveal.behavior), ["instant", "instant"]);
    assert.deepEqual(app.updates, []);
  }
});

test("sticky Q&A navigation reserves space for all document anchors", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.skinArticleReadingNav,\s*\.skinTermsReadingNav\s*\{[^}]*position: sticky;/);
  for (const selector of [".skinArticleGrid article", ".skinArticleTopic", ".skinArticleDirectory", ".skinArticleDirectoryTopic", ".skinArticleGuides", ".skinArticleGuide", ".skinArticleSearch input", "#questions-disclaimer"]) {
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)];
    assert.ok(rules.some(([, selectors, body]) => selectors.split(",").some(value => value.trim() === selector) && body.includes("scroll-margin-top: calc(6rem + 8px)")), selector);
  }
});

test("expanded directory topics use the available width and scale badge spacing with reader text", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.skinArticleDirectoryTopics > li:has\(> \.skinArticleDirectoryTopic\[open\]\)\s*\{[^}]*grid-column: 1 \/ -1;/);
  assert.match(css, /\.skinArticleDirectoryTopic > summary\s*\{[^}]*padding-inline-end: 2\.75rem;/);
  assert.match(css, /\.skinArticleDirectoryTopic ol\s*\{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 240px\), 1fr\)\);/);
});

test("reading routes group existing questions into translated workflows without duplicating articles", () => {
  const expected = [
    ["mobile", "developer-skinseed-mobile", "developer-video-skinseed-export", "developer-missing-alpha", "developer-preview-check"],
    ["desktop", "developer-gimp-project-export", "developer-gimp-pixel-size", "developer-gimp-add-alpha", "developer-gimp-transparent-export", "developer-skin-format", "developer-preview-check"],
    ["publishing", "developer-authorized-materials", "developer-skin-format", "developer-cover-fields", "developer-save-submit"],
    ["troubleshooting", "developer-review-delay", "developer-review-appeal", "developer-resubmit-cooldown", "developer-listing-interface-failure"],
    ["service", "service-introduction", "service-minor-consent", "service-authorization-proof", "service-fees-reading", "private-skin-publication", "service-review-timing", "service-publisher-handover", "service-cancellation-settlement"],
  ];
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "questions");
    const guides = html.match(/<details class="skinArticleGuides"[^>]*>([^]*?)<\/details>/);
    assert.ok(guides);
    assert.ok(!guides[0].split(">")[0].includes(" open"));
    assert.equal([...html.matchAll(/<article id=/g)].length, developerDocs.developerResources.length + localArticleCases.length);
    for (const [name, ...ids] of expected) {
      const route = guides[1].match(new RegExp(`<div class="skinArticleGuide" id="questions-guide-${name}"[^]*?<ol>([^]*?)</ol>`));
      assert.ok(route, name);
      assert.deepEqual([...route[1].matchAll(/href="#([^"]+)"/g)].map(match => match[1]), ids);
      for (const id of ids) {
        const resource = developerDocs.developerResources.find(resource => resource.id === id);
        const local = localArticleCases.find(([localId]) => localId === id);
        assert.ok(resource || local);
        const title = resource?.title[language] ?? translations.skinText(language, local[2]);
        assert.ok(route[1].includes(renderToStaticMarkup(createElement("span", null, title))));
      }
    }
    assert.ok(guides[1].includes('href="/skin-service/terms"'));
    const filtered = render(language, "questions", ["", "privacy", "official", "video"]);
    assert.ok(filtered.includes('id="questions-guide-publishing"'));
  }
});

test("reading routes are indexed by global search and deep links open without clearing filters", () => {
  for (const [key, id] of [["guideMobileTitle", "mobile"], ["guideDesktopTitle", "desktop"], ["guidePublishingTitle", "publishing"], ["guideTroubleshootingTitle", "troubleshooting"], ["guideServiceTitle", "service"]]) {
    for (const language of translations.skinServiceLanguages) {
      searchClickHarness("questions", translations.skinText(language, key), `/skin-service/questions#questions-guide-${id}`, {}, language);
    }
    const app = searchClickHarness("questions", "", node => node?.props?.id === "questions", { 3: "video" });
    app.browser.location.hash = `#questions-guide-${id}`;
    app.runHashEffect();
    assert.deepEqual(app.updates, []);
  }
});

test("the longer service reading route spans the guide grid with responsive steps", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.ok(/#questions-guide-service\s*\{[^}]*grid-column: 1 \/ -1;/.test(css), "the service route must span all guide columns");
  assert.ok(/#questions-guide-service ol\s*\{[^}]*display: grid;[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 280px\), 1fr\)\);/.test(css), "service steps must fit narrow viewports without fixed columns");
});

test("the expanded reading routes keep comfortable columns without changing the direct-link grid", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.ok(/\.skinArticleGuides \.skinArticleGuideGrid\s*\{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 360px\), 1fr\)\);/.test(css));
  assert.ok(/\.skinArticleQuickLinks \.skinArticleGuideGrid\s*\{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 320px\), 1fr\)\);/.test(css));
});

test("reading-route links restore only a known hidden question on each plain click, including the same hash", () => {
  for (const hidden of [false, true]) {
    const app = searchClickHarness("questions", "", node => node?.props?.className === "skinArticleGuideQuestionLink", { 3: "video", 4: "Skinseed" });
    assert.equal(typeof app.click, "function");
    const target = app.document.getElementById("unused");
    for (const properties of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) app.click({ button: 0, ...properties });
    assert.equal(app.frames.length, 0);
    assert.deepEqual(app.updates, []);
    for (let i = 0; i < 2; i++) {
      app.document.getElementById = () => hidden ? null : target;
      app.click({ button: 0, preventDefault() { assert.fail("preserve native history"); } });
      app.document.getElementById = () => target;
      app.frames.at(-1)();
    }
    assert.deepEqual(app.updates, hidden ? ["all", "all", "all", "", "all", "all", "all", ""] : []);
    assert.deepEqual(app.reveals.map(reveal => reveal.behavior), ["instant", "instant"]);
  }
});

test("active filter chips remove only one condition and focus its remaining control", () => {
  for (const [id, selector] of [["topic", ".skinArticleFilters button"], ["source", ".skinArticleSourceFilters button"], ["format", ".skinArticleFormatFilters button"]]) {
    const app = searchClickHarness("questions", "", node => node?.props?.["data-filter"] === id, { 1: "preparation", 2: "official", 3: "article", 4: "PNG" });
    const find = node => Array.isArray(node) ? node.map(find).find(Boolean) : node?.type === "main" ? node : node?.props ? find(node.props.children) : undefined;
    const main = find(app.tree);
    let focused = false;
    main.props.ref.current = { querySelector(actual) { assert.equal(actual, selector); return { focus() { focused = true; } }; } };
    app.click();
    assert.deepEqual(app.updates, ["all"]);
    assert.equal(focused, true);
  }
  assert.ok(!render("zh-CN", "questions").includes('class="skinArticleActiveFilters"'));
  assert.equal([...render("zh-CN", "questions", ["", "preparation", "official", "article", "PNG"]).matchAll(/data-filter=/g)].length, 3);
});

test("local service Q&As explain practical boundaries without posing as official rules", () => {
  const ids = ["service-introduction", "submission-preparation", "review-status", "returned-materials", "change-submission", "privacy-protection"];
  const expected = {
    "zh-CN": ["不代表网易官方", "原始工程", "审核通过不等于已上架", "退回原因原文", "五分钟", "网易官方"],
    en: ["not a NetEase", "source files", "not the same as listing", "original return message", "five-minute", "official NetEase"],
    ja: ["NetEaseの公式", "元ファイル", "審査通過と公開", "差し戻しの原文", "5分間", "NetEaseの公式"],
  };
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "questions");
    for (const [index, id] of ids.entries()) {
      const card = html.match(new RegExp(`<article id="${id}"[^>]*>([^]*?)</article>`))?.[1];
      assert.ok(card?.includes(expected[language][index]), `${language} ${id}`);
      assert.ok(card.includes(translations.skinText(language, "localServiceArticle")));
      assert.ok(!card.includes('class="skinArticleSource"'));
    }
  }
});

test("same-section search cancels stale reveal frames on repeated clicks and navigation", () => {
  const app = searchClickHarness();
  const cleanup = app.runHashEffect();
  app.click({ button: 0, preventDefault() {} });
  app.click({ button: 0, preventDefault() {} });
  assert.ok(app.cancelledFrames.includes(1), "the replacement reveal must cancel the earlier search frame");
  cleanup();
  assert.ok(app.cancelledFrames.includes(2), "navigation must cancel the pending search frame before it can rewrite the new route hash");
});

test("same-section document search locates the focused target instantly", () => {
  for (const [section, query, href] of [["questions", "PNG", "/skin-service/questions#developer-skin-format"], ["terms", "2.14", "/skin-service/terms#terms-subclause-2-14"]]) {
    const app = searchClickHarness(section, query, href);
    app.click({ button: 0, preventDefault() {} });
    app.frames[0]();
    assert.equal(app.reveals[0].behavior, "instant");
    assert.equal(app.browser.location.hash, href.slice(href.indexOf("#")));
  }
});

test("document hash callbacks cancel on navigation, removal and malformed links", () => {
  const app = searchClickHarness("questions", "", node => node?.props?.id === "developer-skin-format");
  app.browser.location.hash = "#developer-skin-format";
  const cleanup = app.runHashEffect();
  assert.equal(app.frames.length, 1);
  app.browser.location.hash = "";
  app.listeners.get("hashchange")();
  assert.ok(app.cancelledFrames.includes(1));
  cleanup();
  assert.equal(app.listeners.size, 0);
  const invalid = searchClickHarness("questions", "", node => node?.props?.id === "developer-skin-format");
  invalid.browser.location.hash = "#%broken";
  assert.doesNotThrow(() => invalid.runHashEffect()());
  assert.equal(invalid.frames.length, 0);
});

test("handled native fragments never schedule a second reveal that can steal subsequent keyboard focus", () => {
  for (const revealBeforeHash of [false, true]) {
    const app = searchClickHarness("questions", "", node => node?.props?.href === "#questions-contents");
    app.runHashEffect();
    app.click({ button: 0 });
    assert.equal(app.frames.length, 1);
    if (revealBeforeHash) app.frames[0]();
    app.browser.location.hash = "#questions-contents";
    app.listeners.get("hashchange")();
    assert.equal(app.frames.length, 1, "native hash event must not queue another focus restore");
    assert.ok(!app.cancelledFrames.includes(1), "keep the intended reveal pending");
    if (!revealBeforeHash) app.frames[0]();
    assert.equal(app.reveals.length, 1);
    app.browser.location.hash = "#questions-disclaimer";
    app.listeners.get("hashchange")();
    assert.equal(app.frames.length, 2, "unhandled fragments still reveal their targets");
  }
});

test("stale native hash events cannot replace the latest clicked document target", () => {
  const app = searchClickHarness("questions", "", node => node?.props?.href === "#questions-contents");
  app.runHashEffect();
  app.click({ button: 0 });
  app.browser.location.hash = "#questions-contents";
  app.browser.location.href = "https://example.test/questions#questions-contents";
  app.listeners.get("hashchange")({ newURL: "https://example.test/questions#questions-guides" });
  assert.equal(app.frames.length, 1);
  assert.ok(!app.cancelledFrames.includes(1));
  app.listeners.get("hashchange")({ newURL: app.browser.location.href });
  assert.equal(app.frames.length, 1);
  app.frames[0]();
  assert.equal(app.reveals.length, 1);
});

test("resetting an empty archive filter restores focus to the topic controls", () => {
  const app = searchClickHarness("questions", "", node => node?.type === "button" && node.props.children === translations.skinText("zh-CN", "resetArticleFilters"), { 1: "privacy", 2: "official", 3: "video" });
  const find = node => Array.isArray(node) ? node.map(find).find(Boolean) : node?.props?.className === "skinArticleFilters" ? node : node?.props ? find(node.props.children) : undefined;
  const group = find(app.tree);
  assert.ok(group.props.ref, "the topic controls must retain a focus target after reset disappears");
  let focused = false;
  group.props.ref.current = { querySelector: () => ({ focus() { focused = true; } }) };
  app.click();
  assert.deepEqual(app.updates, ["all", "all", "all", ""]);
  assert.equal(focused, true);
});

test("global search retains the moved announcement entry and indexes full agreement clauses", () => {
  searchClickHarness("terms", "更新公告", "/skin-service/updates#updates");
  searchClickHarness("terms", "2.14", "/skin-service/terms#terms-subclause-2-14");
  searchClickHarness("questions", "核验材料", "/skin-service/terms#terms-subclause-2-14");
  searchClickHarness("terms", "14.3", "/skin-service/terms#terms-subclause-14-3");
  searchClickHarness("terms", "第二条", "/skin-service/terms#terms-clause-2");
});

test("global and reader clause-number searches share exact matching without changing other document searches", () => {
  for (const language of translations.skinServiceLanguages) {
    for (const clause of terms.serviceTermsSections.flatMap(section => section.clauses)) {
      for (const query of [clause.number, clause.number.replace(/[0-9.]/g, character => String.fromCharCode(character.charCodeAt(0) + 0xfee0))]) {
        const html = render(language, "questions", [query]);
        const results = html.match(/<div class="skinServiceSearchResults">([^]*?)<\/div>/)?.[1] ?? "";
        assert.deepEqual([...results.matchAll(/href="\/skin-service\/terms#(terms-subclause-[^"]+)"/g)].map(match => match[1]), [clause.id], `${language}: ${query}`);
      }
    }
    const missing = render(language, "questions", ["99.1"]).match(/<div class="skinServiceSearchResults">([^]*?)<\/div>/)?.[1] ?? "";
    assert.ok(!missing.includes('href="/skin-service/terms#terms-subclause-'));
    searchClickHarness("terms", "2.20.8", "/skin-service/updates#update-2-20-8", {}, language);
    searchClickHarness("terms", "2.1 授权", "/skin-service/terms#terms-subclause-2-1", {}, language);
    const blank = render(language, "questions", ["　 \t"]);
    assert.ok(!blank.includes('class="skinServiceSearchResults"'));
  }
});

test("new service Q&As explain publication risks and separate free reading from agreed fees in all languages", () => {
  const expected = {
    "zh-CN": [["公开发布", "高价", "8.2", "侵权", "请勿提交"], ["免费查阅", "4.2", "事前", "自愿", "包过"]],
    en: [["publicly", "high price", "8.2", "infringement", "do not submit"], ["free to read", "4.2", "in advance", "optional", "guaranteed approval"]],
    ja: [["公開", "高額", "8.2", "権利侵害", "提出しない"], ["無料", "4.2", "事前", "任意", "通過保証"]],
  };
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "questions");
    for (const [index, id] of ["private-skin-publication", "service-fees-reading"].entries()) {
      const card = html.match(new RegExp(`<article id="${id}"[^>]*>([^]*?)</article>`))?.[1];
      assert.ok(card, `${language} ${id}`);
      assert.ok(card.includes(translations.skinText(language, "localServiceArticle")));
      assert.ok(!card.includes('class="skinArticleSource"'));
      for (const fragment of expected[language][index]) assert.ok(card.includes(fragment), `${language} ${id}: ${fragment}`);
      const title = translations.skinText(language, index ? "serviceFeesTitle" : "privateSkinTitle");
      searchClickHarness("terms", title, `/skin-service/questions#${id}`, {}, language);
    }
  }
});

test("developer documentation is searchable by question, format, tool and official source title", () => {
  for (const [query, id] of [["PNG", "developer-skin-format"], ["MCStudio", "developer-studio-import"], ["资源定价规则说明", "developer-pricing"], ["同步组件还需要审核", "developer-sync-review"], ["POS机", "developer-cover-fields"], ["社区参考", "developer-skin-pack-china"], ["Skinseed", "developer-skinseed-mobile"]]) {
    searchClickHarness("terms", query, `/skin-service/questions#${id}`);
  }
});

test("service workflow Q&As preserve agreement qualifications and are searchable in all languages", () => {
  const expected = {
    "zh-CN": [
      ["买到文件", "公开许可", "收费", "2.14", "私下"],
      ["19:00", "21:00", "UTC+8", "7–14", "平台接收", "不保证", "紧急"],
      ["6.1", "重复提审", "交接", "依法解除"],
      ["8.1", "8.2", "8.3", "不保证", "未履行", "依法退还", "缓存"],
      ["14.2", "性质", "金额", "法定代理人", "纸质签字", "14.1", "旧委托"],
    ],
    en: [
      ["Buying a file", "public license", "paid", "2.14", "private"],
      ["19:00", "21:00", "UTC+8", "7–14", "platform receives", "not guaranteed", "Urgent"],
      ["6.1", "duplicate", "handover", "lawful termination"],
      ["8.1", "8.2", "8.3", "not guaranteed", "unperformed", "refunded", "cached"],
      ["14.2", "nature", "amount", "legal representative", "paper signature", "14.1", "older commissions"],
    ],
    ja: [
      ["ファイルの購入", "公開ライセンス", "有料", "2.14", "非公開"],
      ["19:00", "21:00", "UTC+8", "7–14", "プラットフォームが受理", "保証", "緊急"],
      ["6.1", "重複", "引継ぎ", "適法な委託解除"],
      ["8.1", "8.2", "8.3", "保証", "未履行", "返金", "キャッシュ"],
      ["14.2", "性質", "金額", "法定代理人", "紙の署名", "14.1", "過去の委託"],
    ],
  };
  for (const language of translations.skinServiceLanguages) {
    const html = render(language, "questions");
    for (const [index, [id, category, key]] of localArticleCases.slice(-5).entries()) {
      const card = html.match(new RegExp(`<article id="${id}"[^>]*>([^]*?)</article>`))?.[1];
      assert.ok(card, `${language} ${id}`);
      assert.ok(card.includes(translations.skinText(language, "localServiceArticle")));
      assert.ok(!card.includes('class="skinArticleSource"'));
      for (const fragment of expected[language][index]) assert.ok(card.includes(fragment), `${language} ${id}: ${fragment}`);
      const title = translations.skinText(language, key);
      searchClickHarness("terms", title, `/skin-service/questions#${id}`, {}, language);
      const filtered = render(language, "questions", ["", category, "service", "article", title]);
      assert.equal([...filtered.matchAll(/<article id=/g)].length, 1);
      assert.ok(filtered.includes(`id="${id}"`));
      assert.ok(filtered.includes(`href="#${id}"`));
    }
  }
});

test("global search indexes media authors and the disclaimer", () => {
  searchClickHarness("terms", "ArtsByKev", "/skin-service/questions#developer-video-hd-skin");
  searchClickHarness("terms", "开源项目", "/skin-service/questions#developer-blockbench-project");
  searchClickHarness("questions", "付费解锁", "/skin-service/questions#questions-disclaimer");
  searchClickHarness("terms", "合法权益", "/skin-service/questions#questions-disclaimer");
});

test("global Q&A search does not silently discard matches after the first twenty", () => {
  const app = searchClickHarness("questions", "皮肤", node => node?.props?.className === "skinServiceSearchResults");
  const links = [];
  const visit = node => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (node?.type === "a") links.push(node.props.href);
    if (node?.props) visit(node.props.children);
  };
  visit(app.tree);
  const expected = developerDocs.developerResources.filter(resource => `${resource.title["zh-CN"]} ${resource.summary["zh-CN"]} ${developerDocs.developerSources[resource.sourceId].title}`.includes("皮肤"));
  assert.ok(expected.length > 20);
  for (const resource of expected) assert.ok(links.includes(`/skin-service/questions#${resource.id}`), resource.id);
});

test("clearing the global search returns keyboard focus to its input", () => {
  const app = searchClickHarness("questions", "Skinseed", node => node?.type === "button" && node.props.children === translations.skinText("zh-CN", "clear"));
  const find = node => Array.isArray(node) ? node.map(find).find(Boolean) : node?.type === "input" && node.props.type === "search" ? node : node?.props ? find(node.props.children) : undefined;
  const input = find(app.tree);
  assert.ok(input.props.ref);
  let focused = false;
  input.props.ref.current = { focus() { focused = true; } };
  app.click();
  assert.deepEqual(app.updates, [""]);
  assert.equal(focused, true);
});

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
  assert.deepEqual(app.updates, ["", "all", "all", "all", ""]);
  assert.equal(app.frames.length, 1);
});

test("plain cross-section search clicks retain router navigation", () => {
  const app = searchClickHarness("questions");
  let prevented = false;
  app.click({ button: 0, preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.deepEqual(app.updates, ["", "all", "all", "all", ""]);
  assert.equal(app.frames.length, 0);
});
