import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProduct } from '../../hooks/useCatalog';
import { useProductMutations } from '../../hooks/useAdmin';
import { useToast } from '../../context/ToastContext';
import { useForm } from '../../hooks/useForm';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import PageHeader from '../../components/common/PageHeader';
import { Checkbox, Input, Select, Textarea } from '../../components/common/Field';
import Button from '../../components/common/Button';
import ProductImage from '../../components/common/ProductImage';
import { RowsSkeleton } from '../../components/common/Skeleton';
import { EmptyState, ErrorState } from '../../components/common/States';
import { CATEGORIES, FRAGRANCE_FAMILIES, GENDERS } from '../../constants';
import { SLUG, rules, toSlug } from '../../utils/validation';
import { parseApiError, errorMessage } from '../../utils/errors';
import { discountPercent, formatPaise, paiseToRupees, rupeesToPaise } from '../../utils/format';

const EMPTY = { name: '', slug: '', description: '', category: '', gender: '', family: '', mrp: '', price: '', stock: '0', active: true, image: null };
const MAX_IMAGE_MB = 5;

const schema = {
  name: [rules.required('Enter a product name'), rules.maxLength(100)],
  slug: [rules.required('Enter a URL slug'), rules.maxLength(120), rules.pattern(SLUG, 'Use lowercase letters, numbers and single hyphens')],
  description: [rules.maxLength(2000)],
  category: [rules.required('Choose a type')],
  gender: [rules.required('Choose who it is for')],
  family: [rules.required('Choose a fragrance family')],
  mrp: [rules.required('Enter the MRP'), rules.number(), rules.min(1, 'MRP must be more than zero')],
  price: [rules.required('Enter the selling price'), rules.number(), rules.min(1, 'Price must be more than zero'),
    (v, all) => (Number(v) > Number(all.mrp) ? 'Selling price cannot be higher than MRP' : null)],
  stock: [rules.required('Enter the stock'), rules.integer(), rules.min(0, 'Stock cannot be negative')],
};

const toForm = (p) => ({
  name: p.name, slug: p.slug, description: p.description || '', category: p.category || '', gender: p.gender || '', family: p.family || '',
  mrp: paiseToRupees(p.mrp), price: paiseToRupees(p.price), stock: String(p.stock ?? 0), active: p.active, image: p.image,
});

export default function ProductEditPage() {
  const { id } = useParams();
  const isNew = !id;
  useDocumentTitle(isNew ? 'Add product' : 'Edit product');
  const navigate = useNavigate();
  const toast = useToast();
  const { product, isLoading, isError, error, refetch } = useProduct(id);
  const { create, update, uploadImage } = useProductMutations();

  const form = useForm(EMPTY, schema);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [formError, setFormError] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!isNew && product && !loadedRef.current) { form.setValues(toForm(product)); loadedRef.current = true; }
  }, [isNew, product, form]);

  useEffect(() => {
    if (!file) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onName = (e) => {
    form.setField('name', e.target.value);
    if (!slugTouched) form.setField('slug', toSlug(e.target.value));
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Choose an image file (JPG, PNG or WebP).'); e.target.value = ''; return; }
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) { toast.error(`Images must be under ${MAX_IMAGE_MB} MB.`); e.target.value = ''; return; }
    setFile(f);
  };

  const saving = create.isPending || update.isPending || uploadImage.isPending;

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.validateAll()) return;

    const values = {
      ...form.values,
      mrp: rupeesToPaise(form.values.mrp),
      price: rupeesToPaise(form.values.price),
      stock: Number(form.values.stock),
    };

    try {
      const saved = isNew ? await create.mutateAsync(values) : await update.mutateAsync({ id, values });
      if (file) {
        try {
          await uploadImage.mutateAsync({ id: saved.id, file });
        } catch (imgErr) {
          toast.error(`Product saved, but the image upload failed: ${errorMessage(imgErr)}`);
          navigate(`/admin/products/${saved.id}/edit`, { replace: true });
          return;
        }
      }
      toast.success(isNew ? 'Product created.' : 'Product updated.');
      navigate('/admin/products');
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err, 'The product could not be saved. Check the details and try again.');
      if (fieldErrors.fragranceFamily) fieldErrors.family = fieldErrors.fragranceFamily;
      form.setErrors(fieldErrors);
      setFormError(/duplicate|unique|constraint/i.test(message) ? 'A product with this slug already exists. Choose a different slug.' : message);
    }
  };

  if (!isNew && isLoading) return <RowsSkeleton rows={6} className="h-14" />;
  if (!isNew && isError) return <ErrorState message={errorMessage(error)} onRetry={refetch} />;
  if (!isNew && !product) return <EmptyState title="Product not found" action="Back to products" actionTo="/admin/products" />;

  const liveDiscount = discountPercent(rupeesToPaise(form.values.mrp || 0), rupeesToPaise(form.values.price || 0));

  return (
    <div>
      <Link to="/admin/products" className="text-sm text-steel hover:text-ink">← Products</Link>
      <div className="mt-3"><PageHeader title={isNew ? 'Add product' : `Edit ${product.name}`} /></div>

      <form onSubmit={submit} noValidate className="mt-6 grid gap-8 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6 border border-line bg-white p-5 sm:p-6">
          {formError && <p role="alert" className="border border-forge/30 bg-forge-tint px-3 py-2 text-[15px] text-forge">{formError}</p>}
          <Input label="Name" required {...form.bind('name')} onChange={onName} />
          <Input label="URL slug" required hint="Used in links. Lowercase letters, numbers and hyphens." {...form.bind('slug')}
            onChange={(e) => { setSlugTouched(true); form.setField('slug', e.target.value.toLowerCase()); }} />
          <Textarea label="Description" rows={5} {...form.bind('description')} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Type" required placeholder="Choose" options={CATEGORIES} {...form.bind('category')} />
            <Select label="For" required placeholder="Choose" options={GENDERS} {...form.bind('gender')} />
            <Select label="Fragrance family" required placeholder="Choose" options={FRAGRANCE_FAMILIES} {...form.bind('family')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="MRP (₹)" required type="number" min="0" step="0.01" inputMode="decimal" {...form.bind('mrp')} />
            <Input label="Selling price (₹)" required type="number" min="0" step="0.01" inputMode="decimal"
              hint={liveDiscount > 0 ? `${liveDiscount}% off MRP` : undefined} {...form.bind('price')} />
            <Input label="Stock" required type="number" min="0" step="1" inputMode="numeric" {...form.bind('stock')} />
          </div>
          <Checkbox id="active" label="Show in store" hint="Switch off to hide the product without deleting it."
            checked={Boolean(form.values.active)} onChange={(e) => form.setField('active', e.target.checked)} />
        </div>

        <div className="space-y-4">
          <div className="border border-line bg-white p-5">
            <h2 className="font-sans text-[15px] font-semibold">Image</h2>
            <div className="mt-3">
              {preview ? <img src={preview} alt="New product image preview" className="aspect-[4/5] w-full object-cover" />
                : <ProductImage src={form.values.image} alt={form.values.name || 'Product image'} />}
            </div>
            <label htmlFor="image" className="btn-outline btn-sm mt-3 w-full cursor-pointer">{form.values.image || file ? 'Replace image' : 'Upload image'}</label>
            <input id="image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} />
            <p className="field-hint">JPG, PNG or WebP, up to {MAX_IMAGE_MB} MB. Uploaded when you save.</p>
            {file && <p className="mt-1 truncate text-sm">{file.name}</p>}
          </div>
          {!isNew && product && (
            <p className="text-sm text-steel">Current price {formatPaise(product.price)}, stock {product.stock}.</p>
          )}
          <div className="flex gap-3">
            <Button type="submit" loading={saving} className="flex-1">{isNew ? 'Create product' : 'Save changes'}</Button>
            <Link to="/admin/products" className="btn-ghost">Cancel</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
