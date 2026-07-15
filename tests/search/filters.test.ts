// SEARCH-02 (activity/type) + SEARCH-04 (price) — the D-35 single-combined-`category` filter checked
// against BOTH primary_space_type AND the activity tag, plus the max-hourly-price ceiling. Mirrors the
// read-model integration harness (isolated schema + seedSearchListings).
//
// The load-bearing case is the ACTIVITY-TAG-ONLY category (`basketball`): a value disjoint from every
// space_type label must still filter (D-35 does not no-op) via the tag EXISTS, and must NOT raise an
// enum-cast error — the `::text` cast on primary_space_type is what makes a cross-vocab value compare as
// no-match instead of `invalid input value for enum space_type` (22P02).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { seedSearchListings } from "../helpers/seed";
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

// Default city view (no origin) so category/price are exercised in isolation from the radius filter.
function browse(overrides: Record<string, unknown> = {}) {
  return searchParamsSchema.parse(overrides);
}

async function idsFor(overrides: Record<string, unknown>): Promise<string[]> {
  const { results } = await searchListings(testDb.db, browse(overrides));
  return results.map((r) => r.id).sort();
}

describe("searchListings — category filter (SEARCH-02, D-35 type OR tag)", () => {
  it("matches a space-type `category` against the primary_space_type column", async () => {
    expect(await idsFor({ category: "yoga_studio" })).toEqual(["seed_listing_2"]);
  });

  it("matches an activity-tag-only `category` (basketball) via the tag EXISTS — incl. a DISJOINT-type listing — and never no-ops or enum-errors", async () => {
    // seed_listing_3 (basketball_court, tagged basketball) + seed_listing_4 (gym_fitness_floor — a
    // DISJOINT primary type — also tagged basketball). The gym is THE D-35 motivating case.
    const ids = await idsFor({ category: "basketball" });
    expect(ids).toEqual(["seed_listing_3", "seed_listing_4"]);
    // Proves it did NOT silently return the whole unfiltered set (the no-op regression).
    expect(ids).not.toContain("seed_listing_1");
    expect(ids).not.toContain("seed_listing_2");
    expect(ids).not.toContain("seed_listing_5");
  });

  it("a space-type `category` (basketball_court) filters by the type column only, not the basketball tag", async () => {
    // Only the basketball_court primary type — NOT the gym that merely carries the `basketball` tag.
    expect(await idsFor({ category: "basketball_court" })).toEqual(["seed_listing_3"]);
  });
});

describe("searchListings — price filter (SEARCH-04)", () => {
  it("excludes listings whose hourly_rate_cents exceeds priceMax", async () => {
    // rates: L1 45000, L4 35000 (≤ 50000 kept); L2 60000, L3 80000, L5 70000 (excluded).
    expect(await idsFor({ priceMax: 50000 })).toEqual(["seed_listing_1", "seed_listing_4"]);
  });
});

describe("searchListings — default city view (D-30 stable tiebreaker)", () => {
  it("returns all bookable listings and is deterministically ordered across calls", async () => {
    const a = await searchListings(testDb.db, browse());
    const b = await searchListings(testDb.db, browse());
    const idsA = a.results.map((r) => r.id);
    const idsB = b.results.map((r) => r.id);
    expect(idsA).toHaveLength(5); // all five seeded listings are bookable (D-16/D-30)
    // With no origin every distance_m is NULL, so the created_at DESC secondary key decides the order —
    // identical across two calls proves the ordering is deterministic (not engine-arbitrary).
    expect(idsA).toEqual(idsB);
    expect(a.hasMore).toBe(false);
  });
});
