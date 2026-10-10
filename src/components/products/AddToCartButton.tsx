import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { defaultVariant, useAddToCart } from "@/hooks/useAddToCart";
import { buttonClass } from "@/components/ui/Button";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";
import type { Product, ProductVariant } from "@/types";

type State = "idle" | "adding" | "added";

interface Props {
  product: Product;
  variant?: ProductVariant;
  quantity?: number;
  label?: string;
  style?: "primary" | "outline" | "light" | "outline-light" | "gold";
  size?: "sm" | "md" | "lg";
  className?: string;
  onAdded?: () => void;
}

/** Add-to-cart with a clear three-step feedback: Add to cart → Adding → Added ✓ */
export function AddToCartButton({ product, variant, quantity = 1, label = "Add to cart", style = "outline", size = "sm", className, onAdded }: Props) {
  const v = variant ?? defaultVariant(product);
  const add = useAddToCart();
  const [state, setState] = useState<State>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  if (!v.inStock) {
    return (
      <button type="button" disabled className={buttonClass({ variant: style, size, className: cn("w-full", className) })}>
        Sold out
      </button>
    );
  }

  const onClick = () => {
    if (state !== "idle") return;
    setState("adding");
    timers.current.push(
      setTimeout(() => {
        add(product, v, quantity);
        setState("added");
        onAdded?.();
        timers.current.push(setTimeout(() => setState("idle"), 1800));
      }, 420),
    );
  };

  const text = state === "idle" ? label : state === "adding" ? "Adding" : "Added";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-live="polite"
      className={buttonClass({ variant: state === "added" ? "primary" : style, size, className: cn("w-full", className) })}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state}
          className="relative inline-flex items-center gap-2"
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {text}
          {state === "adding" && (
            <span aria-hidden className="inline-flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="h-1 w-1 rounded-full bg-current" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </span>
          )}
          {state === "added" && <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={1.6} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
