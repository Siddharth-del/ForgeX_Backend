import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { scentFamilies } from "@/lib/scent";
import { cn } from "@/lib/cn";
import type { ScentFamily } from "@/types";

/** Multi-select scent family pills. */
export function FragranceFilter({
  value,
  onChange,
  counts,
  available,
  tone = "dark",
  rail = false,
  className,
}: {
  value: ScentFamily[];
  onChange: (v: ScentFamily[]) => void;
  counts?: Partial<Record<ScentFamily, number>>;
  /** Only show families that at least one product actually has. */
  available?: Set<ScentFamily>;
  tone?: "light" | "dark";
  /** Single swipeable row on phones instead of wrapping onto several lines. */
  rail?: boolean;
  className?: string;
}) {
  const light = tone === "light";
  const toggle = (id: ScentFamily) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className={cn("flex gap-2", rail ? "no-scrollbar -mx-gutter overflow-x-auto px-gutter md:mx-0 md:flex-wrap md:overflow-visible md:px-0" : "flex-wrap", className)} role="group" aria-label="Filter by scent family">
      {scentFamilies.filter((f) => !available || available.has(f.id) || value.includes(f.id)).map((f) => {
        const active = value.includes(f.id);
        const n = counts?.[f.id];
        const empty = n === 0 && !active;
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={active}
            title={f.hint}
            onClick={() => toggle(f.id)}
            disabled={empty}
            className={cn(
              "shrink-0 disabled:cursor-not-allowed disabled:opacity-40",
              "relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-full border px-5 text-[0.78rem] tracking-[0.04em] transition-colors duration-400",
              active
                ? light
                  ? "border-ivory text-espresso"
                  : "border-espresso text-ivory"
                : light
                  ? "border-ivory/30 text-ivory/80 hover:border-ivory/70"
                  : "border-espresso/25 text-ink hover:border-espresso/70",
            )}
          >
            {active && <motion.span layoutId={undefined} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35 }} className={cn("absolute inset-0 rounded-full", light ? "bg-ivory" : "bg-espresso")} />}
            <span className="relative flex items-center gap-2">
              {active && <Check className="h-3 w-3" strokeWidth={2} />}
              {f.label}
              {n !== undefined && <span className={cn("text-[0.68rem] tabular", active ? "opacity-70" : "opacity-45")}>{n}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
