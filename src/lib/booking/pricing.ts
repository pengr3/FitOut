import "server-only";

// Server-authoritative frozen price quote (BOOK-01, D-45/D-46, RESEARCH Pattern 4). Like slots.ts and
// bookability.ts, this is a small, PURE, no-I/O module owning ONE correctness concern: the price the
// server FREEZES into booking.quotedTotalCents at hold time. RailSelectionSummary shows the SAME figure
// for display, and as of D-130 / GATE-05 it no longer computes it — the RSC hands it a server-computed
// all-in table and the client only looks up a key. That value was always display-only and never trusted
// (CLAUDE.md "never trust the client for price/time"); it is now not even derivable there. Phase 5 charges
// against the frozen quotedTotalCents, so this value must not move if listing rates change between hold
// and charge.
//
// Pricing rule (D-45): DISTINCT, NO cap / auto-switch. An hourly run of N whole hours →
// hourlyRateCents × N; a "Book full day" selection → dayRateCents (verbatim, never capped to the cheaper
// option, never auto-switched). Currency is PHP (D-46, the shared DISPLAY_CURRENCY).
//
// SERVER-ONLY (D-34 / GATE-05). Pure and no-I/O, but NOT isomorphic any more: `import "server-only"` on
// line 1 makes Turbopack hard-FAIL `next build` if any client component's import graph reaches this
// module. The module's own header already says the client's copy of this figure "is display-only and
// never trusted"; the guard turns that sentence into something the build enforces. Server Components and
// the transactional createPendingHold path import it freely.

import { DISPLAY_CURRENCY } from "@/lib/money";

export type QuoteInput = {
  startUtc: Date | string;
  endUtc: Date | string;
  fullDay: boolean;
  hourlyRateCents: number | null;
  dayRateCents: number | null;
  // ── D-108 pax pricing (GROUP-01/GROUP-05) — all three OPTIONAL so the flat-listing call is unchanged ──
  /** Base headcount folded into the flat rate; the organizer is attendee #1 (D-113). Defaults to 1. */
  included?: number;
  /**
   * Per-extra-head surcharge in integer centavos. ABSENT or 0 ⇒ a flat rental with NO surcharge machinery:
   * the quote is byte-identical to today (backward-compatible default, zero leak).
   */
  extraHeadFee?: number;
  /** Organizer-declared attendee count; drives the surcharge ONLY when extraHeadFee > 0. Defaults to 1. */
  declaredPax?: number;
};

export type Quote = {
  totalCents: number;
  currency: string;
  hours: number;
  fullDay: boolean;
  /** D-108 heads charged beyond `included` (0 when extraHeadFee is absent/0) — a breakdown line, not a sum. */
  extraHeads: number;
  /** D-108 per-extra-head fee applied, in centavos (0 when extraHeadFee is absent/0). The per-head figure. */
  extraHeadCents: number;
};

const MS_PER_HOUR = 3_600_000;

/**
 * THE INT4 CEILING for every money column a booking freezes (WR-04). `booking.space_price_cents`,
 * `service_fee_cents` and `quoted_total_cents` are all Postgres `integer`, so 2,147,483,647 centavos is a
 * hard limit of the storage, not a policy — a larger value is a `22003` raised by the INSERT, which is
 * neither 23P01 nor 40P01 and so escapes `mapBookingError` as a raw 500 on the money path.
 *
 * Declared HERE, once, beside the functions that compute the products it bounds, and exported so the
 * admissions claim can compare against the same number the docblocks in validation/booking.ts cite. This
 * module still does no enforcing of its own: it stays a pure quote over the listing's own rates, and the
 * claim refuses calmly before a product can reach this size.
 */
export const MAX_MONEY_CENTS = 2_147_483_647;

/** The D-108 surcharge, split into the three figures the breakdown line needs. Never summed by a UI. */
export type PaxSurcharge = {
  /** Heads charged beyond `included` — 0 whenever the listing does not charge per head. */
  extraHeads: number;
  /** The per-extra-head fee actually applied, in centavos — 0 on a flat listing. */
  extraHeadCents: number;
  /** extraHeads × extraHeadCents, in centavos. THE ONLY PLACE THIS PRODUCT IS COMPUTED. */
  surchargeCents: number;
};

/**
 * The D-108 pax surcharge, as ONE function. `quoteWindow` folds its `surchargeCents` into the frozen
 * price, and the reserve page calls the SAME function to label the breakdown line — so the figure a booker
 * reads and the figure they are charged cannot drift apart by restatement (the failure mode the
 * PriceBreakdown zero-arithmetic contract exists to prevent).
 *
 * Gated on `fee > 0` so a flat listing yields exactly zero and the quote stays byte-identical to today;
 * `Math.max(0, …)` floors it so `declaredPax ≤ included` (including organizer-only, D-113) never produces
 * a negative surcharge. Integer centavos throughout — fee and heads are both integers, so there is no
 * float and no second rounding.
 */
export function paxSurcharge(input: {
  included?: number | null;
  extraHeadFee?: number | null;
  declaredPax?: number | null;
}): PaxSurcharge {
  const included = input.included ?? 1; // organizer is attendee #1, folded into the base (D-113)
  const fee = input.extraHeadFee ?? 0;
  const pax = input.declaredPax ?? 1;
  const extraHeads = fee > 0 ? Math.max(0, pax - included) : 0;
  return { extraHeads, extraHeadCents: fee, surchargeCents: extraHeads * fee };
}

/**
 * Whole-hour count of the window [startUtc, endUtc). Both bounds are ABSOLUTE UTC instants that were
 * already produced on-the-hour in the venue tz by slots.ts (via TZDate) upstream, so the number of paid
 * 60-min slots is exactly their epoch delta in hours. This is NOT the DST-unsafe pattern slots.ts warns
 * about — that is wall-clock arithmetic (adding fixed ms to a local time); here we only measure the gap
 * between two instants slots.ts already resolved. `Math.round` absorbs any sub-ms drift and the result is
 * clamped to ≥ 1, byte-identical to the client RailSelectionSummary formula so display and freeze agree.
 */
export function windowHours(startUtc: Date | string, endUtc: Date | string): number {
  const startMs = new Date(startUtc).getTime();
  const endMs = new Date(endUtc).getTime();
  return Math.max(1, Math.round((endMs - startMs) / MS_PER_HOUR));
}

/**
 * Re-derive and freeze the price for a selected window. `hours` comes from the window (never the client);
 * the BASE is `dayRateCents` for a full-day selection, else `hourlyRateCents × hours` (D-45 — distinct,
 * no cap). Throws when the rate the selection requires is absent rather than freezing a $0 charge (a
 * mis-configured listing must never yield a free booking — money-correctness guard).
 *
 * D-108 pax surcharge: `total = base + max(0, declaredPax − included) × extraHeadFee`. The surcharge is
 * HOST REVENUE folded into `totalCents` — the caller (createPendingHold) freezes that into
 * `spacePriceCents`, so it becomes the payout gross basis AND the service-fee basis (A1). `extraHeadFee`
 * absent/0 ⇒ zero surcharge, byte-identical to the flat quote (backward-compat). This module stays PURE
 * over the listing's own rates: it knows nothing of the platform service fee (the 07-08 seam), and the
 * client sends no price — a tampered pax cannot move the charge because the fee/included come from the
 * listing row server-side (D-108, CLAUDE.md "never trust the client for price").
 */
export function quoteWindow(input: QuoteInput): Quote {
  const { fullDay, hourlyRateCents, dayRateCents } = input;
  const hours = windowHours(input.startUtc, input.endUtc);

  let baseCents: number;
  if (fullDay) {
    if (dayRateCents == null) throw new Error("Listing has no day rate for a full-day booking");
    baseCents = dayRateCents; // flat day rate — NO cap, NO auto-switch (D-45)
  } else {
    if (hourlyRateCents == null) throw new Error("Listing has no hourly rate for an hourly booking");
    baseCents = hourlyRateCents * hours;
  }

  // D-108 surcharge — delegated to `paxSurcharge` above so the reserve page's breakdown line and this
  // frozen price are produced by the SAME code, never by two copies of the formula.
  const { extraHeads, extraHeadCents, surchargeCents } = paxSurcharge(input);

  return {
    totalCents: baseCents + surchargeCents,
    currency: DISPLAY_CURRENCY,
    hours,
    fullDay,
    extraHeads,
    extraHeadCents,
  };
}

/** OC-08 open-capacity quote input. NO amount field and NO window (D-49 discipline + OC-02): the price comes
 *  only from the listing's own per-head rate, read server-side inside the claim transaction. */
export type OpenCapacityQuoteInput = { perHeadPriceCents: number | null; heads: number };

/** The frozen open-capacity quote. `totalCents` is the SPACE price only — the D-74 service fee is composed
 *  at the caller, exactly as it is for quoteWindow. */
export type OpenCapacityQuote = {
  totalCents: number;
  currency: string;
  perHeadPriceCents: number;
  heads: number;
};

/**
 * OC-08 open-capacity price freeze: PURELY LINEAR, per head, with NO duration term. A drop-in pass costs the
 * same whether the guest stays one hour or all day (OC-02 — duration NEVER scales price), so this function
 * takes no window at all. It deliberately does NOT reuse the D-108 included/extraHeadFee base+surcharge pair:
 * open pricing has no included base (D-125).
 *
 * THROWS when perHeadPriceCents is null — mirroring quoteWindow's "no rate for this booking shape" rule
 * above. Freezing a ₱0 charge would sell a pass for nothing; the publish gate makes the column non-null for
 * every open listing, so a null here is a real invariant break, not a user error.
 *
 * The platform service fee is composed AT THE CALLER (createOpenCapacityHold), never here — this module
 * stays pure over the listing's own rates, exactly as it does for quoteWindow (the 07-08 seam).
 */
export function quoteOpenCapacity(input: OpenCapacityQuoteInput): OpenCapacityQuote {
  if (input.perHeadPriceCents == null) {
    throw new Error("Listing has no per-head price for an open-capacity booking");
  }
  if (!Number.isInteger(input.heads) || input.heads < 1) {
    throw new Error("Open-capacity heads must be a positive integer");
  }
  return {
    totalCents: input.perHeadPriceCents * input.heads,
    currency: DISPLAY_CURRENCY,
    perHeadPriceCents: input.perHeadPriceCents,
    heads: input.heads,
  };
}
