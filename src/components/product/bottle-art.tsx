import type { Category, FragranceFamily } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Liquid tint per fragrance family — muted, so they sit well on bone or ink. */
export const FAMILY_TINT: Record<FragranceFamily, string> = {
  WOODY: "#8c6a48",
  AMBER: "#b9782a",
  FLORAL: "#c08f8c",
  AQUATIC: "#6c8c99",
  AROMATIC: "#7f8c68",
  EARTHY: "#5e5243",
  MIXED: "#8f8274",
};

/**
 * Vector bottle used when a product has no photograph yet, and as hero art.
 * Perfume = square flacon with a heavy glass base; attar = round flask with a tall cap.
 */
export function BottleArt({
  category = "PERFUME",
  family = "AMBER",
  label,
  className,
  dark,
}: {
  category?: Category | null;
  family?: FragranceFamily | null;
  label?: string;
  className?: string;
  dark?: boolean;
}) {
  const tint = FAMILY_TINT[family ?? "AMBER"];
  const id = `b-${category}-${family}-${dark ? "d" : "l"}`;
  const glassEdge = dark ? "rgba(255,255,255,0.35)" : "rgba(12,12,13,0.28)";
  const cap = dark ? "#1b1b1d" : "#0c0c0d";
  const text = label?.slice(0, 18).toUpperCase();

  return (
    <svg viewBox="0 0 300 400" className={cn("h-full w-full", className)} role="img" aria-label={label ?? "Bottle"}>
      <defs>
        <linearGradient id={`${id}-liq`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tint} stopOpacity="0.55" />
          <stop offset="1" stopColor={tint} stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.18" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="0.8" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id={`${id}-cap`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={cap} />
          <stop offset="0.45" stopColor={dark ? "#3a3a3e" : "#2b2b2e"} />
          <stop offset="1" stopColor={cap} />
        </linearGradient>
        <radialGradient id={`${id}-shadow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity={dark ? "0.6" : "0.22"} />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="150" cy="372" rx="105" ry="12" fill={`url(#${id}-shadow)`} />

      {category === "ATTAR" ? (
        <g>
          {/* tall cap */}
          <rect x="131" y="62" width="38" height="104" rx="3" fill={`url(#${id}-cap)`} />
          <rect x="138" y="166" width="24" height="18" fill={cap} opacity="0.9" />
          {/* round flask */}
          <circle cx="150" cy="276" r="92" fill={`url(#${id}-liq)`} />
          <circle cx="150" cy="276" r="92" fill={`url(#${id}-glass)`} />
          <circle cx="150" cy="276" r="92" fill="none" stroke={glassEdge} strokeWidth="1.2" />
          <path d="M88 236c8-24 28-42 52-50" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" fill="none" strokeLinecap="round" />
          {text && (
            <text x="150" y="282" textAnchor="middle" fontSize="11" letterSpacing="3" fill="#fff" fillOpacity="0.85" fontFamily="var(--font-sans)">
              {text}
            </text>
          )}
        </g>
      ) : (
        <g>
          {/* cap */}
          <rect x="112" y="58" width="76" height="62" rx="2" fill={`url(#${id}-cap)`} />
          <rect x="136" y="120" width="28" height="20" fill={cap} opacity="0.85" />
          {/* flacon */}
          <rect x="62" y="140" width="176" height="222" rx="6" fill={`url(#${id}-liq)`} />
          <rect x="62" y="332" width="176" height="30" rx="4" fill="#000" opacity="0.12" />
          <rect x="62" y="140" width="176" height="222" rx="6" fill={`url(#${id}-glass)`} />
          <rect x="62" y="140" width="176" height="222" rx="6" fill="none" stroke={glassEdge} strokeWidth="1.2" />
          <rect x="74" y="152" width="8" height="160" rx="4" fill="#fff" opacity="0.35" />
          {text && (
            <g>
              <line x1="104" y1="236" x2="196" y2="236" stroke="#fff" strokeOpacity="0.5" />
              <text x="150" y="258" textAnchor="middle" fontSize="11" letterSpacing="3" fill="#fff" fillOpacity="0.9" fontFamily="var(--font-sans)">
                {text}
              </text>
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
