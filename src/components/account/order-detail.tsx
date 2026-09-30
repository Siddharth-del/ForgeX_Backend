"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { useAddresses, useOrder } from "@/hooks/use-account";
import { usePayOnline } from "@/hooks/use-payment";
import { downloadFile, errorMessage } from "@/lib/api/client";
import { ordersApi } from "@/lib/api/endpoints";
import { parsePendingPayment, readPendingPaymentRaw } from "@/lib/pending-payment";
import { PAYMENT_STATUS, STORE_RULES } from "@/lib/constants";
import { formatDate, formatPaise } from "@/lib/utils";
import { Button, ButtonLink } from "../ui/button";
import { Skeleton } from "../ui/misc";
import { Spinner } from "../ui/spinner";
import { ErrorState } from "../states/states";
import { AddressLines } from "./address-form";
import { OrderStatusBadge, OrderTracker } from "./order-status";

const INVOICE_OK = new Set(["PAID", "CONFIRMED", "SHIPPED", "DELIVERED", "REFUNDED"]);
const noop = () => () => {};

export function OrderDetail({ id }: { id: number }) {
  const params = useSearchParams();
  const { data: order, isPending, isError, error, refetch } = useOrder(id);
  const addresses = useAddresses();
  const pay = usePayOnline();
  const [downloading, setDownloading] = useState(false);
  // sessionStorage is client-only; read it without a hydration mismatch
  const rawPending = useSyncExternalStore(noop, () => readPendingPaymentRaw(id), () => null);
  const resumable = useMemo(
    () =>
      order?.status === "PENDING_PAYMENT" ? parsePendingPayment(id, rawPending, STORE_RULES.paymentWindowMinutes) : null,
    [order?.status, id, rawPending],
  );

  if (!Number.isFinite(id)) return <ErrorState message="That order link isn't valid." />;
  if (isPending)
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  const address = addresses.data?.find((a) => a.addressId === order.addressId);
  const placed = params.get("placed");

  const invoice = async () => {
    setDownloading(true);
    try {
      await downloadFile(ordersApi.invoicePath(order.orderId), `ForgeX-invoice-${order.orderId}.pdf`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <Link href="/account" className="eyebrow inline-flex items-center gap-2 text-stone hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> All orders
      </Link>

      {placed && order.status !== "PENDING_PAYMENT" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-ink p-8 text-bone sm:p-10"
          role="status"
        >
          <p className="eyebrow text-smoke">Thank you</p>
          <p className="display mt-3 text-4xl sm:text-5xl">Your order is confirmed.</p>
          <p className="mt-3 max-w-lg text-[15px] text-bone/70">
            We&apos;ve received order {order.orderNumber}. You can follow its progress right here.
          </p>
        </motion.div>
      )}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-stone">Order</p>
          <h2 className="display mt-2 text-4xl sm:text-5xl">{order.orderNumber}</h2>
          <p className="mt-2 text-[15px] text-stone">Placed {formatDate(order.createdAt, true)}</p>
        </div>
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          {INVOICE_OK.has(order.status) && (
            <Button variant="outline" size="sm" onClick={invoice} loading={downloading}>
              <Download className="h-3.5 w-3.5" /> Invoice
            </Button>
          )}
        </div>
      </div>

      {order.status === "PENDING_PAYMENT" && (
        <div className="mt-8 border-l-2 border-warn bg-warn/5 p-6" role="status">
          <p className="flex items-center gap-2 font-medium text-warn">
            <Spinner className="h-3.5 w-3.5" /> Waiting for payment confirmation
          </p>
          <p className="mt-2 max-w-xl text-[15px] text-stone">
            If you&apos;ve paid, this page updates automatically once the payment is confirmed. Unpaid orders are cancelled
            {" "}{STORE_RULES.paymentWindowMinutes} minutes after they&apos;re placed and nothing is charged.
          </p>
          {resumable && (
            <Button
              className="mt-5"
              loading={pay.isPending}
              onClick={() =>
                pay.mutate({ order: resumable, contact: address?.phoneNumber }, { onSettled: () => refetch() })
              }
            >
              Complete payment — {formatPaise(order.total)}
            </Button>
          )}
        </div>
      )}

      <div className="mt-10">
        <OrderTracker status={order.status} />
      </div>

      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-12">
        <section aria-label="Items" className="lg:col-span-7">
          <ul className="divide-y divide-line border-y border-line">
            {order.orderItems.map((i) => (
              <li key={i.orderItemId} className="flex items-baseline justify-between gap-4 py-5">
                <div>
                  <p className="display text-2xl">{i.productName}</p>
                  <p className="mt-1 text-[13px] text-stone">
                    {i.quantity} × {formatPaise(i.unitPrice)}
                    {i.mrp && i.mrp > i.unitPrice ? (
                      <>
                        {" "}
                        · MRP <s>{formatPaise(i.mrp)}</s>
                      </>
                    ) : null}
                  </p>
                </div>
                <p className="tabular-nums">{formatPaise(i.lineTotal)}</p>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-8 lg:col-span-5">
          <div className="bg-bone p-6 sm:p-8">
            <dl className="space-y-3 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-stone">Subtotal</dt>
                <dd className="tabular-nums">{formatPaise(order.subtotal)}</dd>
              </div>
              {!!order.discount && order.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-stone">Coupon {order.couponCode}</dt>
                  <dd className="tabular-nums text-ok">−{formatPaise(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-stone">Shipping</dt>
                <dd className="tabular-nums">{order.shipping ? formatPaise(order.shipping) : "Free"}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-4">
                <dt className="eyebrow">Total</dt>
                <dd className="text-2xl font-medium tabular-nums">{formatPaise(order.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div>
              <h3 className="eyebrow text-stone">Payment</h3>
              <p className="mt-3 text-[15px]">{order.paymentMethod === "COD" ? "Cash on delivery" : "Online (Razorpay)"}</p>
              <p className="text-[13px] text-stone">
                {order.paymentStatus ? PAYMENT_STATUS[order.paymentStatus] : "—"}
                {order.paidAt ? ` · ${formatDate(order.paidAt, true)}` : ""}
              </p>
            </div>
            <div>
              <h3 className="eyebrow text-stone">Delivering to</h3>
              <div className="mt-3 text-[15px]">
                {address ? <AddressLines a={address} /> : <p className="text-stone">Address on file</p>}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-16">
        <ButtonLink href="/shop" variant="outline" arrow>
          Continue shopping
        </ButtonLink>
      </div>
    </div>
  );
}
