// D-16 / RESEARCH Pitfall 5 — search must inline the EXACT deriveBookable predicate
// (published ∧ non-deleted ∧ host.emailVerified ∧ host.payoutsEnabled ∧ HAS AT LEAST ONE
// operating_hours ROW). Mirrors tests/listing/status-gate.test.ts: seed each non-bookable reason and
// assert every one is ABSENT from results, while a fully-bookable control listing IS returned. If the
// SQL predicate ever drifts from bookability.ts, one of these exclusions breaks — the drift guard
// (Pitfall 5).
//
// THE FOURTH TERM (v1.0 audit finding #4, quick task 260810-sti). A published, email-verified,
// payout-activated listing with ZERO weekly hours is now NOT sellable, so it must not surface in a
// browse result either. The `gate_nohours` case below is the RED anchor for the SQL half of that change.
// Note WHY this needed a new SQL term at all: search already had a per-day
// `EXISTS (… operating_hours … day_of_week = EXTRACT(DOW FROM :picked))` clause, but it is CONDITIONAL on
// the booker having picked a date. On the DEFAULT no-date browse view it is not emitted at all, which is
// exactly how an hours-less listing survived into the grid. The new term is UNCONDITIONAL and lives in
// the inlined-deriveBookable block: it is the SELL GATE (is there a calendar at all), not a per-request
// FILTER (is the venue open on the day you picked). This file therefore searches with NO date.
//
// THIS FILE NOW CARRIES THE ANTI-DESYNC DEVICE. Earlier tasks pinned src/lib/bookability.ts and
// src/lib/search/query.ts with a `git diff --exit-code` byte-unchanged gate. 260810-sti has to change
// BOTH, so that gate is retired and the set-equality assertion below replaces it: this file imports
// `deriveBookable` itself and asserts that the set of ids the SQL returns EQUALS the set the TypeScript
// predicate accepts over the same fixtures. Drift in either direction fails here.
//
// ⚠️ BE HONEST ABOUT WHAT THE PARITY ASSERTION MEASURES. Against byte-unchanged `src/` it passes
// VACUOUSLY — both sides ignored the hours field, so both sides agreed on the wrong answer. It is NOT a
// Task-1 RED anchor; it is a standing drift guard, and mutation M2 (Task 3) is what gives it teeth by
// re-wrapping the new EXISTS in its pre-task `${picked ? … : sql``}` conditional form.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// CONFIRM-THEN-FIX, BRANCH A (260810-sti, Task 1). Written FIRST against byte-unchanged `src/`.
// Observed, verbatim:
//
//   ❯ tests/search/bookable-gate.test.ts (3 tests | 1 failed) 875ms
//     × a published, fully-payable listing with ZERO operating_hours rows is absent from a no-date browse search 10ms
//
//   AssertionError: expected [ 'gate_nohours', 'gate_pub' ] to not include 'gate_nohours'
//    ❯ tests/search/bookable-gate.test.ts:179:21
//      179|     expect(ids).not.toContain("gate_nohours");
//         |                     ^
//
// i.e. a listing whose every date renders Closed was being advertised in the default browse grid,
// alongside the control, with nothing to tell a booker the two were different. The parity case ran
// GREEN in the same run, exactly as predicted above (vacuous agreement — both sides ignored the field).
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// TWO MUTATIONS, BOTH EXECUTED 2026-08-10 (260810-sti, Task 3), and TOGETHER they are what retire the
// old byte-unchanged gate with something better: the parity assertion is now measured in BOTH
// directions. Each was restored by editing the statement back; `git diff --exit-code src/` clean.
//
//   M2 — src/lib/search/query.ts: re-wrap the new unconditional EXISTS in its exact pre-task
//        conditional form, `${picked ? sql`…` : sql``}` — i.e. SQL-side drift.
//     → 2 RED (`Tests  2 failed | 1 passed (3)`):
//       × a published, fully-payable listing with ZERO operating_hours rows is absent from a no-date browse search 11ms
//         AssertionError: expected [ 'gate_nohours', 'gate_pub' ] to not include 'gate_nohours'
//          ❯ tests/search/bookable-gate.test.ts:184:21
//       × the SQL twin and the TypeScript predicate accept exactly the same set (Pitfall 5 drift guard) 10ms
//         AssertionError: expected Set{ 'gate_nohours', 'gate_pub' } to deeply equal Set{ 'gate_pub' }
//         - Expected
//         + Received
//           Set {
//         +   "gate_nohours",
//             "gate_pub",
//           }
//          ❯ tests/search/bookable-gate.test.ts:193:26
//     → Matched the prediction exactly. This is what gives the parity assertion its teeth: SQL went
//       permissive while the TypeScript predicate stayed strict, and the set-equality named it.
//
//   M1 — src/lib/bookability.ts: DELETE `listing.hasOperatingHours &&` from the return — i.e. TS-side
//        drift. NOT PREDICTED to touch this file; reported as observed because it did.
//     → 1 RED here:
//       × the SQL twin and the TypeScript predicate accept exactly the same set (Pitfall 5 drift guard)
//         AssertionError: expected Set{ 'gate_pub' } to deeply equal Set{ 'gate_pub', 'gate_nohours' }
//          ❯ tests/search/bookable-gate.test.ts:193:26
//     → The mirror image of M2: SQL stayed strict while the predicate went permissive. So the guard
//       fails whichever half drifts, which is exactly the property the retired `git diff` gate had and
//       the reason it could be retired.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, hostPayout, hostVerification, listing, operatingHours } from "@/lib/db/schema";
import type { HostVerificationStatus, ListingReviewState } from "@/lib/db/schema";
import { searchParamsSchema } from "@/lib/validation/booking";
import { searchListings } from "@/lib/search/query";
import { deriveBookable } from "@/lib/bookability";

let testDb: TestDb;

async function makeHost(
  id: string,
  opts: {
    emailVerified: boolean;
    payoutsEnabled: boolean;
    /** `null` ⇒ NO host_verification row at all — the fail-closed COALESCE fixture (phase 18). */
    verificationStatus: HostVerificationStatus | null;
  },
): Promise<void> {
  await testDb.db.insert(user).values({
    id,
    name: id,
    email: `${id}@fitout.seed`,
    firstName: "Gate",
    emailVerified: opts.emailVerified,
    canHost: true,
  });
  await testDb.db.insert(hostPayout).values({
    userId: id,
    activationStatus: opts.payoutsEnabled ? "activated" : "pending",
    payoutsEnabled: opts.payoutsEnabled,
    onboardingComplete: opts.payoutsEnabled,
  });
  // The SIXTH term's row. `null` means the row is DELIBERATELY absent — that is a distinct fixture from
  // a row carrying `'unverified'`, and it is the only one that can prove the SQL COALESCE and the TS
  // `?? "unverified"` agree about a host nobody has ever checked.
  if (opts.verificationStatus !== null) {
    await testDb.db.insert(hostVerification).values({
      userId: id,
      status: opts.verificationStatus,
      provider: "manual",
    });
  }
}

/**
 * `hours` is a SEPARATE dimension from status on purpose. Every fixture below must fail (or pass) for
 * its OWN single reason — that is what makes an exclusion diagnostic rather than merely true — so the
 * status/verification/payout fixtures all get hours, and exactly one fixture withholds them.
 */
async function makeListing(
  id: string,
  hostId: string,
  status: "draft" | "published" | "unlisted",
  hours: boolean,
  reviewState: ListingReviewState,
): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `Listing ${id}`,
    primarySpaceType: "gym_fitness_floor",
    city: "Makati",
    location: { x: 121.0244, y: 14.5547 },
    hourlyRateCents: 40000,
    dayRateCents: 250000,
    currency: "php",
    status,
    // The FIFTH term. Spelled by EVERY caller, never defaulted — the column's own default is 'pending',
    // and a fixture that silently inherited it would fail for a reason its name does not claim.
    reviewState,
    publishedAt: status === "published" ? new Date() : null,
  });
  if (hours) {
    await testDb.db.insert(operatingHours).values(
      Array.from({ length: 7 }, (_, dow) => ({
        id: `${id}_oh_${dow}`,
        listingId: id,
        dayOfWeek: dow,
        openTime: "06:00:00",
        closeTime: "21:00:00",
      })),
    );
  }
}

/**
 * The PARITY TABLE — the four `deriveBookable` inputs per fixture, kept beside the SQL fixtures they
 * describe so the two cannot be edited apart.
 *
 * `gate_deleted` is DELIBERATELY ABSENT. Soft-delete is a SQL-only term: `deriveBookable` does not model
 * `deletedAt` at all (a deleted listing is simply never handed to it), so folding that row into a
 * set-equality assertion would compare two predicates that were never meant to agree. It gets its own
 * standalone assertion instead.
 */
const FIXTURES: Array<{
  id: string;
  status: "draft" | "published" | "unlisted";
  emailVerified: boolean;
  payoutsEnabled: boolean;
  hasOperatingHours: boolean;
  reviewState: ListingReviewState;
  verificationStatus: HostVerificationStatus;
}> = [
  { id: "gate_pub", status: "published", emailVerified: true, payoutsEnabled: true, hasOperatingHours: true, reviewState: "approved", verificationStatus: "approved" },
  { id: "gate_draft", status: "draft", emailVerified: true, payoutsEnabled: true, hasOperatingHours: true, reviewState: "approved", verificationStatus: "approved" },
  { id: "gate_unverified", status: "published", emailVerified: false, payoutsEnabled: true, hasOperatingHours: true, reviewState: "approved", verificationStatus: "approved" },
  { id: "gate_nopayout", status: "published", emailVerified: true, payoutsEnabled: false, hasOperatingHours: true, reviewState: "approved", verificationStatus: "approved" },
  { id: "gate_nohours", status: "published", emailVerified: true, payoutsEnabled: true, hasOperatingHours: false, reviewState: "approved", verificationStatus: "approved" },
];

beforeAll(async () => {
  testDb = await setupTestDb();

  // Control: published + verified email + payouts enabled + hours + BOTH ops terms approved → a listing
  // that should surface.
  await makeHost("gate_host_ok", { emailVerified: true, payoutsEnabled: true, verificationStatus: "approved" });
  await makeListing("gate_pub", "gate_host_ok", "published", true, "approved");

  // Reason 1: draft status (same fully-bookable host, hours present) → excluded.
  await makeListing("gate_draft", "gate_host_ok", "draft", true, "approved");

  // Reason 2: host email unverified (published listing, payouts on, hours present) → excluded.
  await makeHost("gate_host_unverified", { emailVerified: false, payoutsEnabled: true, verificationStatus: "approved" });
  await makeListing("gate_unverified", "gate_host_unverified", "published", true, "approved");

  // Reason 3: host payouts disabled (published listing, verified email, hours present) → excluded.
  await makeHost("gate_host_nopayout", { emailVerified: true, payoutsEnabled: false, verificationStatus: "approved" });
  await makeListing("gate_nopayout", "gate_host_nopayout", "published", true, "approved");

  // Reason 4 (bonus — the `deleted_at IS NULL` clause): soft-deleted published listing → excluded.
  await makeListing("gate_deleted", "gate_host_ok", "published", true, "approved");
  await testDb.db.update(listing).set({ deletedAt: new Date() }).where(eq(listing.id, "gate_deleted"));

  // Reason 5 (v1.0 audit finding #4): published, SAME fully-bookable host as the control — verified email,
  // payouts activated — and failing on HOURS AND NOTHING ELSE. Sharing `gate_host_ok` with `gate_pub` is
  // what makes the pair diagnostic: the two rows differ in exactly one input.
  await makeListing("gate_nohours", "gate_host_ok", "published", false, "approved");
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("searchListings — bookable gate (D-16, deriveBookable parity, Pitfall 5)", () => {
  it("returns a fully-bookable listing but excludes draft, unverified-host, payouts-off, and soft-deleted listings", async () => {
    const { results } = await searchListings(testDb.db, searchParamsSchema.parse({}));
    const ids = results.map((r) => r.id);

    expect(ids).toContain("gate_pub"); // published + verified + payouts on + hours
    expect(ids).not.toContain("gate_draft"); // not published
    expect(ids).not.toContain("gate_unverified"); // host email unverified
    expect(ids).not.toContain("gate_nopayout"); // host payouts disabled
    expect(ids).not.toContain("gate_deleted"); // soft-deleted
  });

  it("a published, fully-payable listing with ZERO operating_hours rows is absent from a no-date browse search", async () => {
    // NO date is supplied — that is the whole point. The pre-existing per-day operating_hours EXISTS is
    // emitted only when the booker picks a date, so before this change an hours-less listing sailed
    // straight into the default grid, where every date it offered would have rendered Closed.
    const { results } = await searchListings(testDb.db, searchParamsSchema.parse({}));
    const ids = results.map((r) => r.id);

    expect(ids).not.toContain("gate_nohours");
    // …and the control proves the new EXISTS is not a blanket exclusion of everything.
    expect(ids).toContain("gate_pub");
  });

  it("the SQL twin and the TypeScript predicate accept exactly the same set (Pitfall 5 drift guard)", async () => {
    const { results } = await searchListings(testDb.db, searchParamsSchema.parse({}));
    const ids = results.map((r) => r.id);

    expect(new Set(ids)).toEqual(
      new Set(
        FIXTURES.filter((f) =>
          deriveBookable(
            { status: f.status, hasOperatingHours: f.hasOperatingHours, reviewState: f.reviewState },
            {
              emailVerified: f.emailVerified,
              payoutsEnabled: f.payoutsEnabled,
              verificationStatus: f.verificationStatus,
            },
          ),
        ).map((f) => f.id),
      ),
    );

    // Soft-delete is a SQL-ONLY term (see FIXTURES' note) — asserted on its own, outside the parity set.
    expect(ids).not.toContain("gate_deleted");
  });
});
