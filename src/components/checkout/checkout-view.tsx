"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Check, CreditCard, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-cart";
import { useAddresses } from "@/hooks/use-account";
import { usePayOnline } from "@/hooks/use-payment";
import { useStickyBar } from "@/hooks/use-sticky-bar";
import { useMounted } from "@/hooks/use-mounted";
import { qk } from "@/hooks/use-auth";
import { checkoutApi } from "@/lib/api/endpoints";
import { errorMessage } from "@/lib/api/client";
import { savePendingPayment } from "@/lib/pending-payment";
import { STORE_RULES } from "@/lib/constants";
import type { Address, PaymentMethod } from "@/lib/types";
import { cn, formatPaise } from "@/lib/utils";
import { AddressForm, AddressLines } from "../account/address-form";
import { Button, ButtonLink } from "../ui/button";
import { FormError } from "../ui/field";
import { Skeleton } from "../ui/misc";
import { EmptyState, ErrorState } from "../states/states";
import { ProductImage } from "../product/product-image";
import { Totals } from "./order-summary";

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-baseline gap-4">
      <span className="display text-3xl text-ember">0{n}</span>
      <span className="text-xl font-medium">{children}</span>
    </h2>
  );
}

const METHODS: { value: PaymentMethod; title: string; body: string; icon: React.ReactNode }[] = [
  {
    value: "RAZORPAY",
    title: "Pay online",
    body: "UPI, cards, net banking or wallets — secured by Razorpay.",
    icon: <CreditCard className="h-5 w-5" strokeWidth={1.25} />,
  },
  {
    value: "COD",
    title: "Cash on delivery",
    body: "Pay in cash when your order arrives.",
    icon: <Banknote className="h-5 w-5" strokeWidth={1.25} />,
  },
];

export function CheckoutView() {
  const router = useRouter();
  const qc = useQueryClient();
  const { cart, isPending: cartLoading, isError: cartError, error: cartErr, refetch } = useCart();
  const addresses = useAddresses();
  const [chosenAddressId, setAddressId] = useState<number | null>(null);
  const [addingNew, setAdding] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("RAZORPAY");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const payOnline = usePayOnline();
  const [payButton, setPayButton] = useState<HTMLDivElement | null>(null);
  const showPayBar = useStickyBar(payButton);
  const mounted = useMounted();

  const list = addresses.data ?? [];
  // Default to the most recently added address; show the form straight away if there are none
  const addressId = chosenAddressId ?? list.at(-1)?.addressId ?? null;
  const adding = addingNew || (!addresses.isPending && list.length === 0);

  const items = cart?.products ?? [];
  const preview = useQuery({
    queryKey: qk.preview(coupon),
    queryFn: () => checkoutApi.preview(coupon || undefined),
    enabled: items.length > 0,
    placeholderData: (prev) => prev,
  });
  const couponRejected = !!coupon && !!preview.data && !preview.data.couponCode;

  const place = useMutation({
    mutationFn: () =>
      checkoutApi.place({ addressId: addressId!, paymentMethod: method, couponCode: preview.data?.couponCode ?? undefined }),
    onSuccess: async (res) => {
      qc.invalidateQueries({ queryKey: qk.orders });
      if (res.status !== "PENDING_PAYMENT") {
        qc.invalidateQueries({ queryKey: qk.cart });
        router.replace(`/account/orders/${res.orderId}?placed=1`);
        return;
      }
      savePendingPayment(res);
      const phone = list.find((a) => a.addressId === addressId)?.phoneNumber;
      // The order now exists server-side, so whatever happens next the shopper lands on it
      // (and can resume payment there) instead of placing a duplicate from this page.
      const outcome = await payOnline
        .mutateAsync({ order: res, contact: phone })
        .catch(() => ({ kind: "failed" as const, reason: "" }));
      if (outcome.kind === "dismissed") {
        toast("Payment not completed", {
          description: `Your items are held for ${STORE_RULES.paymentWindowMinutes} minutes — you can finish paying from the order page.`,
        });
      }
      router.replace(`/account/orders/${res.orderId}${outcome.kind === "paid" ? "?placed=1" : ""}`);
    },
  });

  if (cartLoading || addresses.isPending) {
    return (
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <Skeleton className="h-96 lg:col-span-7" />
        <Skeleton className="h-96 lg:col-span-5" />
      </div>
    );
  }
  if (cartError) return <ErrorState message={errorMessage(cartErr)} onRetry={() => refetch()} />;
  if (items.length === 0 && !place.isSuccess) {
    return (
      <EmptyState
        title="Your bag is empty"
        body="Add a fragrance to check out."
        action={<ButtonLink href="/shop" arrow>Browse fragrances</ButtonLink>}
      />
    );
  }

  const busy = place.isPending || payOnline.isPending;
  const payLabel = method === "COD" ? "Place order" : `Pay ${preview.data ? formatPaise(preview.data.total) : ""}`;
  const canPlace = addressId != null && !adding && !!preview.data && !couponRejected && !busy;

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="space-y-14 lg:col-span-7">
        {/* 1. Address */}
        <section aria-labelledby="addr-title">
          <div id="addr-title">
            <StepTitle n={1}>Delivery address</StepTitle>
          </div>
          {addresses.isError && <p className="mt-4 text-sm text-ember">{errorMessage(addresses.error)}</p>}
          {list.length > 0 && (
            <div role="radiogroup" aria-label="Saved addresses" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {list.map((a: Address) => {
                const selected = a.addressId === addressId && !adding;
                return (
                  <button
                    key={a.addressId}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setAddressId(a.addressId ?? null);
                      setAdding(false);
                    }}
                    className={cn(
                      "relative rounded-xs border p-5 text-left text-[15px] transition-colors",
                      selected ? "border-ink bg-white" : "border-line hover:border-stone",
                    )}
                  >
                    {selected && (
                      <span className="absolute right-4 top-4 inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink text-bone">
                        <Check className="h-3 w-3" strokeWidth={2} />
                      </span>
                    )}
                    <AddressLines a={a} />
                  </button>
                );
              })}
            </div>
          )}
          {adding ? (
            <div className="mt-6 border border-line bg-white/60 p-5 sm:p-7">
              <p className="eyebrow mb-6 text-stone">New address</p>
              <AddressForm
                submitLabel="Use this address"
                onSaved={(a) => {
                  setAddressId(a.addressId ?? null);
                  setAdding(false);
                }}
                onCancel={list.length ? () => setAdding(false) : undefined}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-4 inline-flex items-center gap-2 text-sm underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} /> Add a new address
            </button>
          )}
        </section>

        {/* 2. Payment */}
        <section aria-labelledby="pay-title">
          <div id="pay-title">
            <StepTitle n={2}>Payment</StepTitle>
          </div>
          <div role="radiogroup" aria-label="Payment method" className="mt-6 grid grid-cols-1 gap-3">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={method === m.value}
                onClick={() => setMethod(m.value)}
                className={cn(
                  "flex items-start gap-4 rounded-xs border p-5 text-left transition-colors",
                  method === m.value ? "border-ink bg-white" : "border-line hover:border-stone",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    method === m.value ? "border-ink" : "border-stone/50",
                  )}
                >
                  {method === m.value && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
                </span>
                <span className="flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    {m.icon}
                    {m.title}
                  </span>
                  <span className="mt-1 block text-sm text-stone">{m.body}</span>
                </span>
              </button>
            ))}
          </div>
          {method === "RAZORPAY" && (
            <p className="mt-4 text-[13px] text-stone">
              Your items are reserved for {STORE_RULES.paymentWindowMinutes} minutes while you pay. Unpaid orders are cancelled
              automatically.
            </p>
          )}
        </section>
      </div>

      {/* 3. Summary */}
      <aside className="lg:col-span-5">
        <div className="bg-bone p-6 sm:p-8 lg:sticky lg:top-28">
          <StepTitle n={3}>Review</StepTitle>
          <ul className="mt-4 max-h-72 space-y-4 overflow-y-auto pr-3 pt-3">
            {items.map((p) => (
              <li key={p.productId} className="flex items-center gap-4">
                <div className="relative">
                  <ProductImage product={p} sizes="64px" className="aspect-[4/5] w-14" />
                  <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10px] text-bone">
                    {p.quantity}
                  </span>
                </div>
                <span className="flex-1 truncate text-[15px]">{p.name}</span>
                <span className="text-[15px] tabular-nums">{formatPaise(p.price * (p.quantity ?? 1))}</span>
              </li>
            ))}
          </ul>

          <form
            className="mt-6 flex gap-2 border-t border-line pt-6"
            onSubmit={(e) => {
              e.preventDefault();
              setCoupon(couponInput.trim().toUpperCase());
            }}
          >
            <label htmlFor="coupon" className="sr-only">
              Coupon code
            </label>
            <input
              id="coupon"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="Coupon code"
              autoComplete="off"
              className="h-11 min-w-0 flex-1 rounded-xs border border-line bg-white/70 px-4 text-base uppercase sm:text-sm tracking-wider placeholder:normal-case placeholder:tracking-normal focus:border-ink focus:outline-none"
            />
            {coupon && !couponRejected ? (
              <Button
                variant="outline"
                size="sm"
                className="h-11"
                onClick={() => {
                  setCoupon("");
                  setCouponInput("");
                }}
              >
                Remove
              </Button>
            ) : (
              <Button type="submit" variant="outline" size="sm" className="h-11" disabled={!couponInput.trim()} loading={preview.isFetching && !!couponInput}>
                Apply
              </Button>
            )}
          </form>
          {preview.data?.couponCode && <p className="mt-2 text-[13px] text-ok">{preview.data.couponCode} applied.</p>}
          {couponRejected && (
            <p className="mt-2 text-[13px] text-ember" role="alert">
              {preview.data?.couponMessage ?? "This coupon can't be applied."}
            </p>
          )}

          <div className="mt-6">
            {preview.isPending ? (
              <Skeleton className="h-40 w-full" />
            ) : preview.isError ? (
              <p className="text-sm text-ember">{errorMessage(preview.error)}</p>
            ) : (
              <Totals price={preview.data!} />
            )}
          </div>

          <div className="mt-6">
            <FormError message={place.isError ? errorMessage(place.error) : null} />
          </div>
          <div ref={setPayButton}>
            <Button size="lg" className="mt-4 w-full" disabled={!canPlace} loading={busy} onClick={() => place.mutate()}>
              {payLabel}
            </Button>
          </div>
          {!addressId && !adding && <p className="mt-3 text-center text-[13px] text-stone">Choose a delivery address to continue.</p>}
          {couponRejected && <p className="mt-3 text-center text-[13px] text-stone">Remove or fix the coupon to continue.</p>}
          <p className="mt-4 text-center text-[12px] text-stone">
            <Link href="/cart" className="inline-flex min-h-11 items-center underline underline-offset-4">
              Edit bag
            </Link>
          </p>
        </div>
      </aside>

      {/* Phones & tablets: the summary sits below the form, so keep the total and pay button in reach */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {showPayBar && preview.data && (
              <motion.div
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                exit={{ y: "110%" }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                role="region"
                aria-label="Order total"
                className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-5 pt-3 backdrop-blur-xl lg:hidden"
              >
                <div className="mx-auto flex max-w-2xl items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow text-stone">Total</p>
                    <p className="text-xl font-medium tabular-nums">{formatPaise(preview.data.total)}</p>
                  </div>
                  <Button className="shrink-0" disabled={!canPlace} loading={busy} onClick={() => place.mutate()}>
                    {method === "COD" ? "Place order" : "Pay now"}
                  </Button>
                </div>
                {!canPlace && !busy && (
                  <p className="mx-auto mt-1 max-w-2xl text-[12px] text-stone">
                    {adding ? "Save your address to continue." : couponRejected ? "Fix the coupon to continue." : "Choose an address to continue."}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
