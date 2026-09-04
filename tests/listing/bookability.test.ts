// D-15 / D-14 + v1.0 audit finding #4: deriveBookable is the pure sell-gate. A listing is bookable ⇔
// published AND the host's email is verified AND the host's payouts are enabled AND THE LISTING HAS AT
// LEAST ONE `operating_hours` ROW AND ops has APPROVED (or grandfathered) BOTH THE LISTING AND ITS
// HOST (phase 18, D-224). This drives the full 16-row truth table
// (published? × emailVerified × payoutsEnabled × hasOperatingHours) over the original four terms,
// asserting ONLY the all-true row is bookable, plus a 5-row `listing_review_state` DIMENSION table, a
// 6-row `host_verification_status` dimension table, and FOUR auto-revert cases: the D-14 payouts flip,
// the last-hours-row deletion, an ops SUSPENSION (ENF-01) and a material-edit re-review (LVER-03).
//
// 29 TRUTH-TABLE ASSERTIONS: 16 + 5 + 6 + 2. The two new terms get DIMENSION tables rather than a
// 480-row cross product - see the note above `reviewRows` for why that is a strength and not a
// shortcut. The 16 original rows are UNCHANGED IN MEANING: both new terms are pinned at
// PASSING_REVIEW / PASSING_VERIFICATION throughout, so each of those rows is still exactly the
// four-boolean experiment it was written as.
//
// WHY THE FOURTH TERM IS A PARAMETER AND NOT A LOOKUP — the constraint this file exists to protect.
// `deriveBookable` is PURE (no DB, no I/O), which is exactly what lets this truth table drive it
// directly rather than through a fixture database. So "does this listing have hours" arrives as INPUT.
// Two payoffs: purity survives, and because every call site builds a FRESH OBJECT LITERAL, adding a
// required field makes the COMPILER enumerate the four call sites — the census is done by tsc, not grep.
//
// THE PREDICATE HAS AN INLINED SQL TWIN (src/lib/search/query.ts, Stage-1). Prior tasks protected that
// pairing with a `git diff --exit-code` byte-unchanged gate on both files; this change has to move both,
// so that gate is retired and tests/search/bookable-gate.test.ts replaces it with something stronger —
// it imports deriveBookable and asserts the SQL result set EQUALS the TypeScript predicate over shared
// fixtures. Drift in either direction fails there, not here.
//
// Pure function, no DB/IO (mirrors tests/validation/auth-schema.test.ts structure).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// CONFIRM-THEN-FIX, BRANCH A (quick task 260810-sti, Task 1). The two hours assertions below were
// written FIRST against byte-unchanged `src/` and both FAILED. Observed, verbatim (`Tests  2 failed |
// 18 passed (20)`):
//
//   × status=published emailVerified=true payoutsEnabled=true hasOperatingHours=false → false 9ms
//     AssertionError: expected true to be false // Object.is equality
//     - Expected
//     + Received
//     - false
//     + true
//      ❯ tests/listing/bookability.test.ts:94:9
//
//   × un-sells the moment the host deletes their LAST hours row, with nothing else changed (consequence 2) 1ms
//     AssertionError: expected true to be false // Object.is equality
//     - Expected
//     + Received
//     - false
//     + true
//      ❯ tests/listing/bookability.test.ts:135:76
//
// The three-term predicate simply ignored the extra property (TypeScript's excess-property check is the
// only thing that would have objected, and vitest transpiles without type-checking), so a published
// listing with an empty calendar read as SELLABLE.
//
// ⚠️ REPORTED AS OBSERVED, NOT AS PREDICTED: the meta-assertion "is bookable in EXACTLY one of the 16
// rows" stayed GREEN through the RED. It filters the table's own DECLARED `expected` column, never the
// value `deriveBookable` returns, so it is a self-consistency check on the table and CANNOT detect a
// predicate defect. It is kept because it stops a future editor from adding a second true row to the
// table by hand — but it must not be read as coverage of the function.
//
// Fixed in Task 2 by adding `&& listing.hasOperatingHours`.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// MUTATION M1, EXECUTED 2026-08-10 (260810-sti, Task 3). Restored by editing the term back;
// `git diff --exit-code src/` clean afterwards.
//
//   M1 — src/lib/bookability.ts: DELETE `listing.hasOperatingHours &&` from the return
//     → this file, 2 RED (`20 tests | 2 failed`):
//       × status=published emailVerified=true payoutsEnabled=true hasOperatingHours=false → false 18ms
//         AssertionError: expected true to be false // Object.is equality
//          ❯ tests/listing/bookability.test.ts:103:9
//       × un-sells the moment the host deletes their LAST hours row, with nothing else changed (consequence 2) 2ms
//         AssertionError: expected true to be false // Object.is equality
//          ❯ tests/listing/bookability.test.ts:144:76
//
//     THE FINDING CONDITION WAS SATISFIED. The same single deletion also reddened BOTH server-side
//     refusal anchors — `L_nohours` in state-machine.test.ts and `L_OPEN_NOHOURS` in
//     open-capacity-hold.test.ts — which is what proves `placeOpenHold`'s RE-STATED gate is wired to
//     this predicate rather than refusing for some unrelated reason of its own.
//
//     UNPREDICTED, REPORTED AS OBSERVED: M1 reddened a FIFTH case the plan did not anticipate — the
//     parity/drift guard in tests/search/bookable-gate.test.ts, with
//     `expected Set{ 'gate_pub' } to deeply equal Set{ 'gate_pub', 'gate_nohours' }`. The SQL twin still
//     excluded the hours-less listing while the mutated TypeScript predicate accepted it, so the guard
//     caught the desync from the TS side. Between M1 and M2 it is now measured in BOTH directions.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { deriveBookable } from "@/lib/bookability";
import { hostVerificationStatus, listingReviewState } from "@/lib/db/schema";
import type { HostVerificationStatus, ListingReviewState } from "@/lib/db/schema";

type Status = "draft" | "published" | "unlisted";

// The FIFTH and SIXTH terms, PINNED AT A PASSING VALUE for every assertion that predates them (phase 18,
// D-224). This is the whole reason the 16-row table below still measures exactly what it always did: with
// both new terms held true, each of those rows is the same four-boolean experiment it was written as, and
// the two new dimensions are measured by their OWN tables further down rather than by multiplying this one
// into 480 rows. Naming them as constants — rather than typing "approved" 16 times — is what makes that
// intent legible and what makes flipping one to check the pinning a one-line experiment.
const PASSING_REVIEW: ListingReviewState = "approved";
const PASSING_VERIFICATION: HostVerificationStatus = "approved";

describe("deriveBookable — the pure bookability gate (D-15 + audit finding #4)", () => {
  // 16-row truth table over (published?, emailVerified, payoutsEnabled, hasOperatingHours). The
  // "published?" dimension uses status "published" (true) vs "draft" (false).
  //
  // The 8 `draft × …` rows are not filler. `/host/listings` supplies this term as
  // `!missingHours.has(r.id)` over a Set that iu7 builds from PUBLISHED listings only, so an hours-less
  // DRAFT is handed `hasOperatingHours: true`. That is sound ONLY because the status term is already
  // false — `draft × true × true × true → false` is the row that pins it, so nobody can later
  // "simplify" the AND and silently make the host grid lie.
  const rows: Array<{
    status: Status;
    emailVerified: boolean;
    payoutsEnabled: boolean;
    hasOperatingHours: boolean;
    expected: boolean;
  }> = [
    { status: "published", emailVerified: true, payoutsEnabled: true, hasOperatingHours: true, expected: true },
    { status: "published", emailVerified: true, payoutsEnabled: true, hasOperatingHours: false, expected: false },
    { status: "published", emailVerified: true, payoutsEnabled: false, hasOperatingHours: true, expected: false },
    { status: "published", emailVerified: true, payoutsEnabled: false, hasOperatingHours: false, expected: false },
    { status: "published", emailVerified: false, payoutsEnabled: true, hasOperatingHours: true, expected: false },
    { status: "published", emailVerified: false, payoutsEnabled: true, hasOperatingHours: false, expected: false },
    { status: "published", emailVerified: false, payoutsEnabled: false, hasOperatingHours: true, expected: false },
    { status: "published", emailVerified: false, payoutsEnabled: false, hasOperatingHours: false, expected: false },
    { status: "draft", emailVerified: true, payoutsEnabled: true, hasOperatingHours: true, expected: false },
    { status: "draft", emailVerified: true, payoutsEnabled: true, hasOperatingHours: false, expected: false },
    { status: "draft", emailVerified: true, payoutsEnabled: false, hasOperatingHours: true, expected: false },
    { status: "draft", emailVerified: true, payoutsEnabled: false, hasOperatingHours: false, expected: false },
    { status: "draft", emailVerified: false, payoutsEnabled: true, hasOperatingHours: true, expected: false },
    { status: "draft", emailVerified: false, payoutsEnabled: true, hasOperatingHours: false, expected: false },
    { status: "draft", emailVerified: false, payoutsEnabled: false, hasOperatingHours: true, expected: false },
    { status: "draft", emailVerified: false, payoutsEnabled: false, hasOperatingHours: false, expected: false },
  ];

  for (const r of rows) {
    it(`status=${r.status} emailVerified=${r.emailVerified} payoutsEnabled=${r.payoutsEnabled} hasOperatingHours=${r.hasOperatingHours} → ${r.expected}`, () => {
      expect(
        deriveBookable(
          { status: r.status, hasOperatingHours: r.hasOperatingHours, reviewState: PASSING_REVIEW },
          {
            emailVerified: r.emailVerified,
            payoutsEnabled: r.payoutsEnabled,
            verificationStatus: PASSING_VERIFICATION,
          },
        ),
      ).toBe(r.expected);
    });
  }

  it("is bookable in EXACTLY one of the 16 rows (all four conditions true)", () => {
    const trueRows = rows.filter((r) => r.expected);
    expect(trueRows).toHaveLength(1);
    expect(trueRows[0]).toMatchObject({
      status: "published",
      emailVerified: true,
      payoutsEnabled: true,
      hasOperatingHours: true,
    });
  });

  // -- THE FIFTH TERM: listing.reviewState (LVER-01, phase 18) ------------------------------------
  //
  // A DIMENSION TABLE, NOT A CROSS PRODUCT, and that is a deliberate choice rather than laziness. Two
  // new enum terms of 5 and 6 values would turn the 16 rows above into 480, and 464 of them would assert
  // `false` for a reason some OTHER term already decided - a table nobody reads, whose greenness means
  // almost nothing. Instead: hold everything else at a PASSING value and vary ONE term across ALL of its
  // values. Every row then fails (or passes) for its own single reason, which is what makes a red
  // diagnostic. The INTERACTION between the terms is pinned by the AND itself and, over real fixtures,
  // by the set-equality in tests/search/bookable-gate.test.ts.
  const reviewRows: Array<{ reviewState: ListingReviewState; expected: boolean }> = [
    { reviewState: "approved", expected: true },
    // D-210/D-211: grandfathered PASSES, deliberately. The pre-phase-18 catalogue was never reviewed and
    // Success Criterion 2 is narrowed to listings created or materially edited AFTER this phase; making
    // 19 live listings unsellable overnight is the worse failure. It stays a DISTINCT state from
    // `approved` (so a future PM can re-open the backlog with one UPDATE, and so the D-212 badge can
    // refuse to claim FitOut checked something it did not) - which is exactly why this row is not
    // obvious, and why it is written down rather than left to be rediscovered.
    { reviewState: "grandfathered", expected: true },
    { reviewState: "pending", expected: false }, // submitted, not yet reviewed - D-208 hides it too
    { reviewState: "rejected", expected: false },
    // The value a `!== "pending"` spelling would have let straight through. It is in this table for that
    // reason and no other.
    { reviewState: "withdrawn", expected: false },
  ];

  for (const r of reviewRows) {
    it(`reviewState=${r.reviewState} (everything else passing) -> ${r.expected}`, () => {
      expect(
        deriveBookable(
          { status: "published", hasOperatingHours: true, reviewState: r.reviewState },
          { emailVerified: true, payoutsEnabled: true, verificationStatus: PASSING_VERIFICATION },
        ),
      ).toBe(r.expected);
    });
  }

  it("the listing-review table covers EVERY listing_review_state value exactly once, and exactly 2 pass", () => {
    // The anti-vacuity device, restated per new table - and STRONGER than the 16-row version above,
    // because it is derived from the pgEnum rather than from the table's own opinion of itself. Adding a
    // value to `listing_review_state` reddens THIS assertion, which forces whoever adds it to decide, in
    // writing, whether a listing in that state may be sold.
    expect([...reviewRows.map((r) => r.reviewState)].sort()).toEqual(
      [...listingReviewState.enumValues].sort(),
    );
    expect(
      reviewRows
        .filter((r) => r.expected)
        .map((r) => r.reviewState)
        .sort(),
    ).toEqual(["approved", "grandfathered"]);
  });

  // -- THE SIXTH TERM: host.verificationStatus (HVER-03 / ENF-01, phase 18) -----------------------
  const verificationRows: Array<{ verificationStatus: HostVerificationStatus; expected: boolean }> = [
    { verificationStatus: "approved", expected: true },
    { verificationStatus: "grandfathered", expected: true }, // D-210, the host half
    // The state of a host NOBODY HAS EVER CHECKED - and the state every caller must resolve a MISSING
    // host_verification row to (`?? "unverified"` in TypeScript, `COALESCE(hv.status,'unverified')` in
    // the SQL twin). A row is not created with the user, so this is the ordinary case, not the edge one.
    { verificationStatus: "unverified", expected: false },
    { verificationStatus: "pending", expected: false },
    { verificationStatus: "rejected", expected: false },
    // ENF-01 / D-222: suspension rides THIS enum, so it is enforced by the same gate read as verification
    // at all seven sites. There is no second suspension check anywhere, by design - a second check is a
    // second thing to forget, and the place it gets forgotten is the newest code path.
    { verificationStatus: "suspended", expected: false },
  ];

  for (const r of verificationRows) {
    it(`verificationStatus=${r.verificationStatus} (everything else passing) -> ${r.expected}`, () => {
      expect(
        deriveBookable(
          { status: "published", hasOperatingHours: true, reviewState: PASSING_REVIEW },
          { emailVerified: true, payoutsEnabled: true, verificationStatus: r.verificationStatus },
        ),
      ).toBe(r.expected);
    });
  }

  it("the host-verification table covers EVERY host_verification_status value exactly once, and exactly 2 pass", () => {
    expect([...verificationRows.map((r) => r.verificationStatus)].sort()).toEqual(
      [...hostVerificationStatus.enumValues].sort(),
    );
    expect(
      verificationRows
        .filter((r) => r.expected)
        .map((r) => r.verificationStatus)
        .sort(),
    ).toEqual(["approved", "grandfathered"]);
  });

  it("unlisted is never bookable even with verified email + payouts + hours + both ops approvals (D-15)", () => {
    expect(
      deriveBookable(
        { status: "unlisted", hasOperatingHours: true, reviewState: PASSING_REVIEW },
        { emailVerified: true, payoutsEnabled: true, verificationStatus: PASSING_VERIFICATION },
      ),
    ).toBe(false);
  });

  it("auto-reverts when payoutsEnabled flips to false with nothing else changed (D-14)", () => {
    // Hours stay TRUE on both calls on purpose: this case measures PAYOUTS, not hours.
    const listing = { status: "published" as const, hasOperatingHours: true, reviewState: PASSING_REVIEW };
    const host = { emailVerified: true, payoutsEnabled: true, verificationStatus: PASSING_VERIFICATION };
    expect(deriveBookable(listing, host)).toBe(true);
    // Webhook flips payouts off (merchant.declined) — no listing write; bookability drops instantly.
    expect(deriveBookable(listing, { ...host, payoutsEnabled: false })).toBe(false);
  });

  it("un-sells the moment ops SUSPENDS the host, with nothing else changed (ENF-01, D-222)", () => {
    // The D-14 auto-revert property over the SIXTH input, and this one is driven by OPS. Suspending a
    // host is a single UPDATE on one host_verification row: no listing write, no unpublish, no
    // per-listing sweep - and every one of that host's listings stops being sellable at every one of the
    // seven gate sites at once. THAT IS THE WHOLE OF ENF-01's BLOCK-NEW LEVER, and it is why suspension
    // rides the verification enum instead of getting a check of its own that some path could forget.
    const listing = { status: "published" as const, hasOperatingHours: true, reviewState: PASSING_REVIEW };
    const host = { emailVerified: true, payoutsEnabled: true, verificationStatus: "approved" as const };
    expect(deriveBookable(listing, host)).toBe(true);
    expect(deriveBookable(listing, { ...host, verificationStatus: "suspended" })).toBe(false);
  });

  it("un-sells the moment a MATERIAL EDIT flips the listing back to pending, with nothing else changed (LVER-03, D-232)", () => {
    // The same property over the FIFTH input, driven by the HOST this time: a material edit (address,
    // space type, capacity, photos, price - D-231) flips `approved` back to `pending`, which stops the
    // listing being sellable through this ONE predicate rather than through a second rule bolted onto
    // the edit path. Approval is not a permanent grant, and this case is what says so.
    const host = { emailVerified: true, payoutsEnabled: true, verificationStatus: PASSING_VERIFICATION };
    const listing = { status: "published" as const, hasOperatingHours: true, reviewState: "approved" as const };
    expect(deriveBookable(listing, host)).toBe(true);
    expect(deriveBookable({ ...listing, reviewState: "pending" }, host)).toBe(false);
  });

  it("un-sells the moment the host deletes their LAST hours row, with nothing else changed (consequence 2)", () => {
    // The D-14 auto-revert property, now over a FOURTH input — and this one is driven by the HOST, not by
    // a webhook. Deleting the last operating_hours row costs no listing write and no publish-state change:
    // the listing stays `published`, and simply stops being sellable. The iu7 host signal
    // (loadPublishedListingsMissingHours) fires on exactly this state, so it is never silent.
    const host = { emailVerified: true, payoutsEnabled: true, verificationStatus: PASSING_VERIFICATION };
    const listing = { status: "published" as const, hasOperatingHours: true, reviewState: PASSING_REVIEW };
    expect(deriveBookable(listing, host)).toBe(true);
    expect(deriveBookable({ ...listing, hasOperatingHours: false }, host)).toBe(false);
  });
});
