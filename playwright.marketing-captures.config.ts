import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Use the lower-memory webpack runner for Windows asset captures. No baseline writes.
export default defineConfig({
  ...base,
  webServer: {
    ...base.webServer,
    command: "node node_modules/next/dist/bin/next dev --webpack --hostname 0.0.0.0",
    timeout: 180_000,
  },
});
