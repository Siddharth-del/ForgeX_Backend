import { useRef, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { AdminPage, EmptyPanel, ErrorPanel, Panel, Pill, TableSkeleton } from "@/components/admin/AdminUI";
import { td, th } from "@/components/admin/styles";
import { Button } from "@/components/ui/Button";
import { FormStatus, TextField } from "@/components/ui/Field";
import { useLoad } from "@/hooks/useLoad";
import { usePageMeta } from "@/hooks/usePageMeta";
import { adminCouponApi } from "@/lib/api/admin";
import { paise, type CouponDTO, type CouponInput, type DiscountType } from "@/lib/api/types";
import { couponState, type CouponState } from "@/lib/admin";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatPaise } from "@/lib/orders";
import { cn } from "@/lib/cn";
import { toast } from "@/store/toast";

interface Values {
  code: string;
  type: DiscountType;
  value: string;
  minOrder: string;
  maxDiscount: string;
  usageLimit: string;
  validFrom: string;
  validTo: string;
  active: boolean;
}
type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = { code: "", type: "PERCENT", value: "", minOrder: "", maxDiscount: "", usageLimit: "", validFrom: "", validTo: "", active: true };
const MONEY = /^\d{1,7}(\.\d{1,2})?$/;
const STATE: Record<CouponState, { label: string; tone: "good" | "neutral" | "warn" | "bad" }> = {
  active: { label: "Active", tone: "good" },
  scheduled: { label: "Scheduled", tone: "warn" },
  expired: { label: "Expired", tone: "neutral" },
  "used-up": { label: "Used up", tone: "neutral" },
  inactive: { label: "Off", tone: "bad" },
};

/** "2026-10-09T23:45:12.123" → "2026-10-09T23:45" for <input type="datetime-local">. */
const toLocalInput = (v: string | null) => (v ? v.slice(0, 16) : "");
const fromLocalInput = (v: string) => (v ? `${v}:00` : null);

const fromCoupon = (c: CouponDTO): Values => ({
  code: c.code,
  type: c.type,
  value: c.type === "FLAT" ? String(c.value / 100) : String(c.value),
  minOrder: c.minOrderPaise != null ? String(c.minOrderPaise / 100) : "",
  maxDiscount: c.maxDiscountPaise != null ? String(c.maxDiscountPaise / 100) : "",
  usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
  validFrom: toLocalInput(c.validFrom),
  validTo: toLocalInput(c.validTo),
  active: c.active !== false,
});

/** Mirrors dto/CouponDTO.java (@NotBlank code, @Positive value) and CouponService.validateRules (percent 1–90, end after start). */
function validate(v: Values, existing: CouponDTO[], editing: CouponDTO | null): Errors {
  const e: Errors = {};
  const code = v.code.trim().toUpperCase();
  if (!editing) {
    if (!code) e.code = "Enter a code, e.g. WELCOME10.";
    else if (/\s/.test(code)) e.code = "Codes can't contain spaces.";
    else if (existing.some((c) => c.code.toUpperCase() === code)) e.code = "A coupon with this code already exists.";
  }
  if (v.type === "PERCENT") {
    if (!/^\d{1,2}$/.test(v.value) || Number(v.value) < 1 || Number(v.value) > 90) e.value = "Enter a whole percentage from 1 to 90.";
  } else if (!MONEY.test(v.value) || Number(v.value) <= 0) e.value = "Enter the amount off in rupees, e.g. 200.";
  if (v.minOrder && !MONEY.test(v.minOrder)) e.minOrder = "Enter an amount in rupees, or leave blank.";
  if (v.type === "PERCENT" && v.maxDiscount && (!MONEY.test(v.maxDiscount) || Number(v.maxDiscount) <= 0)) e.maxDiscount = "Enter an amount in rupees, or leave blank.";
  if (v.usageLimit && (!/^\d{1,7}$/.test(v.usageLimit) || Number(v.usageLimit) < 1)) e.usageLimit = "Enter a whole number, or leave blank for unlimited.";
  if (v.validFrom && v.validTo && v.validTo <= v.validFrom) e.validTo = "The end must be after the start.";
  return e;
}

const toInput = (v: Values): CouponInput => ({
  code: v.code.trim().toUpperCase(),
  type: v.type,
  value: v.type === "FLAT" ? paise(Number(v.value)) : Number(v.value),
  minOrderPaise: v.minOrder ? paise(Number(v.minOrder)) : null,
  maxDiscountPaise: v.type === "PERCENT" && v.maxDiscount ? paise(Number(v.maxDiscount)) : null,
  usageLimit: v.usageLimit ? Number(v.usageLimit) : null,
  validFrom: fromLocalInput(v.validFrom),
  validTo: fromLocalInput(v.validTo),
  active: v.active,
});

const describe = (c: CouponDTO) =>
  c.type === "PERCENT" ? `${c.value}% off${c.maxDiscountPaise != null ? ` (max ${formatPaise(c.maxDiscountPaise)})` : ""}` : `${formatPaise(c.value)} off`;

export default function AdminCoupons() {
  usePageMeta("Coupons · Admin", undefined, { noindex: true });
  const coupons = useLoad(() => adminCouponApi.all());
  const [editing, setEditing] = useState<CouponDTO | "new" | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const list = [...(coupons.data ?? [])].sort((a, b) => Number(b.active !== false) - Number(a.active !== false) || b.couponId - a.couponId);

  const open = (c: CouponDTO | "new") => {
    setEditing(c);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const upsert = (c: CouponDTO) => coupons.setData((all) => [...(all ?? []).filter((x) => x.couponId !== c.couponId), c]);

  return (
    <AdminPage
      eyebrow="Sales"
      title="Coupons"
      actions={
        editing === null ? (
          <Button type="button" size="sm" onClick={() => open("new")}>
            <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} /> New coupon
          </Button>
        ) : undefined
      }
    >
      <div ref={formRef} className="scroll-mt-6">
        {editing !== null && coupons.data && (
          <CouponForm
            key={editing === "new" ? "new" : editing.couponId}
            coupon={editing === "new" ? null : editing}
            existing={coupons.data}
            onDone={(saved) => {
              if (saved) upsert(saved);
              setEditing(null);
            }}
          />
        )}
      </div>

      <div className={editing !== null ? "mt-8" : undefined}>
        {coupons.error ? (
          <ErrorPanel error={coupons.error} onRetry={coupons.reload} what="coupons" />
        ) : !coupons.data ? (
          <TableSkeleton rows={4} />
        ) : list.length === 0 ? (
          editing === null && (
            <EmptyPanel
              title="No coupons yet"
              body="Create a percentage or fixed-amount code. Shoppers enter it at checkout and the server checks it."
              action={
                <Button type="button" size="sm" onClick={() => open("new")}>
                  New coupon
                </Button>
              }
            />
          )
        ) : (
          <div className="relative overflow-x-auto border border-hair bg-white/70">
            <table className="w-full min-w-[52rem]">
              <thead className="border-b border-hair">
                <tr>
                  <th className={th}>Code</th>
                  <th className={th}>Discount</th>
                  <th className={th}>Min. order</th>
                  <th className={th}>Used</th>
                  <th className={th}>Valid</th>
                  <th className={th}>Status</th>
                  <th className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hair">
                {list.map((c) => (
                  <CouponRow key={c.couponId} coupon={c} onEdit={() => open(c)} onSaved={upsert} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPage>
  );
}

function CouponRow({ coupon: c, onEdit, onSaved }: { coupon: CouponDTO; onEdit: () => void; onSaved: (c: CouponDTO) => void }) {
  const [busy, setBusy] = useState(false);
  const state = couponState(c);

  const setActive = async (active: boolean) => {
    setBusy(true);
    try {
      if (active) onSaved(await adminCouponApi.update(c.couponId, { ...toInput(fromCoupon(c)), active: true }));
      else {
        await adminCouponApi.deactivate(c.couponId);
        onSaved({ ...c, active: false });
      }
      toast({ title: `${c.code} ${active ? "switched on" : "switched off"}` });
    } catch (e) {
      toast({ title: `Couldn't update ${c.code}`, description: errorMessage(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="hover:bg-sand/30">
      <td className={cn(td, "font-medium tracking-[0.08em]")}>{c.code}</td>
      <td className={td}>{describe(c)}</td>
      <td className={cn(td, "tabular text-ink-muted")}>{c.minOrderPaise ? formatPaise(c.minOrderPaise) : "—"}</td>
      <td className={cn(td, "tabular")}>
        {c.usedCount ?? 0}
        <span className="text-ink-faint"> / {c.usageLimit ?? "∞"}</span>
      </td>
      <td className={cn(td, "text-[0.78rem] text-ink-muted")}>
        {c.validFrom || c.validTo ? (
          <>
            {c.validFrom ? formatDateTime(c.validFrom) : "Now"} → {c.validTo ? formatDateTime(c.validTo) : "no end"}
          </>
        ) : (
          "Always"
        )}
      </td>
      <td className={td}>
        <Pill tone={STATE[state].tone}>{STATE[state].label}</Pill>
      </td>
      <td className={cn(td, "whitespace-nowrap text-right")}>
        <button type="button" onClick={onEdit} className="label mr-4 text-[0.58rem] underline-offset-4 hover:underline">
          Edit
        </button>
        <button type="button" onClick={() => setActive(c.active === false)} disabled={busy} className="label text-[0.58rem] text-ink-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-50">
          {busy ? "Saving" : c.active === false ? "Switch on" : "Switch off"}
        </button>
      </td>
    </tr>
  );
}

function CouponForm({ coupon, existing, onDone }: { coupon: CouponDTO | null; existing: CouponDTO[]; onDone: (saved?: CouponDTO) => void }) {
  const [values, setValues] = useState<Values>(coupon ? fromCoupon(coupon) : EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set =
    <K extends keyof Values>(k: K) =>
    (v: Values[K]) => {
      setValues((x) => ({ ...x, [k]: v }));
      if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
    };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const next = validate(values, existing, coupon);
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const input = toInput(values);
      const saved = coupon ? await adminCouponApi.update(coupon.couponId, input) : await adminCouponApi.create(input);
      toast({ title: coupon ? `${saved.code} saved` : `${saved.code} created` });
      onDone(saved);
    } catch (err) {
      setFormError(errorMessage(err));
      setSaving(false);
    }
  };

  const money = (v: string) => v.replace(/[^\d.]/g, "");

  return (
    <Panel title={coupon ? `Edit ${coupon.code}` : "New coupon"}>
      <form onSubmit={submit} noValidate aria-label={coupon ? `Edit coupon ${coupon.code}` : "New coupon"} className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <TextField
          label="Code"
          value={values.code}
          onChange={(v) => set("code")(v.toUpperCase().replace(/\s/g, ""))}
          error={errors.code}
          disabled={!!coupon}
          hint={coupon ? "Codes can't be changed." : "Customers type this at checkout."}
          maxLength={40}
          spellCheck={false}
          autoComplete="off"
        />
        <fieldset>
          <legend className="label text-ink-muted">Type</legend>
          <div className="mt-3 grid h-12 grid-cols-2 border border-espresso/20">
            {(["PERCENT", "FLAT"] as DiscountType[]).map((t) => (
              <label key={t} className={cn("flex cursor-pointer items-center justify-center text-[0.66rem] font-medium uppercase tracking-[0.18em] transition-colors", values.type === t ? "bg-espresso text-ivory" : "text-ink-muted hover:text-ink")}>
                <input type="radio" name="coupon-type" value={t} checked={values.type === t} onChange={() => set("type")(t)} className="sr-only" />
                {t === "PERCENT" ? "% off" : "₹ off"}
              </label>
            ))}
          </div>
        </fieldset>
        <TextField
          label={values.type === "PERCENT" ? "Percent off" : "Amount off (₹)"}
          inputMode="decimal"
          value={values.value}
          onChange={(v) => set("value")(money(v))}
          error={errors.value}
          hint={values.type === "PERCENT" ? "1 to 90" : "Never more than the order subtotal"}
        />
        {values.type === "PERCENT" ? (
          <TextField label="Max discount (₹)" inputMode="decimal" value={values.maxDiscount} onChange={(v) => set("maxDiscount")(money(v))} error={errors.maxDiscount} hint="Optional cap" />
        ) : (
          <div className="hidden xl:block" />
        )}
        <TextField label="Minimum order (₹)" inputMode="decimal" value={values.minOrder} onChange={(v) => set("minOrder")(money(v))} error={errors.minOrder} hint="Optional, before shipping" />
        <TextField label="Usage limit" inputMode="numeric" value={values.usageLimit} onChange={(v) => set("usageLimit")(v.replace(/\D/g, ""))} error={errors.usageLimit} hint={`Optional, total uses${coupon ? ` · used ${coupon.usedCount ?? 0}` : ""}`} />
        <TextField label="Starts" type="datetime-local" value={values.validFrom} onChange={set("validFrom")} error={errors.validFrom} hint="Optional" />
        <TextField label="Ends" type="datetime-local" value={values.validTo} onChange={set("validTo")} error={errors.validTo} hint="Optional" />
        <label className="flex cursor-pointer items-center gap-3 md:col-span-2 xl:col-span-4">
          <input type="checkbox" checked={values.active} onChange={(e) => set("active")(e.target.checked)} className="h-4 w-4 accent-espresso" />
          <span className="text-[0.88rem]">Switched on</span>
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:col-span-2 xl:col-span-4">
          <Button type="submit" size="sm" disabled={saving} aria-busy={saving}>
            {saving ? "Saving" : coupon ? "Save coupon" : "Create coupon"}
          </Button>
          <button type="button" onClick={() => onDone()} disabled={saving} className="label text-[0.6rem] text-ink-muted hover:text-ink">
            Cancel
          </button>
          <FormStatus error={formError} pending={saving} />
        </div>
      </form>
    </Panel>
  );
}
