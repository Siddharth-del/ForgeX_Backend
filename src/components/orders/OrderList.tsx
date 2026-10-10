import { useEffect, useState } from "react";
import Link from "@/components/ui/Link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { errorMessage } from "@/lib/errors";
import { Skeleton } from "@/components/ui/Skeleton";
import { orderApi } from "@/lib/api/orders";
import type { OrderDTO } from "@/lib/api/types";
import { formatDateTime, formatPaise } from "@/lib/orders";
import { OrderStatusBadge } from "./OrderStatusBadge";

/** The signed-in customer's orders (GET /api/orders), newest first. */
export function OrderList() {
  const [orders, setOrders] = useState<OrderDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    orderApi
      .mine()
      .then((o) => live && setOrders([...o].sort((a, b) => b.orderId - a.orderId)))
      .catch((e) => live && setError(errorMessage(e)));
    return () => {
      live = false;
    };
  }, [attempt]);

  return (
    <section aria-labelledby="orders-h">
      <div className="border-b border-hair pb-4">
        <h2 id="orders-h" className="font-display text-[1.6rem] uppercase leading-none">
          Orders
        </h2>
      </div>

      {error && (
        <div role="alert" className="mt-6 border border-hair bg-sand/60 p-5 text-[0.88rem]">
          <p>{error}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="label mt-3 underline underline-offset-4">
            Try again
          </button>
        </div>
      )}
      {!orders && !error && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      )}
      {orders?.length === 0 && (
        <div className="mt-6 border border-hair bg-sand/40 p-6 text-[0.9rem]">
          <p className="text-ink-muted">You haven&rsquo;t placed an order yet.</p>
          <ButtonLink href="/collections/all" size="sm" arrow className="mt-5">
            Shop the collection
          </ButtonLink>
        </div>
      )}
      {!!orders?.length && (
        <ul className="divide-y divide-hair">
          {orders.map((o) => {
            const count = o.orderItems.reduce((n, i) => n + i.quantity, 0);
            return (
              <li key={o.orderId}>
                <Link href={`/account/orders/${o.orderId}`} className="group flex items-center gap-4 py-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.95rem]">
                      <span className="tabular">{o.orderNumber || `#${o.orderId}`}</span>
                    </p>
                    <p className="mt-1 text-[0.78rem] text-ink-muted">
                      {formatDateTime(o.createdAt, false)} · {count} {count === 1 ? "item" : "items"} · <span className="tabular">{formatPaise(o.total)}</span>
                    </p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                  <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-500 ease-luxe group-hover:translate-x-1 group-hover:text-ink" strokeWidth={1.3} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
