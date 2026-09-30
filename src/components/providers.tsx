"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { Toaster, toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { cartApi } from "@/lib/api/endpoints";
import { takePendingAdd } from "@/lib/pending-cart";

interface UIState {
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}
const UIContext = createContext<UIState | null>(null);

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside <Providers>");
  return ctx;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Don't hammer the API on auth / not-found errors
        retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
      },
      mutations: { retry: false },
    },
  });
}

/** Replays an add-to-cart that was attempted while signed out, once the session exists. */
function PendingCartReplay() {
  const qc = useQueryClient();
  useEffect(() => {
    return qc.getQueryCache().subscribe(async (event) => {
      if (event.type !== "updated" || event.query.queryKey[0] !== "me" || !event.query.state.data) return;
      const pending = takePendingAdd();
      if (!pending) return;
      try {
        const cart = await cartApi.add(pending.productId, pending.quantity);
        qc.setQueryData(["cart"], cart);
        toast.success(`${pending.name} added to your bag`);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't add that item to your bag.");
      }
    });
  }, [qc]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  const [cartOpen, setCartOpen] = useState(false);
  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const ui = useMemo(() => ({ cartOpen, openCart, closeCart }), [cartOpen, openCart, closeCart]);

  return (
    <QueryClientProvider client={client}>
      <UIContext.Provider value={ui}>
        <MotionConfig reducedMotion="user" transition={{ ease: [0.16, 1, 0.3, 1] }}>
          {children}
        </MotionConfig>
        <PendingCartReplay />
        <Toaster
          position="bottom-center"
          // Sit above the pinned buy / pay bars on phones
          mobileOffset={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
          toastOptions={{
            classNames: {
              toast: "!rounded-[2px] !border-line-dark !bg-ink !text-bone !font-sans !shadow-2xl",
              description: "!text-smoke",
            },
          }}
        />
      </UIContext.Provider>
    </QueryClientProvider>
  );
}
