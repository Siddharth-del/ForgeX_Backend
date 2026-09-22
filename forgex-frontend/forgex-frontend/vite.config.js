import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In development, leave VITE_API_BASE_URL empty and requests go to /api on the
// Vite server, which proxies them to VITE_DEV_PROXY_TARGET. The browser then sees
// one origin, so the backend's JWT cookie and CORS rules behave as in production
// behind a reverse proxy. Set VITE_API_BASE_URL to call the backend directly.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8080';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/images': { target, changeOrigin: true },
      },
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            data: ['axios', '@tanstack/react-query'],
          },
        },
      },
    },
  };
});
