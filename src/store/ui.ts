import { create } from "zustand";
import type { Product } from "@/types";

interface UIState {
  cartOpen: boolean;
  searchOpen: boolean;
  menuOpen: boolean;
  quickView: Product | null;
  openCart: () => void;
  closeCart: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  setMenu: (open: boolean) => void;
  openQuickView: (p: Product) => void;
  closeQuickView: () => void;
}

export const useUI = create<UIState>((set) => ({
  cartOpen: false,
  searchOpen: false,
  menuOpen: false,
  quickView: null,
  openCart: () => set({ cartOpen: true, searchOpen: false, menuOpen: false, quickView: null }),
  closeCart: () => set({ cartOpen: false }),
  openSearch: () => set({ searchOpen: true, cartOpen: false, menuOpen: false }),
  closeSearch: () => set({ searchOpen: false }),
  setMenu: (open) => set({ menuOpen: open }),
  openQuickView: (p) => set({ quickView: p }),
  closeQuickView: () => set({ quickView: null }),
}));
