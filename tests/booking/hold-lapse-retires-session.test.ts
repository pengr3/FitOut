// D-113, THE INLINE HALF — when a reclaim frees a slot, the session it orphans is retired AT THAT MOMENT.
//
// `src/lib/availability/units.ts` carries TWO in-transaction stale-hold reclaims: the exclusive one inside
// `createPendingHold` (D-48b) and the open-capacity one inside `createOpenCapacityHold`. Both flip a lapsed
// hold terminal and free its slot; until 13.1-05 neither told PayMongo, so the previous booker's checkout
// session stayed live and payable against a slot FitOut had already given to somebody else.
//
// ⚠ THIS FILE GUARDS AN ACCELERANT, NOT THE GUARANTEE. 13.1-04's `checkout-retire-sweep` already retires
// EVERY lapsed hold's session within RETIRE_INTERVAL_MINUTES, including the dominant case no reclaim path
// ever visits (a lapsed hold on a slot nobody else wants). If every line this file tests were deleted,
// D-113 would still hold. Nothing here may be made load-bearing for it, and no case below asserts D-113's
// guarantee THROUGH this path — they assert only that the reclaim closes its own session promptly and that
// a dead PayMongo cannot hurt a booker.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// THE TWO PROPERTIES THAT WOULD BREAK PRODUCTION, AND HOW EACH IS MEASURED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
//
// (A) THE PROVIDER CALL IS OUTSIDE THE TRANSACTION — asserted BEHAVIOURALLY, never positionally.
//     A test that greps for where a line sits proves nothing. So the retire mock's own implementation
//     reads the reclaimed booking back through a SECOND, INDEPENDENT connection on the same isolated
//     schema (`makeRacingClients`) and records what it saw. Every reclaim case then asserts it saw
//     `cancelled`. Under READ COMMITTED a call made INSIDE the transaction would have the second
//     connection read the PRE-reclaim row — `pending` — because the flip is not visible until COMMIT.
//     That is the whole difference between "the call happens" and "the call happens where D-113 requires".
//
//     ▶ BREAK PERFORMED (see the verbatim red at the bottom of this header): the `createPendingHold`
//       retire was moved INSIDE the `db.transaction` callback, run, observed, and reverted from a saved
//       copy — never `git checkout --`.
//
// (B) A DEAD PAYMONGO CANNOT FAIL A BOOKING — asserted at the CALL SITE, not inherited.
//     The retire sits inside `createPendingHold`'s existing `try`, whose `catch` runs `mapBookingError`,
//     which RE-THROWS unknown errors. So a policy that threw would turn a provider outage into a failed
//     booking for a booker who did nothing wrong. 13.1-04 asserted the never-throw contract three ways in
//     `tests/payments/retire-checkout.test.ts`; in PRODUCTION the policy therefore cannot reject at all.
//     The cases below make the mock reject ANYWAY, because what needs proving here is a different fact:
//     that THIS CALL SITE survives it. Both halves matter — the contract and the site that depends on it.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE POLICY IS MOCKED RATHER THAN STUBBED UNDERNEATH
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// `@/lib/payments/retire-checkout` is replaced wholesale so that the CALL — its arguments, its count, and
// the database state visible AT CALL TIME — is the observable. The policy's own behaviour (probe-first,
// never expire a `paid` session, never write a `booking` row, never throw) is 13.1-04's subject and is
// covered by 15 cases in `tests/payments/retire-checkout.test.ts` plus a live PayMongo proof. Re-asserting
// it here would duplicate that file and, worse, would let this file pass while the WIRING was wrong.
//
// ⚠ EVERY FIXTURE WINDOW IS CLOCK-RELATIVE (the DEF-IR9-01 rule). `createPendingHold`'s D-96 lead guard is
// SQL evaluated against POSTGRES's now(), so a pinned calendar window becomes a "too soon" refusal the day
// the calendar passes it and every case here would go green by vacuum.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// THE DELIBERATE BREAK — the one the 13.1-05 plan singles out as worth PERFORMING. OBSERVED 2026-08-22.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// `src/lib/availability/units.ts`: the post-commit `await retireCheckoutsForBookings(reclaimed,
// "stale-hold-reclaim")` moved INSIDE the `db.transaction` callback, immediately after the reclaim UPDATE.
// Restored from a saved copy in the scratchpad; `git diff --stat` on the file is empty afterwards.
//
//   ❯ tests/booking/hold-lapse-retires-session.test.ts (10 tests | 3 failed)
//        × (2) THE POST-COMMIT PROOF — the retire sees the COMMITTED `cancelled` row on a second connection
//        × (3) A REJECTING POLICY CANNOT FAIL A BOOKING — the hold still succeeds and the row is still cancelled
//        × (6) A 40P01 RE-RUN REPLACES THE RECLAIMED LIST, never accumulates it
//
//   AssertionError: THE RETIRE RAN INSIDE THE TRANSACTION. A second, independent connection read this
//   booking at the moment the policy was called and saw the PRE-reclaim row — i.e. the flip had not
//   COMMITTED yet. […full message, verbatim at case (2)…]: expected 'pending' to be 'cancelled'
//
//   Error: PayMongo is down                                                    ← case (3)
//
//   AssertionError: the retire fired on a rolled-back transaction attempt — an in-tx (or accumulating)
//   implementation would hand the policy a session id belonging to a flip that no longer exists in the
//   database: expected […] to have a length of 1 but got 2                     ← case (6)
//
// ⚠ REPORTED AS OBSERVED, NOT AS PREDICTED — THREE DIFFERENCES FROM THE PLAN'S PREDICTION, ALL WORTH
// KEEPING:
//
//   1. IT DID NOT HANG. The red_watch predicted the case would fail "or hang on the uncommitted write".
//      Under READ COMMITTED a plain SELECT never blocks on an uncommitted UPDATE — it reads the previous
//      row version — so the failure is a clean, readable assertion about the row's status. A guard that
//      could hang here would be worse, not stricter.
//   2. CASE (6) REDDENS TOO, and it was not predicted. Its 40P01-simulating proxy throws only AFTER the
//      callback returns, so with the retire moved inside, the call fires on the FIRST (rolled-back)
//      attempt as well: the mock is invoked TWICE for one genuine flip, the second time for a session id
//      whose flip no longer exists in the database. That is the exact double-fire the post-commit
//      placement exists to prevent, and it surfaced on its own.
//   3. CASE (3) REDDENS TOO, because the move takes the call site's own `catch` with it — see the
//      first-run finding below, which is the reason that `catch` exists at all.
//
// ── THE FIRST-RUN FINDING — A PLAN INSTRUCTION THAT WOULD HAVE SHIPPED A BOOKING OUTAGE ────────────────
// The 13.1-05 plan specifies the retire "inside the existing `try`" and says that is acceptable because
// the policy cannot throw. Written exactly that way and run, case (3) failed on the FIRST run of this
// file — not with an assertion, but by `createPendingHold` THROWING:
//
//        × (3) A REJECTING POLICY CANNOT FAIL A BOOKING — the hold still succeeds and the row is still cancelled
//   Error: PayMongo is down
//    ❯ tests/booking/hold-lapse-retires-session.test.ts:409:39
//
// The outer `catch` runs `mapBookingError`, which RE-THROWS unknown errors, so the rejection went straight
// out to the caller — with the slot already freed and COMMITTED. A booker refused because a third party
// was down is 13.1-CONTEXT D-113 violated in its own words. The plan's OWN acceptance criterion ("with the
// retire mock REJECTING, `createPendingHold` still resolves a SUCCESSFUL hold") is unsatisfiable under the
// placement the same plan specifies. Both call sites now carry their own `catch`; see the long comment at
// each. 13.1-04's never-throw contract makes that catch unreachable today — it is there for the day
// somebody changes the policy, and its log line says the contract has been broken rather than hiding it.

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { VENUE_TZ, venueWindow, assertBookableWindow } from "../helpers/dates";
import { user, listing, operatingHours, booking } from "@/lib/db/schema";
import type { RetirableSession, RetireOutcome } from "@/lib/payments/retire-checkout";

let testDb: TestDb;
type UnitsModule = typeof import("@/lib/availability/units");
/** `units.ts` imported with `@/lib/payments/retire-checkout` MOCKED — the call is the observable. */
let units: UnitsModule;

/** THE SECOND, INDEPENDENT CONNECTION. Property (A) is unprovable without it — see the header. */
let watcher: ReturnType<typeof makeRacingClients>[number];

const HOST = "hlr_host";
const BOOKER = "hlr_booker";
const OTHER = "hlr_other";
const L_EXCL = "L_hlr_excl";
const L_OPEN = "L_hlr_open";
const MONDAY = 1;

/**
 * What the retire mock SAW in the database, on a DIFFERENT connection, at the instant it was called.
 * This array is the post-commit proof; `retireCalls` alone could not distinguish an in-tx call.
 */
const seenAtCallTime: Array<{ bookingId: string; status: string | null }> = [];

/** The default implementation: observe first (that is the proof), then answer `retired` for every row. */
async function observeThenRetire(rows: RetirableSession[]): Promise<RetireOutcome[]> {
  for (const r of rows) {
    const found = (await watcher`
      SELECT status FROM booking WHERE id = ${r.bookingId}`) as unknown as { status: string }[];
    seenAtCallTime.push({ bookingId: r.bookingId, status: found[0]?.status ?? null });
  }
  return rows.map(() => "retired" as const);
}

const retireBatchMock = vi.fn(observeThenRetire);
/** Never expected to be called from `units.ts` — it calls the BATCH form. Present so the mock is total. */
const retireOneMock = vi.fn(async (): Promise<RetireOutcome> => "retired");

/** The mock's calls flattened to the two things every case asserts on: the rows, and the trigger. */
function retireCalls(): Array<{ rows: RetirableSession[]; trigger: string }> {
  return retireBatchMock.mock.calls.map((c) => ({
    rows: c[0] as RetirableSession[],
    trigger: (c as unknown as [RetirableSession[], string])[1],
  }));
}

/** The status of a booking read through the SECOND connection — the database truth, never a return value. */
async function statusOf(id: string): Promise<string | null> {
  const rows = (await watcher`SELECT status FROM booking WHERE id = ${id}`) as unknown as {
    status: string;
  }[];
  return rows[0]?.status ?? null;
}

/** The columns the "this plan writes no booking row of its own" claim is read back on. */
async function rowOf(id: string) {
  const rows = (await watcher`
    SELECT status, expires_at, checkout_session_id FROM booking WHERE id = ${id}`) as unknown as {
    status: string;
    expires_at: Date | null;
    checkout_session_id: string | null;
  }[];
  return rows[0] ?? null;
}

// ── The EXCLUSIVE fixture windows. One venue-local Monday, one hour per case, so no two seeded rows ever
// meet on the booking_no_overlap EXCLUDE and one case's reclaim can never reach another's row.
const W_RECLAIM = venueWindow({ hour: 6, weekday: MONDAY });
const W_POSTCOMMIT = venueWindow({ hour: 18, weekday: MONDAY });
const W_REJECT = venueWindow({ hour: 8, weekday: MONDAY });
const W_FAILED = venueWindow({ hour: 10, weekday: MONDAY });
const W_NOSESSION = venueWindow({ hour: 12, weekday: MONDAY });
const W_DEADLOCK = venueWindow({ hour: 14, weekday: MONDAY });
const W_NOTHING = venueWindow({ hour: 16, weekday: MONDAY });

// ── The OPEN-CAPACITY fixture day (OC-03), anchored ~30 days out and derived from the clock for the same
// reason: the shipped claim refuses a closed pass window and one beyond the 90-day horizon.
const OC_ANCHOR = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const OC_DAY_OPEN = new Date(
  Date.UTC(OC_ANCHOR.getUTCFullYear(), OC_ANCHOR.getUTCMonth(), OC_ANCHOR.getUTCDate(), 22, 0, 0),
); // 06:00 Manila
const OC_DAY_CLOSE = new Date(OC_DAY_OPEN.getTime() + 16 * 60 * 60 * 1000); // 22:00 Manila
const OC_DAY_START = new Date(OC_DAY_OPEN.getTime() - 6 * 60 * 60 * 1000); // venue-local midnight
const OC_DAY_END = new Date(OC_DAY_START.getTime() + 24 * 60 * 60 * 1000);
const OC_DATE_KEY = new Date(OC_DAY_OPEN.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** Seed a LAPSED hold — expired one minute ago against the DB clock — carrying (or not) a session id. */
async function seedLapsedHold(opts: {
  id: string;
  listingId: string;
  startsAt: Date;
  endsAt: Date;
  checkoutSessionId: string | null;
  openCapacity?: boolean;
  status?: "pending" | "requested" | "approved";
}): Promise<void> {
  await testDb.db.insert(booking).values({
    id: opts.id,
    listingId: opts.listingId,
    unit: 1,
    bookerId: BOOKER,
    startsAt: opts.startsAt,
    endsAt: opts.endsAt,
    status: opts.status ?? "pending",
    quotedTotalCents: 5000,
    currency: "php",
    openCapacity: opts.openCapacity ?? false,
    // An open row's counter SUMs declared_pax, so an open fixture must carry one or it occupies nothing.
    declaredPax: opts.openCapacity ? 1 : null,
    expiresAt: new Date(Date.now() - 60_000),
    checkoutSessionId: opts.checkoutSessionId,
  });
}

/** Place an exclusive hold for a booker who is NOT the lapsed hold's owner (never a D-42 replay). */
function placeOverlapping(w: { start: Date; end: Date }, db: TestDb["db"] = testDb.db) {
  return units.createPendingHold(db, {
    listingId: L_EXCL,
    bookerId: OTHER,
    startsAt: w.start,
    endsAt: w.end,
  });
}

/** Claim one open-capacity pass on the fixture day. */
function claimOpenPass(bookerId: string, db: TestDb["db"] = testDb.db) {
  return units.createOpenCapacityHold(db, {
    listingId: L_OPEN,
    bookerId,
    dayOpenUtc: OC_DAY_OPEN,
    dayCloseUtc: OC_DAY_CLOSE,
    dayStartUtc: OC_DAY_START,
    dayEndUtc: OC_DAY_END,
    dateKey: OC_DATE_KEY,
    requestedHeads: 1,
    idempotencyKey: null,
  });
}

/**
 * A `db` whose FIRST `transaction(...)` runs the real callback and then throws a 40P01, forcing
 * `createPendingHold`'s outer retry to re-run the whole transaction. The rollback undoes the first
 * attempt's reclaim, so the second attempt reclaims the SAME row again — which is precisely the shape
 * that would make an accumulating list hand the policy one session id TWICE.
 */
function deadlockOnFirstAttempt(base: TestDb["db"]): TestDb["db"] {
  let attempts = 0;
  return new Proxy(base, {
    get(target, prop, receiver) {
      if (prop !== "transaction") return Reflect.get(target, prop, receiver);
      return async (cb: (tx: unknown) => Promise<unknown>) => {
        attempts += 1;
        if (attempts > 1) return await target.transaction(cb as never);
        return await target.transaction(async (tx) => {
          await cb(tx);
          // Thrown AFTER the callback so the reclaim really did run (and really is rolled back).
          throw Object.assign(new Error("simulated deadlock_detected"), { code: "40P01" });
        });
      };
    },
  }) as TestDb["db"];
}

beforeAll(async () => {
  // FIXTURE SELF-CHECK — assert the derivation rather than assume it, so a bad window is a loud setup
  // failure here instead of a confusing "that time was just taken" six cases later.
  for (const w of [W_RECLAIM, W_POSTCOMMIT, W_REJECT, W_FAILED, W_NOSESSION, W_DEADLOCK, W_NOTHING]) {
    assertBookableWindow(w, { weekday: MONDAY });
  }

  testDb = await setupTestDb();
  watcher = makeRacingClients(testDb.schema, 1)[0];

  await testDb.db.insert(user).values([
    { id: HOST, name: "HLR Host", email: "hlr_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "HLR Booker", email: "hlr_booker@example.com", firstName: "Booker" },
    { id: OTHER, name: "HLR Other", email: "hlr_other@example.com", firstName: "Other" },
  ]);
  await testDb.db.insert(listing).values([
    {
      id: L_EXCL,
      hostId: HOST,
      title: "HLR exclusive",
      status: "published",
      unitCount: 1,
      timezone: VENUE_TZ,
      hourlyRateCents: 5000,
      dayRateCents: 30000,
      currency: "php",
    },
    {
      id: L_OPEN,
      hostId: HOST,
      title: "HLR drop-in floor",
      status: "published",
      occupancyMode: "open_capacity",
      bookingMode: "instant", // OC-10 — open capacity is instant-only
      cancellationPolicy: "standard",
      maxOccupancy: 5,
      unitCount: 1,
      timezone: VENUE_TZ,
      perHeadPriceCents: 35000,
      currency: "php",
    },
  ]);
  await testDb.db.insert(operatingHours).values({
    id: `oh_${L_EXCL}`,
    listingId: L_EXCL,
    dayOfWeek: MONDAY,
    openTime: "05:00:00",
    closeTime: "23:00:00",
  });

  vi.doMock("@/lib/payments/retire-checkout", () => ({
    retireCheckoutsForBookings: retireBatchMock,
    retireCheckoutForBooking: retireOneMock,
    RETIRE_INLINE_LIMIT: 3,
  }));
  vi.resetModules();
  units = await import("@/lib/availability/units");
});

beforeEach(() => {
  retireBatchMock.mockReset();
  retireBatchMock.mockImplementation(observeThenRetire);
  retireOneMock.mockClear();
  seenAtCallTime.length = 0;
});

afterAll(async () => {
  vi.doUnmock("@/lib/payments/retire-checkout");
  await watcher.end();
  await teardownTestDb(testDb);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
describe("the EXCLUSIVE reclaim (createPendingHold) retires the session it orphans", () => {
  // ═════════════════════════════════════════════════════════════════════════════════════════════════════

  it("(0) GUARD-THE-GUARD — a placement that reclaims NOTHING still reaches the call site, with an empty list", async () => {
    const res = await placeOverlapping(W_NOTHING);
    expect("ok" in res && res.ok).toBe(true);

    // The call site is UNCONDITIONAL by design: no `if (reclaimed.length)` guard, because the policy skips
    // a null/absent row at zero provider cost and a guard would be a second place to get the rule wrong.
    // This case is what stops every assertion below from passing vacuously against a call that never fires.
    expect(
      retireCalls(),
      "the reclaim's post-commit call site was never reached at all — every case below would then be " +
        "asserting against a mock nothing calls",
    ).toEqual([{ rows: [], trigger: "stale-hold-reclaim" }]);
  });

  it("(1) a lapsed hold's session is handed to the policy ONCE, with the NEW terminal status", async () => {
    await seedLapsedHold({
      id: "bk_hlr_stale",
      listingId: L_EXCL,
      startsAt: W_RECLAIM.start,
      endsAt: W_RECLAIM.end,
      checkoutSessionId: "cs_stale_A",
    });

    const res = await placeOverlapping(W_RECLAIM);

    // THE DATABASE TRUTH FIRST — the slot really was freed and re-sold.
    expect("ok" in res && res.ok).toBe(true);
    expect(await statusOf("bk_hlr_stale")).toBe("cancelled");

    // EXACTLY ONE call, carrying EXACTLY ONE row.
    const calls = retireCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].trigger).toBe("stale-hold-reclaim");
    expect(calls[0].rows).toEqual([
      {
        bookingId: "bk_hlr_stale",
        // Asserted on the ARGUMENT, not the count: expiring the WRONG session leaves the payable one live,
        // which is the CR-02 defect in a new coat.
        checkoutSessionId: "cs_stale_A",
        // The NEW terminal status, never the pre-flip `pending`. 13.1-04's policy stays silent about a
        // `paid` session only while the row is still `pending` (plan 02's reconciler owns that row); a
        // reclaimed row is the case NO reconciler reaches, and is precisely the one that must alert.
        bookingStatus: "cancelled",
      },
    ]);
  });

  it("(2) THE POST-COMMIT PROOF — the retire sees the COMMITTED `cancelled` row on a second connection", async () => {
    // Its OWN window, never case (1)'s: case (1) left a LIVE hold there, and re-seeding over it collides
    // on `booking_no_overlap` before a single behaviour is measured. (Observed as a 23P01 on the first
    // run of this file — a fixture fault, not a production one, and exactly the kind of setup crash the
    // one-window-per-case rule exists to prevent.)
    await seedLapsedHold({
      id: "bk_hlr_stale_pc",
      listingId: L_EXCL,
      startsAt: W_POSTCOMMIT.start,
      endsAt: W_POSTCOMMIT.end,
      checkoutSessionId: "cs_stale_PC",
    });

    await placeOverlapping(W_POSTCOMMIT);

    expect(seenAtCallTime).toHaveLength(1);
    expect(
      seenAtCallTime[0].status,
      "THE RETIRE RAN INSIDE THE TRANSACTION. A second, independent connection read this booking at the " +
        "moment the policy was called and saw the PRE-reclaim row — i.e. the flip had not COMMITTED yet. " +
        "D-113 requires the provider call to happen after the slot is durably freed, because this " +
        "transaction runs under SAVEPOINT/rollback and can be re-run wholesale on a 40P01: an in-tx call " +
        "fires once per attempt, against a flip the rollback may have undone. Do NOT fix this by relaxing " +
        "the assertion — move the call back after the transaction promise resolves.",
    ).toBe("cancelled");
    expect(seenAtCallTime[0].bookingId).toBe("bk_hlr_stale_pc");
  });

  it("(3) A REJECTING POLICY CANNOT FAIL A BOOKING — the hold still succeeds and the row is still cancelled", async () => {
    await seedLapsedHold({
      id: "bk_hlr_reject",
      listingId: L_EXCL,
      startsAt: W_REJECT.start,
      endsAt: W_REJECT.end,
      checkoutSessionId: "cs_stale_REJ",
    });
    retireBatchMock.mockRejectedValue(new Error("PayMongo is down"));

    const res = await placeOverlapping(W_REJECT);

    // ⚠ In PRODUCTION the policy cannot reject at all — 13.1-04 Task 1 asserts its never-throw contract
    // three ways with `.resolves`. This case proves the CALL SITE is safe EVEN SO, which is the property
    // `mapBookingError`'s unknown-error RE-THROW makes non-obvious: a throwing policy would surface a
    // PayMongo outage as a failed booking for a booker who did nothing wrong.
    expect(
      "ok" in res && res.ok,
      "a rejecting retire policy FAILED A BOOKER'S HOLD. Freeing a slot is FitOut's own act and must " +
        "never depend on a third party answering (D-113). Either the policy has been 'hardened' into " +
        "throwing, or the call site has been moved somewhere `mapBookingError` can see it.",
    ).toBe(true);
    expect(await statusOf("bk_hlr_reject")).toBe("cancelled");
    expect(retireCalls()).toHaveLength(1);
  });

  it("(4) A `failed` OUTCOME IS NOT AN ERROR — the reclaim stands and the hold is unaffected", async () => {
    await seedLapsedHold({
      id: "bk_hlr_failed",
      listingId: L_EXCL,
      startsAt: W_FAILED.start,
      endsAt: W_FAILED.end,
      checkoutSessionId: "cs_stale_FAIL",
    });
    retireBatchMock.mockResolvedValue(["failed"]);

    const res = await placeOverlapping(W_FAILED);

    // A failed expiry is an operator alert the POLICY writes (`checkout_expire_failed` /
    // `needs_attention`, D-110) — never a rollback and never a caller-visible error. This call site
    // deliberately ignores the returned outcomes; nothing durable here is conditional on them.
    expect("ok" in res && res.ok).toBe(true);
    expect(await statusOf("bk_hlr_failed")).toBe("cancelled");
  });

  it("(5) NOTHING TO RETIRE IS UNIFORM, NOT SPECIAL — a NULL session id is still handed over", async () => {
    await seedLapsedHold({
      id: "bk_hlr_nosession",
      listingId: L_EXCL,
      startsAt: W_NOSESSION.start,
      endsAt: W_NOSESSION.end,
      checkoutSessionId: null,
    });

    const res = await placeOverlapping(W_NOSESSION);

    expect("ok" in res && res.ok).toBe(true);
    // The policy owns "NULL is normal, not an error" and skips such a row without spending provider
    // budget. Filtering here instead would be a SECOND place that rule lives, free to drift from the first.
    expect(retireCalls()).toEqual([
      {
        rows: [{ bookingId: "bk_hlr_nosession", checkoutSessionId: null, bookingStatus: "cancelled" }],
        trigger: "stale-hold-reclaim",
      },
    ]);
  });

  it("(6) A 40P01 RE-RUN REPLACES THE RECLAIMED LIST, never accumulates it", async () => {
    await seedLapsedHold({
      id: "bk_hlr_deadlock",
      listingId: L_EXCL,
      startsAt: W_DEADLOCK.start,
      endsAt: W_DEADLOCK.end,
      checkoutSessionId: "cs_stale_DL",
    });

    const res = await placeOverlapping(W_DEADLOCK, deadlockOnFirstAttempt(testDb.db));

    // The first attempt's reclaim was ROLLED BACK, so it retired nothing and its rows must not survive
    // into the second attempt's list. One genuine flip ⇒ one call ⇒ one row ⇒ one session id.
    expect("ok" in res && res.ok).toBe(true);
    expect(await statusOf("bk_hlr_deadlock")).toBe("cancelled");
    const calls = retireCalls();
    expect(
      calls,
      "the retire fired on a rolled-back transaction attempt — an in-tx (or accumulating) implementation " +
        "would hand the policy a session id belonging to a flip that no longer exists in the database",
    ).toHaveLength(1);
    expect(calls[0].rows.map((r) => r.checkoutSessionId)).toEqual(["cs_stale_DL"]);
    // …and the post-commit proof still holds on the attempt that actually committed.
    expect(seenAtCallTime).toEqual([{ bookingId: "bk_hlr_deadlock", status: "cancelled" }]);
  });

  it("(7) THE RETIRE WRITES NO BOOKING ROW — the reclaimed row is exactly what the reclaim left", async () => {
    // The reclaim's own UPDATE is the ONLY write: status terminal, expires_at NULL, and — the one that
    // matters — `checkout_session_id` STILL INTACT. Nulling it would destroy the operator's handle on a
    // session that may hold real money, and would strand plan 13.1-02's reconciler with nothing to probe.
    const row = await rowOf("bk_hlr_stale");
    expect(row).not.toBeNull();
    expect(row!.status).toBe("cancelled");
    expect(row!.expires_at).toBeNull();
    expect(row!.checkout_session_id).toBe("cs_stale_A");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
describe("the OPEN-CAPACITY reclaim (createOpenCapacityHold) retires the session it orphans", () => {
  // The SECOND reclaim, in the same file, on the same defect — and NOT named in D-113's own evidence,
  // which cites only `units.ts:485-491`. An open-capacity hold reaches checkout exactly like an exclusive
  // one, so a plan that wired only the cited site would have read as closed with the hole still open.
  // ═════════════════════════════════════════════════════════════════════════════════════════════════════

  it("(8) a lapsed open pass's session is handed over ONCE, post-commit, with trigger `open-capacity-reclaim`", async () => {
    await seedLapsedHold({
      id: "bk_hlr_oc",
      listingId: L_OPEN,
      startsAt: OC_DAY_OPEN,
      endsAt: OC_DAY_CLOSE,
      checkoutSessionId: "cs_stale_OC",
      openCapacity: true,
    });

    const res = await claimOpenPass(OTHER);

    expect("ok" in res && res.ok).toBe(true);
    expect(await statusOf("bk_hlr_oc")).toBe("cancelled");

    const calls = retireCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].trigger).toBe("open-capacity-reclaim");
    expect(calls[0].rows).toEqual([
      { bookingId: "bk_hlr_oc", checkoutSessionId: "cs_stale_OC", bookingStatus: "cancelled" },
    ]);

    // THE POST-COMMIT PROOF, again on a second connection — and here it carries a SECOND meaning. This
    // reclaim sits under the transaction-scoped advisory lock whose own rule reads "NO EXTERNAL I/O MAY
    // OCCUR BETWEEN THIS LINE AND COMMIT". A call that could see an uncommitted row would be a fetch
    // inside that lock, holding every other booker's claim on this (listing, date) for PayMongo's latency.
    expect(
      seenAtCallTime,
      "THE RETIRE RAN INSIDE THE ADVISORY-LOCKED TRANSACTION — see the rule stated at step (1) of " +
        "createOpenCapacityHold. Move the call back after the transaction promise resolves.",
    ).toEqual([{ bookingId: "bk_hlr_oc", status: "cancelled" }]);
  });

  it("(9) A REJECTING POLICY CANNOT FAIL A CLAIM — the pass is still sold and the row is still cancelled", async () => {
    await seedLapsedHold({
      id: "bk_hlr_oc_reject",
      listingId: L_OPEN,
      startsAt: OC_DAY_OPEN,
      endsAt: OC_DAY_CLOSE,
      checkoutSessionId: "cs_stale_OCREJ",
      openCapacity: true,
    });
    retireBatchMock.mockRejectedValue(new Error("PayMongo is down"));

    const res = await claimOpenPass(BOOKER);

    expect(
      "ok" in res && res.ok,
      "a rejecting retire policy FAILED an open-capacity claim — the same D-113 violation as the " +
        "exclusive case, reached through `createOpenCapacityHold`'s own outer catch",
    ).toBe(true);
    expect(await statusOf("bk_hlr_oc_reject")).toBe("cancelled");
    expect(retireCalls()).toHaveLength(1);
  });
});
