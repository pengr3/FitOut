// D-105 — THE CONFIRM IS RUN TWICE, NOT READ TWICE.
//
// `src/lib/payments/confirm-booking-payment.ts` claims that exactly one caller can ever move a booking to
// `confirmed`, sequentially OR concurrently, and that every side effect is gated on winning that claim.
// This repository has a documented history of tests that could not fail — a fail-closed guard asserted by
// the value it returns, a closed-set walk that stayed green with its predicate hardwired `true`, a
// committed assertion that locked in a false money claim. So NOTHING here asserts that something did not
// throw. Every case counts OBSERVABLE EFFECTS against a captured array: notify emissions, `createRefund`
// calls, audit records, and the row's own committed columns.
//
// WHY THE CONCURRENT CASE IS NOT OPTIONAL. The sequential case cannot distinguish "the status-scoped WHERE
// is the claim" from "the second call happened to read a row the first had already finished writing". Only
// two INDEPENDENT connections racing the same row exercise the row lock — which is the actual mechanism a
// 5-minute reconciliation sweep will race the webhook against. `tests/helpers/db.ts`'s ordinary client is
// `max: 1`, so a `Promise.all` over it would SERIALIZE and prove nothing; `makeRacingClients` exists for
// exactly this and is what case 2 uses.
//
// ── THE DELIBERATE BREAK, OBSERVED 2026-08-22 (13.1-01 Task 3) ──────────────────────────────────────────
// A guard that cannot be broken on demand has not been proven. The confirm's WHERE was widened to drop the
// status scope:
//
//     WHERE id = ${bookingId} AND status IN ('pending','approved')   →   WHERE id = ${bookingId}
//
// and this file was re-run. Observed RED — FIVE of the seven cases, verbatim from the run:
//
//   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
//    FAIL  … > (1) SEQUENTIAL RE-ENTRY — the second call is a no-op: one transition, one email, zero refunds
//   AssertionError: expected 'confirmed' to be 'already-confirmed' // Object.is equality
//   Expected: "already-confirmed"
//   Received: "confirmed"
//    ❯ tests/payments/confirm-idempotency.test.ts:255:20
//
//    FAIL  … > (2) CONCURRENT RE-ENTRY — two independent connections race the same row
//   AssertionError: both callers won the claim — the status-scoped WHERE is no longer the guard:
//   expected [ 'confirmed', 'confirmed' ] to deeply equal [ 'already-confirmed', 'confirmed' ]
//   - Expected
//   + Received
//     [
//   -   "already-confirmed",
//   +   "confirmed",
//       "confirmed",
//     ]
//    ❯ tests/payments/confirm-idempotency.test.ts:285:7
//
//    FAIL  … > (3) GONE SLOT, REFUNDABLE RAIL …   AssertionError: expected 'confirmed' to be 'gone-refunded'
//    FAIL  … > (4) GONE SLOT, UNREFUNDABLE RAIL … AssertionError: expected 'confirmed' to be 'gone-manual-return'
//    FAIL  … > (5) RE-RUN OVER A GONE SLOT …      AssertionError: expected 'confirmed' to be 'gone-manual-return'
//
// The three extra reds are themselves informative and were NOT predicted: without the status scope the
// confirm happily resurrects a `cancelled` booking to `confirmed`, so the D-58 gone-slot backstop becomes
// unreachable entirely — a booker whose slot was retaken during payment would keep neither the slot nor
// their money's refund. The one clause carries BOTH guarantees.
//
// The module was restored from a saved copy (never `git checkout --`, which has destroyed a probe's own
// uncommitted work in this repo before). The WHERE scope is therefore the claim, demonstrated rather than
// asserted from reading.

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { user, listing, booking } from "@/lib/db/schema";
import { mockPayMongo } from "../helpers/mocks";
import { bookingReference } from "@/lib/booking/reference";
import type { DbConn } from "@/lib/availability/read-model";

let testDb: TestDb;
type ConfirmModule = typeof import("@/lib/payments/confirm-booking-payment");
let confirmPaidBooking: ConfirmModule["confirmPaidBooking"];

/** Two INDEPENDENT connections bound to the same isolated schema — the real concurrency for case 2. */
let racing: ReturnType<typeof makeRacingClients> = [];
let dbA: DbConn;
let dbB: DbConn;

const HOST = "ci_host";
const BOOKER = "ci_booker";
const BOOKER_EMAIL = "ci_booker@example.com";
const LISTING = "L_ci";

/** The operator-alert sink. Mocked so a `needs_attention` record is COUNTABLE, never merely absent. */
const recordAuditMock = vi.fn(async () => {});

/** The `fitout/notify` envelope, exactly as `emitNotify` hands it to the Inngest client. */
type NotifyEnvelope = {
  name: string;
  data: {
    type: string;
    recipientId: string;
    bookingId: string | null;
    email: string | null;
    payload: { referenceLabel?: string };
  };
};

/**
 * The Inngest client, stubbed at the MODULE the confirm's graph actually resolves — the idiom
 * `tests/paymongo/webhook-payment-paid.test.ts` uses. A `vi.spyOn` on an import held by THIS file would
 * patch the pre-`resetModules` instance and silently miss, and because `emitNotify` swallows its own
 * transport errors the miss would look EXACTLY like a pass. That is why case (0) exists.
 */
const inngestSend = vi.fn(async (event: NotifyEnvelope) => ({ ids: [event.name] }));

/** Every `booking_confirmed` emission for `bookingId`, keyed on the deterministic FIT- reference. */
function confirmedEmissions(bookingId: string): NotifyEnvelope[] {
  const ref = bookingReference(bookingId);
  return inngestSend.mock.calls
    .map((c) => c[0])
    .filter(
      (e) =>
        e.name === "fitout/notify" &&
        e.data.type === "booking_confirmed" &&
        e.data.payload.referenceLabel === ref,
    );
}

/** A distinct 1-hour UTC window per booking so seeded rows never collide on the booking_no_overlap EXCLUDE. */
function windowAt(hourUtc: number): { startsAt: Date; endsAt: Date } {
  const h = String(hourUtc).padStart(2, "0");
  const h1 = String(hourUtc + 1).padStart(2, "0");
  return {
    startsAt: new Date(`2026-12-01T${h}:00:00.000Z`),
    endsAt: new Date(`2026-12-01T${h1}:00:00.000Z`),
  };
}

async function seedBooking(opts: {
  id: string;
  status: "pending" | "approved" | "confirmed" | "cancelled";
  hourUtc: number;
  quotedTotalCents?: number;
  expiresAtMs?: number | null;
  paymentId?: string | null;
}): Promise<void> {
  const { startsAt, endsAt } = windowAt(opts.hourUtc);
  await testDb.db.insert(booking).values({
    id: opts.id,
    listingId: LISTING,
    unit: 1,
    bookerId: BOOKER,
    startsAt,
    endsAt,
    status: opts.status,
    quotedTotalCents: opts.quotedTotalCents ?? 150000,
    currency: "php",
    expiresAt: opts.expiresAtMs != null ? new Date(opts.expiresAtMs) : null,
    paymentId: opts.paymentId ?? null,
  });
}

async function readBooking(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      expiresAt: booking.expiresAt,
      paymentId: booking.paymentId,
      paymentMethod: booking.paymentMethod,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

/** Every `createRefund` call recorded so far, as its argument object — counted, never merely "not called". */
function refundCalls(): Array<{ amountCents: number; paymentId: string }> {
  return mockPayMongo.createRefund.mock.calls.map(
    (c) => c[0] as { amountCents: number; paymentId: string },
  );
}

/** Every audit record raised so far — same discipline: a captured array, so "exactly one" is a length. */
function auditRecords(): Array<{ action: string; outcome: string }> {
  return recordAuditMock.mock.calls.map(
    (c) => (c as unknown as [{ action: string; outcome: string }])[0],
  );
}

beforeAll(async () => {
  testDb = await setupTestDb();

  await testDb.db.insert(user).values([
    { id: HOST, name: "CI Host", email: "ci_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "CI Booker", email: BOOKER_EMAIL, firstName: "Booker" },
  ]);
  await testDb.db.insert(listing).values({
    id: LISTING,
    hostId: HOST,
    title: "CI Listing",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 150000,
    dayRateCents: 300000,
  });

  racing = makeRacingClients(testDb.schema, 2);
  dbA = drizzle(racing[0]) as unknown as DbConn;
  dbB = drizzle(racing[1]) as unknown as DbConn;

  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  // The gone-slot backstop refunds via createRefund; mock it so no live PayMongo call fires AND so the
  // call is countable. If this stub ever missed, case (3) would read ZERO refunds and go red.
  vi.doMock("@/lib/paymongo", () => ({ createRefund: mockPayMongo.createRefund }));
  vi.doMock("@/lib/audit", () => ({ recordAudit: recordAuditMock }));
  vi.doMock("@/inngest/client", () => ({ inngest: { send: inngestSend } }));
  vi.resetModules();
  ({ confirmPaidBooking } = await import("@/lib/payments/confirm-booking-payment"));
});

beforeEach(() => {
  recordAuditMock.mockClear();
  mockPayMongo.createRefund.mockClear();
  mockPayMongo.createRefund.mockResolvedValue({ id: "ref_ci", status: "pending" });
  inngestSend.mockClear();
  inngestSend.mockResolvedValue({ ids: [] });
});

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("@/lib/audit");
  vi.doUnmock("@/inngest/client");
  await Promise.all(racing.map((c) => c.end()));
  await teardownTestDb(testDb);
});

describe("confirmPaidBooking — D-105's single idempotent confirm path", () => {
  // ────────────────────────────────────────────────────────────────────────────────────────────────────
  // (0) GUARD-THE-GUARD. Every "exactly one" below is only worth something if the Inngest stub is
  //     actually in the module graph. `emitNotify` swallows its own transport errors by design, so a
  //     stub that missed would produce ZERO emissions and every "exactly one email" assertion in this
  //     file would pass VACUOUSLY against a silent emitter. This case asserts the positive floor first —
  //     the same discipline `tests/design/money-path-invariants.test.ts:44-49` uses for its directory read.
  // ────────────────────────────────────────────────────────────────────────────────────────────────────
  it("(0) GUARD-THE-GUARD — one confirm of a fresh pending booking emits EXACTLY ONE booking_confirmed", async () => {
    const id = "bk_ci_guard";
    await seedBooking({ id, status: "pending", hourUtc: 1, expiresAtMs: Date.now() + 30 * 60 * 1000 });

    const outcome = await confirmPaidBooking({
      bookingId: id,
      paymentId: "pay_ci_guard",
      paymentMethod: "card",
    });

    expect(outcome).toBe("confirmed");
    // If this reads 0 the stub missed and NOTHING below this line proves anything.
    expect(
      confirmedEmissions(id),
      "the Inngest stub is not in the module graph — every 'exactly one email' assertion below would be vacuous",
    ).toHaveLength(1);
    expect(confirmedEmissions(id)[0].data.recipientId).toBe(BOOKER);
    expect(confirmedEmissions(id)[0].data.email).toBe(BOOKER_EMAIL);
    expect(refundCalls()).toHaveLength(0);
    expect(auditRecords()).toHaveLength(0);
  });

  it("(1) SEQUENTIAL RE-ENTRY — the second call is a no-op: one transition, one email, zero refunds", async () => {
    const id = "bk_ci_seq";
    await seedBooking({ id, status: "pending", hourUtc: 2, expiresAtMs: Date.now() + 30 * 60 * 1000 });

    const first = await confirmPaidBooking({
      bookingId: id,
      paymentId: "pay_ci_seq_FIRST",
      paymentMethod: "card",
    });
    // A second caller with DIFFERENT facts — a sweep that probed the provider after the webhook already
    // landed. It must not rewrite the money columns the winning claim froze.
    const second = await confirmPaidBooking({
      bookingId: id,
      paymentId: "pay_ci_seq_SECOND",
      paymentMethod: "gcash",
    });

    expect(first).toBe("confirmed");
    expect(second).toBe("already-confirmed");

    const row = await readBooking(id);
    expect(row.status).toBe("confirmed");
    expect(row.expiresAt).toBeNull();
    // NOT rewritten by the loser: the second call's pay_... and rail never reached the row.
    expect(row.paymentId).toBe("pay_ci_seq_FIRST");
    expect(row.paymentMethod).toBe("card");

    expect(confirmedEmissions(id)).toHaveLength(1);
    expect(refundCalls()).toHaveLength(0);
    expect(auditRecords()).toHaveLength(0);
  });

  it("(2) CONCURRENT RE-ENTRY — two independent connections race the same row", async () => {
    // The case the sequential one CANNOT cover: a real sweep-versus-webhook race, both statements in
    // flight at once against the same row. `dbA`/`dbB` are separate backend connections, so the loser
    // genuinely blocks on the row lock and re-evaluates its WHERE against the committed version.
    const id = "bk_ci_conc";
    await seedBooking({ id, status: "pending", hourUtc: 3, expiresAtMs: Date.now() + 30 * 60 * 1000 });

    const results = await Promise.all([
      confirmPaidBooking({ bookingId: id, paymentId: "pay_ci_conc_A", paymentMethod: "card" }, dbA),
      confirmPaidBooking({ bookingId: id, paymentId: "pay_ci_conc_B", paymentMethod: "gcash" }, dbB),
    ]);

    // Exactly one winner and exactly one loser — not merely "both settled".
    expect(
      [...results].sort(),
      "both callers won the claim — the status-scoped WHERE is no longer the guard",
    ).toEqual(["already-confirmed", "confirmed"]);

    // …and the row carries the WINNER's facts specifically. Promise.all preserves order, so results[0]
    // is caller A. This is what proves the loser wrote nothing at all, rather than writing second.
    const winnerPaymentId = results[0] === "confirmed" ? "pay_ci_conc_A" : "pay_ci_conc_B";
    const winnerRail = results[0] === "confirmed" ? "card" : "gcash";

    const row = await readBooking(id);
    expect(row.status).toBe("confirmed");
    expect(row.expiresAt).toBeNull();
    expect(row.paymentId).toBe(winnerPaymentId);
    expect(row.paymentMethod).toBe(winnerRail);

    expect(confirmedEmissions(id)).toHaveLength(1);
    expect(refundCalls()).toHaveLength(0);
    expect(auditRecords()).toHaveLength(0);
  });

  it("(3) GONE SLOT, REFUNDABLE RAIL — exactly one refund for the FROZEN amount, no email (D-108 retained)", async () => {
    const id = "bk_ci_gone_gcash";
    await seedBooking({ id, status: "cancelled", hourUtc: 4, quotedTotalCents: 99900 });

    const outcome = await confirmPaidBooking({
      bookingId: id,
      paymentId: "pay_ci_gone_1",
      paymentMethod: "gcash",
    });

    expect(outcome).toBe("gone-refunded");

    // The SERVER-FROZEN amount off the row, never a caller-supplied figure.
    const refunds = refundCalls();
    expect(refunds).toHaveLength(1);
    expect(refunds[0].amountCents).toBe(99900);
    expect(refunds[0].paymentId).toBe("pay_ci_gone_1");

    expect(auditRecords()).toHaveLength(0); // a successful auto-refund raises no operator alert
    expect(confirmedEmissions(id)).toHaveLength(0);
    expect((await readBooking(id)).status).toBe("cancelled"); // stays terminal
  });

  it("(4) GONE SLOT, UNREFUNDABLE RAIL (qrph) — zero refunds, exactly one needs_attention alert", async () => {
    // REFUNDABLE_RAILS is unwidened (D-108; QRPh re-probed 2026-08-21, identical HTTP 400). Calling the
    // API here would 4xx. The zero-refund assertion is paired with a POSITIVE one — the alert actually
    // fired — because an absence on its own is exactly the shape a silently-broken stub produces.
    const id = "bk_ci_gone_qrph";
    await seedBooking({ id, status: "cancelled", hourUtc: 5, quotedTotalCents: 210000 });

    const outcome = await confirmPaidBooking({
      bookingId: id,
      paymentId: "pay_ci_gone_2",
      paymentMethod: "qrph",
    });

    expect(outcome).toBe("gone-manual-return");
    expect(refundCalls()).toHaveLength(0);

    const audits = auditRecords();
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe("auto_refund_manual");
    expect(audits[0].outcome).toBe("needs_attention");

    expect(confirmedEmissions(id)).toHaveLength(0);
    expect((await readBooking(id)).status).toBe("cancelled");
  });

  it("(5) RE-RUN OVER A GONE SLOT — the money-critical count stays ZERO across a second pass (T-13.1-06)", async () => {
    // A 5-minute sweep must never turn one dead row into a SECOND real API call against a real payment.
    // That is the property the threat register names for this case, and it is absolute.
    const id = "bk_ci_gone_rerun";
    await seedBooking({ id, status: "cancelled", hourUtc: 6, quotedTotalCents: 180000 });

    const first = await confirmPaidBooking({
      bookingId: id,
      paymentId: "pay_ci_rerun",
      paymentMethod: "qrph",
    });
    const second = await confirmPaidBooking({
      bookingId: id,
      paymentId: "pay_ci_rerun",
      paymentMethod: "qrph",
    });

    expect(first).toBe("gone-manual-return");
    expect(second).toBe("gone-manual-return");
    expect(refundCalls(), "a re-run must never fire a second refund against a real payment").toHaveLength(0);
    expect(confirmedEmissions(id)).toHaveLength(0);
    expect((await readBooking(id)).status).toBe("cancelled");

    // ┌──────────────────────────────────────────────────────────────────────────────────────────────┐
    // │ RECORDED DEFECT — THE NUMBER BELOW IS AN OBSERVATION, NOT A TARGET. DO NOT READ IT AS AN      │
    // │ ENDORSEMENT.                                                                                  │
    // │                                                                                              │
    // │ 13.1-01 Task 3 asked for "the audit record count does not grow past what a single genuine     │
    // │ gone-slot claim writes". MEASURED 2026-08-22: it DOES grow. Two passes over one dead row      │
    // │ produce TWO `auto_refund_manual` / `needs_attention` records, because `handleGoneSlot`'s      │
    // │ re-read only short-circuits on `status === 'confirmed'` — a `cancelled` row falls through to  │
    // │ the alert branch every single time. Today that is unreachable in production: the webhook's    │
    // │ `paymongo_event` id ledger sits in front of the only caller, so one event alerts once.        │
    // │                                                                                              │
    // │ THE CONSEQUENCE, AND WHERE IT MUST BE CLOSED. A 5-minute sweep (plan 02) has NO event ledger. │
    // │ If its candidate set ever includes a terminal row that PayMongo reports as paid, this row     │
    // │ raises a `needs_attention` every five minutes forever, and D-110's "a missed webhook is LOUD" │
    // │ dies of noise. THE FIX BELONGS IN THE SWEEP'S QUERY — its candidates must be `pending` /      │
    // │ `approved` bookings only, so a terminal row is never handed to `confirmPaidBooking` at all.   │
    // │ It does NOT belong here: de-duplicating the alert inside the backstop needs durable           │
    // │ per-booking state, and 13.1-CONTEXT D-112 keeps this phase at zero migrations.                │
    // │                                                                                              │
    // │ ⚠ IF THIS LINE GOES RED BECAUSE THE COUNT BECAME 1, THE DEFECT WAS FIXED. Update this comment │
    // │ and the expectation to 1. Do NOT "restore" the 2.                                             │
    // │                                                                                              │
    // │ What is NOT negotiable is the assertion above it: `createRefund` stays at ZERO across the     │
    // │ re-run (T-13.1-06). Money never moves twice; only the alert repeats.                          │
    // └──────────────────────────────────────────────────────────────────────────────────────────────┘
    const audits = auditRecords();
    expect(audits, "see the RECORDED DEFECT block above — this pins observed behaviour").toHaveLength(2);
    expect(audits.every((a) => a.action === "auto_refund_manual")).toBe(true);
    expect(audits.every((a) => a.outcome === "needs_attention")).toBe(true);
  });

  it("(6) NOT FOUND — an unknown booking id resolves not-found and writes nothing", async () => {
    const id = "bk_ci_does_not_exist";

    const outcome = await confirmPaidBooking({
      bookingId: id,
      paymentId: "pay_ci_ghost",
      paymentMethod: "card",
    });

    expect(outcome).toBe("not-found");
    expect(confirmedEmissions(id)).toHaveLength(0);
    expect(refundCalls()).toHaveLength(0);
    expect(auditRecords()).toHaveLength(0);
    // Nothing was created either — an UPDATE that matches no row must not become an insert by any route.
    expect(await readBooking(id)).toBeUndefined();
  });
});
