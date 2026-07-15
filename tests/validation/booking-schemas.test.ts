// V5 input-validation control (Phase 4). `searchParamsSchema` bounds every untrusted URL search param
// BEFORE any SQL runs (T-04-ORIGIN / T-04-VOCAB / T-04-PRICEIN); `bookingCreateSchema` shape-validates
// the client's booking selection (the stronger invariants — on-the-hour, inside operating hours, the
// free-unit count — are RE-DERIVED server-side, so this schema is shape-only). A crafted NaN/"abc" must
// fail safeParse rather than throw. Pure unit test — no DB. Structure mirrors listing-schema.test.ts.

import { describe, it, expect } from "vitest";
import { searchParamsSchema, bookingCreateSchema } from "@/lib/validation/booking";
import { DISPLAY_CURRENCY } from "@/lib/money";

// A valid search query as Next.js delivers it: URL params arrive as STRINGS, so coercion must apply.
const validSearch = {
  lat: "14.55",
  lng: "121.03",
  radius: "10",
  priceMax: "50000",
  category: "basketball_court", // a space-type key
  sort: "nearest",
  page: "0",
} as const;

describe("DISPLAY_CURRENCY (D-46 shared PHP source)", () => {
  it("is the single 'php' source imported by every price surface", () => {
    expect(DISPLAY_CURRENCY).toBe("php");
  });
});

describe("searchParamsSchema — accepts valid / bounded input", () => {
  it("accepts a full valid query and coerces the string params", () => {
    const r = searchParamsSchema.safeParse(validSearch);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.lat).toBeCloseTo(14.55, 5);
      expect(r.data.lng).toBeCloseTo(121.03, 5);
      expect(r.data.radius).toBe(10);
      expect(r.data.priceMax).toBe(50000);
      expect(r.data.page).toBe(0);
      expect(r.data.sort).toBe("nearest");
      expect(r.data.category).toBe("basketball_court");
    }
  });

  it("accepts a SPACE-TYPE category (basketball_court)", () => {
    expect(searchParamsSchema.safeParse({ category: "basketball_court" }).success).toBe(true);
  });

  it("accepts an ACTIVITY-TAG-only category (basketball) exactly like a space-type — the D-35 combined param", () => {
    expect(searchParamsSchema.safeParse({ category: "basketball" }).success).toBe(true);
    expect(searchParamsSchema.safeParse({ category: "yoga" }).success).toBe(true);
  });

  it("accepts an empty query (default city view, D-30) and applies defaults", () => {
    const r = searchParamsSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.sort).toBe("nearest");
      expect(r.data.radius).toBe(10);
      expect(r.data.page).toBe(0);
      expect(r.data.lat).toBeUndefined();
      expect(r.data.lng).toBeUndefined();
    }
  });

  it("accepts a price sort", () => {
    expect(searchParamsSchema.safeParse({ sort: "price" }).success).toBe(true);
  });
});

describe("searchParamsSchema — rejects tampered / out-of-bounds input (never throws)", () => {
  it("rejects lat outside [-90,90]", () => {
    expect(searchParamsSchema.safeParse({ lat: "200", lng: "121.03" }).success).toBe(false);
    expect(searchParamsSchema.safeParse({ lat: "-91", lng: "121.03" }).success).toBe(false);
  });
  it("rejects lng outside [-180,180]", () => {
    expect(searchParamsSchema.safeParse({ lat: "14.55", lng: "999" }).success).toBe(false);
  });
  it("rejects a radius not in {2,5,10,25}", () => {
    expect(searchParamsSchema.safeParse({ radius: "7" }).success).toBe(false);
    expect(searchParamsSchema.safeParse({ radius: "0" }).success).toBe(false);
  });
  it("rejects a negative priceMax", () => {
    expect(searchParamsSchema.safeParse({ priceMax: "-1" }).success).toBe(false);
  });
  it("rejects a category in NEITHER vocabulary", () => {
    expect(searchParamsSchema.safeParse({ category: "helipad" }).success).toBe(false);
  });
  it("rejects a sort outside {nearest,price}", () => {
    expect(searchParamsSchema.safeParse({ sort: "furthest" }).success).toBe(false);
  });
  it("rejects a negative page", () => {
    expect(searchParamsSchema.safeParse({ page: "-1" }).success).toBe(false);
  });
  it("rejects a lone coordinate (lat without lng, or lng without lat)", () => {
    expect(searchParamsSchema.safeParse({ lat: "14.55" }).success).toBe(false);
    expect(searchParamsSchema.safeParse({ lng: "121.03" }).success).toBe(false);
  });
  it("does NOT throw on a crafted NaN/'abc' numeric param — returns success:false", () => {
    expect(() => searchParamsSchema.safeParse({ lat: "abc", lng: "121.03" })).not.toThrow();
    expect(searchParamsSchema.safeParse({ lat: "abc", lng: "121.03" }).success).toBe(false);
    expect(searchParamsSchema.safeParse({ priceMax: "abc" }).success).toBe(false);
    expect(searchParamsSchema.safeParse({ page: "abc" }).success).toBe(false);
    expect(searchParamsSchema.safeParse({ radius: "abc" }).success).toBe(false);
  });
});

describe("bookingCreateSchema — shape-validates the client selection", () => {
  const start = "2026-08-01T02:00:00.000Z";
  const end = "2026-08-01T03:00:00.000Z";

  it("accepts a valid payload with an optional idempotencyKey", () => {
    expect(
      bookingCreateSchema.safeParse({
        listingId: "listing_123",
        startUtc: start,
        endUtc: end,
        fullDay: false,
        idempotencyKey: "abc-123",
      }).success,
    ).toBe(true);
  });

  it("accepts a payload WITHOUT idempotencyKey (optional) and defaults fullDay=false", () => {
    const r = bookingCreateSchema.safeParse({ listingId: "l1", startUtc: start, endUtc: end });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.fullDay).toBe(false);
  });

  it("rejects endUtc <= startUtc", () => {
    expect(
      bookingCreateSchema.safeParse({ listingId: "l1", startUtc: end, endUtc: start }).success,
    ).toBe(false);
    expect(
      bookingCreateSchema.safeParse({ listingId: "l1", startUtc: start, endUtc: start }).success,
    ).toBe(false);
  });

  it("rejects a missing or empty listingId", () => {
    expect(bookingCreateSchema.safeParse({ startUtc: start, endUtc: end }).success).toBe(false);
    expect(
      bookingCreateSchema.safeParse({ listingId: "", startUtc: start, endUtc: end }).success,
    ).toBe(false);
  });
});
