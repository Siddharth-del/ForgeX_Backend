import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/lib/server/catalog";
import { applyShopQuery, parseShopQuery, shopHref, type ShopQuery } from "@/lib/catalog-query";
import { CATEGORIES, FAMILIES, GENDERS, labelOf } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/product/product-card";
import { ShopToolbar } from "@/components/product/shop-toolbar";
import { CatalogUnavailable } from "@/components/states/catalog-unavailable";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function heading(q: ShopQuery) {
  if (q.q) return { eyebrow: "Search", title: `“${q.q}”` };
  const cat = CATEGORIES.find((c) => c.value === q.category);
  const fam = FAMILIES.find((f) => f.value === q.family);
  const gen = labelOf(GENDERS, q.gender);
  const title = [fam?.label, cat?.plural ?? "Fragrances"].filter(Boolean).join(" ");
  return {
    eyebrow: gen || "The collection",
    title: q.category || q.family ? title : gen ? "Fragrances" : "All fragrances",
    blurb: fam?.notes ?? cat?.blurb,
  };
}

export async function generateMetadata({ searchParams }: PageProps<"/shop">): Promise<Metadata> {
  const q = parseShopQuery(await searchParams);
  const h = heading(q);
  const title = q.q ? `Search: ${q.q}` : [h.eyebrow !== "The collection" ? h.eyebrow : "", h.title].filter(Boolean).join(" — ");
  return {
    title,
    description: h.blurb ?? "Shop ForgeX perfumes and attars by type, family and who they're for.",
    alternates: { canonical: shopHref({ ...q, page: 1, sort: "featured" }) },
    // Search result pages shouldn't be indexed
    robots: q.q ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const query = parseShopQuery(await searchParams);
  const h = heading(query);

  let catalog;
  try {
    catalog = await getCatalog();
  } catch {
    return (
      <div className="pt-24">
        <CatalogUnavailable />
      </div>
    );
  }
  const { items, total, pages, page } = applyShopQuery(catalog, query);

  return (
    <>
      <header className="container-x pb-10 pt-32 md:pb-14 md:pt-40">
        <p className="eyebrow text-stone">{h.eyebrow}</p>
        <h1 className="display mt-4 text-[3.25rem] sm:text-7xl lg:text-8xl">{h.title}</h1>
        {h.blurb && <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-stone">{h.blurb}</p>}
      </header>

      <ShopToolbar query={query} total={total} />

      <section aria-label="Products" className="container-x py-12 md:py-16">
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="display text-4xl">Nothing matches — yet.</p>
            <p className="mt-3 max-w-sm text-[15px] text-stone">
              {query.q ? "Try a different name, note or family." : "Try removing a filter or two."}
            </p>
            <ButtonLink href="/shop" variant="outline" size="sm" className="mt-8">
              See everything
            </ButtonLink>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 md:gap-y-16 xl:grid-cols-4">
            {items.map((p, i) => (
              <li key={p.productId}>
                <ProductCard product={p} priority={i < 4} sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw" />
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-20 flex items-center justify-center gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={shopHref({ ...query, page: n })}
                aria-current={n === page ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm tabular-nums transition-colors",
                  n === page ? "bg-ink text-bone" : "hover:bg-ink/5",
                )}
              >
                {n}
              </Link>
            ))}
          </nav>
        )}
      </section>
    </>
  );
}
