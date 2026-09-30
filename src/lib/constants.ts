import type { Category, FragranceFamily, Gender, OrderStatus, PaymentStatus } from "./types";

export const SITE = {
  name: "ForgeX",
  tagline: "Perfumes & attars, forged to linger.",
  description:
    "ForgeX eau de parfum and alcohol-free attars. Clear prices against MRP, secure online payment or cash on delivery, and a GST invoice with every order.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

/**
 * Store rules that the backend enforces (application.properties / services).
 * Shown to shoppers so the UI never promises something the API won't honour.
 * Keep in sync with shop.shipping.* and shop.payment.expiry-minutes.
 */
export const STORE_RULES = {
  freeShippingAbovePaise: Number(process.env.NEXT_PUBLIC_FREE_SHIPPING_ABOVE_PAISE ?? 149900),
  shippingChargePaise: Number(process.env.NEXT_PUBLIC_SHIPPING_CHARGE_PAISE ?? 9900),
  paymentWindowMinutes: 15,
  maxPerProduct: 10,
} as const;

export const CATEGORIES: { value: Category; label: string; plural: string; blurb: string }[] = [
  {
    value: "PERFUME",
    label: "Perfume",
    plural: "Perfumes",
    blurb: "Eau de parfum in a spray. Bright on the first breath, then it settles close and stays.",
  },
  {
    value: "ATTAR",
    label: "Attar",
    plural: "Attars",
    blurb: "Concentrated, alcohol-free perfume oil. Dab it on warm skin — a little goes a long way.",
  },
];

export const GENDERS: { value: Gender; label: string }[] = [
  { value: "MEN", label: "For him" },
  { value: "WOMEN", label: "For her" },
  { value: "UNISEX", label: "For everyone" },
];

export const FAMILIES: { value: FragranceFamily; label: string; notes: string }[] = [
  { value: "WOODY", label: "Woody", notes: "Sandalwood, cedar, vetiver — dry, warm and grounded." },
  { value: "AMBER", label: "Amber", notes: "Resins, vanilla and spice. Rich, glowing, made for evenings." },
  { value: "FLORAL", label: "Floral", notes: "Rose, jasmine, tuberose — from fresh petals to heady bouquets." },
  { value: "AQUATIC", label: "Aquatic", notes: "Sea air, mineral notes and cool citrus. Clean and open." },
  { value: "AROMATIC", label: "Aromatic", notes: "Lavender, herbs and green notes with a crisp edge." },
  { value: "EARTHY", label: "Earthy", notes: "Oud, patchouli and moss. Deep, dark and a little smoky." },
  { value: "MIXED", label: "Mixed", notes: "Compositions that cross families on purpose." },
];

export const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "savings", label: "Biggest saving" },
] as const;
export type SortValue = (typeof SORTS)[number]["value"];

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "ok" | "warn" | "info" | "muted" | "bad" }> = {
  PENDING_PAYMENT: { label: "Awaiting payment", tone: "warn" },
  PAID: { label: "Paid", tone: "ok" },
  CONFIRMED: { label: "Confirmed", tone: "ok" },
  SHIPPED: { label: "Shipped", tone: "info" },
  DELIVERED: { label: "Delivered", tone: "ok" },
  CANCELLED: { label: "Cancelled", tone: "muted" },
  REFUNDED: { label: "Refunded", tone: "muted" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  CREATED: "Not paid yet",
  CAPTURED: "Paid online",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
  PENDING_COD: "Pay on delivery",
};

/** Mirrors OrderServiceImpl.ALLOWED — the backend still decides. */
export const STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PAID: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
};

/** Order steps shown in the tracker, in order. */
export const ORDER_STEPS: OrderStatus[] = ["CONFIRMED", "SHIPPED", "DELIVERED"];

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand",
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export const labelOf = <T extends string>(list: { value: T; label: string }[], value: T | null | undefined) =>
  list.find((o) => o.value === value)?.label ?? "";
