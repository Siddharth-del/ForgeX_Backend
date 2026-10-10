// Build Your Own Box, cart ownership and payment/cart consistency, against the ForgeX test double
// (see tests/e2e/README.md). API checks first, then the storefront in Chromium.
import crypto from "node:crypto";
import { chromium } from "playwright";
import { API, APP, RZP_SECRET, RZP_WEBHOOK_SECRET, SHOTS, apiSignIn, check, collectConsole, failed, fakeRazorpay, reset, serverCartLines, serverState, setServerCart, signInPage } from "./lib.mjs";

const SHOT = `${SHOTS}/box`;
const H = (t) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });
const ADDRESS = { buildingName: "Flat 4B, Rose Court", street: "MG Road, Indiranagar", city: "Bengaluru", state: "Karnataka", country: "India", pincode: "560038", phoneNumber: "9876543210" };
const hmac = (data, secret) => crypto.createHmac("sha256", secret).update(data).digest("hex");
const cartOf = async (email) => (await serverState()).carts.find(([e]) => e === email)?.[1] ?? { items: [] };
const ordersOf = async (email = "user1@example.com") => (await serverState()).orders.filter((o) => o.email === email);
const stockOf = async (id) => (await serverState()).products.find((p) => p.productId === id).stock;
const call = async (method, path, token, body) => {
  const r = await fetch(`${API}${path}`, { method, headers: token ? H(token) : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* text body */ }
  return { status: r.status, json, text };
};

/* ================================================================ API */
await reset();
{
  const a = (await apiSignIn("user1@example.com", "password1")).jwtToken;
  const admin = (await apiSignIn("admin@example.com", "adminPass")).jwtToken;

  // CORS: only configured origins get a preflight answer, and never with a wildcard.
  const ok = await fetch(`${API}/api/carts/users/cart`, { method: "OPTIONS", headers: { Origin: "http://localhost:5173", "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "authorization,content-type" } });
  check(ok.status === 200 && ok.headers.get("access-control-allow-origin") === "http://localhost:5173" && ok.headers.get("access-control-allow-credentials") === "true", `CORS preflight from the storefront origin is allowed with credentials (${ok.status})`);
  const bad = await fetch(`${API}/api/carts/users/cart`, { method: "OPTIONS", headers: { Origin: "https://attacker.example", "Access-Control-Request-Method": "GET" } });
  check(bad.status === 403 && !bad.headers.get("access-control-allow-origin"), `CORS preflight from an unknown origin is refused (${bad.status})`);

  // Admin-only listing.
  check((await call("GET", "/api/carts", null)).status === 401, "GET /api/carts without a token → 401");
  check((await call("GET", "/api/carts", a)).status === 403, "GET /api/carts as a customer → 403");
  check((await call("GET", "/api/carts", admin)).status === 200, "GET /api/carts as admin → 200");

  // Quantity operations.
  await call("POST", "/api/carts/products/1/quantity/1", a);
  const unknown = await call("PUT", "/api/cart/products/1/quantity/explode", a);
  check(unknown.status === 400 && /Unknown quantity operation/.test(unknown.json?.message), `unknown quantity operation → 400 (${unknown.status})`);
  check((await call("PUT", "/api/cart/products/1/quantity/add", a)).json?.products?.[0]?.quantity === 2, "'add' raises the quantity by one");
  check((await call("PUT", "/api/cart/products/1/quantity/delete", a)).json?.products?.[0]?.quantity === 1, "'delete' lowers it by one");
  check((await call("POST", "/api/carts/products/NaN/quantity/1", a)).status === 400, "a non-numeric product id is a 400, not a 401/500");
  check((await call("POST", "/api/carts/products/4/quantity/1", a)).json?.message === "Sea Linen is out of stock", "an out-of-stock product can't be added");
  check((await call("POST", "/api/carts/products/5/quantity/1", a)).json?.message === "Hidden Draft is not available", "an inactive product can't be added");
  check((await call("POST", "/api/carts/products/999/quantity/1", a)).status === 404, "an unknown product is a 404");

  // Box validation: the server decides what a valid box is.
  const box = (ids, quantity = 1, token = a) => call("POST", "/api/carts/bundles/1", token, { productIds: ids, quantity });
  check((await box([1, 3])).json?.message === "Choose exactly 3 fragrances for Build Your Own Box", "a box with too few fragrances is refused");
  check((await box([1, 1, 3])).status === 400, "the same fragrance twice is refused (no repeats)");
  check((await box([1, 3, 4])).json?.message === "Sea Linen is out of stock", "a box with an out-of-stock fragrance is refused");
  check((await box([1, 3, 5])).json?.message === "Hidden Draft is not available", "a box with an inactive fragrance is refused");
  check((await box([1, 3, 999])).status === 404, "a box with an unknown product is a 404");
  check((await call("POST", "/api/carts/bundles/99", a, { productIds: [1, 2, 3] })).status === 404, "an unknown box is a 404");
  check((await box([1, 3, 6], 11)).status === 400, "more than 10 boxes in one request is refused");

  // Differently filled boxes are separate lines; the same box (in any order) adds to its line.
  await box([6, 1, 3]);
  await box([3, 6, 1]);
  const two = await box([1, 2, 3]);
  const lines = two.json.bundles;
  check(lines.length === 2 && lines.map((b) => b.lineKey).sort().join(" ") === "B:1:1,2,3 B:1:1,3,6", `two box configurations stay two lines (${lines.map((b) => b.lineKey).join(", ")})`);
  check(lines.find((b) => b.lineKey === "B:1:1,3,6").quantity === 2, "the same box added twice is one line with quantity 2");
  check(two.json.totalPrice === 199900 + 3 * 179900 && lines.every((b) => b.unitPrice === 179900), `cart total is the server's price (₹${two.json.totalPrice / 100})`);

  // Totals follow the current price.
  await call("PUT", "/api/admin/products/1", admin, { ...(await serverState()).products.find((p) => p.productId === 1), price: 189900 });
  const repriced = await call("GET", "/api/carts/users/cart", a);
  check(repriced.json.totalPrice === 189900 + 3 * 179900, "after a price change the cart total uses the new price");

  // Another customer can't touch this cart's lines.
  const myLine = lines.find((b) => b.lineKey === "B:1:1,2,3");
  check((await call("PUT", `/api/carts/bundle-items/${myLine.cartItemId}/quantity/5`, admin)).status === 404, "another customer changing my box line → 404");
  check((await call("DELETE", `/api/carts/bundle-items/${myLine.cartItemId}`, admin)).status === 404, "another customer removing my box line → 404");
  check((await call("DELETE", `/api/carts/${two.json.cartId}/product/1`, admin)).status === 404, "another customer using my cart id → 404");
  check((await call("GET", "/api/carts/users/cart", a)).json.bundles.length === 2, "my cart is untouched");

  // Addresses belong to their owner.
  const addr = (await call("POST", "/api/addresses", a, ADDRESS)).json;
  check((await call("GET", `/api/addresses/${addr.addressId}`, admin)).status === 200, "admin can read a delivery address (order screens)");
  const other = (await call("POST", "/api/auth/signup", null, { username: "shopper2", email: "shopper2@example.com", password: "password2" })).status;
  const b = other === 200 ? (await apiSignIn("shopper2@example.com", "password2")).jwtToken : null;
  check(b && (await call("GET", `/api/addresses/${addr.addressId}`, b)).status === 404, "another customer reading my address → 404");
  check(b && (await call("DELETE", `/api/addresses/${addr.addressId}`, b)).status === 404, "another customer deleting my address → 404");

  // Checkout twice with the same cart → the same unpaid order; stock is reserved once.
  const before = await stockOf(3);
  const first = (await call("POST", "/api/checkout", a, { addressId: addr.addressId, paymentMethod: "RAZORPAY" })).json;
  const again = (await call("POST", "/api/checkout", a, { addressId: addr.addressId, paymentMethod: "RAZORPAY" })).json;
  check(first.orderId === again.orderId && first.razorpayOrderId === again.razorpayOrderId, "checking out twice reuses the unpaid order");
  check(first.amount === 189900 + 3 * 179900, `the charge is the server's total (₹${first.amount / 100})`);
  check((await stockOf(3)) === before - 3, "stock reserved once (Amber Nuit: 3 units for 3 boxes)");
  check((await ordersOf()).length === 1, "one order");

  // Someone else's Razorpay order can't be confirmed with my account.
  const pid = "pay_cross";
  const cross = await call("POST", "/api/payments/verify", b, { razorpay_order_id: first.razorpayOrderId, razorpay_payment_id: pid, razorpay_signature: hmac(`${first.razorpayOrderId}|${pid}`, RZP_SECRET) });
  check(cross.status === 404 && (await ordersOf())[0].status === "PENDING_PAYMENT", `verifying another customer's order → 404, still unpaid (${cross.status})`);

  // Changing the cart and checking out again replaces the old unpaid order and releases its stock.
  await call("PUT", `/api/carts/bundle-items/${myLine.cartItemId}/quantity/0`, a);
  const third = (await call("POST", "/api/checkout", a, { addressId: addr.addressId, paymentMethod: "RAZORPAY" })).json;
  const orders = await ordersOf();
  check(third.orderId !== first.orderId && orders.find((o) => o.orderId === first.orderId).status === "CANCELLED", "a different cart cancels the earlier unpaid order");
  check((await stockOf(3)) === before - 2, "its stock was released (Amber Nuit now reserved for 2 boxes)");

  // A product that is in an order can't be deleted; the order keeps its lines.
  const del = await call("DELETE", "/api/admin/products/6", admin);
  check(del.status === 409 && /past order/.test(del.json?.message), `deleting a product inside an ordered box → 409 (${del.status})`);
  check((await call("DELETE", "/api/public/products/6", a)).status === 403, "customers can't delete products on the old path either");
  check((await call("GET", `/api/orders/${third.orderId}`, a)).json.orderItems.find((i) => i.bundleId)?.components.length === 3, "the order still lists the box contents");
}

/* ================================================================ storefront */
await reset();
const browser = await chromium.launch();
const errors = [];
async function fresh({ w = 1440, h = 900, signedIn = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  collectConsole(page, errors);
  await fakeRazorpay(page);
  if (signedIn) await signInPage(page, "user1@example.com", "password1");
  return { ctx, page };
}
const cartLines = () => serverCartLines("user1@example.com");
const payButton = (page) => page.locator("main button", { hasText: /Pay securely|Resume payment|Place order/ });
async function pick(page, names) {
  for (const n of names) await page.locator("button[aria-pressed]", { hasText: n }).first().click();
  await page.getByRole("button", { name: /Add box to cart/ }).click();
  await page.getByRole("button", { name: /Select 3 more/ }).waitFor();
}
const user = await apiSignIn("user1@example.com", "password1");
await fetch(`${API}/api/addresses`, { method: "POST", headers: H(user.jwtToken), body: JSON.stringify(ADDRESS) });

/* 1. two configurations, server-priced checkout, failed payment keeps everything, success removes only what was ordered */
{
  const { ctx, page } = await fresh();
  await page.goto(APP + "/build-your-box");
  await page.getByText("Any 3 for ₹1,799").waitFor();
  await pick(page, ["Royal Oud", "Amber Nuit", "Vetiver Rain"]);
  await pick(page, ["Rose Attar", "Royal Oud", "Amber Nuit"]);
  await pick(page, ["Vetiver Rain", "Royal Oud", "Amber Nuit"]);
  let lines = await cartLines();
  check(JSON.stringify(lines) === JSON.stringify(["B:1:1,2,3x1", "B:1:1,3,6x2"]), `server cart: two box lines keyed by contents, the repeated box counted twice (${lines.join(", ")})`);
  check(await page.getByRole("button", { name: /Open bag, 3 items/ }).first().isVisible(), "navbar bag shows the server cart (3 boxes)");
  await page.screenshot({ path: `${SHOT}-builder.png`, fullPage: false });

  await page.goto(APP + "/checkout");
  await page.getByRole("radio", { checked: true }).first().waitFor();
  await page.locator("aside").getByText("Total").last().waitFor();
  const aside = await page.locator("aside").innerText();
  check(aside.includes("₹5,397") && aside.includes("Rose Attar") && aside.includes("Vetiver Rain"), "summary: 3 boxes at the server price, with their contents");
  let cart = await cartOf("user1@example.com");
  check(cart.items.length === 2 && cart.items.every((i) => i.bundleId === 1) && cart.items.map((i) => `${i.lineKey}x${i.quantity}`).sort().join(" ") === "B:1:1,2,3x1 B:1:1,3,6x2", "server cart holds both configurations with their quantities");
  await page.screenshot({ path: `${SHOT}-checkout.png`, fullPage: true });

  // A failed payment: order stays unpaid, nothing leaves the bag or the server cart.
  await page.evaluate(() => (window.__rzpMode = "fail"));
  await payButton(page).click();
  await page.getByText(/Card declined by bank/).waitFor();
  let orders = await ordersOf();
  const order = orders.at(-1);
  check(orders.length === 1 && order.status === "PENDING_PAYMENT" && order.total === 539700, `failed payment: one unpaid order for ₹${order.total / 100}`);
  check(order.items.length === 2 && order.items.every((i) => i.bundleId === 1 && i.productId === null && i.components.length === 3 && i.unitPrice === 179900), "the order records each box, its price and its contents");
  const failedEvent = JSON.stringify({ event: "payment.failed", payload: { payment: { entity: { id: "pay_failed_1", order_id: order.razorpayOrderId, error_description: "Card declined" } } } });
  const w1 = await fetch(`${API}/api/public/webhooks/razorpay`, { method: "POST", headers: { "Content-Type": "application/json", "X-Razorpay-Signature": hmac(failedEvent, RZP_WEBHOOK_SECRET) }, body: failedEvent });
  const forgedEvent = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_forged", order_id: order.razorpayOrderId } } } });
  const w2 = await fetch(`${API}/api/public/webhooks/razorpay`, { method: "POST", headers: { "Content-Type": "application/json", "X-Razorpay-Signature": "0".repeat(64) }, body: forgedEvent });
  check(w1.status === 200 && w2.status === 400, `signed 'payment.failed' webhook accepted (${w1.status}); forged 'captured' webhook refused (${w2.status})`);
  orders = await ordersOf();
  check(orders.at(-1).status === "PENDING_PAYMENT" && orders.at(-1).payment.status === "CREATED", "still unpaid after the failure and the forged webhook");
  cart = await cartOf("user1@example.com");
  check(cart.items.length === 2, "server cart untouched by the failed payment");

  // Something new goes into the cart while the order waits for payment.
  await fetch(`${API}/api/carts/products/3/quantity/1`, { method: "POST", headers: H(user.jwtToken) });
  const stockBefore = (await serverState()).products;

  // Paid from the order page: only the two ordered box lines leave the cart.
  await page.goto(APP + `/account/orders/${order.orderId}`);
  await page.getByText("Payment pending").waitFor();
  await page.evaluate(() => (window.__rzpMode = "success"));
  await page.getByRole("button", { name: /Complete payment/ }).click();
  await page.locator("main").getByText("Paid", { exact: true }).first().waitFor({ timeout: 15000 });
  orders = await ordersOf();
  check(orders.at(-1).status === "PAID" && orders.at(-1).payment.status === "CAPTURED", "verified payment → PAID");
  lines = await cartLines();
  check(JSON.stringify(lines) === JSON.stringify(["P:3x1"]), `cart keeps only what was added after the order (${lines.join(", ")})`);
  await page.getByRole("button", { name: /Open bag, 1 item\b/ }).first().waitFor();
  check(true, "navbar bag refreshed from the server after payment (1 item)");
  const stockAfter = (await serverState()).products;
  check(stockAfter.every((p) => p.stock === stockBefore.find((x) => x.productId === p.productId).stock), "paying didn't take stock again (it was reserved at checkout)");
  check((await stockOf(1)) === 9 && (await stockOf(2)) === 2 && (await stockOf(3)) === 17 && (await stockOf(6)) === 6, "stock: one unit of each chosen product per box");
  const text = await page.locator("main").innerText();
  check(text.includes("Royal Oud · Amber Nuit · Vetiver Rain") && text.includes("Royal Oud · Rose Attar · Amber Nuit"), "order page lists what's in each box");
  await page.screenshot({ path: `${SHOT}-paid.png`, fullPage: true });
  await ctx.close();
}

/* 2. signed out: building a box asks to sign in first and sends nothing; an old device bag is cleared */
{
  const { ctx, page } = await fresh({ signedIn: false });
  await page.goto(APP + "/");
  await page.evaluate(() => localStorage.setItem("cosmic-cart-v2", JSON.stringify({ state: { lines: [{ key: "box:1+3+6", productId: "box", name: "Old box", quantity: 1 }] }, version: 0 })));
  const logBefore = (await (await fetch(`${API}/__log`)).json()).length;
  await page.goto(APP + "/build-your-box");
  await page.getByText("Any 3 for ₹1,799").waitFor();
  check((await page.evaluate(() => localStorage.getItem("cosmic-cart-v2"))) === null, "the old on-device bag is cleared (the cart lives on the account now)");
  for (const n of ["Royal Oud", "Amber Nuit", "Vetiver Rain"]) await page.locator("button[aria-pressed]", { hasText: n }).first().click();
  await page.getByRole("button", { name: /Add box to cart/ }).click();
  await page.waitForURL(/\/account\?next=/);
  check(decodeURIComponent(page.url()).includes("next=/build-your-box"), "signed-out Add box → sign in, coming back to the builder");
  const log = (await (await fetch(`${API}/__log`)).json()).slice(logBefore);
  check(!log.some((l) => /\/api\/carts?\//.test(l)), `no cart request while signed out (${log.filter((l) => /cart/.test(l)).join(", ") || "none"})`);
  check(!log.some((l) => /NaN|undefined/.test(l)), "no request with a malformed id");
  await ctx.close();
}

/* 3. a fragrance inside a box goes out of stock after it was added → shown, not charged */
{
  await setServerCart("user1@example.com", "password1", []);
  const { ctx, page } = await fresh();
  await page.goto(APP + "/build-your-box");
  await pick(page, ["Rose Attar", "Royal Oud", "Vetiver Rain"]);
  await page.goto(APP + "/checkout");
  await page.locator("aside").getByText("Total").last().waitFor();
  // Rose Attar sells out elsewhere.
  const admin = await apiSignIn("admin@example.com", "adminPass");
  const rose = (await serverState()).products.find((p) => p.productId === 2);
  await fetch(`${API}/api/admin/products/2`, { method: "PUT", headers: H(admin.jwtToken), body: JSON.stringify({ ...rose, stock: 0 }) });
  const before = (await ordersOf()).length;
  await page.getByText("Cash on delivery", { exact: true }).click();
  await payButton(page).click();
  await page.getByText(/Rose Attar is out of stock/).first().waitFor();
  check((await ordersOf()).length === before, "no order is created for a box whose fragrance ran out");
  check(await page.getByRole("button", { name: "Remove from bag" }).isVisible(), "the shopper is offered to remove the box");
  await page.screenshot({ path: `${SHOT}-soldout.png`, fullPage: true });
  await ctx.close();
}

/* 4. phone layout of the builder */
{
  const { ctx, page } = await fresh({ w: 390, h: 844 });
  await page.goto(APP + "/build-your-box");
  await page.locator("button[aria-pressed]", { hasText: "Royal Oud" }).first().click();
  await page.getByRole("button", { name: "2 more", exact: true }).waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `phone: builder has no horizontal overflow (${overflow})`);
  await page.screenshot({ path: `${SHOT}-phone.png`, fullPage: false });
  await ctx.close();
}

const relevant = errors.filter((e) => !/Failed to load resource/.test(e));
check(relevant.length === 0, `no console errors${relevant.length ? ": " + relevant.join(" | ") : ""}`);
await browser.close();
console.log(failed() ? `\n${failed()} FAILED` : "\nALL PASSED");
process.exit(failed() ? 1 : 0);
