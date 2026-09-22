# Backend integration notes

Audit of `Siddharth-del/ForgeX_Backend` (main branch) against what the frontend
needs. The frontend was built around the backend as it is. Nothing here was
worked around by inventing endpoints. Items are ordered by impact.

## Blocking: must be fixed in the backend

### 1. The cart service is not implemented
`CartServiceImpl` throws `UnsupportedOperationException` from every method, so
all `/api/carts/**` calls return HTTP 500. Checkout depends on the cart, so
**no order can be placed** until this is implemented.

Frontend behaviour: the cart and checkout pages show a clear "not available yet"
notice instead of a fake cart. `src/services/cartService.js` already calls the
existing endpoints and will work as soon as the service is implemented.

Also needed: `CartDTO` returns `products: ProductDTO[]` with no quantity per
line. The mapper counts each entry as one unit and groups repeats. If the
backend adds a `quantity` field to each entry, the mapper uses it automatically.
If the cart endpoints change shape, only `cartService.js` and `mapCart()` need updating.

### 2. CORS is configured but never applied
`WebSecurityConfig` defines a `CorsConfigurationSource` bean, but the filter
chain never calls `http.cors(...)`. Browsers calling the backend from another
origin are blocked.

Fix in `filterChain`:
```java
http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
```
and add your production frontend origin to `setAllowedOrigins`.

Frontend behaviour: development uses the Vite proxy (same origin), so this does
not block local work. Production needs either this fix or a same-domain reverse proxy.

### 3. Uploaded product images are not served
`FileServiceImpl` saves uploads to the `images/` folder and stores only the file
name, and `/images/**` is permitted in security, but no resource handler serves
that folder. Image URLs return 404.

Fix, for example:
```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/images/**").addResourceLocations("file:images/");
    }
}
```
Frontend behaviour: images resolve to `<API base>/images/<file>` (override with
`VITE_IMAGE_BASE_URL`). Missing or broken images show a neutral bottle
placeholder without shifting the layout.

## Access control issues

### 4. Product delete is public
`DELETE /api/public/products/{productId}` sits under `/api/public/**`, which is
`permitAll`. **Anyone can delete products without signing in.** Move it to
`/api/admin/products/{productId}`, then change one line in
`productService.deleteProduct`.

### 5. Address endpoints have no ownership checks
`GET /api/addresses` returns every user's addresses, and get/put/delete by id do
not check the owner. The frontend only uses `GET /api/users/addresses` (own
addresses) and edits addresses from that list, but the API itself is open to
any signed-in user.

### 6. Secrets in `application.properties`
The database password and JWT secret are committed. Move them to environment
variables and rotate both.

## Contract quirks handled in the frontend

| Backend behaviour | Frontend handling |
|---|---|
| `keyword`, `category` and `gender` product endpoints return **302 FOUND** instead of 200 | Those calls accept 302 (`accept302` in `apiClient.js`). Change them to `HttpStatus.OK` when convenient; nothing else changes. |
| No `GET` product by id | Product pages look the product up in the full catalogue (one cached request). Fine for a small catalogue; add `GET /api/public/products/{id}` before the catalogue grows. |
| Public product list includes inactive products | The storefront filters out `active: false`; the admin table shows all. A backend filter would be better. |
| Only one of keyword / category / gender per request; no fragrance-family or price filter | Single filters page on the server. Combined filters fetch the result set once and filter and page in the browser. |
| JWT issued as a non-HttpOnly cookie **and** in the response body | The frontend uses the body token as a Bearer header. The cookie is ignored. |
| Errors come in several shapes (`APIResponse`, validation map, entry-point JSON, Spring default) | `utils/errors.js` normalises all of them and never shows Java exception text. |

## Not available in the backend (UI isolated, not faked)

- **Admin user management**: no endpoints. `/admin/users` explains this.
- **Profile edit and password change**: no endpoints. The profile page is read-only with a note.
- **Product reviews**: no endpoints. Not shown.
- **Newsletter**: no endpoint. Not shown.
- **Customer phone number at checkout**: no field in `Address` or the checkout request, so it isn't collected.
