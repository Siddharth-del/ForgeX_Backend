import type { Category, FragranceFamily, Gender, Product } from "@/lib/types";
import { getCatalog, inStock } from "@/lib/server/catalog";
import { STORE_RULES } from "@/lib/constants";
import { formatPaise } from "@/lib/utils";
import { Hero } from "@/components/home/hero";
import {
  CategorySplit,
  ClosingCta,
  Collection,
  Families,
  Faq,
  ForWhom,
  HowItWorks,
  Marquee,
} from "@/components/home/sections";
import { CatalogUnavailable } from "@/components/states/catalog-unavailable";

// Rendered per request; the catalogue fetch itself is cached for 60s (see lib/server/catalog)
export const dynamic = "force-dynamic";

function countBy<K extends string>(list: Product[], key: (p: Product) => K | null, keys: K[]) {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const p of list) {
    const k = key(p);
    if (k && k in out) out[k] += 1;
  }
  return out;
}

export default async function HomePage() {
  let catalog: Product[] | null = null;
  try {
    catalog = await getCatalog();
  } catch {
    catalog = null;
  }

  const available = catalog?.filter(inStock) ?? [];
  // Hero: the in-stock fragrance with a photo and the best saving; otherwise the first in stock
  const featured =
    [...available].filter((p) => p.image).sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0))[0] ??
    available[0] ??
    null;
  const collection = available.filter((p) => p !== featured).slice(0, 8);
  const list = catalog ?? [];

  return (
    <>
      <Hero featured={featured} />
      <Marquee
        items={[
          "Eau de parfum",
          "Alcohol-free attars",
          `Free shipping over ${formatPaise(STORE_RULES.freeShippingAbovePaise)}`,
          "Cash on delivery",
          "GST invoice with every order",
        ]}
      />
      {catalog === null ? (
        <CatalogUnavailable />
      ) : (
        <Collection products={collection.length ? collection : available.slice(0, 8)} />
      )}
      <CategorySplit counts={countBy<Category>(list, (p) => p.category, ["PERFUME", "ATTAR"])} />
      <Families
        counts={countBy<FragranceFamily>(list, (p) => p.fragranceFamily, [
          "WOODY",
          "AMBER",
          "FLORAL",
          "AQUATIC",
          "AROMATIC",
          "EARTHY",
          "MIXED",
        ])}
      />
      <ForWhom counts={countBy<Gender>(list, (p) => p.gender, ["MEN", "WOMEN", "UNISEX"])} />
      <HowItWorks />
      <Faq />
      <ClosingCta />
    </>
  );
}
