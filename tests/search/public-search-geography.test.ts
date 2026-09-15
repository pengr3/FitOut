import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listing, operatingHours } from "@/lib/db/schema";
import {
  derivePublicSearchInput,
  PUBLIC_SEARCH_RADIUS_KM,
} from "@/lib/search/public-search-contract";
import { searchListings } from "@/lib/search/query";
import { searchParamsSchema } from "@/lib/validation/booking";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeVerifiedHost } from "../helpers/seed";

let testDb: TestDb;

const HOST_ID = "public_geography_host";
const PARTY_SIZE = 4;
const CATEGORY = "basketball_court";
const ORIGIN = { lat: 14.582, lng: 121.042 } as const;
const listingIds = {
  mandaluyong: "public_geo_mandaluyong_near",
  makati: "public_geo_makati_farther",
  outsideRadius: "public_geo_makati_outside_radius",
} as const;

async function addListing({
  id,
  city,
  lat,
  lng,
}: {
  id: string;
  city: "Mandaluyong" | "Makati";
  lat: number;
  lng: number;
}) {
  await testDb.db.insert(listing).values({
    id,
    hostId: HOST_ID,
    title: id,
    primarySpaceType: CATEGORY,
    city,
    // Geometry(Point, 4326) keeps the query's x=longitude / y=latitude axis order explicit.
    location: { x: lng, y: lat },
    hourlyRateCents: 50000,
    dayRateCents: 250000,
    maxOccupancy: PARTY_SIZE,
    currency: "php",
    unitCount: 1,
    timezone: "Asia/Manila",
    status: "published",
    reviewState: "approved",
    publishedAt: new Date("2026-09-14T00:00:00.000Z"),
  });
  await testDb.db.insert(operatingHours).values({
    id: `${id}_hours`,
    listingId: id,
    dayOfWeek: 0,
    openTime: "06:00:00",
    closeTime: "22:00:00",
  });
}

function publicLocationSearch() {
  const parsed = searchParamsSchema.parse({
    category: CATEGORY,
    lat: String(ORIGIN.lat),
    lng: String(ORIGIN.lng),
    partySize: String(PARTY_SIZE),
    radius: "2",
  });
  return derivePublicSearchInput(parsed, 50);
}

beforeAll(async () => {
  testDb = await setupTestDb();
  await makeVerifiedHost(testDb.db, HOST_ID);

  await addListing({
    id: listingIds.mandaluyong,
    city: "Mandaluyong",
    lat: 14.584,
    lng: 121.044,
  });
  await addListing({
    id: listingIds.makati,
    city: "Makati",
    lat: 14.5547,
    lng: 121.0244,
  });
  await addListing({
    id: listingIds.outsideRadius,
    city: "Makati",
    lat: 14.85,
    lng: 121.0244,
  });
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("public search geography", () => {
  it("uses the fixed 25 km point radius and ranks eligible listings nearest first", async () => {
    const params = publicLocationSearch();
    const result = await searchListings(testDb.db, params);

    expect(params.radius).toBe(PUBLIC_SEARCH_RADIUS_KM);
    expect(result.results.map((row) => row.id)).toEqual([
      listingIds.mandaluyong,
      listingIds.makati,
    ]);
    expect(result.results.map((row) => row.distanceM)).toEqual([
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(result.results[0]?.distanceM).toBeLessThan(result.results[1]?.distanceM ?? Infinity);
  });

  it("excludes an otherwise eligible matching listing beyond the fixed reach", async () => {
    const result = await searchListings(testDb.db, publicLocationSearch());

    expect(result.results.map((row) => row.id)).not.toContain(listingIds.outsideRadius);
  });

  it("does not use the city label as a municipal predicate", async () => {
    const result = await searchListings(testDb.db, publicLocationSearch());

    expect(result.results.map((row) => row.id)).toContain(listingIds.makati);
  });
});
