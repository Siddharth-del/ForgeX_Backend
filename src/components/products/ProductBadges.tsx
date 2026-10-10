import { cn } from "@/lib/cn";
import type { Badge } from "@/types";

const labels: Record<Badge, string> = { bestseller: "Bestseller", new: "New", limited: "Limited" };

export function ProductBadges({ badges, soldOut, className }: { badges: Badge[]; soldOut?: boolean; className?: string }) {
  if (!badges.length && !soldOut) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {soldOut && <span className="bg-ink px-2 py-1 text-[0.58rem] font-medium uppercase tracking-[0.2em] text-ivory">Sold out</span>}
      {badges.map((b) => (
        <span
          key={b}
          className={cn(
            "px-2 py-1 text-[0.58rem] font-medium uppercase tracking-[0.2em]",
            b === "new" ? "bg-gold text-espresso-deep" : b === "limited" ? "bg-espresso text-gold-soft" : "bg-ivory/90 text-espresso",
          )}
        >
          {labels[b]}
        </span>
      ))}
    </div>
  );
}
