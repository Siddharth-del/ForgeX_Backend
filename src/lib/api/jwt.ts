/** Reads the `exp` claim (ms since epoch) from a JWT without verifying it; the server does the verifying. */
export function tokenExpiry(token: string): number | null {
  try {
    const part = token.split(".")[1];
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=")));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}
