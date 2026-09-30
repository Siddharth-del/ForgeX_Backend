"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatPaise } from "@/lib/utils";
import { errorMessage } from "@/lib/api/client";
import { useUI } from "../providers";
import { Sheet } from "../ui/sheet";
import { ButtonLink } from "../ui/button";
import { EmptyState, ErrorState } from "../states/states";
import { CartLine } from "./cart-line";
import { ShippingMeter } from "./shipping-meter";

export function CartDrawer() {
  const { cartOpen, closeCart } = useUI();
  const { cart, count, isPending, isError, error, refetch } = useCart();
  const items = cart?.products ?? [];
  const subtotal = cart?.totalPrice ?? 0;

  return (
    <Sheet open={cartOpen} onClose={closeCart} title="Your bag">
      <div className="flex items-baseline gap-3 border-b border-line px-6 pb-5 pt-7">
        <h2 className="display text-3xl">Your bag</h2>
        {count > 0 && <span className="text-sm text-stone">{count} item{count === 1 ? "" : "s"}</span>}
      </div>

      {isPending ? (
        <div className="space-y-5 p-6">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="skeleton aspect-[4/5] w-24" />
              <div className="flex-1 space-y-3">
                <div className="skeleton h-3 w-1/3" />
                <div className="skeleton h-5 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" strokeWidth={1} />}
          title="Your bag is empty"
          body="Find something that stays with you."
          action={
            <ButtonLink href="/shop" onClick={closeCart} arrow>
              Browse fragrances
            </ButtonLink>
          }
          className="my-auto"
        />
      ) : (
        <>
          <div className="border-b border-line px-6 py-4">
            <ShippingMeter subtotal={subtotal} />
          </div>
          <ul className="flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-6">
            {items.map((item) => (
              <CartLine key={item.productId} item={item} cartId={cart!.cartId} compact onNavigate={closeCart} />
            ))}
          </ul>
          <div className="border-t border-line bg-paper px-6 pb-6 pt-5">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow text-stone">Subtotal</span>
              <span className="text-xl font-medium tabular-nums">{formatPaise(subtotal)}</span>
            </div>
            <p className="mt-1 text-[13px] text-stone">Shipping and coupons are applied at checkout.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <ButtonLink href="/cart" variant="outline" onClick={closeCart}>
                View bag
              </ButtonLink>
              <ButtonLink href="/checkout" onClick={closeCart}>
                Checkout
              </ButtonLink>
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}
