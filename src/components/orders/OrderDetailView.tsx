import { useCallback, useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { Check, Download, Lock } from "lucide-react";
import Link from "@/components/ui/Link";
import { AddressLines } from "@/components/account/Addresses";
import { useCatalog } from "@/components/layout/CatalogProvider";
import { ProductPhoto } from "@/components/products/ProductPhoto";
import { Button, ButtonLink } from "@/components/ui/Button";
import { errorMessage } from "@/lib/errors";
import { Skeleton } from "@/components/ui/Skeleton";
import { addressApi } from "@/lib/api/addresses";
import { ApiError } from "@/lib/api/client";
import { orderApi } from "@/lib/api/orders";
import { invoiceAvailable, type AddressDTO, type OrderDTO, type OrderStatus } from "@/lib/api/types";
import { boxContents, formatDateTime, formatPaise, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import { completePayment, type PayResult } from "@/lib/payOrder";
import { clearPending, PAYMENT_WINDOW_MINUTES, readPending } from "@/lib/pendingPayment";
import { cn } from "@/lib/cn";
import { useAuth } from "@/store/auth";
import { useCart } from "@/store/cart";
import { OrderStatusBadge } from "./OrderStatusBadge";

const STEPS: { label: string; reached: OrderStatus[] }[] = [
  { label: "Placed", reached: ["PENDING_PAYMENT", "PAID", "CONFIRMED", "SHIPPED", "DELIVERED"] },
  { label: "Confirmed", reached: ["PAID", "CONFIRMED", "SHIPPED", "DELIVERED"] },
  { label: "Shipped", reached: ["SHIPPED", "DELIVERED"] },
  { label: "Delivered", reached: ["DELIVERED"] },
];

/** One order for its customer: status, items, totals, address, invoice, and payment if it's still due. */
export function OrderDetailView({ orderId }: { orderId: number }) {
  const user = useAuth((s) => s.user);
  const [params] = useSearchParams();
  const placed = params.get("placed") === "1";
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [address, setAddress] = useState<AddressDTO | null>(null);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    const o = await orderApi.get(orderId);
    setOrder(o);
    if (o.addressId) addressApi.get(o.addressId).then(setAddress, () => setAddress(null));
    return o;
  }, [orderId]);

  useEffect(() => {
    if (!user || !Number.isFinite(orderId)) return;
    let live = true;
    setError(null);
    load().catch((e) => live && setError({ message: errorMessage(e), status: e instanceof ApiError ? e.status : 0 }));
    return () => {
      live = false;
    };
  }, [user, orderId, attempt, load]);

  // Once the server says this order is paid (or settled), forget the pending payment and refresh the
  // bag (on payment the server removes exactly the order's lines; anything added since stays).
  useEffect(() => {
    if (!order || order.status === "PENDING_PAYMENT") return;
    const pending = readPending();
    if (pending?.orderId === order.orderId) {
      clearPending();
      // Paid: the server has taken the ordered lines out of the cart; show the cart it has now.
      if (order.status === "PAID") void useCart.getState().load();
    }
  }, [order]);

  if (!user) return <Navigate to={`/account?next=/account/orders/${orderId}`} replace />;

  if (error)
    return (
      <div className="container-site py-section">
        <div className="mx-auto max-w-lg border border-hair bg-sand/60 p-8 text-center">
          <p className="eyebrow text-gold-deep">Order</p>
          <h1 className="mt-3 font-display text-[2rem] uppercase leading-tight">{error.status === 404 || error.status === 400 ? "Order not found" : "Couldn't load this order"}</h1>
          <p className="mt-4 text-[0.9rem] text-ink-muted">{error.status === 404 || error.status === 400 ? "We couldn't find this order on your account." : error.message}</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {error.status !== 404 && error.status !== 400 && (
              <Button type="button" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </Button>
            )}
            <ButtonLink href="/account" variant="outline">
              Your account
            </ButtonLink>
          </div>
        </div>
      </div>
    );

  if (!order)
    return (
      <div className="container-site grid grid-cols-1 gap-10 py-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Skeleton className="h-[26rem]" />
        <Skeleton className="h-[18rem]" />
      </div>
    );

  const thanks = placed && order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED" && order.status !== "REFUNDED";

  return (
    <div className="bg-ivory">
      <div className="container-site py-12 md:py-16">
        <Link href="/account" className="label text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          ← Your account
        </Link>
        <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-gold-deep">{thanks ? "Thank you" : "Order"}</p>
            <h1 className="mt-3 break-words text-display-sm uppercase">{thanks ? (order.status === "PAID" ? "Payment received" : "Order placed") : order.orderNumber || `Order #${order.orderId}`}</h1>
            {thanks && (
              <p className="mt-3 max-w-prose text-[0.92rem] text-ink-muted">
                Order <span className="tabular text-ink">{order.orderNumber}</span> is confirmed. We&rsquo;ve noted it under {order.email}; you can follow it here at any time.
              </p>
            )}
          </div>
          <OrderStatusBadge status={order.status} className="self-start md:self-auto" />
        </div>

        {order.status !== "CANCELLED" && order.status !== "REFUNDED" && <Progress status={order.status} />}

        {order.status === "PENDING_PAYMENT" && <PendingPaymentPanel order={order} phone={address?.phoneNumber} onPaid={() => setAttempt((n) => n + 1)} />}
        {(order.status === "CANCELLED" || order.status === "REFUNDED") && (
          <p className="mt-8 border-l-2 border-[#9b3b2a]/50 pl-4 text-[0.88rem] text-ink-muted">
            {order.status === "REFUNDED"
              ? "This order was cancelled and its payment refunded. Your bank may take a few working days to show the refund."
              : order.paymentStatus === "FAILED"
                ? "This order was cancelled because payment wasn't completed in time. Nothing was charged for it."
                : "This order has been cancelled."}
          </p>
        )}

        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
          <section aria-labelledby="items-h">
            <h2 id="items-h" className="label border-b border-hair pb-4">
              Items
            </h2>
            <OrderItems order={order} />
          </section>

          <aside className="space-y-8">
            <div className="border border-hair bg-sand/60 p-6 md:p-8">
              <p className="label">Summary</p>
              <dl className="mt-5 space-y-2 text-[0.88rem]">
                <Row label="Subtotal" value={formatPaise(order.subtotal)} />
                {!!order.discount && <Row label={`Coupon${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`−${formatPaise(order.discount)}`} accent />}
                <Row label="Shipping" value={order.shipping ? formatPaise(order.shipping) : "Complimentary"} />
                <div className="flex justify-between border-t border-hair pt-4 text-[1.05rem]">
                  <dt>Total</dt>
                  <dd className="font-medium tabular">{formatPaise(order.total)}</dd>
                </div>
              </dl>
              <dl className="mt-6 space-y-2 border-t border-hair pt-5 text-[0.82rem]">
                <Row label="Placed" value={formatDateTime(order.createdAt)} />
                <Row label="Payment" value={PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod} />
                {order.paymentStatus && <Row label="Payment status" value={PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus} />}
                {order.paidAt && <Row label="Paid" value={formatDateTime(order.paidAt)} />}
              </dl>
              {invoiceAvailable(order.status) && <InvoiceButton orderId={order.orderId} />}
            </div>

            <div>
              <p className="label border-b border-hair pb-4">Delivery address</p>
              {address ? (
                <AddressLines address={address} className="mt-4 text-[0.88rem]" />
              ) : (
                <p className="mt-4 text-[0.85rem] text-ink-muted">{order.addressId ? "Loading address…" : "No address on this order."}</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-6", accent && "text-gold-deep")}>
      <dt className={accent ? undefined : "text-ink-muted"}>{label}</dt>
      <dd className="text-right tabular">{value}</dd>
    </div>
  );
}

function Progress({ status }: { status: OrderStatus }) {
  return (
    <ol className="mt-10 grid grid-cols-4 gap-2" aria-label="Order progress">
      {STEPS.map((s) => {
        const done = s.reached.includes(status);
        return (
          <li key={s.label} className="min-w-0">
            <span className={cn("block h-px w-full", done ? "bg-espresso" : "bg-espresso/15")} />
            <span className={cn("mt-3 flex items-center gap-1.5 text-[0.62rem] font-medium uppercase tracking-[0.18em]", done ? "text-ink" : "text-ink-faint")}>
              {done && <Check aria-hidden className="h-3 w-3 shrink-0" strokeWidth={1.6} />}
              <span className="truncate">{s.label}</span>
              <span className="sr-only">{done ? " (done)" : " (not yet)"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function OrderItems({ order }: { order: OrderDTO }) {
  const catalog = useCatalog();
  return (
    <ul className="divide-y divide-hair">
      {order.orderItems.map((i) => {
        const p = i.productId ? catalog.find((x) => x.productId === i.productId) : undefined;
        const contents = boxContents(i);
        const firstInBox = i.components?.[0]?.productId ? catalog.find((x) => x.productId === i.components?.[0]?.productId) : undefined;
        const photo = (
          <div className="relative h-24 w-[4.8rem] shrink-0 overflow-hidden bg-sand">
            <ProductPhoto src={(p ?? firstInBox)?.images[0]?.src} alt={i.productName} sizes="80px" compact />
          </div>
        );
        return (
          <li key={i.orderItemId} className="flex gap-4 py-5">
            {p ? (
              <Link href={`/products/${p.slug}`} aria-label={i.productName} tabIndex={-1}>
                {photo}
              </Link>
            ) : (
              photo
            )}
            <div className="min-w-0 flex-1">
              {p ? (
                <Link href={`/products/${p.slug}`} className="font-display text-[1.15rem] uppercase leading-tight hover:underline">
                  {i.productName}
                </Link>
              ) : (
                <p className="font-display text-[1.15rem] uppercase leading-tight">{i.productName}</p>
              )}
              <p className="mt-1 text-[0.78rem] text-ink-muted">
                {i.quantity} × <span className="tabular">{formatPaise(i.unitPrice)}</span>
                {i.mrp && i.mrp > i.unitPrice ? (
                  <>
                    {" "}
                    <s className="tabular text-ink-faint">{formatPaise(i.mrp)}</s>
                  </>
                ) : null}
              </p>
              {contents && <p className="mt-1 text-[0.75rem] text-ink-muted">Contains {contents}</p>}
            </div>
            <p className="text-[0.9rem] tabular">{formatPaise(i.lineTotal)}</p>
          </li>
        );
      })}
    </ul>
  );
}

function InvoiceButton({ orderId }: { orderId: number }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const download = async () => {
    setPending(true);
    setError(null);
    try {
      await orderApi.downloadInvoice(orderId);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="mt-6">
      <Button type="button" variant="outline" size="sm" onClick={download} disabled={pending} aria-busy={pending} className="w-full">
        <Download aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} /> {pending ? "Preparing invoice" : "Download invoice (PDF)"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-[0.78rem] text-[#9b3b2a]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Lets the customer finish paying an order created on this device; otherwise explains what happens next. */
function PendingPaymentPanel({ order, phone, onPaid }: { order: OrderDTO; phone?: string; onPaid: () => void }) {
  const user = useAuth((s) => s.user);
  const pending = readPending();
  const resumable = pending?.orderId === order.orderId;
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PayResult | null>(null);

  const pay = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setResult(null);
    const r = await completePayment(pending, { name: user?.username, email: user?.email, contact: phone });
    setBusy(false);
    if (r.kind === "paid") {
      clearPending();
      void useCart.getState().load(); // the server removed exactly the ordered lines
      onPaid();
      return;
    }
    if (r.kind === "closed") clearPending();
    setResult(r);
    if (r.kind !== "dismissed" && r.kind !== "error") onPaid();
  };

  return (
    <div className="mt-10 border border-gold/60 bg-sand/60 p-6 md:p-8">
      <p className="label text-gold-deep">Payment pending</p>
      <p className="mt-3 max-w-prose text-[0.9rem] text-ink-muted">
        {resumable
          ? `This order is reserved for you, but it hasn't been paid yet. Unpaid orders are cancelled automatically ${PAYMENT_WINDOW_MINUTES} minutes after they're placed.`
          : `This order hasn't been paid yet. If you've just paid, it will update shortly. Unpaid orders are cancelled automatically after ${PAYMENT_WINDOW_MINUTES} minutes, and nothing is charged.`}
      </p>
      {result && result.kind !== "paid" && (
        <p role="alert" className="mt-4 text-[0.85rem] text-[#9b3b2a]">
          {result.message}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {resumable && (
          <Button type="button" onClick={pay} disabled={busy} aria-busy={busy}>
            <Lock aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} /> {busy ? "Waiting for payment" : `Complete payment · ${formatPaise(order.total)}`}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onPaid} disabled={busy}>
          Refresh status
        </Button>
      </div>
    </div>
  );
}
