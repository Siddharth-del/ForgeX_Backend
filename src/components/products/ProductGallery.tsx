import Image from "@/components/ui/Image";
import { ProductPhoto } from "./ProductPhoto";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";
import type { Product } from "@/types";

/** Both layouts share one `sizes` string so the first image resolves to the same file (one download, one preload). */
const SIZES = "(min-width: 1024px) 50vw, (min-width: 768px) 90vw, 100vw";

/** Thumbnails + hover zoom on desktop; swipeable strip with dots on mobile. */
export function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const bg = product.world === "attar" ? "bg-espresso" : "bg-sand";

  const many = product.images.length > 1;

  if (!product.images.length)
    return (
      <div className={cn("relative aspect-[4/5]", bg)}>
        <ProductPhoto alt={product.name} dark={product.world === "attar"} />
      </div>
    );

  const onStripScroll = () => {
    const el = strip.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div>
      {/* Mobile */}
      <div className="relative md:hidden">
        <div ref={strip} onScroll={onStripScroll} className="no-scrollbar snap-x-mandatory flex overflow-x-auto" aria-label="Product images">
          {product.images.map((img, i) => (
            <div key={img.src} className={cn("relative aspect-[4/5] w-full shrink-0 snap-center", bg)}>
              <Image src={img.src} alt={img.alt} fill priority={i === 0} sizes={SIZES} className="object-cover" />
            </div>
          ))}
        </div>
        {many && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {product.images.map((img, i) => (
              <span key={img.src} className={cn("h-1 rounded-full transition-all duration-500", i === active ? "w-6 bg-ivory" : "w-1.5 bg-ivory/50")} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop */}
      <div className={cn("hidden gap-4 md:grid", many ? "md:grid-cols-[5rem_minmax(0,1fr)]" : "md:grid-cols-1")}>
        <div className={cn("flex flex-col gap-3", !many && "hidden")}>
          {product.images.map((img, i) => (
            <button key={img.src} type="button" onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} aria-current={i === active} className={cn("relative aspect-[4/5] overflow-hidden transition-opacity", bg, i === active ? "ring-1 ring-espresso ring-offset-2 ring-offset-ivory" : "opacity-60 hover:opacity-100")}>
              <Image src={img.src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
        <div
          className={cn("relative aspect-[4/5] cursor-zoom-in overflow-hidden", bg)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={active} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: EASE }}>
              <Image
                src={product.images[active].src}
                alt={product.images[active].alt}
                fill
                priority={active === 0}
                sizes={SIZES}
                className="object-cover transition-transform duration-500 ease-out"
                style={zoom ? { transform: "scale(1.6)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
