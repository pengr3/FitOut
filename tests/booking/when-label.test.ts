// The SINGLE venue-local booking-window formatter (07-02 Task 1, 07-RESEARCH § Don't Hand-Roll).
//
// PURE table-driven unit test — no DB/IO — mirroring tests/payments/commission.test.ts. It pins the exact
// rendered strings the three prior duplicates produced (host-requests.ts:122-133, request-expiry.ts:144-155,
// host/requests/page.tsx:84-97), so the Phase-7 extraction is provably byte-identical and no future time
// surface can drift into a fourth format:
//   - the window renders in the VENUE timezone via tz(input.timezone), never the viewer's;
//   - 08-15 / CR-01: "Full day" is chosen by the PERSISTED `booking.full_day` snapshot (drizzle 0016) and
//     by nothing else. The module no longer re-derives the mode from a price inequality. It could not: the
//     D-108 extra-guest surcharge is folded INTO `spacePriceCents`, so "the frozen space price does not
//     equal the plain per-hour run total" is TRUE of an ordinary surcharged hourly booking — which is
//     exactly what made every one of them render "Full day" on all eighteen surfaces this module feeds.
//     THE CR-01 REGRESSION CASE BELOW IS THAT EXACT SCENARIO AND MUST NEVER BE DELETED.
//   - the price comparison survives ONLY for pre-0016 rows (full_day IS NULL) and ONLY as a POSITIVE
//     day-rate match, so it can only ever ADD "Full day" on an exact coincidence — nothing hourly,
//     surcharged or not, can be mislabeled by it. Both halves are mutation-verified (08-15 SUMMARY).
//   - 07-08: `quotedTotalCents` remains the fallback price input for a pre-Phase-7 row whose D-74 split was
//     never frozen (`spacePriceCents IS NULL`), where space == total by definition.
//   - the trailing " ({City} time)" suffix is omitted entirely when the listing has no city;
//   - composeWhenLabel renders "EEEE, MMM d"; composeWhenLabelShort renders "EEE, MMM d".

import { describe, it, expect } from "vitest";
import {
  composeWhenLabel,
  composeWhenLabelShort,
  type WhenLabelInput,
} from "@/lib/booking/when-label";

// 2026-07-02T00:00:00Z is 8:00 AM in Asia/Manila (UTC+8) on Thursday, Jul 2 — a 2-hour window at ₱500/hr
// with a frozen ₱1,000 SPACE price and a ₱1,050 all-in charge (the ₱50 D-74 service fee), on a listing that
// ALSO publishes a ₱2,500 day rate. `fullDay: false` is the persisted creation-time snapshot: this booking
// was created as an hourly booking, and that is the fact the label renders from.
const HOURLY: WhenLabelInput = {
  startsAt: new Date("2026-07-02T00:00:00Z"),
  endsAt: new Date("2026-07-02T02:00:00Z"),
  timezone: "Asia/Manila",
  city: "Makati",
  fullDay: false,
  spacePriceCents: 100000,
  quotedTotalCents: 105000,
  dayRateCents: 250000,
};

const HOURLY_LABEL = "Thursday, Jul 2, 8:00 AM – 10:00 AM (Makati time)";

describe("composeWhenLabel — the single venue-local booking-window formatter", () => {
  it("renders the hourly time range, in the venue tz, with the city suffix", () => {
    const label = composeWhenLabel(HOURLY);
    expect(label).toBe(HOURLY_LABEL);
    expect(label).toContain("8:00 AM – 10:00 AM");
    expect(label).toContain("(Makati time)");
    expect(label).not.toContain("Full day");
  });

  it("formats in the VENUE timezone, never UTC or the viewer's", () => {
    // The same instants under a different venue tz must render different wall-clock times.
    expect(composeWhenLabel({ ...HOURLY, timezone: "UTC" })).toContain("12:00 AM – 2:00 AM");
  });

  it("CR-01 REGRESSION: a D-108 per-head surcharge does NOT turn an hourly booking into 'Full day'", () => {
    // THE LOAD-BEARING CASE. `quoteWindow` returns base + surcharge (pricing.ts) and `createPendingHold`
    // freezes that whole figure into spacePriceCents (units.ts). So for an hourly booking on a listing with
    // extraHeadFee > 0 and declaredPax > included, the frozen space price is ₱1,000 (rate × 2h) PLUS a
    // ₱150 surcharge = ₱1,150 — a number that by CONSTRUCTION does not equal the plain per-hour run total.
    // The old inequality therefore concluded "Full day" and printed it on the invite page, both RSVP
    // emails, both group notifications, the organizer page, the cancel screen, /bookings, /host/bookings,
    // /host/requests, every reminder, the request-expiry mail and the payment webhook receipt.
    // The persisted snapshot says `false`, so the real hours render.
    const surcharged = composeWhenLabel({
      ...HOURLY,
      fullDay: false,
      spacePriceCents: 115000, // ₱1,000 base + ₱150 for one extra head
      quotedTotalCents: 120750,
    });
    expect(surcharged).toBe(HOURLY_LABEL);
    expect(surcharged).not.toContain("Full day");
  });

  it("07-08 REGRESSION: the D-74 service fee does NOT turn an hourly booking into 'Full day'", () => {
    // The exact shape every booking created after 07-08 has: space = rate × hours, and an all-in charge
    // that is 5% larger. Deriving the mode from the all-in total makes this render "Full day" — silently,
    // on /bookings, /host/bookings, /host/requests, both detail pages and every lifecycle email.
    const label = composeWhenLabel({ ...HOURLY, spacePriceCents: 100000, quotedTotalCents: 105000 });
    expect(label).toBe(HOURLY_LABEL);
    expect(label).not.toContain("Full day");
  });

  it("renders 'Full day' when the persisted snapshot says so, whatever the price relationship", () => {
    // `fullDay: true` is authoritative. Even a space price that exactly equals a plausible per-hour run
    // total cannot argue with the flag the booking was actually created and priced under.
    expect(composeWhenLabel({ ...HOURLY, fullDay: true })).toBe(
      "Thursday, Jul 2, Full day (Makati time)",
    );
    expect(
      composeWhenLabel({ ...HOURLY, fullDay: true, spacePriceCents: 100000, dayRateCents: null }),
    ).toContain("Full day");
  });

  it("pre-0016 row (fullDay null): a POSITIVE day-rate match renders 'Full day'", () => {
    // The legacy path, and the ONLY thing the price comparison is still allowed to do. Mirrors the idiom
    // already shipped in book/page.tsx, bookings/[id]/page.tsx and re-request.ts:234.
    const label = composeWhenLabel({
      ...HOURLY,
      fullDay: null,
      spacePriceCents: 250000,
      quotedTotalCents: 262500,
      dayRateCents: 250000,
    });
    expect(label).toBe("Thursday, Jul 2, Full day (Makati time)");
  });

  it("pre-0016 row (fullDay null): a NON-matching price renders the time range, never 'Full day'", () => {
    // A positive match only — never an inequality. This is the surcharged hourly shape again, on a legacy
    // row: ₱1,150 is not the ₱2,500 day rate, and "not the day rate" must mean "show the real hours".
    const label = composeWhenLabel({
      ...HOURLY,
      fullDay: null,
      spacePriceCents: 115000,
      quotedTotalCents: 120750,
      dayRateCents: 250000,
    });
    expect(label).toBe(HOURLY_LABEL);
    expect(label).not.toContain("Full day");
  });

  it("pre-0016 row (fullDay null) with NO day rate renders the time range (biased to the real hours)", () => {
    // Nothing to match against, so the window shows what it actually is. Note this INVERTS the pre-08-15
    // behaviour, where a missing rate meant "Full day" — that bias belonged to the deleted inequality.
    const label = composeWhenLabel({ ...HOURLY, fullDay: null, dayRateCents: null });
    expect(label).toBe(HOURLY_LABEL);
    expect(label).not.toContain("Full day");
  });

  it("falls back to quotedTotalCents for a pre-Phase-7 row whose D-74 split was never frozen", () => {
    // Before D-74 there was no service fee, so space == total. A null spacePriceCents must therefore feed
    // the all-in total into the legacy day-rate match — proven in BOTH directions.
    expect(
      composeWhenLabel({
        ...HOURLY,
        fullDay: null,
        spacePriceCents: null,
        quotedTotalCents: 250000,
        dayRateCents: 250000,
      }),
    ).toContain("Full day");
    expect(
      composeWhenLabel({
        ...HOURLY,
        fullDay: null,
        spacePriceCents: null,
        quotedTotalCents: 100000,
        dayRateCents: 250000,
      }),
    ).toBe(HOURLY_LABEL);
  });

  it("treats a fully-null price as 0 on a legacy row — never a crash, never a wrong range", () => {
    const label = composeWhenLabel({
      ...HOURLY,
      fullDay: null,
      spacePriceCents: null,
      quotedTotalCents: null,
    });
    expect(label).toBe(HOURLY_LABEL);
  });

  it("omits the ' (… time)' suffix entirely when the listing has no city", () => {
    const label = composeWhenLabel({ ...HOURLY, city: null });
    expect(label).toBe("Thursday, Jul 2, 8:00 AM – 10:00 AM");
    expect(label).not.toContain("time)");
  });

  it("composeWhenLabelShort renders 'EEE, MMM d'; composeWhenLabel renders 'EEEE, MMM d'", () => {
    expect(composeWhenLabelShort(HOURLY)).toBe("Thu, Jul 2, 8:00 AM – 10:00 AM (Makati time)");
    expect(composeWhenLabel(HOURLY)).toBe(HOURLY_LABEL);
  });

  it("the short variant differs from the long variant ONLY in the weekday token", () => {
    expect(composeWhenLabelShort(HOURLY)).toBe(
      composeWhenLabel(HOURLY).replace("Thursday", "Thu"),
    );
  });

  it("uses an EN DASH between the two times (the shipped separator, not a hyphen)", () => {
    expect(composeWhenLabel(HOURLY)).toContain("–");
    expect(composeWhenLabel(HOURLY)).not.toContain(" - ");
  });
});
