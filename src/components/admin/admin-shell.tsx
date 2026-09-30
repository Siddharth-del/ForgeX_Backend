"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, LogOut, Package, Store, Ticket, Truck } from "lucide-react";
import { useSession, useSignOut } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Logo } from "../layout/logo";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/orders", label: "Orders", icon: Truck },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  const signOut = useSignOut();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line-dark bg-ink text-bone lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-b-0">
        <div className="flex h-16 items-center justify-between px-5 lg:h-20 lg:px-6">
          <Logo className="text-bone" />
          <span className="eyebrow text-smoke lg:hidden">Admin</span>
        </div>
        <nav aria-label="Admin" className="overflow-x-auto px-3 pb-3 lg:flex-1 lg:px-3 lg:pb-0">
          <ul className="flex gap-1 lg:flex-col">
            {NAV.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 whitespace-nowrap rounded-xs px-3 py-2.5 text-sm transition-colors",
                    isActive(href) ? "bg-bone/10 text-bone" : "text-smoke hover:bg-bone/5 hover:text-bone",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.25} />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden border-t border-line-dark p-4 lg:block">
          <p className="truncate text-[13px] text-smoke">{user?.email}</p>
          <div className="mt-3 flex items-center gap-4 text-[13px]">
            <Link href="/" className="inline-flex items-center gap-1.5 text-smoke hover:text-bone">
              <Store className="h-3.5 w-3.5" /> Store
            </Link>
            <button
              type="button"
              onClick={() => signOut.mutate()}
              className="inline-flex items-center gap-1.5 text-smoke hover:text-bone"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        {children}
      </main>
    </div>
  );
}

export function AdminHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div>
        <h1 className="display text-5xl">{title}</h1>
        {description && <p className="mt-2 text-[15px] text-stone">{description}</p>}
      </div>
      {action}
    </header>
  );
}
