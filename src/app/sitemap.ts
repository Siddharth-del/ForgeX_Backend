import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/server/catalog";
import { CATEGORIES, SITE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/+$/, "");
  const statics: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    ...CATEGORIES.map((c) => ({ url: `${base}/shop?category=${c.value.toLowerCase()}`, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
  const products = await getCatalog().catch(() => []);
  return [
    ...statics,
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
