import { ArrowLeft, ArrowRight } from "lucide-react";
import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  children: ReactNode;
  label: string;
  tone?: "light" | "dark";
  /** Tailwind width classes for each slide. */
  itemClassName?: string;
  className?: string;
}

/**
 * Native scroll-snap carousel: swipe on touch, arrow buttons + progress line on desktop.
 * Bleeds to the screen edge on mobile so the next card peeks in.
 */
export function ProductCarousel({ children, label, tone = "dark", itemClassName = "w-[72vw] xs:w-[56vw] sm:w-[40vw] md:w-[30vw] lg:w-[calc((100%-4.5rem)/4)]", className }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [thumb, setThumb] = useState(0.25);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setThumb(Math.min(1, el.clientWidth / el.scrollWidth));
    setProgress(max > 0 ? el.scrollLeft / max : 0);
    setAtStart(el.scrollLeft < 4);
    setAtEnd(el.scrollLeft > max - 4);
  }, []);

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, children]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-slide]");
    const step = card ? card.offsetWidth + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step * (window.innerWidth >= 1024 ? 2 : 1), behavior: "smooth" });
  };

  const light = tone === "light";

  return (
    <div className={cn("relative", className)} role="region" aria-roledescription="carousel" aria-label={label}>
      <div
        ref={scroller}
        onScroll={measure}
        className="no-scrollbar snap-x-mandatory -mx-gutter flex scroll-px-gutter gap-4 overflow-x-auto scroll-smooth px-gutter pb-2 md:gap-6"
      >
        {Children.map(children, (child, i) => (
          <div data-slide key={i} className={cn("shrink-0 snap-start", itemClassName)}>
            {child}
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-6">
        <div className={cn("relative h-px flex-1", light ? "bg-ivory/20" : "bg-espresso/15")} aria-hidden>
          <div
            className={cn("absolute top-0 h-px transition-[left] duration-300 ease-out", light ? "bg-ivory" : "bg-espresso")}
            style={{ width: `${thumb * 100}%`, left: `${progress * (1 - thumb) * 100}%` }}
          />
        </div>
        <div className="hidden gap-2 md:flex">
          {[-1, 1].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => scrollBy(d as 1 | -1)}
              disabled={d === -1 ? atStart : atEnd}
              aria-label={d === -1 ? "Previous" : "Next"}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-300 disabled:opacity-30",
                light ? "border-ivory/40 text-ivory hover:bg-ivory hover:text-espresso" : "border-espresso/30 text-espresso hover:bg-espresso hover:text-ivory",
              )}
            >
              {d === -1 ? <ArrowLeft className="h-4 w-4" strokeWidth={1.3} /> : <ArrowRight className="h-4 w-4" strokeWidth={1.3} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
