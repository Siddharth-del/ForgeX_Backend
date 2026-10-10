import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/store/auth";
import { useCart } from "@/store/cart";
import { useUI } from "@/store/ui";
import { useSignInToShop } from "@/hooks/useAddToCart";
import { toast } from "@/store/toast";
import { Button } from "@/components/ui/Button";
import { CollectionSwitcher } from "@/components/collections/CollectionSwitcher";
import { formatPrice } from "@/lib/format";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { rupees, type BundleDTO } from "@/lib/api/types";
import type { Product, World } from "@/types";
import { ProductPhoto } from "@/components/products/ProductPhoto";

const miniVariant = (p: Product) => p.variants[0];

interface Props {
  /** The box on sale, from the backend (GET /api/public/bundles): its size, price and rules. */
  box: BundleDTO;
  products: Product[];
  compact?: boolean;
  tone?: "light" | "dark";
}

/**
 * Pick the box's number of fragrances for its fixed price (both set by the backend).
 * Adds the box to the shopper's server cart (POST /api/carts/bundles/{id}): the server keeps
 * differently filled boxes as separate lines and charges its own box price.
 */
export function BoxBuilder({ box, products, compact = false, tone = "dark" }: Props) {
  const [selected, setSelected] = useState<Product[]>([]);
  const [world, setWorld] = useState<World | "all">("all");
  const addBox = useCart((s) => s.addBox);
  const adding = useCart((s) => s.pending.includes("add-box"));
  const openCart = useUI((s) => s.openCart);
  const signIn = useSignInToShop();
  const size = box.itemCount;
  const price = rupees(box.price);
  const full = selected.length === size;
  const light = tone === "light";

  // Only products the box allows and that can actually be sent.
  const eligible = useMemo(
    () =>
      products.filter(
        (p) =>
          miniVariant(p)?.inStock &&
          Number.isSafeInteger(p.productId) &&
          p.productId > 0 &&
          (!box.allowedCategory || (box.allowedCategory === "ATTAR" ? p.type === "attar" : p.type === "perfume")),
      ),
    [products, box.allowedCategory],
  );
  const list = useMemo(() => (world === "all" ? eligible : eligible.filter((p) => p.world === world)), [eligible, world]);
  const value = selected.reduce((n, p) => n + miniVariant(p).price, 0);

  const toggle = (p: Product) => {
    setSelected((s) => {
      if (s.some((x) => x.id === p.id)) return s.filter((x) => x.id !== p.id);
      if (s.length >= size) {
        toast({ title: `Your box holds ${size} fragrances`, description: "Remove one to swap it for another." });
        return s;
      }
      return [...s, p];
    });
  };

  /** Adds the box to the server cart: the server checks the choice and stock and sets the price. */
  const add = async () => {
    if (!full || adding) return;
    if (!useAuth.getState().token) return signIn();
    const chosen = selected;
    const ok = await addBox(
      box.bundleId,
      chosen.map((p) => p.productId),
      1,
    );
    if (!ok) return; // the server's reason is shown; the selection stays so it can be changed
    toast({ title: "Your box is in the bag", description: chosen.map((p) => p.name).join(" · "), image: chosen[0].images[0]?.src ?? "", action: { label: "View bag", onClick: openCart } });
    setSelected([]);
  };

  const summary = (
    <div>
      {/* Slots */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: size }).map((_, i) => {
          const p = selected[i];
          return (
            <div key={i} className={cn("relative aspect-[4/5] overflow-hidden border", light ? "border-ivory/25" : "border-espresso/20", !p && "border-dashed")}>
              <AnimatePresence mode="popLayout">
                {p ? (
                  <motion.div key={p.id} initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.6, ease: EASE }} className={cn("absolute inset-0", p.world === "attar" ? "bg-espresso" : "bg-sand")}>
                    <ProductPhoto src={p.images[0]?.src} alt={p.name} dark={p.world === "attar"} sizes="(min-width: 1024px) 14vw, 30vw" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-espresso-deep/80 to-transparent p-2.5 pt-8 text-ivory">
                      <p className="truncate font-display text-[0.95rem] uppercase leading-tight md:text-[1.1rem]">{p.name}</p>
                      <p className="text-[0.66rem] text-ivory/70">{miniVariant(p).size}</p>
                    </div>
                    <button type="button" onClick={() => toggle(p)} aria-label={`Remove ${p.name} from box`} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ivory/85 text-espresso">
                      <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                    <span className={cn("font-display text-3xl font-light", light ? "text-ivory/40" : "text-ink-faint")}>{i + 1}</span>
                    <span className={cn("text-[0.6rem] uppercase tracking-[0.2em]", light ? "text-ivory/45" : "text-ink-faint")}>Choose</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className={cn("mt-5 flex flex-wrap items-center justify-between gap-4 border-y py-4", light ? "border-ivory/15" : "border-hair")}>
        <p className="text-[0.85rem]" aria-live="polite">
          {full ? (
            <>
              Box complete.{" "}
              {value > price && (
                <span className={light ? "text-gold-soft" : "text-gold-deep"}>
                  You save {formatPrice(value - price)}
                </span>
              )}
            </>
          ) : (
            <>
              {selected.length} of {size} chosen
              <span className={light ? "text-ivory/50" : "text-ink-faint"}> · choose {size - selected.length} more</span>
            </>
          )}
        </p>
        <div className="tabular flex items-baseline gap-2">
          {value > price && <span className={cn("text-[0.8rem] line-through", light ? "text-ivory/40" : "text-ink-faint")}>{formatPrice(value)}</span>}
          <span className="text-lg font-medium">{formatPrice(price)}</span>
        </div>
      </div>
      <Button onClick={add} disabled={!full || adding} aria-busy={adding} variant={light ? "light" : "primary"} size="lg" arrow className="mt-4 w-full">
        {adding ? "Adding your box" : full ? "Add box to cart" : `Select ${size - selected.length} more`}
      </Button>
      {eligible.length < size && (
        <p role="status" className={cn("mt-3 text-[0.8rem]", light ? "text-ivory/60" : "text-ink-muted")}>
          Not enough fragrances are in stock to fill this box right now. Please check back soon.
        </p>
      )}

    </div>
  );

  const picker = (
    <div>
      {/* Picker */}
      <div className={compact ? "mt-8" : ""}>
        {!compact && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="label">Choose from {list.length} fragrances</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setWorld("all")} className={cn("h-11 border px-4 text-[0.68rem] font-medium uppercase tracking-[0.22em]", world === "all" ? "border-espresso bg-espresso text-ivory" : "border-espresso/20")}>
                All
              </button>
              <CollectionSwitcher value={world === "all" ? ("" as World) : world} onChange={setWorld} id="box-world" />
            </div>
          </div>
        )}
        <ul className={cn(compact ? "no-scrollbar snap-x-mandatory -mx-gutter flex scroll-px-gutter gap-3 overflow-x-auto px-gutter lg:mx-0 lg:px-0" : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4")}>
          {(compact ? list.slice(0, 10) : list).map((p) => {
            const active = selected.some((x) => x.id === p.id);
            return (
              <li key={p.id} className={cn(compact && "w-[9.5rem] shrink-0 snap-start")}>
                <button
                  type="button"
                  onClick={() => toggle(p)}
                  aria-pressed={active}
                  className={cn("group/pick relative block w-full text-left", !active && full && "opacity-50")}
                >
                  <div className={cn("relative aspect-[4/5] overflow-hidden", p.world === "attar" ? "bg-espresso" : "bg-sand")}>
                    <ProductPhoto src={p.images[0]?.src} alt={p.name} dark={p.world === "attar"} sizes={compact ? "152px" : "(min-width: 1024px) 18vw, 45vw"} className="transition-transform duration-700 ease-luxe group-hover/pick:scale-105" />
                    <span className={cn("absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-300", active ? "bg-gold text-espresso-deep" : "bg-ivory/85 text-espresso")}>
                      {active ? <Check className="h-3.5 w-3.5" strokeWidth={1.8} /> : <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />}
                    </span>
                    {active && <span className="absolute inset-0 ring-1 ring-inset ring-gold" />}
                  </div>
                  <p className="mt-2.5 font-display text-[1.05rem] uppercase leading-tight">{p.name}</p>
                  <p className={cn("text-[0.7rem]", light ? "text-ivory/55" : "text-ink-muted")}>
                    {p.type === "attar" ? "Attar" : "Perfume"} · {miniVariant(p).size}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className={cn(light ? "text-ivory" : "text-ink")}>
        {summary}
        {picker}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14", light ? "text-ivory" : "text-ink")}>
      <div className="order-2 lg:order-1">{picker}</div>
      <aside aria-label="Your box" className="order-1 lg:sticky lg:top-28 lg:order-2 lg:self-start">
        <p className="label mb-4">Your box</p>
        {summary}
      </aside>

      {/* Phones: the tray scrolls away above a long grid, so keep the picks and the action within thumb's reach */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            exit={{ y: "110%" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-hair bg-ivory/95 px-gutter pt-3 text-ink backdrop-blur-md lg:hidden"
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5" aria-hidden>
                {Array.from({ length: size }).map((_, i) => {
                  const p = selected[i];
                  return (
                    <div key={i} className={cn("relative h-12 w-10 overflow-hidden border", p ? cn("border-transparent", p.world === "attar" ? "bg-espresso" : "bg-sand") : "border-dashed border-espresso/25")}>
                      {p && <ProductPhoto src={p.images[0]?.src} alt={p.name} dark={p.world === "attar"} sizes="40px" compact />}
                    </div>
                  );
                })}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[0.75rem] text-ink-muted">
                  {selected.length} of {size} chosen
                </p>
                <p className="tabular mt-0.5 text-[0.95rem] font-medium">{formatPrice(price)}</p>
              </div>
              <Button onClick={add} disabled={!full || adding} aria-busy={adding} size="md" className="px-5">
                {adding ? "Adding" : full ? "Add box" : `${size - selected.length} more`}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
