// One-time (and idempotent) provisioning of the vitest suite's OWN Postgres database.
//
// Run with:  npm run db:test:setup     (or: npx tsx scripts/db-test-setup.ts)
//
// WHY. The app's db handle (`src/lib/db/index.ts`) is a module-level singleton bound to the default
// `search_path` (= `public`), so it writes straight past `tests/helpers/db.ts`'s per-file schema
// isolation. Before this script existed, every `npx vitest run` deposited real `needs_attention`
// audit rows into the DEV database — and since the daily ops digest emails those to a human, that was
// daily mail about money that does not exist. Containment therefore happens at the DATABASE layer:
// the suite gets `fitout_test`, and `tests/helpers/test-db-url.ts` refuses to point anywhere whose
// name does not end in `_test`.
//
// Standalone by design, following `scripts/seed.ts`'s house idiom: raw postgres.js + SQL only, NO
// `@/` aliases, so it runs under tsx with no path/alias resolution. The one import is a RELATIVE one
// into the shared URL module — deliberately, so this file does not become a fourth copy of the dev
// URL literal (it already lives in drizzle.config.ts, scripts/seed.ts and each e2e spec).
//
// Idempotent throughout: CREATE DATABASE only when absent, `CREATE EXTENSION IF NOT EXISTS`, and
// drizzle-kit's own journal (schema `drizzle`, inside the test database) makes a second migrate a
// no-op. Running it twice changes nothing and exits 0.

import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";
import {
  assertTestDatabase,
  baseDatabaseUrl,
  databaseNameOf,
  testDatabaseUrl,
} from "../tests/helpers/test-db-url";

// `.env.local` first, then `.env` — exactly drizzle.config.ts:22-23, so the BASE url this derives
// from comes from the same place every other non-Next process in this repo reads it from.
loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

function quoteIdent(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

async function main(): Promise<void> {
  // ---- 1. Resolve, and refuse to proceed if base and test are the same database ---------------
  const baseUrl = baseDatabaseUrl();
  const testUrl = testDatabaseUrl(); // throws unless the resolved name ends in `_test`
  const baseName = databaseNameOf(baseUrl, "DATABASE_URL");
  const testName = assertTestDatabase(testUrl, "the resolved test database URL");

  if (baseName === testName) {
    throw new Error(
      `[db:test:setup] REFUSING to run: the base and test URLs name the same database ` +
        `(${JSON.stringify(testName)}). This script drops schemas and the suite TRUNCATEs; it must ` +
        `never be pointed at the database the dev app uses. Check DATABASE_URL / TEST_DATABASE_URL.`,
    );
  }

  console.info(`[db:test:setup] dev database:  ${baseName}`);
  console.info(`[db:test:setup] test database: ${testName}`);

  // ---- 2. CREATE DATABASE (there is no IF NOT EXISTS form) ------------------------------------
  // Must run from a connection to a DIFFERENT database — you cannot CREATE DATABASE from a
  // connection to its own target. The base database is guaranteed to exist (the dev app uses it).
  const bootstrap = postgres(baseUrl, { max: 1, onnotice: () => {} });
  try {
    const existing = await bootstrap`SELECT 1 FROM pg_database WHERE datname = ${testName}`;
    if (existing.length > 0) {
      console.info(`[db:test:setup] database ${testName} already exists — no change.`);
    } else {
      try {
        await bootstrap.unsafe(`CREATE DATABASE ${quoteIdent(testName)}`);
        console.info(`[db:test:setup] CREATED database ${testName}.`);
      } catch (err: unknown) {
        // 42P04 = duplicate_database: another process won the race. Idempotent either way.
        if ((err as { code?: string }).code === "42P04") {
          console.info(`[db:test:setup] database ${testName} created concurrently — no change.`);
        } else {
          throw err;
        }
      }
    }
  } finally {
    await bootstrap.end();
  }

  const testClient = postgres(testUrl, { max: 1, onnotice: () => {} });
  try {
    // ---- 3. EXTENSIONS IN `public`, BEFORE ANY MIGRATION REPLAY -----------------------------
    // THIS IS THE LOAD-BEARING STEP. `drizzle/0001_enable_postgis.sql:7` is a bare
    // `CREATE EXTENSION IF NOT EXISTS postgis;` with NO `SCHEMA` clause, and
    // `tests/helpers/db.ts:107` replays every migration under `SET search_path TO "<test schema>",
    // public`. On a database where postgis is absent, that statement would therefore install PostGIS
    // INTO the per-file test schema — which `teardownTestDb`'s `DROP SCHEMA … CASCADE` then destroys,
    // while parallel workers race to recreate it. In the dev database this is invisible only because
    // `IF NOT EXISTS` short-circuits against the extension that is already there. A FRESH database
    // has no such luck, so both extensions are created here first, with `WITH SCHEMA public` stated
    // EXPLICITLY on BOTH — including postgis, whose own migration omits it — so their placement can
    // never depend on an ambient search_path.
    // (`drizzle/0005_booking_exclusion.sql:7` already says `WITH SCHEMA public` for btree_gist; it is
    // repeated here so this script does not depend on that file continuing to say so.)
    await testClient.unsafe(`CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public`);
    await testClient.unsafe(`CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public`);
    const ext = await testClient`
      SELECT e.extname, n.nspname
      FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE e.extname IN ('postgis', 'btree_gist')
      ORDER BY e.extname`;
    for (const row of ext) {
      console.info(`[db:test:setup] extension ${row.extname} -> schema ${row.nspname}`);
    }

    // ---- 4. Sweep leftover `test_%` schemas from crashed runs --------------------------------
    // These accumulate whenever a worker dies before teardownTestDb() runs. Deliberately confined to
    // this explicit, developer-invoked script and NOT placed in globalSetup: a second concurrent
    // vitest process would have its LIVE schemas dropped out from under it.
    //
    // BELT AND BRACES: re-assert the `_test` invariant immediately before destructive DDL. The
    // shared module already guarantees it above, but every destructive statement in this repo gets
    // the guard twice — this loop issues DROP SCHEMA … CASCADE.
    assertTestDatabase(testUrl, "the DROP SCHEMA target");
    const stale = await testClient<{ nspname: string }[]>`
      SELECT nspname FROM pg_namespace WHERE nspname LIKE 'test\\_%' ORDER BY nspname`;
    if (stale.length === 0) {
      console.info(`[db:test:setup] no leftover test_% schemas — no change.`);
    } else {
      for (const row of stale) {
        await testClient.unsafe(`DROP SCHEMA IF EXISTS ${quoteIdent(row.nspname)} CASCADE`);
      }
      console.info(`[db:test:setup] dropped ${stale.length} leftover test_% schema(s).`);
    }
  } finally {
    await testClient.end();
  }

  // ---- 5. Replay the migrations into the test database's `public` (DEC-1) ----------------------
  // The test database's `public` schema IS migrated on purpose. The alternative — leave it empty so
  // a stray write fails — buys containment at the price of NO SIGNAL AT ALL, because recordAudit
  // swallows the insert failure by design (src/lib/audit.ts:111). A migrated `public` makes every
  // stray write land somewhere real, inspectable and truncatable, keeps non-swallowing singleton
  // consumers (the Better Auth Drizzle adapter, module-load-time server-action imports) working, and
  // lets tests/global-setup.ts's end-of-run report NAME the leaking code paths.
  //
  // Shelling out rather than calling the migrator in-process: this uses drizzle.config.ts's
  // documented shell-override-wins property (dotenv does not override an already-set var), and an
  // env object on execSync is portable across PowerShell and bash — unlike an inline `VAR=… cmd`
  // prefix in a package.json script, which PowerShell does not understand.
  console.info(`[db:test:setup] replaying migrations into ${testName}.public …`);
  execSync("npx drizzle-kit migrate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });

  console.info(`[db:test:setup] done. Test database URL: ${testUrl}`);
  console.info(`[db:test:setup] The vitest suite will use this AUTOMATICALLY — no env edit needed.`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
