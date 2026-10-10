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

const require = createRequire(import.meta.url);

function assertSourceUrl(source) {
  const url = new URL(source.href);
  assert.ok(["https://mc.163.com", "https://mcwiki.easecation.net", "https://github.com", "https://blockbench.net", "https://web.blockbench.net", "https://www.youtube.com", "https://www.bilibili.com"].includes(url.origin));
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
    "../lib/reviewBatches": batches,
    "../lib/skinServiceTerms": terms,
    "../lib/skinDeveloperResources": developerDocs,
    "./SkinTermsReader": { default: () => null },
    "../lib/skinServiceI18n": translations,
  };
  runInNewContext(source, { exports, require: name => mocks[name] ?? require(name) });
  return renderToStaticMarkup(createElement(exports.default, { activeSection, serviceUrl: null }));
}

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
    assert.ok(html.indexOf('id="update-2-20-8"') < html.indexOf('id="update-2-20-7"'));
    assert.ok(html.includes(translations.skinText(language, "update2208Title").replaceAll("&", "&amp;")));
    assert.ok(html.includes(translations.skinText(language, "update2207Title").replaceAll("&", "&amp;")));
    assert.ok(html.includes(translations.skinText(language, "update2206Title")));
    assert.ok(html.includes(translations.skinText(language, "update2205Title")));
    assert.equal([...html.matchAll(/id="update-2-20-8"/g)].length, 1);
    const [current, history] = html.split('<details class="skinServiceUpdateHistory"');
    assert.ok(current.includes('id="update-2-20-8"'));
    assert.ok(!current.includes('id="update-2-20-7"'));
    assert.ok(history?.includes('id="update-2-20-7"'));
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
  assert.equal(developerDocs.developerResources.length, 83);
  assert.equal(Object.keys(developerDocs.developerSources).length, 53);
  assert.equal(developerDocs.developerResourcesCompiledAt, "2026-10-11");
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

test("format filters compose with topic and source filters while keeping the disclaimer visible", () => {
  for (const format of ["all", "article", "video", "tool", "repository", "news"]) {
    const count = developerDocs.developerResources.filter(resource => format === "all" || developerDocs.developerSources[resource.sourceId].format === format).length + (format === "all" || format === "article" ? 6 : 0);
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
    for (const [id, title] of [["service-introduction", "article1Title"], ["submission-preparation", "article2Title"], ["review-status", "article3Title"], ["returned-materials", "article4Title"], ["change-submission", "article5Title"], ["privacy-protection", "article6Title"]]) {
      assert.ok(html.includes(`href="#${id}"`), id);
      const filtered = render(language, "questions", ["", "all", "all", "all", translations.skinText(language, title)]);
      assert.ok(filtered.includes(`id="${id}"`), `${language} ${id}`);
      searchClickHarness("questions", translations.skinText(language, title), `/skin-service/questions#${id}`, {}, language);
    }
  }
});

test("all 972 language, topic, source and format combinations retain the correct Q&A count", () => {
  const entries = [
    ...developerDocs.developerResources.map(resource => ({ category: resource.category, source: developerDocs.developerSources[resource.sourceId].kind, format: developerDocs.developerSources[resource.sourceId].format })),
    ...["introduction", "preparation", "review", "review", "review", "privacy"].map(category => ({ category, source: "service", format: "article" })),
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
        }
      }
    }
  }
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
    "../lib/reviewBatches": batches,
    "../lib/skinServiceTerms": terms,
    "../lib/skinDeveloperResources": developerDocs,
    "./SkinTermsReader": { default: () => null },
    "../lib/skinServiceI18n": translations,
  };
  runInNewContext(source, {
    exports,
    require: name => mocks[name] ?? require(name),
    window: browser,
    document: { getElementById: () => new HTMLElement() },
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
  return { click: link.props.onClick, updates, frames, tree, cancelledFrames, browser, listeners, reveals, runHashEffect: () => hashEffects[0]() };
}

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

test("developer documentation is searchable by question, format, tool and official source title", () => {
  for (const [query, id] of [["PNG", "developer-skin-format"], ["MCStudio", "developer-studio-import"], ["资源定价规则说明", "developer-pricing"], ["同步组件还需要审核", "developer-sync-review"], ["POS机", "developer-cover-fields"], ["社区参考", "developer-skin-pack-china"], ["Skinseed", "developer-skinseed-mobile"]]) {
    searchClickHarness("terms", query, `/skin-service/questions#${id}`);
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
