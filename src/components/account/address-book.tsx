"use client";

import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { useAddresses, useDeleteAddress } from "@/hooks/use-account";
import { errorMessage } from "@/lib/api/client";
import type { Address } from "@/lib/types";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/misc";
import { EmptyState, ErrorState } from "../states/states";
import { AddressForm, AddressLines } from "./address-form";

export function AddressBook() {
  const { data, isPending, isError, error, refetch } = useAddresses();
  const del = useDeleteAddress();
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);

  if (isPending) return <Skeleton className="h-48 w-full" />;
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  if (editing) {
    return (
      <div className="max-w-2xl">
        <h2 className="display mb-8 text-3xl">{editing === "new" ? "New address" : "Edit address"}</h2>
        <AddressForm
          initial={editing === "new" ? undefined : editing}
          onSaved={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  if (!data.length)
    return (
      <EmptyState
        icon={<MapPin className="h-8 w-8" strokeWidth={1} />}
        title="No saved addresses"
        body="Save an address to check out faster."
        action={
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Add address
          </Button>
        }
      />
    );

  return (
    <div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((a) => (
          <li key={a.addressId} className="flex flex-col justify-between border border-line p-6 text-[15px]">
            <AddressLines a={a} />
            <div className="mt-4 flex flex-wrap items-center gap-x-5 text-sm">
              <button type="button" onClick={() => setEditing(a)} className="inline-flex min-h-11 items-center underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
                Edit
              </button>
              {confirming === a.addressId ? (
                <span className="flex items-center gap-3">
                  <span className="text-stone">Remove?</span>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center text-ember underline underline-offset-4"
                    disabled={del.isPending}
                    onClick={() => del.mutate(a.addressId!, { onSettled: () => setConfirming(null) })}
                  >
                    {del.isPending ? "Removing…" : "Yes, remove"}
                  </button>
                  <button type="button" className="inline-flex min-h-11 items-center text-stone" onClick={() => setConfirming(null)}>
                    Keep
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirming(a.addressId!)} className="inline-flex min-h-11 items-center text-stone underline decoration-stone/40 underline-offset-4 hover:text-ink">
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 border border-dashed border-line text-stone transition-colors hover:border-ink hover:text-ink"
          >
            <Plus className="h-5 w-5" strokeWidth={1.25} />
            <span className="eyebrow">Add address</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
