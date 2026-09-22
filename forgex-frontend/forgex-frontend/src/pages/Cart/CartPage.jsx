import { Link, useNavigate } from 'react-router-dom';
import { useCart, useDecrement, useIncrement, useRemoveFromCart } from '../../hooks/useCart';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import ProductImage from '../../components/common/ProductImage';
import Button from '../../components/common/Button';
import { RowsSkeleton } from '../../components/common/Skeleton';
import { EmptyState, ErrorState, Notice } from '../../components/common/States';
import PageHeader from '../../components/common/PageHeader';
import { errorMessage } from '../../utils/errors';
import { formatPaise, pluralize } from '../../utils/format';

function CartLine({ line, cartId, busy }) {
  const inc = useIncrement();
  const dec = useDecrement();
  const remove = useRemoveFromCart();
  const { product, quantity, lineTotal } = line;
  const pending = inc.isPending || dec.isPending || remove.isPending || busy;
  const atStockLimit = quantity >= product.stock;

  return (
    <li className="flex gap-4 border-b border-line py-5">
      <Link to={`/products/${product.id}`} className="w-24 shrink-0 sm:w-28">
        <ProductImage src={product.image} alt={product.name} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-4">
          <div className="min-w-0">
            <Link to={`/products/${product.id}`} className="font-medium hover:underline">{product.name}</Link>
            <p className="text-sm text-steel">{formatPaise(product.price)} each</p>
            {!product.active && <p className="text-sm text-forge">No longer available</p>}
            {product.active && product.stock < quantity && <p className="text-sm text-forge">Only {product.stock} in stock</p>}
          </div>
          <p className="price shrink-0 text-lg">{formatPaise(lineTotal)}</p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="inline-flex items-center border border-line" role="group" aria-label={`Quantity of ${product.name}`}>
            <button type="button" className="h-10 w-10 hover:bg-paper disabled:opacity-40" disabled={pending || quantity <= 1}
              onClick={() => dec.mutate(product.id)} aria-label="Decrease quantity">−</button>
            <span className="w-10 text-center tabular-nums" aria-live="polite">{quantity}</span>
            <button type="button" className="h-10 w-10 hover:bg-paper disabled:opacity-40" disabled={pending || atStockLimit}
              onClick={() => inc.mutate(product.id)} aria-label="Increase quantity">+</button>
          </div>
          <button type="button" className="text-sm text-steel underline underline-offset-4 hover:text-forge disabled:opacity-40"
            disabled={pending || !cartId} onClick={() => remove.mutate({ cartId, productId: product.id })}>Remove</button>
        </div>
      </div>
    </li>
  );
}

export default function CartPage() {
  useDocumentTitle('Cart');
  const { isAuthenticated } = useAuth();
  const { data: cart, isLoading, isError, error, refetch, unavailable, isFetching } = useCart();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="page py-16">
        <EmptyState title="Sign in to see your cart" body="Your cart is saved to your account so it follows you across devices." action="Sign in" actionTo="/login" />
      </div>
    );
  }

  return (
    <div className="page py-10">
      <PageHeader title="Cart" subtitle={cart?.count ? pluralize(cart.count, 'item') : undefined} />
      <div className="mt-6">
        {isLoading ? <RowsSkeleton rows={3} className="h-28" />
          : unavailable ? (
            <Notice title="The cart is not available yet" tone="warn">
              The store's cart service is still being set up on the server, so items can't be added or reviewed right now. Please try again later.
            </Notice>
          )
          : isError ? <ErrorState message={errorMessage(error, 'Your cart could not be loaded.')} onRetry={refetch} />
          : !cart?.lines.length ? (
            <EmptyState title="Your cart is empty" body="Browse the range and add a fragrance to get started." action="Shop fragrances" actionTo="/products" />
          ) : (
            <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
              <ul aria-label="Cart items">
                {cart.lines.map((line) => <CartLine key={line.product.id} line={line} cartId={cart.id} busy={isFetching} />)}
              </ul>
              <aside className="h-fit border border-line p-6 lg:sticky lg:top-24" aria-label="Order summary">
                <h2 className="text-xl">Summary</h2>
                <dl className="mt-4 text-[15px]">
                  <div className="flex justify-between py-1.5"><dt className="text-steel">Subtotal</dt><dd className="price">{formatPaise(cart.subtotal)}</dd></div>
                  <div className="flex justify-between py-1.5"><dt className="text-steel">Shipping and coupons</dt><dd className="text-steel">At checkout</dd></div>
                </dl>
                <p className="mt-3 text-sm text-steel">Final total is calculated securely at checkout. Prices include all taxes.</p>
                <Button className="mt-5 w-full" onClick={() => navigate('/checkout')}>Proceed to checkout</Button>
                <Link to="/products" className="mt-3 block text-center text-[15px] link">Continue shopping</Link>
              </aside>
            </div>
          )}
      </div>
    </div>
  );
}
