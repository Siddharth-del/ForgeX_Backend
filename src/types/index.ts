export type World = "attar" | "perfume";
export type Gender = "him" | "her" | "unisex";
/** From the backend's Category enum (ATTAR, PERFUME). */
export type ProductType = "perfume" | "attar";
export type Badge = "bestseller" | "new" | "limited";

/** The backend's FragranceFamily enum, lower-cased. */
export type ScentFamily = "amber" | "aquatic" | "aromatic" | "earthy" | "floral" | "mixed" | "woody";

export type Occasion =
  | "evening"
  | "office"
  | "date-night"
  | "wedding"
  | "everyday"
  | "festive"
  | "travel"
  | "prayer";

export interface ProductImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface ProductVariant {
  id: string;
  /** e.g. "100 ml". The backend sells one size per product, so this is usually empty. */
  size: string;
  /** Rupees (converted from the backend's paise). */
  price: number;
  /** Original price before discount (MRP), rupees. */
  compareAt?: number;
  inStock: boolean;
}

export interface NotePyramid {
  top: string[];
  heart: string[];
  base: string[];
}

export interface Accord {
  name: string;
  /** 0–100, relative strength shown in "What it smells like". */
  strength: number;
}

/**
 * A storefront product, built from the backend's ProductDTO (see lib/catalog.ts).
 * Optional fields are editorial extras the backend doesn't store yet; the sections that
 * use them only render when they are present, so nothing is ever made up.
 */
export interface Product {
  /** String form of the backend productId. */
  id: string;
  productId: number;
  slug: string;
  name: string;
  type: ProductType;
  world: World;
  gender: Gender;
  /** Label of the fragrance family, e.g. "Woody". Empty when the backend has none. */
  family: string;
  families: ScentFamily[];
  description: string;
  /** Exactly one variant: the backend has a single price per product. */
  variants: ProductVariant[];
  /** Empty when the product has no image yet (a branded placeholder is shown). */
  images: ProductImage[];
  stock: number;
  active: boolean;
  /** % off MRP, as calculated by the backend. */
  discount: number;
  badges: Badge[];
  tagline?: string;
  story?: string;
  notes?: NotePyramid;
  accords?: Accord[];
  occasions?: Occasion[];
  seasons?: string[];
  timeOfDay?: "Day" | "Night" | "Day & Night";
  longevity?: string;
  sillage?: "Intimate" | "Moderate" | "Strong";
  concentration?: string;
  rating?: number;
  reviewCount?: number;
}

export interface Collection {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  world?: World;
  theme: "light" | "dark";
  /** Portrait image (phones). */
  image: ProductImage;
  /** Wide banner (tablets and up). Falls back to `image`. */
  banner?: ProductImage;
}

export interface Category {
  slug: string;
  title: string;
  description: string;
  href: string;
  image: ProductImage;
}

export interface JournalArticle {
  slug: string;
  title: string;
  kicker: string;
  excerpt: string;
  readTime: string;
  date: string;
  /** Card image (journal grid). */
  image: ProductImage;
  /** Optional wide image for the article page header; `position` is a CSS object-position. */
  cover?: ProductImage & { position?: string };
  body: { heading?: string; paragraphs: string[] }[];
}

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  city: string;
  rating: number;
  verified: boolean;
  productSlug?: string;
}
