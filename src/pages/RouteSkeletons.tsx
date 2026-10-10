import { ProductGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

/** Shown while a collection page's data is on its way. */
export function CollectionSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/5] max-h-[78vh] w-full sm:aspect-[16/10] lg:aspect-[21/8]" />
      <div className="container-site py-14">
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}

/** Shown while a product page's data is on its way. */
export function ProductSkeleton() {
  return (
    <div className="container-site grid grid-cols-1 gap-10 py-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16" role="status" aria-label="Loading product">
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="space-y-5 pt-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-14 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-3">
          <Skeleton className="h-16 w-32" />
          <Skeleton className="h-16 w-32" />
        </div>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}
