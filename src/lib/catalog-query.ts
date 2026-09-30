import type { Category, FragranceFamily, Gender, Product } from "./types";
import { SORTS, type SortValue } from "./constants";

export interface ShopQuery {
  q?: string;
  category?: Category;
  gender?: Gender;
  family?: FragranceFamily;
  sort: SortValue;
  page: number;
}

export const PAGE_SIZE = 12;

const CATEGORY_SET = new Set(["ATTAR", "PERFUME"]);
const GENDER_SET = new Set(["MEN", "WOMEN", "UNISEX"]);
const FAMILY_SET = new Set(["AMBER", "AQUATIC", "AROMATIC", "EARTHY", "FLORAL", "MIXED", "WOODY"]);

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Parse and sanitise URL search params into a ShopQuery. Unknown values are dropped. */
export function parseShopQuery(sp: Record<string, string | string[] | undefined>): ShopQuery {
  const category = one(sp.category)?.toUpperCase();
  const gender = one(sp.gender)?.toUpperCase();
  const family = one(sp.family)?.toUpperCase();
  const sort = one(sp.sort);
  const page = Number.parseInt(one(sp.page) ?? "1", 10);
  return {
    q: one(sp.q)?.trim().slice(0, 80) || undefined,
    category: category && CATEGORY_SET.has(category) ? (category as Category) : undefined,
    gender: gender && GENDER_SET.has(gender) ? (gender as Gender) : undefined,
    family: family && FAMILY_SET.has(family) ? (family as FragranceFamily) : undefined,
    sort: SORTS.some((s) => s.value === sort) ? (sort as SortValue) : "featured",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function applyShopQuery(products: Product[], q: ShopQuery) {
  const needle = q.q?.toLowerCase();
  let list = products.filter(
    (p) =>
      (!q.category || p.category === q.category) &&
      (!q.gender || p.gender === q.gender) &&
      (!q.family || p.fragranceFamily === q.family) &&
      (!needle ||
        p.name.toLowerCase().includes(needle) ||
        (p.description ?? "").toLowerCase().includes(needle) ||
        (p.fragranceFamily ?? "").toLowerCase().includes(needle)),
  );

  const byStockFirst = (a: Product, b: Product) => Number((b.stock ?? 0) > 0) - Number((a.stock ?? 0) > 0);
  switch (q.sort) {
    case "newest":
      list = [...list].sort((a, b) => b.productId - a.productId);
      break;
    case "price-asc":
      list = [...list].sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list = [...list].sort((a, b) => b.price - a.price);
      break;
    case "savings":
      list = [...list].sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0));
      break;
    default:
      list = [...list].sort((a, b) => byStockFirst(a, b) || a.productId - b.productId);
  }

  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(q.page, pages);
  return { items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total, pages, page };
}

/** Build a /shop URL from a query, dropping defaults so URLs stay clean and shareable. */
export function shopHref(q: Partial<ShopQuery>) {
  const sp = new URLSearchParams();
  if (q.q) sp.set("q", q.q);
  if (q.category) sp.set("category", q.category.toLowerCase());
  if (q.gender) sp.set("gender", q.gender.toLowerCase());
  if (q.family) sp.set("family", q.family.toLowerCase());
  if (q.sort && q.sort !== "featured") sp.set("sort", q.sort);
  if (q.page && q.page > 1) sp.set("page", String(q.page));
  const s = sp.toString();
  return s ? `/shop?${s}` : "/shop";
}
