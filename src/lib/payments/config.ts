// Tunable payment constants for Phase 5 (PAY-01..03) — the SINGLE named source for the phase's
// money mechanics. Mirrors the exported-constant idiom of HOLD_TTL_MINUTES (units.ts) and
// DISPLAY_CURRENCY (money.ts): the exported NAME is imported everywhere, never a hardcoded literal.
//
// These are MECHANISM DEFAULTS that Phase 7 can tune (policy) without touching the plumbing — do NOT
// hardcode 10% / 24h / 60m at any call site; import these names instead. A value may read process.env
// with a documented default, but the exported constant is the single source of truth.
//
// Pure/isomorphic: no "use client"/"use server" directive, so Server Components, server actions, the
// commission calculator, and the payout sweep can all import it.

/** Platform commission rate in basis points (D-51). 1000 bps = 10%. Config-tunable, host-side (D-50). */
export const COMMISSION_RATE_BPS = Number(process.env.COMMISSION_RATE_BPS ?? 1000);

/** Payout eligibility delay after the session ENDS (D-55). T+24h anchored to booking.endsAt. */
export const PAYOUT_DELAY_HOURS = Number(process.env.PAYOUT_DELAY_HOURS ?? 24);

/** Checkout payment window (D-58). Extends the 15-min pending hold to align with the PayMongo session
 *  so a paying booker keeps their slot and the hold no longer expires mid-payment. */
export const PAYMENT_WINDOW_MINUTES = Number(process.env.PAYMENT_WINDOW_MINUTES ?? 60);

/** WR-04 bounded retry of a `failed` payout. A failed row is re-swept only after this backoff has elapsed
 *  (since its last attempt / updated_at), so a transient PayMongo error (network blip, 5xx) recovers on the
 *  next cadence instead of parking forever. The stable `payout:<bookingId>` Idempotency-Key makes the
 *  re-attempt double-pay-safe. */
export const PAYOUT_RETRY_BACKOFF_HOURS = Number(process.env.PAYOUT_RETRY_BACKOFF_HOURS ?? 1);

/** WR-04 upper bound on automated payout retries: a `failed` row is only re-swept while its ORIGINAL claim
 *  (created_at) is within this window. Beyond it the row stays `failed` for manual operator review (the
 *  reconcile stuck-held / transfer-failed alerts surface it) so a genuinely-broken payout can't retry forever. */
export const PAYOUT_RETRY_MAX_AGE_HOURS = Number(process.env.PAYOUT_RETRY_MAX_AGE_HOURS ?? 72);

/** D-64 request-to-book host approval SLA (hours). A `requested` hold auto-declines if the host does not
 *  approve within this window — the Phase-6 approval sweep reads this. Config-tunable so policy can change
 *  without touching the plumbing; never hardcode 24 at a call site (import this NAME). */
export const APPROVAL_SLA_HOURS = Number(process.env.APPROVAL_SLA_HOURS ?? 24);

/** D-64 post-approval payment window (hours). Once a request is `approved`, the booker has this long to pay
 *  via the Phase-5 checkout; an unpaid `approved` hold auto-releases the slot afterward (nothing reverses —
 *  no charge was ever made, pay-on-approval). Config-tunable, mirrors the approval-SLA constant above. */
export const APPROVAL_PAYMENT_WINDOW_HOURS = Number(process.env.APPROVAL_PAYMENT_WINDOW_HOURS ?? 24);
