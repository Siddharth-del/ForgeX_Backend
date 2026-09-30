import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-xs", className)} />;
}

const tones = {
  ok: "text-ok bg-ok/8 border-ok/25",
  warn: "text-warn bg-warn/8 border-warn/25",
  info: "text-ink bg-ink/5 border-ink/15",
  muted: "text-stone bg-stone/8 border-stone/20",
  bad: "text-ember bg-ember/8 border-ember/25",
  ember: "text-bone bg-ember border-ember",
} as const;

export function Badge({
  tone = "info",
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xs border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-line", className)} />;
}

/** Section heading pattern: small eyebrow, large serif title, optional aside. */
export function SectionHeading({
  eyebrow,
  title,
  aside,
  className,
  as: Tag = "h2",
  dark,
}: {
  eyebrow?: string;
  title: ReactNode;
  aside?: ReactNode;
  className?: string;
  as?: "h1" | "h2";
  dark?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className={cn("eyebrow mb-4", dark ? "text-smoke" : "text-stone")}>{eyebrow}</p>}
        <Tag className="display text-[2.6rem] sm:text-5xl lg:text-[4.25rem]">{title}</Tag>
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}
