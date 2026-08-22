// D-113 AT THE REQUEST-EXPIRY CRON — the release that frees a slot now closes the session it orphans.
//
// `expireOne` has two branches and the `approved → cancelled` one is THE SHARPEST LAPSE PATH IN THE
// CODEBASE. An `approved` row is BY DEFINITION one whose booker was sent to checkout — `booking.ts:840`
// claims the checkout lease under `AND status IN ('pending','approved')` — so releasing it used to leave a
// LIVE, PAYABLE PayMongo session pointing at a slot anybody could now take. The booker's open tab or
// unscanned QR could still charge them for a booking that no longer existed.
//
// ⚠ AN ACCELERANT, NOT THE GUARANTEE. 13.1-04's `checkout-retire-sweep` already retires every lapsed
// hold's session within RETIRE_INTERVAL_MINUTES — a superset of what this hourly cron ever selects. Delete
// everything this file tests and D-113 still holds. No case here asserts D-113's guarantee THROUGH this
// path; they assert only promptness and non-interference.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// THE DESIGN CHOICE THIS FILE EXISTS TO PIN: THE SESSION ID COMES FROM THE FLIP, NOT FROM THE SELECTION
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// The 13.1-05 plan specifies carrying `checkoutSessionId` on `ExpiredBooking` (i.e. reading it in
// `queryExpired` and using `row.checkoutSessionId` at the retire). That was tried and REJECTED on two
// independent measurements, both recorded here rather than argued:
//
//   (a) IT BREAKS THE SUITES THE SAME PLAN REQUIRES TO PASS UNMODIFIED. Adding the field to
//       `ExpiredBooking` and running `npx tsc --noEmit`, verbatim:
//
//         tests/booking/notify-emission.test.ts(435,44): error TS2345: Argument of type '{ id: string;
//           status: "requested"; listingId: string; bookerId: string; }' is not assignable to parameter of
//           type 'ExpiredBooking'. Property 'checkoutSessionId' is missing …
//         tests/booking/notify-emission.test.ts(467,32): error TS2345: … (same)
//         tests/booking/request-expiry.test.ts(133,3): error TS2741: Property 'checkoutSessionId' is
//           missing in type '{ id: string; status: "requested" | "approved"; listingId: string;
//           bookerId: string; }' but required in type 'ExpiredBooking'
//
//       Three call sites in TWO files — including `request-expiry.test.ts` itself, whose empty diff is one
//       of the plan's own acceptance criteria, and `notify-emission.test.ts`, which the plan never names.
//
//   (b) IT WOULD BE STALE EXACTLY WHERE IT MATTERS MOST, which is the half that would have survived
//       (a) being worked around with an optional field. `queryExpired` runs in ONE Inngest step and each
//       `expireOne` in ANOTHER; an `approved` row's payment window is HOURS wide, and `booking.ts:840`
//       attaches the session under `status IN ('pending','approved')`. So a booker who starts checkout
//       between the two steps has a session that the SELECTION never saw. Case (6) below drives exactly
//       that sequence and asserts the retire still receives `cs_late_C` — under the plan's design it would
//       have received `null`, retired nothing, and looked perfectly correct while the session stayed
//       payable on a released slot.
//
// So `expireOne` retires from its OWN `RETURNING checkout_session_id`, read in the same statement that
// frees the slot. That is also what T-13.1-54 requires in the plan's own threat register ("never from a
// separate read"), so the plan's prose and its threat register disagreed; the register is the half kept.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// THE DELIBERATE BREAKS — THREE APPLIED. OBSERVED 2026-08-22. All restored from a SAVED COPY in the
// scratchpad, never `git checkout --`; `git diff --stat` on the file is empty afterwards.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
//
// ── BREAK 1: the `approved` branch's retire call deleted ── THREE red, not the one predicted ───────────
//        × (1) THE PAYMENT-WINDOW RELEASE — the released slot's session is retired, with its NEW status
//   AssertionError: expected [] to deeply equal [ { rows: [ { …(3) } ], …(1) } ]
//        × (2) IDEMPOTENCY IS INHERITED FROM THE FLIP — a second pass retires NOTHING
//   AssertionError: expected [] to have a length of 1 but got +0
//        × (6) THE SESSION ID COMES FROM THE FLIP, NOT FROM THE SELECTION
//
//   Cases (2) and (6) redden because each drives the same `approved` branch and asserts the FIRST pass
//   retired — i.e. each carries its own guard-the-guard rather than trusting case (1) to have run.
//
// ── BREAK 2: `RETURNING id, checkout_session_id` reduced back to `RETURNING id` on the approved branch ──
//        × (1) THE PAYMENT-WINDOW RELEASE — the released slot's session is retired, with its NEW status
//   AssertionError: expected [ { rows: [ { …(3) } ], …(1) } ] to deeply equal [ { rows: [ { …(3) } ], …(1) } ]
//   -         "checkoutSessionId": "cs_win_B",
//   +         "checkoutSessionId": undefined,
//        × (6) THE SESSION ID COMES FROM THE FLIP, NOT FROM THE SELECTION
//   AssertionError: the retire read the session id from the SELECTION instead of from the flip's own
//   RETURNING. […full message, verbatim at case (6)…]
//   -     "checkoutSessionId": "cs_late_C",
//   +     "checkoutSessionId": undefined,
//
//   ⚠ THE FAILURE IS `undefined`, NOT `null`, AND THAT DISTINCTION IS WHY THESE CASES ASSERT ON THE
//   ARGUMENT RATHER THAN THE CALL COUNT. A dropped column produces a row the policy classifies as
//   `no-session` and skips in silence — the retire would still be "called once", still return cleanly, and
//   every session on this path would stay payable forever with nothing failing to say so.
//
// ── BREAK 3: the `flipped.length === 0 → noop` guard removed from the approved branch ───────────────────
//        × (2) IDEMPOTENCY IS INHERITED FROM THE FLIP — a second pass retires NOTHING
//   TypeError: Cannot read properties of undefined (reading 'checkout_session_id')
//    ❯ Module.expireOne src/inngest/functions/request-expiry.ts:154:50
//
// ⚠ REPORTED AS OBSERVED, NOT AS PREDICTED. The case DOES redden on exactly the break it is written for,
// but NOT with its own explaining assertion: without the guard, `flipped[0]` is `undefined` on the second
// pass and the retire's argument list throws before any assertion is reached. The dedupe claim is
// therefore protected TWICE — by the `noop` early return and, downstream of it, by the fact that the
// retire reads off the flipped row and cannot be reached without one. The guard is NOT made
// null-tolerant (`flipped[0]?.…`) to "fix" the shape of this red: that would convert a loud crash into a
// silent extra retire on every hourly pass, which is the failure the guard exists to prevent.

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { venueWindow, assertBookableWindow, instantAt } from "../helpers/dates";
import { user, listing, booking } from "@/lib/db/schema";
import type { RetirableSession, RetireOutcome } from "@/lib/payments/retire-checkout";

// `vi.hoisted` because `vi.mock` is hoisted above every `const`: the factories would otherwise close over
// uninitialised bindings and the file would fail to load. This file imports the cron's factored functions
// directly (the sibling `request-expiry.test.ts` idiom), so the static form is the right one.
const { retireBatchMock, emitNotifyMock } = vi.hoisted(() => ({
  retireBatchMock: vi.fn(async (_rows: unknown, _trigger: string): Promise<string[]> => ["retired"]),
  emitNotifyMock: vi.fn(async (_e: { type: string; recipientId: string }) => {}),
}));

// THE POLICY IS MOCKED WHOLESALE so the CALL — its arguments, its count and its trigger — is the
// observable. The policy's own behaviour (probe-first, never expire a `paid` session, never write a
// `booking` row, never throw) is 13.1-04's subject, covered by 15 cases in
// `tests/payments/retire-checkout.test.ts` plus a live PayMongo proof. Re-asserting it here would let this
// file pass while the WIRING was wrong, which is the only thing this file is for.
vi.mock("@/lib/payments/retire-checkout", () => ({
  retireCheckoutsForBookings: retireBatchMock,
  retireCheckoutForBooking: vi.fn(async () => "retired"),
  RETIRE_INLINE_LIMIT: 3,
}));
// Mocked at the NOTIFICATIONS layer, not at the Inngest client: `emitNotify` swallows its own transport
// errors, so a rejecting `inngest.send` could never exercise "the notice pipeline failed" — which is half
// of the independence case (5).
vi.mock("@/lib/notifications", () => ({ emitNotify: emitNotifyMock }));
// The module registers its cron at import time; these cases drive `queryExpired` / `expireOne` directly.
vi.mock("@/inngest/client", () => ({
  inngest: { send: vi.fn(async () => ({ ids: [] })), createFunction: (_o: unknown, h: unknown) => h },
}));

import { queryExpired, expireOne } from "@/inngest/functions/request-expiry";

let testDb: TestDb;

const HOST = "rex_host";
const BOOKER = "rex_booker";
const LISTING = "L_rex";

// A DERIVED base day — never a calendar literal (DEF-IR9-01). No `weekday` is passed: this file seeds no
// operating_hours and the expiry path does not consult them.
const BASE = venueWindow({ hour: 2, minDaysOut: 3 });
/** A distinct 1-hour venue-local window per row, so no two seeds meet on `booking_no_overlap`. */
function windowAt(hour: number) {
  return { startsAt: instantAt(BASE.day, hour), endsAt: instantAt(BASE.day, hour + 1) };
}

/** The retire mock's calls, flattened to the two things every case asserts on. */
function retireCalls(): Array<{ rows: RetirableSession[]; trigger: string }> {
  return retireBatchMock.mock.calls.map((c) => ({
    rows: c[0] as RetirableSession[],
    trigger: c[1] as string,
  }));
}

/** Declined/expired notices emitted for the booker (this cron is the SOLE booker-notice authority, A6). */
function declinedEmissions() {
  return emitNotifyMock.mock.calls.map((c) => c[0]).filter((e) => e.type === "request_declined");
}

/** Seed a LAPSED request-to-book hold, optionally carrying a checkout session id. */
async function seedLapsed(opts: {
  id: string;
  status: "requested" | "approved";
  hour: number;
  checkoutSessionId?: string | null;
}) {
  const { startsAt, endsAt } = windowAt(opts.hour);
  await testDb.db.insert(booking).values({
    id: opts.id,
    listingId: LISTING,
    unit: 1,
    bookerId: BOOKER,
    startsAt,
    endsAt,
    status: opts.status,
    bookingMode: "request",
    quotedTotalCents: 5000,
    currency: "php",
    expiresAt: new Date(Date.now() - 60_000),
    checkoutSessionId: opts.checkoutSessionId ?? null,
  });
  // The DB clock is the sole expiry authority (T-06-16) — pin it there, not at a JS timestamp.
  await testDb.db.execute(
    sql`UPDATE booking SET expires_at = now() - interval '1 minute' WHERE id = ${opts.id}`,
  );
  return { id: opts.id, status: opts.status, listingId: LISTING, bookerId: BOOKER };
}

async function readRow(id: string) {
  const rows = (await testDb.client`
    SELECT status, expires_at, checkout_session_id FROM booking WHERE id = ${id}`) as unknown as {
    status: string;
    expires_at: Date | null;
    checkout_session_id: string | null;
  }[];
  return rows[0] ?? null;
}

beforeAll(async () => {
  assertBookableWindow(BASE);
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: HOST, name: "REX Host", email: "rex_host@example.com", firstName: "Host", emailVerified: true },
    {
      id: BOOKER,
      name: "REX Booker",
      email: "rex_booker@example.com",
      firstName: "Booker",
      emailVerified: true,
    },
  ]);
  await testDb.db.insert(listing).values({
    id: LISTING,
    hostId: HOST,
    title: "REX Listing",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Manila",
    hourlyRateCents: 5000,
    dayRateCents: 30000,
  });
});

beforeEach(() => {
  retireBatchMock.mockReset();
  retireBatchMock.mockResolvedValue(["retired" as RetireOutcome] as unknown as string[]);
  emitNotifyMock.mockReset();
  emitNotifyMock.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(async () => {
  vi.restoreAllMocks();
  await teardownTestDb(testDb);
});

describe("request-expiry closes the session it releases (D-113)", () => {
  it("(1) THE PAYMENT-WINDOW RELEASE — the released slot's session is retired, with its NEW status", async () => {
    const row = await seedLapsed({
      id: "bk_rex_win",
      status: "approved",
      hour: 4,
      checkoutSessionId: "cs_win_B",
    });

    const due = await queryExpired(testDb.db);
    expect(due.map((d) => d.id)).toContain(row.id);

    const res = await expireOne(testDb.db, due.find((d) => d.id === row.id)!);

    // The shape of `ExpireOneResult` is DELIBERATELY unchanged — no `retired` field, however informative
    // it would be in a step result. Leaving the type alone is how this change proves itself
    // behaviour-preserving against `tests/booking/request-expiry.test.ts`, which asserts it exactly.
    expect(res).toEqual({ status: "cancelled" });
    expect((await readRow(row.id))!.status).toBe("cancelled");

    // Asserted on the ARGUMENTS, not the count: retiring the WRONG session leaves the payable one live,
    // which is the CR-02 defect in a new coat.
    expect(retireCalls()).toEqual([
      {
        rows: [
          {
            bookingId: "bk_rex_win",
            checkoutSessionId: "cs_win_B",
            // The NEW terminal status. 13.1-04's policy stays silent about a `paid` session only while the
            // row is still `pending` (13.1-02's reconciler owns that row); a row this cron just flipped
            // terminal is the case NO reconciler reaches, and is precisely the one that must alert.
            bookingStatus: "cancelled",
          },
        ],
        trigger: "request-expiry",
      },
    ]);
  });

  it("(2) IDEMPOTENCY IS INHERITED FROM THE FLIP — a second pass retires NOTHING", async () => {
    const row = await seedLapsed({
      id: "bk_rex_idem",
      status: "approved",
      hour: 5,
      checkoutSessionId: "cs_idem",
    });
    const due = await queryExpired(testDb.db);
    const target = due.find((d) => d.id === row.id)!;

    expect(await expireOne(testDb.db, target)).toEqual({ status: "cancelled" });
    expect(retireCalls()).toHaveLength(1);

    retireBatchMock.mockClear();
    const second = await expireOne(testDb.db, target);

    // The status-scoped UPDATE IS the dedupe claim, and the retire RIDES ON IT rather than adding a second
    // one. `flipped.length === 0 → noop` returns before the retire is ever reached.
    expect(second).toEqual({ status: "noop" });
    expect(
      retireCalls(),
      "a second sweep pass over an already-terminal row retired its session AGAIN. The status-scoped " +
        "UPDATE is this cron's dedupe claim and the retire rides on it; if that guard goes, every hourly " +
        "pass re-POSTs to PayMongo for every historical row.",
    ).toHaveLength(0);
  });

  it("(3) THE SLA BRANCH — a `requested` row declines, notifies once, and retires a NULL session", async () => {
    const row = await seedLapsed({ id: "bk_rex_sla", status: "requested", hour: 6 });
    const due = await queryExpired(testDb.db);

    const res = await expireOne(testDb.db, due.find((d) => d.id === row.id)!);

    expect(res).toEqual({ status: "declined", notified: true });
    expect((await readRow(row.id))!.status).toBe("declined");
    expect(declinedEmissions()).toHaveLength(1);

    // THE PROVABLE NO-OP THE ENUMERATION PREDICTED, ASSERTED RATHER THAN ASSUMED. A `requested` row can
    // never carry a session id, because `src/app/actions/booking.ts:840` claims the checkout lease under
    // `AND status IN ('pending','approved')`. The call is written on this branch anyway so that the day
    // request-to-book grows a pre-approval payment, the path is already closed.
    expect(retireCalls()).toEqual([
      {
        rows: [{ bookingId: "bk_rex_sla", checkoutSessionId: null, bookingStatus: "declined" }],
        trigger: "request-expiry",
      },
    ]);
  });

  it("(4) A REJECTING POLICY CANNOT FAIL THE SWEEP — the flip stands and the notice still fires once", async () => {
    const row = await seedLapsed({ id: "bk_rex_reject", status: "requested", hour: 7 });
    const due = await queryExpired(testDb.db);
    retireBatchMock.mockRejectedValue(new Error("PayMongo is down"));

    // ⚠ In PRODUCTION the policy cannot reject at all (13.1-04 Task 1, three `.resolves` cases). This
    // proves the CALL SITE survives it anyway — the same guarantee T-06-17 already gives the notice, now
    // covering a second side-effect. `expireOne` runs inside a `step.run` that RETRIES on throw, so an
    // escaping rejection would re-run the whole row indefinitely.
    const res = await expireOne(testDb.db, due.find((d) => d.id === row.id)!);

    expect(res).toEqual({ status: "declined", notified: true });
    expect((await readRow(row.id))!.status).toBe("declined");
    expect(declinedEmissions()).toHaveLength(1);
  });

  it("(5) THE NOTICE AND THE RETIRE ARE INDEPENDENT — a failing notice cannot suppress the retire", async () => {
    const row = await seedLapsed({ id: "bk_rex_notice", status: "requested", hour: 8 });
    const due = await queryExpired(testDb.db);
    emitNotifyMock.mockRejectedValue(new Error("notify transport down"));

    const res = await expireOne(testDb.db, due.find((d) => d.id === row.id)!);

    // Both directions are proven rather than one being assumed symmetric with the other: case (4) fails
    // the retire and checks the notice; this one fails the notice and checks the retire.
    expect(res).toEqual({ status: "declined", notified: false });
    expect((await readRow(row.id))!.status).toBe("declined");
    expect(retireCalls()).toHaveLength(1);
    expect(retireCalls()[0].rows[0].bookingId).toBe("bk_rex_notice");
  });

  it("(6) THE SESSION ID COMES FROM THE FLIP, NOT FROM THE SELECTION", async () => {
    // The sweep selects an `approved` row that carries NO session…
    const row = await seedLapsed({ id: "bk_rex_late", status: "approved", hour: 9 });
    const due = await queryExpired(testDb.db);
    const selected = due.find((d) => d.id === row.id)!;

    // …and THEN the booker starts checkout, exactly as `src/app/actions/booking.ts:840` does under
    // `status IN ('pending','approved')`. `queryExpired` and `expireOne` run in SEPARATE Inngest steps and
    // an approved row's payment window is HOURS wide, so this interleaving is ordinary, not exotic.
    await testDb.db.execute(
      sql`UPDATE booking SET checkout_session_id = 'cs_late_C' WHERE id = ${row.id}`,
    );

    // The sweep proceeds with the row it selected BEFORE the session existed.
    const res = await expireOne(testDb.db, selected);
    expect(res).toEqual({ status: "cancelled" });

    expect(
      retireCalls()[0].rows,
      "the retire read the session id from the SELECTION instead of from the flip's own RETURNING. A " +
        "session claimed between the two Inngest steps is then invisible to it: the slot is released and " +
        "the booker's tab stays payable, with the retire reporting a clean `no-session` and nothing " +
        "failing to say so. Read it from the UPDATE that frees the slot.",
    ).toEqual([
      { bookingId: "bk_rex_late", checkoutSessionId: "cs_late_C", bookingStatus: "cancelled" },
    ]);
  });

  it("(7) THE RETIRE WRITES NO BOOKING ROW — the released row is exactly what the flip left", async () => {
    // The flip's own UPDATE is the ONLY write. `checkout_session_id` in particular is STILL INTACT:
    // nulling it would destroy the operator's handle on a session that may hold real money, and would
    // leave 13.1-02's reconciler with nothing to probe.
    const r = (await readRow("bk_rex_win"))!;
    expect(r.status).toBe("cancelled");
    expect(r.expires_at).toBeNull();
    expect(r.checkout_session_id).toBe("cs_win_B");
  });
});
