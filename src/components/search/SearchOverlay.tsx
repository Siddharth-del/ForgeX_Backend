import Link from "@/components/ui/Link";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useUI } from "@/store/ui";
import { Sheet } from "@/components/ui/Sheet";
import { searchProducts } from "@/lib/scent";
import { formatPrice } from "@/lib/format";
import { useCatalog } from "@/components/layout/CatalogProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductPhoto } from "@/components/products/ProductPhoto";

const suggestions = ["Oud", "Rose", "Gift set", "Vanilla", "Musk", "Saffron"];

export function SearchOverlay() {
  const open = useUI((s) => s.searchOpen);
  const close = useUI((s) => s.closeSearch);
  const [q, setQ] = useState("");
  const products = useCatalog();
  const results = useMemo(() => searchProducts(products, q), [products, q]);

  return (
    <Sheet open={open} onClose={close} side="top" label="Search" className="bg-ivory">
      <div className="container-site flex items-center gap-4 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Search className="h-5 w-5 shrink-0 text-ink-faint" strokeWidth={1.2} />
        <input
          data-autofocus
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search perfumes, attars, notes"
          aria-label="Search the collection"
          className="h-14 flex-1 bg-transparent font-display text-[1.6rem] uppercase tracking-[0.04em] outline-none placeholder:text-ink-faint/70 md:text-[2.2rem]"
        />
        <button type="button" onClick={close} aria-label="Close search" className="flex h-11 w-11 items-center justify-center">
          <X className="h-5 w-5" strokeWidth={1.3} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain border-t border-hair pb-10 pt-6">
        <div className="container-site">
          {!q && (
            <div>
              <p className="label mb-4 text-ink-muted">Popular</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => setQ(s)} className="rounded-full border border-hair-strong px-4 py-2 text-[0.8rem] transition-colors hover:border-espresso hover:bg-espresso hover:text-ivory">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {q && results.length === 0 && <EmptyState title="No matches" body={`Nothing found for “${q}”. Try a name, or a family such as woody, floral or amber.`} />}
          {results.length > 0 && (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.slice(0, 9).map((p) => (
                <li key={p.id}>
                  <Link href={`/products/${p.slug}`} onClick={close} className="group flex items-center gap-4">
                    <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-sand">
                      <ProductPhoto src={p.images[0]?.src} alt={p.name} dark={p.world === "attar"} sizes="80px" compact className="transition-transform duration-700 group-hover:scale-105" />
                    </div>
                    <div>
                      <p className="font-display text-[1.25rem] uppercase leading-tight">{p.name}</p>
                      <p className="mt-1 text-[0.78rem] text-ink-muted">{p.family}</p>
                      <p className="mt-1.5 text-[0.85rem] tabular">
                        {p.variants.length > 1 && <span className="text-ink-faint">From </span>}
                        {formatPrice(Math.min(...p.variants.map((v) => v.price)))}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Sheet>
  );
}
