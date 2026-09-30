import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const control =
  "peer block w-full rounded-xs border border-line bg-white/70 px-4 text-base text-ink md:text-[15px] placeholder:text-smoke " +
  "transition-colors duration-200 hover:border-stone/60 focus:border-ink focus:bg-white focus:outline-none " +
  "aria-[invalid=true]:border-ember disabled:opacity-60";

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  id: string;
  children: ReactNode;
  className?: string;
  optional?: boolean;
}

export function FieldShell({ label, error, hint, id, children, className, optional }: FieldShellProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="eyebrow flex items-baseline justify-between text-stone">
        <span>{label}</span>
        {optional && <span className="normal-case tracking-normal text-smoke">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] text-ember">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-stone">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  wrapperClassName?: string;
  trailing?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, optional, wrapperClassName, className, id: idProp, trailing, ...props },
  ref,
) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell label={label} error={error} hint={hint} id={id} className={wrapperClassName} optional={optional}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(control, "h-12", trailing && "pr-12", className)}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-2">{trailing}</div>}
      </div>
    </FieldShell>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, wrapperClassName, className, id: idProp, children, ...props },
  ref,
) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell label={label} error={error} hint={hint} id={id} className={wrapperClassName}>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(control, "h-12 appearance-none pr-10", className)}
          {...props}
        >
          {children}
        </select>
        <svg aria-hidden viewBox="0 0 12 12" className="pointer-events-none absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2 text-stone">
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.25" />
        </svg>
      </div>
    </FieldShell>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, wrapperClassName, className, id: idProp, ...props },
  ref,
) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell label={label} error={error} hint={hint} id={id} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={id}
        aria-invalid={!!error || undefined}
        className={cn(control, "min-h-28 py-3 leading-relaxed", className)}
        {...props}
      />
    </FieldShell>
  );
});

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="border-l-2 border-ember bg-ember/5 px-4 py-3 text-sm text-ember-deep">
      {message}
    </div>
  );
}
