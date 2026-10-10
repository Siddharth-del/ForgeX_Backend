import Link from "@/components/ui/Link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "light" | "outline-light" | "gold" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex items-center justify-center gap-3 overflow-hidden whitespace-nowrap font-sans font-medium uppercase tracking-[0.2em] transition-colors duration-500 ease-luxe disabled:pointer-events-none disabled:opacity-45 isolate";

const sizes: Record<Size, string> = {
  sm: "h-10 px-5 text-[0.66rem]",
  md: "h-12 px-7 text-[0.7rem]",
  lg: "h-14 px-9 text-[0.72rem]",
};

/* Each variant has a fill layer (::before) that rises on hover. */
const variants: Record<Variant, string> = {
  primary:
    "bg-espresso text-ivory before:bg-ink hover:text-ivory",
  outline:
    "border border-espresso/70 text-espresso before:bg-espresso hover:text-ivory",
  light: "bg-ivory text-espresso before:bg-sand hover:text-espresso",
  "outline-light": "border border-ivory/55 text-ivory before:bg-ivory hover:text-espresso",
  gold: "border border-gold/80 text-gold-soft before:bg-gold hover:text-espresso",
  ghost: "text-espresso before:bg-transparent",
};

const fill =
  "before:absolute before:inset-0 before:-z-10 before:origin-bottom before:scale-y-0 before:transition-transform before:duration-500 before:ease-luxe hover:before:scale-y-100";

type Common = { variant?: Variant; size?: Size; arrow?: boolean; children: ReactNode; className?: string };

export function buttonClass({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string }) {
  return cn(base, fill, sizes[size], variants[variant], className);
}

function Inner({ children, arrow }: { children: ReactNode; arrow?: boolean }) {
  return (
    <>
      <span className="relative inline-flex items-center gap-2.5">{children}</span>
      {arrow && <ArrowRight aria-hidden className="relative h-3.5 w-3.5 transition-transform duration-500 ease-luxe group-hover/btn:translate-x-1" strokeWidth={1.4} />}
    </>
  );
}

export function Button({ variant, size, arrow, children, className, ...rest }: Common & Omit<ComponentProps<"button">, "children">) {
  return (
    <button className={buttonClass({ variant, size, className })} {...rest}>
      <Inner arrow={arrow}>{children}</Inner>
    </button>
  );
}

export function ButtonLink({ variant, size, arrow, children, className, ...rest }: Common & Omit<ComponentProps<typeof Link>, "children">) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...rest}>
      <Inner arrow={arrow}>{children}</Inner>
    </Link>
  );
}

/** Understated text link with an animated underline and arrow. */
export function TextLink({ children, className, ...rest }: { children: ReactNode; className?: string } & Omit<ComponentProps<typeof Link>, "children">) {
  return (
    <Link className={cn("group/tl inline-flex items-center gap-2 label", className)} {...rest}>
      <span className="link-underline pb-1">{children}</span>
      <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-500 ease-luxe group-hover/tl:translate-x-1" strokeWidth={1.4} />
    </Link>
  );
}
