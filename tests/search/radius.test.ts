// SEARCH-01 / RESEARCH Pitfall 1 (HIGHEST RISK) — the PostGIS `::geography` distance-unit proof.
//
// Mirrors tests/listing/geo-roundtrip.test.ts (the PostGIS integration harness) and seeds via the D-38
// `seedSearchListings` helper (known coords + haversine-derived expected km, tests/helpers/seed.ts). The
// load-bearing assertion: a 10 km radius from the Makati origin RETURNS the within-10km listings AND
// EXCLUDES the ~15.3 km Alabang outlier (seed_listing_5). If `ST_DWithin` measured DEGREES (the trap),
// the outlier would be wrongly included — so its exclusion is the regression guard proving BOTH operands
// are cast `::geography` (meters), and the distance-tolerance check proves `ST_Distance` is metric too.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { seedSearchListings, SEARCH_ORIGIN, DISTANCES_KM } from "../helpers/seed";
import { searchParamsSchema } from "@/lib/validation/booking";
import { searchListings } from "@/lib/search/query";

let testDb: TestDb;

beforeAll(async () => {
  testDb = await setupTestDb();
  await seedSearchListings(testDb.db);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

function fromOrigin(radius: number) {
  return searchParamsSchema.parse({ lat: SEARCH_ORIGIN.lat, lng: SEARCH_ORIGIN.lng, radius });
}

describe("searchListings — radius (SEARCH-01, ::geography meters not degrees)", () => {
  it("returns only listings within a 10 km radius and EXCLUDES the ~15.3 km outlier", async () => {
    const { results } = await searchListings(testDb.db, fromOrigin(10));
    const ids = results.map((r) => r.id);

    // seed_listing_1..4 are all < 10 km from the Makati origin.
    expect(ids).toContain("seed_listing_1");
    expect(ids).toContain("seed_listing_4"); // ~8.2 km — within
    // The degrees-vs-meters regression guard: the beyond-radius outlier MUST be excluded.
    expect(ids).not.toContain("seed_listing_5");
    expect(DISTANCES_KM.seed_listing_5).toBeGreaterThan(10); // sanity: the outlier really is beyond 10 km
  });

  it("reports a distance_m within tolerance of the haversine-expected km for each returned listing", async () => {
    const { results } = await searchListings(testDb.db, fromOrigin(25)); // 25 km radius → all five returned
    expect(results).toHaveLength(5);
    for (const r of results) {
      expect(r.distanceM).not.toBeNull();
      const km = r.distanceM! / 1000;
      // ST_Distance(geography) is spheroidal; the seed's haversine is spherical (~0.3% gap). 0.15 km covers it.
      expect(Math.abs(km - DISTANCES_KM[r.id])).toBeLessThan(0.15);
    }
  });

  it("a tighter 5 km radius excludes the ~8.2 km listing (seed_listing_4)", async () => {
    const { results } = await searchListings(testDb.db, fromOrigin(5));
    const ids = results.map((r) => r.id);
    expect(ids).toContain("seed_listing_1"); // ~0.5 km — within
    expect(ids).not.toContain("seed_listing_4"); // ~8.2 km — beyond 5 km
    expect(ids).not.toContain("seed_listing_5"); // ~15.3 km — beyond
  });

  it("orders nearest-first by default (ascending distance, D-37)", async () => {
    const { results } = await searchListings(testDb.db, fromOrigin(25));
    const distances = results.map((r) => r.distanceM!);
    const ascending = [...distances].sort((a, b) => a - b);
    expect(distances).toEqual(ascending);
  });
});
