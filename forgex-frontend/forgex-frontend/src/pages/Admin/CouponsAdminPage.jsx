import { useState } from 'react';
import { useCouponMutations, useCoupons } from '../../hooks/useAdmin';
import { useToast } from '../../context/ToastContext';
import { useForm } from '../../hooks/useForm';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { Checkbox, Input, Select } from '../../components/common/Field';
import { ConfirmDialog, Modal } from '../../components/common/Modal';
import { RowsSkeleton } from '../../components/common/Skeleton';
import { EmptyState, ErrorState } from '../../components/common/States';
import { DISCOUNT_TYPES } from '../../constants';
import { rules } from '../../utils/validation';
import { errorMessage, parseApiError } from '../../utils/errors';
import { formatDate, formatPaise, paiseToRupees, rupeesToPaise } from '../../utils/format';

const EMPTY = { code: '', type: 'PERCENT', value: '', minOrder: '', maxDiscount: '', usageLimit: '', validFrom: '', validTo: '', active: true };

const schema = {
  code: [rules.required('Enter a code'), rules.maxLength(30), rules.pattern(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, dashes and underscores only')],
  type: [rules.required()],
  value: [rules.required('Enter a value'), rules.number(), rules.min(0.01, 'Must be more than zero'),
    (v, all) => (all.type === 'PERCENT' && (Number(v) < 1 || Number(v) > 90 || !Number.isInteger(Number(v))) ? 'Percent must be a whole number from 1 to 90' : null)],
  minOrder: [rules.number(), rules.min(0)],
  maxDiscount: [rules.number(), rules.min(0)],
  usageLimit: [rules.integer(), rules.min(1)],
  validTo: [(v, all) => (v && all.validFrom && v < all.validFrom ? 'End must be after start' : null)],
};

// datetime-local ↔ LocalDateTime ("2026-10-01T00:00")
const toLocalInput = (v) => (v ? String(v).slice(0, 16) : '');

const toForm = (c) => ({
  code: c.code, type: c.type,
  value: c.type === 'FLAT' ? paiseToRupees(c.value) : String(c.value),
  minOrder: paiseToRupees(c.minOrderPaise), maxDiscount: paiseToRupees(c.maxDiscountPaise),
  usageLimit: c.usageLimit ?? '', validFrom: toLocalInput(c.validFrom), validTo: toLocalInput(c.validTo), active: c.active,
});

function CouponForm({ initial, isEdit, onSubmit, onCancel }) {
  const form = useForm(initial ?? EMPTY, schema);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.validateAll()) return;
    const v = form.values;
    setSaving(true);
    try {
      await onSubmit({
        code: v.code,
        type: v.type,
        value: v.type === 'FLAT' ? rupeesToPaise(v.value) : Number(v.value),
        minOrderPaise: v.minOrder === '' ? 0 : rupeesToPaise(v.minOrder),
        maxDiscountPaise: v.maxDiscount === '' ? null : rupeesToPaise(v.maxDiscount),
        usageLimit: v.usageLimit === '' ? null : Number(v.usageLimit),
        validFrom: v.validFrom ? `${v.validFrom}:00` : null,
        validTo: v.validTo ? `${v.validTo}:00` : null,
        active: v.active,
      });
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err, 'The coupon could not be saved.');
      form.setErrors(fieldErrors);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {error && <p role="alert" className="border border-forge/30 bg-forge-tint px-3 py-2 text-[15px] text-forge">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Code" required disabled={isEdit} hint={isEdit ? 'Codes cannot be changed' : 'Customers type this at checkout'}
          {...form.bind('code')} onChange={(e) => form.setField('code', e.target.value.toUpperCase())} />
        <Select label="Type" required options={DISCOUNT_TYPES} {...form.bind('type')} />
        <Input label={form.values.type === 'PERCENT' ? 'Percent off' : 'Amount off (₹)'} required type="number" min="0" step={form.values.type === 'PERCENT' ? '1' : '0.01'} {...form.bind('value')} />
        <Input label="Maximum discount (₹)" type="number" min="0" step="0.01" hint="Optional cap for percent coupons" {...form.bind('maxDiscount')} />
        <Input label="Minimum order (₹)" type="number" min="0" step="0.01" hint="Cart subtotal needed" {...form.bind('minOrder')} />
        <Input label="Usage limit" type="number" min="1" step="1" hint="Leave empty for unlimited" {...form.bind('usageLimit')} />
        <Input label="Starts" type="datetime-local" {...form.bind('validFrom')} />
        <Input label="Ends" type="datetime-local" {...form.bind('validTo')} />
      </div>
      <Checkbox id="coupon-active" label="Active" checked={Boolean(form.values.active)} onChange={(e) => form.setField('active', e.target.checked)} />
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={saving}>{isEdit ? 'Save coupon' : 'Create coupon'}</Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </form>
  );
}

export default function CouponsAdminPage() {
  useDocumentTitle('Admin coupons');
  const { data, isLoading, isError, error, refetch } = useCoupons();
  const { create, update, deactivate } = useCouponMutations();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [disabling, setDisabling] = useState(null);

  const describe = (c) => (c.type === 'PERCENT'
    ? `${c.value}% off${c.maxDiscountPaise ? `, up to ${formatPaise(c.maxDiscountPaise)}` : ''}`
    : `${formatPaise(c.value)} off`);

  return (
    <div>
      <PageHeader title="Coupons" actions={<Button onClick={() => setEditing('new')}>Create coupon</Button>} />
      <div className="mt-6">
        {isLoading ? <RowsSkeleton rows={4} className="h-12" />
          : isError ? <ErrorState message={errorMessage(error)} onRetry={refetch} />
          : !data.length ? <EmptyState title="No coupons yet" body="Create a code customers can apply at checkout." action="Create coupon" onAction={() => setEditing('new')} />
          : (
            <div className="overflow-x-auto border border-line bg-white">
              <table className="w-full min-w-[760px]">
                <thead><tr>
                  <th className="table-th">Code</th><th className="table-th">Discount</th><th className="table-th">Minimum order</th>
                  <th className="table-th">Used</th><th className="table-th">Valid</th><th className="table-th">Status</th><th className="table-th"><span className="sr-only">Actions</span></th>
                </tr></thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c.id}>
                      <td className="table-td font-medium">{c.code}</td>
                      <td className="table-td">{describe(c)}</td>
                      <td className="table-td">{c.minOrderPaise ? formatPaise(c.minOrderPaise) : 'None'}</td>
                      <td className="table-td tabular-nums">{c.usedCount}{c.usageLimit ? ` of ${c.usageLimit}` : ''}</td>
                      <td className="table-td text-sm">{c.validFrom || c.validTo ? `${c.validFrom ? formatDate(c.validFrom) : 'Now'} to ${c.validTo ? formatDate(c.validTo) : 'no end'}` : 'Always'}</td>
                      <td className="table-td">{c.active ? <Badge tone="ok">Active</Badge> : <Badge>Inactive</Badge>}</td>
                      <td className="table-td whitespace-nowrap text-right">
                        <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(c)}>Edit</button>
                        {c.active && <button type="button" className="btn-ghost btn-sm text-forge" onClick={() => setDisabling(c)}>Deactivate</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Create coupon' : `Edit ${editing?.code ?? ''}`} size="lg">
        {editing && (
          <CouponForm isEdit={editing !== 'new'} initial={editing === 'new' ? undefined : toForm(editing)} onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              if (editing === 'new') await create.mutateAsync(values);
              else await update.mutateAsync({ id: editing.id, values });
              toast.success(editing === 'new' ? 'Coupon created.' : 'Coupon saved.');
              setEditing(null);
            }} />
        )}
      </Modal>
      <ConfirmDialog open={Boolean(disabling)} title={`Deactivate ${disabling?.code ?? ''}?`} body="Customers will no longer be able to apply this code. You can reactivate it later by editing it."
        confirmLabel="Deactivate" danger loading={deactivate.isPending}
        onConfirm={async () => {
          try { await deactivate.mutateAsync(disabling.id); toast.success('Coupon deactivated.'); }
          catch (err) { toast.error(errorMessage(err)); }
          finally { setDisabling(null); }
        }}
        onCancel={() => setDisabling(null)} />
    </div>
  );
}
