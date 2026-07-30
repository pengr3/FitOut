// @vitest-environment jsdom

// PriceBreakdown — the OC-08 drop-in run line, and the proof the exclusive ones did not move.
//
// WHAT THIS FILE GUARDS:
//
//   (1) THE DROP-IN GRAMMAR. A pass is priced PER HEAD with no duration term (OC-02/OC-08), so the run
//   line must read as a rate times a count of people — never "/hr × N hours" and never "/day × 1 day".
//   Rendering a drop-in booking with an hour term is CR-01's lesson in a third costume (09-UI-SPEC O2).
//
//   (2) THE SINGULAR. `× 1 pass`, not `× 1 passes`. Cheap to get wrong, visible to every booker who buys
//   one pass — which on a drop-in listing is the common case, not the edge one.
//
//   (3) THE OPTIONAL-PROP CONTRACT (09-UI-SPEC Open Q10). Omitting both new props must reproduce the
//   SHIPPED hourly and full-day lines exactly. This is a UAT-passed money surface with exactly one call
//   site today; the whole reason optional props were chosen over a discriminated union is that every
//   existing render stays untouched, so that claim is asserted here rather than assumed.
//
//   (4) ZERO ARITHMETIC (D-49 / the component's own header contract). Case (5) renders a deliberately
//   INCOHERENT frame — a per-head rate and a count whose product is nowhere near the frozen total — and
//   asserts the component renders the SERVER's total anyway. A component that quietly multiplied would
//   have to disagree with one of the two, and the frozen figure is the one PayMongo charges.
//
// Money strings are built through `formatMoney` rather than hardcoded glyphs, matching money.test.ts:
// the property under test is the run-line GRAMMAR, not which currency symbol the runner's ICU emits.

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { formatMoney } from "@/lib/money";
import { PriceBreakdown } from "@/components/booking/price-breakdown";

afterEach(cleanup);

/** The frozen triple every frame below shares, so only the run line varies between cases. */
const FROZEN = {
  quotedTotalCents: 110250,
  spacePriceCents: 105000,
  serviceFeeCents: 5250,
  currency: "php",
};

describe("PriceBreakdown — drop-in run line (OC-08)", () => {
  it("reads per person for a multi-pass booking", () => {
    render(
      <PriceBreakdown
        {...FROZEN}
        perHeadPriceCents={35000}
        passes={3}
        fullDay={false}
        hours={0}
        hourlyRateCents={null}
        dayRateCents={null}
      />,
    );

    expect(
      screen.getByText(`${formatMoney(35000, "php")}/person × 3 passes`),
    ).toBeTruthy();
    // …and NOT a duration term of any kind (O2: the entry window is never presented as a reservation).
    expect(screen.queryByText(/hour|\/hr|\/day/)).toBeNull();
  });

  it("says `1 pass`, singular", () => {
    render(
      <PriceBreakdown
        {...FROZEN}
        perHeadPriceCents={35000}
        passes={1}
        fullDay={false}
        hours={0}
        hourlyRateCents={null}
        dayRateCents={null}
      />,
    );

    expect(screen.getByText(`${formatMoney(35000, "php")}/person × 1 pass`)).toBeTruthy();
    expect(screen.queryByText(/× 1 passes/)).toBeNull();
  });

  it("omitting both props renders the SHIPPED hourly line, unchanged", () => {
    render(
      <PriceBreakdown
        {...FROZEN}
        fullDay={false}
        hours={2}
        hourlyRateCents={50000}
        dayRateCents={400000}
      />,
    );

    expect(screen.getByText(`${formatMoney(50000, "php")}/hr × 2 hours`)).toBeTruthy();
    expect(screen.queryByText(/person/)).toBeNull();
  });

  it("omitting both props with fullDay renders the SHIPPED day line, unchanged", () => {
    render(
      <PriceBreakdown
        {...FROZEN}
        fullDay
        hours={8}
        hourlyRateCents={50000}
        dayRateCents={400000}
      />,
    );

    expect(screen.getByText(`${formatMoney(400000, "php")}/day × 1 day`)).toBeTruthy();
    expect(screen.queryByText(/person/)).toBeNull();
  });

  it("renders the SERVER's figures even when the per-head frame is incoherent (zero arithmetic)", () => {
    // perHead 35000 × 4 = 140000, which is neither the run value nor the total below. If this component
    // ever started multiplying, one of the two assertions here would have to break.
    render(
      <PriceBreakdown
        {...FROZEN}
        perHeadPriceCents={35000}
        passes={4}
        fullDay={false}
        hours={0}
        hourlyRateCents={null}
        dayRateCents={null}
      />,
    );

    expect(screen.getByText(formatMoney(FROZEN.spacePriceCents, "php"))).toBeTruthy();
    expect(screen.getByText(formatMoney(FROZEN.quotedTotalCents, "php"))).toBeTruthy();
    expect(screen.queryByText(formatMoney(140000, "php"))).toBeNull();
  });
});
