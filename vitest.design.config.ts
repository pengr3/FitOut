import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Second Vitest config, owning ONLY `tests/design/**` — the design-system gate.
//
// WHY A SECOND CONFIG EXISTS (D-16):
//
//   `vitest.config.ts:59` declares `globalSetup: ["tests/global-setup.ts"]`, which preflights the
//   `fitout_test` Postgres database and hard-FAILS the whole run when that database is unreachable —
//   for every `vitest run`, including a single-file run. The design gate asserts on stylesheets,
//   tokens, CVA recipes and the source tree; it touches no database. It is also destined to run
//   inside `next build` (plan 10-17), on a machine that may have no Docker and no Postgres. A
//   build-blocking gate that needs a database is a gate nobody keeps, so the design suite gets its
//   own config that can never reach for a database.
//
// THERE IS NO `globalSetup` AND NO `setupFiles` HERE, BY DESIGN.
//
//   Those two keys are exactly what makes `vitest.config.ts` require Docker. Adding either one to
//   this file — even "just to share a helper" — silently reintroduces the Docker dependency and
//   breaks the DB-free guarantee this config exists to provide. If a design test ever needs a
//   database, it is not a design test.
//
// ENVIRONMENT stays "node". Design tests are overwhelmingly pure (parse CSS, compute contrast, walk
// the source tree). The few that render React (e.g. the THEME-01 provider test) opt into a DOM
// per-file with the repo's existing pragma:  // @vitest-environment jsdom
// (see tests/booking/partial-grant-notice.test.tsx:1). `plugins: [react()]` is present so those
// `.tsx` files transform correctly.
//
// COLLECTION IS DISJOINT FROM THE MAIN CONFIG. `vitest.config.ts:60` includes `tests/**/*.test.tsx`,
// so without the matching `exclude: ["tests/design/**"]` over there, a design `.tsx` test would be
// collected by BOTH configs and the main one would make it pay the Postgres preflight. Both halves
// are load-bearing — see the comment on that exclude entry.
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
    include: ["tests/design/**/*.test.ts", "tests/design/**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
});
