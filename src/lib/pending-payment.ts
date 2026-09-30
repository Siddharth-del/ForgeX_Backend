import type { CheckoutResponse } from "./types";

/**
 * The Razorpay order id is only returned by POST /api/checkout (OrderDTO doesn't expose it).
 * Keep it for this tab so a shopper who closed the payment window can resume within the
 * backend's payment window instead of placing a second order.
 */
const key = (orderId: number) => `forgex:payment:${orderId}`;

export function savePendingPayment(res: CheckoutResponse) {
  try {
    sessionStorage.setItem(key(res.orderId), JSON.stringify({ ...res, savedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

/** Raw stored value — a stable string, safe to use as a useSyncExternalStore snapshot. */
export function readPendingPaymentRaw(orderId: number): string | null {
  try {
    return sessionStorage.getItem(key(orderId));
  } catch {
    return null;
  }
}

export function parsePendingPayment(orderId: number, raw: string | null, windowMinutes: number): CheckoutResponse | null {
  try {
    if (!raw) return null;
    const v = JSON.parse(raw) as CheckoutResponse & { savedAt: number };
    if (Date.now() - v.savedAt > windowMinutes * 60_000) {
      sessionStorage.removeItem(key(orderId));
      return null;
    }
    return v;
  } catch {
    return null;
  }
}

export function clearPendingPayment(orderId: number) {
  try {
    sessionStorage.removeItem(key(orderId));
  } catch {
    /* ignore */
  }
}
