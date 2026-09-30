"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/endpoints";
import { ApiError, errorMessage } from "@/lib/api/client";
import { emailOnlySchema, newPasswordSchema, otpSchema } from "@/lib/validation";
import { Button } from "../ui/button";
import { FormError, Input } from "../ui/field";
import { PasswordToggle } from "./login-form";

type Step = "email" | "otp" | "password";
const STEPS: Step[] = ["email", "otp", "password"];

/**
 * Three steps against the ForgotPassword controller:
 * 1. POST /api/auth/forgot/password?email=   → emails a 6-digit code
 * 2. POST /api/auth/verify-otp?email=&otp=    → unlocks a reset for 10 minutes
 * 3. POST /api/auth/reset-password?email=     → sets the new password
 */
export function ForgotPasswordFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [show, setShow] = useState(false);

  const emailForm = useForm<z.infer<typeof emailOnlySchema>>({ resolver: zodResolver(emailOnlySchema) });
  const otpForm = useForm<z.infer<typeof otpSchema>>({ resolver: zodResolver(otpSchema) });
  const pwForm = useForm<z.infer<typeof newPasswordSchema>>({ resolver: zodResolver(newPasswordSchema) });

  const send = useMutation({
    mutationFn: async (e: string) => {
      const msg = await authApi.requestOtp(e);
      // The backend answers 200 "invalid email" when the email couldn't be sent
      if (typeof msg === "string" && /invalid/i.test(msg)) throw new ApiError("We couldn't send a code to that email. Please try again.", 400);
      return msg;
    },
  });
  const verify = useMutation({ mutationFn: (otp: string) => authApi.verifyOtp(email, otp) });
  const reset = useMutation({
    mutationFn: async (v: z.infer<typeof newPasswordSchema>) => {
      const msg = await authApi.resetPassword(email, v.password, v.confirmPassword);
      if (typeof msg === "string" && /do not match/i.test(msg)) throw new ApiError("Passwords don't match.", 400);
      return msg;
    },
  });

  const sendError = send.isError
    ? send.error instanceof ApiError && send.error.status === 404
      ? "We couldn't find an account with that email."
      : errorMessage(send.error)
    : null;
  const verifyError = verify.isError
    ? verify.error instanceof ApiError && verify.error.status === 400
      ? "That code is incorrect or has expired."
      : errorMessage(verify.error)
    : null;

  return (
    <div>
      <p className="eyebrow text-stone">
        Step {STEPS.indexOf(step) + 1} of 3
      </p>
      <h1 className="display mt-3 text-5xl sm:text-6xl">
        {step === "email" ? "Reset password" : step === "otp" ? "Check your email" : "New password"}
      </h1>

      <div className="mt-3 flex gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <span key={s} className={`h-[2px] flex-1 transition-colors duration-500 ${i <= STEPS.indexOf(step) ? "bg-ink" : "bg-line"}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.4 }}
        >
          {step === "email" && (
            <form
              noValidate
              className="mt-10 space-y-6"
              onSubmit={emailForm.handleSubmit(({ email: e }) =>
                send.mutate(e, {
                  onSuccess: () => {
                    setEmail(e.trim().toLowerCase());
                    setStep("otp");
                  },
                }),
              )}
            >
              <p className="text-[15px] text-stone">Enter the email on your account and we&apos;ll send you a 6-digit code.</p>
              <FormError message={sendError} />
              <Input label="Email" type="email" autoComplete="email" error={emailForm.formState.errors.email?.message} {...emailForm.register("email")} />
              <Button type="submit" size="lg" className="w-full" loading={send.isPending}>
                Send code
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form
              noValidate
              className="mt-10 space-y-6"
              onSubmit={otpForm.handleSubmit(({ otp }) => verify.mutate(otp.trim(), { onSuccess: () => setStep("password") }))}
            >
              <p className="text-[15px] text-stone">
                We sent a code to <span className="text-ink">{email}</span>. It&apos;s valid for 10 minutes.
              </p>
              <FormError message={verifyError} />
              <Input
                label="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="text-center text-2xl tracking-[0.6em]"
                error={otpForm.formState.errors.otp?.message}
                {...otpForm.register("otp")}
              />
              <Button type="submit" size="lg" className="w-full" loading={verify.isPending}>
                Verify code
              </Button>
              <div className="flex justify-between text-[13px] text-stone">
                <button type="button" className="underline underline-offset-4 hover:text-ink" onClick={() => setStep("email")}>
                  Use a different email
                </button>
                <button
                  type="button"
                  className="underline underline-offset-4 hover:text-ink disabled:opacity-50"
                  disabled={send.isPending}
                  onClick={() => send.mutate(email)}
                >
                  {send.isPending ? "Sending…" : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {step === "password" && (
            <form
              noValidate
              className="mt-10 space-y-6"
              onSubmit={pwForm.handleSubmit((v) => reset.mutate(v, { onSuccess: () => router.replace("/login?reset=1") }))}
            >
              <FormError message={reset.isError ? errorMessage(reset.error) : null} />
              <Input
                label="New password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                hint="6–40 characters"
                error={pwForm.formState.errors.password?.message}
                trailing={<PasswordToggle shown={show} onToggle={() => setShow((s) => !s)} />}
                {...pwForm.register("password")}
              />
              <Input
                label="Confirm new password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                error={pwForm.formState.errors.confirmPassword?.message}
                {...pwForm.register("confirmPassword")}
              />
              <Button type="submit" size="lg" className="w-full" loading={reset.isPending}>
                Update password
              </Button>
            </form>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="mt-10 text-[15px] text-stone">
        Remembered it?{" "}
        <Link href="/login" className="text-ink underline decoration-ink/30 underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
