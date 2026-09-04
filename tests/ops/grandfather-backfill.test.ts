// LVER-04 / D-207 / D-211 / D-240 — the grandfather backfill, measured by EXECUTING THE STATEMENTS
// THAT ARE ACTUALLY IN THE MIGRATION FILE.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE READS SQL OFF DISK INSTEAD OF ASSERTING AGAINST THE REPLAYED SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// `setupTestDb()` replays every `drizzle/*.sql` into an EMPTY isolated schema. At the moment
// drizzle/0026's two grandfather statements run, `listing` has ZERO rows — so THE BACKFILL IS A NO-OP
// IN ALL 194 TEST FILES IN THIS REPOSITORY, this one included. A test that seeded listings and then
// asserted their `review_state` against the live test database would be asserting against the column
// DEFAULT and against nothing else: it would pass just as happily if the two statements were deleted
// from the migration outright. Green, and worth nothing.
//
// So the statements are read out of `drizzle/0026_host_verification_listing_review.sql` with
// `readFileSync` and executed by hand, AFTER the fixtures exist. Reading rather than retyping is the
// whole point: a retyped copy measures the copy. `tests/design/cloudinary-preset-script.test.ts:395-415`
// is the shipped precedent for reading a source artefact into an assertion, and it states the failure
// mode this avoids — "a SECOND COPY of the value, wearing the costume of a consistency tool".
//
// The extractor below is deliberately anchored on the statements' opening tokens and asserts it found
// exactly one of each. If somebody rewrites the backfill into a different shape, this file goes RED at
// extraction rather than passing vacuously against nothing — the same both-directions discipline
// `tests/helpers/source-text.ts` argues for.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THE CASES MEASURE, AND WHY THE OBVIOUS ONE IS NOT ENOUGH
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   - case 1 is the D-240 SCOPE, row by row. `published` → 'grandfathered'; `draft` → 'pending';
//     `unlisted` → 'pending'; a SOFT-DELETED published row → 'pending'. The three negatives are the
//     content of the decision: drizzle/0017's `ADD COLUMN ... DEFAULT NOT NULL` shape would have
//     grandfathered every one of them by construction, granting review-free standing to listings that
//     were never live. A case that only checked the published row would stay green under that shape.
//
//   - case 2 is the HOST side, on the same predicate — including the negative that matters most: a host
//     who owns ONLY a draft gets NO `host_verification` ROW AT ALL, which `deriveBookable` reads as
//     'unverified'. Fail closed; never verified by absence.
//
//   - case 3 is T-18-0202. A grandfathered row carries `checked_at` NULL and `provider = 'migration'`,
//     because nothing was checked. Writing a timestamp for a check that never happened would fabricate
//     an audit record — the drizzle/0025 `resolved_by` principle. And `status` is 'grandfathered', never
//     'approved' (D-211): the state stays first-class and distinct so a future PM burns the backlog down
//     with one statement, and so the badge (D-212, 'approved' only) never claims a check FitOut did not do.
//
//   - case 4 is IDEMPOTENCE. Both statements run a second time and the outcome must be identical.
//
//   - case 5 is T-18-0205, and it is the one an eyeball review would miss. A row hand-set to 'approved'
//     and a row hand-set to 'rejected' must survive a re-run UNMOVED. That property lives entirely in
//     the UPDATE's third predicate (`AND "review_state" = 'pending'`) and in the INSERT's
//     `ON CONFLICT DO NOTHING`; case 4 alone would stay green with both removed, because a re-run over
//     rows that are all still 'grandfathered' or all still 'pending' looks identical either way.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TWO MUTATIONS, RUN AND SCORED (2026-08-31) — and each is seen by EXACTLY ONE case
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// The file is green against the shipped migration. That proves the cases pass, not that any of them
// would NOTICE the defect they exist for. So both halves of the UPDATE's WHERE were removed in turn, in
// a scratch copy of drizzle/0026, with nothing else touched.
//
// MUTATION 1 — `AND "status" = 'published'` deleted. The exact defect D-240 exists to prevent: this is
// drizzle/0017's DEFAULT-only shape by another route, and it grandfathers drafts.
//
//     × case 1 — published is grandfathered; draft, unlisted and soft-deleted published all stay pending
//       AssertionError: expected 'grandfathered' to be 'pending' // Object.is equality
//       Expected: "pending"
//       Received: "grandfathered"
//         ❯ expect(byId["l_draft"]).toBe("pending")
//           Tests  1 failed | 4 passed (5)
//
// MUTATION 2 — `AND "review_state" = 'pending'` deleted. The re-runnability guard: without it, the
// backfill re-grandfathers a listing an operator has since approved or rejected (T-18-0205).
//
//     × case 5 — a re-run can never move an already-decided row (T-18-0205)
//       AssertionError: expected 'grandfathered' to be 'approved' // Object.is equality
//       Expected: "approved"
//       Received: "grandfathered"
//           Tests  1 failed | 4 passed (5)
//
// FOUR OF FIVE CASES STAYED GREEN UNDER EACH, AND THAT IS THE FINDING RATHER THAN A FOOTNOTE. Case 2
// cannot see either mutation because the host side reads its predicate off the INSERT, which neither
// mutation touched. Case 3 cannot, because the provenance columns are unaffected by WHICH rows were
// selected. And CASE 4 — the idempotence case, the one that looks like it is about re-running — cannot
// see mutation 2 AT ALL: a re-run over rows that are uniformly 'grandfathered' or uniformly 'pending'
// produces an identical outcome whether the guard is there or not. Only case 5, which plants an
// 'approved' and a 'rejected' row FIRST, can. Both mutations reverted; 5 passed.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";

let testDb: TestDb;

const MIGRATION_PATH = "drizzle/0026_host_verification_listing_review.sql";

/**
 * Pull the two grandfather statements OUT OF THE MIGRATION FILE.
 *
 * Splits on drizzle-kit's `--> statement-breakpoint` marker (the same split `tests/helpers/db.ts` uses
 * to replay a migration), strips the leading `--` comment lines off each chunk, and picks the two by
 * their opening tokens. Asserts exactly one match each: a rewrite that changes the shape must make this
 * file RED at extraction, never silently reduce it to asserting nothing.
 */
function grandfatherStatements(): { update: string; insert: string } {
  const raw = readFileSync(resolve(process.cwd(), MIGRATION_PATH), "utf8");

  const statements = raw
    .split("--> statement-breakpoint")
    .map((chunk) =>
      chunk
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);

  const updates = statements.filter((s) => s.startsWith('UPDATE "listing" SET "review_state"'));
  const inserts = statements.filter((s) => s.startsWith('INSERT INTO "host_verification"'));

  // Both directions, so a bad path / a bad split / a renamed statement cannot make the cases vacuous.
  expect(statements.length).toBeGreaterThan(5);
  expect(updates).toHaveLength(1);
  expect(inserts).toHaveLength(1);

  return { update: updates[0], insert: inserts[0] };
}

/** Run the pair, in the order the migration runs them. */
async function runBackfill(): Promise<void> {
  const { update, insert } = grandfatherStatements();
  await testDb.db.execute(sql.raw(update));
  await testDb.db.execute(sql.raw(insert));
}

// Two hosts, four listings. `h_live` owns the published row (and the soft-deleted one, so the
// soft-delete cannot be the only thing keeping a host out of the backfill); `h_draft` owns ONLY a draft.
const HOST_LIVE = "gf_host_live";
const HOST_DRAFT = "gf_host_draft";

beforeAll(async () => {
  testDb = await setupTestDb();

  for (const [id, name] of [
    [HOST_LIVE, "Live Host"],
    [HOST_DRAFT, "Draft Host"],
  ]) {
    await testDb.db.execute(sql`
      INSERT INTO "user" ("id", "name", "email", "first_name", "can_host")
      VALUES (${id}, ${name}, ${`${id}@fitout.test`}, ${name}, true)
    `);
  }

  // published | draft | unlisted | soft-deleted published — the four states D-240 rules on.
  await testDb.db.execute(sql`
    INSERT INTO "listing" ("id", "host_id", "title", "status", "deleted_at") VALUES
      ('l_published', ${HOST_LIVE},  'Live court',        'published', NULL),
      ('l_deleted',   ${HOST_LIVE},  'Removed court',     'published', now()),
      ('l_draft',     ${HOST_DRAFT}, 'Half-written gym',  'draft',     NULL),
      ('l_unlisted',  ${HOST_DRAFT}, 'Paused studio',     'unlisted',  NULL)
  `);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

/**
 * UNDO THE HARNESS'S EMPTY-SCHEMA REPLAY before every case.
 *
 * The migration already ran (against zero rows) when `setupTestDb()` replayed it, and the fixtures were
 * inserted afterwards — so every listing is sitting on the column DEFAULT, which is exactly the state a
 * production database is in the instant before the backfill runs. This reset makes that explicit rather
 * than incidental, and it is what lets case 5 plant `approved` / `rejected` rows and then put everything
 * back.
 */
beforeEach(async () => {
  await testDb.db.execute(sql`UPDATE "listing" SET "review_state" = 'pending'`);
  await testDb.db.execute(sql`DELETE FROM "host_verification"`);
});

async function reviewStates(): Promise<Record<string, string>> {
  const rows = (await testDb.db.execute(sql`
    SELECT "id", "review_state"::text AS "reviewState" FROM "listing"
  `)) as unknown as { id: string; reviewState: string }[];
  return Object.fromEntries(rows.map((r) => [r.id, r.reviewState]));
}

type HvRow = { userId: string; status: string; provider: string; checkedAt: Date | null };

async function verificationRows(): Promise<Record<string, HvRow>> {
  const rows = (await testDb.db.execute(sql`
    SELECT "user_id" AS "userId", "status"::text AS "status", "provider", "checked_at" AS "checkedAt"
    FROM "host_verification"
  `)) as unknown as HvRow[];
  return Object.fromEntries(rows.map((r) => [r.userId, r]));
}

describe("the D-240 grandfather backfill, read off drizzle/0026 and executed", () => {
  it("case 1 — published is grandfathered; draft, unlisted and soft-deleted published all stay pending", async () => {
    await runBackfill();
    const byId = await reviewStates();

    // The one thing that IS selling at migration time (D-207).
    expect(byId["l_published"]).toBe("grandfathered");

    // The three that are NOT, each a deliberate consequence of taking the drizzle/0014 shape over
    // drizzle/0017's (D-240). A draft that publishes later goes through review like any new listing; an
    // unlisted listing is checked if the host brings it back; a soft-deleted row is not selling at all.
    expect(byId["l_draft"]).toBe("pending");
    expect(byId["l_unlisted"]).toBe("pending");
    expect(byId["l_deleted"]).toBe("pending");
  });

  it("case 2 — the host who owns the published row is grandfathered; the draft-only host gets NO ROW", async () => {
    await runBackfill();
    const byHost = await verificationRows();

    expect(byHost[HOST_LIVE]).toBeDefined();
    expect(byHost[HOST_LIVE].status).toBe("grandfathered");

    // THE NEGATIVE IS THE POINT. No row at all — not a row saying 'unverified', not a row saying
    // anything. `deriveBookable` reads a missing row as unverified and refuses (fail closed), so absence
    // is never mistaken for a check that came back clean.
    expect(byHost[HOST_DRAFT]).toBeUndefined();

    // Exactly one row: the DISTINCT in the INSERT is what stops a host with several published listings
    // producing several rows (and colliding on the primary key).
    expect(Object.keys(byHost)).toEqual([HOST_LIVE]);
  });

  it("case 3 — a grandfathered row records that NOTHING was checked (T-18-0202 / D-211)", async () => {
    await runBackfill();
    const row = (await verificationRows())[HOST_LIVE];

    // NULL, and it must stay NULL. A timestamp here would assert that FitOut checked this host's
    // identity on the day of the migration. It did not. That is a fabricated audit record, and it is the
    // same principle drizzle/0025 applied to `resolved_by`.
    expect(row.checkedAt).toBeNull();

    // 'migration' — the provenance of a row no provider produced.
    expect(row.provider).toBe("migration");

    // FIRST-CLASS AND DISTINCT (D-211). Never 'approved': collapsing the two would make the one-statement
    // backlog burn-down unwritable and would let the verification badge (D-212, 'approved' only) claim a
    // check that never happened.
    expect(row.status).toBe("grandfathered");
    expect(row.status).not.toBe("approved");
  });

  it("case 4 — running both statements a SECOND time changes nothing", async () => {
    await runBackfill();
    const listingsAfterFirst = await reviewStates();
    const hostsAfterFirst = await verificationRows();

    await runBackfill();

    expect(await reviewStates()).toEqual(listingsAfterFirst);

    const hostsAfterSecond = await verificationRows();
    expect(Object.keys(hostsAfterSecond)).toEqual(Object.keys(hostsAfterFirst));
    expect(hostsAfterSecond[HOST_LIVE].status).toBe(hostsAfterFirst[HOST_LIVE].status);
    expect(hostsAfterSecond[HOST_LIVE].provider).toBe(hostsAfterFirst[HOST_LIVE].provider);
    expect(hostsAfterSecond[HOST_LIVE].checkedAt).toBeNull();
  });

  it("case 5 — a re-run can never move an already-decided row (T-18-0205)", async () => {
    // An operator has since reviewed both: one approved, one rejected. Both are `published` and not
    // soft-deleted, so they match every predicate in the UPDATE EXCEPT the third one. That third
    // predicate is the entire safety property.
    await testDb.db.execute(sql`
      UPDATE "listing" SET "status" = 'published', "review_state" = 'approved' WHERE "id" = 'l_draft'
    `);
    await testDb.db.execute(sql`
      UPDATE "listing" SET "status" = 'published', "review_state" = 'rejected' WHERE "id" = 'l_unlisted'
    `);

    // A host row that a human decided, too — the INSERT's ON CONFLICT half.
    await testDb.db.execute(sql`
      INSERT INTO "host_verification" ("user_id", "status", "provider", "checked_at", "decided_by_staff_id")
      VALUES (${HOST_LIVE}, 'rejected', 'manual', now(), 'staff_1')
    `);

    await runBackfill();

    const byId = await reviewStates();
    expect(byId["l_draft"]).toBe("approved"); // NOT re-grandfathered
    expect(byId["l_unlisted"]).toBe("rejected"); // NOT resurrected

    const row = (await verificationRows())[HOST_LIVE];
    expect(row.status).toBe("rejected");
    expect(row.provider).toBe("manual");
    expect(row.checkedAt).not.toBeNull();

    // Restore `status` for the following cases — `beforeEach` resets review_state but not status.
    await testDb.db.execute(sql`UPDATE "listing" SET "status" = 'draft' WHERE "id" = 'l_draft'`);
    await testDb.db.execute(sql`UPDATE "listing" SET "status" = 'unlisted' WHERE "id" = 'l_unlisted'`);
  });
});
