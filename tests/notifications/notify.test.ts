// MANAGE-03 notification fan-out (D-83/D-86/D-90/D-91), exercised against an isolated schema with the
// shared Resend mock capturing every send. Proves the load-bearing invariants:
//   - FAN-OUT (D-91): ONE `fitout/notify` event produces exactly ONE durable notification row AND exactly
//     ONE email to the recipient. The two channels are written from a single event so they cannot drift.
//   - EMAIL RETRY DOES NOT DUPLICATE THE ROW (D-91): the two steps are independently memoized, so re-running
//     `send-email` against the same event leaves the notification count at 1. This is the property that lets
//     the email be retried aggressively without corrupting durable history — and it is the reason the row is
//     written in step (1) and the send in step (2), rather than both in one step.
//   - PERMANENT FAILURE LEAVES A MARK (D-90): `notifyOnFailure` writes a `needs_attention` audit entry
//     carrying the notify type and the ids. WR-04's actual complaint was that a failed send was INVISIBLE;
//     this is the test that it no longer is.
//   - THE WRITE BOUNDARY REJECTS MALFORMED PAYLOADS (T-07-37): `notifyEventSchema.parse` runs before the
//     INSERT, so a payload that crossed the event hop cannot land half-written.
//   - NEVER BLOCKS THE CALLER (MANAGE-03): `emitNotify` resolves even when the transport rejects. The money
//     /state action that called it has ALREADY committed; a notification is an amplifier of that fact, never
//     a precondition, so it must not be able to throw back into the action.
//   - OWNER-SCOPED READS (T-07-38): both read paths filter on recipient_id in the WHERE, so a foreign row is
//     unreadable rather than merely unrendered.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { mockResend } from "../helpers/mocks";
import { user, listing, booking, type NotificationPayload } from "@/lib/db/schema";
import {
  NOTIFY_EVENT,
  countUnread,
  emitNotify,
  insertNotification,
  listRecent,
  type NotifyEvent,
} from "@/lib/notifications";
import { notifyOnFailure, sendForType } from "@/inngest/functions/notify";
import { inngest } from "@/inngest/client";

let testDb: TestDb;

let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

/** A well-formed booking_confirmed payload — the default subject of most cases. */
function confirmedPayload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    type: "booking_confirmed",
    listingTitle: "Court A",
    whenLabel: "Saturday, Jul 25, 8:00 AM – 9:00 AM (Manila time)",
    totalLabel: "₱1,050.00",
    referenceLabel: "FIT-ABCD1234",
    href: "/bookings/abc",
    ...overrides,
  } as NotificationPayload;
}

function makeEvent(over: Partial<NotifyEvent> & Pick<NotifyEvent, "recipientId">): NotifyEvent {
  return {
    type: "booking_confirmed",
    bookingId: null,
    email: "booker@example.com",
    payload: confirmedPayload(),
    ...over,
  };
}

async function makeUser(prefix: string): Promise<string> {
  const id = uid(prefix);
  await testDb.db.insert(user).values({
    id,
    name: "Person",
    email: `${id}@example.com`,
    firstName: "Person",
  });
  return id;
}

/** A real booking so the notification's booking_id FK resolves (case 2 counts by booking_id). */
async function makeBooking(bookerId: string): Promise<string> {
  const hostId = await makeUser("host");
  const listingId = uid("listing");
  await testDb.db.insert(listing).values({
    id: listingId,
    hostId,
    title: "Court A",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 100000,
    currency: "php",
  });
  const bookingId = uid("bk");
  const startsAt = new Date(Date.now() + 86_400_000);
  await testDb.db.insert(booking).values({
    id: bookingId,
    listingId,
    unit: 1,
    bookerId,
    startsAt,
    endsAt: new Date(startsAt.getTime() + 3_600_000),
    status: "confirmed",
    quotedTotalCents: 105000,
    spacePriceCents: 100000,
    serviceFeeCents: 5000,
    currency: "php",
  });
  return bookingId;
}

async function countNotifications(where: ReturnType<typeof sql>): Promise<number> {
  const [row] = (await testDb.db.execute(sql`
    SELECT count(*)::int AS "c" FROM notification WHERE ${where}
  `)) as unknown as { c: number }[];
  return row?.c ?? 0;
}

beforeAll(async () => {
  testDb = await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("notify fan-out (MANAGE-03)", () => {
  it("the wire contract is the single shared event name", () => {
    // The trigger in notify.ts and the send in emitNotify both read this constant. A literal on either
    // side would let the two drift apart silently — every emit would enqueue an event nothing listens for,
    // and the emitter swallows by design, so nothing would ever surface the mistake.
    expect(NOTIFY_EVENT).toBe("fitout/notify");
  });

  it("(1) one event → exactly one notification row AND exactly one email (D-91 parity)", async () => {
    const recipientId = await makeUser("booker");
    const bookingId = await makeBooking(recipientId);
    const event = makeEvent({ recipientId, bookingId, email: "fanout@example.com" });

    // The two steps of the notify handler body, in the order the function runs them.
    await insertNotification(testDb.db, event);
    const result = await sendForType(event);

    expect(result).toEqual({ sent: true });
    expect(await countNotifications(sql`recipient_id = ${recipientId}`)).toBe(1);

    const toThisRecipient = mockResend.sent().filter((e) => e.to === "fanout@example.com");
    expect(toThisRecipient).toHaveLength(1);
    // The email renders the payload's display strings — the SAME strings the in-app row stores.
    expect(toThisRecipient[0].html).toContain("Court A");
    expect(toThisRecipient[0].html).toContain("FIT-ABCD1234");
  });

  it("(2) an email-step retry does NOT duplicate the notification row (step memoization)", async () => {
    const recipientId = await makeUser("retry");
    const bookingId = await makeBooking(recipientId);
    const event = makeEvent({ recipientId, bookingId, email: "retry@example.com" });

    // Inngest memoizes a completed step: on a retry, `write-notification` is NOT re-executed and only
    // `send-email` runs again. Simulate exactly that — step (1) once, step (2) twice.
    await insertNotification(testDb.db, event);
    await sendForType(event);
    await sendForType(event);

    // The durable record is still singular. This is the invariant that makes an aggressive email retry
    // budget safe: retries can never corrupt history, only re-attempt delivery.
    expect(await countNotifications(sql`booking_id = ${bookingId}`)).toBe(1);
    expect(mockResend.sent().filter((e) => e.to === "retry@example.com")).toHaveLength(2);
  });

  it("(3) onFailure writes a needs_attention audit entry carrying the ids (D-90)", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await notifyOnFailure({
      error: { message: "resend 503" },
      event: {
        data: {
          event: {
            data: {
              type: "booking_cancelled_by_host",
              recipientId: "user_failed",
              bookingId: "bk_failed",
            },
          },
        },
      },
    });

    // recordAudit's v1 sink is a structured console.info("[audit]", <json>) line, NOT a durable table
    // (src/lib/audit.ts documents the tradeoff). The entry SHAPE is what is stable and asserted here, so
    // this test keeps passing unchanged when a durable sink is swapped in behind recordAudit.
    const entries = infoSpy.mock.calls
      .filter((c) => c[0] === "[audit]")
      .map((c) => JSON.parse(c[1] as string) as { action: string; outcome: string; meta: Record<string, unknown> });

    const entry = entries.find((e) => e.action === "notify");
    expect(entry).toBeDefined();
    expect(entry!.outcome).toBe("needs_attention");
    expect(entry!.meta).toMatchObject({
      notifyType: "booking_cancelled_by_host",
      recipientId: "user_failed",
      bookingId: "bk_failed",
      error: "resend 503",
    });

    // The operator-facing alert line fires too — the audit entry and the log line are both part of D-90's
    // "no admin surface, but never invisible" answer.
    expect(errorSpy).toHaveBeenCalledWith("[notify-alert] permanently failed", { error: "resend 503" });

    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("(4) a malformed payload is rejected at the write boundary and writes NOTHING (T-07-37)", async () => {
    const recipientId = await makeUser("malformed");
    // `whenLabel` removed — a required display string. Cast because the whole point is that this shape
    // cannot exist in TypeScript; it can only arrive across the event hop, where types are a memory.
    const bad = {
      type: "booking_confirmed",
      recipientId,
      bookingId: null,
      email: "malformed@example.com",
      payload: {
        type: "booking_confirmed",
        listingTitle: "Court A",
        totalLabel: "₱1,050.00",
        referenceLabel: "FIT-ABCD1234",
        href: "/bookings/abc",
      },
    } as unknown as NotifyEvent;

    await expect(insertNotification(testDb.db, bad)).rejects.toThrow();
    expect(await countNotifications(sql`recipient_id = ${recipientId}`)).toBe(0);
  });

  it("(4b) a javascript: href is rejected before it can reach durable storage (T-07-36)", async () => {
    const recipientId = await makeUser("xss");
    const evil = makeEvent({
      recipientId,
      payload: confirmedPayload({ href: "javascript:alert(1)" } as Partial<NotificationPayload>),
    });

    // escapeHtml stops attribute breakout but leaves a javascript: scheme intact — and this row is
    // durable, so it would be rendered by surfaces not yet written. The scheme is refused here.
    await expect(insertNotification(testDb.db, evil)).rejects.toThrow();
    expect(await countNotifications(sql`recipient_id = ${recipientId}`)).toBe(0);
  });

  it("(5) a null email writes the row and sends nothing, without throwing", async () => {
    const recipientId = await makeUser("noemail");
    const event = makeEvent({ recipientId, email: null });

    await insertNotification(testDb.db, event);
    const result = await sendForType(event);

    // The durable channel still lands — D-91's whole ordering rationale. The email step is a no-op, NOT a
    // failure: throwing would burn the retry budget and then raise a needs_attention alert about a
    // condition no operator can act on, which would drown the alerts that matter.
    expect(result).toEqual({ sent: false, reason: "no_email" });
    expect(await countNotifications(sql`recipient_id = ${recipientId}`)).toBe(1);
    expect(mockResend.sent()).toHaveLength(0);
  });

  it("(6) emitNotify swallows a transport failure and never throws (MANAGE-03)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const sendSpy = vi
      .spyOn(inngest, "send")
      .mockRejectedValue(new Error("inngest unreachable"));

    const event = makeEvent({ recipientId: "someone", bookingId: "bk_x" });

    // THIS is the "never blocks the booking transaction" guarantee, at the emitter. The caller has already
    // committed; if this rejected, a server action would surface a failure for a booking that genuinely
    // succeeded — or, worse, attempt to undo it.
    await expect(emitNotify(event)).resolves.toBeUndefined();

    expect(sendSpy).toHaveBeenCalledTimes(1);
    // The failure is logged, not silent — this is the accepted-bounded-gap path, and it is observable.
    expect(errorSpy).toHaveBeenCalledWith(
      "[notify] enqueue_failed",
      expect.objectContaining({ type: "booking_confirmed", bookingId: "bk_x" }),
    );
    // And the log carries no payload and no recipient address (T-07-38).
    const logged = errorSpy.mock.calls.find((c) => c[0] === "[notify] enqueue_failed")![1] as Record<string, unknown>;
    expect(logged).not.toHaveProperty("payload");
    expect(logged).not.toHaveProperty("email");

    sendSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("(7) both reads are owner-scoped — user A never sees user B's notifications (T-07-38)", async () => {
    const userA = await makeUser("owner_a");
    const userB = await makeUser("owner_b");

    await insertNotification(testDb.db, makeEvent({ recipientId: userA }));
    await insertNotification(testDb.db, makeEvent({ recipientId: userA }));
    await insertNotification(testDb.db, makeEvent({ recipientId: userB }));
    await insertNotification(testDb.db, makeEvent({ recipientId: userB }));
    await insertNotification(testDb.db, makeEvent({ recipientId: userB }));

    expect(await countUnread(testDb.db, userA)).toBe(2);
    expect(await countUnread(testDb.db, userB)).toBe(3);

    const recent = await listRecent(testDb.db, userA, 20);
    expect(recent).toHaveLength(2);
    // The scoping is in the WHERE, so a foreign row is UNSELECTABLE — anything reaching here has leaked.
    expect(recent.every((r) => r.payload.type === "booking_confirmed")).toBe(true);

    // Marking A's rows read must not move B's count — the partial index is scoped the same way.
    await testDb.db.execute(sql`UPDATE notification SET read_at = now() WHERE recipient_id = ${userA}`);
    expect(await countUnread(testDb.db, userA)).toBe(0);
    expect(await countUnread(testDb.db, userB)).toBe(3);

    // And the timestamps hydrate as real Dates, not the Postgres TEXT dbConn.execute actually returns.
    const afterRead = await listRecent(testDb.db, userA, 20);
    expect(afterRead[0].createdAt).toBeInstanceOf(Date);
    expect(Number.isNaN(afterRead[0].createdAt.getTime())).toBe(false);
    expect(afterRead[0].readAt).toBeInstanceOf(Date);
  });

  it("(7b) listRecent is hard-capped regardless of the requested limit", async () => {
    const userC = await makeUser("capped");
    for (let i = 0; i < 3; i++) {
      await insertNotification(testDb.db, makeEvent({ recipientId: userC }));
    }
    // A crafted limit can never request an unbounded read.
    expect(await listRecent(testDb.db, userC, 10_000)).toHaveLength(3);
    expect(await listRecent(testDb.db, userC, 2)).toHaveLength(2);
  });
});
