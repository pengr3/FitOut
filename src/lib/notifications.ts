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
import { absolutePublicUrl } from "@/lib/app-origins";
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

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// OPS-05 — THE SIX SENTENCES FITOUT SAYS TO A HOST ABOUT THEIR OWN STANDING (D-245 / D-243 / D-250)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE COPY LIVES HERE, IN ONE PLACE, AND BOTH CHANNELS READ IT OFF THE PAYLOAD. Every other kind in
// this system stores DATA (a title, a time label) and lets the panel and the email each compose their
// own sentence from it. These six store the SENTENCES, composed once, right here — and the reason is
// specific to what they say rather than a general preference:
//
//   · D-91 SUFFICIENCY, taken literally. What a host is told about why FitOut blocked their income
//     must be the SAME words in the panel and in their inbox. Two hand-maintained texts that look
//     synchronised is precisely the drift D-91 exists to prevent, and it is far more damaging in a
//     rejection than in a reminder.
//   · D-86 DURABILITY. The host has READ this. If a later re-wording silently re-rendered the durable
//     row, the record of what they were told would be retroactively false — the argument
//     `src/lib/validation/ops.ts` makes about the taxonomy sentence, applied to the sentences around it.
//
// ⚠ D-243 / BACKLOG 999.6 — NOTHING BELOW PROMISES A WAY BACK. Host appeals are OUT. Say what
// happened, say why, and stop. Specifically absent, and asserted absent by
// `tests/notifications/ops-decision-notify.test.ts`: any offer to appeal, any promise of a reply, any
// invitation to write back, any timeline ("within N days"). A rejected LISTING does have a real
// self-serve route back (a material edit — D-249), and a suspended HOST does not; the copy below does
// not blur the two by promising the listing route on a host surface.
//
// ⚠ D-250 — `SUPPORT_EMAIL` IS NULL (`src/lib/site.ts:70`) AND EVERY SENTENCE BELOW IS COMPLETE AND
// HONEST WITHOUT IT. There is no trailing "email us at…" clause that would render half the time, no
// fabricated address, and no placeholder. `tests/design/site-contacts.test.ts` asserts ZERO support
// affordances anywhere under `src/` while the constant is null, and it is UNMODIFIED by this plan. If
// an address ever exists, the affordance goes in behind `src/components/booking/support-path.tsx`'s
// guard shape — the whole control inside a `SUPPORT_EMAIL !== null` conditional, literals authored
// INSIDE it — never as a sentence spliced into the strings below.
//
// The operator's stored sentence (`composeReason`'s output) rides as `reasonText`, ON ITS OWN, so it
// is rendered VERBATIM exactly once in the body and never paraphrased into a heading. Nothing here
// touches it: no trimming of its interior, no escaping, no re-casing. Escaping happens at render — JSX
// escapes text children by construction, and the email shell escapes at its one choke point.

/**
 * App base URL for a notification `href`.
 *
 * ⚠ EVERY `href` IN A NOTIFICATION PAYLOAD MUST BE ABSOLUTE. One payload string feeds BOTH channels,
 * and an email client has no origin to resolve `/host/listings` against — a relative href is a silent
 * dead link in the half of the delivery the recipient is most likely to be reading. This regressed
 * once already (found by 07-10) and is asserted against in tests/booking/cancellation.test.ts.
 *
 * The shared public-origin helper keeps these two-channel destinations aligned with the exact configured
 * production or Preview authority.
 */
/** Where a host goes to see their listings — the destination of every listing-review decision. */
const HOST_LISTINGS_PATH = "/host/listings";
/** The host's own home — the destination of every decision about their ACCOUNT. */
const HOST_HOME_PATH = "/host";

/**
 * 18-UI-SPEC § Telling the host, row 1. An approval is the one message in the set that is simply good
 * news, so it says so and stops.
 */
export function listingApprovedPayload(listingTitle: string): NotificationPayload {
  return {
    type: "listing_review_approved",
    heading: `${listingTitle} is live`,
    lead: "Your listing passed FitOut's check and can now be booked.",
    ctaLabel: "View your listings",
    href: absolutePublicUrl(HOST_LISTINGS_PATH),
  };
}

/**
 * 18-UI-SPEC § Telling the host, row 3. The operator's sentence sits BETWEEN the fact and the
 * consequence, which is the order a person reads it in: what happened, why, what it means.
 *
 * ⚠ NO WAY OUT IS OFFERED HERE. D-232 flips `approved` or `grandfathered` → `pending` on a material
 * edit; it says nothing about `rejected`, so "edit it and it comes back" is a route this product does
 * not yet have. 18-UI-SPEC flags the gap explicitly and this plan resolves it the honest way: the copy
 * states the consequence and makes no promise. Offering the route before D-232 covers it would be the
 * same defect as an appeal promise — a surface that says a door exists when it does not.
 */
export function listingRejectedPayload(
  listingTitle: string,
  reasonText: string,
): NotificationPayload {
  return {
    type: "listing_review_rejected",
    heading: `${listingTitle} wasn't approved`,
    lead: "FitOut checked this listing and didn't approve it.",
    reasonText,
    tail: "It won't take bookings.",
    ctaLabel: "View your listings",
    href: absolutePublicUrl(HOST_LISTINGS_PATH),
  };
}

/**
 * 18-UI-SPEC § Telling the host, row 2. States the SECOND gate plainly — an approved host still needs
 * each listing approved (D-224) — because a host told only "you're approved" and then finding nothing
 * bookable would reasonably conclude something is broken.
 *
 * ⚠ NAMES NO DOCUMENT AND NO INSPECTION. "FitOut has checked your account" is the whole claim
 * HVER-02 supports: no ID, no passport, no licence, and nobody visited anything (Success Criterion 6).
 *
 * ⚠ AND IT NAMES NO PERSON EITHER — CHANGED IN PLAN 18.1-10, deferred item D3, ONE CLAUSE.
 * The lead read "Someone at FitOut checked your account" from phase 18, when the only way to reach
 * `approved` was an operator pressing a button in `/ops`, and it was exactly true. D-261 makes a PASS
 * from the checking partner auto-approve the host with no operator involved at all, so from plan
 * 18.1-08 onward the same words went to hosts about whom the literal claim was FALSE: nobody at
 * FitOut looked at anything. The institutional voice is true of BOTH writers, and it is not a new
 * voice — `hostRejectedPayload` immediately below has always said "FitOut checked your account", so
 * this makes the pair agree rather than inventing a register.
 *
 * ⚠ IT IS ALSO NOW THE PANEL'S OWN FIRST CLAUSE. `VERIFICATION_SIGNAL.approved.reason` in
 * `src/lib/host/verification-signal.ts` opens with these same words, which is D-245's property made
 * literal: what a host is told about their own standing is the same in the panel and in their inbox.
 * If one of the two changes, the other changes in the same commit.
 */
export function hostApprovedPayload(): NotificationPayload {
  return {
    type: "host_verification_approved",
    heading: "You're approved to host on FitOut",
    lead: "FitOut has checked your account. Your listings can go live once each one is approved.",
    ctaLabel: "Go to your hosting page",
    href: absolutePublicUrl(HOST_HOME_PATH),
  };
}

/** 18-UI-SPEC § Telling the host, row 4. Same structure as the listing rejection, host-scoped. */
export function hostRejectedPayload(reasonText: string): NotificationPayload {
  return {
    type: "host_verification_rejected",
    heading: "We couldn't approve your host account",
    lead: "FitOut checked your account and didn't approve it.",
    reasonText,
    tail: "Your listings can't take bookings.",
    ctaLabel: "Go to your hosting page",
    href: absolutePublicUrl(HOST_HOME_PATH),
  };
}

/**
 * 18-UI-SPEC § Telling the host, row 5 — and the sharpest message in the product.
 *
 * NO LEAD: this body OPENS with the operator's own sentence. The reason is the first thing a suspended
 * host needs and the only thing that makes the message anything other than a wall, so nothing is put
 * in front of it. The consequence follows, stated in full — BOTH halves, because a host who reads
 * "can't be booked" and is not told about the payout freeze (D-233, plan 18-07) will discover it as an
 * unexplained missing payment, which is the worse way to learn it.
 *
 * ⚠ AND IT ENDS THERE. No appeal, no reply, no timeline, no address (D-243 / D-250).
 */
export function hostSuspendedPayload(reasonText: string): NotificationPayload {
  return {
    type: "host_suspended",
    heading: "FitOut has paused your hosting",
    reasonText,
    tail: "Your spaces can't be booked, and payouts are on hold.",
    ctaLabel: "Go to your hosting page",
    href: absolutePublicUrl(HOST_HOME_PATH),
  };
}

/**
 * ENF-03's copy — the ops cancellation, one type and two audiences (WR-04's idiom on a new type).
 *
 * ⚠ THIS EXISTS BECAUSE `booking_cancelled_by_host` IS FALSE ON THIS PATH, IN BOTH DIRECTIONS.
 * 18-08 shipped `cancelBookingAsOps` deliberately silent rather than send it: its booker copy tells a
 * defrauded person that their HOST cancelled on them — the opposite of what happened, and the sentence
 * they would repeat to anyone who asked what FitOut did — and its host copy quotes a cancellation fee
 * that D-235 suppresses on this path. `tests/payments/ops-cancel.test.ts` keeps that type off this path.
 *
 * THE BOOKER is told FitOut cancelled it and what is coming back. `refundLabel` is OMITTED when
 * nothing is being returned rather than rendered as a zero — CR-01's rule: a money event that did not
 * happen must not be announced as though it had.
 *
 * THE HOST is told the booking is cancelled and — explicitly — that NO cancellation fee is charged.
 * D-235 made visible: the fee block is silently skipped on this path, so without this sentence a host
 * would have no way to know it had been, and would reasonably assume the usual fee applied to a
 * cancellation they did not make.
 */
export function opsCancelPayload(args: {
  side: "booker" | "host";
  listingTitle: string;
  whenLabel: string;
  refundLabel: string | null;
}): NotificationPayload {
  const { side, listingTitle, whenLabel, refundLabel } = args;
  if (side === "booker") {
    return {
      type: "booking_cancelled_by_ops",
      heading: "FitOut cancelled this booking",
      lead:
        `FitOut cancelled your booking at ${listingTitle} on ${whenLabel}.` +
        (refundLabel === null
          ? ""
          : ` You're getting ${refundLabel} back, to the way you paid.`),
      side,
      ctaLabel: "View your bookings",
      href: absolutePublicUrl("/bookings"),
    };
  }
  return {
    type: "booking_cancelled_by_ops",
    heading: "FitOut cancelled a booking at your space",
    lead:
      `The booking at ${listingTitle} on ${whenLabel} is cancelled and the guest is being refunded. ` +
      "You're not charged a cancellation fee for this.",
    side,
    ctaLabel: "View your bookings",
    href: absolutePublicUrl("/host/bookings"),
  };
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
