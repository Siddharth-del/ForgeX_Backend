import { CollectionHero } from "@/components/collections/CollectionHero";
import { CollectionView } from "@/components/collections/CollectionView";
import { CollectionSwitcher } from "@/components/collections/CollectionSwitcher";
import { getCollection, getCollectionProducts, retiredCollections } from "@/lib/catalog";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { redirect, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { notFound } from "@/lib/router";
import { usePageMeta } from "@/hooks/usePageMeta";

export async function loader({ params }: LoaderFunctionArgs) {
  const slug = params.slug ?? "";
  if (retiredCollections[slug]) throw redirect(retiredCollections[slug]);
  const collection = await getCollection(slug);
  if (!collection) notFound();
  const products = await getCollectionProducts(slug);
  return { collection, products };
}

export default function CollectionPage() {
  const { collection, products } = useLoaderData<typeof loader>();
  usePageMeta(collection.title, collection.description);
  const dark = collection.theme === "dark";

  return (
    <div className={cn(dark ? "bg-espresso-deep" : "bg-ivory")}>
      <CollectionHero collection={collection} count={products.length} />
      <div className="container-site pb-section pt-10 md:pt-14">
        {collection.world && (
          <div className="mb-10 flex justify-center">
            <CollectionSwitcher value={collection.world} tone={dark ? "light" : "dark"} id="collection-world" />
          </div>
        )}
        {products.length ? (
          <CollectionView products={products} tone={dark ? "light" : "dark"} />
        ) : (
          <EmptyState
            tone={dark ? "light" : "dark"}
            title="Nothing here yet"
            body="There are no fragrances in this collection right now."
            action={
              <ButtonLink href="/collections/all" variant={dark ? "light" : "primary"} arrow>
                Shop all fragrances
              </ButtonLink>
            }
          />
        )}
      </div>
    </div>
  );
}
