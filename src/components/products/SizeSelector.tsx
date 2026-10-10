import { motion } from "framer-motion";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ProductVariant } from "@/types";

export function SizeSelector({ variants, value, onChange, tone = "dark", id }: { variants: ProductVariant[]; value: string; onChange: (id: string) => void; tone?: "light" | "dark"; id: string }) {
  if (variants.length < 2) return null;
  const light = tone === "light";
  return (
    <fieldset>
      <legend className={cn("label mb-3", light ? "text-ivory/70" : "text-ink-muted")}>Size</legend>
      <div className="flex flex-wrap gap-2.5">
        {variants.map((v) => {
          const active = v.id === value;
          return (
            <label
              key={v.id}
              className={cn(
                "relative flex min-w-[7.5rem] cursor-pointer flex-col items-start gap-0.5 border px-4 py-3 transition-colors duration-300 has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-deep",
                light ? "border-ivory/25 hover:border-ivory/60" : "border-espresso/20 hover:border-espresso/60",
                !v.inStock && "cursor-not-allowed opacity-50",
              )}
            >
              <input type="radio" name={id} value={v.id} checked={active} disabled={!v.inStock} onChange={() => onChange(v.id)} className="sr-only" />
              {active && <motion.span layoutId={`${id}-ring`} className={cn("absolute inset-0 border", light ? "border-gold-soft" : "border-espresso")} transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              <span className={cn("text-[0.85rem] font-medium", light ? "text-ivory" : "text-ink")}>{v.size}</span>
              <span className={cn("tabular text-[0.75rem]", light ? "text-ivory/60" : "text-ink-muted")}>{v.inStock ? formatPrice(v.price) : "Sold out"}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
