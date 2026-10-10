/** Server cart (controller/CartController.java). Checkout always prices the server cart. */
import { api } from "@/lib/api/client";
import type { CartDTO } from "@/lib/api/types";

export const cartApi = {
  /** Creates the cart on first use. */
  get: () => api<CartDTO>("/api/carts/users/cart"),
  /** Adds `quantity` on top of what's already there (max 10 per product, limited by stock). */
  add: (productId: number, quantity: number) => api<CartDTO>(`/api/carts/products/${productId}/quantity/${quantity}`, { method: "POST" }),
  /** +1 or −1 (removes the line at zero). */
  step: (productId: number, op: "add" | "delete") => api<CartDTO>(`/api/cart/products/${productId}/quantity/${op}`, { method: "PUT" }),
  remove: (cartId: number, productId: number) => api<string>(`/api/carts/${cartId}/product/${productId}`, { method: "DELETE" }),
};
