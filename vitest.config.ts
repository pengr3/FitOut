import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Single Vitest config for unit + integration + component tests.
//
// Default environment is "node" so integration tests can talk to the local
// Postgres (postgres.js) without a DOM. Component/React tests opt into jsdom
// per-file with the pragma:  // @vitest-environment jsdom
//
// No watch mode here — `vitest run` (see package.json "test" script) runs once
// and exits, keeping feedback latency tight for the GSD sampling loop.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    // Integration files replay every migration into an isolated schema in beforeAll
    // (tests/helpers/db.ts). With ~78 files sharing one Postgres, setup contention can
    // push a hook past Vitest's 10s default, failing random files. 120s makes the full
    // suite deterministic (proven 655/655) without masking real hangs.
    hookTimeout: 120_000,
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // E2E specs live in /e2e and are run by Playwright, not Vitest.
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
});
