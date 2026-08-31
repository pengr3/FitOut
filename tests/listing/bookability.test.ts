// D-15 / D-14 + v1.0 audit finding #4: deriveBookable is the pure sell-gate. A listing is bookable ⇔
// published AND the host's email is verified AND the host's payouts are enabled AND THE LISTING HAS AT
// LEAST ONE `operating_hours` ROW. This drives the full 16-row truth table
// (published? × emailVerified × payoutsEnabled × hasOperatingHours), asserting ONLY the all-true row is
// bookable, plus TWO auto-revert cases: the D-14 payouts flip and the new last-hours-row deletion.
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
