import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMyOrder } from '../../hooks/useOrders';
import { useAddresses } from '../../hooks/useAddresses';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import PriceSummary from '../../components/order/PriceSummary';
import { formatAddress } from '../../components/checkout/AddressForm';
import { RowsSkeleton } from '../../components/common/Skeleton';
import { EmptyState, ErrorState, Notice } from '../../components/common/States';
import { PAYMENT_METHODS, PAYMENT_STATUS } from '../../constants';
import { errorMessage } from '../../utils/errors';
import { formatDate, formatPaise } from '../../utils/format';

export default function OrderDetailsPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const justPlaced = params.get('placed') === '1';
  useDocumentTitle(`Order #${id}`);

  const { data: order, isLoading, isError, error, refetch } = useMyOrder(id, { poll: justPlaced });
  const { data: addresses } = useAddresses();

  if (isLoading) return <div className="page py-10"><RowsSkeleton rows={4} className="h-24" /></div>;
  if (isError) {
    return error?.response?.status === 404
      ? <div className="page py-16"><EmptyState title="Order not found" body="Check the order number, or find it in your orders." action="View your orders" actionTo="/orders" /></div>
      : <div className="page py-10"><ErrorState message={errorMessage(error)} onRetry={refetch} /></div>;
  }

  const address = addresses?.find((a) => a.id === order.addressId);

  return (
    <div className="page py-10">
      <Link to="/orders" className="text-sm text-steel hover:text-ink">← All orders</Link>

      {justPlaced && order.status !== 'PENDING_PAYMENT' && order.status !== 'CANCELLED' && (
        <div className="mt-4 border-l-4 border-ok bg-ok-tint px-4 py-3" role="status">
          <p className="font-medium">Thank you. Your order is confirmed.</p>
          <p className="text-[15px] text-steel">Check this page any time to see payment and delivery status.</p>
        </div>
      )}
      {order.status === 'PENDING_PAYMENT' && (
        <div className="mt-4">
          <Notice title="Waiting for payment" tone="warn">
            If you completed payment, this page updates automatically once it's confirmed. Unpaid orders are cancelled after 15 minutes and the items are released.
          </Notice>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="text-3xl sm:text-4xl">Order #{order.id}</h1>
          <p className="mt-1 text-steel">Placed {formatDate(order.createdAt, true)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <section aria-label="Items">
          <h2 className="mb-2 text-xl">Items</h2>
          <ul>
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 border-b border-line py-4">
                <div>
                  {i.productId ? <Link to={`/products/${i.productId}`} className="font-medium hover:underline">{i.name}</Link> : <span className="font-medium">{i.name}</span>}
                  <p className="text-sm text-steel">
                    {formatPaise(i.unitPrice)} × {i.quantity}
                    {i.mrp > i.unitPrice && <span className="ml-2 line-through">{formatPaise(i.mrp)}</span>}
                  </p>
                </div>
                <p className="price">{formatPaise(i.lineTotal)}</p>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-6">
          <div className="border border-line p-5">
            <h2 className="text-xl">Payment</h2>
            <dl className="mt-3 space-y-1.5 text-[15px]">
              <div className="flex justify-between gap-4"><dt className="text-steel">Method</dt><dd className="text-right">{PAYMENT_METHODS[order.paymentMethod] ?? order.paymentMethod}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-steel">Status</dt><dd>{PAYMENT_STATUS[order.paymentStatus] ?? order.paymentStatus ?? '—'}</dd></div>
              {order.paidAt && <div className="flex justify-between gap-4"><dt className="text-steel">Paid on</dt><dd>{formatDate(order.paidAt, true)}</dd></div>}
            </dl>
            <div className="mt-4 border-t border-line pt-3">
              <PriceSummary subtotal={order.subtotal} couponDiscount={order.discount} couponCode={order.couponCode} shipping={order.shipping} total={order.total} />
            </div>
          </div>
          <div className="border border-line p-5">
            <h2 className="text-xl">Delivery address</h2>
            <p className="mt-2 text-[15px] text-steel">{address ? formatAddress(address) : order.addressId ? `Saved address #${order.addressId}` : 'Not available'}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
