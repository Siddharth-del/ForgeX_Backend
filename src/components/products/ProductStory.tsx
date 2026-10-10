import { Reveal } from "@/components/ui/Reveal";
import { occasionLabels, occasionNotes } from "@/lib/scent";
import { cn } from "@/lib/cn";
import type { Occasion, Product } from "@/types";

const occasionIcon: Record<Occasion, React.ReactNode> = {
  evening: <path d="M15 4a7 7 0 1 0 5 12A8 8 0 0 1 15 4z" />,
  office: (
    <>
      <rect x="4" y="8" width="16" height="11" rx="1" />
      <path d="M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 13h16" />
    </>
  ),
  "date-night": <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  wedding: (
    <>
      <circle cx="9" cy="14" r="5" />
      <circle cx="15" cy="14" r="5" />
      <path d="M10 5l2-2 2 2-2 2z" />
    </>
  ),
  everyday: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </>
  ),
  festive: <path d="M12 3c1.5 3 4 4.5 4 8a4 4 0 0 1-8 0c0-3.5 2.5-5 4-8zM8 21h8M12 15v6" />,
  travel: (
    <>
      <rect x="6" y="7" width="12" height="13" rx="1.5" />
      <path d="M9 7V4h6v3M9 20v1M15 20v1" />
    </>
  ),
  prayer: <path d="M12 3v4M8 21v-6a4 4 0 0 1 8 0v6M5 21h14M12 7c-2 1.5-3 3-3 5h6c0-2-1-3.5-3-5z" />,
};

/**
 * Notes pyramid, accords ("What it smells like") and occasions ("Perfect for").
 * The backend doesn't store these yet, so each section renders only when its data exists.
 */
export function ProductStory({ product, dark }: { product: Product; dark: boolean }) {
  const tiers = [
    { key: "top", label: "Top notes", when: "The first 15 minutes", notes: product.notes?.top ?? [] },
    { key: "heart", label: "Heart notes", when: "From 15 minutes to 3 hours", notes: product.notes?.heart ?? [] },
    { key: "base", label: "Base notes", when: "The lasting drydown", notes: product.notes?.base ?? [] },
  ];
  const hasNotes = tiers.some((t) => t.notes.length);
  const accords = product.accords ?? [];
  const occasions = product.occasions ?? [];
  const facts = ([
    ["Longevity", product.longevity],
    ["Sillage", product.sillage],
    ["Best worn", product.timeOfDay],
  ] as const).filter(([, v]) => v);
  if (!hasNotes && !accords.length && !occasions.length) return null;

  return (
    <>
      {hasNotes && (
      <section aria-labelledby="notes-title" className={cn("py-section", dark ? "bg-espresso text-ivory" : "bg-sand text-ink")}>
        <div className="container-site">
          <Reveal className="text-center">
            <p className={cn("eyebrow", dark ? "text-gold-soft" : "text-gold-deep")}>The composition</p>
            <h2 id="notes-title" className="mt-4 text-display-md uppercase">
              Fragrance notes
            </h2>
          </Reveal>
          <div className="mx-auto mt-14 grid grid-cols-1 max-w-5xl gap-px md:grid-cols-3">
            {tiers.map((t, i) => (
              <Reveal key={t.key} delay={i * 0.12} className={cn("flex flex-col items-center px-6 py-10 text-center", dark ? "border-ivory/15" : "border-hair", i > 0 && "border-t md:border-l md:border-t-0")}>
                <span aria-hidden className={cn("font-display text-[3.2rem] font-light italic leading-none", dark ? "text-gold-soft/80" : "text-gold-deep/70")}>
                  {["i", "ii", "iii"][i]}
                </span>
                <p className="label mt-4">{t.label}</p>
                <p className={cn("mt-1 text-[0.75rem]", dark ? "text-ivory/50" : "text-ink-faint")}>{t.when}</p>
                <ul className="mt-6 space-y-1.5">
                  {t.notes.map((n) => (
                    <li key={n} className="font-display text-[1.7rem] font-light leading-tight">
                      {n}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      )}

      {accords.length > 0 && (
      <section aria-labelledby="smells-title" className={cn("py-section", dark ? "bg-espresso-deep text-ivory" : "bg-ivory text-ink")}>
        <div className="container-site grid grid-cols-1 gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <p className={cn("eyebrow", dark ? "text-gold-soft" : "text-gold-deep")}>Accords</p>
            <h2 id="smells-title" className="mt-4 text-display-md uppercase">
              What it
              <br />
              smells like
            </h2>
            {product.story && <p className={cn("mt-5 max-w-md text-[0.95rem]", dark ? "text-ivory/65" : "text-ink-muted")}>{product.story}</p>}
            {facts.length > 0 && (
            <dl className={cn("mt-10 grid grid-cols-3 border-y", dark ? "border-ivory/15" : "border-hair")}>
              {facts.map(([k, v], i) => (
                <div key={k} className={cn("py-5", i > 0 && "pl-4", i < 2 && (dark ? "border-r border-ivory/15" : "border-r border-hair"))}>
                  <dt className={cn("label text-[0.6rem]", dark ? "text-ivory/50" : "text-ink-faint")}>{k}</dt>
                  <dd className="mt-1.5 font-display text-[1.3rem] leading-tight">{v}</dd>
                </div>
              ))}
            </dl>
            )}
          </Reveal>
          <Reveal delay={0.1} className="self-center">
            <ul className="space-y-7">
              {accords.map((a) => (
                <li key={a.name}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-[1.6rem] uppercase tracking-[0.03em]">{a.name}</span>
                    <span className={cn("text-[0.72rem] tabular", dark ? "text-ivory/50" : "text-ink-faint")}>{a.strength}%</span>
                  </div>
                  <div className={cn("mt-2 h-px", dark ? "bg-ivory/15" : "bg-espresso/12")}>
                    <div className={cn("h-px origin-left", dark ? "bg-gold-soft" : "bg-espresso")} style={{ width: `${a.strength}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
      )}

      {occasions.length > 0 && (
      <section aria-labelledby="perfect-title" className={cn("py-section", dark ? "bg-espresso text-ivory" : "bg-sand text-ink")}>
        <div className="container-site">
          <Reveal className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={cn("eyebrow", dark ? "text-gold-soft" : "text-gold-deep")}>Moments</p>
              <h2 id="perfect-title" className="mt-4 text-display-md uppercase">
                Perfect for
              </h2>
            </div>
            {product.seasons?.length ? <p className={cn("text-[0.85rem]", dark ? "text-ivory/60" : "text-ink-muted")}>Seasons: {product.seasons.join(", ")}</p> : null}
          </Reveal>
          <ul className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
            {occasions.map((o, i) => (
              <li key={o}>
                <Reveal delay={i * 0.08} className={cn("group/occ flex h-full min-h-[13rem] flex-col border p-5 transition-colors duration-700 md:min-h-[17rem] md:p-7", dark ? "border-ivory/15 bg-espresso-deep/40 hover:border-gold-soft/40" : "border-hair bg-ivory hover:border-hair-strong")}>
                  <div className="flex items-start justify-between">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("h-9 w-9 transition-transform duration-700 ease-luxe group-hover/occ:-translate-y-0.5", dark ? "text-gold-soft" : "text-gold-deep")}>
                      {occasionIcon[o]}
                    </svg>
                    <span aria-hidden className={cn("font-display text-[1.1rem] italic", dark ? "text-ivory/35" : "text-ink-faint")}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  {/* Top-anchored so titles line up across cards whatever the note length. */}
                  <div className="mt-12 md:mt-20">
                    <p className="font-display text-[1.45rem] uppercase leading-tight md:text-[1.8rem]">{occasionLabels[o]}</p>
                    <p className={cn("mt-2 text-[0.8rem] leading-snug md:text-[0.85rem]", dark ? "text-ivory/60" : "text-ink-muted")}>{occasionNotes[o]}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>
      )}
    </>
  );
}
