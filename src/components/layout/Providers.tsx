import { MotionConfig } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useAuth } from "@/store/auth";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/store/toast";

/** Client-side providers: motion preferences, the persisted wishlist, the signed-in session and its server cart. */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    void useWishlist.persist.rehydrate();
    // Bags used to be kept on the device; the cart now lives on the account only.
    try {
      localStorage.removeItem("cosmic-cart-v2");
    } catch {
      /* storage unavailable */
    }
  }, []);
  useSessionSync();
  useServerCart();

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Loads the account's cart when someone signs in, and forgets it when they sign out (ForgeX: the query is enabled by the session). */
function useServerCart() {
  const token = useAuth((s) => s.token);
  useEffect(() => {
    useCart.getState().reset();
    if (token) void useCart.getState().load();
  }, [token]);
}

/** Keeps the stored login honest: checks it with the server on load, ends it when the token expires, and follows sign-in/out in other tabs. */
function useSessionSync() {
  const token = useAuth((s) => s.token);
  const expiresAt = useAuth((s) => s.expiresAt);

  // On load: confirm the saved token still works and refresh the profile.
  useEffect(() => {
    const { token, expiresAt, clearSession, setUser } = useAuth.getState();
    if (!token) return;
    if (expiresAt && expiresAt <= Date.now()) {
      clearSession("expired");
      return;
    }
    authApi
      .currentUser()
      .then((u) => {
        if (useAuth.getState().token === token) setUser(u);
      })
      .catch((e: unknown) => {
        // /api/auth/user answers 401 for a token the server no longer accepts. Anything else
        // (offline, a server error, server asleep or down) keeps the session for when it's back.
        if (e instanceof ApiError && e.status === 401 && useAuth.getState().token === token) clearSession("expired");
      });
  }, []);

  // Sign out automatically when the token expires.
  useEffect(() => {
    if (!token || !expiresAt) return;
    const ms = expiresAt - Date.now();
    if (ms <= 0) {
      useAuth.getState().clearSession("expired");
      return;
    }
    const t = setTimeout(() => {
      useAuth.getState().clearSession("expired");
      toast({ title: "You've been signed out", description: "Your session ended. Sign in again to continue." });
    }, Math.min(ms, 2_147_000_000));
    return () => clearTimeout(t);
  }, [token, expiresAt]);

  // Sign-in or sign-out in another tab.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cosmic-auth") void useAuth.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}
