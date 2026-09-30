import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/checkout", "/cart", "/api/"] }],
    sitemap: `${SITE.url.replace(/\/+$/, "")}/sitemap.xml`,
  };
}
