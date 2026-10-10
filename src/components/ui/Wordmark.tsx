import Link from "@/components/ui/Link";
import { site } from "@/lib/site";
import { cn } from "@/lib/cn";

/** Typographic logo: a fine ring (the "cosmos") beside a spaced serif wordmark. */
export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" aria-label={`${site.name} home`} className={cn("group inline-flex items-center gap-2.5", className)}>
      <svg aria-hidden viewBox="0 0 32 32" className="h-6 w-6 shrink-0 transition-transform duration-[1.4s] ease-luxe group-hover:rotate-[60deg] md:h-7 md:w-7">
        <circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" strokeWidth="0.9" />
        <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
        <circle cx="26.2" cy="9" r="1.9" className="fill-gold" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-[1.15rem] font-normal tracking-[0.32em] md:text-[1.3rem]", compact && "text-[1.05rem]")}>{site.wordmark}</span>
        {!compact && <span className="mt-1 hidden text-[0.52rem] font-medium uppercase tracking-[0.42em] opacity-60 sm:block">{site.descriptor}</span>}
      </span>
    </Link>
  );
}
