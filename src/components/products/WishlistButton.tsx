import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useHydrated } from "@/hooks/useHydrated";
import { useWishlist } from "@/store/wishlist";
import { toast } from "@/store/toast";
import { cn } from "@/lib/cn";
import type { Product } from "@/types";

export function WishlistButton({ product, className, variant = "floating" }: { product: Product; className?: string; variant?: "floating" | "inline" }) {
  const hydrated = useHydrated();
  const ids = useWishlist((s) => s.ids);
  const toggle = useWishlist((s) => s.toggle);
  const saved = hydrated && ids.includes(product.id);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggle(product.id);
    toast({ title: added ? `${product.name} saved to your wishlist` : `${product.name} removed from your wishlist`, image: product.images[0]?.src });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      className={cn(
        "inline-flex items-center justify-center transition-colors duration-300",
        variant === "floating"
          ? "h-9 w-9 rounded-full bg-ivory/80 text-espresso backdrop-blur-sm hover:bg-ivory"
          : "h-12 w-12 border border-espresso/30 text-espresso hover:border-espresso",
        className,
      )}
    >
      <motion.span key={String(saved)} initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 22 }}>
        <Heart className={cn("h-4 w-4", saved && "fill-espresso")} strokeWidth={1.3} />
      </motion.span>
    </button>
  );
}
