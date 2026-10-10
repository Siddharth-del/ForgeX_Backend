/** Public product endpoints (controller/ProductController.java). */
import { api } from "@/lib/api/client";
import type { ProductDTO, ProductResponse } from "@/lib/api/types";

const PAGE_SIZE = 100;

/**
 * Every product, active or not, via GET /api/public/products (paged; we walk all pages).
 * The category/gender/keyword endpoints answer with HTTP 302 + body, which browsers treat as a
 * failed request, so filtering happens on this list instead.
 */
export async function fetchAllProducts(signal?: AbortSignal): Promise<ProductDTO[]> {
  const all: ProductDTO[] = [];
  for (let page = 0; page < 50; page++) {
    const res = await api<ProductResponse>("/api/public/products", {
      auth: false,
      signal,
      query: { pageNumber: page, pageSize: PAGE_SIZE, sortBy: "productId", sortOrder: "asc" },
    });
    all.push(...(res.content ?? []));
    if (res.lastPage || !res.content?.length) break;
  }
  return all;
}
