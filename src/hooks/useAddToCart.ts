import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { invalidateCatalog } from "@/lib/catalog";
import { useAuth } from "@/store/auth";
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

/** Sends a signed-out shopper to sign in, then back to where they were (the cart lives on the account). */
export function useSignInToShop() {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(() => {
    useUI.getState().closeCart();
    useUI.getState().closeQuickView();
    toast({ title: "Sign in to add to your bag", description: "Your bag is saved to your account, so it follows you across devices." });
    navigate(`/account?next=${encodeURIComponent(location.pathname + location.search)}`);
  }, [navigate, location.pathname, location.search]);
}

/**
 * Add to the server cart (ForgeX `useAddToCart`): signed-out shoppers are sent to sign in first;
 * resolves true once the server has the item. The server checks stock and availability; when it
 * refuses, its message is shown and the catalogue is refreshed (stock may have changed).
 */
export function useAddToCart() {
  const addToCart = useCart((s) => s.add);
  const openCart = useUI((s) => s.openCart);
  const signIn = useSignInToShop();

  return useCallback(
    async (product: Product, variant: ProductVariant = defaultVariant(product), quantity = 1, opts?: { silent?: boolean }): Promise<boolean> => {
      if (!useAuth.getState().token) {
        signIn();
        return false;
      }
      const ok = await addToCart(product.productId, quantity);
      if (!ok) {
        invalidateCatalog();
        return false;
      }
      // Skip the toast when the bag is already open: the new line is visible there.
      if (!opts?.silent && !useUI.getState().cartOpen) {
        toast({
          title: `${product.name} added to your bag`,
          description: variant.size || undefined,
          image: product.images[0]?.src,
          action: { label: "View bag", onClick: openCart },
        });
      }
      return true;
    },
    [addToCart, openCart, signIn],
  );
}
