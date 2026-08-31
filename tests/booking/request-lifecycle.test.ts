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
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// TWO MUTATIONS, BOTH EXECUTED 2026-08-06 (quick task 260806-gwt, TIER1-03 + TIER1-05). This file owns
// TWO Tier-1 window families (B/HOLD_W at ~line 119 and HR_W in the host describe), and each was
// converted from a pinned literal to a derived window. A conversion can hollow a file out silently, so
// EACH FAMILY WAS PROVEN INDEPENDENTLY — one mutation per family, because a red on family B says nothing
// about whether family HR still asserts.
//
//   MUTATION 1 (HOLD_W family) — src/lib/availability/units.ts: hardcode the inserted status to
//     'pending' instead of the `holdStatus` parameter, so the 06-04 request branch can no longer mint a
//     `requested` hold at all
//     → "mints a REQUESTED hold with the longer TTL when { holdStatus:'requested', ttlMs } is passed"
//       RED: `AssertionError: expected 'pending' to be 'requested' // Object.is equality`
//       at `expect(rows[0].status).toBe("requested")` (line ~336)
//     → also RED, same message, both on the START/END window: "(a) request-mode: mints a `requested`
//       hold…" at line ~535 and "(c) mode-flip independence…" at line ~571. (a) was predicted; (c) was
//       NOT — recorded as observed: (c) places its own request-mode hold before flipping the mode, so it
//       depends on the same insert.
//
//   MUTATION 2 (HR_W family) — src/app/actions/host-requests.ts: delete `AND expires_at > now()` from
//     approveRequest's UPDATE WHERE, so a host can approve past an SLA the DB clock has already closed
//     → "(b) SLA guard: approve on a LAPSED `requested` row → calm 'no longer pending'…" RED:
//       `AssertionError: expected true to be false // Object.is equality`
//       at `expect(res.ok).toBe(false)` (line ~763). Matched the prediction exactly.
//
// Both restored by EDITING THE LINES BACK; `git status --porcelain -- src/` clean before this shipped.
//
// NOTE the asymmetry between the two window families below, and do NOT "unify" them: family A is pinned
// ON PURPOSE (getAvailability takes an INJECTABLE `now`, pinned right beside its pinned day, so the pair
// is internally consistent forever — Tier 2 of the DEF-IR9-01 inventory). Families B and HR reach
// createPendingHold, whose guard is SQL `now()`, and MUST be derived.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { venueWindow, assertBookableWindow } from "../helpers/dates";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import { isPgError } from "@/lib/pg";
import { makeVerifiedHost } from "../helpers/seed";
import { user, listing, operatingHours, booking } from "@/lib/db/schema";
import { createPendingHold, HOLD_TTL_MINUTES } from "@/lib/availability/units";
import { APPROVAL_PAYMENT_WINDOW_HOURS } from "@/lib/payments/config";
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

/** The `fitout/notify` envelope, exactly as `emitNotify` hands it to the Inngest client. */
type NotifyEnvelope = {
  name: string;
  data: {
    type: string;
    recipientId: string;
    bookingId: string | null;
    email: string | null;
    payload: Record<string, unknown>;
  };
};

/**
 * The Inngest client, stubbed at the MODULE the actions' graph resolves (the cancellation.test.ts idiom).
 *
 * 07-10 moved the five lifecycle sends off `void sendXxx(...)` and onto the D-83 `fitout/notify` event, so
 * these cases' probe moved with them: the assertion is now that the action EMITTED, with the right type and
 * the right recipient. The email itself is dispatched by the Inngest function and is proven end-to-end by
 * tests/notifications/notify.test.ts; asserting a Resend body here too would be asserting Inngest's job.
 * `vi.spyOn` on an import held by this file would patch the pre-`resetModules` instance and silently miss —
 * and `emitNotify` swallows its own errors, so the miss would be indistinguishable from a pass.
 */
const inngestSend = vi.fn(async (event: NotifyEnvelope) => ({ ids: [event.name] }));

/** Every emission of `type` so far — the "did this migrated send still fire?" probe. */
function emissionsOfType(type: string): NotifyEnvelope[] {
  return inngestSend.mock.calls
    .map((c) => c[0])
    .filter((e) => e.name === "fitout/notify" && e.data.type === type);
}

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

// B) createPendingHold / the raw exclusion race work on absolute UTC instants — no operating hours needed
//    (VERIFIED, not assumed: the only addMondayHours calls in this file are 244/264/284, all inside the
//    family-A `getAvailability occupancy fan-out` describe; nothing in family B seeds hours, and neither
//    placeHold nor createPendingHold consults operating_hours on the write path).
//    DERIVED, never pinned (TIER1-03; DEF-IR9-01 — see @tests/helpers/dates.ts): family B reaches
//    createPendingHold, whose D-96 lead-time guard is SQL evaluated against POSTGRES's now(), so a pinned
//    window is refused the moment real time passes it. That is the opposite of family A above, which is
//    SAFE pinned precisely because getAvailability takes an INJECTABLE `now` pinned right beside its day.
//    Venue-local hour 10 IS 02:00Z in Asia/Manila, so this is the same window it always was.
const HOLD_W = venueWindow({ hour: 10, minDaysOut: 3 });
const START = HOLD_W.startUtc;
const END = HOLD_W.endUtc;

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
    reviewState: "approved",
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
  assertBookableWindow(HOLD_W); // assert the derivation, don't assume it — loud setup failure, not a
  // confusing "too soon to book" deep in a hold case. (Family A needs no check: its `now` is injected.)
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
      reviewState: "approved",
      bookingMode: mode,
      unitCount: 1,
      timezone: "Asia/Manila",
      city: "Makati",
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
    });
    // 260810-sti: hours are the FOURTH deriveBookable term, and THESE listings reach the real `placeHold`
    // action, so without them every family-(f) case would refuse with `not-bookable`. Inert to what the
    // file measures — the fork is on bookingMode, which hours do not touch.
    //
    // ⚠️ ONLY HERE. `makeListing` (the family-A helper further up) must NOT gain hours: its cases call
    // `addMondayHours`, which writes id `oh_${listingId}`, and seeding there would collide on the
    // primary key. Those cases drive `createPendingHold` directly, which has no bookability gate.
    await testDb.db.insert(operatingHours).values(
      Array.from({ length: 7 }, (_, dow) => ({
        id: `oh_af_${id}_${dow}`,
        listingId: id,
        dayOfWeek: dow,
        openTime: "06:00:00",
        closeTime: "22:00:00",
      })),
    );
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
    // refuses. HOST has no host_payout and no host_verification row yet (the earlier DB-level tests never
    // hit deriveBookable), so add both through the one shared fixture expression.
    // Payouts + the ops-APPROVED host_verification row deriveBookable's sixth term reads (phase 18,
    // D-224). Without it every placeHold in this file refuses `not-bookable`.
    await makeVerifiedHost(testDb.db, HOST, { insertUser: false });
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
    vi.doMock("@/inngest/client", () => ({ inngest: { send: inngestSend } }));
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
    vi.doUnmock("@/inngest/client");
    vi.doUnmock("next/navigation");
  });

  it("(a) request-mode: mints a `requested` hold with NO checkout + notifies booker & host (D-63 pay-on-approval)", async () => {
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

    // Both lifecycle notifications were EMITTED post-commit (D-83), each to the correct party. Scoped to
    // THIS hold's id so a sibling case's emission can never false-pass.
    const received = emissionsOfType("request_received").filter((e) => e.data.bookingId === holdId);
    const toHost = emissionsOfType("new_request_to_host").filter((e) => e.data.bookingId === holdId);
    expect(received).toHaveLength(1); // booker receipt
    expect(toHost).toHaveLength(1); // host alert
    expect(received[0].data.email).toBe(ACTION_BOOKER_EMAIL);
    // The host alert must go to the HOST, not the booker — the one mistake that would be invisible in a
    // "some email was sent" assertion (T-07-56: a notification to the wrong party).
    expect(toHost[0].data.email).toBe("rl_host@example.com");
    expect(toHost[0].data.recipientId).toBe(HOST);
    expect(toHost[0].data.recipientId).not.toBe(received[0].data.recipientId);
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

// ── (06-07) host approve/decline server actions + owner-gate + SLA guard + owner-scope READ isolation ──
// The host side of the pay-on-approval fork (HOST-01, BOOK-05, PAY-05). Drives the REAL approveRequest /
// declineRequest actions through the same vi.doMock harness (mock next/headers/auth/db/cache → import).
// A `requested` hold is inserted directly (this suite tests the HOST actions, not the placeHold entry
// fork), then approved (→ approved + pay-now email + 24h payment window), declined (→ declined + email +
// slot freed), refused past the SLA (DB-clock guard), refused cross-host (IDOR), and shown idempotent.
// The NON-OPTIONAL owner-scope READ isolation (the /host/requests inbox predicate 06-08 consumes) proves
// the read-path IDOR: host-A's owner-scoped SELECT returns ONLY A's requested rows (never host-B's).
describe("host approve/decline server actions — owner-gate, SLA guard, idempotency, owner-scope READ (HOST-01, Security V4)", () => {
  type HostRequestActions = typeof import("@/app/actions/host-requests");
  let approveRequest: HostRequestActions["approveRequest"];
  let declineRequest: HostRequestActions["declineRequest"];

  const HOST_A_EMAIL = "rl_host_a@example.com";
  const HOST_B_EMAIL = "rl_host_b@example.com";
  let hostAId: string;
  let hostBId: string;

  // A DERIVED absolute window (TIER1-05; DEF-IR9-01 — see @tests/helpers/dates.ts). Each test uses a
  // DISTINCT listing so occupying rows never collide on the booking_no_overlap EXCLUDE (which is scoped
  // by listing_id + unit); a different day from HOLD_W also preserves the two-distinct-families property.
  //
  // `minDaysOut: 5` IS LOAD-BEARING, not taste. approveRequest sets
  //   expires_at = LEAST(now() + APPROVAL_PAYMENT_WINDOW_HOURS, starts_at)
  // and case (a) below asserts that lands within ±1h of now()+12h. So HR_START must be MORE THAN 11h out
  // or the D-94 cap silently shortens the window and the case fails for a reason that has nothing to do
  // with what it tests. 5 days clears it with room even on a 23:59 venue-local run (~106h worst case).
  const HR_W = venueWindow({ hour: 10, minDaysOut: 5 });
  const HR_START = HR_W.startUtc;
  const HR_END = HR_W.endUtc;

  /** Seed a published request-mode listing owned by `hostId`. */
  async function seedHostListing(id: string, hostId: string): Promise<void> {
    await testDb.db.insert(listing).values({
      id,
      hostId,
      title: `Listing ${id}`,
      status: "published",
      reviewState: "approved",
      bookingMode: "request",
      unitCount: 1,
      timezone: "Asia/Manila",
      city: "Makati",
      hourlyRateCents: HOURLY,
      dayRateCents: DAY_RATE,
    });
  }

  /** Directly insert a `requested` hold. `hoursToExpiry` sets expires_at relative to now (negative = a
   *  lapsed SLA the cron hasn't yet swept). The frozen quote = 1h @ HOURLY so composeWhenLabel renders
   *  an hourly time range. */
  async function seedRequest(id: string, listingId: string, hoursToExpiry: number, unit = 1): Promise<void> {
    await testDb.db.insert(booking).values({
      id,
      listingId,
      unit,
      bookerId: BOOKER,
      startsAt: new Date(HR_START),
      endsAt: new Date(HR_END),
      status: "requested",
      bookingMode: "request",
      expiresAt: new Date(Date.now() + hoursToExpiry * 60 * 60 * 1000),
      quotedTotalCents: HOURLY,
      currency: "php",
    });
  }

  /** Sign in a host and thread the session cookie the mocked next/headers reads. */
  async function login(email: string): Promise<void> {
    const res = await testAuth.api.signInEmail({ body: { email, password: PASSWORD }, asResponse: true });
    const setCookie = res.headers.get("set-cookie");
    sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
  }

  beforeAll(async () => {
    assertBookableWindow(HR_W); // and its own check, beside its own window
    testAuth = makeTestAuth(testDb);
    // Two REAL signed-up hosts (intent 'host' → canHost) whose sessions drive the host actions. The plain-
    // inserted HOST ("rl_host") has no credential account and cannot sign in, so use dedicated hosts here.
    await signUp(testAuth, { email: HOST_A_EMAIL, password: PASSWORD, name: "Host A", firstName: "HostA", intent: "host" });
    await signUp(testAuth, { email: HOST_B_EMAIL, password: PASSWORD, name: "Host B", firstName: "HostB", intent: "host" });
    const aRows = await testDb.db.select({ id: user.id }).from(user).where(eq(user.email, HOST_A_EMAIL));
    const bRows = await testDb.db.select({ id: user.id }).from(user).where(eq(user.email, HOST_B_EMAIL));
    hostAId = aRows[0].id;
    hostBId = bRows[0].id;

    // host-requests imports auth (session gate), db (owner-gate + UPDATE), next/cache (revalidate) and —
    // since 07-10 — the Inngest client (the D-83 post-commit emission). It does NOT redirect, so no
    // next/navigation mock is needed.
    vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
    vi.doMock("@/lib/db", () => ({ db: testDb.db }));
    vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
    vi.doMock("@/inngest/client", () => ({ inngest: { send: inngestSend } }));
    vi.resetModules();
    ({ approveRequest, declineRequest } = await import("@/app/actions/host-requests"));
  });

  afterAll(() => {
    vi.doUnmock("@/lib/auth");
    vi.doUnmock("@/lib/db");
    vi.doUnmock("next/cache");
    vi.doUnmock("@/inngest/client");
  });

  it("(a) approve on a valid `requested` row → approved, expires_at ≈ now()+APPROVAL_PAYMENT_WINDOW_HOURS, pay-now email with hold=<id>", async () => {
    await seedHostListing("L_hr_approve", hostAId);
    await seedRequest("bk_hr_approve", "L_hr_approve", 12); // 12h left in the SLA → within the window
    await login(HOST_A_EMAIL);

    const before = Date.now();
    const res = await approveRequest("bk_hr_approve");
    expect(res.ok).toBe(true);
    expect(await statusOf("bk_hr_approve")).toBe("approved");

    // The payment window is opened to now()+APPROVAL_PAYMENT_WINDOW_HOURS — the booker gets the FULL
    // window to pay (mirrors the 06-04 GREATEST/payment-window idiom; the approved hold keeps the slot).
    // Asserted against the CONSTANT, not a hardcoded 24: D-95 moved this default 24h → 12h (partially
    // superseding D-64), and a literal here silently goes stale on every future policy tune.
    const rows = await testDb.db.select({ expiresAt: booking.expiresAt }).from(booking).where(eq(booking.id, "bk_hr_approve"));
    const exp = rows[0].expiresAt!.getTime();
    const windowMs = APPROVAL_PAYMENT_WINDOW_HOURS * 60 * 60 * 1000;
    expect(exp).toBeGreaterThan(before + windowMs - 60 * 60 * 1000);
    expect(exp).toBeLessThan(before + windowMs + 60 * 60 * 1000);

    // The booker's pay-now notification was EMITTED (D-83), carrying the pay link to the /book page with
    // this hold. The href is what the email renders as its CTA, so asserting it here still guards the
    // link — it has simply moved from the rendered body into the payload that composes it.
    const approved = emissionsOfType("request_approved").filter(
      (e) => e.data.bookingId === "bk_hr_approve",
    );
    expect(approved).toHaveLength(1);
    const payload = approved[0].data.payload as { href: string; payByLabel: string };
    expect(payload.href).toContain("/listings/L_hr_approve/book?hold=bk_hr_approve");
    // The pay-by deadline is a real composed label, not an empty string the Zod boundary would reject.
    expect(payload.payByLabel.length).toBeGreaterThan(0);
  });

  it("(b) SLA guard: approve on a LAPSED `requested` row → calm 'no longer pending', status unchanged (T-06-20)", async () => {
    await seedHostListing("L_hr_sla", hostAId);
    await seedRequest("bk_hr_sla", "L_hr_sla", -1); // expires_at 1h in the PAST → the SLA lapsed
    await login(HOST_A_EMAIL);

    const res = await approveRequest("bk_hr_sla");
    // The DB-clock guard `AND expires_at > now()` refuses a lapsed approve → 0 rows → calm result, never a 500.
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/no longer pending/i);
    expect(await statusOf("bk_hr_sla")).toBe("requested"); // a host cannot approve past the SLA
  });

  it("(c) decline → declined, slot freed (a subsequent overlapping hold succeeds), booker emailed (BOOK-05)", async () => {
    await seedHostListing("L_hr_decline", hostAId);
    await seedRequest("bk_hr_decline", "L_hr_decline", 12);
    await login(HOST_A_EMAIL);

    const res = await declineRequest("bk_hr_decline");
    expect(res.ok).toBe(true);
    expect(await statusOf("bk_hr_decline")).toBe("declined");

    // Freeing is automatic — `declined` is non-occupying, so a fresh overlapping hold on the SAME window wins.
    const hold = await createPendingHold(testDb.db, { listingId: "L_hr_decline", bookerId: BOOKER2, startsAt: HR_START, endsAt: HR_END });
    expect(isOk(hold)).toBe(true);

    // The booker's declined notification was EMITTED (D-83). `expired: false` is the load-bearing bit — a
    // HOST decline and an SLA lapse are two different sentences, and the payload is what picks between them.
    const declined = emissionsOfType("request_declined").filter(
      (e) => e.data.bookingId === "bk_hr_decline",
    );
    expect(declined).toHaveLength(1);
    expect((declined[0].data.payload as { expired: boolean }).expired).toBe(false);
  });

  it("(d) owner-gate (IDOR): host-B approving/declining host-A's request → NO state change + SAME denial as a missing id (T-06-19)", async () => {
    await seedHostListing("L_hr_idor", hostAId);
    await seedRequest("bk_hr_idor", "L_hr_idor", 12);
    await login(HOST_B_EMAIL); // a DIFFERENT host

    const approveRes = await approveRequest("bk_hr_idor");
    expect(approveRes.ok).toBe(false);
    expect(await statusOf("bk_hr_idor")).toBe("requested"); // cross-host approve changed nothing

    const declineRes = await declineRequest("bk_hr_idor");
    expect(declineRes.ok).toBe(false);
    expect(await statusOf("bk_hr_idor")).toBe("requested"); // cross-host decline changed nothing

    // A MISSING id and a CROSS-HOST id return the SAME calm denial (leak nothing — missing vs not-mine
    // are indistinguishable to the caller).
    const missingRes = await approveRequest("bk_does_not_exist");
    expect(missingRes.ok).toBe(false);
    if (!approveRes.ok && !missingRes.ok) expect(missingRes.error).toBe(approveRes.error);
  });

  it("(e) idempotency: a second approve/decline on an already-actioned row is a calm 0-row no-op (T-06-21)", async () => {
    await seedHostListing("L_hr_idem_a", hostAId);
    await seedRequest("bk_hr_idem_a", "L_hr_idem_a", 12);
    await login(HOST_A_EMAIL);
    expect((await approveRequest("bk_hr_idem_a")).ok).toBe(true);
    const second = await approveRequest("bk_hr_idem_a"); // already `approved` → status-scoped UPDATE flips 0 rows
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/no longer pending/i);
    expect(await statusOf("bk_hr_idem_a")).toBe("approved"); // unchanged

    await seedHostListing("L_hr_idem_d", hostAId);
    await seedRequest("bk_hr_idem_d", "L_hr_idem_d", 12);
    expect((await declineRequest("bk_hr_idem_d")).ok).toBe(true);
    const secondD = await declineRequest("bk_hr_idem_d"); // already `declined` → 0 rows
    expect(secondD.ok).toBe(false);
    expect(await statusOf("bk_hr_idem_d")).toBe("declined");
  });

  it("(f) /host/requests owner-scope READ isolation (NON-OPTIONAL): host-A's inbox SELECT returns ONLY A's requested rows, never host-B's (Security V4 read-path IDOR)", async () => {
    await seedHostListing("L_hr_read_a", hostAId);
    await seedHostListing("L_hr_read_b", hostBId);
    await seedRequest("bk_hr_read_a", "L_hr_read_a", 12);
    await seedRequest("bk_hr_read_b", "L_hr_read_b", 12);

    // The EXACT owner-scoped inbox predicate 06-08's page.tsx consumes:
    //   SELECT booking.* FROM booking JOIN listing ON listing.id = booking.listing_id
    //   WHERE listing.host_id = <A> AND booking.status = 'requested' ORDER BY booking.expires_at ASC
    const rows = await testDb.db
      .select({ id: booking.id, hostId: listing.hostId })
      .from(booking)
      .innerJoin(listing, eq(booking.listingId, listing.id))
      .where(and(eq(listing.hostId, hostAId), eq(booking.status, "requested")))
      .orderBy(booking.expiresAt);

    const ids = rows.map((r) => r.id);
    expect(ids).toContain("bk_hr_read_a"); // host-A sees their own requested row
    expect(ids).not.toContain("bk_hr_read_b"); // NEVER host-B's — the read-path IDOR is closed
    expect(rows.every((r) => r.hostId === hostAId)).toBe(true); // every returned row is owned by host-A
  });
});
