// Server-authoritative frozen price quote (BOOK-01, D-45/D-46, RESEARCH Pattern 4). Like slots.ts and
// bookability.ts, this is a small, PURE, no-I/O module owning ONE correctness concern: the price the
// server FREEZES into booking.quotedTotalCents at hold time. The client RailSelectionSummary
// (availability-calendar.tsx:246-251) computes the SAME figure for display, but that value is
// display-only and never trusted (CLAUDE.md "never trust the client for price/time"). Phase 5 charges
// against the frozen quotedTotalCents, so this value must not move if listing rates change between hold
// and charge.
//
// Pricing rule (D-45): DISTINCT, NO cap / auto-switch. An hourly run of N whole hours →
// hourlyRateCents × N; a "Book full day" selection → dayRateCents (verbatim, never capped to the cheaper
// option, never auto-switched). Currency is PHP (D-46, the shared DISPLAY_CURRENCY).
//
// Pure/isomorphic: no "use client"/"use server" directive so Server Components and the transactional
// createPendingHold path can both import it.

import { DISPLAY_CURRENCY } from "@/lib/money";

export type QuoteInput = {
  startUtc: Date | string;
  endUtc: Date | string;
  fullDay: boolean;
  hourlyRateCents: number | null;
  dayRateCents: number | null;
};

export type Quote = {
  totalCents: number;
  currency: string;
  hours: number;
  fullDay: boolean;
};

const MS_PER_HOUR = 3_600_000;

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
 * `totalCents` is `dayRateCents` for a full-day selection, else `hourlyRateCents × hours` (D-45 — distinct,
 * no cap). Throws when the rate the selection requires is absent rather than freezing a $0 charge (a
 * mis-configured listing must never yield a free booking — money-correctness guard).
 */
export function quoteWindow(input: QuoteInput): Quote {
  const { fullDay, hourlyRateCents, dayRateCents } = input;
  const hours = windowHours(input.startUtc, input.endUtc);

  let totalCents: number;
  if (fullDay) {
    if (dayRateCents == null) throw new Error("Listing has no day rate for a full-day booking");
    totalCents = dayRateCents; // flat day rate — NO cap, NO auto-switch (D-45)
  } else {
    if (hourlyRateCents == null) throw new Error("Listing has no hourly rate for an hourly booking");
    totalCents = hourlyRateCents * hours;
  }

  return { totalCents, currency: DISPLAY_CURRENCY, hours, fullDay };
}
