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
  "skin-service/groups/group-2.jpg",
  "skin-service/groups/group-4.jpg",
  "skin-service/groups/group-7.jpg",
  "skin-service/groups/group-9.jpg",
];
const forbiddenFiles = [
  "HanazarIntroAnimation.mp4",
  "hanazar-emblem.svg",
  "aigc/gpt-55-extrahigh.jpg",
  "tools/aiugc-pipeline.jpg",
  "tools/ai-rhythm-game.jpg",
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
    "Mac 工具",
    "网页工具",
    "iOS 工具",
    "其他工具",
  ],
  "games/index.html": [
    "https://hanazar-games.github.io/Guandan-Webgame/",
    "https://hanazar-games.github.io/Liars-Bar-webgame/",
    "GPT-5.6-sol-Ultra-AIGC-webgame",
    "https://hanazar-games.github.io/GPT-5.6-sol-Ultra-AIGC-webgame/",
    "见缝插针",
    "https://hanazar-games.github.io/Core-Ball-Webgame/",
    "围达网 · 围棋",
    "https://hanazar-games.github.io/Go/",
  ],
  "aigc/index.html": [
    "GPT-5.6-sol-Ultra-AIGC-webgame",
    "https://hanazar-games.github.io/GPT-5.6-sol-Ultra-AIGC-webgame/",
    "https://hanazar-games.github.io/Kimi2.6-AIGC-Webgame-Project/",
    "https://hanazar-games.github.io/GPT-AIGC-Webgame-Project",
  ],
  "chat/index.html": [
    "加密临时投递箱",
    "加密并生成链接",
    "有效时间",
    "发送记录",
    ...(chatServiceUrl ? ["AES-256-GCM", "内容会先在浏览器内加密再上传"] : []),
  ],
  "transfer/index.html": [
    "文件传输助手",
    "生成配对码",
    "发送文件",
    "下载 TXT 记录",
  ],
  "skin-service/index.html": [
    "代发皮肤服务中心",
    "服务文档",
    "全局搜索",
    "我们的社群",
    "使用微信扫描二维码加入",
    "代发皮肤常见问题",
    "服务入门",
    "材料准备",
    "审核与处理",
    "隐私安全",
    "匿名反馈墙",
    "审核通知",
    "支持与捐赠",
    "939095145",
    "853878672",
    "953014293",
    "1105843703",
    "https://discord.gg/XtTbKCSKa",
    "本机可修改五分钟",
  ],
  "tools/index.html": [
    "工具总览",
    "Mac 工具",
    "网页工具",
    "iOS 工具",
    "其他工具",
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

const skinServiceHtml = readFileSync(join("out", "skin-service/index.html"), "utf8");
for (const group of ["group-2.jpg", "group-4.jpg", "group-7.jpg", "group-9.jpg"]) {
  const path = `skin-service/groups/${group}`;
  if (!skinServiceHtml.includes(`src="${basePath}/${path}"`)) {
    throw new Error(`Missing base path for ${path}`);
  }
  if (skinServiceHtml.includes(`src="/${path}"`)) {
    throw new Error(`Root-relative skin service image: ${path}`);
  }
}

const forbiddenContent = {
  "index.html": [
    "https://hanazar-games.github.io/Tic-Tac-Toe/",
    "https://chat.hanazargames.com/",
    "https://github.com/Mirako-Official/New-Aiugc-Pipeline",
    "https://github.com/Mirako-Official/AI-Rhythm-Game",
  ],
  "aigc/index.html": ["https://hanazar-games.github.io/GPT-MAX-AIGC-Webgame-Project"],
  "tools/index.html": [
    "https://github.com/Mirako-Official/New-Aiugc-Pipeline",
    "https://github.com/Mirako-Official/AI-Rhythm-Game",
  ],
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
