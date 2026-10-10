import type { OrderStatus } from "@/lib/api/types";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, type StatusTone } from "@/lib/orders";
import { cn } from "@/lib/cn";

const tones: Record<StatusTone, string> = {
  neutral: "border-espresso/30 text-ink-muted",
  progress: "border-gold text-gold-deep",
  good: "border-espresso bg-espresso text-ivory",
  bad: "border-[#9b3b2a]/40 text-[#9b3b2a]",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cn("inline-flex h-7 items-center whitespace-nowrap border px-3 text-[0.6rem] font-medium uppercase tracking-[0.2em]", tones[ORDER_STATUS_TONE[status]], className)}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
