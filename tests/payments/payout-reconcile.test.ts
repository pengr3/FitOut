// PAY-03 payout RECONCILE (D-59) — the terminal half of the Held→Processing→Paid/Failed lifecycle,
// exercised against an isolated schema with @/lib/paymongo mocked (mockPayMongo.getTransfer) so no live
// PayMongo call fires. Proves the load-bearing invariants of the reconcile cron:
//   - SELECTIVITY: queryProcessingLedger returns ONLY state='processing' rows that carry a transfer_id;
//     held (no transfer yet) and already-paid rows are excluded.
//   - PROCESSING → PAID: a terminal-success transfer flips the row to paid with paid_at set.
//   - PROCESSING → FAILED + ALERT: a terminal-failure transfer flips the row to failed and fires a
//     [payout-alert] transfer failed operator signal (a payout can never be silently stranded, T-05-28).
//   - IDEMPOTENCY: reconciling an already-paid row is a 0-row no-op (the AND state='processing' guard) —
//     paid_at is never rewritten.
//   - UNKNOWN/IN-FLIGHT STAYS PROCESSING: an unrecognized status never spuriously flips a payout to Paid.
//   - STUCK ALERT: a row processing beyond PAYOUT_RECONCILE_STUCK_HOURS fires [payout-alert] transfer
//     stuck processing while staying processing.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, hostPayoutLedger, booking } from "@/lib/db/schema";

let testDb: TestDb;
type ReconcileModule = typeof import("@/inngest/functions/payout-reconcile");
let queryProcessingLedger: ReconcileModule["queryProcessingLedger"];
let reconcileOne: ReconcileModule["reconcileOne"];
let mapTransferStatus: ReconcileModule["mapTransferStatus"];
let alertStuckHeld: ReconcileModule["alertStuckHeld"];

const BOOKER = "reconcile_booker";
let prevStuckHours: string | undefined;

let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

async function makeHostUser(): Promise<string> {
  const id = uid("host");
  await testDb.db.insert(user).values({
    id,
    name: "Host",
    email: `${id}@example.com`,
    firstName: "Host",
    canHost: true,
  });
  return id;
}

async function makeListing(hostId: string): Promise<string> {
  const id = uid("listing");
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: "Reconcile Listing",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 150000,
    dayRateCents: 300000,
    currency: "php",
  });
  return id;
}

async function makeBooking(listingId: string): Promise<string> {
  const id = uid("bk");
  const endsAt = new Date(Date.now() - 3_600_000);
  const startsAt = new Date(endsAt.getTime() - 3_600_000); // 1-hour window
  await testDb.db.insert(booking).values({
    id,
    listingId,
    unit: 1,
    bookerId: BOOKER,
    startsAt,
    endsAt,
    status: "confirmed",
    quotedTotalCents: 200000,
    currency: "php",
    expiresAt: null,
  });
  return id;
}

/**
 * Seed a host+listing+booking and ONE host_payout_ledger row in the given state. Each row lives on its own
 * listing so booking windows never trip booking_no_overlap. Returns the ledger's booking_id (its unique key).
 */
async function seedLedger(opts: {
  state: "held" | "processing" | "paid" | "refunded" | "failed";
  transferId?: string | null;
  createdAtMs?: number;
  paidAtMs?: number | null;
  /** D-71 row kind. A 'host_cancel_fee' row is a SIGNED DEBIT that never transfers — it only nets. */
  kind?: "payout" | "host_cancel_fee";
}): Promise<string> {
  const hostId = await makeHostUser();
  const listingId = await makeListing(hostId);
  const bookingId = await makeBooking(listingId);
  const debit = opts.kind === "host_cancel_fee";
  await testDb.db.insert(hostPayoutLedger).values({
    id: uid("ledger"),
    bookingId,
    hostId,
    paymentId: null,
    // A debit carries NEGATIVE gross/net and zero commission (07-RESEARCH Finding 3 § Recommended shape).
    grossCents: debit ? -30000 : 200000,
    commissionRateBps: debit ? 0 : 1000,
    commissionCents: debit ? 0 : 20000,
    netCents: debit ? -30000 : 180000,
    currency: "php",
    state: opts.state,
    kind: opts.kind ?? "payout",
    transferId: opts.transferId ?? null,
    paidAt: opts.paidAtMs != null ? new Date(opts.paidAtMs) : null,
    ...(opts.createdAtMs != null ? { createdAt: new Date(opts.createdAtMs) } : {}),
  });
  return bookingId;
}

async function readLedger(bookingId: string) {
  const [row] = await testDb.db
    .select()
    .from(hostPayoutLedger)
    .where(eq(hostPayoutLedger.bookingId, bookingId));
  return row;
}

/** Every [payout-alert] stuck-held line the console spy captured, as bookingIds. */
function stuckHeldAlertIds(spy: { mock: { calls: unknown[][] } }): string[] {
  return spy.mock.calls
    .filter((c) => c[0] === "[payout-alert] payout stuck held")
    .map((c) => (c[1] as { bookingId: string }).bookingId);
}

beforeAll(async () => {
  testDb = await setupTestDb();
  // Pin the stuck threshold BEFORE the module loads it (Number(process.env... ?? 48) at import time).
  prevStuckHours = process.env.PAYOUT_RECONCILE_STUCK_HOURS;
  process.env.PAYOUT_RECONCILE_STUCK_HOURS = "48";
  await testDb.db.insert(user).values({
    id: BOOKER,
    name: "Reconcile Booker",
    email: "reconcile_booker@example.com",
    firstName: "Booker",
  });
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/paymongo", () => ({ getTransfer: mockPayMongo.getTransfer }));
  vi.resetModules();
  ({ queryProcessingLedger, reconcileOne, mapTransferStatus, alertStuckHeld } = await import(
    "@/inngest/functions/payout-reconcile"
  ));
});

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  process.env.PAYOUT_RECONCILE_STUCK_HOURS = prevStuckHours;
  await teardownTestDb(testDb);
});

describe("queryProcessingLedger — selectivity (PAY-03)", () => {
  it("returns only processing rows with a transfer_id (held + paid excluded)", async () => {
    const proc = await seedLedger({ state: "processing", transferId: "tr_sel" });
    const held = await seedLedger({ state: "held", transferId: null });
    const paid = await seedLedger({ state: "paid", transferId: "tr_paid_sel", paidAtMs: Date.now() });

    const rows = await queryProcessingLedger(testDb.db);
    const ids = rows.map((r) => r.bookingId);

    expect(ids).toContain(proc);
    expect(ids).not.toContain(held); // no transfer_id AND not processing
    expect(ids).not.toContain(paid); // terminal — already reconciled
    // Every returned row is genuinely processing with a transfer_id.
    for (const r of rows) expect(r.transferId).toBeTruthy();
  });
});

describe("reconcileOne — Processing → Paid (D-59)", () => {
  it("flips a processing row to paid with paid_at set when the transfer succeeded", async () => {
    const bkId = await seedLedger({ state: "processing", transferId: "tr_paid" });
    mockPayMongo.getTransfer.mockResolvedValueOnce({ id: "tr_paid", status: "succeeded" });

    const res = await reconcileOne(
      { bookingId: bkId, transferId: "tr_paid", createdAt: new Date() },
      testDb.db,
    );
    expect(res.state).toBe("paid");

    const row = await readLedger(bkId);
    expect(row.state).toBe("paid");
    expect(row.paidAt).not.toBeNull(); // paid_at=now() was set
  });
});

describe("reconcileOne — Processing → Failed + operator alert (T-05-28)", () => {
  it("flips a processing row to failed and fires [payout-alert] transfer failed", async () => {
    const bkId = await seedLedger({ state: "processing", transferId: "tr_fail" });
    mockPayMongo.getTransfer.mockResolvedValueOnce({ id: "tr_fail", status: "failed" });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await reconcileOne(
      { bookingId: bkId, transferId: "tr_fail", createdAt: new Date() },
      testDb.db,
    );
    expect(res.state).toBe("failed");

    const row = await readLedger(bkId);
    expect(row.state).toBe("failed");
    expect(spy).toHaveBeenCalledWith(
      "[payout-alert] transfer failed",
      expect.objectContaining({ bookingId: bkId, transferId: "tr_fail", status: "failed" }),
    );
    spy.mockRestore();
  });
});

describe("reconcileOne — idempotency (the AND state='processing' guard)", () => {
  it("leaves an already-paid row untouched (0-row update, paid_at unchanged)", async () => {
    const paidAtMs = Date.UTC(2026, 0, 1, 0, 0, 0); // fixed instant, round ms → round-trips exactly
    const bkId = await seedLedger({ state: "paid", transferId: "tr_done", paidAtMs });
    const before = await readLedger(bkId);
    mockPayMongo.getTransfer.mockResolvedValueOnce({ id: "tr_done", status: "succeeded" });

    await reconcileOne(
      { bookingId: bkId, transferId: "tr_done", createdAt: new Date() },
      testDb.db,
    );

    const row = await readLedger(bkId);
    expect(row.state).toBe("paid"); // still paid — never reopened
    expect(row.paidAt?.getTime()).toBe(before.paidAt?.getTime()); // paid_at NOT rewritten by the 0-row update
  });
});

describe("reconcileOne — unknown/in-flight stays processing (never spurious Paid)", () => {
  it("keeps a pending transfer's row at processing and never sets paid_at", async () => {
    const bkId = await seedLedger({ state: "processing", transferId: "tr_pending" });
    mockPayMongo.getTransfer.mockResolvedValueOnce({ id: "tr_pending", status: "pending" });

    const res = await reconcileOne(
      { bookingId: bkId, transferId: "tr_pending", createdAt: new Date() },
      testDb.db,
    );
    expect(res.state).toBe("processing");

    const row = await readLedger(bkId);
    expect(row.state).toBe("processing");
    expect(row.paidAt).toBeNull();
    // The mapping itself never promotes an unknown status to a terminal one.
    expect(mapTransferStatus("pending")).toBe("processing");
  });
});

describe("alertStuckHeld — a host_cancel_fee debit never trips the alert (07-04, Pitfall 7)", () => {
  it("alerts on a stuck kind='payout' held row but IGNORES a kind='host_cancel_fee' held row", async () => {
    const stuckMs = Date.now() - 72 * 3_600_000; // 72h > the 48h threshold

    // A D-71 signed debit is inserted `held` and STAYS there until fully netted against a future payout.
    // Unscoped, alertStuckHeld would fire a FALSE [payout-alert] on EVERY host cancellation — and
    // operators who learn to ignore the channel would miss a real transfer failure.
    const debitId = await seedLedger({
      state: "held",
      kind: "host_cancel_fee",
      transferId: null,
      createdAtMs: stuckMs,
    });
    // A genuine payout claim that never released is a REAL stranded payout and MUST still alert (CR-01).
    const payoutId = await seedLedger({ state: "held", transferId: null, createdAtMs: stuckMs });

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await alertStuckHeld(testDb.db);
    const alerted = stuckHeldAlertIds(spy);
    spy.mockRestore();

    expect(alerted).toContain(payoutId); // the real signal survives
    expect(alerted).not.toContain(debitId); // the false one is gone
  });
});

describe("reconcileOne — stuck-processing alert (T-05-28)", () => {
  it("fires [payout-alert] transfer stuck processing for a row older than PAYOUT_RECONCILE_STUCK_HOURS", async () => {
    const stuckCreatedMs = Date.now() - 72 * 3_600_000; // 72h > 48h threshold
    const bkId = await seedLedger({
      state: "processing",
      transferId: "tr_stuck",
      createdAtMs: stuckCreatedMs,
    });
    mockPayMongo.getTransfer.mockResolvedValueOnce({ id: "tr_stuck", status: "pending" });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await reconcileOne(
      { bookingId: bkId, transferId: "tr_stuck", createdAt: new Date(stuckCreatedMs) },
      testDb.db,
    );
    expect(res.state).toBe("processing"); // still processing — the alert does not move the row

    const row = await readLedger(bkId);
    expect(row.state).toBe("processing");
    expect(spy).toHaveBeenCalledWith(
      "[payout-alert] transfer stuck processing",
      expect.objectContaining({ bookingId: bkId, transferId: "tr_stuck" }),
    );
    spy.mockRestore();
  });
});
