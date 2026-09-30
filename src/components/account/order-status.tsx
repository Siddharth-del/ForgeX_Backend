import type { OrderStatus } from "@/lib/types";
import { ORDER_STATUS, ORDER_STEPS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/misc";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Confirmed → Shipped → Delivered. PAID counts as confirmed for the tracker. */
export function OrderTracker({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED" || status === "REFUNDED" || status === "PENDING_PAYMENT") return null;
  const effective = status === "PAID" ? "CONFIRMED" : status;
  const reached = ORDER_STEPS.indexOf(effective);
  return (
    <ol className="grid grid-cols-3" aria-label="Delivery progress">
      {ORDER_STEPS.map((s, i) => {
        const done = i <= reached;
        return (
          <li key={s} className="relative">
            <div className={cn("h-[2px]", done ? "bg-ink" : "bg-line")} />
            <div className="mt-3 flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", done ? "bg-ink" : "bg-line")} />
              <span className={cn("eyebrow", done ? "text-ink" : "text-stone")} aria-current={i === reached ? "step" : undefined}>
                {ORDER_STATUS[s].label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
