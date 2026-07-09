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

  it("rejects a space type outside the D-08 vocabulary", () => {
    expect(
      publishSchema.safeParse({ ...validPublish, primarySpaceType: "helipad" }).success,
    ).toBe(false);
  });
});
