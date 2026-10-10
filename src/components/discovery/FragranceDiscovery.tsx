import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { FragranceFilter } from "./FragranceFilter";
import { ProductCard } from "@/components/products/ProductCard";
import { Button, TextLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { scentFamilies } from "@/lib/scent";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";
import type { Product, ScentFamily, World } from "@/types";

export function FragranceDiscovery({ products }: { products: Product[] }) {
  const [families, setFamilies] = useState<ScentFamily[]>([]);
  const [world, setWorld] = useState<World | "all">("all");

  const pool = useMemo(() => products.filter((p) => world === "all" || p.world === world), [products, world]);
  // Match any chosen note; fragrances carrying more of them rank first.
  const results = useMemo(() => {
    if (families.length === 0) return pool;
    return pool
      .map((p, i) => ({ p, i, score: families.filter((f) => p.families.includes(f)).length }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .map((x) => x.p);
  }, [pool, families]);
  const counts = useMemo(() => Object.fromEntries(scentFamilies.map((f) => [f.id, pool.filter((p) => p.families.includes(f.id)).length])), [pool]);
  const labels = families.map((f) => scentFamilies.find((s) => s.id === f)?.label);

  return (
    <section aria-labelledby="discovery-title" className="bg-ivory py-section">
      <div className="container-site">
        <Reveal className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
          <div>
            <p className="eyebrow text-gold-deep">Fragrance finder</p>
            <h2 id="discovery-title" className="mt-4 text-display-md uppercase">
              Find your
              <br />
              signature scent
            </h2>
          </div>
          <div>
            <p className="max-w-md text-[0.95rem] text-ink-muted">Choose the scent families you love and we will surface every fragrance in them. Switch between attars and perfumes at any time.</p>
            <div className="mt-6 flex flex-wrap gap-2" role="radiogroup" aria-label="World">
              {(["all", "attar", "perfume"] as const).map((w) => (
                <button key={w} type="button" role="radio" aria-checked={world === w} onClick={() => setWorld(w)} className={cn("label border-b pb-1 transition-colors", world === w ? "border-espresso text-ink" : "border-transparent text-ink-faint hover:text-ink-muted")}>
                  {w === "all" ? "Everything" : w === "attar" ? "Attars" : "Perfumes"}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <FragranceFilter value={families} onChange={setFamilies} counts={counts} available={new Set(products.flatMap((p) => p.families))} rail className="mt-8 md:mt-10" />

        <div className="mt-6 flex items-center justify-between border-b border-hair pb-4 text-[0.8rem] text-ink-muted" aria-live="polite">
          <span>
            {families.length === 0 ? (
              <>The full collection. Choose a family to narrow it down.</>
            ) : (
              <>
                {results.length} {results.length === 1 ? "fragrance" : "fragrances"} with {labels.slice(0, -1).join(", ")}
                {labels.length > 1 && " or "}
                {labels[labels.length - 1]}
              </>
            )}
          </span>
          {families.length > 0 && (
            <button type="button" onClick={() => setFamilies([])} className="label text-ink underline-offset-4 hover:underline">
              Clear
            </button>
          )}
        </div>

        {/* Swipeable rail on phones, an edited grid from tablets up */}
        <motion.ul
          layout
          layoutScroll
          className="no-scrollbar snap-x-mandatory -mx-gutter mt-8 flex scroll-px-gutter gap-4 overflow-x-auto px-gutter pb-2 md:mx-0 md:mt-10 md:grid md:grid-cols-3 md:gap-x-6 md:gap-y-12 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {results.slice(0, 8).map((p) => (
              <motion.li key={p.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.55, ease: EASE }} className="w-[64vw] shrink-0 snap-start xs:w-[46vw] md:w-auto">
                <ProductCard product={p} sizes="(min-width: 1280px) 22vw, (min-width: 768px) 31vw, 64vw" />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>

        {results.length === 0 && (
          <EmptyState
            title="Nothing in this world yet"
            body={`None of our ${world === "attar" ? "attars" : "perfumes"} carry ${labels.join(" or ")}. Try the other world or another note.`}
            action={
              <Button variant="outline" onClick={() => setWorld("all")}>
                Show everything
              </Button>
            }
          />
        )}
        {results.length > 8 && (
          <div className="mt-12 flex justify-center">
            <TextLink href="/collections/all">See all {results.length} in the collection</TextLink>
          </div>
        )}
      </div>
    </section>
  );
}
