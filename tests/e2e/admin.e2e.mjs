// Admin panel + access-control tests against the ForgeX test double (see tests/e2e/README.md)
import { chromium } from "playwright";
import { API, APP, SHOTS, apiSignIn, bigPhoto, check, collectConsole, failed, reset, serverState, signInPage } from "./lib.mjs";

const SHOT = `${SHOTS}/admin`;
await reset();
const browser = await chromium.launch();
const errors = [];
const ctxOf = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  collectConsole(page, errors);
  return { ctx, page };
};
const H = (token) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

/* ---------- API-level authorization (what really protects the admin) */
{
  const user = await apiSignIn("user1@example.com", "password1");
  const r1 = await fetch(`${API}/api/admin/orders`, { headers: H(user.jwtToken) });
  check(r1.status === 403, `customer token → GET /api/admin/orders is ${r1.status} (403 expected)`);
  const r2 = await fetch(`${API}/api/admin/orders`);
  check(r2.status === 401, `no token → GET /api/admin/orders is ${r2.status} (401 expected)`);
  const r3 = await fetch(`${API}/api/admin/products/1`, { method: "PUT", headers: H(user.jwtToken), body: "{}" });
  check(r3.status === 403, `customer token → PUT /api/admin/products/1 is ${r3.status}`);
}

/* ---------- anonymous → sign in → admin */
{
  const { ctx, page } = await ctxOf();
  await page.goto(APP + "/admin/orders");
  await page.waitForURL(/\/account\?next=/);
  check(decodeURIComponent(page.url()).includes("next=/admin/orders"), "anonymous /admin/orders → sign-in with next");
  await page.locator("form[aria-label='Sign in']").getByLabel("Email").fill("admin@example.com");
  await page.locator("form[aria-label='Sign in']").getByLabel("Password", { exact: true }).fill("adminPass");
  await page.locator("form[aria-label='Sign in'] button[type=submit]").click();
  await page.waitForURL(/\/admin\/orders$/);
  await page.getByRole("heading", { name: "Orders" }).waitFor();
  check(true, "after admin sign-in, lands on /admin/orders");
  await ctx.close();
}

/* ---------- customer: no admin link, denied page, tampered roles */
{
  const { ctx, page } = await ctxOf();
  await signInPage(page, "user1@example.com", "password1");
  await page.goto(APP + "/");
  await page.locator("header").waitFor();
  check((await page.locator("header a[href='/admin']").count()) === 0, "customer sees no Admin link in the navbar");
  await page.goto(APP + "/admin/products");
  await page.getByRole("heading", { name: "Admins only" }).waitFor();
  check(true, "customer opening /admin/products gets 'Admins only'");
  check((await page.locator("nav[aria-label='Admin']").count()) === 0, "no admin navigation rendered for a customer");
  // Pretend to be an admin by editing the stored profile: the server check still says no.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("cosmic-auth"));
    s.state.user.roles = ["ROLE_USER", "ROLE_ADMIN"];
    localStorage.setItem("cosmic-auth", JSON.stringify(s));
  });
  const adminCalls = [];
  page.on("request", (r) => r.url().includes("/api/admin/") && adminCalls.push(r.url()));
  await page.goto(APP + "/admin");
  await page.getByRole("heading", { name: "Admins only" }).waitFor();
  check(adminCalls.length === 0, `tampered local role → server re-check denies before any admin API call (${adminCalls.length})`);
  await ctx.close();
}

/* ---------- expired session */
{
  const { ctx, page } = await ctxOf();
  await signInPage(page, "admin@example.com", "adminPass");
  await page.goto(APP + "/");
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("cosmic-auth"));
    s.state.expiresAt = Date.now() - 1000;
    localStorage.setItem("cosmic-auth", JSON.stringify(s));
  });
  await page.goto(APP + "/admin");
  await page.waitForURL(/\/account\?next=/);
  await page.getByText("Your session ended").waitFor();
  check(true, "expired admin session → sign-in page explains the session ended");
  await ctx.close();
}

/* ---------- admin: seed an order to work with */
const user = await apiSignIn("user1@example.com", "password1");
await fetch(`${API}/api/carts/products/1/quantity/1`, { method: "POST", headers: H(user.jwtToken) });
const addr = await (await fetch(`${API}/api/addresses`, { method: "POST", headers: H(user.jwtToken), body: JSON.stringify({ buildingName: "Flat 4B, Rose Court", street: "MG Road, Indiranagar", city: "Bengaluru", state: "Karnataka", country: "India", pincode: "560038", phoneNumber: "9876543210" }) })).json();
const cod = await (await fetch(`${API}/api/checkout`, { method: "POST", headers: H(user.jwtToken), body: JSON.stringify({ addressId: addr.addressId, paymentMethod: "COD" }) })).json();

const { ctx, page } = await ctxOf();
await signInPage(page, "admin@example.com", "adminPass");

/* navbar link for admins */
await page.goto(APP + "/");
check(await page.locator("header a[href='/admin']").waitFor({ timeout: 8000 }).then(() => true, () => false), "admin sees the Admin link in the navbar");

/* dashboard from real data */
await page.goto(APP + "/admin");
await page.getByText("Recent orders").waitFor();
await page.locator(`a[href='/admin/orders/${cod.orderId}']`).first().waitFor();
const dash = await page.locator("main").innerText();
check(/CASH ON DELIVERY\s*₹1,999/i.test(dash), "dashboard COD figure comes from the order (₹1,999)");
check(/PRODUCTS\s*6/i.test(dash), "dashboard counts the 6 products returned by the API");
await page.screenshot({ path: `${SHOT}-dash.png`, fullPage: true });

/* create product with validation + image upload */
await page.goto(APP + "/admin/products/new");
await page.getByRole("button", { name: /Create product/ }).click();
check((await page.locator("[aria-invalid='true']").count()) >= 4, "empty product form shows validation errors");
await page.getByLabel("Name").fill("Royal Oud");
await page.getByLabel("URL slug").fill("royal-oud");
await page.getByRole("button", { name: /Create product/ }).click();
check(await page.getByText("Another product already uses this slug.").isVisible(), "duplicate slug caught before sending");
await page.getByLabel("Name").fill("Saffron Dusk");
await page.getByLabel("URL slug").fill("saffron-dusk");
await page.getByLabel("Description").fill("Saffron, leather and smoked vanilla.");
await page.getByLabel("Type").selectOption("PERFUME");
await page.getByLabel("For", { exact: true }).selectOption("UNISEX");
await page.getByLabel("Fragrance family").selectOption("AMBER");
await page.getByLabel("Selling price (₹)").fill("1899");
await page.getByLabel("MRP (₹)").fill("1500");
await page.getByRole("button", { name: /Create product/ }).click();
check(await page.getByText("MRP can't be lower than the selling price.").isVisible(), "MRP below price rejected");
await page.getByLabel("MRP (₹)").fill("2299");
await page.getByLabel("Stock", { exact: true }).fill("14");
await page.locator("#pf-image").setInputFiles(bigPhoto());
await page.getByText(/resized for upload/).waitFor({ timeout: 20000 });
const sizeNote = await page.getByText(/resized for upload/).innerText();
check(true, `6.8 MB PNG prepared client-side: ${sizeNote}`);
await page.getByRole("button", { name: "Create product & upload image" }).click();
await page.waitForURL(/\/admin\/products\/\d+$/);
await page.getByRole("heading", { name: "Saffron Dusk" }).waitFor();
let st = await serverState();
const created = st.products.find((p) => p.slug === "saffron-dusk");
check(created && created.price === 189900 && created.mrp === 229900 && created.stock === 14 && created.category === "PERFUME", "product created in backend with paise prices");
check(created?.image?.includes("/media/upload-"), "image uploaded (multipart under 1 MB) and saved on the product");
await page.screenshot({ path: `${SHOT}-pedit.png`, fullPage: true });

/* the store shows it */
await page.goto(APP + "/products/saffron-dusk");
await page.getByRole("heading", { name: /Saffron Dusk/i }).first().waitFor();
check(true, "new product is live on the storefront");

/* inline stock + hide */
await page.goto(APP + "/admin/products");
await page.getByLabel("Stock for Amber Nuit").fill("7");
await page.getByLabel("Stock for Amber Nuit").press("Enter");
await page.getByText("Stock updated: Amber Nuit").waitFor();
await page.getByRole("switch", { name: "Vetiver Rain visible in store" }).click();
await page.getByText("Vetiver Rain is hidden from the store").waitFor();
st = await serverState();
check(st.products.find((p) => p.productId === 3).stock === 7, "inline stock edit saved (Amber Nuit = 7)");
check(st.products.find((p) => p.productId === 6).active === false, "visibility toggle saved (Vetiver Rain hidden)");
check(st.products.find((p) => p.productId === 3).name === "Amber Nuit" && st.products.find((p) => p.productId === 3).price === 249900, "full PUT kept the other fields intact");
await page.goto(APP + "/products/vetiver-rain");
await page.getByText(/evaporated|not found/i).first().waitFor();
check(true, "hidden product is no longer reachable in the store");
await page.goto(APP + "/admin/products");
await page.getByRole("switch", { name: "Vetiver Rain visible in store" }).click();
await page.getByText("Vetiver Rain is live").waitFor();

/* delete: blocked when in an order, allowed otherwise */
await page.goto(APP + "/admin/products/1");
await page.getByRole("button", { name: "Delete product" }).click();
await page.getByRole("button", { name: "Delete Royal Oud" }).click();
await page.getByText(/is in past orders/).waitFor();
check(true, "deleting a product that's in an order is refused (409) with an explanation");
// A product that is only in a shopper's cart (never ordered) can be deleted: it leaves their cart.
await fetch(`${API}/api/carts/products/${created.productId}/quantity/1`, { method: "POST", headers: H(user.jwtToken) });
await page.goto(APP + `/admin/products/${created.productId}`);
await page.getByRole("button", { name: "Delete product" }).click();
await page.getByRole("button", { name: "Delete Saffron Dusk" }).click();
await page.waitForURL(/\/admin\/products$/);
st = await serverState();
check(!st.products.some((p) => p.slug === "saffron-dusk"), "unused product deleted");
const userCart = await (await fetch(`${API}/api/carts/users/cart`, { headers: H(user.jwtToken) })).json();
check(!userCart.products.some((p) => p.productId === created.productId), "deleted product was taken out of the shopper's cart (no 500)");

/* Build Your Own Box settings: the price saved here is what the store shows and checkout charges */
await page.goto(APP + "/admin/bundles");
await page.getByLabel("Box price (₹)").fill("1999");
await page.getByRole("button", { name: "Save box" }).click();
await page.getByText("Build Your Own Box saved").waitFor();
st = await serverState();
check(st.bundles[0].price === 199900, "box price saved on the server in paise (₹1,999)");
await page.goto(APP + "/build-your-box");
await page.getByRole("button", { name: /Select 3 more/ }).first().waitFor();
check((await page.locator("aside[aria-label='Your box']").innerText()).includes("₹1,999"), "storefront box shows the new server price");
await page.goto(APP + "/admin/bundles");
await page.getByLabel("Box price (₹)").fill("1799");
await page.getByRole("button", { name: "Save box" }).click();
await page.getByText("Build Your Own Box saved").waitFor();

/* orders: COD flow CONFIRMED → SHIPPED → DELIVERED, invoice */
await page.goto(APP + `/admin/orders/${cod.orderId}`);
await page.getByText("Ship to").waitFor();
await page.getByText("Bengaluru, Karnataka 560038").waitFor();
check(true, "order detail shows the delivery address from GET /api/addresses/{id}");
const actions = await page.locator("main button").allInnerTexts();
check(actions.some((a) => /Mark as shipped/i.test(a)) && actions.some((a) => /Cancel order/i.test(a)) && !actions.some((a) => /Mark as delivered/i.test(a)), "CONFIRMED order offers only Ship / Cancel");
await page.getByRole("button", { name: "Mark as shipped" }).click();
await page.getByRole("button", { name: /Yes, mark as shipped/ }).click();
await page.getByText(/: Shipped/).waitFor();
await page.getByRole("button", { name: "Mark as delivered" }).click();
await page.getByRole("button", { name: /Yes, mark as delivered/ }).click();
await page.getByText("Delivered. This is the final status.").waitFor();
st = await serverState();
check(st.orders.find((o) => o.orderId === cod.orderId).status === "DELIVERED", "status changes saved: DELIVERED");
const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Download PDF/ }).click()]);
check(dl.suggestedFilename().endsWith(".pdf"), "admin invoice download works");
await page.screenshot({ path: `${SHOT}-order.png`, fullPage: true });

/* cancel warns about refunds for paid orders */
{
  // a paid online order via the API (signed like Razorpay)
  const crypto = await import("node:crypto");
  await fetch(`${API}/api/carts/products/3/quantity/1`, { method: "POST", headers: H(user.jwtToken) });
  const res = await (await fetch(`${API}/api/checkout`, { method: "POST", headers: H(user.jwtToken), body: JSON.stringify({ addressId: addr.addressId, paymentMethod: "RAZORPAY" }) })).json();
  const pid = "pay_test123";
  const sig = crypto.createHmac("sha256", "double_razorpay_secret").update(`${res.razorpayOrderId}|${pid}`).digest("hex");
  await fetch(`${API}/api/payments/verify`, { method: "POST", headers: H(user.jwtToken), body: JSON.stringify({ razorpay_order_id: res.razorpayOrderId, razorpay_payment_id: pid, razorpay_signature: sig }) });
  await page.goto(APP + `/admin/orders/${res.orderId}`);
  await page.getByRole("button", { name: "Cancel order" }).click();
  check(await page.getByText(/does not refund it/).isVisible(), "cancelling a paid order warns that it isn't refunded");
  await page.getByRole("button", { name: /Yes, cancel order/ }).click();
  await page.getByText("Cancelled. This is the final status.").waitFor();
  st = await serverState();
  check(st.orders.find((o) => o.orderId === res.orderId).status === "CANCELLED", "paid order cancelled");
}

/* coupons */
await page.goto(APP + "/admin/coupons");
await page.getByRole("button", { name: "New coupon" }).first().click();
await page.getByLabel("Code").fill("welcome10");
await page.getByLabel("Percent off").fill("95");
await page.getByRole("button", { name: "Create coupon" }).click();
check(await page.getByText("A coupon with this code already exists.").isVisible(), "duplicate coupon code caught");
check(await page.getByText("Enter a whole percentage from 1 to 90.").isVisible(), "percent over 90 caught");
await page.getByLabel("Code").fill("FLAT200");
await page.getByText("₹ off").click();
await page.getByLabel("Amount off (₹)").fill("200");
await page.getByLabel("Minimum order (₹)").fill("1500");
await page.getByLabel("Usage limit").fill("50");
await page.getByLabel("Starts").fill("2026-10-01T00:00");
await page.getByLabel("Ends").fill("2026-09-01T00:00");
await page.getByRole("button", { name: "Create coupon" }).click();
check(await page.getByText("The end must be after the start.").isVisible(), "end before start caught");
await page.getByLabel("Ends").fill("2027-01-31T23:59");
await page.getByRole("button", { name: "Create coupon" }).click();
await page.getByText("FLAT200 created").waitFor();
st = await serverState();
const flat = st.coupons.find((c) => c.code === "FLAT200");
check(flat && flat.type === "FLAT" && flat.value === 20000 && flat.minOrderPaise === 150000 && flat.usageLimit === 50 && flat.validTo?.startsWith("2027-01-31T23:59"), "coupon created with paise values and dates");
await page.locator("tr", { hasText: "WELCOME10" }).getByRole("button", { name: "Edit" }).click();
await page.getByLabel("Percent off").fill("15");
await page.getByRole("button", { name: "Save coupon" }).click();
await page.getByText("WELCOME10 saved").waitFor();
await page.locator("tr", { hasText: "WELCOME10" }).getByRole("button", { name: "Switch off" }).click();
await page.getByText("WELCOME10 switched off").waitFor();
st = await serverState();
const w = st.coupons.find((c) => c.code === "WELCOME10");
check(w.value === 15 && w.active === false, "coupon edited (15%) and switched off");
await page.screenshot({ path: `${SHOT}-coupons.png`, fullPage: true });

/* customers */
await page.goto(APP + "/admin/customers");
await page.getByText("user1@example.com").first().waitFor();
check(true, "customers page lists ordering customers");

/* mobile admin */
{
  const m = await ctxOf({ viewport: { width: 390, height: 844 } });
  await signInPage(m.page, "admin@example.com", "adminPass");
  for (const p of ["/admin", "/admin/products", "/admin/orders", `/admin/orders/${cod.orderId}`, "/admin/coupons", "/admin/products/2"]) {
    await m.page.goto(APP + p);
    await m.page.locator("main h1").first().waitFor();
    await m.page.waitForTimeout(500);
    const overflow = await m.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 0, `mobile ${p}: no page-level horizontal overflow (${overflow})`);
  }
  await m.page.goto(APP + "/admin/products");
  await m.page.locator("main h1").waitFor();
  await m.page.screenshot({ path: `${SHOT}-m-products.png`, fullPage: true });
  await m.ctx.close();
}

await ctx.close();
const relevant = errors.filter((e) => !/Failed to load resource/.test(e));
check(relevant.length === 0, `no console errors${relevant.length ? ": " + relevant.join(" | ") : ""}`);
await browser.close();
console.log(failed() ? `\n${failed()} FAILED` : "\nALL PASSED");
process.exit(failed() ? 1 : 0);
