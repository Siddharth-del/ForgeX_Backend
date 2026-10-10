/** Building blocks for the admin panel: page frame, panels, stats, data states and badges. */
import type { ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import Link from "@/components/ui/Link";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError } from "@/lib/api/client";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/cn";

export function AdminPage({ eyebrow, title, actions, children }: { eyebrow?: string; title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <header className="flex flex-col gap-5 border-b border-hair pb-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow text-gold-deep">{eyebrow}</p>}
          <h1 className="mt-2 break-words font-display text-[2.1rem] uppercase leading-none md:text-[2.6rem]">{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </header>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function Panel({ title, action, children, className, padded = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn("border border-hair bg-white/70", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 border-b border-hair px-5 py-4">
          {title && <h2 className="label">{title}</h2>}
          {action}
        </div>
      )}
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, href, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: "default" | "alert" | "gold" }) {
  const body = (
    <>
      <p className="label text-[0.6rem] text-ink-muted">{label}</p>
      <p className={cn("mt-3 font-display text-[2.2rem] leading-none tabular", tone === "alert" && "text-[#9b3b2a]", tone === "gold" && "text-gold-deep")}>{value}</p>
      {hint && <p className="mt-2 text-[0.75rem] text-ink-faint">{hint}</p>}
    </>
  );
  const cls = "block border border-hair bg-white/70 p-5 transition-colors";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-espresso/40")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Error with retry. 403 means the server refused admin access even though this browser thinks it has it. */
export function ErrorPanel({ error, onRetry, what = "this data" }: { error: unknown; onRetry?: () => void; what?: string }) {
  const status = error instanceof ApiError ? error.status : 0;
  const message =
    status === 403
      ? "The server refused this request: your account doesn't have admin access there. Sign in with an administrator account."
      : status === 404
        ? `We couldn't find ${what}.`
        : errorMessage(error);
  return (
    <div role="alert" className="flex flex-col gap-4 border border-[#9b3b2a]/30 bg-[#9b3b2a]/[0.04] p-5 text-[0.88rem] sm:flex-row sm:items-start">
      <AlertTriangle aria-hidden className="h-5 w-5 shrink-0 text-[#9b3b2a]" strokeWidth={1.4} />
      <div className="flex-1">
        <p className="font-medium">Couldn&rsquo;t load {what}</p>
        <p className="mt-1 text-ink-muted">{message}</p>
      </div>
      {onRetry && status !== 403 && status !== 404 && (
        <button type="button" onClick={onRetry} className="label inline-flex items-center gap-2 self-start underline-offset-4 hover:underline">
          <RotateCw aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} /> Retry
        </button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14" />
      ))}
    </div>
  );
}

export function EmptyPanel({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-hair-strong bg-white/40 px-6 py-12 text-center">
      <p className="font-display text-[1.5rem] uppercase">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-md text-[0.88rem] text-ink-muted">{body}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function Pill({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "gold"; className?: string }) {
  const tones = {
    neutral: "border-espresso/25 text-ink-muted",
    good: "border-espresso bg-espresso text-ivory",
    warn: "border-gold text-gold-deep",
    bad: "border-[#9b3b2a]/40 text-[#9b3b2a]",
    gold: "border-gold bg-gold/15 text-espresso",
  };
  return <span className={cn("inline-flex h-6 items-center whitespace-nowrap border px-2.5 text-[0.58rem] font-medium uppercase tracking-[0.18em]", tones[tone], className)}>{children}</span>;
}

/** Segmented filter used above lists. */
export function FilterChips<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: string; count?: number }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 border px-3.5 text-[0.62rem] font-medium uppercase tracking-[0.18em] transition-colors",
            value === o.id ? "border-espresso bg-espresso text-ivory" : "border-espresso/20 text-ink-muted hover:border-espresso/50 hover:text-ink",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className={cn("tabular", value === o.id ? "text-gold-soft" : "text-ink-faint")}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className="h-10 w-full border border-espresso/20 bg-white/80 px-4 text-[0.86rem] outline-none transition-colors focus:border-espresso md:w-72"
    />
  );
}
