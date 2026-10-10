import { AnimatePresence, motion } from "framer-motion";
import Image from "@/components/ui/Image";
import { X } from "lucide-react";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { useToast } from "@/store/toast";

export function Toaster({ align = "left" }: { align?: "left" | "right" }) {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);

  return (
    <div aria-live="polite" aria-atomic="false" className={cn("pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center gap-2 p-4 safe-bottom sm:p-6", align === "right" ? "sm:items-end" : "sm:items-start")}>
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, transition: { duration: 0.25 } }}
            transition={{ duration: 0.5, ease: EASE }}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-3 border p-3 pr-2 shadow-[0_20px_50px_-24px_rgba(31,15,8,0.6)]",
              t.tone === "error" ? "border-red-900/30 bg-[#3b1410] text-ivory" : "border-hair-light bg-espresso-deep text-ivory",
            )}
            role="status"
          >
            {t.image && (
              <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-sand">
                <Image src={t.image} alt="" fill sizes="44px" className="object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[0.82rem] leading-snug">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[0.72rem] text-ivory/60">{t.description}</p>}
            </div>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
                className="shrink-0 px-2 text-[0.64rem] font-medium uppercase tracking-[0.2em] text-gold-soft hover:text-ivory"
              >
                {t.action.label}
              </button>
            )}
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="shrink-0 p-1.5 text-ivory/50 hover:text-ivory">
              <X className="h-3.5 w-3.5" strokeWidth={1.4} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
