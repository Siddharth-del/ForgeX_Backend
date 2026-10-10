/** Checkout and payments (controller/CheckoutController.java, service/CheckoutService.java). */
import { api } from "@/lib/api/client";
import type { CheckoutRequest, CheckoutResponse, PaymentVerifyRequest, PriceBreakdown } from "@/lib/api/types";

export const checkoutApi = {
  /** Server-side price for the current server cart, optionally with a coupon. */
  preview: (coupon?: string) => api<PriceBreakdown>("/api/checkout/preview", { query: { coupon: coupon?.trim() || undefined } }),
  /** Creates the order and reserves stock. COD → CONFIRMED; RAZORPAY → PENDING_PAYMENT + Razorpay order. */
  place: (req: CheckoutRequest) => api<CheckoutResponse>("/api/checkout", { method: "POST", body: req }),
  /** Server checks the Razorpay signature with the secret key before marking the order PAID. */
  verify: (req: PaymentVerifyRequest) => api<CheckoutResponse>("/api/payments/verify", { method: "POST", body: req }),
};
