import "server-only";
import { cache } from "react";
import { productsApi } from "../api/endpoints";
import type { Product } from "../types";

/**
 * The whole storefront catalogue, fetched once per request and cached by Next's
 * data cache for 60s. The backend has no "product by slug" or combined-filter
 * endpoint yet, so product pages and multi-facet filters read from this list.
 * (See README → "Recommended backend additions".)
 */
const CATALOG_SIZE = 500;

export const getCatalog = cache(async (): Promise<Product[]> => {
  const page = await productsApi.list(
    { pageNumber: 0, pageSize: CATALOG_SIZE, sortBy: "productId", sortOrder: "asc" },
    { next: { revalidate: 60, tags: ["catalog"] } },
  );
  // Inactive products stay visible to admins but never in the store
  return (page.content ?? []).filter((p) => p.active !== false);
});

export async function getProductBySlug(slug: string) {
  const all = await getCatalog();
  const decoded = decodeURIComponent(slug);
  return all.find((p) => p.slug === decoded) ?? all.find((p) => String(p.productId) === decoded) ?? null;
}

export const inStock = (p: Product) => (p.stock ?? 0) > 0;
