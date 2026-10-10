import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import Link from "@/components/ui/Link";
import { AdminPage, EmptyPanel, ErrorPanel, FilterChips, SearchInput, TableSkeleton } from "@/components/admin/AdminUI";
import { td, th } from "@/components/admin/styles";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { useLoad } from "@/hooks/useLoad";
import { usePageMeta } from "@/hooks/usePageMeta";
import { adminOrderApi } from "@/lib/api/admin";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/api/types";
import { itemCount, NEEDS_ACTION } from "@/lib/admin";
import { formatDateTime, formatPaise, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import { cn } from "@/lib/cn";

type Filter = "all" | "action" | OrderStatus;

/** Every order (GET /api/admin/orders), filterable by status, payment method and search. */
export default function AdminOrders() {
  usePageMeta("Orders · Admin", undefined, { noindex: true });
  const [params, setParams] = useSearchParams();
  const orders = useLoad(() => adminOrderApi.all());
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [method, setMethod] = useState<"all" | "online" | "COD">("all");
  const filter = (params.get("status") as Filter) || "all";

  const setFilter = (v: Filter) => {
    const next = new URLSearchParams(params);
    if (v === "all") next.delete("status");
    else next.set("status", v);
    setParams(next, { replace: true });
  };

  const all = useMemo(() => [...(orders.data ?? [])].sort((a, b) => b.orderId - a.orderId), [orders.data]);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((o) => (filter === "all" ? true : filter === "action" ? NEEDS_ACTION.includes(o.status) : o.status === filter))
      .filter((o) => (method === "all" ? true : method === "COD" ? o.paymentMethod === "COD" : o.paymentMethod !== "COD"))
      .filter((o) => !q || o.orderNumber?.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || String(o.orderId) === q.replace(/^#/, "") || o.orderItems.some((i) => i.productName.toLowerCase().includes(q)));
  }, [all, filter, method, query]);

  const count = (s: OrderStatus) => all.filter((o) => o.status === s).length;

  return (
    <AdminPage eyebrow="Sales" title="Orders">
      <div className="flex flex-col gap-4">
        <FilterChips
          label="Order status"
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "All", count: all.length },
            { id: "action", label: "To fulfil", count: all.filter((o) => NEEDS_ACTION.includes(o.status)).length },
            ...ORDER_STATUSES.map((s) => ({ id: s as Filter, label: ORDER_STATUS_LABEL[s], count: count(s) })),
          ]}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <FilterChips
            label="Payment method"
            value={method}
            onChange={setMethod}
            options={[
              { id: "all", label: "Any payment" },
              { id: "online", label: "Online" },
              { id: "COD", label: "Cash on delivery" },
            ]}
          />
          <SearchInput value={query} onChange={setQuery} placeholder="Order no., email or product" label="Search orders" />
        </div>
      </div>

      <div className="mt-6">
        {orders.error ? (
          <ErrorPanel error={orders.error} onRetry={orders.reload} what="orders" />
        ) : !orders.data ? (
          <TableSkeleton />
        ) : all.length === 0 ? (
          <EmptyPanel title="No orders yet" body="Orders appear here as soon as customers check out." />
        ) : list.length === 0 ? (
          <EmptyPanel title="Nothing matches" body="Try another search or status." />
        ) : (
          <>
            <p className="mb-3 text-[0.75rem] text-ink-faint" role="status">
              {list.length} of {all.length} orders
            </p>
            <div className="relative hidden overflow-x-auto border border-hair bg-white/70 md:block">
              <table className="w-full min-w-[54rem]">
                <thead className="border-b border-hair">
                  <tr>
                    <th className={th}>Order</th>
                    <th className={th}>Customer</th>
                    <th className={th}>Items</th>
                    <th className={cn(th, "text-right")}>Total</th>
                    <th className={th}>Payment</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hair">
                  {list.map((o) => (
                    <tr key={o.orderId} className="relative hover:bg-sand/30">
                      <td className={td}>
                        <Link href={`/admin/orders/${o.orderId}`} className="tabular after:absolute after:inset-0 hover:underline">
                          {o.orderNumber || `#${o.orderId}`}
                        </Link>
                        <span className="block text-[0.72rem] text-ink-faint">{formatDateTime(o.createdAt)}</span>
                      </td>
                      <td className={cn(td, "max-w-[16rem] truncate")}>{o.email}</td>
                      <td className={cn(td, "text-ink-muted")}>
                        {itemCount(o)} · <span className="truncate">{o.orderItems.map((i) => i.productName).join(", ")}</span>
                      </td>
                      <td className={cn(td, "text-right tabular")}>{formatPaise(o.total)}</td>
                      <td className={cn(td, "text-[0.78rem]")}>
                        {o.paymentMethod === "COD" ? "COD" : "Online"}
                        <span className="block text-ink-faint">{o.paymentStatus ? PAYMENT_STATUS_LABEL[o.paymentStatus] : "—"}</span>
                      </td>
                      <td className={td}>
                        <OrderStatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-3 md:hidden">
              {list.map((o) => (
                <li key={o.orderId}>
                  <Link href={`/admin/orders/${o.orderId}`} className="block border border-hair bg-white/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[0.9rem] tabular">{o.orderNumber || `#${o.orderId}`}</p>
                        <p className="truncate text-[0.75rem] text-ink-muted">{o.email}</p>
                      </div>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <p className="mt-3 flex justify-between text-[0.78rem] text-ink-muted">
                      <span>
                        {formatDateTime(o.createdAt)} · {itemCount(o)} item{itemCount(o) === 1 ? "" : "s"} · {o.paymentMethod === "COD" ? "COD" : "Online"}
                      </span>
                      <span className="tabular text-ink">{formatPaise(o.total)}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </AdminPage>
  );
}
