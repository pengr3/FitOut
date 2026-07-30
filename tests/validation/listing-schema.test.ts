// LIST-03 / D-02 / D-03: the shared draft/publish Zod contract. draftSchema autosaves a partial
// listing (accepts {}); publishSchema is the strict gate — all core fields, BOTH rates as positive
// INTEGER cents (Pitfall 5), coordinates present (D-10). Structure mirrors auth-schema.test.ts.
//
// Wave-0 FOUNDATION anchor — PASSES from Task 2 onward (the schemas exist).

import { describe, it, expect } from "vitest";
import {
  draftSchema,
  publishSchema,
  EXCLUSIVE_RATES_REQUIRED_MESSAGE,
  PER_HEAD_PRICE_REQUIRED_MESSAGE,
  DROP_IN_CAP_REQUIRED_MESSAGE,
  DROP_IN_INSTANT_ONLY_MESSAGE,
  DROP_IN_SINGLE_SPACE_MESSAGE,
  DROP_IN_NO_GUEST_PRICING_MESSAGE,
  SURCHARGE_UNREACHABLE_MESSAGE,
  OCCUPANCY_MODE_VALUES,
} from "@/lib/validation/listing";

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

// The OPEN-CAPACITY twin (09-06 / OPEN-01). Written out in FULL rather than spread-and-deleted so the
// headline property is literal on the page: there is no `hourlyRateCents` and no `dayRateCents` key at all,
// and it still publishes (OC-08 — one flat price per person, no rates). `bookingMode` is instant because
// OC-10 admits nothing else.
const validOpenPublish = {
  title: "Downtown Drop-In Gym",
  description: "Full free-weight floor, showers, open all day.",
  primarySpaceType: "gym_fitness_floor",
  addressLine1: "123 Main St",
  city: "Austin",
  region: "TX",
  postalCode: "78701",
  country: "US",
  lat: 30.2672,
  lng: -97.7431,
  maxOccupancy: 30,
  bookingMode: "instant",
  cancellationPolicy: "standard",
  occupancyMode: "open_capacity",
  perHeadPriceCents: 35000,
} as const;

/** The messages an issue set carries, for asserting WHICH rule fired (not just that something did). */
function messagesFor(result: ReturnType<typeof publishSchema.safeParse>, field: string): string[] {
  if (result.success) return [];
  const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
  return fieldErrors[field] ?? [];
}

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

  it("accepts exactly the two named occupancy modes (D-109 + D-123) and nothing else", () => {
    // Phase 9 adds the SECOND member; the union is exported so the wizard cards and this gate can't drift.
    expect([...OCCUPANCY_MODE_VALUES]).toEqual(["exclusive", "open_capacity"]);
    expect(publishSchema.safeParse({ ...validPublish, occupancyMode: "exclusive" }).success).toBe(
      true,
    );
    expect(publishSchema.safeParse({ ...validPublish, occupancyMode: "shared" }).success).toBe(
      false,
    );
    expect(draftSchema.safeParse({ occupancyMode: "shared" }).success).toBe(false);
    expect(draftSchema.safeParse({ occupancyMode: "open_capacity" }).success).toBe(true);
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

// ── OPEN-01 / 09-06: the MODE FORK. `hourlyRateCents` / `dayRateCents` moved from object-level required to
// superRefine-required-for-exclusive so that a drop-in listing (which has no rates at all — OC-08) can
// publish. The load-bearing pair of properties is therefore symmetric: an OPEN listing publishes with NO
// rates, and an EXCLUSIVE listing still cannot. If the exclusive branch of the superRefine is ever deleted,
// the second half of that pair goes red.
describe("publishSchema — open-capacity mode fork (OPEN-01 / OC-08 / OC-10 / D-110)", () => {
  it("PUBLISHES a drop-in listing with a price per person and NO hourly or day rate (the headline)", () => {
    // Literal proof the fixture carries neither key — not merely `undefined`.
    expect("hourlyRateCents" in validOpenPublish).toBe(false);
    expect("dayRateCents" in validOpenPublish).toBe(false);
    expect(publishSchema.safeParse(validOpenPublish).success).toBe(true);
  });

  it("keeps the exclusive gate intact — BOTH rates still required, with host-facing copy", () => {
    expect(publishSchema.safeParse(validPublish).success).toBe(true);

    const noHourly = publishSchema.safeParse({ ...validPublish, hourlyRateCents: undefined });
    expect(noHourly.success).toBe(false);
    expect(messagesFor(noHourly, "hourlyRateCents")).toContain(EXCLUSIVE_RATES_REQUIRED_MESSAGE);

    const noDay = publishSchema.safeParse({ ...validPublish, dayRateCents: undefined });
    expect(noDay.success).toBe(false);
    expect(messagesFor(noDay, "dayRateCents")).toContain(EXCLUSIVE_RATES_REQUIRED_MESSAGE);

    // A listing that never set occupancyMode at all reads as exclusive (the column's NOT NULL DEFAULT).
    const legacy = publishSchema.safeParse({
      ...validPublish,
      occupancyMode: undefined,
      hourlyRateCents: undefined,
      dayRateCents: undefined,
    });
    expect(legacy.success).toBe(false);
    expect(messagesFor(legacy, "hourlyRateCents")).toContain(EXCLUSIVE_RATES_REQUIRED_MESSAGE);
  });

  it("REJECTS a drop-in listing with no price per person", () => {
    const res = publishSchema.safeParse({ ...validOpenPublish, perHeadPriceCents: undefined });
    expect(res.success).toBe(false);
    expect(messagesFor(res, "perHeadPriceCents")).toContain(PER_HEAD_PRICE_REQUIRED_MESSAGE);
  });

  it("REJECTS a zero, negative or fractional price per person (money is integer centavos — Pitfall 5)", () => {
    expect(publishSchema.safeParse({ ...validOpenPublish, perHeadPriceCents: 0 }).success).toBe(
      false,
    );
    expect(publishSchema.safeParse({ ...validOpenPublish, perHeadPriceCents: -1 }).success).toBe(
      false,
    );
    expect(publishSchema.safeParse({ ...validOpenPublish, perHeadPriceCents: 350.5 }).success).toBe(
      false,
    );
  });

  it("REJECTS request-to-book on a drop-in listing (OC-10 — instant only)", () => {
    const res = publishSchema.safeParse({ ...validOpenPublish, bookingMode: "request" });
    expect(res.success).toBe(false);
    expect(messagesFor(res, "bookingMode")).toContain(DROP_IN_INSTANT_ONLY_MESSAGE);
  });

  it("REJECTS a multi-unit drop-in listing (RESEARCH A4/Q3 — the claim inserts the sentinel unit 1)", () => {
    const res = publishSchema.safeParse({ ...validOpenPublish, unitCount: 4 });
    expect(res.success).toBe(false);
    expect(messagesFor(res, "unitCount")).toContain(DROP_IN_SINGLE_SPACE_MESSAGE);
    // The single-unit case (explicit or absent) is exactly what publishes.
    expect(publishSchema.safeParse({ ...validOpenPublish, unitCount: 1 }).success).toBe(true);
  });

  it("REJECTS extra-guest pricing on a drop-in listing (D-110 — two per-head models is two answers)", () => {
    const res = publishSchema.safeParse({ ...validOpenPublish, extraHeadFee: 10000, included: 2 });
    expect(res.success).toBe(false);
    expect(messagesFor(res, "extraHeadFee")).toContain(DROP_IN_NO_GUEST_PRICING_MESSAGE);
    // A ₱0 fee is the "flat / never set" value and must NOT trip the rule.
    expect(publishSchema.safeParse({ ...validOpenPublish, extraHeadFee: 0 }).success).toBe(true);
  });

  it("REJECTS a non-positive drop-in cap, in drop-in words (D-124 — maxOccupancy IS the daily cap)", () => {
    const res = publishSchema.safeParse({ ...validOpenPublish, maxOccupancy: 0 });
    expect(res.success).toBe(false);
    expect(messagesFor(res, "maxOccupancy")).toContain(DROP_IN_CAP_REQUIRED_MESSAGE);
  });

  it("does NOT apply the exclusive surcharge-reachability rule to a drop-in listing", () => {
    // included >= maxOccupancy would be a SURCHARGE_UNREACHABLE reject on an exclusive listing. On an open
    // one the extra-guest block is rejected outright instead, so the host reads ONE reason, not two.
    const res = publishSchema.safeParse({
      ...validOpenPublish,
      maxOccupancy: 4,
      included: 4,
      extraHeadFee: 500,
    });
    expect(res.success).toBe(false);
    expect(messagesFor(res, "extraHeadFee")).toContain(DROP_IN_NO_GUEST_PRICING_MESSAGE);
    expect(messagesFor(res, "included")).not.toContain(SURCHARGE_UNREACHABLE_MESSAGE);
  });

  it("REGRESSION (08-20): exclusive + fee>0 + included >= maxOccupancy still fails with the shared copy", () => {
    const res = publishSchema.safeParse({ ...validPublish, extraHeadFee: 500, included: 8 });
    expect(res.success).toBe(false);
    expect(messagesFor(res, "included")).toContain(SURCHARGE_UNREACHABLE_MESSAGE);
  });

  it("draftSchema stays permissive for the new fields — a half-typed ₱0 per-person price autosaves", () => {
    expect(draftSchema.safeParse({ perHeadPriceCents: 0 }).success).toBe(true);
    expect(draftSchema.safeParse({ occupancyMode: "open_capacity" }).success).toBe(true);
    expect(
      draftSchema.safeParse({ occupancyMode: "open_capacity", perHeadPriceCents: 35000 }).success,
    ).toBe(true);
    // Type discipline survives: a float is still a float.
    expect(draftSchema.safeParse({ perHeadPriceCents: 12.5 }).success).toBe(false);
    expect(draftSchema.safeParse({ perHeadPriceCents: -1 }).success).toBe(false);
  });
});
