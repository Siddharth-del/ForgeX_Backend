import type { PriceBreakdown } from "@/lib/types";
import { cn, formatPaise } from "@/lib/utils";

/** Totals exactly as the backend's PriceBreakdown reports them — never recomputed here. */
export function Totals({ price, className }: { price: PriceBreakdown; className?: string }) {
  const rows: [string, string, string?][] = [
    ["Subtotal", formatPaise(price.subtotal)],
    ...(price.productSavings > 0 ? ([["Saved on MRP", `−${formatPaise(price.productSavings)}`, "text-ok"]] as [string, string, string][]) : []),
    ...(price.couponDiscount > 0
      ? ([[`Coupon ${price.couponCode ?? ""}`.trim(), `−${formatPaise(price.couponDiscount)}`, "text-ok"]] as [string, string, string][])
      : []),
    ["Shipping", price.shipping === 0 ? "Free" : formatPaise(price.shipping)],
  ];
  return (
    <dl className={cn("space-y-3 text-[15px]", className)}>
      {rows.map(([k, v, cls]) => (
        <div key={k} className="flex justify-between gap-4">
          <dt className="text-stone">{k}</dt>
          <dd className={cn("tabular-nums", cls)}>{v}</dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
        <dt className="eyebrow">Total</dt>
        <dd className="text-2xl font-medium tabular-nums">{formatPaise(price.total)}</dd>
      </div>
      <p className="text-right text-[12px] text-stone">Inclusive of all taxes</p>
    </dl>
  );
}
