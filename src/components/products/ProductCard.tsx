import Image from "@/components/ui/Image";
import { ProductPhoto } from "./ProductPhoto";
import Link from "@/components/ui/Link";
import { Eye, Plus } from "lucide-react";
import { defaultVariant, useAddToCart } from "@/hooks/useAddToCart";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useUI } from "@/store/ui";
import { Price } from "@/components/ui/Price";
import { Stars } from "@/components/ui/Stars";
import { AddToCartButton } from "./AddToCartButton";
import { ProductBadges } from "./ProductBadges";
import { WishlistButton } from "./WishlistButton";
import type { Product } from "@/types";

interface Props {
  product: Product;
  tone?: "light" | "dark";
  sizes?: string;
  priority?: boolean;
  className?: string;
}

export function ProductCard({ product, tone = "dark", sizes = "(min-width: 1280px) 22vw, (min-width: 768px) 31vw, 70vw", priority, className }: Props) {
  const v = defaultVariant(product);
  const openQuickView = useUI((s) => s.openQuickView);
  const add = useAddToCart();
  const light = tone === "light";
  const allSoldOut = product.variants.every((x) => !x.inStock);
  const [img1, img2] = product.images;

  return (
    <article className={cn("group/card relative flex flex-col", className)}>
      <div className={cn("relative aspect-[4/5] overflow-hidden", product.world === "attar" ? "bg-espresso" : "bg-sand")}>
        <Link href={`/products/${product.slug}`} aria-label={product.name} className="absolute inset-0">
          <ProductPhoto
            src={img1?.src}
            alt={img1?.alt ?? product.name}
            dark={product.world === "attar"}
            sizes={sizes}
            priority={priority}
            className="transition-transform duration-[1.6s] ease-luxe group-hover/card:scale-[1.045]"
          />
          {img2 && (
            <Image
              src={img2.src}
              alt=""
              fill
              sizes={sizes}
              className="hidden object-cover opacity-0 transition-opacity duration-700 ease-luxe [@media(hover:hover)]:block group-hover/card:opacity-100"
            />
          )}
        </Link>

        <ProductBadges badges={product.badges} soldOut={allSoldOut} className="pointer-events-none absolute left-3 top-3" />
        <WishlistButton product={product} className="absolute right-3 top-3" />

        {/* Desktop hover actions */}
        <div className="absolute inset-x-3 bottom-3 hidden translate-y-2 grid-cols-2 gap-px opacity-0 transition-all duration-500 ease-luxe [@media(hover:hover)]:grid group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100">
          <button
            type="button"
            onClick={() => openQuickView(product)}
            className="flex h-10 items-center justify-center gap-2 bg-ivory/92 text-[0.62rem] font-medium uppercase tracking-[0.2em] text-espresso backdrop-blur-sm transition-colors hover:bg-ivory"
          >
            <Eye className="h-3.5 w-3.5" strokeWidth={1.3} /> Quick view
          </button>
          <button
            type="button"
            disabled={!v.inStock}
            onClick={() => add(product, v)}
            className="flex h-10 items-center justify-center gap-2 bg-espresso/92 text-[0.62rem] font-medium uppercase tracking-[0.2em] text-ivory backdrop-blur-sm transition-colors hover:bg-espresso disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.3} /> Quick add
          </button>
        </div>

        {/* Touch: compact quick view */}
        <button
          type="button"
          onClick={() => openQuickView(product)}
          aria-label={`Quick view ${product.name}`}
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-ivory/85 text-espresso backdrop-blur-sm [@media(hover:hover)]:hidden"
        >
          <Eye className="h-4 w-4" strokeWidth={1.3} />
        </button>
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <h3 className={cn("font-display text-[1.28rem] font-normal uppercase leading-tight tracking-[0.05em] md:text-[1.4rem]", light ? "text-ivory" : "text-ink")}>
          <Link href={`/products/${product.slug}`} className="link-underline">
            {product.name}
          </Link>
        </h3>
        <p className={cn("mt-1 text-[0.78rem]", light ? "text-ivory/60" : "text-ink-muted")}>
          {[product.family, product.type === "attar" ? "Attar" : "Perfume", v.size].filter(Boolean).join(" · ")}
        </p>
        {product.rating !== undefined && product.reviewCount !== undefined && (
          <div className={cn("mt-2.5 flex items-center gap-2 text-[0.72rem]", light ? "text-ivory/60" : "text-ink-faint")}>
            <Stars value={product.rating} size={11} />
            <span className="tabular">
              {product.rating.toFixed(1)} · {formatCount(product.reviewCount)} reviews
            </span>
          </div>
        )}
        <Price price={v.price} compareAt={v.compareAt} tone={light ? "light" : "dark"} className="mt-2.5" />
        <div className="mt-auto pt-4">
          <AddToCartButton product={product} style={light ? "outline-light" : "outline"} />
        </div>
      </div>
    </article>
  );
}
