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

  it("createDraftListing defaults bookingMode to instant (D-62 demand-first flip); saveListingStep can toggle it (LIST-04)", async () => {
    await signInHost("crud.mode@example.com");
    const created = await createDraftListing();
    if (!created.ok) throw new Error("setup failed");
    const id = created.id!;
    // D-62: the create-code default is now "instant" (demand-first), flipped from "request" (D-04).
    let row = await readListing(id);
    expect(row.bookingMode).toBe("instant");
    // The host can still choose request-to-book explicitly.
    await saveListingStep(id, { bookingMode: "request" });
    row = await readListing(id);
    expect(row.bookingMode).toBe("request");
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

// MUTATION-VERIFY (run before committing): delete the `if (owned.status === "published") { … }` guard
// from saveListingStep → the published-reject cases (1),(2),(6) go RED; (3),(4),(5) stay GREEN. Restore → GREEN.
describe("saveListingStep — surcharge reachability on edit (HG-01 / 08-22)", () => {
  /**
   * Create a draft, autosave the baseline group-pricing fields into it (permissive, draft), then flip the
   * row to `published` directly in the DB — publishListing's photo/email gates aren't needed to reach the
   * edit-path guard, only that the persisted row's status is "published".
   */
  async function publishedListingWith(
    email: string,
    pricing: { maxOccupancy: number; extraHeadFee: number; included: number },
  ): Promise<string> {
    await signInHost(email);
    const created = await createDraftListing();
    if (!created.ok) throw new Error("setup failed");
    const id = created.id!;
    const seed = await saveListingStep(id, pricing);
    expect(seed.ok).toBe(true); // baseline autosave is permissive while still a draft
    await testDb.db.update(listing).set({ status: "published" }).where(eq(listing.id, id));
    return id;
  }

  it("(1) published + fee>0 + included raised to == maxOccupancy → REJECT, no write", async () => {
    const id = await publishedListingWith("surcharge.raise@example.com", {
      maxOccupancy: 8,
      extraHeadFee: 500,
      included: 7,
    });
    const res = await saveListingStep(id, { included: 8 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.fieldErrors?.included).toBeDefined();
    // The rejected edit never landed — the persisted included is STILL 7.
    const row = await readListing(id);
    expect(row.included).toBe(7);
  });

  it("(2) published + fee>0 + maxOccupancy lowered below included → REJECT (second vector)", async () => {
    const id = await publishedListingWith("surcharge.lowermax@example.com", {
      maxOccupancy: 8,
      extraHeadFee: 500,
      included: 6,
    });
    const res = await saveListingStep(id, { maxOccupancy: 5 }); // 6 >= 5 → unreachable
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.fieldErrors?.included).toBeDefined();
    const row = await readListing(id);
    expect(row.maxOccupancy).toBe(8); // unchanged
  });

  it("(3) published + fee>0 + included stays < maxOccupancy → ACCEPT", async () => {
    const id = await publishedListingWith("surcharge.ok@example.com", {
      maxOccupancy: 8,
      extraHeadFee: 500,
      included: 5,
    });
    const res = await saveListingStep(id, { included: 6 }); // 6 < 8 → still reachable
    expect(res.ok).toBe(true);
    const row = await readListing(id);
    expect(row.included).toBe(6);
  });

  it("(4) DRAFT stays permissive — included == maxOccupancy autosaves (publishSchema gates at publish)", async () => {
    // Publishes NOTHING: the row remains a draft, so the edit-path guard does not apply.
    await signInHost("surcharge.draft@example.com");
    const created = await createDraftListing();
    if (!created.ok) throw new Error("setup failed");
    const id = created.id!;
    const seed = await saveListingStep(id, { maxOccupancy: 8, extraHeadFee: 500, included: 3 });
    expect(seed.ok).toBe(true);
    const res = await saveListingStep(id, { included: 8 }); // included == maxOccupancy, but it's a DRAFT
    expect(res.ok).toBe(true);
    const row = await readListing(id);
    expect(row.included).toBe(8);
    expect(row.status).toBe("draft");
  });

  it("(5) published + FLAT (fee 0) + included == maxOccupancy → ACCEPT (no surcharge to lose)", async () => {
    const id = await publishedListingWith("surcharge.flat@example.com", {
      maxOccupancy: 8,
      extraHeadFee: 0,
      included: 8,
    });
    const res = await saveListingStep(id, { included: 8 });
    expect(res.ok).toBe(true);
    const row = await readListing(id);
    expect(row.included).toBe(8);
  });

  it("(6) SPARSE save proves EFFECTIVE-value evaluation → REJECT (incoming max vs persisted included)", async () => {
    const id = await publishedListingWith("surcharge.sparse@example.com", {
      maxOccupancy: 8,
      extraHeadFee: 500,
      included: 3,
    });
    // Send ONLY maxOccupancy: 3 — effective included is the PERSISTED 3, effective max the incoming 3, so
    // 3 >= 3 is unreachable. This fails if the guard reads only the incoming field instead of the row.
    const res = await saveListingStep(id, { maxOccupancy: 3 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.fieldErrors?.included).toBeDefined();
    const row = await readListing(id);
    expect(row.maxOccupancy).toBe(8); // unchanged
  });
});
