// The dual-timer request-to-book expiry sweep (D-64, BOOK-05 / PAY-05) — the SECOND async-scheduled cron in
// the codebase, a near-clone of payout-sweep.ts. Hourly (timezone-aware), it drives the VISIBLE terminal
// flip + the booker notice for two lapsed request-to-book holds:
//   - SLA auto-decline      : a `requested` hold past `expires_at` (minted now()+APPROVAL_SLA_HOURS) →
//                             `declined`; the slot frees automatically (declined leaves the occupying set)
//                             and the booker is told "expired before the host responded".
//   - payment-window release: an `approved` hold past `expires_at` (minted now()+APPROVAL_PAYMENT_WINDOW_HOURS)
//                             → `cancelled`; the slot frees, SILENTLY — NO notice (D-66/Assumption A3: the
//                             booker chose not to pay in time).
//
// 07-10 / D-83: the booker notice is EMITTED as a `fitout/notify` event, not sent from here. See the
// rationale on `emitDeclinedNotice` — this cron could have called email.ts directly and saved a hop, and
// deliberately does not, so expiry is not the one lifecycle event without an in-app notification row (D-91).
//
// THE DB CLOCK now() IS THE SOLE EXPIRY AUTHORITY (T-06-16), never a JS/client clock — the sweep keys off
// SQL `expires_at <= now()`, exactly mirroring the Phase-4 lazy-expiry discipline and the payout-sweep due
// predicate. Every UPDATE is status-scoped + idempotent (`... AND status = 'requested'`), so a re-run over an
// already-terminal row flips 0 rows — the RETURNING is empty and the email never re-fires.
//
// FREEING vs FLIPPING (Research Pattern 3 — do BOTH): the 06-02 lazy read predicates ALREADY free a lapsed
// requested/approved slot INSTANTLY between sweep ticks (a lapsed hold reads as free because `expires_at >
// now()` fails). This cron is NOT the slot-freeing authority — the GiST EXCLUDE + the lazy reads are. The
// cron only drives the durable VISIBLE status flip + the email side-effect. Nothing is EVER refunded or
// voided on decline/expiry/release — the freed states (declined/cancelled) are simply non-occupying (D-63).
//
// TERMINAL-STATUS CONTRACT (shared with 06-02, Warning-1): this cron's mapping — requested→declined,
// approved→cancelled — is the CANONICAL terminal mapping. The 06-02 in-tx stale-hold sweep (units.ts) mirrors
// it via a `CASE WHEN status='requested' THEN 'declined' ELSE 'cancelled' END` for a same-tx reclaim, but
// notifies NOBODY: this cron is the SINGLE booker-notice authority for a lapse; the notice dropped on the
// rare in-tx-reclaim edge is an accepted bounded race (Assumption A6, 06-RESEARCH).
//
// A read/emit failure logs `[request-expiry] ...` and NEVER throws out of the step (T-06-17): the status flip
// is the durable side-effect (and the lazy reads free the slot regardless), so a notification failure must
// never fail the sweep.

import { eq, sql } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import type { DbConn } from "@/lib/availability/read-model";
import { booking, listing, user } from "@/lib/db/schema";
import { emitNotify } from "@/lib/notifications";
import { composeWhenLabel } from "@/lib/booking/when-label";

/** How many lapsed holds a single sweep pass claims (coarse hourly cadence — one pass drains the backlog). */
const EXPIRY_BATCH_SIZE = 100;

/** A `requested` or `approved` hold whose `expires_at` is at/past the DB clock now() — due to be swept. */
export type ExpiredBooking = {
  id: string;
  status: "requested" | "approved";
  listingId: string;
  bookerId: string;
};

/**
 * The per-row outcome of a sweep (JSON-serializable across the Inngest step boundary).
 *
 * 07-10 renamed `emailed` → `notified`: the booker notice is no longer an email SEND from this cron, it is
 * an EMISSION that fans out to the in-app row and the email (D-91). The field name follows the fact, so a
 * reader of a step result is not told a send happened when what happened was an enqueue.
 */
export type ExpireOneResult =
  | { status: "declined"; notified: boolean } // requested → declined (+ booker notification)
  | { status: "cancelled" } // approved → cancelled (silent, D-66/A3)
  | { status: "noop" }; // already terminal (a re-run flipped 0 rows) — never re-notifies / re-flips

/**
 * The DB-clock sweep query: `requested` and `approved` bookings past their `expires_at` (Postgres `now()`,
 * NOT a JS clock), oldest first, batch-bounded. Takes an explicit `dbConn` so a test can inject an
 * isolated-schema db (mirrors queryDuePayouts). `expires_at <= now()` is written per-branch so the predicate
 * reads identically for both statuses.
 */
export async function queryExpired(dbConn: DbConn): Promise<ExpiredBooking[]> {
  const rows = (await dbConn.execute(sql`
    SELECT id, status, listing_id AS "listingId", booker_id AS "bookerId"
    FROM booking
    WHERE (status = 'requested' AND expires_at <= now())
       OR (status = 'approved' AND expires_at <= now())
    ORDER BY expires_at ASC
    LIMIT ${EXPIRY_BATCH_SIZE}
  `)) as unknown as ExpiredBooking[];
  return rows;
}

/**
 * Expire a single lapsed hold, keyed off its status. The UPDATE is the durable side-effect and is
 * status-scoped so it is idempotent — a second pass over an already-terminal row flips 0 rows (empty
 * RETURNING) ⇒ `noop`, and the email can never re-fire.
 *
 *   - requested → declined (SLA auto-decline). ONLY on a genuine flip (≥1 row) is the booker notified —
 *     this cron is the SOLE booker-notice authority for a lapse (A6). The notice pipeline (read + emit) is
 *     fully guarded: a failure logs `[request-expiry] ...` and is swallowed, so it NEVER throws out of the
 *     step (T-06-17). Freeing is automatic (declined is non-occupying); nothing is refunded (D-63).
 *   - approved → cancelled (payment-window auto-release). SILENT — NO notice (D-66/A3: the booker chose not
 *     to pay in time). Freeing is automatic; nothing is refunded (D-63).
 *
 * Factored to take an explicit `dbConn` so a test can drive it against an isolated schema.
 */
export async function expireOne(dbConn: DbConn, row: ExpiredBooking): Promise<ExpireOneResult> {
  if (row.status === "requested") {
    // SLA auto-decline. `AND status = 'requested'` makes the flip idempotent — a re-run flips 0 rows.
    const flipped = (await dbConn.execute(sql`
      UPDATE booking SET status = 'declined', expires_at = NULL
      WHERE id = ${row.id} AND status = 'requested'
      RETURNING id
    `)) as unknown as { id: string }[];
    if (flipped.length === 0) return { status: "noop" }; // already terminal → never re-notify / re-flip
    // Genuine flip ONLY → notify the booker. The status-scoped UPDATE above IS the dedupe claim: a re-run,
    // a retried step, or an overlapping sweep all flip 0 rows and return before reaching this line, so the
    // booker can never be told twice (T-06-16). The notice helper swallows its own read/emit errors so it
    // never throws out of the step (T-06-17).
    const notified = await emitDeclinedNotice(dbConn, row.id);
    return { status: "declined", notified };
  }

  // approved → cancelled (payment-window auto-release). NO email (D-66/A3 — the booker chose not to pay).
  const flipped = (await dbConn.execute(sql`
    UPDATE booking SET status = 'cancelled', expires_at = NULL
    WHERE id = ${row.id} AND status = 'approved'
    RETURNING id
  `)) as unknown as { id: string }[];
  if (flipped.length === 0) return { status: "noop" }; // already terminal → never re-flip
  return { status: "cancelled" };
}

/**
 * Load the booker + listing, compose the venue-local `whenLabel`, and EMIT the declined/expired notice.
 *
 * ⚠️ D-91 PARITY — WHY THIS EMITS RATHER THAN CALLING email.ts DIRECTLY. This cron is ALREADY an Inngest
 * function, so calling the declined send from email.ts here would be strictly fewer hops and would keep the
 * send inside a step that already has retries. We emit the event anyway, because otherwise EXPIRY becomes the
 * one lifecycle event with no in-app notification row — exactly the channel drift D-91 exists to prevent,
 * and the kind of drift nobody notices until a booker asks why their notification list skips the thing that
 * actually happened to their booking. One event, two channels, no per-event judgement call to maintain.
 * The extra hop is the price of not having a special case.
 *
 * Self-contained + self-swallowing (T-06-17): the status flip already succeeded and freed the slot, so a
 * read or transport failure must NEVER throw out of the step — it logs `[request-expiry] ...` and returns
 * `false`. Returns whether the emission fired. (`emitNotify` swallows its own transport errors too, so this
 * catch is really guarding the READ; both layers are cheap and the invariant is worth stating twice.)
 */
async function emitDeclinedNotice(dbConn: DbConn, bookingId: string): Promise<boolean> {
  try {
    const [row] = await dbConn
      .select({
        bookerId: booking.bookerId,
        email: user.email,
        title: listing.title,
        timezone: listing.timezone,
        city: listing.city,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        quotedTotalCents: booking.quotedTotalCents,
        spacePriceCents: booking.spacePriceCents,
        // WR-06 pricing-mode snapshot + the formatter's pre-0016 positive-match reference (08-15).
        fullDay: booking.fullDay,
        dayRateCents: listing.dayRateCents,
        // D-93: written by approveRequest when the host tried to approve inside the minimum window. It is
        // the ONLY thing that distinguishes "the host never answered" from "the host tried, but the session
        // was already too close" — two genuinely different things to tell a booker.
        declineReason: booking.declineReason,
      })
      .from(booking)
      .innerJoin(user, eq(booking.bookerId, user.id))
      .innerJoin(listing, eq(booking.listingId, listing.id))
      .where(eq(booking.id, bookingId));
    if (!row) return false;

    // The SHARED venue-local formatter (07-02) — this body was one of three verbatim duplicates before
    // Phase 7. "Full day" vs an hour range comes from the booking's own PERSISTED `full_day` snapshot
    // (08-15 / CR-01), never from a price. Do NOT reintroduce a local copy: every time surface renders
    // the SC#2 venue tz from here.
    const whenLabel = composeWhenLabel({
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      timezone: row.timezone,
      city: row.city,
      fullDay: row.fullDay,
      // This sweep only ever retires `requested` rows, and only `placeOpenHold` mints an open row, so an
      // expired request is exclusive by construction — open capacity is instant-only (OC-10).
      openCapacity: false,
      spacePriceCents: row.spacePriceCents,
      quotedTotalCents: row.quotedTotalCents,
      dayRateCents: row.dayRateCents,
    });

    // D-93 honest reason. `expired` stays TRUE either way — the hold genuinely lapsed, and the two email
    // variants are "expired before the host responded" vs "the host couldn't take it", neither of which is
    // the too-close-to-start story. So the distinction rides on `reasonLabel`, which the durable in-app row
    // carries verbatim and the D-92 dropdown renders.
    //
    // C6 — the TONE is deliberate. A lapse costs a slot, never money (D-63: nothing was ever charged), so
    // this copy states the fact and stops. It must not manufacture urgency the system does not have.
    const tooClose = row.declineReason === "too_close_to_start";
    const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    await emitNotify({
      type: "request_declined",
      recipientId: row.bookerId,
      bookingId,
      email: row.email,
      payload: {
        type: "request_declined",
        listingTitle: row.title ?? "your space",
        whenLabel,
        expired: true,
        ...(tooClose
          ? { reasonLabel: "The session was too close to start for the host to confirm in time." }
          : {}),
        href: `${base}/bookings/${bookingId}`,
      },
    });
    return true;
  } catch (err) {
    // The flip already freed the slot and is the durable side-effect. A read/emit failure must never fail
    // the sweep step (T-06-17) — log for operators and move on.
    console.error("[request-expiry] declined_notice_emit_failed", { bookingId, err });
    return false;
  }
}

/**
 * The D-64 request-expiry sweep: an hourly, timezone-aware, SINGLETON (`concurrency: 1`) cron OFFSET to
 * minute 15 so it never contends with the two payout crons (payout-sweep at :00, payout-reconcile at :30 —
 * Pitfall 4). Each lapsed hold is expired inside its OWN Inngest step so a mid-batch failure retries just
 * that row, never the whole sweep.
 */
// NOTE: inngest 4.13.0 uses the 2-arg createFunction(options, handler) form — the cron trigger lives in
// options.triggers (the older 3-arg `(config, trigger, handler)` skeleton in RESEARCH predates this API).
export const requestExpirySweep = inngest.createFunction(
  {
    id: "request-expiry-sweep",
    concurrency: 1, // singleton — no overlapping sweeps
    triggers: [{ cron: "TZ=Asia/Manila 15 * * * *" }], // hourly, minute 15 (offset from the payout crons)
  },
  async ({ step }) => {
    const due = await step.run("find-expired", () => queryExpired(db));
    for (const r of due) {
      await step.run(`expire-${r.id}`, () => expireOne(db, r));
    }
    return { swept: due.length };
  },
);
