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

const aigcHtml = readFileSync(join("out", "aigc/index.html"), "utf8");
if (!aigcHtml.includes("GPT-5.6-sol-Ultra-AIGC-webgame")) {
  throw new Error("Missing GPT-5.6-sol Ultra AIGC project");
}

console.log(`Static export verified for ${basePath}`);
