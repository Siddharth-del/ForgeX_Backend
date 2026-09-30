"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { Product } from "@/lib/types";
import { CATEGORIES, FAMILIES, GENDERS, labelOf } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAddToCart } from "@/hooks/use-cart";
import { Spinner } from "../ui/spinner";
import { ProductImage } from "./product-image";
import { Price } from "./price";

export function productMeta(p: Pick<Product, "category" | "fragranceFamily" | "gender">) {
  return [labelOf(CATEGORIES, p.category), labelOf(FAMILIES, p.fragranceFamily), labelOf(GENDERS, p.gender)]
    .filter(Boolean)
    .join(" · ");
}

export function ProductCard({
  product,
  priority,
  dark,
  sizes,
}: {
  product: Product;
  priority?: boolean;
  dark?: boolean;
  sizes?: string;
}) {
  const { add, isPending, pendingId } = useAddToCart();
  const stock = product.stock ?? 0;
  const soldOut = stock <= 0;
  const busy = isPending && pendingId === product.productId;
  const href = `/products/${encodeURIComponent(product.slug)}`;

  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative">
        <Link href={href} aria-label={product.name} className="block">
          <ProductImage
            product={product}
            priority={priority}
            dark={dark}
            sizes={sizes}
            className="aspect-[4/5] [&_img]:transition-transform [&_img]:duration-[1.2s] [&_img]:ease-[var(--ease-out-expo)] group-hover:[&_img]:scale-[1.04] [&_svg]:transition-transform [&_svg]:duration-[1.2s] group-hover:[&_svg]:scale-[1.03]"
          />
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {soldOut ? (
            <span className="eyebrow rounded-xs bg-ink px-2 py-1 text-[10px] text-bone">Sold out</span>
          ) : stock <= 5 ? (
            <span className="eyebrow rounded-xs bg-paper/90 px-2 py-1 text-[10px] text-ink backdrop-blur">
              Only {stock} left
            </span>
          ) : null}
        </div>

        {!soldOut && (
          <button
            type="button"
            onClick={() => add(product)}
            disabled={busy}
            aria-label={`Add ${product.name} to bag`}
            className={cn(
              "absolute bottom-3 right-3 inline-flex h-11 items-center gap-2 rounded-xs px-3.5 text-[11px] font-medium uppercase tracking-[0.14em] shadow-sm",
              "transition-all duration-500 ease-[var(--ease-out-expo)]",
              dark ? "bg-bone text-ink hover:bg-white" : "bg-ink text-bone hover:bg-ink-3",
              // Always visible on touch; slides in on hover for pointer devices
              "pointer-fine:md:translate-y-2 pointer-fine:md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:opacity-100",
            )}
          >
            {busy ? <Spinner /> : <Plus className="h-4 w-4" strokeWidth={1.5} />}
            <span className="hidden sm:inline">Add</span>
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-1.5">
        <p className={cn("eyebrow text-[10px]", dark ? "text-smoke" : "text-stone")}>{productMeta(product)}</p>
        <h3 className="display text-[1.55rem] leading-[1.05]">
          <Link href={href} className="link-draw">
            {product.name}
          </Link>
        </h3>
        <Price price={product.price} mrp={product.mrp} discount={product.discount} dark={dark} className="mt-auto pt-1" />
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="skeleton aspect-[4/5]" />
      <div className="skeleton mt-4 h-3 w-1/2" />
      <div className="skeleton mt-3 h-6 w-3/4" />
      <div className="skeleton mt-3 h-4 w-1/3" />
    </div>
  );
}
