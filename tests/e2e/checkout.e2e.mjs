// Checkout + payment tests against the ForgeX test double (see tests/e2e/README.md)
import { chromium } from "playwright";
import { APP, SHOTS, bagLine, check, collectConsole, failed, fakeRazorpay, reset, serverState, setBag, signInPage } from "./lib.mjs";

const ROYAL = { id: 1, slug: "royal-oud", name: "Royal Oud", price: 1999, stock: 12 };
const AMBER = { id: 3, slug: "amber-nuit", name: "Amber Nuit", price: 2499, stock: 20 };
const ROSE = { id: 2, slug: "rose-attar", name: "Rose Attar", price: 1299, stock: 3 };
const SHOT = `${SHOTS}/checkout`;

await reset();
const browser = await chromium.launch();
const errors = [];

async function fresh({ signedIn = true, w = 1366, h = 900 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, acceptDownloads: true });
  const page = await ctx.newPage();
  collectConsole(page, errors);
  await fakeRazorpay(page);
  if (signedIn) await signInPage(page, "user1@example.com", "password1");
  return { ctx, page };
}
const ordersOf = async (email = "user1@example.com") => (await serverState()).orders.filter((o) => o.email === email);
const button = (page) => page.locator("main button", { hasText: /Pay securely|Resume payment|Place order|Placing order|Waiting for payment|Confirming payment/ });

/* 1. anonymous */
{
  const { ctx, page } = await fresh({ signedIn: false });
  await page.goto(APP + "/");
  await setBag(page, [bagLine(ROYAL, 1)]);
  await page.goto(APP + "/checkout");
  await page.getByText("Sign in to continue").waitFor();
  check(await page.locator("main").getByRole("link", { name: "Sign in" }).getAttribute("href").then((h) => h?.includes("next=/checkout")), "anonymous checkout asks to sign in (next=/checkout)");
  check((await page.locator("aside").innerText()).includes("Estimated total"), "anonymous summary shows an estimate only");
  await page.screenshot({ path: `${SHOT}-anon.png`, fullPage: true });
  await ctx.close();
}

/* 2. signed in: address form, coupon, dismiss, resume, success */
{
  const { ctx, page } = await fresh();
  await page.goto(APP + "/");
  await setBag(page, [bagLine(ROYAL, 1)]);
  await page.goto(APP + "/checkout");
  await page.getByText("Where should we deliver?").waitFor();
  check(true, "no saved address → new-address form opens");

  // invalid address
  await page.getByRole("button", { name: "Save and use this address" }).click();
  const errs = await page.locator("form[aria-label='New delivery address'] [aria-invalid='true']").count();
  check(errs >= 5, `address validation flags empty fields (${errs})`);
  await page.getByLabel("Flat, house no., building").fill("Flat 4B, Rose Court");
  await page.getByLabel("Street, area, landmark").fill("MG Road, Indiranagar");
  await page.getByLabel("City").fill("Bengaluru");
  await page.getByLabel("PIN code").fill("560038");
  await page.getByLabel("State / UT").selectOption("Karnataka");
  await page.getByLabel("Mobile number").fill("98765");
  await page.getByRole("button", { name: "Save and use this address" }).click();
  check(await page.getByText("Phone number must be 10 to 15 characters.").isVisible(), "short phone rejected client-side");
  await page.getByLabel("Mobile number").fill("9876543210");
  await page.getByRole("button", { name: "Save and use this address" }).click();
  await page.getByRole("radio", { checked: true }).first().waitFor();
  check((await page.locator("[role=radiogroup]").innerText()).includes("Bengaluru"), "address saved to backend and selected");

  // server price
  await page.locator("aside").getByText("Total").last().waitFor();
  const aside = await page.locator("aside").innerText();
  check(aside.includes("₹1,999") && /Complimentary/.test(aside), "server preview: ₹1,999, free shipping above ₹1,499");

  // coupon
  await page.getByLabel("Coupon code").fill("bogus");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByText("Invalid coupon code").waitFor();
  check(true, "invalid coupon shows the server's message");
  await page.getByLabel("Coupon code").fill("welcome10");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.locator("aside").getByText("Coupon WELCOME10").waitFor();
  const aside2 = await page.locator("aside").innerText();
  check(aside2.includes("−₹199.90") || aside2.includes("−₹200"), `coupon discount from server (${aside2.match(/−₹[\d,.]+/)?.[0]})`);

  // dismissed payment
  await page.evaluate(() => (window.__rzpMode = "dismiss"));
  await button(page).click();
  await page.getByText("Payment not completed").waitFor();
  let orders = await ordersOf();
  check(orders.length === 1 && orders[0].status === "PENDING_PAYMENT", "dismiss: one order, still PENDING_PAYMENT");
  const rzp = await page.evaluate(() => window.__rzpLast);
  check(rzp.key === "rzp_test_double" && rzp.order_id?.startsWith("order_") && rzp.amount === orders[0].total, "Razorpay opened with the server's key id, order id and amount");
  check(await page.locator("main button", { hasText: "Resume payment" }).isVisible(), "button offers to resume the same order");
  await page.screenshot({ path: `${SHOT}-dismissed.png`, fullPage: true });

  // failed attempt inside the window, then closed
  await page.evaluate(() => (window.__rzpMode = "fail"));
  await page.getByRole("button", { name: "Try payment again" }).click();
  await page.getByText(/Card declined by bank/).waitFor();
  orders = await ordersOf();
  check(orders.length === 1, "failed attempt reuses the order (no duplicate)");

  // success
  await page.evaluate(() => (window.__rzpMode = "success"));
  await button(page).click();
  await page.waitForURL(/\/account\/orders\/\d+\?placed=1/);
  await page.getByText("Payment received").waitFor();
  orders = await ordersOf();
  check(orders.length === 1 && orders[0].status === "PAID" && orders[0].payment.status === "CAPTURED", "success: server verified → PAID/CAPTURED");
  const bag = await page.evaluate(() => JSON.parse(localStorage.getItem("cosmic-cart-v2")).state.lines.length);
  check(bag === 0, "bag cleared after verified payment");
  check(!(await page.evaluate(() => sessionStorage.getItem("cosmic-pending-payment"))), "pending payment forgotten");
  await page.screenshot({ path: `${SHOT}-paid.png`, fullPage: true });

  // invoice
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Download invoice/ }).click()]);
  check(dl.suggestedFilename().endsWith(".pdf"), `invoice downloads (${dl.suggestedFilename()})`);
  await ctx.close();
}

/* 3. bad signature → never shown as paid */
{
  const { ctx, page } = await fresh();
  await page.goto(APP + "/");
  await setBag(page, [bagLine(AMBER, 1)]);
  await page.goto(APP + "/checkout");
  await page.getByRole("radio", { checked: true }).first().waitFor();
  await page.locator("aside").getByText("Total").last().waitFor();
  await page.evaluate(() => (window.__rzpMode = "badsig"));
  await button(page).click();
  await page.getByText("Payment not confirmed yet").waitFor({ timeout: 20000 });
  const orders = await ordersOf();
  const last = orders.at(-1);
  check(last.status === "PENDING_PAYMENT", "forged signature: order stays PENDING_PAYMENT");
  check(page.url().endsWith("/checkout"), "forged signature: no confirmation page");
  const bag = await page.evaluate(() => JSON.parse(localStorage.getItem("cosmic-cart-v2")).state.lines.length);
  check(bag === 1, "forged signature: bag kept");
  await page.screenshot({ path: `${SHOT}-badsig.png`, fullPage: true });

  // order page for the pending order offers to complete payment, then succeeds
  await page.goto(APP + `/account/orders/${last.orderId}`);
  await page.getByText("Payment pending").waitFor();
  await page.evaluate(() => (window.__rzpMode = "success"));
  await page.getByRole("button", { name: /Complete payment/ }).click();
  await page.locator("main").getByText("Paid", { exact: true }).first().waitFor({ timeout: 15000 });
  const after = (await ordersOf()).find((o) => o.orderId === last.orderId);
  check(after.status === "PAID", "pending order completed from the order page → PAID");
  await ctx.close();
}

/* 4. duplicate clicks + COD */
{
  const { ctx, page } = await fresh();
  await page.goto(APP + "/");
  await setBag(page, [bagLine(AMBER, 2)]);
  await page.goto(APP + "/checkout");
  await page.getByRole("radio", { checked: true }).first().waitFor();
  await page.locator("aside").getByText("Total").last().waitFor();
  await page.getByText("Cash on delivery", { exact: true }).click();
  const before = (await ordersOf()).length;
  const b = button(page);
  await b.evaluate((el) => {
    el.click();
    el.click();
    el.click();
  });
  await page.waitForURL(/\/account\/orders\/\d+\?placed=1/);
  const orders = await ordersOf();
  check(orders.length === before + 1, `triple click creates one order (${orders.length - before})`);
  const cod = orders.at(-1);
  check(cod.status === "CONFIRMED" && cod.payment.status === "PENDING_COD" && cod.paymentMethod === "COD", "COD → CONFIRMED / PENDING_COD");
  await page.getByText("Order placed").waitFor();
  await page.screenshot({ path: `${SHOT}-cod.png`, fullPage: true });
  await ctx.close();
}

/* 5. stock bought by someone else while this shopper is on checkout → issue + fix */
{
  const { ctx, page } = await fresh();
  await page.goto(APP + "/");
  await setBag(page, [bagLine(ROSE, 3)]);
  await page.goto(APP + "/checkout");
  await page.getByRole("radio", { checked: true }).first().waitFor();
  await page.locator("aside").getByText("Total").last().waitFor();
  const { apiSignIn, API } = await import("./lib.mjs");
  const admin = await apiSignIn("admin@example.com", "adminPass");
  const H = { Authorization: `Bearer ${admin.jwtToken}`, "Content-Type": "application/json" };
  await fetch(`${API}/api/carts/products/2/quantity/2`, { method: "POST", headers: H });
  const addr = await (await fetch(`${API}/api/addresses`, { method: "POST", headers: H, body: JSON.stringify({ buildingName: "Admin House", street: "Admin Street", city: "Delhi", state: "Delhi", country: "India", pincode: "110001", phoneNumber: "9999999999" }) })).json();
  const r = await fetch(`${API}/api/checkout`, { method: "POST", headers: H, body: JSON.stringify({ addressId: addr.addressId, paymentMethod: "COD" }) });
  check(r.status === 201, "other shopper bought 2 of the 3 Rose Attar");
  const before = (await ordersOf()).length;
  await page.getByText("Cash on delivery", { exact: true }).click();
  await button(page).click();
  await page.getByText(/Some items need your attention|Only \d+ left/).first().waitFor();
  check((await ordersOf()).length === before, "no order created when stock ran out mid-checkout");
  await page.screenshot({ path: `${SHOT}-stock.png`, fullPage: true });
  if (await page.getByRole("button", { name: "Use available quantities" }).isVisible()) {
    await page.getByRole("button", { name: "Use available quantities" }).click();
    await page.getByText("Some items need your attention").waitFor({ state: "detached" });
  } else {
    await page.reload();
    await page.locator("aside").getByText("Total").last().waitFor();
  }
  const q = await page.evaluate(() => JSON.parse(localStorage.getItem("cosmic-cart-v2")).state.lines[0]?.quantity);
  check(q === 1, `bag reduced to what's available (${q})`);
  await ctx.close();
}

/* 6. mobile layout */
{
  const { ctx, page } = await fresh({ w: 390, h: 844 });
  await page.goto(APP + "/");
  await setBag(page, [bagLine(ROYAL, 1)]);
  await page.goto(APP + "/checkout");
  await page.locator("aside").getByText("Total").last().waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `mobile checkout has no horizontal overflow (${overflow})`);
  await page.screenshot({ path: `${SHOT}-mobile.png`, fullPage: true });
  await ctx.close();
}

const relevant = errors.filter((e) => !/Failed to load resource/.test(e));
check(relevant.length === 0, `no console errors${relevant.length ? ": " + relevant.join(" | ") : ""}`);
await browser.close();
console.log(failed() ? `\n${failed()} FAILED` : "\nALL PASSED");
process.exit(failed() ? 1 : 0);
