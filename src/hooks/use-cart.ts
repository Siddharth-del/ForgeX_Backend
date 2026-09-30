"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { cartApi } from "@/lib/api/endpoints";
import { ApiError, errorMessage } from "@/lib/api/client";
import type { Cart, Product } from "@/lib/types";
import { qk, useSession } from "./use-auth";
import { useUI } from "@/components/providers";
import { rememberPendingAdd } from "@/lib/pending-cart";

export function useCart() {
  const { isSignedIn } = useSession();
  const query = useQuery({
    queryKey: qk.cart,
    queryFn: cartApi.get,
    enabled: isSignedIn,
    staleTime: 30_000,
  });
  const cart = query.data;
  const count = cart?.products.reduce((n, p) => n + (p.quantity ?? 1), 0) ?? 0;
  return { ...query, cart, count };
}

export function useAddToCart() {
  const qc = useQueryClient();
  const { isSignedIn } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { openCart } = useUI();

  const mutation = useMutation({
    mutationFn: ({ product, quantity }: { product: Product; quantity: number }) =>
      cartApi.add(product.productId, quantity),
    onSuccess: (cart, { product }) => {
      qc.setQueryData(qk.cart, cart);
      qc.invalidateQueries({ queryKey: ["checkout-preview"] });
      toast.success(`${product.name} added to your bag`);
      openCart();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 401) {
        qc.setQueryData(qk.me, null);
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      toast.error(errorMessage(e));
    },
  });

  const add = (product: Product, quantity = 1) => {
    if (!isSignedIn) {
      rememberPendingAdd(product.productId, quantity, product.name);
      toast("Sign in to add to your bag", { description: "We'll pop it in as soon as you're in." });
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    mutation.mutate({ product, quantity });
  };

  return { add, isPending: mutation.isPending, pendingId: mutation.variables?.product.productId };
}

/** +1 / −1 with an optimistic update, rolled back if the backend refuses (e.g. stock). */
export function useStepQuantity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, op }: { productId: number; op: "add" | "delete" }) => cartApi.step(productId, op),
    onMutate: async ({ productId, op }) => {
      await qc.cancelQueries({ queryKey: qk.cart });
      const prev = qc.getQueryData<Cart>(qk.cart);
      if (prev) {
        const products = prev.products
          .map((p) =>
            p.productId === productId ? { ...p, quantity: (p.quantity ?? 1) + (op === "add" ? 1 : -1) } : p,
          )
          .filter((p) => (p.quantity ?? 0) > 0);
        const totalPrice = products.reduce((s, p) => s + p.price * (p.quantity ?? 1), 0);
        qc.setQueryData<Cart>(qk.cart, { ...prev, products, totalPrice });
      }
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.cart, ctx.prev);
      toast.error(errorMessage(e));
    },
    onSuccess: (cart) => qc.setQueryData(qk.cart, cart),
    onSettled: () => qc.invalidateQueries({ queryKey: ["checkout-preview"] }),
  });
}

export function useRemoveFromCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cartId, productId }: { cartId: number; productId: number }) => cartApi.remove(cartId, productId),
    onMutate: async ({ productId }) => {
      await qc.cancelQueries({ queryKey: qk.cart });
      const prev = qc.getQueryData<Cart>(qk.cart);
      if (prev) {
        const products = prev.products.filter((p) => p.productId !== productId);
        const totalPrice = products.reduce((s, p) => s + p.price * (p.quantity ?? 1), 0);
        qc.setQueryData<Cart>(qk.cart, { ...prev, products, totalPrice });
      }
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.cart, ctx.prev);
      toast.error(errorMessage(e));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.cart });
      qc.invalidateQueries({ queryKey: ["checkout-preview"] });
    },
  });
}
