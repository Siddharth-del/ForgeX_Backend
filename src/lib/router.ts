import { data } from "react-router";

/** Throw from a route loader to render the "page not found" state inside the site layout. */
export function notFound(): never {
  throw data("Not found", { status: 404 });
}

/** Only follow same-site paths from ?next= so the sign-in page can't be used as an open redirect. */
export function safeNext(value: string | null | undefined, fallback = "/account"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
