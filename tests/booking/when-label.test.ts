// The SINGLE venue-local booking-window formatter (07-02 Task 1, 07-RESEARCH § Don't Hand-Roll).
//
// PURE table-driven unit test — no DB/IO — mirroring tests/payments/commission.test.ts. It pins the exact
// rendered strings the three prior duplicates produced (host-requests.ts:122-133, request-expiry.ts:144-155,
// host/requests/page.tsx:84-97), so the Phase-7 extraction is provably byte-identical and no future time
// surface can drift into a fourth format:
//   - the window renders in the VENUE timezone via tz(input.timezone), never the viewer's;
//   - "Full day" replaces the time range whenever the FROZEN quote does not equal hourlyRate × hours
//     (fullDay is not persisted — it is re-derived, biasing to hourly on an exact coincidence);
//   - the trailing " ({City} time)" suffix is omitted entirely when the listing has no city;
//   - composeWhenLabel renders "EEEE, MMM d"; composeWhenLabelShort renders "EEE, MMM d".

import { describe, it, expect } from "vitest";
import {
  composeWhenLabel,
  composeWhenLabelShort,
  type WhenLabelInput,
} from "@/lib/booking/when-label";

// 2026-07-02T00:00:00Z is 8:00 AM in Asia/Manila (UTC+8) on Thursday, Jul 2 — a 2-hour window at ₱500/hr
// with a frozen ₱1,000 quote, i.e. the hourly (NOT full-day) branch.
const HOURLY: WhenLabelInput = {
  startsAt: new Date("2026-07-02T00:00:00Z"),
  endsAt: new Date("2026-07-02T02:00:00Z"),
  timezone: "Asia/Manila",
  city: "Makati",
  quotedTotalCents: 100000,
  hourlyRateCents: 50000,
};

describe("composeWhenLabel — the single venue-local booking-window formatter", () => {
  it("renders the hourly time range, in the venue tz, with the city suffix", () => {
    const label = composeWhenLabel(HOURLY);
    expect(label).toContain("8:00 AM – 10:00 AM");
    expect(label).toContain("(Makati time)");
    expect(label).not.toContain("Full day");
    expect(label).toBe("Thursday, Jul 2, 8:00 AM – 10:00 AM (Makati time)");
  });

  it("formats in the VENUE timezone, never UTC or the viewer's", () => {
    // The same instants under a different venue tz must render different wall-clock times.
    expect(composeWhenLabel({ ...HOURLY, timezone: "UTC" })).toContain("12:00 AM – 2:00 AM");
  });

  it("renders 'Full day' when the frozen quote does not equal hourlyRate × hours", () => {
    const label = composeWhenLabel({ ...HOURLY, quotedTotalCents: 250000 });
    expect(label).toContain("Full day");
    expect(label).not.toContain("8:00 AM");
    expect(label).toBe("Thursday, Jul 2, Full day (Makati time)");
  });

  it("renders 'Full day' when hourlyRateCents is null (no hourly rate to compare against)", () => {
    expect(composeWhenLabel({ ...HOURLY, hourlyRateCents: null })).toContain("Full day");
  });

  it("treats a null quote as 0 → 'Full day' (never a crash, never a wrong range)", () => {
    expect(composeWhenLabel({ ...HOURLY, quotedTotalCents: null })).toContain("Full day");
  });

  it("omits the ' (… time)' suffix entirely when the listing has no city", () => {
    const label = composeWhenLabel({ ...HOURLY, city: null });
    expect(label).toBe("Thursday, Jul 2, 8:00 AM – 10:00 AM");
    expect(label).not.toContain("time)");
  });

  it("composeWhenLabelShort renders 'EEE, MMM d'; composeWhenLabel renders 'EEEE, MMM d'", () => {
    expect(composeWhenLabelShort(HOURLY)).toBe("Thu, Jul 2, 8:00 AM – 10:00 AM (Makati time)");
    expect(composeWhenLabel(HOURLY)).toBe("Thursday, Jul 2, 8:00 AM – 10:00 AM (Makati time)");
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
