// HVER-02 / D-206 / D-220 — the `host_verification` STORAGE CONTRACT, asserted against the database.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// MEASURED AGAINST THE DATABASE, NEVER AGAINST `tsc` (the tests/ops/alerts.test.ts case-14 header, and
// the same reason it gives)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// The row type comes from `src/lib/db/schema.ts`, so a column declared there but never migrated leaves
// the type checker and `next build` PERFECTLY GREEN while every integration test in the suite runs
// against a table that does not have it — and, in the direction this file actually cares about, a column
// added to the MIGRATION and not to `schema.ts` is invisible to `tsc` in both directions and can hold
// anything at all. Neither half of that is observable from the compiler. `table_schema` below is scoped
// to the isolated schema `tests/helpers/db.ts` replayed from `drizzle/*.sql` at `beforeAll`, so this
// asserts THE MIGRATION landed, not that somebody's dev database happens to look right.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY AN ALLOW-LIST, AND WHY SET EQUALITY RATHER THAN A SUBSET CHECK
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// FitOut is a PORT to a verification provider and NEVER a custodian of identity documents (D-206,
// ASVS V8). The contract is that NO COLUMN EXISTS, OR MAY EVER EXIST, FOR A DOCUMENT, AN ID NUMBER, OR
// AN IMAGE — and a contract stated only in a comment above the table is a promise, not a control.
//
// A DENY-LIST WOULD BE THE OBVIOUS SHAPE AND IT WOULD BE WRONG. Asserting that no column is named
// `document`, `id_number` or `image` passes cheerfully the day somebody picks a fourth word —
// `attachment_url`, `selfie`, `poi_scan`, `kyc_blob` — and the deny-list's greenness is then actively
// misleading, because it reads like the property was checked. `src/lib/profile.ts:44-52` is the shipped
// precedent for the choice and states it in one line: keep it an explicit allow-list "so adding a new
// private column to the user table does not silently leak it."
//
// So case 1 asserts SET EQUALITY (`toEqual` on a sorted array) — never a membership check and never a
// subset check. Any new column, named anything, reddens it, and reddening is the correct outcome:
// adding a column to this table is a decision that must be argued rather than merged.
//
// (The membership matcher is deliberately not NAMED in this header. The phase greps for it as an
// acceptance check on this very file, and prose that spelled it would trip a gate about its own absence
// — drizzle/0021's rule, applied one directory over.)
//
// The other two cases pin the shape the contract depends on:
//   - case 2 — the table is 1:1 to `user` AND FKs NOTHING ELSE. `decided_by_staff_id` deliberately
//     carries no `.references()` (the `audit.actor_id` precedent): a decision record must never
//     cascade-delete with the staff member who made it, nor 23503-block their deletion.
//   - case 3 — `vendor_ref`, `result` and `checked_at` are all NULLABLE, because the states the table
//     must be able to represent include ones where they are genuinely absent: a `pending` row has no
//     result yet, the manual provider (D-206) has no vendor reference at all, and a `grandfathered` row
//     MUST carry `checked_at` NULL forever, since writing a timestamp for a check that never happened
//     would fabricate an audit record (T-18-0202).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// MUTATION, RUN AND SCORED (2026-08-31) — the document column, and which case speaks
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// The file is green against the shipped migration; that proves the cases pass, not that any of them
// would NOTICE the defect they exist for. So the defect was installed: a scratch statement appended to
// the replay adding `document_url text` to `host_verification`, nothing else touched.
//
//     × case 1 — the EXACT column set is the D-220 allow-list, and nothing else
//     AssertionError: expected [ 'checked_at', 'created_at', …(9) ] to deeply equal
//                              [ 'checked_at', 'created_at', …(8) ]
//     - Expected
//     + Received
//       [
//         "checked_at",
//         "created_at",
//         "decided_by_staff_id",
//     +   "document_url",
//         "provider",
//         "reason",
//         "result",
//         "status",
//         "updated_at",
//           Tests  1 failed | 2 passed (3)
//
// Cases 2 and 3 stayed GREEN — a `document_url text` column adds no foreign key and changes nothing
// about the nullability of the three columns they name. That is the finding rather than a footnote:
// only the set-equality assertion can see this, which is exactly why it is set equality.
// Reverted; 3 passed.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";

let testDb: TestDb;

beforeAll(async () => {
  testDb = await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

/**
 * D-220, spelled out ONCE and sorted, because the assertion is equality against THIS and nothing else.
 *
 * `status, provider, vendor_ref, result, checked_at, decided_by_staff_id, reason` + the two timestamps
 * + the `user_id` primary key that IS the foreign key. Nothing for a document, an ID number or an image
 * — and no room for one, because the assertion is not a subset check.
 */
const ALLOWED_COLUMNS = [
  "checked_at",
  "created_at",
  "decided_by_staff_id",
  "provider",
  "reason",
  "result",
  "status",
  "updated_at",
  "user_id",
  "vendor_ref",
].sort();

describe("host_verification — the storage contract (HVER-02 / D-206 / D-220)", () => {
  it("case 1 — the EXACT column set is the D-220 allow-list, and nothing else", async () => {
    const rows = (await testDb.db.execute(sql`
      SELECT column_name AS "columnName"
      FROM information_schema.columns
      WHERE table_schema = ${testDb.schema}
        AND table_name = 'host_verification'
    `)) as unknown as { columnName: string }[];

    // THE POSITIVE HALF FIRST, and it is deliberately weak. If the table were missing entirely, or the
    // schema name were wrong, the query returns zero rows — and a prohibition-shaped assertion over an
    // empty set passes vacuously. This one line separates "the table is gone" from "somebody added a
    // column", and it is `toBeGreaterThan(0)` rather than an exact count ON PURPOSE: an exact count would
    // fire FIRST on the mutation and report `expected 11 to be 10`, hiding the column NAME that is the
    // entire diagnostic. Measured while writing this file — see the mutation record in the header.
    expect(rows.length).toBeGreaterThan(0);

    const actual = rows.map((r) => r.columnName).sort();
    expect(actual).toEqual(ALLOWED_COLUMNS);
  });

  it("case 2 — 1:1 to `user`, and the table carries no other foreign key", async () => {
    const fks = (await testDb.db.execute(sql`
      SELECT
        c.conname            AS "name",
        confrelid::regclass::text AS "referenced"
      FROM pg_constraint c
      WHERE c.contype = 'f'
        AND c.conrelid = ${`"${testDb.schema}".host_verification`}::regclass
    `)) as unknown as { name: string; referenced: string }[];

    // EXACTLY ONE, and it points at `user`. The count is the assertion, not the membership: a second FK
    // is how `decided_by_staff_id` would quietly acquire a `.references()` and start 23503-blocking the
    // deletion of a staff account — the failure mode `audit.actor_id` avoids by construction.
    expect(fks).toHaveLength(1);
    expect(fks[0].referenced).toMatch(/"?user"?$/);

    // And the 1:1 half: the primary key IS `user_id`, so a user can hold at most one verification row.
    const pk = (await testDb.db.execute(sql`
      SELECT a.attname AS "columnName"
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
      WHERE c.contype = 'p'
        AND c.conrelid = ${`"${testDb.schema}".host_verification`}::regclass
    `)) as unknown as { columnName: string }[];

    expect(pk.map((r) => r.columnName)).toEqual(["user_id"]);
  });

  it("case 3 — vendor_ref, result and checked_at are NULLABLE; status/provider are NOT", async () => {
    const rows = (await testDb.db.execute(sql`
      SELECT column_name AS "columnName", is_nullable AS "isNullable", data_type AS "dataType"
      FROM information_schema.columns
      WHERE table_schema = ${testDb.schema}
        AND table_name = 'host_verification'
    `)) as unknown as { columnName: string; isNullable: string; dataType: string }[];

    const by = Object.fromEntries(rows.map((r) => [r.columnName, r]));

    // NULLABLE, and each for a state the table has to be able to represent honestly:
    //   vendor_ref — the manual provider (D-206) has no vendor reference at all
    //   result     — a row still in `pending` has no verdict yet
    //   checked_at — a `grandfathered` row must carry NULL forever (T-18-0202)
    expect(by["vendor_ref"].isNullable).toBe("YES");
    expect(by["result"].isNullable).toBe("YES");
    expect(by["checked_at"].isNullable).toBe("YES");
    expect(by["checked_at"].dataType).toBe("timestamp with time zone");

    // NOT NULL, because a row that cannot say what it is or who answered is not a record of anything.
    expect(by["status"].isNullable).toBe("NO");
    expect(by["provider"].isNullable).toBe("NO");

    // `status` is the enum, not free text — the gate reads it and Postgres is what stops a typo.
    expect(by["status"].dataType).toBe("USER-DEFINED");
  });
});
