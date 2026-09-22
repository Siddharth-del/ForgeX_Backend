import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { catalogKeys, useProduct } from '../../hooks/useCatalog';
import { useAddToCart } from '../../hooks/useCart';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import ProductImage from '../../components/common/ProductImage';
import Price from '../../components/common/Price';
import Button from '../../components/common/Button';
import ProductGrid from '../../components/product/ProductGrid';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState, ErrorState } from '../../components/common/States';
import { CATEGORIES, FRAGRANCE_FAMILIES, GENDERS, labelOf } from '../../constants';
import { errorMessage } from '../../utils/errors';
import { formatPaise } from '../../utils/format';

const MAX_QTY = 10;

function DetailsSkeleton() {
  return (
    <div className="page grid gap-10 py-10 md:grid-cols-2" role="status" aria-label="Loading product">
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-24 w-full" /><Skeleton className="h-12 w-1/2" />
      </div>
    </div>
  );
}

export default function ProductDetailsPage() {
  const { id } = useParams();
  const { product, data: catalog, isLoading, isError, error, refetch } = useProduct(id);
  const { isAuthenticated } = useAuth();
  const addToCart = useAddToCart();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const [action, setAction] = useState(null);

  useDocumentTitle(product?.name ?? 'Product', product ? `${product.name} — ${product.description?.slice(0, 140) || 'ForgeX fragrance'}` : undefined);

  if (isLoading) return <DetailsSkeleton />;
  if (isError) return <div className="page py-10"><ErrorState message={errorMessage(error, 'This product could not be loaded.')} onRetry={refetch} /></div>;
  if (!product || !product.active) {
    return (
      <div className="page py-16">
        <EmptyState title="Product not found" body="It may have been removed or is no longer available." action="Browse all fragrances" actionTo="/products" />
      </div>
    );
  }

  const outOfStock = product.stock <= 0;
  const maxQty = Math.max(1, Math.min(MAX_QTY, product.stock));
  const related = (catalog ?? []).filter((p) => p.active && p.id !== product.id && p.category === product.category && p.stock > 0).slice(0, 4);

  const add = async (goToCart) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setAction(goToCart ? 'buy' : 'add');
    try {
      await addToCart.mutateAsync({ productId: product.id, quantity: qty });
      if (goToCart) navigate('/cart');
    } catch {
      // Stock may have changed since the page loaded — refresh it.
      qc.invalidateQueries({ queryKey: catalogKeys.catalog });
    } finally {
      setAction(null);
    }
  };

  const specs = [
    ['Type', labelOf(CATEGORIES, product.category)],
    ['For', labelOf(GENDERS, product.gender)],
    ['Fragrance family', labelOf(FRAGRANCE_FAMILIES, product.family)],
  ].filter(([, v]) => v);

  return (
    <div className="page py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-steel">
        <ol className="flex flex-wrap gap-2">
          <li><Link to="/products" className="hover:text-ink">Shop</Link> /</li>
          {product.category && <li><Link to={`/products?category=${product.category}`} className="hover:text-ink">{labelOf(CATEGORIES, product.category)}</Link> /</li>}
          <li aria-current="page" className="text-ink">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
        <ProductImage src={product.image} alt={product.name} eager className="aspect-[4/5]" />

        <div className="md:pt-4">
          <h1 className="text-4xl sm:text-5xl">{product.name}</h1>
          <div className="mt-4"><Price price={product.price} mrp={product.mrp} discount={product.discount} size="lg" /></div>
          {product.mrp > product.price && (
            <p className="mt-1 text-[15px] text-steel">You save {formatPaise(product.mrp - product.price)}. MRP inclusive of all taxes.</p>
          )}

          <p className={`mt-5 text-[15px] font-medium ${outOfStock ? 'text-forge' : product.stock <= 5 ? 'text-warn' : 'text-ok'}`}>
            {outOfStock ? 'Out of stock' : product.stock <= 5 ? `Only ${product.stock} left in stock` : 'In stock'}
          </p>

          {!outOfStock && (
            <div className="mt-6">
              <span id="qty-label" className="field-label">Quantity</span>
              <div className="inline-flex items-center border border-line" role="group" aria-labelledby="qty-label">
                <button type="button" className="h-11 w-11 text-lg hover:bg-paper disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity">−</button>
                <output className="w-12 text-center tabular-nums" aria-live="polite">{qty}</output>
                <button type="button" className="h-11 w-11 text-lg hover:bg-paper disabled:opacity-40" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label="Increase quantity">+</button>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" className="sm:min-w-[180px]" loading={action === 'add'} disabled={outOfStock || action === 'buy'} onClick={() => add(false)}>
              {outOfStock ? 'Sold out' : 'Add to cart'}
            </Button>
            {!outOfStock && <Button variant="accent" className="sm:min-w-[180px]" loading={action === 'buy'} disabled={action === 'add'} onClick={() => add(true)}>Buy now</Button>}
          </div>
          {!isAuthenticated && !outOfStock && <p className="mt-3 text-sm text-steel">You'll be asked to sign in before adding to your cart.</p>}

          {product.description && (
            <div className="mt-10 border-t border-line pt-6">
              <h2 className="font-sans text-[15px] font-semibold">About this fragrance</h2>
              <p className="mt-2 whitespace-pre-line text-steel">{product.description}</p>
            </div>
          )}

          {specs.length > 0 && (
            <dl className="mt-6 border-t border-line pt-6 text-[15px]">
              {specs.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-1.5"><dt className="text-steel">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-2xl sm:text-3xl">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
