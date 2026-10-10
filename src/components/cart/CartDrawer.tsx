import Link from "@/components/ui/Link";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, X } from "lucide-react";
import { useMemo } from "react";
import { cartCount, cartSavings, cartSubtotal, useCart } from "@/store/cart";
import { useUI } from "@/store/ui";
import { useHydrated } from "@/hooks/useHydrated";
import { useAddToCart, defaultVariant } from "@/hooks/useAddToCart";
import { useCatalog } from "@/components/layout/CatalogProvider";
import { Sheet } from "@/components/ui/Sheet";
import { ButtonLink, Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/format";
import { site } from "@/lib/site";
import { EASE } from "@/lib/motion";
import { ProductPhoto } from "@/components/products/ProductPhoto";

export function CartDrawer() {
  const open = useUI((s) => s.cartOpen);
  const close = useUI((s) => s.closeCart);
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const products = useCatalog();
  const add = useAddToCart();

  const items = useMemo(() => (hydrated ? lines : []), [hydrated, lines]);
  const subtotal = cartSubtotal(items);
  const savings = cartSavings(items);
  const count = cartCount(items);
  const remaining = Math.max(0, site.freeShippingThreshold - subtotal);
  const progress = Math.min(1, subtotal / site.freeShippingThreshold);

  // Suggest small attars not already in the bag.
  const upsell = useMemo(() => {
    const inBag = new Set(items.map((l) => l.productId));
    return products.filter((p) => p.type === "attar" && !inBag.has(p.id)).slice(0, 2);
  }, [products, items]);

  return (
    <Sheet open={open} onClose={close} side="right" label="Shopping bag">
      <div className="flex items-center justify-between border-b border-hair px-6 py-5">
        <h2 className="font-display text-[1.7rem] uppercase tracking-[0.04em]">
          Your bag <span className="align-top font-sans text-[0.75rem] tracking-normal text-ink-muted">({count})</span>
        </h2>
        <button type="button" data-autofocus onClick={close} aria-label="Close bag" className="-mr-2 flex h-11 w-11 items-center justify-center">
          <X className="h-5 w-5" strokeWidth={1.3} />
        </button>
      </div>

      {items.length === 0 ? (
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
                  You are <span className="font-medium text-ink">{formatPrice(remaining)}</span> away from complimentary shipping.
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
            <ul>
              <AnimatePresence initial={false}>
                {items.map((l) => (
                  <motion.li
                    key={l.key}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    className="overflow-hidden border-b border-hair"
                  >
                    <div className="flex gap-4 py-5">
                      <Link href={l.bundle ? "/build-your-box" : `/products/${l.slug}`} onClick={close} className="relative h-28 w-[5.6rem] shrink-0 overflow-hidden bg-sand">
                        <ProductPhoto src={l.image} alt={l.name} sizes="90px" compact />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-display text-[1.2rem] uppercase leading-tight">{l.name}</p>
                            {l.size && <p className="mt-0.5 text-[0.75rem] text-ink-muted">{l.size}</p>}
                          </div>
                          <button type="button" onClick={() => remove(l.key)} aria-label={`Remove ${l.name}`} className="-mr-1 p-1 text-ink-faint hover:text-ink">
                            <X className="h-4 w-4" strokeWidth={1.3} />
                          </button>
                        </div>
                        {l.bundle && (
                          <ul className="mt-2 space-y-0.5 text-[0.72rem] text-ink-muted">
                            {l.bundle.items.map((b) => (
                              <li key={b.name}>
                                · {b.name} <span className="text-ink-faint">{b.size}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-auto flex items-end justify-between pt-3">
                          <div className="flex items-center border border-hair-strong">
                            <button type="button" onClick={() => setQuantity(l.key, l.quantity - 1)} aria-label="Decrease quantity" className="flex h-8 w-8 items-center justify-center">
                              <Minus className="h-3 w-3" strokeWidth={1.4} />
                            </button>
                            <span className="w-6 text-center text-[0.8rem] tabular" aria-live="polite">
                              {l.quantity}
                            </span>
                            <button type="button" onClick={() => setQuantity(l.key, l.quantity + 1)} aria-label="Increase quantity" className="flex h-8 w-8 items-center justify-center">
                              <Plus className="h-3 w-3" strokeWidth={1.4} />
                            </button>
                          </div>
                          <div className="text-right tabular">
                            {l.compareAt && l.compareAt > l.price && <p className="text-[0.72rem] text-ink-faint line-through">{formatPrice(l.compareAt * l.quantity)}</p>}
                            <p className="text-[0.92rem] font-medium">{formatPrice(l.price * l.quantity)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
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
                        <button type="button" onClick={() => add(p, v ?? defaultVariant(p))} className="label shrink-0 px-2 text-gold-deep hover:text-ink">
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
              {savings > 0 && (
                <div className="flex justify-between text-gold-deep">
                  <dt>You save</dt>
                  <dd className="tabular">{formatPrice(savings)}</dd>
                </div>
              )}
              <div className="flex justify-between text-[1rem]">
                <dt>Subtotal</dt>
                <dd className="font-medium tabular">{formatPrice(subtotal)}</dd>
              </div>
            </dl>
            <p className="mt-1.5 text-[0.72rem] text-ink-faint">Inclusive of all taxes. Shipping calculated at checkout.</p>
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
