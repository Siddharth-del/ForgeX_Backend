import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests (npm test). Browser flows are covered by the Playwright suites in tests/e2e.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
