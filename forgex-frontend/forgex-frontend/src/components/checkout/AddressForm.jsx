import { useState } from 'react';
import { Input } from '../common/Field';
import Button from '../common/Button';
import { useForm } from '../../hooks/useForm';
import { PINCODE, rules } from '../../utils/validation';
import { parseApiError } from '../../utils/errors';

// Mirrors the backend Address entity constraints.
const schema = {
  buildingName: [rules.required('Enter the building or house name'), rules.minLength(5, 'Must be at least 5 characters')],
  street: [rules.required('Enter the street'), rules.minLength(5, 'Must be at least 5 characters')],
  city: [rules.required('Enter the city'), rules.minLength(4, 'Must be at least 4 characters')],
  state: [rules.required('Enter the state'), rules.minLength(2, 'Must be at least 2 characters')],
  pincode: [rules.required('Enter the PIN code'), rules.pattern(PINCODE, 'Enter a valid 6-digit PIN code')],
  country: [rules.required('Enter the country'), rules.minLength(2, 'Must be at least 2 characters')],
};

const EMPTY = { buildingName: '', street: '', city: '', state: '', pincode: '', country: 'India' };

export default function AddressForm({ initial, onSubmit, onCancel, submitLabel = 'Save address' }) {
  const form = useForm({ ...EMPTY, ...initial }, schema);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.validateAll()) return;
    setSaving(true);
    try {
      await onSubmit(form.values);
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err, 'Could not save this address.');
      form.setErrors(fieldErrors);
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <p role="alert" className="border border-forge/30 bg-forge-tint px-3 py-2 text-[15px] text-forge">{formError}</p>}
      <Input label="Building or house" required autoComplete="address-line1" {...form.bind('buildingName')} />
      <Input label="Street and area" required autoComplete="address-line2" {...form.bind('street')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="City" required autoComplete="address-level2" {...form.bind('city')} />
        <Input label="State" required autoComplete="address-level1" {...form.bind('state')} />
        <Input label="PIN code" required inputMode="numeric" maxLength={6} autoComplete="postal-code" {...form.bind('pincode')} />
        <Input label="Country" required autoComplete="country-name" {...form.bind('country')} />
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" loading={saving}>{submitLabel}</Button>
        {onCancel && <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>}
      </div>
    </form>
  );
}

export function formatAddress(a) {
  if (!a) return '';
  return [a.buildingName, a.street, `${a.city}, ${a.state} ${a.pincode}`, a.country].filter(Boolean).join(', ');
}
