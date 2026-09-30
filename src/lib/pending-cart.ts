const PENDING_KEY = "forgex:pending-add";

export interface PendingAdd {
  productId: number;
  quantity: number;
  name: string;
}

/** Remember an add-to-cart made while signed out; replayed right after sign-in. */
export function rememberPendingAdd(productId: number, quantity: number, name: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ productId, quantity, name }));
  } catch {
    /* storage unavailable — the shopper simply adds again */
  }
}

export function takePendingAdd(): PendingAdd | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingAdd) : null;
  } catch {
    return null;
  }
}
