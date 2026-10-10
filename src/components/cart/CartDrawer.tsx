import Link from "@/components/ui/Link";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useCart } from "@/store/cart";
import { useAuth } from "@/store/auth";
import { useUI } from "@/store/ui";
import { useAddToCart, defaultVariant } from "@/hooks/useAddToCart";
import { useCatalog } from "@/components/layout/CatalogProvider";
import { Sheet } from "@/components/ui/Sheet";
import { ButtonLink, Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cartProblems, lineProblem, MAX_PER_LINE, type CartLine } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { formatPaise } from "@/lib/orders";
import { site } from "@/lib/site";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { ProductPhoto } from "@/components/products/ProductPhoto";

/**
 * The bag: the signed-in shopper's server cart (ForgeX's cart page, as a drawer). Every button is a
 * request; the lines, prices and totals shown are the ones the server sent back.
 */
export function CartDrawer() {
  const open = useUI((s) => s.cartOpen);
  const close = useUI((s) => s.closeCart);
  const user = useAuth((s) => s.user);
  const { cart, status, error, load } = useCart();
  const products = useCatalog();
  const add = useAddToCart();

  // Fresh on open (ForgeX keeps the cart for 15 s before asking again).
  useEffect(() => {
    if (open && user) void load({ maxAge: 15_000 });
  }, [open, user, load]);

  const lines = useMemo(() => cart?.lines ?? [], [cart]);
  const subtotal = cart?.subtotal ?? 0;
  const threshold = site.freeShippingThreshold * 100;
  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(1, subtotal / threshold);
  const blocked = cart ? cartProblems(cart).length > 0 : false;

  // Suggest small attars not already in the bag.
  const upsell = useMemo(() => {
    const inBag = new Set(lines.flatMap((l) => (l.kind === "product" ? [l.productId] : l.contents.map((c) => c.productId))));
    return products.filter((p) => p.type === "attar" && p.variants[0]?.inStock && !inBag.has(p.productId)).slice(0, 2);
  }, [products, lines]);

  return (
    <Sheet open={open} onClose={close} side="right" label="Shopping bag">
      <div className="flex items-center justify-between border-b border-hair px-6 py-5">
        <h2 className="font-display text-[1.7rem] uppercase tracking-[0.04em]">
          Your bag {cart && <span className="align-top font-sans text-[0.75rem] tracking-normal text-ink-muted">({cart.count})</span>}
        </h2>
        <button type="button" data-autofocus onClick={close} aria-label="Close bag" className="-mr-2 flex h-11 w-11 items-center justify-center">
          <X className="h-5 w-5" strokeWidth={1.3} />
        </button>
      </div>

      {!user ? (
        <div className="flex flex-1 items-center">
          <EmptyState
            title="Sign in to see your bag"
            body="Your bag is saved to your account, so it follows you across devices."
            action={
              <ButtonLink href="/account" onClick={close} arrow>
                Sign in
              </ButtonLink>
            }
          />
        </div>
      ) : !cart && status === "error" ? (
        <div className="flex flex-1 items-center">
          <EmptyState
            title="We couldn't load your bag"
            body={error?.message ?? "Please try again in a moment."}
            action={
              <Button onClick={() => void load()} arrow>
                Try again
              </Button>
            }
          />
        </div>
      ) : !cart ? (
        <div className="space-y-5 px-6 py-6" aria-busy="true" aria-label="Loading your bag">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-28 w-[5.6rem]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : lines.length === 0 ? (
        <div className="flex flex-1 items-center">
          <EmptyState
            title="Your bag is empty"
            body="Discover a signature in the collection."
            action={
              <ButtonLink href="/collections/all" onClick={close} arrow>
                Shop the collection
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <>
          <div className="border-b border-hair px-6 py-4">
            <p className="text-[0.78rem] text-ink-muted">
              {remaining > 0 ? (
                <>
                  You are <span className="font-medium text-ink">{formatPaise(remaining)}</span> away from complimentary shipping.
                </>
              ) : (
                <>Your order ships complimentary.</>
              )}
            </p>
            <div className="mt-3 h-px w-full bg-espresso/10">
              <motion.div className="h-px bg-gold-deep" initial={false} animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.8, ease: EASE }} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-6">
            <ul aria-label="Items in your bag">
              <AnimatePresence initial={false}>
                {lines.map((l) => (
                  <motion.li
                    key={l.key}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    className="overflow-hidden border-b border-hair"
                  >
                    <BagLine line={l} onNavigate={close} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            {upsell.length > 0 && (
              <div className="py-6">
                <p className="label mb-4 text-ink-muted">Layer it with an attar</p>
                <ul className="space-y-3">
                  {upsell.map((p) => {
                    const v = p.variants[0];
                    return (
                      <li key={p.id} className="flex items-center gap-3 bg-sand/70 p-2.5">
                        <div className="relative h-16 w-[3.2rem] shrink-0 overflow-hidden bg-espresso">
                          <ProductPhoto src={p.images[0]?.src} alt={p.name} dark sizes="52px" compact />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-[1.05rem] uppercase">{p.name}</p>
                          <p className="text-[0.72rem] text-ink-muted tabular">
                            {v.size ? `${v.size} · ` : ""}
                            {formatPrice(v.price)}
                          </p>
                        </div>
                        <button type="button" onClick={() => void add(p, v ?? defaultVariant(p))} className="label shrink-0 px-2 text-gold-deep hover:text-ink">
                          Add
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="border-t border-hair bg-ivory px-6 pb-6 pt-5 safe-bottom">
            <dl className="space-y-1.5 text-[0.85rem]">
              {cart.savings > 0 && (
                <div className="flex justify-between text-gold-deep">
                  <dt>You save</dt>
                  <dd className="tabular">{formatPaise(cart.savings)}</dd>
                </div>
              )}
              <div className="flex justify-between text-[1rem]">
                <dt>Subtotal</dt>
                <dd className="font-medium tabular">{formatPaise(subtotal)}</dd>
              </div>
            </dl>
            <p className="mt-1.5 text-[0.72rem] text-ink-faint">Inclusive of all taxes. Shipping and coupons at checkout.</p>
            {blocked && <p className="mt-2 text-[0.75rem] text-[#9b3b2a]">Some items need your attention before checkout.</p>}
            <div className="mt-5 grid gap-2.5">
              <ButtonLink href="/checkout" onClick={close} size="lg" arrow className="w-full">
                Checkout
              </ButtonLink>
              <Button variant="ghost" size="sm" onClick={close} className="w-full">
                Continue shopping
              </Button>
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}

/** One cart line with server-side quantity buttons (ForgeX's CartLine). */
function BagLine({ line: l, onNavigate }: { line: CartLine; onNavigate: () => void }) {
  const store = useCart();
  const pending = store.pending.includes(l.key);
  const problem = lineProblem(l);
  const isBox = l.kind === "box";
  // + stops at the stock left (and 10 per line); − stops at 1 (Remove takes the line out).
  const atLimit = l.quantity >= MAX_PER_LINE || (l.kind === "product" ? l.quantity >= l.stock : !l.available);

  const dec = () => void (isBox ? store.setBoxQuantity(l.cartItemId, l.quantity - 1) : store.decrement(l.productId));
  const inc = () => void (isBox ? store.setBoxQuantity(l.cartItemId, l.quantity + 1) : store.increment(l.productId));
  const remove = () => void (isBox ? store.removeBox(l.cartItemId) : store.remove(l.productId));
  const unitMrp = l.kind === "box" ? l.value : (l.mrp ?? 0);
  const unit = l.kind === "box" ? l.unitPrice : l.price;

  return (
    <div className={cn("flex gap-4 py-5 transition-opacity", pending && "opacity-60")} aria-busy={pending}>
      <Link
        href={isBox ? "/build-your-box" : `/products/${l.slug}`}
        onClick={onNavigate}
        className={cn("relative h-28 w-[5.6rem] shrink-0 overflow-hidden", !isBox && l.world === "attar" ? "bg-espresso" : "bg-sand")}
      >
        <ProductPhoto src={l.image ?? undefined} alt={l.name} dark={!isBox && l.world === "attar"} sizes="90px" compact />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-[1.2rem] uppercase leading-tight">{l.name}</p>
            {isBox && (
              <ul className="mt-2 space-y-0.5 text-[0.72rem] text-ink-muted">
                {l.contents.map((c) => (
                  <li key={c.productId}>· {c.quantity > 1 ? `${c.quantity} × ${c.name}` : c.name}</li>
                ))}
              </ul>
            )}
            {problem && <p className="mt-1.5 text-[0.75rem] text-[#9b3b2a]">{problem.message}</p>}
          </div>
          <button type="button" onClick={remove} disabled={pending} aria-label={`Remove ${l.name}`} className="-mr-1 p-1 text-ink-faint hover:text-ink disabled:opacity-40">
            <X className="h-4 w-4" strokeWidth={1.3} />
          </button>
        </div>
        <div className="mt-auto flex items-end justify-between pt-3">
          <div className="flex items-center border border-hair-strong" role="group" aria-label={`Quantity of ${l.name}`}>
            <button type="button" onClick={dec} disabled={pending || l.quantity <= 1} aria-label="Decrease quantity" className="flex h-8 w-8 items-center justify-center disabled:opacity-35">
              <Minus className="h-3 w-3" strokeWidth={1.4} />
            </button>
            <span className="w-6 text-center text-[0.8rem] tabular" aria-live="polite">
              {l.quantity}
            </span>
            <button type="button" onClick={inc} disabled={pending || atLimit} aria-label="Increase quantity" className="flex h-8 w-8 items-center justify-center disabled:opacity-35">
              <Plus className="h-3 w-3" strokeWidth={1.4} />
            </button>
          </div>
          <div className="text-right tabular">
            {unitMrp > unit && <p className="text-[0.72rem] text-ink-faint line-through">{formatPaise(unitMrp * l.quantity)}</p>}
            <p className="text-[0.92rem] font-medium">{formatPaise(l.lineTotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
