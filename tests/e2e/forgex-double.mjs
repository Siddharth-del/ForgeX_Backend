// Test double of the ForgeX Spring Boot backend, written from its source code, for browser-testing
// the storefront and admin panel where the real backend can't be built (Maven Central is blocked).
// Mirrors: endpoint paths, methods, DTO field names, status codes, role rules, checkout maths,
// Razorpay signature verification, order transitions, and the "unhandled error becomes 401" quirk.
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
const FREE_ABOVE = 149900, SHIP = 9900;
const FIXTURES = path.join(path.dirname(new URL(import.meta.url).pathname), "fixtures");
// Uploaded images go to a temp folder (stands in for Cloudinary) so the project folder stays clean.
const UPLOADS = path.join(os.tmpdir(), "forgex-double-uploads");

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
    carts: new Map(), // email -> { cartId, items: [{productId, quantity}] }
    nextCart: 1,
    addresses: [], // {addressId, ..., userEmail}
    nextAddress: 1,
    orders: [],
    nextOrder: 1,
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
const ldt = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 23); // LocalDateTime
const discountOf = (p) => (!p.mrp || !p.price ? 0 : Math.trunc(((p.mrp - p.price) * 100) / p.mrp));
const productDTO = (p, quantity = null) => ({ productId: p.productId, name: p.name, slug: p.slug, description: p.description, category: p.category, gender: p.gender, fragranceFamily: p.fragranceFamily, quantity, mrp: p.mrp, price: p.price, discount: discountOf(p), stock: p.stock, image: p.image, active: p.active });
const findProduct = (id) => state.products.find((p) => p.productId === id);
class HttpErr extends Error { constructor(status, body) { super("http"); this.status = status; this.body = body; } }
const apiEx = (message) => new HttpErr(400, { message, status: false });
const notFound = (res, field, val) => new HttpErr(404, { message: `${res} not found with ${field}: ${val}`, status: false });
// Unhandled exceptions are forwarded to /error, which Spring Security rejects for stateless JWT requests.
const masked = () => new HttpErr(401, { status: 401, error: "Unauthorized", message: "Full authentication is required to access this resource", path: "/error" });

function cartFor(email) {
  let c = state.carts.get(email);
  if (!c) { c = { cartId: state.nextCart++, items: [] }; state.carts.set(email, c); }
  return c;
}
function cartDTO(c) {
  const products = c.items.map((i) => productDTO(findProduct(i.productId), i.quantity));
  const total = c.items.reduce((s, i) => s + findProduct(i.productId).price * i.quantity, 0);
  return { cartId: c.cartId, totalPrice: total, products };
}
function checkQty(p, q) {
  if (q > 10) throw apiEx(`You can add at most 10 of ${p.name}`);
  const stock = p.stock ?? 0;
  if (q > stock) throw apiEx(stock === 0 ? `${p.name} is out of stock` : `Only ${stock} left of ${p.name}`);
}
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
function price(items, coupon) {
  let subtotal = 0, mrpTotal = 0;
  for (const i of items) { const p = findProduct(i.productId); subtotal += p.price * i.quantity; mrpTotal += (p.mrp ?? p.price) * i.quantity; }
  const c = evaluateCoupon(coupon, subtotal);
  const after = subtotal - c.discount;
  const shipping = after >= FREE_ABOVE || !items.length ? 0 : SHIP;
  return { subtotal, mrpTotal, productSavings: mrpTotal - subtotal, couponDiscount: c.discount, couponCode: c.code, couponMessage: c.message, shipping, total: after + shipping };
}
function orderDTO(o) {
  return { orderId: o.orderId, email: o.email, orderNumber: o.orderNumber, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.payment.status, subtotal: o.subtotal, discount: o.discount, shipping: o.shipping, total: o.total, couponCode: o.couponCode, addressId: o.addressId, createdAt: o.createdAt, paidAt: o.paidAt, orderItems: o.items };
}
function redeemAndClear(o) {
  if (o.couponCode) { const c = state.coupons.find((x) => x.code === o.couponCode); if (c) c.usedCount++; }
  const cart = state.carts.get(o.email); if (cart) cart.items = [];
}
function markPaid(o, payId, sig) {
  if (o.status === "PAID") return;
  if (o.status === "CANCELLED") { o.payment.razorpayPaymentId = payId; o.payment.status = "REFUNDED"; o.status = "REFUNDED"; return; }
  if (o.status !== "PENDING_PAYMENT") return;
  o.status = "PAID"; o.paidAt = ldt(); o.payment.status = "CAPTURED"; o.payment.razorpayPaymentId = payId; if (sig) o.payment.razorpaySignature = sig;
  redeemAndClear(o);
}
const ALLOWED = { PAID: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["SHIPPED", "CANCELLED"], SHIPPED: ["DELIVERED"] };
const minimalPdf = (title) => Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]>>endobj\n% ${title}\ntrailer<</Root 1 0 R>>\n%%EOF\n`);

/* ---------------------------------------------------------------- server */
const ALLOWED_ORIGINS = ["http://localhost:5173", "http://localhost:4173"];
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  const origin = req.headers.origin;
  // Like the real backend: no CORS headers (its CORS bean is never applied). CORS_MODE=on to compare.
  if (process.env.CORS_MODE === "on" && origin && ALLOWED_ORIGINS.includes(origin)) { res.setHeader("Access-Control-Allow-Origin", origin); res.setHeader("Access-Control-Allow-Credentials", "true"); }
  if (req.method === "OPTIONS") { res.writeHead(200); return res.end(); }
  const chunks = []; for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  const json = (st, o) => { res.writeHead(st, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
  const text = (st, s) => { res.writeHead(st, { "Content-Type": "text/plain;charset=UTF-8" }); res.end(s); };
  const auth = req.headers.authorization || "";
  const email = auth.startsWith("Bearer") ? verifyJwt(auth.slice(7)) : null;
  const user = email ? state.users.get(email) : null;
  state.log.push(`${req.method} ${p}${url.search} ${user ? user.email : "anon"}`);
  const body = () => { try { return raw.length ? JSON.parse(raw.toString()) : {}; } catch { throw new HttpErr(400, { message: "Malformed JSON" }); } };
  const m = (re) => p.match(re);

  try {
    // test hooks
    if (p === "/__log") return json(200, state.log);
    if (p === "/__reset") { seed(); return json(200, { ok: true }); }
    if (p === "/__state") return json(200, { orders: state.orders, products: state.products, carts: [...state.carts.entries()], coupons: state.coupons });
    if (p === "/__expire") { for (const o of state.orders) if (o.status === "PENDING_PAYMENT") { for (const i of o.items) findProduct(i.productId).stock += i.quantity; o.status = "CANCELLED"; o.payment.status = "FAILED"; } return json(200, { ok: true }); }
    if (p.startsWith("/media/")) {
      const name = path.basename(p);
      const f = path.join(name.startsWith("upload-") ? UPLOADS : FIXTURES, name);
      if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": f.endsWith(".png") ? "image/png" : f.endsWith(".webp") ? "image/webp" : "image/jpeg" }); return res.end(fs.readFileSync(f));
    }

    /* ---------- auth (unchanged from the earlier double) */
    if (req.method === "POST" && p === "/api/auth/signin") {
      const b = body(); const u = state.users.get(String(b.email || "").trim().toLowerCase());
      if (!b.email || !b.password) return json(400, { email: b.email ? undefined : "must not be blank", password: b.password ? undefined : "must not be blank" });
      if (!u || u.password !== b.password) return json(401, { message: "Invalid email or password", status: false });
      return json(200, { id: u.id, username: u.username, email: u.email, roles: u.roles, jwtToken: sign(u.email) });
    }
    if (req.method === "POST" && p === "/api/auth/signup") {
      const b = body(); const e = String(b.email || "").trim().toLowerCase();
      if (state.users.has(e)) return json(400, { message: "Email is already in use" });
      if ([...state.users.values()].some((u) => u.username === b.username)) return json(400, { message: "Username is already taken" });
      state.users.set(e, { id: state.nextUser++, username: b.username, email: e, password: b.password, roles: ["ROLE_USER"] });
      return json(200, { message: "User registered successfully" });
    }
    if (req.method === "GET" && p === "/api/auth/user") {
      if (!user) throw masked();
      return json(200, { id: user.id, username: user.username, email: user.email, roles: user.roles, jwtToken: null });
    }
    if (req.method === "POST" && p === "/api/auth/signout") return json(200, { message: "You've been signed out" });

    /* ---------- public */
    if (req.method === "GET" && p === "/api/public/products") {
      const page = Number(url.searchParams.get("pageNumber") ?? 0), size = Number(url.searchParams.get("pageSize") ?? 50);
      const all = [...state.products].sort((a, b) => a.productId - b.productId);
      const content = all.slice(page * size, page * size + size).map((x) => productDTO(x));
      const totalPages = Math.ceil(all.length / size);
      return json(200, { content, pageNumber: page, pageSize: size, totalElements: all.length, totalPages, lastPage: page >= totalPages - 1 });
    }
    if (m(/^\/api\/public\/products\/(keyword|category|gender)\//)) return json(302, { content: [] }); // HttpStatus.FOUND, as the source does
    if (req.method === "DELETE" && m(/^\/api\/public\/products\/(\d+)$/)) {
      const id = Number(m(/(\d+)$/)[1]); const prod = findProduct(id);
      if (!prod) throw notFound("Product", "productId", id);
      if (state.orders.some((o) => o.items.some((i) => i.productId === id)) || [...state.carts.values()].some((c) => c.items.some((i) => i.productId === id))) throw masked(); // FK violation → 500 → masked
      state.products = state.products.filter((x) => x.productId !== id);
      return text(200, "Product deleted successfully");
    }
    if (p.startsWith("/api/public/")) return json(404, { status: 404, error: "Not Found", path: p });

    /* ---------- everything below needs a signed-in user */
    if (!user) return json(401, { status: 401, error: "Unauthorized", message: "Full authentication is required to access this resource", path: p });
    const isAdmin = user.roles.includes("ROLE_ADMIN");
    if (p.startsWith("/api/admin/") && !isAdmin) return json(403, { status: 403, error: "Forbidden", path: p });

    /* cart */
    let mm;
    if (req.method === "POST" && (mm = m(/^\/api\/carts\/products\/(\d+)\/quantity\/(-?\d+)$/))) {
      const id = Number(mm[1]), q = Number(mm[2]);
      if (q < 1) throw apiEx("Quantity must be at least 1");
      const c = cartFor(user.email); const prod = findProduct(id);
      if (!prod) throw notFound("Product", "productId", id);
      if (prod.active !== true) throw apiEx(`${prod.name} is not available`);
      const item = c.items.find((i) => i.productId === id); const nq = (item?.quantity ?? 0) + q;
      checkQty(prod, nq);
      if (item) item.quantity = nq; else c.items.push({ productId: id, quantity: nq });
      return json(201, cartDTO(c));
    }
    if (req.method === "GET" && p === "/api/carts/users/cart") return json(200, cartDTO(cartFor(user.email)));
    if (req.method === "PUT" && (mm = m(/^\/api\/cart\/products\/(\d+)\/quantity\/(\w+)$/))) {
      const id = Number(mm[1]), delta = mm[2].toLowerCase() === "delete" ? -1 : 1;
      const c = cartFor(user.email); const item = c.items.find((i) => i.productId === id);
      if (!item) throw notFound("Product in cart", "productId", id);
      const nq = item.quantity + delta;
      if (nq <= 0) c.items = c.items.filter((i) => i !== item); else { checkQty(findProduct(id), nq); item.quantity = nq; }
      return json(200, cartDTO(c));
    }
    if (req.method === "DELETE" && (mm = m(/^\/api\/carts\/(\d+)\/product\/(\d+)$/))) {
      const c = [...state.carts.entries()].find(([, v]) => v.cartId === Number(mm[1]));
      if (!c || c[0] !== user.email) throw notFound("Cart", "cartId", mm[1]);
      const item = c[1].items.find((i) => i.productId === Number(mm[2]));
      if (!item) throw notFound("Product in cart", "productId", mm[2]);
      c[1].items = c[1].items.filter((i) => i !== item);
      return text(200, `${findProduct(item.productId).name} removed from cart`);
    }

    /* addresses (entity validation failures surface as masked 401s) */
    const aDTO = (a) => ({ addressId: a.addressId, street: a.street, buildingName: a.buildingName, city: a.city, state: a.state, country: a.country, pincode: a.pincode, phoneNumber: a.phoneNumber });
    if (req.method === "POST" && p === "/api/addresses") {
      const b = body();
      const ok = (k, n) => typeof b[k] === "string" && b[k].trim().length >= n;
      if (!ok("street", 5) || !ok("buildingName", 5) || !ok("city", 4) || !ok("state", 2) || !ok("country", 2) || !ok("pincode", 5) || !(typeof b.phoneNumber === "string" && b.phoneNumber.length >= 10 && b.phoneNumber.length <= 15)) throw masked();
      const a = { addressId: state.nextAddress++, street: b.street, buildingName: b.buildingName, city: b.city, state: b.state, country: b.country, pincode: b.pincode, phoneNumber: b.phoneNumber, userEmail: user.email };
      state.addresses.push(a);
      return json(201, aDTO(a));
    }
    if (req.method === "GET" && p === "/api/users/addresses") return json(200, state.addresses.filter((a) => a.userEmail === user.email).map(aDTO));
    if (req.method === "GET" && (mm = m(/^\/api\/addresses\/(\d+)$/))) {
      const a = state.addresses.find((x) => x.addressId === Number(mm[1]));
      if (!a) throw notFound("Address", "AddressId", mm[1]);
      return json(200, aDTO(a));
    }
    if (req.method === "DELETE" && (mm = m(/^\/api\/addresses\/(\d+)$/))) {
      const a = state.addresses.find((x) => x.addressId === Number(mm[1]));
      if (!a) throw notFound("Address", "AddressId", mm[1]);
      if (state.orders.some((o) => o.addressId === a.addressId)) throw masked(); // FK from orders
      state.addresses = state.addresses.filter((x) => x !== a);
      return text(200, `Address deleted Successfully with addressId: ${a.addressId}`);
    }

    /* checkout */
    if (req.method === "GET" && p === "/api/checkout/preview") {
      const c = state.carts.get(user.email); if (!c) throw notFound("Cart", "email", user.email);
      return json(200, price(c.items, url.searchParams.get("coupon")));
    }
    if (req.method === "POST" && p === "/api/checkout") {
      const b = body();
      if (b.addressId == null || !b.paymentMethod) return json(400, { ...(b.addressId == null ? { addressId: "must not be null" } : {}), ...(!b.paymentMethod ? { paymentMethod: "must not be null" } : {}) });
      if (!["RAZORPAY", "COD", "UPI"].includes(b.paymentMethod)) throw new HttpErr(400, { status: 400, error: "Bad Request", path: p });
      const c = state.carts.get(user.email); if (!c) throw notFound("Cart", "email", user.email);
      if (!c.items.length) throw apiEx("Your cart is empty");
      const addr = state.addresses.find((a) => a.addressId === Number(b.addressId));
      if (!addr) throw notFound("Address", "addressId", b.addressId);
      if (addr.userEmail !== user.email) throw apiEx("Address does not belong to you");
      const pr = price(c.items, b.couponCode);
      if (b.couponCode && b.couponCode.trim() && !pr.couponCode) throw apiEx(pr.couponMessage);
      const items = [];
      for (const ci of c.items) {
        const prod = findProduct(ci.productId);
        if (prod.active !== true) throw apiEx(`${prod.name} is no longer available`);
        if (prod.stock < ci.quantity) throw apiEx(`Only ${prod.stock} left of ${prod.name}`);
      }
      for (const ci of c.items) { const prod = findProduct(ci.productId); prod.stock -= ci.quantity; items.push({ orderItemId: items.length + 1, productId: prod.productId, productName: prod.name, quantity: ci.quantity, unitPrice: prod.price, mrp: prod.mrp, lineTotal: prod.price * ci.quantity }); }
      const o = { orderId: state.nextOrder++, email: user.email, orderNumber: `FGX-2026${crypto.randomBytes(4).toString("hex").toUpperCase()}`, items, addressId: addr.addressId, subtotal: pr.subtotal, discount: pr.couponDiscount, shipping: pr.shipping, total: pr.total, couponCode: pr.couponCode, paymentMethod: b.paymentMethod, createdAt: ldt(), paidAt: null, payment: { method: b.paymentMethod } };
      const out = { orderId: o.orderId, status: null, price: pr, razorpayKeyId: null, razorpayOrderId: null, amount: null, currency: null, customerEmail: null };
      if (b.paymentMethod === "COD") { o.status = "CONFIRMED"; o.payment.status = "PENDING_COD"; state.orders.push(o); redeemAndClear(o); }
      else {
        o.status = "PENDING_PAYMENT"; o.payment.status = "CREATED"; state.orders.push(o);
        o.razorpayOrderId = `order_${crypto.randomBytes(7).toString("hex")}`;
        Object.assign(out, { razorpayKeyId: RZP_KEY_ID, razorpayOrderId: o.razorpayOrderId, amount: o.total, currency: "INR", customerEmail: user.email });
      }
      out.status = o.status;
      return json(201, out);
    }
    if (req.method === "POST" && p === "/api/payments/verify") {
      const b = body();
      if (!b.razorpay_order_id || !b.razorpay_payment_id || !b.razorpay_signature) return json(400, { ...(!b.razorpay_order_id ? { razorpayOrderId: "must not be blank" } : {}) });
      const expected = crypto.createHmac("sha256", RZP_SECRET).update(`${b.razorpay_order_id}|${b.razorpay_payment_id}`).digest("hex");
      if (expected !== b.razorpay_signature) throw apiEx("Payment verification failed");
      const o = state.orders.find((x) => x.razorpayOrderId === b.razorpay_order_id);
      if (!o) throw notFound("Order", "razorpayOrderId", b.razorpay_order_id);
      if (o.email !== user.email) throw apiEx("This order does not belong to you");
      markPaid(o, b.razorpay_payment_id, b.razorpay_signature);
      return json(200, { orderId: o.orderId, status: o.status, price: null, razorpayKeyId: null, razorpayOrderId: null, amount: null, currency: null, customerEmail: null });
    }

    /* orders + invoices */
    if (req.method === "GET" && p === "/api/orders") return json(200, state.orders.filter((o) => o.email === user.email).sort((a, b) => b.orderId - a.orderId).map(orderDTO));
    if (req.method === "GET" && (mm = m(/^\/api\/orders\/(\d+)$/))) {
      const o = state.orders.find((x) => x.orderId === Number(mm[1]));
      if (!o || o.email !== user.email) throw notFound("Order", "orderId", mm[1]);
      return json(200, orderDTO(o));
    }
    const invoice = (o) => {
      if (o.status === "PENDING_PAYMENT" || o.status === "CANCELLED") throw apiEx("An invoice is only available for confirmed orders");
      res.writeHead(200, { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="ForgeX-invoice-${o.orderId}.pdf"` });
      res.end(minimalPdf(`invoice ${o.orderNumber}`));
    };
    if (req.method === "GET" && (mm = m(/^\/api\/orders\/(\d+)\/invoice$/))) {
      const o = state.orders.find((x) => x.orderId === Number(mm[1]));
      if (!o || o.email !== user.email) throw notFound("Order", "orderId", mm[1]);
      return invoice(o);
    }

    /* admin */
    if (req.method === "GET" && p === "/api/admin/orders") return json(200, [...state.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.orderId - a.orderId).map(orderDTO));
    if (req.method === "PATCH" && (mm = m(/^\/api\/admin\/orders\/(\d+)\/status$/))) {
      const o = state.orders.find((x) => x.orderId === Number(mm[1]));
      if (!o) throw notFound("Order", "orderId", mm[1]);
      const s = url.searchParams.get("status");
      if (!s || !["PENDING_PAYMENT", "PAID", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"].includes(s)) throw new HttpErr(400, { status: 400, error: "Bad Request", path: p });
      if (!(ALLOWED[o.status] ?? []).includes(s)) throw apiEx(`Cannot move order from ${o.status} to ${s}`);
      o.status = s;
      return json(200, orderDTO(o));
    }
    if (req.method === "GET" && (mm = m(/^\/api\/admin\/orders\/(\d+)\/invoice$/))) {
      const o = state.orders.find((x) => x.orderId === Number(mm[1]));
      if (!o) throw notFound("Order", "orderId", mm[1]);
      return invoice(o);
    }
    const productFrom = (b, base = {}) => ({ ...base, name: b.name, slug: b.slug, description: b.description, category: b.category, gender: b.gender, fragranceFamily: b.fragranceFamily, mrp: b.mrp, price: b.price, stock: b.stock });
    const checkProduct = (pr, id) => {
      if (!pr.name || pr.name.length > 100 || !pr.slug || pr.slug.length > 120 || (pr.description && pr.description.length > 2000)) throw masked();
      if (state.products.some((x) => x.slug === pr.slug && x.productId !== id)) throw masked(); // unique constraint
    };
    if (req.method === "POST" && p === "/api/admin/products") {
      const b = body(); const pr = productFrom(b, { image: b.image ?? null, active: b.active ?? true });
      checkProduct(pr, -1);
      pr.productId = state.nextProduct++; state.products.push(pr);
      return json(201, productDTO(pr));
    }
    if (req.method === "PUT" && (mm = m(/^\/api\/admin\/products\/(\d+)$/))) {
      const prod = findProduct(Number(mm[1])); if (!prod) throw notFound("Product", "productId", mm[1]);
      const b = body(); const next = productFrom(b, { ...prod, active: b.active ?? prod.active });
      checkProduct(next, prod.productId);
      Object.assign(prod, next);
      return json(200, productDTO(prod));
    }
    if (req.method === "PUT" && (mm = m(/^\/api\/admin\/products\/(\d+)\/image$/))) {
      const prod = findProduct(Number(mm[1])); if (!prod) throw notFound("Product", "productId", mm[1]);
      if (raw.length > 1024 * 1024 + 2048) throw masked(); // spring.servlet.multipart.max-file-size default 1MB
      const type = (req.headers["content-type"] || "");
      const boundary = type.split("boundary=")[1];
      if (!type.startsWith("multipart/form-data") || !boundary) throw masked();
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
    if ((mm = m(/^\/api\/admin\/coupons\/(\d+)$/))) {
      const c = state.coupons.find((x) => x.couponId === Number(mm[1])); if (!c) throw notFound("Coupon", "couponId", mm[1]);
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
    if (e instanceof HttpErr) return json(e.status, e.body);
    console.error(e);
    return json(401, { status: 401, error: "Unauthorized", message: "Full authentication is required to access this resource", path: "/error" });
  }
}).listen(PORT, () => console.log("ForgeX test double on", PORT));
