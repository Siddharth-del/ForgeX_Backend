import type { NextConfig } from "next";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8080").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  poweredByHeader: false,

  /**
   * The browser calls /api/* on this origin; Next forwards it to Spring Boot.
   * One origin means no CORS and a first-party httpOnly auth cookie.
   */
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      // Legacy locally-stored product images (FileService used to write to /images)
      { source: "/images/:path*", destination: `${BACKEND_URL}/images/:path*` },
    ];
  },

  images: {
    // Product photos are uploaded to Cloudinary by the backend (FileServiceImpl)
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
