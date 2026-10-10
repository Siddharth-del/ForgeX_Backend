import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArtDirectedImage } from "@/components/ui/ArtDirectedImage";
import { ButtonLink } from "@/components/ui/Button";
import { MaskLines } from "@/components/ui/Reveal";
import { EASE } from "@/lib/motion";
import { site } from "@/lib/site";

const ALT = "Cosmic Life perfume and attar bottles on a travertine plinth among desert dunes at golden hour";

function HeroActions({ className }: { className?: string }) {
  return (
    <div className={className}>
      <ButtonLink href="/collections/perfumes" variant="light" size="lg" arrow className="max-md:w-full max-md:justify-center">
        Shop perfumes
      </ButtonLink>
      <ButtonLink href="/collections/attars" variant="outline-light" size="lg" className="max-md:w-full max-md:justify-center">
        Explore attars
      </ButtonLink>
    </div>
  );
}

export function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} aria-label="Introduction" className="relative -mt-[4.25rem] overflow-hidden bg-espresso-deep text-ivory md:-mt-[4.75rem]">
      <div className="relative aspect-[3/4.6] max-h-[78svh] min-h-[30rem] w-full md:aspect-[2/1] md:max-h-[92vh] md:min-h-0">
        {/* Image reveal: unmasks upward, settles from a slight zoom */}
        <motion.div
          className="absolute inset-0"
          initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
          animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
          transition={{ duration: 1.6, ease: EASE }}
        >
          <motion.div className="absolute inset-[-6%_0_0_0]" style={{ y: imgY }} initial={{ scale: 1.14 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease: EASE }}>
            <ArtDirectedImage wide="/images/campaign/hero.webp" narrow="/images/campaign/hero-mobile.webp" alt={ALT} priority className="object-cover object-[46%_100%] md:object-[70%_50%]" />
          </motion.div>
          {/* Legibility gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-espresso-deep/75 via-espresso-deep/5 to-espresso-deep/40 md:bg-gradient-to-r md:from-espresso-deep/75 md:via-espresso-deep/25 md:to-transparent" />
          <div className="absolute inset-x-0 bottom-0 hidden h-1/3 bg-gradient-to-t from-espresso-deep/45 to-transparent md:block" />
        </motion.div>

        <motion.div style={{ y: textY, opacity: fade }} className="container-site relative z-10 flex h-full flex-col justify-start pt-[5.75rem] md:justify-center md:pt-12">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.7 }} className="eyebrow mb-4 flex items-center gap-3 text-gold-soft md:mb-6">
            <span aria-hidden className="h-px w-10 bg-gold-soft/60" />
            {site.descriptor}
          </motion.p>
          <h1 className="text-[clamp(2.6rem,6.3vw,6.1rem)] font-light uppercase leading-[0.94]">
            <MaskLines lines={["The art of", "your presence"]} delay={0.55} />
          </h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1.1, ease: EASE }} className="mt-6 hidden max-w-sm font-display text-[1.55rem] italic text-ivory/85 md:block">
            {site.tagline}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1.3, ease: EASE }} className="hidden md:block">
            <HeroActions className="mt-9 flex flex-wrap gap-3" />
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 1 }} className="container-site absolute inset-x-0 bottom-6 z-10 hidden items-end justify-between text-[0.68rem] uppercase tracking-[0.22em] text-ivory/70 md:flex">
          <p>{site.descriptor}</p>
          <div className="flex items-center gap-3">
            <span>Scroll</span>
            <span aria-hidden className="relative block h-10 w-px overflow-hidden bg-ivory/25">
              <motion.span className="absolute inset-x-0 top-0 h-1/2 bg-ivory" animate={{ y: ["-100%", "200%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />
            </span>
          </div>
        </motion.div>
      </div>

      {/* Phones: tagline and actions sit below the image so nothing covers the bottles */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1.1, ease: EASE }} className="container-site relative z-10 pb-9 pt-6 md:hidden">
        <p className="font-display text-[1.3rem] italic text-ivory/85">{site.tagline}</p>
        <HeroActions className="mt-6 flex flex-col gap-3" />
      </motion.div>
    </section>
  );
}
