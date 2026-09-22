import { Link } from 'react-router-dom';
import ProductImage from '../common/ProductImage';
import Price from '../common/Price';
import { CATEGORIES, FRAGRANCE_FAMILIES, labelOf } from '../../constants';

export default function ProductCard({ product, eager }) {
  const outOfStock = product.stock <= 0;
  const meta = [labelOf(CATEGORIES, product.category), labelOf(FRAGRANCE_FAMILIES, product.family)].filter(Boolean).join(', ');

  return (
    <article className="group relative">
      <div className="relative">
        <ProductImage src={product.image} alt={product.name} eager={eager} />
        {outOfStock ? (
          <span className="absolute left-0 top-3 bg-ink px-2 py-1 text-xs font-medium text-white">Sold out</span>
        ) : product.discount > 0 ? (
          <span className="absolute left-0 top-3 bg-forge px-2 py-1 text-xs font-medium text-white">{product.discount}% off</span>
        ) : null}
      </div>
      <div className="mt-3">
        <h3 className="font-sans text-[16px] font-medium leading-snug">
          <Link to={`/products/${product.id}`} className="after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4">
            {product.name}
          </Link>
        </h3>
        {meta && <p className="mt-0.5 text-sm text-steel">{meta}</p>}
        <div className="mt-1.5"><Price price={product.price} mrp={product.mrp} discount={product.discount} size="sm" /></div>
        {!outOfStock && product.stock <= 5 && <p className="mt-1 text-sm text-warn">Only {product.stock} left</p>}
      </div>
    </article>
  );
}
