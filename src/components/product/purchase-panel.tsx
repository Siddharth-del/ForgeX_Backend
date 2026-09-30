"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import type { Product } from "@/lib/types";
import { STORE_RULES } from "@/lib/constants";
import { formatPaise } from "@/lib/utils";
import { useAddToCart, useCart } from "@/hooks/use-cart";
import { useMounted } from "@/hooks/use-mounted";
import { useStickyBar } from "@/hooks/use-sticky-bar";
import { Button } from "../ui/button";

export function PurchasePanel({ product }: { product: Product }) {
  const stock = product.stock ?? 0;
  const { cart } = useCart();
  const inBag = cart?.products.find((p) => p.productId === product.productId)?.quantity ?? 0;
  const max = Math.max(0, Math.min(STORE_RULES.maxPerProduct, stock) - inBag);
  const [qty, setQty] = useState(1);
  const { add, isPending } = useAddToCart();
  const soldOut = stock <= 0;
  const [cta, setCta] = useState<HTMLDivElement | null>(null);
  const showBar = useStickyBar(cta);
  const mounted = useMounted();

  const addNow = () => {
    add(product, Math.min(qty, max));
    setQty(1);
  };

  if (soldOut) {
    return (
      <div className="space-y-3">
        <Button size="lg" className="w-full" disabled>
          Sold out
        </Button>
        <p className="text-[13px] text-stone">This fragrance is out of stock right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={setCta} className="flex gap-3">
        <div className="inline-flex h-14 shrink-0 items-center rounded-xs border border-line" role="group" aria-label="Quantity">
          <button
            type="button"
            className="inline-flex h-full w-12 items-center justify-center hover:bg-ink/5 disabled:opacity-30"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" strokeWidth={1.25} />
          </button>
          <output className="w-8 text-center tabular-nums" aria-live="polite">
            {qty}
          </output>
          <button
            type="button"
            className="inline-flex h-full w-12 items-center justify-center hover:bg-ink/5 disabled:opacity-30"
            onClick={() => setQty((q) => Math.min(max, q + 1))}
            disabled={qty >= max}
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" strokeWidth={1.25} />
          </button>
        </div>
        <Button size="lg" className="min-w-0 flex-1 px-4" loading={isPending} disabled={max === 0} onClick={addNow}>
          {max === 0 ? (
            "Limit reached"
          ) : (
            <>
              Add to bag<span className="hidden min-[380px]:inline"> — {formatPaise(product.price * Math.max(1, Math.min(qty, max || 1)))}</span>
            </>
          )}
        </Button>
      </div>
      <p className="text-[13px] text-stone">
        {stock <= 5 ? <span className="text-ember">Only {stock} left. </span> : null}
        {inBag > 0 ? `${inBag} already in your bag. ` : ""}
        Up to {Math.min(STORE_RULES.maxPerProduct, stock)} per order.
      </p>

      {/* Phones & tablets: pinned buy bar. Portalled to <body> so no transformed
          ancestor (scroll-reveal) can turn position: fixed into position: absolute. */}
      {mounted &&
        createPortal(
      <AnimatePresence>
        {showBar && max > 0 && (
          <motion.div
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            exit={{ y: "110%" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-5 pt-3 backdrop-blur-xl lg:hidden"
            aria-label={`Buy ${product.name}`}
            role="region"
          >
            <div className="mx-auto flex max-w-2xl items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="display truncate text-xl leading-tight">{product.name}</p>
                <p className="text-[13px] tabular-nums text-stone">{formatPaise(product.price)}</p>
              </div>
              <Button className="shrink-0" loading={isPending} onClick={addNow}>
                Add to bag
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
