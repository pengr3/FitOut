// LIST-05 / D-02 — the strict draft→publish status gate + unlist + soft-delete, driven through the
// REAL exported actions (publishListing / unlistListing / softDeleteListing) against the isolated
// test schema. The publish gate is SERVER-enforced (never a client-settable `status`): publishing
// asserts publishSchema AND ≥3 photos AND host.emailVerified. Same harness as crud.test.ts.

import { describe, it, expect, beforeAll, afterAll, vi, type Mock } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockCloudinary } from "../helpers/mocks";
import { stripComments } from "../helpers/source-text";
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
/**
 * D-188. The SAME mocked `uploader.destroy` the action's `@/lib/cloudinary` resolved after
 * `resetModules()` — a per-case override has to land on the function that actually runs
 * (`tests/profile/avatar-remove.test.ts:88-93`).
 */
let destroySpy: Mock;

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
  const cloudinary = await import("cloudinary");
  destroySpy = cloudinary.v2.uploader.destroy as unknown as Mock;
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

  // ── D-188 — a soft-deleted listing stops being billed ────────────────────────────────────────
  //
  // Before this, `softDeleteListing` set `deletedAt` and destroyed nothing: the row went dark, every
  // read excluded it, and the bytes stayed on Cloudinary forever with nothing left in the product
  // that could ever name them. There is no restore path anywhere — nothing sets `deletedAt` back to
  // null — so destroying them costs nothing a host can reach.
  //
  // ⚠ THE ORDERING IS THE PROPERTY, AND IT IS INVISIBLE IN THE END STATE OF THE `listing` ROW.
  // `assertOwnership` filters `isNull(listing.deletedAt)`, so a photo read routed through it AFTER
  // the write finds nothing: the destroy loop would iterate an empty array, do nothing, return
  // `{ ok: true }`, and leave `deletedAt` set — i.e. it would pass every assertion in this file
  // EXCEPT the destroys one. That assertion is the whole test.
  it("soft-delete DESTROYS every photo's asset and RETAINS the rows (D-188, GATE-06)", async () => {
    await signInHost("gate.delete.photos@example.com", { verified: true });
    const id = await newDraftId();
    await addPhotos(id, 2);

    const res = await softDeleteListing(id);
    expect(res.ok).toBe(true);
    expect((await readListing(id)).deletedAt).not.toBeNull();

    // The ROWS survive, deliberately: D-188 makes no schema change and adds no cascade (GATE-06).
    // Their urls become 404s, which is harmless because a soft-deleted listing is excluded from
    // every read — stated as an assertion so nobody "tidies" it into a delete later.
    const rows = await testDb.db
      .select()
      .from(listingPhoto)
      .where(eq(listingPhoto.listingId, id));
    expect(rows).toHaveLength(2);

    // …and the BYTES are gone. Both of them, and nothing else.
    expect([...mockCloudinary.destroys()].sort()).toEqual([`pub_${id}_0`, `pub_${id}_1`].sort());
  });

  it("a THROWN destroy still returns ok and still sets deletedAt (best-effort, D-188)", async () => {
    await signInHost("gate.delete.destroyfails@example.com", { verified: true });
    const id = await newDraftId();
    await addPhotos(id, 2);

    // A Cloudinary outage must not tell a host their delete failed when the row is already gone.
    // `uploader.destroy` REJECTS on network/auth failure (the other shape, a non-ok RESOLVE, is
    // covered in `photos.test.ts`); both are absorbed and neither changes the result.
    destroySpy.mockRejectedValueOnce(new Error("cloudinary is unreachable"));
    const callsBefore = destroySpy.mock.calls.length;

    const res = await softDeleteListing(id);

    expect(res.ok).toBe(true);
    expect((await readListing(id)).deletedAt).not.toBeNull();
    // ATTEMPTED for BOTH photos and absorbed — the loop did not abandon the second asset because
    // the first one threw. A loop that silently stopped calling would produce this same green
    // without this line.
    expect(destroySpy.mock.calls.length).toBe(callsBefore + 2);
  });
});

// ── D-188, layer two — the READ ORDERING, in source, because behaviour cannot see it ─────────────
//
// ⚠ THIS DESCRIBE EXISTS BECAUSE THE BEHAVIOURAL PAIR ABOVE WAS MEASURED BLIND TO THE MUTATION IT
// IS SUPPOSED TO CATCH, AND THAT MEASUREMENT IS THE WHOLE ARGUMENT FOR IT. Moving the
// `listingPhoto` select BELOW the `deletedAt` write and changing nothing else leaves both cases
// GREEN — verified by doing it — because the shipped select is scoped to `listingId` alone and is
// therefore indifferent to `deletedAt`. What the behavioural pair actually catches is the sharper
// form of the same mistake: a read ROUTED THROUGH `assertOwnership` after the write, which finds
// nothing because that helper filters `isNull(listing.deletedAt)`. That one reds both cases while
// `softDeleteListing` still returns `{ ok: true }` and still sets `deletedAt` — a green suite and a
// permanent bill, which is exactly the failure D-188's ordering rule is written against.
//
// So the ordering itself is pinned HERE, structurally, where a positional move cannot hide. The day
// this goes red the reviewer should read `softDeleteListing`'s docblock rather than rediscover why
// the select is above the update.
//
// It reads COMMENT-STRIPPED code (`tests/helpers/source-text.ts`, 16.1-PATTERNS § S-2): the
// function's docblock argues about `deletedAt`, the read and the write at length, so a whole-file
// `indexOf` would be measuring the prose. And it narrows to `softDeleteListing`'s own body, because
// `publishListing` reads `listingPhoto` too and an unnarrowed index would be satisfied by accident.
//
// ── OBSERVED RED, 2026-08-26 — both mutations, both reverted ─────────────────────────────────────
// (1) The read moved below the write, nothing else changed → this describe's ordering assertion:
//     AssertionError: THE PHOTO READ HAS MOVED BELOW THE deletedAt WRITE … expected 632 to be less
//     than 421. The two behavioural cases above stayed GREEN, which is why this describe exists.
// (2) The read moved below the write AND routed through `assertOwnership` → both behavioural cases:
//     AssertionError: expected [] to deeply equal [ "pub_<id>_0", "pub_<id>_1" ]
//     AssertionError: expected +0 to be 2
//     …while `softDeleteListing` still returned `{ ok: true }` and still set `deletedAt`.
// Full transcripts in `16.1-05-SUMMARY.md`.
describe("D-188 — the read/write ordering inside softDeleteListing (source)", () => {
  const ACTION_PATH = "src/app/actions/listing.ts";
  const CODE = stripComments(readFileSync(resolve(process.cwd(), ACTION_PATH), "utf8"));
  const START = CODE.indexOf("export async function softDeleteListing");
  /** `softDeleteListing`'s body: from its own `export` to the next top-level `export`, or EOF. */
  const BODY = (() => {
    if (START < 0) return "";
    const next = CODE.indexOf("\nexport ", START + 1);
    return next === -1 ? CODE.slice(START) : CODE.slice(START, next);
  })();

  it("the module really was read, and the narrowing really found softDeleteListing", () => {
    // A typo in ACTION_PATH throws; a stale read or a renamed export would instead make every
    // assertion below vacuous, since `"".indexOf(x)` is −1 for both tokens.
    expect(START).toBeGreaterThanOrEqual(0);
    expect(BODY).toContain("destroyListingPhoto(");
    expect(BODY).not.toContain("export async function publishListing");
  });

  it("the listingPhoto read happens BEFORE the deletedAt write", () => {
    const read = BODY.indexOf("from(listingPhoto)");
    const write = BODY.indexOf("update(listing)");

    expect(read, "softDeleteListing no longer reads its photo rows (D-188)").toBeGreaterThanOrEqual(
      0,
    );
    expect(write, "softDeleteListing no longer writes deletedAt").toBeGreaterThanOrEqual(0);
    expect(
      read,
      "THE PHOTO READ HAS MOVED BELOW THE deletedAt WRITE. It is above it on purpose: " +
        "assertOwnership filters isNull(listing.deletedAt), so any re-derivation of this listing " +
        "after the write finds nothing, the destroy loop iterates an empty array, and the action " +
        "still returns { ok: true } — a green suite and a permanently billed set of assets. Read " +
        "softDeleteListing's docblock before changing this test.",
    ).toBeLessThan(write);
  });

  it("the destroy happens AFTER the write, so a failed write never orphans a LIVE listing", () => {
    // The other half of the ordering, and it is the reason the read and the destroy are not simply
    // adjacent: `avatar.ts`'s removeAvatarAction makes the identical trade. If the assets went
    // first and the write then failed, a live listing would point at bytes that no longer exist —
    // broken images on a public surface, unfixable by retrying.
    const write = BODY.indexOf("update(listing)");
    const destroy = BODY.indexOf("destroyListingPhoto(");
    expect(destroy).toBeGreaterThan(write);
  });
});
