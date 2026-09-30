"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import type { Product } from "@/lib/types";
import { STORE_RULES } from "@/lib/constants";
import { formatPaise } from "@/lib/utils";
import { LineReveal, Magnetic } from "../motion/reveal";
import { ButtonLink } from "../ui/button";
import { ProductImage } from "../product/product-image";
import { BottleArt } from "../product/bottle-art";
import { productMeta } from "../product/product-card";

export function Hero({ featured }: { featured: Product | null }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const artY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 140]);
  const artScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 0.92]);
  const copyY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -60]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink text-bone"
    >
      {/* Light cone behind the bottle — the only "gradient" on the page, used as lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 55% at 72% 42%, rgba(243,239,232,0.14) 0%, rgba(243,239,232,0.04) 40%, transparent 70%), radial-gradient(40% 30% at 72% 88%, rgba(200,16,46,0.16) 0%, transparent 70%)",
        }}
      />

      <div className="container-x grid flex-1 grid-cols-1 items-center gap-10 pb-10 pt-24 md:pt-28 lg:grid-cols-12 lg:gap-6 lg:pb-12">
        <motion.div style={{ y: copyY, opacity: fade }} className="relative z-10 lg:col-span-7">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="eyebrow flex items-center gap-3 text-smoke"
          >
            <span className="inline-block h-px w-8 bg-ember" aria-hidden />
            Eau de parfum &amp; alcohol-free attar
          </motion.p>

          <LineReveal
            as="h1"
            id="hero-title"
            immediate
            delay={0.15}
            className="display mt-7 text-[clamp(3.4rem,min(10vw,14svh),8.75rem)]"
            lines={[
              <span key="1">Scent,</span>,
              <span key="2">forged to</span>,
              <span key="3" className="italic">
                linger<span className="text-ember">.</span>
              </span>,
            ]}
          />

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="mt-7 max-w-md text-[17px] leading-relaxed text-bone/70"
          >
            Perfumes that open bright and settle close, and concentrated attars that last from morning into the
            night. Priced plainly against MRP.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.85 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Magnetic>
              <ButtonLink href="/shop" variant="light" size="lg" arrow>
                Shop the collection
              </ButtonLink>
            </Magnetic>
            <ButtonLink href="/shop?category=attar" variant="outline-light" size="lg">
              Explore attars
            </ButtonLink>
          </motion.div>
        </motion.div>

        {/* Product stage */}
        <motion.div
          style={{ y: artY, scale: artScale }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, delay: 0.3 }}
          className="relative mx-auto w-full max-w-[420px] lg:col-span-5 lg:max-w-[min(100%,60svh)]"
        >
          {featured ? (
            <Link href={`/products/${encodeURIComponent(featured.slug)}`} className="group block">
              <ProductImage
                product={featured}
                priority
                dark
                sizes="(min-width: 1024px) 38vw, 90vw"
                className="aspect-[4/5] bg-transparent [&_img]:transition-transform [&_img]:duration-[1.6s] group-hover:[&_img]:scale-[1.03]"
              />
              <div className="mt-5 flex items-end justify-between gap-4 border-t border-line-dark pt-4">
                <div>
                  <p className="eyebrow text-[10px] text-smoke">Featured · {productMeta(featured)}</p>
                  <p className="display mt-1.5 text-2xl">{featured.name}</p>
                </div>
                <p className="shrink-0 text-sm tabular-nums text-bone/80">{formatPaise(featured.price)}</p>
              </div>
            </Link>
          ) : (
            <div className="aspect-[4/5] p-[12%]">
              <BottleArt category="PERFUME" family="AMBER" label="ForgeX" dark />
            </div>
          )}
        </motion.div>
      </div>

      {/* Reassurance row, all backed by backend rules */}
      <div className="container-x relative z-10 border-t border-line-dark">
        <ul className="grid grid-cols-1 gap-3 py-5 text-[12px] tracking-wide text-smoke sm:grid-cols-3 sm:gap-6">
          <li>Free shipping over {formatPaise(STORE_RULES.freeShippingAbovePaise)}</li>
          <li className="sm:text-center">Cash on delivery, or pay by UPI &amp; card</li>
          <li className="sm:text-right">GST invoice with every order</li>
        </ul>
      </div>
    </section>
  );
}
