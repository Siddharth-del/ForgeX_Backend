import { forwardRef } from 'react';

function FieldShell({ id, label, hint, error, required, children }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}{required && <span className="text-forge" aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {error ? <p id={`${id}-error`} className="field-error">{error}</p> : hint ? <p id={`${id}-hint`} className="field-hint">{hint}</p> : null}
    </div>
  );
}

const describedBy = (id, error, hint) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export const Input = forwardRef(function Input({ id, label, hint, error, required, className = '', ...props }, ref) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <input ref={ref} id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)}
        required={required} className={`input ${error ? 'input-invalid' : ''} ${className}`} {...props} />
    </FieldShell>
  );
});

export function Select({ id, label, hint, error, required, options, placeholder, className = '', ...props }) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <select id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} required={required}
        className={`input appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22><path d=%22M1 1l5 5 5-5%22 stroke=%22%2316161A%22 fill=%22none%22 stroke-width=%221.5%22/></svg>')] bg-[length:12px_8px] bg-[right_12px_center] bg-no-repeat pr-9 ${error ? 'input-invalid' : ''} ${className}`} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </FieldShell>
  );
}

export function Textarea({ id, label, hint, error, required, className = '', ...props }) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <textarea id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} required={required}
        className={`input min-h-[120px] ${error ? 'input-invalid' : ''} ${className}`} {...props} />
    </FieldShell>
  );
}

export function Checkbox({ id, label, hint, ...props }) {
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" className="mt-1 h-4 w-4 accent-ink" {...props} />
      <div>
        <label htmlFor={id} className="text-[15px] font-medium">{label}</label>
        {hint && <p className="text-sm text-steel">{hint}</p>}
      </div>
    </div>
  );
}
