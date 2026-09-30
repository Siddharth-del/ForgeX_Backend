import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

/** Lets shoppers add ForgeX to their phone's home screen and open it full-screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — Perfumes & Attars`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf8f4",
    theme_color: "#0c0c0d",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Shop all", url: "/shop" },
      { name: "Your bag", url: "/cart" },
      { name: "Your orders", url: "/account" },
    ],
  };
}
