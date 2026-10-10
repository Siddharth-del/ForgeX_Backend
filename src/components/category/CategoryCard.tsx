import Image from "@/components/ui/Image";
import Link from "@/components/ui/Link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Category } from "@/types";

export function CategoryCard({ category, className, sizes = "(min-width: 1024px) 33vw, 80vw" }: { category: Category; className?: string; sizes?: string }) {
  return (
    <Link href={category.href} className={cn("group/cat relative block overflow-hidden bg-espresso text-ivory", className)}>
      <Image src={category.image.src} alt={category.image.alt} fill sizes={sizes} className="object-cover transition-transform duration-[1.8s] ease-luxe group-hover/cat:scale-[1.05]" />
      <div className="absolute inset-0 bg-gradient-to-t from-espresso-deep/80 via-espresso-deep/15 to-transparent transition-opacity duration-700 group-hover/cat:opacity-95" />
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
        <h3 className="font-display text-[2rem] font-light uppercase leading-none tracking-[0.03em] md:text-[2.3rem]">{category.title}</h3>
        <p className="mt-2 max-w-[18rem] text-[0.82rem] leading-snug text-ivory/75">{category.description}</p>
        <span className="mt-4 inline-flex items-center gap-2.5 text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ivory/90 transition-colors duration-500 group-hover/cat:text-gold-soft">
          Explore
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 ease-luxe group-hover/cat:translate-x-1.5" strokeWidth={1.3} />
        </span>
      </div>
    </Link>
  );
}
