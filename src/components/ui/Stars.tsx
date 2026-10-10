import { cn } from "@/lib/cn";

/** Fractional star rating drawn with two layered rows of glyph-free SVG stars. */
export function Stars({ value, size = 12, className }: { value: number; size?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (fill: string) => (
    <svg width={size * 5 + 8} height={size} viewBox={`0 0 ${5 * 24 + 8 * 2} 24`} aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <path
          key={i}
          transform={`translate(${i * 26} 0)`}
          d="M12 2.6l2.8 6.1 6.6.7-5 4.5 1.4 6.5L12 17.1l-5.8 3.3 1.4-6.5-5-4.5 6.6-.7z"
          fill={fill}
        />
      ))}
    </svg>
  );
  return (
    <span className={cn("relative inline-flex", className)} role="img" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span className="text-dune">{row("currentColor")}</span>
      <span className="absolute inset-0 overflow-hidden text-gold-deep" style={{ width: `${pct}%` }}>
        {row("currentColor")}
      </span>
    </span>
  );
}
