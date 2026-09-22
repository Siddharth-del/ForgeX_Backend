import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as productService from '../services/productService';
import { CATALOG_FETCH_SIZE, PAGE_SIZE, SORT_OPTIONS } from '../constants';

export const catalogKeys = {
  all: ['products'],
  catalog: ['products', 'catalog'],
  list: (f) => ['products', 'list', f],
};

/** Full catalogue — shared by product details, related items, home and admin. */
export function useFullCatalog(options = {}) {
  return useQuery({
    queryKey: catalogKeys.catalog,
    queryFn: productService.getCatalog,
    staleTime: 60_000,
    ...options,
  });
}

export function useProduct(id) {
  const catalog = useFullCatalog();
  const product = catalog.data?.find((p) => String(p.id) === String(id)) ?? null;
  return { ...catalog, product };
}

/**
 * Product listing. The backend filters by only one of keyword / category / gender
 * per request and has no family filter. When a single server-side filter is
 * enough we page on the server; otherwise we fetch the (small) result set once
 * and apply the remaining filters and paging in the browser.
 */
export function useProductList({ q, category, gender, family, sort, page }) {
  const sortOpt = SORT_OPTIONS.find((s) => s.value === sort) ?? SORT_OPTIONS[0];
  const serverFilters = [q && 'q', category && 'category', gender && 'gender'].filter(Boolean);
  const needsClient = serverFilters.length > 1 || Boolean(family);

  return useQuery({
    queryKey: catalogKeys.list({ q, category, gender, family, sort, page }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: async () => {
      const opts = needsClient
        ? { page: 0, size: CATALOG_FETCH_SIZE, sortBy: sortOpt.sortBy, sortOrder: sortOpt.sortOrder }
        : { page, size: PAGE_SIZE, sortBy: sortOpt.sortBy, sortOrder: sortOpt.sortOrder };

      let res;
      if (q) res = await productService.searchProducts(q, opts);
      else if (category) res = await productService.getProductsByCategory(category, opts);
      else if (gender) res = await productService.getProductsByGender(gender, opts);
      else res = await productService.getProducts(opts);

      // Storefront never shows products the admin has switched off.
      let items = res.items.filter((p) => p.active);

      if (!needsClient) {
        return { ...res, items };
      }
      if (category) items = items.filter((p) => p.category === category);
      if (gender) items = items.filter((p) => p.gender === gender);
      if (family) items = items.filter((p) => p.family === family);
      const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
      const safePage = Math.min(page, totalPages - 1);
      return {
        items: items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
        page: safePage,
        total: items.length,
        totalPages,
      };
    },
  });
}
