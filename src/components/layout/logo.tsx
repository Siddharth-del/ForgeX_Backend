import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="ForgeX — home"
      className={cn("-my-3 inline-flex items-baseline whitespace-nowrap py-3 text-[16px] font-semibold leading-none tracking-[0.3em] sm:text-[19px] sm:tracking-[0.34em]", className)}
    >
      FORGE<span className="-mr-[0.3em] text-ember sm:-mr-[0.34em]">X</span>
    </Link>
  );
}
