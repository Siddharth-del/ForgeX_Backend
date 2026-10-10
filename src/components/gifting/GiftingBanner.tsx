import Image from "@/components/ui/Image";
import Link from "@/components/ui/Link";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types";

/**
 * Cinematic campaign band: deep brown, gold type, campaign photography. The backend has no
 * gift-set category, so it features the newest real products rather than gift sets.
 */
export function GiftingBanner({ sets }: { sets: Product[] }) {
  if (!sets.length) return null;
  return (
    <section aria-labelledby="gifting-title" className="grain relative overflow-hidden bg-espresso-deep text-ivory">
      <div className="relative md:flex md:aspect-[24/11] md:max-h-[50rem] md:min-h-[34rem] md:items-center">
        <div className="relative aspect-[4/3] md:absolute md:inset-0 md:aspect-auto">
          <Image src="/images/campaign/gift-banner.webp" alt="An open espresso gift box holding four Cosmic Life flacons" fill sizes="100vw" className="object-cover object-[72%_50%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-espresso-deep via-transparent to-transparent md:bg-gradient-to-r md:from-espresso-deep md:via-espresso-deep/55 md:to-transparent" />
        </div>
        <div className="container-site relative z-[2] pb-16 pt-2 md:py-16">
          <Reveal className="max-w-md">
            <p className="eyebrow flex items-center gap-3 text-gold-soft">
              <span aria-hidden className="h-px w-10 bg-gold-soft/60" />
              Luxury gifting
            </p>
            <h2 id="gifting-title" className="mt-6 font-display text-display-lg font-light uppercase text-gold-soft">
              Discover
              <br />
              <em className="font-light italic text-ivory">luxury</em>
            </h2>
            <p className="mt-6 text-[1rem] text-ivory/70">Perfumes and attars worth giving. Start with the newest compositions from the house.</p>
            <ButtonLink href="/collections/new-arrivals" variant="gold" size="lg" arrow className="mt-9">
              Shop new arrivals
            </ButtonLink>
            <ul className="mt-10 grid gap-px border-t border-hair-light">
              {sets.slice(0, 3).map((s) => (
                <li key={s.id}>
                  <Link href={`/products/${s.slug}`} className="group flex items-baseline justify-between gap-4 border-b border-hair-light py-3.5 text-[0.85rem] transition-colors hover:text-gold-soft">
                    <span className="font-display text-[1.15rem] uppercase tracking-[0.04em]">{s.name}</span>
                    <span className="tabular text-ivory/60 group-hover:text-gold-soft">{formatPrice(s.variants[0].price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
