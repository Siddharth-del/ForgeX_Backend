# ForgeX integration notes

How the Cosmic Life storefront and the ForgeX admin panel use the ForgeX Spring Boot API, what was removed, what was
tested, and what the backend still needs. The backend was **not modified**; every contract below was read from its source
(`forgex_website/Forgex/src/main/java/com/example/ForgeX`).

## 1. Endpoints used

All calls go through `src/lib/api/client.ts` to the site's own `/api/...` (forwarded to the backend), with
`Authorization: Bearer <jwt>` when signed in. Money is in **paise** on the wire and converted only for display.

| Area | Method & path | Auth | Used by |
| --- | --- | --- | --- |
| Auth | `POST /api/auth/signin`, `POST /api/auth/signup`, `GET /api/auth/user`, `POST /api/auth/signout` | – / token | account page, session check, admin role re-check |
| | `POST /api/auth/forgot/password?email=`, `POST /api/auth/verify-otp?email=&otp=`, `POST /api/auth/reset-password?email=` | – | password reset |
| Products | `GET /api/public/products?pageNumber&pageSize=100&sortBy=productId&sortOrder=asc` (every page) | – | whole storefront, admin lists |
| Cart | `GET /api/carts/users/cart` | user | checkout sync |
| | `POST /api/carts/products/{id}/quantity/{qty}` | user | checkout sync (adds to existing quantity) |
| | `DELETE /api/carts/{cartId}/product/{id}` | user | checkout sync |
| Addresses | `GET /api/users/addresses`, `POST /api/addresses`, `GET /api/addresses/{id}`, `DELETE /api/addresses/{id}` | user | checkout, account, order pages, admin order detail |
| Checkout | `GET /api/checkout/preview?coupon=` | user | server price + coupon check |
| | `POST /api/checkout` `{addressId, paymentMethod: RAZORPAY\|COD, couponCode?}` | user | creates the order, reserves stock |
| | `POST /api/payments/verify` `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` | user | server-side signature check → `PAID` |
| Orders | `GET /api/orders`, `GET /api/orders/{id}`, `GET /api/orders/{id}/invoice` (PDF) | user | account, order page |
| Admin products | `POST /api/admin/products`, `PUT /api/admin/products/{id}`, `PUT /api/admin/products/{id}/image` (multipart `image`) | admin | product editor, inline stock, live/hidden |
| | `DELETE /api/public/products/{id}` | (none required, token sent) | product delete |
| Admin orders | `GET /api/admin/orders`, `PATCH /api/admin/orders/{id}/status?status=`, `GET /api/admin/orders/{id}/invoice` | admin | orders, dashboard, customers |
| Admin coupons | `GET/POST /api/admin/coupons`, `PUT/DELETE /api/admin/coupons/{id}` | admin | coupons |

**Not used, on purpose:**

- `GET /api/public/categories/{c}/products`, `/gender/{g}/products`, `/products/keyword/{k}`: they answer **HTTP 302**
  with a body, which browsers treat as a redirect, so filtering is done on the full product list instead.
- `PUT /api/addresses/{id}`: it ignores `state` and `phoneNumber`, so addresses are added and removed, never edited.
- `GET /api/addresses` and `GET /api/carts`: they return **every user's** addresses/carts (see section 5).
- `PUT /api/cart/products/{id}/quantity/{add|delete}`: the sync uses add/remove instead (exact quantities in fewer calls).

## 2. Checkout and payment flow

1. The bag (kept on the device) is copied to the shopper's server cart, because the backend prices **its** cart.
   Problems the server reports (sold out, "Only 2 left", inactive) are listed and the order button stays disabled until
   the bag matches; "Use available quantities" fixes it in one click.
2. The shopper picks or adds an address. The backend validates addresses only on the database entity (failures come
   back as a generic 401), so the form checks the same rules first: building and street ≥ 5 characters, city ≥ 4,
   state ≥ 2, country ≥ 2, PIN ≥ 5, phone 10–15.
3. Totals, coupon discount and shipping come from `GET /api/checkout/preview`. Coupons are applied only when the server
   accepts them; its message ("Add ₹300 more to use this coupon", "This coupon has expired"…) is shown as is.
4. `POST /api/checkout` creates the order:
   - **COD** → `CONFIRMED` / payment `PENDING_COD`; the backend empties the cart, the bag is cleared, the confirmation page opens.
   - **Online** → `PENDING_PAYMENT` + a Razorpay order. Razorpay Checkout opens with the key id, order id and amount
     **from the backend's response**. The success callback is sent to `/api/payments/verify`; only a `PAID` answer (or the
     order reading `PAID` afterwards, e.g. via the webhook) shows "Payment received".
5. Edge cases handled:
   - **Window closed / payment failed:** the order stays reserved; the page says nothing was charged and offers
     "Try payment again", which reuses the same order (kept in `sessionStorage` for 15 minutes, only for the same bag,
     address and coupon). The order page also offers "Complete payment".
   - **Verification fails or is unreachable:** the order page is never shown as paid. The page polls the order three
     times, then says the payment isn't confirmed yet (or was rejected) with a link to the order.
   - **Paid after the 15-minute window:** the backend refunds it and the page explains that.
   - **Double clicks:** a lock plus the disabled button mean one order per click burst (tested with a triple click).
   - **Stock gone mid-checkout:** the server's "Only N left" error is shown and the cart re-checked.

The recipient name isn't sent anywhere: the backend's `Address` has no name field (orders carry the account email).

## 3. Admin panel

Routes: `/admin` (dashboard), `/admin/orders`, `/admin/orders/:id`, `/admin/products`, `/admin/products/new`,
`/admin/products/:id`, `/admin/coupons`, `/admin/customers`.

**Access:** signed out → `/account?next=/admin/...`; signed in without `ROLE_ADMIN` → "Admins only" (no admin UI or admin
API calls); the role is re-read from `GET /api/auth/user`, so editing the stored profile doesn't help. Session expiry
signs out and explains why. 401 ends the session; 403 is shown as "the server refused this request". The backend's
`hasRole("ADMIN")` on `/api/admin/**` remains the actual control.

| Feature | Notes |
| --- | --- |
| Dashboard | Orders to fulfil (Paid + Confirmed), last 30 days, online payments captured, COD open/delivered, awaiting payment, customers, average order; products, out of stock, low stock (≤ 5, a display threshold), missing image; recent orders; orders by status; stock to watch. All computed from `GET /api/admin/orders` and the product list; each block has loading, empty and error/retry states. |
| Products | Search; filter by live/hidden, stock, type, missing image; create/edit (name ≤ 100, unique slug ≤ 120, description ≤ 2,000, type, gender, family, price, MRP ≥ price, stock); inline stock; live/hidden switch (full `PUT`, as the API requires); Cloudinary upload (JPEG/PNG/WebP, ≥ 400 px, resized in the browser to under 1 MB); delete with an explanation when the product is used by an order or cart. |
| Orders | Status and payment filters, search by order number/email/product; detail with items, totals, coupon, address, payment; only allowed moves are offered (Paid → Confirmed/Cancelled, Confirmed → Shipped/Cancelled, Shipped → Delivered), each confirmed first; cancelling a paid order warns that the API neither refunds nor restocks; invoice PDF. |
| Coupons | Create, edit (code fixed, as the API requires), switch on/off (`DELETE` = off); percent 1–90 with optional cap, or fixed ₹; minimum order, usage limit, start/end; status shows Active/Scheduled/Expired/Used up/Off. |
| Customers | Emails with order count, spend and last order, from order history. |

**Not supported by the API (not built, shown as such in the panel):** refunds (Razorpay Dashboard), user list/roles/
blocking, shipment tracking/AWB, recording COD cash collected, Razorpay payment ids on orders, reviews, notes, gift sets,
bundles, product image gallery (one image per product).

## 4. Sample content removed

- `src/data/products.ts` (22 sample products with invented notes, ratings, review counts, sizes and prices) — deleted.
- `public/images/products/` — 44 sample product renders deleted. Products show their Cloudinary image or a quiet branded
  placeholder ("image coming soon").
- `src/data/testimonials.ts` — sample reviews removed; the testimonials section and product reviews stay hidden until
  real reviews exist.
- Bestsellers and Gift Sets collections (no sales ranking or gift sets in the API): links redirect to Shop All; the home
  "Bestsellers" carousel became "Our fragrances" (newest first, Him / Her / Attar tabs).
- Build Your Own Box ("Any 3 for ₹1,799"): hidden (`site.features.buildYourBox = false`) because checkout can't price a bundle.
- Footer "sample content" note, the hero's "Pictured: …" caption, the newsletter's fake "You're on the list", COD fee,
  ₹79 shipping and "free 2 ml sample" claims — removed or corrected to the backend's rules (free shipping from ₹1,499,
  otherwise ₹99; no COD fee). Shipping/returns pages are flagged as templates.
- Campaign images re-rendered so bottles carry only the brand name (`hero`, `hero-mobile`, `world-perfume`, `cat-perfume`,
  `banner-perfume`, `gift-banner`, `build-box`, `lineup`, `new-arrival`, `duel`). Attar scenes had no labels and were kept.
- Bags saved by the old sample catalogue are discarded (storage key `cosmic-cart-v2`), and every bag is reconciled with the
  live catalogue on load (gone or sold-out items removed, quantities capped to stock, with a notice).

## 5. Backend: still needed

Security (fix before launch):

1. **`DELETE /api/public/products/{id}` needs no login** — anyone can delete products. Move it under `/api/admin/`.
2. **The JWT secret is committed** in `application.properties` in a public repo, so anyone can mint tokens, including admin
   ones. Move it to an environment variable and rotate it.
3. **Password reset skips the code:** `reset-password?email=` doesn't check that `verify-otp` succeeded.
4. **Addresses:** `GET /api/addresses` lists every user's addresses; `GET/PUT/DELETE /api/addresses/{id}` don't check
   ownership. `GET /api/carts` lists every cart.
5. **Default accounts** `admin@example.com`/`adminPass` and `user1@example.com`/`password1` are created on every start.

Behaviour:

6. **CORS is never applied** (the bean returns `CorsConfigurationSource` and `http.cors()` isn't called); the storefront
   works around it with the same-origin `/api` proxy.
7. **Unhandled errors become 401** (`/error` isn't permitted), so entity validation, unique-slug and foreign-key failures
   look like "Full authentication is required". The client checks the session before signing anyone out and shows a
   readable message. Permitting `/error` and adding handlers for `ConstraintViolationException` /
   `DataIntegrityViolationException` would give real messages.
8. Category, gender and keyword product endpoints return 302.
9. `PUT /api/addresses/{id}` ignores state and phone; `Address` has no recipient name.
10. Admin cancel doesn't release stock or refund; the order DTO lacks Razorpay ids and failure reason; there's no
    single-order admin endpoint (the panel reads the full list).
11. No multipart size setting: Spring's 1 MB default applies (the panel resizes images to fit).
12. Not in the API at all: reviews, fragrance notes, product sizes/variants, multiple images, gift sets, bundle pricing,
    newsletter, user management, shipment tracking.

## 6. Verification

**Ran (in this workspace):**

| Check | Result |
| --- | --- |
| `npm run typecheck` (tsc) | pass, 0 errors |
| `npm run lint` (ESLint, max warnings 0 on `src`) | pass |
| `npm run build` (Vite production build) | pass |
| `tests/e2e/routes.e2e.mjs` — 40 routes × desktop + phone | pass |
| `tests/e2e/checkout.e2e.mjs` — 28 checks | pass |
| `tests/e2e/admin.e2e.mjs` — 45 checks | pass |
| `tests/e2e/account.e2e.mjs` — 4 checks | pass |
| All four suites against the **production build** (`vite preview`) | pass |

These browser tests ran against `tests/e2e/forgex-double.mjs`, a test double written from the backend source, with a
fake Razorpay window that signs payments the way Razorpay does (HMAC-SHA256 with the key secret).

**Not run, and why:**

- **The real Spring Boot backend.** Maven Central is blocked from this workspace, so it couldn't be built. Contracts were
  taken from source; differences in runtime behaviour (Jackson date formats, exact error bodies) weren't observed live.
- **Real Razorpay Checkout and Cloudinary.** Both need your keys and network access.

**Checking against the real backend** (about 15 minutes, with Razorpay **test** keys on the backend):

1. Sign in as `user1@example.com`, add two products, check out with a new address and pay with a test method from
   Razorpay's test-mode docs (for example UPI `success@razorpay`, or test card `4111 1111 1111 1111`). Expect
   "Payment received" and `PAID`.
2. Repeat but close the Razorpay window: expect "Payment not completed"; "Try payment again" must reuse the same order.
3. Place a COD order: expect `CONFIRMED`; download the invoice.
4. Apply a coupon created in the admin; try an expired one.
5. Sign in as the admin: create a product with an image (check it appears on Cloudinary), hide it, move the COD order to
   Shipped → Delivered, and confirm a customer account gets "Admins only" at `/admin`.
