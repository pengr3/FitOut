// Open-capacity (drop-in pass) pure primitives — OC-02/OC-08/OC-11/OC-13. PURE unit test, no DB/IO,
// mirroring tests/booking/pricing.test.ts. It pins four facts the server owns and a client can never assert:
//   - quoteOpenCapacity is LINEAR in heads with NO duration term (a pass costs the same for one hour or all
//     day, OC-02), and it REFUSES rather than freezing a ₱0 charge when the listing has no per-head price.
//   - lowStockThreshold is the 09-UI-SPEC clamp(floor(cap/2), 1, OPEN_LOW_STOCK_MAX) — verbatim from the
//     spec's table, so the scarcity signal can never fire above 50% remaining.
//   - spotsState derives the display state SERVER-SIDE from (remaining, cap) — the client renders it.
//   - openDayWindow maps a venue-local calendar date to the UTC opening/closing instants (OC-03), including
//     the after-midnight close that rolls to the next calendar day.

import { describe, it, expect } from "vitest";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";
import { quoteOpenCapacity } from "@/lib/booking/pricing";
import { DISPLAY_CURRENCY } from "@/lib/money";
import {
  lowStockThreshold,
  spotsState,
  openDayWindow,
  SOLD_OUT_MESSAGE,
} from "@/lib/availability/open-capacity";

const PER_HEAD = 35000; // ₱350.00 per head, in integer minor units

describe("quoteOpenCapacity — the OC-08 linear per-head freeze", () => {
  it("freezes perHeadPriceCents × heads, with no duration term at all", () => {
    const q = quoteOpenCapacity({ perHeadPriceCents: PER_HEAD, heads: 3 });
    expect(q.totalCents).toBe(105000);
    expect(q.currency).toBe(DISPLAY_CURRENCY);
    expect(q.perHeadPriceCents).toBe(PER_HEAD);
    expect(q.heads).toBe(3);
  });

  it("one head is simply the per-head price (no included base — D-125)", () => {
    expect(quoteOpenCapacity({ perHeadPriceCents: PER_HEAD, heads: 1 }).totalCents).toBe(PER_HEAD);
  });

  it("THROWS on a null per-head price rather than selling a pass for nothing", () => {
    expect(() => quoteOpenCapacity({ perHeadPriceCents: null, heads: 1 })).toThrow();
  });

  it("THROWS on a non-positive head count (the claim never grants zero heads)", () => {
    expect(() => quoteOpenCapacity({ perHeadPriceCents: PER_HEAD, heads: 0 })).toThrow();
  });
});

describe("lowStockThreshold — 09-UI-SPEC § Spots-left, verbatim", () => {
  const rows: Array<{ cap: number; threshold: number }> = [
    { cap: 1, threshold: 1 },
    { cap: 2, threshold: 1 },
    { cap: 4, threshold: 2 },
    { cap: 6, threshold: 3 },
    { cap: 10, threshold: 5 },
    { cap: 40, threshold: 5 },
  ];
  for (const r of rows) {
    it(`cap ${r.cap} → threshold ${r.threshold}`, () => {
      expect(lowStockThreshold(r.cap)).toBe(r.threshold);
    });
  }
});

describe("spotsState — server-derived display state (OC-11)", () => {
  const rows: Array<{ remaining: number; cap: number; state: "open" | "low" | "full" }> = [
    { remaining: 0, cap: 10, state: "full" },
    { remaining: 3, cap: 10, state: "low" },
    { remaining: 5, cap: 10, state: "low" },
    { remaining: 6, cap: 10, state: "open" },
    { remaining: 1, cap: 1, state: "low" },
  ];
  for (const r of rows) {
    it(`remaining ${r.remaining} of cap ${r.cap} → "${r.state}"`, () => {
      expect(spotsState(r.remaining, r.cap)).toBe(r.state);
    });
  }
});

describe("openDayWindow — the OC-03 date-is-one-pass window", () => {
  it("maps a Manila 06:00–22:00 day to its UTC opening/closing instants", () => {
    const w = openDayWindow({
      year: 2026,
      month: 8,
      day: 8,
      timezone: "Asia/Manila",
      openTime: "06:00:00",
      closeTime: "22:00:00",
    });
    expect(w.dayOpenUtc.toISOString()).toBe("2026-08-07T22:00:00.000Z");
    expect(w.dayCloseUtc.toISOString()).toBe("2026-08-08T14:00:00.000Z");
  });

  it("rolls an after-midnight close to the NEXT calendar day", () => {
    const w = openDayWindow({
      year: 2026,
      month: 8,
      day: 8,
      timezone: "Asia/Manila",
      openTime: "06:00:00",
      closeTime: "02:00:00",
    });
    expect(w.dayCloseUtc.getTime()).toBeGreaterThan(w.dayOpenUtc.getTime());
    expect(format(w.dayCloseUtc, "yyyy-MM-dd HH:mm", { in: tz("Asia/Manila") })).toBe("2026-08-09 02:00");
  });
});

describe("OC-13 sold-out copy", () => {
  it("is the single exported literal the claim, the action and the UI all assert", () => {
    expect(SOLD_OUT_MESSAGE).toBe("Just sold out — pick another date.");
  });
});
