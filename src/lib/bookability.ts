// The bookability sell-gate (D-14/D-15) — the SINGLE place that decides whether a listing may be
// sold. Like src/lib/profile.ts's publicProfile projection, this module defines a boundary so it can
// never be bypassed: downstream phases (3 availability, 4 search/CTA, 6 instant/request) read ONLY
// deriveBookable — never `status` alone — so "published" can never be mistaken for "sellable".
//
// Bookability is DERIVED, never independently settable. `payoutsEnabled` is a webhook-maintained
// cached flag on the host's host_payout row (set from PayMongo merchant.activated — Plan 06). Because
// this is pure derivation, D-14 auto-revert is free: when the webhook flips payoutsEnabled=false,
// every derive returns false with zero per-listing writes. Pure — no DB, no I/O — so the truth-table
// unit test (tests/listing/bookability.test.ts) drives it directly.
//
// ── THE FOURTH TERM: `hasOperatingHours` (v1.0 audit finding #4, quick task 260810-sti) ──────────────
//
// A listing with an empty weekly calendar may still be PUBLISHED. It is simply not SELLABLE. Before
// this term, a host could go Live with no hours and every booker who opened the listing saw each date
// render Closed with no route forward, while the listing kept appearing in search.
//
// WHY A DERIVATION AND NOT A PUBLISH GATE — decided by the operator, recorded so it is not relitigated:
//   1. A publish gate only prevents NEW cases. Listings already live with an empty calendar would stay
//      live and stay a dead end — which is exactly why 260801-iu7 shipped a host-side SIGNAL first.
//   2. A gate blocks a legitimate host who wants to publish now and set hours thirty seconds later.
//   3. This module exists to express exactly this state. A listing that cannot be sold for lack of
//      hours is this boundary doing its job.
// `publishListing` and `publishSchema` are untouched. Publishing behaviour is exactly what it was.
//
// WHY IT IS A PARAMETER AND NOT A LOOKUP. Two properties had to survive, and both are load-bearing:
//   - PURITY. No `await`, no `db` import, no I/O — which is what lets the 16-row truth table drive this
//     function directly rather than through a fixture database.
//   - COMPILER-FORCED CALL-SITE ENUMERATION. Every call site builds a FRESH OBJECT LITERAL, so adding a
//     required field to the listing parameter makes each one a compile error. The census of who must
//     answer this question is done by tsc, not by grep. There are four, and each pays a different way:
//     the listing page rides an existing Promise.all, both booking mutations fold a correlated EXISTS
//     into a SELECT they were already issuing, and the host grid reuses iu7's one grouped query.
//
// THIS PREDICATE HAS AN INLINED SQL TWIN — src/lib/search/query.ts Stage-1 (Pitfall 5). Earlier tasks
// protected that pairing with a `git diff --exit-code` byte-unchanged gate on both files; this change
// had to move both, so that gate is RETIRED and something stronger replaces it:
// tests/search/bookable-gate.test.ts imports this function and asserts the SQL result set EQUALS the
// set this predicate accepts over shared fixtures. Drift in either direction fails there.
//
// AND IT HAS TWO SERVER-SIDE RE-DERIVATION SITES, written by RE-STATEMENT rather than extraction:
// `placeHold` and `placeOpenHold` in src/app/actions/booking.ts (see that file's docblock at :351-354
// for why the duplication is deliberate). Duplicated security code on the money path only stays honest
// if each copy is measured independently, so each has its OWN refusal anchors — for the fourth term,
// `L_nohours` in tests/booking/state-machine.test.ts and `L_OPEN_NOHOURS` in
// tests/booking/open-capacity-hold.test.ts; for the fifth and sixth, `L_pending_review` and
// `L_OPEN_PENDING_REVIEW` in the same two files. Do not fold them into a shared helper.
//
// ── THE FIFTH AND SIXTH TERMS: `listing.reviewState` + `host.verificationStatus` (phase 18, D-224) ────
//
// A space cannot be SOLD on FitOut until a person at FitOut has checked who the host is and that the
// listing is real. Before these terms, "published" plus "the host clicked a link in an email" was the
// whole of FitOut's identity story, and there was no lever to pull a listing that had already been
// approved. The two terms are one per side of the marketplace:
//   - listing: `reviewState === 'approved' || reviewState === 'grandfathered'`   (LVER-01)
//   - host:    `verificationStatus === 'approved' || verificationStatus === 'grandfathered'` (HVER-03)
//
// POSITIVE LITERALS ONLY, IN BOTH TERMS, AND THIS IS NOT STYLE. The obvious-looking spelling
// `!== 'suspended'` reads identically today and is wrong in exactly the way that costs money: it admits
// `pending`, `rejected`, `withdrawn`, `unverified` and every value a future migration adds. Enumerate
// what PASSES; anything else — present, absent or invented later — fails.
//
// AND FAIL CLOSED ON ABSENCE. `host_verification` is 1:1 to `user` but is NOT created with the user, so
// a host with NO ROW is the common case, not the edge case. Every caller resolves a missing row to
// `'unverified'` before this function sees it (`?? "unverified"` in TypeScript,
// `COALESCE(hv.status::text,'unverified')` in the SQL twin) — the same shape `payoutsEnabled ?? false`
// already has. A NULL that reached the positive comparison would fail anyway; the coalesce is what makes
// that answer INTENTIONAL rather than incidental.
//
// WHY THEY ARE PARAMETERS AND NOT LOOKUPS — the same two properties as the fourth term, for the same two
// reasons. PURITY keeps the truth table driving this function directly (a lookup would need a fixture
// database to answer "is this host verified?"), and COMPILER-FORCED CALL-SITE ENUMERATION is the whole
// mechanism: both are REQUIRED fields on the existing object literals, never optional and never
// defaulted, so `tsc` — not grep — is the census of who must answer. An optional field with a default
// would have let every call site compile unchanged and silently sold unreviewed space.
//
// THEY ARE INDEPENDENT OF `payoutsEnabled` (D-225), AND THAT FLAG IS NOT REMOVED. `payoutsEnabled` was
// once expected to double as the identity gate — a host who cleared PayMongo's KYC would have been
// checked by somebody. It cannot be, and the reason is structural rather than temporary: PayMongo
// Linked Accounts is sales-gated, so in production that flag never turns true on its own merits. Never
// express either new term as a function of `payoutsEnabled`, and never delete `payoutsEnabled` in
// favour of them — it answers a DIFFERENT question ("can FitOut pay this host?"), and both answers are
// required before money moves.
//
// `suspended` FAILING THE HOST TERM IS THE WHOLE OF ENF-01's BLOCK-NEW LEVER (D-222). Suspension is a
// value of the SAME enum this term reads, so it is enforced by the SAME read at every one of the seven
// gate sites. There is deliberately no second suspension check anywhere in the codebase: a second check
// is a second thing to forget, and the one place it would be forgotten is the newest code path.
//
// `grandfathered` PASSES BOTH TERMS, DELIBERATELY (D-210/D-211). The catalogue that existed before this
// phase was never reviewed, and D-210 narrows Success Criterion 2 to listings created or materially
// edited AFTER it: making the live catalogue unsellable overnight is a worse failure than shipping the
// gate with a grandfathered cohort. It stays a DISTINCT state rather than being written as `approved`,
// so a future PM can burn the backlog down with one statement and so the booker-facing badge (D-212)
// can refuse to claim FitOut checked something it did not.

import type { HostVerificationStatus, ListingReviewState } from "@/lib/db/schema";

/**
 * A listing is bookable ⇔ it is published AND the listing has at least one `operating_hours` row AND
 * ops has approved (or grandfathered) the LISTING AND its host has a verified email AND the host's
 * payouts are enabled AND ops has approved (or grandfathered) the HOST (D-15 + audit finding #4 +
 * D-224). All six must hold; any false → not bookable.
 *
 * `hasOperatingHours`, `reviewState` and `verificationStatus` are all supplied by the caller — see the
 * module header for why they are inputs rather than queries, and where each of the call sites gets them
 * from. A host with no `host_verification` row must arrive here as `"unverified"`, never as null.
 */
export function deriveBookable(
  listing: {
    status: "draft" | "published" | "unlisted";
    hasOperatingHours: boolean;
    reviewState: ListingReviewState;
  },
  host: {
    emailVerified: boolean;
    payoutsEnabled: boolean;
    verificationStatus: HostVerificationStatus;
  },
): boolean {
  return (
    listing.status === "published" &&
    listing.hasOperatingHours &&
    // LVER-01. Positive literals, never `!== 'pending'` — see the module header.
    (listing.reviewState === "approved" || listing.reviewState === "grandfathered") &&
    host.emailVerified &&
    host.payoutsEnabled &&
    // HVER-03 + ENF-01: `suspended`, `pending`, `rejected` and `unverified` all fail here, which is why
    // suspension needs no second check anywhere.
    (host.verificationStatus === "approved" || host.verificationStatus === "grandfathered")
  );
}
