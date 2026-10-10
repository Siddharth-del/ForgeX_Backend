import { JournalCard } from "@/components/editorial/JournalSection";
import { Reveal } from "@/components/ui/Reveal";
import { getJournal } from "@/lib/catalog";
import { useLoaderData } from "react-router";
import { usePageMeta } from "@/hooks/usePageMeta";

export async function loader() {
  return { journal: await getJournal() };
}

export default function JournalPage() {
  const [feature, ...rest] = useLoaderData<typeof loader>().journal;
  usePageMeta("The Journal", "Notes on oud, attars, perfume and the rituals of wearing fragrance.");

  return (
    <div className="bg-ivory pb-section">
      <header className="container-site border-b border-hair py-14 text-center md:py-20">
        <p className="eyebrow text-gold-deep">Notes on fragrance</p>
        <h1 className="mt-4 text-display-lg font-light uppercase">The Journal</h1>
        <p className="mx-auto mt-5 max-w-md text-[0.95rem] text-ink-muted">Materials, heritage and rituals, from the people who make our fragrances.</p>
      </header>
      <div className="container-site mt-14 grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
        <Reveal>
          <JournalCard article={feature} size="lg" />
        </Reveal>
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {rest.map((a, i) => (
            <Reveal key={a.slug} delay={i * 0.06}>
              <JournalCard article={a} sizes="(min-width: 1280px) 20vw, (min-width: 640px) 45vw, 90vw" />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
