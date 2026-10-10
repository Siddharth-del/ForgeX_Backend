import { useEffect, useState } from "react";

/** True once `active` has stayed true for `ms` (e.g. to explain a slow, sleeping server). */
export function useSlow(active: boolean, ms: number) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setSlow(true), ms);
    return () => {
      clearTimeout(t);
      setSlow(false);
    };
  }, [active, ms]);
  return slow;
}
