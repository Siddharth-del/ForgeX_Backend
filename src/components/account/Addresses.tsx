import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormStatus, SelectField, TextField } from "@/components/ui/Field";
import { errorMessage } from "@/lib/errors";
import { Skeleton } from "@/components/ui/Skeleton";
import { addressApi, removeAddressError, validateAddress } from "@/lib/api/addresses";
import { ApiError } from "@/lib/api/client";
import type { AddressDTO, AddressInput } from "@/lib/api/types";
import { INDIAN_STATES } from "@/lib/india";
import { cn } from "@/lib/cn";

const EMPTY: AddressInput = { buildingName: "", street: "", city: "", state: "", country: "India", pincode: "", phoneNumber: "" };

/** One address as display lines. (The backend stores no recipient name.) */
export function AddressLines({ address, className }: { address: AddressDTO; className?: string }) {
  return (
    <address className={cn("not-italic leading-relaxed", className)}>
      {address.buildingName}
      <br />
      {address.street}
      <br />
      {address.city}, {address.state} {address.pincode}
      <br />
      {address.country}
      <span className="mt-1 block text-ink-muted">Phone {address.phoneNumber}</span>
    </address>
  );
}

/** New-address form. Mirrors the backend's rules so a mistake is caught here, with a clear message. */
export function AddressForm({ onSaved, onCancel, submitLabel = "Save address" }: { onSaved: (a: AddressDTO) => void; onCancel?: () => void; submitLabel?: string }) {
  const [values, setValues] = useState<AddressInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressInput, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (k: keyof AddressInput) => (v: string) => {
    setValues((x) => ({ ...x, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()])) as unknown as AddressInput;
    const next = validateAddress(trimmed);
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) {
      document.querySelector<HTMLElement>(`[data-address-field="${Object.keys(next)[0]}"] input, [data-address-field="${Object.keys(next)[0]}"] select`)?.focus();
      return;
    }
    setPending(true);
    try {
      const saved = await addressApi.create(trimmed);
      setValues(EMPTY);
      onSaved(saved);
    } catch (err) {
      const fields = err instanceof ApiError ? (err.fields as Partial<Record<keyof AddressInput, string>>) : {};
      if (Object.keys(fields).length) setErrors(fields);
      else setFormError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate aria-label="New delivery address" className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <div data-address-field="buildingName" className="sm:col-span-2">
        <TextField label="Flat, house no., building" autoComplete="address-line1" value={values.buildingName} onChange={set("buildingName")} error={errors.buildingName} maxLength={120} />
      </div>
      <div data-address-field="street" className="sm:col-span-2">
        <TextField label="Street, area, landmark" autoComplete="address-line2" value={values.street} onChange={set("street")} error={errors.street} maxLength={160} />
      </div>
      <div data-address-field="city">
        <TextField label="City" autoComplete="address-level2" value={values.city} onChange={set("city")} error={errors.city} maxLength={60} />
      </div>
      <div data-address-field="pincode">
        <TextField label="PIN code" inputMode="numeric" autoComplete="postal-code" value={values.pincode} onChange={(v) => set("pincode")(v.replace(/[^\dA-Za-z\s-]/g, ""))} error={errors.pincode} maxLength={10} />
      </div>
      <div data-address-field="state">
        <SelectField label="State / UT" autoComplete="address-level1" value={values.state} onChange={set("state")} error={errors.state}>
          <option value="">Select</option>
          {INDIAN_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </SelectField>
      </div>
      <div data-address-field="country">
        <TextField label="Country" autoComplete="country-name" value={values.country} onChange={set("country")} error={errors.country} maxLength={60} />
      </div>
      <div data-address-field="phoneNumber" className="sm:col-span-2">
        <TextField
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.phoneNumber}
          onChange={set("phoneNumber")}
          error={errors.phoneNumber}
          hint="For delivery updates from the courier."
          maxLength={15}
        />
      </div>
      <FormStatus error={formError} pending={pending} className="sm:col-span-2" />
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
        <Button type="submit" disabled={pending} aria-busy={pending} className="sm:flex-1">
          {pending ? "Saving" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

/** Saved addresses on the account page: list, add, remove. */
export function AddressBook() {
  const [list, setList] = useState<AddressDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    addressApi
      .mine()
      .then((a) => live && setList(a))
      .catch((e) => live && setError(errorMessage(e)));
    return () => {
      live = false;
    };
  }, [attempt]);

  const remove = async (id: number) => {
    setBusy(id);
    setRowError(null);
    try {
      await addressApi.remove(id);
      setList((l) => l?.filter((a) => a.addressId !== id) ?? l);
    } catch (e) {
      setRowError({ id, message: removeAddressError(e) });
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  };

  return (
    <section aria-labelledby="addresses-h">
      <div className="flex items-end justify-between gap-6 border-b border-hair pb-4">
        <h2 id="addresses-h" className="font-display text-[1.6rem] uppercase leading-none">
          Addresses
        </h2>
        {list && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="label link-underline pb-1">
            Add address
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-6 border border-hair bg-sand/60 p-5 text-[0.88rem]">
          <p>{error}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="label mt-3 underline underline-offset-4">
            Try again
          </button>
        </div>
      )}
      {!list && !error && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      )}

      {list && (
        <>
          {list.length === 0 && !adding && <p className="mt-6 text-[0.9rem] text-ink-muted">No saved addresses yet. Add one now, or at checkout.</p>}
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {list.map((a) => (
              <li key={a.addressId} className="flex flex-col justify-between gap-4 border border-hair bg-ivory p-5 text-[0.88rem]">
                <AddressLines address={a} />
                {rowError?.id === a.addressId && (
                  <p role="alert" className="text-[0.78rem] text-[#9b3b2a]">
                    {rowError.message}
                  </p>
                )}
                {confirming === a.addressId ? (
                  <div className="flex items-center gap-4 text-[0.8rem]">
                    <span className="text-ink-muted">Remove this address?</span>
                    <button type="button" onClick={() => remove(a.addressId)} disabled={busy === a.addressId} className="label text-[#9b3b2a] underline underline-offset-4">
                      {busy === a.addressId ? "Removing" : "Remove"}
                    </button>
                    <button type="button" onClick={() => setConfirming(null)} className="label underline underline-offset-4">
                      Keep
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirming(a.addressId)} className="label self-start text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
          {adding && (
            <div className="mt-6 border border-hair bg-sand/60 p-6 md:p-8">
              <p className="label mb-6">New address</p>
              <AddressForm
                onSaved={(a) => {
                  setList((l) => [...(l ?? []), a]);
                  setAdding(false);
                }}
                onCancel={() => setAdding(false)}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
