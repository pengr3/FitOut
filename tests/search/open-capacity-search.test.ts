// OPEN-04 (search half) / OC-12 — a drop-in listing must be FINDABLE, priced per person, and filtered by
// SPOTS LEFT ON A DATE rather than by an hour window.
//
// This block is the pure half: the `/person` branch of the shared all-in rate helper (D-75 — the ONE place
// the service fee is composed into an advertised price, so the browse rate and the checkout breakdown can
// never use different rates). The DB-backed `searchListings` cases follow below.

import { describe, it, expect } from "vitest";
import { allInRateParts, hasAllInRate } from "@/lib/booking/all-in-rate";
import { computeServiceFee } from "@/lib/payments/service-fee";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";

describe("allInRateParts — open capacity (OC-02 / D-125 / 09-UI-SPEC § 4)", () => {
  it("advertises exactly one all-in `/person` part for an open-capacity listing", () => {
    const parts = allInRateParts({
      hourlyRateCents: null,
      dayRateCents: null,
      perHeadPriceCents: 35000,
      occupancyMode: "open_capacity",
    });
    expect(parts).toHaveLength(1);
    expect(parts[0].endsWith("/person")).toBe(true);
    // Fee-composed SERVER-SIDE with the SAME computeServiceFee the checkout breakdown uses (D-75).
    expect(parts[0]).toBe(
      `${formatMoney(computeServiceFee(35000).allInCents, DISPLAY_CURRENCY)}/person`,
    );
  });

  it("ignores the hourly/day columns a drop-in listing may STILL carry (09-06 never clears them)", () => {
    // 09-07's lesson: a drop-in listing can genuinely hold hourly/day rates, because the publish gate
    // REQUIRES a per-head price but never nulls the exclusive columns, and OC-17 permits the mode switch.
    // Advertising an hourly rate for a day pass would be a lie about what the booker gets (OC-02:
    // duration never scales the price).
    const parts = allInRateParts({
      hourlyRateCents: 50000,
      dayRateCents: 250000,
      perHeadPriceCents: 35000,
      occupancyMode: "open_capacity",
    });
    expect(parts).toHaveLength(1);
    expect(parts[0].endsWith("/person")).toBe(true);
    expect(parts.join(" ")).not.toContain("/hr");
    expect(parts.join(" ")).not.toContain("/day");
  });

  it("is byte-identical to today for an exclusive listing passing NO new props", () => {
    // 50000 + 5% = 52500 all-in. The literal pins BOTH the 500 bps default and the shared formatter, so a
    // regression in either (or the open branch firing on an absent occupancyMode) fails here.
    expect(allInRateParts({ hourlyRateCents: 50000, dayRateCents: null })).toEqual([
      `${formatMoney(52500, DISPLAY_CURRENCY)}/hr`,
    ]);
    expect(allInRateParts({ hourlyRateCents: null, dayRateCents: 250000 })).toEqual([
      `${formatMoney(262500, DISPLAY_CURRENCY)}/day`,
    ]);
    expect(allInRateParts({ hourlyRateCents: null, dayRateCents: null })).toEqual([]);
    // An open-capacity listing with no per-head price advertises nothing — the caller's existing
    // "Price on request" fallback, exactly as for a rate-less exclusive listing.
    expect(
      allInRateParts({ hourlyRateCents: 50000, dayRateCents: null, perHeadPriceCents: null, occupancyMode: "open_capacity" }),
    ).toEqual([]);
  });

  it("hasAllInRate carries the SAME open branch, so `Service fee included` cannot go missing", () => {
    const open = { hourlyRateCents: null, dayRateCents: null, occupancyMode: "open_capacity" as const };
    expect(hasAllInRate({ ...open, perHeadPriceCents: 35000 })).toBe(true);
    expect(hasAllInRate({ ...open, perHeadPriceCents: null })).toBe(false);
    // The qualifier gate and the price parts must AGREE, or a drop-in card shows an all-in price with no
    // statement that it is all-in — the exact browse-vs-checkout mismatch D-75 exists to prevent.
    expect(hasAllInRate({ ...open, perHeadPriceCents: 35000 })).toBe(
      allInRateParts({ ...open, perHeadPriceCents: 35000 }).length > 0,
    );
    expect(hasAllInRate({ ...open, perHeadPriceCents: null })).toBe(
      allInRateParts({ ...open, perHeadPriceCents: null }).length > 0,
    );
    // Exclusive behaviour unchanged.
    expect(hasAllInRate({ hourlyRateCents: 50000, dayRateCents: null })).toBe(true);
    expect(hasAllInRate({ hourlyRateCents: null, dayRateCents: null })).toBe(false);
  });
});
