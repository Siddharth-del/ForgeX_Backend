import { Link } from 'react-router-dom';
import { useAdminOrders } from '../../hooks/useAdmin';
import { useFullCatalog } from '../../hooks/useCatalog';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import PageHeader from '../../components/common/PageHeader';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/States';
import { errorMessage } from '../../utils/errors';
import { formatDate, formatPaise } from '../../utils/format';

const REVENUE_STATUSES = ['PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

function Stat({ label, value, to }) {
  const body = (
    <>
      <p className="text-sm text-steel">{label}</p>
      <p className="price mt-1 text-3xl">{value}</p>
    </>
  );
  return to ? <Link to={to} className="block border border-line bg-white p-5 hover:border-ink">{body}</Link> : <div className="border border-line bg-white p-5">{body}</div>;
}

export default function DashboardPage() {
  useDocumentTitle('Admin overview');
  const orders = useAdminOrders();
  const catalog = useFullCatalog();

  const all = orders.data ?? [];
  const revenue = all.filter((o) => REVENUE_STATUSES.includes(o.status) && o.paymentStatus === 'CAPTURED').reduce((n, o) => n + o.total, 0);
  const toShip = all.filter((o) => o.status === 'PAID' || o.status === 'CONFIRMED').length;
  const products = catalog.data ?? [];
  const lowStock = products.filter((p) => p.active && p.stock <= 5).sort((a, b) => a.stock - b.stock);

  return (
    <div>
      <PageHeader title="Overview" />
      {orders.isError && <div className="mt-6"><ErrorState message={errorMessage(orders.error)} onRetry={orders.refetch} /></div>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {orders.isLoading || catalog.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[92px]" />) : (
          <>
            <Stat label="Online revenue collected" value={formatPaise(revenue)} />
            <Stat label="Orders to fulfil" value={toShip} to="/admin/orders?status=PAID" />
            <Stat label="Total orders" value={all.length} to="/admin/orders" />
            <Stat label="Products low on stock" value={lowStock.length} to="/admin/products" />
          </>
        )}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-xl">Latest orders</h2>
            <Link to="/admin/orders" className="link text-sm">All orders</Link>
          </div>
          {orders.isLoading ? <div className="p-5"><Skeleton className="h-40 w-full" /></div>
            : !all.length ? <p className="px-5 py-8 text-steel">No orders yet.</p>
            : (
              <ul>
                {all.slice(0, 6).map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-0">
                    <div className="min-w-0">
                      <p className="font-medium">#{o.id} <span className="font-normal text-steel">{o.email}</span></p>
                      <p className="text-sm text-steel">{formatDate(o.createdAt, true)}</p>
                    </div>
                    <div className="flex items-center gap-3"><OrderStatusBadge status={o.status} /><span className="price">{formatPaise(o.total)}</span></div>
                  </li>
                ))}
              </ul>
            )}
        </section>

        <section className="border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-xl">Low stock</h2>
            <Link to="/admin/products" className="link text-sm">Products</Link>
          </div>
          {catalog.isLoading ? <div className="p-5"><Skeleton className="h-40 w-full" /></div>
            : !lowStock.length ? <p className="px-5 py-8 text-steel">Every active product has more than 5 in stock.</p>
            : (
              <ul>
                {lowStock.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-0">
                    <Link to={`/admin/products/${p.id}/edit`} className="truncate hover:underline">{p.name}</Link>
                    <span className={`tabular-nums ${p.stock === 0 ? 'text-forge' : 'text-warn'}`}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</span>
                  </li>
                ))}
              </ul>
            )}
        </section>
      </div>
    </div>
  );
}
