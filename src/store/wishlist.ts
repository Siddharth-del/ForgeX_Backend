import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface WishlistState {
  ids: string[];
  toggle: (id: string) => boolean;
  has: (id: string) => boolean;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const added = !get().ids.includes(id);
        set((s) => ({ ids: added ? [...s.ids, id] : s.ids.filter((x) => x !== id) }));
        return added;
      },
      has: (id) => get().ids.includes(id),
    }),
    { name: "cosmic-wishlist-v2", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
