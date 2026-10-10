import { AnimatePresence, motion, type TargetAndTransition } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { useEscape } from "@/hooks/useEscape";
import { useLockBody } from "@/hooks/useLockBody";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";

type Side = "right" | "left" | "top" | "bottom" | "center";

const panelMotion: Record<Side, { initial: TargetAndTransition; animate: TargetAndTransition; exit: TargetAndTransition }> = {
  right: { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" } },
  left: { initial: { x: "-100%" }, animate: { x: 0 }, exit: { x: "-100%" } },
  top: { initial: { y: "-100%" }, animate: { y: 0 }, exit: { y: "-100%" } },
  bottom: { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } },
  center: { initial: { opacity: 0, y: 24, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 16, scale: 0.98 } },
};

const placement: Record<Side, string> = {
  right: "right-0 top-0 h-full w-full max-w-[28rem]",
  left: "left-0 top-0 h-full w-full max-w-[26rem]",
  top: "left-0 right-0 top-0 max-h-[92vh] w-full",
  bottom: "bottom-0 left-0 right-0 max-h-[92vh] w-full",
  center: "left-1/2 top-1/2 max-h-[90vh] w-[min(64rem,calc(100vw-2rem))]",
};

interface Props {
  open: boolean;
  onClose: () => void;
  side?: Side;
  label: string;
  children: ReactNode;
  className?: string;
}

/** Accessible overlay panel (drawer, sheet or dialog) with focus restore and scroll lock. */
export function Sheet({ open, onClose, side = "right", label, children, className }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  useLockBody(open);
  useEscape(open, onClose);

  useEffect(() => {
    if (open) {
      lastFocus.current = document.activeElement as HTMLElement;
      const t = setTimeout(() => {
        const target = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current;
        target?.focus({ preventScroll: true });
      }, 60);
      return () => clearTimeout(t);
    }
    lastFocus.current?.focus?.({ preventScroll: true });
  }, [open]);

  const m = panelMotion[side];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]" role="presentation">
          <motion.div
            className="absolute inset-0 bg-espresso-deep/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className={cn("absolute flex flex-col overflow-hidden bg-ivory text-ink shadow-[0_30px_80px_-30px_rgba(31,15,8,0.45)] outline-none", placement[side], className)}
            style={side === "center" ? { x: "-50%", y: "-50%" } : undefined}
            initial={side === "center" ? { opacity: 0, scale: 0.98 } : m.initial}
            animate={side === "center" ? { opacity: 1, scale: 1 } : m.animate}
            exit={side === "center" ? { opacity: 0, scale: 0.98 } : m.exit}
            transition={{ duration: side === "center" ? 0.5 : 0.7, ease: EASE }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
