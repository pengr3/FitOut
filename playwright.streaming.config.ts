import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import base from "./playwright.config";

const mode = process.env.FITOUT_STREAMING_SERVER;
const port = Number(process.env.FITOUT_STREAMING_PORT ?? "3127");
if ((mode !== "dev" && mode !== "production") || !Number.isInteger(port) || port < 1024 || port > 65535 || !process.env.FITOUT_STREAMING_RUN_DIR || process.env.FITOUT_E2E_REAL_EMAIL === "1") {
  throw new Error("Choose dev|production, a fresh port and diagnostic directory; real mail is forbidden.");
}
export default defineConfig({
  ...base,
  testDir: resolve(__dirname, "e2e"),
  retries: 0,
  updateSnapshots: "none",
  projects: base.projects?.filter((project) => project.name === "chromium"),
  use: { ...base.use, baseURL: `http://localhost:${port}` },
  webServer: {
    command: "node scripts/run-phase27-streaming-server.mjs",
    cwd: __dirname,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { RESEND_API_KEY: "", FITOUT_E2E_REAL_EMAIL: "", CONTACT_PRODUCTION_ENABLED: "false" },
  },
});
