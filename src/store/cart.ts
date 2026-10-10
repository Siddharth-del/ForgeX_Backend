import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartLine, Product } from "@/types";

/** The backend accepts at most 10 of one product per cart (service/CartServiceImpl.java). */
export const MAX_PER_PRODUCT = 10;
const cap = (l: Pick<CartLine, "stock">, q: number) => Math.max(0, Math.min(MAX_PER_PRODUCT, l.stock ?? MAX_PER_PRODUCT, q));

interface CartState {
  lines: CartLine[];
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  /** Bring lines in line with the live catalogue; reports lines that were removed or reduced to the stock left. */
  reconcile: (products: Product[]) => { removed: string[]; reduced: string[] };
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (line, quantity = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.key === line.key);
          if (existing) {
            return {
              lines: s.lines.map((l) => (l.key === line.key ? { ...l, ...line, quantity: cap(line, l.quantity + quantity) } : l)),
            };
          }
          const q = cap(line, quantity);
          return q > 0 ? { lines: [...s.lines, { ...line, quantity: q }] } : s;
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          lines: quantity <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, cap(l, quantity)) } : l)),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
      reconcile: (products) => {
        const byId = new Map(products.map((p) => [p.id, p]));
        const removed: string[] = [];
        const reduced: string[] = [];
        const lines: CartLine[] = [];
        for (const l of get().lines) {
          const p = byId.get(l.productId);
          const v = p?.variants[0];
          if (!p || !v || !v.inStock) {
            removed.push(l.name);
            continue;
          }
          const quantity = Math.max(1, cap({ stock: p.stock }, l.quantity));
          if (quantity < l.quantity) reduced.push(`${p.name} (${quantity} left)`);
          lines.push({ ...l, slug: p.slug, name: p.name, price: v.price, compareAt: v.compareAt, image: p.images[0]?.src ?? "", stock: p.stock, quantity });
        }
        if (removed.length || JSON.stringify(lines) !== JSON.stringify(get().lines)) set({ lines });
        return { removed, reduced };
      },
    }),
    {
      // v2: lines now reference backend products; older sample-catalogue bags are discarded.
      name: "cosmic-cart-v2",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.price * l.quantity, 0);
export const cartSavings = (lines: CartLine[]) =>
  lines.reduce((n, l) => n + (l.compareAt && l.compareAt > l.price ? (l.compareAt - l.price) * l.quantity : 0), 0);
