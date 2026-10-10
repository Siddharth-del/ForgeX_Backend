import { createContext, useContext, type ReactNode } from "react";
import type { BundleDTO } from "@/lib/api/types";
import type { Product } from "@/types";

const CatalogContext = createContext<Product[]>([]);
/** The Build Your Own Box on sale: null = none, undefined = unknown (the request failed). */
const BoxContext = createContext<BundleDTO | null | undefined>(undefined);

/** Makes the product list (fetched once in the root layout) and the box available to client UI like search and the cart. */
export function CatalogProvider({ products, box, children }: { products: Product[]; box?: BundleDTO | null; children: ReactNode }) {
  return (
    <CatalogContext.Provider value={products}>
      <BoxContext.Provider value={box}>{children}</BoxContext.Provider>
    </CatalogContext.Provider>
  );
}

export const useCatalog = () => useContext(CatalogContext);
export const useBox = () => useContext(BoxContext);
