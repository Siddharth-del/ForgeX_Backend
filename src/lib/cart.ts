/**
 * The shopper's cart, as the backend holds it (ported from the ForgeX frontend's `mapCart`).
 *
 * The cart lives on the server, on the signed-in account: there is no copy on the device. Every
 * change is a request (src/store/cart.ts) and the screens show the cart the server sends back, so
 * the bag, the checkout and the order always agree. Money stays in paise, as the API sends it.
 */
import { optimisedImage } from "@/lib/catalog";
import type { CartBundleDTO, CartDTO, ProductDTO } from "@/lib/api/types";
import type { World } from "@/types";

/** At most this many of one product, or of one box, per line (CartServiceImpl.MAX_PER_LINE). */
export const MAX_PER_LINE = 10;

export interface CartProductLine {
  kind: "product";
  /** "P:{productId}" — the backend's line key. */
  key: string;
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  world: World;
  /** Paise. */
  price: number;
  mrp: number | null;
  stock: number;
  active: boolean;
  quantity: number;
  lineTotal: number;
}

export interface CartBoxLine {
  kind: "box";
  /** "B:{bundleId}:{sorted ids}" — the backend's line key. */
  key: string;
  cartItemId: number;
  bundleId: number;
  name: string;
  image: string | null;
  contents: { productId: number; name: string; quantity: number; stock: number | null; active: boolean }[];
  quantity: number;
  /** One box, paise. */
  unitPrice: number;
  /** The chosen fragrances bought separately (for "you save"), paise. */
  value: number;
  lineTotal: number;
  available: boolean;
  problem: string | null;
  /** The box can't be bought as built. */
  ruleProblem: string | null;
  /** Not enough stock for this many boxes. */
  stockProblem: string | null;
}

export type CartLine = CartProductLine | CartBoxLine;

export interface Cart {
  id: number | null;
  lines: CartLine[];
  /** Units in the cart (a box counts as one). */
  count: number;
  /** Paise, from the server's current prices. */
  subtotal: number;
  /** MRP (or box value) minus price, paise. */
  savings: number;
}

export const emptyCart: Cart = { id: null, lines: [], count: 0, subtotal: 0, savings: 0 };

const image = (src: string | null | undefined) => (src && /^(https?:)?\/\//i.test(src.trim()) ? optimisedImage(src.trim(), 400) : null);

function productLine(raw: ProductDTO, quantity: number): CartProductLine {
  const price = raw.price ?? 0;
  return {
    kind: "product",
    key: `P:${raw.productId}`,
    productId: raw.productId,
    slug: raw.slug || `product-${raw.productId}`,
    name: raw.name ?? "",
    image: image(raw.image),
    world: raw.category === "ATTAR" ? "attar" : "perfume",
    price,
    mrp: raw.mrp ?? null,
    stock: typeof raw.stock === "number" ? Math.max(0, raw.stock) : 0,
    active: raw.active !== false,
    quantity,
    lineTotal: price * quantity,
  };
}

function boxLine(b: CartBundleDTO): CartBoxLine {
  const components = b.components ?? [];
  return {
    kind: "box",
    key: b.lineKey,
    cartItemId: b.cartItemId,
    bundleId: b.bundleId,
    name: b.name,
    image: image(components.find((c) => c.image)?.image),
    contents: components.map((c) => ({ productId: c.productId, name: c.name ?? `Product #${c.productId}`, quantity: c.quantity ?? 1, stock: c.stock, active: c.active !== false })),
    quantity: b.quantity,
    unitPrice: b.unitPrice,
    value: b.value ?? b.unitPrice,
    lineTotal: b.lineTotal ?? b.unitPrice * b.quantity,
    available: b.available !== false,
    problem: b.problem ?? null,
    ruleProblem: b.ruleProblem ?? null,
    stockProblem: b.stockProblem ?? null,
  };
}

/**
 * CartDTO is { cartId, totalPrice, products: ProductDTO[] (each carrying its cart quantity),
 * bundles: CartBundleDTO[] }. Repeated product entries are grouped defensively, as in ForgeX.
 */
export function mapCart(c: CartDTO | null | undefined): Cart {
  if (!c) return emptyCart;
  const byId = new Map<number, CartProductLine>();
  for (const raw of c.products ?? []) {
    const qty = Number.isInteger(raw.quantity) && (raw.quantity ?? 0) > 0 ? (raw.quantity as number) : 1;
    const line = byId.get(raw.productId);
    if (line) {
      line.quantity += qty;
      line.lineTotal = line.price * line.quantity;
    } else byId.set(raw.productId, productLine(raw, qty));
  }
  const lines: CartLine[] = [...byId.values(), ...(c.bundles ?? []).map(boxLine)];
  return {
    id: c.cartId ?? null,
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((n, l) => n + l.lineTotal, 0),
    savings: lines.reduce((n, l) => n + savingsOf(l), 0),
  };
}

function savingsOf(l: CartLine) {
  if (l.kind === "box") return Math.max(0, l.value - l.unitPrice) * l.quantity;
  return l.mrp && l.mrp > l.price ? (l.mrp - l.price) * l.quantity : 0;
}

/** How many of a line can be ordered right now (stock and the per-line limit). */
export function availableQuantity(l: CartLine): number {
  if (l.kind === "product") return l.active ? Math.min(MAX_PER_LINE, l.stock) : 0;
  if (l.ruleProblem || !l.contents.length || l.contents.some((c) => !c.active || c.stock == null)) return l.available ? l.quantity : 0;
  return Math.min(MAX_PER_LINE, ...l.contents.map((c) => Math.floor((c.stock ?? 0) / Math.max(1, c.quantity))));
}

export interface LineProblem {
  message: string;
  /** How many can still be ordered: lowering the line to this fixes it (0 = remove it). */
  canOrder: number;
}

/** Why a line can't be ordered as it is, or null (shown in the bag and blocks checkout). */
export function lineProblem(l: CartLine): LineProblem | null {
  if (l.kind === "product") {
    if (!l.active) return { message: `${l.name} is no longer available.`, canOrder: 0 };
    if (l.stock <= 0) return { message: `${l.name} is out of stock.`, canOrder: 0 };
    if (l.quantity > l.stock) return { message: `Only ${l.stock} left of ${l.name}.`, canOrder: l.stock };
    return null;
  }
  if (l.ruleProblem) return { message: l.ruleProblem, canOrder: 0 };
  if (l.available) return null;
  // Short on stock: fewer boxes may still be possible. Otherwise it can't be ordered as it is.
  const can = availableQuantity(l);
  return { message: l.stockProblem ?? l.problem ?? `${l.name} can't be ordered right now.`, canOrder: can < l.quantity ? can : 0 };
}

/** Units of each product the whole cart needs (lines on their own and inside boxes). */
function unitsNeeded(cart: Cart) {
  const need = new Map<number, { units: number; stock: number; name: string }>();
  const add = (id: number, units: number, stock: number, name: string) => {
    const n = need.get(id);
    need.set(id, { units: (n?.units ?? 0) + units, stock: Math.min(n?.stock ?? stock, stock), name: n?.name ?? name });
  };
  for (const l of cart.lines) {
    if (l.kind === "product") add(l.productId, l.quantity, l.stock, l.name);
    else for (const c of l.contents) if (c.stock != null) add(c.productId, c.quantity * l.quantity, c.stock, c.name);
  }
  return need;
}

/**
 * Every reason the cart can't be ordered right now: per line, plus a fragrance the cart needs more
 * of than is left when it appears both on its own and in a box (the server reserves them together).
 */
export function cartProblems(cart: Cart): { key: string; name: string; message: string; canOrder: number }[] {
  const out = cart.lines.flatMap((l) => {
    const p = lineProblem(l);
    return p ? [{ key: l.key, name: l.name, ...p }] : [];
  });
  if (out.length) return out;
  for (const [id, n] of unitsNeeded(cart)) {
    if (n.units <= n.stock) continue;
    // Point at a box using it (each line on its own already passed its own check), and offer the
    // number of boxes that fits with everything else in the cart.
    const box = cart.lines.find((l): l is CartBoxLine => l.kind === "box" && l.contents.some((c) => c.productId === id));
    if (!box) continue;
    const perBox = box.contents.find((c) => c.productId === id)?.quantity ?? 1;
    const others = n.units - perBox * box.quantity;
    const fits = Math.max(0, Math.min(box.quantity - 1, Math.floor((n.stock - others) / perBox)));
    out.push({ key: box.key, name: box.name, message: `Only ${n.stock} of ${n.name} left, and your bag needs ${n.units}. Lower a quantity or remove an item.`, canOrder: fits });
    break; // one at a time: fixing it may fix the rest
  }
  return out;
}

/** Identity of the cart's contents: a stored unpaid order is reused only for the same cart. */
export const cartSignature = (cart: Cart) =>
  cart.lines
    .map((l) => `${l.key}x${l.quantity}`)
    .sort()
    .join(",");
