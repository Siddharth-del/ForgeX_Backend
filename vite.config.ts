import { fileURLToPath, URL } from "node:url";
import type { ServerResponse } from "node:http";
import { defineConfig, loadEnv, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Where /api is forwarded during `npm run dev` / `npm run preview`: your local Spring Boot server
  // or your Render backend. (VITE_API_URL is still honoured from earlier versions of this project.)
  const apiTarget = (env.VITE_API_PROXY_TARGET || env.VITE_API_URL || "http://localhost:8080").trim().replace(/\/+$/, "");

  // The browser only ever calls this site's own /api/... ; the dev/preview server forwards
  // those calls to the backend. Because the browser never talks to another origin, CORS
  // never applies (calling the backend directly needs this origin in its CORS_ALLOWED_ORIGINS).
  const apiProxy: Record<string, ProxyOptions> = {
    "/api": {
      target: apiTarget,
      changeOrigin: true,
      configure(proxy) {
        // Forward as a plain server-to-server request so the backend never runs its CORS checks.
        proxy.on("proxyReq", (proxyReq) => {
          proxyReq.removeHeader("origin");
          proxyReq.removeHeader("referer");
        });
        proxy.on("error", (_err, _req, res) => {
          const out = res as ServerResponse;
          if ("headersSent" in out && !out.headersSent && !out.writableEnded) {
            out.writeHead(502, { "Content-Type": "application/json" });
            out.end(JSON.stringify({ message: `Can't reach the API at ${apiTarget}. Is the backend running?` }));
          }
        });
      },
    },
  };

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      host: "localhost",
      port: 5173,
      strictPort: true,
      proxy: apiProxy,
    },
    preview: {
      host: "localhost",
      port: 4173,
      proxy: apiProxy,
    },
    build: {
      target: "es2022",
      rollupOptions: {
        output: {
          // Long-lived vendor chunks: they change far less often than the storefront code.
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (/node_modules\/(react|react-dom|scheduler|react-router|cookie|set-cookie-parser)\//.test(id)) return "react";
            if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return "motion";
            return "vendor";
          },
        },
      },
    },
  };
});
