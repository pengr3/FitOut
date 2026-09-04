// D-93/D-94 approve-time guards on the host approve action (07-05).
//
// `approveRequest` opens the booker's payment window. Two things had to become true here:
//   D-94 CAP   — the window it opens may never outlive the session. Before this, a 2pm approval of a 5pm
//                session stayed payable until 2pm the NEXT DAY: the slot read as held for a whole extra
//                day, and the booker could pay for a session that had already happened.
//   D-93 GUARD — an approve with less than MIN_APPROVE_WINDOW_HOURS left before the session is refused,
//                because the cap would otherwise mint a window too short to be worth anything.
//
// The load-bearing design point for the guard is that it lives in the SAME atomic `WHERE` as the existing
// status + SLA checks. So a too-late approve simply claims 0 rows and falls through to the EXISTING calm
// NOT_PENDING path — no new error branch, no new failure shape, nothing new for a caller to handle, and
// it cannot be raced apart from the status check (T-07-24). These tests assert exactly that: the SAME
// calm result as an already-actioned row, never a 500 and never a new string. The only new observable is
// `decline_reason = 'too_close_to_start'`, recorded so the expiry cron's composer can tell both sides the
// honest reason instead of a generic SLA lapse.
//
// Harness: the REAL approveRequest driven through the vi.doMock idiom (mock next/headers, @/lib/auth,
// @/lib/db, next/cache → import the action) against an isolated schema, cloned from
// tests/booking/request-lifecycle.test.ts § "host approve/decline server actions".

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { user, listing, booking } from "@/lib/db/schema";
import { APPROVAL_PAYMENT_WINDOW_HOURS, MIN_APPROVE_WINDOW_HOURS } from "@/lib/payments/config";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
/** Round-trip tolerance between the DB-clock reading a window is derived from and the UPDATE's own now(). */
const TOL_MS = 5 * 1000;

// The mocked next/headers reads this at CALL time, so login() can swap the session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

let testDb: TestDb;
let testAuth: TestAuth;
type HostRequestActions = typeof import("@/app/actions/host-requests");
let approveRequest: HostRequestActions["approveRequest"];

const BOOKER = "hr_booker";
const HOST_EMAIL = "hr_host@example.com";
const PASSWORD = "averylongpassword";
const HOURLY = 5000;
const DAY_RATE = 30000;
let hostId: string;

async function dbNow(): Promise<Date> {
  const [row] = await testDb.client<{ now: Date | string }[]>`SELECT now() AS "now"`;
  return new Date(row.now);
}

/** A dedicated listing per case, so seeded rows never collide on the booking_no_overlap EXCLUDE. */
async function seedListing(id: string): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `Listing ${id}`,
    status: "published",
    bookingMode: "request",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Makati",
    hourlyRateCents: HOURLY,
    dayRateCents: DAY_RATE,
  });
}

/**
 * Seed a live `requested` hold whose session starts `msToStart` from the DB clock. `expires_at` is set
 * inside that window so the SLA guard (`expires_at > now()`) is satisfied and the ONLY thing under test
 * is the D-93 minimum-approve-window guard.
 */
async function seedRequest(
  id: string,
  listingId: string,
  msToStart: number,
  /** Override the SLA expiry. Used to model a LEGACY uncapped row, whose SLA outlives its own session. */
  expiresInMs?: number,
): Promise<Date> {
  const base = await dbNow();
  const startsAt = new Date(base.getTime() + msToStart);
  await testDb.db.insert(booking).values({
    id,
    listingId,
    unit: 1,
    bookerId: BOOKER,
    startsAt,
    endsAt: new Date(startsAt.getTime() + HOUR),
    status: "requested",
    bookingMode: "request",
    // Live SLA, and itself capped at the session start (D-94) so the fixture models a real row.
    expiresAt: new Date(
      expiresInMs != null
        ? base.getTime() + expiresInMs
        : Math.min(base.getTime() + 24 * HOUR, startsAt.getTime()),
    ),
    quotedTotalCents: HOURLY,
    currency: "php",
  });
  return startsAt;
}

async function readRow(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      expiresAt: booking.expiresAt,
      startsAt: booking.startsAt,
      declineReason: booking.declineReason,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({ body: { email, password: PASSWORD }, asResponse: true });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: BOOKER, name: "HR Booker", email: "hr_booker@example.com", firstName: "Booker", emailVerified: true },
  ]);

  testAuth = makeTestAuth(testDb);
  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "HR Host",
    firstName: "HRHost",
    intent: "host",
  });
  const [h] = await testDb.db.select({ id: user.id }).from(user).where(eq(user.email, HOST_EMAIL));
  hostId = h.id;

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.resetModules();
  ({ approveRequest } = await import("@/app/actions/host-requests"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  await teardownTestDb(testDb);
});

describe("approveRequest — D-94 payment-window cap", () => {
  it("caps the window at starts_at: approving a session 3h out stays payable until the session, not 12h later", async () => {
    // THE ORIGINAL BUG, restated as a test: a 2pm approval of a 5pm session used to stay payable until
    // 2pm the following day. The slot read as held for an extra day and the booker could pay for a
    // session that had already finished.
    await seedListing("L_cap_3h");
    const startsAt = await seedRequest("bk_cap_3h", "L_cap_3h", 3 * HOUR);
    await login(HOST_EMAIL);

    expect((await approveRequest("bk_cap_3h")).ok).toBe(true);

    const row = await readRow("bk_cap_3h");
    expect(row.status).toBe("approved");
    // expires_at === starts_at exactly: LEAST picked the session start over now()+12h.
    expect(Math.abs(row.expiresAt!.getTime() - startsAt.getTime())).toBeLessThanOrEqual(TOL_MS);
    // And emphatically NOT the uncapped window.
    expect(row.expiresAt!.getTime()).toBeLessThan(startsAt.getTime() + MIN);
    expect(row.expiresAt!.getTime()).toBeLessThanOrEqual(row.startsAt.getTime());
  });

  it("leaves the full window intact when the session is far away (the cap is inert, not lossy)", async () => {
    await seedListing("L_cap_far");
    const base = await dbNow();
    await seedRequest("bk_cap_far", "L_cap_far", 30 * 24 * HOUR); // a month out
    await login(HOST_EMAIL);

    expect((await approveRequest("bk_cap_far")).ok).toBe(true);

    const row = await readRow("bk_cap_far");
    expect(row.status).toBe("approved");
    const windowMs = row.expiresAt!.getTime() - base.getTime();
    expect(Math.abs(windowMs - APPROVAL_PAYMENT_WINDOW_HOURS * HOUR)).toBeLessThanOrEqual(TOL_MS);
    // A healthy approve is never annotated — the reason UPDATE cannot touch a row that flipped cleanly.
    expect(row.declineReason).toBeNull();
  });
});

describe("approveRequest — D-93 minimum-approve-window guard", () => {
  it("refuses an approve inside MIN_APPROVE_WINDOW_HOURS with the EXISTING calm result, and records why", async () => {
    await seedListing("L_too_close");
    await seedRequest("bk_too_close", "L_too_close", 30 * MIN); // inside the 1h minimum
    await login(HOST_EMAIL);

    const res = await approveRequest("bk_too_close");

    // The SAME calm "no longer pending" an already-actioned row returns — the guard claims 0 rows and
    // falls through the existing path. Never a 500, never a new error string for a caller to branch on.
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/no longer pending/i);

    const row = await readRow("bk_too_close");
    expect(row.status).toBe("requested"); // untouched — the host cannot open a doomed payment window
    // The one new observable: the honest reason, for the composer that tells both sides what happened.
    expect(row.declineReason).toBe("too_close_to_start");
  });

  it("the guard is scoped to the request itself — a healthy sibling request is never annotated or touched", async () => {
    // The annotation UPDATE is status-scoped and start-time-scoped; this proves it cannot reach past its
    // own row into a healthy one (the failure mode would be a live request silently marked as declined).
    await seedListing("L_sibling_close");
    await seedListing("L_sibling_ok");
    await seedRequest("bk_sibling_close", "L_sibling_close", 20 * MIN);
    await seedRequest("bk_sibling_ok", "L_sibling_ok", 5 * HOUR);
    await login(HOST_EMAIL);

    expect((await approveRequest("bk_sibling_close")).ok).toBe(false);

    const sibling = await readRow("bk_sibling_ok");
    expect(sibling.status).toBe("requested");
    expect(sibling.declineReason).toBeNull();
    expect((await readRow("bk_sibling_close")).declineReason).toBe("too_close_to_start");
  });

  it("a LEGACY uncapped row whose session already started is refused — by the start-time guard specifically", async () => {
    // A row created before D-94 landed: its SLA outlives its own session (expires_at is 10h out while the
    // session started two hours ago). The pre-existing `expires_at > now()` SLA guard is therefore fully
    // SATISFIED, so this isolates the NEW guard as the only thing that can refuse — a distinction the
    // test would lose if the fixture were lapsed on both counts.
    await seedListing("L_past");
    await seedRequest("bk_past", "L_past", -2 * HOUR, 10 * HOUR);
    await login(HOST_EMAIL);

    const res = await approveRequest("bk_past");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/no longer pending/i);

    const row = await readRow("bk_past");
    expect(row.status).toBe("requested"); // a payment window for a session already underway is never opened
    expect(row.declineReason).toBe("too_close_to_start");
    expect(MIN_APPROVE_WINDOW_HOURS).toBeGreaterThan(0); // the guard's floor is a real, positive window
  });
});
