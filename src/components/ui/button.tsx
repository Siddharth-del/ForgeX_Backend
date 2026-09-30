import Link, { type LinkProps } from "next/link";
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

type Variant = "primary" | "light" | "outline" | "outline-light" | "ghost" | "link";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium " +
  "tracking-[0.08em] uppercase transition-[background-color,color,border-color,transform,box-shadow] duration-300 " +
  "ease-[var(--ease-out-expo)] disabled:pointer-events-none disabled:opacity-45 active:scale-[0.985] rounded-xs";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-bone hover:bg-ink-3",
  light: "bg-bone text-ink hover:bg-white",
  outline: "border border-ink/80 text-ink hover:bg-ink hover:text-bone",
  "outline-light": "border border-bone/50 text-bone hover:border-bone hover:bg-bone hover:text-ink",
  ghost: "text-ink hover:bg-ink/5",
  link: "min-h-11 px-0 normal-case tracking-normal text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[11px]",
  md: "h-12 px-6 text-xs",
  lg: "h-14 px-8 text-xs",
  icon: "h-10 w-10 p-0",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Shows a small arrow that nudges on hover */
  arrow?: boolean;
}

export const buttonClass = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  cn(base, variants[variant], variant === "link" ? "" : sizes[size], className);

function Arrow() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/btn:translate-x-1"
    >
      <path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, arrow, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="absolute" />}
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>
        {children}
        {arrow && <Arrow />}
      </span>
    </button>
  );
});

type ButtonLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    variant?: Variant;
    size?: Size;
    arrow?: boolean;
    children: ReactNode;
  };

export function ButtonLink({ variant = "primary", size = "md", arrow, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {children}
      {arrow && <Arrow />}
    </Link>
  );
}
