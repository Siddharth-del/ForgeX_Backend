import { motion } from "framer-motion";
import Link from "@/components/ui/Link";
import { cn } from "@/lib/cn";
import type { World } from "@/types";

const worlds: { id: World; label: string; native: string; href: string }[] = [
  { id: "attar", label: "Attar", native: "عطر", href: "/collections/attars" },
  { id: "perfume", label: "Perfume", native: "Parfum", href: "/collections/perfumes" },
];

interface Props {
  value: World;
  /** When provided, acts as tabs; otherwise each side links to its collection. */
  onChange?: (w: World) => void;
  tone?: "light" | "dark";
  className?: string;
  id?: string;
}

/** The brand's signature control: [ ATTAR ] [ PERFUME ] */
export function CollectionSwitcher({ value, onChange, tone = "dark", className, id = "world" }: Props) {
  const light = tone === "light";
  return (
    <div
      role={onChange ? "tablist" : undefined}
      aria-label="Choose a fragrance world"
      className={cn("relative inline-grid grid-cols-2 border p-1", light ? "border-ivory/25" : "border-espresso/20", className)}
    >
      {worlds.map((w) => {
        const active = w.id === value;
        const inner = (
          <>
            {active && (
              <motion.span
                layoutId={`${id}-pill`}
                className={cn("absolute inset-0", light ? "bg-ivory" : "bg-espresso")}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
              />
            )}
            <span className="relative flex items-baseline gap-2">
              <span>{w.label}</span>
              <span aria-hidden className={cn("text-[0.7rem] normal-case tracking-normal opacity-60", w.id === "attar" ? "font-arabic text-[0.85rem]" : "font-display italic")}>
                {w.native}
              </span>
            </span>
          </>
        );
        const cls = cn(
          "relative flex h-11 min-w-[8.5rem] items-center justify-center px-5 text-[0.68rem] font-medium uppercase tracking-[0.24em] transition-colors duration-500",
          active ? (light ? "text-espresso" : "text-ivory") : light ? "text-ivory/75 hover:text-ivory" : "text-espresso/70 hover:text-espresso",
        );
        return onChange ? (
          <button key={w.id} type="button" role="tab" aria-selected={active} className={cls} onClick={() => onChange(w.id)}>
            {inner}
          </button>
        ) : (
          <Link key={w.id} href={w.href} aria-current={active ? "page" : undefined} className={cls}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
