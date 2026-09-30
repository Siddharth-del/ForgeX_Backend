"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { toast } from "sonner";
import { useAdminOrders, useSetOrderStatus } from "@/hooks/use-admin";
import { downloadFile, errorMessage } from "@/lib/api/client";
import { ordersApi } from "@/lib/api/endpoints";
import { ORDER_STATUS, PAYMENT_STATUS, STATUS_TRANSITIONS } from "@/lib/constants";
import type { Order, OrderStatus } from "@/lib/types";
import { cn, formatDate, formatPaise } from "@/lib/utils";
import { Skeleton } from "../ui/misc";
import { ErrorState } from "../states/states";
import { OrderStatusBadge } from "../account/order-status";
import { AdminHeader } from "./admin-shell";

const FILTERS: ("ALL" | OrderStatus)[] = ["ALL", "PENDING_PAYMENT", "PAID", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

function StatusAction({ order }: { order: Order }) {
  const set = useSetOrderStatus();
  const next = STATUS_TRANSITIONS[order.status] ?? [];
  if (!next.length) return <span className="text-[13px] text-smoke">—</span>;
  return (
    <select
      aria-label={`Change status of ${order.orderNumber}`}
      value=""
      disabled={set.isPending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const status = e.target.value as OrderStatus;
        if (status === "CANCELLED" && !confirm(`Cancel order ${order.orderNumber}?`)) return;
        set.mutate({ id: order.orderId, status });
      }}
      className="h-11 rounded-xs border border-line bg-white px-3 text-base focus:border-ink focus:outline-none sm:h-9 sm:text-[13px]"
    >
      <option value="" disabled>
        {set.isPending ? "Updating…" : "Move to…"}
      </option>
      {next.map((s) => (
        <option key={s} value={s}>
          {ORDER_STATUS[s].label}
        </option>
      ))}
    </select>
  );
}

export function AdminOrders() {
  const { data, isPending, isError, error, refetch } = useAdminOrders();
  const [filter, setFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(
      (o) =>
        (filter === "ALL" || o.status === filter) &&
        (!needle || o.orderNumber.toLowerCase().includes(needle) || o.email.toLowerCase().includes(needle)),
    );
  }, [data, filter, q]);

  const invoice = async (o: Order) => {
    try {
      await downloadFile(ordersApi.adminInvoicePath(o.orderId), `ForgeX-invoice-${o.orderId}.pdf`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div>
      <AdminHeader title="Orders" description="Move orders through fulfilment. Only transitions the backend allows are offered." />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search order number or email"
          aria-label="Search orders"
          className="h-11 w-full rounded-xs border border-line bg-white px-4 text-base focus:border-ink focus:outline-none sm:h-10 sm:max-w-xs sm:text-sm"
        />
        <div className="-mx-5 flex w-[calc(100%+2.5rem)] gap-1.5 overflow-x-auto px-5 pb-1 sm:w-auto [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "h-10 shrink-0 rounded-full border px-3.5 text-[13px] transition-colors lg:h-8 lg:text-[12px]",
                filter === f ? "border-ink bg-ink text-bone" : "border-line hover:border-ink",
              )}
            >
              {f === "ALL" ? "All" : ORDER_STATUS[f].label}
              {f !== "ALL" && data ? ` · ${data.filter((o) => o.status === f).length}` : ""}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <Skeleton className="h-80 w-full" />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-stone">No orders match.</p>
      ) : (
        <>
        {/* Phones & small tablets: one card per order */}
        <ul className="space-y-3 md:hidden">
          {rows.map((o) => (
            <li key={o.orderId} className="border border-line bg-white/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{o.orderNumber}</p>
                  <p className="mt-0.5 truncate text-[13px] text-stone">{o.email}</p>
                </div>
                <OrderStatusBadge status={o.status} />
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
                <div>
                  <dt className="text-stone">Placed</dt>
                  <dd>{formatDate(o.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-stone">Payment</dt>
                  <dd>{o.paymentMethod === "COD" ? "COD" : "Online"}</dd>
                </div>
                <div className="text-right">
                  <dt className="text-stone">Total</dt>
                  <dd className="font-medium tabular-nums">{formatPaise(o.total)}</dd>
                </div>
              </dl>
              <details className="group mt-3 border-t border-line pt-1 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[13px] text-stone">
                  {o.orderItems.reduce((n, i) => n + i.quantity, 0)} items
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <ul className="space-y-1 pb-2 text-[14px]">
                  {o.orderItems.map((i) => (
                    <li key={i.orderItemId}>
                      {i.quantity} × {i.productName} <span className="text-stone">· {formatPaise(i.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => invoice(o)} className="inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4">
                  <Download className="h-3.5 w-3.5" /> Invoice PDF
                </button>
              </details>
              {(STATUS_TRANSITIONS[o.status] ?? []).length > 0 && (
                <div className="mt-2 [&_select]:w-full">
                  <StatusAction order={o} />
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto border border-line md:block">
          <table className="w-full min-w-[860px] text-left text-[14px]">
            <thead className="bg-bone">
              <tr className="eyebrow text-stone">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Placed</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((o) => (
                <Fragment key={o.orderId}>
                  <tr className="bg-paper hover:bg-white">
                    <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-stone">{o.email}</td>
                    <td className="px-4 py-3 text-stone">{formatDate(o.createdAt, true)}</td>
                    <td className="px-4 py-3">
                      <span className="block">{o.paymentMethod === "COD" ? "COD" : "Online"}</span>
                      <span className="text-[12px] text-stone">{o.paymentStatus ? PAYMENT_STATUS[o.paymentStatus] : "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPaise(o.total)}</td>
                    <td className="px-4 py-3">
                      <StatusAction order={o} />
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => setOpen(open === o.orderId ? null : o.orderId)}
                        aria-expanded={open === o.orderId}
                        aria-label={`Details for ${o.orderNumber}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/5"
                      >
                        <ChevronDown className={cn("h-4 w-4 transition-transform", open === o.orderId && "rotate-180")} />
                      </button>
                    </td>
                  </tr>
                  {open === o.orderId && (
                    <tr className="bg-white">
                      <td colSpan={8} className="px-4 py-5">
                        <div className="flex flex-wrap items-start justify-between gap-6">
                          <ul className="space-y-1.5 text-[14px]">
                            {o.orderItems.map((i) => (
                              <li key={i.orderItemId}>
                                {i.quantity} × {i.productName} <span className="text-stone">· {formatPaise(i.lineTotal)}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="text-[13px] text-stone">
                            <p>Subtotal {formatPaise(o.subtotal)}</p>
                            {!!o.discount && <p>Coupon {o.couponCode} −{formatPaise(o.discount)}</p>}
                            <p>Shipping {o.shipping ? formatPaise(o.shipping) : "Free"}</p>
                            {o.paidAt && <p>Paid {formatDate(o.paidAt, true)}</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => invoice(o)}
                            className="inline-flex items-center gap-2 text-sm underline underline-offset-4"
                          >
                            <Download className="h-3.5 w-3.5" /> Invoice PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
