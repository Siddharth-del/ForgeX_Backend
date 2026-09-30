"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpValues } from "@/lib/validation";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useSignIn, useSignUp } from "@/hooks/use-auth";
import { Button } from "../ui/button";
import { FormError, Input } from "../ui/field";
import { PasswordToggle } from "./login-form";
import { safeNext } from "./guards";

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const signUp = useSignUp();
  const signIn = useSignIn();
  const [show, setShow] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await signUp.mutateAsync({ username: v.username, email: v.email, password: v.password });
    } catch (e) {
      // Map backend messages onto the right field where we can
      const msg = errorMessage(e);
      if (/email/i.test(msg)) setError("email", { message: msg });
      else if (/username/i.test(msg)) setError("username", { message: msg });
      else if (e instanceof ApiError) for (const [f, m] of Object.entries(e.fieldErrors)) setError(f as keyof SignUpValues, { message: m });
      return;
    }
    // Account created — sign straight in so the shopper doesn't retype anything
    signIn.mutate(
      { email: v.email, password: v.password },
      {
        onSuccess: () => router.replace(safeNext(params.get("next"), "/account")),
        onError: () => router.replace("/login?registered=1"),
      },
    );
  });

  const generalError =
    signUp.isError && !errors.email && !errors.username && !(signUp.error instanceof ApiError && Object.keys(signUp.error.fieldErrors).length)
      ? errorMessage(signUp.error)
      : null;

  return (
    <div>
      <p className="eyebrow text-stone">Join ForgeX</p>
      <h1 className="display mt-3 text-5xl sm:text-6xl">Create an account</h1>
      <p className="mt-4 text-[15px] text-stone">Save addresses, track orders and download invoices.</p>

      <form onSubmit={onSubmit} noValidate className="mt-10 space-y-6">
        <FormError message={generalError} />
        <Input label="Username" autoComplete="username" error={errors.username?.message} hint="3–20 characters" {...register("username")} />
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <Input
          label="Password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          error={errors.password?.message}
          hint="6–40 characters"
          trailing={<PasswordToggle shown={show} onToggle={() => setShow((s) => !s)} />}
          {...register("password")}
        />
        <Input
          label="Confirm password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register("confirm")}
        />
        <Button type="submit" size="lg" className="w-full" loading={signUp.isPending || signIn.isPending}>
          Create account
        </Button>
      </form>

      <p className="mt-10 text-[15px] text-stone">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
          Sign in
        </Link>
      </p>
    </div>
  );
}
