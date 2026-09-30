"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, useSignOut } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/account", label: "Orders", match: (p: string) => p === "/account" || p.startsWith("/account/orders") },
  { href: "/account/addresses", label: "Addresses", match: (p: string) => p.startsWith("/account/addresses") },
];

export function AccountHeader() {
  const { user, isAdmin } = useSession();
  const signOut = useSignOut();
  const pathname = usePathname();

  return (
    <header className="border-b border-line">
      <p className="eyebrow text-stone">Your account</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-5xl sm:text-7xl">Hello, {user?.username}</h1>
        <div className="flex items-center gap-5 pb-2 text-sm">
          {isAdmin && (
            <Link href="/admin" className="underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
              Admin
            </Link>
          )}
          <button
            type="button"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
            className="text-stone underline decoration-stone/40 underline-offset-4 hover:text-ink"
          >
            {signOut.isPending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
      <p className="mt-2 text-[15px] text-stone">{user?.email}</p>
      <nav aria-label="Account" className="mt-6 flex gap-8">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "eyebrow -mb-px inline-flex h-12 items-center border-b transition-colors",
                active ? "border-ink text-ink" : "border-transparent text-stone hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
