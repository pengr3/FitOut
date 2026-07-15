// Server-authoritative frozen quote (BOOK-01, D-45/D-46) + the FIT- booking reference (A6, Security V6).
//
// PURE table-driven unit test — no DB/IO — mirroring tests/listing/bookability.test.ts. It proves two
// correctness facts the server owns and the client can never assert:
//   - quoteWindow derives the price SOLELY from the window (hours) × the listing rate (D-45: distinct,
//     NO cap / auto-switch). There is deliberately NO client-total parameter, so a tampered
//     RailSelectionSummary figure (availability-calendar.tsx:246-251, display-only) is structurally
//     irrelevant — the value frozen into booking.quotedTotalCents comes only from window + rate.
//   - makeBookingReference mints a non-sequential FIT- + 8 Crockford base32 (no I/L/O/U) reference from a
//     crypto-random source — distinct across calls.

import { describe, it, expect } from "vitest";
import { quoteWindow } from "@/lib/booking/pricing";
import { makeBookingReference } from "@/lib/booking/reference";

// A UTC window `h` whole hours long, anchored on-the-hour (the D-22 granularity the slot grid enforces).
function windowOf(hours: number): { startUtc: string; endUtc: string } {
  const start = new Date("2026-08-01T02:00:00.000Z");
  const end = new Date(start.getTime() + hours * 3_600_000);
  return { startUtc: start.toISOString(), endUtc: end.toISOString() };
}

const HOURLY = 5000; // ₱50.00/hr in integer minor units
const DAY = 30000; // ₱300.00/day

describe("quoteWindow — server-authoritative frozen quote (D-45/D-46)", () => {
  // Hourly runs: totalCents = hourlyRateCents × whole-hour count; currency is always php.
  const hourlyRows: Array<{ hours: number; expected: number }> = [
    { hours: 1, expected: 5000 },
    { hours: 2, expected: 10000 },
    { hours: 3, expected: 15000 },
    { hours: 8, expected: 40000 },
  ];

  for (const r of hourlyRows) {
    it(`hourly run of ${r.hours}h → hourlyRateCents×${r.hours} = ${r.expected} (php)`, () => {
      const q = quoteWindow({
        ...windowOf(r.hours),
        fullDay: false,
        hourlyRateCents: HOURLY,
        dayRateCents: DAY,
      });
      expect(q.totalCents).toBe(r.expected);
      expect(q.hours).toBe(r.hours);
      expect(q.fullDay).toBe(false);
      expect(q.currency).toBe("php");
    });
  }

  it("full day → dayRateCents flat, regardless of the window length (D-45: no auto-switch, no cap)", () => {
    // An 8h window would be 40000 hourly, but fullDay freezes the flat day rate (30000) — NOT capped
    // to the cheaper of the two, NOT auto-switched. The flat rate wins in both directions below.
    const q = quoteWindow({
      ...windowOf(8),
      fullDay: true,
      hourlyRateCents: HOURLY,
      dayRateCents: DAY,
    });
    expect(q.totalCents).toBe(DAY);
    expect(q.fullDay).toBe(true);
    expect(q.currency).toBe("php");
  });

  it("full day does NOT cap to hourly even when the day rate is the more expensive option (no cap)", () => {
    // 1h hourly = 5000; a pricey day rate (100000) still applies verbatim for a full-day selection.
    const q = quoteWindow({
      ...windowOf(1),
      fullDay: true,
      hourlyRateCents: HOURLY,
      dayRateCents: 100000,
    });
    expect(q.totalCents).toBe(100000);
  });

  it("derives price ONLY from window × rate — there is no client-total input to tamper with", () => {
    // Two calls with the same window + rate always agree; the price cannot be influenced by any
    // client-supplied figure because quoteWindow accepts none (T-04-PRICETAMPER).
    const a = quoteWindow({ ...windowOf(2), fullDay: false, hourlyRateCents: HOURLY, dayRateCents: DAY });
    const b = quoteWindow({ ...windowOf(2), fullDay: false, hourlyRateCents: HOURLY, dayRateCents: DAY });
    expect(a.totalCents).toBe(10000);
    expect(b.totalCents).toBe(a.totalCents);
  });

  it("clamps hours to at least 1 for a minimal window", () => {
    const q = quoteWindow({ ...windowOf(1), fullDay: false, hourlyRateCents: HOURLY, dayRateCents: DAY });
    expect(q.hours).toBeGreaterThanOrEqual(1);
  });

  it("refuses to freeze a $0 quote when the required rate is missing (money-correctness guard)", () => {
    // A listing with no hourly rate cannot be booked hourly; refuse rather than freeze a 0 charge.
    expect(() =>
      quoteWindow({ ...windowOf(2), fullDay: false, hourlyRateCents: null, dayRateCents: DAY }),
    ).toThrow();
    // Likewise a full-day selection on a listing with no day rate.
    expect(() =>
      quoteWindow({ ...windowOf(2), fullDay: true, hourlyRateCents: HOURLY, dayRateCents: null }),
    ).toThrow();
  });
});

describe("makeBookingReference — FIT- Crockford base32 reference (A6, Security V6)", () => {
  const FORMAT = /^FIT-[0-9A-HJKMNP-TV-Z]{8}$/; // 8 Crockford base32 chars: no I, L, O, U

  it("matches the FIT- + 8 Crockford base32 format", () => {
    for (let i = 0; i < 100; i++) {
      expect(makeBookingReference()).toMatch(FORMAT);
    }
  });

  it("never emits the ambiguous Crockford chars I, L, O, or U", () => {
    for (let i = 0; i < 200; i++) {
      const body = makeBookingReference().slice(4); // drop "FIT-"
      expect(body).not.toMatch(/[ILOU]/);
    }
  });

  it("returns distinct (non-sequential) values across 100 calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(makeBookingReference());
    expect(seen.size).toBe(100);
  });
});
