import { useEffect, useState, type ReactNode } from "react";
import { isRouteErrorResponse, Navigate, NavLink, Outlet, useLocation, useNavigate, useRouteError } from "react-router";
import { ArrowUpRight, LayoutDashboard, LogOut, Package, Receipt, ShieldAlert, TicketPercent, Users } from "lucide-react";
import Link from "@/components/ui/Link";
import { Providers } from "@/components/layout/Providers";
import { Toaster } from "@/components/layout/Toaster";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useSlow } from "@/hooks/useSlow";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { isAdmin, useAuth } from "@/store/auth";
import { toast } from "@/store/toast";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Orders", icon: Receipt },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/coupons", label: "Coupons", icon: TicketPercent },
  { to: "/admin/customers", label: "Customers", icon: Users },
];

/**
 * Admin area. The route is only a convenience: every admin request carries the signed-in token and
 * the backend enforces ROLE_ADMIN on /api/admin/**. Here we (1) send signed-out visitors to sign in,
 * (2) re-check the role with the server rather than trusting the stored profile, and (3) show a clear
 * "no access" page to signed-in customers.
 */
export default function AdminLayout() {
  return (
    <Providers>
      <AdminGate />
      <Toaster align="right" />
    </Providers>
  );
}

type Check = { state: "checking" } | { state: "ok" } | { state: "denied" } | { state: "error"; message: string };

function AdminGate() {
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const location = useLocation();
  const [check, setCheck] = useState<Check>({ state: "checking" });
  const [attempt, setAttempt] = useState(0);
  const admin = isAdmin(user);

  useEffect(() => {
    if (!token) return;
    if (!admin) {
      setCheck({ state: "denied" });
      return;
    }
    let live = true;
    setCheck({ state: "checking" });
    authApi
      .currentUser()
      .then((u) => {
        if (!live) return;
        useAuth.getState().setUser(u);
        setCheck({ state: u.roles?.includes("ROLE_ADMIN") ? "ok" : "denied" });
      })
      .catch((e) => {
        // A 401 ends the session in the API client, which sends us to sign-in below.
        if (live && !(e instanceof ApiError && e.status === 401)) setCheck({ state: "error", message: errorMessage(e) });
      });
    return () => {
      live = false;
    };
  }, [token, admin, attempt]);

  if (!user || !token) return <Navigate to={`/account?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (check.state === "denied") return <AccessDenied email={user.email} />;
  if (check.state === "checking") return <Checking />;
  if (check.state === "error")
    return (
      <Centered>
        <p className="eyebrow text-gold-deep">Admin</p>
        <h1 className="mt-3 font-display text-[2rem] uppercase leading-tight">Can&rsquo;t reach the server</h1>
        <p className="mt-4 text-[0.9rem] text-ink-muted">{check.message}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
          <ButtonLink href="/" variant="outline">
            Back to the store
          </ButtonLink>
        </div>
      </Centered>
    );
  return (
    <AdminShell email={user.email}>
      <Outlet />
    </AdminShell>
  );
}

function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const navigate = useNavigate();
  const signOut = async () => {
    await authApi.signOut().catch(() => undefined);
    useAuth.getState().clearSession("manual");
    toast({ title: "You're signed out" });
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-ivory text-ink lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-espresso focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>
      <div className="bg-[#111]">
        <aside className="flex flex-col bg-[#111] text-ivory lg:sticky lg:top-0 lg:h-screen">
          <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-4 sm:px-6 lg:block lg:px-7 lg:pb-8 lg:pt-8">
            <Link href="/admin" className="group inline-flex items-center gap-3" aria-label="ForgeX admin dashboard">
              <svg aria-hidden viewBox="0 0 32 32" className="h-7 w-7 shrink-0 text-gold-soft">
                <circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" strokeWidth="0.9" />
                <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
                <circle cx="26.2" cy="9" r="1.9" className="fill-gold" />
              </svg>
              <span className="flex flex-col leading-none">
                <span className="font-display text-[1.3rem] tracking-[0.28em]">FORGEX</span>
                <span className="mt-1 text-[0.52rem] font-medium uppercase tracking-[0.42em] text-gold">Admin</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-2 text-[0.6rem] font-medium uppercase tracking-[0.2em] text-ivory/60 hover:text-ivory lg:hidden"
            >
              <LogOut aria-hidden className="h-3.5 w-3.5" strokeWidth={1.4} /> Sign out
            </button>
          </div>
          <nav aria-label="Admin" className="border-t border-white/10 lg:flex-1 lg:border-t-0">
            <ul className="flex gap-1 overflow-x-auto px-3 py-2 sm:px-5 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-4 lg:py-0">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <li key={to} className="shrink-0">
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        "flex h-10 items-center gap-3 px-3 text-[0.66rem] font-medium uppercase tracking-[0.2em] transition-colors lg:h-11",
                        isActive ? "bg-white/[0.07] text-gold-soft lg:border-l-2 lg:border-gold lg:pl-[10px]" : "text-ivory/65 hover:bg-white/[0.04] hover:text-ivory",
                      )
                    }
                  >
                    <Icon aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.3} />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="hidden border-t border-white/10 px-7 py-6 text-[0.78rem] lg:block">
            <p className="label text-[0.56rem] text-ivory/40">Signed in</p>
            <p className="mt-1 truncate text-ivory/80" title={email}>
              {email}
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Link href="/" className="inline-flex items-center gap-2 text-[0.6rem] font-medium uppercase tracking-[0.2em] text-ivory/60 hover:text-gold-soft">
                <ArrowUpRight aria-hidden className="h-3.5 w-3.5" strokeWidth={1.4} /> View store
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-2 text-left text-[0.6rem] font-medium uppercase tracking-[0.2em] text-ivory/60 hover:text-gold-soft"
              >
                <LogOut aria-hidden className="h-3.5 w-3.5" strokeWidth={1.4} /> Sign out
              </button>
            </div>
          </div>
        </aside>
      </div>
      <main id="admin-main" className="min-w-0">
        {children}
      </main>
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4 py-16">
      <div className="w-full max-w-lg border border-hair bg-sand/60 p-8 text-center md:p-10">{children}</div>
    </div>
  );
}

function Checking() {
  const slow = useSlow(true, 4000);
  return (
    <Centered>
      <p className="eyebrow text-gold-deep" role="status">
        Checking your access
      </p>
      <div className="mx-auto mt-6 h-px w-40 overflow-hidden bg-espresso/10">
        <div className="skeleton h-full w-full" />
      </div>
      {slow && <p className="mt-6 text-[0.82rem] text-ink-faint">Waking the server. The first request after a quiet spell can take up to a minute.</p>}
    </Centered>
  );
}

function AccessDenied({ email }: { email: string }) {
  const navigate = useNavigate();
  const switchAccount = async () => {
    await authApi.signOut().catch(() => undefined);
    useAuth.getState().clearSession("manual");
    navigate("/account?next=/admin", { replace: true });
  };
  return (
    <Centered>
      <ShieldAlert aria-hidden className="mx-auto h-8 w-8 text-gold-deep" strokeWidth={1.2} />
      <h1 className="mt-4 font-display text-[2rem] uppercase leading-tight">Admins only</h1>
      <p className="mt-4 text-[0.9rem] text-ink-muted">
        You&rsquo;re signed in as <span className="text-ink">{email}</span>, which isn&rsquo;t an administrator account. Sign in with an admin account to manage the store.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonLink href="/" arrow>
          Back to the store
        </ButtonLink>
        <Button type="button" variant="outline" onClick={switchAccount}>
          Switch account
        </Button>
      </div>
    </Centered>
  );
}

/** Errors thrown while rendering an admin page. */
export function AdminError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? (error.status === 404 ? "That page doesn't exist." : error.statusText) : errorMessage(error);
  return (
    <Centered>
      <p className="eyebrow text-gold-deep">Admin</p>
      <h1 className="mt-3 font-display text-[2rem] uppercase leading-tight">Something went wrong</h1>
      <p className="mt-4 text-[0.9rem] text-ink-muted">{message}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button type="button" onClick={() => window.location.reload()}>
          Reload
        </Button>
        <ButtonLink href="/admin" variant="outline">
          Dashboard
        </ButtonLink>
      </div>
    </Centered>
  );
}
