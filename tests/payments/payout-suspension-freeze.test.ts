// ENF-02 (phase 18 — D-222 / D-233 / D-234): the SUSPENSION PAYOUT FREEZE, both halves.
//
// ENF-02 is two sentences and the second one decides where the code goes:
//   (a) "a suspended host's pending payouts freeze, and no payout leaves for a host under suspension"
//   (b) "a frozen row does not read as a stuck row to the reconciler and does not page an operator"
//
// (a) alone would be satisfied by claiming the ledger row and then refusing to transfer. That
// implementation BREAKS (b): it strands one `held` row per suspended booking, each firing a FALSE
// [payout-alert] forever — the failure `alertStuckHeld`'s own comment names for host_cancel_fee debits.
// So the freeze is a PRE-CLAIM predicate in `queryDuePayouts`, and (b) becomes true BY CONSTRUCTION:
// no ledger row is ever created, and a row that does not exist cannot read as stuck.
//
// What this file measures, and why each case exists:
//   1. THE FREEZE          — suspending a host removes their due booking from queryDuePayouts.
//   2. NO LEDGER ROW       — running the WHOLE sweep leaves COUNT(*)=0 on host_payout_ledger for that
//                            booking. This is the case that distinguishes a pre-claim freeze from a
//                            post-claim refusal; a post-claim `if` passes case 1 and FAILS this one.
//   3. NO FALSE PAGE       — with the suspended booking well past the stuck window, alertStuckHeld
//                            returns 0 and no needs_attention audit row is written.
//   4. ZERO-WRITE UN-FREEZE— flipping the status back to `approved` yields the payout again with NO
//                            other write: the D-14 auto-revert property, asserted rather than assumed.
//   5. THE PROCESSING NEGATIVE — a stuck `processing` row on a SUSPENDED host STILL alerts. That money
//                            has already left the platform wallet; a mirror that swallowed this would be
//                            a regression dressed as a feature. Pinned so a later "completion" of the
//                            mirror fails loudly.
//   6. THE CRASH-WINDOW MIRROR — a `held` row that predates the suspension (the CR-01 window between
//                            claim and release) does NOT page. The one row the reconciler's mirror is for.
//   7. THE POLARITY        — a host with NO host_verification row, and a `rejected` host, are still PAID.
//                            `<> 'suspended'` is NOT the sell-gate's `IN ('approved','grandfathered')`;
//                            inverting it would freeze the payouts of every host nobody has checked yet.
//
// ANTI-VACUITY: every "nothing happened" assertion is paired with a CONTROL in the SAME call that DID
// happen — a second host who is still swept, still paid, still alerted on. A fail-closed guard that
// returned "no rows" for the wrong reason would take the control down with it.
//
// Isolated schema; @/lib/db and @/lib/paymongo mocked so no live PayMongo call and no dev write fires.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";
import { makeVerifiedHost } from "../helpers/seed";
import {
  audit,
  booking,
  hostPayoutLedger,
  hostVerification,
  hostVerificationStatus,
  listing,
  user,
} from "@/lib/db/schema";
import type { HostVerificationStatus } from "@/lib/db/schema";
import { loadHostVerification } from "@/lib/host/verification-status";
import { PAYOUT_DELAY_HOURS } from "@/lib/payments/config";
import type { DuePayout } from "@/inngest/functions/payout-sweep";

let testDb: TestDb;
type SweepModule = typeof import("@/inngest/functions/payout-sweep");
type ReconcileModule = typeof import("@/inngest/functions/payout-reconcile");
let queryDuePayouts: SweepModule["queryDuePayouts"];
let payOne: SweepModule["payOne"];
let queryProcessingLedger: ReconcileModule["queryProcessingLedger"];
let reconcileOne: ReconcileModule["reconcileOne"];
let alertStuckHeld: ReconcileModule["alertStuckHeld"];

const BOOKER = "freeze_booker";
const STUCK_HOURS = 48;
let prevStuckHours: string | undefined;

let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

/** Comfortably past ends_at + PAYOUT_DELAY_HOURS, so the booking is DUE on the DB clock. */
const dueMs = () => Date.now() - (PAYOUT_DELAY_HOURS + 1) * 3_600_000;
/** Older than the reconcile stuck threshold, so an aged row would page an operator. */
const stuckMs = () => Date.now() - (STUCK_HOURS + 24) * 3_600_000;

/**
 * A host who can be paid: user + activated host_payout + (by default) an ops-APPROVED
 * host_verification row — through `makeVerifiedHost`, the one fixture expression the suite converges on.
 * `verificationStatus: null` inserts NO verification row at all, which is the polarity case.
 */
async function makeHost(
  verificationStatus: HostVerificationStatus | null = "approved",
): Promise<{ hostId: string; accountId: string }> {
  const hostId = uid("host");
  const accountId = uid("acct");
  await makeVerifiedHost(testDb.db, hostId, {
    name: "Host",
    email: `${hostId}@example.com`,
    firstName: "Host",
    paymongoAccountId: accountId,
    verificationStatus,
  });
  return { hostId, accountId };
}

/** One listing per booking, so a shared due window can never trip the booking_no_overlap EXCLUDE. */
async function makeListing(hostId: string): Promise<string> {
  const id = uid("listing");
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: "Freeze Listing",
    status: "published",
    reviewState: "approved",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 150000,
    dayRateCents: 300000,
    currency: "php",
  });
  return id;
}

async function makeDueBooking(listingId: string, endsAtMs = dueMs()): Promise<string> {
  const id = uid("bk");
  const endsAt = new Date(endsAtMs);
  await testDb.db.insert(booking).values({
    id,
    listingId,
    unit: 1,
    bookerId: BOOKER,
    startsAt: new Date(endsAtMs - 3_600_000),
    endsAt,
    status: "confirmed",
    quotedTotalCents: 200000,
    spacePriceCents: 200000,
    serviceFeeCents: 0,
    currency: "php",
    expiresAt: null,
  });
  return id;
}

/** A host + listing + due booking in one call — the unit every case here is built from. */
async function seedPayableSession(verificationStatus: HostVerificationStatus | null = "approved") {
  const { hostId, accountId } = await makeHost(verificationStatus);
  const listingId = await makeListing(hostId);
  const bookingId = await makeDueBooking(listingId);
  return { hostId, accountId, listingId, bookingId };
}

/** Set (or clear) a host's verification status — the ONE write an ops suspend/reinstate performs. */
async function setVerificationStatus(hostId: string, status: HostVerificationStatus): Promise<void> {
  await testDb.db
    .update(hostVerification)
    .set({ status })
    .where(eq(hostVerification.userId, hostId));
}

/**
 * COUNT(*) over host_payout_ledger for a booking — deliberately NOT kind-scoped, so "no row was
 * created" means no row of ANY kind, not "no payout row while a debit slipped through".
 */
async function ledgerRowCount(bookingId: string): Promise<number> {
  const rows = (await testDb.db.execute(sql`
    SELECT count(*)::int AS "n" FROM host_payout_ledger WHERE booking_id = ${bookingId}
  `)) as unknown as { n: number }[];
  return rows[0].n;
}

/** Seed a ledger row directly, in a given state and age (the crash-window / stranded-transfer fixtures). */
async function seedLedgerRow(opts: {
  bookingId: string;
  hostId: string;
  state: "held" | "processing";
  transferId?: string | null;
  createdAtMs: number;
}): Promise<void> {
  await testDb.db.insert(hostPayoutLedger).values({
    id: uid("ledger"),
    bookingId: opts.bookingId,
    hostId: opts.hostId,
    paymentId: null,
    grossCents: 200000,
    commissionRateBps: 1000,
    commissionCents: 20000,
    netCents: 180000,
    currency: "php",
    state: opts.state,
    kind: "payout",
    transferId: opts.transferId ?? null,
    createdAt: new Date(opts.createdAtMs),
  });
}

/** The bookingIds a given [payout-alert] line was emitted for. */
function alertedIds(spy: { mock: { calls: unknown[][] } }, message: string): string[] {
  return spy.mock.calls
    .filter((c) => c[0] === message)
    .map((c) => (c[1] as { bookingId: string }).bookingId);
}

function duePayout(row: DuePayout): DuePayout {
  return row;
}

/** Drive the sweep exactly as the cron does: select the due set, then attempt each one. */
async function runWholeSweep(): Promise<DuePayout[]> {
  const due = await queryDuePayouts(testDb.db);
  for (const b of due) await payOne(testDb.db, duePayout(b));
  return due;
}

beforeAll(async () => {
  testDb = await setupTestDb();
  // Pin the stuck threshold BEFORE payout-reconcile loads it (read once at import time).
  prevStuckHours = process.env.PAYOUT_RECONCILE_STUCK_HOURS;
  process.env.PAYOUT_RECONCILE_STUCK_HOURS = String(STUCK_HOURS);
  await testDb.db.insert(user).values({
    id: BOOKER,
    name: "Freeze Booker",
    email: "freeze_booker@example.com",
    firstName: "Booker",
  });
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/paymongo", () => ({
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
    getTransfer: mockPayMongo.getTransfer,
    createCheckoutSession: mockPayMongo.createCheckoutSession,
    createRefund: mockPayMongo.createRefund,
  }));
  vi.resetModules();
  ({ queryDuePayouts, payOne } = await import("@/inngest/functions/payout-sweep"));
  ({ queryProcessingLedger, reconcileOne, alertStuckHeld } = await import(
    "@/inngest/functions/payout-reconcile"
  ));
});

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  process.env.PAYOUT_RECONCILE_STUCK_HOURS = prevStuckHours;
  await teardownTestDb(testDb);
});

// ---------------------------------------------------------------------------
// 1. The freeze itself (ENF-02 clause a)
// ---------------------------------------------------------------------------

describe("ENF-02 — suspending a host removes their due payout from the sweep", () => {
  it("queryDuePayouts returns the booking while approved and NOT while suspended (control still returned)", async () => {
    const target = await seedPayableSession("approved");
    // The CONTROL: an equally-due booking on a host who is never suspended. It must appear in BOTH
    // calls, so "0 rows for the target" can never be a query that silently returned nothing at all.
    const control = await seedPayableSession("approved");

    const before = await queryDuePayouts(testDb.db);
    expect(before.filter((d) => d.bookingId === target.bookingId)).toHaveLength(1);
    expect(before.map((d) => d.bookingId)).toContain(control.bookingId);

    await setVerificationStatus(target.hostId, "suspended");

    const after = await queryDuePayouts(testDb.db);
    expect(after.filter((d) => d.bookingId === target.bookingId)).toHaveLength(0);
    // The query RAN and still selects everyone else — the freeze is targeted, not a blanket refusal.
    expect(after.map((d) => d.bookingId)).toContain(control.bookingId);
  });
});

// ---------------------------------------------------------------------------
// 2. The no-ledger-row property — what makes the placement provable
// ---------------------------------------------------------------------------

describe("ENF-02 — the freeze is PRE-CLAIM: a suspended host's booking creates NO ledger row", () => {
  it("a whole sweep pass writes COUNT(*)=0 to host_payout_ledger for the suspended booking, and pays the control", async () => {
    const suspended = await seedPayableSession("approved");
    await setVerificationStatus(suspended.hostId, "suspended");
    const control = await seedPayableSession("approved");
    mockPayMongo.listWalletAccounts.mockResolvedValue([
      { id: control.accountId, accountNumber: "CTL0001", accountName: "Control Wallet", status: "activated" },
    ]);
    mockPayMongo.createBatchTransfer.mockResolvedValue({
      batchId: "batch_ctl",
      transferId: "tr_ctl_1",
      status: "pending",
    });

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const due = await runWholeSweep();
    spy.mockRestore();

    // The loop genuinely ran and genuinely creates rows — the control was claimed AND released.
    expect(due.map((d) => d.bookingId)).toContain(control.bookingId);
    expect(await ledgerRowCount(control.bookingId)).toBe(1);

    // THE ASSERTION THAT DISTINGUISHES PRE-CLAIM FROM POST-CLAIM. A post-claim `if (suspended) return`
    // inside payOne would leave a `held` row here and this COUNT would be 1.
    expect(await ledgerRowCount(suspended.bookingId)).toBe(0);
    expect(due.map((d) => d.bookingId)).not.toContain(suspended.bookingId);

    // And no money moved for the suspended host: every transfer that fired addressed the control wallet.
    const destinations = mockPayMongo.createBatchTransfer.mock.calls.map(
      (c) => (c[0] as { destination: { number: string } }).destination.number,
    );
    expect(destinations.every((n) => n === "CTL0001")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. No false page (ENF-02 clause b)
// ---------------------------------------------------------------------------

describe("ENF-02 — a frozen booking never pages an operator", () => {
  it("alertStuckHeld returns 0 and writes no needs_attention audit row, however old the frozen booking gets", async () => {
    const suspended = await seedPayableSession("approved");
    await setVerificationStatus(suspended.hostId, "suspended");
    // Age the session far past the reconcile stuck window: a `held` row of this age WOULD page.
    await testDb.db
      .update(booking)
      .set({ startsAt: new Date(stuckMs() - 3_600_000), endsAt: new Date(stuckMs()) })
      .where(eq(booking.id, suspended.bookingId));

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await runWholeSweep();
    const stuck = await alertStuckHeld(testDb.db);
    const paged = alertedIds(spy, "[payout-alert] payout stuck held");
    spy.mockRestore();

    // Nothing to page about, because nothing was ever written: the row does not exist to go stale.
    expect(await ledgerRowCount(suspended.bookingId)).toBe(0);
    expect(stuck).toBe(0);
    expect(paged).not.toContain(suspended.bookingId);

    // The alert channel is a [payout-alert] console line today; this guards the other channel a future
    // implementation would reach for. No money seam was flagged for a payout that is deliberately frozen.
    const flagged = await testDb.db
      .select()
      .from(audit)
      .where(eq(audit.outcome, "needs_attention"));
    expect(flagged.filter((r) => JSON.stringify(r.meta ?? {}).includes(suspended.bookingId))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. The zero-write un-freeze — the D-14 auto-revert property
// ---------------------------------------------------------------------------

describe("ENF-02 — un-suspension auto-reverts with ZERO writes (the D-14 property)", () => {
  it("flipping the status back to approved yields the payout again, with no ledger or booking write in between", async () => {
    const target = await seedPayableSession("approved");
    await setVerificationStatus(target.hostId, "suspended");
    expect((await queryDuePayouts(testDb.db)).map((d) => d.bookingId)).not.toContain(target.bookingId);

    // Snapshot everything the sweep reads EXCEPT the verification status, so "exactly one write" is
    // measured rather than asserted: if un-freezing needed a repair, one of these would have to move.
    const [bookingBefore] = await testDb.db.select().from(booking).where(eq(booking.id, target.bookingId));
    const ledgerBefore = await ledgerRowCount(target.bookingId);

    // THE ONE WRITE. No ledger insert, no booking touch, no backfill, no re-queue.
    await setVerificationStatus(target.hostId, "approved");

    const after = await queryDuePayouts(testDb.db);
    expect(after.filter((d) => d.bookingId === target.bookingId)).toHaveLength(1);

    const [bookingAfter] = await testDb.db.select().from(booking).where(eq(booking.id, target.bookingId));
    expect(JSON.stringify(bookingAfter)).toBe(JSON.stringify(bookingBefore)); // booking byte-identical
    expect(await ledgerRowCount(target.bookingId)).toBe(ledgerBefore); // still zero rows
    expect(ledgerBefore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. THE NEGATIVE HALF — a stranded transfer still pages, suspended or not
// ---------------------------------------------------------------------------

describe("ENF-02 — the mirror does NOT reach `processing`: a stranded transfer on a suspended host STILL alerts", () => {
  it("queryProcessingLedger still returns it and reconcileOne still fires the stuck-processing alert", async () => {
    const s = await seedPayableSession("approved");
    await setVerificationStatus(s.hostId, "suspended");
    // The money for this row ALREADY LEFT the platform wallet — the sweep fired the transfer before the
    // suspension landed. Suspension must never silence a stranded transfer: that is a real operator case.
    const createdAtMs = stuckMs();
    await seedLedgerRow({
      bookingId: s.bookingId,
      hostId: s.hostId,
      state: "processing",
      transferId: "tr_stranded_1",
      createdAtMs,
    });

    // The predicate a "completed" mirror would break — this row must still be polled.
    const inflight = await queryProcessingLedger(testDb.db);
    const row = inflight.find((r) => r.bookingId === s.bookingId);
    expect(row).toBeDefined();
    expect(row!.transferId).toBe("tr_stranded_1");

    mockPayMongo.getTransfer.mockResolvedValueOnce({ id: "tr_stranded_1", status: "pending" });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await reconcileOne(
      { bookingId: s.bookingId, transferId: "tr_stranded_1", createdAt: new Date(createdAtMs) },
      testDb.db,
    );
    const paged = alertedIds(spy, "[payout-alert] transfer stuck processing");
    spy.mockRestore();

    expect(res.state).toBe("processing"); // the alert does not move the row
    expect(paged).toContain(s.bookingId); // ...and the operator IS paged, suspension notwithstanding
  });
});

// ---------------------------------------------------------------------------
// 6. The crash-window mirror — the one row it exists for
// ---------------------------------------------------------------------------

describe("ENF-02 — the crash-window mirror: a `held` row that predates the suspension does not page", () => {
  it("alertStuckHeld skips the suspended host's aged held row and still pages for an unsuspended one", async () => {
    const suspended = await seedPayableSession("approved");
    // The CR-01 window: the sweep claimed this row, then crashed before releasing it, and the
    // suspension landed afterwards. Pre-claim filtering cannot reach a row that already exists.
    await seedLedgerRow({
      bookingId: suspended.bookingId,
      hostId: suspended.hostId,
      state: "held",
      transferId: null,
      createdAtMs: stuckMs(),
    });
    await setVerificationStatus(suspended.hostId, "suspended");

    // The CONTROL: the same stranded claim on a host nobody suspended — a REAL stuck payout that must
    // still page, in the SAME alertStuckHeld call.
    const control = await seedPayableSession("approved");
    await seedLedgerRow({
      bookingId: control.bookingId,
      hostId: control.hostId,
      state: "held",
      transferId: null,
      createdAtMs: stuckMs(),
    });

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const stuck = await alertStuckHeld(testDb.db);
    const paged = alertedIds(spy, "[payout-alert] payout stuck held");
    spy.mockRestore();

    expect(paged).toContain(control.bookingId); // the real signal survives
    expect(paged).not.toContain(suspended.bookingId); // the deliberately-frozen one is not a page
    expect(stuck).toBe(paged.length); // the return value is the count of rows actually alerted on
    expect(stuck).toBeGreaterThanOrEqual(1);

    // The row is still THERE — the mirror suppresses the ALERT, it does not delete or move money.
    const [row] = await testDb.db
      .select()
      .from(hostPayoutLedger)
      .where(
        and(eq(hostPayoutLedger.bookingId, suspended.bookingId), eq(hostPayoutLedger.kind, "payout")),
      );
    expect(row.state).toBe("held");
  });
});

// ---------------------------------------------------------------------------
// 7. Polarity — `<> 'suspended'` is NOT the sell-gate's shape
// ---------------------------------------------------------------------------

describe("ENF-02 — polarity: only `suspended` freezes, so the unchecked are still paid", () => {
  it("a host with NO host_verification row still has their due payout swept", async () => {
    // The sell-gate asks "is this host APPROVED?" and fails CLOSED on a missing row. This predicate asks
    // "is this host SUSPENDED?" — a missing row means NOT suspended. Inverting it into the gate's shape
    // would freeze the payouts of every host nobody has checked yet, which is most of them.
    const unchecked = await seedPayableSession(null);
    const rows = await testDb.db
      .select()
      .from(hostVerification)
      .where(eq(hostVerification.userId, unchecked.hostId));
    expect(rows).toHaveLength(0); // genuinely NO row — the COALESCE default is what answers

    const due = await queryDuePayouts(testDb.db);
    expect(due.filter((d) => d.bookingId === unchecked.bookingId)).toHaveLength(1);
  });

  it("a `rejected` host is still paid for a session they already delivered", async () => {
    // Rejection stops them SELLING (the gate); it does not cancel money already earned. Only D-222's
    // `suspended` freezes the payout, which is why this predicate enumerates one value and not a set.
    const rejected = await seedPayableSession("rejected");
    const due = await queryDuePayouts(testDb.db);
    expect(due.filter((d) => d.bookingId === rejected.bookingId)).toHaveLength(1);

    // ...and the same host, suspended, freezes — one column, one read, one difference.
    await setVerificationStatus(rejected.hostId, "suspended");
    const after = await queryDuePayouts(testDb.db);
    expect(after.filter((d) => d.bookingId === rejected.bookingId)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 8. D-253 — THE THIRD READER OF THE COLUMN, AND THE SENTENCE IT MAKES TRUE
// ---------------------------------------------------------------------------
//
// ⚠ ADDED BY PLAN 18-13 IN THE COMMIT THAT ADDED THE READER, WHICH IS D-253'S STANDING INSTRUCTION.
//
// D-253 records that this freeze has NO COMPILER CENSUS: both predicates are raw-SQL restatements in
// two files, `tsc` sees neither, and this file is the sole instrument holding them equal. It closes
// with a rule for whoever comes next — *any third reader of `host_verification.status` on this path
// must extend this test in the same commit that adds it.*
//
// `src/lib/host/verification-status.ts` is that third reader. It is a DISPLAY reader, not a money one:
// it decides what a suspended host is TOLD on `/host`, `/host/listings` and `/host/earnings` (D-243 /
// D-252), and it moves no peso. But it is coupled to the two money predicates by a SENTENCE — the
// notice says *"payouts are on hold"*, and that clause is true only while this freeze holds. The two
// failure directions are not symmetric and both are real:
//
//   • THE READER SAYS SUSPENDED AND THE SWEEP PAYS — FitOut tells a host their money is held while it
//     is on its way to them. A lie in the calm direction, and the one nobody would report.
//   • THE SWEEP FREEZES AND THE READER SAYS NOTHING — the exact defect D-252 exists to close, arriving
//     back through a different door: money stops with no explanation on the page they look at.
//
// So the assertion is AGREEMENT ACROSS THE WHOLE ENUM, derived from the pgEnum rather than listed, so a
// seventh status has to be answered here rather than defaulting to a silent disagreement.

describe("D-253 — the display reader and the payout freeze agree, for every verification status", () => {
  it("`loadHostVerification().suspended` is true exactly when queryDuePayouts withholds the payout", async () => {
    // A payable session per status, plus the NO-ROW case — the state most hosts are actually in.
    const seeded = await Promise.all(
      hostVerificationStatus.enumValues.map(async (status) => ({
        status: status as HostVerificationStatus | null,
        ...(await seedPayableSession(status)),
      })),
    );
    const noRow = { status: null, ...(await seedPayableSession(null)) };
    const subjects = [...seeded, noRow];

    // ONE sweep for the whole set: the freeze is a WHERE clause over all due bookings, so asking once
    // and partitioning the answer is both cheaper and closer to what production actually runs.
    const due = await queryDuePayouts(testDb.db);
    const disagreements: string[] = [];

    for (const subject of subjects) {
      const frozen = due.filter((d) => d.bookingId === subject.bookingId).length === 0;
      const told = (await loadHostVerification(testDb.db, subject.hostId)).suspended;
      if (frozen !== told) {
        disagreements.push(
          `  status=${subject.status ?? "(no row)"} — the sweep ${frozen ? "WITHHELD" : "released"} ` +
            `the payout, but the host is ${told ? "told hosting is paused" : "told nothing"}`,
        );
      }
    }

    expect(
      disagreements,
      "the money path and the surface that explains it disagree:\n" +
        `${disagreements.join("\n")}\n` +
        "The suspension notice says payouts are on hold. That clause is true only while " +
        "queryDuePayouts withholds them, and there is NO compiler census over this column (D-253) — " +
        "this assertion is the whole of it. Move both, in one commit, or move neither.",
    ).toEqual([]);

    // ANTI-VACUITY, in both directions, because an agreement test passes perfectly when nothing
    // happened at all: at least one subject was frozen-and-told, and at least one was paid-and-silent.
    const suspended = subjects.filter((s) => s.status === "suspended");
    expect(suspended).toHaveLength(1);
    expect(due.filter((d) => d.bookingId === suspended[0].bookingId)).toHaveLength(0);
    expect((await loadHostVerification(testDb.db, suspended[0].hostId)).suspended).toBe(true);
    expect(due.filter((d) => d.bookingId === noRow.bookingId)).toHaveLength(1);
    expect((await loadHostVerification(testDb.db, noRow.hostId)).suspended).toBe(false);
  });

  it("the operator's stored sentence reaches the reader verbatim — it is what the notice renders", async () => {
    // `host_verification.reason` is the ONLY thing that makes the notice more than a wall (D-243), and
    // the ops suspend action is what writes it. A reader that dropped or truncated it would leave the
    // product sentence standing alone on all three surfaces, green everywhere, and silently useless.
    const sentence = "Repeated no-shows reported by bookers at this space.";
    const subject = await seedPayableSession("suspended");
    await testDb.db
      .update(hostVerification)
      .set({ reason: sentence })
      .where(eq(hostVerification.userId, subject.hostId));

    const state = await loadHostVerification(testDb.db, subject.hostId);
    expect(state.suspended).toBe(true);
    expect(state.reason).toBe(sentence);

    // OWNER-SCOPED (T-18-1302): a second host reads their OWN row, never this one's. The control is in
    // the same call so a reader that returned nothing for the wrong reason takes it down too.
    const other = await seedPayableSession("approved");
    const otherState = await loadHostVerification(testDb.db, other.hostId);
    expect(otherState.suspended).toBe(false);
    expect(otherState.reason).toBeNull();
  });
});
