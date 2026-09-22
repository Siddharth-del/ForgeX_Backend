// Small validation helpers. The backend stays authoritative; these give fast feedback.

export const rules = {
  required: (msg = 'This field is required') => (v) =>
    v === null || v === undefined || String(v).trim() === '' ? msg : null,
  email: (msg = 'Enter a valid email address') => (v) =>
    !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()) ? null : msg,
  minLength: (n, msg) => (v) => (!v || String(v).trim().length >= n ? null : msg || `Must be at least ${n} characters`),
  maxLength: (n, msg) => (v) => (!v || String(v).length <= n ? null : msg || `Must be at most ${n} characters`),
  pattern: (re, msg) => (v) => (!v || re.test(String(v)) ? null : msg),
  number: (msg = 'Enter a number') => (v) => (v === '' || v === null || v === undefined || Number.isFinite(Number(v)) ? null : msg),
  min: (n, msg) => (v) => (v === '' || v === null || v === undefined || Number(v) >= n ? null : msg || `Must be ${n} or more`),
  max: (n, msg) => (v) => (v === '' || v === null || v === undefined || Number(v) <= n ? null : msg || `Must be ${n} or less`),
  integer: (msg = 'Enter a whole number') => (v) => (v === '' || v === null || v === undefined || Number.isInteger(Number(v)) ? null : msg),
  matches: (field, msg) => (v, values) => (v === values[field] ? null : msg),
};

export const PINCODE = /^[1-9][0-9]{5}$/;
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** schema: { field: [rule, rule] } → { field: firstErrorMessage } */
export function validate(schema, values) {
  const errors = {};
  for (const [field, fieldRules] of Object.entries(schema)) {
    for (const rule of fieldRules) {
      const msg = rule(values[field], values);
      if (msg) { errors[field] = msg; break; }
    }
  }
  return errors;
}

export const toSlug = (s) =>
  String(s || '').toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
