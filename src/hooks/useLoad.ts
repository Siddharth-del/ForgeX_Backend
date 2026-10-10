import { useCallback, useEffect, useRef, useState } from "react";

export interface LoadState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
  /** Replace the loaded data after a successful change (no refetch). */
  setData: (update: T | ((prev: T | undefined) => T)) => void;
}

/** Loads data for a page, with loading / error / retry. `key` changes trigger a reload. */
export function useLoad<T>(load: () => Promise<T>, key: unknown = null): LoadState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const loader = useRef(load);
  loader.current = load;

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    loader.current().then(
      (d) => {
        if (!live) return;
        setDataState(d);
        setLoading(false);
      },
      (e) => {
        if (!live) return;
        setError(e);
        setLoading(false);
      },
    );
    return () => {
      live = false;
    };
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const setData = useCallback((u: T | ((prev: T | undefined) => T)) => setDataState((prev) => (typeof u === "function" ? (u as (p: T | undefined) => T)(prev) : u)), []);
  return { data, error, loading, reload, setData };
}
