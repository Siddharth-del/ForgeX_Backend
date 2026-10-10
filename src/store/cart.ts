/**
 * The shopper's cart — the server cart of the signed-in account (ported from the ForgeX frontend's
 * `useCart` / `useCartMutation`).
 *
 * - Reading: `GET /api/carts/users/cart`, only when signed in. Signed out there is no cart.
 * - Every change is a request; on success the cart the server sends back replaces the one shown,
 *   on failure the error is shown and the cart is fetched again (as ForgeX invalidates its query).
 * - Changes run one after another, in the order they were made, so a quick "+ + −" can't arrive
 *   out of order; the backend also locks the cart per user.
 * - Nothing is stored on the device.
 */
import { create } from "zustand";
import { cartApi } from "@/lib/api/cart";
import { errorKind, type ErrorKind } from "@/lib/api/client";
import type { CartDTO } from "@/lib/api/types";
import { mapCart, MAX_PER_LINE, type Cart, type CartProductLine } from "@/lib/cart";
import { errorMessage } from "@/lib/errors";
import { useAuth } from "@/store/auth";
import { toast } from "@/store/toast";

export type CartStatus = "signed-out" | "loading" | "ready" | "error";

interface CartState {
  /** The last cart the server sent; null until it has been loaded (and when signed out). */
  cart: Cart | null;
  status: CartStatus;
  error: { message: string; kind: ErrorKind } | null;
  /** Keys of lines with a change in flight ("P:{id}", a box's line key, or "add-box"). */
  pending: string[];
  /** When the cart was last fetched (ms). */
  loadedAt: number;

  /** Fetch the cart. `maxAge` skips the request when the cart shown is newer than that (ms). */
  load: (opts?: { maxAge?: number }) => Promise<Cart | null>;
  add: (productId: number, quantity?: number) => Promise<boolean>;
  increment: (productId: number) => Promise<boolean>;
  decrement: (productId: number) => Promise<boolean>;
  /** Set a product line to an exact quantity (0 removes it). */
  setQuantity: (productId: number, quantity: number) => Promise<boolean>;
  remove: (productId: number) => Promise<boolean>;
  addBox: (bundleId: number, productIds: number[], quantity?: number) => Promise<boolean>;
  setBoxQuantity: (cartItemId: number, quantity: number) => Promise<boolean>;
  removeBox: (cartItemId: number) => Promise<boolean>;
  /** Forget the cart (sign-out). Answers still on their way are ignored. */
  reset: () => void;
}

/** Changes run in order. */
let chain: Promise<unknown> = Promise.resolve();
/** Bumped on sign-out/sign-in, so answers for the previous account are dropped. */
let generation = 0;
let inflightLoad: Promise<Cart | null> | null = null;

const signedIn = () => !!useAuth.getState().token;
const isCartDTO = (v: unknown): v is CartDTO => !!v && typeof v === "object" && "cartId" in v;

export const useCart = create<CartState>()((set, get) => {
  /** GET the cart now (not queued). */
  const fetchCart = async (): Promise<Cart | null> => {
    const gen = generation;
    if (!signedIn()) {
      set({ cart: null, status: "signed-out", error: null });
      return null;
    }
    if (!get().cart) set({ status: "loading", error: null });
    try {
      const cart = mapCart(await cartApi.get());
      if (gen !== generation) return null;
      set({ cart, status: "ready", error: null, loadedAt: Date.now() });
      return cart;
    } catch (e) {
      if (gen !== generation) return null;
      const kind = errorKind(e);
      if (kind === "session") {
        set({ cart: null, status: "signed-out", error: null });
        return null;
      }
      set({ status: get().cart ? "ready" : "error", error: { message: errorMessage(e), kind } });
      return null;
    }
  };

  /** ForgeX's useCartMutation: run the request, show the cart it returns, refetch on failure. */
  const mutate = (key: string, task: () => Promise<unknown>, failure: string): Promise<boolean> => {
    if (!signedIn()) return Promise.resolve(false);
    const gen = generation;
    set((s) => ({ pending: [...s.pending, key] }));
    const run = async () => {
      try {
        const res = await task();
        if (gen !== generation) return false;
        if (isCartDTO(res)) set({ cart: mapCart(res), status: "ready", error: null, loadedAt: Date.now() });
        else await fetchCart(); // e.g. DELETE /api/carts/{id}/product/{id} answers with a message
        return true;
      } catch (e) {
        if (gen !== generation) return false;
        if (errorKind(e) === "session") {
          set({ cart: null, status: "signed-out", error: null });
          toast({ title: "Please sign in again", description: "Your session has ended.", tone: "error" });
          return false;
        }
        toast({ title: failure, description: errorMessage(e), tone: "error" });
        await fetchCart(); // stock or availability may have changed
        return false;
      } finally {
        set((s) => {
          const i = s.pending.indexOf(key);
          return i < 0 ? s : { pending: [...s.pending.slice(0, i), ...s.pending.slice(i + 1)] };
        });
      }
    };
    const p = chain.then(run, run);
    chain = p.catch(() => undefined);
    return p;
  };

  const productLine = (id: number) => get().cart?.lines.find((l): l is CartProductLine => l.kind === "product" && l.productId === id);

  return {
    cart: null,
    status: signedIn() ? "loading" : "signed-out",
    error: null,
    pending: [],
    loadedAt: 0,

    load: ({ maxAge } = {}) => {
      const s = get();
      if (maxAge && s.status === "ready" && s.cart && Date.now() - s.loadedAt < maxAge) return Promise.resolve(s.cart);
      if (inflightLoad) return inflightLoad;
      const p = chain.then(fetchCart, fetchCart).finally(() => {
        if (inflightLoad === p) inflightLoad = null;
      });
      inflightLoad = p;
      chain = p.catch(() => undefined);
      return p;
    },

    add: (productId, quantity = 1) => mutate(`P:${productId}`, () => cartApi.add(productId, quantity), "Couldn't add to your bag"),
    increment: (productId) => mutate(`P:${productId}`, () => cartApi.step(productId, "add"), "Couldn't change the quantity"),
    decrement: (productId) => mutate(`P:${productId}`, () => cartApi.step(productId, "delete"), "Couldn't change the quantity"),
    remove: (productId) =>
      mutate(
        `P:${productId}`,
        async () => {
          const cartId = get().cart?.id;
          if (cartId == null) throw new Error("Your bag is still loading. Please try again.");
          return cartApi.remove(cartId, productId);
        },
        "Couldn't remove it from your bag",
      ),
    setQuantity: (productId, quantity) =>
      mutate(
        `P:${productId}`,
        async () => {
          const target = Math.max(0, Math.min(MAX_PER_LINE, Math.floor(quantity)));
          const line = productLine(productId);
          const have = line?.quantity ?? 0;
          if (target === have) return undefined;
          if (target === 0) {
            const cartId = get().cart?.id;
            if (cartId == null) throw new Error("Your bag is still loading. Please try again.");
            return cartApi.remove(cartId, productId);
          }
          if (target > have) return cartApi.add(productId, target - have);
          // Lower one step at a time: each step is a single, atomic change on the server.
          let res: unknown;
          for (let q = have; q > target; q--) res = await cartApi.step(productId, "delete");
          return res;
        },
        "Couldn't change the quantity",
      ),

    addBox: (bundleId, productIds, quantity = 1) => mutate("add-box", () => cartApi.addBundle(bundleId, productIds, quantity), "Couldn't add the box to your bag"),
    setBoxQuantity: (cartItemId, quantity) => {
      const key = get().cart?.lines.find((l) => l.kind === "box" && l.cartItemId === cartItemId)?.key ?? `box-${cartItemId}`;
      return mutate(key, () => cartApi.setBundleQuantity(cartItemId, Math.max(0, Math.min(MAX_PER_LINE, quantity))), "Couldn't change the quantity");
    },
    removeBox: (cartItemId) => {
      const key = get().cart?.lines.find((l) => l.kind === "box" && l.cartItemId === cartItemId)?.key ?? `box-${cartItemId}`;
      return mutate(key, () => cartApi.removeBundle(cartItemId), "Couldn't remove the box from your bag");
    },

    reset: () => {
      generation++;
      inflightLoad = null;
      set({ cart: null, status: signedIn() ? "loading" : "signed-out", error: null, pending: [], loadedAt: 0 });
    },
  };
});

/** Units in the bag, for the navbar (0 when signed out or not loaded yet). */
export const useCartCount = () => useCart((s) => s.cart?.count ?? 0);
