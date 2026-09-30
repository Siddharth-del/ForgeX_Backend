import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/storefront/revalidate — clears the storefront's cached catalogue right after an
 * admin edits products, instead of waiting for the 60s revalidate window.
 *
 * This file route takes precedence over the /api/* rewrite to Spring Boot. It is guarded by
 * asking the backend who the caller is (the auth cookie has path=/api, so it reaches here).
 */
export async function POST(req: NextRequest) {
  const backend = (process.env.BACKEND_URL ?? "http://localhost:8080").replace(/\/+$/, "");
  const me = await fetch(`${backend}/api/auth/user`, {
    headers: { cookie: req.headers.get("cookie") ?? "", authorization: req.headers.get("authorization") ?? "" },
    cache: "no-store",
  }).catch(() => null);

  if (!me?.ok) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const user = (await me.json().catch(() => null)) as { roles?: string[] } | null;
  if (!user?.roles?.includes("ROLE_ADMIN")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  revalidateTag("catalog", { expire: 0 });
  return NextResponse.json({ revalidated: true });
}
