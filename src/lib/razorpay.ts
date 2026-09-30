import type { CheckoutResponse, PaymentVerifyRequest } from "./types";

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { email?: string; contact?: string; name?: string };
  theme?: { color?: string };
  handler: (res: PaymentVerifyRequest) => void;
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
}
interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", cb: (res: { error?: { description?: string } }) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (opts: RazorpayOptions) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loading: Promise<void> | null = null;

/** Load Razorpay Checkout only when a shopper actually pays. */
export function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Razorpay needs a browser"));
  if (window.Razorpay) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Couldn't load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(s);
  });
  return loading;
}

export type PaymentOutcome =
  | { kind: "paid"; payload: PaymentVerifyRequest }
  | { kind: "dismissed" }
  | { kind: "failed"; reason: string };

/** Open Razorpay for an order the backend already created. Resolves once the shopper finishes or closes it. */
export async function payWithRazorpay(order: CheckoutResponse, contact?: string): Promise<PaymentOutcome> {
  if (!order.razorpayKeyId || !order.razorpayOrderId || !order.amount) {
    return { kind: "failed", reason: "Payment details were missing from the order. Please try again." };
  }
  await loadRazorpay();
  const Razorpay = window.Razorpay;
  if (!Razorpay) return { kind: "failed", reason: "Payment window unavailable." };

  return new Promise<PaymentOutcome>((resolve) => {
    let settled = false;
    const done = (o: PaymentOutcome) => {
      if (!settled) {
        settled = true;
        resolve(o);
      }
    };
    const rzp = new Razorpay({
      key: order.razorpayKeyId!,
      order_id: order.razorpayOrderId!,
      amount: order.amount!,
      currency: order.currency ?? "INR",
      name: "ForgeX",
      description: `Order #${order.orderId}`,
      prefill: { email: order.customerEmail ?? undefined, contact },
      theme: { color: "#0c0c0d" },
      handler: (payload) => done({ kind: "paid", payload }),
      modal: {
        ondismiss: () => done(lastFailure ? { kind: "failed", reason: lastFailure } : { kind: "dismissed" }),
        confirm_close: true,
      },
    });
    // Razorpay keeps its window open after a failed attempt so the shopper can retry;
    // remember the reason and report it only if they close the window.
    let lastFailure: string | null = null;
    rzp.on("payment.failed", (r) => {
      lastFailure = r.error?.description ?? "Payment failed";
    });
    rzp.open();
  });
}
