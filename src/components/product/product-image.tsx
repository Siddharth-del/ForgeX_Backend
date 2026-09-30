"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BottleArt } from "./bottle-art";

/** Hosts configured in next.config.ts images.remotePatterns get Next's optimiser. */
const OPTIMISABLE = /^https:\/\/res\.cloudinary\.com\//;

/**
 * Product photography with a consistent stage. Falls back to vector bottle art when
 * the backend has no image yet or the URL fails, so the grid never shows a broken icon.
 */
export function ProductImage({
  product,
  sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw",
  priority,
  className,
  dark,
}: {
  product: Pick<Product, "image" | "name" | "category" | "fragranceFamily">;
  sizes?: string;
  priority?: boolean;
  className?: string;
  dark?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = product.image && /^https?:\/\//.test(product.image) ? product.image : null;

  return (
    <div className={cn("relative overflow-hidden", dark ? "bg-ink-2" : "bg-sand/60", className)}>
      {src && !failed ? (
        <Image
          src={src}
          alt={product.name}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={!OPTIMISABLE.test(src)}
          onError={() => setFailed(true)}
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-[14%]">
          <BottleArt category={product.category} family={product.fragranceFamily} label={product.name} dark={dark} />
        </div>
      )}
    </div>
  );
}
