import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminOrders, useUpdateOrderStatus } from '../../hooks/useAdmin';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import PageHeader from '../../components/common/PageHeader';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import Pagination from '../../components/common/Pagination';
import { ConfirmDialog, Modal } from '../../components/common/Modal';
import PriceSummary from '../../components/order/PriceSummary';
import { RowsSkeleton } from '../../components/common/Skeleton';
import { EmptyState, ErrorState } from '../../components/common/States';
import { ADMIN_STATUS_TRANSITIONS, ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS } from '../../constants';
import { errorMessage } from '../../utils/errors';
import { formatDate, formatPaise } from '../../utils/format';

const PER_PAGE = 20;

function StatusControl({ order }) {
  const toast = useToast();
  const mutation = useUpdateOrderStatus();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const next = ADMIN_STATUS_TRANSITIONS[order.status] ?? [];
  if (!next.length) return <span className="text-sm text-steel">No actions</span>;

  const apply = (status) => mutation.mutate({ id: order.id, status }, {
    onSuccess: () => toast.success(`Order #${order.id} marked ${ORDER_STATUS[status].label.toLowerCase()}.`),
    onError: (err) => toast.error(errorMessage(err, 'The status could not be updated.')),
    onSettled: () => setConfirmCancel(false),
  });

  return (
    <>
      <label htmlFor={`status-${order.id}`} className="sr-only">Update status of order {order.id}</label>
      <select id={`status-${order.id}`} className="input w-auto py-1 text-sm" style={{ minHeight: 36 }} value="" disabled={mutation.isPending}
        onChange={(e) => {
          const status = e.target.value;
          if (!status) return;
          if (status === 'CANCELLED') setConfirmCancel(true);
          else apply(status);
        }}>
        <option value="">Move to…</option>
        {next.map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
      </select>
      <ConfirmDialog open={confirmCancel} title={`Cancel order #${order.id}?`}
        body="The customer will see this order as cancelled. Stock and refunds are not adjusted automatically from this screen."
        confirmLabel="Cancel order" danger loading={mutation.isPending}
        onConfirm={() => apply('CANCELLED')} onCancel={() => setConfirmCancel(false)} />
    </>
  );
}

export default function OrdersAdminPage() {
  useDocumentTitle('Admin orders');
  const { data, isLoading, isError, error, refetch } = useAdminOrders();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [viewing, setViewing] = useState(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((o) =>
      (!status || o.status === status) && (!term || String(o.id) === term.replace('#', '') || o.email?.toLowerCase().includes(term)));
  }, [data, status, q]);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const rows = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div>
      <PageHeader title="Orders" subtitle={data ? `${filtered.length} shown` : undefined} />
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="w-full max-w-xs">
          <label htmlFor="order-search" className="sr-only">Search orders</label>
          <input id="order-search" type="search" className="input" placeholder="Order number or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </div>
        <label htmlFor="status-filter" className="sr-only">Filter by status</label>
        <select id="status-filter" className="input w-auto" value={status}
          onChange={(e) => { const n = new URLSearchParams(params); e.target.value ? n.set('status', e.target.value) : n.delete('status'); setParams(n); setPage(0); }}>
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="mt-4">
        {isLoading ? <RowsSkeleton rows={6} className="h-12" />
          : isError ? <ErrorState message={errorMessage(error)} onRetry={refetch} />
          : !filtered.length ? <EmptyState title="No orders found" body={status || q ? 'Try a different filter.' : 'Orders appear here as customers check out.'} />
          : (
            <div className="overflow-x-auto border border-line bg-white">
              <table className="w-full min-w-[820px]">
                <thead><tr>
                  <th className="table-th">Order</th><th className="table-th">Customer</th><th className="table-th">Placed</th>
                  <th className="table-th">Payment</th><th className="table-th text-right">Total</th><th className="table-th">Status</th><th className="table-th">Update</th>
                </tr></thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id}>
                      <td className="table-td"><button type="button" className="font-medium underline-offset-4 hover:underline" onClick={() => setViewing(o)}>#{o.id}</button></td>
                      <td className="table-td max-w-[200px] truncate">{o.email}</td>
                      <td className="table-td whitespace-nowrap text-sm">{formatDate(o.createdAt, true)}</td>
                      <td className="table-td text-sm">{o.paymentMethod === 'COD' ? 'COD' : 'Online'}, {PAYMENT_STATUS[o.paymentStatus] ?? o.paymentStatus}</td>
                      <td className="table-td price text-right">{formatPaise(o.total)}</td>
                      <td className="table-td"><OrderStatusBadge status={o.status} /></td>
                      <td className="table-td"><StatusControl order={o} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing ? `Order #${viewing.id}` : ''} size="lg">
        {viewing && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[15px]">{viewing.email}<br /><span className="text-sm text-steel">{formatDate(viewing.createdAt, true)}</span></p>
              <OrderStatusBadge status={viewing.status} />
            </div>
            <ul className="border-y border-line">
              {viewing.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 border-b border-line py-3 last:border-0 text-[15px]">
                  <span>{i.name} × {i.quantity}</span><span className="price">{formatPaise(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <p className="text-[15px]"><span className="text-steel">Payment: </span>{PAYMENT_METHODS[viewing.paymentMethod]}, {PAYMENT_STATUS[viewing.paymentStatus] ?? viewing.paymentStatus}</p>
            <p className="text-[15px]"><span className="text-steel">Delivery address id: </span>{viewing.addressId ?? '—'}</p>
            <PriceSummary subtotal={viewing.subtotal} couponDiscount={viewing.discount} couponCode={viewing.couponCode} shipping={viewing.shipping} total={viewing.total} />
          </div>
        )}
      </Modal>
    </div>
  );
}
