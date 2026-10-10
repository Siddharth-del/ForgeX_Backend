/** Server cart (controller/CartController.java). Checkout always prices the server cart. */
import { api } from "@/lib/api/client";
import type { CartDTO } from "@/lib/api/types";
import { requireId } from "@/lib/ids";

const qty = (n: number, min: number) => {
  if (!Number.isInteger(n) || n < min || n > 10) throw new RangeError(`Invalid quantity: ${n}`);
  return n;
};

export const cartApi = {
  /** The signed-in user's cart (created on first use). */
  get: () => api<CartDTO>("/api/carts/users/cart"),
  /** Adds `quantity` on top of what's already there (max 10 per product, limited by stock). */
  add: async (productId: number, quantity: number) =>
    api<CartDTO>(`/api/carts/products/${requireId(productId, "product")}/quantity/${qty(quantity, 1)}`, { method: "POST" }),
  /** +1 or −1 (removes the line at zero). Any other operation is rejected by the server (400). */
  step: async (productId: number, op: "add" | "delete") => api<CartDTO>(`/api/cart/products/${requireId(productId, "product")}/quantity/${op}`, { method: "PUT" }),
  /** `cartId` must be the caller's own cart (the server answers 404 otherwise). */
  remove: async (cartId: number, productId: number) =>
    api<string>(`/api/carts/${requireId(cartId, "cart")}/product/${requireId(productId, "product")}`, { method: "DELETE" }),

  /** Adds `quantity` boxes filled with `productIds`. The box price is set by the server. */
  addBundle: async (bundleId: number, productIds: number[], quantity = 1) =>
    api<CartDTO>(`/api/carts/bundles/${requireId(bundleId, "box")}`, {
      method: "POST",
      body: { productIds: productIds.map((id) => requireId(id, "product")), quantity: qty(quantity, 1) },
    }),
  /** Sets the number of boxes on one of the caller's box lines (0 removes it). */
  setBundleQuantity: async (cartItemId: number, quantity: number) =>
    api<CartDTO>(`/api/carts/bundle-items/${requireId(cartItemId, "cart line")}/quantity/${qty(quantity, 0)}`, { method: "PUT" }),
  removeBundle: async (cartItemId: number) => api<CartDTO>(`/api/carts/bundle-items/${requireId(cartItemId, "cart line")}`, { method: "DELETE" }),
};
