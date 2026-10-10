import Link from "@/components/ui/Link";
import { motion } from "framer-motion";
import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AddressBook } from "@/components/account/Addresses";
import { OrderList } from "@/components/orders/OrderList";
import { FormStatus, PasswordField, TextField } from "@/components/ui/Field";
import { errorMessage as message } from "@/lib/errors";
import { authApi, type AuthUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { safeNext } from "@/lib/router";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { site } from "@/lib/site";
import { isAdmin, useAuth } from "@/store/auth";
import { toast } from "@/store/toast";

type Mode = "signin" | "signup" | "forgot";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Customer account: email + password sign-in against the ForgeX API, account creation, password reset by emailed code. */
export function AccountView() {
  const user = useAuth((s) => s.user);
  return user ? <SignedIn user={user} /> : <SignedOut />;
}

/* ------------------------------------------------------------------ signed out */

const copy: Record<Mode, { title: string; body: string }> = {
  signin: { title: "Welcome back", body: "Sign in to track orders, reorder favourites and keep your wishlist on every device." },
  signup: { title: "Create account", body: `Join ${site.name} to check out faster, follow your orders and hear about new launches first.` },
  forgot: { title: "Reset password", body: "We'll email you a six-digit code. Enter it here, then choose a new password." },
};

function SignedOut() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get("next"), "");
  const endedBecause = useAuth((s) => s.endedBecause);
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(endedBecause === "expired" ? "Your session ended. Please sign in again." : null);

  const switchTo = (m: Mode, note: string | null = null) => {
    setMode(m);
    setNotice(note);
  };

  const onSignedIn = (u: AuthUser, isNew = false) => {
    toast({ title: isNew ? `Welcome to ${site.name}, ${u.username}` : `Welcome back, ${u.username}` });
    if (next) navigate(next, { replace: true });
  };

  return (
    <div className="bg-ivory">
      <div className="container-site grid grid-cols-1 gap-14 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="eyebrow text-gold-deep">Your account</p>
          <h1 className="mt-4 text-display-md uppercase">{copy[mode].title}</h1>
          <p className="mt-5 max-w-sm text-[0.95rem] text-ink-muted">{copy[mode].body}</p>
          <ul className="mt-8 space-y-3 text-[0.88rem]">
            <li>
              <Link href="/wishlist" className="link-underline">
                View your wishlist
              </Link>
            </li>
            <li>
              <Link href="/help/track-order" className="link-underline">
                Track an order
              </Link>
            </li>
          </ul>
        </div>

        <div className="border border-hair bg-sand/60 p-7 md:p-10">
          {mode !== "forgot" && <ModeTabs mode={mode} onChange={(m) => switchTo(m)} />}
          {notice && (
            <p role="status" className="mb-6 border-l-2 border-gold pl-4 text-[0.85rem] text-ink-muted">
              {notice}
            </p>
          )}
          {mode === "signin" && <SignInForm email={email} setEmail={setEmail} onForgot={() => switchTo("forgot")} onSignedIn={(u) => onSignedIn(u)} />}
          {mode === "signup" && <SignUpForm email={email} setEmail={setEmail} onSignedIn={(u) => onSignedIn(u, true)} />}
          {mode === "forgot" && (
            <ForgotPassword
              email={email}
              setEmail={setEmail}
              onCancel={() => switchTo("signin")}
              onDone={() => switchTo("signin", "Password updated. Sign in with your new password.")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const tabs: { id: Mode; label: string }[] = [
    { id: "signin", label: "Sign in" },
    { id: "signup", label: "Create account" },
  ];
  return (
    <div role="tablist" aria-label="Account" className="mb-8 flex gap-8 border-b border-hair">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={mode === t.id}
          onClick={() => onChange(t.id)}
          className={cn("relative shrink-0 pb-4 text-[0.72rem] font-medium uppercase tracking-[0.26em] transition-colors duration-300", mode === t.id ? "text-ink" : "text-ink-faint hover:text-ink-muted")}
        >
          {t.label}
          {mode === t.id && <motion.span layoutId="account-tab" className="absolute inset-x-0 -bottom-px h-px bg-espresso" transition={{ duration: 0.6, ease: EASE }} />}
        </button>
      ))}
    </div>
  );
}

function SignInForm({ email, setEmail, onForgot, onSignedIn }: { email: string; setEmail: (v: string) => void; onForgot: () => void; onSignedIn: (u: AuthUser) => void }) {
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [pending, setPending] = useState(false);
  const setSession = useAuth((s) => s.setSession);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = {
      email: EMAIL.test(email.trim()) ? undefined : "Enter a valid email, like name@example.com.",
      password: password ? undefined : "Enter your password.",
    };
    setErrors(next);
    if (next.email || next.password) return;
    setPending(true);
    try {
      const res = await authApi.signIn(email, password);
      if (!res.jwtToken) throw new ApiError("Sign-in didn't return a session. Please try again.", 500);
      setSession(res);
      onSignedIn(res);
    } catch (err) {
      setErrors({ form: err instanceof ApiError && err.status === 401 ? "That email and password don't match an account." : message(err) });
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Sign in" className="space-y-5">
      <TextField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email} />
      <PasswordField label="Password" autoComplete="current-password" value={password} onChange={setPassword} error={errors.password} />
      <div className="-mt-1 flex justify-end">
        <button type="button" onClick={onForgot} className="text-[0.8rem] text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          Forgot password?
        </button>
      </div>
      <FormStatus error={errors.form} pending={pending} />
      <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? "Signing in" : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm({ email, setEmail, onSignedIn }: { email: string; setEmail: (v: string) => void; onSignedIn: (u: AuthUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string; form?: string }>({});
  const [pending, setPending] = useState(false);
  const setSession = useAuth((s) => s.setSession);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const u = username.trim();
    const next = {
      username: u.length < 3 || u.length > 20 ? "Choose a username of 3 to 20 characters." : undefined,
      email: EMAIL.test(email.trim()) ? undefined : "Enter a valid email, like name@example.com.",
      password: password.length < 6 || password.length > 40 ? "Use 6 to 40 characters." : undefined,
    };
    setErrors(next);
    if (next.username || next.email || next.password) return;
    setPending(true);
    try {
      await authApi.signUp(u, email, password);
      // The API doesn't start a session on sign-up, so sign straight in with the same details.
      const res = await authApi.signIn(email, password);
      if (!res.jwtToken) throw new ApiError("Your account was created. Please sign in.", 500);
      setSession(res);
      onSignedIn(res);
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : {};
      if (fields.username || fields.email || fields.password) {
        setErrors({ username: fields.username, email: fields.email, password: fields.password });
      } else {
        const msg = message(err);
        setErrors(/email/i.test(msg) ? { email: msg } : /username/i.test(msg) ? { username: msg } : { form: msg });
      }
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Create account" className="space-y-5">
      <TextField label="Username" autoComplete="username" value={username} onChange={setUsername} error={errors.username} hint="3 to 20 characters." maxLength={20} />
      <TextField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email} />
      <PasswordField label="Password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} hint="At least 6 characters." maxLength={40} />
      <FormStatus error={errors.form} pending={pending} />
      <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? "Creating account" : "Create account"}
      </Button>
      <p className="text-[0.75rem] leading-relaxed text-ink-faint">
        By creating an account you agree to our{" "}
        <Link href="/help/terms" className="underline underline-offset-2 hover:text-ink">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/help/privacy" className="underline underline-offset-2 hover:text-ink">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}

function ForgotPassword({ email, setEmail, onCancel, onDone }: { email: string; setEmail: (v: string) => void; onCancel: () => void; onDone: () => void }) {
  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ email?: string; code?: string; password?: string; confirm?: string; form?: string }>({});
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setPending(true);
    setErrors({});
    try {
      await task();
    } catch (err) {
      setErrors({ form: err instanceof ApiError && err.status === 404 && step === "email" ? "We couldn't find an account with that email." : message(err) });
    } finally {
      setPending(false);
    }
  };

  const sendCode = (e?: FormEvent) => {
    e?.preventDefault();
    if (!EMAIL.test(email.trim())) return setErrors({ email: "Enter a valid email, like name@example.com." });
    void run(async () => {
      const res = await authApi.requestPasswordReset(email);
      if (/invalid/i.test(res)) throw new Error("We couldn't send a code to that address. Please check it and try again.");
      setInfo(`We've sent a six-digit code to ${email.trim().toLowerCase()}.`);
      setCode("");
      setStep("code");
    });
  };

  const verify = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return setErrors({ code: "Enter the six-digit code from the email." });
    void run(async () => {
      try {
        await authApi.verifyOtp(email, code);
      } catch (err) {
        if (err instanceof ApiError && err.status === 400) throw new Error("That code isn't right. Check the email, or send a new code.");
        throw err;
      }
      setInfo(null);
      setStep("password");
    });
  };

  const reset = (e: FormEvent) => {
    e.preventDefault();
    const next = {
      password: password.length < 6 || password.length > 40 ? "Use 6 to 40 characters." : undefined,
      confirm: confirm !== password ? "The passwords don't match." : undefined,
    };
    if (next.password || next.confirm) return setErrors(next);
    void run(async () => {
      const res = await authApi.resetPassword(email, password, confirm);
      if (/not match/i.test(res)) throw new Error("The passwords don't match.");
      onDone();
    });
  };

  return (
    <div>
      <p className="label mb-6 text-ink-muted">
        {step === "email" ? "Step 1 of 3 · Your email" : step === "code" ? "Step 2 of 3 · Enter code" : "Step 3 of 3 · New password"}
      </p>
      {info && (
        <p role="status" className="mb-6 border-l-2 border-gold pl-4 text-[0.85rem] text-ink-muted">
          {info}
        </p>
      )}

      {step === "email" && (
        <form onSubmit={sendCode} noValidate aria-label="Send reset code" className="space-y-5">
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email} />
          <FormStatus error={errors.form} pending={pending} />
          <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
            {pending ? "Sending code" : "Send code"}
          </Button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={verify} noValidate aria-label="Verify code" className="space-y-5">
          <TextField
            label="Six-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(v) => setCode(v.replace(/\D/g, ""))}
            error={errors.code}
            inputClassName="tracking-[0.5em]"
          />
          <FormStatus error={errors.form} pending={pending} />
          <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
            {pending ? "Checking" : "Verify code"}
          </Button>
          <button type="button" onClick={() => sendCode()} disabled={pending} className="text-[0.8rem] text-ink-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-50">
            Send a new code
          </button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={reset} noValidate aria-label="Choose a new password" className="space-y-5">
          <PasswordField label="New password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} hint="At least 6 characters." maxLength={40} />
          <PasswordField label="Confirm new password" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} maxLength={40} />
          <FormStatus error={errors.form} pending={pending} />
          <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
            {pending ? "Saving" : "Set new password"}
          </Button>
        </form>
      )}

      <button type="button" onClick={onCancel} className="mt-6 text-[0.8rem] text-ink-muted underline-offset-4 hover:text-ink hover:underline">
        ← Back to sign in
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ signed in */

function SignedIn({ user }: { user: AuthUser }) {
  const clearSession = useAuth((s) => s.clearSession);
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    setPending(true);
    // Tell the server (it clears its cookie), but sign out locally whatever it says.
    await authApi.signOut().catch(() => undefined);
    clearSession("manual");
    toast({ title: "You're signed out", description: "See you soon." });
  };

  const rows: [string, ReactNode][] = [
    ["Username", user.username],
    ["Email", user.email],
    ["Account", isAdmin(user) ? "Administrator" : "Customer"],
  ];

  return (
    <div className="bg-ivory">
      <div className="container-site grid grid-cols-1 gap-14 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="eyebrow text-gold-deep">Your account</p>
          <h1 className="mt-4 break-words text-display-md uppercase">Hello, {user.username}</h1>
          <p className="mt-5 max-w-sm text-[0.95rem] text-ink-muted">You're signed in as {user.email}. Follow your orders, download invoices and manage your delivery addresses here.</p>
          <ul className="mt-8 space-y-3 text-[0.88rem]">
            <li>
              <a href="#orders-h" className="link-underline">
                Your orders
              </a>
            </li>
            <li>
              <a href="#addresses-h" className="link-underline">
                Saved addresses
              </a>
            </li>
            <li>
              <Link href="/wishlist" className="link-underline">
                View your wishlist
              </Link>
            </li>
          </ul>
          {isAdmin(user) && (
            <ButtonLink href="/admin" variant="outline" size="sm" arrow className="mt-8">
              Open admin panel
            </ButtonLink>
          )}
        </div>
        <div className="border border-hair bg-sand/60 p-7 md:p-10">
          <p className="label text-ink-muted">Profile</p>
          <dl className="mt-6 border-t border-hair">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-6 border-b border-hair py-4">
                <dt className="label text-[0.62rem] text-ink-faint">{k}</dt>
                <dd className="min-w-0 truncate text-[0.95rem]">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/collections/all" size="lg" arrow className="flex-1">
              Continue shopping
            </ButtonLink>
            <Button type="button" variant="outline" size="lg" onClick={signOut} disabled={pending}>
              {pending ? "Signing out" : "Sign out"}
            </Button>
          </div>
        </div>
      </div>
      <div className="container-site grid grid-cols-1 gap-16 pb-section lg:grid-cols-2 lg:gap-20">
        <OrderList />
        <AddressBook />
      </div>
    </div>
  );
}
