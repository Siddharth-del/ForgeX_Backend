import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog, getProductBySlug, inStock } from "@/lib/server/catalog";
import { CATEGORIES, FAMILIES, SITE, STORE_RULES, labelOf } from "@/lib/constants";
import { formatPaise, titleCase } from "@/lib/utils";
import { ProductImage } from "@/components/product/product-image";
import { Price } from "@/components/product/price";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/motion/reveal";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return { title: "Fragrance not found" };
  const description =
    product.description?.slice(0, 155) ??
    `${product.name} — ${labelOf(CATEGORIES, product.category)} by ForgeX. ${formatPaise(product.price)}.`;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.name} · ${SITE.name}`,
      description,
      images: product.image ? [{ url: product.image, alt: product.name }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const catalog = await getCatalog();
  const related = catalog
    .filter((p) => p.productId !== product.productId && inStock(p))
    .sort(
      (a, b) =>
        Number(b.fragranceFamily === product.fragranceFamily) * 2 +
        Number(b.category === product.category) -
        (Number(a.fragranceFamily === product.fragranceFamily) * 2 + Number(a.category === product.category)),
    )
    .slice(0, 4);

  const family = FAMILIES.find((f) => f.value === product.fragranceFamily);
  const category = CATEGORIES.find((c) => c.value === product.category);
  const savings = product.mrp && product.mrp > product.price ? product.mrp - product.price : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.image ?? undefined,
    sku: String(product.productId),
    brand: { "@type": "Brand", name: SITE.name },
    category: category?.label,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: (product.price / 100).toFixed(2),
      availability: inStock(product) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE.url}/products/${product.slug}`,
    },
  };

  const details: [string, string][] = [
    ["Type", category?.label ?? "—"],
    ["Family", family?.label ?? "—"],
    ["For", titleCase(product.gender) || "—"],
    ["Availability", inStock(product) ? "In stock" : "Sold out"],
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <div className="container-x pt-24 md:pt-28">
        <nav aria-label="Breadcrumb" className="eyebrow py-1 text-stone">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/shop" className="inline-block py-3 hover:text-ink">
                Shop
              </Link>
            </li>
            <li aria-hidden>/</li>
            {category && (
              <>
                <li>
                  <Link href={`/shop?category=${category.value.toLowerCase()}`} className="inline-block py-3 hover:text-ink">
                    {category.plural}
                  </Link>
                </li>
                <li aria-hidden>/</li>
              </>
            )}
            <li aria-current="page" className="text-ink">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 gap-10 pb-24 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <div className="lg:sticky lg:top-28">
              <ProductImage
                product={product}
                priority
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="mx-auto aspect-[4/5] w-full max-w-[min(100%,62svh)] lg:max-h-[calc(100svh-8rem)] lg:max-w-none"
              />
            </div>
          </div>

          <div className="lg:col-span-5 lg:pt-6">
            <Reveal>
              <p className="eyebrow text-stone">
                {[category?.label, family?.label].filter(Boolean).join(" · ")}
              </p>
              <h1 className="display mt-4 text-[3.25rem] leading-[0.95] sm:text-7xl">{product.name}</h1>
              <Price price={product.price} mrp={product.mrp} discount={product.discount} size="lg" className="mt-6" />
              {savings > 0 && (
                <p className="mt-2 text-[13px] text-stone">
                  You save {formatPaise(savings)} on MRP. Inclusive of all taxes.
                </p>
              )}
            </Reveal>

            {product.description && (
              <Reveal delay={0.08}>
                <p className="mt-8 max-w-prose text-[17px] leading-relaxed text-ink/80">{product.description}</p>
              </Reveal>
            )}

            <Reveal delay={0.12} className="mt-10">
              <PurchasePanel product={product} />
            </Reveal>

            <Reveal delay={0.16}>
              <dl className="mt-12 divide-y divide-line border-y border-line">
                {details.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-4 text-[15px]">
                    <dt className="eyebrow text-stone">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            {(family || category) && (
              <Reveal delay={0.2}>
                <div className="mt-10 space-y-6">
                  {family && (
                    <div>
                      <h2 className="eyebrow text-stone">About the {family.label.toLowerCase()} family</h2>
                      <p className="mt-2 text-[15px] leading-relaxed text-stone">{family.notes}</p>
                    </div>
                  )}
                  {category && (
                    <div>
                      <h2 className="eyebrow text-stone">How to wear an {category.label.toLowerCase() === "attar" ? "attar" : "eau de parfum"}</h2>
                      <p className="mt-2 text-[15px] leading-relaxed text-stone">{category.blurb}</p>
                    </div>
                  )}
                </div>
              </Reveal>
            )}

            <ul className="mt-10 grid grid-cols-1 gap-2 text-[13px] text-stone">
              <li>— Free shipping on orders over {formatPaise(STORE_RULES.freeShippingAbovePaise)}</li>
              <li>— Cash on delivery, UPI, cards and net banking</li>
              <li>— GST invoice downloadable from your account</li>
            </ul>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="border-t border-line bg-bone">
          <div className="container-x py-20 md:py-28">
            <h2 id="related-title" className="display text-4xl sm:text-5xl">
              You may also like
            </h2>
            <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-6">
              {related.map((p) => (
                <li key={p.productId}>
                  <ProductCard product={p} sizes="(min-width: 768px) 25vw, 50vw" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
