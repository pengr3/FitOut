// HVER-05 · D-212 · D-237 — "DID A PERSON AT FITOUT LOOK AT THIS?", AS ONE EXPRESSION.
//
// The fact this predicate stands on is small and entirely real. `host_verification.status = 'approved'`
// is written by a named, authenticated staff member (D-218), and `listing.review_state = 'approved'` is
// written the same way about the listing itself. That is the whole of what FitOut knows: someone here
// looked at this account and this listing before it could take bookings.
//
// Nothing else about a host or a space is checked by this product. There is no document (HVER-02
// forbids the column outright), no third-party check (D-206 defers the vendor and ships the manual
// provider), and nobody has been to the space. The badge this predicate gates therefore says exactly
// that much and not one word more — see `fitout-check-badge.tsx` for the copy and the audit behind it.
//
// ══ WHY THIS IS A MODULE AND NOT AN INLINE CONDITION ══════════════════════════════════════════════
//
// `isPubliclyViewable`'s idiom (`public-listing.ts:113`), taken for its MEASURED reason rather than for
// tidiness. Phase 18 found that `og-facts.ts` had written the viewability rule out LONGHAND instead of
// calling it: the compiler saw nothing when the rule gained a term, so a public read of an unreviewed
// listing sat behind a green build until a human noticed. A restatement is not a rule — it is a second
// rule that agrees today.
//
// So: every surface that wants to badge a row CALLS this. A second spelling of the expression anywhere
// in the tree is the defect itself, not a style preference, and the cost of the defect here is a claim
// FitOut cannot support printed on a booker's screen.

/**
 * True only when BOTH the host's account AND this listing were approved by a person at FitOut.
 *
 * ── WHY BOTH TERMS, WHICH IS THE SHARPEST READING IN THE PHASE ────────────────────────────────────
 *
 * D-212's own sentence is about the LISTING ("a grandfathered listing must not show the badge");
 * HVER-05's is about the ROW. Under a host-only rule a grandfathered LISTING owned by an approved HOST
 * would wear the badge — and nobody checked that listing. Under a listing-only rule the mirror image
 * happens. One expression with both terms satisfies both requirements, and there is no third reading
 * of it to get wrong later.
 *
 * ── WHY POSITIVE LITERALS, NEVER A NEGATIVE SPELLING ──────────────────────────────────────────────
 *
 * A negative spelling — a not-equals against the grandfathered value — reads as if it says the same
 * thing and does not: it would let `pending`, `rejected`, `unverified` and `suspended` through, and it
 * would admit every value added to either enum later, on the day it is added. Same fail-closed
 * discipline `booking.ts:193-195` records for its `=== true`, and the same discipline `isPubliclyViewable`
 * and Stage-1's inlined sell gate already use for their own enumerations.
 *
 * ── WHY IT TAKES STRINGS AND NOT THE TWO ENUM TYPES ───────────────────────────────────────────────
 *
 * The same shape `isPubliclyViewable` takes, for the same reason: the callers are a raw postgres.js row
 * (search Stage-1) and a Drizzle row (the listing page), and a nullable string parameter means the
 * LEFT-JOINed absence of a host_verification row cannot be typed away at a call site. A host with no
 * row is not checked, and `undefined` reaches this function and returns false rather than being
 * coerced into something by a non-null assertion.
 *
 * ⚠ The RESULT of this call is what crosses into a client component — never the two statuses. That is
 * what makes D-212 structural rather than conditional: a component that never receives the distinction
 * between `approved` and `grandfathered` cannot render the badge for the wrong one.
 */
export function isFitoutChecked(
  hostStatus: string | null | undefined,
  listingReviewState: string | null | undefined,
): boolean {
  return hostStatus === "approved" && listingReviewState === "approved";
}
