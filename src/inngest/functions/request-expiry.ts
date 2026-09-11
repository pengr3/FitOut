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
//
// ── 13.1-05 / D-113: THE FLIP NOW HAS A SECOND SIDE-EFFECT, AND T-06-17'S RULE COVERS BOTH ──────────────
// A genuine flip also RETIRES the checkout session it orphans (`retireOrphanedSession`, below). The
// `approved → cancelled` payment-window release is the sharpest lapse path in the codebase: an `approved`
// row is by definition one whose booker went to checkout, so releasing it used to leave a live, payable
// PayMongo session pointing at a slot anybody could now take. The notice and the retire are INDEPENDENT —
// neither is inside the other, and each is asserted to survive the other failing — which is T-06-17's
// existing guarantee applied to two side-effects instead of one.
//
// ⚠ THIS IS AN ACCELERANT, NOT THE GUARANTEE. `checkout-retire-sweep` (13.1-04) already retires EVERY
// lapsed hold's session within RETIRE_INTERVAL_MINUTES, including the majority this cron never selects.
// Delete every line 13.1-05 added here and D-113 still holds; nothing here may be made load-bearing for it.

import { eq, sql } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { absolutePublicUrl } from "@/lib/app-origins";
import { db } from "@/lib/db";
import type { DbConn } from "@/lib/availability/read-model";
import { booking, listing, user } from "@/lib/db/schema";
import { emitNotify } from "@/lib/notifications";
import { composeWhenLabel } from "@/lib/booking/when-label";
// D-113 (13.1-05) — THE POLICY, never the provider. This file must never import `expireCheckoutSession`
// directly: probe-first, the never-expire-a-`paid`-session evidence rule, the never-throw contract and the
// `checkout_expire_failed` audit shape all live in ONE place (13.1-04), and a second implementation here
// would be a second policy nobody would notice diverging.
import { retireCheckoutsForBookings } from "@/lib/payments/retire-checkout";

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
      RETURNING id, checkout_session_id
    `)) as unknown as { id: string; checkout_session_id: string | null }[];
    if (flipped.length === 0) return { status: "noop" }; // already terminal → never re-notify / re-flip
    // Genuine flip ONLY → notify the booker. The status-scoped UPDATE above IS the dedupe claim: a re-run,
    // a retried step, or an overlapping sweep all flip 0 rows and return before reaching this line, so the
    // booker can never be told twice (T-06-16). The notice helper swallows its own read/emit errors so it
    // never throws out of the step (T-06-17).
    const notified = await emitDeclinedNotice(dbConn, row.id);
    // D-113, ALONGSIDE the notice and never inside it — see `retireOrphanedSession` for why the ORDER of
    // these two side-effects cannot matter and is asserted in both directions.
    //
    // ⚠ WHY THIS CALL IS WRITTEN ON A BRANCH WHERE IT IS A PROVABLE NO-OP. A `requested` row can never
    // carry a `checkout_session_id`: `src/app/actions/booking.ts:840` claims the checkout lease under
    // `AND status IN ('pending','approved')`, so nothing can attach a session to a row that is still
    // awaiting the host. So this retires nothing today — asserted, not assumed, by the SLA case in
    // `tests/booking/request-expiry-retires-session.test.ts`, which pins the argument at `null`. It is
    // written anyway so that the day request-to-book grows a pre-approval payment, this path is ALREADY
    // closed rather than being a hole somebody has to rediscover by finding money in it.
    await retireOrphanedSession(row.id, flipped[0].checkout_session_id, "declined");
    return { status: "declined", notified };
  }

  // approved → cancelled (payment-window auto-release). NO email (D-66/A3 — the booker chose not to pay).
  const flipped = (await dbConn.execute(sql`
    UPDATE booking SET status = 'cancelled', expires_at = NULL
    WHERE id = ${row.id} AND status = 'approved'
    RETURNING id, checkout_session_id
  `)) as unknown as { id: string; checkout_session_id: string | null }[];
  if (flipped.length === 0) return { status: "noop" }; // already terminal → never re-flip
  // D-113 — THE SHARPEST OF THE THREE LAPSE PATHS. An `approved` row is BY DEFINITION one whose booker was
  // sent to checkout, so this branch is the one that routinely orphans a LIVE, PAYABLE session: the slot is
  // released for anyone to take while the previous booker's tab can still charge them for it.
  await retireOrphanedSession(row.id, flipped[0].checkout_session_id, "cancelled");
  return { status: "cancelled" };
}

/**
 * Retire the checkout session a genuine flip just orphaned (13.1-CONTEXT D-113).
 *
 * ⚠ THE SESSION ID COMES FROM THE FLIP'S OWN `RETURNING`, NEVER FROM `row`. This is the one design choice
 * in this file worth reading twice, and it is not a stylistic preference:
 *
 *   `queryExpired` runs in ITS OWN Inngest step, and each `expireOne` runs in another. Between the two, a
 *   booker can start checkout — `src/app/actions/booking.ts:840` claims the lease under `status IN
 *   ('pending','approved')`, and an `approved` row's payment window is HOURS wide. So a session id read at
 *   selection time can be stale-NULL precisely on the sharpest path, and a retire keyed off it would leave
 *   the live session payable while looking perfectly correct. The RETURNING value is read in the SAME
 *   statement that frees the slot, so it is the session as of the moment it was orphaned.
 *   (The 13.1-05 plan's alternative — carrying `checkoutSessionId` on `ExpiredBooking` — was measured and
 *   rejected: see this file's counterpart spec header for the tsc output and the case that pins the drift.)
 *
 * ⚠ ITS OWN `catch`, for the same reason `emitDeclinedNotice` has one (T-06-17): the flip is the durable
 * side-effect and it has already happened. `retireCheckoutsForBookings` cannot throw (13.1-04 Task 1), so
 * this is unreachable today; it is here so that if the policy is ever "hardened" into throwing, a PayMongo
 * outage costs a log line rather than failing every step in the sweep — and the two side-effects on the
 * declined branch stay independent, which is asserted in BOTH directions rather than assumed symmetric.
 * FREEING THE SLOT MUST NEVER DEPEND ON THE PROVIDER ANSWERING (D-113, verbatim).
 *
 * A FAILED retire is not swallowed in the sense that matters: the POLICY writes the operator-visible
 * `checkout_expire_failed` / `needs_attention` audit row (D-110). This file adds no alerting of its own.
 */
async function retireOrphanedSession(
  bookingId: string,
  checkoutSessionId: string | null,
  terminalStatus: "declined" | "cancelled",
): Promise<void> {
  try {
    await retireCheckoutsForBookings(
      // `bookingStatus` is the NEW terminal status, never the pre-flip one: 13.1-04's policy stays silent
      // about a `paid` session only while the row is still `pending` (plan 13.1-02's reconciler owns that
      // row). A row this sweep has just flipped terminal is the case NO reconciler reaches, and is exactly
      // the one that must land in the operator's queue.
      [{ bookingId, checkoutSessionId, bookingStatus: terminalStatus }],
      "request-expiry",
    );
  } catch {
    // Empty binding on purpose — the caught value may be PayMongo's prose and the discard discipline is
    // absolute (T-05-15 / T-08-44). The message names the broken contract rather than hiding it.
    console.error("[request-expiry] retire policy THREW — its never-throw contract is broken", {
      bookingId,
    });
  }
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
        href: absolutePublicUrl(`/bookings/${bookingId}`),
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
