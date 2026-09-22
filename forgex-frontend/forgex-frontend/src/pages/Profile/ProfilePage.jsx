import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAddresses, useAddressMutations } from '../../hooks/useAddresses';
import { useMyOrders } from '../../hooks/useOrders';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import AddressForm, { formatAddress } from '../../components/checkout/AddressForm';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import { Modal, ConfirmDialog } from '../../components/common/Modal';
import { RowsSkeleton } from '../../components/common/Skeleton';
import { ErrorState, Notice } from '../../components/common/States';
import { errorMessage } from '../../utils/errors';
import { formatDate, formatPaise } from '../../utils/format';

export default function ProfilePage() {
  useDocumentTitle('Your account');
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const addresses = useAddresses();
  const orders = useMyOrders();
  const { create, update, remove } = useAddressMutations();

  const [editing, setEditing] = useState(null); // null | 'new' | address
  const [deleting, setDeleting] = useState(null);

  const saveAddress = async (values) => {
    if (editing === 'new') await create.mutateAsync(values);
    else await update.mutateAsync({ id: editing.id, values });
    toast.success(editing === 'new' ? 'Address added.' : 'Address updated.');
    setEditing(null);
  };

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Address removed.');
    } catch (err) {
      toast.error(errorMessage(err, 'This address could not be removed. It may be used by an existing order.'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="page py-10">
      <PageHeader title="Your account" actions={<Button variant="outline" size="sm" onClick={async () => { await logout(); toast.info('Signed out.'); navigate('/'); }}>Sign out</Button>} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <section>
          <h2 className="text-2xl">Profile</h2>
          <dl className="mt-4 border border-line text-[15px]">
            <div className="flex justify-between gap-4 border-b border-line px-4 py-3"><dt className="text-steel">Username</dt><dd>{user?.username}</dd></div>
            <div className="flex justify-between gap-4 border-b border-line px-4 py-3"><dt className="text-steel">Email</dt><dd className="truncate">{user?.email}</dd></div>
            <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-steel">Account type</dt><dd>{user?.isAdmin ? 'Administrator' : 'Customer'}</dd></div>
          </dl>
          <div className="mt-4">
            <Notice>Changing your name, email or password isn't available online yet.</Notice>
          </div>

          <h2 className="mt-10 text-2xl">Recent orders</h2>
          <div className="mt-4">
            {orders.isLoading ? <RowsSkeleton rows={2} className="h-16" />
              : orders.isError ? <ErrorState message={errorMessage(orders.error)} onRetry={orders.refetch} />
              : !orders.data.length ? <p className="text-steel">No orders yet. <Link to="/products" className="link text-ink">Start shopping</Link></p>
              : (
                <ul className="border border-line">
                  {orders.data.slice(0, 3).map((o) => (
                    <li key={o.id} className="border-b border-line last:border-0">
                      <Link to={`/orders/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper">
                        <span><span className="font-medium">#{o.id}</span> <span className="text-sm text-steel">{formatDate(o.createdAt)}</span></span>
                        <span className="flex items-center gap-3"><OrderStatusBadge status={o.status} /><span className="price">{formatPaise(o.total)}</span></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            {orders.data?.length > 3 && <Link to="/orders" className="link mt-3 inline-block text-[15px]">View all orders</Link>}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl">Addresses</h2>
            <Button size="sm" variant="outline" onClick={() => setEditing('new')}>Add address</Button>
          </div>
          <div className="mt-4">
            {addresses.isLoading ? <RowsSkeleton rows={2} className="h-20" />
              : addresses.isError ? <ErrorState message={errorMessage(addresses.error)} onRetry={addresses.refetch} />
              : !addresses.data.length ? <p className="border border-dashed border-line px-4 py-8 text-center text-steel">No saved addresses. Add one to check out faster.</p>
              : (
                <ul className="space-y-3">
                  {addresses.data.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 border border-line p-4">
                      <p className="max-w-md text-[15px]">{formatAddress(a)}</p>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>Edit</Button>
                        <Button size="sm" variant="ghost" className="text-forge" onClick={() => setDeleting(a)}>Remove</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </section>
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add address' : 'Edit address'}>
        {editing && <AddressForm initial={editing === 'new' ? undefined : editing} onSubmit={saveAddress} onCancel={() => setEditing(null)} />}
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Remove this address?" body={deleting ? formatAddress(deleting) : ''}
        confirmLabel="Remove" danger loading={remove.isPending} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
