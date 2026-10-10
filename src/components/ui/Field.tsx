import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { useSlow } from "@/hooks/useSlow";

/** Error colour used by every form on the site. */
const ERROR_TEXT = "text-[#9b3b2a]";
const control = (error?: string, extra?: string) =>
  cn("w-full border bg-ivory px-4 outline-none transition-colors focus:border-espresso disabled:opacity-60", error ? "border-[#9b3b2a]" : "border-espresso/20", extra);

type Base = { label: string; error?: string; hint?: string; className?: string; labelClassName?: string };

function Message({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (!error && !hint) return null;
  return (
    <p id={id} className={cn("mt-2 text-[0.78rem]", error ? ERROR_TEXT : "text-ink-faint")}>
      {error || hint}
    </p>
  );
}

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> &
  Base & {
    value: string;
    onChange: (v: string) => void;
    trailing?: ReactNode;
    inputClassName?: string;
  };

export function TextField({ label, value, onChange, error, hint, trailing, className, labelClassName, inputClassName, id: idProp, ...rest }: TextFieldProps) {
  const auto = useId();
  const id = idProp ?? auto;
  const msgId = `${id}-msg`;
  return (
    <div className={className}>
      <label htmlFor={id} className={cn("label text-ink-muted", labelClassName)}>
        {label}
      </label>
      <div className="relative mt-3">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error || hint ? msgId : undefined}
          {...rest}
          className={control(error, cn("h-12", trailing ? "pr-20" : undefined, inputClassName))}
        />
        {trailing}
      </div>
      <Message id={msgId} error={error} hint={hint} />
    </div>
  );
}

export function PasswordField(props: Omit<TextFieldProps, "type" | "trailing">) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      {...props}
      type={show ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 px-4 text-[0.62rem] font-medium uppercase tracking-[0.2em] text-ink-muted hover:text-ink"
        >
          {show ? "Hide" : "Show"}
        </button>
      }
    />
  );
}

export function SelectField({
  label,
  value,
  onChange,
  error,
  hint,
  className,
  labelClassName,
  children,
  id: idProp,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> & Base & { value: string; onChange: (v: string) => void; children: ReactNode }) {
  const auto = useId();
  const id = idProp ?? auto;
  const msgId = `${id}-msg`;
  return (
    <div className={className}>
      <label htmlFor={id} className={cn("label text-ink-muted", labelClassName)}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error || hint ? msgId : undefined}
        {...rest}
        className={cn(control(error, "mt-3 h-12"), "appearance-none bg-[length:12px] bg-[position:right_1rem_center] bg-no-repeat pr-10")}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%2332180E' stroke-width='1.2'%3E%3Cpath d='M1 1.5l5 5 5-5'/%3E%3C/svg%3E\")" }}
      >
        {children}
      </select>
      <Message id={msgId} error={error} hint={hint} />
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  error,
  hint,
  className,
  labelClassName,
  id: idProp,
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & Base & { value: string; onChange: (v: string) => void }) {
  const auto = useId();
  const id = idProp ?? auto;
  const msgId = `${id}-msg`;
  return (
    <div className={className}>
      <label htmlFor={id} className={cn("label text-ink-muted", labelClassName)}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error || hint ? msgId : undefined}
        {...rest}
        className={control(error, "mt-3 min-h-28 py-3 leading-relaxed")}
      />
      <Message id={msgId} error={error} hint={hint} />
    </div>
  );
}

/** Error line for a whole form, plus a note when a sleeping server is taking a while to wake. */
export function FormStatus({ error, pending, className }: { error?: string | null; pending: boolean; className?: string }) {
  const slow = useSlow(pending, 5000);
  if (error)
    return (
      <p role="alert" className={cn("text-[0.82rem]", ERROR_TEXT, className)}>
        {error}
      </p>
    );
  if (slow)
    return (
      <p role="status" className={cn("text-[0.8rem] text-ink-faint", className)}>
        Waking the server. The first request after a quiet spell can take up to a minute.
      </p>
    );
  return null;
}
