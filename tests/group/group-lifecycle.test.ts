// The group lifecycle (GROUP-01/02/05 · D-111/D-118/D-119/D-120/D-121) — create, invite, RSVP, manage.
//
// Harness: the REAL server actions through the `vi.doMock` idiom against an isolated schema, cloned from
// tests/security/cancel-owner-gate.test.ts. Nothing here stubs the group logic itself — the actions run
// against a real Postgres with the real seat-claim, so "the seat was freed" is a fact about the database
// rather than about a mock.
//
// THE FIVE PROPERTIES UNDER TEST:
//   1. D-119 — a group can be created ONLY on a confirmed booking the caller owns, and the denial for
//      "not confirmed", "not yours" and "does not exist" is the SAME sentence (no enumeration oracle).
//   2. D-111/D-113 — `capacity_snapshot` equals the LISTING's maxOccupancy MINUS the organizer's own seat
//      (`GREATEST(max_occupancy - 1, 0)`, WR-03), frozen at creation, and a later edit to the listing does
//      not move it. Every `seedListing` cap below is therefore ONE MORE than the RSVP-able seats the case
//      is about: a listing rated for 6 people seats the organizer plus 5 yes-RSVPs.
//   3. D-118 — the access token is minted (20 Crockford symbols), and `createGroup` is idempotent: a second
//      call returns the SAME group rather than a second one.
//   4. D-121 — `regenerateLink` kills the old link (which then renders identically to an unknown one) while
//      keeping everyone who already RSVP'd, and `removeAttendee` genuinely FREES a seat: a group at its cap
//      refuses a new yes, and accepts it after a removal.
//   5. D-120 — RSVPs are refused once the session has started, against the DB clock.
//
// The rate limiter is stubbed to always-allow (the real one is a module-level Map with a 5-per-60s budget,
// which would turn later cases into rate-limit denials); the SAME note applies here as in
// tests/booking/cancellation.test.ts. The guest-email BUDGET is exercised for real in guest-email-guard.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { sql } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, booking, bookingGroup } from "@/lib/db/schema";
import { readDbNow } from "@/lib/booking/bookings-query";
import { getGroupByToken, getRoster } from "@/lib/group/rsvp";
import type { RateLimitOptions, RateLimitResult } from "@/lib/rate-limit";

const HOUR = 60 * 60 * 1000;
const PASSWORD = "averylongpassword";
const HOST_EMAIL = "gl_host@example.com";
const ORG_EMAIL = "gl_organizer@example.com";
const STRANGER_EMAIL = "gl_stranger@example.com";
const ATTENDEE_EMAIL = "gl_attendee@example.com";

const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

type SentEvent = { name: string; data: Record<string, unknown> };
const inngestSend = vi.fn(async (event: SentEvent) => {
  void event;
  return { ids: [] as string[] };
});
const alwaysAllow = (key: string, opts: RateLimitOptions): RateLimitResult => {
  void key;
  void opts;
  return { ok: true };
};

let testDb: TestDb;
let testAuth: TestAuth;
type GroupActions = typeof import("@/app/actions/group");
let createGroup: GroupActions["createGroup"];
let submitRsvp: GroupActions["submitRsvp"];
let removeAttendee: GroupActions["removeAttendee"];
let regenerateLink: GroupActions["regenerateLink"];
type CancelActions = typeof import("@/app/actions/cancel-booking");
let cancelBookingAsBooker: CancelActions["cancelBookingAsBooker"];
let cancelBookingAsHost: CancelActions["cancelBookingAsHost"];

let hostId: string;
let organizerId: string;
let strangerId: string;
let attendeeId: string;

const events = () => inngestSend.mock.calls.map((c) => c[0]);
const notifiesOf = (type: string) =>
  events().filter((e) => e.name === "fitout/notify" && e.data.type === type);
const guestEmailsOf = (kind: string) =>
  events().filter((e) => e.name === "fitout/guest-email" && e.data.kind === kind);

/** Distinct windows per listing so the GiST exclusion never fires for an unrelated reason. */
let slot = 0;

// recordAudit's v1 sink is a single structured `console.info("[audit]", <json>)` line (src/lib/audit.ts —
// deliberately NOT a table yet), so the denial assertion reads the emitted line. Idiom lifted verbatim from
// tests/booking/checkout-session-expire.test.ts.
let infoSpy: ReturnType<typeof vi.spyOn>;
type AuditLine = { action: string; outcome: string; meta?: Record<string, unknown> };
function auditLines(): AuditLine[] {
  // `calls` is re-typed once here rather than annotating each callback — a hand-written spy type is exactly
  // what let vitest pass while tsc failed in 08-12.
  const calls = infoSpy.mock.calls as unknown as unknown[][];
  return calls
    .filter((c) => c[0] === "[audit]")
    .map((c) => JSON.parse(String(c[1])) as AuditLine);
}

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

async function seedListing(id: string, maxOccupancy: number): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `Listing ${id}`,
    status: "published",
    bookingMode: "instant",
    unitCount: 1,
    maxOccupancy,
    timezone: "Asia/Manila",
    city: "Makati",
    addressLine1: "1 Test Street",
    hourlyRateCents: 100000,
    dayRateCents: 300000,
    cancellationPolicy: "standard",
  });
}

async function seedBooking(
  id: string,
  listingId: string,
  bookerId: string,
  status: "confirmed" | "approved",
  when: "future" | "past" = "future",
): Promise<void> {
  const base = await readDbNow(testDb.db);
  slot += 1;
  const startsAt =
    when === "future"
      ? new Date(base.getTime() + (10 + slot * 3) * HOUR)
      : new Date(base.getTime() - (10 + slot * 3) * HOUR);
  await testDb.db.insert(booking).values({
    id,
    listingId,
    unit: 1,
    bookerId,
    startsAt,
    endsAt: new Date(startsAt.getTime() + HOUR),
    status,
    bookingMode: "instant",
    cancellationPolicy: "standard",
    spacePriceCents: 100000,
    serviceFeeCents: 5000,
    quotedTotalCents: 105000,
    currency: "php",
    // A confirmed booking carries a captured payment, so the cancel paths reach their real refund branch.
    paymentId: status === "confirmed" ? `pay_${id}` : null,
    paymentMethod: status === "confirmed" ? "gcash" : null,
  });
}

async function groupRow(bookingId: string) {
  const rows = (await testDb.db.execute(sql`
    SELECT id, capacity_snapshot AS "capacitySnapshot", access_token AS "accessToken",
           voided_at AS "voidedAt"
    FROM booking_group WHERE booking_id = ${bookingId}
  `)) as unknown as {
    id: string;
    capacitySnapshot: number;
    accessToken: string;
    voidedAt: string | null;
  }[];
  return rows;
}

beforeAll(async () => {
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "GL Host",
    firstName: "GLHost",
    intent: "host",
  });
  await signUp(testAuth, {
    email: ORG_EMAIL,
    password: PASSWORD,
    name: "Olive Organizer",
    firstName: "Olive",
    intent: "book",
  });
  await signUp(testAuth, {
    email: STRANGER_EMAIL,
    password: PASSWORD,
    name: "Stan Stranger",
    firstName: "Stan",
    intent: "book",
  });
  await signUp(testAuth, {
    email: ATTENDEE_EMAIL,
    password: PASSWORD,
    name: "Ada Account",
    firstName: "Ada",
    intent: "book",
  });

  const ids = await testDb.db.select({ id: user.id, email: user.email }).from(user);
  hostId = ids.find((u) => u.email === HOST_EMAIL)!.id;
  organizerId = ids.find((u) => u.email === ORG_EMAIL)!.id;
  strangerId = ids.find((u) => u.email === STRANGER_EMAIL)!.id;
  attendeeId = ids.find((u) => u.email === ATTENDEE_EMAIL)!.id;

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/inngest/client", () => ({ inngest: { send: inngestSend } }));
  vi.doMock("@/lib/paymongo", () => ({
    createRefund: mockPayMongo.createRefund,
    createCheckoutSession: mockPayMongo.createCheckoutSession,
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    createRefundTransfer: mockPayMongo.createBatchTransfer,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
    listReceivingInstitutions: async () => [],
    INSTAPAY_CEILING_CENTS: 5_000_000,
  }));
  vi.doMock("@/lib/rate-limit", () => ({
    rateLimit: alwaysAllow,
    requireWithinRateLimit: alwaysAllow,
  }));
  vi.resetModules();
  ({ createGroup, submitRsvp, removeAttendee, regenerateLink } = await import(
    "@/app/actions/group"
  ));
  ({ cancelBookingAsBooker, cancelBookingAsHost } = await import(
    "@/app/actions/cancel-booking"
  ));

  // Each rating is the RSVP-able seats the case needs PLUS ONE for the organizer (D-113 · WR-03), so every
  // assertion below still tests the cap it was written to test.
  await seedListing("L_gl_main", 6); // → capacity_snapshot 5
  await seedListing("L_gl_cap", 3); // → capacity_snapshot 2
  await seedListing("L_gl_past", 5); // → capacity_snapshot 4
  await seedListing("L_gl_cancel", 7); // → capacity_snapshot 6

  // WR-03 fixtures. These name their OWN rating because the rating IS the thing under test — the point of
  // each is the arithmetic between `listing.max_occupancy` and the frozen `capacity_snapshot`.
  await seedListing("L_gl_wr03_12", 12);
  await seedListing("L_gl_wr03_2", 2);
  await seedListing("L_gl_wr03_1", 1);
  await seedListing("L_gl_wr03_fill", 3);

  await seedBooking("bk_gl_confirmed", "L_gl_main", organizerId, "confirmed");
  await seedBooking("bk_gl_unpaid", "L_gl_main", organizerId, "approved");
  await seedBooking("bk_gl_stranger", "L_gl_main", strangerId, "confirmed");
  await seedBooking("bk_gl_cap", "L_gl_cap", organizerId, "confirmed");
  await seedBooking("bk_gl_past", "L_gl_past", organizerId, "confirmed", "past");
  await seedBooking("bk_gl_regen", "L_gl_main", organizerId, "confirmed");
  await seedBooking("bk_gl_cancel_booker", "L_gl_cancel", organizerId, "confirmed");
  await seedBooking("bk_gl_cancel_host", "L_gl_cancel", organizerId, "confirmed");
  await seedBooking("bk_gl_cancel_self", "L_gl_cancel", organizerId, "confirmed");
  await seedBooking("bk_gl_wr03_12", "L_gl_wr03_12", organizerId, "confirmed");
  await seedBooking("bk_gl_wr03_2", "L_gl_wr03_2", organizerId, "confirmed");
  await seedBooking("bk_gl_wr03_1", "L_gl_wr03_1", organizerId, "confirmed");
  await seedBooking("bk_gl_wr03_fill", "L_gl_wr03_fill", organizerId, "confirmed");
});

afterAll(async () => {
  infoSpy.mockRestore();
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/inngest/client");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("@/lib/rate-limit");
  await teardownTestDb(testDb);
});

beforeEach(() => {
  inngestSend.mockClear();
  infoSpy.mockClear();
});

describe("createGroup — D-119 owner + confirmed gate", () => {
  it("creates a group on a confirmed booking the caller owns, snapshotting the listing cap (D-111)", async () => {
    await login(ORG_EMAIL);
    const res = await createGroup("bk_gl_confirmed");
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("unreachable");
    expect(res.alreadyExisted).toBe(false);

    const rows = await groupRow("bk_gl_confirmed");
    expect(rows).toHaveLength(1);
    // D-111 — the cap comes from the LISTING, transactionally, and is never client-proposed. D-113 — with
    // the organizer's own seat reserved out of it: the listing is rated 6, so 5 invitees can say yes.
    expect(rows[0].capacitySnapshot).toBe(5);
    // D-118 — 20 Crockford symbols of crypto-random, and no "FIT-" display prefix.
    expect(rows[0].accessToken).toMatch(/^[0-9A-HJKMNP-TV-Z]{20}$/);
    expect(rows[0].accessToken).toBe(res.accessToken);
    expect(rows[0].voidedAt).toBeNull();
  });

  it("is idempotent — a second call returns the SAME group, never a second row", async () => {
    await login(ORG_EMAIL);
    const first = await groupRow("bk_gl_confirmed");
    const again = await createGroup("bk_gl_confirmed");
    expect(again.ok).toBe(true);
    if (!again.ok) throw new Error("unreachable");
    expect(again.alreadyExisted).toBe(true);
    expect(again.groupId).toBe(first[0].id);
    expect(again.accessToken).toBe(first[0].accessToken);
    expect(await groupRow("bk_gl_confirmed")).toHaveLength(1);
  });

  it("refuses a NON-confirmed booking and creates NO row", async () => {
    await login(ORG_EMAIL);
    const res = await createGroup("bk_gl_unpaid");
    expect(res.ok).toBe(false);
    expect(await groupRow("bk_gl_unpaid")).toHaveLength(0);
  });

  it("refuses a CROSS-USER booking with the IDENTICAL denial, and creates NO row", async () => {
    await login(ORG_EMAIL);
    const crossUser = await createGroup("bk_gl_stranger"); // real, confirmed — but Stan's
    const notConfirmed = await createGroup("bk_gl_unpaid"); // real, mine — but unpaid
    const missing = await createGroup("bk_gl_does_not_exist");
    if (crossUser.ok || notConfirmed.ok || missing.ok) throw new Error("all three must be denials");

    // THE ORACLE ASSERTION — the three denials are compared to EACH OTHER, not to a literal. If they
    // differed, walking booking ids would reveal which are real and which are paid.
    expect(crossUser.error).toBe(missing.error);
    expect(notConfirmed.error).toBe(missing.error);
    expect(crossUser.error).not.toMatch(/stan/i);
    expect(await groupRow("bk_gl_stranger")).toHaveLength(0);
  });

  it("refuses a signed-OUT caller and changes nothing", async () => {
    sessionHeaders.cookie = "";
    const res = await createGroup("bk_gl_cap");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/sign in/i);
    expect(await groupRow("bk_gl_cap")).toHaveLength(0);
  });

  it("keeps the snapshot frozen when the host later changes the listing's capacity (D-111)", async () => {
    await login(ORG_EMAIL);
    const before = await groupRow("bk_gl_confirmed");
    await testDb.db.execute(sql`UPDATE listing SET max_occupancy = 99 WHERE id = 'L_gl_main'`);
    const after = await groupRow("bk_gl_confirmed");
    expect(after[0].capacitySnapshot).toBe(before[0].capacitySnapshot);
    expect(after[0].capacitySnapshot).toBe(5);
    await testDb.db.execute(sql`UPDATE listing SET max_occupancy = 6 WHERE id = 'L_gl_main'`);
  });
});

// ── WR-03 · D-113 — the organizer's seat is reserved OUT of the cap ────────────────────────────────────────
//
// ⚠️ MUTATION-VERIFY (A). Revert `src/app/actions/group.ts`'s INSERT ... SELECT from
// `GREATEST(l.max_occupancy - 1, 0)` back to a bare `l.max_occupancy` and this block MUST go red — the
// snapshot cases on the frozen number itself (`expected 12 to be 11`) and the fill case on the committed
// roster (`expected 3 to be 2`). Both failures name a fact about the DATABASE rather than a downstream
// message, which is the point: the defect is a body in the room, not a sentence on a screen.
describe("createGroup — the cap reserves the organizer's own place (WR-03 · D-113)", () => {
  it("a listing rated for 12 freezes capacity_snapshot = 11 — 11 invitees plus the organizer is 12", async () => {
    await login(ORG_EMAIL);
    const res = await createGroup("bk_gl_wr03_12");
    expect(res.ok).toBe(true);

    const [row] = await groupRow("bk_gl_wr03_12");
    expect(row.capacitySnapshot).toBe(11);
  });

  it("the smallest group-capable listing (rated 2) freezes capacity_snapshot = 1 — one invitee", async () => {
    await login(ORG_EMAIL);
    const res = await createGroup("bk_gl_wr03_2");
    expect(res.ok).toBe(true);

    const [row] = await groupRow("bk_gl_wr03_2");
    expect(row.capacitySnapshot).toBe(1);
  });

  it("a listing rated for 1 CANNOT host a group — the only seat is the organizer's", async () => {
    await login(ORG_EMAIL);
    const denied = await createGroup("bk_gl_wr03_1");
    expect(denied.ok).toBe(false);

    // (1) NOTHING was written. A group with a capacity_snapshot of 0 would be immutable by D-111 and
    //     unjoinable forever, so the right answer is no row at all.
    expect(await groupRow("bk_gl_wr03_1")).toHaveLength(0);

    // (2) The audit records WHY, on the shared v1 console sink.
    const denials = auditLines().filter((a) => a.action === "create_group" && a.outcome === "denied");
    expect(denials).toHaveLength(1);
    expect(denials[0].meta).toMatchObject({ reason: "no_capacity", bookingId: "bk_gl_wr03_1" });

    // (3) …and the caller is told nothing they could distinguish. "This listing can't host a group" and
    //     "that booking isn't yours" are the SAME sentence, compared to each other rather than to a literal.
    const missing = await createGroup("bk_gl_does_not_exist");
    if (denied.ok || missing.ok) throw new Error("both must be denials");
    expect(denied.error).toBe(missing.error);
  });

  it("a listing rated for 3 seats TWO invitees plus the organizer — the rating exactly, never one over", async () => {
    await login(ORG_EMAIL);
    const created = await createGroup("bk_gl_wr03_fill");
    if (!created.ok) throw new Error("setup: group must be created");

    sessionHeaders.cookie = "";
    expect((await submitRsvp(created.accessToken, { name: "First Fay", answer: "yes" })).ok).toBe(true);
    expect((await submitRsvp(created.accessToken, { name: "Second Sid", answer: "yes" })).ok).toBe(true);
    const third = await submitRsvp(created.accessToken, { name: "Third Thea", answer: "yes" });

    // THE ACTUAL PROPERTY (SC4), ASSERTED FIRST AND OFF THE DATABASE. The bodies are the defect — the
    // refusal sentence and the frozen number below are how it is achieved. Ordering matters: if the message
    // came first, removing the fix would fail this case on a string, and a mutation's failure should name
    // the over-cap itself (the 08-16 lesson).
    const roster = await getRoster(testDb.db, { groupId: created.groupId, organizerId });
    const yes = roster.filter((r) => r.status === "yes");
    expect(yes).toHaveLength(2);
    expect(yes.length + 1).toBe(3); // + the organizer, who holds a seat without holding an rsvp row

    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.error).toMatch(/just filled up — all 2 spots/i);
    expect((await groupRow("bk_gl_wr03_fill"))[0].capacitySnapshot).toBe(2);
  });
});

describe("submitRsvp — the public token path (GROUP-03 · D-116/D-120)", () => {
  it("accepts a name-only guest with NO session at all", async () => {
    await login(ORG_EMAIL);
    const created = await createGroup("bk_gl_cap");
    if (!created.ok) throw new Error("setup: group must be created");

    sessionHeaders.cookie = ""; // a stranger with the link — the whole point of GROUP-03
    const res = await submitRsvp(created.accessToken, { name: "Nameless Nadia", answer: "yes" });
    expect(res).toEqual({ ok: true, status: "yes", reachable: false });

    const roster = await getRoster(testDb.db, {
      groupId: created.groupId,
      organizerId,
    });
    expect(roster.map((r) => r.name)).toEqual(["Nameless Nadia"]);
    expect(roster[0].hasEmail).toBe(false);
  });

  it("refuses an unknown token with the SAME sentence a revoked one gets (T-08-17)", async () => {
    sessionHeaders.cookie = "";
    const unknown = await submitRsvp("ZZZZZZZZZZZZZZZZZZZZ", { name: "Nobody", answer: "yes" });
    const malformed = await submitRsvp("not-a-token", { name: "Nobody", answer: "yes" });
    if (unknown.ok || malformed.ok) throw new Error("both must be denials");
    expect(unknown.error).toBe(malformed.error);
    expect(unknown.error).toMatch(/no longer active/i);
  });

  it("refuses once the session has started — the DB clock decides (D-120)", async () => {
    await login(ORG_EMAIL);
    const created = await createGroup("bk_gl_past");
    if (!created.ok) throw new Error("setup: group must be created");

    sessionHeaders.cookie = "";
    const res = await submitRsvp(created.accessToken, { name: "Late Larry", answer: "yes" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/RSVPs have closed/i);

    // Nothing was written — a closed RSVP is refused, not recorded and hidden.
    expect(
      await getRoster(testDb.db, { groupId: created.groupId, organizerId }),
    ).toEqual([]);
  });

  it("tells the organizer someone answered (post-commit emit)", async () => {
    await login(ORG_EMAIL);
    const [g] = await groupRow("bk_gl_confirmed");
    sessionHeaders.cookie = "";
    inngestSend.mockClear();
    await submitRsvp(g.accessToken, { name: "Ronan RSVP", answer: "yes" });

    const events = inngestSend.mock.calls.map((c) => c[0]);
    const received = events.filter(
      (e) => e.name === "fitout/notify" && e.data.type === "group_rsvp_received",
    );
    expect(received).toHaveLength(1);
    expect(received[0].data.recipientId).toBe(organizerId);
    const payload = received[0].data.payload as { attendeeLabel: string; answer: string; href: string };
    expect(payload.attendeeLabel).toBe("Ronan RSVP");
    expect(payload.answer).toBe("yes");
    // 07-10 convention: absolute href, because the same string is the email CTA.
    expect(payload.href).toMatch(/^https?:\/\/.+\/bookings\/bk_gl_confirmed\/group$/);
  });
});

describe("removeAttendee — D-121 frees a seat through the group-row lock", () => {
  it("a full group refuses a new yes, and accepts it once a seat is freed", async () => {
    await login(ORG_EMAIL);
    const [g] = await groupRow("bk_gl_cap"); // capacity_snapshot = 2, one guest already yes
    sessionHeaders.cookie = "";

    // Fill it: one from the previous case + one here = 2 of 2.
    expect((await submitRsvp(g.accessToken, { name: "Second Sam", answer: "yes" })).ok).toBe(true);
    const full = await submitRsvp(g.accessToken, { name: "Third Tina", answer: "yes" });
    expect(full.ok).toBe(false);
    if (!full.ok) expect(full.error).toMatch(/just filled up — all 2 spots/i);

    // Free one — and prove it is the SEAT that moved, not the copy.
    const roster = await getRoster(testDb.db, { groupId: g.id, organizerId });
    await login(ORG_EMAIL);
    // STATE-08 (plan 13-05) — THE RESULT NOW CARRIES THE TWO FIGURES THE ORGANIZER IS SHOWN, and this
    // is the one place they are checked against a real database. The alert that renders them is a
    // client component with a mocked action (`tests/group/state08-alerts.test.tsx`), so it asserts the
    // SENTENCE and deliberately says nothing about the arithmetic; this asserts the arithmetic.
    //
    // Both numbers are pinned by VALUE rather than by an expression, because an expression here would
    // be the same derivation the action performs and would agree with itself however wrong it was:
    //   · `capacity_snapshot` is 2 and one of the two `yes` rows was just deleted, so ONE `rsvp` seat
    //     is claimable — which the very next line proves independently by claiming it.
    //   · `attending` is TWO, not one: `capacity_snapshot` caps `rsvp` rows and the organizer never
    //     occupies one, so the raw count is organizer-EXCLUSIVE and D-113 adds them back exactly once
    //     for the surface whose audience they are. A `1` here would be the off-book count that made
    //     the meter and the roster disagree (WR-04's shape), and a `3` would be the same `+ 1` applied
    //     twice.
    expect(await removeAttendee(roster[0].rsvpId)).toEqual({
      ok: true,
      attending: 2,
      spotsFree: 1,
    });

    sessionHeaders.cookie = "";
    const nowFits = await submitRsvp(g.accessToken, { name: "Third Tina", answer: "yes" });
    expect(nowFits).toEqual({ ok: true, status: "yes", reachable: false });
  });

  it("refuses a cross-user removal and leaves the row in place", async () => {
    const [g] = await groupRow("bk_gl_cap");
    const roster = await getRoster(testDb.db, { groupId: g.id, organizerId });
    const target = roster[0].rsvpId;

    await login(STRANGER_EMAIL);
    const res = await removeAttendee(target);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/couldn't find that booking, or it isn't yours/i);

    // Still there — the stranger's attempt did not touch someone else's roster.
    expect(
      (await getRoster(testDb.db, { groupId: g.id, organizerId })).some((r) => r.rsvpId === target),
    ).toBe(true);
  });

  it("a cross-user removal and a missing rsvp id return the IDENTICAL denial", async () => {
    await login(STRANGER_EMAIL);
    const [g] = await groupRow("bk_gl_cap");
    const roster = await getRoster(testDb.db, { groupId: g.id, organizerId });
    const crossUser = await removeAttendee(roster[0].rsvpId);
    const missing = await removeAttendee("rsvp_does_not_exist");
    if (crossUser.ok || missing.ok) throw new Error("both must be denials");
    expect(crossUser.error).toBe(missing.error);
  });
});

describe("regenerateLink — D-121 kills the leaked link, keeps the people", () => {
  it("mints a new token; the old one resolves EXACTLY like an unknown one", async () => {
    await login(ORG_EMAIL);
    const created = await createGroup("bk_gl_regen");
    if (!created.ok) throw new Error("setup: group must be created");
    const oldToken = created.accessToken;

    // Someone RSVPs on the old link first — they must survive the rotation.
    sessionHeaders.cookie = "";
    expect((await submitRsvp(oldToken, { name: "Early Ella", answer: "yes" })).ok).toBe(true);

    await login(ORG_EMAIL);
    const rotated = await regenerateLink(created.groupId);
    expect(rotated.ok).toBe(true);
    if (!rotated.ok) throw new Error("unreachable");
    expect(rotated.accessToken).not.toBe(oldToken);
    expect(rotated.accessToken).toMatch(/^[0-9A-HJKMNP-TV-Z]{20}$/);

    // The old credential is now indistinguishable from one that never existed (T-08-17).
    const stale = await getGroupByToken(testDb.db, oldToken);
    const unknown = await getGroupByToken(testDb.db, "ZZZZZZZZZZZZZZZZZZZZ");
    expect(stale).toEqual(unknown);

    sessionHeaders.cookie = "";
    const onStale = await submitRsvp(oldToken, { name: "Late Lena", answer: "yes" });
    expect(onStale.ok).toBe(false);
    if (!onStale.ok) expect(onStale.error).toMatch(/no longer active/i);

    // The NEW link works, and Ella is still on the list — regenerating kills the link, not the group.
    expect((await submitRsvp(rotated.accessToken, { name: "New Nina", answer: "yes" })).ok).toBe(true);
    const roster = await getRoster(testDb.db, { groupId: created.groupId, organizerId });
    expect(roster.map((r) => r.name).sort()).toEqual(["Early Ella", "New Nina"]);
  });

  it("refuses a cross-user regeneration and leaves the token untouched", async () => {
    const [g] = await groupRow("bk_gl_regen");
    await login(STRANGER_EMAIL);
    const res = await regenerateLink(g.id);
    expect(res.ok).toBe(false);
    const after = await groupRow("bk_gl_regen");
    expect(after[0].accessToken).toBe(g.accessToken);
  });

  it("refuses to regenerate a VOIDED group (a cancelled booking's invites stay dead)", async () => {
    await login(ORG_EMAIL);
    const [g] = await groupRow("bk_gl_regen");
    await testDb.db
      .update(bookingGroup)
      .set({ voidedAt: new Date() })
      .where(sql`id = ${g.id}`);

    const res = await regenerateLink(g.id);
    expect(res.ok).toBe(false);
    const after = await groupRow("bk_gl_regen");
    expect(after[0].accessToken).toBe(g.accessToken);

    // restore for any later case
    await testDb.db.update(bookingGroup).set({ voidedAt: null }).where(sql`id = ${g.id}`);
  });
});

describe("D-121 — cancelling a booking auto-voids its invites and tells the attendees", () => {
  /** Fill a group with one account attendee, one guest-with-email, and one unreachable blank guest. */
  async function seedAttendees(accessToken: string, suffix: string): Promise<void> {
    await login(ATTENDEE_EMAIL);
    expect((await submitRsvp(accessToken, { name: "ignored", answer: "yes" })).ok).toBe(true);
    sessionHeaders.cookie = "";
    expect(
      (await submitRsvp(accessToken, {
        name: "Gina Guest",
        email: `gina_${suffix}@example.com`,
        answer: "yes",
      })).ok,
    ).toBe(true);
    expect(
      (await submitRsvp(accessToken, { name: "Blank Bea", answer: "yes" })).ok,
    ).toBe(true);
    // Someone who declined must NOT be told a session they weren't attending is off.
    expect(
      (await submitRsvp(accessToken, {
        name: "Declining Dana",
        email: `dana_${suffix}@example.com`,
        answer: "no",
      })).ok,
    ).toBe(true);
  }

  it("booker cancellation: voided_at is set, the invite dies, reachable yes attendees are told", async () => {
    await login(ORG_EMAIL);
    const created = await createGroup("bk_gl_cancel_booker");
    if (!created.ok) throw new Error("setup: group must be created");
    await seedAttendees(created.accessToken, "booker");

    await login(ORG_EMAIL);
    inngestSend.mockClear();
    const res = await cancelBookingAsBooker("bk_gl_cancel_booker");
    expect(res.ok).toBe(true);

    // (1) The invite is VOIDED.
    const [g] = await groupRow("bk_gl_cancel_booker");
    expect(g.voidedAt).not.toBeNull();

    // (2) …and the link genuinely stops accepting RSVPs — the acceptance criterion, driven through the
    //     real public action rather than asserted off the column.
    sessionHeaders.cookie = "";
    const afterCancel = await submitRsvp(created.accessToken, {
      name: "Too Late Tom",
      answer: "yes",
    });
    expect(afterCancel.ok).toBe(false);
    if (!afterCancel.ok) expect(afterCancel.error).toMatch(/no longer active/i);

    // (3) Reachable yes attendees are told, once each, on the right channel.
    const cancelled = notifiesOf("group_cancelled");
    expect(cancelled).toHaveLength(1);
    expect(cancelled[0].data.recipientId).toBe(attendeeId);

    const guestMails = guestEmailsOf("group_cancelled");
    expect(guestMails).toHaveLength(1);
    expect(guestMails[0].data.to).toBe("gina_booker@example.com");

    // (4) The blank-email guest is unreachable BY DESIGN, and the decliner is not told either — so the
    //     fan-out is exactly two, not four.
    expect(cancelled.length + guestMails.length).toBe(2);
    expect(JSON.stringify(events())).not.toContain("dana_booker@example.com");

    // (5) The booker's own money notices still fired — the group consequence did not displace them.
    expect(notifiesOf("booking_cancelled_by_booker")).toHaveLength(1);
    expect(notifiesOf("refund_issued")).toHaveLength(1);
  });

  it("host cancellation: the same consequence fires on the host path", async () => {
    await login(ORG_EMAIL);
    const created = await createGroup("bk_gl_cancel_host");
    if (!created.ok) throw new Error("setup: group must be created");
    await seedAttendees(created.accessToken, "host");

    await login(HOST_EMAIL);
    inngestSend.mockClear();
    const res = await cancelBookingAsHost("bk_gl_cancel_host", "maintenance");
    expect(res.ok).toBe(true);

    const [g] = await groupRow("bk_gl_cancel_host");
    expect(g.voidedAt).not.toBeNull();

    expect(notifiesOf("group_cancelled")).toHaveLength(1);
    expect(guestEmailsOf("group_cancelled").map((e) => e.data.to)).toEqual([
      "gina_host@example.com",
    ]);
    // Both parties' host-cancellation notices are untouched (the refund math is not this plan's business).
    expect(notifiesOf("booking_cancelled_by_host")).toHaveLength(2);
    if (res.ok) expect(res.refundCents).toBe(105000);
  });

  it("an organizer who RSVP'd to their OWN group is never notified twice", async () => {
    // The organizer is a legitimate attendee (D-113 — they are person #1), so they can answer their own
    // link. Two de-duplications must then hold, and neither is visible from the other cases: they are not
    // pinged that "someone RSVP'd" about themselves, and at cancellation they get their own cancellation
    // notice ONCE rather than that plus a group_cancelled.
    await login(ORG_EMAIL);
    const created = await createGroup("bk_gl_cancel_self");
    if (!created.ok) throw new Error("setup: group must be created");

    inngestSend.mockClear();
    expect((await submitRsvp(created.accessToken, { name: "ignored", answer: "yes" })).ok).toBe(true);
    expect(notifiesOf("group_rsvp_received")).toHaveLength(0); // no "you RSVP'd to your own booking"
    expect(notifiesOf("group_rsvp_confirmed")).toHaveLength(1); // they ARE an attendee now

    // A reachable guest too, so the fan-out below is genuinely non-empty and the organizer's absence from
    // it means something.
    sessionHeaders.cookie = "";
    expect(
      (await submitRsvp(created.accessToken, {
        name: "Gina Guest",
        email: "gina_self@example.com",
        answer: "yes",
      })).ok,
    ).toBe(true);

    await login(ORG_EMAIL);
    inngestSend.mockClear();
    expect((await cancelBookingAsBooker("bk_gl_cancel_self")).ok).toBe(true);

    const cancelled = notifiesOf("group_cancelled");
    expect(cancelled.map((e) => e.data.recipientId)).not.toContain(organizerId);
    expect(cancelled).toHaveLength(0);
    // The guest still hears about it, and the organizer still gets their own cancellation notices.
    expect(guestEmailsOf("group_cancelled").map((e) => e.data.to)).toEqual([
      "gina_self@example.com",
    ]);
    expect(notifiesOf("booking_cancelled_by_booker")).toHaveLength(1);
    expect(notifiesOf("refund_issued")).toHaveLength(1);
  });

  it("a second cancel attempt notifies nobody twice (the void is idempotent)", async () => {
    await login(ORG_EMAIL);
    inngestSend.mockClear();
    const again = await cancelBookingAsBooker("bk_gl_cancel_booker");
    expect(again.ok).toBe(false); // already cancelled — the status-scoped UPDATE claims 0 rows
    expect(notifiesOf("group_cancelled")).toHaveLength(0);
    expect(guestEmailsOf("group_cancelled")).toHaveLength(0);
  });

  it("cancelling a booking with NO group is a calm no-op", async () => {
    await login(ORG_EMAIL);
    inngestSend.mockClear();
    // bk_gl_stranger belongs to Stan and has no group; cancel Stan's own, groupless booking as Stan.
    await login(STRANGER_EMAIL);
    const res = await cancelBookingAsBooker("bk_gl_stranger");
    expect(res.ok).toBe(true);
    expect(notifiesOf("group_cancelled")).toHaveLength(0);
    expect(guestEmailsOf("group_cancelled")).toHaveLength(0);
  });
});

describe("fixture sanity", () => {
  it("the organizer, the stranger and the host are genuinely different identities", () => {
    expect(organizerId).not.toBe(strangerId);
    expect(organizerId).not.toBe(hostId);
    expect(organizerId).not.toBe(attendeeId);
  });
});
