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
const packageVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
const configuredChatService = process.env.NEXT_PUBLIC_CHAT_SERVICE_URL?.trim();
const chatServiceUrl = httpsUrl(configuredChatService);
if (configuredChatService && !chatServiceUrl) {
  throw new Error("NEXT_PUBLIC_CHAT_SERVICE_URL must be an absolute HTTPS URL without credentials, query, or fragment");
}
const requiredFiles = [
  "index.html",
  "404.html",
  "IntroPic.webp",
  "games/index.html",
  "aigc/index.html",
  "chat/index.html",
  "transfer/index.html",
  "skin-service/index.html",
  "skin-service/communities/index.html",
  "skin-service/questions/index.html",
  "skin-service/feedback/index.html",
  "skin-service/review-notices/index.html",
  "skin-service/updates/index.html",
  "skin-service/support/index.html",
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
  "skin-service/review-account-qr.svg",
];
const forbiddenFiles = [
  "IntroPic.jpg",
  "HanazarIntroAnimation.mp4",
  "hanazar-emblem.svg",
  "aigc/gpt-55-extrahigh.jpg",
  "tools/aiugc-pipeline.jpg",
  "tools/ai-rhythm-game.jpg",
  "skin-service/groups/group-2.jpg",
  "skin-service/groups/group-4.jpg",
  "skin-service/groups/group-7.jpg",
  "skin-service/groups/group-9.jpg",
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
    "Skin Publishing Service Center",
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
    ...(chatServiceUrl ? ["AES-256-GCM", "Content is encrypted in your browser before upload"] : []),
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
    "我们的社群",
    "代发皮肤常见问题",
    "匿名反馈墙",
    "审核通知",
    "更新公告",
    "支持与捐赠",
    "进入分区",
  ],
  "skin-service/communities/index.html": [
    "我们的社群",
    "微信交流群",
    "目前微信群暂不支持加入",
    "4 个微信群二维码入口已移除",
    "请前往下方 QQ 群组",
    "前往 QQ 群组",
    "QQ 交流群",
    "外区 Discord",
    "社群公告",
    `网站版本 ${packageVersion}`,
    "939095145",
    "853878672",
    "953014293",
    "1105843703",
    "https://discord.gg/XtTbKCSKa",
  ],
  "skin-service/questions/index.html": [
    "代发皮肤常见问题",
    "服务入门",
    "材料准备",
    "审核与处理",
    "隐私安全",
    "什么是代发皮肤服务？",
  ],
  "skin-service/feedback/index.html": [
    "匿名反馈墙",
    "微信内反馈，都会回复",
    "匿名反馈墙不会收集联系方式",
    "查看公众号二维码",
    "写下匿名反馈",
    "本机可修改五分钟",
  ],
  "skin-service/review-notices/index.html": [
    "审核通知",
    "千川bit",
    "代发皮肤新增人员暂停7天",
    "自本公告发布起暂停 7 天",
    "微信账号被封号",
    "暂停期间暂不接收或添加新人",
    "公众号“千川bit”现已恢复正常使用",
    "恢复安排以最新公告为准",
    "审核通知记录",
    "展开查看全部 205 个批次",
    "第 205 批次",
    "第 204 批次",
    "第 203 批次",
    "第 202 批次",
    "累计组件总数",
    "97 个",
    "10,168",
    "审核中",
  ],
  "skin-service/updates/index.html": [
    "更新公告",
    "2.17.5",
    "新增人员暂停7天与整体体验优化",
    "因运营微信账号被封号",
    "暂停期间暂不接收或添加新人",
    "2.17.4",
    "微信群入口移除与界面动效优化",
    "已彻底移除 4 个微信群二维码入口及图片",
    "目前微信群暂不支持加入，请前往 QQ 群组",
    "2.17.3",
    "第205批审核与累计组件统计",
    "第 205 批次已与第 204 批次同时进入审核",
    "累计组件总数",
    "微信内反馈，都会回复",
    "2.17.2",
    "代发工作暂停3天与公众号恢复通知",
    "自本公告发布起暂停 3 天",
    "微信账号受限",
    "公众号“千川bit”现已恢复正常使用",
    "恢复安排以最新公告为准",
    "2.17.1",
    "微信群暂停开放与公众号赞赏说明",
    "微信交流群暂不开放",
    "前往公众号“千川bit”",
    "点击“赞赏作者”",
    "非常感谢大家的赞赏与支持",
    "2.17.0",
    "独立快捷设置与第 203 批结果",
    "第 203 批已出 97 个组件",
    "第 204 批进入审核",
  ],
  "skin-service/support/index.html": [
    "支持与捐赠",
    "通过公众号赞赏作者",
    "前往公众号“千川bit”",
    "点击“赞赏作者”",
    "非常感谢大家的赞赏与支持",
    "查看公众号二维码",
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

const reviewNoticesHtml = readFileSync(join("out", "skin-service/review-notices/index.html"), "utf8");
const reviewQrPath = "skin-service/review-account-qr.svg";
if (!reviewNoticesHtml.includes(`src="${basePath}/${reviewQrPath}"`)) {
  throw new Error(`Missing base path for ${reviewQrPath}`);
}
if (reviewNoticesHtml.includes(`src="/${reviewQrPath}"`)) {
  throw new Error(`Root-relative skin service image: ${reviewQrPath}`);
}

const forbiddenContent = {
  "index.html": [
    "https://hanazar-games.github.io/Tic-Tac-Toe/",
    "https://chat.hanazargames.com/",
    "https://github.com/Mirako-Official/New-Aiugc-Pipeline",
    "https://github.com/Mirako-Official/AI-Rhythm-Game",
  ],
  "aigc/index.html": ["https://hanazar-games.github.io/GPT-MAX-AIGC-Webgame-Project"],
  "skin-service/index.html": [
    "939095145",
    "什么是代发皮肤服务？",
    "写下匿名反馈",
    "全局搜索",
    "捐赠入口预留",
  ],
  "skin-service/communities/index.html": [
    "group-2.jpg",
    "group-4.jpg",
    "group-7.jpg",
    "group-9.jpg",
  ],
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
