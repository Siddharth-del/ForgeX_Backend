# ForgeX Frontend

React storefront and admin dashboard for ForgeX, built on the real
[ForgeX Spring Boot backend](https://github.com/Siddharth-del/ForgeX_Backend).
Every screen reads from and writes to the backend's actual endpoints; there is
no mock data in the application.

## Tech stack

- React 18 + Vite 5
- React Router 6 (lazy-loaded routes)
- TanStack Query 5 (server state, caching, request de-duplication)
- Axios (one shared client with auth and error interceptors)
- Tailwind CSS 3
- Razorpay Checkout (loaded on demand at payment time)

No UI kit or form library: the design system and validation are small and live in `src/components/common` and `src/utils/validation.js`.

## Installation

```bash
npm install
cp .env.example .env
```

Requires Node 18 or newer.

## Environment

| Variable | Used for | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend base URL. **Leave empty in development** to use the Vite proxy. | `https://api.forgex.in` |
| `VITE_DEV_PROXY_TARGET` | Development only. Where the dev server forwards `/api` and `/images`. | `http://localhost:8080` |
| `VITE_IMAGE_BASE_URL` | Optional. Where uploaded product images are served. Defaults to `<API base>/images`. | `https://cdn.forgex.in/images` |

All `VITE_*` values are compiled into the JavaScript bundle and visible to
anyone. Only public configuration belongs here. The Razorpay **key id** comes
from the backend at checkout; the key **secret** never touches the frontend.

## Development

```bash
npm run dev
```

Opens on http://localhost:5173. With `VITE_API_BASE_URL` empty, requests to
`/api/**` and `/images/**` are proxied to `VITE_DEV_PROXY_TARGET`, so the
browser talks to a single origin. Start the Spring Boot backend on port 8080
first.

## Production build

```bash
npm run build
```

Outputs static files to `dist/`. Set `VITE_API_BASE_URL` at build time.

## Preview

```bash
npm run preview
```

Serves the production build locally on http://localhost:4173 (same proxy rules).

### Hosting

Any static host works (Netlify, Vercel, Cloudflare Pages, Nginx). Configure a
single-page-app fallback so every path serves `index.html`, for example on
Netlify a `_redirects` file containing `/* /index.html 200`.

The simplest production setup serves the frontend and proxies `/api` and
`/images` to the backend from the **same domain**. That avoids CORS entirely.
If the backend is on a different domain, the backend's CORS configuration must
allow the frontend origin (see `docs/BACKEND_INTEGRATION.md`).

## How it connects to the backend

| Area | Backend endpoints used |
|---|---|
| Auth | `POST /api/auth/signin`, `POST /api/auth/signup`, `GET /api/auth/user`, `POST /api/auth/signout` |
| Products | `GET /api/public/products`, `/keyword/{q}`, `/category/{c}`, `/gender/{g}` |
| Product admin | `POST /api/admin/products`, `PUT /api/admin/products/{id}`, `PUT /api/admin/products/{id}/image`, `DELETE /api/public/products/{id}` |
| Cart | `GET /api/carts/users/cart`, `POST /api/carts/products/{id}/quantity/{n}`, `PUT /api/cart/products/{id}/quantity/{add\|delete}`, `DELETE /api/carts/{cartId}/product/{id}` |
| Addresses | `GET /api/users/addresses`, `POST /api/addresses`, `PUT/DELETE /api/addresses/{id}` |
| Checkout | `GET /api/checkout/preview`, `POST /api/checkout`, `POST /api/payments/verify` |
| Orders | `GET /api/orders`, `GET /api/orders/{id}` |
| Admin | `GET /api/admin/orders`, `PATCH /api/admin/orders/{id}/status`, `/api/admin/coupons` CRUD |

**Authentication.** Sign-in returns a JWT in the response body. It is stored by
`src/utils/session.js` and sent as `Authorization: Bearer <token>` on every
request. Roles come from `GET /api/auth/user` on load, never from the token
alone. Any 401 clears the session and returns the user to sign-in. Admin routes
are hidden from non-admins in the UI, and every admin call is still authorised
by the backend.

**Money.** The backend stores all amounts in paise. The frontend only formats
them; totals at checkout come from `GET /api/checkout/preview` and are never
calculated in the browser for charging.

**Payments.** `POST /api/checkout` creates the order and, for online payment, a
Razorpay order. The Razorpay window opens with that order id; on success the
signed response goes to `POST /api/payments/verify`. The order page polls while
payment is pending so a webhook confirmation appears automatically.

Known backend gaps and how the frontend handles each are listed in
[`docs/BACKEND_INTEGRATION.md`](docs/BACKEND_INTEGRATION.md). **Read it before going live.**

## Project structure

```
src/
├── components/
│   ├── common/      Design system: Button, Field inputs, Modal, ConfirmDialog, Skeleton,
│   │                EmptyState/ErrorState/Notice, Pagination, Price, Badge, ProductImage
│   ├── layout/      Header (desktop + mobile nav, search, cart count, user menu), Footer, AdminLayout
│   ├── product/     ProductCard, ProductGrid, ProductFilters
│   ├── checkout/    AddressForm
│   └── order/       OrderStatusBadge, PriceSummary
├── pages/           One folder per route (Home, Products, ProductDetails, Cart, Checkout,
│                    Orders, Profile, Login, Register, Admin/*, NotFound)
├── services/        apiClient + one module per backend area; mappers.js converts DTOs
├── hooks/           TanStack Query hooks (catalog, cart, orders, addresses, admin), useForm
├── context/         AuthContext (session + roles), ToastContext (notifications)
├── routes/          Route table and guards (RequireAuth, RequireAdmin, GuestOnly)
├── utils/           Formatting, validation, error parsing, session storage, image URLs
└── constants/       Enum values and labels mirrored from the backend
```

**Rules the code follows.** Components never call Axios directly; they use
hooks, which use services. Backend field names (`productId`, `fragranceFamily`,
`orderItems`) are converted in `services/mappers.js` and nowhere else.

## Manual test checklist

- Register, sign in, wrong password (shows "Incorrect email or password"), sign out, expired session (redirects to sign-in).
- `/profile` and `/orders` redirect guests to sign-in; `/admin` redirects non-admins home.
- Products: search, each filter, combined filters, each sort, pagination, empty results.
- Product page: in stock, low stock, out of stock, unknown id.
- Cart and checkout (after the backend cart is implemented): add, +/−, remove, refresh, coupon valid/invalid, COD, Razorpay success, Razorpay closed, double-click on Pay.
- Orders list and detail, including the pending-payment state.
- Admin: create, edit, deactivate, delete product, image upload, order status moves, coupons.
- Check at 375px, 768px and 1280px widths.
