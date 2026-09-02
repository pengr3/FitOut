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
// D-255 (plan 18.1-12) — the ONE shared seed, imported rather than re-implemented here.
import { seedHostVerification } from "../helpers/verification";
import { stripComments } from "../helpers/source-text";
import type { DraftListingInput } from "@/lib/validation/listing";
import {
  listing,
  listingPhoto,
  listingReviewState,
  user,
  type ListingReviewState,
} from "@/lib/db/schema";

let testDb: TestDb;
let testAuth: TestAuth;
type ListingActions = typeof import("@/app/actions/listing");
let createDraftListing: ListingActions["createDraftListing"];
let saveListingStep: ListingActions["saveListingStep"];
let publishListing: ListingActions["publishListing"];
let unlistListing: ListingActions["unlistListing"];
let softDeleteListing: ListingActions["softDeleteListing"];
type PublicListingModule = typeof import("@/lib/listing/public-listing");
let isPubliclyViewable: PublicListingModule["isPubliclyViewable"];
let assertPublicListing: PublicListingModule["assertPublicListing"];
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

/**
 * `notFound()` mocked to throw a NAMED error — the shipped idiom
 * (`tests/booking/checkout-session-expire.test.ts:192`, `tests/ops/staff-guard.test.ts:101`). The real
 * one throws a Next-internal digest only the framework can interpret.
 *
 * ⚠ `@/app/actions/listing` does not import `next/navigation`, so this mock reaches only
 * `assertPublicListing` and changes nothing about the publish-gate cases above it. Checked rather than
 * assumed, because a doMock installed for one module silently reshapes every module imported after it.
 */
const NOT_FOUND = "NEXT_NOT_FOUND";
let notFoundCalls = 0;

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("next/navigation", () => ({
    notFound: () => {
      notFoundCalls++;
      throw new Error(NOT_FOUND);
    },
  }));
  vi.resetModules();
  ({
    createDraftListing,
    saveListingStep,
    publishListing,
    unlistListing,
    softDeleteListing,
  } = await import("@/app/actions/listing"));
  // Imported AFTER the doMocks + resetModules so it closes over the isolated test schema's `db` and
  // the throwing `notFound` above — a static top-of-file import would bind the real singleton.
  ({ isPubliclyViewable, assertPublicListing } = await import("@/lib/listing/public-listing"));
  const cloudinary = await import("cloudinary");
  destroySpy = cloudinary.v2.uploader.destroy as unknown as Mock;
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  vi.doUnmock("next/navigation");
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

/**
 * ⚠ `opts.verified` IS THE EMAIL SOFT-GATE (D-07), AND THE `approved` ROW SEEDED BELOW IS A DIFFERENT
 * GATE ENTIRELY — the two are one line apart and must not be read as one thing.
 *
 * `emailVerified` is the PUBLISH requirement this file's own cases drive both ways. The
 * `host_verification` row is D-255's CREATION gate (plan 18.1-12): `createDraftListing` refuses a
 * host with no row, which is what Better Auth's sign-up leaves, so `newDraftId()` would fail at its
 * setup line in every case here — including the ones that deliberately withhold `emailVerified` and
 * would then be measuring the wrong refusal.
 */
async function signInHost(email: string, opts?: { verified?: boolean }): Promise<string> {
  const res = (await signUp(testAuth, {
    email,
    password: "averylongpassword",
    name: "Host",
    firstName: "Host",
    intent: "host",
  })) as { user: { id: string } };
  await seedHostVerification(testDb.db, res.user.id, "approved");
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

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// LVER-02 / D-208 — THE REVIEW STATE IS A TERM OF PUBLIC VIEWABILITY, NOT A SEPARATE CHECK
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A submitted-but-unapproved listing is HIDDEN: absent from search, and its public page 404s. There
// are THREE surfaces through which it could otherwise escape (D-247), and this file owns the
// BEHAVIOURAL half of two of them:
//
//   1. search Stage-1 ......... closed by construction when the sell-gate landed in 18-03. Asserted
//                               there, by `tests/search/bookable-gate.test.ts`'s `gate_lr_pending`
//                               fixture — NOT re-implemented here (D-228).
//   2. `/listings/[id]` ....... `isPubliclyViewable` + `assertPublicListing`, below.
//   3. the OG image route ..... `listingCardFacts`. It held its OWN copy of the rule and so leaked
//                               past both other fixes, invisibly, in a surface no browser renders.
//                               Pinned STRUCTURALLY in `tests/design/og-routes.test.ts`, because the
//                               property that matters there is "resolves through the one expression",
//                               which is a fact about the source rather than about a return value.
//
// ⚠ WHAT NEITHER HALF PINS IS THE HTTP STATUS LINE. `tests/design/soft-404-status.test.ts:31-39` says
// it plainly in its own words — the e2e spec is the ONLY instrument in this repo that can see one, and
// nothing here boots a server. `notFound()` being REACHED is what these cases observe; that reaching
// it produces a real `404` under a production build is 17.1-01's measured finding, re-audited by
// `curl` in plan 18-14. Stated so it is not silently claimed.

describe("LVER-02 — the review-state term of isPubliclyViewable (D-208)", () => {
  /** The two states a booker may read. POSITIVE literals — see the function's own docblock. */
  const VIEWABLE: readonly ListingReviewState[] = ["approved", "grandfathered"];
  /** Everything else the enum can hold. `withdrawn` is why the rule is not spelled `!== "pending"`. */
  const HIDDEN: readonly ListingReviewState[] = ["pending", "rejected", "withdrawn"];

  it("the dimension table covers every value of the listing_review_state enum", () => {
    // Derived from the pgEnum, so a SEVENTH review state added tomorrow reddens this line rather than
    // slipping through untested on whichever side of the gate it happens to land (the 18-03 idiom).
    expect([...VIEWABLE, ...HIDDEN].sort()).toEqual([...listingReviewState.enumValues].sort());
  });

  it.each(HIDDEN)(
    "a published, non-deleted listing in review state '%s' is NOT publicly viewable",
    (state) => {
      expect(isPubliclyViewable("published", null, state)).toBe(false);
    },
  );

  it.each(VIEWABLE)(
    "a published, non-deleted listing in review state '%s' IS publicly viewable",
    (state) => {
      // `grandfathered` passes deliberately (D-207/D-210/D-211): the gate binds only listings created
      // or materially edited after phase 18, so the pre-existing catalogue keeps being readable.
      expect(isPubliclyViewable("published", null, state)).toBe(true);
    },
  );

  it("FAILS CLOSED on a missing review state — null and undefined are both hidden", () => {
    // The column is `notNull` with a default today, so neither value can come from the database. They
    // can very much come from a caller that forgot to select the column, which is the realistic way
    // this gate would be defeated — and a `!== "pending"` spelling would let both through.
    expect(isPubliclyViewable("published", null, null)).toBe(false);
    expect(isPubliclyViewable("published", null, undefined)).toBe(false);
  });

  it("the three pre-phase-18 terms still hold, with the review term satisfied", () => {
    // A control: without these, a rule that returned `reviewState === "approved"` and nothing else
    // would pass every case above while serving drafts and deleted listings to the public.
    expect(isPubliclyViewable("draft", null, "approved")).toBe(false);
    expect(isPubliclyViewable("unlisted", null, "approved")).toBe(false);
    expect(isPubliclyViewable("published", new Date(), "approved")).toBe(false);
    expect(isPubliclyViewable("published", null, "approved")).toBe(true);
  });
});

describe("LVER-02 — assertPublicListing 404s an unreviewed listing (D-208 / D-229)", () => {
  /** The listing every case below re-states; its `review_state` is what moves. */
  let liveId: string;
  /** A never-published listing — the shape a pending listing must be indistinguishable from. */
  let draftId: string;
  const MISSING_ID = "listing_that_never_existed";

  beforeAll(async () => {
    await signInHost("gate.review.public@example.com", { verified: true });
    liveId = await newDraftId();
    await saveListingStep(liveId, VALID_FIELDS);
    await addPhotos(liveId, 3);
    expect((await publishListing(liveId)).ok).toBe(true);
    draftId = await newDraftId();
  });

  async function setReviewState(id: string, state: ListingReviewState): Promise<void> {
    await testDb.db.update(listing).set({ reviewState: state }).where(eq(listing.id, id));
  }

  /**
   * Everything a caller can observe from one `assertPublicListing` call, as one value.
   *
   * Returned as a RECORD rather than asserted per-case because the indistinguishability case at the
   * bottom compares three of these: a per-case `toThrow()` is satisfied by two DIFFERENT refusals just
   * as happily as by two identical ones, and "a pending listing reads exactly as a draft does" is the
   * whole of D-229.
   */
  async function observe(id: string): Promise<{ outcome: string; notFoundCalls: number }> {
    notFoundCalls = 0;
    let outcome = "returned";
    try {
      await assertPublicListing(id);
    } catch (err) {
      outcome = (err as Error).message;
    }
    return { outcome, notFoundCalls };
  }

  it("a listing AWAITING REVIEW reaches notFound() — the exact soft-404 a draft gets", async () => {
    await setReviewState(liveId, "pending");
    expect(await observe(liveId)).toEqual({ outcome: NOT_FOUND, notFoundCalls: 1 });
  });

  it.each(["rejected", "withdrawn"] as const)(
    "a '%s' listing reaches notFound() too",
    async (state) => {
      await setReviewState(liveId, state);
      expect(await observe(liveId)).toEqual({ outcome: NOT_FOUND, notFoundCalls: 1 });
    },
  );

  it.each(["approved", "grandfathered"] as const)(
    "an '%s' listing is served — notFound() is never reached",
    async (state) => {
      // THE POSITIVE CONTROL, and it is not optional. Without it every case in this describe is
      // satisfied by an assert that 404s unconditionally — including on the listings that pay for the
      // product.
      await setReviewState(liveId, state);
      expect(await observe(liveId)).toEqual({ outcome: "returned", notFoundCalls: 0 });
    },
  );

  it("a pending listing, a draft and a nonexistent id are INDISTINGUISHABLE (D-229)", async () => {
    await setReviewState(liveId, "pending");
    const pending = await observe(liveId);
    const draft = await observe(draftId);
    const missing = await observe(MISSING_ID);

    // No new error surface, and no route-existence oracle: a prober cannot tell "this space exists and
    // FitOut has not approved it yet" from "there is nothing here", which is the whole reason D-229
    // reuses the shipped shape instead of inventing a "pending review" response.
    expect(pending).toEqual(draft);
    expect(pending).toEqual(missing);
    expect(pending.outcome).toBe(NOT_FOUND);
  });
});
