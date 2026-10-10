import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowUpRight, ImagePlus, Trash2 } from "lucide-react";
import Link from "@/components/ui/Link";
import { AdminPage, ErrorPanel, Panel, Pill } from "@/components/admin/AdminUI";
import { ProductPhoto } from "@/components/products/ProductPhoto";
import { Button } from "@/components/ui/Button";
import { FormStatus, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLoad } from "@/hooks/useLoad";
import { usePageMeta } from "@/hooks/usePageMeta";
import { adminProductApi } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { fetchAllProducts } from "@/lib/api/products";
import { CATEGORIES, FRAGRANCE_FAMILIES, GENDERS, paise, type CategoryEnum, type FragranceFamilyEnum, type GenderEnum, type ProductDTO, type ProductInput } from "@/lib/api/types";
import { CATEGORY_LABEL, GENDER_LABEL, slugify } from "@/lib/admin";
import { familyLabel, invalidateCatalog, optimisedImage } from "@/lib/catalog";
import { errorMessage } from "@/lib/errors";
import { formatBytes, prepareProductImage, type PreparedImage } from "@/lib/image";
import { formatPaise } from "@/lib/orders";
import { toast } from "@/store/toast";

interface Values {
  name: string;
  slug: string;
  description: string;
  category: CategoryEnum | "";
  gender: GenderEnum | "";
  fragranceFamily: FragranceFamilyEnum | "";
  mrp: string;
  price: string;
  stock: string;
  active: boolean;
}
type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = { name: "", slug: "", description: "", category: "", gender: "", fragranceFamily: "", mrp: "", price: "", stock: "0", active: true };
const MONEY = /^\d{1,7}(\.\d{1,2})?$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const fromProduct = (p: ProductDTO): Values => ({
  name: p.name ?? "",
  slug: p.slug ?? "",
  description: p.description ?? "",
  category: p.category ?? "",
  gender: p.gender ?? "",
  fragranceFamily: p.fragranceFamily ?? "",
  mrp: p.mrp != null ? String(p.mrp / 100) : "",
  price: p.price != null ? String(p.price / 100) : "",
  stock: String(p.stock ?? 0),
  active: p.active !== false,
});

/** Mirrors model/Product.java (name ≤100, unique slug ≤120, description ≤2000) plus what checkout needs (a price and stock). */
function validate(v: Values, others: ProductDTO[]): Errors {
  const e: Errors = {};
  const name = v.name.trim();
  if (!name) e.name = "Enter a product name.";
  else if (name.length > 100) e.name = "Use 100 characters or fewer.";
  const slug = v.slug.trim();
  if (!slug) e.slug = "Enter a URL slug.";
  else if (slug.length > 120) e.slug = "Use 120 characters or fewer.";
  else if (!SLUG.test(slug)) e.slug = "Use lowercase letters, numbers and single hyphens, e.g. royal-oud-50ml.";
  else if (others.some((p) => p.slug === slug)) e.slug = "Another product already uses this slug.";
  if (v.description.length > 2000) e.description = `Use 2,000 characters or fewer (now ${v.description.length.toLocaleString("en-IN")}).`;
  if (!v.category) e.category = "Choose Perfume or Attar.";
  if (!MONEY.test(v.price.trim()) || Number(v.price) <= 0) e.price = "Enter the selling price in rupees, e.g. 1499.";
  if (!MONEY.test(v.mrp.trim()) || Number(v.mrp) <= 0) e.mrp = "Enter the MRP in rupees, e.g. 1999.";
  else if (!e.price && Number(v.mrp) < Number(v.price)) e.mrp = "MRP can't be lower than the selling price.";
  if (!/^\d{1,6}$/.test(v.stock.trim())) e.stock = "Enter a whole number, 0 or more.";
  return e;
}

const toInput = (v: Values): ProductInput => ({
  name: v.name.trim(),
  slug: v.slug.trim(),
  description: v.description.trim() || null,
  category: (v.category || null) as CategoryEnum | null,
  gender: (v.gender || null) as GenderEnum | null,
  fragranceFamily: (v.fragranceFamily || null) as FragranceFamilyEnum | null,
  mrp: paise(Number(v.mrp)),
  price: paise(Number(v.price)),
  stock: Number(v.stock),
  active: v.active,
});

export default function AdminProductEdit() {
  const { id } = useParams();
  const isNew = !id;
  const productId = Number(id);
  usePageMeta(isNew ? "New product · Admin" : "Edit product · Admin", undefined, { noindex: true });
  const products = useLoad(() => fetchAllProducts());
  const product = isNew ? undefined : products.data?.find((p) => p.productId === productId);

  if (products.error)
    return (
      <AdminPage eyebrow="Catalogue" title={isNew ? "New product" : "Edit product"}>
        <ErrorPanel error={products.error} onRetry={products.reload} what="the product list" />
      </AdminPage>
    );
  if (!products.data)
    return (
      <AdminPage eyebrow="Catalogue" title={isNew ? "New product" : "Edit product"}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Skeleton className="h-[34rem]" />
          <Skeleton className="h-[24rem]" />
        </div>
      </AdminPage>
    );
  if (!isNew && !product)
    return (
      <AdminPage eyebrow="Catalogue" title="Product not found">
        <p className="text-[0.9rem] text-ink-muted">There&rsquo;s no product #{id}. It may have been deleted.</p>
        <Link href="/admin/products" className="label mt-6 inline-block underline underline-offset-4">
          Back to products
        </Link>
      </AdminPage>
    );

  return (
    <ProductForm
      key={product?.productId ?? "new"}
      product={product}
      others={products.data.filter((p) => p.productId !== product?.productId)}
      onSaved={(p) => products.setData((all) => [...(all ?? []).filter((x) => x.productId !== p.productId), p])}
    />
  );
}

function ProductForm({ product, others, onSaved }: { product?: ProductDTO; others: ProductDTO[]; onSaved: (p: ProductDTO) => void }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<Values>(product ? fromProduct(product) : EMPTY);
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const isNew = !product;
  const saved = useMemo(() => (product ? fromProduct(product) : EMPTY), [product]);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved) || (isNew && !!image);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const set =
    <K extends keyof Values>(k: K) =>
    (v: Values[K]) => {
      setValues((x) => {
        const next = { ...x, [k]: v };
        if (k === "name" && !slugTouched) next.slug = slugify(String(v));
        return next;
      });
      if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
    };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const next = validate(values, others);
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) {
      document.getElementById(`pf-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      const input = toInput(values);
      let result = product ? await adminProductApi.update(product.productId, input) : await adminProductApi.create(input);
      if (isNew && image) {
        try {
          result = await adminProductApi.uploadImage(result.productId, image.blob, image.filename);
        } catch (err) {
          toast({ title: "Product saved, but the image didn't upload", description: errorMessage(err), tone: "error" });
        }
      }
      invalidateCatalog();
      onSaved(result);
      toast({ title: isNew ? `${result.name} created` : `${result.name} saved`, description: result.active ? "Live in the store." : "Hidden from the store." });
      if (isNew) navigate(`/admin/products/${result.productId}`, { replace: true });
      else setValues(fromProduct(result));
    } catch (err) {
      setFormError(
        err instanceof ApiError && err.status === 500
          ? "The server rejected this product. Check that the slug isn't used by another product (including deleted drafts) and try again."
          : errorMessage(err),
      );
    } finally {
      setSaving(false);
    }
  };

  const price = MONEY.test(values.price) ? Number(values.price) : null;
  const mrp = MONEY.test(values.mrp) ? Number(values.mrp) : null;
  const discount = price && mrp && mrp > price ? Math.floor(((mrp - price) * 100) / mrp) : 0;

  return (
    <AdminPage
      eyebrow={isNew ? "Catalogue · new" : `Catalogue · #${product.productId}`}
      title={isNew ? "New product" : product.name}
      actions={
        <>
          {product?.active && (
            <a href={`/products/${product.slug}`} target="_blank" rel="noreferrer" className="label inline-flex h-10 items-center gap-2 border border-espresso/30 px-4 text-[0.6rem] hover:border-espresso">
              View in store <ArrowUpRight aria-hidden className="h-3.5 w-3.5" strokeWidth={1.4} />
            </a>
          )}
          <Link href="/admin/products" className="label inline-flex h-10 items-center px-2 text-[0.6rem] text-ink-muted hover:text-ink">
            All products
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <form onSubmit={submit} noValidate aria-label="Product details" className="space-y-6">
          <Panel title="Details">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <TextField id="pf-name" className="sm:col-span-2" label="Name" value={values.name} onChange={set("name")} error={errors.name} maxLength={100} hint={`${values.name.length}/100`} />
              <TextField
                id="pf-slug"
                className="sm:col-span-2"
                label="URL slug"
                value={values.slug}
                onChange={(v) => {
                  setSlugTouched(true);
                  set("slug")(v.toLowerCase().replace(/\s+/g, "-"));
                }}
                error={errors.slug}
                maxLength={120}
                hint={`Store address: /products/${values.slug || "…"}${product && values.slug !== product.slug ? " (changing it breaks old links)" : ""}`}
                spellCheck={false}
              />
              <TextAreaField
                id="pf-description"
                className="sm:col-span-2"
                label="Description"
                value={values.description}
                onChange={set("description")}
                error={errors.description}
                hint={`${values.description.length.toLocaleString("en-IN")}/2,000 · shown on the product page`}
                rows={6}
              />
              <SelectField id="pf-category" label="Type" value={values.category} onChange={(v) => set("category")(v as CategoryEnum)} error={errors.category}>
                <option value="">Choose</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </SelectField>
              <SelectField id="pf-gender" label="For" value={values.gender} onChange={(v) => set("gender")(v as GenderEnum)} hint="Not set shows as unisex.">
                <option value="">Not set</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {GENDER_LABEL[g]}
                  </option>
                ))}
              </SelectField>
              <SelectField id="pf-fragranceFamily" className="sm:col-span-2" label="Fragrance family" value={values.fragranceFamily} onChange={(v) => set("fragranceFamily")(v as FragranceFamilyEnum)} hint="Used by the store's scent filters.">
                <option value="">Not set</option>
                {FRAGRANCE_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {familyLabel(f)}
                  </option>
                ))}
              </SelectField>
            </div>
          </Panel>

          <Panel title="Price & stock">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <TextField id="pf-price" label="Selling price (₹)" inputMode="decimal" value={values.price} onChange={(v) => set("price")(v.replace(/[^\d.]/g, ""))} error={errors.price} />
              <TextField
                id="pf-mrp"
                label="MRP (₹)"
                inputMode="decimal"
                value={values.mrp}
                onChange={(v) => set("mrp")(v.replace(/[^\d.]/g, ""))}
                error={errors.mrp}
                hint={discount ? `${discount}% off shown in store` : "Same as price = no discount"}
              />
              <TextField id="pf-stock" label="Stock" inputMode="numeric" value={values.stock} onChange={(v) => set("stock")(v.replace(/\D/g, "").slice(0, 6))} error={errors.stock} hint="Units available to sell" />
            </div>
            <label className="mt-6 flex cursor-pointer items-start gap-3 border-t border-hair pt-5">
              <input type="checkbox" checked={values.active} onChange={(e) => set("active")(e.target.checked)} className="mt-1 h-4 w-4 accent-espresso" />
              <span>
                <span className="block text-[0.9rem]">Live in the store</span>
                <span className="text-[0.78rem] text-ink-muted">Hidden products stay in past orders but can&rsquo;t be found or bought.</span>
              </span>
            </label>
          </Panel>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" disabled={saving || (!dirty && !isNew)} aria-busy={saving}>
              {saving ? "Saving" : isNew ? (image ? "Create product & upload image" : "Create product") : "Save changes"}
            </Button>
            {!isNew && dirty && !saving && (
              <button type="button" onClick={() => setValues(saved)} className="label text-[0.6rem] text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                Discard changes
              </button>
            )}
            {!dirty && !isNew && <span className="text-[0.78rem] text-ink-faint">All changes saved.</span>}
          </div>
          <FormStatus error={formError} pending={saving} />
        </form>

        <div className="space-y-6">
          <ImagePanel product={product} pending={image} onPending={setImage} onUploaded={onSaved} />
          {product && <DangerZone product={product} />}
          {product && (
            <Panel title="As the store shows it">
              <dl className="space-y-2 text-[0.84rem]">
                <Row k="Price" v={formatPaise(product.price)} />
                <Row k="MRP" v={formatPaise(product.mrp)} />
                <Row k="Discount" v={`${product.discount ?? 0}%`} />
                <Row k="Stock" v={String(product.stock ?? 0)} />
                <Row k="Status" v={product.active !== false ? "Live" : "Hidden"} />
              </dl>
            </Panel>
          )}
        </div>
      </div>
    </AdminPage>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{k}</dt>
      <dd className="tabular">{v}</dd>
    </div>
  );
}

/** PUT /api/admin/products/{id}/image (multipart "image") → Cloudinary. New products upload right after they're created. */
function ImagePanel({ product, pending, onPending, onUploaded }: { product?: ProductDTO; pending: PreparedImage | null; onPending: (i: PreparedImage | null) => void; onUploaded: (p: ProductDTO) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preparing" | "uploading" | null>(null);

  useEffect(() => {
    if (!pending) return setPreview(null);
    const url = URL.createObjectURL(pending.blob);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pending]);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy("preparing");
    try {
      onPending(await prepareProductImage(file));
    } catch (e) {
      onPending(null);
      setError(errorMessage(e));
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  const upload = async () => {
    if (!product || !pending) return;
    setBusy("uploading");
    setError(null);
    try {
      const saved = await adminProductApi.uploadImage(product.productId, pending.blob, pending.filename);
      onUploaded(saved);
      onPending(null);
      invalidateCatalog();
      toast({ title: "Image uploaded", description: product.name });
    } catch (e) {
      setError(e instanceof ApiError && (e.status === 413 || e.status === 500) ? "The server didn't accept that image. Try a smaller JPEG (under 1 MB)." : errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const current = product?.image ? optimisedImage(product.image, 800) : null;

  return (
    <Panel title="Image" action={pending ? <Pill tone="warn">Not uploaded yet</Pill> : current ? <Pill tone="neutral">On Cloudinary</Pill> : <Pill tone="warn">No image</Pill>}>
      <div className="relative mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden bg-sand">
        {preview ? <img src={preview} alt="New image preview" className="absolute inset-0 h-full w-full object-cover" /> : <ProductPhoto src={current} alt={product?.name ?? "New product"} sizes="320px" dark={product?.category === "ATTAR"} />}
      </div>
      {pending && (
        <p className="mt-3 text-center text-[0.75rem] text-ink-muted">
          {pending.width} × {pending.height}px · {formatBytes(pending.blob.size)}
          {pending.converted ? " · resized for upload" : ""}
        </p>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="pf-image" onChange={(e) => choose(e.target.files?.[0])} />
      <div className="mt-5 flex flex-col gap-2">
        <label htmlFor="pf-image" className="label inline-flex h-11 cursor-pointer items-center justify-center gap-2 border border-espresso/40 text-[0.6rem] hover:border-espresso">
          <ImagePlus aria-hidden className="h-4 w-4" strokeWidth={1.3} /> {busy === "preparing" ? "Preparing…" : current || pending ? "Choose a different image" : "Choose image"}
        </label>
        {product && pending && (
          <Button type="button" size="sm" onClick={upload} disabled={!!busy} aria-busy={busy === "uploading"}>
            {busy === "uploading" ? "Uploading" : "Upload image"}
          </Button>
        )}
        {pending && !busy && (
          <button type="button" onClick={() => onPending(null)} className="label text-[0.58rem] text-ink-muted hover:text-ink">
            Cancel
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[0.78rem] text-[#9b3b2a]">
          {error}
        </p>
      )}
      <p className="mt-4 text-[0.72rem] leading-relaxed text-ink-faint">JPEG, PNG or WebP, at least 400 px. Portrait 4:5 at 1200 × 1500 px looks best. Large photos are resized to under 1 MB before upload.</p>
    </Panel>
  );
}

function DangerZone({ product }: { product: ProductDTO }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminProductApi.remove(product.productId);
      invalidateCatalog();
      toast({ title: `${product.name} deleted` });
      navigate("/admin/products", { replace: true });
    } catch (e) {
      setError(
        e instanceof ApiError && e.status >= 500
          ? "This product is part of an order or a shopper's cart, so it can't be deleted. Turn off “Live in the store” to hide it instead."
          : errorMessage(e),
      );
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <Panel title="Delete">
      <p className="text-[0.82rem] text-ink-muted">Deleting removes the product for good. To stop selling it but keep its history, hide it instead.</p>
      {confirming ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" onClick={remove} disabled={busy} className="bg-[#7d2e21] before:bg-[#5e2015]">
            {busy ? "Deleting" : `Delete ${product.name}`}
          </Button>
          <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="label text-[0.6rem] text-ink-muted hover:text-ink">
            Keep it
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="label mt-4 inline-flex items-center gap-2 text-[0.6rem] text-[#9b3b2a] underline-offset-4 hover:underline">
          <Trash2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.4} /> Delete product
        </button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-[0.78rem] text-[#9b3b2a]">
          {error}
        </p>
      )}
    </Panel>
  );
}
