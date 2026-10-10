import { motion } from "framer-motion";
import { ArtDirectedImage } from "@/components/ui/ArtDirectedImage";
import { MaskLines } from "@/components/ui/Reveal";
import { EASE } from "@/lib/motion";
import type { Collection } from "@/types";

export function CollectionHero({ collection, count }: { collection: Collection; count: number }) {
  const attar = collection.world === "attar";
  return (
    <section className="relative overflow-hidden bg-espresso-deep text-ivory">
      <div className="relative aspect-[4/5] max-h-[78vh] w-full sm:aspect-[16/10] lg:aspect-[21/8]">
        <motion.div className="absolute inset-0" initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.8, ease: EASE }}>
          <ArtDirectedImage
            wide={(collection.banner ?? collection.image).src}
            narrow={collection.image.src}
            alt={(collection.banner ?? collection.image).alt}
            minWidth={640}
            priority
            className={collection.banner ? "object-cover object-[50%_60%] sm:object-[72%_50%]" : "object-cover object-[50%_60%]"}
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-espresso-deep/90 via-espresso-deep/35 to-espresso-deep/10 lg:bg-gradient-to-r lg:from-espresso-deep/85 lg:via-espresso-deep/40 lg:to-transparent" />
        {attar && (
          // Phones/tablets only: on wide screens the banner's bottles sit where the glyph would fall.
          <p aria-hidden className="pointer-events-none absolute -bottom-10 right-4 select-none font-arabic text-[11rem] leading-none text-gold/15 md:text-[16rem] lg:hidden">
            عطر
          </p>
        )}
        <div className="container-site relative z-10 flex h-full flex-col justify-end pb-10 md:pb-14 lg:justify-center lg:pb-0">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 1 }} className="eyebrow flex items-center gap-3 text-gold-soft">
            <span aria-hidden className="h-px w-10 bg-gold-soft/60" />
            {collection.eyebrow}
          </motion.p>
          <h1 className="mt-5 text-display-lg font-light uppercase">
            <MaskLines lines={[collection.title]} delay={0.3} />
          </h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 1, ease: EASE }} className="mt-5 max-w-md text-[0.98rem] text-ivory/75">
            {collection.description}
          </motion.p>
          <p className="mt-6 text-[0.7rem] uppercase tracking-[0.24em] text-ivory/55">{count} fragrances</p>
        </div>
      </div>
    </section>
  );
}
