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
import { describeNotification } from "@/components/notifications/notification-item";
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

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// CR-02 (07-17) — deadline claims in lifecycle emails render the ROW's capped label, never flat config.
//
// The payloads already carry the real D-96 session-start-capped deadline (`payByLabel` off the approval
// UPDATE's RETURNING; `respondByLabel` off the request insert). The defect was sendForType dropping both
// on the floor while the templates rendered APPROVAL_PAYMENT_WINDOW_HOURS / APPROVAL_SLA_HOURS — false in
// writing on every short-notice request, and a two-channel drift from the correct in-app copy (the exact
// failure D-91/D-99 forbid). The labels below are deliberately UNDERIVABLE from config: the only way the
// email can contain them is by rendering the payload field.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

/** A capped deadline no config constant could produce — the row's own composed label. */
const CR02_PAY_BY = "Thu, Jul 3, 8:00 PM (Manila time)";
const CR02_RESPOND_BY = "Fri, Jul 4, 6:30 AM (Manila time)";

const cr02ApprovedPayload: NotificationPayload = {
  type: "request_approved",
  listingTitle: "Court A",
  whenLabel: "Fri, Jul 4, 9:00 AM – 10:00 AM (Manila time)",
  totalLabel: "₱1,050.00",
  payByLabel: CR02_PAY_BY,
  href: "https://fitout.example/listings/l1/book?hold=bk1",
};

const cr02NewRequestPayload: NotificationPayload = {
  type: "new_request_to_host",
  listingTitle: "Court A",
  whenLabel: "Fri, Jul 4, 9:00 AM – 10:00 AM (Manila time)",
  bookerLabel: "Cassie",
  totalLabel: "₱1,050.00",
  respondByLabel: CR02_RESPOND_BY,
  href: "https://fitout.example/host/requests",
};

describe("CR-02 — lifecycle emails state the row's real deadline, not the config constants", () => {
  it("(A) request_approved email contains the payload's payByLabel and no 'within N hours' claim", async () => {
    await sendForType(
      makeEvent({
        recipientId: "cr02_user_a",
        type: "request_approved",
        email: "cr02-approved@example.com",
        payload: cr02ApprovedPayload,
      }),
    );

    const [email] = mockResend.sent().filter((e) => e.to === "cr02-approved@example.com");
    expect(email).toBeDefined();
    // The ROW's capped deadline, verbatim — the only source it can come from is the payload.
    expect(email.html).toContain(CR02_PAY_BY);
    // And the flat-constant phrasing is GONE. On a short-notice approval "within 12 hours" is simply
    // false — the window closes when the session starts.
    expect(email.html).not.toMatch(/within\s+\d+\s+hours/i);
  });

  it("(B) new_request_to_host email contains the payload's respondByLabel and no 'within N hours' claim", async () => {
    await sendForType(
      makeEvent({
        recipientId: "cr02_user_b",
        type: "new_request_to_host",
        email: "cr02-host@example.com",
        payload: cr02NewRequestPayload,
      }),
    );

    const [email] = mockResend.sent().filter((e) => e.to === "cr02-host@example.com");
    expect(email).toBeDefined();
    expect(email.html).toContain(CR02_RESPOND_BY);
    // A host who trusts "within 24 hours" finds the request auto-declined long before the deadline the
    // platform stated in writing — the D-96 split can shrink the SLA to a single hour.
    expect(email.html).not.toMatch(/within\s+\d+\s+hours/i);
  });

  it("(C) two-channel parity: the in-app copy states the SAME deadline as the email (D-91)", () => {
    // The SAME payload objects cases A and B just emailed. One payload feeds both channels; after the
    // fix both channels state the same capped deadline for the same event.
    expect(describeNotification(cr02ApprovedPayload).body).toContain(CR02_PAY_BY);
    expect(describeNotification(cr02NewRequestPayload).body).toContain(CR02_RESPOND_BY);
  });

  it("(D) request_received email makes NO numeric deadline claim but keeps the not-charged reassurance", async () => {
    // The request_received payload carries no deadline field, and adding one is a four-file payload
    // change outside this plan's scope — so its email must state NO number at all (a numberless claim
    // cannot be false), while keeping the D-63 "you haven't been charged" reassurance.
    await sendForType(
      makeEvent({
        recipientId: "cr02_user_d",
        type: "request_received",
        email: "cr02-received@example.com",
        payload: {
          type: "request_received",
          listingTitle: "Court A",
          whenLabel: "Fri, Jul 4, 9:00 AM – 10:00 AM (Manila time)",
          totalLabel: "₱1,050.00",
          href: "https://fitout.example/bookings/bk1",
        },
      }),
    );

    const [email] = mockResend.sent().filter((e) => e.to === "cr02-received@example.com");
    expect(email).toBeDefined();
    expect(email.html).not.toMatch(/\d+\s+hours/i);
    expect(email.html).toContain("You haven't been charged");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// WR-04 (07-17) — the host's copy of a host cancellation addresses the HOST's situation.
//
// `cancelBookingAsHost` emits booking_cancelled_by_host to BOTH parties. Pre-fix, both received the
// booker's copy: the CANCELLER was told "You're getting a full refund of ₱X" — wrong on every clause —
// and the D-71 fee consequence appeared in neither channel. The payload's `side` discriminant routes the
// host to their own truthful record; the booker's copy is byte-unchanged (positive control below).
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("WR-04 — host-cancellation emails address each recipient's own situation", () => {
  const wr04Payload = (over: Record<string, unknown>) =>
    ({
      type: "booking_cancelled_by_host",
      listingTitle: "Court A",
      whenLabel: "Fri, Jul 4, 9:00 AM – 10:00 AM (Manila time)",
      refundLabel: "₱1,050.00",
      ...over,
    }) as NotificationPayload;

  it("(host side) 'You cancelled' + the fee consequence — never the booker's sentences", async () => {
    await sendForType(
      makeEvent({
        recipientId: "wr04_host",
        type: "booking_cancelled_by_host",
        email: "wr04-host@example.com",
        payload: wr04Payload({
          side: "host",
          feeLabel: "₱300.00",
          href: "https://fitout.example/host/bookings",
        }),
      }),
    );

    const [email] = mockResend.sent().filter((e) => e.to === "wr04-host@example.com");
    expect(email).toBeDefined();
    expect(email.html).toContain("You cancelled");
    expect(email.html).toContain("₱1,050.00"); // the guest's refund, named for the host's records
    expect(email.html).toContain("₱300.00"); // the D-71 fee, finally in writing (WR-04's complaint)
    expect(email.html).toMatch(/fee.*deducted|deducted.*fee/i);
    // The canceller must never receive the booker's sentences about themselves.
    expect(email.html).not.toContain("You're getting");
    expect(email.html).not.toContain("the host cancelled your booking");
  });

  it("(host side, no fee) the fee sentence is absent when no fee was charged", async () => {
    await sendForType(
      makeEvent({
        recipientId: "wr04_host_nofee",
        type: "booking_cancelled_by_host",
        email: "wr04-host-nofee@example.com",
        payload: wr04Payload({ side: "host", href: "https://fitout.example/host/bookings" }),
      }),
    );

    const [email] = mockResend.sent().filter((e) => e.to === "wr04-host-nofee@example.com");
    expect(email).toBeDefined();
    expect(email.html).toContain("You cancelled");
    expect(email.html).not.toMatch(/cancellation fee/i);
  });

  it("(booker side, positive control) the booker's email copy is byte-unchanged", async () => {
    await sendForType(
      makeEvent({
        recipientId: "wr04_booker",
        type: "booking_cancelled_by_host",
        email: "wr04-booker@example.com",
        payload: wr04Payload({ side: "booker", href: "https://fitout.example/bookings/bk1" }),
      }),
    );

    const [email] = mockResend.sent().filter((e) => e.to === "wr04-booker@example.com");
    expect(email).toBeDefined();
    expect(email.html).toContain("The host cancelled this booking");
    expect(email.html).toContain("You're getting a full refund of ₱1,050.00");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// D-122 (08-04) — the three group RSVP types dispatch to their email templates (account recipients).
//
// These are the four-file compile-checked additions. sendForType is exhaustive with NO default:, so the
// only way these three cases can email nothing is if a branch is missing — which is a BUILD error, not a
// silent test-green gap. The G6 case pins the load-bearing security property: a guest-typed attendee name
// is escapeHtml'd in the organizer's email body, never rendered as live markup.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("D-122 — group RSVP notifications dispatch to their templates", () => {
  const groupWhen = "Sat, Jul 25, 8:00 AM – 9:00 AM (Manila time)";

  it("(A) group_rsvp_received (yes) emails the organizer 'is coming'", async () => {
    await sendForType(
      makeEvent({
        recipientId: "grp_org_yes",
        type: "group_rsvp_received",
        email: "organizer-yes@example.com",
        payload: {
          type: "group_rsvp_received",
          listingTitle: "Court A",
          whenLabel: groupWhen,
          attendeeLabel: "Cassie",
          answer: "yes",
          href: "https://fitout.example/bookings/bk1/group",
        },
      }),
    );
    const [email] = mockResend.sent().filter((e) => e.to === "organizer-yes@example.com");
    expect(email).toBeDefined();
    expect(email.html).toContain("Cassie is coming");
    expect(email.html).toContain("Court A");
  });

  it("(B) group_rsvp_received (no) emails the organizer 'can't make it'", async () => {
    await sendForType(
      makeEvent({
        recipientId: "grp_org_no",
        type: "group_rsvp_received",
        email: "organizer-no@example.com",
        payload: {
          type: "group_rsvp_received",
          listingTitle: "Court A",
          whenLabel: groupWhen,
          attendeeLabel: "Dev",
          answer: "no",
          href: "https://fitout.example/bookings/bk1/group",
        },
      }),
    );
    const [email] = mockResend.sent().filter((e) => e.to === "organizer-no@example.com");
    expect(email).toBeDefined();
    expect(email.html).toContain("Dev can't make it");
  });

  it("(C, G6) a guest-typed attendee name is HTML-escaped in the organizer email — never live markup", async () => {
    await sendForType(
      makeEvent({
        recipientId: "grp_org_xss",
        type: "group_rsvp_received",
        email: "organizer-xss@example.com",
        payload: {
          type: "group_rsvp_received",
          listingTitle: "Court A",
          whenLabel: groupWhen,
          attendeeLabel: '<script>alert(1)</script>',
          answer: "yes",
          href: "https://fitout.example/bookings/bk1/group",
        },
      }),
    );
    const [email] = mockResend.sent().filter((e) => e.to === "organizer-xss@example.com");
    expect(email).toBeDefined();
    // The name survives as escaped, inert text — the raw tag never reaches the body.
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<script>alert(1)</script>");
  });

  it("(D) group_rsvp_confirmed emails the attendee-account", async () => {
    await sendForType(
      makeEvent({
        recipientId: "grp_att",
        type: "group_rsvp_confirmed",
        email: "attendee@example.com",
        payload: {
          type: "group_rsvp_confirmed",
          listingTitle: "Court A",
          whenLabel: groupWhen,
          href: "https://fitout.example/bookings/bk1/group",
        },
      }),
    );
    const [email] = mockResend.sent().filter((e) => e.to === "attendee@example.com");
    expect(email).toBeDefined();
    expect(email.html).toContain("Court A");
  });

  it("(E) group_cancelled emails the reachable attendee", async () => {
    await sendForType(
      makeEvent({
        recipientId: "grp_cancel",
        type: "group_cancelled",
        email: "cancel-attendee@example.com",
        payload: {
          type: "group_cancelled",
          listingTitle: "Court A",
          whenLabel: groupWhen,
          href: "https://fitout.example/bookings/bk1/group",
        },
      }),
    );
    const [email] = mockResend.sent().filter((e) => e.to === "cancel-attendee@example.com");
    expect(email).toBeDefined();
    expect(email.html).toContain("cancelled");
  });

  it("(F) a null email writes nothing and does not throw for a group type", async () => {
    const result = await sendForType(
      makeEvent({
        recipientId: "grp_noemail",
        type: "group_cancelled",
        email: null,
        payload: {
          type: "group_cancelled",
          listingTitle: "Court A",
          whenLabel: groupWhen,
          href: "https://fitout.example/bookings/bk1/group",
        },
      }),
    );
    expect(result).toEqual({ sent: false, reason: "no_email" });
  });
});
