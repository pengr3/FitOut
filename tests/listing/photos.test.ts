// LIST-02 — listing photo metadata persistence + atomic reorder (cover = position 0).
//
// GREEN as of Plan 04 (src/app/actions/listing-photo.ts). Photo BYTES go direct to Cloudinary (signed
// upload); only { public_id, secure_url } metadata is persisted here (position is server-assigned).
// Reorder rewrites all positions in a single transaction so the (listingId, position) unique index
// never transiently collides. removePhoto deletes the row, re-packs the remaining positions so they
// stay contiguous, and destroys the Cloudinary asset for orphan cleanup. Harness = status-gate.test.ts:
// mock next/headers + doMock @/lib/auth + @/lib/db + next/cache, driving the REAL exported actions.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockCloudinary } from "../helpers/mocks";
import { listing, listingPhoto } from "@/lib/db/schema";

let testDb: TestDb;
let testAuth: TestAuth;
type PhotoActions = typeof import("@/app/actions/listing-photo");
let persistPhoto: PhotoActions["persistPhoto"];
let reorderPhotos: PhotoActions["reorderPhotos"];
let removePhoto: PhotoActions["removePhoto"];

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
  ({ persistPhoto, reorderPhotos, removePhoto } = await import(
    "@/app/actions/listing-photo"
  ));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  await teardownTestDb(testDb);
});

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

async function makeListing(hostId: string): Promise<string> {
  const id = randomUUID();
  await testDb.db
    .insert(listing)
    .values({ id, hostId, status: "draft", bookingMode: "request" });
  return id;
}

/** All photos for a listing, ordered by position (0 = cover). */
async function photosOf(listingId: string) {
  return testDb.db
    .select()
    .from(listingPhoto)
    .where(eq(listingPhoto.listingId, listingId))
    .orderBy(asc(listingPhoto.position));
}

describe("listing photo persistence + reorder (LIST-02)", () => {
  it("persisting a photo stores { public_id, url, position } against the owning listing", async () => {
    const hostId = await signInHost("photos.persist@example.com");
    const listingId = await makeListing(hostId);

    const res = await persistPhoto(listingId, {
      publicId: "fitout/listings/abc/one",
      url: "https://res.cloudinary.com/mock/one.jpg",
    });
    expect(res.ok).toBe(true);

    const [row] = await photosOf(listingId);
    expect(row.publicId).toBe("fitout/listings/abc/one");
    expect(row.url).toBe("https://res.cloudinary.com/mock/one.jpg");
    expect(row.position).toBe(0);
    expect(row.listingId).toBe(listingId);
  });

  it("the first photo is the cover (position 0); subsequent photos append in order", async () => {
    const hostId = await signInHost("photos.cover@example.com");
    const listingId = await makeListing(hostId);

    await persistPhoto(listingId, { publicId: "p0", url: "u0" });
    await persistPhoto(listingId, { publicId: "p1", url: "u1" });
    await persistPhoto(listingId, { publicId: "p2", url: "u2" });

    const rows = await photosOf(listingId);
    expect(rows.map((r) => r.position)).toEqual([0, 1, 2]);
    // Cover = position 0 = the first uploaded.
    expect(rows[0].publicId).toBe("p0");
  });

  it("reorder rewrites positions atomically in one transaction (no unique-index collision mid-swap)", async () => {
    const hostId = await signInHost("photos.reorder@example.com");
    const listingId = await makeListing(hostId);
    await persistPhoto(listingId, { publicId: "p0", url: "u0" });
    await persistPhoto(listingId, { publicId: "p1", url: "u1" });
    await persistPhoto(listingId, { publicId: "p2", url: "u2" });

    const before = await photosOf(listingId);
    const ids = before.map((r) => r.id); // [id@0, id@1, id@2]

    // FULL REVERSAL — the worst case for a naive single-pass rewrite: setting id@2 → position 0 would
    // collide with id@0 (still at 0) under the (listingId, position) unique index. Must still succeed.
    const reversed = [...ids].reverse();
    const res = await reorderPhotos(listingId, reversed);
    expect(res.ok).toBe(true);

    const after = await photosOf(listingId);
    // Positions are contiguous 0..2 and the NEW cover (position 0) is the previously-last photo.
    expect(after.map((r) => r.position)).toEqual([0, 1, 2]);
    expect(after[0].publicId).toBe("p2"); // new cover
    expect(after[2].publicId).toBe("p0");
    expect(after.map((r) => r.id)).toEqual(reversed);
  });

  it("reorder is ownership-scoped — a non-owner cannot reorder another host's photos (IDOR)", async () => {
    const ownerId = await signInHost("photos.owner@example.com");
    const listingId = await makeListing(ownerId);
    await persistPhoto(listingId, { publicId: "p0", url: "u0" });
    await persistPhoto(listingId, { publicId: "p1", url: "u1" });
    const before = await photosOf(listingId);
    const reversed = before.map((r) => r.id).reverse();

    // A DIFFERENT host signs in and tries to reorder the owner's photos.
    await signInHost("photos.attacker@example.com");
    const res = await reorderPhotos(listingId, reversed);
    expect(res.ok).toBe(false);

    // The owner's ordering is untouched.
    const after = await photosOf(listingId);
    expect(after.map((r) => r.publicId)).toEqual(["p0", "p1"]);
  });

  it("removing a photo deletes its row, re-packs positions, and destroys the Cloudinary asset (orphan cleanup)", async () => {
    const hostId = await signInHost("photos.remove@example.com");
    const listingId = await makeListing(hostId);
    await persistPhoto(listingId, { publicId: "keep-0", url: "u0" });
    await persistPhoto(listingId, { publicId: "gone-1", url: "u1" });
    await persistPhoto(listingId, { publicId: "keep-2", url: "u2" });

    const rows = await photosOf(listingId);
    const middle = rows[1]; // position 1, publicId "gone-1"

    const res = await removePhoto(listingId, middle.id);
    expect(res.ok).toBe(true);

    const after = await photosOf(listingId);
    // The row is gone and the remaining photos are re-packed contiguously (0 = cover preserved).
    expect(after.map((r) => r.id)).not.toContain(middle.id);
    expect(after.map((r) => r.publicId)).toEqual(["keep-0", "keep-2"]);
    expect(after.map((r) => r.position)).toEqual([0, 1]);

    // The removed asset's public_id was destroyed on Cloudinary (T-04-ORPHAN).
    expect(mockCloudinary.destroys()).toContain("gone-1");
  });
});
