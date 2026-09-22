import { Link } from 'react-router-dom';
import { useMyOrders } from '../../hooks/useOrders';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import PageHeader from '../../components/common/PageHeader';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import { RowsSkeleton } from '../../components/common/Skeleton';
import { EmptyState, ErrorState } from '../../components/common/States';
import { PAYMENT_STATUS } from '../../constants';
import { errorMessage } from '../../utils/errors';
import { formatDate, formatPaise, pluralize } from '../../utils/format';

export default function OrdersPage() {
  useDocumentTitle('Your orders');
  const { data, isLoading, isError, error, refetch } = useMyOrders();

  return (
    <div className="page py-10">
      <PageHeader title="Your orders" />
      <div className="mt-6">
        {isLoading ? <RowsSkeleton rows={3} className="h-28" />
          : isError ? <ErrorState message={errorMessage(error, 'Your orders could not be loaded.')} onRetry={refetch} />
          : !data.length ? <EmptyState title="You haven't placed any orders yet" body="When you do, you can track them here." action="Start shopping" actionTo="/products" />
          : (
            <ul className="space-y-4">
              {data.map((o) => {
                const units = o.items.reduce((n, i) => n + i.quantity, 0);
                return (
                  <li key={o.id} className="border border-line">
                    <Link to={`/orders/${o.id}`} className="block p-5 hover:bg-paper">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-xl">Order #{o.id}</p>
                          <p className="text-sm text-steel">Placed {formatDate(o.createdAt)}, {pluralize(units, 'item')}</p>
                        </div>
                        <OrderStatusBadge status={o.status} />
                      </div>
                      <p className="mt-3 truncate text-[15px] text-steel">{o.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm text-steel">{PAYMENT_STATUS[o.paymentStatus] ?? o.paymentStatus}</span>
                        <span className="price text-lg">{formatPaise(o.total)}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
      </div>
    </div>
  );
}
