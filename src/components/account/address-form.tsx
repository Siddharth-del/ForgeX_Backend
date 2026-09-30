"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressSchema, type AddressValues } from "@/lib/validation";
import { INDIAN_STATES } from "@/lib/constants";
import type { Address } from "@/lib/types";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useSaveAddress } from "@/hooks/use-account";
import { Button } from "../ui/button";
import { FormError, Input, Select } from "../ui/field";

export function AddressForm({
  initial,
  onSaved,
  onCancel,
  submitLabel = "Save address",
}: {
  initial?: Address;
  onSaved?: (a: Address) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const save = useSaveAddress();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: initial ?? { country: "India", state: "" },
  });

  const onSubmit = handleSubmit((raw) => {
    const v = addressSchema.parse(raw);
    save.mutate(
      { ...v, addressId: initial?.addressId },
      {
        onSuccess: (a) => onSaved?.(a),
        onError: (e) => {
          if (e instanceof ApiError)
            for (const [f, m] of Object.entries(e.fieldErrors)) setError(f as keyof AddressValues, { message: m });
        },
      },
    );
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormError message={save.isError && !(save.error instanceof ApiError && Object.keys(save.error.fieldErrors).length) ? errorMessage(save.error) : null} />
      </div>
      <Input
        label="Flat / house no., building"
        autoComplete="address-line1"
        wrapperClassName="sm:col-span-2"
        error={errors.buildingName?.message}
        {...register("buildingName")}
      />
      <Input
        label="Street, area, landmark"
        autoComplete="address-line2"
        wrapperClassName="sm:col-span-2"
        error={errors.street?.message}
        {...register("street")}
      />
      <Input label="City" autoComplete="address-level2" error={errors.city?.message} {...register("city")} />
      <Input
        label="PIN code"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        error={errors.pincode?.message}
        {...register("pincode")}
      />
      <Select label="State" autoComplete="address-level1" error={errors.state?.message} {...register("state")}>
        <option value="" disabled>
          Select a state
        </option>
        {INDIAN_STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <Select label="Country" autoComplete="country-name" {...register("country")}>
        <option value="India">India</option>
      </Select>
      <Input
        label="Mobile number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        wrapperClassName="sm:col-span-2"
        hint="For delivery updates from the courier"
        error={errors.phoneNumber?.message}
        {...register("phoneNumber")}
      />
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" loading={save.isPending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function AddressLines({ a }: { a: Address }) {
  return (
    <address className="not-italic leading-relaxed">
      {a.buildingName}
      <br />
      {a.street}
      <br />
      {a.city}, {a.state} {a.pincode}
      <br />
      <span className="text-stone">{a.phoneNumber}</span>
    </address>
  );
}
