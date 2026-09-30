"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useAdminProducts, useDeleteProduct } from "@/hooks/use-admin";
import { errorMessage } from "@/lib/api/client";
import type { Product } from "@/lib/types";
import { formatPaise } from "@/lib/utils";
import { Button } from "../ui/button";
import { Badge, Skeleton } from "../ui/misc";
import { Sheet } from "../ui/sheet";
import { ErrorState } from "../states/states";
import { ProductImage } from "../product/product-image";
import { productMeta } from "../product/product-card";
import { AdminHeader } from "./admin-shell";
import { ProductForm } from "./product-form";

export function AdminProducts() {
  const { data, isPending, isError, error, refetch } = useAdminProducts();
  const del = useDeleteProduct();
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (data ?? []).filter((p) => !n || p.name.toLowerCase().includes(n) || p.slug.includes(n));
  }, [data, q]);

  return (
    <div>
      <AdminHeader
        title="Products"
        description={data ? `${data.length} products · ${data.filter((p) => p.active !== false).length} visible` : undefined}
        action={
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> New product
          </Button>
        }
      />

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products"
        aria-label="Search products"
        className="mb-6 h-11 w-full rounded-xs border border-line bg-white px-4 text-base focus:border-ink focus:outline-none sm:h-10 sm:max-w-xs sm:text-sm"
      />

      {isPending ? (
        <Skeleton className="h-80 w-full" />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-stone">{data.length ? "No products match." : "No products yet — create your first one."}</p>
      ) : (
        <>
        {/* Phones & small tablets: one card per product */}
        <ul className="divide-y divide-line border-y border-line md:hidden">
          {rows.map((p) => (
            <li key={p.productId} className="flex gap-4 py-4">
              <ProductImage product={p} sizes="80px" className="aspect-[4/5] w-16 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium">{p.name}</p>
                  {p.active === false ? <Badge tone="muted">Hidden</Badge> : <Badge tone="ok">Live</Badge>}
                </div>
                <p className="truncate text-[12px] text-stone">{productMeta(p)}</p>
                <p className="mt-1 text-[13px]">
                  <span className="font-medium tabular-nums">{formatPaise(p.price)}</span>
                  <s className="ml-2 text-stone tabular-nums">{formatPaise(p.mrp)}</s>
                  <span className={`ml-3 ${(p.stock ?? 0) === 0 ? "text-ember" : (p.stock ?? 0) <= 5 ? "text-warn" : "text-stone"}`}>
                    {p.stock ?? 0} in stock
                  </span>
                </p>
                <div className="mt-1 flex gap-2 text-[13px]">
                  <button type="button" className="inline-flex min-h-11 items-center pr-3 underline underline-offset-4" onClick={() => setEditing(p)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center px-3 text-ember underline underline-offset-4 disabled:opacity-50"
                    disabled={del.isPending}
                    onClick={() => {
                      if (confirm(`Delete “${p.name}” permanently? To just hide it, edit it and untick “Visible in the store”.`)) del.mutate(p.productId);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto border border-line md:block">
          <table className="w-full min-w-[820px] text-left text-[14px]">
            <thead className="bg-bone">
              <tr className="eyebrow text-stone">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 text-right font-medium">MRP</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.productId} className="bg-paper hover:bg-white">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductImage product={p} sizes="48px" className="aspect-[4/5] w-10 shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="truncate text-[12px] text-stone">{productMeta(p)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone">{formatPaise(p.mrp)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPaise(p.price)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${(p.stock ?? 0) === 0 ? "text-ember" : (p.stock ?? 0) <= 5 ? "text-warn" : ""}`}>
                    {p.stock ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {p.active === false ? <Badge tone="muted">Hidden</Badge> : <Badge tone="ok">Live</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1 text-[13px]">
                      <button type="button" className="inline-flex min-h-9 items-center px-2 underline underline-offset-4" onClick={() => setEditing(p)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-9 items-center px-2 text-ember underline underline-offset-4 disabled:opacity-50"
                        disabled={del.isPending}
                        onClick={() => {
                          if (confirm(`Delete “${p.name}” permanently? To just hide it, edit it and untick “Visible in the store”.`))
                            del.mutate(p.productId);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New product" : "Edit product"} className="max-w-[640px]">
        <div className="flex-1 overflow-y-auto px-6 pb-10 pt-7 sm:px-8">
          <h2 className="display mb-8 text-3xl">{editing === "new" ? "New product" : "Edit product"}</h2>
          {editing && (
            <ProductForm key={editing === "new" ? "new" : editing.productId} product={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
          )}
        </div>
      </Sheet>
    </div>
  );
}
