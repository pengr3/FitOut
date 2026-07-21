// The dual-timer request-to-book expiry sweep (D-64, BOOK-05 / PAY-05) — the SECOND async-scheduled cron in
// the codebase, a near-clone of payout-sweep.ts. Hourly (timezone-aware), it drives the VISIBLE terminal
// flip + the booker email for two lapsed request-to-book holds:
//   - SLA auto-decline      : a `requested` hold past `expires_at` (minted now()+APPROVAL_SLA_HOURS) →
//                             `declined`; the slot frees automatically (declined leaves the occupying set)
//                             and the booker is emailed the "expired before the host responded" notice.
//   - payment-window release: an `approved` hold past `expires_at` (minted now()+APPROVAL_PAYMENT_WINDOW_HOURS)
//                             → `cancelled`; the slot frees, SILENTLY — NO email (D-66/Assumption A3: the
//                             booker chose not to pay in time).
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
// fires NO email: this cron is the SINGLE booker-email authority; the email dropped on the rare in-tx-reclaim
// edge is an accepted bounded race (Assumption A6, 06-RESEARCH).
//
// A read/send failure logs `[request-expiry] ...` and NEVER throws out of the step (T-06-17): the status flip
// is the durable side-effect (and the lazy reads free the slot regardless), so a Resend/read failure must
// never fail the sweep.

import { eq, sql } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import type { DbConn } from "@/lib/availability/read-model";
import { booking, listing, user } from "@/lib/db/schema";
import { sendRequestDeclined } from "@/lib/email";
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

/** The per-row outcome of a sweep (JSON-serializable across the Inngest step boundary). */
export type ExpireOneResult =
  | { status: "declined"; emailed: boolean } // requested → declined (+ booker email)
  | { status: "cancelled" } // approved → cancelled (silent, D-66/A3)
  | { status: "noop" }; // already terminal (a re-run flipped 0 rows) — never re-sends / re-flips

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
 *   - requested → declined (SLA auto-decline). ONLY on a genuine flip (≥1 row) does the booker get the
 *     "expired before the host responded" email — this cron is the SOLE booker-email authority (A6). The
 *     email pipeline (read + send) is fully guarded: a read/Resend failure logs `[request-expiry] ...` and
 *     is swallowed, so it NEVER throws out of the step (T-06-17). Freeing is automatic (declined is
 *     non-occupying); nothing is refunded (D-63).
 *   - approved → cancelled (payment-window auto-release). SILENT — NO email (D-66/A3: the booker chose not
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
    if (flipped.length === 0) return { status: "noop" }; // already terminal → never re-send / re-flip
    // Genuine flip → fire the booker email (this cron is the SOLE email authority, A6). The notice helper
    // swallows its own read/send errors so it never throws out of the step (T-06-17).
    const emailed = await sendDeclinedNotice(dbConn, row.id);
    return { status: "declined", emailed };
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
 * Load the booker email + listing title, compose the venue-local `whenLabel`, and fire the declined/expired
 * booker email. Self-contained + self-swallowing (T-06-17): the status flip already succeeded and freed the
 * slot, so a read or Resend failure must NEVER throw out of the step — it logs `[request-expiry] ...` and
 * returns `false`. Returns whether the send fired. The `whenLabel` is composed EXACTLY as the reserve page /
 * placeHold request branch / confirmed-email helper (`{date}, {time} ({City} time)`) so every booker-facing
 * time surface renders the SC#2 venue tz identically.
 */
async function sendDeclinedNotice(dbConn: DbConn, bookingId: string): Promise<boolean> {
  try {
    const [row] = await dbConn
      .select({
        email: user.email,
        title: listing.title,
        timezone: listing.timezone,
        city: listing.city,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        quotedTotalCents: booking.quotedTotalCents,
        hourlyRateCents: listing.hourlyRateCents,
      })
      .from(booking)
      .innerJoin(user, eq(booking.bookerId, user.id))
      .innerJoin(listing, eq(booking.listingId, listing.id))
      .where(eq(booking.id, bookingId));
    if (!row) return false;

    // The SHARED venue-local formatter (07-02) — this body was one of three verbatim duplicates before
    // Phase 7. "Full day" vs hourly is re-derived inside it from the FROZEN quote (fullDay is not
    // persisted). Do NOT reintroduce a local copy: every time surface renders the SC#2 venue tz from here.
    const whenLabel = composeWhenLabel({
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      timezone: row.timezone,
      city: row.city,
      quotedTotalCents: row.quotedTotalCents,
      hourlyRateCents: row.hourlyRateCents,
    });

    await sendRequestDeclined(row.email, row.title ?? "your space", whenLabel, { expired: true });
    return true;
  } catch (err) {
    // Fire-and-forget: the flip already freed the slot and is the durable side-effect. A read/send failure
    // must never fail the sweep step (T-06-17) — log for operators and move on.
    console.error("[request-expiry] declined_email_send_failed", { bookingId, err });
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
