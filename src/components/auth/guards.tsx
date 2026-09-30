"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOutState, useSession } from "@/hooks/use-auth";
import { Spinner } from "../ui/spinner";

function FullPageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-stone">
      <Spinner className="h-6 w-6" label="Checking your session" />
    </div>
  );
}

/** Only render children for signed-in users (and admins, if `admin`). Others are redirected. */
export function RequireAuth({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { user, isLoading, isAdmin } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace(signOutState.active ? "/" : `/login?next=${encodeURIComponent(pathname)}`);
    else if (admin && !isAdmin) router.replace("/");
  }, [isLoading, user, admin, isAdmin, router, pathname]);

  if (isLoading || !user || (admin && !isAdmin)) return <FullPageSpinner />;
  return <>{children}</>;
}

/** Only allow a relative in-app path as the post-login destination (prevents open redirects). */
export function safeNext(next: string | null, fallback = "/account") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** Signed-in users visiting /login or /register go straight to where they were heading. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, isLoading, isAdmin } = useSession();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (!isLoading && user) router.replace(safeNext(params.get("next"), isAdmin ? "/admin" : "/account"));
  }, [isLoading, user, isAdmin, router, params]);

  if (isLoading || user) return <FullPageSpinner />;
  return <>{children}</>;
}
