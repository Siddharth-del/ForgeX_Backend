import { useParams } from "react-router";
import { OrderDetailView } from "@/components/orders/OrderDetailView";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function OrderPage() {
  const { orderId } = useParams();
  usePageMeta("Order", undefined, { noindex: true });
  return <OrderDetailView orderId={Number(orderId)} />;
}
