/**
 * Catalogue: the single boundary between the storefront and product data.
 *
 * Products come from the ForgeX backend (GET /api/public/products) and are mapped into the
 * storefront's Product shape here. Nothing is invented: fields the backend doesn't have
 * (notes, ratings, sizes…) are left empty and their sections stay hidden. Inactive products
 * are never shown to shoppers.
 */
import { categories as allCategories, collections } from "@/data/collections";
import { journal } from "@/data/journal";
import { testimonials } from "@/data/testimonials";
import { fetchAllProducts } from "@/lib/api/products";
import { rupees, type FragranceFamilyEnum, type ProductDTO } from "@/lib/api/types";
import type { Collection, Product, ScentFamily } from "@/types";

/* ------------------------------------------------------------------ mapping */

export const familyLabel = (f: FragranceFamilyEnum | ScentFamily | null | undefined) => (f ? f.charAt(0).toUpperCase() + f.slice(1).toLowerCase() : "");

/** Ask Cloudinary for a right-sized, auto-format copy; other URLs are used as they are. */
export function optimisedImage(url: string, width = 1200): string {
  const m = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/);
  return m ? `${m[1]}f_auto,q_auto,c_limit,w_${width}/${m[2]}` : url;
}

const isUsableImage = (src: string | null | undefined): src is string => !!src && /^(https?:)?\/\//i.test(src.trim());

export function toProduct(d: ProductDTO): Product {
  const price = rupees(d.price);
  const mrp = rupees(d.mrp);
  const stock = d.stock ?? 0;
  const active = d.active !== false;
  const type = d.category === "ATTAR" ? "attar" : "perfume";
  return {
    id: String(d.productId),
    productId: d.productId,
    slug: d.slug || `product-${d.productId}`,
    name: d.name,
    type,
    world: type,
    gender: d.gender === "MEN" ? "him" : d.gender === "WOMEN" ? "her" : "unisex",
    family: familyLabel(d.fragranceFamily),
    families: d.fragranceFamily ? [d.fragranceFamily.toLowerCase() as ScentFamily] : [],
    description: d.description ?? "",
    variants: [{ id: String(d.productId), size: "", price, compareAt: mrp > price ? mrp : undefined, inStock: active && stock > 0 }],
    images: isUsableImage(d.image) ? [{ src: optimisedImage(d.image.trim()), alt: d.name, width: 1000, height: 1250 }] : [],
    stock,
    active,
    discount: d.discount ?? 0,
    badges: [],
  };
}

/* ------------------------------------------------------------------ products */

const TTL = 60_000;
let cache: { at: number; promise: Promise<Product[]> } | null = null;

/** Drop the cached list (after an admin edit, or to retry after an error). */
export function invalidateCatalog() {
  cache = null;
}

/** Active products, cached for a minute so every page and widget shares one request. */
export function getProducts(): Promise<Product[]> {
  if (!cache || Date.now() - cache.at > TTL) {
    const promise = fetchAllProducts().then((list) => list.map(toProduct).filter((p) => p.active));
    cache = { at: Date.now(), promise };
    promise.catch(() => {
      if (cache?.promise === promise) cache = null;
    });
  }
  return cache.promise;
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  return (await getProducts()).find((p) => p.slug === slug);
}

const newestFirst = (a: Product, b: Product) => b.productId - a.productId;

/** Collection rules, all based on real backend fields. */
export const collectionRules: Record<string, (p: Product, all: Product[]) => boolean> = {
  perfumes: (p) => p.type === "perfume",
  attars: (p) => p.type === "attar",
  // The backend has no oud family; like its keyword search, match on the product name.
  oud: (p) => /\boud\b/i.test(p.name),
  // Newest by id (the backend has no created date for products).
  "new-arrivals": (p, all) => [...all].sort(newestFirst).slice(0, 8).includes(p),
  him: (p) => p.gender === "him" || p.gender === "unisex",
  her: (p) => p.gender === "her" || p.gender === "unisex",
  all: () => true,
};

/** Old links that pointed at collections the backend can't back (no sales ranking, no gift sets). */
export const retiredCollections: Record<string, string> = { bestsellers: "/collections/all", "gift-sets": "/collections/all" };

export async function getCollections(): Promise<Collection[]> {
  return collections;
}

export async function getCollection(slug: string): Promise<Collection | undefined> {
  return collections.find((c) => c.slug === slug);
}

export async function getCollectionProducts(slug: string): Promise<Product[]> {
  const rule = collectionRules[slug];
  if (!rule) return [];
  const all = await getProducts();
  const list = all.filter((p) => rule(p, all));
  return slug === "new-arrivals" ? list.sort(newestFirst) : list;
}

/** Category cards, keeping only those whose collection has products. */
export async function getCategories() {
  const all = await getProducts();
  return allCategories.filter((c) => {
    const rule = collectionRules[c.slug];
    return rule && all.some((p) => rule(p, all));
  });
}

export type CollectionTab = "him" | "her" | "attar";

/** Homepage "Our fragrances" tabs, newest first. */
export async function getCollectionTabs(): Promise<Record<CollectionTab, Product[]>> {
  const sorted = [...(await getProducts())].sort(newestFirst);
  return {
    him: sorted.filter((p) => p.type === "perfume" && (p.gender === "him" || p.gender === "unisex")).slice(0, 10),
    her: sorted.filter((p) => p.type === "perfume" && (p.gender === "her" || p.gender === "unisex")).slice(0, 10),
    attar: sorted.filter((p) => p.type === "attar").slice(0, 10),
  };
}

export async function getRelatedProducts(product: Product, limit = 8): Promise<Product[]> {
  const score = (p: Product) => p.families.filter((f) => product.families.includes(f)).length * 2 + (p.world === product.world ? 1 : 0) + (p.gender === product.gender ? 0.5 : 0);
  return (await getProducts())
    .filter((p) => p.id !== product.id)
    .sort((a, b) => score(b) - score(a) || newestFirst(a, b))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ editorial (static) */

export async function getJournal() {
  return journal;
}

export async function getArticle(slug: string) {
  return journal.find((a) => a.slug === slug);
}

/** Customer reviews: the backend has no reviews API, so this is empty until real reviews exist. */
export async function getTestimonials() {
  return testimonials;
}
