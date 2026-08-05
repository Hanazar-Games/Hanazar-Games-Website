import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/").pop();
if (!repositoryName) throw new Error("GITHUB_REPOSITORY is required");

function httpsUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

const basePath = `/${repositoryName}`;
const chatServiceUrl = httpsUrl(process.env.NEXT_PUBLIC_CHAT_SERVICE_URL);
const requiredFiles = [
  "index.html",
  "404.html",
  "games/index.html",
  "aigc/index.html",
  "chat/index.html",
  "games/guandan.jpg",
  "games/liars-bar.jpg",
  "games/coreball.jpg",
  "products/lc300a.jpg",
  "aigc/gpt-56-sol-ultra.jpg",
];
const forbiddenFiles = [
  "HanazarIntroAnimation.mp4",
  "hanazar-emblem.svg",
  "aigc/gpt-55-extrahigh.jpg",
];

for (const file of requiredFiles) {
  if (!existsSync(join("out", file))) throw new Error(`Missing static export: ${file}`);
}

for (const file of forbiddenFiles) {
  if (existsSync(join("out", file))) throw new Error(`Obsolete static asset exported: ${file}`);
}

for (const file of requiredFiles.filter((file) => file.endsWith(".html"))) {
  const html = readFileSync(join("out", file), "utf8");
  if (!html.includes(`${basePath}/_next/`)) throw new Error(`Missing base path in ${file}`);
  if (html.includes('src="/_next/') || html.includes('href="/_next/')) {
    throw new Error(`Root-relative Next.js asset in ${file}`);
  }
}

const requiredContent = {
  "index.html": [
    "href=\"chat/\"",
    "href=\"#aigc\"",
    "https://hanazar-games.github.io/Guandan-Webgame/",
    "https://hanazar-games.github.io/Liars-Bar-webgame/",
    "https://hanazar-games.github.io/GPT-5.6-sol-Ultra-AIGC-webgame/",
    "https://hanazar-games.github.io/Kimi2.6-AIGC-Webgame-Project/",
    "https://hanazar-games.github.io/GPT-AIGC-Webgame-Project",
    "https://github.com/hzagaming/LC300A",
    "Mac Tools",
    "Web Tools",
    "Other Tools",
  ],
  "games/index.html": [
    "https://hanazar-games.github.io/Guandan-Webgame/",
    "https://hanazar-games.github.io/Liars-Bar-webgame/",
    "GPT-5.6-sol-Ultra-AIGC-webgame",
    "https://hanazar-games.github.io/GPT-5.6-sol-Ultra-AIGC-webgame/",
    "Coreball",
    "https://hanazar-games.github.io/Core-Ball-Webgame/",
  ],
  "aigc/index.html": [
    "GPT-5.6-sol-Ultra-AIGC-webgame",
    "https://hanazar-games.github.io/GPT-5.6-sol-Ultra-AIGC-webgame/",
    "https://hanazar-games.github.io/Kimi2.6-AIGC-Webgame-Project/",
    "https://hanazar-games.github.io/GPT-AIGC-Webgame-Project",
  ],
  "chat/index.html": [
    "Hanazar Chat",
    chatServiceUrl ? "Service available" : "Deployment pending",
    "https://github.com/Hanazar-Games/Hanazar-Games-Website/tree/main/chat",
    ...(chatServiceUrl ? ["Open Chat", `href="${chatServiceUrl}"`] : []),
  ],
};

for (const [file, values] of Object.entries(requiredContent)) {
  const html = readFileSync(join("out", file), "utf8");
  for (const value of values) {
    if (!html.includes(value)) throw new Error(`Missing ${value} in ${file}`);
  }
}

const forbiddenContent = {
  "index.html": [
    "https://hanazar-games.github.io/Tic-Tac-Toe/",
    "https://chat.hanazargames.com/",
  ],
  "aigc/index.html": ["https://hanazar-games.github.io/GPT-MAX-AIGC-Webgame-Project"],
};

for (const [file, values] of Object.entries(forbiddenContent)) {
  const html = readFileSync(join("out", file), "utf8");
  for (const value of values) {
    if (html.includes(value)) throw new Error(`Unexpected ${value} in ${file}`);
  }
}

const packageVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
const announcements = readFileSync("app/components/settings/AnnouncementTab.tsx", "utf8");
const announcementVersion = announcements.match(/version: "([^"]+)"/)?.[1];
if (announcementVersion !== packageVersion) {
  throw new Error(`Latest announcement ${announcementVersion ?? "missing"} does not match package ${packageVersion}`);
}

function directorySize(path) {
  return readdirSync(path, { withFileTypes: true }).reduce((total, entry) => {
    const entryPath = join(path, entry.name);
    return total + (entry.isDirectory() ? directorySize(entryPath) : statSync(entryPath).size);
  }, 0);
}

const exportSize = directorySize("out");
const maximumExportSize = 12 * 1024 * 1024;
if (exportSize > maximumExportSize) {
  throw new Error(`Static export exceeds 12 MiB: ${(exportSize / 1024 / 1024).toFixed(2)} MiB`);
}

console.log(`Static export verified for ${basePath} (${(exportSize / 1024 / 1024).toFixed(2)} MiB)`);
