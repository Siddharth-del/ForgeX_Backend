# Cosmic Life — Parfums & Attars (React + Vite)

The Cosmic Life storefront and the ForgeX admin panel, built on **React 19 + Vite 7 + React Router 7 + TypeScript +
Tailwind CSS 3 + Framer Motion + Zustand**. Everything runs against the **ForgeX Spring Boot API**
(`forgexperfumes-code/forgex_website`): products, accounts, addresses, cart, Build Your Own Box, checkout, Razorpay and
cash-on-delivery payments, orders, invoices, and the admin tools for products, boxes, orders and coupons.

| | URL |
| --- | --- |
| Storefront, local | **http://localhost:5173** |
| Admin panel, local | **http://localhost:5173/admin** (sign in with an account that has `ROLE_ADMIN`) |
| ForgeX API, local | **http://localhost:8080** |
| Storefront, Render | `https://<your-frontend>.onrender.com` (after you deploy, see below) |
| ForgeX API, Render | `https://<your-backend>.onrender.com` (set in `render.yaml` and `.env.production`) |

**How the storefront talks to the API:** the browser only ever calls the storefront's own `/api/...` address, and the
server in front of it forwards those calls to the backend (Vite's dev/preview server locally, a rewrite rule on Render).
The browser never makes a cross-site request, so CORS isn't involved. (The backend does apply CORS now, for the origins in
its `CORS_ALLOWED_ORIGINS`: add the storefront's URL there, see "Deploy on Render".)

Requires **Node 20.19+ or 22.12+**. Full endpoint map, checkout flow, admin features and test results:
**[docs/INTEGRATION.md](docs/INTEGRATION.md)**. Backend changes, environment variables and the database migration:
`Forgex/docs/CART-CHECKOUT-AND-BOXES.md` in the backend repo.

## Run it locally

1. Start the ForgeX backend on port 8080 (from the backend repo's `Forgex` folder, with its environment variables set:
   database, `JWT_SECRET`, Razorpay **test** keys, Cloudinary and mail — see its `docs/CART-CHECKOUT-AND-BOXES.md`):

   ```bash
   ./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
   ```

2. Start the storefront:

   ```bash
   npm install
   npm run dev                   # http://localhost:5173
   ```

3. Sign in at http://localhost:5173/account. The backend seeds two accounts on start-up:
   `user1@example.com` / `password1` (customer) and `admin@example.com` / `adminPass` (admin → **Admin** appears in the navbar).

### Configuration (public values only)

| Variable | Used by | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_PROXY_TARGET` | `npm run dev`, `npm run preview` | `http://localhost:8080` (`.env.development`) | Where `/api` is forwarded |
| `VITE_API_BASE_URL` | the browser | empty | Empty = call this site's own `/api` (recommended). To call the backend directly instead, set its URL here and add this site's origin to the backend's `CORS_ALLOWED_ORIGINS` |
| `VITE_NEWSLETTER_URL` | the browser | empty | Optional public form endpoint of your email provider for the newsletter |

`.env.example` lists them. **Never put secrets in `VITE_` variables**: they end up in the browser. The Razorpay key id
the checkout uses arrives from the backend with each order; the Razorpay secret, Cloudinary keys, JWT secret and
database credentials stay on the backend. Use `.env.local` (git-ignored) for machine-only overrides.

## Deploy on Render

### 1. The backend (if it isn't on Render yet)
Create a **Web Service** from the backend repo with **Docker** as the runtime (root directory `Forgex`; the repo has a
Dockerfile). Add its environment variables (`DATABASE_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`,
`CORS_ALLOWED_ORIGINS` including `https://<your-frontend>.onrender.com`, `MAIL_*`, `RAZORPAY_KEY_ID`,
`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `CLOUDINARY_*`). Before the first deploy of this version, run
`db/migrations/V2__cart_integrity_and_bundles.sql` once against the database. In the Razorpay Dashboard, point a webhook
at `https://<your-backend>.onrender.com/api/public/webhooks/razorpay` for `payment.captured` and `payment.failed` (it marks
orders paid even if the customer closes the tab right after paying).

### 2. The storefront (this folder)
In `render.yaml`, replace `YOUR-BACKEND` in the `/api/*` rewrite with the backend URL. Push this folder to GitHub, then in
Render choose **New → Blueprint** and pick the repo. It builds with `npm ci && npm run build`, publishes `dist/`, forwards
`/api/*` to the backend, and serves `index.html` for every page so deep links (including `/admin/...`) work.

Without a Blueprint: **New → Static Site**, build `npm ci && npm run build`, publish `dist`, and add these
**Redirects/Rewrites** in this order:

| Source | Destination | Action |
| --- | --- | --- |
| `/api/*` | `https://<your-backend>.onrender.com/api/*` | Rewrite |
| `/*` | `/index.html` | Rewrite |

If the `/api` rule is missing, pages say *"The store isn't connected to its server"*. Render's free tier sleeps after
~15 minutes idle; the first request can take up to a minute and forms say they're waking the server.

## What's connected

| Area | Where | Backend |
| --- | --- | --- |
| Products, collections, search, filters, product pages | `src/lib/catalog.ts` | `GET /api/public/products` (all pages; only active products are shown) |
| Sign in, sign up, password reset, session | `src/components/layout/AccountView.tsx`, `src/store/auth.ts` | `/api/auth/*` |
| Bag (the account's server cart: products and boxes) | `src/store/cart.ts`, `src/lib/cart.ts`, `src/lib/api/cart.ts`, `src/components/cart/CartDrawer.tsx` | `/api/carts/...`, `/api/cart/...` |
| Build Your Own Box | `src/components/box/BoxBuilder.tsx`, `/build-your-box` | `GET /api/public/bundles`, `POST /api/carts/bundles/{id}` |
| Addresses | `src/components/account/Addresses.tsx` | `/api/addresses`, `/api/users/addresses` |
| Checkout, coupons, Razorpay, COD | `src/components/cart/CheckoutView.tsx`, `src/lib/payOrder.ts` | `/api/checkout/preview`, `/api/checkout`, `/api/payments/verify` |
| Orders, invoices | `src/components/orders/*`, `/account`, `/account/orders/:id` | `/api/orders`, `/api/orders/{id}/invoice` |
| Admin panel | `src/layouts/AdminLayout.tsx`, `src/pages/admin/*` | `/api/admin/*` |

**The bag is the account's server cart** (the ForgeX frontend's cart model). Shoppers sign in to add to it; "Add to
cart" while signed out goes to sign-in and back. Every change (add, +/−, remove, add a box) is a request, and the bag,
navbar count and checkout show the cart the server sends back, so they always match what an order will contain.
Nothing about the bag is stored on the device, and it follows the account across devices.

**Payments are confirmed by the server only.** The Razorpay window's success callback is sent to
`POST /api/payments/verify`, where the backend checks the signature with its secret; the shopper sees "Payment received"
only when the backend says the order is `PAID`. Closing the window keeps the order reserved (15 minutes on the backend)
and offers to resume the same order rather than creating another.

All requests go through one client, `src/lib/api/client.ts`: base URL, Bearer token, cookies (`credentials: "include"`),
timeouts, readable errors that tell 400/401/403/404/409/5xx apart, and session-expiry handling. Ids are checked before a
URL is built (`src/lib/ids.ts`), so a bad id never becomes a request like `/products/NaN`.

**Build Your Own Box** is priced and validated by the backend: the box's size, price and rules come from
`GET /api/public/bundles`, a box goes into the server cart as the box id plus the chosen product ids, and checkout charges
the server's box price. Differently filled boxes are separate lines; the order lists what was in each box.

## Admin panel

`/admin` has its own layout (black and gold), separate from the storefront. Signed-out visitors are sent to sign in;
signed-in customers see an "Admins only" page; the admin role is re-checked with `GET /api/auth/user` instead of trusting
the stored profile. **The real protection is the backend's `ROLE_ADMIN` rule on `/api/admin/**`**: every admin call
carries the token, and 401/403 responses are shown as such.

- **Dashboard**: orders to fulfil, last-30-day sales, online payments captured, COD open/delivered, awaiting payment,
  customers, average order, catalogue health (out of stock, low stock, missing images), recent orders, status breakdown.
  Every figure is computed from the API's orders and products.
- **Products**: list with search and filters, create/edit with the backend's rules, inline stock edit, live/hidden switch,
  image upload to Cloudinary (photos are resized in the browser to fit the backend's 1 MB limit), delete with a clear
  message when a product can't be deleted.
- **Orders**: filter by status or payment method, search, detail with address and items, only the status moves the
  backend allows (Paid → Confirmed/Cancelled, Confirmed → Shipped/Cancelled, Shipped → Delivered), invoice PDF.
- **Boxes**: Build Your Own Box settings — products per box, price, allowed category, repeats, on sale.
- **Coupons**: create, edit, switch on/off; percent (1–90, optional cap) or fixed amount, minimum order, usage limit, dates.
- **Customers**: everyone who has ordered, from order history (the API has no user-management endpoint).

Not available because the API doesn't support it: refunds (use the Razorpay Dashboard), customer account management,
shipment tracking numbers, reviews, fragrance notes and gift sets. Details in `docs/INTEGRATION.md`.

## Scripts

```bash
npm run dev          # dev server, http://localhost:5173
npm run build        # type-check, then production build into dist/
npm run preview      # serve dist/ at http://localhost:4173
npm run typecheck
npm run lint
npm test             # unit tests (Vitest)
npm run test:double  # ForgeX test double on :8080 (for the browser tests)
npm run test:e2e     # browser tests, see tests/e2e/README.md
```

## Project structure

```
index.html              page shell (title, meta, favicon)
vite.config.ts          React plugin, @/ alias, /api proxy, dev server on localhost:5173
render.yaml             Render static-site Blueprint (/api rewrite + SPA fallback)
docs/INTEGRATION.md     endpoints, admin features, removed assets, backend to-dos, test results
vitest.config.ts        unit tests (src/**/*.test.ts)
tests/e2e/              Playwright suites + a test double of the ForgeX API
src/
  router.tsx            all routes; storefront under RootLayout, admin under AdminLayout
  layouts/              RootLayout (storefront shell), AdminLayout (admin shell + access check)
  pages/                one file per route; pages/admin/ for the admin panel
  components/           storefront sections; account/ (addresses), orders/, admin/ (admin UI kit)
  lib/                  api/ (one module per backend area), ids.ts, catalog.ts, payOrder.ts, razorpay.ts,
                        cart.ts, pendingPayment.ts, orders.ts, admin.ts, image.ts, site.ts
  store/                cart (server cart), wishlist, ui, toast, auth (Zustand; wishlist and auth persisted)
  hooks/  data/  types/
public/images/campaign/ brand campaign renders (bottles carry only the brand name)
```

| Route | Page |
| --- | --- |
| `/` | Home |
| `/collections/:slug` | `perfumes`, `attars`, `oud`, `new-arrivals`, `him`, `her`, `all` (`bestsellers` and `gift-sets` redirect to `all`) |
| `/products/:slug` | Product page |
| `/build-your-box` | Build Your Own Box (shown when the backend has a box on sale) |
| `/checkout` | Checkout (sign-in required) |
| `/account`, `/account/orders/:id` | Profile, orders, addresses; order detail, payment resume, invoice |
| `/admin`, `/admin/orders[/:id]`, `/admin/products[/new\|/:id]`, `/admin/bundles`, `/admin/coupons`, `/admin/customers` | Admin panel |
| `/journal`, `/journal/:slug`, `/about`, `/wishlist`, `/help/:slug` | Editorial, story, saved items, customer care |

## Before launch

- Replace the placeholder contact details in `src/lib/site.ts` (`care@cosmiclife.in`, `+91 00000 00000`).
- Shipping, returns, refund, privacy and terms pages are marked as templates: confirm delivery times and return windows,
  and have them reviewed.
- On the backend: set a new `JWT_SECRET` (the old one was committed), set `CORS_ALLOWED_ORIGINS`, run the database
  migration, and change or disable the seeded demo accounts (`admin@example.com` / `adminPass`).
- The newsletter form has no backend endpoint. Set `VITE_NEWSLETTER_URL` to your email provider's public form endpoint;
  until then it tells visitors sign-ups aren't open yet.
