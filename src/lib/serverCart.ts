
/**
 * Synchronizes ordinary product lines with the signed-in shopper's server cart.
 * Box lines are managed separately by the existing bundle-cart logic.
 * Product-specific backend errors are collected without aborting the whole sync.
 */
import { cartApi } from "@/lib/api/cart";
import { ApiError } from "@/lib/api/client";
import type { CartDTO } from "@/lib/api/types";
import type { CartLine } from "@/lib/cart";

type ProductLine = Extract<CartLine, { kind: "product" }>;

export interface CartSyncResult {
  cart: CartDTO;
  issues: { productId: string; name: string; message: string }[];
}

export async function syncServerCart(
  lines: CartLine[],
): Promise<CartSyncResult> {
  // Only ordinary products have a top-level productId.
  const productLines = lines.filter(
    (line): line is ProductLine => line.kind === "product",
  );

  const want = new Map<number, ProductLine>(
    productLines.map((line) => [Number(line.productId), line] as const),
  );

  const issues: CartSyncResult["issues"] = [];
  let cart = await cartApi.get();

  const attempt = async (
    line: ProductLine | undefined,
    id: number,
    task: () => Promise<unknown>,
  ) => {
    try {
      await task();
    } catch (e) {
      if (e instanceof ApiError && (e.status === 400 || e.status === 404)) {
        issues.push({
          productId: String(id),
          name: line?.name ?? "A product",
          message: e.message,
        });
      } else {
        throw e;
      }
    }
  };

  for (const serverProduct of cart.products) {
    const id = serverProduct.productId;
    const line = want.get(id);
    const have = serverProduct.quantity ?? 0;

    if (!line) {
      await attempt(undefined, id, () => cartApi.remove(cart.cartId, id));
    } else if (have > line.quantity) {
      await attempt(line, id, async () => {
        await cartApi.remove(cart.cartId, id);
        await cartApi.add(id, line.quantity);
      });
    } else if (have < line.quantity) {
      await attempt(line, id, () =>
        cartApi.add(id, line.quantity - have),
      );
    }

    want.delete(id);
  }

  for (const [id, line] of want) {
    await attempt(line, id, () => cartApi.add(id, line.quantity));
  }

  cart = await cartApi.get();

  // Check that each requested product matches its server-side quantity.
  for (const line of productLines) {
    const id = Number(line.productId);
    const serverProduct = cart.products.find((p) => p.productId === id);

    if (
      (serverProduct?.quantity ?? 0) !== line.quantity &&
      !issues.some((issue) => issue.productId === String(id))
    ) {
      issues.push({
        productId: String(id),
        name: line.name,
        message: serverProduct
          ? `Only ${serverProduct.quantity} of ${line.name} could be reserved.`
          : `${line.name} couldn't be added.`,
      });
    }
  }

  return { cart, issues };
}

