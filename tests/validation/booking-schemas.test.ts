// V5 input-validation control (Phase 4). `searchParamsSchema` bounds every untrusted URL search param
// BEFORE any SQL runs (T-04-ORIGIN / T-04-VOCAB / T-04-PRICEIN); `bookingCreateSchema` shape-validates
// the client's booking selection (the stronger invariants — on-the-hour, inside operating hours, the
// free-unit count — are RE-DERIVED server-side, so this schema is shape-only). A crafted NaN/"abc" must
// fail safeParse rather than throw. Pure unit test — no DB. Structure mirrors listing-schema.test.ts.

import { describe, it, expect } from "vitest";
import { searchParamsSchema, bookingCreateSchema, openHoldSchema } from "@/lib/validation/booking";
import { parsePickedDate } from "@/lib/search/query";
import { DISPLAY_CURRENCY } from "@/lib/money";
import { MAX_OPEN_CAPACITY } from "@/lib/validation/listing";

// A valid search query as Next.js delivers it: URL params arrive as STRINGS, so coercion must apply.
const validSearch = {
  lat: "14.55",
  lng: "121.03",
  radius: "10",
  priceMax: "50000",
  category: "basketball_court", // a space-type key
  partySize: "4",
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
      expect(r.data.priceMax).toBeUndefined();
      expect(r.data.page).toBe(0);
      expect(r.data.sort).toBe("nearest");
      expect(r.data.category).toBe("basketball_court");
      expect(r.data.partySize).toBe(4);
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

  it("accepts partySize at both inclusive capacity boundaries and omits it for cold browse URLs", () => {
    const minimum = searchParamsSchema.safeParse({ partySize: "1" });
    const maximum = searchParamsSchema.safeParse({ partySize: String(MAX_OPEN_CAPACITY) });
    const omitted = searchParamsSchema.safeParse({});

    expect(minimum.success).toBe(true);
    expect(maximum.success).toBe(true);
    expect(omitted.success).toBe(true);
    if (minimum.success) expect(minimum.data.partySize).toBe(1);
    if (maximum.success) expect(maximum.data.partySize).toBe(MAX_OPEN_CAPACITY);
    if (omitted.success) expect(omitted.data.partySize).toBeUndefined();
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
  it("rejects malformed, repeated, and out-of-range partySize values without throwing", () => {
    const invalidValues = ["0", "-1", "1.5", String(MAX_OPEN_CAPACITY + 1), "", "abc", true, ["4"]];

    for (const partySize of invalidValues) {
      expect(() => searchParamsSchema.safeParse({ partySize })).not.toThrow();
      expect(searchParamsSchema.safeParse({ partySize }).success).toBe(false);
    }
  });
});

describe("searchParamsSchema — Phase 24 engaged-search normalization", () => {
  const canonical = {
    lat: "14.55",
    lng: "121.03",
    category: "basketball_court",
    locationLabel: "Makati",
    sort: "price",
    page: "2",
  } as const;
  const retired = {
    date: "2026-09-20",
    start: "10:00",
    end: "12:00",
    priceMax: "50000",
    radius: "25",
    relax: "0",
  } as const;

  it("preserves retired refinements for legacy URLs without partySize", () => {
    const result = searchParamsSchema.safeParse({ ...canonical, ...retired });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        ...retired,
        radius: 25,
        priceMax: 50000,
        relax: 0,
      });
    }
  });

  it("removes retired refinements while retaining canonical answers after partySize engages the new journey", () => {
    const result = searchParamsSchema.safeParse({ ...canonical, ...retired, partySize: "4" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        lat: 14.55,
        lng: 121.03,
        category: "basketball_court",
        locationLabel: "Makati",
        sort: "price",
        page: 2,
        partySize: 4,
        radius: 10,
        relax: 1,
      });
      expect(result.data.date).toBeUndefined();
      expect(result.data.start).toBeUndefined();
      expect(result.data.end).toBeUndefined();
      expect(result.data.priceMax).toBeUndefined();
    }
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

// ── openHoldSchema (Phase 9 / OC-02 / OC-06) ───────────────────────────────────────────────────────────
// The drop-in payload is a DATE + a pass count, and its security value is as much in what it CANNOT carry
// as in what it validates: there is no window shape, so a client can never choose the instants the refund
// ladder and payout sweep key on (T-09-26). The real capacity bound is the listing's own max_occupancy,
// applied inside the claim's transaction — the `.max()` here only stops an absurd value multiplying into
// the integer money columns (CR-03 / T-09-05).
describe("openHoldSchema — the open-capacity date + passes payload", () => {
  const valid = { listingId: "listing_123", date: "2026-08-08", requestedPasses: 2 };

  it("accepts a valid payload and COERCES a string pass count (form/URL params arrive as strings)", () => {
    const r = openHoldSchema.safeParse({ ...valid, requestedPasses: "3" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.requestedPasses).toBe(3);
      expect(r.data.date).toBe("2026-08-08");
      expect(r.data.listingId).toBe("listing_123");
      expect(r.data.idempotencyKey).toBeUndefined();
    }
  });

  it("accepts an optional idempotencyKey (the D-42 display/UX backstop)", () => {
    const r = openHoldSchema.safeParse({ ...valid, idempotencyKey: "idem-abc-123" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.idempotencyKey).toBe("idem-abc-123");
  });

  it("STRIPS a smuggled time window — a client cannot widen the open path's instants (T-09-26)", () => {
    const r = openHoldSchema.safeParse({
      ...valid,
      startUtc: "2026-08-08T00:00:00.000Z",
      endUtc: "2026-08-09T00:00:00.000Z",
      fullDay: true,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      // Zod strips unknown keys, so the parsed payload cannot carry a window into the action at all. The
      // instants come from the LISTING's own operating hours (loadOpenDayWindow), never from this input.
      expect(r.data).toEqual({ listingId: "listing_123", date: "2026-08-08", requestedPasses: 2 });
      expect("startUtc" in r.data).toBe(false);
      expect("endUtc" in r.data).toBe(false);
      expect("fullDay" in r.data).toBe(false);
    }
  });

  it("rejects a date that is not a canonical YYYY-MM-DD", () => {
    expect(openHoldSchema.safeParse({ ...valid, date: "2026-8-8" }).success).toBe(false);
    expect(openHoldSchema.safeParse({ ...valid, date: "08-08-2026" }).success).toBe(false);
    expect(openHoldSchema.safeParse({ ...valid, date: "" }).success).toBe(false);
    expect(openHoldSchema.safeParse({ ...valid, date: "2026-08-08T00:00:00Z" }).success).toBe(false);
  });

  it("ACCEPTS a well-formed but impossible date — it dies later, at parsePickedDate in the action", () => {
    // The regex is a shape gate, not a calendar. 2026-02-31 is syntactically valid and is caught by the
    // round-trip guard in `parsePickedDate` (src/lib/search/query.ts) BEFORE any instant is derived or any
    // value reaches SQL — asserted here in the same case so the hand-off cannot be silently dropped.
    expect(openHoldSchema.safeParse({ ...valid, date: "2026-02-31" }).success).toBe(true);
    expect(parsePickedDate("2026-02-31")).toBeNull();
    expect(parsePickedDate("2026-08-08")).toEqual({ year: 2026, month: 8, day: 8, iso: "2026-08-08" });
  });

  it("rejects a non-positive, fractional or absurd pass count (CR-03 shape ceiling — never the real cap)", () => {
    expect(openHoldSchema.safeParse({ ...valid, requestedPasses: 0 }).success).toBe(false);
    expect(openHoldSchema.safeParse({ ...valid, requestedPasses: -1 }).success).toBe(false);
    expect(openHoldSchema.safeParse({ ...valid, requestedPasses: 1.5 }).success).toBe(false);
    expect(openHoldSchema.safeParse({ ...valid, requestedPasses: 20000 }).success).toBe(false);
    expect(openHoldSchema.safeParse({ ...valid, requestedPasses: "abc" }).success).toBe(false);
  });

  it("rejects a missing or empty listingId, and a missing pass count", () => {
    expect(openHoldSchema.safeParse({ date: "2026-08-08", requestedPasses: 1 }).success).toBe(false);
    expect(openHoldSchema.safeParse({ ...valid, listingId: "" }).success).toBe(false);
    expect(openHoldSchema.safeParse({ listingId: "l1", date: "2026-08-08" }).success).toBe(false);
  });

  it("never THROWS on crafted junk — every refusal is a safeParse failure", () => {
    expect(() => openHoldSchema.safeParse({ listingId: 1, date: {}, requestedPasses: [] })).not.toThrow();
    expect(openHoldSchema.safeParse({ listingId: 1, date: {}, requestedPasses: [] }).success).toBe(false);
    expect(openHoldSchema.safeParse(null).success).toBe(false);
    expect(openHoldSchema.safeParse("not an object").success).toBe(false);
  });
});
