/**
 * Online payment for an order the backend has already created (status PENDING_PAYMENT).
 *
 * The Razorpay window's success callback is NOT treated as proof of payment: its signed response
 * goes to POST /api/payments/verify, where the server checks the signature with the secret key.
 * The order counts as paid only when the backend says PAID, either from that call or, if the call
 * fails, from the order itself (Razorpay's webhook can mark it paid on the server).
 */
import { ApiError } from "@/lib/api/client";
import { checkoutApi } from "@/lib/api/checkout";
import { orderApi } from "@/lib/api/orders";
import type { OrderStatus } from "@/lib/api/types";
import type { PendingPayment } from "@/lib/pendingPayment";
import { payWithRazorpay } from "@/lib/razorpay";
import { site } from "@/lib/site";

export type PayResult =
  | { kind: "paid"; orderId: number }
  /** The shopper closed the window; the order stays reserved until it expires. */
  | { kind: "dismissed"; orderId: number; message: string }
  /** Razorpay reported success but the backend hasn't confirmed it. Never shown as paid. */
  | { kind: "unverified"; orderId: number; message: string }
  /** The order can no longer be paid (expired / refunded). */
  | { kind: "closed"; orderId: number; status: OrderStatus; message: string }
  /** The payment window couldn't be opened. */
  | { kind: "error"; orderId: number; message: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function serverStatus(orderId: number): Promise<OrderStatus | null> {
  try {
    return (await orderApi.get(orderId)).status;
  } catch {
    return null;
  }
}

function closedMessage(status: OrderStatus) {
  return status === "REFUNDED"
    ? "Your payment arrived after this order's payment window had closed, so the order was cancelled and the payment refunded to you."
    : "This order was cancelled before the payment was confirmed. If any money left your account, contact us with the order number and we'll make it right.";
}

export async function completePayment(
  p: PendingPayment,
  prefill: { name?: string; email?: string; contact?: string } = {},
  /** Called when Razorpay hands back a payment and the server check starts. */
  onVerifying?: () => void,
): Promise<PayResult> {
  let outcome;
  try {
    outcome = await payWithRazorpay({
      key: p.keyId,
      amount: p.amount,
      currency: p.currency,
      order_id: p.razorpayOrderId,
      name: site.name,
      description: `Order #${p.orderId}`,
      prefill: { email: prefill.email ?? p.email, name: prefill.name, contact: prefill.contact },
      notes: { orderId: String(p.orderId) },
      theme: { color: "#32180E" },
    });
  } catch (e) {
    return { kind: "error", orderId: p.orderId, message: e instanceof Error ? e.message : "We couldn't open the payment window." };
  }

  if (outcome.kind === "dismissed") {
    return {
      kind: "dismissed",
      orderId: p.orderId,
      message: outcome.lastError ? `The payment didn't go through: ${outcome.lastError}` : "The payment window was closed before the payment was completed.",
    };
  }

  onVerifying?.();
  let status: OrderStatus | null = null;
  let verifyError: unknown = null;
  try {
    status = (await checkoutApi.verify(outcome.response)).status;
  } catch (e) {
    verifyError = e;
  }

  // The verify call can fail on a flaky connection even though the payment went through; the
  // webhook may already have marked the order paid, so ask the server before giving up.
  for (let i = 0; status !== "PAID" && status !== "REFUNDED" && status !== "CANCELLED" && i < 3; i++) {
    await wait(2500);
    status = (await serverStatus(p.orderId)) ?? status;
  }

  if (status === "PAID") return { kind: "paid", orderId: p.orderId };
  if (status === "REFUNDED" || status === "CANCELLED") return { kind: "closed", orderId: p.orderId, status, message: closedMessage(status) };

  const rejected = verifyError instanceof ApiError && verifyError.status === 400;
  return {
    kind: "unverified",
    orderId: p.orderId,
    message: rejected
      ? "We couldn't verify this payment, so the order hasn't been marked as paid. If money left your account, contact us with the order number and we'll sort it out."
      : "We couldn't confirm your payment yet. If it went through, this order will update to Paid within a few minutes. There's no need to pay again.",
  };
}
