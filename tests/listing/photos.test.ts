// LIST-02 — listing photo metadata persistence + atomic reorder (cover = position 0).
//
// GREEN as of Plan 04 (src/app/actions/listing-photo.ts). Photo BYTES go direct to Cloudinary (signed
// upload); only { public_id, secure_url } metadata is persisted here (position is server-assigned).
// Reorder rewrites all positions in a single transaction so the (listingId, position) unique index
// never transiently collides. removePhoto deletes the row, re-packs the remaining positions so they
// stay contiguous, and destroys the Cloudinary asset for orphan cleanup. Harness = status-gate.test.ts:
// mock next/headers + doMock @/lib/auth + @/lib/db + next/cache, driving the REAL exported actions.
//
// ── D-165 (Phase 16) — EVERY FIXTURE IN THIS FILE WAS REWRITTEN, AND THAT IS THE POINT ───────────
// `persistPhoto` now validates provenance: the url must parse onto our own Cloudinary delivery
// origin under our own cloud name, and the publicId must sit under `fitout/listings/<listingId>/`.
// The twelve fixtures this file used to carry (`p0`/`u0`, `keep-0`, and one `fitout/listings/abc/one`
// against `res.cloudinary.com/mock/…`) were shapes the real pipeline could NOT have produced, so
// they were never testing the real pipeline. They are now built by `upload()` below, from the test's
// OWN `listingId` — twelve hand-written pairs is twelve chances to be subtly wrong.
//
// The cloud name is set here rather than inherited: `tests/setup.ts:17-19` loads `.env.local`, which
// exists on a developer box and does NOT exist in CI (`.github/workflows/ci.yml:151`, `:875` — the
// test jobs hold no Cloudinary credential). A suite that depended on that file would pass locally and
// fail in CI. The last three cases in this file are the guard's own: two rejections that must write
// NO row, and the absent-cloud-name case that proves the guard FAILS CLOSED rather than skipping.

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

/** D-165. Fixed and set by this suite, so the fixtures do not depend on `.env.local` existing. */
const TEST_CLOUD_NAME = "fitout-test-cloud";
let priorCloudName: string | undefined;

/**
 * A `{ publicId, url }` pair in the shape the real pipeline produces for
 * `folder: "fitout/listings/<listingId>"` — folder-prefixed public_id with NO extension, and a
 * `secure_url` on `res.cloudinary.com/<cloud>/image/upload/v<digits>/…` (16-RESEARCH §C9/§C10,
 * confirmed against the live account's `folder_mode: "dynamic"` in plan 16-05 task 1).
 */
function upload(listingId: string, name: string): { publicId: string; url: string } {
  return {
    publicId: `fitout/listings/${listingId}/${name}`,
    url: `https://res.cloudinary.com/${TEST_CLOUD_NAME}/image/upload/v1755102030/fitout/listings/${listingId}/${name}.jpg`,
  };
}

beforeAll(async () => {
  priorCloudName = process.env.CLOUDINARY_CLOUD_NAME;
  process.env.CLOUDINARY_CLOUD_NAME = TEST_CLOUD_NAME;
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
  if (priorCloudName === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
  else process.env.CLOUDINARY_CLOUD_NAME = priorCloudName;
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

    const one = upload(listingId, "one");
    const res = await persistPhoto(listingId, one);
    expect(res.ok).toBe(true);

    const [row] = await photosOf(listingId);
    expect(row.publicId).toBe(one.publicId);
    expect(row.url).toBe(one.url);
    expect(row.position).toBe(0);
    expect(row.listingId).toBe(listingId);
  });

  it("the first photo is the cover (position 0); subsequent photos append in order", async () => {
    const hostId = await signInHost("photos.cover@example.com");
    const listingId = await makeListing(hostId);

    const [p0, p1, p2] = ["one", "two", "three"].map((n) => upload(listingId, n));
    await persistPhoto(listingId, p0);
    await persistPhoto(listingId, p1);
    await persistPhoto(listingId, p2);

    const rows = await photosOf(listingId);
    expect(rows.map((r) => r.position)).toEqual([0, 1, 2]);
    // Cover = position 0 = the first uploaded.
    expect(rows[0].publicId).toBe(p0.publicId);
  });

  it("reorder rewrites positions atomically in one transaction (no unique-index collision mid-swap)", async () => {
    const hostId = await signInHost("photos.reorder@example.com");
    const listingId = await makeListing(hostId);
    const [p0, p1, p2] = ["one", "two", "three"].map((n) => upload(listingId, n));
    await persistPhoto(listingId, p0);
    await persistPhoto(listingId, p1);
    await persistPhoto(listingId, p2);

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
    expect(after[0].publicId).toBe(p2.publicId); // new cover
    expect(after[2].publicId).toBe(p0.publicId);
    expect(after.map((r) => r.id)).toEqual(reversed);
  });

  it("reorder is ownership-scoped — a non-owner cannot reorder another host's photos (IDOR)", async () => {
    const ownerId = await signInHost("photos.owner@example.com");
    const listingId = await makeListing(ownerId);
    const [p0, p1] = ["one", "two"].map((n) => upload(listingId, n));
    await persistPhoto(listingId, p0);
    await persistPhoto(listingId, p1);
    const before = await photosOf(listingId);
    const reversed = before.map((r) => r.id).reverse();

    // A DIFFERENT host signs in and tries to reorder the owner's photos.
    await signInHost("photos.attacker@example.com");
    const res = await reorderPhotos(listingId, reversed);
    expect(res.ok).toBe(false);

    // The owner's ordering is untouched.
    const after = await photosOf(listingId);
    expect(after.map((r) => r.publicId)).toEqual([p0.publicId, p1.publicId]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // WR-02: `orderedIds` is a client field, and it was used raw.
  //
  // The reversal case above is the only shape it was ever driven with — a genuine permutation. Two
  // others reach the same code from the browser and neither is a reordering of anything:
  //   - DUPLICATES: the same row is written twice, so it ends at the LAST index and one index goes
  //     unclaimed.
  //   - A SUBSET: the omitted rows keep their original positions, which the negative parking never
  //     touches, so a parked row can be assigned a position another row still holds.
  // Both collide with the (listingId, position) unique index at statement end, and there was no
  // `try` — the rejection escaped the server action instead of returning `{ ok: false, error }`.
  // `photo-uploader.tsx:136-143` is written against that shape and reverts its optimistic order on
  // it, so what the host SAW after the throw was an order the database had refused.
  //
  // EVERY CASE ASSERTS THE STORED ORDER IS UNCHANGED, not merely that `ok` is false. A refusal that
  // had already half-applied the parking phase would satisfy the weaker assertion completely, and
  // half-applied is worse than either outcome — the rows would be sitting at negative positions.
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  describe("reorder refuses anything that is not a permutation (WR-02)", () => {
    /** Three photos on a fresh listing; returns the ids in stored order. */
    async function threePhotos(email: string) {
      const hostId = await signInHost(email);
      const listingId = await makeListing(hostId);
      const uploads = ["one", "two", "three"].map((n) => upload(listingId, n));
      for (const u of uploads) await persistPhoto(listingId, u);
      const rows = await photosOf(listingId);
      expect(rows.map((r) => r.position)).toEqual([0, 1, 2]);
      return { listingId, ids: rows.map((r) => r.id), publicIds: uploads.map((u) => u.publicId) };
    }

    it("refuses a DUPLICATED id, answers with the refusal shape, and leaves the order intact", async () => {
      const { listingId, ids, publicIds } = await threePhotos("photos.reorder.dupe@example.com");

      // `[c, c, a]`: `b` is missing and `c` appears twice. Under the old code this reached the
      // transaction and threw out of the action.
      const res = await reorderPhotos(listingId, [ids[2], ids[2], ids[0]]);
      expect(res.ok).toBe(false);
      // The SHAPE is the finding — a thrown rejection has no `.error` at all.
      if (!res.ok) expect(typeof res.error).toBe("string");

      const after = await photosOf(listingId);
      expect(after.map((r) => r.position)).toEqual([0, 1, 2]);
      expect(after.map((r) => r.publicId)).toEqual(publicIds);
    });

    it("refuses a SUBSET, and no row is left parked at a negative position", async () => {
      const { listingId, ids, publicIds } = await threePhotos("photos.reorder.subset@example.com");

      // `["c"]` — the exact sequence in the finding: park `c` at −1, then set it to 0, which `a`
      // still holds.
      const res = await reorderPhotos(listingId, [ids[2]]);
      expect(res.ok).toBe(false);

      const after = await photosOf(listingId);
      expect(
        after.every((r) => r.position >= 0),
        "a row was left at a negative position, so the refusal happened AFTER the parking phase " +
          "rather than before the transaction opened.",
      ).toBe(true);
      expect(after.map((r) => r.position)).toEqual([0, 1, 2]);
      expect(after.map((r) => r.publicId)).toEqual(publicIds);
    });

    it("refuses an id belonging to ANOTHER listing, even one this host owns", async () => {
      const hostId = await signInHost("photos.reorder.crosslisting@example.com");
      const mine = await makeListing(hostId);
      const other = await makeListing(hostId);
      for (const n of ["one", "two"]) await persistPhoto(mine, upload(mine, n));
      await persistPhoto(other, upload(other, "theirs"));

      const mineRows = await photosOf(mine);
      const otherRows = await photosOf(other);

      // Right length, no duplicates, this host's own photos — and still not a permutation of THIS
      // listing. Ownership passes; membership is what rejects it.
      const res = await reorderPhotos(mine, [mineRows[0].id, otherRows[0].id]);
      expect(res.ok).toBe(false);

      expect((await photosOf(mine)).map((r) => r.id)).toEqual(mineRows.map((r) => r.id));
      expect((await photosOf(other)).map((r) => r.position)).toEqual([0]);
    });

    it("refuses an EMPTY list against a listing that has photos", async () => {
      const { listingId, publicIds } = await threePhotos("photos.reorder.empty@example.com");
      const res = await reorderPhotos(listingId, []);
      expect(res.ok).toBe(false);
      expect((await photosOf(listingId)).map((r) => r.publicId)).toEqual(publicIds);
    });
  });

  it("removing a photo deletes its row, re-packs positions, and destroys the Cloudinary asset (orphan cleanup)", async () => {
    const hostId = await signInHost("photos.remove@example.com");
    const listingId = await makeListing(hostId);
    const [keep0, gone1, keep2] = ["keep-0", "gone-1", "keep-2"].map((n) =>
      upload(listingId, n),
    );
    await persistPhoto(listingId, keep0);
    await persistPhoto(listingId, gone1);
    await persistPhoto(listingId, keep2);

    const rows = await photosOf(listingId);
    const middle = rows[1]; // position 1 — the `gone-1` asset

    const res = await removePhoto(listingId, middle.id);
    expect(res.ok).toBe(true);

    const after = await photosOf(listingId);
    // The row is gone and the remaining photos are re-packed contiguously (0 = cover preserved).
    expect(after.map((r) => r.id)).not.toContain(middle.id);
    expect(after.map((r) => r.publicId)).toEqual([keep0.publicId, keep2.publicId]);
    expect(after.map((r) => r.position)).toEqual([0, 1]);

    // The removed asset's public_id was destroyed on Cloudinary (T-04-ORPHAN).
    expect(mockCloudinary.destroys()).toContain(gone1.publicId);
  });
});

// ── D-165 — the provenance guard, driven through the REAL action against the REAL database ───────
//
// `tests/listing/cloudinary-provenance.test.ts` enumerates the attacker set against the pure
// function. These three cases prove the different thing: that the function is WIRED, that a
// rejection writes NO ROW, and that the guard is alive when the cloud name is absent — which is the
// state every CI run is in. Each rejection asserts the listing's photo COUNT is unchanged, not
// merely that `ok` is false: a guard that returned `{ ok: false }` and still inserted would satisfy
// the weaker assertion completely.
describe("D-165 — persistPhoto refuses metadata our pipeline could not have produced", () => {
  it("rejects a FOREIGN url and writes no row", async () => {
    const hostId = await signInHost("photos.provenance.foreign@example.com");
    const listingId = await makeListing(hostId);

    // One legitimate photo first, so "no row was written" is a change the count can actually show
    // rather than an empty table that would look identical either way.
    const legit = upload(listingId, "one");
    expect((await persistPhoto(listingId, legit)).ok).toBe(true);
    const before = await photosOf(listingId);
    expect(before).toHaveLength(1);

    // The publicId is perfectly legitimate — only the host is not ours, and a naive substring test
    // for `res.cloudinary.com` would accept it.
    const res = await persistPhoto(listingId, {
      publicId: legit.publicId,
      url: `https://res.cloudinary.com.evil.tld/${TEST_CLOUD_NAME}/image/upload/v1/fitout/listings/${listingId}/one.jpg`,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      // Δ15 / rule F1 — the shipped literal, naming no vendor, no url and no folder.
      expect(res.error).toBe("That photo didn't upload. Please try again.");
    }

    const after = await photosOf(listingId);
    expect(after).toHaveLength(1);
    expect(after.map((r) => r.publicId)).toEqual([legit.publicId]);
  });

  it("rejects a TRAVERSAL publicId inside a legitimate prefix and writes no row", async () => {
    const hostId = await signInHost("photos.provenance.traversal@example.com");
    const listingId = await makeListing(hostId);

    const legit = upload(listingId, "one");
    expect((await persistPhoto(listingId, legit)).ok).toBe(true);
    expect(await photosOf(listingId)).toHaveLength(1);

    // `startsWith(prefix)` is TRUE for this string and it still names an asset outside the folder —
    // the reason the guard rejects `..` explicitly rather than trusting the prefix alone.
    const attack = `fitout/listings/${listingId}/../../avatars/victim`;
    expect(attack.startsWith(`fitout/listings/${listingId}/`)).toBe(true);

    const res = await persistPhoto(listingId, { publicId: attack, url: legit.url });
    expect(res.ok).toBe(false);

    const after = await photosOf(listingId);
    expect(after).toHaveLength(1);
    expect(after.map((r) => r.publicId)).toEqual([legit.publicId]);
  });

  it("FAILS CLOSED when CLOUDINARY_CLOUD_NAME is absent — the state every CI run is in (R1)", async () => {
    const hostId = await signInHost("photos.provenance.nocloud@example.com");
    const listingId = await makeListing(hostId);

    const legit = upload(listingId, "one");
    expect((await persistPhoto(listingId, legit)).ok).toBe(true);
    expect(await photosOf(listingId)).toHaveLength(1);

    // THE WHOLE CONTENT OF R1. If the guard skipped when the cloud name is unset, this call would
    // succeed, the assertion below would be the only thing that noticed, and every other provenance
    // test in the repo would be passing over a feature that does not run in CI.
    const second = upload(listingId, "two");
    try {
      delete process.env.CLOUDINARY_CLOUD_NAME;
      const res = await persistPhoto(listingId, second);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("That photo didn't upload. Please try again.");
      }
    } finally {
      process.env.CLOUDINARY_CLOUD_NAME = TEST_CLOUD_NAME;
    }

    const after = await photosOf(listingId);
    expect(after).toHaveLength(1);
    expect(after.map((r) => r.publicId)).toEqual([legit.publicId]);

    // And the identical call succeeds once the cloud name is back — so the rejection above was the
    // MISSING CONFIGURATION and not something else wrong with the fixture.
    expect((await persistPhoto(listingId, second)).ok).toBe(true);
    expect(await photosOf(listingId)).toHaveLength(2);
  });
});
