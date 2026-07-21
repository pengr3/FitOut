// The notification service (MANAGE-03 · D-83/D-86/D-90/D-91) — the ONE place a notification is written,
// emitted, counted and listed, so the in-app channel and the email channel can never drift apart.
//
// THE SHAPE OF THE THING, in one paragraph. A server action finishes its durable write, commits, and then
// calls `emitNotify` — which does nothing but hand a `fitout/notify` event to Inngest and return. The
// Inngest `notify` function (src/inngest/functions/notify.ts) picks it up and runs TWO memoized steps: it
// writes the durable `notification` row FIRST, then sends the email SECOND. That ordering is a reliability
// choice, not an accident (D-91): a DB write is faster and far more reliable than an SMTP hop, so the row
// is the thing that always lands and the email is the best-effort amplifier. Reversed, a permanently
// failing email would leave no record at all.
//
// WHY THE EMITTER SWALLOWS. `emitNotify` catches and logs every transport error. MANAGE-03's requirement
// is literally that this layer "never blocks the booking transaction": the caller has ALREADY committed a
// money/state change, and a notification is an amplifier of that fact, never a precondition for it. An
// action that threw here would roll back — or worse, half-roll-back — a real booking because an email
// queue was briefly unreachable. The failure that matters is made observable instead (see below).
//
// Pure/isomorphic: no "use client"/"use server" directive, so Server Components, server actions and the
// Inngest functions can all import it. `dbConn` is injected on every queryable (the house convention —
// cf. read-model.ts, request-expiry.ts, bookings-query.ts) so an integration test binds an isolated schema.

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

import { inngest } from "@/inngest/client";
import type { DbConn } from "@/lib/availability/read-model";
import { isoUtc } from "@/lib/booking/bookings-query";
import { notification, type NotificationPayload } from "@/lib/db/schema";
import { notifyEventSchema, type NotificationTypeValue } from "@/lib/validation/notification";

/** The Inngest event name. One name, one function, one fan-out (D-91). */
export const NOTIFY_EVENT = "fitout/notify" as const;

/** Hard ceiling on `listRecent` — the D-92 dropdown is a bounded surface, not a history page. */
export const NOTIFICATIONS_MAX_LIMIT = 20;

/**
 * The `fitout/notify` payload, verbatim under `data`. The contract Plans 09, 10, 11, 13 and 14 consume.
 *
 * `email` is the recipient's address, resolved by the EMITTER (the action already has the user row
 * joined for its own owner gate, so this costs nothing there and saves a lookup in the function). It is
 * nullable: a recipient with no usable address still gets the durable in-app row.
 */
export type NotifyEvent = {
  type: NotificationTypeValue;
  recipientId: string;
  bookingId: string | null;
  email: string | null;
  payload: NotificationPayload;
};

/** A notification row as the D-92 dropdown reads it. Timestamps are hydrated at the query boundary. */
export type NotificationRow = {
  id: string;
  type: NotificationTypeValue;
  bookingId: string | null;
  payload: NotificationPayload;
  readAt: Date | null;
  createdAt: Date;
};

/** The raw driver row — see `isoUtc` / `RawBookingRow` in bookings-query.ts for why the ISO detour. */
type RawNotificationRow = Omit<NotificationRow, "readAt" | "createdAt"> & {
  readAtIso: string | null;
  createdAtIso: string;
};

/**
 * Write the durable in-app notification. THE SINGLE VALIDATED WRITE BOUNDARY: `notifyEventSchema.parse`
 * runs before anything touches the DB, so a payload that crossed the Inngest event hop (JSON over the
 * wire, `unknown` on arrival, whatever the emitter's types claimed) cannot land malformed. It THROWS on a
 * bad payload rather than storing a degraded row — inside the Inngest step that surfaces as a retry and
 * ultimately as the D-90 `needs_attention` audit row, which is exactly the visibility we want. A silently
 * half-written notification would be worse than none.
 *
 * D-86 — store DISPLAY STRINGS in the payload, never join at read time. A notification saying "Your
 * booking at Court A was cancelled" must not silently re-render if the listing is later retitled; D-86
 * explicitly wants durable history that survives the underlying booking changing state. This also makes
 * the dropdown a single indexed table scan with no joins.
 */
export async function insertNotification(
  dbConn: DbConn,
  event: NotifyEvent,
): Promise<{ id: string }> {
  const parsed = notifyEventSchema.parse(event);
  const id = randomUUID();
  await dbConn.insert(notification).values({
    id,
    recipientId: parsed.recipientId,
    type: parsed.type,
    bookingId: parsed.bookingId,
    payload: parsed.payload,
  });
  return { id };
}

/**
 * Hand the event to Inngest and return. Call this AFTER the durable write has committed.
 *
 * ⚠️ NEVER CALL THIS INSIDE A DATABASE TRANSACTION. `inngest.send` is an outbound HTTP call: inside a
 * transaction it pins a pooled connection open across a network hop, and — the real hazard — a subsequent
 * ROLLBACK would leave an event already sent for a booking that does not exist, producing an email about a
 * reservation the database has never heard of. Emit after commit, always. (This module deliberately
 * exposes no transaction API of its own, so the mistake has to be made somewhere visible.)
 *
 * KNOWN BOUNDED GAP (accepted for v1). If `inngest.send()` itself fails, no notification is produced and
 * `onFailure` never fires — the function never ran, so there is nothing to exhaust retries. This is the
 * SAME accepted bounded race as Phase-6 Assumption A6 (the in-tx-reclaim dropped email). The fully-robust
 * alternative is a transactional outbox (write an outbox row in the SAME transaction as the state change,
 * drain it from a cron), which is meaningful scope and is deliberately deferred. Two things bound the
 * damage: the `[notify]` error line below makes every occurrence visible in logs, and the D-85
 * reminder crons independently re-derive state from the DB, so the user-visible consequences of a dropped
 * "you must act" notification are largely caught on the next tick. Flagged as a known limitation — not
 * pretended closed.
 */
export async function emitNotify(event: NotifyEvent): Promise<void> {
  try {
    await inngest.send({ name: NOTIFY_EVENT, data: event });
  } catch (err) {
    // A notification-transport failure must NEVER fail a money/state action whose durable write already
    // succeeded (MANAGE-03) — the same discipline as request-expiry.ts's self-swallowing side-effect
    // helper. Log the TYPE and the booking id only: never the payload (user-controlled strings) and never
    // the recipient's email address.
    console.error("[notify] enqueue_failed", {
      type: event.type,
      bookingId: event.bookingId,
      err,
    });
  }
}

/**
 * The D-92 unread badge count. Hits `notification_unread_idx` — the PARTIAL index that covers unread rows
 * only — directly, so it stays cheap forever while read history grows without bound. This runs on EVERY
 * page render in both layouts.
 *
 * Do NOT add a denormalised counter on `user`; that is a second writer and a drift class for a query that
 * is already indexed for exactly this shape.
 *
 * Owner scoping is in the WHERE, never a post-filter (T-07-38): a foreign row must be UNCOUNTABLE, not
 * merely uncounted. `count(*)` is a bigint (which postgres.js hands back as a string), so it is cast to
 * `int` in SQL rather than coerced in JS.
 */
export async function countUnread(dbConn: DbConn, recipientId: string): Promise<number> {
  const [row] = (await dbConn.execute(sql`
    SELECT count(*)::int AS "unread"
    FROM notification
    WHERE recipient_id = ${recipientId} AND read_at IS NULL
  `)) as unknown as { unread: number }[];
  return row?.unread ?? 0;
}

/**
 * The D-92 dropdown list: newest first, owner-scoped in the WHERE, hard-capped at
 * `NOTIFICATIONS_MAX_LIMIT` so a crafted limit can never request an unbounded read. Serves
 * `notification_recipient_created_idx`.
 *
 * `created_at` / `read_at` are `timestamptz` read through `dbConn.execute`, which returns them as Postgres
 * TEXT rather than as Dates — the contract documented on `bookings-query.ts:RawBookingRow`. They are
 * therefore selected as strict ISO-8601 via the shared `isoUtc` mask and hydrated ONCE, here, at the
 * boundary. A `as unknown as` cast over a `Date`-typed projection would compile, lint and build cleanly
 * and then hand the renderer a string on the first real row.
 */
export async function listRecent(
  dbConn: DbConn,
  recipientId: string,
  limit: number,
): Promise<NotificationRow[]> {
  const capped = Math.min(
    Math.max(Number.isFinite(limit) ? Math.trunc(limit) : NOTIFICATIONS_MAX_LIMIT, 1),
    NOTIFICATIONS_MAX_LIMIT,
  );

  const rows = (await dbConn.execute(sql`
    SELECT
      n.id,
      n.type::text AS "type",
      n.booking_id AS "bookingId",
      n.payload,
      ${isoUtc("n.read_at")} AS "readAtIso",
      ${isoUtc("n.created_at")} AS "createdAtIso"
    FROM notification n
    WHERE n.recipient_id = ${recipientId}
    ORDER BY n.created_at DESC, n.id DESC
    LIMIT ${capped}
  `)) as unknown as RawNotificationRow[];

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    bookingId: r.bookingId,
    payload: r.payload,
    readAt: r.readAtIso === null ? null : new Date(r.readAtIso),
    createdAt: new Date(r.createdAtIso),
  }));
}
