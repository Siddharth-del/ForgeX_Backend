/**
 * Remembers an online-payment order that was created but not yet paid, so a closed payment window
 * or a page refresh resumes that order instead of creating (and reserving stock for) another.
 * The backend cancels unpaid orders after shop.payment.expiry-minutes (15) and releases their stock.
 */
const KEY = "cosmic-pending-payment";
export const PAYMENT_WINDOW_MINUTES = 15;

export interface PendingPayment {
  orderId: number;
  razorpayOrderId: string;
  keyId: string;
  amount: number;
  currency: string;
  email: string;
  /** Bag contents when the order was created; a different bag means a new order. */
  bag: string;
  createdAt: number;
}

export const bagSignature = (lines: { productId: string; quantity: number }[]) =>
  lines.map((l) => `${l.productId}x${l.quantity}`).sort().join(",");

export function readPending(): PendingPayment | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as PendingPayment | null;
    if (!v || Date.now() - v.createdAt > PAYMENT_WINDOW_MINUTES * 60_000) return null;
    return v;
  } catch {
    return null;
  }
}

export function savePending(p: PendingPayment) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode: resuming just won't be offered */
  }
}

export function clearPending() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
