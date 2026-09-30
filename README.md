# ForgeX storefront

Next.js storefront and admin for the ForgeX Spring Boot backend (`../Forgex`).
Every screen reads from and writes to the real API — there is no mock data in the app.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Motion ·
TanStack Query · React Hook Form + Zod · Lucide · Sonner. Fonts (Instrument Serif, Inter Tight)
are self-hosted from `src/app/fonts`.

## Run it

```bash
cp .env.example .env.local     # point BACKEND_URL at the Spring Boot API
npm install
npm run dev                    # http://localhost:3000
npm run build && npm start     # production
npm run lint
```

Start the backend first (`cd ../Forgex && ./mvnw spring-boot:run`, with its env vars set).

## How it talks to the backend

- `next.config.ts` rewrites `/api/*` → `${BACKEND_URL}/api/*`. The browser only ever talks to this
  origin, so there's no CORS, and the backend's JWT cookie (`springBootEcom`, path `/api`, now
  `HttpOnly`) is first-party. The token in the sign-in response body is discarded, never stored.
- Server components (home, shop, product pages) fetch the catalogue directly from `BACKEND_URL`,
  cached for 60s under the `catalog` tag. Admin product edits call
  `POST /api/storefront/revalidate` (admin-checked against the backend) so changes show instantly.
- Client state (session, bag, addresses, orders, checkout preview, admin) uses TanStack Query hooks
  in `src/hooks`, which call the typed wrappers in `src/lib/api/endpoints.ts`.
- All money stays in paise as the API sends it; checkout totals always come from
  `GET /api/checkout/preview` — the browser never computes what's charged.
- Payments: `POST /api/checkout` creates the order (+ Razorpay order). Razorpay Checkout loads on
  demand; the signed result goes to `POST /api/payments/verify`. The order page polls while
  `PENDING_PAYMENT` (the webhook may confirm it) and lets the shopper resume payment within the
  15-minute window.

## Structure

```
src/
  app/
    (store)/          storefront pages with navbar/footer: home, shop, products/[slug], cart,
                      checkout, account (orders, order detail, addresses)
    (auth)/           login, register, forgot-password (split-screen layout)
    admin/            overview, orders, products, coupons (admin-only)
    api/storefront/   revalidate route (the only Next API route; everything else is proxied)
    sitemap.ts robots.ts opengraph-image.tsx icon.svg not-found.tsx error.tsx
  components/
    ui/               Button, fields, Sheet (accessible drawer/dialog), Badge, Skeleton…
    motion/           Reveal, Stagger, LineReveal, Parallax, Magnetic
    layout/ home/ product/ cart/ checkout/ account/ auth/ admin/ states/
  hooks/              use-auth, use-cart, use-account, use-payment, use-admin
  lib/                api client + endpoints, types (mirror the DTOs), validation (mirrors the
                      Jakarta constraints), catalog query, razorpay loader, constants
```

## Design system

Tokens live in `src/app/globals.css` (`@theme`): ink/bone surfaces, one ember accent, tight 2–4px
radii, `.container-x` gutter, `.eyebrow` micro-labels, `.display` serif headings. Motion is limited
to line reveals, scroll reveals/stagger, gentle parallax, the bag drawer and one magnetic CTA, and
respects `prefers-reduced-motion`.

## Mobile & desktop

Checked at 320, 375, 390, 430 (phones), 768/1024 (tablets), 1280 and 1920 px, signed out, signed in
and as admin, including the menu, search, filter and bag overlays:

- No page scrolls sideways at any width; every grid has a shrinkable base column.
- Form fields are 16px on phones so iOS Safari doesn't zoom in; touch targets are ≥ 44px tall.
- Hover-only UI has touch fallbacks (quick-add stays visible on touch screens, incl. iPad).
- Phones get a pinned "Add to bag" bar on product pages and a pinned total + pay bar at checkout;
  the admin orders and products tables become cards.
- Safe-area insets for notched phones (`viewport-fit=cover`), and a web app manifest + icons so
  the store can be added to the home screen and opened full-screen.

Tailwind v4 targets current browsers (Safari 16.4+, Chrome 111+, Firefox 128+).

Products without a photo render a vector bottle tinted by fragrance family, so the grid never
shows a broken image. Upload real photography from **Admin → Products** (stored on Cloudinary).

## Recommended backend additions

These aren't faked in the UI; they'd make it better:

| Need | Suggested endpoint |
|---|---|
| Product page lookup without loading the catalogue | `GET /api/public/products/slug/{slug}` |
| Server-side combined filters (type + family + gender + search) and hiding inactive products | query params on `GET /api/public/products` |
| Profile / change password while signed in | `PUT /api/users/me`, `POST /api/users/me/password` |
| Resume a Razorpay payment from another device | expose `razorpayOrderId` on the customer `OrderDTO`, or `POST /api/orders/{id}/pay` |
| Reviews, newsletter | not in the backend today, so not shown |
