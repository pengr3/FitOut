// v1.0 audit finding #4 — the host-side HOURS SIGNAL, proved against a real isolated schema.
//
// The finding: `publishListing` never requires operating hours, so a host can go Live with an empty
// calendar, be told nothing, and send every booker to a dead end where each date renders Closed. The fix
// is a SIGNAL, not a gate (`deriveBookable` stays pure, `publishListing` stays unchanged) — and the whole
// signal is only as trustworthy as the predicate below, which is why this is an integration test against
// real migrations rather than a mock.
//
// Six cases, each written so that ONE specific mutation of the WHERE clause kills it and nothing else:
//   (1) the five seeded listings all carry 7 hours rows        — kills "returns everything"
//   (2) a published, hours-less listing IS the only id back    — kills "returns nothing" / inverted NOT EXISTS
//   (3) a DRAFT with no hours is absent                        — kills dropping the status filter
//   (4) an UNLISTED with no hours is absent                    — kills `status != 'draft'`
//   (5) a soft-DELETED published, hours-less listing is absent — kills dropping isNull(deletedAt)
//   (6) a second host's hours-less listing is absent for host A — kills dropping the owner scope (T-IU7-01, IDOR)
//       and present for host B, so the case cannot pass by the helper simply returning less.
//
// MUTATION-MEASURED (each mutation applied to loadPublishedListingsMissingHours, observed, reverted).
// Recorded as OBSERVED, not as predicted — two of the three killed MORE than the plan expected, because
// case (2)'s `toEqual([PUBLISHED_NO_HOURS])` is an exact-set assertion and therefore catches any term
// that widens the result, not just the one it was written for:
//   1. delete `eq(listing.status, "published")` → 3 failed / 3 passed: (2), (3), (4) RED.
//      Predicted (3) and (4); (2) additionally RED because the draft and unlisted rows widen the set.
//   2. delete `eq(listing.hostId, hostId)`      → 2 failed / 4 passed: (2), (6) RED.
//      Predicted (6); (2) additionally RED because host B's row widens the set.
//   3. flip `notExists` → `exists`              → 3 failed / 3 passed: (1), (2), (6) RED.
//      Predicted (1) and (2); (6) additionally RED because its host-B half then returns empty.
// Reverted, re-run clean: 6 passed (6).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { seedSearchListings, SEED_HOST_ID, SEED_LISTINGS } from "../helpers/seed";
import { user, listing } from "@/lib/db/schema";
import { loadPublishedListingsMissingHours } from "@/lib/listing/hours-signal";

let testDb: TestDb;

/** The second host — its own `user` row, because listing.host_id is an FK. */
const HOST_B = "hs_host_2";

const PUBLISHED_NO_HOURS = "hs_published_no_hours";
const DRAFT_NO_HOURS = "hs_draft_no_hours";
const UNLISTED_NO_HOURS = "hs_unlisted_no_hours";
const DELETED_NO_HOURS = "hs_deleted_no_hours";
const OTHER_HOST_NO_HOURS = "hs_other_host_no_hours";

/**
 * Insert one listing with the publish-shaped column set (copied from tests/helpers/seed.ts) and
 * DELIBERATELY no `operating_hours` rows — the absence is the fixture.
 */
async function insertListing(overrides: {
  id: string;
  hostId: string;
  title: string;
  status: "draft" | "published" | "unlisted";
  publishedAt?: Date | null;
  deletedAt?: Date | null;
}) {
  await testDb.db.insert(listing).values({
    hostId: overrides.hostId,
    id: overrides.id,
    title: overrides.title,
    description: `${overrides.title} — a fixture with no weekly hours.`,
    primarySpaceType: "pickleball_court",
    addressLine1: "1 Fixture Street",
    city: "Makati",
    region: "Metro Manila",
    postalCode: "1200",
    country: "Philippines",
    neighborhood: "Poblacion",
    // AXIS ORDER: x = longitude, y = latitude (Pitfall 1).
    location: { x: 121.0244, y: 14.5547 },
    showExactAddress: false,
    maxOccupancy: 12,
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 45000,
    dayRateCents: 280000,
    currency: "php",
    bookingMode: "request",
    status: overrides.status,
    publishedAt: overrides.publishedAt ?? null,
    deletedAt: overrides.deletedAt ?? null,
  });
}

beforeAll(async () => {
  testDb = await setupTestDb();

  // The positive control: SEED_HOST_ID + five PUBLISHED listings, each with 7 operating_hours rows.
  await seedSearchListings(testDb.db);

  await testDb.db.insert(user).values({
    id: HOST_B,
    name: "Second Host",
    email: `${HOST_B}@fitout.seed`,
    firstName: "Second",
    emailVerified: true,
    canHost: true,
    canBook: false,
  });

  await insertListing({
    id: PUBLISHED_NO_HOURS,
    hostId: SEED_HOST_ID,
    title: "Live With No Hours",
    status: "published",
    publishedAt: new Date(),
  });
  await insertListing({
    id: DRAFT_NO_HOURS,
    hostId: SEED_HOST_ID,
    title: "Draft With No Hours",
    status: "draft",
  });
  await insertListing({
    id: UNLISTED_NO_HOURS,
    hostId: SEED_HOST_ID,
    title: "Unlisted With No Hours",
    status: "unlisted",
    publishedAt: new Date(),
  });
  await insertListing({
    id: DELETED_NO_HOURS,
    hostId: SEED_HOST_ID,
    title: "Deleted With No Hours",
    status: "published",
    publishedAt: new Date(),
    deletedAt: new Date(),
  });
  await insertListing({
    id: OTHER_HOST_NO_HOURS,
    hostId: HOST_B,
    title: "Another Host's Live Listing With No Hours",
    status: "published",
    publishedAt: new Date(),
  });
}, 60_000);

afterAll(async () => {
  if (testDb) await teardownTestDb(testDb);
});

describe("loadPublishedListingsMissingHours (v1.0 audit finding #4)", () => {
  it("(1) never returns a published listing that HAS weekly hours", async () => {
    const ids = (await loadPublishedListingsMissingHours(testDb.db, SEED_HOST_ID)).map((l) => l.id);

    // Positive control: all five seeded listings carry 7 operating_hours rows apiece.
    for (const seeded of SEED_LISTINGS) {
      expect(ids).not.toContain(seeded.id);
    }
  });

  it("(2) returns the host's published, hours-less listing — and only it", async () => {
    const rows = await loadPublishedListingsMissingHours(testDb.db, SEED_HOST_ID);

    expect(rows.map((l) => l.id)).toEqual([PUBLISHED_NO_HOURS]);
    // The title comes back too, so the dashboard can name the one listing rather than count to one.
    expect(rows[0]?.title).toBe("Live With No Hours");
  });

  it("(3) never returns a DRAFT with no hours — nothing is on the market yet", async () => {
    const ids = (await loadPublishedListingsMissingHours(testDb.db, SEED_HOST_ID)).map((l) => l.id);

    expect(ids).not.toContain(DRAFT_NO_HOURS);
  });

  it("(4) never returns an UNLISTED listing with no hours", async () => {
    const ids = (await loadPublishedListingsMissingHours(testDb.db, SEED_HOST_ID)).map((l) => l.id);

    expect(ids).not.toContain(UNLISTED_NO_HOURS);
  });

  it("(5) never returns a soft-deleted published listing with no hours", async () => {
    const ids = (await loadPublishedListingsMissingHours(testDb.db, SEED_HOST_ID)).map((l) => l.id);

    expect(ids).not.toContain(DELETED_NO_HOURS);
  });

  it("(6) is owner-scoped: host A never sees host B's hours-less listing, and host B does", async () => {
    const aIds = (await loadPublishedListingsMissingHours(testDb.db, SEED_HOST_ID)).map((l) => l.id);
    expect(aIds).not.toContain(OTHER_HOST_NO_HOURS);

    // The other half of the scope claim: the row genuinely exists and is genuinely hours-less, so (6)
    // cannot be satisfied by a helper that simply returns fewer rows.
    const bIds = (await loadPublishedListingsMissingHours(testDb.db, HOST_B)).map((l) => l.id);
    expect(bIds).toEqual([OTHER_HOST_NO_HOURS]);
  });
});
