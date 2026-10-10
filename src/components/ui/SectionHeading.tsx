import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  tone?: "dark" | "light";
  action?: ReactNode;
  className?: string;
  as?: "h1" | "h2";
}

/** Eyebrow + editorial serif title, optional intro and right-aligned action. */
export function SectionHeading({ eyebrow, title, intro, align = "left", tone = "dark", action, className, as: Tag = "h2" }: Props) {
  const center = align === "center";
  return (
    <div className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", center && "md:flex-col md:items-center", className)}>
      <div className={cn("max-w-3xl", center && "mx-auto text-center")}>
        {eyebrow && (
          <p className={cn("eyebrow mb-4 flex items-center gap-3", tone === "light" ? "text-gold-soft" : "text-gold-deep", center && "justify-center")}>
            <span aria-hidden className={cn("h-px w-8", tone === "light" ? "bg-gold-soft/60" : "bg-gold-deep/50")} />
            {eyebrow}
          </p>
        )}
        <Tag className={cn("text-display-md uppercase", tone === "light" ? "text-ivory" : "text-ink")}>{title}</Tag>
        {intro && <p className={cn("mt-5 max-w-prose text-[0.95rem] leading-relaxed", tone === "light" ? "text-ivory/70" : "text-ink-muted", center && "mx-auto")}>{intro}</p>}
      </div>
      {action && <div className={cn("shrink-0", center && "md:mt-2")}>{action}</div>}
    </div>
  );
}
