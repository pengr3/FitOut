// PAY-02 commission calculator (D-50/51/52) — the pure, integer-cents host-side deduction.
//
// PURE table-driven unit test — no DB/IO — mirroring tests/booking/pricing.test.ts. It proves the
// correctness facts the ledger and payout sweep rest on:
//   - computeCommission derives {rateBps, commissionCents, netCents} SOLELY from (gross, rateBps) with a
//     SINGLE defined rounding rule (Research Pitfall 5): commissionCents = Math.round(gross*rateBps/10000).
//   - netCents = gross − commissionCents ALWAYS (D-52: the platform absorbs the gateway fee — the host
//     nets EXACTLY gross − commission, never reduced further).
//   - It reads its default rate from COMMISSION_RATE_BPS (config-tunable, never a literal — D-51).
//   - It is a money guard: throws on a negative gross or a rateBps outside [0, 10000] rather than freeze a
//     nonsense payout.

import { describe, it, expect } from "vitest";
import { computeCommission } from "@/lib/payments/commission";
import { COMMISSION_RATE_BPS } from "@/lib/payments/fees";

describe("computeCommission — integer-cents host-side deduction (D-50/51/52)", () => {
  it("10% of ₱1,500.00 → commission 15000, net 135000", () => {
    expect(computeCommission(150000, 1000)).toEqual({
      rateBps: 1000,
      commissionCents: 15000,
      netCents: 135000,
    });
  });

  it("applies a single defined rounding rule: 12345 @ 1000bps → 1234.5 rounds to 1235", () => {
    // 12345 * 1000 / 10000 = 1234.5 → Math.round → 1235; net = 12345 − 1235 = 11110.
    expect(computeCommission(12345, 1000)).toEqual({
      rateBps: 1000,
      commissionCents: 1235,
      netCents: 11110,
    });
  });

  it("net is ALWAYS gross − commission, never reduced by any gateway fee (D-52)", () => {
    const { grossCents, commissionCents, netCents } = {
      grossCents: 987654,
      ...computeCommission(987654, 1000),
    };
    expect(netCents).toBe(grossCents - commissionCents);
  });

  it("gross 0 → {0,0,0}", () => {
    expect(computeCommission(0, 1000)).toEqual({ rateBps: 1000, commissionCents: 0, netCents: 0 });
  });

  it("rateBps 0 → commission 0, net = gross", () => {
    expect(computeCommission(150000, 0)).toEqual({ rateBps: 0, commissionCents: 0, netCents: 150000 });
  });

  it("rateBps 10000 (100%) → commission = gross, net 0 (boundary allowed)", () => {
    expect(computeCommission(150000, 10000)).toEqual({
      rateBps: 10000,
      commissionCents: 150000,
      netCents: 0,
    });
  });

  it("a 1-cent gross rounds the commission DOWN to 0 → net 1", () => {
    // 1 * 1000 / 10000 = 0.1 → Math.round → 0; net = 1 − 0 = 1.
    expect(computeCommission(1, 1000)).toEqual({ rateBps: 1000, commissionCents: 0, netCents: 1 });
  });

  it("defaults rateBps to COMMISSION_RATE_BPS when omitted (config-tunable, never a literal — D-51)", () => {
    expect(computeCommission(150000)).toEqual(computeCommission(150000, COMMISSION_RATE_BPS));
    expect(computeCommission(150000).rateBps).toBe(COMMISSION_RATE_BPS);
  });

  it("invariant: commissionCents + netCents === grossCents across a fuzz of amounts/rates", () => {
    for (let i = 0; i < 500; i++) {
      const grossCents = Math.floor(Math.random() * 5_000_000);
      const rateBps = Math.floor(Math.random() * 10001); // [0, 10000]
      const r = computeCommission(grossCents, rateBps);
      expect(r.commissionCents + r.netCents).toBe(grossCents);
      expect(Number.isInteger(r.commissionCents)).toBe(true);
      expect(Number.isInteger(r.netCents)).toBe(true);
      expect(r.commissionCents).toBeGreaterThanOrEqual(0);
      expect(r.netCents).toBeGreaterThanOrEqual(0);
    }
  });

  it("throws on a negative gross (money guard — never a nonsense payout)", () => {
    expect(() => computeCommission(-1, 1000)).toThrow();
  });

  it("throws on a non-integer gross (integer minor units only)", () => {
    expect(() => computeCommission(1234.5, 1000)).toThrow();
  });

  it("throws on a rateBps below 0 or above 10000", () => {
    expect(() => computeCommission(150000, -1)).toThrow();
    expect(() => computeCommission(150000, 10001)).toThrow();
  });

  it("throws on a non-integer rateBps", () => {
    expect(() => computeCommission(150000, 1000.5)).toThrow();
  });
});
