import { cn, formatPaise } from "@/lib/utils";

export function Price({
  price,
  mrp,
  discount,
  size = "md",
  className,
  dark,
}: {
  price: number;
  mrp?: number | null;
  discount?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  dark?: boolean;
}) {
  const showMrp = mrp != null && mrp > price;
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2.5 gap-y-1", className)}>
      <span className="sr-only">Price</span>
      <span className={cn("font-medium tabular-nums", size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-[15px]")}>
        {formatPaise(price)}
      </span>
      {showMrp && (
        <>
          <span className="sr-only">, MRP</span>
          <s className={cn("tabular-nums", dark ? "text-smoke" : "text-stone", size === "lg" ? "text-base" : "text-[13px]")}>
            {formatPaise(mrp)}
          </s>
          {!!discount && discount > 0 && (
            <span className={cn("text-[12px] font-medium tracking-wide", dark ? "text-ember-glow" : "text-ember")}>
              {discount}% off
            </span>
          )}
        </>
      )}
    </p>
  );
}
