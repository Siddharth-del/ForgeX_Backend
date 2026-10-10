import { useEffect, useState, type ReactNode } from "react";
import { Outlet, ScrollRestoration, useLoaderData, useLocation, useNavigation } from "react-router";
import { motion } from "framer-motion";
import { AnnouncementBar } from "@/components/navbar/AnnouncementBar";
import { Navbar } from "@/components/navbar/Navbar";
import { Footer } from "@/components/footer/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { QuickView } from "@/components/products/QuickView";
import { Toaster } from "@/components/layout/Toaster";
import { Providers } from "@/components/layout/Providers";
import { CatalogProvider } from "@/components/layout/CatalogProvider";
import { CollectionSkeleton, ProductSkeleton } from "@/pages/RouteSkeletons";
import { getProducts } from "@/lib/catalog";
import { EASE } from "@/lib/motion";
import { useCart } from "@/store/cart";
import { toast } from "@/store/toast";
import type { Product } from "@/types";

export async function loader() {
  // The shell (search, bag, quick view) uses the catalogue, but must still render if the backend is down.
  try {
    return { products: await getProducts(), catalogOk: true };
  } catch {
    return { products: [] as Product[], catalogOk: false };
  }
}

/** Site shell: announcement bar, navbar, page, footer and the global overlays (bag, search, quick view, toasts). */
export default function RootLayout() {
  const { products, catalogOk } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();
  const pending = useSlowNavigation();
  const skeleton = pending?.startsWith("/products/") ? <ProductSkeleton /> : pending?.startsWith("/collections/") ? <CollectionSkeleton /> : null;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-espresso focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>
      <Providers>
        <CatalogProvider products={products}>
          {catalogOk && <CartReconciler products={products} />}
          <AnnouncementBar />
          <Navbar />
          <main id="main" className="flex-1">
            {skeleton ?? (
              <PageTransition key={pathname}>
                <Outlet />
              </PageTransition>
            )}
          </main>
          <Footer />
          <CartDrawer />
          <SearchOverlay />
          <QuickView />
          <Toaster />
        </CatalogProvider>
      </Providers>
      <ScrollRestoration />
    </div>
  );
}

/** Keeps the bag honest: live prices and stock, and drops products that are gone or sold out. */
function CartReconciler({ products }: { products: Product[] }) {
  useEffect(() => {
    const run = () => {
      const { removed, reduced } = useCart.getState().reconcile(products);
      if (removed.length) toast({ title: `Removed from your bag: ${removed.join(", ")}`, description: "No longer available.", tone: "error" });
      if (reduced.length) toast({ title: `Quantity updated: ${reduced.join(", ")}`, description: "Your bag now matches the stock available.", tone: "error" });
    };
    if (useCart.persist.hasHydrated()) run();
    return useCart.persist.onFinishHydration(run);
  }, [products]);
  return null;
}

/** Rendered once while the first page's data loads. */
export function AppFallback() {
  return <div className="min-h-screen bg-ivory" aria-busy="true" />;
}

/** Soft cross-fade between routes. */
function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/** The path being navigated to, once loading has taken longer than `delay` ms (so fast navigations never flash a skeleton). */
function useSlowNavigation(delay = 180) {
  const navigation = useNavigation();
  const target = navigation.state === "loading" ? navigation.location.pathname : null;
  const [slow, setSlow] = useState<string | null>(null);
  useEffect(() => {
    if (!target) return;
    const t = setTimeout(() => setSlow(target), delay);
    return () => {
      clearTimeout(t);
      setSlow(null);
    };
  }, [target, delay]);
  return slow !== null && slow === target ? slow : null;
}
