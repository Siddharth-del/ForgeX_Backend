import { createContext, useContext, type ReactNode } from "react";
import type { Product } from "@/types";

const CatalogContext = createContext<Product[]>([]);

/** Makes the product list (fetched once on the server in the root layout) available to client UI like search and the cart. */
export function CatalogProvider({ products, children }: { products: Product[]; children: ReactNode }) {
  return <CatalogContext.Provider value={products}>{children}</CatalogContext.Provider>;
}

export const useCatalog = () => useContext(CatalogContext);
