// D-38 geo-seed helper for the isolated-schema integration tests (radius / filters / availability).
//
// This is the CANONICAL source of the search seed set's coordinates + their expected great-circle
// distances from the launch-city center, so `tests/search/radius.test.ts` can assert within-N-km /
// beyond-N-km deterministically. `scripts/seed.ts` seeds the SAME set (same ids, origin, coordinates)
// into the live dev DB for the E2E + manual UAT — keep the two in sync (they intentionally mirror).
//
// `seedSearchListings(db)` inserts the set into a caller-provided isolated test-schema Drizzle db
// (mirrors tests/listing/geo-roundtrip.test.ts — location persisted as { x: lng, y: lat }, Pitfall 1).
// The host is fully bookable (email-verified + an activated host_payout with payouts_enabled) so
// `deriveBookable` is true and every seeded listing is search-eligible (D-16).

import { user, hostPayout, listing, listingPhoto, listingActivityTag, operatingHours } from "@/lib/db/schema";
import type { SpaceTypeValue } from "@/lib/listing-vocab";
import type { TestDb } from "./db";

/** Launch-city center (Makati CBD). AXIS ORDER for PostGIS is x=lng / y=lat — see `location` below. */
export const SEARCH_ORIGIN = { lat: 14.5547, lng: 121.0244 } as const;

/** The deterministic host that owns every seeded listing (namespaced `seed_*`). */
export const SEED_HOST_ID = "seed_host_1";

export type SeedListingSpec = {
  id: string;
  title: string;
  primarySpaceType: SpaceTypeValue;
  lat: number;
  lng: number;
  city: string;
  neighborhood: string;
  hourlyRateCents: number;
  dayRateCents: number;
  unitCount: number;
  /** activity tags (D-05/D-08 vocab keys); at least one listing carries a tag DISJOINT from its type. */
  tags: string[];
};

// Five bookable Metro Manila listings at KNOWN coordinates, varied types + rates + hours, with:
//   - seed_listing_4: a gym (gym_fitness_floor) tagged `basketball` — its primary type is DISJOINT from
//     an activity tag it carries, so the D-35 type-OR-tag category match is exercisable.
//   - seed_listing_5: ≈15.3 km south of the origin — BEYOND the default 10 km radius, so the radius
//     filter + a zero-result path have real supply to exclude.
export const SEED_LISTINGS: readonly SeedListingSpec[] = [
  { id: "seed_listing_1", title: "Poblacion Pickleball Court", primarySpaceType: "pickleball_court", lat: 14.558, lng: 121.028, city: "Makati", neighborhood: "Poblacion", hourlyRateCents: 45000, dayRateCents: 280000, unitCount: 2, tags: ["pickleball"] },
  { id: "seed_listing_2", title: "Sunlit Yoga Studio", primarySpaceType: "yoga_studio", lat: 14.576, lng: 121.0437, city: "Mandaluyong", neighborhood: "Highway Hills", hourlyRateCents: 60000, dayRateCents: 350000, unitCount: 1, tags: ["yoga", "pilates"] },
  { id: "seed_listing_3", title: "Ortigas Basketball Court", primarySpaceType: "basketball_court", lat: 14.5866, lng: 121.0614, city: "Pasig", neighborhood: "Ortigas Center", hourlyRateCents: 80000, dayRateCents: 500000, unitCount: 1, tags: ["basketball", "volleyball"] },
  { id: "seed_listing_4", title: "QC Strength & Conditioning Gym", primarySpaceType: "gym_fitness_floor", lat: 14.628, lng: 121.03, city: "Quezon City", neighborhood: "Kamias", hourlyRateCents: 35000, dayRateCents: 200000, unitCount: 1, tags: ["basketball", "weightlifting", "general_fitness"] },
  { id: "seed_listing_5", title: "Alabang Multi-Sport Court", primarySpaceType: "multi_sport_court", lat: 14.418, lng: 121.04, city: "Muntinlupa", neighborhood: "Alabang", hourlyRateCents: 70000, dayRateCents: 420000, unitCount: 3, tags: ["futsal_soccer", "badminton"] },
];

/** { id → {lat,lng} } — the bare coordinate constants (a convenience view of SEED_LISTINGS). */
export const SEED_LISTING_COORDS: Record<string, { lat: number; lng: number }> = Object.fromEntries(
  SEED_LISTINGS.map((l) => [l.id, { lat: l.lat, lng: l.lng }]),
);

/** Great-circle distance (km) between two lat/lng points (spherical earth, R=6371.0088 km). */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371.0088;
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * { id → km from SEARCH_ORIGIN } — the expected distances the radius test asserts against. Derived
 * (not hand-copied), so it can never drift from the coordinates. Margins are deliberate: seed_listing_4
 * ≈8.2 km (well under 10) and seed_listing_5 ≈15.3 km (well over 10), so the ~0.3% spheroid-vs-sphere
 * gap between PostGIS `ST_Distance(geography)` and this haversine can never flip a within/beyond assertion.
 */
export const DISTANCES_KM: Record<string, number> = Object.fromEntries(
  SEED_LISTINGS.map((l) => [l.id, haversineKm(SEARCH_ORIGIN, { lat: l.lat, lng: l.lng })]),
);

/**
 * Insert the D-38 search set into a caller-provided isolated test-schema db. The host is fully bookable
 * (email-verified + activated payout) so `deriveBookable` is true for every listing. Returns the seeded
 * host id + listing ids. No cleanup needed — the caller's schema is dropped in teardownTestDb.
 */
export async function seedSearchListings(
  db: TestDb["db"],
): Promise<{ hostId: string; listingIds: string[] }> {
  await db.insert(user).values({
    id: SEED_HOST_ID,
    name: "Seed Host",
    email: `${SEED_HOST_ID}@fitout.seed`,
    firstName: "Seed",
    emailVerified: true,
    canHost: true,
    canBook: false,
  });
  await db.insert(hostPayout).values({
    userId: SEED_HOST_ID,
    paymongoAccountId: "acct_seed_1",
    activationStatus: "activated",
    payoutsEnabled: true,
    onboardingComplete: true,
  });

  for (const l of SEED_LISTINGS) {
    await db.insert(listing).values({
      id: l.id,
      hostId: SEED_HOST_ID,
      title: l.title,
      description: `${l.title} — a bookable space in ${l.city}.`,
      primarySpaceType: l.primarySpaceType,
      addressLine1: "1 Seed Street",
      city: l.city,
      region: "Metro Manila",
      postalCode: "1200",
      country: "Philippines",
      neighborhood: l.neighborhood,
      // AXIS ORDER: x = longitude, y = latitude (Pitfall 1) — persist lng into x, lat into y.
      location: { x: l.lng, y: l.lat },
      showExactAddress: false,
      maxOccupancy: 12,
      unitCount: l.unitCount,
      timezone: "Asia/Manila",
      hourlyRateCents: l.hourlyRateCents,
      dayRateCents: l.dayRateCents,
      currency: "php",
      bookingMode: "request",
      status: "published",
      publishedAt: new Date(),
    });
    await db.insert(listingPhoto).values({
      id: `${l.id}_p0`,
      listingId: l.id,
      publicId: `fitout/seed/${l.id}/0`,
      url: "https://example.com/seed-0.jpg",
      position: 0,
    });
    for (let dow = 0; dow < 7; dow++) {
      await db.insert(operatingHours).values({
        id: `${l.id}_oh_${dow}`,
        listingId: l.id,
        dayOfWeek: dow,
        openTime: "06:00:00",
        closeTime: "21:00:00",
      });
    }
    for (const tag of l.tags) {
      await db.insert(listingActivityTag).values({ listingId: l.id, tag });
    }
  }

  return { hostId: SEED_HOST_ID, listingIds: SEED_LISTINGS.map((l) => l.id) };
}
