/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Browser API base URL. Empty (default) = this site's own /api, forwarded to the backend. */
  readonly VITE_API_BASE_URL?: string;
  /** Optional public form endpoint of your email provider for the newsletter (receives { email }). */
  readonly VITE_NEWSLETTER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// VITE_API_PROXY_TARGET (the backend address) is read only by vite.config.ts for the dev/preview proxy.
