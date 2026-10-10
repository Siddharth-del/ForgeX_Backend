import { HeroSection } from "@/components/hero/HeroSection";
import { WorldsSplit } from "@/components/collections/WorldsSplit";
import { ShopByCategory } from "@/components/category/ShopByCategory";
import { Bestsellers } from "@/components/products/Bestsellers";
import { GiftingBanner } from "@/components/gifting/GiftingBanner";
import { BuildYourBoxTeaser } from "@/components/box/BuildYourBoxTeaser";
import { FragranceDiscovery } from "@/components/discovery/FragranceDiscovery";
import { JournalSection } from "@/components/editorial/JournalSection";
import { Testimonials } from "@/components/testimonials/Testimonials";
import { WhyChooseUs } from "@/components/brand/WhyChooseUs";
import { CatalogEmpty, CatalogUnavailable } from "@/components/layout/CatalogUnavailable";
import { getCategories, getCollectionTabs, getJournal, getProducts, getTestimonials } from "@/lib/catalog";
import { site } from "@/lib/site";
import { useLoaderData } from "react-router";
import { usePageMeta } from "@/hooks/usePageMeta";

export async function loader() {
  const [journal, testimonials] = await Promise.all([getJournal(), getTestimonials()]);
  try {
    const [products, categories, tabs] = await Promise.all([getProducts(), getCategories(), getCollectionTabs()]);
    return { products, categories, tabs, journal, testimonials, catalogError: null as string | null };
  } catch (e) {
    // Editorial sections still render; product sections show a retry state instead of sample data.
    return { products: [], categories: [], tabs: { him: [], her: [], attar: [] }, journal, testimonials, catalogError: e instanceof Error ? e.message : "We couldn't load our fragrances." };
  }
}

export default function HomePage() {
  const { products, categories, tabs, journal, testimonials, catalogError } = useLoaderData<typeof loader>();
  usePageMeta();
  const newest = [...products].sort((a, b) => b.productId - a.productId);

  return (
    <>
      <HeroSection />
      <WorldsSplit />
      {catalogError ? (
        <section className="bg-sand">
          <div className="container-site py-section">
            <CatalogUnavailable message={catalogError} />
          </div>
        </section>
      ) : products.length === 0 ? (
        <section className="bg-sand">
          <div className="container-site py-section">
            <CatalogEmpty />
          </div>
        </section>
      ) : (
        <>
          <ShopByCategory categories={categories} />
          <Bestsellers data={tabs} />
          <GiftingBanner sets={newest} />
          {site.features.buildYourBox && <BuildYourBoxTeaser products={products} />}
          <FragranceDiscovery products={products} />
        </>
      )}
      <JournalSection articles={journal} />
      <Testimonials items={testimonials} products={products} />
      <WhyChooseUs />
    </>
  );
}
