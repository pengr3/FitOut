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
