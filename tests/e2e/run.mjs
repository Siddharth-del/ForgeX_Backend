// Runs every browser suite in order against a running storefront (APP) and ForgeX test double (API).
import { spawnSync } from "node:child_process";
import path from "node:path";
import { API, APP } from "./lib.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
for (const [name, url] of [["storefront", APP], ["API", `${API}/api/public/products`]]) {
  try {
    await fetch(url);
  } catch {
    console.error(`Can't reach the ${name} at ${url}. Start it first (see tests/e2e/README.md).`);
    process.exit(1);
  }
}

const suites = ["routes.e2e.mjs", "checkout.e2e.mjs", "box.e2e.mjs", "admin.e2e.mjs", "account.e2e.mjs"];
const results = [];
for (const s of suites) {
  console.log(`\n=== ${s} ===`);
  const r = spawnSync(process.execPath, [path.join(here, s)], { stdio: "inherit", env: process.env });
  results.push([s, r.status === 0]);
}
console.log("\n=== Summary ===");
for (const [s, ok] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${s}`);
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
