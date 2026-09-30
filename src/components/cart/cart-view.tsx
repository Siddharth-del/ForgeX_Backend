"use client";

import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { qk, useSession } from "@/hooks/use-auth";
import { checkoutApi } from "@/lib/api/endpoints";
import { errorMessage } from "@/lib/api/client";
import { ButtonLink } from "../ui/button";
import { Skeleton } from "../ui/misc";
import { EmptyState, ErrorState } from "../states/states";
import { Totals } from "../checkout/order-summary";
import { CartLine } from "./cart-line";
import { ShippingMeter } from "./shipping-meter";

export function CartView() {
  const { isSignedIn, isLoading: sessionLoading } = useSession();
  const { cart, count, isPending, isError, error, refetch } = useCart();
  const items = cart?.products ?? [];
  const preview = useQuery({
    queryKey: qk.preview(""),
    queryFn: () => checkoutApi.preview(),
    enabled: isSignedIn && items.length > 0,
  });

  return (
    <div className="container-x pb-24 pt-28 md:pt-36">
      <header className="flex items-baseline gap-4 border-b border-line pb-8">
        <h1 className="display text-5xl sm:text-7xl">Your bag</h1>
        {count > 0 && <span className="text-stone">{count} item{count === 1 ? "" : "s"}</span>}
      </header>

      {sessionLoading ? (
        <Skeleton className="mt-10 h-40 w-full" />
      ) : !isSignedIn ? (
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" strokeWidth={1} />}
          title="Sign in to see your bag"
          body="Your bag is saved to your account, so it follows you across devices."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink href="/login?next=/cart">Sign in</ButtonLink>
              <ButtonLink href="/register?next=/cart" variant="outline">
                Create account
              </ButtonLink>
            </div>
          }
        />
      ) : isPending ? (
        <div className="mt-10 space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" strokeWidth={1} />}
          title="Your bag is empty"
          body="Find something that stays with you."
          action={
            <ButtonLink href="/shop" arrow>
              Browse fragrances
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-12 pt-6 lg:grid-cols-12 lg:gap-16">
          <ul className="divide-y divide-line lg:col-span-7">
            {items.map((item) => (
              <CartLine key={item.productId} item={item} cartId={cart!.cartId} />
            ))}
          </ul>
          <aside className="lg:col-span-5">
            <div className="bg-bone p-6 sm:p-8 lg:sticky lg:top-28">
              <h2 className="eyebrow">Summary</h2>
              <div className="mt-6">
                <ShippingMeter subtotal={preview.data?.subtotal ?? cart?.totalPrice ?? 0} />
              </div>
              {preview.isPending ? (
                <Skeleton className="mt-6 h-40 w-full" />
              ) : preview.isError ? (
                <p className="mt-6 text-sm text-ember">{errorMessage(preview.error)}</p>
              ) : (
                <Totals price={preview.data!} className="mt-6" />
              )}
              <ButtonLink href="/checkout" size="lg" className="mt-8 w-full" arrow>
                Checkout
              </ButtonLink>
              <p className="mt-4 text-center text-[12px] text-stone">Have a coupon? Apply it at checkout.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
