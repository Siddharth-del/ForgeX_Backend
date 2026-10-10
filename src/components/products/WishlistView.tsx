import { useHydrated } from "@/hooks/useHydrated";
import { useWishlist } from "@/store/wishlist";
import { useCatalog } from "@/components/layout/CatalogProvider";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";

export function WishlistView() {
  const hydrated = useHydrated();
  const ids = useWishlist((s) => s.ids);
  const products = useCatalog().filter((p) => ids.includes(p.id));
  if (!hydrated) return <ProductGridSkeleton count={4} />;
  if (!products.length)
    return (
      <EmptyState
        title="Nothing saved yet"
        body="Tap the heart on any fragrance to keep it here for later."
        action={
          <ButtonLink href="/collections/all" arrow>
            Discover the collection
          </ButtonLink>
        }
      />
    );
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} sizes="(min-width: 1280px) 22vw, (min-width: 768px) 31vw, 47vw" />
      ))}
    </div>
  );
}
