import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import Link from "@/components/ui/Link";
import { AdminPage, EmptyPanel, ErrorPanel, FilterChips, Pill, SearchInput, TableSkeleton } from "@/components/admin/AdminUI";
import { td, th } from "@/components/admin/styles";
import { ProductPhoto } from "@/components/products/ProductPhoto";
import { ButtonLink } from "@/components/ui/Button";
import { useLoad } from "@/hooks/useLoad";
import { usePageMeta } from "@/hooks/usePageMeta";
import { adminProductApi } from "@/lib/api/admin";
import { fetchAllProducts } from "@/lib/api/products";
import type { ProductDTO } from "@/lib/api/types";
import { familyLabel, invalidateCatalog, optimisedImage } from "@/lib/catalog";
import { GENDER_LABEL, LOW_STOCK, stockLevel, toProductInput } from "@/lib/admin";
import { errorMessage } from "@/lib/errors";
import { formatPaise } from "@/lib/orders";
import { cn } from "@/lib/cn";
import { toast } from "@/store/toast";

type StatusFilter = "all" | "live" | "hidden";
type StockFilter = "all" | "low" | "out";

/** Every product (active and hidden) from GET /api/public/products, with quick stock and visibility edits. */
export default function AdminProducts() {
  usePageMeta("Products · Admin", undefined, { noindex: true });
  const [params, setParams] = useSearchParams();
  const products = useLoad(() => fetchAllProducts());
  const [query, setQuery] = useState("");
  const status = (params.get("status") as StatusFilter) || "all";
  const stock = (params.get("stock") as StockFilter) || "all";
  const missingImage = params.get("image") === "missing";
  const [category, setCategory] = useState<"all" | "PERFUME" | "ATTAR">("all");

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v === "all" || !v) next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products.data ?? [])
      .filter((p) => (status === "live" ? p.active !== false : status === "hidden" ? p.active === false : true))
      .filter((p) => (stock === "all" ? true : stockLevel(p) === stock && p.active !== false))
      .filter((p) => (category === "all" ? true : p.category === category))
      .filter((p) => (missingImage ? !p.image : true))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || String(p.productId) === q)
      .sort((a, b) => b.productId - a.productId);
  }, [products.data, query, status, stock, category, missingImage]);

  const replace = (p: ProductDTO) => products.setData((all) => (all ?? []).map((x) => (x.productId === p.productId ? p : x)));
  const all = products.data ?? [];

  return (
    <AdminPage
      eyebrow="Catalogue"
      title="Products"
      actions={
        <ButtonLink href="/admin/products/new" size="sm">
          <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={1.5} /> New product
        </ButtonLink>
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <FilterChips
            label="Visibility"
            value={status}
            onChange={(v) => setParam("status", v)}
            options={[
              { id: "all", label: "All", count: all.length },
              { id: "live", label: "Live", count: all.filter((p) => p.active !== false).length },
              { id: "hidden", label: "Hidden", count: all.filter((p) => p.active === false).length },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3">
            <FilterChips
              label="Stock"
              value={stock}
              onChange={(v) => setParam("stock", v)}
              options={[
                { id: "all", label: "Any stock" },
                { id: "low", label: `Low (≤${LOW_STOCK})` },
                { id: "out", label: "Out of stock" },
              ]}
            />
            <FilterChips
              label="Category"
              value={category}
              onChange={setCategory}
              options={[
                { id: "all", label: "All types" },
                { id: "PERFUME", label: "Perfume" },
                { id: "ATTAR", label: "Attar" },
              ]}
            />
            {missingImage && (
              <button type="button" onClick={() => setParam("image", "")} className="label text-[0.58rem] text-gold-deep underline underline-offset-4">
                Missing image × clear
              </button>
            )}
          </div>
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, slug or ID" label="Search products" />
      </div>

      <div className="mt-6">
        {products.error ? (
          <ErrorPanel error={products.error} onRetry={products.reload} what="products" />
        ) : !products.data ? (
          <TableSkeleton />
        ) : all.length === 0 ? (
          <EmptyPanel
            title="No products yet"
            body="Add your first fragrance. It appears in the store as soon as it's live and in stock."
            action={
              <ButtonLink href="/admin/products/new" size="sm">
                New product
              </ButtonLink>
            }
          />
        ) : list.length === 0 ? (
          <EmptyPanel title="Nothing matches" body="Try another search or clear the filters." />
        ) : (
          <>
            <p className="mb-3 text-[0.75rem] text-ink-faint" role="status">
              {list.length} of {all.length} products
            </p>
            {/* Desktop table */}
            <div className="relative hidden overflow-x-auto border border-hair bg-white/70 md:block">
              <table className="w-full min-w-[56rem]">
                <thead className="border-b border-hair">
                  <tr>
                    <th className={th}>Product</th>
                    <th className={th}>Type</th>
                    <th className={cn(th, "text-right")}>Price</th>
                    <th className={th}>Stock</th>
                    <th className={th}>Visible</th>
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hair">
                  {list.map((p) => (
                    <tr key={p.productId} className="hover:bg-sand/30">
                      <td className={td}>
                        <div className="flex items-center gap-4">
                          <Thumb p={p} />
                          <div className="min-w-0">
                            <Link href={`/admin/products/${p.productId}`} className="block truncate font-display text-[1.1rem] uppercase leading-tight hover:underline">
                              {p.name}
                            </Link>
                            <p className="truncate text-[0.72rem] text-ink-faint">
                              #{p.productId} · /{p.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={cn(td, "text-ink-muted")}>
                        {p.category === "ATTAR" ? "Attar" : p.category === "PERFUME" ? "Perfume" : "—"}
                        <span className="block text-[0.72rem] text-ink-faint">
                          {[p.gender && GENDER_LABEL[p.gender], p.fragranceFamily && familyLabel(p.fragranceFamily)].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </td>
                      <td className={cn(td, "text-right tabular")}>
                        {formatPaise(p.price)}
                        {p.mrp && p.price && p.mrp > p.price ? <s className="block text-[0.72rem] text-ink-faint">{formatPaise(p.mrp)}</s> : null}
                      </td>
                      <td className={td}>
                        <StockEditor product={p} onSaved={replace} />
                      </td>
                      <td className={td}>
                        <VisibilityToggle product={p} onSaved={replace} />
                      </td>
                      <td className={cn(td, "text-right")}>
                        <Link href={`/admin/products/${p.productId}`} className="label text-[0.58rem] underline-offset-4 hover:underline">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="space-y-3 md:hidden">
              {list.map((p) => (
                <li key={p.productId} className="border border-hair bg-white/70 p-4">
                  <div className="flex gap-4">
                    <Thumb p={p} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/products/${p.productId}`} className="block truncate font-display text-[1.15rem] uppercase leading-tight">
                        {p.name}
                      </Link>
                      <p className="text-[0.72rem] text-ink-faint">
                        #{p.productId} · {p.category === "ATTAR" ? "Attar" : "Perfume"} · {formatPaise(p.price)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <StockEditor product={p} onSaved={replace} />
                    <VisibilityToggle product={p} onSaved={replace} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </AdminPage>
  );
}

function Thumb({ p }: { p: ProductDTO }) {
  return (
    <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-sand">
      <ProductPhoto src={p.image ? optimisedImage(p.image, 120) : null} alt={p.name} sizes="44px" dark={p.category === "ATTAR"} compact />
    </div>
  );
}

/** Stock is saved with a full product update (the API has no stock-only endpoint). */
function StockEditor({ product, onSaved }: { product: ProductDTO; onSaved: (p: ProductDTO) => void }) {
  const [value, setValue] = useState(String(product.stock ?? 0));
  const [busy, setBusy] = useState(false);
  const dirty = value !== String(product.stock ?? 0);
  const valid = /^\d{1,6}$/.test(value);
  const level = stockLevel(product);

  const save = async () => {
    if (!dirty || !valid || busy) return;
    setBusy(true);
    try {
      const saved = await adminProductApi.update(product.productId, { ...toProductInput(product), stock: Number(value) });
      onSaved(saved);
      setValue(String(saved.stock ?? 0));
      invalidateCatalog();
      toast({ title: `Stock updated: ${saved.name}`, description: `${saved.stock} in stock` });
    } catch (e) {
      toast({ title: `Couldn't update ${product.name}`, description: errorMessage(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`stock-${product.productId}`}>
        Stock for {product.name}
      </label>
      <input
        id={`stock-${product.productId}`}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") setValue(String(product.stock ?? 0));
        }}
        disabled={busy}
        aria-invalid={!valid}
        className={cn("h-9 w-20 border bg-white px-3 text-[0.86rem] tabular outline-none focus:border-espresso", valid ? "border-espresso/20" : "border-[#9b3b2a]")}
      />
      {dirty ? (
        <button type="button" onClick={save} disabled={!valid || busy} className="label h-9 border border-espresso bg-espresso px-3 text-[0.56rem] text-ivory disabled:opacity-50">
          {busy ? "Saving" : "Save"}
        </button>
      ) : level === "out" ? (
        <Pill tone="bad">Out</Pill>
      ) : level === "low" ? (
        <Pill tone="warn">Low</Pill>
      ) : null}
    </div>
  );
}

function VisibilityToggle({ product, onSaved }: { product: ProductDTO; onSaved: (p: ProductDTO) => void }) {
  const [busy, setBusy] = useState(false);
  const live = product.active !== false;
  const toggle = async () => {
    setBusy(true);
    try {
      const saved = await adminProductApi.update(product.productId, { ...toProductInput(product), active: !live });
      onSaved(saved);
      invalidateCatalog();
      toast({ title: saved.active ? `${saved.name} is live` : `${saved.name} is hidden from the store` });
    } catch (e) {
      toast({ title: `Couldn't update ${product.name}`, description: errorMessage(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={live}
      aria-label={`${product.name} visible in store`}
      onClick={toggle}
      disabled={busy}
      className="group inline-flex items-center gap-2.5 disabled:opacity-50"
    >
      <span className={cn("relative h-5 w-9 rounded-full border transition-colors", live ? "border-espresso bg-espresso" : "border-espresso/30 bg-white")}>
        <span className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all", live ? "left-[1.1rem] bg-gold" : "left-0.5 bg-espresso/40")} />
      </span>
      <span className="text-[0.75rem] text-ink-muted">{busy ? "Saving…" : live ? "Live" : "Hidden"}</span>
    </button>
  );
}
