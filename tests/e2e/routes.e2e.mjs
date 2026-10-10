import { chromium, devices } from "playwright";
// Every storefront route on desktop and phone: no console errors, failed requests or sideways scrolling.
import { APP, reset } from "./lib.mjs";
await reset();
const base = APP;
const routes = ["/", "/about", "/account", "/build-your-box", "/checkout", "/wishlist", "/journal", "/does-not-exist",
  ...["perfumes","attars","bestsellers","gift-sets","oud","new-arrivals","him","her","all"].map((s) => "/collections/" + s),
  ...["the-art-of-oud","choosing-your-signature","attar-vs-perfume","make-fragrance-last-longer","the-history-of-oud"].map((s) => "/journal/" + s),
  ...["shipping","returns","refund-policy","faqs","track-order","contact","privacy","terms"].map((s) => "/help/" + s),
  ...["royal-oud","rose-attar","amber-nuit","sea-linen","vetiver-rain"].map((s) => "/products/" + s),
  // expected 404s: an inactive product and a removed sample product
  "/products/hidden-draft", "/products/white-oud", "/account/orders/999", "/admin", "/admin/orders"];
const expect404 = new Set(["/does-not-exist", "/products/hidden-draft", "/products/white-oud"]);
const b = await chromium.launch();
const problems = [];
for (const [label, opts] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["phone", { ...devices["iPhone 13"] }]]) {
  const ctx = await b.newContext(opts);
  for (const r of routes) {
    const p = await ctx.newPage(); const errs = [];
    p.on("pageerror", (e) => errs.push("pageerror " + e.message.slice(0, 160)));
    p.on("console", (m) => { if (m.type() === "error" && !(expect404.has(r) && /404/.test(m.text()))) errs.push("console " + m.text().slice(0, 160)); });
    p.on("response", (res) => { if (res.status() >= 400 && !(expect404.has(r) && res.url().endsWith(r))) errs.push("HTTP " + res.status() + " " + res.url().replace(base, "").slice(0, 120)); });
    await p.goto(base + r, { waitUntil: "networkidle", timeout: 60000 });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((res) => setTimeout(res, 60)); } });
    await p.waitForTimeout(400);
    const [sw, cw] = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    if (sw > cw + 1) errs.push(`horizontal overflow ${sw} > ${cw}`);
    if (errs.length) problems.push(`${label} ${r}: ${[...new Set(errs)].join(" | ")}`);
    await p.close();
  }
  await ctx.close();
}
console.log(problems.length ? problems.join("\n") + "\n\nFAILED" : `ALL PASSED: ${routes.length} routes x 2 viewports`);
await b.close();
process.exit(problems.length ? 1 : 0);
