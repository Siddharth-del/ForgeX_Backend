"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { couponsApi, ordersApi, productsApi } from "@/lib/api/endpoints";
import { errorMessage } from "@/lib/api/client";
import type { Coupon, OrderStatus, ProductInput } from "@/lib/types";
import { qk, useSession } from "./use-auth";

/** Ask the Next server to drop its cached catalogue so the storefront shows admin edits immediately. */
const refreshStorefront = () => fetch("/api/storefront/revalidate", { method: "POST", credentials: "include" }).catch(() => undefined);

export function useAdminProducts() {
  const { isAdmin } = useSession();
  return useQuery({
    queryKey: qk.adminProducts,
    // Admin sees inactive products too, so read the raw list
    queryFn: () => productsApi.list({ pageNumber: 0, pageSize: 500, sortBy: "productId", sortOrder: "desc" }),
    enabled: isAdmin,
    select: (p) => p.content,
  });
}

export function useSaveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input, image }: { id?: number; input: ProductInput; image?: File | null }) => {
      const saved = id ? await productsApi.update(id, input) : await productsApi.create(input);
      if (!image) {
        await refreshStorefront();
        return saved;
      }
      try {
        const withImage = await productsApi.uploadImage(saved.productId, image);
        await refreshStorefront();
        return withImage;
      } catch (e) {
        // The product itself is saved; don't let a retry create a duplicate
        qc.invalidateQueries({ queryKey: qk.adminProducts });
        throw new Error(`Product saved, but the image didn't upload (${errorMessage(e)}). Edit the product to try again.`);
      }
    },
    onSuccess: (_p, v) => {
      qc.invalidateQueries({ queryKey: qk.adminProducts });
      toast.success(v.id ? "Product updated" : "Product created");
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await productsApi.remove(id);
      await refreshStorefront();
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminProducts });
      toast.success("Product deleted");
    },
    onError: (e) =>
      toast.error(errorMessage(e), {
        description: "Products that appear in orders can't be deleted — mark them inactive instead.",
      }),
  });
}

export function useAdminOrders() {
  const { isAdmin } = useSession();
  return useQuery({ queryKey: qk.adminOrders, queryFn: ordersApi.all, enabled: isAdmin });
}

export function useSetOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) => ordersApi.setStatus(id, status),
    onSuccess: (o) => {
      qc.invalidateQueries({ queryKey: qk.adminOrders });
      toast.success(`Order ${o.orderNumber} updated`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useAdminCoupons() {
  const { isAdmin } = useSession();
  return useQuery({ queryKey: qk.adminCoupons, queryFn: couponsApi.all, enabled: isAdmin });
}

export function useSaveCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (c: Coupon) => (c.couponId ? couponsApi.update(c.couponId, c) : couponsApi.create(c)),
    onSuccess: (_c, v) => {
      qc.invalidateQueries({ queryKey: qk.adminCoupons });
      toast.success(v.couponId ? "Coupon updated" : "Coupon created");
    },
  });
}

export function useDeactivateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => couponsApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminCoupons });
      toast.success("Coupon deactivated");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
