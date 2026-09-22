import { formatPaise } from '../../utils/format';

function Row({ label, value, strong, tone }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 ${strong ? 'border-t border-line pt-3 text-lg font-semibold' : 'text-[15px]'}`}>
      <dt className={strong ? '' : 'text-steel'}>{label}</dt>
      <dd className={`price ${tone === 'save' ? 'text-ok' : ''}`}>{value}</dd>
    </div>
  );
}

/** Shows server-computed totals only. Nothing here is calculated for charging. */
export default function PriceSummary({ subtotal, productSavings, couponDiscount, couponCode, shipping, total }) {
  return (
    <dl>
      <Row label="Subtotal" value={formatPaise(subtotal)} />
      {productSavings > 0 && <Row label="You save on MRP" value={formatPaise(productSavings)} tone="save" />}
      {couponDiscount > 0 && <Row label={`Coupon${couponCode ? ` ${couponCode}` : ''}`} value={`− ${formatPaise(couponDiscount)}`} tone="save" />}
      <Row label="Shipping" value={shipping === 0 ? 'Free' : formatPaise(shipping)} />
      <Row label="Total" value={formatPaise(total)} strong />
      <p className="pt-1 text-sm text-steel">Prices include all taxes.</p>
    </dl>
  );
}
