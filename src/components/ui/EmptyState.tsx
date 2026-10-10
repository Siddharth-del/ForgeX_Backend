import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A quiet, centred empty/error state with a line-drawn flacon. */
export function EmptyState({ title, body, action, tone = "dark", className }: { title: string; body?: ReactNode; action?: ReactNode; tone?: "dark" | "light"; className?: string }) {
  return (
    <div className={cn("mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center", className)}>
      <svg aria-hidden viewBox="0 0 64 80" className={cn("mb-7 h-20 w-16", tone === "light" ? "text-gold-soft/70" : "text-gold-deep/70")}>
        <rect x="12" y="26" width="40" height="48" rx="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <rect x="27" y="18" width="10" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
        <rect x="22" y="4" width="20" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1" />
        <line x1="12" y1="56" x2="52" y2="56" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
      </svg>
      <h3 className={cn("font-display text-3xl uppercase", tone === "light" ? "text-ivory" : "text-ink")}>{title}</h3>
      {body && <p className={cn("mt-3 text-[0.92rem]", tone === "light" ? "text-ivory/65" : "text-ink-muted")}>{body}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
