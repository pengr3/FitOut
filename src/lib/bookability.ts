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

/**
 * A listing is bookable ⇔ it is published AND its host has a verified email AND the host's payouts
 * are enabled (D-15). All three must hold; any false → not bookable.
 */
export function deriveBookable(
  listing: { status: "draft" | "published" | "unlisted" },
  host: { emailVerified: boolean; payoutsEnabled: boolean },
): boolean {
  return listing.status === "published" && host.emailVerified && host.payoutsEnabled;
}
