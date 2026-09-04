// D-10 / RESEARCH Pitfall 1: PostGIS POINT is (x=longitude, y=latitude). Humans say "lat, lng" but
// GIS stores "x=lng, y=lat" — storing them swapped silently puts every listing in the wrong
// hemisphere and Phase-4 radius search returns garbage. This integration test inserts a listing at a
// KNOWN coordinate (Austin, TX: lat 30.2672, lng -97.7431) via the Drizzle `geometry(...,mode:"xy")`
// column and asserts it reads back with the axes intact.
//
// Wave-0 FOUNDATION anchor. It also proves the isolated-schema harness replays the PostGIS
// `CREATE EXTENSION IF NOT EXISTS postgis` + the geometry column cleanly (Pitfall 7). It goes GREEN
// once Task 4 generates + pushes the listing migration (the harness has a `listing` table to replay).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing } from "@/lib/db/schema";

let testDb: TestDb;

// Austin, TX. AXIS ORDER: x = longitude (-97.7431), y = latitude (30.2672).
const AUSTIN = { lng: -97.7431, lat: 30.2672 };

beforeAll(async () => {
  testDb = await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

async function makeHost(id: string): Promise<void> {
  await testDb.db.insert(user).values({
    id,
    name: "Geo Host",
    email: `${id}@example.com`,
    firstName: "Geo",
    emailVerified: true,
  });
}

describe("PostGIS location round-trip (D-10, Pitfall 1 — no lat/lng axis swap)", () => {
  it("stores { x: lng, y: lat } and reads it back with the axes intact", async () => {
    await makeHost("host_geo_1");
    await testDb.db.insert(listing).values({
      id: "listing_geo_1",
      hostId: "host_geo_1",
      title: "Austin court",
      status: "draft",
      // AXIS: x = longitude, y = latitude — persist lng into x, lat into y.
      location: { x: AUSTIN.lng, y: AUSTIN.lat },
    });

    const rows = await testDb.db
      .select({ location: listing.location })
      .from(listing)
      .where(eq(listing.id, "listing_geo_1"));

    const loc = rows[0].location;
    expect(loc).not.toBeNull();
    // x MUST be longitude, y MUST be latitude — not swapped.
    expect(loc!.x).toBeCloseTo(-97.7431, 4); // longitude
    expect(loc!.y).toBeCloseTo(30.2672, 4); // latitude
    // Explicit anti-swap guard: western-hemisphere lng is negative, this latitude is positive.
    expect(loc!.x).toBeLessThan(0);
    expect(loc!.y).toBeGreaterThan(0);
  });

  it("keeps a second listing's coordinates independent (no cross-row bleed)", async () => {
    await makeHost("host_geo_2");
    await testDb.db.insert(listing).values({
      id: "listing_geo_2",
      hostId: "host_geo_2",
      title: "Null-island guard",
      status: "draft",
      location: { x: 0, y: 0 },
    });
    const rows = await testDb.db
      .select({ location: listing.location })
      .from(listing)
      .where(eq(listing.id, "listing_geo_2"));
    expect(rows[0].location!.x).toBeCloseTo(0, 6);
    expect(rows[0].location!.y).toBeCloseTo(0, 6);
  });
});
