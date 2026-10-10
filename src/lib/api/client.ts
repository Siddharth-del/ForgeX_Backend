/**
 * Central client for the ForgeX Spring Boot API.
 *
 * Base URL: VITE_API_BASE_URL. Leave it empty (the default) so the browser calls this site's own
 * /api/..., which is forwarded to the backend: by Vite locally (VITE_API_PROXY_TARGET, see
 * vite.config.ts) and by the "/api/*" rewrite on Render. Same-origin calls avoid CORS, which the
 * backend doesn't currently apply. Only set it to the backend URL once the backend sends CORS headers.
 *
 * Auth: "Authorization: Bearer <jwt>" from the signed-in session; cookies are not used.
 */
import { useAuth } from "@/store/auth";

const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 when the server could not be reached. */
    public status: number,
    /** Per-field validation messages from Spring (@Valid), when present. */
    public fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** JSON-serialisable value, or FormData for uploads. */
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  /** Attach the signed-in user's token (default true). */
  auth?: boolean;
  /** "blob" for file downloads (invoices). */
  responseType?: "json" | "blob";
  signal?: AbortSignal;
  /** Render's free tier can take ~50 s to wake a sleeping service, so allow a minute. */
  timeoutMs?: number;
}

export function apiUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(BASE + path, window.location.origin);
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  return url;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true, responseType = "json", signal, timeoutMs = 60_000 } = opts;
  const url = apiUrl(path, query);

  const headers: Record<string, string> = { Accept: responseType === "blob" ? "application/pdf, */*" : "application/json, text/plain;q=0.9, */*;q=0.8" };
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  const token = auth ? useAuth.getState().token : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      credentials: "omit",
      signal: controller.signal,
    });
  } catch {
    if (signal?.aborted) throw new ApiError("Request cancelled.", 0);
    if (controller.signal.aborted) throw new ApiError("The server took too long to respond. Please try again.", 0);
    throw new ApiError("We couldn't reach the server. Check your connection and try again.", 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }

  const type = res.headers.get("content-type") ?? "";
  // If /api isn't forwarded to the backend, the host answers with the storefront's own index.html.
  if (type.includes("text/html")) {
    throw new ApiError("The store isn't connected to its server: /api requests are returning the website. Check the /api rewrite rule.", 502);
  }

  if (res.ok && responseType === "blob") return (await res.blob()) as T;

  const text = await res.text();
  let payload: unknown = text;
  if (text && type.includes("json")) {
    try {
      payload = JSON.parse(text);
    } catch {
      /* keep raw text */
    }
  }

  if (!res.ok) {
    if (res.status === 401 && token) throw await sessionError(token, payload);
    throw toApiError(payload, res.status);
  }
  return payload as T;
}

/**
 * The backend answers 401 both for a bad token AND for any unhandled server error on a signed-in
 * request (Spring forwards errors to /error, which isn't permitted). Tell them apart before
 * signing the customer out.
 */
async function sessionError(token: string, payload: unknown): Promise<ApiError> {
  const { expiresAt, clearSession } = useAuth.getState();
  let valid = !(expiresAt && expiresAt <= Date.now());
  if (valid) {
    try {
      const r = await fetch(apiUrl("/api/auth/user"), { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, credentials: "omit" });
      valid = r.ok;
    } catch {
      valid = true; // can't tell; keep the session
    }
  }
  if (!valid) {
    if (useAuth.getState().token === token) clearSession("expired");
    return new ApiError("Your session has ended. Please sign in again.", 401);
  }
  const msg = payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string" ? (payload as { message: string }).message : "";
  return new ApiError(
    msg && !/full authentication is required/i.test(msg) ? msg : "The server couldn't complete that request. Check the details and try again.",
    500,
  );
}

const GENERIC: Record<number, string> = {
  401: "Please sign in to continue.",
  403: "You don't have permission to do that.",
  404: "We couldn't find that.",
  413: "That file is too large.",
  500: "Something went wrong on our side. Please try again in a moment.",
  502: "The server isn't responding right now. Please try again in a minute.",
  503: "The server isn't responding right now. Please try again in a minute.",
  504: "The server took too long to respond. Please try again.",
};

function toApiError(payload: unknown, status: number): ApiError {
  if (typeof payload === "string") {
    const s = payload.trim();
    const usable = s && s.length < 240 && !s.startsWith("<");
    return new ApiError(usable ? s : (GENERIC[status] ?? GENERIC[500]), status);
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message && !/full authentication is required|access denied/i.test(obj.message)) {
      return new ApiError(obj.message, status);
    }
    // Spring validation errors arrive as { field: "message" }.
    const fields = Object.fromEntries(Object.entries(obj).filter(([k, v]) => typeof v === "string" && !["error", "path", "timestamp", "message"].includes(k))) as Record<string, string>;
    if (status === 400 && Object.keys(fields).length) {
      return new ApiError(Object.entries(fields).map(([k, v]) => `${k[0].toUpperCase()}${k.slice(1)} ${v}`).join(". ") + ".", status, fields);
    }
  }
  return new ApiError(GENERIC[status] ?? (status >= 500 ? GENERIC[500] : "Something went wrong. Please try again."), status);
}

/** Save a Blob as a file (invoice downloads). */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
