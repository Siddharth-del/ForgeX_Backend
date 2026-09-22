const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** Backend money is always in paise (Long). */
export function formatPaise(paise) {
  if (paise === null || paise === undefined || Number.isNaN(Number(paise))) return '—';
  return inr.format(Number(paise) / 100);
}

export const rupeesToPaise = (rupees) => Math.round(Number(rupees) * 100);
export const paiseToRupees = (paise) => (paise === null || paise === undefined ? '' : String(Number(paise) / 100));

export function discountPercent(mrp, price) {
  if (!mrp || !price || mrp <= price) return 0;
  return Math.floor(((mrp - price) * 100) / mrp);
}

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function formatDate(value, withTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return (withTime ? dateTimeFmt : dateFmt).format(d);
}

export const pluralize = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
