"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import { useOrders } from "@/hooks/use-account";
import { errorMessage } from "@/lib/api/client";
import { formatDate, formatPaise } from "@/lib/utils";
import { ButtonLink } from "../ui/button";
import { Skeleton } from "../ui/misc";
import { EmptyState, ErrorState } from "../states/states";
import { OrderStatusBadge } from "./order-status";

export function OrdersList() {
  const { data, isPending, isError, error, refetch } = useOrders();

  if (isPending)
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  if (!data.length)
    return (
      <EmptyState
        icon={<Package className="h-8 w-8" strokeWidth={1} />}
        title="No orders yet"
        body="When you place an order, you'll be able to track it and download its invoice here."
        action={<ButtonLink href="/shop" arrow>Start shopping</ButtonLink>}
      />
    );

  return (
    <ul className="divide-y divide-line border-y border-line">
      {data.map((o) => {
        const units = o.orderItems.reduce((n, i) => n + i.quantity, 0);
        return (
          <li key={o.orderId}>
            <Link
              href={`/account/orders/${o.orderId}`}
              className="group grid grid-cols-1 gap-3 py-6 transition-colors sm:grid-cols-12 sm:items-center sm:gap-6"
            >
              <div className="sm:col-span-4">
                <p className="font-medium tracking-wide">{o.orderNumber}</p>
                <p className="mt-1 text-[13px] text-stone">{formatDate(o.createdAt)}</p>
              </div>
              <p className="truncate text-[15px] text-stone sm:col-span-4">
                {o.orderItems.map((i) => i.productName).join(", ")}
                <span className="text-smoke"> · {units} item{units === 1 ? "" : "s"}</span>
              </p>
              <div className="sm:col-span-2">
                <OrderStatusBadge status={o.status} />
              </div>
              <p className="flex items-center justify-between text-[15px] font-medium tabular-nums sm:col-span-2 sm:justify-end sm:gap-4">
                {formatPaise(o.total)}
                <span aria-hidden className="text-stone transition-transform duration-500 group-hover:translate-x-1">
                  →
                </span>
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
