import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/").pop();
if (!repositoryName) throw new Error("GITHUB_REPOSITORY is required");

function httpsUrl(value) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    return new URL(url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`, url.origin).href;
  } catch {
    return null;
  }
}

const basePath = `/${repositoryName}`;
const configuredChatService = process.env.NEXT_PUBLIC_CHAT_SERVICE_URL?.trim();
const chatServiceUrl = httpsUrl(configuredChatService);
if (configuredChatService && !chatServiceUrl) {
  throw new Error("NEXT_PUBLIC_CHAT_SERVICE_URL must be an absolute HTTPS URL without credentials, query, or fragment");
}
const requiredFiles = [
  "index.html",
  "404.html",
  "games/index.html",
  "aigc/index.html",
  "chat/index.html",
  "transfer/index.html",
  "skin-service/index.html",
  "tools/index.html",
  "games/guandan.jpg",
  "games/liars-bar.jpg",
  "games/coreball.jpg",
  "games/go.jpg",
  "products/lc300a.jpg",
  "tools/hept.jpg",
  "tools/listener.jpg",
  "tools/hanazar-transfer.jpg",
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
    "href=\"skin-service/\"",
    "href=\"tools/\"",
    "代发皮肤服务中心",
    "href=\"chat/\"",
    "href=\"transfer/\"",
    "href=\"#aigc\"",
    "https://hanazar-games.github.io/Guandan-Webgame/",
    "https://hanazar-games.github.io/Liars-Bar-webgame/",
    "https://hanazar-games.github.io/GPT-5.6-sol-Ultra-AIGC-webgame/",
    "https://hanazar-games.github.io/Kimi2.6-AIGC-Webgame-Project/",
    "https://hanazar-games.github.io/GPT-AIGC-Webgame-Project",
    "https://github.com/hzagaming/LC300A",
    "https://github.com/hzagaming/Hept/releases",
    "https://hzagaming.github.io/LIstener",
    "Mac Tools",
    "Web Tools",
    "iOS Tools",
    "Other Tools",
  ],
  "games/index.html": [
    "https://hanazar-games.github.io/Guandan-Webgame/",
    "https://hanazar-games.github.io/Liars-Bar-webgame/",
    "GPT-5.6-sol-Ultra-AIGC-webgame",
    "https://hanazar-games.github.io/GPT-5.6-sol-Ultra-AIGC-webgame/",
    "Coreball",
    "https://hanazar-games.github.io/Core-Ball-Webgame/",
    "Weida Go",
    "https://hanazar-games.github.io/Go/",
  ],
  "aigc/index.html": [
    "GPT-5.6-sol-Ultra-AIGC-webgame",
    "https://hanazar-games.github.io/GPT-5.6-sol-Ultra-AIGC-webgame/",
    "https://hanazar-games.github.io/Kimi2.6-AIGC-Webgame-Project/",
    "https://hanazar-games.github.io/GPT-AIGC-Webgame-Project",
  ],
  "chat/index.html": [
    "Encrypted Expiring Share",
    "Encrypt and create link",
    "Expiration",
    "Send log",
    ...(chatServiceUrl ? ["AES-256-GCM", "Your browser encrypts before upload"] : []),
  ],
  "transfer/index.html": [
    "File Transfer Assistant",
    "Create pairing code",
    "Send file",
    "Download transcript",
  ],
  "skin-service/index.html": [
    "代发皮肤服务中心",
    "服务文档",
    "服务概览",
    "代发流程",
    "问答区域",
    "代发常见问题",
    "资料提交",
    "售后与反馈",
  ],
  "tools/index.html": [
    "Tools Archive",
    "Mac Tools",
    "Web Tools",
    "iOS Tools",
    "Other Tools",
    "https://hzagaming.github.io/LIstener",
    "https://github.com/hzagaming/Hept/releases",
    "https://hzagaming.github.io/HanazarTransfer/",
    "https://github.com/hzagaming/LC300A",
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
