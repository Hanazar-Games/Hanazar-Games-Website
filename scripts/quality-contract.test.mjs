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

test("above-the-fold archive images load eagerly without preloading competing candidates", async () => {
  const [games, aigc] = await Promise.all([
    read("app/games/page.tsx"),
    read("app/aigc/page.tsx"),
  ]);

  assert.match(games, /loading=\{index < 3 \? "eager" : "lazy"\}/);
  assert.match(aigc, /loading=\{index < 2 \? "eager" : "lazy"\}/);
});

test("subpage hero titles balance narrow-screen line breaks", async () => {
  const css = await read("app/globals.css");
  assert.match(css, /\.gamesHeroTitle \{[\s\S]*?text-wrap: balance;/);
});

test("catalog exposes the Go project and the complete tool taxonomy", async () => {
  const { games, homepageGames, homepageToolGroups, toolGroups } = await import("../app/lib/catalog.ts");

  assert.deepEqual(homepageGames, games.slice(0, 3));
  assert.ok(games.some((game) => (
    game.href === "https://hanazar-games.github.io/Go/" && game.image === "/games/go.jpg"
  )));
  assert.equal(homepageGames.some((game) => game.href === "https://hanazar-games.github.io/Go/"), false);

  assert.deepEqual(toolGroups.map((group) => group.tools.length), [2, 5, 1, 1]);
  assert.ok(homepageToolGroups.every((group) => group.tools.length <= 3));
  assert.ok(homepageToolGroups[1].tools.some((tool) => tool.href === "https://hzagaming.github.io/LIstener"));
  assert.equal(toolGroups[3].tools.some((tool) => tool.href === "https://hzagaming.github.io/LIstener"), false);
  const tools = toolGroups.flatMap((group) => group.tools);
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

test("skin service stays Chinese-only with a route-scoped light theme", async () => {
  const [page, center, css] = await Promise.all([
    read("app/skin-service/page.tsx"),
    read("app/components/SkinServiceCenter.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(center, /lang="zh-CN"/);
  assert.match(center, /我们的社群/);
  assert.match(center, /代发皮肤常见问题/);
  assert.doesNotMatch(page + center, /Service Documentation|Back to home|Publishing Process|Frequently Asked Questions/);
  assert.match(css, /body:has\(\.skinServiceShell\) \{[\s\S]*?color-scheme: light;/);
});

test("skin service exposes searchable communities and a protected public feedback wall", async () => {
  const [page, center] = await Promise.all([
    read("app/skin-service/page.tsx"),
    read("app/components/SkinServiceCenter.tsx"),
  ]);

  assert.match(page, /NEXT_PUBLIC_CHAT_SERVICE_URL/);
  for (const value of ["939095145", "853878672", "953014293", "1105843703", "https://discord.gg/XtTbKCSKa"]) {
    assert.match(center, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const title of ["我们的社群", "代发皮肤常见问题", "匿名反馈墙", "审核通知", "支持与捐赠"]) {
    assert.match(center, new RegExp(title));
  }
  assert.match(center, /type="search"/);
  assert.match(center, /api\/feedbacks/);
  assert.match(center, /method:\s*editingId\s*\?\s*"PATCH"\s*:\s*"POST"/);
  assert.match(center, /5\s*\*\s*60\s*\*\s*1000/);
  assert.match(center, /localStorage/);
  assert.match(center, /name="website"/);
  assert.doesNotMatch(center, /dangerouslySetInnerHTML|innerHTML/);
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
