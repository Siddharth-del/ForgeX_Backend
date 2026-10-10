/**
 * Razorpay Standard Checkout (official script from checkout.razorpay.com).
 * Only the public key id (sent by the backend with each order) is used here; the secret stays on
 * the server, which verifies every payment signature before an order is marked paid.
 */
const SRC = "https://checkout.razorpay.com/v1/checkout.js";

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  retry?: { enabled: boolean; max_count?: number };
  modal?: { ondismiss?: () => void; escape?: boolean; confirm_close?: boolean; backdropclose?: boolean };
  handler: (r: RazorpaySuccess) => void;
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
  on: (event: "payment.failed", cb: (r: { error?: { description?: string; reason?: string; code?: string } }) => void) => void;
}

type RazorpayCtor = new (o: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

let loading: Promise<RazorpayCtor> | null = null;

export function loadRazorpay(): Promise<RazorpayCtor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!loading) {
    loading = new Promise<RazorpayCtor>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay didn't load.")));
      s.onerror = () => reject(new Error("We couldn't load the secure payment window. Check your connection or ad blocker and try again."));
      document.head.appendChild(s);
    }).catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

export type PaymentOutcome = { kind: "success"; response: RazorpaySuccess } | { kind: "dismissed"; lastError?: string };

/** Opens the Razorpay window and resolves once the shopper pays or closes it. Failed attempts can be retried inside the window. */
export async function payWithRazorpay(opts: Omit<RazorpayOptions, "handler" | "modal">): Promise<PaymentOutcome> {
  const Razorpay = await loadRazorpay();
  return new Promise<PaymentOutcome>((resolve) => {
    let lastError: string | undefined;
    let settled = false;
    const done = (o: PaymentOutcome) => {
      if (!settled) {
        settled = true;
        resolve(o);
      }
    };
    const rzp = new Razorpay({
      ...opts,
      retry: { enabled: true, max_count: 4 },
      modal: { ondismiss: () => done({ kind: "dismissed", lastError }), escape: true, confirm_close: true, backdropclose: false },
      handler: (response) => done({ kind: "success", response }),
    });
    rzp.on("payment.failed", (r) => {
      lastError = r.error?.description || r.error?.reason || "The payment didn't go through.";
    });
    rzp.open();
  });
}
