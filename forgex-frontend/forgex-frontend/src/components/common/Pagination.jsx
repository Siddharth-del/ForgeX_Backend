export default function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = [];
  const add = (p) => pages.push(p);
  const window = 1;
  for (let p = 0; p < totalPages; p++) {
    if (p === 0 || p === totalPages - 1 || Math.abs(p - page) <= window) add(p);
    else if (pages[pages.length - 1] !== '…') add('…');
  }

  const btn = 'inline-flex h-10 min-w-10 items-center justify-center px-3 text-[15px] disabled:opacity-40';
  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1">
      <button type="button" className={`${btn} hover:bg-paper`} onClick={() => onChange(page - 1)} disabled={page === 0}>Previous</button>
      {pages.map((p, i) => p === '…'
        ? <span key={`e${i}`} className="px-2 text-steel">…</span>
        : <button key={p} type="button" onClick={() => onChange(p)} aria-current={p === page ? 'page' : undefined}
            className={`${btn} ${p === page ? 'bg-ink text-white' : 'hover:bg-paper'}`}>{p + 1}</button>)}
      <button type="button" className={`${btn} hover:bg-paper`} onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1}>Next</button>
    </nav>
  );
}
