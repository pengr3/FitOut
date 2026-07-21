// BOOK-07 / PAY-06 refund ladder (D-68) — the pure, integer-cents quote every peso of a booker
// cancellation flows from. Mirrors src/lib/payments/commission.ts: a small, PURE, no-I/O module owning ONE
// correctness concern, throwing rather than silently freezing a wrong number.
//
// THE LADDER IS COMPRESSED, DELIBERATELY. Industry-standard windows (Strict at 7 days) were REJECTED:
// at FitOut's real lead time — hourly sessions booked days out, not multi-night stays booked months out —
// a 7-day full-refund rung would make Strict listings effectively NEVER refundable, so the tier would stop
// being a tier. Flexible 12h / Standard 24h→6h / Strict 48h→24h are the FitOut-scale equivalents.
//
// ROUNDING DISCIPLINE (load-bearing): the refund is rounded ONCE; the retained remainder is derived by
// SUBTRACTION. Rounding both independently can lose or invent a centavo — the exact class of bug
// commission.ts guards against with its single-defined-rounding rule. A property test sweeps the price
// range and asserts spaceRefundCents + retainedSpaceCents === spacePriceCents exactly.
//
// DB-CLOCK RULE: this module NEVER reads a clock. `now` is a required parameter and both the preview RSC
// and the cancel server action are contractually required to pass the Postgres now() value. Rung
// boundaries are SHARP; if the two surfaces straddled a boundary on two different clocks, the booker
// would be shown one number and given another — which breaks SC#2's core promise.
//
// Pure/isomorphic: no "use client"/"use server" directive, so the cancel-review RSC, the cancel server
// action and the Inngest notification composer can all import it.

export type CancellationTier = "flexible" | "standard" | "strict";
export type Rung = { minHours: number; refundBps: number };

/** D-68 ladder. Rungs are DESCENDING by minHours; the FIRST rung whose minHours is satisfied wins.
 *  Config-adjacent but STRUCTURAL — the SHAPE is policy (how many rungs, at what percentages), not a
 *  tunable scalar, so it lives here rather than as loose env constants in config.ts.
 *  Flexible: 100% >=12h. Standard: 100% >=24h, 50% 24h->6h. Strict: 100% >=48h, 50% 48h->24h. */
export const LADDER: Record<CancellationTier, Rung[]> = {
  flexible: [
    { minHours: 12, refundBps: 10000 },
  ],
  standard: [
    { minHours: 24, refundBps: 10000 },
    { minHours: 6, refundBps: 5000 },
  ],
  strict: [
    { minHours: 48, refundBps: 10000 },
    { minHours: 24, refundBps: 5000 },
  ],
};

const HOUR_MS = 3_600_000;

export type RefundQuote = {
  /** The tier the quote was computed under — the booking-row SNAPSHOT, never the listing's current tier. */
  tier: CancellationTier;
  /** Exact fractional hours from `now` to `startsAt`. Negative once the session has started. */
  hoursToStart: number;
  /** The rung awarded, in basis points. 0 when no rung is satisfied. */
  refundBps: number;
  /** Refunded portion of the SPACE price only. */
  spaceRefundCents: number;
  /** Retained space price — becomes the payout gross (D-69). */
  retainedSpaceCents: number;
  /** Always 0 — the service fee is non-refundable (D-74). Explicit for the D-78 breakdown. */
  serviceFeeRefundCents: number;
  /** What actually goes back to the booker. */
  totalRefundCents: number;
};

/**
 * Quote the refund for cancelling a booking, in integer centavos.
 *
 * `tier`, `spacePriceCents` and `serviceFeeCents` MUST be sourced from the frozen `booking` row — the tier
 * from `booking.cancellation_policy` (the D-67 SNAPSHOT, so a host retiering the listing never rewrites the
 * terms of an in-flight booking), the amounts from the frozen price columns. NO parameter may ever be
 * populated from a request body: the client sends a booking id and nothing else.
 *
 * Money guard: throws on a non-integer/negative amount rather than freeze a nonsense refund.
 */
export function quoteRefund(input: {
  tier: CancellationTier;
  spacePriceCents: number;
  serviceFeeCents: number;
  startsAt: Date;
  /** ALWAYS the DB clock (SELECT now()) — never a JS-side clock read at a call site. See the header. */
  now: Date;
}): RefundQuote {
  const { tier, spacePriceCents, serviceFeeCents, startsAt, now } = input;

  if (!Number.isInteger(spacePriceCents) || spacePriceCents < 0)
    throw new Error("space price must be a non-negative integer number of centavos");
  if (!Number.isInteger(serviceFeeCents) || serviceFeeCents < 0)
    throw new Error("service fee must be a non-negative integer number of centavos");

  // Absolute-instant arithmetic, so the result is DST-safe by construction: a wall-clock difference across
  // a DST transition would read an hour long or short and could award the wrong rung.
  const hoursToStart = (startsAt.getTime() - now.getTime()) / HOUR_MS;

  // Rungs are descending, so the first satisfied one is the most generous the booker qualifies for. The
  // boundary is INCLUSIVE (>=): at exactly 24h a Standard booker still gets 100%. Nothing satisfied — which
  // includes every negative hoursToStart, i.e. a session that already started — falls through to 0.
  const rung = LADDER[tier].find((r) => hoursToStart >= r.minHours);
  const refundBps = rung?.refundBps ?? 0;

  const spaceRefundCents = Math.round((spacePriceCents * refundBps) / 10000); // the ONE rounding

  return {
    tier,
    hoursToStart,
    refundBps,
    spaceRefundCents,
    // SUBTRACTION, never a second rounding — see the header's rounding-discipline note.
    //
    // D-69: retainedSpaceCents becomes the booking's payout GROSS. The host receives retained − 10%
    // commission and the platform keeps 10%; the payout sweep reads this column (see Plan 04 — the sweep
    // predicate had to be widened; D-69's "zero new mechanism" was not true).
    retainedSpaceCents: spacePriceCents - spaceRefundCents,
    // D-74: the service fee is NON-REFUNDABLE. Explicit (not omitted) so the D-78 itemised breakdown can
    // render the ₱0 line and its "Service fees aren't refunded" helper unconditionally — including on a
    // 100% refund, because that is the one place a booker could be surprised.
    serviceFeeRefundCents: 0,
    totalRefundCents: spaceRefundCents, // the fee is excluded from what goes back
  };
}

/**
 * D-81: the concrete instants each rung boundary falls on, so the disclosure can say "Free cancellation
 * until Thu 3 Jul, 8:00 PM" rather than an abstract percentage. A refund promise the booker demonstrably
 * saw is the only kind enforceable in spirit.
 *
 * Performs NO formatting — the caller composes venue-local strings via @date-fns/tz, reusing the same
 * whenLabel composition every other time surface uses so they all read identically.
 */
export function rungBoundaries(
  tier: CancellationTier,
  startsAt: Date,
): { refundBps: number; boundary: Date }[] {
  return LADDER[tier].map((r) => ({
    refundBps: r.refundBps,
    boundary: new Date(startsAt.getTime() - r.minHours * HOUR_MS),
  }));
}

/** Pre-Phase-7 bookings predate the tier snapshot. Fall back to FLEXIBLE — the most booker-friendly
 *  option, matching the D-62 precedent for legacy-row handling. There will be very few. */
export function tierOrDefault(tier: CancellationTier | null | undefined): CancellationTier {
  return tier ?? "flexible";
}
