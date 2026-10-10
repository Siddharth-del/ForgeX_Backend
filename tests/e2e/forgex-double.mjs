// Test double of the ForgeX Spring Boot backend, written from its source code, for browser-testing
// the storefront and admin panel where the real backend can't be built (Maven Central is blocked).
// Mirrors the backend after the cart / Build Your Own Box / checkout fixes: endpoint paths, methods,
// DTO field names, status codes (400 / 401 / 403 / 404 / 409 / 413 / 500), role rules, cart ownership,
// line keys, box validation and pricing, checkout maths, unpaid-order reuse, Razorpay signature and
// webhook verification, "remove only the ordered lines", order transitions and product deletion rules.
// Every request runs like a transaction: if it fails, nothing it changed is kept.
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const PORT = Number(process.env.PORT || 8080);
const SECRET = "test-jwt-secret";
const EXP_MS = Number(process.env.EXP_MS || 3000000);
export const RZP_KEY_ID = "rzp_test_double";
export const RZP_SECRET = "double_razorpay_secret";
export const RZP_WEBHOOK_SECRET = "double_webhook_secret";
const COOKIE = "springBootEcom";
const FREE_ABOVE = 149900, SHIP = 9900;
const EXPIRY_MINUTES = 15, REUSE_MARGIN_MINUTES = 5;
const MAX_PER_LINE = 10;
const FIXTURES = path.join(path.dirname(new URL(import.meta.url).pathname), "fixtures");
// Uploaded images go to a temp folder (stands in for Cloudinary) so the project folder stays clean.
const UPLOADS = path.join(os.tmpdir(), "forgex-double-uploads");
// app.cors.allowed-origins (CORS_ALLOWED_ORIGINS on the real backend).
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:4173").split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);

let state;
function seed() {
  const now = new Date().toISOString().slice(0, 23);
  state = {
    users: new Map([
      ["user1@example.com", { id: 1, username: "user1", email: "user1@example.com", password: "password1", roles: ["ROLE_USER"] }],
      ["admin@example.com", { id: 2, username: "admin", email: "admin@example.com", password: "adminPass", roles: ["ROLE_USER", "ROLE_ADMIN"] }],
    ]),
    nextUser: 3,
    products: [
      { productId: 1, name: "Royal Oud", slug: "royal-oud", description: "A deep oud oil with saffron and rose.", category: "ATTAR", gender: "UNISEX", fragranceFamily: "WOODY", mrp: 250000, price: 199900, stock: 12, image: `http://localhost:${PORT}/media/p1.jpg`, active: true },
      { productId: 2, name: "Rose Attar", slug: "rose-attar", description: "Taif rose, distilled into sandalwood.", category: "ATTAR", gender: "WOMEN", fragranceFamily: "FLORAL", mrp: 150000, price: 129900, stock: 3, image: null, active: true },
      { productId: 3, name: "Amber Nuit", slug: "amber-nuit", description: "Amber, labdanum and black pepper.", category: "PERFUME", gender: "MEN", fragranceFamily: "AMBER", mrp: 300000, price: 249900, stock: 20, image: `http://localhost:${PORT}/media/p3.jpg`, active: true },
      { productId: 4, name: "Sea Linen", slug: "sea-linen", description: "Salt air and white musk.", category: "PERFUME", gender: "WOMEN", fragranceFamily: "AQUATIC", mrp: 179900, price: 179900, stock: 0, image: null, active: true },
      { productId: 5, name: "Hidden Draft", slug: "hidden-draft", description: "Not for sale yet.", category: "PERFUME", gender: "UNISEX", fragranceFamily: "MIXED", mrp: 100000, price: 90000, stock: 5, image: null, active: false },
      { productId: 6, name: "Vetiver Rain", slug: "vetiver-rain", description: "Vetiver root and petrichor.", category: "PERFUME", gender: "UNISEX", fragranceFamily: "EARTHY", mrp: 220000, price: 159900, stock: 8, image: null, active: true },
    ],
    nextProduct: 7,
    // config/BundleSeeder.java: shop.box.* defaults (3 fragrances for ₹1,799, any category, no repeats).
    bundles: [{ bundleId: 1, slug: "build-your-box", name: "Build Your Own Box", description: "Choose any three fragrances.", itemCount: 3, price: 179900, allowedCategory: null, allowRepeats: false, active: true, image: null }],
    nextBundle: 2,
    // email -> { cartId, items: [{ cartItemId, lineKey, productId | null, bundleId | null, bundleProductIds, quantity }] }
    carts: new Map(),
    nextCart: 1,
    nextCartItem: 1,
    addresses: [], // {addressId, ..., userEmail}
    nextAddress: 1,
    orders: [],
    nextOrder: 1,
    nextOrderItem: 1,
    coupons: [{ couponId: 1, code: "WELCOME10", type: "PERCENT", value: 10, minOrderPaise: 100000, maxDiscountPaise: 50000, usageLimit: null, usedCount: 0, validFrom: null, validTo: null, active: true }],
    nextCoupon: 2,
    otps: new Map(),
    log: [],
    seededAt: now,
  };
}
seed();

/* ---------------------------------------------------------------- helpers */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function sign(email) {
  const h = b64({ alg: "HS256" }), p = b64({ sub: email, iat: Math.floor(Date.now() / 1000), exp: Math.floor((Date.now() + EXP_MS) / 1000) });
  return `${h}.${p}.${crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url")}`;
}
function verifyJwt(t) {
  try {
    const [h, p, s] = t.split(".");
    if (crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url") !== s) return null;
    const c = JSON.parse(Buffer.from(p, "base64url"));
    return c.exp * 1000 > Date.now() ? c.sub : null;
  } catch { return null; }
}
const ldt = (ms = Date.now()) => new Date(ms - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 23); // LocalDateTime
const discountOf = (p) => (!p.mrp || !p.price ? 0 : Math.trunc(((p.mrp - p.price) * 100) / p.mrp));
const productDTO = (p, quantity = null) => ({ productId: p.productId, name: p.name, slug: p.slug, description: p.description, category: p.category, gender: p.gender, fragranceFamily: p.fragranceFamily, quantity, mrp: p.mrp, price: p.price, discount: discountOf(p), stock: p.stock, image: p.image, active: p.active });
const findProduct = (id) => state.products.find((p) => p.productId === id);
const findBundle = (id) => state.bundles.find((b) => b.bundleId === id);
class HttpErr extends Error { constructor(status, body) { super("http"); this.status = status; this.body = body; } }
const api = (status, message) => new HttpErr(status, { message, status: false }); // APIResponse(message, false)
const apiEx = (message) => api(400, message);
const conflict = (message) => api(409, message);
const notFound = (res, field, val) => api(404, `${res} not found with ${field}: ${val}`);
const INTEGRITY = "This change conflicts with existing data, for example a value that must be unique or a record that is still in use.";
/** Path variables: Long/Integer conversion failures are answered 400 (MethodArgumentTypeMismatchException). */
function longVar(raw, name) {
  if (!/^-?\d{1,18}$/.test(raw)) throw apiEx(`Invalid value for '${name}'.`);
  return Number(raw);
}

/* ---------- line keys (util/CartLineKeys.java) */
const canonical = (ids) => [...ids].sort((a, b) => a - b);
const productKey = (id) => `P:${id}`;
const bundleKey = (bundleId, ids) => `B:${bundleId}:${canonical(ids).join(",")}`;
const keyOf = (item) => item.lineKey ?? (item.bundleId ? bundleKey(item.bundleId, item.bundleProductIds) : productKey(item.productId));
const countUnits = (ids) => { const m = new Map(); for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1); return m; };

/* ---------- carts */
function cartFor(email) {
  let c = state.carts.get(email);
  if (!c) { c = { cartId: state.nextCart++, items: [] }; state.carts.set(email, c); }
  return c;
}
/** service/CartLinePricing.java */
function priceLine(item) {
  const qty = item.quantity ?? 0;
  if (!item.bundleId) {
    const p = findProduct(item.productId);
    if (!p) return { item, key: keyOf(item), name: "Unavailable item", unitPrice: 0, unitMrp: 0, units: new Map(), products: new Map(), problem: "This item is no longer available", stockProblem: null };
    const price = p.price ?? 0, mrp = p.mrp != null && p.mrp > price ? p.mrp : price;
    let problem = null, stockProblem = null;
    const stock = p.stock ?? 0;
    if (p.active !== true || p.price == null) problem = `${p.name} is no longer available`;
    else if (qty > stock) stockProblem = stock === 0 ? `${p.name} is out of stock` : `Only ${stock} left of ${p.name}`;
    return { item, key: keyOf(item), name: p.name, unitPrice: price, unitMrp: mrp, units: new Map([[p.productId, 1]]), products: new Map([[p.productId, p]]), problem, stockProblem };
  }
  const bundle = findBundle(item.bundleId);
  const ids = item.bundleProductIds ?? [];
  const units = countUnits(ids);
  const products = new Map();
  let value = 0, problem = null, stockProblem = null;
  for (const id of ids) {
    const p = findProduct(id);
    if (!p) { problem = "A fragrance in this box is no longer available"; continue; }
    products.set(id, p);
    value += p.price ?? 0;
    if (problem == null && (p.active !== true || p.price == null)) problem = `${p.name} is no longer available`;
  }
  if (problem == null) {
    for (const [id, n] of units) {
      const p = products.get(id), stock = p.stock ?? 0;
      if (n * qty > stock) { stockProblem = stock === 0 ? `${p.name} is out of stock` : `Only ${stock} left of ${p.name}`; break; }
    }
  }
  if (bundle.active !== true) problem = `${bundle.name} isn't available right now`;
  else if (ids.length !== bundle.itemCount) problem = `${bundle.name} now needs ${bundle.itemCount} fragrances. Please build it again.`;
  else if (bundle.allowRepeats !== true && units.size !== ids.length) problem = `Each fragrance can be chosen only once for ${bundle.name}. Please build it again.`;
  else if (bundle.allowedCategory && problem == null) {
    for (const p of products.values()) if (p.category !== bundle.allowedCategory) { problem = `${p.name} can't be chosen for ${bundle.name}. Please build it again.`; break; }
  }
  const price = bundle.price ?? 0;
  return { item, key: keyOf(item), name: bundle.name, unitPrice: price, unitMrp: Math.max(price, value), units, products, problem, stockProblem };
}
const lineTotal = (l) => l.unitPrice * (l.item.quantity ?? 0);
function cartDTO(c) {
  const lines = c.items.map(priceLine);
  const products = [], bundles = [];
  for (const l of lines) {
    if (l.item.bundleId) {
      const b = findBundle(l.item.bundleId);
      bundles.push({
        cartItemId: l.item.cartItemId, bundleId: b.bundleId, slug: b.slug, name: b.name, lineKey: l.key,
        productIds: [...l.item.bundleProductIds],
        components: [...l.units].map(([id, n]) => { const p = l.products.get(id); return { productId: id, name: p?.name ?? null, slug: p?.slug ?? null, image: p?.image ?? null, category: p?.category ?? null, price: p?.price ?? null, active: p?.active ?? null, stock: p?.stock ?? null, quantity: n }; }),
        quantity: l.item.quantity, unitPrice: l.unitPrice, value: l.unitMrp, lineTotal: lineTotal(l),
        available: l.problem == null && l.stockProblem == null, problem: l.problem ?? l.stockProblem, ruleProblem: l.problem, stockProblem: l.stockProblem,
      });
    } else if (findProduct(l.item.productId)) {
      products.push(productDTO(findProduct(l.item.productId), l.item.quantity));
    }
  }
  return { cartId: c.cartId, totalPrice: lines.reduce((s, l) => s + lineTotal(l), 0), products, bundles };
}
const findLine = (c, key) => c.items.find((i) => keyOf(i) === key);
function newLine(c, key, fields) { const item = { cartItemId: state.nextCartItem++, lineKey: key, productId: null, bundleId: null, bundleProductIds: [], quantity: 0, ...fields }; c.items.push(item); return item; }
function validId(id, what) { if (id == null || id <= 0) throw apiEx(`Invalid ${what} id`); }
function sellable(id) {
  const p = findProduct(id);
  if (!p) throw notFound("Product", "productId", id);
  if (p.active !== true || p.price == null) throw apiEx(`${p.name} is not available`);
  return p;
}
function checkQty(p, q) {
  if (q > MAX_PER_LINE) throw apiEx(`You can add at most ${MAX_PER_LINE} of ${p.name}`);
  const stock = p.stock ?? 0;
  if (q > stock) throw apiEx(stock === 0 ? `${p.name} is out of stock` : `Only ${stock} left of ${p.name}`);
}
/** service/BundleService.java resolve() */
function resolveBox(bundleId, ids) {
  if (bundleId == null || bundleId <= 0) throw apiEx("Invalid box id");
  const bundle = findBundle(bundleId);
  if (!bundle) throw notFound("Bundle", "bundleId", bundleId);
  if (bundle.active !== true) throw apiEx(`${bundle.name} isn't available right now`);
  if (!Array.isArray(ids) || ids.length !== bundle.itemCount) throw apiEx(`Choose exactly ${bundle.itemCount} fragrances for ${bundle.name}`);
  for (const id of ids) if (id == null || !(id > 0)) throw apiEx("Invalid product id in box");
  const distinct = [...new Set(ids)];
  if (bundle.allowRepeats !== true && distinct.length !== ids.length) throw apiEx(`Each fragrance can be chosen only once for ${bundle.name}`);
  const products = new Map();
  for (const id of distinct) {
    const p = findProduct(id);
    if (!p) throw notFound("Product", "productId", id);
    if (p.active !== true || p.price == null) throw apiEx(`${p.name} is not available`);
    if (bundle.allowedCategory && bundle.allowedCategory !== p.category) throw apiEx(`${p.name} can't be chosen for ${bundle.name}`);
    products.set(id, p);
  }
  return { bundle, productIds: canonical(ids), products };
}
function checkBoxStock(r, boxes) {
  for (const [id, n] of countUnits(r.productIds)) {
    const p = r.products.get(id), stock = p.stock ?? 0;
    if (n * boxes > stock) throw apiEx(stock === 0 ? `${p.name} is out of stock` : `Only ${stock} left of ${p.name}`);
  }
}
function findBoxLine(c, id) {
  const item = c.items.find((i) => i.bundleId && i.cartItemId === id);
  if (!item) throw notFound("Box in cart", "cartItemId", id);
  return item;
}

/* ---------- coupons + prices */
function evaluateCoupon(raw, subtotal) {
  if (!raw || !raw.trim()) return { discount: 0, code: null, message: null };
  const code = raw.trim().toUpperCase();
  const c = state.coupons.find((x) => x.code.toUpperCase() === code);
  const now = ldt();
  if (!c || c.active !== true) return { discount: 0, code: null, message: "Invalid coupon code" };
  if (c.validFrom && now < c.validFrom) return { discount: 0, code: null, message: "This coupon is not active yet" };
  if (c.validTo && now > c.validTo) return { discount: 0, code: null, message: "This coupon has expired" };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { discount: 0, code: null, message: "This coupon has reached its usage limit" };
  if (c.minOrderPaise != null && subtotal < c.minOrderPaise) return { discount: 0, code: null, message: `Add ₹${Math.trunc((c.minOrderPaise - subtotal) / 100)} more to use this coupon` };
  let d = c.type === "PERCENT" ? Math.trunc((subtotal * c.value) / 100) : c.value;
  if (c.type === "PERCENT" && c.maxDiscountPaise != null) d = Math.min(d, c.maxDiscountPaise);
  return { discount: Math.min(d, subtotal), code: c.code, message: "Applied" };
}
function calculate(lines, coupon) {
  let subtotal = 0, mrpTotal = 0;
  for (const l of lines) { subtotal += lineTotal(l); mrpTotal += l.unitMrp * (l.item.quantity ?? 0); }
  const c = evaluateCoupon(coupon, subtotal);
  const after = subtotal - c.discount;
  const shipping = after >= FREE_ABOVE || !lines.length ? 0 : SHIP;
  return { subtotal, mrpTotal, productSavings: mrpTotal - subtotal, couponDiscount: c.discount, couponCode: c.code, couponMessage: c.message, shipping, total: after + shipping };
}
const cartSignature = (items, addressId, coupon, method) =>
  crypto.createHash("sha256").update([...items].map((i) => `${keyOf(i)}x${i.quantity}`).sort().join(";") + `|a${addressId}|c${coupon ?? ""}|m${method}`).digest("hex");

/* ---------- orders */
function orderDTO(o) {
  return { orderId: o.orderId, email: o.email, orderNumber: o.orderNumber, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.payment.status, subtotal: o.subtotal, discount: o.discount, shipping: o.shipping, total: o.total, couponCode: o.couponCode, addressId: o.addressId, createdAt: o.createdAt, paidAt: o.paidAt, orderItems: o.items };
}
/** Units of each product an order holds (single lines and boxes). */
function orderUnits(o) {
  const m = new Map();
  for (const i of o.items) {
    if (i.productId) m.set(i.productId, (m.get(i.productId) ?? 0) + i.quantity);
    for (const c of i.components) if (c.productId) m.set(c.productId, (m.get(c.productId) ?? 0) + c.quantity * i.quantity);
  }
  return m;
}
function releaseStock(o) { for (const [id, n] of orderUnits(o)) { const p = findProduct(id); if (p) p.stock += n; } }
function cancelUnpaid(o, reason) { releaseStock(o); o.status = "CANCELLED"; o.payment.status = "FAILED"; o.payment.failureReason = reason; }
/** Takes only the order's lines (and quantities) out of the customer's cart. */
function removeOrderedLines(o) {
  const cart = state.carts.get(o.email);
  if (!cart) return;
  for (const oi of o.items) {
    const line = findLine(cart, oi.lineKey);
    if (!line) continue;
    const left = line.quantity - oi.quantity;
    if (left > 0) line.quantity = left; else cart.items = cart.items.filter((x) => x !== line);
  }
}
function redeem(o) { if (o.couponCode) { const c = state.coupons.find((x) => x.code === o.couponCode); if (c) c.usedCount++; } }
function markPaid(o, payId, sig) {
  if (o.status === "PAID") return;
  if (o.status === "CANCELLED") { o.payment.razorpayPaymentId = payId; o.payment.status = "REFUNDED"; o.payment.razorpayRefundId = `rfnd_${crypto.randomBytes(6).toString("hex")}`; o.status = "REFUNDED"; return; }
  if (o.status !== "PENDING_PAYMENT") return;
  o.status = "PAID"; o.paidAt = ldt(); o.payment.status = "CAPTURED"; o.payment.razorpayPaymentId = payId; if (sig) o.payment.razorpaySignature = sig;
  redeem(o);
  removeOrderedLines(o);
}
function markFailed(o, reason) { if (o.status === "PENDING_PAYMENT") o.payment.failureReason = reason; }
const ALLOWED = { PAID: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["SHIPPED", "CANCELLED"], SHIPPED: ["DELIVERED"] };
const minimalPdf = (title) => Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]>>endobj\n% ${title}\ntrailer<</Root 1 0 R>>\n%%EOF\n`);
const rzpResponse = (o, price, email) => ({ orderId: o.orderId, status: o.status, price, razorpayKeyId: RZP_KEY_ID, razorpayOrderId: o.razorpayOrderId, amount: o.total, currency: "INR", customerEmail: email });
const bundleDTO = (b) => ({ ...b });

/** Copy of everything a request may change, to roll back on failure (like @Transactional). */
const snapshot = () => { const { log, ...rest } = state; return structuredClone(rest); };
const restore = (snap) => { const log = state.log; state = { ...snap, log }; };

/* ---------------------------------------------------------------- server */
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  const origin = req.headers.origin;
  const json = (st, o, headers = {}) => { res.writeHead(st, { "Content-Type": "application/json", ...headers }); res.end(JSON.stringify(o)); };
  const text = (st, s) => { res.writeHead(st, { "Content-Type": "text/plain;charset=UTF-8" }); res.end(s); };

  // CORS (WebSecurityConfig.corsConfigurationSource): listed origins only, with credentials.
  // The storefront's dev/preview proxy strips Origin, so its calls never reach this branch.
  if (origin && p.startsWith("/api/")) {
    const o = origin.replace(/\/+$/, "");
    if (!ALLOWED_ORIGINS.includes(o)) return text(403, "Invalid CORS request");
    res.setHeader("Access-Control-Allow-Origin", o);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
    if (req.method === "OPTIONS" && req.headers["access-control-request-method"]) {
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] || "*");
      res.setHeader("Access-Control-Max-Age", "3600");
      res.writeHead(200); return res.end();
    }
  }
  if (req.method === "OPTIONS") { res.writeHead(200); return res.end(); }

  const chunks = []; for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  // AuthTokenFilter: the Authorization header first, then the JWT cookie.
  const auth = req.headers.authorization || "";
  const cookieJwt = (req.headers.cookie || "").split(";").map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const token = auth.startsWith("Bearer ") && auth.slice(7).trim() ? auth.slice(7).trim() : cookieJwt || null;
  const email = token ? verifyJwt(token) : null;
  const user = email ? state.users.get(email) : null;
  state.log.push(`${req.method} ${p}${url.search} ${user ? user.email : "anon"}`);
  const body = () => { try { return raw.length ? JSON.parse(raw.toString()) : {}; } catch { throw apiEx("The request body is missing or malformed."); } };
  const m = (re) => p.match(re);
  const snap = req.method === "GET" ? null : snapshot();

  try {
    // test hooks
    if (p === "/__log") return json(200, state.log);
    if (p === "/__reset") { seed(); return json(200, { ok: true }); }
    if (p === "/__state") return json(200, { orders: state.orders, products: state.products, bundles: state.bundles, carts: [...state.carts.entries()], coupons: state.coupons, addresses: state.addresses });
    if (p === "/__expire") { for (const o of state.orders) if (o.status === "PENDING_PAYMENT") cancelUnpaid(o, "Payment window expired"); return json(200, { ok: true }); }
    if (p.startsWith("/media/")) {
      const name = path.basename(p);
      const f = path.join(name.startsWith("upload-") ? UPLOADS : FIXTURES, name);
      if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": f.endsWith(".png") ? "image/png" : f.endsWith(".webp") ? "image/webp" : "image/jpeg" }); return res.end(fs.readFileSync(f));
    }

    /* ---------- auth */
    if (req.method === "POST" && p === "/api/auth/signin") {
      const b = body(); const u = state.users.get(String(b.email || "").trim().toLowerCase());
      if (!b.email || !b.password) return json(400, { ...(b.email ? {} : { email: "must not be blank" }), ...(b.password ? {} : { password: "must not be blank" }) });
      if (!u || u.password !== b.password) return json(401, { message: "Invalid email or password", status: false });
      const jwt = sign(u.email);
      return json(200, { id: u.id, username: u.username, email: u.email, roles: u.roles, jwtToken: jwt }, { "Set-Cookie": `${COOKIE}=${jwt}; Path=/api; Max-Age=86400; HttpOnly` });
    }
    if (req.method === "POST" && p === "/api/auth/signup") {
      const b = body(); const e = String(b.email || "").trim().toLowerCase();
      if (state.users.has(e)) return json(400, { message: "Email is already in use" });
      if ([...state.users.values()].some((u) => u.username === b.username)) return json(400, { message: "Username is already taken" });
      state.users.set(e, { id: state.nextUser++, username: b.username, email: e, password: b.password, roles: ["ROLE_USER"] });
      return json(200, { message: "User registered successfully" });
    }
    if (req.method === "GET" && p === "/api/auth/user") {
      if (!user) return json(401, { status: 401, error: "Unauthorized", message: "Full authentication is required to access this resource", path: p });
      return json(200, { id: user.id, username: user.username, email: user.email, roles: user.roles, jwtToken: null });
    }
    /* password reset (ForgotServiceImpl): the code must be verified, then sent again with the new password */
    if (p === "/__otp") return json(200, { code: state.otps.get(String(url.searchParams.get("email")).toLowerCase())?.code ?? null });
    if (req.method === "POST" && p === "/api/auth/forgot/password") {
      const e = String(url.searchParams.get("email") || "").trim().toLowerCase();
      if (!state.users.has(e)) throw notFound("User", "email", e);
      state.otps.set(e, { code: String(100000 + crypto.randomInt(900000)), attempts: 0, verified: false, at: Date.now() });
      return text(200, `OTP sent Successfully to email:${e}`);
    }
    if (req.method === "POST" && p === "/api/auth/verify-otp") {
      const e = String(url.searchParams.get("email") || "").trim().toLowerCase(), o = state.otps.get(e);
      if (!o || o.verified || ++o.attempts > 5 || o.code !== String(url.searchParams.get("otp") || "").trim()) return text(400, "Invalid OTP");
      o.verified = true; o.attempts = 0;
      return text(200, "OTP Validate");
    }
    if (req.method === "POST" && p === "/api/auth/reset-password") {
      const e = String(url.searchParams.get("email") || "").trim().toLowerCase(), o = state.otps.get(e), b = body();
      if (!b.password || b.password.length < 6 || b.password.length > 40 || !b.confirmPassword) return json(400, { ...(b.password ? {} : { password: "must not be blank" }), ...(b.confirmPassword ? {} : { confirmPassword: "must not be blank" }) });
      if (!o || !o.verified || ++o.attempts > 5 || o.code !== String(url.searchParams.get("otp") || "").trim()) throw apiEx("Please verify the code sent to your email before choosing a new password.");
      if (b.password !== b.confirmPassword) return text(200, "New password and confirm password do not match");
      state.users.get(e).password = b.password; state.otps.delete(e);
      return text(200, "Password Changed Successfully!");
    }
    if (req.method === "POST" && p === "/api/auth/signout") return json(200, { message: "You've been signed out" }, { "Set-Cookie": `${COOKIE}=; Path=/api; Max-Age=0` });

    /* ---------- public */
    if (req.method === "GET" && p === "/api/public/products") {
      const page = Number(url.searchParams.get("pageNumber") ?? 0), size = Number(url.searchParams.get("pageSize") ?? 50);
      const all = [...state.products].sort((a, b) => a.productId - b.productId);
      const content = all.slice(page * size, page * size + size).map((x) => productDTO(x));
      const totalPages = Math.ceil(all.length / size);
      return json(200, { content, pageNumber: page, pageSize: size, totalElements: all.length, totalPages, lastPage: page >= totalPages - 1 });
    }
    if (m(/^\/api\/public\/products\/(keyword|category|gender)\//)) return json(302, { content: [] }); // HttpStatus.FOUND, as the source does
    if (req.method === "GET" && p === "/api/public/bundles") return json(200, state.bundles.filter((b) => b.active === true).sort((a, b) => a.bundleId - b.bundleId).map(bundleDTO));
    let mm;
    if (req.method === "GET" && (mm = m(/^\/api\/public\/bundles\/([^/]+)$/))) {
      const b = state.bundles.find((x) => x.slug === mm[1] && x.active === true);
      if (!b) throw notFound("Bundle", "slug", mm[1]);
      return json(200, bundleDTO(b));
    }
    if (req.method === "POST" && p === "/api/public/webhooks/razorpay") {
      const sig = req.headers["x-razorpay-signature"];
      const expected = crypto.createHmac("sha256", RZP_WEBHOOK_SECRET).update(raw).digest("hex");
      if (!sig || sig !== expected) throw apiEx("Invalid webhook signature");
      const event = JSON.parse(raw.toString());
      if (event.event !== "payment.captured" && event.event !== "payment.failed") { res.writeHead(200); return res.end(); }
      const pay = event.payload.payment.entity;
      const o = pay.order_id ? state.orders.find((x) => x.razorpayOrderId === pay.order_id) : null;
      if (o) { if (event.event === "payment.captured") markPaid(o, pay.id, null); else markFailed(o, pay.error_description || "Payment failed"); }
      res.writeHead(200); return res.end();
    }
    // Product deletion is still mapped here for old clients, but only administrators may use it.
    const deleteMatch = req.method === "DELETE" && (m(/^\/api\/admin\/products\/([^/]+)$/) || m(/^\/api\/public\/products\/([^/]+)$/));
    if (p.startsWith("/api/public/") && !deleteMatch) return json(404, { status: 404, error: "Not Found", path: p });

    /* ---------- everything below needs a signed-in user */
    if (!user) return json(401, { status: 401, error: "Unauthorized", message: "Full authentication is required to access this resource", path: p });
    const isAdmin = user.roles.includes("ROLE_ADMIN");
    const forbidden = () => json(403, { timestamp: new Date().toISOString(), status: 403, error: "Forbidden", path: p });
    if ((p.startsWith("/api/admin/") || deleteMatch) && !isAdmin) return forbidden();
    if (req.method === "GET" && (p === "/api/carts" || p === "/api/addresses") && !isAdmin) return forbidden();

    /* product deletion (ProductServiceImpl.deleteProduct) */
    if (deleteMatch) {
      const id = longVar(deleteMatch[1], "productId"); const prod = findProduct(id);
      if (!prod) throw notFound("Product", "productId", id);
      const ordered = state.orders.reduce((n, o) => n + o.items.filter((i) => i.productId === id).length + o.items.reduce((k, i) => k + i.components.filter((c) => c.productId === id).length, 0), 0);
      if (ordered > 0) throw conflict(`${prod.name} appears in ${ordered} past order line(s), so it can't be deleted without breaking order history and invoices. Hide it instead by setting it inactive.`);
      for (const c of state.carts.values()) c.items = c.items.filter((i) => i.productId !== id && !(i.bundleId && i.bundleProductIds.includes(id)));
      state.products = state.products.filter((x) => x.productId !== id);
      return text(200, "Product deleted successfully");
    }

    /* cart: always the caller's own (CartServiceImpl.lockedCart) */
    if (req.method === "GET" && p === "/api/carts") return json(200, [...state.carts.values()].map(cartDTO));
    if (req.method === "POST" && (mm = m(/^\/api\/carts\/products\/([^/]+)\/quantity\/([^/]+)$/))) {
      const id = longVar(mm[1], "productId"), q = longVar(mm[2], "quantity");
      if (q < 1) throw apiEx("Quantity must be at least 1");
      validId(id, "product");
      const c = cartFor(user.email); const prod = sellable(id);
      const key = productKey(id); let item = findLine(c, key); const nq = (item?.quantity ?? 0) + q;
      checkQty(prod, nq);
      if (!item) item = newLine(c, key, { productId: id });
      item.quantity = nq;
      return json(201, cartDTO(c));
    }
    if (req.method === "GET" && p === "/api/carts/users/cart") return json(200, cartDTO(cartFor(user.email)));
    if (req.method === "PUT" && (mm = m(/^\/api\/cart\/products\/([^/]+)\/quantity\/([^/]+)$/))) {
      const id = longVar(mm[1], "productId");
      const op = decodeURIComponent(mm[2]).trim().toLowerCase();
      const delta = op === "add" || op === "increment" ? 1 : op === "delete" || op === "decrement" ? -1 : null;
      if (delta === null) throw apiEx(`Unknown quantity operation '${decodeURIComponent(mm[2])}'. Use 'add' or 'delete'.`);
      validId(id, "product");
      const c = cartFor(user.email); const item = findLine(c, productKey(id));
      if (!item) throw notFound("Product in cart", "productId", id);
      const nq = item.quantity + delta;
      if (nq <= 0) c.items = c.items.filter((i) => i !== item);
      else { if (delta > 0) checkQty(sellable(id), nq); item.quantity = nq; }
      return json(200, cartDTO(c));
    }
    if (req.method === "DELETE" && (mm = m(/^\/api\/carts\/([^/]+)\/product\/([^/]+)$/))) {
      const cartId = longVar(mm[1], "cartId"), id = longVar(mm[2], "productId");
      validId(id, "product");
      const c = cartFor(user.email);
      if (cartId !== c.cartId) throw notFound("Cart", "cartId", cartId); // someone else's cart is "not found"
      const item = findLine(c, productKey(id));
      if (!item) throw notFound("Product in cart", "productId", id);
      c.items = c.items.filter((i) => i !== item);
      return text(200, `${findProduct(id)?.name ?? "Product"} removed from cart`);
    }
    if (req.method === "POST" && (mm = m(/^\/api\/carts\/bundles\/([^/]+)$/))) {
      const bundleId = longVar(mm[1], "bundleId");
      const b = body();
      const errs = {};
      if (!Array.isArray(b.productIds) || !b.productIds.length) errs.productIds = "must not be empty";
      else if (b.productIds.length > 20) errs.productIds = "size must be between 0 and 20";
      else if (b.productIds.some((x) => x == null)) errs["productIds[]"] = "must not be null";
      else if (b.productIds.some((x) => typeof x !== "number" || !Number.isInteger(x))) throw apiEx("The request body is missing or malformed.");
      const qty = b.quantity ?? 1;
      if (typeof qty !== "number" || !Number.isInteger(qty)) throw apiEx("The request body is missing or malformed.");
      if (qty < 1) errs.quantity = "must be greater than or equal to 1"; else if (qty > 10) errs.quantity = "must be less than or equal to 10";
      if (Object.keys(errs).length) return json(400, errs);
      const c = cartFor(user.email);
      const r = resolveBox(bundleId, b.productIds);
      const key = bundleKey(bundleId, r.productIds);
      let item = findLine(c, key); const nq = (item?.quantity ?? 0) + qty;
      if (nq > MAX_PER_LINE) throw apiEx(`You can add at most ${MAX_PER_LINE} of the same box`);
      checkBoxStock(r, nq);
      if (!item) item = newLine(c, key, { bundleId, bundleProductIds: [...r.productIds] });
      item.quantity = nq;
      return json(201, cartDTO(c));
    }
    if (req.method === "PUT" && (mm = m(/^\/api\/carts\/bundle-items\/([^/]+)\/quantity\/([^/]+)$/))) {
      const id = longVar(mm[1], "cartItemId"), q = longVar(mm[2], "quantity");
      if (q < 0 || q > MAX_PER_LINE) throw apiEx(`Quantity must be between 0 and ${MAX_PER_LINE}`);
      const c = cartFor(user.email); const item = findBoxLine(c, id);
      if (q === 0) c.items = c.items.filter((i) => i !== item);
      else {
        if (q > item.quantity) checkBoxStock(resolveBox(item.bundleId, item.bundleProductIds), q);
        item.quantity = q;
      }
      return json(200, cartDTO(c));
    }
    if (req.method === "DELETE" && (mm = m(/^\/api\/carts\/bundle-items\/([^/]+)$/))) {
      const id = longVar(mm[1], "cartItemId");
      const c = cartFor(user.email); const item = findBoxLine(c, id);
      c.items = c.items.filter((i) => i !== item);
      return json(200, cartDTO(c));
    }

    /* addresses: entity rules → 400; another customer's address → 404; still used by an order → 409 */
    const aDTO = (a) => ({ addressId: a.addressId, street: a.street, buildingName: a.buildingName, city: a.city, state: a.state, country: a.country, pincode: a.pincode, phoneNumber: a.phoneNumber });
    const checkAddress = (b) => {
      const rules = [["buildingName", 5, "Building name must be atleast 5 characters"], ["city", 4, "City name must be atleast 4 characters"], ["country", 2, "Country name must be atleast 2 characters"], ["pincode", 5, "Pincode must be atleast 5 characters"], ["state", 2, "State name must be atleast 2 characters"], ["street", 5, "Street name must be atleast 5 characters"]];
      const v = [];
      for (const [k, n, msg] of rules) { if (typeof b[k] !== "string" || !b[k].trim()) v.push(`${k} must not be blank`); else if (b[k].length < n) v.push(`${k} ${msg}`); }
      if (typeof b.phoneNumber !== "string" || !b.phoneNumber.trim()) v.push("phoneNumber must not be blank");
      else if (b.phoneNumber.length < 10 || b.phoneNumber.length > 15) v.push("phoneNumber Phone number must be between 10 and 15 characters");
      if (v.length) throw apiEx(v.sort().join("; "));
    };
    const ownAddress = (id, allowAdmin = false) => {
      const a = state.addresses.find((x) => x.addressId === id);
      if (!a || (a.userEmail !== user.email && !(allowAdmin && isAdmin))) throw notFound("Address", "AddressId", id);
      return a;
    };
    if (req.method === "POST" && p === "/api/addresses") {
      const b = body(); checkAddress(b);
      const a = { addressId: state.nextAddress++, street: b.street, buildingName: b.buildingName, city: b.city, state: b.state, country: b.country, pincode: b.pincode, phoneNumber: b.phoneNumber, userEmail: user.email };
      state.addresses.push(a);
      return json(201, aDTO(a));
    }
    if (req.method === "GET" && p === "/api/addresses") return json(200, state.addresses.map(aDTO));
    if (req.method === "GET" && p === "/api/users/addresses") return json(200, state.addresses.filter((a) => a.userEmail === user.email).map(aDTO));
    if (req.method === "GET" && (mm = m(/^\/api\/addresses\/([^/]+)$/))) return json(200, aDTO(ownAddress(longVar(mm[1], "addressId"), true)));
    const usedByOrder = (a) => { if (state.orders.some((o) => o.addressId === a.addressId)) throw conflict("This address is used by an order, so it's kept as it is. Add a new address instead."); };
    if (req.method === "PUT" && (mm = m(/^\/api\/addresses\/([^/]+)$/))) {
      const a = ownAddress(longVar(mm[1], "addressId")); usedByOrder(a); const b = body(); checkAddress(b);
      Object.assign(a, { street: b.street, buildingName: b.buildingName, city: b.city, state: b.state, country: b.country, pincode: b.pincode, phoneNumber: b.phoneNumber });
      return json(200, aDTO(a));
    }
    if (req.method === "DELETE" && (mm = m(/^\/api\/addresses\/([^/]+)$/))) {
      const a = ownAddress(longVar(mm[1], "addressId"));
      usedByOrder(a);
      state.addresses = state.addresses.filter((x) => x !== a);
      return text(200, `Address deleted Successfully with addressId: ${a.addressId}`);
    }

    /* checkout (CheckoutService) */
    if (req.method === "GET" && p === "/api/checkout/preview") {
      const c = state.carts.get(user.email);
      return json(200, calculate((c?.items ?? []).map(priceLine), url.searchParams.get("coupon")));
    }
    if (req.method === "POST" && p === "/api/checkout") {
      const b = body();
      if (b.addressId == null || !b.paymentMethod) return json(400, { ...(b.addressId == null ? { addressId: "must not be null" } : {}), ...(!b.paymentMethod ? { paymentMethod: "must not be null" } : {}) });
      if (!["RAZORPAY", "COD", "UPI"].includes(b.paymentMethod)) throw apiEx("The request body is missing or malformed.");
      const c = state.carts.get(user.email);
      if (!c || !c.items.length) throw apiEx("Your cart is empty");
      const addr = state.addresses.find((a) => a.addressId === Number(b.addressId));
      if (!addr) throw notFound("Address", "addressId", b.addressId);
      if (addr.userEmail !== user.email) throw apiEx("Address does not belong to you");
      const lines = c.items.map(priceLine);
      const problems = [...new Set(lines.map((l) => l.problem).filter(Boolean))];
      if (problems.length) throw apiEx(problems.join(". "));
      const pr = calculate(lines, b.couponCode);
      if (b.couponCode && b.couponCode.trim() && !pr.couponCode) throw apiEx(pr.couponMessage);
      const signature = cartSignature(c.items, addr.addressId, pr.couponCode, b.paymentMethod);

      // Reuse the unpaid order for exactly this checkout; cancel (and release) any other.
      const pending = state.orders.filter((o) => o.email === user.email && o.status === "PENDING_PAYMENT");
      const windowStart = ldt(Date.now() - Math.max(1, EXPIRY_MINUTES - REUSE_MARGIN_MINUTES) * 60000);
      const reusable = b.paymentMethod === "COD" ? null : pending.filter((o) => o.cartSignature === signature && o.total === pr.total && o.razorpayOrderId && o.createdAt > windowStart).sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0] ?? null;
      for (const o of pending) if (o !== reusable) cancelUnpaid(o, "Replaced by a newer checkout");
      if (reusable) return json(201, rzpResponse(reusable, pr, user.email));

      // Reserve stock for every unit (single lines and boxes), in product-id order.
      const needs = new Map();
      for (const l of lines) for (const [id, n] of l.units) needs.set(id, (needs.get(id) ?? 0) + n * l.item.quantity);
      for (const [id, n] of [...needs].sort((x, y) => x[0] - y[0])) {
        const prod = findProduct(id);
        if (prod.stock < n) throw apiEx(prod.stock <= 0 ? `${prod.name} is out of stock` : `Only ${prod.stock} left of ${prod.name}`);
        prod.stock -= n;
      }
      const items = lines.map((l) => {
        const base = { orderItemId: state.nextOrderItem++, quantity: l.item.quantity, unitPrice: l.unitPrice, lineTotal: lineTotal(l), lineKey: l.key, components: [] };
        if (l.item.bundleId) {
          return { ...base, productId: null, bundleId: l.item.bundleId, productName: findBundle(l.item.bundleId).name, mrp: l.unitMrp, components: [...l.units].map(([id, n]) => { const pp = l.products.get(id); return { productId: id, productName: pp?.name ?? `Product #${id}`, quantity: n, unitPrice: pp?.price ?? null }; }) };
        }
        const prod = findProduct(l.item.productId);
        return { ...base, productId: prod.productId, bundleId: null, productName: prod.name, mrp: prod.mrp };
      });
      const o = { orderId: state.nextOrder++, email: user.email, orderNumber: `FGX-2026${crypto.randomBytes(4).toString("hex").toUpperCase()}`, items, addressId: addr.addressId, subtotal: pr.subtotal, discount: pr.couponDiscount, shipping: pr.shipping, total: pr.total, couponCode: pr.couponCode, paymentMethod: b.paymentMethod, createdAt: ldt(), paidAt: null, cartSignature: signature, payment: { method: b.paymentMethod, amount: pr.total } };
      if (b.paymentMethod === "COD") {
        o.status = "CONFIRMED"; o.payment.status = "PENDING_COD"; state.orders.push(o);
        redeem(o); removeOrderedLines(o);
        return json(201, { orderId: o.orderId, status: o.status, price: pr, razorpayKeyId: null, razorpayOrderId: null, amount: null, currency: null, customerEmail: null });
      }
      o.status = "PENDING_PAYMENT"; o.payment.status = "CREATED"; state.orders.push(o);
      o.razorpayOrderId = o.payment.razorpayOrderId = `order_${crypto.randomBytes(7).toString("hex")}`;
      return json(201, rzpResponse(o, pr, user.email)); // the cart is left alone until payment is verified
    }
    if (req.method === "POST" && p === "/api/payments/verify") {
      const b = body();
      const errs = {}; for (const [k, f] of [["razorpay_order_id", "razorpayOrderId"], ["razorpay_payment_id", "razorpayPaymentId"], ["razorpay_signature", "razorpaySignature"]]) if (!b[k] || !String(b[k]).trim()) errs[f] = "must not be blank";
      if (Object.keys(errs).length) return json(400, errs);
      const expected = crypto.createHmac("sha256", RZP_SECRET).update(`${b.razorpay_order_id}|${b.razorpay_payment_id}`).digest("hex");
      if (expected !== b.razorpay_signature) throw apiEx("Payment verification failed");
      const o = state.orders.find((x) => x.razorpayOrderId === b.razorpay_order_id);
      if (!o || o.email !== user.email) throw notFound("Order", "razorpayOrderId", b.razorpay_order_id); // someone else's order: "not found"
      markPaid(o, b.razorpay_payment_id, b.razorpay_signature);
      return json(200, { orderId: o.orderId, status: o.status, price: null, razorpayKeyId: null, razorpayOrderId: null, amount: null, currency: null, customerEmail: null });
    }

    /* orders + invoices */
    if (req.method === "GET" && p === "/api/orders") return json(200, state.orders.filter((o) => o.email === user.email).sort((a, b) => b.orderId - a.orderId).map(orderDTO));
    if (req.method === "GET" && (mm = m(/^\/api\/orders\/([^/]+)$/))) {
      const id = longVar(mm[1], "orderId");
      const o = state.orders.find((x) => x.orderId === id);
      if (!o || o.email !== user.email) throw notFound("Order", "orderId", id);
      return json(200, orderDTO(o));
    }
    const invoice = (o) => {
      if (o.status === "PENDING_PAYMENT" || o.status === "CANCELLED") throw apiEx("An invoice is only available for confirmed orders");
      res.writeHead(200, { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="ForgeX-invoice-${o.orderId}.pdf"` });
      res.end(minimalPdf(`invoice ${o.orderNumber}`));
    };
    if (req.method === "GET" && (mm = m(/^\/api\/orders\/([^/]+)\/invoice$/))) {
      const id = longVar(mm[1], "orderId");
      const o = state.orders.find((x) => x.orderId === id);
      if (!o || o.email !== user.email) throw notFound("Order", "orderId", id);
      return invoice(o);
    }

    /* admin */
    if (req.method === "GET" && p === "/api/admin/orders") return json(200, [...state.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.orderId - a.orderId).map(orderDTO));
    if (req.method === "PATCH" && (mm = m(/^\/api\/admin\/orders\/([^/]+)\/status$/))) {
      const id = longVar(mm[1], "orderId");
      const o = state.orders.find((x) => x.orderId === id);
      if (!o) throw notFound("Order", "orderId", id);
      const s = url.searchParams.get("status");
      if (!s || !["PENDING_PAYMENT", "PAID", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"].includes(s)) throw apiEx("Invalid value for 'status'.");
      if (!(ALLOWED[o.status] ?? []).includes(s)) throw apiEx(`Cannot move order from ${o.status} to ${s}`);
      o.status = s;
      return json(200, orderDTO(o));
    }
    if (req.method === "GET" && (mm = m(/^\/api\/admin\/orders\/([^/]+)\/invoice$/))) {
      const id = longVar(mm[1], "orderId");
      const o = state.orders.find((x) => x.orderId === id);
      if (!o) throw notFound("Order", "orderId", id);
      return invoice(o);
    }
    const productFrom = (b, base = {}) => ({ ...base, name: b.name, slug: b.slug, description: b.description, category: b.category, gender: b.gender, fragranceFamily: b.fragranceFamily, mrp: b.mrp, price: b.price, stock: b.stock });
    const checkProduct = (pr, id) => {
      // Column limits, NOT NULL and the unique slug are database constraints: DataIntegrityViolation → 409.
      if (!pr.name || pr.name.length > 100 || !pr.slug || pr.slug.length > 120 || (pr.description && pr.description.length > 2000)) throw conflict(INTEGRITY);
      if (state.products.some((x) => x.slug === pr.slug && x.productId !== id)) throw conflict(INTEGRITY);
    };
    if (req.method === "POST" && p === "/api/admin/products") {
      const b = body(); const pr = productFrom(b, { image: b.image ?? null, active: b.active ?? true });
      checkProduct(pr, -1);
      pr.productId = state.nextProduct++; state.products.push(pr);
      return json(201, productDTO(pr));
    }
    if (req.method === "PUT" && (mm = m(/^\/api\/admin\/products\/([^/]+)$/))) {
      const prod = findProduct(longVar(mm[1], "productId")); if (!prod) throw notFound("Product", "productId", mm[1]);
      const b = body(); const next = productFrom(b, { ...prod, active: b.active ?? prod.active });
      checkProduct(next, prod.productId);
      Object.assign(prod, next);
      return json(200, productDTO(prod));
    }
    if (req.method === "PUT" && (mm = m(/^\/api\/admin\/products\/([^/]+)\/image$/))) {
      const prod = findProduct(longVar(mm[1], "productId")); if (!prod) throw notFound("Product", "productId", mm[1]);
      if (raw.length > 1024 * 1024 + 2048) throw api(413, "That file is too large."); // spring.servlet.multipart.max-file-size default 1MB
      const type = (req.headers["content-type"] || "");
      const boundary = type.split("boundary=")[1];
      if (!type.startsWith("multipart/form-data") || !boundary) throw new HttpErr(500, { timestamp: new Date().toISOString(), status: 500, error: "Internal Server Error", path: p });
      const part = raw.toString("latin1").split(`--${boundary}`).find((x) => x.includes('name="image"'));
      if (!part) throw new HttpErr(400, { status: 400, error: "Bad Request", message: "Required part 'image' is not present.", path: p });
      const [head, ...rest] = part.split("\r\n\r\n");
      const bytes = Buffer.from(rest.join("\r\n\r\n").replace(/\r\n$/, ""), "latin1");
      const ext = /image\/png/.test(head) ? "png" : /image\/webp/.test(head) ? "webp" : "jpg";
      fs.mkdirSync(UPLOADS, { recursive: true });
      const name = `upload-${prod.productId}-${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(UPLOADS, name), bytes);
      prod.image = `http://localhost:${PORT}/media/${name}`; // stands in for Cloudinary's secure_url
      return json(200, productDTO(prod));
    }
    /* admin bundles (BundleController / BundleService) */
    const applyBundle = (b, dto) => {
      const name = (dto.name ?? "").trim(), slug = (dto.slug ?? "").trim();
      if (!name || name.length > 100) throw apiEx("Name is required (100 characters at most)");
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 120) throw apiEx("Slug must be lowercase letters, numbers and single hyphens (120 characters at most)");
      if (dto.itemCount == null || dto.itemCount < 1 || dto.itemCount > 10) throw apiEx("A box holds 1 to 10 products");
      if (dto.price == null || dto.price <= 0) throw apiEx("Price must be more than zero (in paise)");
      if (dto.description != null && dto.description.length > 1000) throw apiEx("Description must be 1000 characters at most");
      Object.assign(b, { name, slug, description: dto.description ?? null, itemCount: dto.itemCount, price: dto.price, allowedCategory: dto.allowedCategory ?? null, allowRepeats: dto.allowRepeats === true, active: dto.active == null || dto.active === true, image: dto.image ?? null });
    };
    if (req.method === "GET" && p === "/api/admin/bundles") return json(200, state.bundles.map(bundleDTO));
    if (req.method === "POST" && p === "/api/admin/bundles") {
      const b = { bundleId: 0 }; applyBundle(b, body());
      if (state.bundles.some((x) => x.slug === b.slug)) throw conflict(`A box with the slug '${b.slug}' already exists`);
      b.bundleId = state.nextBundle++; state.bundles.push(b);
      return json(201, bundleDTO(b));
    }
    if (req.method === "PUT" && (mm = m(/^\/api\/admin\/bundles\/([^/]+)$/))) {
      const b = findBundle(longVar(mm[1], "bundleId")); if (!b) throw notFound("Bundle", "bundleId", mm[1]);
      const old = b.slug; applyBundle(b, body());
      if (b.slug !== old && state.bundles.some((x) => x !== b && x.slug === b.slug)) throw conflict(`A box with the slug '${b.slug}' already exists`);
      return json(200, bundleDTO(b));
    }
    if (req.method === "GET" && p === "/api/admin/coupons") return json(200, state.coupons);
    if (req.method === "POST" && p === "/api/admin/coupons") {
      const b = body();
      const errs = {}; if (!b.code || !String(b.code).trim()) errs.code = "must not be blank"; if (!b.type) errs.type = "must not be null"; if (b.value == null) errs.value = "must not be null"; else if (!(b.value > 0)) errs.value = "must be greater than 0";
      if (Object.keys(errs).length) return json(400, errs);
      const code = String(b.code).trim().toUpperCase();
      if (state.coupons.some((c) => c.code.toUpperCase() === code)) throw apiEx(`Coupon code already exists: ${code}`);
      if (b.type === "PERCENT" && (b.value < 1 || b.value > 90)) throw apiEx("Percent coupons must be between 1 and 90");
      if (b.validFrom && b.validTo && b.validTo < b.validFrom) throw apiEx("validTo must be after validFrom");
      const c = { couponId: state.nextCoupon++, code, type: b.type, value: b.value, minOrderPaise: b.minOrderPaise ?? null, maxDiscountPaise: b.maxDiscountPaise ?? null, usageLimit: b.usageLimit ?? null, usedCount: 0, validFrom: b.validFrom ?? null, validTo: b.validTo ?? null, active: b.active ?? true };
      state.coupons.push(c);
      return json(201, c);
    }
    if ((mm = m(/^\/api\/admin\/coupons\/([^/]+)$/))) {
      const c = state.coupons.find((x) => x.couponId === longVar(mm[1], "id")); if (!c) throw notFound("Coupon", "couponId", mm[1]);
      if (req.method === "DELETE") { c.active = false; res.writeHead(204); return res.end(); }
      if (req.method === "PUT") {
        const b = body();
        if (b.type === "PERCENT" && (b.value < 1 || b.value > 90)) throw apiEx("Percent coupons must be between 1 and 90");
        if (b.validFrom && b.validTo && b.validTo < b.validFrom) throw apiEx("validTo must be after validFrom");
        Object.assign(c, { type: b.type, value: b.value, minOrderPaise: b.minOrderPaise ?? null, maxDiscountPaise: b.maxDiscountPaise ?? null, usageLimit: b.usageLimit ?? null, validFrom: b.validFrom ?? null, validTo: b.validTo ?? null });
        if (b.active != null) c.active = b.active;
        return json(200, c);
      }
    }
    return json(404, { status: 404, error: "Not Found", path: p });
  } catch (e) {
    if (snap) restore(snap); // roll back, like a failed @Transactional method
    if (e instanceof HttpErr) return json(e.status, e.body);
    console.error(e);
    // Unhandled errors now reach Spring Boot's /error page (permitted), so they are 500s, not 401s.
    return json(500, { timestamp: new Date().toISOString(), status: 500, error: "Internal Server Error", path: p });
  }
}).listen(PORT, () => console.log("ForgeX test double on", PORT));
