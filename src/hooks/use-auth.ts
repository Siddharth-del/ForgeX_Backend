"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import type { User } from "@/lib/types";

export const qk = {
  me: ["me"] as const,
  cart: ["cart"] as const,
  addresses: ["addresses"] as const,
  orders: ["orders"] as const,
  order: (id: number) => ["orders", id] as const,
  preview: (coupon: string) => ["checkout-preview", coupon] as const,
  adminOrders: ["admin", "orders"] as const,
  adminProducts: ["admin", "products"] as const,
  adminCoupons: ["admin", "coupons"] as const,
};

/** Current session, read from the backend (cookie-based). `null` means signed out. */
export function useSession() {
  const query = useQuery<User | null>({
    queryKey: qk.me,
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const user = query.data ?? null;
  return {
    user,
    isLoading: query.isPending,
    isError: query.isError,
    isSignedIn: !!user,
    isAdmin: !!user?.roles?.includes("ROLE_ADMIN"),
  };
}

export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authApi.signIn(email, password),
    onSuccess: (user) => {
      // Never keep the raw token in client state; the httpOnly cookie carries the session.
      const safe: User = { ...user, jwtToken: null };
      qc.setQueryData(qk.me, safe);
      qc.invalidateQueries({ queryKey: qk.cart });
    },
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: ({ username, email, password }: { username: string; email: string; password: string }) =>
      authApi.signUp(username, email, password),
  });
}

/**
 * True while a sign-out is in flight, so route guards send the user home
 * rather than to the sign-in page when their session disappears.
 */
export const signOutState = { active: false };

export function useSignOut() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => authApi.signOut(),
    onMutate: () => {
      signOutState.active = true;
    },
    onSettled: () => {
      router.replace("/");
      setTimeout(() => (signOutState.active = false), 1500);
      qc.setQueryData(qk.me, null);
      qc.removeQueries({ queryKey: qk.cart });
      qc.removeQueries({ queryKey: qk.orders });
      qc.removeQueries({ queryKey: qk.addresses });
      qc.removeQueries({ queryKey: ["admin"] });
      qc.removeQueries({ queryKey: ["checkout-preview"] });
    },
  });
}
