// OPS-04 / D-246 / D-249 — the ONE review queue: interleaved, oldest-first, from the domain tables.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE IS AN INTEGRATION TEST AND NOT A UNIT TEST
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Every property under test is a property of SQL — a partial predicate, a lateral join to the latest
// review row, a COALESCE at a nullable join, and an ordering across a union. None of them is
// observable from a mocked query builder: a stub would return whatever the test author believed the
// SQL says, which is precisely the belief under test. So this runs the real statements against an
// isolated schema replayed from `drizzle/*.sql` (tests/helpers/db.ts).
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE FIXTURE, LAID OUT ON ONE CLOCK — the interleave is the point, so it is designed, not incidental
// ════════════════════════════════════════════════════════════════════════════════════════════════
//   08-01  listing A   pending, submitted via a listing_review row
//   08-02  HOST 1      host_verification.status = 'pending'
//   08-03  listing B   pending, submitted via a listing_review row  (the full-evidence row)
//   08-04  HOST 2      host_verification.status = 'pending'
//   08-05  listing C   pending, NO review row at all → the created_at FALLBACK
//   08-06  listing R   RESUBMITTED: created 07-01, first review row 07-01 (rejected), latest 08-06
//
// Expected order: A · HOST 1 · B · HOST 2 · C · R.
//
// That shape is chosen so a HOST row sits BETWEEN two LISTING rows twice. An implementation that
// returned two arrays concatenated — hosts then listings, or listings then hosts — produces a
// perfectly plausible-looking list that this ordering assertion rejects, and NO per-item assertion
// could. It also puts the resubmitted listing LAST despite being the oldest row in the `listing`
// table by five weeks, which is the whole content of D-249: a repeat-resubmitter must not jump an
// oldest-first line.
//
// NOT IN THE QUEUE, one per exclusion, because each is a different way to be wrong:
//   approved · grandfathered · rejected   — decided; the partial predicate's job
//   draft                                 — never SUBMITTED (see the note at LISTING_QUEUE_PREDICATE)
//   soft-deleted pending                  — deleted
//   hosts at approved / grandfathered / unverified — decided, or never submitted
//
// ⚠ THE DRAFT EXCLUSION IS A DEVIATION FROM 18-05-PLAN, RECORDED IN THE SUMMARY. D-240's backfill
// deliberately left every `draft` row at `review_state = 'pending'`; on the dev catalogue that is 32
// rows against 19 real ones, every one of them mid-wizard with a NULL title, NULL address, NULL
// capacity, NULL price and no photos. 18-UI-SPEC's evidence `<dl>` would render blanks and the
// gallery would render nothing. Case 8 pins the exclusion so it is a decision with a test, not an
// omission.

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ WHAT PLAN 18.1-07 ADDED, AND WHY IT IS IN **THIS** FILE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Every case above seeds `host_verification` DIRECTLY, which is the right shape for measuring the
// SQL — but it means the whole file could stay green against a product where no host can ever get
// into the queue in the first place. That was not hypothetical: until plan 18.1-07 the only
// `INSERT INTO host_verification` in the repository was a test seed and `drizzle/0026`'s backfill.
//
// So the last describe block drives the REAL submission action and then asserts on the queue.
// It lives here rather than in `host-verification-submit.test.ts` because the claim is about
// `loadReviewQueue`'s ORDERING — a host row taking its `created_at ASC` place BETWEEN two listing
// rows — and that is this file's subject. It needs the session/action harness the submission suite
// has, so the harness is added at the END of `beforeAll`, after the fixture, where it cannot change
// what cases 1-9 read.
//
// ⚠ MUTATION-SCORED. Commenting out the guarded upsert in
// `src/app/actions/host-verification.ts` must turn case 10 RED. If it does not, the case is
// measuring a seed rather than the path, which is the whole failure mode it exists to rule out.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { seedHostVerification } from "../helpers/verification";
import {
  user,
  listing,
  listingAmenity,
  listingPhoto,
  listingReview,
  hostVerification,
  operatingHours,
} from "@/lib/db/schema";
import { loadReviewQueue, type OpsQueueItem } from "@/lib/ops/review-queue";
import { loadOpsCancelImpact, loadOpsCancelImpacts } from "@/lib/ops/cancel-impact";

const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

let testDb: TestDb;
let testAuth: TestAuth;

/** The submission action under test, imported after the mocks are in place. */
type HostActions = typeof import("@/app/actions/host-verification");
let requestHostVerification: HostActions["requestHostVerification"];

const SC1_PASSWORD = "averylongpassword";
const SC1_EMAIL = "q_sc1_host@example.com";
/** Obvious fakes: no case may depend on a real Didit credential being present OR absent. */
const SC1_API_KEY = "didit-test-key-not-a-credential";
const SC1_WORKFLOW_ID = "00000000-1111-2222-3333-444444444444";
/** The captured create-session 201, narrowed to the two fields the adapter reads. */
const SC1_SESSION = {
  session_id: "99999999-8888-7777-6666-555555555555",
  url: "https://verify.didit.me/en/session/QueueProof1",
  status: "Not Started",
} as const;

/** The clock the whole fixture is laid out on. Absolute, so nothing depends on when the suite runs. */
const T = (day: number, month = 8) => new Date(Date.UTC(2026, month - 1, day, 12, 0, 0));

const HOST_1 = "q_host_1";
const HOST_2 = "q_host_2";
/** Owns the listings. Their OWN verification is 'approved', so a listing row's host term is visible. */
const LISTING_HOST = "q_listing_host";
/** Owns listing C. Has NO host_verification row at all — the fail-closed 'unverified' fixture. */
const UNCHECKED_HOST = "q_unchecked_host";

async function makeUser(id: string, name: string, createdAt: Date, emailVerified = true) {
  await testDb.db.insert(user).values({
    id,
    name,
    email: `${id}@fitout.test`,
    firstName: name.split(" ")[0],
    emailVerified,
    canHost: true,
    createdAt,
  });
}

type ListingOpts = {
  hostId?: string;
  status?: "draft" | "published" | "unlisted";
  reviewState?: "pending" | "approved" | "rejected" | "grandfathered" | "withdrawn";
  createdAt: Date;
  deletedAt?: Date;
  full?: boolean;
};

async function makeListing(id: string, opts: ListingOpts) {
  const full = opts.full ?? false;
  await testDb.db.insert(listing).values({
    id,
    hostId: opts.hostId ?? LISTING_HOST,
    title: full ? `Title ${id}` : null,
    description: full ? `Description ${id}` : null,
    status: opts.status ?? "published",
    reviewState: opts.reviewState ?? "pending",
    createdAt: opts.createdAt,
    deletedAt: opts.deletedAt,
    addressLine1: full ? "12 Kalayaan Ave" : null,
    addressLine2: full ? "Unit 4B" : null,
    city: full ? "Makati" : null,
    region: full ? "Metro Manila" : null,
    postalCode: full ? "1210" : null,
    country: full ? "PH" : null,
    primarySpaceType: full ? "pickleball_court" : null,
    maxOccupancy: full ? 8 : null,
    hourlyRateCents: full ? 120000 : null,
    dayRateCents: full ? 600000 : null,
  });
}

/** A submission row. `decidedAt` non-null = a decided cycle; null = still awaiting a decision. */
async function makeReview(
  id: string,
  listingId: string,
  submittedAt: Date,
  opts: { state?: "pending" | "approved" | "rejected"; decidedAt?: Date } = {},
) {
  await testDb.db.insert(listingReview).values({
    id,
    listingId,
    state: opts.state ?? "pending",
    submittedAt,
    decidedAt: opts.decidedAt,
  });
}

beforeAll(async () => {
  testDb = await setupTestDb();

  await makeUser(LISTING_HOST, "Lila Host", T(1, 6));
  await makeUser(UNCHECKED_HOST, "Uma Unchecked", T(2, 6));
  await makeUser(HOST_1, "Hana One", T(3, 6));
  await makeUser(HOST_2, "Hugo Two", T(4, 6), /* emailVerified */ false);

  // The listing-owning host is APPROVED, so a listing row can show a real host term.
  await testDb.db
    .insert(hostVerification)
    .values({ userId: LISTING_HOST, status: "approved", provider: "manual" });

  // ── The two hosts IN the queue, at 08-02 and 08-04. ────────────────────────────────────────────
  await testDb.db
    .insert(hostVerification)
    .values({ userId: HOST_1, status: "pending", provider: "manual", createdAt: T(2) });
  await testDb.db
    .insert(hostVerification)
    .values({ userId: HOST_2, status: "pending", provider: "manual", createdAt: T(4) });

  // ── The listings IN the queue. ─────────────────────────────────────────────────────────────────
  await makeListing("q_listing_a", { createdAt: T(20, 7) });
  await makeReview("q_rev_a", "q_listing_a", T(1));

  await makeListing("q_listing_b", { createdAt: T(21, 7), full: true });
  await makeReview("q_rev_b", "q_listing_b", T(3));
  // Two photos, inserted OUT of position order so the gallery's ordering is measured, not inherited.
  await testDb.db.insert(listingPhoto).values([
    { id: "q_ph_b2", listingId: "q_listing_b", publicId: "pb2", url: "https://x/b2.jpg", position: 1 },
    { id: "q_ph_b1", listingId: "q_listing_b", publicId: "pb1", url: "https://x/b1.jpg", position: 0 },
  ]);
  await testDb.db.insert(listingAmenity).values([
    { listingId: "q_listing_b", amenity: "wifi" },
    { listingId: "q_listing_b", amenity: "parking" },
  ]);
  // Monday is deliberately inserted out of order. The queue projection, not this fixture, owns the
  // deterministic day/window order that reaches the staff evidence island.
  await testDb.db.insert(operatingHours).values([
    {
      id: "q_hours_b_late",
      listingId: "q_listing_b",
      dayOfWeek: 1,
      openTime: "16:00",
      closeTime: "21:00",
    },
    {
      id: "q_hours_b_early",
      listingId: "q_listing_b",
      dayOfWeek: 1,
      openTime: "06:00",
      closeTime: "10:00",
    },
  ]);

  // C has NO review row — the `listing.created_at` FALLBACK — and an UNCHECKED host.
  await makeListing("q_listing_c", { createdAt: T(5), hostId: UNCHECKED_HOST });

  // ── R — the RESUBMISSION (D-249). Created 07-01, rejected 07-01, resubmitted 08-06. ────────────
  await makeListing("q_listing_r", { createdAt: T(1, 7) });
  await makeReview("q_rev_r_old", "q_listing_r", T(1, 7), {
    state: "rejected",
    decidedAt: T(2, 7),
  });
  await makeReview("q_rev_r_new", "q_listing_r", T(6));

  // ── NOT in the queue. ──────────────────────────────────────────────────────────────────────────
  await makeListing("q_out_approved", { createdAt: T(1, 1), reviewState: "approved" });
  await makeListing("q_out_grandfathered", { createdAt: T(1, 1), reviewState: "grandfathered" });
  await makeListing("q_out_rejected", { createdAt: T(1, 1), reviewState: "rejected" });
  await makeListing("q_out_draft", { createdAt: T(1, 1), status: "draft" });
  await makeListing("q_out_deleted", { createdAt: T(1, 1), deletedAt: T(2, 1) });
  await makeUser("q_out_host_approved", "Ann Approved", T(1, 1));
  await testDb.db.insert(hostVerification).values({
    userId: "q_out_host_approved",
    status: "approved",
    provider: "manual",
    createdAt: T(1, 1),
  });
  await makeUser("q_out_host_grand", "Gus Grand", T(1, 1));
  await testDb.db.insert(hostVerification).values({
    userId: "q_out_host_grand",
    status: "grandfathered",
    provider: "migration",
    createdAt: T(1, 1),
  });
  await makeUser("q_out_host_unverified", "Uri Unverified", T(1, 1));
  await testDb.db.insert(hostVerification).values({
    userId: "q_out_host_unverified",
    status: "unverified",
    provider: "manual",
    createdAt: T(1, 1),
  });

  // ── THE SC1 HARNESS, added last so nothing above it can be disturbed (plan 18.1-07). ──────────
  //
  // A REAL Better Auth account, because the submission action reads the session; `emailVerified` is
  // flipped through the shared seeding helper with `null` status, i.e. NO verification row at all —
  // which is exactly the fixture the queue must be shown to fill from.
  testAuth = makeTestAuth(testDb);
  await signUp(testAuth, {
    email: SC1_EMAIL,
    password: SC1_PASSWORD,
    name: "Sam Submits",
    firstName: "Sam",
    intent: "host",
  });
  const [sc1] = await testDb.db.select({ id: user.id }).from(user).where(eq(user.email, SC1_EMAIL));
  await seedHostVerification(testDb.db, sc1.id, null, { emailVerified: true });

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  // Always-allow, so the case's outcome cannot depend on the limiter's module-level Map — which is
  // process-wide state this file shares with every other suite in the same worker.
  vi.doMock("@/lib/rate-limit", () => ({ rateLimit: () => ({ ok: true }) }));
  vi.resetModules();
  ({ requestHostVerification } = await import("@/app/actions/host-verification"));
  // ⚠ `loadReviewQueue` was imported STATICALLY, before `resetModules`, and every case calls it with
  // `testDb.db` explicitly — so the reset above cannot change what the queue reads.
}, 120_000);

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/rate-limit");
  await teardownTestDb(testDb);
});

/** The handle a case names a row by, whichever kind it is. */
const idOf = (i: OpsQueueItem) => (i.kind === "host" ? i.userId : i.listingId);

describe("OPS-04 — one queue, both kinds, oldest first", () => {
  it("case 1 — returns ONE array containing BOTH kinds", async () => {
    const q = await loadReviewQueue(testDb.db);
    expect(Array.isArray(q)).toBe(true);
    expect(q.some((i) => i.kind === "host")).toBe(true);
    expect(q.some((i) => i.kind === "listing")).toBe(true);
  });

  it("case 2 — ONLY the pending items appear; decided, draft and deleted rows do not", async () => {
    const q = await loadReviewQueue(testDb.db);
    expect(q.map(idOf).sort()).toEqual(
      [
        "q_listing_a",
        "q_listing_b",
        "q_listing_c",
        "q_listing_r",
        HOST_1,
        HOST_2,
      ].sort(),
    );
  });

  it("case 3 — THE INTERLEAVE: strictly oldest-first ACROSS kinds, not grouped by kind", async () => {
    const q = await loadReviewQueue(testDb.db);

    // The exact expected order, spelled out. A two-array concatenation in either direction produces
    // a plausible list that fails HERE and nowhere else.
    expect(q.map(idOf)).toEqual([
      "q_listing_a", // 08-01
      HOST_1, //        08-02  ← a HOST row BETWEEN two LISTING rows
      "q_listing_b", // 08-03
      HOST_2, //        08-04  ← and again
      "q_listing_c", // 08-05
      "q_listing_r", // 08-06
    ]);

    // And the ordering property itself, so the case does not rest solely on a hardcoded list.
    for (let i = 1; i < q.length; i++) {
      expect(q[i].submittedAt.getTime()).toBeGreaterThanOrEqual(q[i - 1].submittedAt.getTime());
    }

    // GUARD-THE-GUARD: the assertion above is only meaningful if the kinds actually alternate. A
    // grouped list would satisfy the monotonic check just as happily.
    const kinds = q.map((i) => i.kind);
    const firstListingAfterAHost = kinds.indexOf("listing", kinds.indexOf("host"));
    expect(firstListingAfterAHost).toBeGreaterThan(-1);
  });

  it("case 4 — D-249: a RESUBMISSION sorts by its LATEST submission, never its first", async () => {
    const q = await loadReviewQueue(testDb.db);
    const r = q.find((i) => idOf(i) === "q_listing_r")!;

    // The listing row is five weeks older than everything else in the queue, and both its own
    // created_at and its FIRST listing_review row would put it at the very top.
    expect(r.submittedAt.getTime()).toBe(T(6).getTime());
    expect(q.at(-1)).toBe(r);

    // Stated the other way round, because this is the failure D-249 names: reading the ORIGINAL
    // submission would put the repeat-resubmitter first.
    expect(r.submittedAt.getTime()).not.toBe(T(1, 7).getTime());
  });

  it("case 5 — a listing with NO review row falls back to its own created_at", async () => {
    const q = await loadReviewQueue(testDb.db);
    const c = q.find((i) => idOf(i) === "q_listing_c")!;
    expect(c.submittedAt.getTime()).toBe(T(5).getTime());
  });
});

describe("OPS-04 — every row carries what the reviewer needs, selected once", () => {
  it("case 6 — the listing row carries the whole evidence <dl> and gallery", async () => {
    const q = await loadReviewQueue(testDb.db);
    const b = q.find((i) => idOf(i) === "q_listing_b")!;
    expect(b.kind).toBe("listing");
    if (b.kind !== "listing") return;

    // 18-UI-SPEC § The evidence, per kind — the FULL street address, not just a city.
    expect(b.title).toBe("Title q_listing_b");
    expect(b.description).toBe("Description q_listing_b");
    expect(b.amenities).toEqual(["parking", "wifi"]);
    expect(b.addressLine1).toBe("12 Kalayaan Ave");
    expect(b.addressLine2).toBe("Unit 4B");
    expect(b.city).toBe("Makati");
    expect(b.region).toBe("Metro Manila");
    expect(b.postalCode).toBe("1210");
    expect(b.country).toBe("PH");
    expect(b.primarySpaceType).toBe("pickleball_court");
    expect(b.maxOccupancy).toBe(8);
    expect(b.hourlyRateCents).toBe(120000);
    expect(b.dayRateCents).toBe(600000);
    expect(b.currency).toBe("php");

    // The host's name AND their CURRENT verification status — both terms of the sell-gate, one of
    // which is not on this row's own record (D-224).
    expect(b.hostId).toBe(LISTING_HOST);
    expect(b.hostName).toBe("Lila Host");
    expect(b.hostVerificationStatus).toBe("approved");

    // The photos, in position order, so the page performs no second query per row.
    expect(b.photos.map((p) => p.id)).toEqual(["q_ph_b1", "q_ph_b2"]);
    expect(b.photos[0].url).toBe("https://x/b1.jpg");
    expect(b.photos[0].position).toBe(0);
    expect(b).toMatchObject({
      operatingHours: [
        { dayOfWeek: 1, openTime: "06:00:00", closeTime: "10:00:00" },
        { dayOfWeek: 1, openTime: "16:00:00", closeTime: "21:00:00" },
      ],
    });
  });

  it("case 7 — empty child aggregates yield [], and an unchecked host reads 'unverified'", async () => {
    const q = await loadReviewQueue(testDb.db);
    const c = q.find((i) => idOf(i) === "q_listing_c")!;
    if (c.kind !== "listing") throw new Error("expected a listing row");

    // json_agg over an empty set is NULL, not '[]' — a null would reach the row component.
    expect(c.photos).toEqual([]);
    expect(c.description).toBeNull();
    expect(c.amenities).toEqual([]);
    expect(c.operatingHours).toEqual([]);

    // FAIL-CLOSED at the nullable join: this host has NO host_verification row at all, and the
    // sell-gate's own answer for that state is 'unverified' (D-224). A NULL here would render as a
    // blank cell and read as "fine".
    expect(c.hostVerificationStatus).toBe("unverified");
  });

  it("case 7b — the grouped impact map preserves the established per-listing contract", async () => {
    const queue = await loadReviewQueue(testDb.db);
    const listingIds = queue.flatMap((item) => (item.kind === "listing" ? [item.listingId] : []));
    const impacts = await loadOpsCancelImpacts(testDb.db, listingIds);

    expect(impacts.size).toBe(listingIds.length);
    await Promise.all(
      listingIds.map(async (listingId) => {
        expect(impacts.get(listingId)).toEqual(await loadOpsCancelImpact(testDb.db, listingId));
      }),
    );
  });

  it("case 8 — the host row carries the four <dl> facts, the waiting count, and NO document field", async () => {
    const q = await loadReviewQueue(testDb.db);
    const h1 = q.find((i) => idOf(i) === HOST_1)!;
    if (h1.kind !== "host") throw new Error("expected a host row");

    expect(h1.hostName).toBe("Hana One");
    expect(h1.accountCreatedAt.getTime()).toBe(T(3, 6).getTime());
    expect(h1.emailVerified).toBe(true);
    expect(h1.submittedAt.getTime()).toBe(T(2).getTime());

    const h2 = q.find((i) => idOf(i) === HOST_2)!;
    if (h2.kind !== "host") throw new Error("expected a host row");
    expect(h2.emailVerified).toBe(false); // both values, or the field proves nothing

    // ⚠ HVER-02 / D-206, as a KEY-SET EQUALITY rather than a deny-list. `host_verification` has no
    // column for a document, an ID number or an image, so there is nothing to render — and
    // 18-UI-SPEC forbids even the AFFORDANCE for one (no panel, no empty state, no disabled
    // control). A deny-list naming `document`/`idNumber`/`image` passes the day somebody picks a
    // fourth word; this reddens for any new field, named anything.
    expect(Object.keys(h1).sort()).toEqual(
      [
        "accountCreatedAt",
        "emailVerified",
        "hostName",
        "kind",
        "listingsWaiting",
        "submittedAt",
        "userId",
      ].sort(),
    );
  });

  it("case 9 — `listingsWaiting` counts exactly the listings that are themselves in the queue", async () => {
    const q = await loadReviewQueue(testDb.db);
    const h1 = q.find((i) => idOf(i) === HOST_1)!;
    if (h1.kind !== "host") throw new Error("expected a host row");

    // HOST_1 owns nothing waiting; the fixture's listings belong to LISTING_HOST / UNCHECKED_HOST.
    expect(h1.listingsWaiting).toBe(0);

    // A positive control, so the count is not measured only where it is zero: put HOST_2 in front of
    // three of its own waiting listings and one of each excluded kind.
    await makeListing("q_h2_l1", { hostId: HOST_2, createdAt: T(7) });
    await makeListing("q_h2_l2", { hostId: HOST_2, createdAt: T(8) });
    await makeListing("q_h2_l3", { hostId: HOST_2, createdAt: T(9), status: "unlisted" });
    await makeListing("q_h2_out_draft", { hostId: HOST_2, createdAt: T(9), status: "draft" });
    await makeListing("q_h2_out_appr", { hostId: HOST_2, createdAt: T(9), reviewState: "approved" });

    const q2 = await loadReviewQueue(testDb.db);
    const h2 = q2.find((i) => idOf(i) === HOST_2)!;
    if (h2.kind !== "host") throw new Error("expected a host row");
    expect(h2.listingsWaiting).toBe(3);

    // And the same predicate governs membership, so the count and the list cannot disagree.
    const ids = q2.map(idOf);
    expect(ids).toContain("q_h2_l3"); // unlisted IS reviewable
    expect(ids).not.toContain("q_h2_out_draft");
    expect(ids).not.toContain("q_h2_out_appr");
  });
});

describe("SC1 — the host queue fills from ORDINARY PRODUCT USE, in created_at ASC position", () => {
  it("case 10 — driving requestHostVerification() puts a host item BETWEEN two listing items", async () => {
    // ── The host who has never been checked, signed in and about to ask. ────────────────────────
    const [sc1] = await testDb.db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, SC1_EMAIL));
    expect(
      await testDb.db
        .select({ userId: hostVerification.userId })
        .from(hostVerification)
        .where(eq(hostVerification.userId, sc1.id)),
      "the fixture must start with NO verification row — that is the state the product has to be able to leave",
    ).toEqual([]);

    // A listing already waiting, submitted BEFORE the host will ask. Its `submittedAt` is
    // 2026-08-10, and everything the action writes carries the real clock, so this one sorts first.
    await makeListing("q_sc1_before", { createdAt: T(19, 7) });
    await makeReview("q_sc1_rev_before", "q_sc1_before", T(10));

    // ── SIGN IN AND PRESS THE CONTROL. This is the only line in the file that is the PRODUCT. ────
    const signedIn = await testAuth.api.signInEmail({
      body: { email: SC1_EMAIL, password: SC1_PASSWORD },
      asResponse: true,
    });
    const setCookie = signedIn.headers.get("set-cookie");
    sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";

    const fetchMock = vi
      .fn()
      // A FRESH `Response` per call: a body may be read only once, and a shared instance turns the
      // second press into a vendor failure for a reason that exists nowhere in the product.
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(SC1_SESSION), { status: 201 })),
      );
    vi.stubEnv("DIDIT_API_KEY", SC1_API_KEY);
    vi.stubEnv("DIDIT_WORKFLOW_ID", SC1_WORKFLOW_ID);
    vi.stubGlobal("fetch", fetchMock);
    try {
      const res = await requestHostVerification({ phone: "+63 917 000 0009" });
      expect(res.ok, "the submission must succeed for a confirmed-email host with a phone").toBe(
        true,
      );
      // The vendor was really asked — a fail-closed refusal returns a sentence, not a row, and a
      // case that only read the row could not tell the two apart.
      expect(fetchMock.mock.calls).toHaveLength(1);
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }

    // The submission's own instant — the value the queue's ORDER BY reads.
    const [hostRow] = await testDb.db
      .select({ createdAt: hostVerification.createdAt, status: hostVerification.status })
      .from(hostVerification)
      .where(eq(hostVerification.userId, sc1.id));
    expect(hostRow.status).toBe("pending");

    // A listing submitted a minute AFTER the host asked, so the host row has a neighbour on both
    // sides and the assertion below is a genuine INTERLEAVE rather than "it came last".
    const afterAt = new Date(hostRow.createdAt.getTime() + 60_000);
    await makeListing("q_sc1_after", { createdAt: afterAt });

    // ── THE CLAIM. ──────────────────────────────────────────────────────────────────────────────
    const q = await loadReviewQueue(testDb.db);
    const ids = q.map(idOf);

    const beforeIndex = ids.indexOf("q_sc1_before");
    const hostIndex = ids.indexOf(sc1.id);
    const afterIndex = ids.indexOf("q_sc1_after");

    // ⚠ THE MUTATION TARGET. Comment out the guarded upsert in the action and this is the line that
    // reddens: with no row written, the host is simply not in the queue and `indexOf` is -1.
    expect(hostIndex, "the submitted host must BE in the queue").toBeGreaterThan(-1);
    expect(beforeIndex).toBeGreaterThan(-1);
    expect(afterIndex).toBeGreaterThan(-1);

    // Interleaved by TIME, not grouped by kind — the property no per-item assertion can see.
    expect(beforeIndex).toBeLessThan(hostIndex);
    expect(hostIndex).toBeLessThan(afterIndex);

    const hostItem = q[hostIndex];
    expect(hostItem.kind).toBe("host");
    if (hostItem.kind !== "host") return;
    expect(hostItem.userId).toBe(sc1.id);
    expect(hostItem.hostName).toBe("Sam Submits");
    expect(hostItem.emailVerified).toBe(true);
    // The wait clock IS the row's `created_at` — the same column FINDING F-1 makes mutable, so a
    // resubmitter re-enters here rather than at their original instant.
    expect(hostItem.submittedAt.getTime()).toBe(hostRow.createdAt.getTime());

    // And the ordering property itself, across the whole queue, so the case does not rest solely on
    // three indices.
    for (let i = 1; i < q.length; i++) {
      expect(q[i].submittedAt.getTime()).toBeGreaterThanOrEqual(q[i - 1].submittedAt.getTime());
    }
  });
});
