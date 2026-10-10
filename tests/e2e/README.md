# Browser tests (Playwright)

These suites drive the real storefront and admin panel in Chromium. They run against
`forgex-double.mjs`, a stand-in for the ForgeX Spring Boot API written from the backend's source:
same endpoints, DTO fields, status codes (400/401/403/404/409/413/500), ROLE_ADMIN rules, cart
ownership, Build Your Own Box validation and pricing, line keys, checkout maths, unpaid-order reuse,
coupon rules, Razorpay signature and webhook checks (HMAC-SHA256), "remove only the ordered lines",
order transitions, product-deletion rules, CORS for listed origins, the password-reset code check
and the 1 MB upload limit. Each request is rolled back if it fails, like a transaction. Razorpay's
checkout.js is replaced in the browser by a small fake that pays, closes, fails, or returns a
forged signature on request.

They prove the frontend follows the backend's contracts. They are **not** a substitute for a run
against the real backend with Razorpay test keys (see the main README, "Checking against the real backend").

## Run

```bash
npm i --no-save playwright && npx playwright install chromium   # once
npm run test:double        # terminal 1: test double on http://localhost:8080 (seeded data, resets per suite)
npm run dev                # terminal 2: storefront on http://localhost:5173, /api → :8080
npm run test:e2e           # terminal 3: all suites
```

Against a production build: `npm run build`, then `VITE_API_PROXY_TARGET=http://localhost:8080 npm run preview`
and `APP=http://localhost:4173 npm run test:e2e`. Screenshots go to your temp folder (`SHOTS=dir` to change).

| Suite | Covers |
| --- | --- |
| `routes.e2e.mjs` | 40 storefront routes × desktop and phone: no console errors, failed requests or sideways scroll; removed sample products and inactive products 404 |
| `box.e2e.mjs` | API contracts (CORS preflight, admin-only listings, unknown operation → 400, box validation, separate box lines, totals at current prices, cross-customer cart/address/payment → 404, unpaid-order reuse and release, ordered-product delete → 409); building two boxes straight into the server cart, server-priced checkout, failed payment and signed/forged webhooks keep the cart, paying removes only the ordered lines, signed-out "Add box" goes to sign-in with no cart request and the old on-device bag cleared, sold-out fragrance inside a box, phone layout |
| `checkout.e2e.mjs` | signed-out Add to cart → sign in → back → added to the server cart; bag drawer + / Remove change the server cart; sign-in gate, address validation and save, server price preview, coupons, Razorpay closed / failed / retried / paid, forged signature never marked paid, resume from order page, triple-click → one order, COD, stock bought by someone else mid-checkout, phone layout |
| `admin.e2e.mjs` | API returns 401/403 to non-admins, sign-in redirect, customer denied, tampered local role denied by server check, expired session, dashboard figures, product create/validate/upload (7 MB PNG → under 1 MB), inline stock, hide/show, delete rules (ordered → 409; only in a cart → deleted and taken out of the cart), box price, order status flow, paid-order cancel warning, invoices, coupons CRUD and rules, phone layouts |
| `account.e2e.mjs` | orders and addresses on the account page, address in use can't be removed, another customer's order is not visible, password reset needs the emailed code |
