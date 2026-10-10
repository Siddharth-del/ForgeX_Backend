import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { formatPrice } from "@/lib/format";
import { rupees, type BundleDTO } from "@/lib/api/types";
import { BoxBuilder } from "./BoxBuilder";
import type { Product } from "@/types";

/** Shown only when the backend has the box on sale; size and price come from it. */
export function BuildYourBoxTeaser({ box, products }: { box: BundleDTO; products: Product[] }) {
  return (
    <section aria-labelledby="box-title" className="bg-sand py-section">
      <div className="container-site grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow text-gold-deep">Your signature collection</p>
          <h2 id="box-title" className="mt-4 text-display-md uppercase">
            Build your
            <br />
            own box
          </h2>
          <p className="mt-5 max-w-sm text-[0.95rem] text-ink-muted">Choose your fragrances. Create your signature collection. Mix 50 ml perfumes and 6 ml attars in one keepsake box.</p>
          <div className="mt-10 border-y border-hair-strong py-6">
            <p className="label text-ink-muted">The offer</p>
            <p className="mt-2 font-display text-[clamp(2.6rem,5vw,3.8rem)] font-light uppercase leading-none">
              Any {box.itemCount} for <span className="text-gold-deep">{formatPrice(rupees(box.price))}</span>
            </p>
          </div>
          <ButtonLink href="/build-your-box" variant="outline" size="lg" arrow className="mt-9">
            Build your box
          </ButtonLink>
        </Reveal>
        <Reveal delay={0.1} className="min-w-0">
          <BoxBuilder box={box} products={products} compact />
        </Reveal>
      </div>
    </section>
  );
}
