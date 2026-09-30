import { STORE_RULES } from "@/lib/constants";
import { formatPaise } from "@/lib/utils";

/** Progress toward free shipping. Indicative only — checkout preview is authoritative. */
export function ShippingMeter({ subtotal }: { subtotal: number }) {
  const target = STORE_RULES.freeShippingAbovePaise;
  const remaining = Math.max(0, target - subtotal);
  const pct = Math.min(100, Math.round((subtotal / target) * 100));
  return (
    <div>
      <p className="text-[13px] text-stone">
        {remaining > 0 ? (
          <>
            You&apos;re <span className="font-medium text-ink">{formatPaise(remaining)}</span> away from free shipping.
          </>
        ) : (
          <span className="text-ink">Your order ships free.</span>
        )}
      </p>
      <div className="mt-2.5 h-[2px] w-full bg-line" aria-hidden>
        <div
          className="h-full bg-ink transition-[width] duration-700 ease-[var(--ease-out-expo)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
