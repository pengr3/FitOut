// Vitest `globalSetup` — runs ONCE in the main vitest process, around the whole suite.
//
// It does two things, and they are two halves of one idea:
//
//   setup()    PREFLIGHT the suite's dedicated database, then TRUNCATE it, so each run's leak
//              report below measures THAT RUN and not the accumulation of every run since the
//              database was created.
//   teardown() COUNT what is in it afterwards and, if anything is, say so LOUDLY. Those rows are
//              writes that escaped `tests/helpers/db.ts`'s per-file schema isolation through the
//              app's module-level db singleton (`src/lib/db/index.ts`) and, before the suite got
//              its own database, would have landed in DEV.
//
// CONTAINMENT IS PROVEN BY RELOCATION, NOT BY SILENCE. `recordAudit` swallows its INSERT failure on
// purpose (src/lib/audit.ts:111 — a throw there breaks the PayMongo webhook's 200-ACK path), so
// "point the suite at an empty database and let the stray writes fail" would produce no signal at
// all and be indistinguishable from a broken connection. Instead the test database's `public` IS
// migrated (DEC-1), every stray write lands somewhere real, and this file names it.
//
// globalSetup does NOT inherit `setupFiles` — it runs in the main process, before the workers — so
// it must load dotenv and resolve the URL itself rather than reading what tests/setup.ts forces.

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import postgres from "postgres";
import { assertTestDatabase, testDatabaseUrl } from "./helpers/test-db-url";

// PostGIS reference data (~8k rows), created by `CREATE EXTENSION postgis` and never written by the
// app. TRUNCATEing it is a corruption of the extension, not a cleanup — and it would silently break
// every geography/geometry query in the suite. Excluded from both the truncate and the leak count.
const EXCLUDED_TABLES = new Set(["spatial_ref_sys"]);

type Client = ReturnType<typeof postgres>;

function quoteIdent(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

function resolveUrl(): string {
  loadEnv({ path: resolve(process.cwd(), ".env.local") });
  loadEnv({ path: resolve(process.cwd(), ".env") });
  return testDatabaseUrl();
}

/** Base tables in `public` that the leak surface consists of. Excludes PostGIS reference data. */
async function leakTables(client: Client): Promise<string[]> {
  const rows = await client<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name`;
  return rows.map((r) => r.table_name).filter((t) => !EXCLUDED_TABLES.has(t));
}

export async function setup(): Promise<void> {
  const url = resolveUrl();
  const client = postgres(url, { max: 1, onnotice: () => {} });

  try {
    // ---- PREFLIGHT -------------------------------------------------------------------------
    // THE ONE PLACE A HARD FAILURE IS CORRECT. Without it, an unprovisioned database makes all 85
    // setupTestDb() files fail individually with a cryptic per-file error and no instruction. Here
    // it fails once, up front, naming the URL and the command that fixes it.
    let tables: string[];
    try {
      tables = await leakTables(client);
    } catch (err: unknown) {
      throw new Error(
        `[test-db] cannot reach the test database.\n` +
          `  URL:   ${url}\n` +
          `  Cause: ${err instanceof Error ? err.message : String(err)}\n` +
          `  Fix:   start Postgres (npm run db:up), then provision it: npm run db:test:setup`,
      );
    }
    if (!tables.includes("audit")) {
      throw new Error(
        `[test-db] the test database exists but its public schema is not migrated ` +
          `(no "audit" table; found ${tables.length} base table(s)).\n` +
          `  URL: ${url}\n` +
          `  Fix: npm run db:test:setup`,
      );
    }

    // ---- TRUNCATE --------------------------------------------------------------------------
    // BELT AND BRACES. testDatabaseUrl() already threw above unless this name ends in `_test`, but
    // this is the single statement in the repo with catastrophic blast radius: a `TEST_DATABASE_URL`
    // fat-fingered to `…/fitout` would destroy the dev database. It gets the guard twice.
    const dbName = assertTestDatabase(url, "the TRUNCATE target");

    const list = tables.map((t) => `public.${quoteIdent(t)}`).join(", ");
    await client.unsafe(`TRUNCATE TABLE ${list} CASCADE`);
    console.info(
      `[test-db] using ${dbName} — truncated ${tables.length} table(s) in public so this run's ` +
        `leak report is per-run.`,
    );
  } finally {
    await client.end();
  }
}

export async function teardown(): Promise<void> {
  // REPORTS, NEVER THROWS. Two reasons. (1) `notify` and `guest-email` rows are EXPECTED to appear
  // every run — fixing them at source means threading a DbConn through 57 awaited money-path call
  // sites, which was explicitly declined — so failing on them would leave the suite permanently red
  // and the signal would be ignored within a week. (2) A reporting bug must never be able to turn a
  // green suite red, hence the outer try/catch.
  try {
    const url = resolveUrl();
    const client = postgres(url, { max: 1, onnotice: () => {} });
    try {
      const tables = await leakTables(client);
      const nonEmpty: { table: string; rows: number }[] = [];
      for (const table of tables) {
        const r = await client.unsafe<{ n: number }[]>(
          `SELECT count(*)::int AS n FROM public.${quoteIdent(table)}`,
        );
        if (r[0].n > 0) nonEmpty.push({ table, rows: r[0].n });
      }

      if (nonEmpty.length === 0) {
        console.info(`[test-db] clean: no writes escaped the per-file schema isolation this run.`);
        return;
      }

      const lines: string[] = [
        ``,
        `┏━━ [test-db] LEAKED WRITES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `┃ ${nonEmpty.reduce((s, x) => s + x.rows, 0)} row(s) landed in the test database's PUBLIC schema this run:`,
      ];
      for (const { table, rows } of nonEmpty) {
        lines.push(`┃   public.${table.padEnd(28)} ${rows} row(s)`);
        if (table === "audit") {
          const actions = await client<{ action: string; n: number }[]>`
            SELECT action, count(*)::int AS n FROM public.audit GROUP BY action ORDER BY action`;
          for (const a of actions) {
            lines.push(`┃       action=${a.action.padEnd(24)} ${a.n}`);
          }
        }
      }
      lines.push(
        `┃`,
        `┃ These bypassed tests/helpers/db.ts's per-file schema isolation via the app's`,
        `┃ module-level db singleton (src/lib/db/index.ts), which is bound to \`public\`.`,
        `┃ BEFORE the suite got its own database they landed in DEV — and since the daily`,
        `┃ 08:50 Manila ops digest emails unresolved needs_attention rows to a human, they`,
        `┃ became daily mail about money that does not exist.`,
        `┃`,
        `┃ They are CONTAINED, not fixed: recordAudit still writes through the singleton,`,
        `┃ it just can no longer reach dev. To fix at source, thread a DbConn through the`,
        `┃ calling path (or vi.doMock("@/lib/db", …) in the offending test file).`,
        `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        ``,
      );
      console.warn(lines.join("\n"));
    } finally {
      await client.end();
    }
  } catch (err: unknown) {
    console.warn(
      `[test-db] leak report could not run (the suite result is unaffected): ` +
        (err instanceof Error ? err.message : String(err)),
    );
  }
}
