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
//
// WHY DIRECT_DATABASE_URL WINS HERE, AND ONLY HERE. A hosted Postgres (Neon) publishes TWO endpoints
// per branch whose hostnames differ by exactly ONE segment: the POOLED host contains `-pooler`, the
// DIRECT host does not. Nothing else about the two strings differs, so they are trivially easy to
// swap by eye. The pooled endpoint is transaction-mode PgBouncer, where session-scoped state does not
// survive between statements — and that state is exactly what schema migrations rely on. Neon's own
// documentation lists "schema migrations (Drizzle Kit)" among the work that wants a DIRECT connection.
// Hence drizzle-kit, and ONLY drizzle-kit, prefers DIRECT_DATABASE_URL below.
//
// The app runtime is deliberately NOT part of this. `src/lib/db/index.ts` keeps reading DATABASE_URL
// and should be pointed at the POOLED host: serverless instances multiply under load, and the pooler
// is the thing that absorbs that. So the two variables are NOT a fallback pair for one value the way
// the local-Docker default below is — they name two DIFFERENT endpoints on purpose, and setting both
// to the same host defeats one half or the other.
//
// LOCALLY, NOTHING MOVES. DIRECT_DATABASE_URL is unset for Docker work, so resolution collapses to the
// previous expression character for character, and a Docker-only workflow is unaffected. The
// shell-beats-dotenv ordering described above still holds too: a one-off
// `DATABASE_URL=… npm run db:migrate` keeps working exactly as before, and
// `DIRECT_DATABASE_URL=… npm run db:migrate` now works the same way.
//
// COVERAGE LIMIT — this is NOT blanket, and the difference bites against a hosted database. This file
// is read by `db:migrate`, `db:generate` and `db:studio`, and by nothing else. `scripts/seed.ts:16-18`
// and `scripts/db-test-setup.ts` read DATABASE_URL themselves, so `db:seed` and `db:test:setup` are
// NOT covered: against Neon they must be handed the direct URL explicitly on the command line.
// `.env.example` states the same limit in operator-facing terms; the two must not drift apart.

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
// Precedence, argued in full in the header: DIRECT_DATABASE_URL (drizzle-kit's variable, the direct
// endpoint) beats DATABASE_URL (the app runtime's variable, the pooled endpoint), which beats the
// local-Docker default.
const DATABASE_URL =
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://fitout:fitout@localhost:5432/fitout";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: DATABASE_URL },
});
