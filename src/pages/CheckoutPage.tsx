import { CheckoutView } from "@/components/cart/CheckoutView";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function CheckoutPage() {
  usePageMeta("Checkout", undefined, { noindex: true });
  return <CheckoutView />;
}
