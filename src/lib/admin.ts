/** Helpers shared by the admin pages. */
import type { CategoryEnum, CouponDTO, GenderEnum, OrderDTO, OrderStatus, ProductDTO, ProductInput } from "@/lib/api/types";

/** "Low stock" in the admin views (a display threshold, not a backend rule). */
export const LOW_STOCK = 5;

/** The fields PUT /api/admin/products/{id} replaces, taken from a product as loaded. */
export function toProductInput(p: ProductDTO): ProductInput {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description,
    category: p.category,
    gender: p.gender,
    fragranceFamily: p.fragranceFamily,
    mrp: p.mrp,
    price: p.price,
    stock: p.stock,
    active: p.active,
  };
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

export type StockLevel = "out" | "low" | "ok";
export const stockLevel = (p: Pick<ProductDTO, "stock">): StockLevel => ((p.stock ?? 0) <= 0 ? "out" : (p.stock ?? 0) <= LOW_STOCK ? "low" : "ok");

export type CouponState = "active" | "inactive" | "expired" | "scheduled" | "used-up";

export function couponState(c: CouponDTO, now = Date.now()): CouponState {
  if (c.active === false) return "inactive";
  if (c.validTo && new Date(c.validTo).getTime() < now) return "expired";
  if (c.validFrom && new Date(c.validFrom).getTime() > now) return "scheduled";
  if (c.usageLimit != null && (c.usedCount ?? 0) >= c.usageLimit) return "used-up";
  return "active";
}

/** Orders that still need someone to act: paid (to confirm) and confirmed (to ship). */
export const NEEDS_ACTION: OrderStatus[] = ["PAID", "CONFIRMED"];

/** Orders whose money is real (or due): everything except unpaid, cancelled and refunded. */
export const isLiveOrder = (o: OrderDTO) => o.status !== "PENDING_PAYMENT" && o.status !== "CANCELLED" && o.status !== "REFUNDED";

export const itemCount = (o: OrderDTO) => o.orderItems.reduce((n, i) => n + i.quantity, 0);

export const GENDER_LABEL: Record<GenderEnum, string> = { MEN: "Men", WOMEN: "Women", UNISEX: "Unisex" };
export const CATEGORY_LABEL: Record<CategoryEnum, string> = { PERFUME: "Perfume", ATTAR: "Attar" };
