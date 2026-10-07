import { describe, expect, it } from "vitest";
import {
  payoutDispatchMode,
  selectDispatchCandidates,
  type DuePayout,
} from "@/inngest/functions/payout-sweep";

const first = { bookingId: "booking_first", payoutGrossCents: 1_900 } as DuePayout;
const second = { bookingId: "booking_second", payoutGrossCents: 1_200 } as DuePayout;
const due = [first, second];

describe("scheduled payout release scope", () => {
  it("holds dispatch when mode is missing or invalid", () => {
    expect(payoutDispatchMode({})).toBe("hold");
    expect(selectDispatchCandidates(due, {})).toEqual([]);
    expect(selectDispatchCandidates(due, { PAYOUT_DISPATCH_MODE: "enabled" })).toEqual([]);
  });

  it("limits a controlled proof to its exact booking and fee-inclusive debit cap", () => {
    const scope = {
      PAYOUT_DISPATCH_MODE: "controlled",
      PAYOUT_CONTROLLED_BOOKING_ID: "booking_first",
      PAYOUT_CONTROLLED_MAX_DEBIT_CENTS: "2900",
      PAYMONGO_INSTAPAY_FEE_CENTS: "100",
    };
    expect(selectDispatchCandidates(due, scope)).toEqual([first]);
    expect(selectDispatchCandidates(due, {
      ...scope, PAYOUT_CONTROLLED_MAX_DEBIT_CENTS: "2899",
    })).toEqual([]);
    expect(selectDispatchCandidates(due, {
      ...scope, PAYOUT_CONTROLLED_BOOKING_ID: "booking_missing",
    })).toEqual([]);
  });

  it("does not spend a weekly free-transfer assumption in a controlled debit budget", () => {
    const scope = {
      PAYOUT_DISPATCH_MODE: "controlled",
      PAYOUT_CONTROLLED_BOOKING_ID: "booking_first",
      PAYOUT_CONTROLLED_MAX_DEBIT_CENTS: "1900",
      PAYMONGO_INSTAPAY_FEE_CENTS: "0",
    };
    expect(selectDispatchCandidates(due, scope)).toEqual([]);
    expect(selectDispatchCandidates(due, {
      ...scope, PAYOUT_CONTROLLED_MAX_DEBIT_CENTS: "2900",
    })).toEqual([first]);
  });

  it("rejects incomplete or malformed controlled scope", () => {
    const scope = {
      PAYOUT_DISPATCH_MODE: "controlled",
      PAYOUT_CONTROLLED_BOOKING_ID: "booking_first",
      PAYOUT_CONTROLLED_MAX_DEBIT_CENTS: "2000",
      PAYMONGO_INSTAPAY_FEE_CENTS: "100",
    };
    for (const override of [
      { PAYOUT_CONTROLLED_BOOKING_ID: " booking_first" },
      { PAYOUT_CONTROLLED_MAX_DEBIT_CENTS: "" },
      { PAYOUT_CONTROLLED_MAX_DEBIT_CENTS: "1.5" },
      { PAYMONGO_INSTAPAY_FEE_CENTS: "" },
      { PAYMONGO_INSTAPAY_FEE_CENTS: "-1" },
    ]) {
      expect(selectDispatchCandidates(due, { ...scope, ...override })).toEqual([]);
    }
  });

  it("selects all eligible bookings only in explicit open mode", () => {
    expect(selectDispatchCandidates(due, { PAYOUT_DISPATCH_MODE: "open" })).toEqual(due);
  });
});
