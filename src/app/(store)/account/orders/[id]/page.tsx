import { Suspense } from "react";
import { OrderDetail } from "@/components/account/order-detail";

export default async function OrderPage({ params }: PageProps<"/account/orders/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <OrderDetail id={Number(id)} />
    </Suspense>
  );
}
