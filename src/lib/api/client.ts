/**
 * One fetch wrapper for every backend call.
 *
 * In the browser, requests go to relative `/api/...` URLs. next.config.ts rewrites
 * those to the Spring Boot backend, so the browser only ever talks to one origin:
 * no CORS, and the backend's httpOnly JWT cookie (path=/api) is first-party.
 *
 * On the server (RSC / route handlers) requests go straight to BACKEND_URL.
 */

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const FRIENDLY_BY_STATUS: Record<number, string> = {
  400: "Something in that request wasn't right. Please check and try again.",
  401: "Please sign in to continue.",
  403: "You don't have access to that.",
  404: "We couldn't find what you were looking for.",
  409: "That conflicts with something that already exists.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: "Something went wrong on our side. Please try again.",
  502: "Our store is temporarily unreachable. Please try again shortly.",
  503: "Our store is temporarily unavailable. Please try again shortly.",
};

/** Messages from the backend that are Java internals rather than something a shopper should read. */
const looksInternal = (msg: string) =>
  /exception|java\.|org\.|null|could not|constraint|sql|hibernate|jdbc|stack/i.test(msg) && msg.length > 60;

/**
 * The backend answers errors in several shapes:
 *  - APIResponse           { message, status:false }
 *  - MessageResponse       { message }
 *  - AuthEntryPointJwt     { status, error, message, path }
 *  - validation handler    { field: "message", ... }
 *  - plain text            "Invalid OTP"
 */
function toApiError(status: number, body: unknown): ApiError {
  let message = "";
  let fieldErrors: Record<string, string> = {};

  if (typeof body === "string") {
    message = body;
  } else if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    if (typeof o.message === "string") {
      message = o.message;
    } else {
      // Validation map: every value is a string message keyed by field
      const entries = Object.entries(o).filter(([, v]) => typeof v === "string") as [string, string][];
      if (entries.length && entries.length === Object.keys(o).length) {
        fieldErrors = Object.fromEntries(entries);
        message = entries.map(([, v]) => v).join(". ");
      }
    }
  }

  // Spring Security's entry point ({error:"Unauthorized", message:"Full authentication…"}) is
  // replaced; a deliberate 401 message from a controller (e.g. bad credentials) is kept.
  if (status === 401 && (!message || (body && typeof body === "object" && "error" in body))) {
    message = FRIENDLY_BY_STATUS[401];
  }
  if (!message || looksInternal(message) || status >= 500) {
    message = FRIENDLY_BY_STATUS[status] ?? FRIENDLY_BY_STATUS[500];
  }
  return new ApiError(message, status, fieldErrors);
}

function baseUrl() {
  if (typeof window !== "undefined") return "";
  return process.env.BACKEND_URL ?? "http://localhost:8080";
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Next.js fetch cache hints (server only) */
  next?: { revalidate?: number | false; tags?: string[] };
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, query, headers, ...rest } = opts;

  let url = `${baseUrl()}${path}`;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(url, {
      credentials: "include",
      ...rest,
      headers: {
        Accept: "application/json, text/plain, */*",
        ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("We couldn't reach the store. Check your connection and try again.", 0);
  }

  const type = res.headers.get("content-type") ?? "";
  const parsed: unknown =
    res.status === 204
      ? null
      : type.includes("application/json")
        ? await res.json().catch(() => null)
        : await res.text().catch(() => "");

  if (!res.ok) throw toApiError(res.status, parsed);
  return parsed as T;
}

/** Download a binary response (e.g. the PDF invoice) and hand it to the browser. */
export async function downloadFile(path: string, fallbackName: string) {
  const res = await fetch(path, { credentials: "include" }).catch(() => null);
  if (!res) throw new ApiError("We couldn't reach the store. Check your connection and try again.", 0);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw toApiError(res.status, body);
  }
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") ?? "";
  const name = /filename="?([^"]+)"?/.exec(cd)?.[1] ?? fallbackName;
  const href = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export const errorMessage = (e: unknown) =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Something went wrong.";
