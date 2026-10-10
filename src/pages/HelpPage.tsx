import Link from "@/components/ui/Link";
import { helpPages } from "@/data/help";
import { cn } from "@/lib/cn";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { notFound } from "@/lib/router";
import { usePageMeta } from "@/hooks/usePageMeta";

export async function loader({ params }: LoaderFunctionArgs) {
  const slug = params.slug ?? "";
  const page = helpPages.find((p) => p.slug === slug);
  if (!page) notFound();
  return { slug, page };
}

export default function HelpPage() {
  const { slug, page } = useLoaderData<typeof loader>();
  usePageMeta(page.title, page.intro);

  return (
    <div className="bg-ivory">
      <div className="container-site grid grid-cols-1 gap-12 py-14 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-20 md:py-20">
        <nav aria-label="Help topics" className="order-2 md:order-1">
          <p className="label mb-4 text-ink-faint">Customer care</p>
          <ul className="space-y-2.5 text-[0.88rem]">
            {helpPages.map((p) => (
              <li key={p.slug}>
                <Link href={`/help/${p.slug}`} aria-current={p.slug === slug ? "page" : undefined} className={cn("link-underline", p.slug === slug ? "text-ink" : "text-ink-muted hover:text-ink")}>
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="order-1 max-w-2xl md:order-2">
          <h1 className="text-display-md uppercase">{page.title}</h1>
          <p className="mt-5 font-display text-[1.35rem] italic text-ink-muted">{page.intro}</p>
          {page.template && (
            <p className="mt-6 border-l-2 border-gold pl-4 text-[0.82rem] text-ink-muted">Template policy. Review and adapt it with your legal advisor before launch.</p>
          )}
          {page.sections?.map((s) => (
            <section key={s.heading} className="mt-10 border-t border-hair pt-8">
              <h2 className="font-display text-[1.7rem] uppercase">{s.heading}</h2>
              {s.body.map((b) => (
                <p key={b} className="mt-3 text-[0.95rem] leading-relaxed text-ink-muted">
                  {b}
                </p>
              ))}
            </section>
          ))}
          {page.faqs && (
            <div className="mt-10 border-t border-hair">
              {page.faqs.map((f) => (
                <details key={f.q} className="group border-b border-hair">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-display text-[1.35rem] leading-snug [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden className="text-xl text-gold-deep transition-transform duration-500 group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-6 text-[0.95rem] leading-relaxed text-ink-muted">{f.a}</p>
                </details>
              ))}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
