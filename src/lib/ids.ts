/**
 * Backend ids are positive whole numbers. Anything else (a stale "box" id from an old bag, NaN,
 * an empty string) must never reach a URL like /api/carts/products/NaN.
 */
export function toId(value: unknown): number | null {
  if (typeof value === "number") return Number.isSafeInteger(value) && value > 0 ? value : null;
  if (typeof value === "string" && /^[1-9]\d{0,15}$/.test(value.trim())) {
    const n = Number(value.trim());
    return Number.isSafeInteger(n) ? n : null;
  }
  return null;
}

export class InvalidIdError extends Error {
  constructor(what: string, value: unknown) {
    super(`Invalid ${what} id: ${String(value)}`);
    this.name = "InvalidIdError";
  }
}

/** Throws instead of building a request with a malformed id. */
export function requireId(value: unknown, what: string): number {
  const id = toId(value);
  if (id === null) throw new InvalidIdError(what, value);
  return id;
}

/** "B:{bundleId}:{id,id,id}", ids ascending: the same string the backend uses (util/CartLineKeys.java). */
export const bundleLineKey = (bundleId: number, productIds: number[]) => `B:${bundleId}:${[...productIds].sort((a, b) => a - b).join(",")}`;

/** "P:{productId}" (util/CartLineKeys.java). */
export const productLineKey = (productId: number) => `P:${productId}`;
