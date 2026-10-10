import { useState, type FormEvent } from "react";
import { AdminPage, EmptyPanel, ErrorPanel, Panel, Pill, TableSkeleton } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/Button";
import { FormStatus, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { useLoad } from "@/hooks/useLoad";
import { usePageMeta } from "@/hooks/usePageMeta";
import { adminBundleApi } from "@/lib/api/bundles";
import { paise, type BundleDTO, type CategoryEnum } from "@/lib/api/types";
import { invalidateCatalog } from "@/lib/catalog";
import { errorMessage } from "@/lib/errors";
import { formatPaise } from "@/lib/orders";
import { toast } from "@/store/toast";

const MONEY = /^\d{1,7}(\.\d{1,2})?$/;

interface Values {
  name: string;
  slug: string;
  description: string;
  itemCount: string;
  price: string;
  allowedCategory: CategoryEnum | "";
  allowRepeats: boolean;
  active: boolean;
}
type Errors = Partial<Record<keyof Values, string>>;

const fromBundle = (b: BundleDTO): Values => ({
  name: b.name,
  slug: b.slug,
  description: b.description ?? "",
  itemCount: String(b.itemCount),
  price: String(b.price / 100),
  allowedCategory: b.allowedCategory ?? "",
  allowRepeats: !!b.allowRepeats,
  active: b.active !== false,
});

/** Mirrors service/BundleService.java (name ≤100, slug pattern, 1–10 items, price > 0). */
function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim() || v.name.trim().length > 100) e.name = "Enter a name (100 characters at most).";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.slug.trim())) e.slug = "Lowercase letters, numbers and single hyphens.";
  if (!/^\d{1,2}$/.test(v.itemCount) || Number(v.itemCount) < 1 || Number(v.itemCount) > 10) e.itemCount = "1 to 10 products.";
  if (!MONEY.test(v.price.trim()) || Number(v.price) <= 0) e.price = "Enter the box price in rupees, e.g. 1799.";
  if (v.description.length > 1000) e.description = "1000 characters at most.";
  return e;
}

/**
 * Build Your Own Box settings (GET/PUT /api/admin/bundles). The storefront reads the active box from
 * GET /api/public/bundles, and checkout always charges the price saved here.
 */
export default function AdminBundles() {
  usePageMeta("Boxes · Admin", undefined, { noindex: true });
  const bundles = useLoad(() => adminBundleApi.all());

  return (
    <AdminPage eyebrow="Catalogue" title="Build your box">
      <p className="mb-6 max-w-2xl text-[0.86rem] text-ink-muted">
        Customers choose the set number of fragrances for one fixed price. The price is always set here, on the server; each box uses one unit of every chosen product&rsquo;s stock.
      </p>
      {bundles.error ? (
        <ErrorPanel error={bundles.error} onRetry={bundles.reload} what="boxes" />
      ) : !bundles.data ? (
        <TableSkeleton rows={3} />
      ) : bundles.data.length === 0 ? (
        <EmptyPanel title="No boxes" body="The backend creates the Build Your Own Box on start-up (shop.box.* settings)." />
      ) : (
        <div className="space-y-6">
          {bundles.data.map((b) => (
            <BundleForm key={b.bundleId} bundle={b} onSaved={(saved) => bundles.setData((all) => (all ?? []).map((x) => (x.bundleId === saved.bundleId ? saved : x)))} />
          ))}
        </div>
      )}
    </AdminPage>
  );
}

function BundleForm({ bundle, onSaved }: { bundle: BundleDTO; onSaved: (b: BundleDTO) => void }) {
  const [values, setValues] = useState<Values>(fromBundle(bundle));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(fromBundle(bundle));

  const set =
    <K extends keyof Values>(k: K) =>
    (v: Values[K]) => {
      setValues((x) => ({ ...x, [k]: v }));
      if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
    };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const next = validate(values);
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const saved = await adminBundleApi.update(bundle.bundleId, {
        name: values.name.trim(),
        slug: values.slug.trim(),
        description: values.description.trim() || null,
        itemCount: Number(values.itemCount),
        price: paise(Number(values.price)),
        allowedCategory: values.allowedCategory || null,
        allowRepeats: values.allowRepeats,
        active: values.active,
        image: bundle.image,
      });
      invalidateCatalog();
      onSaved(saved);
      setValues(fromBundle(saved));
      toast({ title: `${saved.name} saved`, description: saved.active ? `${saved.itemCount} for ${formatPaise(saved.price)}` : "Hidden from the store." });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title={bundle.name} action={<Pill tone={bundle.active === false ? "bad" : "good"}>{bundle.active === false ? "Off" : "On sale"}</Pill>}>
      <form onSubmit={submit} noValidate aria-label={`Edit ${bundle.name}`} className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <TextField className="md:col-span-2" label="Name" value={values.name} onChange={set("name")} error={errors.name} maxLength={100} />
        <TextField className="md:col-span-2" label="Slug" value={values.slug} onChange={(v) => set("slug")(v.toLowerCase())} error={errors.slug} hint="The storefront uses build-your-box" spellCheck={false} />
        <TextField label="Products per box" inputMode="numeric" value={values.itemCount} onChange={(v) => set("itemCount")(v.replace(/\D/g, ""))} error={errors.itemCount} />
        <TextField label="Box price (₹)" inputMode="decimal" value={values.price} onChange={(v) => set("price")(v.replace(/[^\d.]/g, ""))} error={errors.price} />
        <SelectField label="Products allowed" value={values.allowedCategory} onChange={(v) => set("allowedCategory")(v as CategoryEnum | "")}>
          <option value="">Perfumes and attars</option>
          <option value="PERFUME">Perfumes only</option>
          <option value="ATTAR">Attars only</option>
        </SelectField>
        <div className="flex flex-col justify-end gap-3 pb-1">
          <label className="flex cursor-pointer items-center gap-3 text-[0.88rem]">
            <input type="checkbox" checked={values.allowRepeats} onChange={(e) => set("allowRepeats")(e.target.checked)} className="h-4 w-4 accent-espresso" />
            Same product more than once
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-[0.88rem]">
            <input type="checkbox" checked={values.active} onChange={(e) => set("active")(e.target.checked)} className="h-4 w-4 accent-espresso" />
            On sale
          </label>
        </div>
        <TextAreaField className="md:col-span-2 xl:col-span-4" label="Description" value={values.description} onChange={set("description")} error={errors.description} rows={3} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:col-span-2 xl:col-span-4">
          <Button type="submit" size="sm" disabled={saving || !dirty} aria-busy={saving}>
            {saving ? "Saving" : "Save box"}
          </Button>
          {!dirty && <span className="text-[0.78rem] text-ink-faint">All changes saved.</span>}
          <FormStatus error={formError} pending={saving} />
        </div>
      </form>
    </Panel>
  );
}
