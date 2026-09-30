"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { signInSchema, type SignInValues } from "@/lib/validation";
import { errorMessage } from "@/lib/api/client";
import { useSignIn } from "@/hooks/use-auth";
import { Button } from "../ui/button";
import { FormError, Input } from "../ui/field";
import { safeNext } from "./guards";

export function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-9 w-9 items-center justify-center text-stone hover:text-ink"
      aria-label={shown ? "Hide password" : "Show password"}
    >
      {shown ? <EyeOff className="h-4 w-4" strokeWidth={1.25} /> : <Eye className="h-4 w-4" strokeWidth={1.25} />}
    </button>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const signIn = useSignIn();
  const [show, setShow] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit((v) =>
    signIn.mutate(v, {
      onSuccess: (user) => {
        const admin = user.roles?.includes("ROLE_ADMIN");
        router.replace(safeNext(params.get("next"), admin ? "/admin" : "/account"));
      },
    }),
  );

  return (
    <div>
      <p className="eyebrow text-stone">Welcome back</p>
      <h1 className="display mt-3 text-5xl sm:text-6xl">Sign in</h1>
      {params.get("registered") && (
        <p className="mt-6 border-l-2 border-ok bg-ok/5 px-4 py-3 text-sm text-ok">
          Your account is ready. Sign in to continue.
        </p>
      )}
      {params.get("reset") && (
        <p className="mt-6 border-l-2 border-ok bg-ok/5 px-4 py-3 text-sm text-ok">
          Password updated. Sign in with your new password.
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-10 space-y-6">
        <FormError message={signIn.isError ? errorMessage(signIn.error) : null} />
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <Input
          label="Password"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          error={errors.password?.message}
          trailing={<PasswordToggle shown={show} onToggle={() => setShow((s) => !s)} />}
          {...register("password")}
        />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-[13px] text-stone underline decoration-stone/40 underline-offset-4 hover:text-ink">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={signIn.isPending}>
          Sign in
        </Button>
      </form>

      <p className="mt-10 text-[15px] text-stone">
        New to ForgeX?{" "}
        <Link
          href={`/register${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`}
          className="text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
