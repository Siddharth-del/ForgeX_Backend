import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Lock } from "lucide-react";
import Link from "@/components/ui/Link";
import { AddressForm, AddressLines } from "@/components/account/Addresses";
import { ProductPhoto } from "@/components/products/ProductPhoto";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormStatus } from "@/components/ui/Field";
import { errorMessage } from "@/lib/errors";
import { Skeleton } from "@/components/ui/Skeleton";
import { addressApi, removeAddressError } from "@/lib/api/addresses";
import { ApiError } from "@/lib/api/client";
import { checkoutApi } from "@/lib/api/checkout";
import { orderApi } from "@/lib/api/orders";
import { rupees, type AddressDTO, type CartDTO, type PriceBreakdown } from "@/lib/api/types";
import { formatPrice } from "@/lib/format";
import { formatPaise } from "@/lib/orders";
import { completePayment, type PayResult } from "@/lib/payOrder";
import { bagSignature, clearPending, PAYMENT_WINDOW_MINUTES, readPending, savePending, type PendingPayment } from "@/lib/pendingPayment";
import { syncServerCart, type CartSyncResult } from "@/lib/serverCart";
import { site } from "@/lib/site";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/hooks/useHydrated";
import { cartSavings, cartSubtotal, useCart } from "@/store/cart";
import { useAuth } from "@/store/auth";
import type { AuthUser } from "@/lib/api/auth";
import type { CartLine } from "@/types";

type Method = "RAZORPAY" | "COD";

const METHODS: { id: Method; label: string; hint: string }[] = [
  { id: "RAZORPAY", label: "Pay online", hint: "UPI, cards, net banking and wallets, secured by Razorpay" },
  { id: "COD", label: "Cash on delivery", hint: "Pay when your order arrives" },
];

/**
 * Checkout against the ForgeX API:
 *  1. the bag is copied to the customer's server cart (the server prices the order, not this page);
 *  2. the customer picks or adds a delivery address and may apply a coupon (server-validated);
 *  3. POST /api/checkout creates the order and reserves stock;
 *  4. COD orders are confirmed straight away; online orders open Razorpay, and the result is only
 *     accepted once the server has verified the payment signature (see lib/payOrder.ts).
 */
export function CheckoutView() {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const user = useAuth((s) => s.user);

  if (!hydrated)
    return (
      <div className="container-site grid grid-cols-1 gap-10 py-14 lg:grid-cols-2">
        <Skeleton className="h-[30rem]" />
        <Skeleton className="h-[20rem]" />
      </div>
    );

  if (!lines.length)
    return (
      <div className="container-site py-section">
        <EmptyState title="Your bag is empty" body="Add a fragrance to continue to checkout." action={<ButtonLink href="/collections/all" arrow>Shop the collection</ButtonLink>} />
      </div>
    );

  if (!user) return <SignInFirst lines={lines} />;
  return <SignedInCheckout key={user.email} user={user} lines={lines} />;
}

/* ------------------------------------------------------------------ signed out */

function SignInFirst({ lines }: { lines: CartLine[] }) {
  const subtotal = cartSubtotal(lines);
  return (
    <Layout
      summary={
        <Summary lines={lines}>
          <Totals subtotal={subtotal} savings={cartSavings(lines)} estimate />
        </Summary>
      }
    >
      <h1 className="text-display-sm uppercase">Checkout</h1>
      <div className="mt-10 border border-hair bg-sand/60 p-7 md:p-9">
        <p className="label">Sign in to continue</p>
        <p className="mt-4 max-w-prose text-[0.92rem] text-ink-muted">
          Orders are placed from your {site.name} account, so you can follow delivery, download invoices and reorder later. Your bag is saved and will be waiting.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/account?next=/checkout" size="lg" arrow className="sm:flex-1">
            Sign in
          </ButtonLink>
          <ButtonLink href="/account?mode=signup&next=/checkout" variant="outline" size="lg" className="sm:flex-1">
            Create account
          </ButtonLink>
        </div>
      </div>
    </Layout>
  );
}

/* ------------------------------------------------------------------ signed in */

type Sync = { state: "syncing" } | { state: "ready"; cart: CartDTO; issues: CartSyncResult["issues"] } | { state: "error"; message: string };

function SignedInCheckout({ user, lines }: { user: AuthUser; lines: CartLine[] }) {
  const navigate = useNavigate();
  const signature = bagSignature(lines);

  /* server cart + price */
  const [sync, setSync] = useState<Sync>({ state: "syncing" });
  const [price, setPrice] = useState<PriceBreakdown | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [syncAttempt, setSyncAttempt] = useState(0);
  const couponRef = useRef<string | null>(null);
  couponRef.current = coupon;

  /* addresses */
  const [addresses, setAddresses] = useState<AddressDTO[] | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressAttempt, setAddressAttempt] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [removeError, setRemoveError] = useState<{ id: number; message: string } | null>(null);

  /* placing */
  const [method, setMethod] = useState<Method>("RAZORPAY");
  const [phase, setPhase] = useState<"idle" | "placing" | "paying" | "verifying">("idle");
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [payResult, setPayResult] = useState<PayResult | null>(null);
  const busy = useRef(false);

  // Copy the bag to the server cart (debounced while quantities change), then ask the server for the price.
  useEffect(() => {
    let live = true;
    setSync({ state: "syncing" });
    const t = setTimeout(async () => {
      try {
        const res = await syncServerCart(useCart.getState().lines);
        if (!live) return;
        setSync({ state: "ready", cart: res.cart, issues: res.issues });
        try {
          const p = await checkoutApi.preview(couponRef.current ?? undefined);
          if (!live) return;
          setPrice(p);
          setPriceError(null);
          if (couponRef.current && !p.couponCode) {
            setCoupon(null);
            setCouponError(p.couponMessage || "This coupon no longer applies.");
          }
        } catch (e) {
          if (live) setPriceError(errorMessage(e));
        }
      } catch (e) {
        if (live) setSync({ state: "error", message: errorMessage(e) });
      }
    }, 450);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [signature, syncAttempt]);

  useEffect(() => {
    let live = true;
    setAddressError(null);
    addressApi
      .mine()
      .then((list) => {
        if (!live) return;
        setAddresses(list);
        setSelected((s) => (s && list.some((a) => a.addressId === s) ? s : (list[list.length - 1]?.addressId ?? null)));
        if (!list.length) setAdding(true);
      })
      .catch((e) => live && setAddressError(errorMessage(e)));
    return () => {
      live = false;
    };
  }, [addressAttempt]);

  const applyCoupon = async (e: FormEvent) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return setCouponError("Enter a coupon code.");
    if (sync.state !== "ready") return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      const p = await checkoutApi.preview(code);
      setPrice(p);
      if (p.couponCode) {
        setCoupon(p.couponCode);
        setCouponInput("");
      } else {
        setCouponError(p.couponMessage || "That coupon can't be used.");
      }
    } catch (err) {
      setCouponError(errorMessage(err));
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = async () => {
    setCoupon(null);
    setCouponError(null);
    try {
      setPrice(await checkoutApi.preview());
    } catch (e) {
      setPriceError(errorMessage(e));
    }
  };

  const removeAddress = async (id: number) => {
    setRemoveError(null);
    try {
      await addressApi.remove(id);
      setAddresses((l) => l?.filter((a) => a.addressId !== id) ?? l);
      if (selected === id) setSelected(null);
    } catch (e) {
      setRemoveError({ id, message: removeAddressError(e) });
    }
  };

  const address = addresses?.find((a) => a.addressId === selected) ?? null;
  const issues = sync.state === "ready" ? sync.issues : [];
  const ready = sync.state === "ready" && !issues.length && !!price && !!address && price.total > 0;

  /** Checkout identity: a stored unpaid order is reused only for the same bag, address and coupon. */
  const intent = `${signature}|a${selected ?? ""}|c${coupon ?? ""}`;

  const finishPaid = useCallback(
    (orderId: number) => {
      clearPending();
      useCart.getState().clear();
      navigate(`/account/orders/${orderId}?placed=1`, { replace: true });
    },
    [navigate],
  );

  const pay = async (p: PendingPayment) => {
    setPhase("paying");
    const r = await completePayment(p, { name: user.username, email: user.email, contact: address?.phoneNumber }, () => setPhase("verifying"));
    if (r.kind === "paid") return finishPaid(r.orderId);
    if (r.kind === "closed") clearPending();
    setPayResult(r);
    setPhase("idle");
  };

  const placeOrder = async () => {
    if (busy.current || !ready || !address) return;
    busy.current = true;
    setPlaceError(null);
    setPayResult(null);
    setPhase("placing");
    try {
      // Make sure the server cart still matches the bag the customer is looking at.
      const fresh = await syncServerCart(useCart.getState().lines);
      if (fresh.issues.length) {
        setSync({ state: "ready", cart: fresh.cart, issues: fresh.issues });
        setPhase("idle");
        return;
      }

      if (method === "RAZORPAY") {
        // Reuse an unpaid order for this exact checkout instead of reserving stock twice.
        const existing = readPending();
        if (existing && existing.bag === intent && existing.email === user.email) {
          const status = await orderApi
            .get(existing.orderId)
            .then((o) => o.status)
            .catch(() => null);
          if (status === "PAID") return finishPaid(existing.orderId);
          if (status === "PENDING_PAYMENT") return await pay(existing);
          clearPending();
        }
      }

      const res = await checkoutApi.place({ addressId: address.addressId, paymentMethod: method, couponCode: coupon ?? undefined });

      if (method === "COD") {
        clearPending();
        useCart.getState().clear();
        navigate(`/account/orders/${res.orderId}?placed=1`, { replace: true });
        return;
      }

      if (!res.razorpayOrderId || !res.razorpayKeyId || !res.amount) {
        setPlaceError(`Order #${res.orderId} was created, but online payment couldn't be started. It will be cancelled automatically if unpaid; please try again or choose cash on delivery.`);
        setPhase("idle");
        return;
      }
      const pending: PendingPayment = {
        orderId: res.orderId,
        razorpayOrderId: res.razorpayOrderId,
        keyId: res.razorpayKeyId,
        amount: res.amount,
        currency: res.currency || "INR",
        email: res.customerEmail || user.email,
        bag: intent,
        createdAt: Date.now(),
      };
      savePending(pending);
      await pay(pending);
    } catch (e) {
      setPlaceError(errorMessage(e));
      setPhase("idle");
      // Stock or availability may have changed: refresh the server cart and price.
      if (e instanceof ApiError && e.status === 400) setSyncAttempt((n) => n + 1);
    } finally {
      busy.current = false;
    }
  };

  const acceptAvailable = () => {
    if (sync.state !== "ready") return;
    const server = new Map(sync.cart.products.map((p) => [String(p.productId), p.quantity ?? 0]));
    const cart = useCart.getState();
    for (const l of cart.lines) {
      const q = server.get(l.productId) ?? 0;
      if (q <= 0) cart.remove(l.key);
      else if (q !== l.quantity) cart.setQuantity(l.key, q);
    }
  };

  const total = price ? formatPaise(price.total) : null;
  const working = phase !== "idle";
  const pendingHere = (() => {
    const p = readPending();
    return p && p.bag === intent && p.email === user.email ? p : null;
  })();

  return (
    <Layout
      summary={
        <Summary lines={lines} cart={sync.state === "ready" ? sync.cart : undefined}>
          {price ? (
            <ServerTotals price={price} onRemoveCoupon={coupon ? removeCoupon : undefined} />
          ) : priceError ? (
            <p role="alert" className="mt-5 text-[0.82rem] text-[#9b3b2a]">
              {priceError}
            </p>
          ) : (
            <div className="mt-5 space-y-3 border-t border-hair pt-5" aria-busy="true" aria-label="Calculating total">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-6 w-full" />
            </div>
          )}
          <form onSubmit={applyCoupon} noValidate className="mt-6 border-t border-hair pt-5" aria-label="Coupon">
            <label htmlFor="co-coupon" className="label mb-2 block text-[0.62rem] text-ink-muted">
              Coupon code
            </label>
            <div className="flex gap-2">
              <input
                id="co-coupon"
                value={couponInput}
                onChange={(e) => {
                  setCouponInput(e.target.value.toUpperCase());
                  if (couponError) setCouponError(null);
                }}
                autoComplete="off"
                spellCheck={false}
                maxLength={40}
                aria-invalid={!!couponError}
                aria-describedby={couponError ? "co-coupon-err" : undefined}
                placeholder={coupon ? `${coupon} applied` : ""}
                className={cn("h-11 min-w-0 flex-1 border bg-ivory px-4 text-[0.88rem] uppercase tracking-[0.12em] outline-none focus:border-espresso", couponError ? "border-[#9b3b2a]" : "border-espresso/20")}
              />
              <Button type="submit" variant="outline" size="sm" className="h-11" disabled={couponBusy || sync.state !== "ready"} aria-busy={couponBusy}>
                {couponBusy ? "Checking" : "Apply"}
              </Button>
            </div>
            {couponError && (
              <p id="co-coupon-err" role="alert" className="mt-2 text-[0.75rem] text-[#9b3b2a]">
                {couponError}
              </p>
            )}
          </form>
        </Summary>
      }
    >
      <h1 className="text-display-sm uppercase">Checkout</h1>
      <p className="mt-3 text-[0.85rem] text-ink-muted">Signed in as {user.email}</p>

      {sync.state === "error" && (
        <Notice tone="error" title="We couldn't prepare your order">
          <p>{sync.message}</p>
          <button type="button" onClick={() => setSyncAttempt((n) => n + 1)} className="label mt-3 underline underline-offset-4">
            Try again
          </button>
        </Notice>
      )}
      {!!issues.length && (
        <Notice tone="error" title="Some items need your attention">
          <ul className="space-y-1">
            {issues.map((i) => (
              <li key={i.productId}>{i.message}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <button type="button" onClick={acceptAvailable} className="label underline underline-offset-4">
              Use available quantities
            </button>
            <button type="button" onClick={() => setSyncAttempt((n) => n + 1)} className="label underline underline-offset-4">
              Check again
            </button>
          </div>
        </Notice>
      )}

      {/* ---------------------------------------------------------- address */}
      <fieldset className="mt-10" disabled={working}>
        <legend className="label mb-5">Delivery address</legend>
        {addressError && (
          <Notice tone="error">
            <p>{addressError}</p>
            <button type="button" onClick={() => setAddressAttempt((n) => n + 1)} className="label mt-3 underline underline-offset-4">
              Try again
            </button>
          </Notice>
        )}
        {!addresses && !addressError && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        )}
        {!!addresses?.length && (
          <div role="radiogroup" aria-label="Saved addresses" className="grid gap-3 sm:grid-cols-2">
            {addresses.map((a) => (
              <div key={a.addressId} className={cn("relative border p-5 text-[0.86rem] transition-colors", selected === a.addressId ? "border-espresso bg-sand/50" : "border-espresso/20")}>
                <label className="flex cursor-pointer gap-3">
                  <input type="radio" name="address" checked={selected === a.addressId} onChange={() => setSelected(a.addressId)} className="mt-1 accent-espresso" />
                  <AddressLines address={a} />
                </label>
                <button type="button" onClick={() => removeAddress(a.addressId)} className="label absolute right-4 top-4 text-[0.58rem] text-ink-faint hover:text-ink" aria-label="Remove this address">
                  Remove
                </button>
                {removeError?.id === a.addressId && <p className="mt-3 text-[0.75rem] text-[#9b3b2a]">{removeError.message}</p>}
              </div>
            ))}
          </div>
        )}
        {addresses && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="label link-underline mt-5 pb-1">
            + Add a new address
          </button>
        )}
        {addresses && adding && (
          <div className="mt-5 border border-hair bg-sand/40 p-5 md:p-7">
            <p className="label mb-6">{addresses.length ? "New address" : "Where should we deliver?"}</p>
            <AddressForm
              submitLabel="Save and use this address"
              onSaved={(a) => {
                setAddresses((l) => [...(l ?? []), a]);
                setSelected(a.addressId);
                setAdding(false);
              }}
              onCancel={addresses.length ? () => setAdding(false) : undefined}
            />
          </div>
        )}
      </fieldset>

      {/* ---------------------------------------------------------- payment */}
      <fieldset className="mt-10" disabled={working}>
        <legend className="label mb-5">Payment</legend>
        <div className="grid gap-2">
          {METHODS.map((m) => (
            <label key={m.id} className={cn("flex cursor-pointer items-center gap-4 border px-4 py-4 transition-colors", method === m.id ? "border-espresso" : "border-espresso/20")}>
              <input type="radio" name="payment" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="accent-espresso" />
              <span className="flex-1">
                <span className="block text-[0.9rem]">{m.label}</span>
                <span className="text-[0.75rem] text-ink-muted">{m.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {payResult && payResult.kind !== "paid" && (
        <PaymentNotice result={payResult} canRetry={payResult.kind === "dismissed" || payResult.kind === "error"} onRetry={placeOrder} working={working} />
      )}

      <Button type="button" size="lg" className="mt-10 w-full" onClick={placeOrder} disabled={!ready || working} aria-busy={working}>
        <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
        {phase === "placing"
          ? "Placing order"
          : phase === "paying"
            ? "Waiting for payment"
            : phase === "verifying"
              ? "Confirming payment"
              : method === "COD"
                ? `Place order${total ? ` · ${total}` : ""}`
                : `${pendingHere ? "Resume payment" : "Pay securely"}${total ? ` · ${total}` : ""}`}
      </Button>
      <FormStatus error={placeError} pending={phase === "placing"} className="mt-4" />
      {!ready && !working && sync.state === "ready" && !issues.length && (
        <p className="mt-3 text-[0.78rem] text-ink-faint">{!address ? "Choose or add a delivery address to continue." : !price ? "Calculating your total…" : null}</p>
      )}
      <p className="mt-4 text-[0.75rem] leading-relaxed text-ink-faint">
        {method === "RAZORPAY"
          ? `Payment opens in Razorpay's secure window. Your order is reserved for ${PAYMENT_WINDOW_MINUTES} minutes while you pay, and it's confirmed only after our server verifies the payment.`
          : "You'll pay the courier when your order arrives."}
      </p>
    </Layout>
  );
}

/* ------------------------------------------------------------------ pieces */

function PaymentNotice({ result, canRetry, onRetry, working }: { result: Exclude<PayResult, { kind: "paid" }>; canRetry: boolean; onRetry: () => void; working: boolean }) {
  const title =
    result.kind === "dismissed" ? "Payment not completed" : result.kind === "unverified" ? "Payment not confirmed yet" : result.kind === "closed" ? "Order closed" : "Couldn't open payment";
  return (
    <Notice tone={result.kind === "dismissed" ? "info" : "error"} title={title}>
      <p>{result.message}</p>
      {result.kind === "dismissed" && <p className="mt-2">Your order #{result.orderId} is reserved for {PAYMENT_WINDOW_MINUTES} minutes. Nothing has been charged.</p>}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {canRetry && (
          <button type="button" onClick={onRetry} disabled={working} className="label underline underline-offset-4">
            Try payment again
          </button>
        )}
        <Link href={`/account/orders/${result.orderId}`} className="label underline underline-offset-4">
          View order #{result.orderId}
        </Link>
      </div>
    </Notice>
  );
}

function Notice({ tone, title, children }: { tone: "info" | "error"; title?: string; children: React.ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("mt-8 border-l-2 bg-sand/50 px-5 py-4 text-[0.86rem]", tone === "error" ? "border-[#9b3b2a]" : "border-gold")}>
      {title && <p className={cn("label mb-2", tone === "error" && "text-[#9b3b2a]")}>{title}</p>}
      <div className="text-ink-muted">{children}</div>
    </div>
  );
}

function Layout({ children, summary }: { children: React.ReactNode; summary: React.ReactNode }) {
  return (
    <div className="bg-ivory">
      <div className="container-site grid grid-cols-1 gap-12 py-12 md:py-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-20">
        <div className="order-2 lg:order-1">{children}</div>
        <aside aria-label="Order summary" className="order-1 lg:order-2">
          <div className="border border-hair bg-sand/60 p-6 md:p-8 lg:sticky lg:top-28">{summary}</div>
        </aside>
      </div>
    </div>
  );
}

/** Bag lines; with a server cart, quantities and prices are the server's. */
function Summary({ lines, cart, children }: { lines: CartLine[]; cart?: CartDTO; children: React.ReactNode }) {
  const server = useMemo(() => new Map(cart?.products.map((p) => [String(p.productId), p]) ?? []), [cart]);
  return (
    <>
      <p className="label">Order summary</p>
      <ul className="mt-6 divide-y divide-[rgba(50,24,14,0.12)]">
        {lines.map((l) => {
          const sp = server.get(l.productId);
          const qty = sp?.quantity ?? l.quantity;
          const unit = sp?.price != null ? rupees(sp.price) : l.price;
          return (
            <li key={l.key} className="flex gap-4 py-4">
              <div className="relative h-20 w-16 shrink-0 bg-sand">
                <ProductPhoto src={l.image} alt={l.name} sizes="64px" compact />
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-espresso px-1 text-[0.62rem] text-ivory tabular">{qty}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[1.1rem] uppercase leading-tight">{l.name}</p>
                {l.size && <p className="text-[0.75rem] text-ink-muted">{l.size}</p>}
              </div>
              <p className="text-[0.88rem] tabular">{formatPrice(unit * qty)}</p>
            </li>
          );
        })}
      </ul>
      {children}
      <Link href="/collections/all" className="label mt-6 inline-block underline-offset-4 hover:underline">
        Continue shopping
      </Link>
    </>
  );
}

/** Local estimate, shown before sign-in (the server's price replaces it at checkout). */
function Totals({ subtotal, savings, estimate }: { subtotal: number; savings: number; estimate?: boolean }) {
  const shipping = subtotal >= site.freeShippingThreshold ? 0 : site.shippingFee;
  return (
    <dl className="mt-4 space-y-2 border-t border-hair pt-5 text-[0.88rem]">
      <div className="flex justify-between">
        <dt className="text-ink-muted">Subtotal</dt>
        <dd className="tabular">{formatPrice(subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-muted">Shipping</dt>
        <dd className="tabular">{shipping ? formatPrice(shipping) : "Complimentary"}</dd>
      </div>
      {savings > 0 && (
        <div className="flex justify-between text-gold-deep">
          <dt>You save</dt>
          <dd className="tabular">{formatPrice(savings)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-hair pt-4 text-[1.05rem]">
        <dt>{estimate ? "Estimated total" : "Total"}</dt>
        <dd className="font-medium tabular">{formatPrice(subtotal + shipping)}</dd>
      </div>
      {estimate && <p className="pt-1 text-[0.72rem] text-ink-faint">Final price, coupons and shipping are confirmed at checkout. Inclusive of GST.</p>}
    </dl>
  );
}

/** The server's price for this order (GET /api/checkout/preview). */
function ServerTotals({ price, onRemoveCoupon }: { price: PriceBreakdown; onRemoveCoupon?: () => void }) {
  return (
    <>
      <dl className="mt-4 space-y-2 border-t border-hair pt-5 text-[0.88rem]">
        <div className="flex justify-between">
          <dt className="text-ink-muted">Subtotal</dt>
          <dd className="tabular">{formatPaise(price.subtotal)}</dd>
        </div>
        {price.productSavings > 0 && (
          <div className="flex justify-between text-gold-deep">
            <dt>You save on MRP</dt>
            <dd className="tabular">{formatPaise(price.productSavings)}</dd>
          </div>
        )}
        {price.couponCode && (
          <div className="flex items-baseline justify-between gap-4 text-gold-deep">
            <dt>
              Coupon {price.couponCode}
              {onRemoveCoupon && (
                <button type="button" onClick={onRemoveCoupon} className="ml-3 text-[0.72rem] text-ink-muted underline underline-offset-2 hover:text-ink">
                  Remove
                </button>
              )}
            </dt>
            <dd className="tabular">−{formatPaise(price.couponDiscount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-ink-muted">Shipping</dt>
          <dd className="tabular">{price.shipping ? formatPaise(price.shipping) : "Complimentary"}</dd>
        </div>
        <div className="flex justify-between border-t border-hair pt-4 text-[1.05rem]">
          <dt>Total</dt>
          <dd className="font-medium tabular">{formatPaise(price.total)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[0.72rem] text-ink-faint">
        Inclusive of GST.{price.shipping > 0 ? ` Complimentary shipping on orders above ${formatPrice(site.freeShippingThreshold)}.` : ""}
      </p>
    </>
  );
}
