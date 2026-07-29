// LIST-03 / D-02 / D-03: the shared draft/publish Zod contract. draftSchema autosaves a partial
// listing (accepts {}); publishSchema is the strict gate — all core fields, BOTH rates as positive
// INTEGER cents (Pitfall 5), coordinates present (D-10). Structure mirrors auth-schema.test.ts.
//
// Wave-0 FOUNDATION anchor — PASSES from Task 2 onward (the schemas exist).

import { describe, it, expect } from "vitest";
import { draftSchema, publishSchema } from "@/lib/validation/listing";

// A complete, valid publish payload; negative cases override one field to `undefined`/bad value.
const validPublish = {
  title: "Sunny Downtown Pickleball Court",
  description: "Two dedicated courts, indoor, climate-controlled.",
  primarySpaceType: "pickleball_court",
  addressLine1: "123 Main St",
  city: "Austin",
  region: "TX",
  postalCode: "78701",
  country: "US",
  lat: 30.2672,
  lng: -97.7431,
  maxOccupancy: 8,
  hourlyRateCents: 2500,
  dayRateCents: 18000,
  bookingMode: "request",
  // D-77 (07-15): required to publish, with NO default. A payload without it is no longer complete.
  cancellationPolicy: "standard",
} as const;

describe("draftSchema (D-01 autosave — everything optional)", () => {
  it("accepts an empty draft {}", () => {
    expect(draftSchema.safeParse({}).success).toBe(true);
  });
  it("accepts a partial draft (title only)", () => {
    expect(draftSchema.safeParse({ title: "Work in progress" }).success).toBe(true);
  });
  it("still rejects a wrong TYPE even in a draft (hourlyRateCents must be a number)", () => {
    expect(draftSchema.safeParse({ hourlyRateCents: "lots" }).success).toBe(false);
  });
});

describe("publishSchema (D-02/D-03 strict publish gate)", () => {
  it("accepts a complete valid listing", () => {
    expect(publishSchema.safeParse(validPublish).success).toBe(true);
  });

  it("rejects a missing/empty title", () => {
    expect(publishSchema.safeParse({ ...validPublish, title: undefined }).success).toBe(false);
    expect(publishSchema.safeParse({ ...validPublish, title: "" }).success).toBe(false);
  });

  it("rejects a missing or unrecognised cancellation tier (D-77 — no default)", () => {
    // The schema half of the publish gate. There is deliberately no default, so an absent tier must be
    // REJECTED rather than silently coerced to the most booker-friendly option (which is what D-62 would
    // have done, and what D-77 deliberately breaks with — the tier governs real money).
    expect(
      publishSchema.safeParse({ ...validPublish, cancellationPolicy: undefined }).success,
    ).toBe(false);
    // And nothing outside the three named tiers gets through — the enum is the same set the D-68 LADDER
    // is keyed by, so an accepted stray value would be a tier the refund engine cannot price.
    expect(
      publishSchema.safeParse({ ...validPublish, cancellationPolicy: "none" }).success,
    ).toBe(false);
    // Draft-time stays permissive, so a pre-Phase-7 listing is never stranded mid-edit.
    expect(draftSchema.safeParse({ ...validPublish, cancellationPolicy: undefined }).success).toBe(
      true,
    );
  });

  it("rejects a non-positive rate (0 or negative)", () => {
    expect(publishSchema.safeParse({ ...validPublish, hourlyRateCents: 0 }).success).toBe(false);
    expect(publishSchema.safeParse({ ...validPublish, dayRateCents: -100 }).success).toBe(false);
  });

  it("rejects non-integer cents (money is integer minor units — Pitfall 5)", () => {
    expect(publishSchema.safeParse({ ...validPublish, hourlyRateCents: 25.5 }).success).toBe(false);
  });

  it("rejects when BOTH rates are missing (D-03 both required)", () => {
    expect(
      publishSchema.safeParse({
        ...validPublish,
        hourlyRateCents: undefined,
        dayRateCents: undefined,
      }).success,
    ).toBe(false);
  });

  it("rejects when only one rate is present (D-03 both required)", () => {
    expect(
      publishSchema.safeParse({ ...validPublish, dayRateCents: undefined }).success,
    ).toBe(false);
  });

  it("rejects missing coordinates (D-10 lat/lng required at publish)", () => {
    expect(
      publishSchema.safeParse({ ...validPublish, lat: undefined, lng: undefined }).success,
    ).toBe(false);
  });

  // ── D-108 group pricing (08-05). The load-bearing property is a NEGATIVE one: adding these fields must
  // NOT widen the publish gate. 07-15 established that a new publish requirement lands in TWO places
  // (publishSchema + the persisted-row re-read); the inverse holds here — as long as they stay `.optional()`
  // in this schema, a listing that never touched them publishes exactly as it did before Phase 8.
  it("still publishes with NO group-pricing fields at all (D-108 — not a publish requirement)", () => {
    // `validPublish` deliberately carries neither field. If either ever became required this flips red.
    expect("extraHeadFee" in validPublish).toBe(false);
    expect("included" in validPublish).toBe(false);
    expect(publishSchema.safeParse(validPublish).success).toBe(true);
    // Explicitly-absent is the same as never-supplied.
    expect(
      publishSchema.safeParse({ ...validPublish, extraHeadFee: undefined, included: undefined })
        .success,
    ).toBe(true);
  });

  it("accepts group pricing when the host DOES set it (fee in integer centavos, ₱0 allowed)", () => {
    expect(
      publishSchema.safeParse({ ...validPublish, extraHeadFee: 10000, included: 4 }).success,
    ).toBe(true);
    // ₱0 is the meaningful "flat pricing" value the wizard defaults to — it must parse, not be rejected
    // as non-positive the way a rate would be.
    expect(publishSchema.safeParse({ ...validPublish, extraHeadFee: 0 }).success).toBe(true);
    expect(draftSchema.safeParse({ extraHeadFee: 0, included: 1 }).success).toBe(true);
  });

  it("rejects a negative or non-integer extra-guest fee (money is integer minor units — Pitfall 5)", () => {
    expect(publishSchema.safeParse({ ...validPublish, extraHeadFee: -1 }).success).toBe(false);
    expect(publishSchema.safeParse({ ...validPublish, extraHeadFee: 100.5 }).success).toBe(false);
    expect(draftSchema.safeParse({ extraHeadFee: -1 }).success).toBe(false);
    // `included` is a headcount — 0 people cannot be "included" in the base price.
    expect(publishSchema.safeParse({ ...validPublish, included: 0 }).success).toBe(false);
  });

  it("accepts only the single v1 occupancy mode (D-109 — no second value exists yet)", () => {
    expect(publishSchema.safeParse({ ...validPublish, occupancyMode: "exclusive" }).success).toBe(
      true,
    );
    expect(publishSchema.safeParse({ ...validPublish, occupancyMode: "shared" }).success).toBe(
      false,
    );
    expect(draftSchema.safeParse({ occupancyMode: "shared" }).success).toBe(false);
  });

  it("rejects a space type outside the D-08 vocabulary", () => {
    expect(
      publishSchema.safeParse({ ...validPublish, primarySpaceType: "helipad" }).success,
    ).toBe(false);
  });
});

// ── Gap C / deferred item 7 (08-20): surcharge REACHABILITY. `declaredPax` is clamped to `maxOccupancy`
// BEFORE the surcharge is computed (units.ts + paxSurcharge), so `extraHeads = max(0, pax − included)` is
// ALWAYS 0 when `included >= maxOccupancy` — the host would collect nothing extra forever. publishSchema
// must reject that config, but ONLY when a per-head fee is actually set (a flat listing has no surcharge to
// lose), and draftSchema must stay permissive so a half-filled draft still autosaves. The coalescing here
// (`included ?? 1`, `extraHeadFee ?? 0`) mirrors paxSurcharge exactly so the gate and the pricing engine
// can never disagree.
describe("publishSchema — surcharge reachability (Gap C / deferred item 7)", () => {
  it("REJECTS included == maxOccupancy when a fee is set (the operator's court-of-8 example)", () => {
    // maxOccupancy 8, base covers 8 → declaredPax clamps to 8, extraHeads is always 0: zero surcharge forever.
    expect(
      publishSchema.safeParse({ ...validPublish, extraHeadFee: 500, included: 8 }).success,
    ).toBe(false);
  });

  it("REJECTS included > maxOccupancy when a fee is set", () => {
    expect(
      publishSchema.safeParse({ ...validPublish, extraHeadFee: 500, included: 9 }).success,
    ).toBe(false);
  });

  it("REJECTS the default included (1) when maxOccupancy is also 1 (1 >= 1)", () => {
    // No `included` supplied → coalesces to 1, matching paxSurcharge; with maxOccupancy 1 it can never fire.
    expect(
      publishSchema.safeParse({ ...validPublish, extraHeadFee: 500, maxOccupancy: 1 }).success,
    ).toBe(false);
  });

  it("ACCEPTS included < maxOccupancy when a fee is set (surcharge reachable at heads 8)", () => {
    expect(
      publishSchema.safeParse({ ...validPublish, extraHeadFee: 500, included: 7 }).success,
    ).toBe(true);
  });

  it("ACCEPTS a fee with NO included (defaults to 1 < maxOccupancy 8)", () => {
    expect(publishSchema.safeParse({ ...validPublish, extraHeadFee: 500 }).success).toBe(true);
  });

  it("EXEMPTS flat listings — included == maxOccupancy is fine with no fee / a ₱0 fee", () => {
    // No surcharge to lose, so the rule does not apply and every pre-Phase-8 listing still publishes.
    expect(publishSchema.safeParse({ ...validPublish, included: 8 }).success).toBe(true);
    expect(
      publishSchema.safeParse({ ...validPublish, extraHeadFee: 0, included: 8 }).success,
    ).toBe(true);
  });

  it("targets the rejection at the `included` field (so the wizard shows it on the right input)", () => {
    const result = publishSchema.safeParse({ ...validPublish, extraHeadFee: 500, included: 8 });
    expect(result.success).toBe(false);
    expect(result.error!.flatten().fieldErrors.included).toBeDefined();
  });

  it("leaves draftSchema permissive — a partial draft with included >= maxOccupancy still autosaves", () => {
    expect(
      draftSchema.safeParse({ extraHeadFee: 500, included: 8, maxOccupancy: 8 }).success,
    ).toBe(true);
  });
});
