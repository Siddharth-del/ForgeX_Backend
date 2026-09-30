"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useAdminCoupons, useDeactivateCoupon, useSaveCoupon } from "@/hooks/use-admin";
import { errorMessage } from "@/lib/api/client";
import { couponSchema, type CouponFormValues } from "@/lib/validation";
import type { Coupon } from "@/lib/types";
import { formatDate, formatPaise } from "@/lib/utils";
import { Button } from "../ui/button";
import { FormError, Input, Select } from "../ui/field";
import { Badge, Skeleton } from "../ui/misc";
import { Sheet } from "../ui/sheet";
import { ErrorState } from "../states/states";
import { AdminHeader } from "./admin-shell";

/** datetime-local <-> LocalDateTime (no zone; the backend uses server local time) */
const toInput = (iso?: string | null) => (iso ? iso.slice(0, 16) : "");
const fromInput = (v?: string) => (v ? `${v}:00` : null);

function describe(c: Coupon) {
  const off = c.type === "PERCENT" ? `${c.value}% off` : `${formatPaise(c.value)} off`;
  const cap = c.type === "PERCENT" && c.maxDiscountPaise ? ` (up to ${formatPaise(c.maxDiscountPaise)})` : "";
  const min = c.minOrderPaise ? ` · min ${formatPaise(c.minOrderPaise)}` : "";
  return off + cap + min;
}

function CouponForm({ coupon, onDone }: { coupon?: Coupon; onDone: () => void }) {
  const save = useSaveCoupon();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: coupon
      ? {
          code: coupon.code,
          type: coupon.type,
          value: coupon.type === "FLAT" ? coupon.value / 100 : coupon.value,
          minOrderRupees: (coupon.minOrderPaise ?? 0) / 100,
          maxDiscountRupees: coupon.maxDiscountPaise ? coupon.maxDiscountPaise / 100 : "",
          usageLimit: coupon.usageLimit ?? "",
          validFrom: toInput(coupon.validFrom),
          validTo: toInput(coupon.validTo),
          active: coupon.active !== false,
        }
      : { type: "PERCENT", active: true, minOrderRupees: 0, maxDiscountRupees: "", usageLimit: "" },
  });
  const type = useWatch({ control, name: "type" });

  const onSubmit = handleSubmit((raw) => {
    const v = couponSchema.parse(raw);
    save.mutate(
      {
        couponId: coupon?.couponId,
        code: v.code.toUpperCase(),
        type: v.type,
        value: v.type === "FLAT" ? Math.round(v.value * 100) : Math.round(v.value),
        minOrderPaise: Math.round((v.minOrderRupees ?? 0) * 100),
        maxDiscountPaise: v.type === "PERCENT" && v.maxDiscountRupees !== "" && v.maxDiscountRupees != null ? Math.round(Number(v.maxDiscountRupees) * 100) : null,
        usageLimit: v.usageLimit !== "" && v.usageLimit != null ? Number(v.usageLimit) : null,
        validFrom: fromInput(v.validFrom),
        validTo: fromInput(v.validTo),
        active: v.active,
      },
      { onSuccess: onDone },
    );
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormError message={save.isError ? errorMessage(save.error) : null} />
      </div>
      <Input label="Code" className="uppercase" disabled={!!coupon} hint={coupon ? "Codes can't be changed" : undefined} error={errors.code?.message} {...register("code")} />
      <Select label="Type" error={errors.type?.message} {...register("type")}>
        <option value="PERCENT">Percent off</option>
        <option value="FLAT">Flat amount off</option>
      </Select>
      <Input
        label={type === "PERCENT" ? "Percent (1–90)" : "Amount off (₹)"}
        type="number"
        step={type === "PERCENT" ? 1 : 0.01}
        error={errors.value?.message}
        {...register("value")}
      />
      {type === "PERCENT" ? (
        <Input label="Max discount (₹)" type="number" optional error={errors.maxDiscountRupees?.message} {...register("maxDiscountRupees")} />
      ) : (
        <div className="hidden sm:block" />
      )}
      <Input label="Minimum order (₹)" type="number" error={errors.minOrderRupees?.message} {...register("minOrderRupees")} />
      <Input label="Usage limit" type="number" optional hint="Blank = unlimited" error={errors.usageLimit?.message} {...register("usageLimit")} />
      <Input label="Valid from" type="datetime-local" optional error={errors.validFrom?.message} {...register("validFrom")} />
      <Input label="Valid to" type="datetime-local" optional error={errors.validTo?.message} {...register("validTo")} />
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] sm:col-span-2">
        <input type="checkbox" className="h-4 w-4 accent-ink" {...register("active")} />
        Active
      </label>
      <div className="flex gap-3 pt-2 sm:col-span-2">
        <Button type="submit" loading={save.isPending}>
          {coupon ? "Save changes" : "Create coupon"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AdminCoupons() {
  const { data, isPending, isError, error, refetch } = useAdminCoupons();
  const deactivate = useDeactivateCoupon();
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);

  return (
    <div>
      <AdminHeader
        title="Coupons"
        description="Applied at checkout. The backend validates dates, limits and minimums."
        action={
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> New coupon
          </Button>
        }
      />
      {isPending ? (
        <Skeleton className="h-60 w-full" />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <p className="py-16 text-center text-stone">No coupons yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <li key={c.couponId} className="flex flex-col border border-line p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-lg tracking-widest">{c.code}</p>
                {c.active === false ? <Badge tone="muted">Inactive</Badge> : <Badge tone="ok">Active</Badge>}
              </div>
              <p className="mt-2 text-[15px]">{describe(c)}</p>
              <p className="mt-1 text-[13px] text-stone">
                Used {c.usedCount ?? 0}
                {c.usageLimit ? ` of ${c.usageLimit}` : ""} ·{" "}
                {c.validTo ? `ends ${formatDate(c.validTo)}` : "no end date"}
              </p>
              <div className="mt-4 flex gap-2 text-[13px]">
                <button type="button" className="inline-flex min-h-11 items-center pr-3 underline underline-offset-4" onClick={() => setEditing(c)}>
                  Edit
                </button>
                {c.active !== false && (
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center px-3 text-ember underline underline-offset-4"
                    disabled={deactivate.isPending}
                    onClick={() => deactivate.mutate(c.couponId!)}
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Coupon" className="max-w-[600px]">
        <div className="flex-1 overflow-y-auto px-6 pb-10 pt-7 sm:px-8">
          <h2 className="display mb-8 text-3xl">{editing === "new" ? "New coupon" : "Edit coupon"}</h2>
          {editing && <CouponForm key={editing === "new" ? "new" : editing.couponId} coupon={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
        </div>
      </Sheet>
    </div>
  );
}
