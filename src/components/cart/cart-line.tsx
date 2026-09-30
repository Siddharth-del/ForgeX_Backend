"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import type { Product } from "@/lib/types";
import { STORE_RULES } from "@/lib/constants";
import { cn, formatPaise } from "@/lib/utils";
import { useRemoveFromCart, useStepQuantity } from "@/hooks/use-cart";
import { ProductImage } from "../product/product-image";
import { productMeta } from "../product/product-card";

export function CartLine({ item, cartId, compact, onNavigate }: { item: Product; cartId: number; compact?: boolean; onNavigate?: () => void }) {
  const step = useStepQuantity();
  const remove = useRemoveFromCart();
  const qty = item.quantity ?? 1;
  const max = Math.min(STORE_RULES.maxPerProduct, item.stock ?? STORE_RULES.maxPerProduct);
  const busy = step.isPending || remove.isPending;
  const href = `/products/${encodeURIComponent(item.slug)}`;

  return (
    <li className={cn("flex gap-4 py-5", busy && "opacity-70 transition-opacity")}>
      <Link href={href} onClick={onNavigate} className="shrink-0" tabIndex={-1} aria-hidden>
        <ProductImage product={item} sizes="120px" className={cn("aspect-[4/5]", compact ? "w-20" : "w-24 sm:w-28")} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow truncate text-[10px] text-stone">{productMeta(item)}</p>
            <h3 className="display mt-1 text-xl leading-tight">
              <Link href={href} onClick={onNavigate} className="link-draw">
                {item.name}
              </Link>
            </h3>
          </div>
          <p className="shrink-0 text-[15px] font-medium tabular-nums">{formatPaise(item.price * qty)}</p>
        </div>
        {qty > 1 && <p className="mt-1 text-[13px] text-stone">{formatPaise(item.price)} each</p>}

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="inline-flex h-11 items-center rounded-xs border border-line sm:h-9" role="group" aria-label={`Quantity of ${item.name}`}>
            <button
              type="button"
              className="inline-flex h-full w-11 items-center justify-center transition-colors hover:bg-ink/5 disabled:opacity-40 sm:w-9"
              onClick={() => step.mutate({ productId: item.productId, op: "delete" })}
              disabled={busy}
              aria-label={qty === 1 ? `Remove ${item.name}` : `Decrease quantity of ${item.name}`}
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              className="inline-flex h-full w-11 items-center justify-center transition-colors hover:bg-ink/5 disabled:opacity-40 sm:w-9"
              onClick={() => step.mutate({ productId: item.productId, op: "add" })}
              disabled={busy || qty >= max}
              aria-label={`Increase quantity of ${item.name}`}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => remove.mutate({ cartId, productId: item.productId })}
            disabled={busy}
            className="inline-flex min-h-11 items-center pl-3 text-[13px] text-stone underline decoration-stone/40 underline-offset-4 transition-colors hover:text-ink sm:min-h-9"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
