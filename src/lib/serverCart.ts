/**
 * Makes the signed-in shopper's server cart (which checkout prices) match the bag on this device.
 * Problems the backend reports for a product (sold out, "Only 2 left", inactive) are collected
 * per product rather than aborting the whole sync.
 */
import { cartApi } from "@/lib/api/cart";
import { ApiError } from "@/lib/api/client";
import type { CartDTO } from "@/lib/api/types";
import type { CartLine } from "@/lib/cart";

export interface CartSyncResult {
  cart: CartDTO;
  issues: { productId: string; name: string; message: string }[];
}

export async function syncServerCart(lines: CartLine[]): Promise<CartSyncResult> {
  const want = new Map(lines.map((l) => [Number(l.productId), l]));
  const issues: CartSyncResult["issues"] = [];
  let cart = await cartApi.get();

  const attempt = async (line: CartLine | undefined, id: number, task: () => Promise<unknown>) => {
    try {
      await task();
    } catch (e) {
      if (e instanceof ApiError && (e.status === 400 || e.status === 404)) issues.push({ productId: String(id), name: line?.name ?? "A product", message: e.message });
      else throw e;
    }
  };

  for (const sp of cart.products) {
    const line = want.get(sp.productId);
    const have = sp.quantity ?? 0;
    if (!line) {
      await attempt(undefined, sp.productId, () => cartApi.remove(cart.cartId, sp.productId));
    } else if (have > line.quantity) {
      await attempt(line, sp.productId, async () => {
        await cartApi.remove(cart.cartId, sp.productId);
        await cartApi.add(sp.productId, line.quantity);
      });
    } else if (have < line.quantity) {
      await attempt(line, sp.productId, () => cartApi.add(sp.productId, line.quantity - have));
    }
    want.delete(sp.productId);
  }
  for (const [id, line] of want) await attempt(line, id, () => cartApi.add(id, line.quantity));

  cart = await cartApi.get();
  // Anything still different after the sync is a problem the shopper has to resolve.
  for (const l of lines) {
    const sp = cart.products.find((p) => p.productId === Number(l.productId));
    if ((sp?.quantity ?? 0) !== l.quantity && !issues.some((i) => i.productId === l.productId)) {
      issues.push({ productId: l.productId, name: l.name, message: sp ? `Only ${sp.quantity} of ${l.name} could be reserved.` : `${l.name} couldn't be added.` });
    }
  }
  return { cart, issues };
}
