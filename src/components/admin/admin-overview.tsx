"use client";

import Link from "next/link";
import { useAdminOrders, useAdminProducts } from "@/hooks/use-admin";
import { errorMessage } from "@/lib/api/client";
import { formatDate, formatPaise } from "@/lib/utils";
import { Skeleton } from "../ui/misc";
import { ErrorState } from "../states/states";
import { OrderStatusBadge } from "../account/order-status";
import { AdminHeader } from "./admin-shell";

/** Figures are computed from the real order and product lists the admin API returns. */
export function AdminOverview() {
  const orders = useAdminOrders();
  const products = useAdminProducts();

  const paidLike = new Set(["PAID", "CONFIRMED", "SHIPPED", "DELIVERED"]);
  const list = orders.data ?? [];
  const revenue = list.filter((o) => paidLike.has(o.status)).reduce((s, o) => s + o.total, 0);
  const toShip = list.filter((o) => o.status === "PAID" || o.status === "CONFIRMED").length;
  const awaiting = list.filter((o) => o.status === "PENDING_PAYMENT").length;
  const lowStock = (products.data ?? []).filter((p) => p.active !== false && (p.stock ?? 0) <= 5);

  const stats = [
    { label: "Orders", value: String(list.length) },
    { label: "Revenue (confirmed)", value: formatPaise(revenue) },
    { label: "To ship", value: String(toShip) },
    { label: "Awaiting payment", value: String(awaiting) },
  ];

  return (
    <div>
      <AdminHeader title="Overview" />
      {orders.isError ? (
        <ErrorState message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />
      ) : (
        <dl className="grid grid-cols-2 gap-px overflow-hidden border border-line bg-line lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-paper p-6">
              <dt className="eyebrow text-stone">{s.label}</dt>
              <dd className="display mt-3 text-4xl tabular-nums">
                {orders.isPending ? <Skeleton className="h-9 w-24" /> : s.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-12 grid grid-cols-1 gap-12 xl:grid-cols-12">
        <section className="xl:col-span-8">
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">Recent orders</h2>
            <Link href="/admin/orders" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
              All orders
            </Link>
          </div>
          {orders.isPending ? (
            <Skeleton className="mt-4 h-60 w-full" />
          ) : list.length === 0 ? (
            <p className="mt-6 text-stone">No orders yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {list.slice(0, 8).map((o) => (
                <li key={o.orderId} className="flex flex-wrap items-center justify-between gap-3 py-4 text-[15px]">
                  <span className="min-w-40 font-medium">{o.orderNumber}</span>
                  <span className="flex-1 truncate text-stone">{o.email}</span>
                  <span className="text-stone">{formatDate(o.createdAt)}</span>
                  <OrderStatusBadge status={o.status} />
                  <span className="w-24 text-right tabular-nums">{formatPaise(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="xl:col-span-4">
          <h2 className="eyebrow">Low stock</h2>
          {products.isPending ? (
            <Skeleton className="mt-4 h-40 w-full" />
          ) : lowStock.length === 0 ? (
            <p className="mt-6 text-stone">Everything is well stocked.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {lowStock.map((p) => (
                <li key={p.productId} className="flex justify-between py-3 text-[15px]">
                  <span>{p.name}</span>
                  <span className={(p.stock ?? 0) === 0 ? "text-ember" : "text-warn"}>{p.stock ?? 0} left</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
