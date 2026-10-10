import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import Link from "@/components/ui/Link";
import { AdminPage, EmptyPanel, ErrorPanel, Panel, StatCard, TableSkeleton } from "@/components/admin/AdminUI";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLoad } from "@/hooks/useLoad";
import { usePageMeta } from "@/hooks/usePageMeta";
import { adminOrderApi } from "@/lib/api/admin";
import { fetchAllProducts } from "@/lib/api/products";
import { ORDER_STATUSES, type OrderDTO, type ProductDTO } from "@/lib/api/types";
import { isLiveOrder, itemCount, LOW_STOCK, NEEDS_ACTION, stockLevel } from "@/lib/admin";
import { formatDateTime, formatPaise, ORDER_STATUS_LABEL } from "@/lib/orders";

const DAY = 86_400_000;

/** Overview built only from what the API returns: all orders (GET /api/admin/orders) and all products. */
export default function AdminDashboard() {
  usePageMeta("Dashboard · Admin", undefined, { noindex: true });
  const orders = useLoad(() => adminOrderApi.all());
  const products = useLoad(() => fetchAllProducts());

  return (
    <AdminPage
      eyebrow="Overview"
      title="Dashboard"
      actions={
        <>
          <ButtonLink href="/admin/products/new" size="sm">
            New product
          </ButtonLink>
          <ButtonLink href="/admin/orders" size="sm" variant="outline">
            All orders
          </ButtonLink>
        </>
      }
    >
      <div className="space-y-10">
        <section aria-labelledby="sales-h">
          <h2 id="sales-h" className="label mb-4">
            Orders &amp; revenue
          </h2>
          {orders.error ? (
            <ErrorPanel error={orders.error} onRetry={orders.reload} what="orders" />
          ) : !orders.data ? (
            <StatSkeleton />
          ) : (
            <OrderStats orders={orders.data} />
          )}
        </section>

        <section aria-labelledby="catalogue-h">
          <h2 id="catalogue-h" className="label mb-4">
            Catalogue
          </h2>
          {products.error ? (
            <ErrorPanel error={products.error} onRetry={products.reload} what="products" />
          ) : !products.data ? (
            <StatSkeleton />
          ) : (
            <ProductStats products={products.data} />
          )}
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Panel
            title="Recent orders"
            action={
              <Link href="/admin/orders" className="label text-[0.58rem] text-ink-muted hover:text-ink">
                View all
              </Link>
            }
            padded={false}
          >
            {orders.error ? (
              <div className="p-5">
                <ErrorPanel error={orders.error} onRetry={orders.reload} what="orders" />
              </div>
            ) : !orders.data ? (
              <div className="p-5">
                <TableSkeleton rows={5} />
              </div>
            ) : orders.data.length === 0 ? (
              <div className="p-5">
                <EmptyPanel title="No orders yet" body="Orders appear here as soon as customers check out." />
              </div>
            ) : (
              <RecentOrders orders={orders.data} />
            )}
          </Panel>

          <div className="space-y-6">
            <Panel title="Orders by status">
              {orders.data ? <StatusBars orders={orders.data} /> : orders.error ? <p className="text-[0.85rem] text-ink-muted">Unavailable.</p> : <Skeleton className="h-48" />}
            </Panel>
            <Panel title={`Stock to watch (${LOW_STOCK} or fewer)`} padded={false}>
              {products.data ? <StockWatch products={products.data} /> : products.error ? <p className="p-5 text-[0.85rem] text-ink-muted">Unavailable.</p> : <div className="p-5"><Skeleton className="h-40" /></div>}
            </Panel>
          </div>
        </div>

        <Panel title="Handled outside this panel">
          <ul className="grid gap-x-10 gap-y-3 text-[0.84rem] text-ink-muted md:grid-cols-2">
            <li>
              <span className="text-ink">Refunds</span> are issued from the Razorpay Dashboard. Cancelling an order here doesn&rsquo;t refund it or return its stock (the API
              doesn&rsquo;t do either), so adjust stock on the product afterwards.
            </li>
            <li>
              <span className="text-ink">Customer accounts</span>: the API has no endpoint to list, edit or disable users. The Customers page lists everyone who has ordered.
            </li>
            <li>
              <span className="text-ink">Shipment tracking</span>, courier and AWB numbers aren&rsquo;t stored by the API; only the order status is.
            </li>
            <li>
              <span className="text-ink">Reviews, fragrance notes and gift sets</span> have no fields in the API, so the store hides those sections.
            </li>
          </ul>
        </Panel>
      </div>
    </AdminPage>
  );
}

function StatSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[7.5rem]" />
      ))}
    </div>
  );
}

function OrderStats({ orders }: { orders: OrderDTO[] }) {
  const s = useMemo(() => {
    const since = Date.now() - 30 * DAY;
    const live = orders.filter(isLiveOrder);
    const recent = live.filter((o) => new Date(o.createdAt).getTime() >= since);
    const captured = orders.filter((o) => o.paymentStatus === "CAPTURED" && o.status !== "REFUNDED");
    const codOpen = orders.filter((o) => o.paymentMethod === "COD" && (o.status === "CONFIRMED" || o.status === "SHIPPED"));
    const codDelivered = orders.filter((o) => o.paymentMethod === "COD" && o.status === "DELIVERED");
    return {
      needsAction: orders.filter((o) => NEEDS_ACTION.includes(o.status)).length,
      toConfirm: orders.filter((o) => o.status === "PAID").length,
      toShip: orders.filter((o) => o.status === "CONFIRMED").length,
      awaitingPayment: orders.filter((o) => o.status === "PENDING_PAYMENT").length,
      recentCount: recent.length,
      recentValue: recent.reduce((n, o) => n + o.total, 0),
      captured: captured.reduce((n, o) => n + o.total, 0),
      capturedCount: captured.length,
      codOpen: codOpen.reduce((n, o) => n + o.total, 0),
      codOpenCount: codOpen.length,
      codDelivered: codDelivered.reduce((n, o) => n + o.total, 0),
      customers: new Set(live.map((o) => o.email.toLowerCase())).size,
      aov: live.length ? Math.round(live.reduce((n, o) => n + o.total, 0) / live.length) : 0,
    };
  }, [orders]);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="To fulfil" value={s.needsAction} hint={`${s.toConfirm} to confirm · ${s.toShip} to ship`} href="/admin/orders?status=action" tone={s.needsAction ? "gold" : "default"} />
      <StatCard label="Last 30 days" value={formatPaise(s.recentValue)} hint={`${s.recentCount} order${s.recentCount === 1 ? "" : "s"} placed (excl. unpaid & cancelled)`} />
      <StatCard label="Paid online" value={formatPaise(s.captured)} hint={`${s.capturedCount} captured Razorpay payment${s.capturedCount === 1 ? "" : "s"}`} />
      <StatCard label="Cash on delivery" value={formatPaise(s.codOpen)} hint={`${s.codOpenCount} open · ${formatPaise(s.codDelivered)} delivered`} />
      <StatCard label="Awaiting payment" value={s.awaitingPayment} hint="Online orders not yet paid; cancelled after 15 min" href="/admin/orders?status=PENDING_PAYMENT" />
      <StatCard label="Orders" value={orders.length} hint="All time, every status" href="/admin/orders" />
      <StatCard label="Customers" value={s.customers} hint="Distinct emails with a paid or confirmed order" href="/admin/customers" />
      <StatCard label="Average order" value={formatPaise(s.aov)} hint="Paid or confirmed orders" />
    </div>
  );
}

function ProductStats({ products }: { products: ProductDTO[] }) {
  const active = products.filter((p) => p.active !== false);
  const out = active.filter((p) => stockLevel(p) === "out").length;
  const low = active.filter((p) => stockLevel(p) === "low").length;
  const noImage = active.filter((p) => !p.image).length;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Products" value={products.length} hint={`${active.length} live · ${products.length - active.length} hidden`} href="/admin/products" />
      <StatCard label="Out of stock" value={out} hint="Live products with 0 stock" href="/admin/products?stock=out" tone={out ? "alert" : "default"} />
      <StatCard label="Low stock" value={low} hint={`Live products with ${LOW_STOCK} or fewer`} href="/admin/products?stock=low" tone={low ? "gold" : "default"} />
      <StatCard label="Missing image" value={noImage} hint="Live products showing the placeholder" href="/admin/products?image=missing" tone={noImage ? "gold" : "default"} />
    </div>
  );
}

function RecentOrders({ orders }: { orders: OrderDTO[] }) {
  const recent = [...orders].sort((a, b) => b.orderId - a.orderId).slice(0, 8);
  return (
    <ul className="divide-y divide-hair">
      {recent.map((o) => (
        <li key={o.orderId}>
          <Link href={`/admin/orders/${o.orderId}`} className="group flex items-center gap-4 px-5 py-4 hover:bg-sand/40">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.88rem] tabular">{o.orderNumber || `#${o.orderId}`}</p>
              <p className="mt-0.5 truncate text-[0.75rem] text-ink-muted">
                {o.email} · {itemCount(o)} item{itemCount(o) === 1 ? "" : "s"} · {formatDateTime(o.createdAt)}
              </p>
            </div>
            <p className="hidden text-[0.88rem] tabular sm:block">{formatPaise(o.total)}</p>
            <OrderStatusBadge status={o.status} />
            <ArrowRight aria-hidden className="hidden h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-0.5 sm:block" strokeWidth={1.3} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function StatusBars({ orders }: { orders: OrderDTO[] }) {
  const max = Math.max(1, ...ORDER_STATUSES.map((s) => orders.filter((o) => o.status === s).length));
  return (
    <ul className="space-y-3">
      {ORDER_STATUSES.map((s) => {
        const n = orders.filter((o) => o.status === s).length;
        return (
          <li key={s}>
            <Link href={`/admin/orders?status=${s}`} className="grid grid-cols-[8.5rem_minmax(0,1fr)_2rem] items-center gap-3 text-[0.78rem] hover:text-ink">
              <span className="truncate text-ink-muted">{ORDER_STATUS_LABEL[s]}</span>
              <span className="h-2 bg-espresso/[0.06]">
                <span className="block h-full bg-gold" style={{ width: `${(n / max) * 100}%` }} />
              </span>
              <span className="text-right tabular">{n}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function StockWatch({ products }: { products: ProductDTO[] }) {
  const list = products
    .filter((p) => p.active !== false && stockLevel(p) !== "ok")
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
    .slice(0, 8);
  if (!list.length) return <p className="p-5 text-[0.85rem] text-ink-muted">Every live product has more than {LOW_STOCK} in stock.</p>;
  return (
    <ul className="divide-y divide-hair">
      {list.map((p) => (
        <li key={p.productId}>
          <Link href={`/admin/products/${p.productId}`} className="flex items-center justify-between gap-4 px-5 py-3 text-[0.85rem] hover:bg-sand/40">
            <span className="truncate">{p.name}</span>
            <span className={(p.stock ?? 0) <= 0 ? "text-[#9b3b2a] tabular" : "text-gold-deep tabular"}>{(p.stock ?? 0) <= 0 ? "Out of stock" : `${p.stock} left`}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
