"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES, FAMILIES, GENDERS, SORTS, type SortValue } from "@/lib/constants";
import { shopHref, type ShopQuery } from "@/lib/catalog-query";
import { cn } from "@/lib/utils";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex h-10 items-center rounded-full border px-4 text-sm transition-colors duration-300 sm:h-9 sm:text-[13px]",
        active ? "border-ink bg-ink text-bone" : "border-line text-ink hover:border-ink",
      )}
    >
      {children}
    </Link>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-3 text-stone">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

export function ShopToolbar({ query, total }: { query: ShopQuery; total: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const base = { ...query, page: 1 };
  const activeCount = [query.category, query.gender, query.family].filter(Boolean).length;

  const filters = (
    <div className="space-y-8">
      <Group title="Type">
        <Chip href={shopHref({ ...base, category: undefined })} active={!query.category}>
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.value} href={shopHref({ ...base, category: c.value })} active={query.category === c.value}>
            {c.plural}
          </Chip>
        ))}
      </Group>
      <Group title="For">
        <Chip href={shopHref({ ...base, gender: undefined })} active={!query.gender}>
          Anyone
        </Chip>
        {GENDERS.map((g) => (
          <Chip key={g.value} href={shopHref({ ...base, gender: g.value })} active={query.gender === g.value}>
            {g.label.replace("For ", "")}
          </Chip>
        ))}
      </Group>
      <Group title="Family">
        <Chip href={shopHref({ ...base, family: undefined })} active={!query.family}>
          All
        </Chip>
        {FAMILIES.map((f) => (
          <Chip key={f.value} href={shopHref({ ...base, family: f.value })} active={query.family === f.value}>
            {f.label}
          </Chip>
        ))}
      </Group>
    </div>
  );

  return (
    <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 border-y border-line bg-paper/90 backdrop-blur-xl transition-[top] duration-500 ease-[var(--ease-out-expo)] md:top-[calc(72px+env(safe-area-inset-top))] [html[data-nav-hidden]_&]:top-[env(safe-area-inset-top)]">
      <div className="container-x flex h-14 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="eyebrow -ml-1 inline-flex h-11 items-center gap-2 px-1"
            aria-haspopup="dialog"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.25} />
            Filter{activeCount ? ` (${activeCount})` : ""}
          </button>
          <span className="hidden text-line sm:inline" aria-hidden>
            |
          </span>
          <p className={cn("hidden truncate text-[13px] text-stone transition-opacity sm:block", pending && "opacity-50")} aria-live="polite">
            {total} {total === 1 ? "fragrance" : "fragrances"}
          </p>
          {activeCount > 0 && (
            <Link href={shopHref({ q: query.q, sort: query.sort })} scroll={false} className="hidden h-11 items-center gap-1 text-[13px] text-stone hover:text-ink md:inline-flex">
              <X className="h-3.5 w-3.5" /> Clear filters
            </Link>
          )}
        </div>

        <label className="flex items-center gap-2">
          <span className="eyebrow hidden text-stone sm:inline">Sort</span>
          <select
            value={query.sort}
            onChange={(e) => start(() => router.push(shopHref({ ...base, sort: e.target.value as SortValue }), { scroll: false }))}
            className="h-10 cursor-pointer appearance-none rounded-full border border-line bg-transparent pl-4 pr-8 text-base focus:border-ink focus:outline-none sm:h-9 sm:text-[13px]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' fill='none' stroke='%237d776e' stroke-width='1.25'/></svg>\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              backgroundSize: "10px",
            }}
            aria-label="Sort fragrances"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} side="left" title="Filters">
        <div className="flex h-full flex-col">
          <div className="border-b border-line px-6 pb-5 pt-7">
            <h2 className="display text-3xl">Filter</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-8">
            {filters}
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-line p-6">
            <Button variant="outline" onClick={() => { setOpen(false); router.push(shopHref({ q: query.q, sort: query.sort }), { scroll: false }); }}>
              Clear
            </Button>
            <Button onClick={() => setOpen(false)} loading={pending}>
              Show {total}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
