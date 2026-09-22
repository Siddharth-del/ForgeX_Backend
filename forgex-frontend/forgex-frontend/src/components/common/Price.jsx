import { formatPaise } from '../../utils/format';

export default function Price({ price, mrp, discount, size = 'md' }) {
  const showMrp = mrp && price && mrp > price;
  const sizes = { sm: 'text-base', md: 'text-lg', lg: 'text-3xl' };
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className={`price ${sizes[size]}`}>{formatPaise(price)}</span>
      {showMrp && (
        <>
          <span className="text-sm text-mist line-through"><span className="sr-only">MRP </span>{formatPaise(mrp)}</span>
          {discount > 0 && <span className="text-sm font-medium text-forge">{discount}% off</span>}
        </>
      )}
    </div>
  );
}
