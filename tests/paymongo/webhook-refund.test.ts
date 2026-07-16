// PAY-01 / D-60 — payment.refunded / payment.refund.updated idempotently mark the booking + payout ledger
// refunded. The webhook stays the single writer; state is DERIVED from the verified event TYPE, never a
// client body field, and a re-delivered event id is a 200 no-op via the paymongo_event dedupe.
//
// These POST a signed body (mockPayMongo.signWebhook) to the exported route handler against an isolated
// schema and assert: a payment.refunded referencing a captured pay_... flips the ledger row held→refunded
// and marks the booking cancelled; a replay transitions exactly once; a forged signature → 400, unchanged.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking, hostPayoutLedger, paymongoEvent } from "@/lib/db/schema";
import { mockPayMongo } from "../helpers/mocks";

const SECRET = "whsec_test_refund";
const TS = 1_700_000_000;

let testDb: TestDb;
let POST: (typeof import("@/app/api/paymongo/webhook/route"))["POST"];
let prevSecret: string | undefined;

const HOST = "rf_host";
const BOOKER = "rf_booker";
const LISTING = "L_rf";

function windowAt(hourUtc: number): { startsAt: Date; endsAt: Date } {
  const h = String(hourUtc).padStart(2, "0");
  const h1 = String(hourUtc + 1).padStart(2, "0");
  return {
    startsAt: new Date(`2026-12-01T${h}:00:00.000Z`),
    endsAt: new Date(`2026-12-01T${h1}:00:00.000Z`),
  };
}

/** Seed a confirmed booking + a held payout-ledger row keyed to the same pay_... the refund references. */
async function seedConfirmedWithLedger(opts: {
  bookingId: string;
  ledgerId: string;
  paymentId: string;
  hourUtc: number;
}): Promise<void> {
  const { startsAt, endsAt } = windowAt(opts.hourUtc);
  await testDb.db.insert(booking).values({
    id: opts.bookingId,
    listingId: LISTING,
    unit: 1,
    bookerId: BOOKER,
    startsAt,
    endsAt,
    status: "confirmed",
    quotedTotalCents: 150000,
    currency: "php",
    paymentId: opts.paymentId,
  });
  await testDb.db.insert(hostPayoutLedger).values({
    id: opts.ledgerId,
    bookingId: opts.bookingId,
    hostId: HOST,
    paymentId: opts.paymentId,
    grossCents: 150000,
    commissionRateBps: 1000,
    commissionCents: 15000,
    netCents: 135000,
    currency: "php",
    state: "held",
  });
}

async function readLedger(id: string) {
  const [row] = await testDb.db
    .select({ state: hostPayoutLedger.state })
    .from(hostPayoutLedger)
    .where(eq(hostPayoutLedger.id, id));
  return row;
}
async function readBooking(id: string) {
  const [row] = await testDb.db
    .select({ status: booking.status })
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

/** A PayMongo refund event body — the Refund resource carries payment_id (A1 nesting). */
function refundEventBody(opts: { eventId: string; type?: string; paymentId: string }): string {
  return JSON.stringify({
    data: {
      id: opts.eventId,
      attributes: {
        type: opts.type ?? "payment.refunded",
        data: {
          id: "ref_test_1",
          attributes: { payment_id: opts.paymentId, status: "succeeded" },
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
    { id: HOST, name: "RF Host", email: "rf_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "RF Booker", email: "rf_booker@example.com", firstName: "Booker" },
  ]);
  await testDb.db.insert(listing).values({
    id: LISTING,
    hostId: HOST,
    title: "RF Listing",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 150000,
  });

  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/paymongo", () => ({ createRefund: mockPayMongo.createRefund }));
  vi.resetModules();
  ({ POST } = await import("@/app/api/paymongo/webhook/route"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  process.env.PAYMONGO_WEBHOOK_SECRET = prevSecret;
  await teardownTestDb(testDb);
});

describe("payment.refunded / payment.refund.updated — refund mechanism (D-60)", () => {
  it("marks the ledger row refunded and the booking cancelled from a verified payment.refunded", async () => {
    await seedConfirmedWithLedger({
      bookingId: "bk_rf_ok",
      ledgerId: "led_rf_ok",
      paymentId: "pay_rf_ok",
      hourUtc: 1,
    });

    const res = await post(refundEventBody({ eventId: `evt_${randomUUID()}`, paymentId: "pay_rf_ok" }));
    expect(res.status).toBe(200);

    expect((await readLedger("led_rf_ok")).state).toBe("refunded");
    expect((await readBooking("bk_rf_ok")).status).toBe("cancelled");
  });

  it("also handles payment.refund.updated (both refund event types drive the same transition)", async () => {
    await seedConfirmedWithLedger({
      bookingId: "bk_rf_upd",
      ledgerId: "led_rf_upd",
      paymentId: "pay_rf_upd",
      hourUtc: 2,
    });

    const res = await post(
      refundEventBody({
        eventId: `evt_${randomUUID()}`,
        type: "payment.refund.updated",
        paymentId: "pay_rf_upd",
      }),
    );
    expect(res.status).toBe(200);
    expect((await readLedger("led_rf_upd")).state).toBe("refunded");
  });

  it("is replay-safe: the same refund event id twice → both 200, ledger refunded once, one event row", async () => {
    await seedConfirmedWithLedger({
      bookingId: "bk_rf_replay",
      ledgerId: "led_rf_replay",
      paymentId: "pay_rf_replay",
      hourUtc: 3,
    });

    const eventId = `evt_${randomUUID()}`;
    const body = refundEventBody({ eventId, paymentId: "pay_rf_replay" });
    expect((await post(body)).status).toBe(200);
    expect((await post(body)).status).toBe(200); // re-delivery → deduped 200 no-op

    expect((await readLedger("led_rf_replay")).state).toBe("refunded");
    expect(await countEvents(eventId)).toBe(1);
  });

  it("rejects a forged Paymongo-Signature → 400 with the ledger + booking unchanged", async () => {
    await seedConfirmedWithLedger({
      bookingId: "bk_rf_forged",
      ledgerId: "led_rf_forged",
      paymentId: "pay_rf_forged",
      hourUtc: 4,
    });

    const res = await post(
      refundEventBody({ eventId: `evt_${randomUUID()}`, paymentId: "pay_rf_forged" }),
      mockPayMongo.badSignature(TS),
    );
    expect(res.status).toBe(400);

    expect((await readLedger("led_rf_forged")).state).toBe("held");
    expect((await readBooking("bk_rf_forged")).status).toBe("confirmed");
  });
});
