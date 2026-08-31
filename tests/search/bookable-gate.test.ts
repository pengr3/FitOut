// D-16 / RESEARCH Pitfall 5 — search must inline the EXACT deriveBookable predicate
// (published ∧ non-deleted ∧ host.emailVerified ∧ host.payoutsEnabled ∧ HAS AT LEAST ONE
// operating_hours ROW ∧ listing.review_state ∈ {approved, grandfathered} ∧ host verification status
// ∈ {approved, grandfathered}). Mirrors tests/listing/status-gate.test.ts: seed each non-bookable reason and
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
// PHASE 18 (plan 18-03) — THE FIFTH AND SIXTH TERMS, AND WHY THE FIXTURE TABLE HAD TO TRIPLE.
//
// `deriveBookable` gained `listing.reviewState` and `host.verificationStatus` (D-224), and the Stage-1
// SQL twin gained `l.review_state IN (...)` plus a LEFT JOIN to `host_verification` with
// `COALESCE(hv.status::text,'unverified')`. Before this, the expected side of the set-equality below had
// exactly ONE member (`gate_pub`) — and a set equality with one member on each side is a far weaker
// instrument than it looks. The table grew 5 → 14 fixtures over 3 → 8 hosts, with 1 → 3 passing members,
// so that both new dimensions are covered value-by-value and the passing set is no longer a singleton.
//
// TWO MUTATIONS, BOTH EXECUTED 2026-09-01, one per direction. Each was restored with
// `git checkout -- <file>`; `git diff --exit-code src/` clean afterwards.
//
//   M3 — SQL-SIDE PERMISSIVE. src/lib/search/query.ts: DELETE the whole line
//        `AND l.review_state IN ('approved', 'grandfathered')` from Stage-1.
//     → 1 RED:
//       × the SQL twin and the TypeScript predicate accept exactly the same set (Pitfall 5 drift guard)
//         AssertionError: expected Set{ 'gate_hv_grandfathered', …(5) } to deeply equal Set{ 'gate_pub', …(2) }
//         - Expected
//         + Received
//           Set {
//             "gate_hv_grandfathered",
//             "gate_lr_grandfathered",
//         +   "gate_lr_pending",
//         +   "gate_lr_rejected",
//         +   "gate_lr_withdrawn",
//             "gate_pub",
//           }
//          ❯ tests/search/bookable-gate.test.ts:331:26
//     → SQL went permissive while the predicate stayed strict, and the three fixtures it wrongly
//       admitted are named individually. `gate_lr_pending` appearing in that list IS D-228 measured:
//       search has no separate hiding rule, so a listing awaiting review leaks the instant this one
//       WHERE term is lost.
//
//   M4 — TS-SIDE PERMISSIVE, and deliberately the MOST PLAUSIBLE wrong spelling rather than a deletion.
//        src/lib/bookability.ts: replace the host term
//        `(host.verificationStatus === "approved" || host.verificationStatus === "grandfathered")`
//        with `host.verificationStatus !== "suspended"` — the negative form the module header warns
//        against, which reads correct and passes code review.
//     → 2 RED:
//       × the SQL twin and the TypeScript predicate accept exactly the same set (Pitfall 5 drift guard)
//         AssertionError: expected Set{ 'gate_hv_grandfathered', …(2) } to deeply equal Set{ 'gate_pub', …(5) }
//         - Expected
//         + Received
//           Set {
//             "gate_hv_grandfathered",
//         -   "gate_hv_pending",
//         -   "gate_hv_rejected",
//         -   "gate_hv_unverified",
//             "gate_lr_grandfathered",
//             "gate_pub",
//           }
//          ❯ tests/search/bookable-gate.test.ts:331:26
//       × the parity set has THREE passing members, not one — the instrument is not a singleton
//         AssertionError: expected [ 'gate_hv_grandfathered', …(5) ] to deeply equal [ 'gate_hv_grandfathered', …(2) ]
//          ❯ tests/search/bookable-gate.test.ts:369:45
//
//   ⚠️ THE FINDING FROM M4, AND IT IS THE REASON THIS TABLE IS SHAPED THE WAY IT IS. `gate_hv_suspended`
//   STAYED GREEN under M4 — of course it did: `!== "suspended"` still excludes a suspended host. The
//   three fixtures that caught the mutation are `gate_hv_unverified`, `gate_hv_pending` and
//   `gate_hv_rejected`. So a fixture set that had covered only the headline case — suspension, the one
//   ENF-01 is about — would have watched the single most likely real-world spelling error sail through
//   while reporting green. Covering EVERY enum value is not completeness theatre; here it is the entire
//   difference between an instrument and a decoration.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import {
  user,
  hostPayout,
  hostVerification,
  hostVerificationStatus,
  listing,
  listingReviewState,
  operatingHours,
} from "@/lib/db/schema";
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
 *
 * REVIEW STATE AND VERIFICATION STATUS ARE INSIDE THE PARITY SET, AND SOFT-DELETE IS NOT — the line
 * between them is whether `deriveBookable` MODELS the term. It models both new ones as required
 * parameters (D-224), so both halves are supposed to agree about them and a disagreement is exactly the
 * drift this file exists to catch. It models `deletedAt` nowhere and never will: a soft-deleted listing
 * is filtered out before any caller reaches the predicate, so SQL is the only half that has an opinion
 * and there is nothing to hold equal.
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

  // THE FIFTH TERM (LVER-01). All four share `gate_host_ok` with the control and differ from it in
  // `review_state` AND NOTHING ELSE, which is what makes each exclusion diagnostic.
  { id: "gate_lr_grandfathered", status: "published", emailVerified: true, payoutsEnabled: true, hasOperatingHours: true, reviewState: "grandfathered", verificationStatus: "approved" },
  { id: "gate_lr_pending", status: "published", emailVerified: true, payoutsEnabled: true, hasOperatingHours: true, reviewState: "pending", verificationStatus: "approved" },
  { id: "gate_lr_rejected", status: "published", emailVerified: true, payoutsEnabled: true, hasOperatingHours: true, reviewState: "rejected", verificationStatus: "approved" },
  { id: "gate_lr_withdrawn", status: "published", emailVerified: true, payoutsEnabled: true, hasOperatingHours: true, reviewState: "withdrawn", verificationStatus: "approved" },

  // THE SIXTH TERM (HVER-03 / ENF-01). EACH OF THESE HAS ITS OWN HOST — a shared host could not carry
  // five different verification statuses, and a fixture that failed for two reasons at once would prove
  // neither. All five sit on published, ops-approved listings with a full week of hours.
  { id: "gate_hv_grandfathered", status: "published", emailVerified: true, payoutsEnabled: true, hasOperatingHours: true, reviewState: "approved", verificationStatus: "grandfathered" },
  // NO host_verification ROW AT ALL is seeded for this one. The 'unverified' here is what the TypeScript
  // side is handed by `?? "unverified"`; the SQL side sees NULL and resolves it with COALESCE. The
  // set-equality is therefore the proof that the two fail-closed spellings agree.
  { id: "gate_hv_unverified", status: "published", emailVerified: true, payoutsEnabled: true, hasOperatingHours: true, reviewState: "approved", verificationStatus: "unverified" },
  { id: "gate_hv_pending", status: "published", emailVerified: true, payoutsEnabled: true, hasOperatingHours: true, reviewState: "approved", verificationStatus: "pending" },
  { id: "gate_hv_rejected", status: "published", emailVerified: true, payoutsEnabled: true, hasOperatingHours: true, reviewState: "approved", verificationStatus: "rejected" },
  { id: "gate_hv_suspended", status: "published", emailVerified: true, payoutsEnabled: true, hasOperatingHours: true, reviewState: "approved", verificationStatus: "suspended" },
];

/**
 * The two DIMENSION SLICES of the table above — the fixtures whose distinguishing value is the term
 * named, one per enum value. They exist so the coverage assertion below can be derived from the pgEnums
 * rather than from a hand-maintained count: add a value to either enum and this file goes RED until
 * somebody decides, in writing and with a fixture, whether a listing in that state may be sold.
 */
const REVIEW_DIMENSION = ["gate_pub", "gate_lr_grandfathered", "gate_lr_pending", "gate_lr_rejected", "gate_lr_withdrawn"] as const;
const VERIFICATION_DIMENSION = ["gate_pub", "gate_hv_grandfathered", "gate_hv_unverified", "gate_hv_pending", "gate_hv_rejected", "gate_hv_suspended"] as const;

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

  // Reason 6 (LVER-01, phase 18): the listing's own OPS REVIEW STATE, one fixture per remaining enum
  // value, ALL on the same fully-bookable `gate_host_ok`. `gate_lr_grandfathered` is the SECOND passing
  // member of the parity set and is the one D-210/D-212 make non-obvious — nothing was ever checked on a
  // grandfathered listing, yet it sells; only the badge withholds the claim. `gate_lr_pending` IS D-228's
  // whole verification: search needed no separate hiding rule because Stage-1 already filters on the
  // gate, so a pending listing drops out the moment the twin lands. That is ASSERTED here, not
  // re-implemented somewhere in search.
  await makeListing("gate_lr_grandfathered", "gate_host_ok", "published", true, "grandfathered");
  await makeListing("gate_lr_pending", "gate_host_ok", "published", true, "pending");
  await makeListing("gate_lr_rejected", "gate_host_ok", "published", true, "rejected");
  await makeListing("gate_lr_withdrawn", "gate_host_ok", "published", true, "withdrawn");

  // Reason 7 (HVER-03 / ENF-01, phase 18): the HOST's ops verification status. One host PER FIXTURE,
  // because a host carries exactly one status and the file's rule is that a fixture fails for its own
  // single reason. Every listing here is published + ops-approved + hours, so the host term is the only
  // thing that can decide it.
  await makeHost("gate_host_hv_grandfathered", { emailVerified: true, payoutsEnabled: true, verificationStatus: "grandfathered" });
  await makeListing("gate_hv_grandfathered", "gate_host_hv_grandfathered", "published", true, "approved");

  // THE COALESCE FIXTURE: `verificationStatus: null` seeds NO host_verification row at all. This is the
  // ordinary state of a host nobody has checked — the row is not created with the user — and it is the
  // ONLY fixture that can prove `COALESCE(hv.status::text,'unverified')` and `?? "unverified"` answer
  // the same way. A row carrying the literal 'unverified' would exercise a different, easier path.
  await makeHost("gate_host_hv_norow", { emailVerified: true, payoutsEnabled: true, verificationStatus: null });
  await makeListing("gate_hv_unverified", "gate_host_hv_norow", "published", true, "approved");

  await makeHost("gate_host_hv_pending", { emailVerified: true, payoutsEnabled: true, verificationStatus: "pending" });
  await makeListing("gate_hv_pending", "gate_host_hv_pending", "published", true, "approved");

  await makeHost("gate_host_hv_rejected", { emailVerified: true, payoutsEnabled: true, verificationStatus: "rejected" });
  await makeListing("gate_hv_rejected", "gate_host_hv_rejected", "published", true, "approved");

  // ENF-02 / D-222 in the SEARCH half: a suspended host's listings leave the grid through the SAME term
  // that carries verification. There is no second suspension clause in Stage-1 to forget.
  await makeHost("gate_host_hv_suspended", { emailVerified: true, payoutsEnabled: true, verificationStatus: "suspended" });
  await makeListing("gate_hv_suspended", "gate_host_hv_suspended", "published", true, "approved");
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

  it("the parity set has THREE passing members, not one — the instrument is not a singleton", () => {
    // WHY THIS IS ITS OWN CASE. Before phase 18 the expected side of the set-equality above had exactly
    // ONE member, and a set equality with one member on each side is a far weaker instrument than it
    // looks: several plausible drifts (an over-broad term, a term dropped on the SQL side) can still
    // produce a one-element agreement. Three members over two independent new dimensions — one of which
    // (`gate_lr_grandfathered`) passes for a NON-OBVIOUS reason — is what makes the equality bite. This
    // case exists so that a future edit which quietly collapses the passing set back toward a singleton
    // fails HERE, by name, instead of leaving the parity assertion technically green and hollow.
    const passing = FIXTURES.filter((f) =>
      deriveBookable(
        { status: f.status, hasOperatingHours: f.hasOperatingHours, reviewState: f.reviewState },
        {
          emailVerified: f.emailVerified,
          payoutsEnabled: f.payoutsEnabled,
          verificationStatus: f.verificationStatus,
        },
      ),
    );
    expect(FIXTURES).toHaveLength(14);
    expect(passing.map((f) => f.id).sort()).toEqual([
      "gate_hv_grandfathered",
      "gate_lr_grandfathered",
      "gate_pub",
    ]);
  });

  it("every listing_review_state and every host_verification_status value is some fixture's own single reason", () => {
    // Derived from the pgEnums, never from a hand-kept list: adding a value to either enum reddens this
    // and forces a fixture (and therefore a decision) for it. D-226's warning is exactly this — extend
    // the fixtures to cover every new enum value, or the equality proves less than it did before.
    const reviewValues = REVIEW_DIMENSION.map((id) => FIXTURES.find((f) => f.id === id)!.reviewState);
    expect([...reviewValues].sort()).toEqual([...listingReviewState.enumValues].sort());

    const verificationValues = VERIFICATION_DIMENSION.map(
      (id) => FIXTURES.find((f) => f.id === id)!.verificationStatus,
    );
    expect([...verificationValues].sort()).toEqual([...hostVerificationStatus.enumValues].sort());
  });

  it("is seeded over EIGHT hosts, exactly one of which has no host_verification row at all", async () => {
    // The host count is not bookkeeping. Five of the fourteen fixtures differ ONLY in their host's
    // verification status, and a host carries exactly one — so five separate hosts is what "each fixture
    // fails for its own single reason" costs here. Collapsing any two of them onto a shared host would
    // silently make one of the exclusions non-diagnostic while leaving this whole file green.
    const hosts = await testDb.db.select({ id: user.id }).from(user);
    expect(hosts).toHaveLength(8);

    // …and exactly one of those eight is the fail-closed fixture: a host with a `user` row, a `host_payout`
    // row, and NO `host_verification` row. If a later edit "helpfully" backfills a row for every host,
    // `gate_hv_unverified` would start passing through the literal-'unverified' path instead of the
    // COALESCE path, and the fixture would stop proving what its name claims. This is what stops that.
    const verifications = await testDb.db.select({ userId: hostVerification.userId }).from(hostVerification);
    expect(verifications).toHaveLength(7);
    expect(verifications.map((v) => v.userId)).not.toContain("gate_host_hv_norow");
  });
});
