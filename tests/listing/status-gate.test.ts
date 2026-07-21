// LIST-05 / D-02 — the strict draft→publish status gate + unlist + soft-delete, driven through the
// REAL exported actions (publishListing / unlistListing / softDeleteListing) against the isolated
// test schema. The publish gate is SERVER-enforced (never a client-settable `status`): publishing
// asserts publishSchema AND ≥3 photos AND host.emailVerified. Same harness as crud.test.ts.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import type { DraftListingInput } from "@/lib/validation/listing";
import { listing, listingPhoto, user } from "@/lib/db/schema";

let testDb: TestDb;
let testAuth: TestAuth;
type ListingActions = typeof import("@/app/actions/listing");
let createDraftListing: ListingActions["createDraftListing"];
let saveListingStep: ListingActions["saveListingStep"];
let publishListing: ListingActions["publishListing"];
let unlistListing: ListingActions["unlistListing"];
let softDeleteListing: ListingActions["softDeleteListing"];

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
  ({
    createDraftListing,
    saveListingStep,
    publishListing,
    unlistListing,
    softDeleteListing,
  } = await import("@/app/actions/listing"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  await teardownTestDb(testDb);
});

// A complete, publish-eligible field set (all core fields + both integer-cents rates + coordinates +
// the D-77 cancellation tier). `cancellationPolicy` joined this set in 07-15: it is REQUIRED to publish
// and has NO default, so a fixture without it is no longer publish-eligible. The gate's own cases live
// in tests/booking/cancellation-policy.test.ts.
const VALID_FIELDS: DraftListingInput = {
  title: "Sunny Downtown Pickleball Court",
  description: "Two dedicated courts, indoor, climate-controlled.",
  primarySpaceType: "pickleball_court",
  addressLine1: "123 Main St",
  city: "Austin",
  region: "TX",
  postalCode: "78701",
  country: "US",
  neighborhood: "Downtown",
  lat: 30.2672,
  lng: -97.7431,
  maxOccupancy: 8,
  hourlyRateCents: 2500,
  dayRateCents: 18000,
  bookingMode: "request",
  cancellationPolicy: "standard",
  showExactAddress: true,
};

async function signInHost(email: string, opts?: { verified?: boolean }): Promise<string> {
  const res = (await signUp(testAuth, {
    email,
    password: "averylongpassword",
    name: "Host",
    firstName: "Host",
    intent: "host",
  })) as { user: { id: string } };
  if (opts?.verified) {
    await testDb.db.update(user).set({ emailVerified: true }).where(eq(user.id, res.user.id));
  }
  const signIn = await testAuth.api.signInEmail({
    body: { email, password: "averylongpassword" },
    asResponse: true,
  });
  const setCookie = signIn.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
  return res.user.id;
}

async function addPhotos(listingId: string, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await testDb.db.insert(listingPhoto).values({
      id: `${listingId}_p${i}`,
      listingId,
      publicId: `pub_${listingId}_${i}`,
      url: `https://res.cloudinary.com/mock/${listingId}/${i}.jpg`,
      position: i,
    });
  }
}

async function newDraftId(): Promise<string> {
  const created = await createDraftListing();
  if (!created.ok || !created.id) throw new Error("draft setup failed");
  return created.id;
}

async function readListing(id: string) {
  const rows = await testDb.db.select().from(listing).where(eq(listing.id, id));
  return rows[0];
}

describe("publish gate (D-02) — server-enforced", () => {
  it("publish is BLOCKED when the listing has < 3 photos", async () => {
    await signInHost("gate.photos@example.com", { verified: true });
    const id = await newDraftId();
    await saveListingStep(id, VALID_FIELDS);
    await addPhotos(id, 2); // one short of the minimum
    const res = await publishListing(id);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.photos).toBeDefined();
    expect((await readListing(id)).status).toBe("draft");
  });

  it("publish is BLOCKED when the host's email is not verified (soft-gate enforced at publish)", async () => {
    await signInHost("gate.email@example.com", { verified: false });
    const id = await newDraftId();
    await saveListingStep(id, VALID_FIELDS);
    await addPhotos(id, 3);
    const res = await publishListing(id);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.emailVerified).toBeDefined();
    expect((await readListing(id)).status).toBe("draft");
  });

  it("publish is BLOCKED when a required core field is missing (publishSchema fails)", async () => {
    await signInHost("gate.missing@example.com", { verified: true });
    const id = await newDraftId();
    // Everything valid EXCEPT the title (left unset) — publishSchema must fail on it.
    const { title: _omitTitle, ...withoutTitle } = VALID_FIELDS;
    void _omitTitle;
    await saveListingStep(id, withoutTitle);
    await addPhotos(id, 3);
    const res = await publishListing(id);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.title).toBeDefined();
    expect((await readListing(id)).status).toBe("draft");
  });

  it("publish SUCCEEDS when all core fields + >=3 photos + verified email are present (status=published, publishedAt set)", async () => {
    await signInHost("gate.ok@example.com", { verified: true });
    const id = await newDraftId();
    await saveListingStep(id, VALID_FIELDS);
    await addPhotos(id, 3);
    const res = await publishListing(id);
    expect(res.ok).toBe(true);
    const row = await readListing(id);
    expect(row.status).toBe("published");
    expect(row.publishedAt).not.toBeNull();
  });

  it("status is server-set only — a client cannot pass status=published to bypass the gate", async () => {
    await signInHost("gate.clientstatus@example.com", { verified: true });
    const id = await newDraftId();
    // Smuggle privileged fields into the autosave payload — draftSchema strips them; they must NOT
    // persist. The listing stays a draft even though every gate input would otherwise pass.
    await saveListingStep(id, {
      ...VALID_FIELDS,
      status: "published",
      publishedAt: new Date(),
      hostId: "someone-else",
    } as unknown as DraftListingInput);
    const row = await readListing(id);
    expect(row.status).toBe("draft");
    expect(row.publishedAt).toBeNull();
  });
});

describe("unlist + soft-delete (LIST-05, Claude's discretion)", () => {
  it("unlist sets status=unlisted and PRESERVES all listing data (re-publishable)", async () => {
    await signInHost("gate.unlist@example.com", { verified: true });
    const id = await newDraftId();
    await saveListingStep(id, VALID_FIELDS);
    await addPhotos(id, 3);
    await publishListing(id);
    const before = await readListing(id);
    expect(before.status).toBe("published");

    const res = await unlistListing(id);
    expect(res.ok).toBe(true);
    const after = await readListing(id);
    expect(after.status).toBe("unlisted");
    // All data preserved (re-publishable).
    expect(after.title).toBe(before.title);
    expect(after.description).toBe(before.description);
    expect(after.hourlyRateCents).toBe(before.hourlyRateCents);
    expect(after.dayRateCents).toBe(before.dayRateCents);
    expect(after.maxOccupancy).toBe(before.maxOccupancy);
  });

  it("soft-delete sets deletedAt (row retained, forward-safe for future booking FKs)", async () => {
    await signInHost("gate.delete@example.com", { verified: true });
    const id = await newDraftId();
    const res = await softDeleteListing(id);
    expect(res.ok).toBe(true);
    // Direct read (bypasses the action's deletedAt IS NULL filter): the row is retained, not gone.
    const row = await readListing(id);
    expect(row.id).toBe(id);
    expect(row.deletedAt).not.toBeNull();
  });
});
