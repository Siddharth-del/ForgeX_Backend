/** Display helpers for orders, shared by the account pages and the admin panel. */
import type { OrderItemDTO, OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/api/types";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  CREATED: "Not paid yet",
  CAPTURED: "Paid online",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
  PENDING_COD: "Pay on delivery",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  RAZORPAY: "Online (Razorpay)",
  UPI: "Online (Razorpay)",
  COD: "Cash on delivery",
};

export type StatusTone = "neutral" | "progress" | "good" | "bad";

export const ORDER_STATUS_TONE: Record<OrderStatus, StatusTone> = {
  PENDING_PAYMENT: "neutral",
  PAID: "progress",
  CONFIRMED: "progress",
  SHIPPED: "progress",
  DELIVERED: "good",
  CANCELLED: "bad",
  REFUNDED: "bad",
};

/** The backend sends LocalDateTime without a zone ("2026-10-09T23:45:12.123"); show it as written. */
export function formatDateTime(value: string | null | undefined, withTime = true) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", withTime ? { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" });
}

/** Paise → "₹1,499" (keeps paise when there are any). */
const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatPaise = (p: number | null | undefined) => {
  const v = (p ?? 0) / 100;
  return Number.isInteger(v) ? inr0.format(v) : inr2.format(v);
};

/** What's inside a purchased box ("Royal Oud · 2 × Amber Nuit"), or null for a single product. */
export function boxContents(item: Pick<OrderItemDTO, "components">): string | null {
  if (!item.components?.length) return null;
  return item.components.map((c) => (c.quantity > 1 ? `${c.quantity} × ${c.productName}` : c.productName)).join(" · ");
}
