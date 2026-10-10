import Link from "@/components/ui/Link";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductInfo } from "@/components/products/ProductInfo";
import { ProductStory } from "@/components/products/ProductStory";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import { ProductCard } from "@/components/products/ProductCard";
import { TestimonialCard } from "@/components/testimonials/Testimonials";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Stars } from "@/components/ui/Stars";
import { Reveal } from "@/components/ui/Reveal";
import { getProduct, getRelatedProducts, getTestimonials } from "@/lib/catalog";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { notFound } from "@/lib/router";
import { usePageMeta } from "@/hooks/usePageMeta";

export async function loader({ params }: LoaderFunctionArgs) {
  const product = await getProduct(params.slug ?? "");
  if (!product) notFound();
  const [related, testimonials] = await Promise.all([getRelatedProducts(product), getTestimonials()]);
  return { product, related, testimonials };
}

export default function ProductPage() {
  const { product, related, testimonials } = useLoaderData<typeof loader>();
  usePageMeta(product.name, `${product.tagline} ${product.description}`.slice(0, 160));
  // Product reviews first, topped up with house reviews so the grid is always full.
  const reviews = [...testimonials.filter((t) => t.productSlug === product.slug), ...testimonials.filter((t) => t.productSlug !== product.slug)].slice(0, 2);
  const dark = product.world === "attar";
  const collection = product.type === "attar" ? { href: "/collections/attars", label: "Attars" } : { href: "/collections/perfumes", label: "Perfumes" };
  // Reviews show only when this product has a real rating and reviews (the backend has none yet).
  const productReviews = reviews.filter((t) => t.productSlug === product.slug);
  const showReviews = product.rating !== undefined && product.reviewCount !== undefined && productReviews.length > 0;

  return (
    <>
      <section className={cn("pb-section pt-6 md:pt-8", dark ? "bg-espresso-deep text-ivory" : "bg-ivory text-ink")}>
        <div className="container-site">
          <nav aria-label="Breadcrumb" className={cn("mb-6 text-[0.72rem] uppercase tracking-[0.18em]", dark ? "text-ivory/50" : "text-ink-faint")}>
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href={collection.href} className="hover:underline">
                  {collection.label}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className={dark ? "text-ivory/80" : "text-ink-muted"}>
                {product.name}
              </li>
            </ol>
          </nav>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16 xl:gap-24">
            <div className="-mx-gutter md:mx-0">
              <div className="md:sticky md:top-28">
                <ProductGallery product={product} />
              </div>
            </div>
            <div className="md:pt-4">
              <ProductInfo product={product} tone={dark ? "light" : "dark"} />
            </div>
          </div>
        </div>
      </section>

      <ProductStory product={product} dark={dark} />

      {showReviews && (
      <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-28 bg-ivory py-section">
        <div className="container-site">
          <Reveal className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-16">
            <div>
              <p className="eyebrow text-gold-deep">Reviews</p>
              <h2 id="reviews-title" className="mt-4 text-display-md uppercase">
                In their words
              </h2>
              <div className="mt-8 flex items-end gap-4">
                <span className="font-display text-[5rem] font-light leading-none tabular">{product.rating!.toFixed(1)}</span>
                <div className="pb-3">
                  <Stars value={product.rating!} size={14} />
                  <p className="mt-1.5 text-[0.8rem] text-ink-muted">Based on {formatCount(product.reviewCount!)} reviews</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {productReviews.map((t) => (
                <TestimonialCard key={t.id} t={t} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>
      )}

      {related.length > 0 && (
      <section aria-labelledby="related-title" className="overflow-hidden bg-sand py-section">
        <div className="container-site">
          <Reveal>
            <SectionHeading eyebrow="Keep exploring" title={<span id="related-title">You may also like</span>} />
          </Reveal>
          <div className="mt-12">
            <ProductCarousel label="Related fragrances">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </ProductCarousel>
          </div>
        </div>
      </section>
      )}
    </>
  );
}
