import Link from "@/components/ui/Link";
import { BadgeCheck } from "lucide-react";
import { Stars } from "@/components/ui/Stars";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import type { Product, Testimonial } from "@/types";

export function TestimonialCard({ t, product }: { t: Testimonial; product?: Product }) {
  return (
    <figure className="flex h-full flex-col border border-hair bg-ivory p-7 md:p-9">
      <Stars value={t.rating} size={13} />
      <blockquote className="mt-6 flex-1 font-display text-[1.45rem] font-light italic leading-[1.3] text-ink md:text-[1.6rem]">&ldquo;{t.quote}&rdquo;</blockquote>
      <figcaption className="mt-8 flex items-end justify-between gap-4 border-t border-hair pt-5">
        <div>
          <p className="text-[0.85rem] font-medium">{t.name}</p>
          <p className="text-[0.75rem] text-ink-muted">{t.city}</p>
          {t.verified && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[0.66rem] uppercase tracking-[0.18em] text-gold-deep">
              <BadgeCheck className="h-3.5 w-3.5" strokeWidth={1.4} /> Verified buyer
            </p>
          )}
        </div>
        {product && (
          <Link href={`/products/${product.slug}`} className="label link-underline shrink-0 text-[0.62rem] text-ink-muted hover:text-ink">
            {product.name}
          </Link>
        )}
      </figcaption>
    </figure>
  );
}

export function Testimonials({ items, products }: { items: Testimonial[]; products: Product[] }) {
  // Only real, verified reviews are shown; with none, the section stays hidden.
  if (!items.length) return null;
  return (
    <section aria-labelledby="testimonials-title" className="overflow-hidden bg-sand py-section">
      <div className="container-site">
        <Reveal className="mb-12 text-center">
          <p className="eyebrow text-gold-deep">Reviews</p>
          <h2 id="testimonials-title" className="mt-4 text-display-md uppercase">
            From our loved ones
          </h2>
        </Reveal>
        <ProductCarousel label="Customer reviews" itemClassName="w-[84vw] xs:w-[70vw] sm:w-[48vw] lg:w-[calc((100%-3rem)/3)]">
          {items.map((t) => (
            <TestimonialCard key={t.id} t={t} product={products.find((p) => p.slug === t.productSlug)} />
          ))}
        </ProductCarousel>
      </div>
    </section>
  );
}
