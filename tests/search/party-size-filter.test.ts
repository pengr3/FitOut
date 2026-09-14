import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listing, operatingHours } from "@/lib/db/schema";
import { searchListings } from "@/lib/search/query";
import { searchParamsSchema } from "@/lib/validation/booking";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeVerifiedHost } from "../helpers/seed";

let testDb: TestDb;

const HOST_ID = "party_size_host";
const PARTY_SIZE = 4;
const MATRIX_CATEGORY = "basketball_court";
const PAGINATION_CATEGORY = "yoga_studio";
const now = new Date("2026-09-14T00:00:00.000Z");

function utcDate(month: "08" | "09", day: number) {
  return new Date(`2026-${month}-${String(day).padStart(2, "0")}T00:00:00.000Z`);
}

const matrixIds = {
  exclusive: {
    unknown: "party_exclusive_unknown",
    below: "party_exclusive_below",
    equal: "party_exclusive_equal",
    above: "party_exclusive_above",
  },
  open: {
    unknown: "party_open_unknown",
    below: "party_open_below",
    equal: "party_open_equal",
    above: "party_open_above",
  },
} as const;

async function addListing({
  id,
  category,
  maxOccupancy,
  occupancyMode = "exclusive",
  createdAt = new Date("2026-09-01T00:00:00.000Z"),
}: {
  id: string;
  category: "basketball_court" | "yoga_studio";
  maxOccupancy: number | null;
  occupancyMode?: "exclusive" | "open_capacity";
  createdAt?: Date;
}) {
  await testDb.db.insert(listing).values({
    id,
    hostId: HOST_ID,
    title: id,
    primarySpaceType: category,
    city: "Makati",
    location: { x: 121.0244, y: 14.5547 },
    hourlyRateCents: 50000,
    dayRateCents: 250000,
    perHeadPriceCents: occupancyMode === "open_capacity" ? 25000 : null,
    occupancyMode,
    maxOccupancy,
    currency: "php",
    unitCount: 1,
    timezone: "Asia/Manila",
    status: "published",
    reviewState: "approved",
    publishedAt: createdAt,
    createdAt,
  });
  await testDb.db.insert(operatingHours).values({
    id: `${id}_hours`,
    listingId: id,
    dayOfWeek: 0,
    openTime: "06:00:00",
    closeTime: "22:00:00",
  });
}

function params(overrides: Record<string, unknown> = {}) {
  return searchParamsSchema.parse(overrides);
}

beforeAll(async () => {
  testDb = await setupTestDb();
  await makeVerifiedHost(testDb.db, HOST_ID);

  for (const [mode, occupancyMode] of [
    ["exclusive", "exclusive"],
    ["open", "open_capacity"],
  ] as const) {
    await addListing({ id: matrixIds[mode].unknown, category: MATRIX_CATEGORY, maxOccupancy: null, occupancyMode });
    await addListing({ id: matrixIds[mode].below, category: MATRIX_CATEGORY, maxOccupancy: PARTY_SIZE - 1, occupancyMode });
    await addListing({ id: matrixIds[mode].equal, category: MATRIX_CATEGORY, maxOccupancy: PARTY_SIZE, occupancyMode });
    await addListing({ id: matrixIds[mode].above, category: MATRIX_CATEGORY, maxOccupancy: PARTY_SIZE + 1, occupancyMode });
  }

  for (let index = 0; index < 5; index += 1) {
    await addListing({
      id: `party_page_ineligible_${index}`,
      category: PAGINATION_CATEGORY,
      maxOccupancy: PARTY_SIZE - 1,
      createdAt: utcDate("09", 10 - index),
    });
    await addListing({
      id: `party_page_eligible_${index}`,
      category: PAGINATION_CATEGORY,
      maxOccupancy: PARTY_SIZE,
      createdAt: utcDate("08", 10 - index),
    });
  }
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("searchListings — exact party capacity", () => {
  it("applies the same NULL/below/equal/above predicate to exclusive and open-capacity listings", async () => {
    const result = await searchListings(testDb.db, params({ category: MATRIX_CATEGORY, partySize: PARTY_SIZE }), now);
    const ids = result.results.map((row) => row.id);

    expect(ids).toEqual(expect.arrayContaining([
      matrixIds.exclusive.equal,
      matrixIds.exclusive.above,
      matrixIds.open.equal,
      matrixIds.open.above,
    ]));
    expect(ids).not.toEqual(expect.arrayContaining([
      matrixIds.exclusive.unknown,
      matrixIds.exclusive.below,
      matrixIds.open.unknown,
      matrixIds.open.below,
    ]));

    const openRows = result.results.filter((row) => row.occupancyMode === "open_capacity");
    expect(openRows).toHaveLength(2);
    for (const row of openRows) {
      expect(row.spots).toBeNull();
      expect(row).not.toHaveProperty("maxOccupancy");
    }
  });

  it("keeps NULL-capacity listings eligible when partySize is omitted", async () => {
    const result = await searchListings(testDb.db, params({ category: MATRIX_CATEGORY }), now);
    const ids = result.results.map((row) => row.id);

    expect(ids).toEqual(expect.arrayContaining([
      matrixIds.exclusive.unknown,
      matrixIds.open.unknown,
    ]));
  });
});

describe("searchListings — party capacity precedes pagination", () => {
  it("fills the bounded eligible page and reports more when newer rows are all undersized", async () => {
    const result = await searchListings(
      testDb.db,
      params({ category: PAGINATION_CATEGORY, partySize: PARTY_SIZE }),
      now,
      { fetchLimit: 5 },
    );

    expect(result.results).toHaveLength(4);
    expect(result.hasMore).toBe(true);
    expect(result.results.map((row) => row.id)).toEqual([
      "party_page_eligible_0",
      "party_page_eligible_1",
      "party_page_eligible_2",
      "party_page_eligible_3",
    ]);
  });
});
