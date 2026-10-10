import Image from "@/components/ui/Image";
import Link from "@/components/ui/Link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TextLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import type { JournalArticle } from "@/types";

export function JournalCard({ article, size = "sm", sizes }: { article: JournalArticle; size?: "lg" | "sm"; sizes?: string }) {
  return (
    <Link href={`/journal/${article.slug}`} className="group/j block">
      <div className={size === "lg" ? "relative aspect-[4/5] overflow-hidden bg-sand md:aspect-[5/6]" : "relative aspect-[16/11] overflow-hidden bg-sand"}>
        <Image src={article.image.src} alt={article.image.alt} fill sizes={sizes ?? (size === "lg" ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 22vw, 80vw")} className="object-cover transition-transform duration-[1.8s] ease-luxe group-hover/j:scale-[1.04]" />
      </div>
      <div className="pt-5">
        <p className="eyebrow text-gold-deep">
          {article.kicker} <span className="text-ink-faint">· {article.readTime}</span>
        </p>
        <h3 className={size === "lg" ? "mt-3 font-display text-[clamp(2rem,3.4vw,3rem)] font-light uppercase leading-[1]" : "mt-2.5 font-display text-[1.45rem] uppercase leading-[1.05]"}>
          <span className="link-underline">{article.title}</span>
        </h3>
        {size === "lg" && <p className="mt-4 max-w-md text-[0.92rem] text-ink-muted">{article.excerpt}</p>}
      </div>
    </Link>
  );
}

export function JournalSection({ articles }: { articles: JournalArticle[] }) {
  const [feature, ...rest] = articles;
  return (
    <section aria-labelledby="journal-title" className="bg-ivory py-section">
      <div className="container-site">
        <Reveal>
          <SectionHeading eyebrow="Notes on fragrance" title={<span id="journal-title">The journal</span>} action={<TextLink href="/journal">Read the journal</TextLink>} />
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-10">
          <Reveal>
            <JournalCard article={feature} size="lg" />
          </Reveal>
          <div className="no-scrollbar snap-x-mandatory -mx-gutter flex scroll-px-gutter gap-5 overflow-x-auto px-gutter sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 sm:overflow-visible sm:px-0">
            {rest.slice(0, 4).map((a, i) => (
              <Reveal key={a.slug} delay={i * 0.08} className="w-[78vw] shrink-0 snap-start sm:w-auto">
                <JournalCard article={a} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
