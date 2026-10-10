import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/products/ProductCard";
import { FragranceFilter } from "@/components/discovery/FragranceFilter";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { scentFamilies, genderLabel } from "@/lib/scent";
import { defaultVariant } from "@/hooks/useAddToCart";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";
import type { Gender, Product, ProductType, ScentFamily } from "@/types";

type Sort = "featured" | "discount" | "price-asc" | "price-desc" | "newest";
const sorts: { id: Sort; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "discount", label: "Biggest saving" },
  { id: "price-asc", label: "Price, low to high" },
  { id: "price-desc", label: "Price, high to low" },
  { id: "newest", label: "Newest" },
];
const prices = [
  { id: "u1000", label: "Under ₹1,000", test: (n: number) => n < 1000 },
  { id: "1000-2000", label: "₹1,000 – ₹2,000", test: (n: number) => n >= 1000 && n <= 2000 },
  { id: "o2000", label: "Above ₹2,000", test: (n: number) => n > 2000 },
];
const types: { id: ProductType; label: string }[] = [
  { id: "perfume", label: "Perfume" },
  { id: "attar", label: "Attar" },
];

interface Filters {
  families: ScentFamily[];
  genders: Gender[];
  types: ProductType[];
  price: string | null;
  inStock: boolean;
}
const empty: Filters = { families: [], genders: [], types: [], price: null, inStock: false };

export function CollectionView({ products, tone = "dark" }: { products: Product[]; tone?: "light" | "dark" }) {
  const [filters, setFilters] = useState<Filters>(empty);
  const [sort, setSort] = useState<Sort>("featured");
  const [sheet, setSheet] = useState(false);
  const light = tone === "light";

  const showTypes = new Set(products.map((p) => p.type)).size > 1;
  const availableFamilies = useMemo(() => new Set(products.flatMap((p) => p.families)), [products]);
  const showGender = new Set(products.map((p) => p.gender)).size > 1;

  const results = useMemo(() => {
    const priceTest = prices.find((p) => p.id === filters.price)?.test;
    const list = products.filter((p) => {
      const v = defaultVariant(p);
      if (filters.families.length && !filters.families.some((f) => p.families.includes(f))) return false;
      if (filters.genders.length && !filters.genders.includes(p.gender)) return false;
      if (filters.types.length && !filters.types.includes(p.type)) return false;
      if (priceTest && !priceTest(v.price)) return false;
      if (filters.inStock && !p.variants.some((x) => x.inStock)) return false;
      return true;
    });
    const price = (p: Product) => defaultVariant(p).price;
    const sorted = [...list];
    switch (sort) {
      case "discount":
        sorted.sort((a, b) => b.discount - a.discount);
        break;
      case "price-asc":
        sorted.sort((a, b) => price(a) - price(b));
        break;
      case "price-desc":
        sorted.sort((a, b) => price(b) - price(a));
        break;
      case "newest":
        sorted.sort((a, b) => b.productId - a.productId);
        break;
      default:
        // In-stock first, then the order the backend lists them in.
        sorted.sort((a, b) => Number(b.variants[0].inStock) - Number(a.variants[0].inStock) || a.productId - b.productId);
    }
    return sorted;
  }, [products, filters, sort]);

  const activeChips = [
    ...filters.families.map((f) => ({ key: `f-${f}`, label: scentFamilies.find((s) => s.id === f)!.label, clear: () => setFilters((x) => ({ ...x, families: x.families.filter((y) => y !== f) })) })),
    ...filters.genders.map((g) => ({ key: `g-${g}`, label: genderLabel[g], clear: () => setFilters((x) => ({ ...x, genders: x.genders.filter((y) => y !== g) })) })),
    ...filters.types.map((t) => ({ key: `t-${t}`, label: types.find((y) => y.id === t)!.label, clear: () => setFilters((x) => ({ ...x, types: x.types.filter((y) => y !== t) })) })),
    ...(filters.price ? [{ key: "price", label: prices.find((p) => p.id === filters.price)!.label, clear: () => setFilters((x) => ({ ...x, price: null })) }] : []),
    ...(filters.inStock ? [{ key: "stock", label: "In stock", clear: () => setFilters((x) => ({ ...x, inStock: false })) }] : []),
  ];

  const toggleIn = <K extends "genders" | "types">(key: K, val: Filters[K][number]) =>
    setFilters((x) => {
      const arr = x[key] as string[];
      return { ...x, [key]: arr.includes(val as string) ? arr.filter((y) => y !== val) : [...arr, val] };
    });

  const panel = (
    <div className="space-y-9">
      <FilterGroup title="Scent family" light={light}>
        <FragranceFilter value={filters.families} onChange={(families) => setFilters((x) => ({ ...x, families }))} tone={tone} available={availableFamilies} />
      </FilterGroup>
      {showGender && (
        <FilterGroup title="Wear it" light={light}>
          {(["him", "her", "unisex"] as Gender[]).map((g) => (
            <Check key={g} label={genderLabel[g]} checked={filters.genders.includes(g)} onChange={() => toggleIn("genders", g)} light={light} />
          ))}
        </FilterGroup>
      )}
      {showTypes && (
        <FilterGroup title="Type" light={light}>
          {types.map((t) => (
            <Check key={t.id} label={t.label} checked={filters.types.includes(t.id)} onChange={() => toggleIn("types", t.id)} light={light} />
          ))}
        </FilterGroup>
      )}
      <FilterGroup title="Price" light={light}>
        {prices.map((p) => (
          <Check key={p.id} label={p.label} radio checked={filters.price === p.id} onChange={() => setFilters((x) => ({ ...x, price: x.price === p.id ? null : p.id }))} light={light} />
        ))}
      </FilterGroup>
      <FilterGroup title="Availability" light={light}>
        <Check label="In stock only" checked={filters.inStock} onChange={() => setFilters((x) => ({ ...x, inStock: !x.inStock }))} light={light} />
      </FilterGroup>
    </div>
  );

  return (
    <div className={cn(light ? "text-ivory" : "text-ink")}>
      {/* Toolbar */}
      <div className={cn("sticky top-[4.25rem] z-30 -mx-gutter flex items-center justify-between gap-4 px-gutter py-3 backdrop-blur-xl md:top-[4.75rem]", light ? "bg-espresso-deep/85" : "bg-ivory/85")}>
        <button type="button" onClick={() => setSheet(true)} className="label flex h-11 items-center gap-2.5 lg:hidden">
          <SlidersHorizontal className="h-4 w-4" strokeWidth={1.3} /> Filter {activeChips.length > 0 && `(${activeChips.length})`}
        </button>
        <p className={cn("hidden text-[0.8rem] lg:block", light ? "text-ivory/60" : "text-ink-muted")} aria-live="polite">
          {results.length} {results.length === 1 ? "fragrance" : "fragrances"}
        </p>
        <label className="flex items-center gap-3">
          <span className={cn("label hidden sm:inline", light ? "text-ivory/60" : "text-ink-muted")}>Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort products"
            className={cn("h-11 cursor-pointer border bg-transparent pl-3 pr-8 text-[0.8rem] outline-none", light ? "border-ivory/25 [&>option]:text-ink" : "border-espresso/20")}
          >
            {sorts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-14">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-40">{panel}</div>
        </aside>

        <div>
          <AnimatePresence initial={false}>
            {activeChips.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-8 flex flex-wrap items-center gap-2 overflow-hidden">
                {activeChips.map((c) => (
                  <button key={c.key} type="button" onClick={c.clear} className={cn("inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[0.75rem]", light ? "border-ivory/30" : "border-espresso/25")}>
                    {c.label} <X className="h-3 w-3" strokeWidth={1.5} />
                    <span className="sr-only">Remove filter</span>
                  </button>
                ))}
                <button type="button" onClick={() => setFilters(empty)} className="label ml-2 underline-offset-4 hover:underline">
                  Clear all
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {results.length === 0 ? (
            <EmptyState tone={tone} title="No fragrances found" body="Nothing matches every filter you chose. Remove one or two to see more." action={<Button variant={light ? "light" : "primary"} onClick={() => setFilters(empty)}>Clear all filters</Button>} />
          ) : (
            <motion.ul layout className="grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 md:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {results.map((p, i) => (
                  <motion.li key={p.id} layout initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.6, ease: EASE, delay: Math.min(i, 8) * 0.04 }}>
                    <ProductCard product={p} tone={tone} priority={i < 3} sizes="(min-width: 1024px) 24vw, (min-width: 768px) 31vw, 47vw" />
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </div>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} side="bottom" label="Filter fragrances" className={light ? "bg-espresso-deep text-ivory" : ""}>
        <div className="flex items-center justify-between border-b border-hair px-gutter py-4">
          <p className="font-display text-2xl uppercase">Filter</p>
          <button type="button" data-autofocus onClick={() => setSheet(false)} aria-label="Close filters" className="flex h-11 w-11 items-center justify-center">
            <X className="h-5 w-5" strokeWidth={1.3} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-gutter py-7">{panel}</div>
        <div className="grid grid-cols-2 gap-3 border-t border-hair px-gutter py-4 safe-bottom">
          <Button variant={light ? "outline-light" : "outline"} onClick={() => setFilters(empty)}>
            Clear
          </Button>
          <Button variant={light ? "light" : "primary"} onClick={() => setSheet(false)}>
            Show {results.length}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function FilterGroup({ title, children, light }: { title: string; children: React.ReactNode; light: boolean }) {
  return (
    <fieldset>
      <legend className={cn("label mb-4", light ? "text-gold-soft" : "text-ink")}>{title}</legend>
      <div className="flex flex-col gap-1">{children}</div>
    </fieldset>
  );
}

function Check({ label, checked, onChange, light, radio }: { label: string; checked: boolean; onChange: () => void; light: boolean; radio?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5 text-[0.86rem]">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          "flex h-4 w-4 items-center justify-center border transition-colors peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2",
          radio && "rounded-full",
          checked ? (light ? "border-ivory bg-ivory" : "border-espresso bg-espresso") : light ? "border-ivory/40" : "border-espresso/40",
        )}
      >
        {checked && <span className={cn("h-1.5 w-1.5", radio ? "rounded-full" : "", light ? "bg-espresso" : "bg-ivory")} />}
      </span>
      {label}
    </label>
  );
}
