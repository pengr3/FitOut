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
// D-255 (plan 18.1-12) — the ONE shared seed. See `signInHost` below for why every fixture in this
// file now carries a verification row, and `tests/helpers/verification.ts`'s header for why the
// helper exists rather than a dozen copies of the same two inserts.
import { seedHostVerification } from "../helpers/verification";
import {
  listing,
  listingAmenity,
  listingActivityTag,
  listingPhoto,
  hostVerification,
  type HostVerificationStatus,
} from "@/lib/db/schema";

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

/**
 * Sign up + sign in a host; stash the session cookie for the next/headers mock. Returns the id.
 *
 * ⚠ IT NOW SEEDS A VERIFICATION ROW, AND THE DEFAULT IS `approved` (D-255, plan 18.1-12).
 * `createDraftListing` refuses `unverified | pending | rejected | suspended` server-side, and a host
 * signed up through Better Auth has NO `host_verification` row at all — which reads as `unverified`.
 * Without this, every case below that mints a draft fails at its setup line with "setup failed",
 * which looks like a regression in listing CRUD and is actually the gate doing its job.
 *
 * SEEDED HERE RATHER THAN AT ~SEVEN CALL SITES on `tests/helpers/verification.ts`'s own argument: a
 * copy per site is a chance per site to seed the wrong status, and seeding `approved` where the case
 * meant `unverified` produces a test that passes for the wrong reason. One place, one default.
 *
 * The `status` parameter is what the LVER-05 census below drives — including `null`, which seeds the
 * user with NO verification row at all. That is a DISTINCT fixture from a row at `unverified`, not a
 * synonym for it, and the census measures both (the helper's header states the rule).
 */
async function signInHost(
  email: string,
  status: HostVerificationStatus | null = "approved",
): Promise<string> {
  const res = (await signUp(testAuth, {
    email,
    password: "averylongpassword",
    name: "Host",
    firstName: "Host",
    intent: "host",
  })) as { user: { id: string } };
  await seedHostVerification(testDb.db, res.user.id, status);
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

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// LVER-05 / D-255 (PM-C) — THE HOST-VERIFICATION GATE ON LISTING CREATION, ALL SIX STATES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Driven through the REAL `createDraftListing` against the isolated schema, for this file's opening
// reason: the gate is a SERVER-SIDE clause, and the page in front of it is a courtesy. A test that
// drove the page would be measuring the courtesy.
//
// ⚠ EVERY REFUSING CASE ASSERTS THE `listing` ROW COUNT DID NOT MOVE, not merely that `ok` is false.
// A gate that returns a refusal AFTER inserting is not a gate, and `{ ok: false }` alone cannot tell
// the two apart — the action would have to leak the id for that to show up on its own.
//
// ⚠ SEVEN CASES FOR SIX STATES, because `unverified` has TWO fixtures that must both refuse: a ROW at
// `unverified`, and NO ROW AT ALL. `verification-status.ts`'s header rule is that absence reads as
// `unverified`, and absence is the ordinary state of every host nobody has checked — so the no-row
// case is the one a real new host actually meets, and it is the one a refactor is most likely to
// drop. Asserting only the row form would leave the common path unmeasured.
//
// MUTATION-VERIFY (run before committing, and it WAS run — see 18.1-12-SUMMARY):
//   · delete `verification.status === "pending"` from the refusing set in `createDraftListing`
//     → case (LVER-05 · pending) goes RED naming pending; every other case stays GREEN.
//   · delete the whole `if` block → all five refusing cases go RED together while (F-7) and
//     (approved) stay GREEN — which is what distinguishes "the gate is gone" from "the gate refuses
//     everything", and is why the two positive cases are not decoration.
describe("LVER-05 — createDraftListing is gated on the host's verification (D-255 / PM-C)", () => {
  /** How many listings exist right now, across all hosts — the number a refusal must not move. */
  async function listingCount(): Promise<number> {
    return (await testDb.db.select({ id: listing.id }).from(listing)).length;
  }

  /**
   * Drive one state through the real action and assert it REFUSED WITHOUT WRITING.
   *
   * The count is taken across ALL hosts rather than scoped to this one, deliberately: a gate that
   * inserted a row owned by somebody else would still be a gate that inserted a row.
   */
  async function expectRefused(
    email: string,
    status: HostVerificationStatus | null,
    what: string,
  ): Promise<void> {
    await signInHost(email, status);
    const before = await listingCount();
    const res = await createDraftListing();
    expect(res.ok, `${what} must NOT be able to create a listing (D-255)`).toBe(false);
    expect(
      await listingCount(),
      `${what} was refused but a listing row still landed — so the refusal is returned AFTER the ` +
        "insert, which is not a gate. In `createDraftListing`, the verification check must sit " +
        "BEFORE `db.insert(listing)`.",
    ).toBe(before);
  }

  it("(LVER-05 · unverified, NO ROW) refuses a host nobody has checked — the ordinary new-host state", async () => {
    // ⚠ `null` seeds the USER ONLY, with NO `host_verification` row. This is the fixture a real host
    // signing up today produces, and `loadHostVerification` reports it as `unverified` by its header
    // rule. If a future read ever starts treating absence as anything else, THIS case catches it.
    await expectRefused("lver05.norow@example.com", null, "a host with no verification row at all");
  });

  it("(LVER-05 · unverified) refuses a host with a row at unverified", async () => {
    await expectRefused("lver05.unverified@example.com", "unverified", "an `unverified` host");
  });

  it("(LVER-05 · pending) refuses a host whose check is still with the checking partner", async () => {
    // The panel this host reads says so in its own shipped words — "You can't create a listing until
    // it lands." — so a `pending` host who COULD create one would make that copy false.
    await expectRefused("lver05.pending@example.com", "pending", "a `pending` host");
  });

  it("(LVER-05 · rejected) refuses a host the checking partner did not pass", async () => {
    await expectRefused("lver05.rejected@example.com", "rejected", "a `rejected` host");
  });

  it("(LVER-05 · suspended) refuses a host whose hosting is paused (ENF-01 / ENF-02)", async () => {
    await expectRefused("lver05.suspended@example.com", "suspended", "a `suspended` host");
  });

  it("(LVER-05 · approved) a checked host CREATES a draft — the mirror that stops the gate refusing everything", async () => {
    // Without this, all five cases above would pass against an action that returns `{ok:false}`
    // unconditionally. It is the guard-the-guard half rather than a duplicate of this file's opening
    // case, which drives a host whose status the sweep now seeds implicitly.
    const userId = await signInHost("lver05.approved@example.com", "approved");
    const res = await createDraftListing();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const row = await readListing(res.id!);
    expect(row.hostId).toBe(userId);
    expect(row.status).toBe("draft");
  });

  it("(LVER-05 · grandfathered — FINDING F-7) a GRANDFATHERED host CREATES a draft, deliberately", async () => {
    await signInHost("lver05.grandfathered@example.com", "grandfathered");
    const res = await createDraftListing();

    expect(
      res.ok,
      "FINDING F-7 — THIS IS DELIBERATE AND IT IS NOT A BUG. `grandfathered` is NOT one of D-255's " +
        "four refusing states: D-255 names `unverified | pending | rejected | suspended`, and " +
        "`grandfathered` is not among them. `drizzle/0026` grandfathered the hosts who already owned " +
        "a PUBLISHED listing at cutover, and D-211/D-224 make them SELLABLE today — so refusing them " +
        "a NEW listing would mean an account taking bookings this morning cannot grow this " +
        "afternoon, which is a scope change nobody decided. The natural reading of 'a host cannot " +
        "create a listing until they are verified' DOES exclude them, which is exactly why this case " +
        "exists: if you arrived here intending to add `grandfathered` to the refusing set, that is a " +
        "PRODUCT decision needing a decision record, not a one-line fix. Their route to a real check " +
        "is LVER-04's backfill, which stays deferred.",
    ).toBe(true);
    if (!res.ok) return;
    expect(res.id).toBeTruthy();
  });

  it("(D-270) saveListingStep on an EXISTING draft still succeeds for an UNVERIFIED host", async () => {
    // Both halves of D-270 in one case: creation is gated, autosave is NOT. The draft is minted while
    // the host is `approved`, then the SAME host is moved to `unverified` — which is what a review or
    // enforcement flip looks like to a host who is mid-wizard.
    const userId = await signInHost("lver05.d270@example.com", "approved");
    const created = await createDraftListing();
    if (!created.ok) throw new Error("setup failed");
    const id = created.id!;

    await testDb.db
      .update(hostVerification)
      .set({ status: "unverified" })
      .where(eq(hostVerification.userId, userId));

    // The gate is now closed for CREATION…
    const blocked = await createDraftListing();
    expect(
      blocked.ok,
      "the fixture did not actually move — this host can still create, so the second half of this " +
        "case would be proving nothing",
    ).toBe(false);

    // …and OPEN for the draft they already had.
    const saved = await saveListingStep(id, { title: "Half-finished when the check lapsed" });
    expect(
      saved.ok,
      "D-270 — `saveListingStep` must stay UNGATED. An unverified host may not START a listing, but " +
        "the one they are already writing must stay editable: every draft begun before D-255 landed " +
        "belongs to a host with no verification row, and gating autosave would turn the wizard into " +
        "a form that cannot be left.",
    ).toBe(true);
    expect((await readListing(id)).title).toBe("Half-finished when the check lapsed");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// D-02 — CREATION IS IDEMPOTENT AGAINST A HUMAN RETRY, AND CAN NEVER ADOPT WORK A HOST HAS STARTED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Plan 19-01 measured FOUR empty drafts owned by one host, minted across 46 seconds — a person
// pressing *Create listing*, going back, and pressing again while a redirect failed to land. Plan
// 19-04 deleted them. `createDraftListing`'s reuse-then-mint branch is what makes that delete a
// one-off rather than the first of many, and these three cases are what pin it.
//
// THE TWO FAILURE DIRECTIONS ARE NOT SYMMETRIC, and every message below names which one it guards:
//   • TOO LOOSE — reuse a draft the host has TOUCHED. The host presses Create for their second
//     space, lands in the wizard for their first one already half filled in, edits it, overwrites
//     real work, and never learns a second listing was not created. SILENT DATA LOSS on a host's own
//     content. This is the unacceptable direction and cases 2 and 3 are the only things standing in
//     front of it.
//   • TOO TIGHT — mint when a reuse was possible. One extra empty draft in the grid: today's
//     behaviour, visible, deletable. Tolerable. Case 1 is the only case that can catch it.
describe("D-02 — createDraftListing reuses the host's own UNTOUCHED empty draft, and only that", () => {
  /** How many listings this host owns right now — the number a reuse must not move. */
  async function ownedCount(userId: string): Promise<number> {
    return (await testDb.db.select({ id: listing.id }).from(listing).where(eq(listing.hostId, userId)))
      .length;
  }

  it("(D-02 · case 1) two consecutive creations return the SAME id and grow the table by exactly one row", async () => {
    const userId = await signInHost("d02.idempotent@example.com");

    const first = await createDraftListing();
    if (!first.ok) throw new Error("setup failed — the first create was refused");
    const second = await createDraftListing();
    if (!second.ok) throw new Error("the SECOND create was refused, which D-02 never asks for");

    expect(
      second.id,
      "D-02's headline — pressing `Create listing` twice, or landing on `/host/listings/new` twice, " +
        "must yield ONE listing for this host. Four empty drafts across 46 seconds is the measured " +
        "defect this branch exists to stop; if this case is red, `createDraftListing` is minting " +
        "again instead of reusing the host's own untouched draft, and plan 19-04's delete just " +
        "became the first of many rather than a one-off.",
    ).toBe(first.id);

    // Asserted SEPARATELY from the id, deliberately: an id-only assertion would pass against an
    // action that returned the first id while STILL inserting a second row — which is the exact
    // shape of a "fix" that fixes the symptom and not the orphan.
    expect(
      await ownedCount(userId),
      "the second create returned the first id but a row still landed — so the reuse read is " +
        "returning the right answer AFTER the insert rather than instead of it. The read must sit " +
        "BEFORE `db.insert(listing)`, and its branch must `return` rather than fall through.",
    ).toBe(1);
  });

  it("(D-02 · case 2) a draft the host has STARTED EDITING is never reused — different id, two rows", async () => {
    const userId = await signInHost("d02.touched@example.com");

    const first = await createDraftListing();
    if (!first.ok) throw new Error("setup failed — the first create was refused");

    // ⚠ DELIBERATELY NOT A TITLE. The predicate carries `title IS NULL` as belt-and-braces, so a
    // step that set the title would keep this case green through the `title` conjunct alone and
    // this case would stop measuring the term it exists to measure. Writing a NON-title field
    // leaves `title IS NULL` true, so `updated_at = created_at` is the ONLY conjunct standing
    // between this host and having their work adopted — which is what makes the watched-red
    // meaningful (19-RESEARCH § 5.6).
    const saved = await saveListingStep(first.id!, {
      description: "A calm corner room the host started describing and then walked away from.",
    });
    if (!saved.ok) throw new Error("setup failed — the wizard step did not save");

    const second = await createDraftListing();
    if (!second.ok) throw new Error("the second create was refused, which D-02 never asks for");

    expect(
      second.id,
      "THE UNACCEPTABLE DIRECTION — the predicate is TOO LOOSE and just adopted a draft this host " +
        "has already written into. In production that means: the host presses `Create listing` to " +
        "start their SECOND space, lands in the wizard for their FIRST one already half filled in, " +
        "edits it, OVERWRITES REAL WORK, and never learns a second listing was not created. Silent " +
        "data loss on a host's own content, with no error and no way to notice. The conjunct that " +
        "prevents it is `updated_at = created_at`: schema.ts:264-267's `$onUpdate` fires on every " +
        "`db.update()` through the listing table object, so `saveListingStep` above moved " +
        "`updated_at` off `created_at` and this row is no longer untouched. If you arrived here " +
        "after removing that term to 'simplify' the predicate, restore it.",
    ).not.toBe(first.id);

    expect(
      await ownedCount(userId),
      "the second create returned a new id but no second row exists — so the ids disagree for some " +
        "reason other than a fresh insert. Both halves must hold.",
    ).toBe(2);
  });

  it("(D-02 · case 3) a draft with a listing_photo is never reused, even though updated_at = created_at", async () => {
    const userId = await signInHost("d02.photo@example.com");

    const first = await createDraftListing();
    if (!first.ok) throw new Error("setup failed — the first create was refused");

    // The photo insert goes straight to the child table, which is precisely the point: this mirrors
    // `src/app/actions/listing-photo.ts:294`, which inserts inside a transaction and does NOT update
    // the `listing` row. So this draft still reads `updated_at = created_at` AND `title IS NULL` —
    // untouched by every term except the one this case is about.
    await testDb.db.insert(listingPhoto).values({
      id: "lp_d02_case3",
      listingId: first.id!,
      publicId: "fitout/d02-case3",
      url: "https://example.invalid/d02-case3.jpg",
      position: 0, // cover
    });

    const row = await readListing(first.id!);
    expect(
      row.updatedAt.getTime(),
      "this case is only meaningful if the photo insert left `updated_at` alone — that is the whole " +
        "premise. If these differ, `listing-photo.ts` has started touching the listing row and this " +
        "case is no longer testing the loophole it was written for.",
    ).toBe(row.createdAt.getTime());

    const second = await createDraftListing();
    if (!second.ok) throw new Error("the second create was refused, which D-02 never asks for");

    expect(
      second.id,
      "THE UNACCEPTABLE DIRECTION, VIA THE PHOTO LOOPHOLE — this host uploaded a cover photo to a " +
        "draft and abandoned it, and the second `Create listing` just handed them that draft, with " +
        "their photo silently adopted into what they believe is a brand-new listing.\n" +
        "⚠ THIS IS THE CASE THAT GOES GREEN BY ACCIDENT IF SOMEONE 'SIMPLIFIES' THE PREDICATE DOWN " +
        "TO THE TIMESTAMP COMPARISON. `updated_at = created_at` does NOT close this gap and cannot: " +
        "`listing-photo.ts:294` inserts the photo row inside a transaction WITHOUT updating the " +
        "listing row, so the timestamps still match. The conjunct that closes it is the " +
        "`NOT EXISTS (SELECT 1 FROM listing_photo …)` term — and the sibling `operating_hours` term " +
        "is there for the identical measured reason (`operating-hours.ts:165-167`). Neither is " +
        "belt-and-braces; deleting either reopens a real gap.",
    ).not.toBe(first.id);

    expect(await ownedCount(userId), "a new id was returned but no second row landed").toBe(2);
  });
});
