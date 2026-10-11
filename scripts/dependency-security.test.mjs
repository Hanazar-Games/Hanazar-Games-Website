import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

test("production dependency locks include the audited security fixes", () => {
  const manifest = readJson("../package.json");
  const { packages } = readJson("../package-lock.json");
  assert.equal(manifest.dependencies.next, "16.3.8");
  assert.equal(manifest.overrides.next.sharp, "0.35.5");
  for (const [path, version] of [
    ["next", "16.3.8"], ["@next/env", "16.3.8"], ["sharp", "0.35.5"], ["source-map-js", "1.2.2"],
  ]) assert.equal(packages[`node_modules/${path}`]?.version, version, path);
  for (const [path, pkg] of Object.entries(packages)) {
    if (path.startsWith("node_modules/@next/swc-")) assert.equal(pkg.version, "16.3.8", path);
  }
});
