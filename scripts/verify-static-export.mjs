import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/").pop();
if (!repositoryName) throw new Error("GITHUB_REPOSITORY is required");

const basePath = `/${repositoryName}`;
const requiredFiles = [
  "index.html",
  "404.html",
  "games/index.html",
  "aigc/index.html",
  "games/guandan.jpg",
  "games/liars-bar.jpg",
  "products/lc300a.jpg",
  "aigc/gpt-56-sol-ultra.jpg",
];

for (const file of requiredFiles) {
  if (!existsSync(join("out", file))) throw new Error(`Missing static export: ${file}`);
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
    "https://hanazar-games.github.io/Guandan-Webgame/",
    "https://hanazar-games.github.io/Liars-Bar-webgame/",
    "https://hanazar-games.github.io/GPT-5.6-sol-Ultra-AIGC-webgame/",
    "https://github.com/hzagaming/LC300A",
  ],
  "games/index.html": [
    "https://hanazar-games.github.io/Guandan-Webgame/",
    "https://hanazar-games.github.io/Liars-Bar-webgame/",
    "GPT-5.6-sol-Ultra-AIGC-webgame",
    "https://hanazar-games.github.io/GPT-5.6-sol-Ultra-AIGC-webgame/",
  ],
  "aigc/index.html": [
    "GPT-5.6-sol-Ultra-AIGC-webgame",
    "https://hanazar-games.github.io/GPT-5.6-sol-Ultra-AIGC-webgame/",
  ],
};

for (const [file, values] of Object.entries(requiredContent)) {
  const html = readFileSync(join("out", file), "utf8");
  for (const value of values) {
    if (!html.includes(value)) throw new Error(`Missing ${value} in ${file}`);
  }
}

console.log(`Static export verified for ${basePath}`);
