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
