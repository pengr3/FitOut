// Integration-test DB strategy.
//
// Goal (threat T-01-04): integration tests must NOT corrupt dev data. We isolate them to a
// dedicated Postgres SCHEMA inside the same local postgis/postgis:18 database, rather than the
// default "public" schema the app uses in dev.
//
// Strategy:
//   - Vitest runs test files in PARALLEL worker threads. Each setupTestDb() therefore creates
//     its OWN uniquely-named schema (test_<worker>_<counter>) so concurrent files never share
//     state or race on `CREATE SCHEMA`.
//   - It applies every ./drizzle migration to that schema by reading the SQL and rewriting the
//     dialect-default `"public".` qualifier to the isolated schema. We apply the SQL DIRECTLY
//     (not via Drizzle's migrator) because the migrator's journal lives in a shared `drizzle`
//     schema — once a migration is applied to dev it would be skipped for the test schema, and
//     the migration's hardcoded `REFERENCES "public"."user"` FKs would point cross-schema at the
//     dev tables. Rewriting `public.` -> the test schema keeps every table + FK self-contained.
//   - teardownTestDb() drops the schema and closes the connection.
//
// WHY A SCHEMA **AND** A SEPARATE DATABASE — T-01-04 IS NOW DEFENDED AT TWO LAYERS, NOT ONE.
// This paragraph used to argue that a schema swap was sufficient because it "needs no extra DB
// provisioning". That was wrong in a way that showed up as real rows in the DEV database.
//
//   - The SCHEMA layer (this file) stays, and its job is unchanged: PER-FILE isolation, so parallel
//     Vitest workers never share state or race on CREATE SCHEMA.
//   - The DATABASE layer was added ON TOP because a schema swap only isolates code that goes through
//     THIS helper's connection — and the app's own db handle does not. `src/lib/db/index.ts` is a
//     module-level singleton (`drizzle(postgres(DATABASE_URL))`) evaluated at import time on the
//     default `search_path` (= `public`), so it wrote straight past this isolation. Every
//     `npx vitest run` deposited a real `notify` + `guest-email` `needs_attention` row into dev's
//     `public.audit` (deferred item D1), silently, because recordAudit swallows the insert failure
//     by design (src/lib/audit.ts:111).
//
// So `tests/setup.ts` now forces DATABASE_URL onto a dedicated `fitout_test` database
// (tests/helpers/test-db-url.ts; provision with `npm run db:test:setup`), and this helper carves its
// per-file schemas inside THAT database. Stray singleton writes land in `fitout_test.public`, where
// tests/global-setup.ts truncates them at the start of each run and names them loudly at the end.

import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { testDatabaseUrl } from "./test-db-url";

const MIGRATIONS_DIR = resolve(process.cwd(), "drizzle");

// Unique-per-call schema name so parallel Vitest workers don't collide or share state.
let counter = 0;
function nextSchemaName(): string {
  const worker = process.env.VITEST_WORKER_ID ?? process.env.VITEST_POOL_ID ?? "0";
  // pid + worker + counter guarantees uniqueness across processes, workers, and files.
  return `test_${process.pid}_${worker}_${counter++}`.replace(/[^a-z0-9_]/gi, "_");
}

// Delegates to the shared module rather than carrying its own copy of the dev URL literal. That
// copy was a live hazard, not just duplication: whenever this helper ran outside `setupFiles` (any
// direct `tsx`/script import, where nothing forces DATABASE_URL) it silently created and dropped
// `test_%` schemas in the DEV database — which is exactly how dev came to hold an orphan test schema
// from a crashed run. Going through testDatabaseUrl() means the `_test` suffix invariant now binds
// the schema layer too, and cannot be opted out of.
function baseUrl(): string {
  return testDatabaseUrl();
}

/** Build a postgres.js client whose connections default to the given isolated schema. */
function makeClient(schema: string) {
  return postgres(baseUrl(), {
    max: 1,
    onnotice: () => {},
    connection: { search_path: `${schema},public` },
  });
}

/**
 * Open `n` INDEPENDENT postgres.js connections bound to one isolated test schema. Unlike the
 * shared max:1 `makeClient`, these can fire genuinely concurrent inserts so the SC#4 exclusion
 * race is real (RESEARCH Pitfall 1 — a single max:1 client serializes and proves nothing). Each
 * client has its own pool → separate backend connections → true concurrency. Caller must
 * `.end()` each when done.
 */
export function makeRacingClients(schema: string, n: number) {
  return Array.from({ length: n }, () =>
    postgres(baseUrl(), {
      max: 1,
      onnotice: () => {},
      connection: { search_path: `${schema},public` },
    }),
  );
}

export type TestDb = {
  db: ReturnType<typeof drizzle>;
  client: ReturnType<typeof postgres>;
  schema: string;
};

/** Ordered list of generated migration SQL files (e.g. drizzle/0000_*.sql). */
function migrationFiles(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/**
 * Reset an isolated test schema and apply all generated migrations against it. Returns a
 * Drizzle db instance bound to that schema. Call once per integration test file (beforeAll).
 */
export async function setupTestDb(): Promise<TestDb> {
  const schema = nextSchemaName();

  // Bootstrap client (public schema) to (re)create the isolated schema cleanly.
  const bootstrap = postgres(baseUrl(), { max: 1, onnotice: () => {} });
  await bootstrap.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await bootstrap.unsafe(`CREATE SCHEMA "${schema}"`);

  // Apply each migration's SQL directly, rewriting the dialect-default `"public".` qualifier
  // to the isolated schema so every CREATE TABLE and FK stays self-contained within it.
  for (const file of migrationFiles()) {
    const raw = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
    const rewritten = raw.replaceAll('"public".', `"${schema}".`);
    // drizzle-kit separates statements with the `--> statement-breakpoint` marker.
    const statements = rewritten
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) {
      // Run with the isolated schema first on the search_path so unqualified objects land there.
      await bootstrap.unsafe(`SET search_path TO "${schema}", public; ${statement}`);
    }
  }
  await bootstrap.end();

  const client = makeClient(schema);
  const db = drizzle(client);
  await db.execute(sql.raw(`SET search_path TO "${schema}", public`));

  return { db, client, schema };
}

/** Drop the isolated schema and close the connection. */
export async function teardownTestDb(testDb: TestDb): Promise<void> {
  await testDb.client.unsafe(`DROP SCHEMA IF EXISTS "${testDb.schema}" CASCADE`);
  await testDb.client.end();
}
