// PAY-01 / D-57 — the checkout_session.payment.paid webhook is the SINGLE confirm authority.
//
// The Phase-4 synchronous confirmBooking pending→confirmed flip was RETIRED in Plan 03; this webhook is
// now the sole writer of booking→confirmed. These POST a signed body (mockPayMongo.signWebhook) to the
// exported route handler against an isolated schema and assert:
//   - a pending booking is flipped confirmed, expires_at cleared, and the pay_... captured (Task 1);
//   - the confirm keys on status='pending' ALONE — a PAST expires_at still confirms (Pitfall 4, Task 1);
//   - the browser return is NOT the writer: without the webhook the booking stays pending (control);
//   - a re-delivered event id is a 200 no-op (idempotent via paymongo_event), confirming exactly once;
//   - a forged Paymongo-Signature → 400 with no state change;
//   - a genuinely-gone slot is auto-refunded on a refundable rail and operator-alerted on QRPh, never
//     silently kept, and the double-book-during-payment loser is reversed while the winner stays pending
//     (D-58 backstop, Task 2).

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking, paymongoEvent } from "@/lib/db/schema";
import { mockPayMongo } from "../helpers/mocks";

const SECRET = "whsec_test_payment";
const TS = 1_700_000_000;

// The operator-alert sink (Task 2) — mocked so the QRPh/UBP path can be asserted without a durable sink.
const recordAuditMock = vi.fn(async () => {});

let testDb: TestDb;
let POST: (typeof import("@/app/api/paymongo/webhook/route"))["POST"];
let prevSecret: string | undefined;

const HOST = "pp_host";
const BOOKER = "pp_booker";
const LISTING = "L_pp";

/** A distinct 1-hour UTC window per booking so seeded rows never collide on the booking_no_overlap EXCLUDE. */
function windowAt(hourUtc: number): { startsAt: Date; endsAt: Date } {
  const h = String(hourUtc).padStart(2, "0");
  const h1 = String(hourUtc + 1).padStart(2, "0");
  return {
    startsAt: new Date(`2026-11-01T${h}:00:00.000Z`),
    endsAt: new Date(`2026-11-01T${h1}:00:00.000Z`),
  };
}

async function seedBooking(opts: {
  id: string;
  status: "pending" | "confirmed" | "cancelled";
  quotedTotalCents?: number | null;
  expiresAtMs?: number | null;
  paymentId?: string | null;
  hourUtc: number;
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
    .select({ status: booking.status, expiresAt: booking.expiresAt, paymentId: booking.paymentId })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

async function countEvents(eventId: string): Promise<number> {
  const rows = await testDb.db
    .select({ id: paymongoEvent.id })
    .from(paymongoEvent)
    .where(eq(paymongoEvent.id, eventId));
  return rows.length;
}

/** A PayMongo checkout_session.payment.paid event body (A1 nesting: data.attributes.data.attributes.*). */
function paidEventBody(opts: {
  eventId: string;
  bookingId: string;
  paymentId?: string | null;
  method?: string;
}): string {
  const payments =
    opts.paymentId != null
      ? [
          {
            id: opts.paymentId,
            source: opts.method ? { type: opts.method } : undefined,
            status: "paid",
          },
        ]
      : [];
  return JSON.stringify({
    data: {
      id: opts.eventId,
      attributes: {
        type: "checkout_session.payment.paid",
        data: {
          id: "cs_test_paid",
          attributes: {
            reference_number: opts.bookingId,
            payment_method_used: opts.method,
            payments,
          },
        },
      },
    },
  });
}

function post(body: string, signature?: string): Promise<Response> {
  const sig = signature ?? mockPayMongo.signWebhook(body, SECRET, TS);
  return POST(
    new Request("http://localhost/api/paymongo/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "paymongo-signature": sig },
      body,
    }),
  );
}

beforeAll(async () => {
  testDb = await setupTestDb();
  prevSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  process.env.PAYMONGO_WEBHOOK_SECRET = SECRET;

  await testDb.db.insert(user).values([
    { id: HOST, name: "PP Host", email: "pp_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "PP Booker", email: "pp_booker@example.com", firstName: "Booker" },
  ]);
  await testDb.db.insert(listing).values({
    id: LISTING,
    hostId: HOST,
    title: "PP Listing",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 150000,
    dayRateCents: 300000,
  });

  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  // The route (Task 2) refunds via createRefund; mock it so no live PayMongo call fires and calls assert.
  vi.doMock("@/lib/paymongo", () => ({ createRefund: mockPayMongo.createRefund }));
  vi.doMock("@/lib/audit", () => ({ recordAudit: recordAuditMock }));
  vi.resetModules();
  ({ POST } = await import("@/app/api/paymongo/webhook/route"));
});

beforeEach(() => {
  recordAuditMock.mockClear();
  mockPayMongo.createRefund.mockClear();
});

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("@/lib/audit");
  process.env.PAYMONGO_WEBHOOK_SECRET = prevSecret;
  await teardownTestDb(testDb);
});

describe("checkout_session.payment.paid — confirm authority (D-57)", () => {
  it("flips a pending booking → confirmed, clears expires_at, and captures the pay_... (single writer)", async () => {
    const id = "bk_paid_ok";
    await seedBooking({ id, status: "pending", expiresAtMs: Date.now() + 30 * 60 * 1000, hourUtc: 1 });

    const res = await post(
      paidEventBody({ eventId: `evt_${randomUUID()}`, bookingId: id, paymentId: "pay_test_1", method: "card" }),
    );
    expect(res.status).toBe(200);

    const row = await readBooking(id);
    expect(row.status).toBe("confirmed");
    expect(row.expiresAt).toBeNull();
    expect(row.paymentId).toBe("pay_test_1");
  });

  it("confirms even when expires_at is in the PAST (payment is the authority — no expiry re-check, Pitfall 4)", async () => {
    const id = "bk_paid_lapsed";
    await seedBooking({ id, status: "pending", expiresAtMs: Date.now() - 60 * 60 * 1000, hourUtc: 2 });

    const res = await post(
      paidEventBody({ eventId: `evt_${randomUUID()}`, bookingId: id, paymentId: "pay_test_2", method: "gcash" }),
    );
    expect(res.status).toBe(200);
    expect((await readBooking(id)).status).toBe("confirmed");
  });

  it("the browser return does NOT confirm — without the webhook the booking stays pending (control)", async () => {
    const id = "bk_no_webhook";
    await seedBooking({ id, status: "pending", expiresAtMs: Date.now() + 30 * 60 * 1000, hourUtc: 3 });

    // Intentionally post NOTHING — the ?paid=1 return redirect is a UX signal only, not the writer.
    expect((await readBooking(id)).status).toBe("pending");
  });

  it("is replay-safe: the same event id twice → both 200, confirmed once, exactly one paymongo_event row", async () => {
    const id = "bk_paid_replay";
    const eventId = `evt_${randomUUID()}`;
    await seedBooking({ id, status: "pending", expiresAtMs: Date.now() + 30 * 60 * 1000, hourUtc: 4 });

    const body = paidEventBody({ eventId, bookingId: id, paymentId: "pay_test_3", method: "card" });
    expect((await post(body)).status).toBe(200);
    expect((await post(body)).status).toBe(200); // re-delivery → deduped 200 no-op

    expect((await readBooking(id)).status).toBe("confirmed");
    expect((await readBooking(id)).paymentId).toBe("pay_test_3");
    expect(await countEvents(eventId)).toBe(1);
  });

  it("rejects a forged Paymongo-Signature → 400 with no state change", async () => {
    const id = "bk_paid_forged";
    await seedBooking({ id, status: "pending", expiresAtMs: Date.now() + 30 * 60 * 1000, hourUtc: 5 });

    const res = await post(
      paidEventBody({ eventId: `evt_${randomUUID()}`, bookingId: id, paymentId: "pay_test_4", method: "card" }),
      mockPayMongo.badSignature(TS),
    );
    expect(res.status).toBe(400);

    const row = await readBooking(id);
    expect(row.status).toBe("pending");
    expect(row.paymentId).toBeNull();
  });
});

describe("checkout_session.payment.paid — gone-slot backstop (D-58)", () => {
  it("auto-refunds a gone slot on a refundable rail (card) for the frozen amount, exactly once", async () => {
    // Already-cancelled booking simulates a hold swept + slot retaken during payment.
    const id = "bk_gone_card";
    await seedBooking({ id, status: "cancelled", quotedTotalCents: 150000, hourUtc: 10 });

    const res = await post(
      paidEventBody({ eventId: `evt_${randomUUID()}`, bookingId: id, paymentId: "pay_gone_1", method: "card" }),
    );
    expect(res.status).toBe(200); // never a silent 500

    // The confirm claimed 0 rows → auto-refund fired ONCE for the server-frozen amount; no operator alert.
    expect(mockPayMongo.createRefund).toHaveBeenCalledTimes(1);
    const arg = mockPayMongo.createRefund.mock.calls[0][0] as { amountCents: number; paymentId: string };
    expect(arg.amountCents).toBe(150000);
    expect(arg.paymentId).toBe("pay_gone_1");
    expect(recordAuditMock).not.toHaveBeenCalled();

    // Booking stays terminal (cancelled) → the ?paid=1 return renders PaymentReversedState; not confirmed.
    expect((await readBooking(id)).status).toBe("cancelled");
  });

  it("operator-alerts (never API-refunds) a gone slot on QRPh — the money is surfaced, not retained", async () => {
    const id = "bk_gone_qrph";
    await seedBooking({ id, status: "cancelled", quotedTotalCents: 99900, hourUtc: 11 });

    const res = await post(
      paidEventBody({ eventId: `evt_${randomUUID()}`, bookingId: id, paymentId: "pay_gone_2", method: "qrph" }),
    );
    expect(res.status).toBe(200); // no silent 500, no retention

    // QRPh is unrefundable → createRefund NOT called; the operator alert IS raised (needs_attention).
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();
    expect(recordAuditMock).toHaveBeenCalledTimes(1);
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "needs_attention" }),
    );
    expect((await readBooking(id)).status).toBe("cancelled");
  });

  it("double-book-during-payment: the swept loser (A) is reversed, the winner (B) stays pending & confirmable", async () => {
    // A (swept to cancelled) and B (pending) hold the SAME slot — allowed by the EXCLUDE (one occupying row).
    const a = "bk_dbl_loser";
    const b = "bk_dbl_winner";
    const { startsAt, endsAt } = windowAt(12);
    await testDb.db.insert(booking).values([
      {
        id: a,
        listingId: LISTING,
        unit: 1,
        bookerId: BOOKER,
        startsAt,
        endsAt,
        status: "cancelled",
        quotedTotalCents: 150000,
        currency: "php",
      },
      {
        id: b,
        listingId: LISTING,
        unit: 1,
        bookerId: BOOKER,
        startsAt,
        endsAt,
        status: "pending",
        quotedTotalCents: 150000,
        currency: "php",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    ]);

    // A's payment lands, but A's slot was swept + taken → A confirms 0 rows → auto-refund/alert, stays reversed.
    const res = await post(
      paidEventBody({ eventId: `evt_${randomUUID()}`, bookingId: a, paymentId: "pay_gone_3", method: "card" }),
    );
    expect(res.status).toBe(200);

    // A did NOT become confirmed (the EXCLUDE let exactly one path win); B remains pending & confirmable.
    expect((await readBooking(a)).status).toBe("cancelled");
    expect((await readBooking(b)).status).toBe("pending");
    expect(mockPayMongo.createRefund).toHaveBeenCalledTimes(1);
  });
});
