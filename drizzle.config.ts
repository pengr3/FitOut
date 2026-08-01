// drizzle-kit config (generate / migrate / studio).
//
// WHY THIS FILE LOADS ENV ITSELF. drizzle-kit runs as its own process, OUTSIDE Next.js — and Next is
// what loads `.env.local` at runtime. So without the two lines below, `process.env.DATABASE_URL` is
// undefined here and every db script dies with:
//
//     Error  Please provide required params for Postgres driver:
//         [x] url: undefined
//
// which is what `npm run db:migrate` did, forcing DATABASE_URL to be passed by hand on every migration.
// Same root cause and same remedy as `tests/setup.ts:14-16` (Vitest does not load `.env.local` either);
// this file follows that module's idiom deliberately, so there is ONE way env reaches a non-Next process
// in this repo.

import { defineConfig } from "drizzle-kit";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// `.env.local` first, then `.env` as a fallback. dotenv does NOT override an already-set variable, so a
// value exported in the shell (or by CI) still wins over both files — that ordering is what keeps a
// one-off `DATABASE_URL=… npm run db:migrate` working unchanged.
loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

// The same deterministic local-Docker fallback `tests/setup.ts:20-22` and `scripts/seed.ts:16-18`
// already use, so a fresh clone with no env file at all still points at `npm run db:up`'s Postgres
// rather than failing on undefined. Production never reaches it: deployments set DATABASE_URL.
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: DATABASE_URL },
});
