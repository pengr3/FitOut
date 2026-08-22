// THE SWEEP IS THE GUARANTEE, SO IT IS DEMONSTRATED — NOT DESCRIBED.
//
// `src/inngest/functions/checkout-retire.ts` is the ONE job that makes D-113 true: when a hold lapses, the
// booker's ability to pay lapses with it. It is also the sharpest trust boundary in this phase — every
// other scheduled job in this codebase ADDS capability or moves state forward, and this one TAKES SOMETHING
// AWAY FROM A PAYING CUSTOMER. So the selector that decides WHO is the whole safety story, and it is
// asserted from both sides:
//
//   - the file opens with a GUARD-THE-GUARD on the selector, because if `queryRetirableSessions` returned
//     nothing, every exclusion case below it would pass vacuously against an empty list;
//   - THE LIVE-HOLD CASE — a hold expiring five minutes in the FUTURE — asserts both that it is absent
//     from the selection AND that a full sweep pass calls the retire policy ZERO times for it. A sweep that
//     can revoke a live customer's ability to pay is the failure this file exists to catch;
//   - the no-booking-write claim is asserted on the ROW — read back after a real pass — not on the absence
//     of an UPDATE statement, because "I could not find the statement" is not a measurement.
//
// TWO MODULE INSTANCES, ON PURPOSE. The first describe block imports the sweep with
// `@/lib/payments/retire-checkout` MOCKED, so "the policy was called for this row" is a countable fact per
// booking id. The second imports it with the REAL policy and `@/lib/paymongo` stubbed underneath the probe,
// so the end-to-end classification (`active` → expire, `paid` → NO expire, probe failure → `unknown`) is
// exercised through the code that actually ships. Both are imported in the same `beforeAll`, so neither
// depends on describe ordering.
//
// ⚠ `PAYMONGO_SECRET_KEY` is stubbed for this file. Without it the REAL probe answers `null` with no
// request at all (D-35's CI secret boundary) and every behavioural case would read `"unknown"` — the block
// would be measuring the short-circuit instead of the sweep.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// THE DELIBERATE BREAKS — SIX APPLIED, FOUR REDS, TWO NON-REDS THAT ARE FINDINGS. OBSERVED 2026-08-22.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// A guard that has never been seen to fail has not been proven. Every break was applied to
// `src/inngest/functions/checkout-retire.ts`, run, and reverted from a SAVED COPY in the scratchpad —
// never `git checkout --`, which has destroyed a probe's own uncommitted work in this repo before.
//
// ── BREAK 1 (the one the plan asked for): `RETIRE_INTERVAL_MINUTES` raised 5 → 20 ──────────────────────
//
//   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
//    FAIL  … > D-113 — the cadence is an inequality over the REAL hold TTL > (c2) RETIRE_INTERVAL_MINUTES
//    is strictly under HOLD_TTL_MINUTES
//   AssertionError: D-113 HAS SILENTLY DIED. A lapsed hold now stays payable for up to 20 min while a hold
//   only LIVES for 15 min — so a booker can pay for a slot that has been lapsed longer than it was ever
//   held, which is the exact "we would be handling money that isn't ours" case this phase exists to remove.
//   The sweep still runs and still looks healthy; it just arrives after the window it was supposed to
//   close. Do NOT fix this by editing the assertion.: expected 20 to be less than 15
//
// ⚠ THE PLAN PREDICTED **TWO** REDS — cases (c2) AND (c3) — AND THAT PREDICTION IS WRONG, for exactly the
// structural reason 13.1-02 already recorded against its own identical prediction. Case (c3) compares the
// SHIPPED cron's minute step against `RETIRE_INTERVAL_MINUTES`, and the same plan requires the cron to be
// DERIVED from that constant. Those two instructions cannot both hold and still produce a red: deriving the
// string makes both sides move together, so interval=20 simply ships `4-59/20` and (c3) keeps passing. The
// prediction and the design are in direct contradiction, and the design is the half worth keeping — a
// derived schedule is precisely what makes (c2) guard the interval that actually runs.
//
// ── BREAK 2: what (c3) IS for, since break 1 could not red it ───────────────────────────────────────────
// `retireCron()`'s body replaced with a hardcoded `return "TZ=Asia/Manila 4-59/10 * * * *";` while
// `RETIRE_INTERVAL_MINUTES` stayed 5. Observed RED, verbatim:
//
//        × (c3) the SHIPPED cron string's minute field IS built from the constants
//   AssertionError: the shipped cron "TZ=Asia/Manila 4-59/10 * * * *" steps every 10 min while
//   RETIRE_INTERVAL_MINUTES says 5 — the schedule and the number the inequality above protects have drifted
//   apart, so (c2) would be guarding an interval nothing actually runs on: expected 10 to be 5
//
// ── BREAK 3: `expires_at IS NOT NULL` removed — AND IT REDDENED NOTHING. A FINDING, NOT A PASS. ─────────
// The 13.1-04 plan's red_watch predicts that removing this clause makes "the live-hold case select a row it
// must never touch". BOTH HALVES OF THAT ARE WRONG, and measuring is what showed it:
//
//   (a) the clause has nothing to do with a LIVE hold — a live hold's `expires_at` is a real future
//       timestamp, not NULL, so no null-handling clause can affect it;
//   (b) removing it alone changes NO row's selectability, because SQL's three-valued logic already excludes
//       a NULL `expires_at` twice over: `NULL <= now()` is NULL (not true), and `NULL > now() - interval`
//       is NULL (not true). Run with the clause deleted: **18 passed**.
//
// Making the lapse bound null-tolerant on its own (BREAK 3b, `(expires_at IS NULL OR expires_at <= now())`)
// also stayed green, because the lookback's lower bound still rejects NULL. So did making BOTH comparisons
// null-tolerant (BREAK 3c) — because the explicit clause then holds it. Case (5) is protected by THREE
// INDEPENDENT clauses, and only removing all three reddens it (BREAK 3d), verbatim:
//
//        × (5) a pending hold with NO expiry has not lapsed and is never selected
//   AssertionError: expected [ 'bk_cr_noexpiry', 'bk_cr_control' ] to not include 'bk_cr_noexpiry'
//
// The clause STAYS. It is not load-bearing today, and it is not there to be: it is the thing that keeps
// case (5) true on the day someone "helpfully" makes one of the comparisons null-tolerant.
//
// ── BREAK 4: the lapse predicate widened ten minutes into the FUTURE ────────────────────────────────────
// `AND expires_at <= now()` → `AND expires_at <= now() + make_interval(mins => 10)`, i.e. the single most
// dangerous edit anyone could make to this file. Observed RED on the case that owns it:
//
//        × (1) THE LIVE-HOLD CASE — a hold expiring FIVE MINUTES FROM NOW is neither selected nor retired
//   AssertionError: a hold that has NOT lapsed was selected for retirement — this sweep would revoke a live
//   customer's ability to pay for a slot they still hold: expected [ 'bk_cr_live', 'bk_cr_control' ] to not
//   include 'bk_cr_live'
//
// ── BREAK 5: D-111's lookback widened from 30 minutes to 30 DAYS ────────────────────────────────────────
//
//        × (7) D-111 NO BACKFILL — a hold that lapsed THREE DAYS ago is outside the lookback window
//   AssertionError: D-111 IS BROKEN — the lookback window (RETIRE_LOOKBACK_MINUTES) now reaches historical
//   rows. […both evidence booking ids, verbatim from the failure message below…]
//   expected [ 'bk_cr_control', 'bk_cr_ancient' ] to not include 'bk_cr_ancient'

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, booking } from "@/lib/db/schema";
import { HOLD_TTL_MINUTES } from "@/lib/availability/units";
import type { RetirableSession, RetireOutcome } from "@/lib/payments/retire-checkout";

let testDb: TestDb;
type SweepModule = typeof import("@/inngest/functions/checkout-retire");
/** The sweep with the retire POLICY mocked — so "was the policy called for this row" is countable. */
let sweepMocked: SweepModule;
/** The sweep with the REAL policy, and `@/lib/paymongo` stubbed underneath the probe. */
let sweepReal: SweepModule;

const HOST = "cr_host";
const BOOKER = "cr_booker";
const LISTING = "L_cr";
const HARNESS_SECRET = "declared-by-this-harness-not-a-real-paymongo-credential";
const MINUTE_MS = 60_000;

/** ⚠ D-111's two evidence fixtures. Named in the no-backfill case's failure message, never seeded. */
const EVIDENCE_FIXTURES = [
  "09f32400-b636-46e1-973a-b930a073a936",
  "408e054a-cb5a-4dbb-9282-9883e0bfc628",
] as const;

/** The policy, mocked. Records the row AND the trigger it was called with, per booking id. */
const retirePolicyMock = vi.fn(
  async (_row: RetirableSession, _trigger: string): Promise<RetireOutcome> => "retired",
);
const recordAuditMock = vi.fn(async () => {});

function policyCalls(): Array<{ bookingId: string; trigger: string }> {
  return retirePolicyMock.mock.calls.map((c) => ({
    bookingId: (c[0] as RetirableSession).bookingId,
    trigger: c[1] as string,
  }));
}

/** A distinct 1-hour UTC window per booking so seeded rows never collide on the booking_no_overlap EXCLUDE. */
let hourSeq = 0;
function nextWindow(): { startsAt: Date; endsAt: Date } {
  const hour = hourSeq++;
  const day = 1 + Math.floor(hour / 24);
  const h = String(hour % 24).padStart(2, "0");
  const h1 = String((hour % 24) + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return {
    startsAt: new Date(`2027-05-${d}T${h}:00:00.000Z`),
    endsAt: new Date(`2027-05-${d}T${h1}:00:00.000Z`),
  };
}

async function seedBooking(opts: {
  id: string;
  status: "pending" | "approved" | "requested" | "confirmed" | "cancelled";
  /** The column the whole selector turns on. `undefined` ⇒ lapsed one minute ago (the sweepable case). */
  expiresAt?: Date | null;
  checkoutSessionId?: string | null;
}): Promise<string> {
  const { startsAt, endsAt } = nextWindow();
  await testDb.db.insert(booking).values({
    id: opts.id,
    listingId: LISTING,
    unit: 1,
    bookerId: BOOKER,
    startsAt,
    endsAt,
    status: opts.status,
    quotedTotalCents: 150000,
    currency: "php",
    expiresAt: opts.expiresAt === undefined ? new Date(Date.now() - MINUTE_MS) : opts.expiresAt,
    checkoutSessionId:
      opts.checkoutSessionId === undefined ? `cs_${opts.id}` : opts.checkoutSessionId,
  });
  return opts.id;
}

/** The three columns the no-write rule is asserted on, read straight back off the row. */
async function readBooking(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      expiresAt: booking.expiresAt,
      checkoutSessionId: booking.checkoutSessionId,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

/**
 * ONE FULL SWEEP PASS, mirroring `checkoutRetireSweep`'s handler body exactly: query, then the policy once
 * per selected row. The handler itself is unreachable from here — `inngest.createFunction` is stubbed so
 * the module can be imported at all — so the two halves it composes are driven directly.
 */
async function sweepPass(mod: SweepModule) {
  const rows = await mod.queryRetirableSessions(testDb.db);
  const results = [];
  for (const row of rows) results.push(await mod.retireOne(row));
  return results;
}

function session(id: string, status: string) {
  return {
    id,
    status,
    sourceType: status === "paid" ? "gcash" : null,
    paidAt: status === "paid" ? new Date("2026-08-22T03:00:00Z") : null,
    paymentId: status === "paid" ? `pay_${id}` : null,
  };
}

beforeAll(async () => {
  testDb = await setupTestDb();

  await testDb.db.insert(user).values([
    { id: HOST, name: "CR Host", email: "cr_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "CR Booker", email: "cr_booker@example.com", firstName: "Booker" },
  ]);
  await testDb.db.insert(listing).values({
    id: LISTING,
    hostId: HOST,
    title: "CR Listing",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 150000,
    dayRateCents: 300000,
    currency: "php",
  });

  vi.stubEnv("PAYMONGO_SECRET_KEY", HARNESS_SECRET);
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/audit", () => ({ recordAudit: recordAuditMock }));
  vi.doMock("@/lib/paymongo", () => ({
    getCheckoutSession: mockPayMongo.getCheckoutSession,
    expireCheckoutSession: mockPayMongo.expireCheckoutSession,
  }));
  vi.doMock("@/inngest/client", () => ({
    inngest: { send: vi.fn(async () => ({ ids: [] })), createFunction: vi.fn((o: { id: string }) => o) },
  }));

  // INSTANCE 1 — the policy replaced by a counting mock.
  vi.doMock("@/lib/payments/retire-checkout", () => ({
    retireCheckoutForBooking: retirePolicyMock,
    RETIRE_INLINE_LIMIT: 3,
  }));
  vi.resetModules();
  sweepMocked = await import("@/inngest/functions/checkout-retire");

  // INSTANCE 2 — the REAL policy, over the stubbed provider.
  vi.doUnmock("@/lib/payments/retire-checkout");
  vi.resetModules();
  sweepReal = await import("@/inngest/functions/checkout-retire");
});

beforeEach(() => {
  retirePolicyMock.mockClear();
  retirePolicyMock.mockResolvedValue("retired");
  recordAuditMock.mockClear();
  mockPayMongo.getCheckoutSession.mockReset();
  mockPayMongo.getCheckoutSession.mockImplementation(async (id: string = "cs_d") => session(id, "active"));
  mockPayMongo.expireCheckoutSession.mockReset();
  mockPayMongo.expireCheckoutSession.mockImplementation(async (id: string = "cs_d") => ({ id }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/audit");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("@/inngest/client");
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await teardownTestDb(testDb);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// THE CANDIDATE SET — who this job is allowed to take the ability to pay away from
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

const CONTROL = "bk_cr_control";

describe("queryRetirableSessions — the candidate set", () => {
  it("(0) GUARD-THE-GUARD — a pending hold that lapsed a minute ago IS selected", async () => {
    await seedBooking({ id: CONTROL, status: "pending" });

    const rows = await sweepMocked.queryRetirableSessions(testDb.db);

    expect(
      rows.map((r) => r.bookingId),
      "the selector returned nothing for a row that satisfies every predicate — every exclusion case " +
        "below would then pass vacuously against an empty list, proving nothing at all",
    ).toEqual([CONTROL]);
    expect(rows[0].checkoutSessionId).toBe(`cs_${CONTROL}`);
    expect(rows[0].bookingStatus).toBe("pending");
  });

  it("(1) THE LIVE-HOLD CASE — a hold expiring FIVE MINUTES FROM NOW is neither selected nor retired", async () => {
    // The sharpest risk in the whole plan. This job REVOKES a customer's ability to complete a payment; if
    // `expires_at <= now()` were ever widened by a sign, an interval or a JS clock, it would stop a booker
    // who can still legitimately pay. Both halves are asserted: absent from the selection, AND zero policy
    // calls across a full pass.
    const live = await seedBooking({
      id: "bk_cr_live",
      status: "pending",
      expiresAt: new Date(Date.now() + 5 * MINUTE_MS),
    });

    const ids = (await sweepMocked.queryRetirableSessions(testDb.db)).map((r) => r.bookingId);
    expect(
      ids,
      "a hold that has NOT lapsed was selected for retirement — this sweep would revoke a live customer's " +
        "ability to pay for a slot they still hold",
    ).not.toContain(live);

    await sweepPass(sweepMocked);
    expect(
      policyCalls().filter((c) => c.bookingId === live),
      "the retire policy was invoked for a hold that has not lapsed",
    ).toHaveLength(0);
  });

  it("(2) a CONFIRMED booking is never selected — its session was paid, and retiring it destroys evidence", async () => {
    const id = await seedBooking({ id: "bk_cr_confirmed", status: "confirmed" });
    const ids = (await sweepMocked.queryRetirableSessions(testDb.db)).map((r) => r.bookingId);
    expect(ids).not.toContain(id);
    expect(ids).toContain(CONTROL);
  });

  it("(3) a CANCELLED booking is never selected — the path that ended it already owned its session", async () => {
    const id = await seedBooking({ id: "bk_cr_cancelled", status: "cancelled" });
    expect((await sweepMocked.queryRetirableSessions(testDb.db)).map((r) => r.bookingId)).not.toContain(id);
  });

  it("(4) a REQUESTED booking is never selected — it is not payable, so there is nothing to revoke", async () => {
    const id = await seedBooking({ id: "bk_cr_requested", status: "requested" });
    expect((await sweepMocked.queryRetirableSessions(testDb.db)).map((r) => r.bookingId)).not.toContain(id);
  });

  it("(5) a pending hold with NO expiry has not lapsed and is never selected", async () => {
    // ⚠ THIS CASE IS OVER-DETERMINED, AND THAT WAS MEASURED, NOT ASSUMED (see BREAK 3 in the header).
    // THREE independent clauses each exclude a NULL `expires_at`: the explicit `IS NOT NULL`, and — through
    // SQL's three-valued logic — both range comparisons. Removing any ONE of them reddens nothing. Only
    // BREAK 3d, which removes all three, makes this case fail. The plan's red_watch claim that the explicit
    // clause alone guards the LIVE-HOLD case is wrong on both counts.
    const id = await seedBooking({ id: "bk_cr_noexpiry", status: "pending", expiresAt: null });
    expect((await sweepMocked.queryRetirableSessions(testDb.db)).map((r) => r.bookingId)).not.toContain(id);
  });

  it("(6) a pending hold with NO checkout session is never selected — nothing to ask the provider about", async () => {
    const id = await seedBooking({ id: "bk_cr_nosession", status: "pending", checkoutSessionId: null });
    expect((await sweepMocked.queryRetirableSessions(testDb.db)).map((r) => r.bookingId)).not.toContain(id);
  });

  it("(7) D-111 NO BACKFILL — a hold that lapsed THREE DAYS ago is outside the lookback window", async () => {
    const id = await seedBooking({
      id: "bk_cr_ancient",
      status: "pending",
      expiresAt: new Date(Date.now() - 3 * 24 * 60 * MINUTE_MS),
    });

    const ids = (await sweepMocked.queryRetirableSessions(testDb.db)).map((r) => r.bookingId);

    expect(
      ids,
      `D-111 IS BROKEN — the lookback window (RETIRE_LOOKBACK_MINUTES) now reaches historical rows. ` +
        `The two bookings this whole phase exists because of are deliberately left \`pending\` as ` +
        `FIXTURES and hold LIVE PayMongo sessions that the provider reports as PAID:\n` +
        `  ${EVIDENCE_FIXTURES[0]}  (lapsed 2026-08-21)\n` +
        `  ${EVIDENCE_FIXTURES[1]}  (lapsed 2026-08-18)\n` +
        `Widening this window is how you would send a real ₱1,050 and ₱2,100 GCash capture to expire. ` +
        `Do NOT fix this by editing the assertion.`,
    ).not.toContain(id);
    // The presence half — the window is a WINDOW, not an empty set.
    expect(ids).toContain(CONTROL);
  });

  it("(8) an APPROVED lapsed hold IS selected — the pay-on-approval mode loses the same ability to pay", async () => {
    const id = await seedBooking({ id: "bk_cr_approved", status: "approved" });
    const rows = await sweepMocked.queryRetirableSessions(testDb.db);
    expect(rows.map((r) => r.bookingId)).toContain(id);
    expect(rows.find((r) => r.bookingId === id)?.bookingStatus).toBe("approved");
  });

  it("(9) a full pass calls the policy exactly once per selected row, with trigger `retire-sweep`", async () => {
    const results = await sweepPass(sweepMocked);
    const selected = (await sweepMocked.queryRetirableSessions(testDb.db)).map((r) => r.bookingId);

    expect(results.map((r) => r.bookingId).sort()).toEqual([...selected].sort());
    expect(policyCalls().map((c) => c.bookingId).sort()).toEqual([...selected].sort());
    // The trigger names WHICH lapse produced the audit row — the sweep is one of four, and 13.1-05 adds
    // the other three against the same policy.
    expect(new Set(policyCalls().map((c) => c.trigger))).toEqual(new Set(["retire-sweep"]));
    expect(selected.length).toBeGreaterThan(0); // the presence half, again
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// BEHAVIOUR THROUGH THE REAL POLICY — and the no-booking-write rule asserted ON THE ROW
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("the sweep through the REAL policy", () => {
  /** Seed one lapsed pending hold nobody else's case can see, and drive the whole pass over it. */
  async function driveOne(id: string, provider: () => Promise<unknown>) {
    await seedBooking({ id, status: "pending" });
    const before = await readBooking(id);
    mockPayMongo.getCheckoutSession.mockImplementation(provider as never);

    const results = await sweepPass(sweepReal);
    const mine = results.find((r) => r.bookingId === id);

    return { before, after: await readBooking(id), outcome: mine?.outcome };
  }

  it("(10) an `active` session is expired once, and the booking row is UNCHANGED", async () => {
    const id = "bk_cr_beh_active";
    const { before, after, outcome } = await driveOne(id, async () => session(`cs_${id}`, "active"));

    expect(outcome).toBe("retired");
    expect(mockPayMongo.expireCheckoutSession.mock.calls.map((c) => c[0])).toContain(`cs_${id}`);
    expect(after).toEqual(before);
    expect(after.status).toBe("pending"); // spelled out: the lapsed hold is STILL pending, on purpose
    expect(after.checkoutSessionId).toBe(`cs_${id}`);
  });

  it("(11) a `paid` session is NEVER expired, and the booking row is UNCHANGED", async () => {
    // The evidence rule, proven through the shipped sweep rather than against the policy in isolation.
    const id = "bk_cr_beh_paid";
    const { before, after, outcome } = await driveOne(id, async () => session(`cs_${id}`, "paid"));

    expect(outcome).toBe("paid-left-intact");
    expect(
      mockPayMongo.expireCheckoutSession.mock.calls.map((c) => c[0]),
      "the sweep sent a session PayMongo reports as PAID to expire — the money is real and the session is " +
        "the only handle on it",
    ).not.toContain(`cs_${id}`);
    expect(after).toEqual(before);
    // ⚠ AND THIS IS THE TRAP THE WHOLE PHASE TURNS ON: the row is still `pending`, which is precisely and
    // only what plan 13.1-02's `queryUnconfirmedPaid` selects. Flip it to `cancelled` here and the booker
    // who paid at the last second is never reconciled, never confirmed and never told.
    expect(after.status).toBe("pending");
    expect(after.checkoutSessionId).toBe(`cs_${id}`);
  });

  it("(12) a probe that FAILS ends `unknown`, expires nothing, and leaves the row UNCHANGED", async () => {
    const id = "bk_cr_beh_unknown";
    const { before, after, outcome } = await driveOne(id, async () => {
      throw new Error("connect ETIMEDOUT");
    });

    expect(outcome).toBe("unknown");
    expect(mockPayMongo.expireCheckoutSession.mock.calls.map((c) => c[0])).not.toContain(`cs_${id}`);
    expect(after).toEqual(before);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// D-113's CADENCE, AS AN INEQUALITY OVER THE REAL CONSTANTS — never a literal retyped into this spec
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Pull the minute field out of the shipped cron string. THROWS rather than returning a default when the
 * shape is one it does not understand — a parser that quietly answered `{ start: 0, step: 0 }` would make
 * the cases below assert against a fiction.
 */
function parseCronMinute(cron: string): { start: number; step: number } {
  const fields = cron.trim().split(/\s+/);
  if (fields[0]?.startsWith("TZ=")) fields.shift(); // the TZ prefix is Inngest syntax, not a cron field
  const minute = fields[0];
  if (!minute) throw new Error(`no minute field in cron string "${cron}"`);

  const ranged = /^(\d+)-(\d+)\/(\d+)$/.exec(minute);
  if (ranged) return { start: Number(ranged[1]), step: Number(ranged[3]) };
  const stepped = /^(\d+)\/(\d+)$/.exec(minute);
  if (stepped) return { start: Number(stepped[1]), step: Number(stepped[2]) };
  const everyN = /^\*\/(\d+)$/.exec(minute);
  if (everyN) return { start: 0, step: Number(everyN[1]) };

  throw new Error(
    `the cron minute field "${minute}" (from "${cron}") is not a step expression this spec can read, so ` +
      `the cadence assertions below would prove nothing. Fix the parser or the cron — never delete the case.`,
  );
}

describe("D-113 — the cadence is an inequality over the REAL hold TTL", () => {
  it("(c1) GUARD-THE-GUARD — every constant under assertion is a real, positive, finite number", () => {
    // A renamed export or a moved module would make the comparisons below run on `undefined`, and
    // `NaN < NaN` is false — so they would fail (or, with the operands reversed, pass) for a reason that
    // has nothing to do with cadence.
    for (const [name, value] of [
      ["HOLD_TTL_MINUTES", HOLD_TTL_MINUTES],
      ["RETIRE_INTERVAL_MINUTES", sweepReal.RETIRE_INTERVAL_MINUTES],
      ["RETIRE_LOOKBACK_MINUTES", sweepReal.RETIRE_LOOKBACK_MINUTES],
      ["RETIRE_START_MINUTE", sweepReal.RETIRE_START_MINUTE],
      ["RETIRE_BATCH_LIMIT", sweepReal.RETIRE_BATCH_LIMIT],
    ] as const) {
      expect(
        Number.isFinite(value),
        `${name} did not import as a finite number (got ${String(value)}) — every assertion below this ` +
          `line would be comparing NaN and proving nothing`,
      ).toBe(true);
      expect(value, `${name} must be greater than zero`).toBeGreaterThanOrEqual(0);
    }
    expect(sweepReal.RETIRE_INTERVAL_MINUTES).toBeGreaterThan(0);
  });

  it("(c2) RETIRE_INTERVAL_MINUTES is strictly under HOLD_TTL_MINUTES", () => {
    expect(
      sweepReal.RETIRE_INTERVAL_MINUTES,
      `D-113 HAS SILENTLY DIED. A lapsed hold now stays payable for up to ` +
        `${sweepReal.RETIRE_INTERVAL_MINUTES} min while a hold only LIVES for ${HOLD_TTL_MINUTES} min — so ` +
        `a booker can pay for a slot that has been lapsed longer than it was ever held, which is the exact ` +
        `"we would be handling money that isn't ours" case this phase exists to remove. The sweep still ` +
        `runs and still looks healthy; it just arrives after the window it was supposed to close. Do NOT ` +
        `fix this by editing the assertion.`,
    ).toBeLessThan(HOLD_TTL_MINUTES);
  });

  it("(c3) the SHIPPED cron string's minute field IS built from the constants", () => {
    const cron = sweepReal.retireCron();
    const { start, step } = parseCronMinute(cron);

    expect(
      step,
      `the shipped cron "${cron}" steps every ${step} min while RETIRE_INTERVAL_MINUTES says ` +
        `${sweepReal.RETIRE_INTERVAL_MINUTES} — the schedule and the number the inequality above protects ` +
        `have drifted apart, so (c2) would be guarding an interval nothing actually runs on`,
    ).toBe(sweepReal.RETIRE_INTERVAL_MINUTES);
    expect(start, `the shipped cron "${cron}" starts on a minute the constant does not name`).toBe(
      sweepReal.RETIRE_START_MINUTE,
    );
  });

  it("(c4) the lookback window is strictly wider than the interval", () => {
    expect(
      sweepReal.RETIRE_LOOKBACK_MINUTES,
      `the lookback (${sweepReal.RETIRE_LOOKBACK_MINUTES} min) is not wider than the interval ` +
        `(${sweepReal.RETIRE_INTERVAL_MINUTES} min), so a lapsed session that missed ONE tick — a deploy, ` +
        `a restart, a slow pass — leaves the window and is never swept again. Its checkout stays PAYABLE ` +
        `FOREVER, which is precisely the hole D-113 exists to close, reopened by a constant.`,
    ).toBeGreaterThan(sweepReal.RETIRE_INTERVAL_MINUTES);
  });

  it("(c5) the start minute collides with no cron family already scheduled", () => {
    const residue = sweepReal.RETIRE_START_MINUTE % sweepReal.RETIRE_INTERVAL_MINUTES;
    // 0 = the four hourly crons (:00 payout sweep, :15 request expiry, :30 payout reconcile, :45 reminders)
    //     and the 08:50 daily ops digest. 2 = plan 13.1-02's payment-reconcile.
    expect(
      residue,
      `start minute ${sweepReal.RETIRE_START_MINUTE} has residue ${residue} mod ` +
        `${sweepReal.RETIRE_INTERVAL_MINUTES}, which collides with an existing cron family (0 = the four ` +
        `hourly crons + the daily digest, 2 = payment-reconcile). Crons that tick together contend for the ` +
        `same database and the same provider rate budget (Pitfall 4).`,
    ).not.toBe(0);
    expect(residue).not.toBe(2);
  });
});
