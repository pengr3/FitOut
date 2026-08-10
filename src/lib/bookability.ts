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
// if each copy is measured independently, so each has its OWN refusal anchor — `L_nohours` in
// tests/booking/state-machine.test.ts and `L_OPEN_NOHOURS` in tests/booking/open-capacity-hold.test.ts.
// Do not fold them into a shared helper.

/**
 * A listing is bookable ⇔ it is published AND the listing has at least one `operating_hours` row AND
 * its host has a verified email AND the host's payouts are enabled (D-15 + audit finding #4). All four
 * must hold; any false → not bookable.
 *
 * `hasOperatingHours` is supplied by the caller — see the module header for why it is an input rather
 * than a query, and where each of the four call sites gets it from.
 */
export function deriveBookable(
  listing: { status: "draft" | "published" | "unlisted"; hasOperatingHours: boolean },
  host: { emailVerified: boolean; payoutsEnabled: boolean },
): boolean {
  return (
    listing.status === "published" &&
    listing.hasOperatingHours &&
    host.emailVerified &&
    host.payoutsEnabled
  );
}
