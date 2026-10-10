// Checkout + payment tests against the ForgeX test double (see tests/e2e/README.md)
import { chromium } from "playwright";
// The cart lives on the account (ForgeX model): tests put items in the server cart, or add them in the UI.
import { APP, SHOTS, check, collectConsole, failed, fakeRazorpay, reset, serverCartLines, serverState, setServerCart, signInPage } from "./lib.mjs";

const USER = ["user1@example.com", "password1"];
const ROYAL = { id: 1 }, AMBER = { id: 3 }, ROSE = { id: 2 };
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

/* 1. signed out: no cart until sign-in; "Add to cart" sends to sign-in and back */
{
  const { ctx, page } = await fresh({ signedIn: false });
  await page.goto(APP + "/checkout");
  await page.getByText("Sign in to continue").waitFor();
  check(await page.locator("main").getByRole("link", { name: "Sign in" }).getAttribute("href").then((h) => h?.includes("next=/checkout")), "signed-out checkout asks to sign in (next=/checkout)");

  const cartsBefore = (await serverState()).carts.length;
  await page.goto(APP + "/products/royal-oud");
  await page.locator("main").getByRole("button", { name: "Add to cart" }).first().click();
  await page.waitForURL(/\/account\?next=/);
  check(decodeURIComponent(page.url()).includes("next=/products/royal-oud"), "signed-out Add to cart → sign in, coming back to the product");
  check((await serverState()).carts.length === cartsBefore, "nothing was sent to the server while signed out");
  await page.locator("form[aria-label='Sign in']").getByLabel("Email").fill("user1@example.com");
  await page.locator("form[aria-label='Sign in']").getByLabel("Password", { exact: true }).fill("password1");
  await page.locator("form[aria-label='Sign in'] button[type=submit]").click();
  await page.waitForURL(/\/products\/royal-oud$/);
  await page.locator("main").getByRole("button", { name: "Add to cart" }).first().click();
  await page.locator("main").getByRole("button", { name: /Added/ }).first().waitFor();
  check(JSON.stringify(await serverCartLines("user1@example.com")) === JSON.stringify(["P:1x1"]), "after sign-in, Add to cart puts it in the account's server cart");

  // The bag drawer shows the server cart; its buttons change the server cart.
  await page.getByRole("button", { name: /Open bag, 1 item/ }).first().click();
  const drawer = page.getByRole("dialog", { name: "Shopping bag" });
  await drawer.getByText("Royal Oud").first().waitFor();
  await drawer.getByRole("button", { name: "Increase quantity" }).click();
  await drawer.getByRole("button", { name: "Decrease quantity" }).waitFor();
  await page.waitForFunction(() => document.querySelector("[aria-label='Quantity of Royal Oud'] [aria-live]")?.textContent?.trim() === "2");
  check(JSON.stringify(await serverCartLines("user1@example.com")) === JSON.stringify(["P:1x2"]), "+ in the bag raises the server quantity");
  await drawer.getByRole("button", { name: "Remove Royal Oud" }).click();
  await drawer.getByText("Your bag is empty").waitFor();
  check((await serverCartLines("user1@example.com")).length === 0, "Remove takes it out of the server cart");
  await page.screenshot({ path: `${SHOT}-signin-add.png`, fullPage: false });
  await ctx.close();
}

/* 2. signed in: address form, coupon, dismiss, resume, success */
{
  await setServerCart(...USER, [{ id: ROYAL.id, quantity: 1 }]);
  const { ctx, page } = await fresh();
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
  check((await serverCartLines("user1@example.com")).length === 0, "server removed the ordered line from the cart after verified payment");
  check(await page.getByRole("button", { name: /Open bag, 0 items/ }).first().isVisible(), "navbar bag shows 0");
  check(!(await page.evaluate(() => sessionStorage.getItem("cosmic-pending-payment"))), "pending payment forgotten");
  await page.screenshot({ path: `${SHOT}-paid.png`, fullPage: true });

  // invoice
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Download invoice/ }).click()]);
  check(dl.suggestedFilename().endsWith(".pdf"), `invoice downloads (${dl.suggestedFilename()})`);
  await ctx.close();
}

/* 3. bad signature → never shown as paid */
{
  await setServerCart(...USER, [{ id: AMBER.id, quantity: 1 }]);
  const { ctx, page } = await fresh();
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
  check(JSON.stringify(await serverCartLines("user1@example.com")) === JSON.stringify(["P:3x1"]), "forged signature: cart kept");
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
  await setServerCart(...USER, [{ id: AMBER.id, quantity: 2 }]);
  const { ctx, page } = await fresh();
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
  await setServerCart(...USER, [{ id: ROSE.id, quantity: 3 }]);
  const { ctx, page } = await fresh();
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
  await page.getByRole("button", { name: "Use available quantities" }).click();
  await page.getByText("Some items need your attention").waitFor({ state: "detached" });
  const lines = await serverCartLines("user1@example.com");
  check(JSON.stringify(lines) === JSON.stringify(["P:2x1"]), `server cart lowered to what's available (${lines.join(", ")})`);
  await ctx.close();
}

/* 6. mobile layout */
{
  await setServerCart(...USER, [{ id: ROYAL.id, quantity: 1 }]);
  const { ctx, page } = await fresh({ w: 390, h: 844 });
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
