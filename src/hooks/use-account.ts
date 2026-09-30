"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addressApi, ordersApi } from "@/lib/api/endpoints";
import { ApiError, errorMessage } from "@/lib/api/client";
import type { Address } from "@/lib/types";
import { qk, useSession } from "./use-auth";

export function useAddresses() {
  const { isSignedIn } = useSession();
  return useQuery({ queryKey: qk.addresses, queryFn: addressApi.mine, enabled: isSignedIn });
}

export function useSaveAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: Address) => (a.addressId ? addressApi.update(a.addressId, a) : addressApi.create(a)),
    onSuccess: (_saved, a) => {
      qc.invalidateQueries({ queryKey: qk.addresses });
      toast.success(a.addressId ? "Address updated" : "Address saved");
    },
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => addressApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.addresses });
      toast.success("Address removed");
    },
    // An address used by a past order can't be deleted (it's kept for the invoice)
    onError: (e) =>
      toast.error(
        e instanceof ApiError && e.status >= 500
          ? "This address is linked to a past order, so it's kept for your invoice."
          : errorMessage(e),
      ),
  });
}

export function useOrders() {
  const { isSignedIn } = useSession();
  return useQuery({ queryKey: qk.orders, queryFn: ordersApi.mine, enabled: isSignedIn });
}

export function useOrder(id: number) {
  const { isSignedIn } = useSession();
  return useQuery({
    queryKey: qk.order(id),
    queryFn: () => ordersApi.one(id),
    enabled: isSignedIn && Number.isFinite(id),
    // While an online payment is still being confirmed (webhook), check back every few seconds
    refetchInterval: (q) => (q.state.data?.status === "PENDING_PAYMENT" ? 4000 : false),
  });
}
