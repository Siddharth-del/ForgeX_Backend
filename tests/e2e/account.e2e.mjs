import { chromium } from "playwright";
// Account: orders list, address book, order privacy (see tests/e2e/README.md)
import { API, APP, SHOTS, apiSignIn, check, collectConsole, failed, reset, signInPage } from "./lib.mjs";
await reset();
const user = await apiSignIn("user1@example.com", "password1");
const H = { Authorization: `Bearer ${user.jwtToken}`, "Content-Type": "application/json" };
await fetch(`${API}/api/carts/products/3/quantity/2`, { method: "POST", headers: H });
const addr = await (await fetch(`${API}/api/addresses`, { method: "POST", headers: H, body: JSON.stringify({ buildingName: "Flat 4B, Rose Court", street: "MG Road, Indiranagar", city: "Bengaluru", state: "Karnataka", country: "India", pincode: "560038", phoneNumber: "9876543210" }) })).json();
await fetch(`${API}/api/addresses`, { method: "POST", headers: H, body: JSON.stringify({ buildingName: "House 12, Palm Grove", street: "Carter Road, Bandra West", city: "Mumbai", state: "Maharashtra", country: "India", pincode: "400050", phoneNumber: "9123456780" }) });
const o = await (await fetch(`${API}/api/checkout`, { method: "POST", headers: H, body: JSON.stringify({ addressId: addr.addressId, paymentMethod: "COD" }) })).json();
const b = await chromium.launch();
const errors = [];
for (const [w, h, tag] of [[1440, 900, "d"], [390, 844, "m"]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  collectConsole(page, errors);
  await signInPage(page, "user1@example.com", "password1");
  await page.goto(APP + "/account");
  await page.getByText(o.orderId ? "Confirmed" : "x").first().waitFor();
  await page.getByText("Rose Court").first().waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/account-${tag}.png`, fullPage: true });
  if (tag === "d") {
    // removing an address used by an order is refused with an explanation
    await page.locator("li", { hasText: "Rose Court" }).getByRole("button", { name: "Remove" }).click();
    await page.locator("li", { hasText: "Rose Court" }).getByRole("button", { name: "Remove", exact: true }).click();
    await page.getByText(/linked to an order/).waitFor();
    check(true, "address used by an order can't be removed (explained)");
    await page.locator("li", { hasText: "Palm Grove" }).getByRole("button", { name: "Remove" }).click();
    await page.locator("li", { hasText: "Palm Grove" }).getByRole("button", { name: "Remove", exact: true }).click();
    await page.getByText("Palm Grove").waitFor({ state: "detached" });
    check(true, "unused address removed");
    // another customer's order isn't visible
    const admin = await apiSignIn("admin@example.com", "adminPass");
    const HA = { Authorization: `Bearer ${admin.jwtToken}`, "Content-Type": "application/json" };
    await fetch(`${API}/api/carts/products/1/quantity/1`, { method: "POST", headers: HA });
    const a2 = await (await fetch(`${API}/api/addresses`, { method: "POST", headers: HA, body: JSON.stringify({ buildingName: "Admin House", street: "Admin Street", city: "Delhi", state: "Delhi", country: "India", pincode: "110001", phoneNumber: "9999999999" }) })).json();
    const other = await (await fetch(`${API}/api/checkout`, { method: "POST", headers: HA, body: JSON.stringify({ addressId: a2.addressId, paymentMethod: "COD" }) })).json();
    await page.goto(APP + `/account/orders/${other.orderId}`);
    await page.getByText("Order not found").waitFor();
    check(true, "another customer's order shows 'Order not found'");
  }
  await ctx.close();
}
// Password reset: the API refuses a reset without the verified code; the site sends the code with the new password.
{
  const bare = await fetch(`${API}/api/auth/reset-password?email=user1@example.com`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: "hijack1", confirmPassword: "hijack1" }) });
  check(bare.status === 400, `reset without a verified code is refused (${bare.status})`);
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  collectConsole(page, errors);
  await page.goto(APP + "/account");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.locator("form[aria-label='Send reset code']").getByLabel("Email").fill("user1@example.com");
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("Six-digit code").waitFor();
  const { code } = await (await fetch(`${API}/__otp?email=user1@example.com`)).json();
  await page.getByLabel("Six-digit code").fill(code);
  await page.getByRole("button", { name: "Verify code" }).click();
  // Someone who knows only the email tries to get in between the two steps.
  const between = await fetch(`${API}/api/auth/reset-password?email=user1@example.com`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: "hijack1", confirmPassword: "hijack1" }) });
  check(between.status === 400, `reset with only the email, after the owner verified, is refused (${between.status})`);
  await page.getByLabel("New password", { exact: true }).fill("password1");
  await page.getByLabel("Confirm new password").fill("password1");
  await page.getByRole("button", { name: "Set new password" }).click();
  await page.getByText("Password updated. Sign in with your new password.").waitFor();
  check(true, "owner resets the password with the emailed code");
  await ctx.close();
}

const relevant = errors.filter((e) => !/Failed to load resource/.test(e));
check(relevant.length === 0, `no console errors ${relevant.join(" | ")}`);
await b.close();
console.log(failed() ? `\n${failed()} FAILED` : "\nALL PASSED");
process.exit(failed() ? 1 : 0);
