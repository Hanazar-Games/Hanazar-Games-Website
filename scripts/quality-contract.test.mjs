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
  const { games, homepageGames, toolGroups } = await import("../app/lib/catalog.ts");

  assert.deepEqual(homepageGames, games.slice(0, 3));
  assert.ok(games.some((game) => (
    game.href === "https://hanazar-games.github.io/Go/" && game.image === "/games/go.jpg"
  )));
  assert.equal(homepageGames.some((game) => game.href === "https://hanazar-games.github.io/Go/"), false);

  assert.deepEqual(toolGroups.map((group) => group.tools.length), [2, 4, 1, 2]);
  const tools = toolGroups.flatMap((group) => group.tools);
  for (const expected of [
    { href: "https://github.com/hzagaming/Hept", image: "/tools/hept.jpg" },
    { href: "https://hzagaming.github.io/LIstener", image: "/tools/listener.jpg" },
    { href: "https://hzagaming.github.io/HanazarTransfer/", image: "/tools/hanazar-transfer.jpg" },
  ]) {
    assert.ok(tools.some(({ href, image }) => href === expected.href && image === expected.image));
  }
});

test("four-card tool groups use a balanced desktop grid", async () => {
  const [home, css] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(home, /group\.tools\.length === 4\s*\? " toolsGridBalanced"/);
  assert.match(css, /\.toolsGridBalanced \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
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
