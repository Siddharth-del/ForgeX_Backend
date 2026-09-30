import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** false during SSR and hydration, true afterwards — safe gate for portals and browser-only UI. */
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}
