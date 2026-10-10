import Image from "@/components/ui/Image";
import { ButtonLink } from "@/components/ui/Button";
import { MaskLines, Reveal } from "@/components/ui/Reveal";
import { site } from "@/lib/site";
import { usePageMeta } from "@/hooks/usePageMeta";

const process = [
  { title: "Sourcing", body: "Oud, saffron, rose and sandalwood are chosen from growers and distillers we visit, and every lot is smelled before it is accepted." },
  { title: "Composition", body: "Each formula is written and rewritten over months, tested on skin in Indian heat and humidity, not only on paper strips." },
  { title: "Maturation", body: "Perfumes rest for several weeks after blending so their materials can marry. Attars are aged longer still." },
  { title: "Bottling", body: "Filled, capped and checked by hand in small batches, then packed in boxes made to be kept." },
];

export default function AboutPage() {
  usePageMeta("Our Story", site.description);

  return (
    <>
      <section className="relative overflow-hidden bg-espresso-deep text-ivory">
        <div className="relative aspect-[4/5] max-h-[82vh] w-full sm:aspect-[16/9]">
          <Image src="/images/campaign/landscape.webp" alt="Desert dunes at dusk with an attar on a stone plinth" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-espresso-deep/90 via-espresso-deep/25 to-transparent" />
          <div className="container-site absolute inset-x-0 bottom-0 pb-12 md:pb-20">
            <p className="eyebrow text-gold-soft">Our story</p>
            <h1 className="mt-5 text-display-lg font-light uppercase">
              <MaskLines lines={["Two worlds,", "one house"]} delay={0.3} />
            </h1>
          </div>
        </div>
      </section>

      <section className="bg-ivory py-section">
        <div className="container-site grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-24">
          <Reveal>
            <p className="font-display text-[clamp(1.8rem,3.2vw,2.8rem)] font-light leading-[1.2]">
              {site.name} began with a simple question: why should a modern perfume and a centuries-old attar live in different shops, for different people?
            </p>
          </Reveal>
          <Reveal delay={0.1} className="space-y-5 text-[1rem] leading-relaxed text-ink-muted">
            <p>We grew up with attar dabbed on wrists before weddings and Eid prayers, with sandalwood in temples and rose water in kitchens. We also fell for the clean architecture of contemporary perfumery.</p>
            <p>So we built one house with two worlds. Our attars keep the materials and rituals of Indian and Arabian tradition. Our perfumes speak a modern language, made for offices, cities and evenings out. What connects them is quality of material and patience in the making.</p>
          </Reveal>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2">
        {[
          { img: "/images/campaign/world-attar.webp", alt: "Attar bottles and oud smoke", eyebrow: "Attar · عطر", title: "The soul of tradition", href: "/collections/attars", cta: "Explore attars" },
          { img: "/images/campaign/world-perfume.webp", alt: "Perfume flacons in arched light", eyebrow: "Perfume · Parfum", title: "The language of modernity", href: "/collections/perfumes", cta: "Explore perfumes" },
        ].map((w) => (
          <div key={w.href} className="relative aspect-[4/5] overflow-hidden text-ivory">
            <Image src={w.img} alt={w.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-espresso-deep/85 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 md:p-12">
              <p className="eyebrow text-gold-soft">{w.eyebrow}</p>
              <h2 className="mt-3 text-display-sm uppercase">{w.title}</h2>
              <ButtonLink href={w.href} variant="outline-light" arrow className="mt-6">
                {w.cta}
              </ButtonLink>
            </div>
          </div>
        ))}
      </section>

      <section className="bg-sand py-section">
        <div className="container-site">
          <Reveal>
            <p className="eyebrow text-gold-deep">How we make fragrance</p>
            <h2 className="mt-4 text-display-md uppercase">From material to bottle</h2>
          </Reveal>
          <ol className="mt-14 grid grid-cols-1 gap-px bg-[rgba(50,24,14,0.14)] sm:grid-cols-2 lg:grid-cols-4">
            {process.map((p, i) => (
              <li key={p.title} className="bg-sand p-7 pt-8">
                <span className="font-display text-[3rem] font-light italic leading-none text-gold-deep/70">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-6 font-display text-[1.7rem] uppercase">{p.title}</h3>
                <p className="mt-3 text-[0.9rem] text-ink-muted">{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
