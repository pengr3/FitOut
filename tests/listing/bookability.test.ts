// D-15 / D-14: deriveBookable is the pure sell-gate. A listing is bookable ⇔ published AND the
// host's email is verified AND the host's payouts are enabled. This drives the full 8-row truth
// table (published? × emailVerified × payoutsEnabled), asserting ONLY the all-true row is bookable,
// plus the D-14 auto-revert (flip payoutsEnabled → false with nothing else changed → not bookable).
//
// Pure function, no DB/IO (mirrors tests/validation/auth-schema.test.ts structure). PASSES from
// Task 2 onward — it is a Wave-0 FOUNDATION anchor, not a downstream RED anchor.

import { describe, it, expect } from "vitest";
import { deriveBookable } from "@/lib/bookability";

type Status = "draft" | "published" | "unlisted";

describe("deriveBookable — the pure bookability gate (D-15)", () => {
  // 8-row truth table over (published?, emailVerified, payoutsEnabled). The "published?" dimension
  // uses status "published" (true) vs "draft" (false).
  const rows: Array<{
    status: Status;
    emailVerified: boolean;
    payoutsEnabled: boolean;
    expected: boolean;
  }> = [
    { status: "published", emailVerified: true, payoutsEnabled: true, expected: true },
    { status: "published", emailVerified: true, payoutsEnabled: false, expected: false },
    { status: "published", emailVerified: false, payoutsEnabled: true, expected: false },
    { status: "published", emailVerified: false, payoutsEnabled: false, expected: false },
    { status: "draft", emailVerified: true, payoutsEnabled: true, expected: false },
    { status: "draft", emailVerified: true, payoutsEnabled: false, expected: false },
    { status: "draft", emailVerified: false, payoutsEnabled: true, expected: false },
    { status: "draft", emailVerified: false, payoutsEnabled: false, expected: false },
  ];

  for (const r of rows) {
    it(`status=${r.status} emailVerified=${r.emailVerified} payoutsEnabled=${r.payoutsEnabled} → ${r.expected}`, () => {
      expect(
        deriveBookable(
          { status: r.status },
          { emailVerified: r.emailVerified, payoutsEnabled: r.payoutsEnabled },
        ),
      ).toBe(r.expected);
    });
  }

  it("is bookable in EXACTLY one of the 8 rows (all three conditions true)", () => {
    const trueRows = rows.filter((r) => r.expected);
    expect(trueRows).toHaveLength(1);
    expect(trueRows[0]).toMatchObject({
      status: "published",
      emailVerified: true,
      payoutsEnabled: true,
    });
  });

  it("unlisted is never bookable even with verified email + payouts (D-15)", () => {
    expect(
      deriveBookable({ status: "unlisted" }, { emailVerified: true, payoutsEnabled: true }),
    ).toBe(false);
  });

  it("auto-reverts when payoutsEnabled flips to false with nothing else changed (D-14)", () => {
    const listing = { status: "published" as const };
    const host = { emailVerified: true, payoutsEnabled: true };
    expect(deriveBookable(listing, host)).toBe(true);
    // Webhook flips payouts off (merchant.declined) — no listing write; bookability drops instantly.
    expect(deriveBookable(listing, { ...host, payoutsEnabled: false })).toBe(false);
  });
});
