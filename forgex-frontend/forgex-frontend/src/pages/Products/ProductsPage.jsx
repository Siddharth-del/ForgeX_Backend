import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProductList } from '../../hooks/useCatalog';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import ProductGrid from '../../components/product/ProductGrid';
import ProductFilters from '../../components/product/ProductFilters';
import Pagination from '../../components/common/Pagination';
import { ProductGridSkeleton } from '../../components/common/Skeleton';
import { EmptyState, ErrorState } from '../../components/common/States';
import { Modal } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { CATEGORIES, FRAGRANCE_FAMILIES, GENDERS, SORT_OPTIONS, labelOf } from '../../constants';
import { errorMessage } from '../../utils/errors';
import { pluralize } from '../../utils/format';

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = {
    q: params.get('q') || '',
    category: params.get('category') || '',
    gender: params.get('gender') || '',
    family: params.get('family') || '',
    sort: params.get('sort') || 'featured',
    page: Math.max(0, Number(params.get('page') || 1) - 1),
  };

  const title = filters.q ? `Results for “${filters.q}”`
    : filters.category ? labelOf(CATEGORIES, filters.category)
    : filters.gender ? `For ${labelOf(GENDERS, filters.gender).toLowerCase()}`
    : 'All fragrances';
  useDocumentTitle(title, `Shop ForgeX ${title.toLowerCase()}. Filter by type, gender and fragrance family.`);

  const { data, isLoading, isError, error, refetch, isFetching } = useProductList(filters);

  const update = (patch, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (resetPage) next.delete('page');
    setParams(next);
  };
  const goToPage = (p) => { update({ page: p > 0 ? String(p + 1) : '' }, false); window.scrollTo({ top: 0 }); };

  const chips = [
    filters.q && { key: 'q', label: `“${filters.q}”` },
    filters.category && { key: 'category', label: labelOf(CATEGORIES, filters.category) },
    filters.gender && { key: 'gender', label: labelOf(GENDERS, filters.gender) },
    filters.family && { key: 'family', label: labelOf(FRAGRANCE_FAMILIES, filters.family) },
  ].filter(Boolean);

  return (
    <div className="page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="text-3xl sm:text-4xl">{title}</h1>
          <p className="mt-1 text-steel" aria-live="polite">
            {isLoading ? 'Loading products…' : data ? pluralize(data.total, 'product') : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
            Filters{chips.length ? ` (${chips.length})` : ''}
          </Button>
          <label htmlFor="sort" className="sr-only">Sort by</label>
          <select id="sort" value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className="input w-auto py-1.5 text-sm" style={{ minHeight: 36 }}>
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button key={c.key} type="button" onClick={() => update({ [c.key]: '' })}
              className="inline-flex items-center gap-2 border border-line px-3 py-1 text-sm hover:border-ink" aria-label={`Remove filter ${c.label}`}>
              {c.label} <span aria-hidden="true">×</span>
            </button>
          ))}
          <button type="button" className="link text-sm" onClick={() => setParams(new URLSearchParams())}>Clear all</button>
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <ProductFilters filters={filters} onChange={(p) => update(p)} />
        </aside>

        <section aria-busy={isFetching} className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}>
          {isLoading ? <ProductGridSkeleton />
            : isError ? <ErrorState message={errorMessage(error, 'Products could not be loaded.')} onRetry={refetch} />
            : !data.items.length ? (
              <EmptyState title="No products found"
                body={chips.length ? 'Try removing a filter or searching for something else.' : 'New fragrances are on their way.'}
                action={chips.length ? 'Clear filters' : undefined} onAction={() => setParams(new URLSearchParams())} />
            ) : (
              <>
                <ProductGrid products={data.items} />
                <Pagination page={data.page} totalPages={data.totalPages} onChange={goToPage} />
              </>
            )}
        </section>
      </div>

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters"
        footer={<Button onClick={() => setFiltersOpen(false)} className="w-full sm:w-auto">Show results</Button>}>
        <ProductFilters filters={filters} onChange={(p) => update(p)} />
      </Modal>
    </div>
  );
}
