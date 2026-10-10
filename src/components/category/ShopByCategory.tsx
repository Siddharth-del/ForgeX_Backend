import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { CategoryCard } from "./CategoryCard";
import type { Category } from "@/types";

/** Editorial category grid on desktop, a swipeable rail on mobile. */
export function ShopByCategory({ categories }: { categories: Category[] }) {
  // Two large cards, then the rest share the second row evenly (only categories with products are shown).
  const rest = Math.max(0, categories.length - 2);
  const restSpan = ({ 1: "lg:col-span-12", 2: "lg:col-span-6", 3: "lg:col-span-4" } as Record<number, string>)[rest] ?? "lg:col-span-3";
  const spans = categories.length === 1 ? ["lg:col-span-12 lg:h-[36rem]"] : ["lg:col-span-7 lg:h-[36rem]", "lg:col-span-5 lg:h-[36rem]", ...Array.from({ length: rest }, () => `${restSpan} lg:h-[27rem]`)];
  return (
    <section aria-labelledby="categories-title" className="bg-sand py-section">
      <div className="container-site">
        <Reveal>
          <SectionHeading eyebrow="Shop by category" title={<span id="categories-title">Find it by feeling</span>} intro="From the depth of oud to the ease of a daily spray. Begin where your mood takes you." />
        </Reveal>
        <div className="no-scrollbar snap-x-mandatory -mx-gutter mt-12 flex scroll-px-gutter gap-3 overflow-x-auto px-gutter lg:mx-0 lg:grid lg:grid-cols-12 lg:gap-3 lg:overflow-visible lg:px-0">
          {categories.map((c, i) => (
            <Reveal key={c.slug} delay={(i % 4) * 0.08} className={`w-[78vw] shrink-0 snap-start xs:w-[62vw] sm:w-[44vw] lg:w-auto ${spans[i] ?? "lg:col-span-4"}`}>
              <CategoryCard category={c} className="aspect-[4/5] h-full lg:aspect-auto" sizes={i < 2 ? "(min-width: 1024px) 58vw, 80vw" : `(min-width: 1024px) ${rest <= 2 ? 50 : rest === 3 ? 33 : 25}vw, 80vw`} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
