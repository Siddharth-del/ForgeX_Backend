import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFullCatalog } from '../../hooks/useCatalog';
import { useProductMutations } from '../../hooks/useAdmin';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import PageHeader from '../../components/common/PageHeader';
import ProductImage from '../../components/common/ProductImage';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import { ConfirmDialog } from '../../components/common/Modal';
import { RowsSkeleton } from '../../components/common/Skeleton';
import { EmptyState, ErrorState } from '../../components/common/States';
import { CATEGORIES, labelOf } from '../../constants';
import { errorMessage } from '../../utils/errors';
import { formatPaise } from '../../utils/format';

const PER_PAGE = 15;

export default function ProductsAdminPage() {
  useDocumentTitle('Admin products');
  const { data, isLoading, isError, error, refetch } = useFullCatalog();
  const { remove } = useProductMutations();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((p) => !term || p.name.toLowerCase().includes(term) || p.slug.includes(term));
  }, [data, q]);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const rows = filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(`${deleting.name} deleted.`);
    } catch (err) {
      toast.error(errorMessage(err, 'This product could not be deleted. It may be part of existing orders; deactivate it instead.'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <PageHeader title="Products" subtitle={data ? `${data.length} in catalogue` : undefined}
        actions={<Link to="/admin/products/new" className="btn-primary">Add product</Link>} />

      <div className="mt-6 max-w-sm">
        <label htmlFor="product-search" className="sr-only">Search products</label>
        <input id="product-search" type="search" className="input" placeholder="Search by name or slug" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
      </div>

      <div className="mt-4">
        {isLoading ? <RowsSkeleton rows={5} className="h-14" />
          : isError ? <ErrorState message={errorMessage(error)} onRetry={refetch} />
          : !filtered.length ? <EmptyState title="No products found" body={q ? 'Try a different search.' : 'Add your first product to start selling.'} action={q ? undefined : 'Add product'} actionTo="/admin/products/new" />
          : (
            <div className="overflow-x-auto border border-line bg-white">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr><th className="table-th">Product</th><th className="table-th">Type</th><th className="table-th text-right">Price</th><th className="table-th text-right">MRP</th><th className="table-th text-right">Stock</th><th className="table-th">Status</th><th className="table-th"><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="w-10 shrink-0"><ProductImage src={p.image} alt="" /></div>
                          <div className="min-w-0"><p className="truncate font-medium">{p.name}</p><p className="truncate text-sm text-steel">{p.slug}</p></div>
                        </div>
                      </td>
                      <td className="table-td">{labelOf(CATEGORIES, p.category)}</td>
                      <td className="table-td price text-right">{formatPaise(p.price)}</td>
                      <td className="table-td text-right text-steel">{formatPaise(p.mrp)}</td>
                      <td className={`table-td text-right tabular-nums ${p.stock === 0 ? 'text-forge' : p.stock <= 5 ? 'text-warn' : ''}`}>{p.stock}</td>
                      <td className="table-td">{p.active ? <Badge tone="ok">Active</Badge> : <Badge>Hidden</Badge>}</td>
                      <td className="table-td whitespace-nowrap text-right">
                        <Link to={`/admin/products/${p.id}/edit`} className="btn-ghost btn-sm">Edit</Link>
                        <button type="button" className="btn-ghost btn-sm text-forge" onClick={() => setDeleting(p)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      <ConfirmDialog open={Boolean(deleting)} title={`Delete ${deleting?.name ?? 'product'}?`}
        body="This permanently removes the product. To stop selling it but keep order history intact, edit it and switch it off instead."
        confirmLabel="Delete product" danger loading={remove.isPending} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
