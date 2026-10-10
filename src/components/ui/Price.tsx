import { discountPercent, formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

export function Price({ price, compareAt, size = "md", tone = "dark", className }: { price: number; compareAt?: number; size?: "sm" | "md" | "lg"; tone?: "dark" | "light"; className?: string }) {
  const off = discountPercent(price, compareAt);
  return (
    <div className={cn("tabular flex flex-wrap items-baseline gap-x-2.5 gap-y-1", className)}>
      <span className={cn("font-medium", size === "lg" ? "text-2xl" : size === "sm" ? "text-[0.9rem]" : "text-[1rem]", tone === "light" ? "text-ivory" : "text-ink")}>
        {formatPrice(price)}
      </span>
      {off > 0 && (
        <>
          <span className={cn("line-through decoration-1", size === "lg" ? "text-base" : "text-[0.8rem]", tone === "light" ? "text-ivory/45" : "text-ink-faint")}>
            <span className="sr-only">Original price </span>
            {formatPrice(compareAt!)}
          </span>
          <span className={cn("text-[0.68rem] font-medium uppercase tracking-[0.14em]", tone === "light" ? "text-gold-soft" : "text-gold-deep")}>{off}% off</span>
        </>
      )}
    </div>
  );
}
