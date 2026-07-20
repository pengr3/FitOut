// Phase-6 request-to-book lifecycle gate (BOOK-05/BOOK-03, D-63) — the non-negotiable correctness
// proof that `requested` and `approved` are slot-holding states EVERYWHERE occupancy is read, that the
// createPendingHold parameterization (holdStatus/ttlMs) the 06-04 request branch mints against works,
// and that the in-tx stale-hold sweep's terminal WRITE-TARGET (requested→declined / approved→cancelled)
// mirrors the 06-06 SLA cron (Warning-1 reconciliation — the two write paths must agree on the terminal
// value so it never depends on which path wins).
//
// Mirrors tests/booking/pending-hold.test.ts + tests/availability/exclusion-race.test.ts: correctness
// rests ENTIRELY on the booking_no_overlap GiST EXCLUDE (widened in 06-01 / drizzle/0012 to occupy
// {pending,confirmed,requested,approved} via the complement `status NOT IN (cancelled,declined,completed)`),
// so a GENUINE double-book race uses INDEPENDENT connections (makeRacingClients — the shared max:1 client
// serializes and proves nothing, RESEARCH Pitfall 1). getAvailability + createPendingHold are called
// directly with the isolated test db (both take the db as a parameter, so they run against the test schema).
//
// EXTENSION POINT (later waves): 06-04/06-07 extend this file with the vi.doMock action harness from
// tests/booking/state-machine.test.ts (mock @/lib/auth, @/lib/db, @/lib/paymongo, next/navigation → import
// the real request-to-book actions) to drive host approve/decline + pay-on-approval. This wave lands only
// the DB-level correctness gate the whole request-to-book fork depends on.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo, mockResend } from "../helpers/mocks";
import { isPgError } from "@/lib/pg";
import { user, listing, hostPayout, operatingHours, booking } from "@/lib/db/schema";
import { createPendingHold, HOLD_TTL_MINUTES } from "@/lib/availability/units";
import { getAvailability } from "@/lib/availability/read-model";
import type postgres from "postgres";

type HoldResult = Awaited<ReturnType<typeof createPendingHold>>;
const isOk = (v: HoldResult): v is Extract<HoldResult, { ok: true }> => "ok" in v && v.ok === true;

// ── Action harness (06-04) ────────────────────────────────────────────────────────────────────────────
// The request-to-book FORK, mode-flip independence, and pay-on-approval are driven through the REAL
// placeHold/confirmBooking server actions via the vi.doMock idiom from tests/booking/state-machine.test.ts
// (mock next/headers/auth/db/paymongo/navigation/cache, then import the actions). next/navigation.redirect
// throws a typed RedirectError carrying the URL so a test can assert the redirect (SUCCESS) target.
class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
    this.name = "RedirectError";
  }
}
async function expectRedirect(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof RedirectError) return e.url;
    throw e;
  }
  throw new Error("expected the action to redirect, but it returned normally");
}

// The mocked next/headers reads this at CALL time (during an action), so login() can swap the session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

let testDb: TestDb;
let testAuth: TestAuth;
type BookingActions = typeof import("@/app/actions/booking");
let placeHold: BookingActions["placeHold"];
let confirmBooking: BookingActions["confirmBooking"];

const HOST = "rl_host";
const BOOKER = "rl_booker";
const BOOKER2 = "rl_booker2";
const HOURLY = 5000; // ₱50.00/hr
const DAY_RATE = 30000; // ₱300.00/day

// Action-harness fixtures (06-04): a REAL signed-up booker (intent 'book' → canBook) whose session drives
// placeHold/confirmBooking. Distinct email from the plain-inserted BOOKER rows above (no conflict).
const ACTION_BOOKER_EMAIL = "rl_action_booker@example.com";
const PASSWORD = "averylongpassword";

// ── Two window families ─────────────────────────────────────────────────────
// A) getAvailability slots need to line up with venue-local operating hours, so reuse the read-model
//    test's Monday 06:00 Asia/Manila slot (UTC [22:00Z prior day, 23:00Z)).
const DAY = { year: 2026, month: 8, day: 3 } as const; // Aug 3 2026 is a Monday (dow 1)
const NOW = new Date("2026-07-15T00:00:00.000Z"); // well before the test day → every slot is future/in-horizon
const SLOT_0600_START = "2026-08-02T22:00:00.000Z"; // venue-local 06:00 → prior-day 22:00Z
const AVAIL_S = new Date(SLOT_0600_START);
const AVAIL_E = new Date("2026-08-02T23:00:00.000Z");

// B) createPendingHold / the raw exclusion race work on absolute UTC instants — no operating hours needed.
const START = "2026-10-01T02:00:00.000Z";
const END = "2026-10-01T03:00:00.000Z";

// DB-atomic rejection codes for a double-book attempt against the widened EXCLUDE (03-01 finding):
//   23P01 exclusion_violation (the winner committed first) OR 40P01 deadlock_detected (both inserted then
//   blocked). Both prevent the double-book — exactly one row survives.
const CONFLICT_CODES = ["23P01", "40P01"] as const;
const isConflict = (e: unknown): boolean => CONFLICT_CODES.some((c) => isPgError(e, c));

async function makeListing(id: string, unitCount = 1): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId: HOST,
    title: `Listing ${id}`,
    status: "published",
    unitCount,
    timezone: "Asia/Manila",
    hourlyRateCents: HOURLY,
    dayRateCents: DAY_RATE,
  });
}

async function addMondayHours(listingId: string, open = "06:00:00", close = "09:00:00"): Promise<void> {
  await testDb.db.insert(operatingHours).values({ id: `oh_${listingId}`, listingId, dayOfWeek: 1, openTime: open, closeTime: close });
}

async function statusOf(id: string): Promise<string | undefined> {
  const rows = await testDb.db.select({ status: booking.status }).from(booking).where(eq(booking.id, id));
  return rows[0]?.status;
}

/** Raw INSERT via a given postgres.js client (kept raw so the driver SQLSTATE reaches the test on `.code`). */
const insRaw = (
  c: postgres.Sql,
  args: { id: string; listingId: string; unit: number; bookerId: string; status: string },
) => c`
  INSERT INTO booking (id, listing_id, unit, booker_id, starts_at, ends_at, status)
  VALUES (${args.id}, ${args.listingId}, ${args.unit}, ${args.bookerId}, ${START}, ${END}, ${args.status})`;

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: HOST, name: "RL Host", email: "rl_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "RL Booker", email: "rl_booker@example.com", firstName: "Booker", emailVerified: true },
    { id: BOOKER2, name: "RL Booker Two", email: "rl_booker2@example.com", firstName: "Booker2", emailVerified: true },
  ]);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

// ── (a)/(b) The non-negotiable gate: requested/approved slots block double-booking at the DB ──────────
describe("requested/approved slots block double-booking at the DB (BOOK-05/BOOK-03 — the non-negotiable gate)", () => {
  it("rejects the 2nd of two CONCURRENT overlapping inserts on a REQUESTED slot (exactly one survives)", async () => {
    await makeListing("L_req_race", 1);
    const [a, b] = makeRacingClients(testDb.schema, 2); // two INDEPENDENT connections, one schema
    try {
      const results = await Promise.allSettled([
        insRaw(a, { id: "bk_req_a", listingId: "L_req_race", unit: 1, bookerId: BOOKER, status: "requested" }),
        insRaw(b, { id: "bk_req_b", listingId: "L_req_race", unit: 1, bookerId: BOOKER2, status: "requested" }),
      ]);

      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1); // exactly one winner
      const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      expect(rejected).toBeDefined();
      expect(isConflict(rejected!.reason)).toBe(true); // 23P01 or 40P01 — a DB-atomic rejection

      const [{ n }] = await testDb.client`
        SELECT count(*)::int AS n FROM booking WHERE listing_id = 'L_req_race' AND unit = 1 AND starts_at = ${START}`;
      expect(n).toBe(1); // the double-book cannot exist
    } finally {
      await a.end();
      await b.end();
    }
  });

  it("rejects the 2nd of two CONCURRENT overlapping inserts on an APPROVED slot (exactly one survives)", async () => {
    await makeListing("L_appr_race", 1);
    const [a, b] = makeRacingClients(testDb.schema, 2);
    try {
      const results = await Promise.allSettled([
        insRaw(a, { id: "bk_appr_a", listingId: "L_appr_race", unit: 1, bookerId: BOOKER, status: "approved" }),
        insRaw(b, { id: "bk_appr_b", listingId: "L_appr_race", unit: 1, bookerId: BOOKER2, status: "approved" }),
      ]);

      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      expect(rejected).toBeDefined();
      expect(isConflict(rejected!.reason)).toBe(true);

      const [{ n }] = await testDb.client`
        SELECT count(*)::int AS n FROM booking WHERE listing_id = 'L_appr_race' AND unit = 1 AND starts_at = ${START}`;
      expect(n).toBe(1);
    } finally {
      await a.end();
      await b.end();
    }
  });

  it("a REQUESTED slot blocks an overlapping instant PENDING hold (cross-mode collision)", async () => {
    await makeListing("L_req_vs_pending", 1);
    // A live request holds unit 1; an instant booker's createPendingHold on the same window must lose.
    await testDb.db.insert(booking).values({
      id: "bk_req_hold",
      listingId: "L_req_vs_pending",
      unit: 1,
      bookerId: BOOKER,
      startsAt: new Date(START),
      endsAt: new Date(END),
      status: "requested",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const res = await createPendingHold(testDb.db, { listingId: "L_req_vs_pending", bookerId: BOOKER2, startsAt: START, endsAt: END });
    expect("error" in res).toBe(true);
    if ("error" in res) expect(res.error).toMatch(/just taken/i);
  });
});

// ── (c) The occupancy-predicate fan-out: getAvailability must see requested/approved as occupied ──────
describe("getAvailability occupancy fan-out — requested/approved occupy (D-63; the predicate that must mirror 06-01's EXCLUDE)", () => {
  it("an unexpired REQUESTED hold makes the slot UNAVAILABLE (occupied, not free)", async () => {
    await makeListing("L_req_occupied", 1);
    await addMondayHours("L_req_occupied");
    await testDb.db.insert(booking).values({
      id: "bk_req_occ",
      listingId: "L_req_occupied",
      unit: 1,
      bookerId: BOOKER,
      startsAt: AVAIL_S,
      endsAt: AVAIL_E,
      status: "requested",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // live SLA window → occupies
    });

    const res = await getAvailability(testDb.db, "L_req_occupied", DAY, NOW);
    const slot = res.slots.find((s) => s.startUtc === SLOT_0600_START)!;
    expect(slot.freeUnits).toBe(0);
    expect(slot.state).toBe("unavailable");
  });

  it("an unexpired APPROVED hold makes the slot UNAVAILABLE (occupied, not free)", async () => {
    await makeListing("L_appr_occupied", 1);
    await addMondayHours("L_appr_occupied");
    await testDb.db.insert(booking).values({
      id: "bk_appr_occ",
      listingId: "L_appr_occupied",
      unit: 1,
      bookerId: BOOKER,
      startsAt: AVAIL_S,
      endsAt: AVAIL_E,
      status: "approved",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // live payment window → occupies
    });

    const res = await getAvailability(testDb.db, "L_appr_occupied", DAY, NOW);
    const slot = res.slots.find((s) => s.startUtc === SLOT_0600_START)!;
    expect(slot.freeUnits).toBe(0);
    expect(slot.state).toBe("unavailable");
  });

  it("a REQUESTED hold past its expires_at reads as FREE (lazy expiry — the cron formalizes it)", async () => {
    await makeListing("L_req_expired", 1);
    await addMondayHours("L_req_expired");
    await testDb.db.insert(booking).values({
      id: "bk_req_exp",
      listingId: "L_req_expired",
      unit: 1,
      bookerId: BOOKER,
      startsAt: AVAIL_S,
      endsAt: AVAIL_E,
      status: "requested",
      expiresAt: new Date(Date.now() - 60 * 60 * 1000), // lapsed SLA → reads free
    });

    const res = await getAvailability(testDb.db, "L_req_expired", DAY, NOW);
    const slot = res.slots.find((s) => s.startUtc === SLOT_0600_START)!;
    expect(slot.freeUnits).toBe(1);
    expect(slot.state).toBe("available");
  });
});

// ── (d) createPendingHold parameterization — the 06-04 request branch mints a `requested` hold ─────────
describe("createPendingHold parameterization — { holdStatus, ttlMs } (06-04 request branch, defaults keep instant unchanged)", () => {
  it("mints a REQUESTED hold with the longer TTL when { holdStatus:'requested', ttlMs } is passed", async () => {
    await makeListing("L_param_req", 1);
    const ttlMs = 24 * 60 * 60 * 1000; // 24h approval SLA window
    const before = Date.now();
    const res = await createPendingHold(testDb.db, {
      listingId: "L_param_req",
      bookerId: BOOKER,
      startsAt: START,
      endsAt: END,
      holdStatus: "requested",
      ttlMs,
    });
    expect(isOk(res)).toBe(true);
    if (!isOk(res)) return;

    const rows = await testDb.db
      .select({ status: booking.status, expiresAt: booking.expiresAt })
      .from(booking)
      .where(eq(booking.id, res.id));
    expect(rows[0].status).toBe("requested"); // NOT the default 'pending'
    const exp = rows[0].expiresAt!.getTime();
    // expires_at ≈ now()+24h (comfortably beyond the 15-min instant default — proves ttlMs was honored).
    expect(exp).toBeGreaterThan(before + 23 * 60 * 60 * 1000);
    expect(exp).toBeLessThan(before + 25 * 60 * 60 * 1000);
  });

  it("the default call is unchanged: a PENDING hold with the 15-min TTL (instant behavior byte-for-byte)", async () => {
    await makeListing("L_param_default", 1);
    const before = Date.now();
    const res = await createPendingHold(testDb.db, { listingId: "L_param_default", bookerId: BOOKER, startsAt: START, endsAt: END });
    expect(isOk(res)).toBe(true);
    if (!isOk(res)) return;

    const rows = await testDb.db
      .select({ status: booking.status, expiresAt: booking.expiresAt })
      .from(booking)
      .where(eq(booking.id, res.id));
    expect(rows[0].status).toBe("pending");
    const exp = rows[0].expiresAt!.getTime();
    const ttlMs = HOLD_TTL_MINUTES * 60 * 1000;
    expect(exp).toBeGreaterThan(before + ttlMs - 60 * 1000); // ≈ now()+15min (±1min slack)
    expect(exp).toBeLessThan(before + ttlMs + 60 * 1000);
  });

  it("persists bookingMode into the creation-time snapshot column when provided", async () => {
    await makeListing("L_param_mode", 1);
    const res = await createPendingHold(testDb.db, {
      listingId: "L_param_mode",
      bookerId: BOOKER,
      startsAt: START,
      endsAt: END,
      holdStatus: "requested",
      ttlMs: 24 * 60 * 60 * 1000,
      bookingMode: "request",
    });
    expect(isOk(res)).toBe(true);
    if (!isOk(res)) return;
    const rows = await testDb.db.select({ bookingMode: booking.bookingMode }).from(booking).where(eq(booking.id, res.id));
    expect(rows[0].bookingMode).toBe("request");
  });
});

// ── (e) In-tx sweep WRITE-TARGET — a lapsed reclaim mirrors the 06-06 cron's terminal mapping ─────────
describe("in-tx stale-hold sweep WRITE-TARGET — mirrors the 06-06 SLA cron (Warning-1; the in-tx-reclaim path and the cron never disagree)", () => {
  it("reclaims a lapsed REQUESTED hold as DECLINED (not cancelled) and the fresh overlapping hold wins the unit", async () => {
    await makeListing("L_sweep_req", 1);
    // Seed a REQUESTED hold, already past its expires_at (a request whose SLA lapsed before the cron ran).
    await testDb.db.insert(booking).values({
      id: "bk_sweep_req",
      listingId: "L_sweep_req",
      unit: 1,
      bookerId: BOOKER,
      startsAt: new Date(START),
      endsAt: new Date(END),
      status: "requested",
      expiresAt: new Date(Date.now() - 60 * 60 * 1000), // lapsed
    });

    // A fresh overlapping hold reclaims the just-lapsed slot IN THE SAME TX (the DB EXCLUDE still counts
    // the lapsed `requested` row until the in-tx sweep frees it — a lazy read alone cannot).
    const res = await createPendingHold(testDb.db, { listingId: "L_sweep_req", bookerId: BOOKER2, startsAt: START, endsAt: END });
    expect(isOk(res)).toBe(true);
    if (isOk(res)) expect(res.unit).toBe(1); // reclaimed the freed unit

    // The WRITE-TARGET: the lapsed `requested` row is now DECLINED (mirrors the 06-06 SLA cron), NOT cancelled.
    expect(await statusOf("bk_sweep_req")).toBe("declined");
  });

  it("reclaims a lapsed APPROVED hold as CANCELLED (payment-window mapping) and the fresh hold wins the unit", async () => {
    await makeListing("L_sweep_appr", 1);
    await testDb.db.insert(booking).values({
      id: "bk_sweep_appr",
      listingId: "L_sweep_appr",
      unit: 1,
      bookerId: BOOKER,
      startsAt: new Date(START),
      endsAt: new Date(END),
      status: "approved",
      expiresAt: new Date(Date.now() - 60 * 60 * 1000), // lapsed payment window
    });

    const res = await createPendingHold(testDb.db, { listingId: "L_sweep_appr", bookerId: BOOKER2, startsAt: START, endsAt: END });
    expect(isOk(res)).toBe(true);
    if (isOk(res)) expect(res.unit).toBe(1);

    // approved (and pending) reclaim → cancelled (the 06-06 payment-window mapping), NOT declined.
    expect(await statusOf("bk_sweep_appr")).toBe("cancelled");
  });

  it("still reclaims a lapsed PENDING hold as CANCELLED (instant-hold behavior unregressed)", async () => {
    await makeListing("L_sweep_pending", 1);
    await testDb.db.insert(booking).values({
      id: "bk_sweep_pending",
      listingId: "L_sweep_pending",
      unit: 1,
      bookerId: BOOKER,
      startsAt: new Date(START),
      endsAt: new Date(END),
      status: "pending",
      expiresAt: new Date(Date.now() - 60 * 60 * 1000),
    });

    const res = await createPendingHold(testDb.db, { listingId: "L_sweep_pending", bookerId: BOOKER2, startsAt: START, endsAt: END });
    expect(isOk(res)).toBe(true);
    if (isOk(res)) expect(res.unit).toBe(1);
    expect(await statusOf("bk_sweep_pending")).toBe("cancelled");
  });
});

// ── (f) placeHold FORK + mode-flip independence + pay-on-approval (06-04 request-to-book fork) ─────────
describe("placeHold forks on bookingMode + mode-flip independence + pay-on-approval (BOOK-04/BOOK-05/PAY-05, D-61/D-63)", () => {
  /** Seed a published, bookable listing owned by HOST with the given booking mode. */
  async function seedModedListing(id: string, mode: "instant" | "request"): Promise<void> {
    await testDb.db.insert(listing).values({
      id,
      hostId: HOST,
      title: `Listing ${id}`,
      status: "published",
      bookingMode: mode,
      unitCount: 1,
      timezone: "Asia/Manila",
      city: "Makati",
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
    });
  }

  /** Sign in the action booker and thread the session cookie the mocked next/headers reads. */
  async function login(email: string): Promise<void> {
    const res = await testAuth.api.signInEmail({ body: { email, password: PASSWORD }, asResponse: true });
    const setCookie = res.headers.get("set-cookie");
    sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
  }

  beforeAll(async () => {
    testAuth = makeTestAuth(testDb);
    // deriveBookable needs the host verified (already, top-level) + an ACTIVATED payout row — else placeHold
    // refuses. HOST has no hostPayout yet (the earlier DB-level tests never hit deriveBookable), so add one.
    await testDb.db.insert(hostPayout).values({
      userId: HOST,
      payoutsEnabled: true,
      activationStatus: "activated",
      onboardingComplete: true,
    });
    // A real signed-up booker (intent 'book' → canBook) whose session drives the actions.
    await signUp(testAuth, {
      email: ACTION_BOOKER_EMAIL,
      password: PASSWORD,
      name: "Action Booker",
      firstName: "Action",
      intent: "book",
    });

    vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
    vi.doMock("@/lib/db", () => ({ db: testDb.db }));
    vi.doMock("@/lib/paymongo", () => ({
      createCheckoutSession: mockPayMongo.createCheckoutSession,
      createRefund: mockPayMongo.createRefund,
      createBatchTransfer: mockPayMongo.createBatchTransfer,
      listWalletAccounts: mockPayMongo.listWalletAccounts,
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("next/navigation", () => ({
      redirect: (url: string) => {
        throw new RedirectError(url);
      },
      notFound: () => {
        throw new Error("NEXT_NOT_FOUND");
      },
    }));
    vi.resetModules();
    ({ placeHold, confirmBooking } = await import("@/app/actions/booking"));

    // Distinct listings per case (the shared START/END window only collides on the SAME listing).
    await seedModedListing("L_af_request", "request");
    await seedModedListing("L_af_instant", "instant");
    await seedModedListing("L_af_flip", "request");
    await seedModedListing("L_af_approved", "instant"); // FK anchor for the directly-inserted approved hold
  });

  afterAll(() => {
    vi.doUnmock("@/lib/auth");
    vi.doUnmock("@/lib/db");
    vi.doUnmock("@/lib/paymongo");
    vi.doUnmock("next/cache");
    vi.doUnmock("next/navigation");
  });

  it("(a) request-mode: mints a `requested` hold with NO checkout + fires booker & host emails (D-63 pay-on-approval)", async () => {
    await login(ACTION_BOOKER_EMAIL);
    const url = await expectRedirect(
      placeHold({ listingId: "L_af_request", startUtc: START, endUtc: END, fullDay: false }),
    );
    // The request branch redirects to the request-received surface — NOT the /book pay page, NOT off-site.
    expect(url).toMatch(/^\/bookings\//);
    const holdId = url.split("/").pop()!;
    expect(await statusOf(holdId)).toBe("requested");

    // NO money moves at request time (D-63 / T-06-11) — the request branch creates no checkout.
    expect(mockPayMongo.createCheckoutSession).not.toHaveBeenCalled();

    // Both lifecycle emails fired (fire-and-forget). Filter by subject so a stray signup email can't false-pass.
    const subjects = mockResend.sent().map((e) => e.subject);
    expect(subjects.some((s) => s.startsWith("We sent your request"))).toBe(true); // booker receipt
    expect(subjects.some((s) => s.startsWith("New booking request"))).toBe(true); // host alert
  });

  it("(b) instant-mode: unchanged — a `pending` hold and a redirect to the /book pay page (BOOK-04 byte-for-byte)", async () => {
    await login(ACTION_BOOKER_EMAIL);
    const url = await expectRedirect(
      placeHold({ listingId: "L_af_instant", startUtc: START, endUtc: END, fullDay: false }),
    );
    expect(url).toMatch(/^\/listings\/L_af_instant\/book\?hold=/);
    const holdId = new URL(url, "http://t").searchParams.get("hold")!;
    expect(await statusOf(holdId)).toBe("pending");
    expect(mockPayMongo.createCheckoutSession).not.toHaveBeenCalled(); // instant charges only on Confirm & pay
  });

  it("(c) mode-flip independence: flipping listing.bookingMode does NOT mutate an in-flight `requested` row (D-61)", async () => {
    await login(ACTION_BOOKER_EMAIL);
    const url = await expectRedirect(
      placeHold({ listingId: "L_af_flip", startUtc: START, endUtc: END, fullDay: false }),
    );
    const holdId = url.split("/").pop()!;
    expect(await statusOf(holdId)).toBe("requested");

    // The host flips the listing to instant AFTER the request is in flight.
    await testDb.db.update(listing).set({ bookingMode: "instant" }).where(eq(listing.id, "L_af_flip"));

    // Lifecycle correctness keys off booking.status, not the live listing flag — the row is untouched (D-61):
    // still `requested` (not auto-confirmed/dropped) and the creation-time snapshot survives the flip.
    const rows = await testDb.db
      .select({ status: booking.status, bookingMode: booking.bookingMode })
      .from(booking)
      .where(eq(booking.id, holdId));
    expect(rows[0].status).toBe("requested");
    expect(rows[0].bookingMode).toBe("request");
  });

  it("(d) pay-on-approval: confirmBooking on an `approved` hold creates the checkout and does NOT shrink the 24h window (PAY-05, Pitfall 6)", async () => {
    // The approved hold must be OWNED by the session booker (confirmBooking owner-gates bookerId).
    const [bkr] = await testDb.db.select({ id: user.id }).from(user).where(eq(user.email, ACTION_BOOKER_EMAIL));
    const farExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // a fresh 24h post-approval payment window
    await testDb.db.insert(booking).values({
      id: "bk_af_approved",
      listingId: "L_af_approved",
      unit: 1,
      bookerId: bkr.id,
      startsAt: new Date(START),
      endsAt: new Date(END),
      status: "approved",
      bookingMode: "request",
      expiresAt: farExpiry,
      quotedTotalCents: 5000,
      currency: "php",
    });

    mockPayMongo.createCheckoutSession.mockClear();
    await login(ACTION_BOOKER_EMAIL);
    const url = await expectRedirect(confirmBooking("bk_af_approved"));
    expect(url).toBe("https://checkout.paymongo.test/cs_test_123"); // reuses the exact Phase-5 hosted checkout
    expect(mockPayMongo.createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(await statusOf("bk_af_approved")).toBe("approved"); // NOT flipped here — the webhook confirms

    // GREATEST kept the 24h window — it was NOT shrunk to the 60-min instant window (Pitfall 6 / T-06-10).
    const rows = await testDb.db
      .select({ expiresAt: booking.expiresAt })
      .from(booking)
      .where(eq(booking.id, "bk_af_approved"));
    expect(rows[0].expiresAt!.getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
  });
});
