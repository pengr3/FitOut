// PAY-01 / D-57 — the checkout_session.payment.paid webhook is the SINGLE confirm authority.
//
// The Phase-4 synchronous confirmBooking pending→confirmed flip was RETIRED in Plan 03; this webhook is
// now the sole writer of booking→confirmed. These POST a signed body (mockPayMongo.signWebhook) to the
// exported route handler against an isolated schema and assert:
//   - a pending booking is flipped confirmed, expires_at cleared, and the pay_... captured (Task 1);
//   - the confirm keys on status IN ('pending','approved') ALONE — a PAST expires_at still confirms
//     (Pitfall 4, Task 1);
//   - the browser return is NOT the writer: without the webhook the booking stays pending (control);
//   - a re-delivered event id is a 200 no-op (idempotent via paymongo_event), confirming exactly once;
//   - a forged Paymongo-Signature → 400 with no state change;
//   - a genuinely-gone slot is auto-refunded on a refundable rail and operator-alerted on QRPh, never
//     silently kept, and the double-book-during-payment loser is reversed while the winner stays pending
//     (D-58 backstop, Task 2).
//
// Plan 06-05 (PAY-05 / BOOK-06) widens the SAME single writer and adds a confirmed email, so these also assert:
//   - a pay-on-approval request (paid from the `approved` state) confirms through the SAME writer as an
//     instant pay — the confirm WHERE widened to status IN ('pending','approved'), never a 2nd confirm path;
//   - the BOOK-06 booking-confirmed notification fires on a genuine confirm for BOTH modes. 07-10 moved
//     this behind the D-83 `fitout/notify` event, so the assertion moved with it: the probe is now the
//     EMISSION (a `fitout/notify` event carrying type `booking_confirmed` and this booking's id) rather
//     than a captured Resend body. The email itself is dispatched by the Inngest function and is proven by
//     tests/notifications/notify.test.ts — asserting it here too would be testing Inngest, not the webhook.
//     A welcome side-effect: the emission is AWAITED, so the assertion is deterministic and no longer needs
//     vi.waitFor to poll for a background promise that might land after the ACK;
//   - pay-after-release: a released (`cancelled`) request that pays late claims 0 rows → the UNCHANGED
//     handleGoneSlot auto-refunds (refundable rail) and the booking stays terminal → PaymentReversedState,
//     with NO confirmed email (Pitfall 3 — never a silent retention, never a stuck interstitial).

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking, paymongoEvent } from "@/lib/db/schema";
import { mockPayMongo, mockResend } from "../helpers/mocks";
import { bookingReference } from "@/lib/booking/reference";
import { computeServiceFee } from "@/lib/payments/service-fee";

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
  // `approved` (06-05) = a host-approved request whose booker is paying via the SAME checkout as instant
  // (PAY-05); the widened confirm accepts it. `requested` occupies the slot but is not yet payable.
  status: "pending" | "approved" | "requested" | "confirmed" | "cancelled";
  quotedTotalCents?: number | null;
  expiresAtMs?: number | null;
  paymentId?: string | null;
  bookingMode?: "instant" | "request" | null;
  hourUtc: number;
  /** Override the session window with explicit instants — used by the D-57 guard test's PAST session. */
  window?: { startsAt: Date; endsAt: Date };
}): Promise<void> {
  const { startsAt, endsAt } = opts.window ?? windowAt(opts.hourUtc);
  await testDb.db.insert(booking).values({
    id: opts.id,
    listingId: LISTING,
    unit: 1,
    bookerId: BOOKER,
    startsAt,
    endsAt,
    status: opts.status,
    bookingMode: opts.bookingMode ?? null,
    quotedTotalCents: opts.quotedTotalCents ?? 150000,
    currency: "php",
    expiresAt: opts.expiresAtMs != null ? new Date(opts.expiresAtMs) : null,
    paymentId: opts.paymentId ?? null,
  });
}

/** The `fitout/notify` envelope, exactly as `emitNotify` hands it to the Inngest client. */
type NotifyEnvelope = {
  name: string;
  data: {
    type: string;
    recipientId: string;
    bookingId: string | null;
    email: string | null;
    payload: { referenceLabel?: string; whenLabel?: string };
  };
};

/**
 * The Inngest client, stubbed at the MODULE the route's graph actually resolves — the idiom from
 * tests/booking/cancellation.test.ts. `vi.spyOn` on an import held by this file would patch the
 * pre-`resetModules` instance and silently miss, and because `emitNotify` swallows its own errors the miss
 * would look exactly like a pass.
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

/**
 * Assert the BOOK-06 booking-confirmed notification was emitted EXACTLY ONCE for `bookingId`.
 *
 * No polling: 07-10 awaits the emission inside the handler (an enqueue that cannot reject is safe on the
 * ACK path in a way a live Resend call was not), so by the time `post()` resolves the event has either been
 * handed to the client or it never will be. Keyed on the booking's own reference so a sibling case's
 * emission can never false-match.
 */
function expectConfirmedNotification(bookingId: string): void {
  const hits = confirmedEmissions(bookingId);
  expect(hits, `no booking_confirmed emission for ${bookingId}`).toHaveLength(1);
  expect(hits[0].data.recipientId).toBe(BOOKER);
  expect(hits[0].data.bookingId).toBe(bookingId);
  expect(hits[0].data.email).toBe("pp_booker@example.com");
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
  // D-83: the confirmed notice is EMITTED, not sent inline. Stub the client so the emission is observable.
  vi.doMock("@/inngest/client", () => ({ inngest: { send: inngestSend } }));
  vi.resetModules();
  ({ POST } = await import("@/app/api/paymongo/webhook/route"));
});

beforeEach(() => {
  recordAuditMock.mockClear();
  mockPayMongo.createRefund.mockClear();
  inngestSend.mockClear();
  inngestSend.mockResolvedValue({ ids: [] });
});

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("@/lib/audit");
  vi.doUnmock("@/inngest/client");
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

  it("flips an APPROVED (pay-on-approval) request → confirmed via the SAME single writer (PAY-05, widened WHERE)", async () => {
    // A host-approved request pays through the exact Phase-5 checkout; the confirm WHERE widened from
    // status='pending' to IN ('pending','approved'), so this confirms with NO second confirm path (D-57).
    const id = "bk_paid_approved";
    await seedBooking({
      id,
      status: "approved",
      bookingMode: "request",
      expiresAtMs: Date.now() + 6 * 60 * 60 * 1000, // a fresh 24h-class approval window (unshrunk, 06-04)
      hourUtc: 6,
    });

    const res = await post(
      paidEventBody({ eventId: `evt_${randomUUID()}`, bookingId: id, paymentId: "pay_approved_1", method: "card" }),
    );
    expect(res.status).toBe(200);

    const row = await readBooking(id);
    expect(row.status).toBe("confirmed");
    expect(row.expiresAt).toBeNull();
    expect(row.paymentId).toBe("pay_approved_1");
  });

  it("fires the BOOK-06 confirmed email to the booker on an INSTANT (pending) confirm (fire-and-forget)", async () => {
    const id = "bk_email_instant";
    await seedBooking({ id, status: "pending", expiresAtMs: Date.now() + 30 * 60 * 1000, hourUtc: 7 });

    const res = await post(
      paidEventBody({ eventId: `evt_${randomUUID()}`, bookingId: id, paymentId: "pay_email_1", method: "card" }),
    );
    expect(res.status).toBe(200);

    expectConfirmedNotification(id); // the confirmed receipt is emitted on the genuine-confirm branch
    expect((await readBooking(id)).status).toBe("confirmed");
  });

  it("fires the BOOK-06 confirmed email on a PAY-ON-APPROVAL (approved) confirm too", async () => {
    const id = "bk_email_approved";
    await seedBooking({
      id,
      status: "approved",
      bookingMode: "request",
      expiresAtMs: Date.now() + 6 * 60 * 60 * 1000,
      hourUtc: 8,
    });

    const res = await post(
      paidEventBody({ eventId: `evt_${randomUUID()}`, bookingId: id, paymentId: "pay_email_2", method: "gcash" }),
    );
    expect(res.status).toBe(200);

    expectConfirmedNotification(id); // same BOOK-06 receipt as instant — one confirm writer, one notify path
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

  it("D-57 GUARD: the webhook confirms on status='pending' ALONE — a starts_at condition must NEVER be added here (Pitfall 4)", async () => {
    // ┌──────────────────────────────────────────────────────────────────────────────────────────────┐
    // │ IF THIS TEST FAILS, SOMEONE ADDED A START-TIME GUARD TO THE CONFIRM AUTHORITY.                │
    // │                                                                                              │
    // │ D-94 says approve, confirm-initiation and pay are refused once starts_at has passed, and the  │
    // │ payment webhook LOOKS like the pay path. It is not — it is the CONFIRM path, and payment is   │
    // │ the confirm authority (D-57). Adding `AND starts_at > now()` to the confirm UPDATE resurrects │
    // │ exactly the failure 05-04 was built to prevent: the booker's money is taken and the booking   │
    // │ cannot confirm. Money in, nothing delivered, no record that it should have been.              │
    // │                                                                                              │
    // │ The correct homes for D-94's post-start refusals are approveRequest's UPDATE WHERE and        │
    // │ confirmBooking (checkout INITIATION, before any money moves). A payment that lands post-start │
    // │ anyway is already covered by the handleGoneSlot auto-refund backstop (D-58).                  │
    // │                                                                                              │
    // │ Do NOT "fix" this test. Revert the guard.                                                     │
    // └──────────────────────────────────────────────────────────────────────────────────────────────┘
    const id = "bk_paid_post_start";
    // A session that started an hour ago and has already ended — the booker paid late, at the edge of the
    // checkout window, and the webhook arrived after the session began.
    const startsAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const endsAt = new Date(Date.now() - 60 * 60 * 1000);
    await seedBooking({
      id,
      status: "pending",
      expiresAtMs: Date.now() + 30 * 60 * 1000,
      hourUtc: 18,
      window: { startsAt, endsAt },
    });

    const res = await post(
      paidEventBody({ eventId: `evt_${randomUUID()}`, bookingId: id, paymentId: "pay_post_start", method: "card" }),
    );
    expect(res.status).toBe(200);

    // Confirmed anyway. The money was taken, so the booking MUST become real — refusing here would leave
    // the booker paid-but-unconfirmed with no automatic recovery.
    const row = await readBooking(id);
    expect(row.status).toBe("confirmed");
    expect(row.expiresAt).toBeNull();
    expect(row.paymentId).toBe("pay_post_start");

    // And it went through the ordinary confirm path — NOT the gone-slot refund backstop.
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();
  });

  it("confirms an OPEN-CAPACITY (drop-in) booking with the rail UNCHANGED — no capacity re-derivation (OPEN-02 / OC-09)", async () => {
    // ┌──────────────────────────────────────────────────────────────────────────────────────────────┐
    // │ Phase 9 added a whole second occupancy model, and this is the case that proves it did NOT     │
    // │ reach the money rail. The admissions claim happens at HOLD time (09-RESEARCH Pattern 2), so   │
    // │ by the time a payment lands the heads are already claimed and frozen. The webhook stays a     │
    // │ pure `pending → confirmed` flip keyed on booking.id.                                          │
    // │                                                                                              │
    // │ IF SOMEONE EVER ADDS A CAPACITY RE-CHECK HERE, THIS CASE IS WHAT SHOULD STOP THEM. Re-summing │
    // │ the day and refusing on a full date would take a booker's money and leave the booking         │
    // │ unconfirmable — the exact D-57 / Pitfall-4 failure the start-time guard above already bans,   │
    // │ in open-capacity clothing. The date is full BECAUSE this booking's own heads are on it.       │
    // └──────────────────────────────────────────────────────────────────────────────────────────────┘
    const id = "bk_paid_open";
    const HEADS = 3;
    const PER_HEAD = 35000;
    const space = PER_HEAD * HEADS;
    const fee = computeServiceFee(space);
    // The venue's opening/closing instants for one date — a drop-in row is an ORDINARY booking row with
    // `open_capacity = true`, `unit = 1` and `declared_pax` set (D-123). Raw SQL so every field the counter
    // reads is written explicitly, in the shape production writes it.
    const dayOpen = "2026-11-19T22:00:00.000Z";
    const dayClose = "2026-11-20T14:00:00.000Z";
    await testDb.db.execute(sql`
      INSERT INTO booking (id, listing_id, unit, booker_id, starts_at, ends_at, status, booking_mode,
                           open_capacity, full_day, declared_pax, expires_at,
                           space_price_cents, service_fee_cents, quoted_total_cents, currency)
      VALUES (${id}, ${LISTING}, 1, ${BOOKER}, ${dayOpen}::timestamptz, ${dayClose}::timestamptz,
              'pending', 'instant', true, false, ${HEADS}, now() + interval '30 minutes',
              ${space}, ${fee.serviceFeeCents}, ${fee.allInCents}, 'php')`);

    const res = await post(
      paidEventBody({ eventId: `evt_${randomUUID()}`, bookingId: id, paymentId: "pay_open_1", method: "gcash" }),
    );
    expect(res.status).toBe(200);

    const [row] = (await testDb.client`
      SELECT status, unit, open_capacity, full_day, declared_pax, payment_id, expires_at,
             starts_at, ends_at, space_price_cents, service_fee_cents, quoted_total_cents
      FROM booking WHERE id = ${id}`) as unknown as {
      status: string;
      unit: number;
      open_capacity: boolean;
      full_day: boolean;
      declared_pax: number;
      payment_id: string | null;
      expires_at: Date | null;
      starts_at: Date | string;
      ends_at: Date | string;
      space_price_cents: number;
      service_fee_cents: number;
      quoted_total_cents: number;
    }[];

    // The SAME single writer, doing the SAME three things it does for an hourly booking.
    expect(row.status).toBe("confirmed");
    expect(row.expires_at).toBeNull();
    expect(row.payment_id).toBe("pay_open_1");

    // …and nothing else moved. The head count, the arbitration flag, the sentinel unit, the OC-03 window
    // and the frozen triple are all exactly as the claim wrote them.
    expect(row.declared_pax).toBe(HEADS);
    expect(row.open_capacity).toBe(true);
    expect(row.unit).toBe(1);
    expect(row.full_day).toBe(false);
    expect(new Date(row.starts_at).toISOString()).toBe(dayOpen);
    expect(new Date(row.ends_at).toISOString()).toBe(dayClose);
    expect(row.space_price_cents).toBe(space);
    expect(row.service_fee_cents).toBe(fee.serviceFeeCents);
    expect(row.quoted_total_cents).toBe(fee.allInCents);

    // The occupying SUM for that date is still exactly this booking's heads: confirming moved the row from
    // one half of the occupying predicate (live pending) to the other (confirmed) without double-counting
    // it or dropping it — which is what keeps the calendar agreeing with the counter (Pitfall 4).
    const [{ heads }] = (await testDb.client`
      SELECT COALESCE(SUM(b.declared_pax), 0)::int AS heads
      FROM booking b
      WHERE b.listing_id = ${LISTING} AND b.open_capacity = true
        AND b.starts_at = ${dayOpen}::timestamptz
        AND (b.status = 'confirmed' OR (b.status = 'pending' AND b.expires_at > now()))`) as unknown as {
      heads: number;
    }[];
    expect(heads).toBe(HEADS);

    // A genuine confirm earns the BOOK-06 receipt, for a drop-in booking exactly as for an hourly one.
    expectConfirmedNotification(id);
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();
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

describe("checkout_session.payment.paid — real single-mode signature (te-XOR-li, G-06-01)", () => {
  // PayMongo signs ONE mode per delivery: TEST fills `te` (empty `li`), LIVE fills `li` (empty `te`) — never
  // both. The pre-06-10 parseSignature required all three of t/te/li non-empty, so every REAL signature →
  // null → 400 before confirming (proven live in the 06-09 UAT). The existing fixtures masked this by
  // populating BOTH te and li. These cases exercise the real single-mode shapes at the signer's source.

  it("Case A — TEST shape (te valid, li EMPTY): confirms a pending booking + fires BOOK-06 (real 06-09 shape)", async () => {
    const id = "bk_teonly_confirm";
    await seedBooking({ id, status: "pending", expiresAtMs: Date.now() + 30 * 60 * 1000, hourUtc: 15 });

    const body = paidEventBody({
      eventId: `evt_${randomUUID()}`,
      bookingId: id,
      paymentId: "pay_teonly_1",
      method: "card",
    });
    // te populated, li EMPTY — the exact shape the real 06-09 test-mode checkout produced.
    const res = await post(body, mockPayMongo.signWebhook(body, SECRET, TS, "test"));
    expect(res.status).toBe(200);

    const row = await readBooking(id);
    expect(row.status).toBe("confirmed");
    expect(row.expiresAt).toBeNull();
    expect(row.paymentId).toBe("pay_teonly_1");

    // BOOK-06 fires directly on the te-only path — proven under a REAL single-mode signature, not the
    // both-populated fixture that masked G-06-01.
    expectConfirmedNotification(id);
  });

  it("Case B — LIVE shape (te EMPTY, li valid): confirms an APPROVED pay-on-approval booking + fires BOOK-06", async () => {
    const id = "bk_lionly_confirm";
    await seedBooking({
      id,
      status: "approved",
      bookingMode: "request",
      expiresAtMs: Date.now() + 6 * 60 * 60 * 1000,
      hourUtc: 16,
    });

    const body = paidEventBody({
      eventId: `evt_${randomUUID()}`,
      bookingId: id,
      paymentId: "pay_lionly_1",
      method: "gcash",
    });
    // te EMPTY, li populated — the LIVE-mode mirror; the SAME single writer confirms both modes.
    const res = await post(body, mockPayMongo.signWebhook(body, SECRET, TS, "live"));
    expect(res.status).toBe(200);

    const row = await readBooking(id);
    expect(row.status).toBe("confirmed");
    expect(row.expiresAt).toBeNull();
    expect(row.paymentId).toBe("pay_lionly_1");

    expectConfirmedNotification(id); // BOOK-06 on the li-only path too
  });

  it("Case C — BOTH-empty header still 400s with no state change (spoofing protection intact, T-06-SPOOF)", async () => {
    const id = "bk_bothempty_reject";
    await seedBooking({ id, status: "pending", expiresAtMs: Date.now() + 30 * 60 * 1000, hourUtc: 17 });

    const body = paidEventBody({
      eventId: `evt_${randomUUID()}`,
      bookingId: id,
      paymentId: "pay_bothempty_1",
      method: "card",
    });
    // A header with BOTH signatures empty — the widened predicate tolerates ONE empty part, never both.
    const res = await post(body, `t=${TS},te=,li=`);
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

  it("pay-after-release: a released (cancelled) request that pays late → 0-row confirm → handleGoneSlot auto-refunds, stays terminal, NO confirm email (Pitfall 3)", async () => {
    // A request that reached `approved` then had its payment window lapse (swept to `cancelled`, 06-06) —
    // then the booker pays anyway. The widened WHERE did NOT add request-specific refund logic: the SAME
    // D-58 backstop that handles an instant gone slot handles this pay-after-release race identically.
    const id = "bk_release_card";
    await seedBooking({
      id,
      status: "cancelled",
      bookingMode: "request",
      quotedTotalCents: 150000,
      hourUtc: 13,
    });

    const res = await post(
      paidEventBody({ eventId: `evt_${randomUUID()}`, bookingId: id, paymentId: "pay_release_1", method: "card" }),
    );
    expect(res.status).toBe(200); // never a silent 500

    // 0-row confirm → the UNCHANGED handleGoneSlot auto-refunds the server-frozen amount ONCE (no alert).
    expect(mockPayMongo.createRefund).toHaveBeenCalledTimes(1);
    const arg = mockPayMongo.createRefund.mock.calls[0][0] as { amountCents: number; paymentId: string };
    expect(arg.amountCents).toBe(150000);
    expect(arg.paymentId).toBe("pay_release_1");
    expect(recordAuditMock).not.toHaveBeenCalled();

    // Stays terminal → PaymentReversedState, never confirmed, and the BOOK-06 notification NEVER fires for
    // it: the emission is on the ≥1-row branch ONLY, so a 0-row confirm earns no receipt in EITHER channel.
    // This is also the duplicate-suppression proof for a webhook REDELIVERY — the status-scoped UPDATE is
    // what gates the emission, so a second delivery of a confirmed booking emits nothing.
    expect((await readBooking(id)).status).toBe("cancelled");
    expect(confirmedEmissions(id)).toHaveLength(0);
    expect(mockResend.sent()).toHaveLength(0);
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
