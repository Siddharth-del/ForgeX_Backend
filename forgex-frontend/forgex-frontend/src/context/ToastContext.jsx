import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback((message, tone = 'info', duration = 4000) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-3), { id, message, tone }]);
    if (duration) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const api = useMemo(() => ({
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error', 6000),
    info: (m) => show(m, 'info'),
    dismiss,
  }), [show, dismiss]);

  const toneClass = {
    success: 'border-l-ok',
    error: 'border-l-forge',
    info: 'border-l-ink',
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-sm animate-toastIn items-start gap-3 border border-line border-l-4 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(22,22,26,.12)] ${toneClass[t.tone]}`}>
            <p className="flex-1 text-[15px]">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} className="-mr-1 px-1 text-steel hover:text-ink" aria-label="Dismiss notification">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
