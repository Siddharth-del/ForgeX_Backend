import { useMemo, useState } from "react";
import Link from "@/components/ui/Link";
import { AdminPage, EmptyPanel, ErrorPanel, SearchInput, TableSkeleton } from "@/components/admin/AdminUI";
import { td, th } from "@/components/admin/styles";
import { useLoad } from "@/hooks/useLoad";
import { usePageMeta } from "@/hooks/usePageMeta";
import { adminOrderApi } from "@/lib/api/admin";
import { isLiveOrder } from "@/lib/admin";
import { formatDateTime, formatPaise } from "@/lib/orders";
import { cn } from "@/lib/cn";

interface Customer {
  email: string;
  orders: number;
  live: number;
  spent: number;
  last: string;
}

/**
 * Customers as seen through their orders. The API has no endpoint for listing or managing user
 * accounts, so shoppers who signed up but never ordered don't appear here.
 */
export default function AdminCustomers() {
  usePageMeta("Customers · Admin", undefined, { noindex: true });
  const orders = useLoad(() => adminOrderApi.all());
  const [query, setQuery] = useState("");

  const customers = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const o of orders.data ?? []) {
      const key = o.email.toLowerCase();
      const c = map.get(key) ?? { email: o.email, orders: 0, live: 0, spent: 0, last: o.createdAt };
      c.orders += 1;
      if (isLiveOrder(o)) {
        c.live += 1;
        c.spent += o.total;
      }
      if (new Date(o.createdAt) > new Date(c.last)) c.last = o.createdAt;
      map.set(key, c);
    }
    return [...map.values()].sort((a, b) => b.spent - a.spent || b.orders - a.orders);
  }, [orders.data]);

  const q = query.trim().toLowerCase();
  const list = customers.filter((c) => !q || c.email.toLowerCase().includes(q));

  return (
    <AdminPage eyebrow="People" title="Customers">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="max-w-xl text-[0.84rem] text-ink-muted">Everyone who has placed an order, from order history. Account management (listing sign-ups, editing or disabling users) isn&rsquo;t available in the API.</p>
        <SearchInput value={query} onChange={setQuery} placeholder="Search email" label="Search customers" />
      </div>
      <div className="mt-6">
        {orders.error ? (
          <ErrorPanel error={orders.error} onRetry={orders.reload} what="customers" />
        ) : !orders.data ? (
          <TableSkeleton />
        ) : customers.length === 0 ? (
          <EmptyPanel title="No customers yet" body="Customers appear here after their first order." />
        ) : list.length === 0 ? (
          <EmptyPanel title="Nothing matches" body="Try another email." />
        ) : (
          <div className="relative overflow-x-auto border border-hair bg-white/70">
            <table className="w-full min-w-[40rem]">
              <thead className="border-b border-hair">
                <tr>
                  <th className={th}>Email</th>
                  <th className={cn(th, "text-right")}>Orders</th>
                  <th className={cn(th, "text-right")}>Spent</th>
                  <th className={th}>Last order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hair">
                {list.map((c) => (
                  <tr key={c.email} className="hover:bg-sand/30">
                    <td className={cn(td, "max-w-[20rem] truncate")}>
                      <Link href={`/admin/orders?q=${encodeURIComponent(c.email)}`} className="hover:underline">
                        {c.email}
                      </Link>
                    </td>
                    <td className={cn(td, "text-right tabular")}>
                      {c.live}
                      {c.orders !== c.live && <span className="text-ink-faint"> (+{c.orders - c.live} unpaid/cancelled)</span>}
                    </td>
                    <td className={cn(td, "text-right tabular")}>{formatPaise(c.spent)}</td>
                    <td className={cn(td, "text-ink-muted")}>{formatDateTime(c.last, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPage>
  );
}
