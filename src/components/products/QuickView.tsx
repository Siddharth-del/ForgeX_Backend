import Image from "@/components/ui/Image";
import { ProductPhoto } from "./ProductPhoto";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useUI } from "@/store/ui";
import { defaultVariant } from "@/hooks/useAddToCart";
import { Sheet } from "@/components/ui/Sheet";
import { Price } from "@/components/ui/Price";
import { Stars } from "@/components/ui/Stars";
import { TextLink } from "@/components/ui/Button";
import { AddToCartButton } from "./AddToCartButton";
import { SizeSelector } from "./SizeSelector";
import { WishlistButton } from "./WishlistButton";
import { formatCount } from "@/lib/format";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";

function useIsDesktop() {
  const [d, setD] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setD(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return d;
}

export function QuickView() {
  const product = useUI((s) => s.quickView);
  const close = useUI((s) => s.closeQuickView);
  const desktop = useIsDesktop();
  const [variantId, setVariantId] = useState("");
  const [img, setImg] = useState(0);

  useEffect(() => {
    if (product) {
      setVariantId(defaultVariant(product).id);
      setImg(0);
    }
  }, [product]);

  const variant = product?.variants.find((v) => v.id === variantId) ?? (product ? defaultVariant(product) : undefined);

  return (
    <Sheet open={!!product} onClose={close} side={desktop ? "center" : "bottom"} label={product ? `Quick view: ${product.name}` : "Quick view"} className={cn(!desktop && "rounded-t-none")}>
      {product && variant && (
        <div className="grid grid-cols-1 max-h-[90vh] overflow-y-auto md:grid-cols-[1.05fr_1fr]">
          <div className={cn("relative aspect-[4/5] md:aspect-auto md:min-h-[34rem]", product.world === "attar" ? "bg-espresso" : "bg-sand")}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={img} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: EASE }}>
                <ProductPhoto src={product.images[img]?.src} alt={product.images[img]?.alt ?? product.name} dark={product.world === "attar"} sizes="(min-width: 768px) 34rem, 100vw" />
              </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-4 left-4 flex gap-2">
              {product.images.length > 1 && product.images.map((im, i) => (
                <button key={im.src} type="button" onClick={() => setImg(i)} aria-label={`Show image ${i + 1}`} className={cn("relative h-14 w-11 overflow-hidden border transition-colors", i === img ? "border-ivory" : "border-transparent opacity-70")}>
                  <Image src={im.src} alt="" fill sizes="44px" className="object-cover" />
                </button>
              ))}
            </div>
            <button type="button" onClick={close} aria-label="Close quick view" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-ivory/85 text-espresso backdrop-blur md:hidden">
              <X className="h-4 w-4" strokeWidth={1.4} />
            </button>
          </div>

          <div className="flex flex-col p-6 md:p-9">
            <div className="flex items-start justify-between gap-4">
              <p className="eyebrow text-gold-deep">{product.type === "attar" ? "Attar" : "Perfume"}</p>
              <button type="button" data-autofocus onClick={close} aria-label="Close quick view" className="-mr-2 -mt-2 hidden h-10 w-10 items-center justify-center md:flex">
                <X className="h-5 w-5" strokeWidth={1.3} />
              </button>
            </div>
            <h2 className="mt-3 font-display text-[2.4rem] uppercase leading-none tracking-[0.03em]">{product.name}</h2>
            {product.family && <p className="mt-2 text-[0.85rem] text-ink-muted">{product.family}</p>}
            {product.rating !== undefined && product.reviewCount !== undefined && (
              <div className="mt-3 flex items-center gap-2 text-[0.75rem] text-ink-faint">
                <Stars value={product.rating} /> {product.rating.toFixed(1)} · {formatCount(product.reviewCount)} reviews
              </div>
            )}
            <Price price={variant.price} compareAt={variant.compareAt} size="lg" className="mt-5" />
            {(product.tagline || product.description) && (
              <p className="mt-5 line-clamp-4 text-[0.9rem] leading-relaxed text-ink-muted">{product.tagline || product.description}</p>
            )}
            {product.notes && (
              <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-hair py-4 text-[0.75rem]">
                {(["top", "heart", "base"] as const).map((k) => (
                  <div key={k}>
                    <dt className="label mb-1 text-[0.6rem] text-ink-faint">{k}</dt>
                    <dd>{product.notes![k].join(", ")}</dd>
                  </div>
                ))}
              </dl>
            )}
            {!variant.inStock && <p className="mt-5 text-[0.8rem] text-[#9b3b2a]">Sold out</p>}
            {(product.variants.length > 1 || variant.size) && (
              <div className="mt-6">
                <SizeSelector id={`qv-${product.id}`} variants={product.variants} value={variant.id} onChange={setVariantId} />
              </div>
            )}
            <div className="mt-6 flex gap-2.5">
              <AddToCartButton product={product} variant={variant} style="primary" size="md" />
              <WishlistButton product={product} variant="inline" />
            </div>
            <TextLink href={`/products/${product.slug}`} onClick={close} className="mt-6 self-start">
              View full details
            </TextLink>
          </div>
        </div>
      )}
    </Sheet>
  );
}
