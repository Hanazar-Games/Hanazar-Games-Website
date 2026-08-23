import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

function base64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

test("authenticated malformed share payloads are reported as invalid payloads", async () => {
  const { decryptShare } = await import("../app/lib/ephemeralShareCrypto.ts");
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const malformedManifest = new TextEncoder().encode("not-json");
  const malformedPayload = new Uint8Array(4 + malformedManifest.length);
  new DataView(malformedPayload.buffer).setUint32(0, malformedManifest.length, false);
  malformedPayload.set(malformedManifest, 4);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv,
    additionalData: new TextEncoder().encode("hanazar-share-v1"),
  }, key, malformedPayload));
  const combined = new Uint8Array(iv.length + encrypted.length);
  combined.set(iv);
  combined.set(encrypted, iv.length);

  await assert.rejects(
    decryptShare(base64Url(combined), base64Url(keyBytes)),
    (error) => error instanceof Error && error.message === "invalid_payload",
  );
});

test("decrypted attachment names cannot retain bidirectional spoofing controls", async () => {
  const { decryptShare, encryptShare } = await import("../app/lib/ephemeralShareCrypto.ts");
  const encrypted = await encryptShare("", [new File(["safe"], "photo\u202Egnp.exe", { type: "text/plain" })]);
  const decrypted = await decryptShare(encrypted.ciphertext, encrypted.key);

  assert.equal(decrypted.attachments.length, 1);
  assert.doesNotMatch(decrypted.attachments[0].name, /[\u202A-\u202E\u2066-\u2069]/u);
});

test("share UI keeps effects stable and clears sensitive composer state", async () => {
  const [hook, component] = await Promise.all([
    read("app/hooks/useTranslation.ts"),
    read("app/components/EphemeralShareApp.tsx"),
  ]);

  assert.match(hook, /useCallback/);
  assert.match(hook, /const tr = useCallback/);
  assert.match(component, /useRef<HTMLInputElement/);
  assert.match(component, /fileInputRef\.current\.value = ""/);
  assert.match(component, /setMessage\(""\)/);
  assert.match(component, /addEventListener\("hashchange"/);
  assert.match(component, /if \(controller\.signal\.aborted\) return;/);
  assert.match(component, /setViewed\(null\)/);
  assert.match(component, /const needsClock =/);
  assert.match(component, /if \(!needsClock\) return;/);
  assert.match(component, /aria-pressed=\{expiration === String\(minutes\)\}/);
  assert.doesNotMatch(component, /className="shareCountdown" aria-live=/);
});

test("live regions exclude high-frequency countdown and transfer progress", async () => {
  const [share, transfer] = await Promise.all([
    read("app/components/EphemeralShareApp.tsx"),
    read("app/components/PeerTransferApp.tsx"),
  ]);

  assert.doesNotMatch(share, /className="shareResult" aria-live=/);
  assert.doesNotMatch(transfer, /className="peerTransferList" aria-live=/);
});

test("site audio stays opt-in and below the reduced output ceiling", async () => {
  const [audio, settings] = await Promise.all([
    read("app/components/AudioEngine.tsx"),
    read("app/components/SettingsContext.tsx"),
  ]);

  assert.match(settings, /bgmEnabled: false/);
  assert.match(audio, /Math\.min\(0\.012,/);
  assert.match(audio, /Math\.min\(\s*0\.024,/);
  assert.match(audio, /button:not\(:disabled\)/);
});

test("skin service motion and effects respect accessibility settings", async () => {
  const [audio, css] = await Promise.all([
    read("app/components/AudioEngine.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(audio, /summary:not\(:disabled\)/);
  assert.match(audio, /target\.closest\("summary/);
  assert.match(css, /@keyframes skinAmbientDrift/);
  assert.match(css, /@keyframes skinCardEnter/);
  assert.match(css, /@keyframes skinDetailsOpen/);
  assert.match(css, /body\[data-disable-decorations="true"\] \.skinServiceHero::before/);
  assert.match(css, /body\[data-disable-ui-fade="true"\] \.skinServiceSearch/);
});

test("audio recovery handles nonstandard interrupted contexts", async () => {
  const audio = await read("app/components/AudioEngine.tsx");

  assert.match(audio, /ctx\.state !== "running" && ctx\.state !== "closed"/);
  assert.doesNotMatch(audio, /ctx\.state === "suspended"\) await ctx\.resume/);
});

test("above-the-fold archive images load eagerly without preloading competing candidates", async () => {
  const [games, aigc] = await Promise.all([
    read("app/games/page.tsx"),
    read("app/aigc/page.tsx"),
  ]);

  assert.match(games, /loading=\{index < 3 \? "eager" : "lazy"\}/);
  assert.match(aigc, /loading=\{index < 3 \? "eager" : "lazy"\}/);
});

test("homepage hero uses a right-sized modern image for static hosting", async () => {
  const home = await read("app/page.tsx");

  assert.match(home, /const heroBackdropImage = "\/IntroPic\.webp"/);
  assert.doesNotMatch(home, /IntroPic\.jpg/);
});

test("subpage hero titles balance narrow-screen line breaks", async () => {
  const [css, layout] = await Promise.all([
    read("app/globals.css"),
    read("app/layout.tsx"),
  ]);
  assert.match(css, /\.gamesHeroTitle \{[\s\S]*?text-wrap: balance;/);
  assert.match(layout, /data-scroll-behavior="smooth"/);
});

test("catalog exposes the Go project and the complete tool taxonomy", async () => {
  const { games, homepageGames, homepageToolGroups, toolGroups } = await import("../app/lib/catalog.ts");

  assert.deepEqual(homepageGames, games.slice(0, 3));
  assert.ok(games.some((game) => (
    game.href === "https://hanazar-games.github.io/Go/" && game.image === "/games/go.jpg"
  )));
  assert.equal(homepageGames.some((game) => game.href === "https://hanazar-games.github.io/Go/"), false);

  assert.deepEqual(toolGroups.map((group) => group.tools.length), [2, 3, 1, 1]);
  assert.ok(homepageToolGroups.every((group) => group.tools.length <= 3));
  assert.ok(homepageToolGroups[1].tools.some((tool) => tool.href === "https://hzagaming.github.io/LIstener"));
  assert.equal(toolGroups[3].tools.some((tool) => tool.href === "https://hzagaming.github.io/LIstener"), false);
  const tools = toolGroups.flatMap((group) => group.tools);
  assert.equal(tools.some(({ href }) => href.includes("Mirako-Official")), false);
  for (const expected of [
    { href: "https://github.com/hzagaming/Hept/releases", image: "/tools/hept.jpg" },
    { href: "https://hzagaming.github.io/LIstener", image: "/tools/listener.jpg" },
    { href: "https://hzagaming.github.io/HanazarTransfer/", image: "/tools/hanazar-transfer.jpg" },
  ]) {
    assert.ok(tools.some(({ href, image }) => href === expected.href && image === expected.image));
  }
});

test("homepage tools cap each group at three cards and link to the archive", async () => {
  const [home, css] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(home, /homepageToolGroups\.map/);
  assert.match(home, /href="tools\/"/);
  assert.match(css, /\.toolsGrid \{\s*display: grid;\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
});

test("skin service hub exports six dedicated section routes", async () => {
  const sectionIds = ["communities", "questions", "feedback", "review-notices", "updates", "support"];
  const [center, route, rootPage, verifier, ...sectionPages] = await Promise.all([
    read("app/components/SkinServiceCenter.tsx"),
    read("app/skin-service/SkinServiceRoute.tsx"),
    read("app/skin-service/page.tsx"),
    read("scripts/verify-static-export.mjs"),
    ...sectionIds.map((id) => read(`app/skin-service/${id}/page.tsx`)),
  ]);

  assert.match(rootPage, /<SkinServiceRoute\s*\/>/);
  assert.match(route, /activeSection=\{section\}/);
  assert.match(center, /activeSection\?: SkinServiceSection/);
  assert.match(center, /`\/skin-service\/\$\{section\.id\}`/);
  assert.match(center, /aria-current=\{activeSection === section\.id \? "page" : undefined\}/);
  assert.match(center, /revealTarget\(targetId, "auto"\)/);
  assert.match(center, /id=\{article\.id\} key=\{article\.id\} tabIndex=\{-1\}/);
  sectionPages.forEach((page, index) => {
    assert.match(page, new RegExp(`section=["']${sectionIds[index]}["']`));
    assert.match(verifier, new RegExp(`skin-service/${sectionIds[index]}/index\\.html`));
  });
});

test("main and skin service settings use independent defaults and storage", async () => {
  const [center, copy, settings, launcher, panel, translationHook, layout, i18n] = await Promise.all([
    read("app/components/SkinServiceCenter.tsx"),
    read("app/lib/skinServiceI18n.ts"),
    read("app/components/SettingsContext.tsx"),
    read("app/components/SettingsLauncher.tsx"),
    read("app/components/SettingsPanel.tsx"),
    read("app/hooks/useTranslation.ts"),
    read("app/layout.tsx"),
    read("app/lib/i18n.ts"),
  ]);

  assert.match(settings, /const mainDefaultSettings[\s\S]*?theme: "dark"[\s\S]*?language: "en"/);
  assert.match(settings, /const skinServiceDefaultSettings[\s\S]*?theme: "light"[\s\S]*?language: "zh-CN"/);
  assert.match(settings, /hanazar-settings-v1/);
  assert.match(settings, /hanazar-skin-service-settings-v1/);
  assert.match(settings, /pathname\.startsWith\("\/skin-service"\)/);
  assert.match(layout, /<html lang="en"/);
  assert.match(i18n, /defaultLang = "en"/);
  assert.match(copy, /skinServiceLanguages = \["zh-CN", "ja", "en"\]/);
  assert.match(center, /useSettingsContext/);
  assert.match(center, /skinServiceLanguage\(settings\.language\)/);
  assert.match(center, /skinServiceQuickSettings/);
  assert.match(center, /update\("theme", theme\)/);
  assert.match(center, /update\("language", option\.code\)/);
  assert.doesNotMatch(translationHook, /useSkinServiceLanguage|pathname/);
  assert.match(launcher, /pathname\.startsWith\("\/skin-service"\) \? null/);
  assert.doesNotMatch(panel, /skinServiceLanguages|isSkinService/);
  assert.doesNotMatch(settings, /hanazar\.skin-service-language\.v1/);
});

test("skin service hub contains only section entries and owns the first-visit prompt", async () => {
  const center = await read("app/components/SkinServiceCenter.tsx");

  assert.match(center, /if \(activeSection\) return;[\s\S]*?COMMUNITY_PROMPT_STORAGE_KEY/);
  assert.match(center, /\{activeSection && \(\s*<section className="skinServiceSearch"/);
  assert.match(center, /className=\{`skinServiceIndex \$\{activeSection \? "skinServiceSectionNav" : "skinServiceHubGrid"\}`\}/);
});

test("skin service publishes localized update history", async () => {
  const [center, copy, css, verifier] = await Promise.all([
    read("app/components/SkinServiceCenter.tsx"),
    read("app/lib/skinServiceI18n.ts"),
    read("app/globals.css"),
    read("scripts/verify-static-export.mjs"),
  ]);

  for (const value of [
    "更新公告", "Service Updates", "更新情報",
    "第205批审核与累计组件统计",
    "代发工作暂停3天与公众号恢复通知",
    "微信群暂停开放与公众号赞赏说明", "独立快捷设置与第 203 批结果",
  ]) {
    assert.match(copy, new RegExp(value));
  }
  assert.match(center, /serviceUpdateDefinitions/);
  assert.match(center, /activeSection === "updates"/);
  assert.match(center, /skinServiceUpdateList/);
  assert.match(css, /\.skinServiceQuickSettings/);
  assert.match(css, /\.skinServiceUpdateList/);
  assert.match(verifier, /skin-service\/updates\/index\.html/);
});

test("skin service pauses WeChat groups and publishes the official-account appreciation path", async () => {
  const [center, copy, css, verifier] = await Promise.all([
    read("app/components/SkinServiceCenter.tsx"),
    read("app/lib/skinServiceI18n.ts"),
    read("app/globals.css"),
    read("scripts/verify-static-export.mjs"),
  ]);

  for (const value of [
    "微信交流群暂不开放",
    "前往公众号“千川bit”",
    "点击“赞赏作者”",
    "非常感谢大家的赞赏与支持",
  ]) {
    assert.match(copy, new RegExp(value));
    assert.match(verifier, new RegExp(value));
  }
  assert.match(center, /skinCommunityUnavailable/);
  assert.match(center, /communities\.filter\(\(community\) => community\.platform !== "wechat"\)/);
  assert.doesNotMatch(center, /wechatCommunities\.map\(renderCommunityCard\)/);
  assert.match(center, /href="\/skin-service\/review-notices#official-account-notice"/);
  assert.match(css, /\.skinCommunityUnavailable/);
  assert.match(css, /\.skinServiceSupportLink/);
});

test("skin service publishes the three-day work pause and restored official-account status", async () => {
  const [center, copy, css, verifier] = await Promise.all([
    read("app/components/SkinServiceCenter.tsx"),
    read("app/lib/skinServiceI18n.ts"),
    read("app/globals.css"),
    read("scripts/verify-static-export.mjs"),
  ]);

  for (const value of [
    "代发皮肤工作暂停3天",
    "自本公告发布起暂停 3 天",
    "微信账号受限",
    "公众号“千川bit”现已恢复正常使用",
    "恢复安排以最新公告为准",
  ]) {
    assert.match(copy, new RegExp(value));
    assert.match(verifier, new RegExp(value));
  }
  assert.match(center, /skinServiceStatusNotice/);
  assert.match(center, /id="service-pause-notice"/);
  assert.match(center, /href: "\/skin-service\/review-notices#service-pause-notice"/);
  assert.match(css, /\.skinServiceStatusNotice/);
});

test("skin service uses localized copy, collapsible communities, and one accent tone", async () => {
  const [center, copy, css] = await Promise.all([
    read("app/components/SkinServiceCenter.tsx"),
    read("app/lib/skinServiceI18n.ts"),
    read("app/globals.css"),
  ]);

  for (const value of [
    "我们的社群", "Our Communities", "コミュニティ",
    "QQ 交流群", "QQ communities", "QQ 交流グループ",
    "外区 Discord", "International Discord", "海外向け Discord",
  ]) {
    assert.match(copy, new RegExp(value));
  }
  assert.match(center, /function SectionIcon/);
  assert.match(center, /skinServiceSectionIcon/);
  assert.match(center, /<details/);
  assert.match(center, /<summary/);
  assert.doesNotMatch(center, /<summary>[^\n]*<h[1-6]/);
  assert.doesNotMatch(center, /data-tone=/);
  assert.doesNotMatch(center, /<span>0[1-5]<\/span>/);
  assert.match(css, /\.skinServiceSectionIcon/);
  assert.match(css, /\.skinServiceShell \{[\s\S]*?--skin-tone:/);
  assert.match(css, /\.skinServiceShell \.gamesHeroTitle,[\s\S]*?animation: none;/);
  assert.match(css, /\.skinServiceSectionNav \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.doesNotMatch(css, /\.skinServiceShell \[data-tone="cyan"\]/);
});

test("community prompt prevents stacked dialogs and hides background content", async () => {
  const [center, launcher] = await Promise.all([
    read("app/components/SkinServiceCenter.tsx"),
    read("app/components/SettingsLauncher.tsx"),
  ]);

  assert.match(center, /pageMainRef/);
  assert.match(center, /setAttribute\("inert", ""\)/);
  assert.match(center, /setAttribute\("aria-hidden", "true"\)/);
  assert.match(center, /window\.innerWidth - document\.documentElement\.clientWidth/);
  assert.match(center, /body\.style\.paddingRight = previousPaddingRight/);
  assert.match(launcher, /\[role=['"]dialog['"]\]\[aria-modal=['"]true['"]\]/);
});

test("skin service publishes group QR artwork and a first-visit community prompt", async () => {
  const [center, copy, css, verifier] = await Promise.all([
    read("app/components/SkinServiceCenter.tsx"),
    read("app/lib/skinServiceI18n.ts"),
    read("app/globals.css"),
    read("scripts/verify-static-export.mjs"),
  ]);

  for (const path of ["group-2.jpg", "group-4.jpg", "group-7.jpg", "group-9.jpg"]) {
    assert.match(center, new RegExp(path));
    assert.match(verifier, new RegExp(`skin-service/groups/${path}`));
  }
  assert.match(center, /COMMUNITY_PROMPT_STORAGE_KEY/);
  assert.match(center, /localStorage\.getItem\(COMMUNITY_PROMPT_STORAGE_KEY\)/);
  assert.match(center, /role="dialog"/);
  assert.match(center, /router\.push\("\/skin-service\/communities"\)/);
  assert.match(center, /assetPath\(community\.image\)/);
  assert.match(center, /setEnlargedCommunityId\(community\.id\)/);
  assert.match(center, /communityImageCloseRef/);
  assert.match(center, /data-skin-image-open/);
  assert.match(center, /aria-labelledby="skin-community-image-title"/);
  assert.match(center, /community-bulletin/);
  assert.match(center, /currentServiceVersion = serviceUpdateDefinitions\[0\]\.version/);
  assert.match(center, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  for (const value of ["一起加入社群玩 MC", "Join the community for MC", "コミュニティで MC を遊ぼう"]) {
    assert.match(copy, new RegExp(value));
  }
  assert.match(css, /\.skinCommunityPromptOverlay/);
  assert.match(css, /\.skinCommunityQrImage/);
  assert.match(css, /\.skinCommunityLightboxOverlay/);
  assert.match(css, /\.skinCommunityBulletin/);
  assert.match(css, /body\[data-skin-image-open="true"\] \.settingsFloatingButton/);
});

test("skin service exposes searchable communities and a protected public feedback wall", async () => {
  const [route, center, copy] = await Promise.all([
    read("app/skin-service/SkinServiceRoute.tsx"),
    read("app/components/SkinServiceCenter.tsx"),
    read("app/lib/skinServiceI18n.ts"),
  ]);

  assert.match(route, /NEXT_PUBLIC_CHAT_SERVICE_URL/);
  for (const value of ["939095145", "853878672", "953014293", "1105843703", "https://discord.gg/XtTbKCSKa"]) {
    assert.match(center, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const title of ["我们的社群", "代发皮肤常见问题", "匿名反馈墙", "审核通知", "支持与捐赠"]) {
    assert.match(copy, new RegExp(title));
  }
  assert.match(center, /type="search"/);
  assert.match(center, /api\/feedbacks/);
  assert.match(center, /method:\s*editingId\s*\?\s*"PATCH"\s*:\s*"POST"/);
  assert.match(center, /5\s*\*\s*60\s*\*\s*1000/);
  assert.match(center, /localStorage/);
  assert.match(center, /name="website"/);
  assert.match(center, /skinFeedbackReplyNotice/);
  assert.match(center, /href="\/skin-service\/review-notices#official-account-notice"/);
  for (const value of ["微信内反馈，都会回复", "匿名反馈墙不会收集联系方式", "查看公众号二维码"]) {
    assert.match(copy, new RegExp(value));
  }
  assert.doesNotMatch(center, /dangerouslySetInnerHTML|innerHTML/);
});

test("skin feedback recovery validates drafts and cancels superseded wall requests", async () => {
  const center = await read("app/components/SkinServiceCenter.tsx");

  assert.match(center, /Array\.from\(content\)\.length < 4/);
  assert.match(center, /useRef<AbortController \| null>/);
  assert.match(center, /wallRequestRef\.current\?\.abort\(\)/);
  assert.match(center, /wallRequestRef\.current !== controller/);
  assert.match(center, /createdAt > MAX_UNIX_SECONDS/);
  assert.match(center, /publishAt > MAX_UNIX_SECONDS/);
});

test("skin documentation is categorized and the public wall supports cursor pagination", async () => {
  const [center, copy, feedback, api, config, identity, limiter] = await Promise.all([
    read("app/components/SkinServiceCenter.tsx"),
    read("app/lib/skinServiceI18n.ts"),
    read("chat/app/FeedbackService.php"),
    read("chat/public/api/index.php"),
    read("chat/app/Config.php"),
    read("chat/app/ClientIdentity.php"),
    read("chat/app/RateLimiter.php"),
  ]);

  for (const category of ["服务入门", "材料准备", "审核与处理", "隐私安全"]) {
    assert.match(copy, new RegExp(category));
  }
  assert.match(center, /activeArticleCategory/);
  assert.match(copy, /加载更多反馈/);
  assert.match(center, /next_cursor/);
  assert.match(feedback, /beforeId/);
  assert.match(api, /before_id/);
  assert.match(config, /trustedProxy/);
  assert.match(identity, /prefix < 1|prefix > strlen\(\$packedIp\) \* 8/);
  assert.match(limiter, /Rate limit state is invalid/);
});

test("review tracker exposes batches 204 and 205 with cumulative component totals", async () => {
  const { reviewBatches } = await import("../app/lib/reviewBatches.ts");
  const completed = reviewBatches.filter((batch) => batch.status === "completed");
  const reviewing = reviewBatches.filter((batch) => batch.status === "reviewing");
  const historical = completed.filter((batch) => batch.number <= 201);

  assert.equal(reviewBatches.length, 205);
  assert.deepEqual(reviewBatches.map((batch) => batch.number), Array.from({ length: 205 }, (_, index) => 205 - index));
  assert.equal(completed.length, 203);
  assert.equal(historical.reduce((total, batch) => total + (batch.componentCount ?? 0), 0), 10_000);
  assert.equal(completed.reduce((total, batch) => total + (batch.componentCount ?? 0), 0), 10_168);
  assert.equal(completed.find((batch) => batch.number === 121)?.componentCount, 0);
  assert.equal(completed.find((batch) => batch.number === 201)?.componentCount, 0);
  assert.equal(completed.find((batch) => batch.number === 202)?.componentCount, 71);
  assert.equal(completed.find((batch) => batch.number === 203)?.componentCount, 97);
  assert.ok(historical.every((batch) => [121, 201].includes(batch.number)
    || (batch.componentCount !== null && batch.componentCount >= 10 && batch.componentCount <= 82)));
  assert.deepEqual(reviewing.map((batch) => batch.number), [205, 204]);
  assert.equal(reviewBatches.find((batch) => batch.number === 1)?.cumulativeComponentCount, reviewBatches.find((batch) => batch.number === 1)?.componentCount);
  assert.equal(reviewBatches.find((batch) => batch.number === 201)?.cumulativeComponentCount, 10_000);
  assert.equal(reviewBatches.find((batch) => batch.number === 202)?.cumulativeComponentCount, 10_071);
  assert.equal(reviewBatches.find((batch) => batch.number === 203)?.cumulativeComponentCount, 10_168);
  assert.equal(reviewBatches.find((batch) => batch.number === 204)?.cumulativeComponentCount, 10_168);
  assert.equal(reviewBatches.find((batch) => batch.number === 205)?.cumulativeComponentCount, 10_168);
  const ascending = [...reviewBatches].reverse();
  assert.ok(ascending.every((batch, index) => index === 0
    || batch.cumulativeComponentCount >= ascending[index - 1].cumulativeComponentCount));
});

test("review notices publish the Qianchuan Bit account and collapsible batch archive", async () => {
  const [center, copy, css, verifier] = await Promise.all([
    read("app/components/SkinServiceCenter.tsx"),
    read("app/lib/skinServiceI18n.ts"),
    read("app/globals.css"),
    read("scripts/verify-static-export.mjs"),
  ]);

  assert.match(center, /reviewBatches\.map/);
  assert.match(center, /skinReviewArchive/);
  assert.match(center, /skinReviewBatch/);
  assert.match(center, /reviewCumulativeColumn/);
  assert.match(center, /batch\.cumulativeComponentCount/);
  assert.match(center, /review-account-qr\.svg/);
  assert.match(copy, /千川bit/);
  assert.match(css, /\.skinReviewBatch/);
  assert.match(css, /\.skinReviewCumulative/);
  assert.match(verifier, /skin-service\/review-account-qr\.svg/);
});

test("invalid share expiry has visible, associated feedback", async () => {
  const [share, css] = await Promise.all([
    read("app/components/EphemeralShareApp.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(share, /aria-describedby=\{!expirationValid \? "share-expiration-error" : undefined\}/);
  assert.match(share, /id="share-expiration-error"/);
  assert.match(css, /\.shareFieldError \{/);
  assert.match(css, /\[aria-invalid="true"\]/);
});

test("privacy copy distinguishes local state from encrypted uploads", async () => {
  const i18n = await read("app/lib/i18n.ts");

  assert.doesNotMatch(i18n, /All information on this site is stored locally\./);
  assert.match(i18n, /Temporary Share uploads only browser-encrypted ciphertext/);
});

test("Pages verification rejects malformed configured Chat service URLs", async () => {
  const verifier = await read("scripts/verify-static-export.mjs");

  assert.match(verifier, /url\.username \|\| url\.password \|\| url\.search \|\| url\.hash/);
  assert.match(verifier, /if \(configuredChatService && !chatServiceUrl\)/);
});

test("tablet card grids and responsive image hints stay aligned", async () => {
  const [css, games, aigc] = await Promise.all([
    read("app/globals.css"),
    read("app/games/page.tsx"),
    read("app/aigc/page.tsx"),
  ]);

  const baseGrid = css.indexOf(".gamesGrid {\n  display: grid");
  const tabletGrid = css.lastIndexOf("@media (min-width: 801px) and (max-width: 980px)");
  assert.ok(tabletGrid > baseGrid, "tablet grid override must follow the base grid");
  assert.match(css.slice(tabletGrid), /\.gamesGrid \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(games, /sizes="\(max-width: 800px\) 100vw, \(max-width: 980px\) 50vw, 33vw"/);
  assert.match(aigc, /sizes="\(max-width: 800px\) 100vw, \(max-width: 980px\) 50vw, 33vw"/);
});

test("disconnecting a peer fails pending transfers and releases incoming chunks", async () => {
  const transfer = await read("app/components/PeerTransferApp.tsx");

  assert.match(transfer, /const failActiveTransfers = useCallback/);
  assert.match(transfer, /status === "sending" \|\| item\.status === "receiving"/);
  assert.match(transfer, /incomingFileRef\.current\.chunks = \[\]/);
  assert.match(transfer, /channel\.onerror = \(\) => \{[\s\S]*?failActiveTransfers\(\)/);
  assert.match(transfer, /channel\.onclose = \(\) => \{[\s\S]*?failActiveTransfers\(\)/);
});

test("local share logs reject invalid dates and impossible lifetimes", async () => {
  const share = await read("app/components/EphemeralShareApp.tsx");

  assert.match(share, /const MAX_DATE_MS = 8\.64e15/);
  assert.match(share, /!Number\.isSafeInteger\(createdAt\)/);
  assert.match(share, /expiresAt <= createdAt/);
  assert.match(share, /expiresAt - createdAt > MAX_SHARE_LIFETIME_MS/);
});

test("share API timestamps stay within the Date range and maximum lifetime", async () => {
  const share = await read("app/components/EphemeralShareApp.tsx");

  assert.match(share, /const MAX_UNIX_SECONDS = Math\.floor\(MAX_DATE_MS \/ 1000\)/);
  assert.match(share, /function unixSecondsToMilliseconds\(value: unknown\)/);
  assert.match(share, /value > MAX_UNIX_SECONDS/);
  assert.match(share, /const expiresAt = unixSecondsToMilliseconds\(data\.expires_at\)/);
  assert.match(share, /const createdAt = unixSecondsToMilliseconds\(data\.created_at\)/);
  assert.match(share, /expiresAt - createdAt > MAX_SHARE_LIFETIME_MS/);
});

test("share viewer bounds remote expiry and releases its clock at expiry", async () => {
  const share = await read("app/components/EphemeralShareApp.tsx");

  assert.match(share, /const MAX_CLOCK_SKEW_MS = 5 \* 60 \* 1000/);
  assert.match(share, /expiresAt - requestedAt > MAX_SHARE_LIFETIME_MS \+ MAX_CLOCK_SKEW_MS/);
  assert.match(share, /setViewExpiresAt\(null\);\s*setViewerState\("expired"\)/);
});

test("attachment validation follows the current selected file set", async () => {
  const share = await read("app/components/EphemeralShareApp.tsx");

  assert.match(share, /function fileValidationNotice\(selected: File\[\]\)/);
  assert.match(share, /const next = files\.filter/);
  assert.match(share, /setNotice\(fileValidationNotice\(next\)\)/);
});
