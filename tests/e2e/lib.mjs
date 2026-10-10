// Shared helpers for browser tests against the source-derived ForgeX test double.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

export const APP = process.env.APP || "http://localhost:5173";
export const API = process.env.API || "http://localhost:8080";
export const RZP_SECRET = "double_razorpay_secret";
/** Screenshots land here (override with SHOTS=...). */
export const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), "cosmic-e2e-shots");
fs.mkdirSync(SHOTS, { recursive: true });

/** A ~7 MB noisy PNG photo, to prove large images are resized under the backend's 1 MB upload limit. */
export function bigPhoto() {
  const file = path.join(os.tmpdir(), "cosmic-e2e-big-photo.png");
  if (fs.existsSync(file)) return file;
  const W = 1500, H = 1900;
  let seed = 1;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) % 41);
  const raw = Buffer.alloc((W * 3 + 1) * H);
  let o = 0;
  for (let y = 0; y < H; y++) {
    raw[o++] = 0;
    for (let x = 0; x < W; x++) {
      const n = rnd();
      raw[o++] = (60 + Math.floor((x * 120) / W) + n) & 255;
      raw[o++] = (40 + Math.floor((y * 90) / H) + n) & 255;
      raw[o++] = (30 + n) & 255;
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcTable[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]));
  return file;
}

export async function reset() {
  await fetch(`${API}/__reset`);
}
export async function serverState() {
  return (await fetch(`${API}/__state`)).json();
}

export async function apiSignIn(email, password) {
  const r = await fetch(`${API}/api/auth/signin`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!r.ok) throw new Error(`signin ${r.status}`);
  return r.json();
}

/** Put a signed-in session into the storefront's persisted auth store. */
export async function signInPage(page, email, password) {
  const res = await apiSignIn(email, password);
  const payload = JSON.parse(Buffer.from(res.jwtToken.split(".")[1], "base64url").toString());
  const state = { state: { user: { id: res.id, username: res.username, email: res.email, roles: res.roles }, token: res.jwtToken, expiresAt: payload.exp * 1000 }, version: 0 };
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("__auth_seeded")) {
      localStorage.setItem("cosmic-auth", s);
      sessionStorage.setItem("__auth_seeded", "1");
    }
  }, JSON.stringify(state));
  return res;
}

export function bagLine(p, quantity = 1) {
  return { key: `${p.id}:${p.id}`, productId: String(p.id), slug: p.slug, name: p.name, variantId: String(p.id), size: "", price: p.price, image: "", quantity, stock: p.stock };
}

export async function setBag(page, lines) {
  await page.evaluate((l) => localStorage.setItem("cosmic-cart-v2", JSON.stringify({ state: { lines: l }, version: 0 })), lines);
}

/** Serves a stand-in for checkout.razorpay.com that behaves per window.__rzpMode, signing like Razorpay does. */
export async function fakeRazorpay(page) {
  await page.exposeFunction("__sign", (s) => crypto.createHmac("sha256", RZP_SECRET).update(s).digest("hex"));
  await page.route("https://checkout.razorpay.com/v1/checkout.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
      window.Razorpay = function (opts) { this.opts = opts; this.handlers = {}; };
      Razorpay.prototype.on = function (ev, cb) { this.handlers[ev] = cb; };
      Razorpay.prototype.open = async function () {
        window.__rzpOpened = (window.__rzpOpened || 0) + 1;
        window.__rzpLast = { key: this.opts.key, amount: this.opts.amount, currency: this.opts.currency, order_id: this.opts.order_id, prefill: this.opts.prefill };
        const mode = window.__rzpMode || "success";
        await new Promise((r) => setTimeout(r, 400));
        if (mode === "dismiss") return this.opts.modal.ondismiss();
        if (mode === "fail") { this.handlers["payment.failed"] && this.handlers["payment.failed"]({ error: { description: "Card declined by bank" } }); return this.opts.modal.ondismiss(); }
        const pid = "pay_" + Math.random().toString(36).slice(2, 12);
        const sig = mode === "badsig" ? "0".repeat(64) : await window.__sign(this.opts.order_id + "|" + pid);
        this.opts.handler({ razorpay_payment_id: pid, razorpay_order_id: this.opts.order_id, razorpay_signature: sig });
      };`,
    }),
  );
}

export function collectConsole(page, sink) {
  page.on("console", (m) => {
    if (m.type() === "error") sink.push(m.text());
  });
  page.on("pageerror", (e) => sink.push(String(e)));
}

let failures = 0;
export function check(cond, label) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures++;
}
export const failed = () => failures;
