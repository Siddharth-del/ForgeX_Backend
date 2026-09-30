"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus } from "lucide-react";
import { productSchema, type ProductFormValues } from "@/lib/validation";
import { CATEGORIES, FAMILIES, GENDERS } from "@/lib/constants";
import type { Product } from "@/lib/types";
import { errorMessage } from "@/lib/api/client";
import { slugify } from "@/lib/utils";
import { useSaveProduct } from "@/hooks/use-admin";
import { Button } from "../ui/button";
import { FormError, Input, Select, Textarea } from "../ui/field";
import { ProductImage } from "../product/product-image";

const MAX_IMAGE_MB = 5;

export function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  const save = useSaveProduct();
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(!!product);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          slug: product.slug,
          description: product.description ?? "",
          category: product.category ?? "PERFUME",
          gender: product.gender ?? "UNISEX",
          fragranceFamily: product.fragranceFamily ?? "WOODY",
          mrpRupees: (product.mrp ?? product.price) / 100,
          priceRupees: product.price / 100,
          stock: product.stock ?? 0,
          active: product.active !== false,
        }
      : { category: "PERFUME", gender: "UNISEX", fragranceFamily: "WOODY", active: true, description: "", stock: 0 },
  });

  const [name, category, family] = useWatch({ control, name: ["name", "category", "fragranceFamily"] });
  useEffect(() => {
    if (!slugTouched && name) setValue("slug", slugify(name));
  }, [name, slugTouched, setValue]);

  // Free the blob URL when it's replaced or the form closes
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const onSubmit = handleSubmit((raw) => {
    const v = productSchema.parse(raw);
    save.mutate(
      {
        id: product?.productId,
        image,
        input: {
          name: v.name,
          slug: v.slug,
          description: v.description,
          category: v.category,
          gender: v.gender,
          fragranceFamily: v.fragranceFamily,
          mrp: Math.round(v.mrpRupees * 100),
          price: Math.round(v.priceRupees * 100),
          stock: v.stock,
          active: v.active,
        },
      },
      { onSuccess: onDone },
    );
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormError message={save.isError ? errorMessage(save.error) : null} />
      </div>

      {/* Image */}
      <div className="flex items-center gap-5 sm:col-span-2">
        <div className="relative w-24 shrink-0">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img src={preview} alt="New product image preview" className="aspect-[4/5] w-full object-cover" />
          ) : (
            <ProductImage
              product={{ image: product?.image ?? null, name: name || "New product", category, fragranceFamily: family }}
              sizes="96px"
              className="aspect-[4/5]"
            />
          )}
        </div>
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
            <ImagePlus className="h-4 w-4" strokeWidth={1.25} />
            {product?.image || preview ? "Replace image" : "Upload image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > MAX_IMAGE_MB * 1024 * 1024) {
                  setImageError(`Images must be under ${MAX_IMAGE_MB} MB.`);
                  return;
                }
                setImageError(null);
                setImage(f);
                setPreview(f ? URL.createObjectURL(f) : null);
              }}
            />
          </label>
          <p className="mt-1 text-[12px] text-stone">JPG, PNG or WebP, portrait 4:5 works best. Uploaded to Cloudinary.</p>
          {imageError && <p className="mt-1 text-[12px] text-ember">{imageError}</p>}
        </div>
      </div>

      <Input label="Name" error={errors.name?.message} wrapperClassName="sm:col-span-2" {...register("name")} />
      <Input
        label="Slug"
        hint="Used in the product URL"
        error={errors.slug?.message}
        wrapperClassName="sm:col-span-2"
        {...register("slug", { onChange: () => setSlugTouched(true) })}
      />
      <Textarea label="Description" error={errors.description?.message} wrapperClassName="sm:col-span-2" rows={4} {...register("description")} />
      <Select label="Type" error={errors.category?.message} {...register("category")}>
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </Select>
      <Select label="For" error={errors.gender?.message} {...register("gender")}>
        {GENDERS.map((g) => (
          <option key={g.value} value={g.value}>
            {g.value.charAt(0) + g.value.slice(1).toLowerCase()}
          </option>
        ))}
      </Select>
      <Select label="Family" error={errors.fragranceFamily?.message} {...register("fragranceFamily")}>
        {FAMILIES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </Select>
      <Input label="Stock" type="number" inputMode="numeric" min={0} error={errors.stock?.message} {...register("stock")} />
      <Input label="MRP (₹)" type="number" inputMode="decimal" step="0.01" min={0} error={errors.mrpRupees?.message} {...register("mrpRupees")} />
      <Input label="Selling price (₹)" type="number" inputMode="decimal" step="0.01" min={0} error={errors.priceRupees?.message} {...register("priceRupees")} />

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] sm:col-span-2">
        <input type="checkbox" className="h-4 w-4 accent-ink" {...register("active")} />
        Visible in the store
      </label>

      <div className="flex gap-3 pt-2 sm:col-span-2">
        <Button type="submit" loading={save.isPending}>
          {product ? "Save changes" : "Create product"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
