// LVER-03 — a MATERIAL EDIT returns a listing to review (D-213 / D-231 / D-232 / D-242 / D-249).
//
// WHAT THIS FILE IS MEASURING. Approval is not a permanent grant. A host who is approved and then
// changes what the space IS — where it is, what kind of space it is, how many people it holds, what it
// costs, WHAT IT LOOKS LIKE, or (since D-231's 2026-09-01 promotion) WHAT IT SAYS IT IS — goes back in
// the queue, and stops being sellable through the same gate.
// The same edit is the burn-down path out of `grandfathered` (D-213) and the resubmission path out of a
// rejection (D-249).
//
// ── THE TWO TRIGGER ANCHORS, AND WHY THEY ARE IN THE TEST NAMES ──────────────────────────────────────
// Material-edit detection lives in TWO places by necessity, because `draftSchema` has no photos field
// and `saveListingStep` therefore structurally cannot see a photo change (D-242 / 18-RESEARCH § F7).
// Every case below names its site — `[listing_fields]` for `saveListingStep`, `[listing_photos]` for
// `persistPhoto` / `removePhoto` — so a red line names WHICH detection site broke rather than only that
// re-review stopped happening. The two sites are structurally different code and a regression in one
// looks exactly like a regression in the other from the listing row alone.
//
// ── THE NEGATIVES ARE WHAT MAKE THE POSITIVES DIAGNOSTIC ─────────────────────────────────────────────
// A `markForReReview` that flipped unconditionally would pass every positive case in this file. Three
// cases exist to stop that: an autosave that re-sends the SAME persisted values (the wizard's normal
// behaviour on every step — treating those as edits would freeze the whole catalogue into the review
// queue, and D-231's promotion of title/description makes that risk WIDER, which is why the autosave
// case now re-sends the words too), a `reorderPhotos` (reordering changes the cover, not the space —
// position is not content), and a provenance-REJECTED `persistPhoto` (a refusal changed no photo).
//
// ⚠ There WERE four. The fourth was a title/description-only edit asserting it did NOT flip; D-231
// promoted both fields on 2026-09-01, so that case was INVERTED IN PLACE rather than deleted — it now
// lives in its own describe directly above the negatives, carrying the record of what it used to say.
//
// Harness: `tests/listing/crud.test.ts` + `tests/listing/photos.test.ts`, merged — setupTestDb +
// makeTestAuth + a mutable sessionHeaders holder feeding a mocked next/headers, with `@/lib/db` mocked
// to the isolated test schema so BOTH action modules and the ops queue read one database.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { asc, eq, sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { listing, listingPhoto, listingReview } from "@/lib/db/schema";
import type { ListingReviewState } from "@/lib/db/schema";
import { MATERIAL_FIELDS } from "@/lib/listing/re-review";
import { loadReviewQueue } from "@/lib/ops/review-queue";

let testDb: TestDb;
let testAuth: TestAuth;
type ListingActions = typeof import("@/app/actions/listing");
type PhotoActions = typeof import("@/app/actions/listing-photo");
let saveListingStep: ListingActions["saveListingStep"];
let persistPhoto: PhotoActions["persistPhoto"];
let reorderPhotos: PhotoActions["reorderPhotos"];
let removePhoto: PhotoActions["removePhoto"];

const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

/**
 * D-165. Fixed and set by this suite rather than inherited, for the reason `photos.test.ts` records:
 * `.env.local` exists on a developer box and does NOT exist in CI, so a suite depending on it would
 * pass locally and fail in CI.
 */
const TEST_CLOUD_NAME = "fitout-test-cloud";
let priorCloudName: string | undefined;

beforeAll(async () => {
  priorCloudName = process.env.CLOUDINARY_CLOUD_NAME;
  process.env.CLOUDINARY_CLOUD_NAME = TEST_CLOUD_NAME;
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.resetModules();
  ({ saveListingStep } = await import("@/app/actions/listing"));
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

/** The persisted material values every fixture starts from — a real, complete, sellable-looking row. */
const BASELINE = {
  title: "Sunrise Pickleball Court",
  description: "Two lit courts under cover.",
  primarySpaceType: "pickleball_court" as const,
  addressLine1: "12 Katipunan Ave",
  addressLine2: null,
  city: "Quezon City",
  region: "Metro Manila",
  postalCode: "1108",
  country: "PH",
  neighborhood: "Loyola Heights",
  maxOccupancy: 20,
  hourlyRateCents: 80_000,
  dayRateCents: 500_000,
  perHeadPriceCents: null,
  included: 1,
  extraHeadFee: 0,
  location: { x: 121.0736, y: 14.6396 },
};

/**
 * A PUBLISHED listing in a given review state. `published` (not `draft`) on purpose: the OPS-04 queue
 * excludes drafts (18-05 deviation 1), and a draft is not the row this requirement is about anyway.
 */
async function makeListing(
  hostId: string,
  reviewState: ListingReviewState,
): Promise<string> {
  const id = randomUUID();
  await testDb.db.insert(listing).values({
    id,
    hostId,
    status: "published",
    bookingMode: "instant",
    reviewState,
    publishedAt: new Date(),
    ...BASELINE,
  });
  return id;
}

/** Append a decided `listing_review` row — the trail a real approval or rejection would have left. */
async function seedDecision(
  listingId: string,
  state: ListingReviewState,
  reason: string | null,
  submittedAt: Date,
  decidedAt: Date | null,
): Promise<string> {
  const id = randomUUID();
  await testDb.db.insert(listingReview).values({
    id,
    listingId,
    state,
    reason,
    decidedByStaffId: "staff-fixture",
    submittedAt,
    decidedAt,
  });
  return id;
}

async function reviewStateOf(listingId: string): Promise<ListingReviewState> {
  const rows = await testDb.db.select().from(listing).where(eq(listing.id, listingId));
  return rows[0].reviewState;
}

async function reviewsOf(listingId: string) {
  return testDb.db
    .select()
    .from(listingReview)
    .where(eq(listingReview.listingId, listingId))
    .orderBy(asc(listingReview.submittedAt));
}

/** The `{ publicId, url }` shape the real signed-upload pipeline produces (D-165). */
function upload(listingId: string, name: string): { publicId: string; url: string } {
  return {
    publicId: `fitout/listings/${listingId}/${name}`,
    url: `https://res.cloudinary.com/${TEST_CLOUD_NAME}/image/upload/v1755102030/fitout/listings/${listingId}/${name}.jpg`,
  };
}

/**
 * The six column-backed material edits, one per D-231 field group that `saveListingStep` can see —
 * the original four, plus `title` and `description` since D-231's 2026-09-01 promotion. Driven as a
 * table so the `approved` / `grandfathered` / `rejected` sweeps are literally the same six edits — if
 * one state ever diverged it would be visible as a difference in this table, not buried in three
 * hand-written copies. Adding a row here is worth three cases, which is the point of the table.
 */
const FIELD_EDITS: { field: string; patch: Parameters<ListingActions["saveListingStep"]>[1] }[] = [
  { field: "address", patch: { addressLine1: "9 Somewhere Else St" } },
  { field: "space type", patch: { primarySpaceType: "yoga_studio" } },
  { field: "capacity", patch: { maxOccupancy: 40 } },
  { field: "price", patch: { hourlyRateCents: 95_000 } },
  // D-231, 2026-09-01. The WORDS. A host who rewrites an approved listing's prose into a different
  // space has changed what ops checked just as surely as one who moves the pin.
  { field: "title", patch: { title: "Midnight Basketball Dome" } },
  {
    field: "description",
    patch: { description: "Actually an unlit lot with no cover at all." },
  },
];

describe("LVER-03 — the material field set (D-231)", () => {
  it("is the ROADMAP's five PLUS D-231's two — title and description are IN", () => {
    // A restatement of the decision as an assertion, so changing the set silently is not possible:
    // an eighth member must be added here, which is a line in a diff a reviewer sees. Set EQUALITY,
    // not a subset check — a `toContain` sweep would let a member be added without anyone deciding to.
    expect([...MATERIAL_FIELDS]).toEqual([
      "address",
      "space_type",
      "capacity",
      "photos",
      "price",
      "title",
      "description",
    ]);
    // These two lines were NEGATED assertions until 2026-09-01 — each asserted the set did not carry
    // its member. They were INVERTED, not deleted, when the PM closed the recorded gap: a fake listing
    // lies in its words as much as in its fields. (The negated matcher is described rather than typed
    // on purpose: this plan's acceptance gate counts its occurrences in this file, and a comment
    // naming it would make a correct file read as a broken one — the collision
    // `src/lib/validation/cancellation.ts:16-19` states as a rule.)
    expect(MATERIAL_FIELDS).toContain("title");
    expect(MATERIAL_FIELDS).toContain("description");
  });
});

describe("LVER-03 [listing_fields] — a material edit to an APPROVED listing returns it to review (D-232)", () => {
  for (const { field, patch } of FIELD_EDITS) {
    it(`a change to ${field} flips approved → pending and opens a new review row`, async () => {
      const hostId = await signInHost(`me.approved.${field.replace(/\s/g, "")}@example.com`);
      const listingId = await makeListing(hostId, "approved");
      await seedDecision(
        listingId,
        "approved",
        null,
        new Date("2026-07-01T00:00:00Z"),
        new Date("2026-07-02T00:00:00Z"),
      );

      const res = await saveListingStep(listingId, patch);
      expect(res.ok).toBe(true);

      expect(await reviewStateOf(listingId)).toBe("pending");
      const rows = await reviewsOf(listingId);
      expect(rows).toHaveLength(2);
      // The NEW row is open — `decided_at IS NULL` is what `ops-review.ts`'s closeReviewCycle later
      // finds, so one row stays one submission-and-its-decision.
      expect(rows[1].state).toBe("pending");
      expect(rows[1].decidedAt).toBeNull();
      expect(rows[1].decidedByStaffId).toBeNull();
    });
  }

  it("the coordinates are part of address — moving the pin alone flips it", async () => {
    const hostId = await signInHost("me.approved.pin@example.com");
    const listingId = await makeListing(hostId, "approved");
    // Both of the pair, which is the only condition under which the action writes the point at all.
    const res = await saveListingStep(listingId, { lat: 14.55, lng: 121.02 });
    expect(res.ok).toBe(true);
    expect(await reviewStateOf(listingId)).toBe("pending");
  });

  it("the pax terms are part of price — a surcharge change flips it", async () => {
    const hostId = await signInHost("me.approved.pax@example.com");
    const listingId = await makeListing(hostId, "approved");
    // extraHeadFee changes what a booker pays for the same group size just as surely as the hourly
    // rate does. `included` (1) stays below maxOccupancy (20), so the HG-01 surcharge guard is not
    // what this case is measuring.
    const res = await saveListingStep(listingId, { extraHeadFee: 5_000 });
    expect(res.ok).toBe(true);
    expect(await reviewStateOf(listingId)).toBe("pending");
  });
});

describe("LVER-03 [listing_fields] — the same edit burns down a GRANDFATHERED listing (D-213)", () => {
  for (const { field, patch } of FIELD_EDITS) {
    it(`a change to ${field} flips grandfathered → pending`, async () => {
      const hostId = await signInHost(`me.grand.${field.replace(/\s/g, "")}@example.com`);
      const listingId = await makeListing(hostId, "grandfathered");
      // No seeded decision: a grandfathered row has NO history, by construction — nobody checked it.
      expect(await reviewsOf(listingId)).toHaveLength(0);

      const res = await saveListingStep(listingId, patch);
      expect(res.ok).toBe(true);

      expect(await reviewStateOf(listingId)).toBe("pending");
      // The first row this listing has ever had, and it is open.
      const rows = await reviewsOf(listingId);
      expect(rows).toHaveLength(1);
      expect(rows[0].state).toBe("pending");
      expect(rows[0].decidedAt).toBeNull();
    });
  }
});

describe("LVER-03 [listing_fields] — a material edit is RESUBMISSION for a rejected listing (D-249)", () => {
  const REJECTION = "The photos don't show the space being listed.";

  for (const { field, patch } of FIELD_EDITS) {
    it(`a change to ${field} flips rejected → pending`, async () => {
      const hostId = await signInHost(`me.rejected.${field.replace(/\s/g, "")}@example.com`);
      const listingId = await makeListing(hostId, "rejected");
      await seedDecision(
        listingId,
        "rejected",
        REJECTION,
        new Date("2026-07-01T00:00:00Z"),
        new Date("2026-07-02T00:00:00Z"),
      );

      const res = await saveListingStep(listingId, patch);
      expect(res.ok).toBe(true);
      expect(await reviewStateOf(listingId)).toBe("pending");
    });
  }

  it("the rejection reason is STILL readable after the flip — it is what the host is fixing", async () => {
    const hostId = await signInHost("me.rejected.reason@example.com");
    const listingId = await makeListing(hostId, "rejected");
    await seedDecision(
      listingId,
      "rejected",
      REJECTION,
      new Date("2026-07-01T00:00:00Z"),
      new Date("2026-07-02T00:00:00Z"),
    );

    await saveListingStep(listingId, { addressLine1: "9 Somewhere Else St" });

    const rows = await reviewsOf(listingId);
    expect(rows).toHaveLength(2);
    // THE GUARD. Clearing this on the flip would delete the only thing that makes the edit
    // purposeful — the host would be resubmitting with no idea what was wrong.
    expect(rows[0].state).toBe("rejected");
    expect(rows[0].reason).toBe(REJECTION);
    // And the new cycle is opened clean rather than inheriting the old verdict's text.
    expect(rows[1].state).toBe("pending");
    expect(rows[1].reason).toBeNull();
  });
});

describe("LVER-03 [listing_fields] — the WORDS are material too, as of D-231 (2026-09-01)", () => {
  it("a title + description edit flips approved → pending and opens a review row", async () => {
    const hostId = await signInHost("me.words.promoted@example.com");
    const listingId = await makeListing(hostId, "approved");

    const res = await saveListingStep(listingId, {
      title: "Sunrise Pickleball Court — now with lights",
      description: "Completely different words about the same space.",
    });
    expect(res.ok).toBe(true);

    // ⚠ THIS CASE WAS INVERTED, NOT WRITTEN FRESH, AND IT LIVED UNDER "the NEGATIVES" UNTIL
    // 2026-09-01. It asserted the OPPOSITE — that this exact save left the listing `approved` —
    // because title and description were deliberately outside the material set, a recorded gap
    // carried in `.planning/REQUIREMENTS.md` § Deferred. Its own comment instructed whoever promoted
    // them to UPDATE it rather than delete it so the change would be visible in a diff; D-231 did,
    // in Phase 18.1 plan `18.1-03`. Anyone who finds the old assertion quoted elsewhere is reading a
    // decision, not a regression.
    //
    // ⚠ THE ACCEPTED COST RIDES ON THIS LINE AND IS NOT A DEFECT. `deriveBookable` requires
    // `approved | grandfathered`, so this listing is now UNSELLABLE until ops re-approves it — and a
    // mere typo fix in a description does exactly the same. The PM ruled that acceptable over a
    // "material but still sellable" variant, which would need a state the sell-gate does not have.
    // Do not weaken this case to make that cost smaller; the cost is the decision.
    expect(await reviewStateOf(listingId)).toBe("pending");
    const rows = await reviewsOf(listingId);
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("pending");
    expect(rows[0].decidedAt).toBeNull();
    expect(rows[0].decidedByStaffId).toBeNull();
    // And the words really were written — otherwise this case would pass against an action that
    // silently ignored the whole save and flipped the state for some unrelated reason.
    const [row] = await testDb.db.select().from(listing).where(eq(listing.id, listingId));
    expect(row.title).toBe("Sunrise Pickleball Court — now with lights");
    expect(row.description).toBe("Completely different words about the same space.");
  });
});

describe("LVER-03 [listing_fields] — the NEGATIVES that make the positives diagnostic", () => {
  it("an autosave re-sending the SAME persisted values does NOT flip", async () => {
    const hostId = await signInHost("me.negative.resend@example.com");
    const listingId = await makeListing(hostId, "approved");

    // This is the wizard's NORMAL behaviour: saveAndContinue persists the whole form on every step, so
    // an unrelated step's autosave carries the same stored address and the same stored price. Treating
    // those as edits would pull every published listing on the platform back into review the moment
    // its host opened the editor.
    //
    // ⚠ THE TITLE AND DESCRIPTION ARE IN THIS PATCH DELIBERATELY, added by `18.1-03` alongside D-231's
    // promotion. The wizard's step-1 form carries both on EVERY save, so the moment the words became
    // material this became the widest freeze-the-whole-catalogue risk in the product — and a version
    // of this case that omitted them would not cover the two newest members of the set at all.
    const res = await saveListingStep(listingId, {
      title: BASELINE.title,
      description: BASELINE.description,
      addressLine1: BASELINE.addressLine1,
      city: BASELINE.city,
      region: BASELINE.region,
      postalCode: BASELINE.postalCode,
      country: BASELINE.country,
      neighborhood: BASELINE.neighborhood,
      primarySpaceType: BASELINE.primarySpaceType,
      maxOccupancy: BASELINE.maxOccupancy,
      hourlyRateCents: BASELINE.hourlyRateCents,
      dayRateCents: BASELINE.dayRateCents,
      included: BASELINE.included,
      extraHeadFee: BASELINE.extraHeadFee,
      lat: BASELINE.location.y,
      lng: BASELINE.location.x,
    });
    expect(res.ok).toBe(true);

    expect(await reviewStateOf(listingId)).toBe("approved");
    expect(await reviewsOf(listingId)).toHaveLength(0);
  });

  it("a sparse save carrying ONE unchanged material field does NOT flip", async () => {
    const hostId = await signInHost("me.negative.sparse@example.com");
    const listingId = await makeListing(hostId, "approved");
    const res = await saveListingStep(listingId, { maxOccupancy: BASELINE.maxOccupancy });
    expect(res.ok).toBe(true);
    expect(await reviewStateOf(listingId)).toBe("approved");
  });

  it("a listing already PENDING is a 0-row no-op — no second open review row is opened", async () => {
    const hostId = await signInHost("me.negative.pending@example.com");
    const listingId = await makeListing(hostId, "pending");
    await seedDecision(
      listingId,
      "pending",
      null,
      new Date("2026-07-01T00:00:00Z"),
      null,
    );

    await saveListingStep(listingId, { maxOccupancy: 41 });

    expect(await reviewStateOf(listingId)).toBe("pending");
    // AND — this is the half that matters for D-249 — the ORIGINAL submission time is untouched. A
    // host editing a listing that is already waiting must not be re-stamped to the back of the queue
    // on every keystroke.
    const rows = await reviewsOf(listingId);
    expect(rows).toHaveLength(1);
    expect(rows[0].submittedAt.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("a WITHDRAWN listing is not dragged back into a queue nobody asked for", async () => {
    const hostId = await signInHost("me.negative.withdrawn@example.com");
    const listingId = await makeListing(hostId, "withdrawn");
    await saveListingStep(listingId, { maxOccupancy: 42 });
    expect(await reviewStateOf(listingId)).toBe("withdrawn");
    expect(await reviewsOf(listingId)).toHaveLength(0);
  });
});

describe("LVER-03 [listing_photos] — the fifth material field, from the only site that can see it (D-242)", () => {
  it("persistPhoto on an APPROVED listing flips it to pending and opens a review row", async () => {
    // THE F7 ASSERTION. `draftSchema` has no photos field, so if photo detection were left in
    // `saveListingStep` this case is the one that would be red — a host could swap every photo on an
    // approved listing, the single highest-signal fake-listing edit there is, and nothing would run.
    const hostId = await signInHost("me.photo.persist@example.com");
    const listingId = await makeListing(hostId, "approved");

    const res = await persistPhoto(listingId, upload(listingId, "one"));
    expect(res.ok).toBe(true);

    expect(await reviewStateOf(listingId)).toBe("pending");
    const rows = await reviewsOf(listingId);
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("pending");
    expect(rows[0].decidedAt).toBeNull();
  });

  it("removePhoto on an APPROVED listing flips it to pending", async () => {
    const hostId = await signInHost("me.photo.remove@example.com");
    const listingId = await makeListing(hostId, "approved");
    await persistPhoto(listingId, upload(listingId, "one"));
    // Put it back to approved so the removal is measured on its own rather than on the add above.
    await testDb.db
      .update(listing)
      .set({ reviewState: "approved" })
      .where(eq(listing.id, listingId));
    const [photo] = await testDb.db
      .select()
      .from(listingPhoto)
      .where(eq(listingPhoto.listingId, listingId));

    const res = await removePhoto(listingId, photo.id);
    expect(res.ok).toBe(true);

    expect(await reviewStateOf(listingId)).toBe("pending");
    // And the row really is gone — otherwise a removePhoto that no-op'd would still pass above.
    const left = await testDb.db
      .select()
      .from(listingPhoto)
      .where(eq(listingPhoto.listingId, listingId));
    expect(left).toHaveLength(0);
  });

  it("reorderPhotos does NOT flip — reordering changes the cover, not what the space is", async () => {
    const hostId = await signInHost("me.photo.reorder@example.com");
    const listingId = await makeListing(hostId, "approved");
    const [a, b] = ["one", "two"].map((n) => upload(listingId, n));
    await persistPhoto(listingId, a);
    await persistPhoto(listingId, b);
    await testDb.db
      .update(listing)
      .set({ reviewState: "approved" })
      .where(eq(listing.id, listingId));
    const before = await testDb.db
      .select()
      .from(listingPhoto)
      .where(eq(listingPhoto.listingId, listingId))
      .orderBy(asc(listingPhoto.position));

    const res = await reorderPhotos(listingId, [...before.map((r) => r.id)].reverse());
    expect(res.ok).toBe(true);

    // A STATED CHOICE, not an omission (D-242 reading). If reordering is ever promoted to material,
    // update this case rather than deleting it.
    expect(await reviewStateOf(listingId)).toBe("approved");
  });

  it("a provenance-REJECTED persistPhoto does NOT flip — a refusal changed no photo (D-165)", async () => {
    const hostId = await signInHost("me.photo.provenance@example.com");
    const listingId = await makeListing(hostId, "approved");

    // A pair our own signed-upload pipeline could not have produced: right shape, wrong origin.
    const res = await persistPhoto(listingId, {
      publicId: `fitout/listings/${listingId}/evil`,
      url: "https://evil.example.com/image/upload/v1/anything.jpg",
    });
    expect(res.ok).toBe(false);

    // Without this, the hook placed ABOVE the provenance gate would hand any signed-in host a way to
    // knock a listing off the market with a request that writes no row at all.
    expect(await reviewStateOf(listingId)).toBe("approved");
    expect(await reviewsOf(listingId)).toHaveLength(0);
    expect(
      await testDb.db.select().from(listingPhoto).where(eq(listingPhoto.listingId, listingId)),
    ).toHaveLength(0);
  });
});

describe("LVER-03 — the flip and the edit commit or roll back TOGETHER (T-18-0604)", () => {
  it("[listing_fields] a save whose later write fails leaves the review state unmoved", async () => {
    const hostId = await signInHost("me.tx.rollback@example.com");
    const listingId = await makeListing(hostId, "approved");

    // A probe constraint on a statement that runs AFTER the flip inside `saveListingStep`'s
    // transaction (the amenity replacement). Failing the FIELD write instead would prove nothing:
    // the flip would never have been reached, and the case would pass just as happily against a flip
    // that ran outside the transaction. This is the ordering that makes the case diagnostic.
    await testDb.db.execute(
      sql`ALTER TABLE listing_amenity ADD CONSTRAINT tx_probe_18_06 CHECK (amenity <> 'wifi')`,
    );
    try {
      await expect(
        saveListingStep(listingId, { maxOccupancy: 44, amenities: ["wifi"] }),
      ).rejects.toThrow();
    } finally {
      await testDb.db.execute(
        sql`ALTER TABLE listing_amenity DROP CONSTRAINT tx_probe_18_06`,
      );
    }

    // All three rolled back together: the field, the flip, and the history row. A listing whose
    // capacity committed but whose review state did not is a sellable fake; so is the inverse.
    const [row] = await testDb.db.select().from(listing).where(eq(listing.id, listingId));
    expect(row.reviewState).toBe("approved");
    expect(row.maxOccupancy).toBe(BASELINE.maxOccupancy);
    expect(await reviewsOf(listingId)).toHaveLength(0);
  });
});

describe("LVER-03 — a resubmission enters the queue at its RESUBMISSION time (D-249)", () => {
  it("[listing_fields] the new submitted_at is strictly later, and the queue puts the resubmitter LAST", async () => {
    const hostId = await signInHost("me.queue.resubmit@example.com");

    // A first-time submitter that has been waiting five weeks.
    const waiting = await makeListing(hostId, "pending");
    const WAITING_SINCE = new Date("2026-07-25T00:00:00Z");
    await seedDecision(waiting, "pending", null, WAITING_SINCE, null);

    // A repeat-resubmitter whose ORIGINAL submission is older than the first-timer's wait — the shape
    // that would jump the line if the queue keyed on the first submission (or on listing.created_at).
    const resubmitter = await makeListing(hostId, "rejected");
    const FIRST_SUBMISSION = new Date("2026-06-01T00:00:00Z");
    await seedDecision(
      resubmitter,
      "rejected",
      "We couldn't confirm this space is real.",
      FIRST_SUBMISSION,
      new Date("2026-06-03T00:00:00Z"),
    );

    // Scoped to THIS case's host: the whole file shares one schema and earlier cases deliberately
    // leave listings sitting at pending, so an unscoped read would be asserting about them too.
    const queueFor = async (owner: string) =>
      (await loadReviewQueue(testDb.db))
        .filter((i) => i.kind === "listing" && i.hostId === owner)
        .map((i) => (i.kind === "listing" ? i.listingId : ""));

    // Before the edit, only the first-timer is waiting.
    expect(await queueFor(hostId)).toEqual([waiting]);

    await saveListingStep(resubmitter, { maxOccupancy: 55 });

    const rows = await reviewsOf(resubmitter);
    expect(rows).toHaveLength(2);
    // Guard one: the clock is reset to NOW, not carried forward from the original submission.
    expect(rows[1].submittedAt.getTime()).toBeGreaterThan(FIRST_SUBMISSION.getTime());
    expect(rows[1].submittedAt.getTime()).toBeGreaterThan(WAITING_SINCE.getTime());

    // Guard two, and the one that is actually about fairness: oldest-first must not let a
    // repeat-resubmitter jump ahead of somebody who has been waiting since July.
    expect(await queueFor(hostId)).toEqual([waiting, resubmitter]);
  });

  it("[listing_photos] a photo resubmission lands at the back of the queue too", async () => {
    const hostId = await signInHost("me.queue.photo@example.com");

    const waiting = await makeListing(hostId, "pending");
    await seedDecision(
      waiting,
      "pending",
      null,
      new Date("2026-07-26T00:00:00Z"),
      null,
    );

    const resubmitter = await makeListing(hostId, "rejected");
    await seedDecision(
      resubmitter,
      "rejected",
      "The photos don't show the space being listed.",
      new Date("2026-06-02T00:00:00Z"),
      new Date("2026-06-04T00:00:00Z"),
    );

    // The literal fix for that rejection sentence: add a photo that does show the space. It has to
    // put the listing back in the queue at the back, exactly as a field edit does — otherwise the two
    // detection sites would disagree about what a resubmission is worth.
    const res = await persistPhoto(resubmitter, upload(resubmitter, "real"));
    expect(res.ok).toBe(true);

    const queued = (await loadReviewQueue(testDb.db))
      .filter((i) => i.kind === "listing" && i.hostId === hostId)
      .map((i) => (i.kind === "listing" ? i.listingId : ""));
    expect(queued).toEqual([waiting, resubmitter]);
  });
});
