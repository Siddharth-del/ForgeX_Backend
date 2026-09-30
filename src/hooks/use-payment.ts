"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { checkoutApi } from "@/lib/api/endpoints";
import { payWithRazorpay } from "@/lib/razorpay";
import { clearPendingPayment } from "@/lib/pending-payment";
import type { CheckoutResponse } from "@/lib/types";
import { errorMessage } from "@/lib/api/client";
import { qk } from "./use-auth";

/**
 * Opens Razorpay for a backend-created order and verifies the signed result.
 * Resolves to "paid" | "dismissed" | "failed". The webhook also confirms payment
 * server-side, so the order page keeps polling while status is PENDING_PAYMENT.
 */
export function usePayOnline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ order, contact }: { order: CheckoutResponse; contact?: string }) => {
      const outcome = await payWithRazorpay(order, contact);
      if (outcome.kind !== "paid") return outcome;
      try {
        await checkoutApi.verify(outcome.payload);
      } catch (e) {
        // Signature check failed or network dropped — the webhook may still confirm it
        toast.error("We couldn't confirm your payment yet", { description: errorMessage(e) });
      }
      return outcome;
    },
    onSuccess: (outcome, { order }) => {
      if (outcome.kind === "paid") clearPendingPayment(order.orderId);
      if (outcome.kind === "failed") toast.error("Payment didn't go through", { description: outcome.reason });
      qc.invalidateQueries({ queryKey: qk.cart });
      qc.invalidateQueries({ queryKey: qk.orders });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
