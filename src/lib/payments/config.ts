// Tunable payment constants for Phase 5 (PAY-01..03) — the SINGLE named source for the phase's
// money mechanics. Mirrors the exported-constant idiom of HOLD_TTL_MINUTES (units.ts) and
// DISPLAY_CURRENCY (money.ts): the exported NAME is imported everywhere, never a hardcoded literal.
//
// These are MECHANISM DEFAULTS that Phase 7 can tune (policy) without touching the plumbing — do NOT
// hardcode 10% / 24h / 60m at any call site; import these names instead. A value may read process.env
// with a documented default, but the exported constant is the single source of truth.
//
// Pure/isomorphic: no "use client"/"use server" directive AND NO `server-only` GUARD, so Server
// Components, server actions, the commission calculator, the payout sweep — and two shipped CLIENT
// components — can all import it. That last clause is the whole reason this file is unguarded and must
// stay so: `slot-picker.tsx:43` reads MIN_LEAD_INSTANT_MINUTES / MIN_LEAD_REQUEST_HOURS and
// `request-row.tsx:34` reads APPROVAL_PAYMENT_WINDOW_HOURS, both legitimately (a lead time is not a
// price). Adding `import "server-only"` here fails the build naming those two files, which are NOT
// violations — see src/lib/payments/fees.ts and tests/design/server-only-guards.test.ts.
//
// WHAT LEFT THIS FILE (D-34 / GATE-05): SERVICE_FEE_BPS, COMMISSION_RATE_BPS and HOST_CANCEL_FEE_CENTS
// now live in src/lib/payments/fees.ts, which IS guarded. What stays below is timing, windows and payout
// cadence — nothing here decides what anybody is charged or paid.

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

/** D-95 post-approval payment window (hours) — 12h, PARTIALLY SUPERSEDING D-64's 24h. Once a request is
 *  `approved`, the booker has this long to pay; an unpaid `approved` hold auto-releases the slot afterward
 *  (nothing reverses — no charge was ever made, pay-on-approval D-63). Worst-case request-to-book slot hold
 *  is now min(36h, time-to-start), down from a flat 48h.
 *
 *  D-89 — DO NOT SHORTEN THIS FURTHER. The window is deliberately FORGIVING, not fast: the notification
 *  stack (email + in-app only, one reminder each, D-82/D-87) is reliable but NOT unmissable, and a short
 *  window makes a missed notification fatal. The user was shown this coupling explicitly and re-confirmed
 *  the stack. SMS for "approved — pay now" is the designated fast-follow that would make a fast window safe. */
export const APPROVAL_PAYMENT_WINDOW_HOURS = Number(process.env.APPROVAL_PAYMENT_WINDOW_HOURS ?? 12);

// ---------------------------------------------------------------------------
// Phase 7 (D-93/D-95/D-96) — the expiry-cap guards and the four reminder offsets. Same contract as
// above: the exported NAME is imported everywhere; never hardcode 2h / 30min / 4h at a call site.
//
// The cancellation economics that used to sit here (D-71/D-74/D-76 — the booker-facing service fee and
// the host-cancellation fee) moved to the guarded src/lib/payments/fees.ts. See the header.
// ---------------------------------------------------------------------------

/** D-93/D-96 minimum lead time to CREATE a request-to-book, in hours. Request-to-book needs TWO humans in
 *  sequence (host approves, then booker pays), so it needs real runway. Applies to request mode ONLY. */
export const MIN_LEAD_REQUEST_HOURS = Number(process.env.MIN_LEAD_REQUEST_HOURS ?? 2);

/** D-96 minimum lead time to CREATE an instant-book hold, in minutes. Instant-book is ONE person and ONE
 *  checkout, so this is a checkout-sized guard, not a two-human one. Deliberately small so same-day
 *  instant-book stays available. */
export const MIN_LEAD_INSTANT_MINUTES = Number(process.env.MIN_LEAD_INSTANT_MINUTES ?? 30);

/** D-93/D-96 minimum remaining window below which an APPROVE is refused (and the request auto-declines
 *  with an honest "too close to start" message). Also the FLOOR of the D-96 proportional split, so a
 *  cap-shortened SLA can never collapse to a useless window. */
export const MIN_APPROVE_WINDOW_HOURS = Number(process.env.MIN_APPROVE_WINDOW_HOURS ?? 1);

/** D-85/D-87 reminder offsets, in hours before the relevant deadline. Each reminder fires AT MOST ONCE —
 *  the guarantee is the booking_reminder UNIQUE(booking_id, kind) claim, never an Inngest dedupe TTL.
 *  Offsets are >= 2h because the reminder cron is hourly and cannot hit a tighter offset precisely. */
/** 1/3 of the D-95 12h payment window — the HIGHEST-VALUE reminder (the one D-89 accepted risk on). */
export const PRE_EXPIRY_REMINDER_HOURS = Number(process.env.PRE_EXPIRY_REMINDER_HOURS ?? 4);
/** 1/4 of the 24h SLA. A D-96 cap-shortened SLA may make this unreachable — correct, and asserted in test. */
export const PRE_SLA_REMINDER_HOURS = Number(process.env.PRE_SLA_REMINDER_HOURS ?? 6);
/** Industry standard; long enough that the booker can still cancel under the Flexible 12h rung. */
export const PRE_SESSION_BOOKER_REMINDER_HOURS = Number(process.env.PRE_SESSION_BOOKER_REMINDER_HOURS ?? 24);
/** The host needs prep lead time, not cancellation lead time. */
export const PRE_SESSION_HOST_REMINDER_HOURS = Number(process.env.PRE_SESSION_HOST_REMINDER_HOURS ?? 12);

// ---------------------------------------------------------------------------
// Phase-8 residual closure (T-08-79, quick task 260801-kv2) — the checkout-lease TTL. Same contract as
// everything above: the exported NAME is bound into the lease predicate, never a literal at a call site.
// ---------------------------------------------------------------------------

/** T-08-79 checkout-lease TTL, in SECONDS. `src/lib/payments/checkout-lease.ts` claims a compare-and-swap
 *  lease on a booking before confirmBooking talks to PayMongo; a lease older than this is re-claimable, so a
 *  crashed or SIGKILLed attempt self-heals with no sweep, no cron and no operator.
 *
 *  WHY 90, IN BOTH DIRECTIONS — this number is bounded from below AND above, and the floor is the dangerous
 *  side:
 *   - FLOOR. The lease covers exactly two PayMongo HTTPS round-trips (expire + create) plus two local
 *     UPDATEs. `paymongoFetch` sets NO timeout on either of them — so a degraded provider can take tens
 *     of seconds. A TTL shorter than that slow path would let a retry OVERTAKE a still-live attempt and
 *     re-open the very race this closes. 90s is roughly 45x the normal ~2s cost.
 *   - CEILING. A crashed attempt must not wedge the booker for a meaningful slice of the 60-minute
 *     PAYMENT_WINDOW_MINUTES — 90s is 2.5% of it — and one wait-then-retry must still fit the 5/60s
 *     confirm-pay budget, which it does with room to spare.
 *
 *  NAMED RESIDUAL (T-KV2-04) — NARROWED by plan 13-03 (D-84), NOT closed. What changed: `paymongoFetch`
 *  now ACCEPTS an `AbortSignal`, and `getCheckoutSession(id, { timeoutMs })` can be given a deadline per
 *  call. What did NOT change, and is the half that still matters here: the deadline is OPT-IN, and every
 *  money-path caller — confirmBooking's expire, its create, and expireCheckoutSession's own LW-01 re-probe
 *  — still passes NONE, deliberately (a deadline on the re-probe turns "the provider says this session is
 *  retired" into a new way to fail closed on the double-charge guard). So the FLOOR argument above stands
 *  unchanged and the 90s is still bounding an unbounded call. Only the booker-facing probe
 *  (src/lib/payments/checkout-probe.ts) opts in. Making the bound TOTAL still means giving the two
 *  lease-covered calls a deadline, and that is still a money-path decision nobody has taken.
 *
 *  `Math.round` is load-bearing, not decoration: the value is bound into `make_interval(secs => ...::int)`,
 *  so a fractional env override would raise a cast error ON THE MONEY PATH instead of quietly working. */
export const CHECKOUT_LEASE_TTL_SECONDS = Math.round(
  Number(process.env.CHECKOUT_LEASE_TTL_SECONDS ?? 90),
);
