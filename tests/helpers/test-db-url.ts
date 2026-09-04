// THE SINGLE SOURCE OF TRUTH FOR WHICH DATABASE THE TEST SUITE TALKS TO.
//
// WHY THIS MODULE EXISTS. The app's db handle (`src/lib/db/index.ts`) is a MODULE-LEVEL singleton —
// `drizzle(postgres(process.env.DATABASE_URL!))`, evaluated at import time on the connection's default
// `search_path` (= `public`). It therefore bypasses `tests/helpers/db.ts`'s per-file schema isolation
// entirely. Any test that exercises a code path calling `recordAudit` (src/lib/audit.ts) without
// `vi.doMock("@/lib/db", …)` wrote a real row straight into the DEV database's `public.audit`; the
// insert's failure is swallowed on purpose (src/lib/audit.ts:111) so this was silent. That set — the
// gap between the 44 files that doMock and the 85 that call setupTestDb() — is not enumerable, so
// containment has to happen at the DATABASE layer, not per test file. Hence: the suite gets its own
// database, `fitout_test`, provisioned by `npm run db:test:setup`.
//
// WHY THE `_test` SUFFIX IS A HARD INVARIANT AND NOT A CONVENTION. `tests/global-setup.ts` issues a
// `TRUNCATE` across every base table in the target database's `public` schema on every run. A
// `TEST_DATABASE_URL` fat-fingered to `…/fitout` would therefore destroy the dev database. The
// resolution below THROWS unless the resolved database name ends in `_test`. It lives here, in the
// shared module, so all three consumers (tests/setup.ts, tests/global-setup.ts,
// scripts/db-test-setup.ts) inherit it and none can opt out. It fails CLOSED: a URL this module
// cannot confidently parse is rejected rather than passed through. Over-rejecting a weird URL is the
// correct error; accepting a non-`_test` target is not.
//
// Consumed by: tests/setup.ts (forcing DATABASE_URL for every test file), tests/global-setup.ts
// (preflight + truncate + leak report), tests/helpers/db.ts (baseUrl), scripts/db-test-setup.ts.
// NOT consumed by drizzle.config.ts, scripts/seed.ts or e2e/** — those target DEV by design.

/** Suffix every database this suite is permitted to connect to must carry. See header. */
export const TEST_DB_SUFFIX = "_test";

/**
 * The DEV database URL the suite derives from. Same deterministic local-Docker literal the repo
 * already standardised on (drizzle.config.ts:29, scripts/seed.ts:17), so a fresh clone with no env
 * file still points at `npm run db:up`'s Postgres.
 */
export function baseDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";
}

function parseUrl(raw: string, label: string): URL {
  try {
    return new URL(raw);
  } catch {
    throw new Error(
      `[test-db-url] ${label} is not a parseable URL: ${JSON.stringify(raw)}. ` +
        `Expected something like postgresql://user:pass@host:5432/fitout${TEST_DB_SUFFIX}`,
    );
  }
}

/**
 * The database name a Postgres URL points at — i.e. its single path segment. Fails closed: an empty
 * path, or a path with more than one segment, is rejected rather than guessed at.
 */
export function databaseNameOf(raw: string, label = "url"): string {
  const url = parseUrl(raw, label);
  const path = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  if (path === "" || path.includes("/")) {
    throw new Error(
      `[test-db-url] ${label} does not name exactly one database (pathname ${JSON.stringify(url.pathname)}): ` +
        JSON.stringify(raw),
    );
  }
  try {
    return decodeURIComponent(path);
  } catch {
    throw new Error(`[test-db-url] ${label} has an undecodable database name: ${JSON.stringify(path)}`);
  }
}

/**
 * THE GUARD. Throws unless `raw` names a database whose name ends in `_test`. Returns the database
 * name so callers can log it. Re-assert this immediately before ANY destructive statement — the
 * shared module already guarantees it, but destructive DDL gets the guard twice, everywhere.
 */
export function assertTestDatabase(raw: string, context = "the test database URL"): string {
  const name = databaseNameOf(raw, context);
  if (!name.endsWith(TEST_DB_SUFFIX)) {
    throw new Error(
      `[test-db-url] REFUSING to use database ${JSON.stringify(name)} as ${context}: its name does not ` +
        `end in "${TEST_DB_SUFFIX}".\n` +
        `  Resolved from: ${raw}\n` +
        `  The test suite TRUNCATEs every table in this database's public schema on every run, so it is ` +
        `only ever permitted to point at a "${TEST_DB_SUFFIX}"-suffixed database.\n` +
        `  Fix TEST_DATABASE_URL (or unset it to derive "<dev db>${TEST_DB_SUFFIX}" automatically).`,
    );
  }
  return name;
}

/** Rewrite only the database name of `raw` to `<name>_test`, preserving userinfo, port and query. */
function deriveTestUrl(raw: string): string {
  const url = parseUrl(raw, "DATABASE_URL");
  const name = databaseNameOf(raw, "DATABASE_URL");
  if (name.endsWith(TEST_DB_SUFFIX)) return url.toString();
  url.pathname = `/${encodeURIComponent(`${name}${TEST_DB_SUFFIX}`)}`;
  return url.toString();
}

/**
 * The database the vitest suite uses. Precedence (DEC-2):
 *   1. `TEST_DATABASE_URL`, when set — the deliberate escape hatch.
 *   2. otherwise `baseDatabaseUrl()` with its database name rewritten to `<name>_test`.
 *
 * Either way the result must satisfy `assertTestDatabase`. Note the suite's assignment in
 * tests/setup.ts is FORCING: a shell `DATABASE_URL` steers what this DERIVES FROM, but no longer
 * steers where the suite writes. Provision the result with `npm run db:test:setup`.
 */
export function testDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL?.trim();
  const resolved = explicit ? explicit : deriveTestUrl(baseDatabaseUrl());
  assertTestDatabase(resolved, explicit ? "TEST_DATABASE_URL" : "the derived test database URL");
  return resolved;
}
