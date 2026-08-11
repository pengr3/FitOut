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
//
// DATABASE ISOLATION IS TWO LAYERS, AND BOTH ARE LOAD-BEARING (threat T-01-04):
//
//   1. DATABASE — `setupFiles: tests/setup.ts` FORCES `DATABASE_URL` onto the suite's own
//      `fitout_test` database (tests/helpers/test-db-url.ts, provisioned by `npm run db:test:setup`).
//      This is the outer wall, and it exists because the app's db handle is a MODULE-LEVEL singleton
//      (`src/lib/db/index.ts`) bound to `public`: it does not go through the helper below, so layer 2
//      alone never contained it and it wrote real audit rows into DEV on every run.
//   2. SCHEMA — `tests/helpers/db.ts` still gives every test FILE its own `test_<pid>_<worker>_<n>`
//      schema inside that database, so parallel workers never share state. That layer is unchanged.
//
//   `globalSetup: tests/global-setup.ts` sits around both: it preflights the test database (failing
//   once, with the fix command, instead of 85 cryptic per-file errors), TRUNCATEs it so each run's
//   measurement is per-run, and prints a LOUD end-of-run report naming anything that still escaped
//   layer 2 — containment is demonstrated by relocation, not by a code path going quiet.
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
    // Vitest's 5s testTimeout default was wildly asymmetric with the 120s hookTimeout
    // above, and the asymmetry is real, not cosmetic: under this box's multi-suite
    // parallel load (e.g. `vitest run tests/booking tests/payments tests/availability`,
    // 54+ files sharing the CPU), a jsdom component test's async re-render/waitFor can
    // occasionally miss the 5s window by a small margin — observed at 5384ms for
    // tests/availability/date-pass-picker.test.tsx case 4, which is 10/10 in ~1.2s/test
    // isolated. Same class of contention as the hookTimeout note above, just at the
    // test-body layer instead of the hook layer, so it is fixed the same way: raise the
    // global knob rather than special-case one file, since any async test on this suite
    // is equally exposed to the same borderline margin under load. 20s gives generous
    // headroom over the observed ~5.4s overrun without approaching hookTimeout's 120s
    // (a different, heavier order of contention — live Postgres schema setup, not a
    // mocked re-render) and without masking a genuinely hung test for minutes.
    testTimeout: 20_000,
    setupFiles: ["tests/setup.ts"],
    // Runs ONCE in the main process, around the whole suite (it does NOT inherit setupFiles).
    globalSetup: ["tests/global-setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // E2E specs live in /e2e and are run by Playwright, not Vitest.
    // The design suite is owned by vitest.design.config.ts and must NEVER pay the Postgres
    // preflight above — without this entry the include globs would also collect tests/design/*.tsx.
    exclude: ["e2e/**", "node_modules/**", ".next/**", "tests/design/**"],
  },
});
