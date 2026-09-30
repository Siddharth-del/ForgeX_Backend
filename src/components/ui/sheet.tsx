"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

/**
 * Accessible overlay panel: focus is moved in and trapped, Escape closes,
 * page scroll is locked, and focus returns to the trigger on close.
 */
export function Sheet({
  open,
  onClose,
  side = "right",
  title,
  children,
  className,
  dark,
}: {
  open: boolean;
  onClose: () => void;
  side?: "right" | "left" | "center";
  title: string;
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const mounted = useMounted();

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement;
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      returnTo.current?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const from = side === "right" ? { x: "100%" } : side === "left" ? { x: "-100%" } : { y: 24, opacity: 0 };
  const to = side === "center" ? { y: 0, opacity: 1 } : { x: 0 };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={from}
            animate={to}
            exit={from}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute flex flex-col shadow-2xl",
              dark ? "bg-ink text-bone" : "bg-paper text-ink",
              side === "right" && "inset-y-0 right-0 w-full max-w-[460px] pt-safe pb-[env(safe-area-inset-bottom)]",
              side === "left" && "inset-y-0 left-0 w-full max-w-[420px] pt-safe pb-[env(safe-area-inset-bottom)]",
              side === "center" &&
                "inset-x-4 top-1/2 mx-auto max-h-[88vh] max-w-2xl -translate-y-1/2 overflow-y-auto rounded-xs sm:inset-x-8",
              className,
            )}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-10 inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                dark ? "hover:bg-bone/10" : "hover:bg-ink/5",
              )}
            >
              <X className="h-5 w-5" strokeWidth={1.25} />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
