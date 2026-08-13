// PAY-06 booker-facing service fee (D-74/D-76) + the single rail-refundability predicate (D-58/D-72).
//
// PURE table-driven unit test — no DB/IO — mirroring tests/payments/commission.test.ts. It proves the
// correctness facts the checkout breakdown and the cancellation refund economics rest on:
//   - computeServiceFee derives {feeBps, serviceFeeCents, allInCents} SOLELY from (spacePrice, feeBps)
//     with a SINGLE defined rounding rule (Research Pitfall 5, the computeCommission idiom D-76 names):
//     serviceFeeCents = Math.round(spacePrice*feeBps/10000).
//   - allInCents = spacePrice + serviceFee ALWAYS — an ADDITION, never a second rounding. The number the
//     booker is shown (D-75 all-in display) must equal the two lines of the D-78 breakdown exactly.
//   - It reads its default rate from SERVICE_FEE_BPS (config-tunable, never a literal — D-76).
//   - It is a money guard: throws on a negative/non-integer space price or a feeBps outside [0, 10000]
//     rather than freeze a nonsense charge.
//   - isApiRefundable is the SOLE answer to "can PayMongo refund this rail?" (the D-72 branch point).

import { describe, it, expect } from "vitest";
import { computeServiceFee } from "@/lib/payments/service-fee";
import { isApiRefundable, REFUNDABLE_RAILS } from "@/lib/payments/refund-rail";
import { SERVICE_FEE_BPS } from "@/lib/payments/fees";

describe("computeServiceFee — integer-cents booker-facing fee (D-74/D-76)", () => {
  it("5% of ₱1,000.00 → fee 5000, all-in 105000", () => {
    expect(computeServiceFee(100000, 500)).toEqual({
      feeBps: 500,
      serviceFeeCents: 5000,
      allInCents: 105000,
    });
  });

  it("space price 0 → fee 0, all-in 0", () => {
    expect(computeServiceFee(0, 500)).toEqual({
      feeBps: 500,
      serviceFeeCents: 0,
      allInCents: 0,
    });
  });

  it("applies a single defined rounding rule: 999 @ 500bps → 49.95 rounds to 50", () => {
    // 999 * 500 / 10000 = 49.95 → Math.round → 50; all-in = 999 + 50 = 1049.
    expect(computeServiceFee(999, 500)).toEqual({
      feeBps: 500,
      serviceFeeCents: 50,
      allInCents: 1049,
    });
    // Stated as the rounding identity too, so the rule itself is asserted and not just its output.
    expect(computeServiceFee(999, 500).serviceFeeCents).toBe(Math.round((999 * 500) / 10000));
  });

  it("feeBps 0 → fee 0, all-in = space price (the fee can be switched off by config)", () => {
    expect(computeServiceFee(100000, 0)).toEqual({
      feeBps: 0,
      serviceFeeCents: 0,
      allInCents: 100000,
    });
  });

  it("feeBps 10000 (100%) → fee = space price, all-in = double (boundary allowed)", () => {
    expect(computeServiceFee(100000, 10000)).toEqual({
      feeBps: 10000,
      serviceFeeCents: 100000,
      allInCents: 200000,
    });
  });

  it("a 1-cent space price rounds the fee DOWN to 0 → all-in 1", () => {
    // 1 * 500 / 10000 = 0.05 → Math.round → 0; all-in = 1 + 0 = 1.
    expect(computeServiceFee(1, 500)).toEqual({ feeBps: 500, serviceFeeCents: 0, allInCents: 1 });
  });

  it("defaults feeBps to SERVICE_FEE_BPS when omitted (config-tunable, never a literal — D-76)", () => {
    expect(computeServiceFee(100000)).toEqual(computeServiceFee(100000, SERVICE_FEE_BPS));
    expect(computeServiceFee(100000).feeBps).toBe(SERVICE_FEE_BPS);
  });

  it("invariant: allInCents === spacePriceCents + serviceFeeCents across the swept range", () => {
    for (const spacePriceCents of [0, 1, 99, 100, 999, 1000, 12345, 999999]) {
      const r = computeServiceFee(spacePriceCents);
      expect(r.allInCents).toBe(spacePriceCents + r.serviceFeeCents);
      expect(Number.isInteger(r.serviceFeeCents)).toBe(true);
      expect(Number.isInteger(r.allInCents)).toBe(true);
      expect(r.serviceFeeCents).toBeGreaterThanOrEqual(0);
    }
  });

  it("invariant: the addition identity holds across a fuzz of prices/rates (never a second rounding)", () => {
    for (let i = 0; i < 500; i++) {
      const spacePriceCents = Math.floor(Math.random() * 5_000_000);
      const feeBps = Math.floor(Math.random() * 10001); // [0, 10000]
      const r = computeServiceFee(spacePriceCents, feeBps);
      expect(r.allInCents - r.serviceFeeCents).toBe(spacePriceCents);
      expect(r.feeBps).toBe(feeBps);
    }
  });

  it("throws on a non-integer space price (integer minor units only)", () => {
    expect(() => computeServiceFee(1.5)).toThrow(
      "space price must be a non-negative integer number of centavos",
    );
  });

  it("throws on a negative space price (money guard — never a nonsense charge)", () => {
    expect(() => computeServiceFee(-1)).toThrow(
      "space price must be a non-negative integer number of centavos",
    );
  });

  it("throws on a feeBps above 10000", () => {
    expect(() => computeServiceFee(100000, 10001)).toThrow(
      "feeBps must be an integer in [0, 10000]",
    );
  });

  it("throws on a feeBps below 0 or a non-integer feeBps", () => {
    expect(() => computeServiceFee(100000, -1)).toThrow("feeBps must be an integer in [0, 10000]");
    expect(() => computeServiceFee(100000, 500.5)).toThrow("feeBps must be an integer in [0, 10000]");
  });
});

describe("isApiRefundable — the SINGLE rail-refundability predicate (D-58/D-72)", () => {
  it("card, GCash, GrabPay and Maya are API-refundable", () => {
    expect(isApiRefundable("card")).toBe(true);
    expect(isApiRefundable("gcash")).toBe(true);
    expect(isApiRefundable("grab_pay")).toBe(true);
    expect(isApiRefundable("paymaya")).toBe(true);
  });

  it("QRPh and UBP Online Banking are NOT API-refundable (the D-72 branch point)", () => {
    expect(isApiRefundable("qrph")).toBe(false);
    expect(isApiRefundable("dob_ubp")).toBe(false);
  });

  it("treats null / undefined / empty / unknown as NOT refundable (fail closed)", () => {
    expect(isApiRefundable(null)).toBe(false);
    expect(isApiRefundable(undefined)).toBe(false);
    expect(isApiRefundable("")).toBe(false);
    expect(isApiRefundable("unknown")).toBe(false);
  });

  it("REFUNDABLE_RAILS is exactly the four supported rails", () => {
    expect([...REFUNDABLE_RAILS].sort()).toEqual(["card", "gcash", "grab_pay", "paymaya"]);
  });
});
