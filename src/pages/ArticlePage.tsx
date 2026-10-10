import Image from "@/components/ui/Image";
import Link from "@/components/ui/Link";
import { ProductCard } from "@/components/products/ProductCard";
import { TextLink } from "@/components/ui/Button";
import { getArticle, getCollectionProducts, getJournal } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { notFound } from "@/lib/router";
import { usePageMeta } from "@/hooks/usePageMeta";

export async function loader({ params }: LoaderFunctionArgs) {
  const slug = params.slug ?? "";
  const article = await getArticle(slug);
  if (!article) notFound();
  const all = await getJournal();
  const next = all[(all.findIndex((a) => a.slug === slug) + 1) % all.length];
  const shop = await getCollectionProducts(slug.includes("oud") ? "oud" : slug.includes("attar") ? "attars" : "all").catch(() => []);
  return { article, next, shop };
}

export default function ArticlePage() {
  const { article, next, shop } = useLoaderData<typeof loader>();
  usePageMeta(article.title, article.excerpt);

  return (
    <article className="bg-ivory">
      <header className="container-site max-w-4xl pb-10 pt-14 text-center md:pt-20">
        <p className="eyebrow text-gold-deep">
          {article.kicker} · {article.readTime}
        </p>
        <h1 className="mt-5 text-display-lg font-light uppercase">{article.title}</h1>
        <p className="mx-auto mt-6 max-w-xl font-display text-[1.4rem] italic text-ink-muted">{article.excerpt}</p>
        <p className="mt-6 text-[0.75rem] uppercase tracking-[0.2em] text-ink-faint">
          <time dateTime={article.date}>{formatDate(article.date)}</time>
        </p>
      </header>
      <div className="container-site">
        <div className="relative mx-auto aspect-[16/10] max-w-6xl overflow-hidden bg-sand">
          <Image
            src={(article.cover ?? article.image).src}
            alt={(article.cover ?? article.image).alt}
            fill
            priority
            sizes="(min-width: 1280px) 72rem, 100vw"
            className="object-cover"
            style={article.cover?.position ? { objectPosition: article.cover.position } : undefined}
          />
        </div>
      </div>
      <div className="container-site max-w-prose py-16 text-[1.05rem] leading-[1.85] text-ink/90">
        {article.body.map((block, i) => (
          <section key={i} className="mt-10 first:mt-0">
            {block.heading && <h2 className="mb-4 font-display text-[2rem] uppercase leading-tight">{block.heading}</h2>}
            {block.paragraphs.map((p, j) => (
              <p key={j} className={i === 0 && j === 0 ? "mb-5 first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-[4.6rem] first-letter:leading-[0.8] first-letter:text-gold-deep" : "mb-5"}>
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
      {shop.length > 0 && (
      <section className="bg-sand py-section">
        <div className="container-site">
          <div className="flex items-end justify-between gap-6">
            <h2 className="text-display-sm uppercase">Shop the story</h2>
            <TextLink href="/collections/all">Shop all</TextLink>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {shop.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} sizes="(min-width: 768px) 24vw, 47vw" />
            ))}
          </div>
        </div>
      </section>
      )}
      <Link href={`/journal/${next.slug}`} className="group block border-t border-hair bg-ivory py-16 text-center">
        <p className="eyebrow text-ink-faint">Next story</p>
        <p className="mt-3 font-display text-display-sm uppercase transition-colors group-hover:text-gold-deep">{next.title}</p>
      </Link>
    </article>
  );
}
