"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Category, FragranceFamily, Gender, Product } from "@/lib/types";
import { CATEGORIES, FAMILIES, GENDERS, STORE_RULES } from "@/lib/constants";
import { cn, formatPaise } from "@/lib/utils";
import { LineReveal, Reveal, Stagger } from "../motion/reveal";
import { ButtonLink } from "../ui/button";
import { SectionHeading } from "../ui/misc";
import { ProductCard } from "../product/product-card";
import { BottleArt, FAMILY_TINT } from "../product/bottle-art";

/* ------------------------------ Marquee strip ----------------------------- */
export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-line-dark bg-ink py-4 text-bone" aria-hidden>
      <div className="flex w-max animate-marquee gap-12 whitespace-nowrap pr-12 motion-reduce:animate-none">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-12">
            <span className="display text-2xl italic text-bone/85">{t}</span>
            <span className="h-1 w-1 rounded-full bg-ember" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Collection -------------------------------- */
export function Collection({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <section aria-labelledby="collection-title" className="container-x py-24 md:py-32">
      <SectionHeading
        eyebrow="The collection"
        title={
          <span id="collection-title">
            Worn close, <em className="italic">remembered</em> long.
          </span>
        }
        aside={
          <ButtonLink href="/shop" variant="link" className="text-sm">
            View all fragrances
          </ButtonLink>
        }
      />
      {/* Horizontal rail on phones, grid from tablet up */}
      <div className="-mx-5 mt-14 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
        <Stagger className="grid auto-cols-[72%] grid-flow-col gap-4 sm:auto-cols-[44%] md:grid-flow-row md:grid-cols-3 md:gap-x-6 md:gap-y-14 xl:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={p.productId} product={p} priority={i < 2} sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 72vw" />
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* --------------------------- Perfume vs attar ----------------------------- */
export function CategorySplit({ counts }: { counts: Record<Category, number> }) {
  return (
    <section aria-label="Shop by type" className="grid grid-cols-1 md:grid-cols-2">
      {CATEGORIES.map((c, i) => {
        const dark = i === 1;
        return (
          <Link
            key={c.value}
            href={`/shop?category=${c.value.toLowerCase()}`}
            className={cn(
              "group relative flex min-h-[560px] flex-col justify-between overflow-hidden p-8 sm:p-12 lg:min-h-[720px] lg:p-16",
              dark ? "grain bg-ink text-bone" : "bg-bone text-ink",
            )}
          >
            <div className="relative z-10 flex items-start justify-between">
              <p className={cn("eyebrow", dark ? "text-smoke" : "text-stone")}>
                0{i + 1} — {counts[c.value]} {counts[c.value] === 1 ? "fragrance" : "fragrances"}
              </p>
            </div>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-[9%] mx-auto h-[46%] w-[70%] sm:h-[54%] lg:h-[60%] max-w-[360px] transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:-translate-y-4 group-hover:scale-[1.03]"
            >
              <BottleArt category={c.value} family={dark ? "EARTHY" : "FLORAL"} dark={dark} />
            </div>

            <div className="relative z-10">
              <h2 className="display text-6xl sm:text-7xl lg:text-8xl">{c.plural}</h2>
              <p className={cn("mt-4 max-w-sm text-[15px] leading-relaxed", dark ? "text-bone/70" : "text-stone")}>
                {c.blurb}
              </p>
              <span className="eyebrow mt-8 inline-flex items-center gap-3">
                Shop {c.plural.toLowerCase()}
                <span className="inline-block h-px w-8 bg-current transition-[width] duration-500 ease-[var(--ease-out-expo)] group-hover:w-14" />
              </span>
            </div>
          </Link>
        );
      })}
    </section>
  );
}

/* ------------------------------ Families ---------------------------------- */
export function Families({ counts }: { counts: Record<FragranceFamily, number> }) {
  const available = FAMILIES.filter((f) => counts[f.value] > 0);
  const list = available.length ? available : FAMILIES;
  const [active, setActive] = useState<FragranceFamily>(list[0].value);
  const current = FAMILIES.find((f) => f.value === active)!;

  return (
    <section id="families" aria-labelledby="families-title" className="container-x scroll-mt-24 py-24 md:py-32">
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="eyebrow text-stone">Find your family</p>
          <LineReveal
            id="families-title"
            className="display mt-4 text-[2.6rem] sm:text-5xl lg:text-[4.25rem]"
            lines={["Every scent", <em key="i" className="italic">belongs somewhere.</em>]}
          />
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-stone">
            Families group fragrances by their character. Start with one you already love, then wander.
          </p>

          {/* Swatch panel follows the hovered / focused family */}
          <div className="relative mt-12 hidden aspect-[5/4] overflow-hidden bg-sand/60 lg:block">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7 }}
                className="absolute inset-0 flex items-end p-8"
                style={{
                  background: `radial-gradient(80% 90% at 70% 30%, ${FAMILY_TINT[active]}55 0%, transparent 70%)`,
                }}
              >
                <div className="absolute right-8 top-6 h-[78%] w-[42%]">
                  <BottleArt category="PERFUME" family={active} />
                </div>
                <div className="relative max-w-[55%]">
                  <p className="display text-4xl">{current.label}</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone">{current.notes}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <ul className="lg:col-span-7 lg:pl-8">
          {list.map((f) => {
            const n = counts[f.value] ?? 0;
            return (
              <li key={f.value} className="border-b border-line first:border-t">
                <Link
                  href={`/shop?family=${f.value.toLowerCase()}`}
                  onMouseEnter={() => setActive(f.value)}
                  onFocus={() => setActive(f.value)}
                  className="group flex items-baseline gap-5 py-5 sm:py-6"
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 translate-y-[-0.3em] rounded-full"
                    style={{ background: FAMILY_TINT[f.value] }}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "display block text-4xl transition-[color,transform] duration-500 ease-[var(--ease-out-expo)] sm:text-5xl lg:text-6xl",
                        active === f.value ? "text-ink lg:translate-x-2" : "text-ink/35 lg:text-ink/30",
                        "max-lg:text-ink pointer-coarse:text-ink",
                      )}
                    >
                      {f.label}
                    </span>
                    <span className="mt-2 block text-sm text-stone lg:hidden">{f.notes}</span>
                  </span>
                  <span className="eyebrow shrink-0 text-stone">
                    {n} {n === 1 ? "scent" : "scents"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------ For whom ---------------------------------- */
export function ForWhom({ counts }: { counts: Record<Gender, number> }) {
  return (
    <section aria-label="Shop by who it's for" className="border-t border-line bg-paper">
      <div className="container-x grid grid-cols-1 divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
        {GENDERS.map((g) => (
          <Link
            key={g.value}
            href={`/shop?gender=${g.value.toLowerCase()}`}
            className="group flex items-center justify-between gap-4 py-10 md:px-10 md:py-16 md:first:pl-0 md:last:pr-0"
          >
            <span>
              <span className="display block text-4xl lg:text-5xl">{g.label}</span>
              <span className="eyebrow mt-3 block text-stone">{counts[g.value]} fragrances</span>
            </span>
            <span
              aria-hidden
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-line transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:border-ink group-hover:bg-ink group-hover:text-bone"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4">
                <path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.25" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------- How ordering works -------------------------- */
const STEPS = [
  {
    title: "Choose",
    body: "Every bottle shows its MRP, today's price and your saving before it goes in the bag. Add a coupon at checkout if you have one.",
  },
  {
    title: "Pay your way",
    body: "UPI, cards, net banking and wallets through Razorpay — or cash on delivery. Online payments are verified before your order is confirmed.",
  },
  {
    title: "Track & keep",
    body: "Follow each order from confirmed to delivered in your account, and download its GST invoice whenever you need it.",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="bg-bone">
      <div className="container-x py-24 md:py-32">
        <SectionHeading
          eyebrow="Ordering"
          title={<span id="how-title">Simple, from bag to doorstep.</span>}
        />
        <ol className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} as="li" delay={i * 0.08} className="border-t border-ink/15 pt-6">
              <span className="display text-5xl text-ember">0{i + 1}</span>
              <h3 className="mt-6 text-xl font-medium">{s.title}</h3>
              <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-stone">{s.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------------------------- FAQ ----------------------------------- */
const FAQ = [
  {
    q: "How much is shipping?",
    a: `Shipping is free on orders of ${formatPaise(STORE_RULES.freeShippingAbovePaise)} or more after any coupon. Below that, it's a flat ${formatPaise(STORE_RULES.shippingChargePaise)}. You'll see the exact amount before you pay.`,
  },
  {
    q: "Which payment methods do you accept?",
    a: "UPI, debit and credit cards, net banking and wallets through Razorpay, or cash on delivery.",
  },
  {
    q: "What's the difference between a perfume and an attar?",
    a: "Our perfumes are eau de parfum in a spray bottle. Attars are concentrated perfume oils with no alcohol — you dab them onto pulse points and they wear close to the skin for longer.",
  },
  {
    q: "What happens if my online payment doesn't go through?",
    a: `Your items are held for ${STORE_RULES.paymentWindowMinutes} minutes while you pay. If payment isn't completed in that window, the order is cancelled automatically and nothing is charged. If a payment arrives after that, it's refunded automatically.`,
  },
  {
    q: "Will I get an invoice?",
    a: "Yes. Every order has a GST invoice you can download from your account, under the order's details.",
  },
  {
    q: "How many of one fragrance can I order?",
    a: `Up to ${STORE_RULES.maxPerProduct} of each fragrance per order, subject to stock.`,
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="container-x scroll-mt-24 py-24 md:py-32">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="eyebrow text-stone">Questions</p>
          <h2 id="faq-title" className="display mt-4 text-[2.6rem] sm:text-5xl lg:text-[4.25rem]">
            Good to know.
          </h2>
        </div>
        <div className="lg:col-span-8">
          {FAQ.map((f) => (
            <details key={f.q} className="group border-b border-line first:border-t [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-medium sm:text-xl">
                {f.q}
                <span aria-hidden className="relative h-4 w-4 shrink-0">
                  <span className="absolute left-0 top-1/2 h-px w-4 bg-ink" />
                  <span className="absolute left-1/2 top-0 h-4 w-px bg-ink transition-transform duration-300 group-open:scale-y-0" />
                </span>
              </summary>
              <p className="max-w-2xl pb-7 text-[15px] leading-relaxed text-stone">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Final CTA ------------------------------ */
export function ClosingCta() {
  return (
    <section className="grain relative overflow-hidden bg-ink text-bone">
      <div className="container-x flex flex-col items-start gap-10 py-24 md:flex-row md:items-end md:justify-between md:py-36">
        <LineReveal
          className="display text-[clamp(3rem,8vw,7.5rem)]"
          lines={["Find the one", <em key="e" className="italic">that stays.</em>]}
        />
        <Reveal delay={0.2}>
          <ButtonLink href="/shop" variant="light" size="lg" arrow>
            Shop fragrances
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
}
