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

import { describe, it, expect, beforeAll, afterAll, vi, type Mock } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { asc, eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockCloudinary } from "../helpers/mocks";
import { stripComments } from "../helpers/source-text";
import { listing, listingPhoto } from "@/lib/db/schema";
import { LISTING_MAX_PHOTOS } from "@/lib/listing/upload-policy";

let testDb: TestDb;
let testAuth: TestAuth;
type PhotoActions = typeof import("@/app/actions/listing-photo");
let persistPhoto: PhotoActions["persistPhoto"];
let reorderPhotos: PhotoActions["reorderPhotos"];
let removePhoto: PhotoActions["removePhoto"];
/**
 * The SAME mocked `uploader.destroy` the action's `@/lib/cloudinary` resolved after `resetModules()`
 * — per-case overrides have to land on the function that actually runs. Precedent and rationale:
 * `tests/profile/avatar-remove.test.ts:88-93`.
 */
let destroySpy: Mock;

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
  const cloudinary = await import("cloudinary");
  destroySpy = cloudinary.v2.uploader.destroy as unknown as Mock;
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

    // D-187 — A REJECTION PROVES THE ID IS NOT OURS TO DELETE, so nothing may be destroyed here.
    // The EMPTY ARRAY, not `not.toContain(publicId)`: an empty-array assertion also catches a
    // destroy of the WRONG id, which is the shape the IDOR would actually take.
    expect(mockCloudinary.destroys()).toEqual([]);
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

    // D-187 — a rejection proves the id is not ours to delete, and THIS is the case that makes the
    // point loudest: the string names `fitout/avatars/victim`. A destroy on this path would have
    // deleted someone's face on the strength of a `startsWith` that the guard already refused.
    expect(mockCloudinary.destroys()).toEqual([]);
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

    // D-187 — the fail-closed branch sits ABOVE the provenance gate, so it too has proven nothing
    // about the publicId and may destroy nothing. This is the branch that runs continuously in CI
    // (no Cloudinary credential), which makes it the likeliest place for a hoisted cleanup to be
    // "simplified" into.
    expect(mockCloudinary.destroys()).toEqual([]);

    const after = await photosOf(listingId);
    expect(after).toHaveLength(1);
    expect(after.map((r) => r.publicId)).toEqual([legit.publicId]);

    // And the identical call succeeds once the cloud name is back — so the rejection above was the
    // MISSING CONFIGURATION and not something else wrong with the fixture.
    expect((await persistPhoto(listingId, second)).ok).toBe(true);
    expect(await photosOf(listingId)).toHaveLength(2);
  });
});

// ── D-187 — the destroy that closes the orphan source, and the constraint that keeps it safe ──────
//
// THE ORPHAN THIS CLOSES. Photo bytes go browser→Cloudinary direct; only metadata reaches
// `persistPhoto`. So every refusal this action makes leaves an asset ALREADY paid for. The most
// reachable spelling is one click: 18 photos stored, 20 selected, 2 persisted, 18 refused at the
// cap — 18 unreachable, permanently-billed assets that no row names and no page renders.
//
// ⚠⚠ AND THE CONSTRAINT, WHICH IS THE ACTUAL SUBJECT OF THIS BLOCK. The destroy may run ONLY on a
// refusal that happens AFTER `isOwnCloudinaryAsset` has PASSED. Every refusal above it — no session,
// not your listing, empty fields, no cloud name, and above all the provenance REJECTION itself —
// has proven NOTHING about the publicId, and a destroy there would hand any signed-in caller an
// arbitrary-delete primitive against our own Cloudinary account: another host's cover photo, or
// `fitout/avatars/<victim-userId>`, deleted by naming it and taking the refusal. The cleanup would
// introduce a destructive IDOR inside the phase that exists to prevent one.
//
// EVERY REJECTION CASE ASSERTS THE EMPTY ARRAY, NOT `not.toContain(id)`. An empty-array assertion
// also catches a destroy of the WRONG id, which is the shape the IDOR would actually take — the
// same discipline the D-165 cases above apply to the photo COUNT rather than to `ok` alone.
describe("D-187 — persistPhoto destroys the asset it refuses, and NOTHING it has not vouched for", () => {
  const CAP_MESSAGE = `You can add up to ${LISTING_MAX_PHOTOS} photos. Remove one to add another.`;

  /**
   * A listing already sitting exactly at the cap.
   *
   * ⚠ SEEDED WITH ONE DIRECT `db.insert`, NOT WITH `LISTING_MAX_PHOTOS` SEQUENTIAL `persistPhoto`
   * CALLS. 21 action calls against a live schema would be the largest single case in this file, and
   * `vitest.config.ts:64` sets `testTimeout: 20_000`. The rows are built from the same `upload()`
   * fixture builder every other case uses, so they are the shapes the real pipeline produces; only
   * the WAY they arrive is short-circuited, and the ONE call under test is the overflow.
   */
  async function listingAtTheCap(email: string): Promise<string> {
    const hostId = await signInHost(email);
    const listingId = await makeListing(hostId);
    await testDb.db.insert(listingPhoto).values(
      Array.from({ length: LISTING_MAX_PHOTOS }, (_, i) => {
        const seeded = upload(listingId, `seed-${i}`);
        return {
          id: randomUUID(),
          listingId,
          publicId: seeded.publicId,
          url: seeded.url,
          position: i,
        };
      }),
    );
    expect(await photosOf(listingId)).toHaveLength(LISTING_MAX_PHOTOS);
    return listingId;
  }

  it("the CAP refusal destroys EXACTLY the refused publicId, and still writes no row", async () => {
    const listingId = await listingAtTheCap("photos.cap.destroy@example.com");
    const overflow = upload(listingId, "overflow");

    const res = await persistPhoto(listingId, overflow);

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe(CAP_MESSAGE);
    // The count is unchanged — a branch that refused and still inserted would satisfy `ok === false`
    // completely (the same reasoning the D-165 cases above state at :315-317).
    expect(await photosOf(listingId)).toHaveLength(LISTING_MAX_PHOTOS);
    // …and the asset we refused is the one and only thing destroyed.
    expect(mockCloudinary.destroys()).toEqual([overflow.publicId]);
  });

  it("an OWNERSHIP refusal destroys NOTHING — the path where the destroy would BE the IDOR", async () => {
    const ownerId = await signInHost("photos.destroy.owner@example.com");
    const listingId = await makeListing(ownerId);
    const cover = upload(listingId, "cover");
    expect((await persistPhoto(listingId, cover)).ok).toBe(true);

    // A DIFFERENT host names the owner's own, perfectly legitimate publicId. The refusal alone is
    // not the property under test — the refusal is exactly what an attacker is willing to accept in
    // exchange for the delete. Under a destroy hoisted above `assertOwnership` this single call
    // deletes another host's cover photo.
    await signInHost("photos.destroy.attacker@example.com");
    const res = await persistPhoto(listingId, cover);

    expect(res.ok).toBe(false);
    expect(mockCloudinary.destroys()).toEqual([]);
    // The victim's row is untouched, so the asset it points at had better still exist.
    expect((await photosOf(listingId)).map((r) => r.publicId)).toEqual([cover.publicId]);
  });

  it("the PROVENANCE rejection destroys NOTHING — an id under ANOTHER host's listing folder", async () => {
    const victimId = await signInHost("photos.destroy.victim@example.com");
    const victimListing = await makeListing(victimId);
    const victimPhoto = upload(victimListing, "cover");
    expect((await persistPhoto(victimListing, victimPhoto)).ok).toBe(true);

    // The attacker owns THEIR OWN listing, so session and ownership both PASS — the guard that
    // refuses is `isOwnCloudinaryAsset`, on the ground that the id is scoped to a folder that is
    // not this listing's. That rejection is the proof that the id is NOT ours to delete, and it is
    // the exact branch a "tidy" refactor would hoist a shared cleanup above.
    const attackerId = await signInHost("photos.destroy.attacker2@example.com");
    const attackerListing = await makeListing(attackerId);
    const res = await persistPhoto(attackerListing, victimPhoto);

    expect(res.ok).toBe(false);
    expect(mockCloudinary.destroys()).toEqual([]);
    expect((await photosOf(victimListing)).map((r) => r.publicId)).toEqual([victimPhoto.publicId]);
  });

  it("a NON-OK destroy result does not change what the host sees (both failure shapes, S-1)", async () => {
    const listingId = await listingAtTheCap("photos.cap.notfound@example.com");
    const overflow = upload(listingId, "overflow");

    // ⚠ THE SHARED DOUBLE ALWAYS RESOLVES `{ result: "ok" }` (`tests/helpers/mocks.ts:103-108`), so
    // the non-ok branch is not reachable through it as it stands — only through a per-test
    // override. And the override REPLACES the implementation for that call, so the publicId is NOT
    // pushed onto `destroys()` for it. The assertions below are therefore deliberately about the
    // RESULT the host sees and about the call having been ATTEMPTED, never about the capture.
    destroySpy.mockResolvedValueOnce({ result: "not found" });
    const callsBefore = destroySpy.mock.calls.length;

    // Nothing threw: `persistPhoto` RESOLVING at all is that assertion. `uploader.destroy` answers
    // HTTP 200 `{ result: "not found" }` for an id that is not there, which a bare `catch` would
    // have let slip through silently rather than logged.
    const res = await persistPhoto(listingId, overflow);

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe(CAP_MESSAGE);
    expect(await photosOf(listingId)).toHaveLength(LISTING_MAX_PHOTOS);
    // ATTEMPTED and absorbed — a best-effort call that silently stopped being made would produce
    // this same green without this line (`avatar-remove.test.ts:218-221`).
    expect(destroySpy.mock.calls.length).toBe(callsBefore + 1);
    // …and the documented consequence of the override, asserted rather than assumed.
    expect(mockCloudinary.destroys()).toEqual([]);
  });
});

// ── D-187, layer two — the ordering, in SOURCE, because behaviour cannot see it ───────────────────
//
// WHY THIS IS NOT REDUNDANT WITH THE FIVE CASES ABOVE. A behavioural test is satisfied by a destroy
// that merely happens to be SKIPPED on the paths it exercises. The ordering assertion is what stops
// the call MIGRATING UPWARD in a later refactor — someone folding the guards into one block, or
// hoisting the cleanup into a shared helper at the top of the function. The day this goes red, the
// reviewer should be pointed at the IDOR reasoning in `listing-photo.ts`'s ⚠⚠ block rather than left
// to rediscover why the two calls are in the order they are in.
//
// ⚠ IT READS COMMENT-STRIPPED CODE, AND IT MUST. `listing-photo.ts` discusses provenance, orphan
// cleanup and the destructive-IDOR hazard in prose ABOVE the code, and this phase added more of it —
// so a naive whole-file `indexOf` would be measuring the header, not the function.
// `scripts/verify-workflows.mjs:24-32` measured that failure; `tests/helpers/source-text.ts` is this
// phase's single agreed answer to it (16.1-PATTERNS § S-2).
//
// ⚠ AND IT NARROWS TO `persistPhoto`'S OWN BODY, WHICH IS WHAT MAKES IT MEAN WHAT IT SAYS. An
// unnarrowed `indexOf` would be satisfied by accident: `removePhoto` calls `destroyListingPhoto`
// too, later in the file, so the assertion would stay green with the destroy hoisted to the very
// top of `persistPhoto`.
//
// ── OBSERVED RED, 2026-08-26 — the unsafe placement, watched failing ─────────────────────────────
// The destroy was temporarily moved out of the cap branch to immediately BEFORE the
// `isOwnCloudinaryAsset` call, and reverted. SIX independent reds for one relocation — the five
// empty-array behavioural assertions above AND the ordering assertion below:
//
//     × rejects a FOREIGN url and writes no row
//     × rejects a TRAVERSAL publicId inside a legitimate prefix and writes no row
//     × FAILS CLOSED when CLOUDINARY_CLOUD_NAME is absent — the state every CI run is in (R1)
//     × an OWNERSHIP refusal destroys NOTHING — the path where the destroy would BE the IDOR
//     × the PROVENANCE rejection destroys NOTHING — an id under ANOTHER host's listing folder
//     × the destroy sits BELOW the provenance gate, in code, inside persistPhoto's own body
//
//     AssertionError: expected [ …(2) ] to deeply equal []
//     + [ "fitout/listings/<id>/one", "fitout/listings/<id>/../../avatars/victim" ]
//
// That second received value is the finding, not the failure: the mutated action DESTROYED the
// traversal id naming `avatars/victim` — the arbitrary-delete primitive, demonstrated in CI, with no
// credential. Full transcript in `16.1-05-SUMMARY.md`.
describe("D-187 — the source ordering inside persistPhoto", () => {
  const ACTION_PATH = "src/app/actions/listing-photo.ts";
  const SOURCE = readFileSync(resolve(process.cwd(), ACTION_PATH), "utf8");
  const CODE = stripComments(SOURCE);
  const START = CODE.indexOf("export async function persistPhoto");
  /** `persistPhoto`'s body: from its own `export` to the next top-level `export`. */
  const BODY = (() => {
    if (START < 0) return "";
    const next = CODE.indexOf("\nexport ", START + 1);
    return next === -1 ? CODE.slice(START) : CODE.slice(START, next);
  })();

  it("the module under test really was read, and the narrowing really found persistPhoto", () => {
    // Guards the path: a typo in ACTION_PATH would make readFileSync throw, but a stale read or a
    // renamed export would make every assertion below vacuous — `"".indexOf(x)` is −1 for both
    // tokens and `-1 > -1` is simply false, which reads like a real failure rather than a missing
    // file. Same "the file was really read" rule as `tests/design/avatar-zoom.test.ts:301-306`.
    expect(START).toBeGreaterThanOrEqual(0);
    expect(BODY).toContain("LISTING_MAX_PHOTOS");
    expect(BODY).not.toContain("export async function removePhoto");
  });

  it("the stripper itself works in BOTH directions (detector self-test)", () => {
    // Without this, an over-eager stripper that returned "" would make the ordering assertion pass
    // vacuously — a green suite over a constraint that is not being checked, which is the defect
    // shape `tests/use-server-exports.test.ts` exists to prevent.
    const onlyInAComment = `// never destroy on the rejection path\nconst a = 1;\n`;
    const inActualCode = `await destroyListingPhoto(publicId);\n`;
    expect(stripComments(onlyInAComment)).not.toContain("destroy");
    expect(stripComments(inActualCode)).toContain("destroyListingPhoto(");
  });

  it("the destroy sits BELOW the provenance gate, in code, inside persistPhoto's own body", () => {
    const provenance = BODY.indexOf("isOwnCloudinaryAsset(");
    const destroy = BODY.indexOf("destroyListingPhoto(");

    expect(
      provenance,
      "persistPhoto no longer calls isOwnCloudinaryAsset",
    ).toBeGreaterThanOrEqual(0);
    expect(
      destroy,
      "persistPhoto no longer destroys the asset it refuses (D-187)",
    ).toBeGreaterThanOrEqual(0);
    expect(
      destroy,
      "THE DESTROY HAS MIGRATED ABOVE THE PROVENANCE GATE. Read the double-warning block in " +
        "src/app/actions/listing-photo.ts before changing this test: a destroy on a path where " +
        "isOwnCloudinaryAsset has not passed is an arbitrary-delete primitive against our own " +
        "Cloudinary account (another host's cover photo, fitout/avatars/<victim-userId>).",
    ).toBeGreaterThan(provenance);
  });
});
