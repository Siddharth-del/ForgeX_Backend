import Link from "@/components/ui/Link";
import { useNavigate } from "react-router";
import { Minus, Plus, RotateCcw, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { defaultVariant, useAddToCart } from "@/hooks/useAddToCart";
import { Price } from "@/components/ui/Price";
import { Stars } from "@/components/ui/Stars";
import { Button } from "@/components/ui/Button";
import { AddToCartButton } from "./AddToCartButton";
import { ProductBadges } from "./ProductBadges";
import { SizeSelector } from "./SizeSelector";
import { WishlistButton } from "./WishlistButton";
import { formatCount, formatPrice } from "@/lib/format";
import { genderLabel } from "@/lib/scent";
import { site } from "@/lib/site";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";
import type { Product } from "@/types";

export function ProductInfo({ product, tone = "dark" }: { product: Product; tone?: "light" | "dark" }) {
  const [variantId, setVariantId] = useState(defaultVariant(product).id);
  const [qty, setQty] = useState(1);
  const variant = product.variants.find((v) => v.id === variantId)!;
  const add = useAddToCart();
  const navigate = useNavigate();
  const light = tone === "light";
  const ctaRef = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);

  // Show the mobile purchase bar once the main buttons have scrolled above the viewport.
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = ctaRef.current;
      if (el) setShowBar(el.getBoundingClientRect().bottom < 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const buyNow = () => {
    add(product, variant, qty, { silent: true });
    navigate("/checkout");
  };

  const kind = product.type === "attar" ? "Attar" : "Perfume";
  // The backend allows up to 10 of a product in the cart, and never more than are in stock.
  const maxQty = Math.max(1, Math.min(10, product.stock));
  const lowStock = variant.inStock && product.stock <= 5;

  return (
    <div className={cn(light ? "text-ivory" : "text-ink")}>
      <ProductBadges badges={product.badges} />
      <p className={cn("eyebrow mt-5", light ? "text-gold-soft" : "text-gold-deep")}>
        {kind} · {genderLabel[product.gender]}
        {product.family && <> · {product.family}</>}
      </p>
      <h1 className="mt-3 font-display text-[clamp(2.6rem,5vw,4.4rem)] font-light uppercase leading-[0.95] tracking-[0.02em]">{product.name}</h1>
      {product.tagline && <p className={cn("mt-3 font-display text-[1.35rem] italic", light ? "text-ivory/75" : "text-ink-muted")}>{product.tagline}</p>}
      {product.rating !== undefined && product.reviewCount !== undefined && (
        <a href="#reviews" className={cn("mt-4 inline-flex items-center gap-2 text-[0.78rem]", light ? "text-ivory/60" : "text-ink-faint")}>
          <Stars value={product.rating} size={12} />
          <span className="link-underline tabular">
            {product.rating.toFixed(1)} · {formatCount(product.reviewCount)} reviews
          </span>
        </a>
      )}

      <div className={cn("mt-7 border-t pt-6", light ? "border-ivory/15" : "border-hair")}>
        <Price price={variant.price} compareAt={variant.compareAt} size="lg" tone={tone} />
        <p className={cn("mt-1.5 text-[0.72rem]", light ? "text-ivory/45" : "text-ink-faint")}>
          Inclusive of all taxes{product.concentration && <> · {product.concentration}</>}
        </p>
        {!variant.inStock ? (
          <p className={cn("mt-3 text-[0.8rem]", light ? "text-gold-soft" : "text-[#9b3b2a]")}>Sold out</p>
        ) : (
          lowStock && <p className={cn("mt-3 text-[0.8rem]", light ? "text-gold-soft" : "text-gold-deep")}>Only {product.stock} left</p>
        )}
      </div>

      {(product.variants.length > 1 || variant.size) && (
        <div className="mt-7">
          <SizeSelector id={`size-${product.id}`} variants={product.variants} value={variantId} onChange={setVariantId} tone={tone} />
        </div>
      )}

      <div ref={ctaRef} className="mt-7 flex flex-col gap-3">
        <div className="flex gap-3">
          <div className={cn("flex h-14 items-center border", light ? "border-ivory/25" : "border-espresso/25")}>
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" className="flex h-full w-11 items-center justify-center">
              <Minus className="h-3.5 w-3.5" strokeWidth={1.4} />
            </button>
            <span className="w-7 text-center text-[0.9rem] tabular" aria-live="polite" aria-label={`Quantity ${qty}`}>
              {qty}
            </span>
            <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label="Increase quantity" className="flex h-full w-11 items-center justify-center">
              <Plus className="h-3.5 w-3.5" strokeWidth={1.4} />
            </button>
          </div>
          <AddToCartButton product={product} variant={variant} quantity={qty} style={light ? "light" : "primary"} size="lg" className="flex-1" />
          <WishlistButton product={product} variant="inline" className={cn("h-14 w-14", light && "border-ivory/30 text-ivory hover:border-ivory")} />
        </div>
        <Button variant={light ? "outline-light" : "outline"} size="lg" disabled={!variant.inStock} onClick={buyNow} className="w-full">
          Buy now
        </Button>
      </div>

      <ul className={cn("mt-7 grid gap-3 text-[0.8rem]", light ? "text-ivory/70" : "text-ink-muted")}>
        <li className="flex items-center gap-3">
          <Truck className="h-4 w-4 shrink-0" strokeWidth={1.2} /> Free shipping above {formatPrice(site.freeShippingThreshold)}. Cash on delivery available.
        </li>
        <li className="flex items-center gap-3">
          <RotateCcw className="h-4 w-4 shrink-0" strokeWidth={1.2} /> Returns on unopened bottles. See our{" "}
          <Link href="/help/returns" className="underline underline-offset-2 hover:text-current">
            returns policy
          </Link>
          .
        </li>
      </ul>

      <div className={cn("mt-8 border-t", light ? "border-ivory/15" : "border-hair")}>
        {product.description && (
          <Accordion title="Description" light={light} defaultOpen>
            <p className="whitespace-pre-line">{product.description}</p>
          </Accordion>
        )}
        <Accordion title="How to wear" light={light}>
          {product.type === "attar" ? (
            <p>Swipe the glass dauber once on each wrist, behind the ears or at the base of the throat. Let it settle; do not rub. Layer under a perfume from the same family for a longer trail.</p>
          ) : (
            <p>Spray two to four times from 15 cm onto pulse points and clothing. Apply to moisturised skin for the longest wear, and avoid rubbing the wrists together.</p>
          )}
        </Accordion>
        <Accordion title="Shipping & returns" light={light}>
          <p>
            Complimentary shipping on orders above {formatPrice(site.freeShippingThreshold)}; {formatPrice(site.shippingFee)} below that. Delivery times and returns are set out in our{" "}
            <Link href="/help/shipping" className="underline underline-offset-2">
              shipping
            </Link>{" "}
            and{" "}
            <Link href="/help/returns" className="underline underline-offset-2">
              returns
            </Link>{" "}
            policies.
          </p>
        </Accordion>
      </div>

      {/* Mobile sticky purchase bar */}
      <AnimatePresence>
        {showBar && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-hair bg-ivory/95 px-gutter pt-3 text-ink backdrop-blur-xl safe-bottom lg:hidden"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[1.15rem] uppercase leading-tight">{product.name}</p>
              <p className="text-[0.75rem] text-ink-muted tabular">
                {variant.size ? `${variant.size} · ` : ""}
                {formatPrice(variant.price)}
              </p>
            </div>
            <div className="w-[48%]">
              <AddToCartButton product={product} variant={variant} quantity={qty} style="primary" size="md" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Accordion({ title, children, light, defaultOpen = false }: { title: string; children: React.ReactNode; light: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("border-b", light ? "border-ivory/15" : "border-hair")}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between py-5 text-left">
        <span className="label">{title}</span>
        <span aria-hidden className="relative h-3 w-3">
          <span className="absolute left-0 top-1/2 h-px w-3 bg-current" />
          <span className={cn("absolute left-1/2 top-0 h-3 w-px bg-current transition-transform duration-500", open && "scale-y-0")} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: EASE }} className="overflow-hidden">
            <div className={cn("pb-6 text-[0.9rem] leading-relaxed", light ? "text-ivory/70" : "text-ink-muted")}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
