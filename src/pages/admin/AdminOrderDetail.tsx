import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Download } from "lucide-react";
import Link from "@/components/ui/Link";
import { AddressLines } from "@/components/account/Addresses";
import { AdminPage, ErrorPanel, Panel } from "@/components/admin/AdminUI";
import { td, th } from "@/components/admin/styles";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLoad } from "@/hooks/useLoad";
import { usePageMeta } from "@/hooks/usePageMeta";
import { adminOrderApi } from "@/lib/api/admin";
import { addressApi } from "@/lib/api/addresses";
import { invoiceAvailable, ORDER_TRANSITIONS, type AddressDTO, type OrderDTO, type OrderStatus } from "@/lib/api/types";
import { itemCount } from "@/lib/admin";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatPaise, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import { cn } from "@/lib/cn";
import { toast } from "@/store/toast";

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "Confirm order",
  SHIPPED: "Mark as shipped",
  DELIVERED: "Mark as delivered",
  CANCELLED: "Cancel order",
};

/** One order. The API has no single-order admin endpoint, so it's taken from GET /api/admin/orders. */
export default function AdminOrderDetail() {
  const { id } = useParams();
  const orderId = Number(id);
  usePageMeta(`Order #${id} · Admin`, undefined, { noindex: true });
  const orders = useLoad(() => adminOrderApi.all(), orderId);
  const order = orders.data?.find((o) => o.orderId === orderId);

  if (orders.error)
    return (
      <AdminPage eyebrow="Sales" title={`Order #${id}`}>
        <ErrorPanel error={orders.error} onRetry={orders.reload} what="this order" />
      </AdminPage>
    );
  if (!orders.data)
    return (
      <AdminPage eyebrow="Sales" title={`Order #${id}`}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Skeleton className="h-[28rem]" />
          <Skeleton className="h-[20rem]" />
        </div>
      </AdminPage>
    );
  if (!order)
    return (
      <AdminPage eyebrow="Sales" title="Order not found">
        <p className="text-[0.9rem] text-ink-muted">There&rsquo;s no order #{id}.</p>
        <Link href="/admin/orders" className="label mt-6 inline-block underline underline-offset-4">
          Back to orders
        </Link>
      </AdminPage>
    );

  return <OrderView order={order} onChanged={(o) => orders.setData((all) => (all ?? []).map((x) => (x.orderId === o.orderId ? o : x)))} />;
}

function OrderView({ order, onChanged }: { order: OrderDTO; onChanged: (o: OrderDTO) => void }) {
  const [address, setAddress] = useState<AddressDTO | null | "error">(null);

  useEffect(() => {
    if (!order.addressId) return;
    let live = true;
    addressApi.get(order.addressId).then(
      (a) => live && setAddress(a),
      () => live && setAddress("error"),
    );
    return () => {
      live = false;
    };
  }, [order.addressId]);

  return (
    <AdminPage
      eyebrow={`Order #${order.orderId} · ${formatDateTime(order.createdAt)}`}
      title={order.orderNumber || `Order #${order.orderId}`}
      actions={
        <Link href="/admin/orders" className="label inline-flex h-10 items-center px-2 text-[0.6rem] text-ink-muted hover:text-ink">
          All orders
        </Link>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <StatusPanel order={order} onChanged={onChanged} />

          <Panel title={`Items (${itemCount(order)})`} padded={false}>
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[34rem]">
                <thead className="border-b border-hair">
                  <tr>
                    <th className={th}>Product</th>
                    <th className={cn(th, "text-right")}>Qty</th>
                    <th className={cn(th, "text-right")}>Unit</th>
                    <th className={cn(th, "text-right")}>Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hair">
                  {order.orderItems.map((i) => (
                    <tr key={i.orderItemId}>
                      <td className={td}>
                        {i.productId ? (
                          <Link href={`/admin/products/${i.productId}`} className="hover:underline">
                            {i.productName}
                          </Link>
                        ) : (
                          i.productName
                        )}
                        {i.mrp && i.mrp > i.unitPrice ? <span className="block text-[0.72rem] text-ink-faint">MRP {formatPaise(i.mrp)}</span> : null}
                      </td>
                      <td className={cn(td, "text-right tabular")}>{i.quantity}</td>
                      <td className={cn(td, "text-right tabular")}>{formatPaise(i.unitPrice)}</td>
                      <td className={cn(td, "text-right tabular")}>{formatPaise(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="space-y-2 border-t border-hair p-5 text-[0.86rem]">
              <Row k="Subtotal" v={formatPaise(order.subtotal)} />
              {!!order.discount && <Row k={`Coupon ${order.couponCode ?? ""}`} v={`−${formatPaise(order.discount)}`} />}
              <Row k="Shipping" v={order.shipping ? formatPaise(order.shipping) : "Free"} />
              <div className="flex justify-between border-t border-hair pt-3 text-[1rem]">
                <dt>Total</dt>
                <dd className="font-medium tabular">{formatPaise(order.total)}</dd>
              </div>
            </dl>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <p className="break-all text-[0.9rem]">{order.email}</p>
            <Link href={`/admin/orders?q=${encodeURIComponent(order.email)}`} className="label mt-2 inline-block text-[0.58rem] text-ink-muted underline-offset-4 hover:text-ink hover:underline">
              Their orders
            </Link>
            <div className="mt-5 border-t border-hair pt-5 text-[0.86rem]">
              <p className="label mb-3 text-[0.58rem] text-ink-muted">Ship to</p>
              {!order.addressId ? (
                <p className="text-ink-muted">No address on this order.</p>
              ) : address === "error" ? (
                <p className="text-ink-muted">Address #{order.addressId} couldn&rsquo;t be loaded.</p>
              ) : address ? (
                <AddressLines address={address} />
              ) : (
                <Skeleton className="h-24" />
              )}
              <p className="mt-3 text-[0.72rem] text-ink-faint">The API stores no recipient name on addresses; use the customer email.</p>
            </div>
          </Panel>

          <Panel title="Payment">
            <dl className="space-y-2 text-[0.86rem]">
              <Row k="Method" v={PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod} />
              <Row k="Status" v={order.paymentStatus ? PAYMENT_STATUS_LABEL[order.paymentStatus] : "—"} />
              {order.paidAt && <Row k="Paid" v={formatDateTime(order.paidAt)} />}
              {order.couponCode && <Row k="Coupon" v={order.couponCode} />}
            </dl>
            <p className="mt-4 text-[0.72rem] leading-relaxed text-ink-faint">
              {order.paymentMethod === "COD"
                ? "Cash on delivery: the API has no field for recording that cash was collected."
                : "Razorpay payment and order IDs aren't included in the API's order data; look them up in the Razorpay Dashboard by amount and time if needed."}
            </p>
          </Panel>

          <InvoicePanel order={order} />
        </div>
      </div>
    </AdminPage>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{k}</dt>
      <dd className="text-right tabular">{v}</dd>
    </div>
  );
}

/** PATCH /api/admin/orders/{id}/status — only the moves the backend allows are offered. */
function StatusPanel({ order, onChanged }: { order: OrderDTO; onChanged: (o: OrderDTO) => void }) {
  const next = ORDER_TRANSITIONS[order.status] ?? [];
  const [confirm, setConfirm] = useState<OrderStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async (status: OrderStatus) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await adminOrderApi.setStatus(order.orderId, status);
      onChanged(updated);
      setConfirm(null);
      toast({ title: `${order.orderNumber}: ${ORDER_STATUS_LABEL[updated.status]}` });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const explain =
    order.status === "PENDING_PAYMENT"
      ? "Waiting for the customer to pay online. Unpaid orders are cancelled automatically after 15 minutes; the API doesn't allow changing them by hand."
      : order.status === "DELIVERED"
        ? "Delivered. This is the final status."
        : order.status === "CANCELLED"
          ? "Cancelled. This is the final status."
          : order.status === "REFUNDED"
            ? "The payment was refunded automatically because it arrived after the order had expired."
            : null;

  return (
    <Panel title="Status" action={<OrderStatusBadge status={order.status} />}>
      {explain && <p className="text-[0.86rem] text-ink-muted">{explain}</p>}
      {!!next.length && (
        <>
          <p className="text-[0.86rem] text-ink-muted">
            {order.status === "PAID" ? "Paid online. Confirm it when you start preparing the parcel." : order.status === "CONFIRMED" ? "Confirmed. Mark it shipped when it leaves you." : "Shipped. Mark it delivered once it arrives."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {next.map((s) => (
              <Button key={s} type="button" size="sm" variant={s === "CANCELLED" ? "outline" : "primary"} onClick={() => setConfirm(s)} disabled={busy}>
                {ACTION_LABEL[s] ?? ORDER_STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
        </>
      )}
      {confirm && (
        <div role="alertdialog" aria-labelledby="confirm-h" className={cn("mt-5 border-l-2 bg-sand/50 px-5 py-4", confirm === "CANCELLED" ? "border-[#9b3b2a]" : "border-gold")}>
          <p id="confirm-h" className="text-[0.9rem]">
            Move {order.orderNumber} to <strong className="font-medium">{ORDER_STATUS_LABEL[confirm]}</strong>? Status changes can&rsquo;t be undone.
          </p>
          {confirm === "CANCELLED" && (
            <p className="mt-2 text-[0.82rem] text-[#9b3b2a]">
              {order.paymentStatus === "CAPTURED"
                ? `This order was paid online (${formatPaise(order.total)}). Cancelling here does not refund it: issue the refund in the Razorpay Dashboard. `
                : ""}
              The API also doesn&rsquo;t return the items to stock; add them back on each product if needed.
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" onClick={() => apply(confirm)} disabled={busy} aria-busy={busy} className={confirm === "CANCELLED" ? "bg-[#7d2e21] before:bg-[#5e2015]" : undefined}>
              {busy ? "Saving" : `Yes, ${(ACTION_LABEL[confirm] ?? ORDER_STATUS_LABEL[confirm]).toLowerCase()}`}
            </Button>
            <button type="button" onClick={() => setConfirm(null)} disabled={busy} className="label text-[0.6rem] text-ink-muted hover:text-ink">
              Not now
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-[0.82rem] text-[#9b3b2a]">
          {error}
        </p>
      )}
    </Panel>
  );
}

function InvoicePanel({ order }: { order: OrderDTO }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const available = invoiceAvailable(order.status);
  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminOrderApi.downloadInvoice(order.orderId);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title="Invoice">
      {available ? (
        <Button type="button" size="sm" variant="outline" onClick={download} disabled={busy} aria-busy={busy} className="w-full">
          <Download aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} /> {busy ? "Preparing" : "Download PDF"}
        </Button>
      ) : (
        <p className="text-[0.84rem] text-ink-muted">Invoices aren&rsquo;t issued for {order.status === "CANCELLED" ? "cancelled orders" : "orders awaiting payment"}.</p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-[0.78rem] text-[#9b3b2a]">
          {error}
        </p>
      )}
    </Panel>
  );
}
