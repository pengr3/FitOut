// Integration-test DB strategy.
//
// Goal (threat T-01-04): integration tests must NOT corrupt dev data. We isolate them
// to a dedicated Postgres SCHEMA ("test") inside the same local postgis/postgis:18
// database, rather than the default "public" schema the app uses in dev.
//
// Strategy:
//   - setupTestDb() drops and recreates the isolated schema (clean slate per run),
//     sets the connection's search_path to it, and applies ALL migrations that exist
//     in ./drizzle at test time.
//   - Phase 1 has NO migrations yet (schema.ts is a placeholder). Plan 02 generates the
//     Better Auth migration via `drizzle-kit generate`; THIS HELPER then applies it here
//     automatically — no edit needed once Plan 02 lands. (migrations are applied here;
//     Plan 02 generates the auth migration.)
//   - teardownTestDb() drops the schema and closes the connection.
//
// Why a schema (not a separate database): postgres.js + drizzle connect via one URL;
// a schema swap is a single `SET search_path` and needs no extra DB provisioning, while
// still giving full isolation from dev's public schema.

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const TEST_SCHEMA = "test";
const MIGRATIONS_DIR = resolve(process.cwd(), "drizzle");

function baseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    "postgresql://fitout:fitout@localhost:5432/fitout"
  );
}

/**
 * Build a postgres.js client whose every connection uses the isolated test schema
 * as its primary search_path (falling back to public for shared extensions/types).
 */
function makeClient() {
  return postgres(baseUrl(), {
    max: 1,
    onnotice: () => {},
    connection: { search_path: `${TEST_SCHEMA},public` },
  });
}

export type TestDb = {
  db: ReturnType<typeof drizzle>;
  client: ReturnType<typeof postgres>;
};

/** True if there is at least one generated migration to apply. */
function hasMigrations(): boolean {
  if (!existsSync(MIGRATIONS_DIR)) return false;
  return readdirSync(MIGRATIONS_DIR).some((f) => f.endsWith(".sql"));
}

/**
 * Reset the isolated test schema and apply all generated migrations against it.
 * Returns a Drizzle db instance bound to the test schema. Call once per integration
 * test file (e.g. in beforeAll).
 */
export async function setupTestDb(): Promise<TestDb> {
  // Use a bootstrap client (public schema) to (re)create the test schema cleanly.
  const bootstrap = postgres(baseUrl(), { max: 1, onnotice: () => {} });
  await bootstrap.unsafe(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);
  await bootstrap.unsafe(`CREATE SCHEMA ${TEST_SCHEMA}`);
  await bootstrap.end();

  const client = makeClient();
  const db = drizzle(client);

  // Ensure new objects land in the test schema during migration.
  await db.execute(sql.raw(`SET search_path TO ${TEST_SCHEMA}, public`));

  // Apply migrations if any exist. Phase 1 has none yet; Plan 02 onward will.
  if (hasMigrations()) {
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  }

  return { db, client };
}

/** Drop the isolated schema and close the connection. */
export async function teardownTestDb(testDb: TestDb): Promise<void> {
  await testDb.client.unsafe(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);
  await testDb.client.end();
}
