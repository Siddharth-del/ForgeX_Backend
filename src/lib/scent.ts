/** Client-safe helpers (no catalogue data imported here). */
import type { Occasion, Product, ScentFamily } from "@/types";

/** The backend's FragranceFamily enum (model/FragranceFamily.java), with shopper-friendly hints. */
export const scentFamilies: { id: ScentFamily; label: string; hint: string }[] = [
  { id: "woody", label: "Woody", hint: "Cedar, sandalwood, vetiver, oud" },
  { id: "amber", label: "Amber", hint: "Warm, resinous, golden" },
  { id: "floral", label: "Floral", hint: "Rose, jasmine, peony" },
  { id: "aromatic", label: "Aromatic", hint: "Herbs, lavender, spice" },
  { id: "aquatic", label: "Aquatic", hint: "Fresh, marine, airy" },
  { id: "earthy", label: "Earthy", hint: "Petrichor, moss, roots" },
  { id: "mixed", label: "Mixed", hint: "Blends across families" },
];

/** Lightweight client-side search used by the search overlay (name, family, type, description). */
export function searchProducts(list: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  return list
    .map((p) => {
      const notes = p.notes ? [...p.notes.top, ...p.notes.heart, ...p.notes.base] : [];
      const hay = [p.name, p.family, p.tagline ?? "", p.type, p.gender, ...p.families, p.description, ...notes].join(" ").toLowerCase();
      const hits = terms.filter((t) => hay.includes(t)).length;
      const nameHit = p.name.toLowerCase().includes(q) ? 3 : 0;
      return { p, s: hits === terms.length ? hits + nameHit : 0 };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}

export const occasionLabels: Record<Occasion, string> = {
  evening: "Evenings out",
  office: "The office",
  "date-night": "Date night",
  wedding: "Weddings",
  everyday: "Every day",
  festive: "Festive season",
  travel: "Travel",
  prayer: "Prayer & calm",
};

export const occasionNotes: Record<Occasion, string> = {
  evening: "Candlelight, conversation and a trail that lingers.",
  office: "Close to the skin, never in the room before you.",
  "date-night": "Warm and intimate, worth leaning in for.",
  wedding: "Holds through the baraat, the vows and the last dance.",
  everyday: "Easy to wear from morning coffee to dinner.",
  festive: "Rich enough for diyas, gold and family gatherings.",
  travel: "A compact signature that settles in anywhere.",
  prayer: "Quiet, contemplative and close to the skin.",
};

export const genderLabel = { him: "For Him", her: "For Her", unisex: "Unisex" } as const;
