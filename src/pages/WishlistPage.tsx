import { WishlistView } from "@/components/products/WishlistView";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function WishlistPage() {
  usePageMeta("Wishlist");

  return (
    <div className="bg-ivory pb-section">
      <header className="container-site border-b border-hair py-14 md:py-20">
        <p className="eyebrow text-gold-deep">Saved for later</p>
        <h1 className="mt-4 text-display-lg font-light uppercase">Wishlist</h1>
      </header>
      <div className="container-site mt-12">
        <WishlistView />
      </div>
    </div>
  );
}
