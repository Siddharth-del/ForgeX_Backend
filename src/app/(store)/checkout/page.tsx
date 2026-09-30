import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/guards";
import { CheckoutView } from "@/components/checkout/checkout-view";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-x pb-24 pt-28 md:pt-36">
      <h1 className="display border-b border-line pb-8 text-5xl sm:text-7xl">Checkout</h1>
      <div className="pt-10">
        <RequireAuth>
          <CheckoutView />
        </RequireAuth>
      </div>
    </div>
  );
}
