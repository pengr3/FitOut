import { defineConfig, devices } from "@playwright/test";

// E2E config for the auth flows (signup -> login persistence, password reset,
// mode switch). Specs live in /e2e (added by Plans 02-04).
//
// `webServer` boots the Next dev server on :3000 and reuses an already-running
// one locally so you don't fight over the port. The DB must be up (`npm run db:up`)
// before E2E runs that touch real data.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
