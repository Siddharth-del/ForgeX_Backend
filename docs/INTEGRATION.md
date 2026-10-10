# ForgeX integration notes

How the Cosmic Life storefront and admin panel use the ForgeX Spring Boot API, what the backend now guarantees, and
what was tested. The backend changes that go with this version (cart ownership, CORS and error handling, Build Your Own
Box bundles, checkout/Razorpay consistency, product deletion, address ownership, password reset) are described in the
backend repo: `Forgex/docs/CART-CHECKOUT-AND-BOXES.md`.

## 1. Endpoints used

All calls go through `src/lib/api/client.ts` to the site's own `/api/...` (forwarded to the backend), with
`Authorization: Bearer <jwt>` when signed in and `credentials: "include"` (so the backend's JWT cookie keeps working; the
header wins when both are sent). Money is in **paise** on the wire and converted only for display. Ids are validated
before a URL is built (`src/lib/ids.ts`): a bad id rejects the call, nothing is sent.

| Area | Method & path | Auth | Used by |
| --- | --- | --- | --- |
| Auth | `POST /api/auth/signin`, `POST /api/auth/signup`, `GET /api/auth/user`, `POST /api/auth/signout` | – / token | account page, session check, admin role re-check |
| | `POST /api/auth/forgot/password?email=`, `POST /api/auth/verify-otp?email=&otp=`, `POST /api/auth/reset-password?email=&otp=` | – | password reset (the verified code is sent again with the new password) |
| Products | `GET /api/public/products?pageNumber&pageSize=100&sortBy=productId&sortOrder=asc` (every page) | – | whole storefront, admin lists |
| Boxes | `GET /api/public/bundles` | – | Build Your Own Box (size, price and rules come from here) |
| Cart | `GET /api/carts/users/cart` | user | bag drawer, navbar count, checkout (products and `bundles`) |
| | `POST /api/carts/products/{id}/quantity/{qty}`, `PUT /api/cart/products/{id}/quantity/{add\|delete}`, `DELETE /api/carts/{cartId}/product/{id}` | user | Add to cart / Buy now, + and − in the bag, Remove |
| | `POST /api/carts/bundles/{bundleId}` `{productIds, quantity}`, `PUT /api/carts/bundle-items/{lineId}/quantity/{n}`, `DELETE /api/carts/bundle-items/{lineId}` | user | Build Your Own Box, box + / − / Remove |
| Addresses | `GET /api/users/addresses`, `POST /api/addresses`, `GET /api/addresses/{id}`, `DELETE /api/addresses/{id}` | owner (admin may read) | checkout, account, order pages, admin order detail |
| Checkout | `GET /api/checkout/preview?coupon=` | user | server price + coupon check |
| | `POST /api/checkout` `{addressId, paymentMethod: RAZORPAY\|COD, couponCode?}` | user | creates (or reuses) the order, reserves stock |
| | `POST /api/payments/verify` `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` | user | server-side signature check → `PAID` |
| Orders | `GET /api/orders`, `GET /api/orders/{id}`, `GET /api/orders/{id}/invoice` (PDF) | user | account, order page |
| Admin products | `POST /api/admin/products`, `PUT /api/admin/products/{id}`, `PUT /api/admin/products/{id}/image` (multipart `image`), `DELETE /api/admin/products/{id}` | admin | product editor, inline stock, live/hidden, delete |
| Admin boxes | `GET /api/admin/bundles`, `PUT /api/admin/bundles/{id}` | admin | Boxes page (price, size, rules, on sale) |
| Admin orders | `GET /api/admin/orders`, `PATCH /api/admin/orders/{id}/status?status=`, `GET /api/admin/orders/{id}/invoice` | admin | orders, dashboard, customers |
| Admin coupons | `GET/POST /api/admin/coupons`, `PUT/DELETE /api/admin/coupons/{id}` | admin | coupons |

**Not used, on purpose:** the category/gender/keyword product endpoints (they answer HTTP 302, so filtering runs on the
full list); `PUT /api/addresses/{id}` (addresses are added and removed; one used by an order can't change).

**Errors** are told apart (`errorKind` in `client.ts`): 401 → sign in again, 403 → not allowed, 404 → gone or not
yours, 400 → fix the input, 409 → conflict, 5xx → server problem, no response → offline. A cart that can't be loaded
says which.

## 2. Checkout and payment flow

1. **The bag is the server cart** (ported from the ForgeX frontend: `src/lib/api/cart.ts` ≈ `cartService`, `src/lib/cart.ts`
   ≈ `mapCart`, `src/store/cart.ts` ≈ `useCart` + its mutations). The cart belongs to the signed-in account; signed-out
   shoppers are sent to sign in when they add something, and come back to the page they were on.
   - Every change is a request, and what's shown is the cart the server returns: Add to cart (`POST …/quantity/{n}`),
     + and − (`PUT /api/cart/products/{id}/quantity/add|delete`), Remove (`DELETE /api/carts/{cartId}/product/{id}`), and
     the box equivalents. Changes run one after another in the order they were made; on a refusal the server's message is
     shown and the cart is fetched again. "Added ✓" appears only once the server has it.
   - Box lines are the server's, keyed `B:{bundleId}:{sorted ids}`, so differently filled boxes stay separate.
   - Problems are read from the cart itself: a product no longer sold, sold out or short ("Only 2 left"), a box whose rules
     changed or whose fragrance ran short, and a fragrance the cart needs more of than is left when it is on its own **and**
     inside a box. They are shown in the bag and at checkout with "Remove from bag" and "Use available quantities".
   - **Place order stays disabled** while the cart is loading or changing, has any problem, has no address, or has no
     server price.
2. **Address.** Picked or added; the form checks the backend's rules first (building and street ≥ 5, city ≥ 4,
   state ≥ 2, country ≥ 2, PIN ≥ 5, phone 10–15). An address used by an order can't be removed (409, explained).
3. **Price.** Totals, coupon discount and shipping come from `GET /api/checkout/preview`; the server's coupon messages are
   shown as is. Box lines show their contents and the server's box price.
4. **Order.** Right before `POST /api/checkout` the cart is fetched again; if it changed since the total was shown, the
   shopper is asked to check it first.
   - **COD** → `CONFIRMED` / `PENDING_COD`. The backend removes the ordered lines from the cart.
   - **Online** → `PENDING_PAYMENT` + a Razorpay order. Razorpay Checkout opens with the key id, order id and amount from
     the backend. The success callback goes to `/api/payments/verify`; only `PAID` from the server shows "Payment
     received". The backend then removes exactly the ordered lines (anything added meanwhile stays) and the bag reloads.
5. **Edge cases**
   - **Window closed / payment failed:** the order stays reserved and nothing leaves the cart; "Try payment again"
     reuses the same order (kept in `sessionStorage` for 15 minutes, only for the same cart, address and coupon), and
     the order page offers "Complete payment". The backend also reuses the unpaid order if checkout is repeated.
   - **Forged or failed verification:** never shown as paid; the page polls the order, then says it isn't confirmed.
   - **Paid after the 15-minute window:** the backend refunds it and the page says so.
   - **Double clicks:** a lock plus the disabled button give one order per click burst (tested with a triple click).
   - **Stock gone mid-checkout:** the server's "Only N left" is shown and the cart re-checked.

## 3. Admin panel

Routes: `/admin` (dashboard), `/admin/orders`, `/admin/orders/:id`, `/admin/products`, `/admin/products/new`,
`/admin/products/:id`, `/admin/bundles` (Build Your Own Box), `/admin/coupons`, `/admin/customers`.

Access: signed out → `/account?next=/admin/...`; without `ROLE_ADMIN` → "Admins only" (no admin UI or admin API calls);
the role is re-read from `GET /api/auth/user`. The backend's `hasRole("ADMIN")` on `/api/admin/**` is the real control.

| Feature | Notes |
| --- | --- |
| Dashboard | Computed from `GET /api/admin/orders` and the product list (orders to fulfil, sales, payments, stock health, recent orders). |
| Products | Search and filters; create/edit with the backend's rules (duplicate slug → 409, explained); inline stock; live/hidden; Cloudinary upload (resized under 1 MB). **Delete**: a product that is in past orders is refused (409 — hide it instead); otherwise it is deleted and taken out of shoppers' bags. |
| Boxes | Name, slug, products per box (1–10), price, allowed category, repeats, on sale. The storefront and checkout use these values. |
| Orders | Filters and search; detail with items (box contents listed), totals, coupon, address, payment; only allowed status moves; invoice PDF. Cancelling a paid order warns that the API neither refunds nor restocks. |
| Coupons | Create, edit, switch on/off; percent or fixed; minimum order, usage limit, dates. |
| Customers | From order history (the API has no user list). |

Not in the API: refunds (Razorpay Dashboard), user management, shipment tracking, reviews, product variants or galleries.

## 4. Content notes

- Products show their Cloudinary image or a branded placeholder; sample products, reviews and testimonials were removed
  earlier and stay removed.
- **Build Your Own Box is live again**, now priced and validated by the backend. It shows only when the backend has an
  active box; its size and price come from `GET /api/public/bundles`.
- The bag used to be kept on the device (`cosmic-cart-v2` in localStorage). It now lives on the account only; the old
  key is cleared on load, so a bag a guest built before this version isn't carried over.

## 5. Deployment notes

- **CORS:** the browser calls this site's own `/api`, so CORS isn't involved in normal use. Render's `/api/*` rewrite may
  forward the browser's `Origin` header, and the backend now refuses unknown origins (403 "Invalid CORS request"), so put
  the storefront's URL in the backend's `CORS_ALLOWED_ORIGINS`.
- Run the backend's `db/migrations/V2__cart_integrity_and_bundles.sql` once before deploying the new backend.
- Change or disable the backend's seeded demo accounts (`admin@example.com` / `adminPass`) before going live.

## 6. Verification

**Ran in this workspace (frontend):**

| Check | Result |
| --- | --- |
| `npm run typecheck` (tsc) | pass, 0 errors |
| `npm run lint` (ESLint) | pass, 0 problems |
| `npm test` (Vitest: ids, API client, cart mapping and problems, server-cart store) | 60 tests pass |
| `npm run build` | pass |
| `tests/e2e/routes.e2e.mjs` — 40 routes × desktop + phone | pass |
| `tests/e2e/checkout.e2e.mjs` (incl. sign-in to add, bag drawer → server cart) | 33 checks pass |
| `tests/e2e/box.e2e.mjs` (API contracts + Build Your Own Box flows) | 63 checks pass |
| `tests/e2e/admin.e2e.mjs` | 48 checks pass |
| `tests/e2e/account.e2e.mjs` (incl. password reset) | 7 checks pass |
| All five suites against the dev server **and** the production build (`vite preview`) | pass |

The browser tests run against `tests/e2e/forgex-double.mjs`, a stand-in for the API written from the backend source
(after these fixes), with a fake Razorpay window that signs like Razorpay.

**Not run here:** the Spring Boot build and its tests (`./mvnw test`) — Maven Central is blocked from this workspace, so
the backend couldn't be compiled; real Razorpay Checkout and Cloudinary (need your keys).

**Checking against the real backend** (with Razorpay **test** keys):

1. `./mvnw test` in `Forgex` — all tests should pass.
2. Sign in as a customer, build two different boxes plus a single product, check out online and pay with a Razorpay test
   method: expect `PAID`, both boxes listed with their contents on the order and invoice, and the cart emptied of exactly
   those lines.
3. Repeat but fail the payment: the order stays unpaid and the cart is unchanged.
4. Place a COD order; as admin, try to delete a product in it (refused) and change the box price (the store shows it).
