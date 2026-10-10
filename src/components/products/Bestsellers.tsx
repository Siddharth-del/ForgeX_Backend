import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TextLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "./ProductCard";
import { ProductCarousel } from "./ProductCarousel";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";
import type { Product } from "@/types";

type Tab = "him" | "her" | "attar";
const allTabs: { id: Tab; label: string; href: string }[] = [
  { id: "him", label: "Him", href: "/collections/him" },
  { id: "her", label: "Her", href: "/collections/her" },
  { id: "attar", label: "Attar", href: "/collections/attars" },
];

/**
 * Tabbed product carousel (newest first). The backend has no sales ranking, so this is
 * presented as the collection rather than "bestsellers".
 */
export function Bestsellers({ data }: { data: Record<Tab, Product[]> }) {
  const tabs = allTabs.filter((t) => data[t.id].length > 0);
  const [picked, setTab] = useState<Tab | null>(null);
  const tab = picked && tabs.some((t) => t.id === picked) ? picked : tabs[0]?.id;
  const current = tabs.find((t) => t.id === tab);
  if (!tab || !current) return null;

  return (
    <section aria-labelledby="bestsellers-title" className="overflow-hidden bg-ivory py-section">
      <div className="container-site">
        <Reveal>
          <SectionHeading eyebrow="The collection" title={<span id="bestsellers-title">Our fragrances</span>} action={<TextLink href={current.href}>View all {current.label}</TextLink>} />
        </Reveal>

        <div role="tablist" aria-label="Bestseller categories" className="no-scrollbar -mx-gutter mt-10 flex gap-8 overflow-x-auto border-b border-hair px-gutter md:mx-0 md:px-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              aria-controls="bestseller-panel"
              onClick={() => setTab(t.id)}
              className={cn("relative shrink-0 pb-4 text-[0.72rem] font-medium uppercase tracking-[0.26em] transition-colors duration-300", tab === t.id ? "text-ink" : "text-ink-faint hover:text-ink-muted")}
            >
              {t.label}
              {tab === t.id && <motion.span layoutId="bestseller-tab" className="absolute inset-x-0 -bottom-px h-px bg-espresso" transition={{ duration: 0.6, ease: EASE }} />}
            </button>
          ))}
        </div>

        <div id="bestseller-panel" role="tabpanel" className="mt-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.55, ease: EASE }}>
              <ProductCarousel label={`${current.label} fragrances`}>
                {data[tab].map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i < 2} />
                ))}
              </ProductCarousel>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
