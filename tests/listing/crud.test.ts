// LIST-01 / LIST-04 — Listing create/edit persistence + ownership scoping, driven through the REAL
// exported server actions (createDraftListing / saveListingStep) against the isolated test schema.
//
// Harness: the tests/profile/profile.test.ts pattern — setupTestDb + makeTestAuth + a mutable
// sessionHeaders holder feeding a mocked next/headers. Because the listing actions write via
// `@/lib/db` directly (unlike updateProfile which goes through auth.api), we ALSO doMock `@/lib/db`
// to the test-schema db and stub next/cache's revalidatePath, then lazily import the actions — so a
// regression INSIDE the action (dropped field, broken IDOR guard, client-status leak) fails here.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { listing, listingAmenity, listingActivityTag } from "@/lib/db/schema";

let testDb: TestDb;
let testAuth: TestAuth;
let createDraftListing: (typeof import("@/app/actions/listing"))["createDraftListing"];
let saveListingStep: (typeof import("@/app/actions/listing"))["saveListingStep"];

// Mutable holder so the (hoisted) next/headers mock can pick up the per-test session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.resetModules();
  ({ createDraftListing, saveListingStep } = await import("@/app/actions/listing"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  await teardownTestDb(testDb);
});

/** Sign up + sign in a host; stash the session cookie for the next/headers mock. Returns the id. */
async function signInHost(email: string): Promise<string> {
  const res = (await signUp(testAuth, {
    email,
    password: "averylongpassword",
    name: "Host",
    firstName: "Host",
    intent: "host",
  })) as { user: { id: string } };
  const signIn = await testAuth.api.signInEmail({
    body: { email, password: "averylongpassword" },
    asResponse: true,
  });
  const setCookie = signIn.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
  return res.user.id;
}

async function readListing(id: string) {
  const rows = await testDb.db.select().from(listing).where(eq(listing.id, id));
  return rows[0];
}

describe("listing CRUD via the real server action (LIST-01/04)", () => {
  it("createDraftListing persists a draft owned by the session user (hostId === session.user.id)", async () => {
    const userId = await signInHost("crud.create@example.com");
    const res = await createDraftListing();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.id).toBeTruthy();
    const row = await readListing(res.id!);
    expect(row.hostId).toBe(userId);
    expect(row.status).toBe("draft");
  });

  it("saveListingStep persists edited core fields (title, description, space type, address, capacity)", async () => {
    await signInHost("crud.save@example.com");
    const created = await createDraftListing();
    if (!created.ok) throw new Error("setup failed");
    const id = created.id!;
    const res = await saveListingStep(id, {
      title: "Sunny Yoga Studio",
      description: "A calm space for yoga.",
      primarySpaceType: "yoga_studio",
      addressLine1: "123 Main St",
      city: "Austin",
      region: "TX",
      postalCode: "78701",
      country: "US",
      maxOccupancy: 20,
      lat: 30.2672,
      lng: -97.7431,
    });
    expect(res.ok).toBe(true);
    const row = await readListing(id);
    expect(row.title).toBe("Sunny Yoga Studio");
    expect(row.description).toBe("A calm space for yoga.");
    expect(row.primarySpaceType).toBe("yoga_studio");
    expect(row.addressLine1).toBe("123 Main St");
    expect(row.maxOccupancy).toBe(20);
    // Pitfall 1: lat→y, lng→x round-trips (PostGIS axis order).
    expect(row.location!.x).toBeCloseTo(-97.7431, 4); // longitude
    expect(row.location!.y).toBeCloseTo(30.2672, 4); // latitude
  });

  it("a NON-owner calling saveListingStep on someone else's listing is rejected (IDOR guard)", async () => {
    await signInHost("crud.owner@example.com");
    const created = await createDraftListing();
    if (!created.ok) throw new Error("setup failed");
    const id = created.id!;
    await saveListingStep(id, { title: "Owner's title" });

    // A DIFFERENT user signs in and tries to edit the owner's listing.
    await signInHost("crud.attacker@example.com");
    const res = await saveListingStep(id, { title: "Hijacked" });
    expect(res.ok).toBe(false);

    // The row is unchanged — the attacker's write never landed.
    const row = await readListing(id);
    expect(row.title).toBe("Owner's title");
  });

  it("booking_mode is stored as instant|request with the schema default (request) when unset (LIST-04)", async () => {
    await signInHost("crud.mode@example.com");
    const created = await createDraftListing();
    if (!created.ok) throw new Error("setup failed");
    const id = created.id!;
    // Default when unset (D-04).
    let row = await readListing(id);
    expect(row.bookingMode).toBe("request");
    // Host chooses instant-book.
    await saveListingStep(id, { bookingMode: "instant" });
    row = await readListing(id);
    expect(row.bookingMode).toBe("instant");
  });

  it("amenities + activity tags persist to their join tables scoped to the listing", async () => {
    await signInHost("crud.joins@example.com");
    const created = await createDraftListing();
    if (!created.ok) throw new Error("setup failed");
    const id = created.id!;
    await saveListingStep(id, {
      amenities: ["showers", "parking", "wifi"],
      activityTags: ["yoga", "pilates"],
    });
    const amen = await testDb.db
      .select()
      .from(listingAmenity)
      .where(eq(listingAmenity.listingId, id));
    const tags = await testDb.db
      .select()
      .from(listingActivityTag)
      .where(eq(listingActivityTag.listingId, id));
    expect(amen.map((a) => a.amenity).sort()).toEqual(["parking", "showers", "wifi"]);
    expect(tags.map((t) => t.tag).sort()).toEqual(["pilates", "yoga"]);

    // Re-saving REPLACES the set (no stale rows leak across saves).
    await saveListingStep(id, { amenities: ["mirrors"] });
    const amen2 = await testDb.db
      .select()
      .from(listingAmenity)
      .where(eq(listingAmenity.listingId, id));
    expect(amen2.map((a) => a.amenity)).toEqual(["mirrors"]);
  });
});
