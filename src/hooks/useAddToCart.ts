import { useCallback } from "react";
import { useCart } from "@/store/cart";
import { toast } from "@/store/toast";
import { useUI } from "@/store/ui";
import type { Product, ProductVariant } from "@/types";

/** Default variant shown on cards: the largest in-stock size. */
export function defaultVariant(p: Product): ProductVariant {
  const inStock = p.variants.filter((v) => v.inStock);
  const pool = inStock.length ? inStock : p.variants;
  return pool[pool.length - 1];
}

export function useAddToCart() {
  const add = useCart((s) => s.add);
  const openCart = useUI((s) => s.openCart);

  return useCallback(
    (product: Product, variant: ProductVariant = defaultVariant(product), quantity = 1, opts?: { silent?: boolean }) => {
      add(
        {
          key: variant.id,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          variantId: variant.id,
          size: variant.size,
          price: variant.price,
          compareAt: variant.compareAt,
          image: product.images[0]?.src ?? "",
          stock: product.stock,
        },
        quantity,
      );
      // Skip the toast when the bag is already open: the new line is visible there.
      if (!opts?.silent && !useUI.getState().cartOpen) {
        toast({
          title: `${product.name} added to your bag`,
          description: variant.size || undefined,
          image: product.images[0]?.src,
          action: { label: "View bag", onClick: openCart },
        });
      }
    },
    [add, openCart],
  );
}
