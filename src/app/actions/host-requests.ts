"use server";

// Host approve / decline server actions for request-to-book (HOST-01 · BOOK-05 · PAY-05 · D-64/D-66).
// The host side of the pay-on-approval fork: a `requested` hold is either APPROVED (→ `approved`, the
// booker gets a pay-now email + the full APPROVAL_PAYMENT_WINDOW_HOURS to pay via the SAME Phase-5
// checkout) or DECLINED (→ `declined`, the booker is emailed and the slot frees automatically).
//
// This clones the blocks.ts server-action skeleton (session → owner-gate → mutate → revalidate) but
// swaps the LISTING-ownership guard for a BOOKING⨝LISTING host-ownership guard, and reuses the atomic
// status-scoped UPDATE idiom from confirmBooking / the 06-06 expiry cron.
//
// SECURITY CONTRACT:
//   - SESSION: both actions require an authenticated session — a calm sign-in result otherwise.
//   - OWNERSHIP / IDOR (T-06-19 / Security V4): the request is loaded JOINED to its listing (+ the
//     listing host's canHost + the booker's email) and we verify `listing.hostId === session.user.id`
//     AND the host still has `canHost` BEFORE any UPDATE. The `(host)` route group is NOT the gate. A
//     MISSING row and a CROSS-HOST row return the SAME calm denial so a guessed/leaked request id
//     reveals nothing (missing vs not-mine are indistinguishable).
//   - SLA AUTHORITY (T-06-20): approve carries the DB-clock guard `AND expires_at > now()` inside the
//     atomic UPDATE — a host clicking approve one second past the SLA claims 0 rows and gets a calm
//     "no longer pending" (never a 500, never a silent approve). The DB clock — never a JS Date — is
//     the sole SLA authority; a race with the 06-06 expiry cron is fine (the `status='requested'`
//     guard means whichever write flips first wins atomically).
//   - REPLAY / DOUBLE-ACTION (T-06-21): every UPDATE is status-scoped (`AND status='requested'`), so a
//     second approve/decline over an already-actioned row is a 0-row no-op → calm "no longer pending".
//     The approve is additionally rate-limited + audited (WR-06, money-adjacent — mirrors confirmBooking).
//   - NOTIFICATION DoS (T-06-22 / T-07-57): the booker notice is EMITTED as a `fitout/notify` event, not
//     sent inline. 07-10 replaced the old `void`ed sendRequestApproved call with
//     `await emitNotify(...)` (D-83): Inngest owns retry, backoff and per-run observability, `emitNotify`
//     swallows its own transport errors, and the in-app notification row lands at parity (D-91). A Resend
//     or Inngest outage can never block or fail a state action whose durable write already committed.
//   - POST-ONLY: both are POST server actions invoked from a form/button, never a GET side-effect.
//
// Nothing is ever refunded or voided here (D-63): no money moved at request time, so approve just opens
// the payment window and decline just frees the (non-occupying-once-declined) slot.

import { eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing, user } from "@/lib/db/schema";
import { APPROVAL_PAYMENT_WINDOW_HOURS, MIN_APPROVE_WINDOW_HOURS } from "@/lib/payments/config";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { isoUtc } from "@/lib/booking/bookings-query";
import {
  composeDeadlineLabel,
  composeWhenLabel,
  type WhenLabelInput,
} from "@/lib/booking/when-label";
import { emitNotify } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

/** Approve/decline result — a discriminated union mirroring AvailabilityResult (blocks.ts). */
export type RequestActionResult = { ok: true } | { ok: false; error: string };

// WR-06: money-adjacent budget for the approve (opens the payment window) — mirrors confirmBooking (5/60s).
const APPROVE_RATE_LIMIT = { window: 60, max: 5 } as const;

/** The SAME calm denial for a missing request AND a cross-host request (IDOR — leak nothing, T-06-19). */
const DENIED: RequestActionResult = {
  ok: false,
  error: "We couldn't find that request, or it isn't yours to manage.",
};

/** Calm result for a 0-row approve/decline — already actioned or lapsed (never a 500, T-06-20/21). */
const NOT_PENDING: RequestActionResult = {
  ok: false,
  error: "This request is no longer pending.",
};

/** Resolve the signed-in user's id, or null if there is no session (cloned from blocks.ts). */
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

// Aliased user joins: the request row reaches BOTH the listing host (ownership + canHost re-check) and
// the booker (their notification email) in ONE read — two joins onto `user` need distinct aliases.
const hostUser = alias(user, "host_user");
const bookerUser = alias(user, "booker_user");

type OwnedRequest = NonNullable<Awaited<ReturnType<typeof loadOwnedRequest>>>;

/**
 * Owner-gated load (T-06-19 / Security V4). Loads the request JOINED to its listing + the listing host
 * + the booker in ONE read and returns it ONLY if `listing.hostId === userId` AND the host still holds
 * `canHost` — else null (a missing row and a cross-host row are indistinguishable to the caller). This
 * is the action-path IDOR gate; the read-path IDOR (the /host/requests inbox SELECT) is owner-scoped +
 * proven by a committed cross-host isolation test (06-07 Task 2).
 */
async function loadOwnedRequest(requestId: string, userId: string) {
  const [row] = await db
    .select({
      status: booking.status,
      listingId: booking.listingId,
      // The notification RECIPIENT (D-83/T-07-56). Read from the row this action has ALREADY owner-gated
      // and joined — never a second lookup, and never anything the caller supplied.
      bookerId: booking.bookerId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      quotedTotalCents: booking.quotedTotalCents,
      spacePriceCents: booking.spacePriceCents,
      // The WR-06 pricing-mode snapshot — the AUTHORITY the shared formatter renders "Full day" vs an
      // hour range from (08-15 / CR-01). Never re-derived from a price.
      fullDay: booking.fullDay,
      currency: booking.currency,
      hostId: listing.hostId,
      hostCanHost: hostUser.canHost,
      title: listing.title,
      timezone: listing.timezone,
      city: listing.city,
      // The formatter's pre-0016 positive-match reference only.
      dayRateCents: listing.dayRateCents,
      bookerEmail: bookerUser.email,
    })
    .from(booking)
    .innerJoin(listing, eq(booking.listingId, listing.id))
    .innerJoin(hostUser, eq(listing.hostId, hostUser.id))
    .innerJoin(bookerUser, eq(booking.bookerId, bookerUser.id))
    .where(eq(booking.id, requestId));
  // Re-check ownership + capability server-side (the route group is NOT the gate). A cross-host id and a
  // missing id both fall through to null → the SAME calm denial (leak nothing).
  if (!row || row.hostId !== userId || !row.hostCanHost) return null;
  return row;
}

/**
 * Project an owned request row onto the structural WhenLabelInput. The label itself is composed by the
 * SHARED formatter (src/lib/booking/when-label.ts) — the body that used to live here was one of three
 * verbatim duplicates and was extracted in 07-02 so every booker-facing time surface renders the SC#2
 * venue tz identically and can never drift. Do NOT reintroduce a local formatter here.
 */
const whenLabelInput = (row: OwnedRequest): WhenLabelInput => ({
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  timezone: row.timezone,
  city: row.city,
  fullDay: row.fullDay,
  spacePriceCents: row.spacePriceCents,
  quotedTotalCents: row.quotedTotalCents,
  dayRateCents: row.dayRateCents,
});

/**
 * approveRequest — the host approves a pending request (HOST-01 / PAY-05, D-64/D-66). Owner-gated, then
 * an ATOMIC, DB-clock-SLA-guarded flip `requested → approved` that ALSO sets the payment-window expiry to
 * LEAST(now()+APPROVAL_PAYMENT_WINDOW_HOURS, starts_at) — the booker gets the full window to pay, but
 * never past the moment the session begins (D-94; the approved hold occupies the slot until it lapses).
 * An approve with less than MIN_APPROVE_WINDOW_HOURS left before start is refused by the same WHERE (D-93).
 * The `AND status='requested' AND expires_at > now()` guard means a lapsed approve claims 0 rows → calm
 * "no longer pending" (never a 500, never a silent approve of a row the 06-06 SLA cron already declined).
 * On a genuine flip the booker is emailed a pay-now link to the SAME Phase-5 /book checkout (D-63 reuse).
 * Rate-limited + audited (WR-06). No money moves here (D-63) — nothing is ever refunded/voided.
 */
export async function approveRequest(requestId: string): Promise<RequestActionResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sign in to manage your requests." };
  }

  // Owner-gate BEFORE any UPDATE (T-06-19 / Security V4). Missing vs cross-host → the SAME calm denial.
  const row = await loadOwnedRequest(requestId, userId);
  if (!row) return DENIED;

  // WR-06: bound the money-adjacent approve per identity; audit the denial (non-repudiable). Mirrors
  // confirmBooking (session → owner-gate → rateLimit → recordAudit on denial → calm result).
  const limit = rateLimit(`approve-request:${userId}`, APPROVE_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: userId,
      action: "approve_request",
      outcome: "denied",
      meta: { reason: "rate_limit", requestId, retryAfter: limit.retryAfter },
    });
    return { ok: false, error: "You're going a little fast. Please try again in a moment." };
  }

  // ATOMIC SLA-guarded flip (T-06-20/21). The DB clock now() is the sole SLA authority (never a JS Date):
  // `AND status='requested'` makes it idempotent (a 2nd approve is a 0-row no-op) and `AND expires_at >
  // now()` refuses a lapsed approve. The payment window opens to APPROVAL_PAYMENT_WINDOW_HOURS so the
  // approved hold keeps occupying the slot until that window lapses.
  //
  // D-94: the LEAST(...) is the CAP that closes the "a 2pm approval of a 5pm session stayed payable until
  // 2pm the next day" bug — no hold may outlive its own session. In `UPDATE … SET`, an unqualified
  // `starts_at` on the right-hand side reads the ROW'S CURRENT VALUE; correct and safe here.
  //
  // D-93's minimum-approve-window guard lives in the SAME WHERE, so a too-late approve claims 0 rows and
  // falls through to the EXISTING calm NOT_PENDING path — no new error branch, no new test surface. The
  // 0-row path is already tested. Being in the WHERE also makes it atomic with the status check, so it
  // cannot be raced (T-07-24).
  //
  // ⚠️ D-57 — THIS GUARD BELONGS HERE AND *NOWHERE NEAR* THE PAYMENT WEBHOOK. Do NOT "complete the
  // pattern" by adding `AND starts_at > now()` to src/app/api/paymongo/webhook/route.ts. That handler
  // confirms on `status = 'pending'` ALONE, deliberately, because PAYMENT IS THE CONFIRM AUTHORITY. A
  // start-time condition there resurrects exactly the failure 05-04 was built to prevent: the booker's
  // money is taken and the booking cannot confirm. A payment that lands post-start is already covered by
  // the existing handleGoneSlot auto-refund backstop (D-58). See 07-RESEARCH Pitfall 4 — and the
  // dedicated "D-57 GUARD" test in tests/paymongo/webhook-payment-paid.test.ts.
  const flipped = (await db.execute(sql`
    UPDATE booking
    SET status = 'approved',
        expires_at = LEAST(
          now() + make_interval(hours => ${APPROVAL_PAYMENT_WINDOW_HOURS}::int),
          starts_at
        )
    WHERE id = ${requestId}
      AND status = 'requested'
      AND expires_at > now()
      AND starts_at > now() + make_interval(hours => ${MIN_APPROVE_WINDOW_HOURS}::int)
    RETURNING id, ${isoUtc("expires_at")} AS "expiresAtIso"
  `)) as unknown as { id: string; expiresAtIso: string | null }[];

  if (flipped.length === 0) {
    // D-93: when the 0 rows are due to the request being TOO CLOSE TO START (rather than already actioned
    // or SLA-lapsed), record WHY on the row so the expiry cron's email/notification composer can give both
    // sides the honest "too close to start" message instead of a generic SLA lapse. Status-scoped, mirror
    // of the guard above, and non-throwing — it can never touch a healthy row, and a failure to annotate
    // must never turn a calm denial into a 500.
    try {
      await db.execute(sql`
        UPDATE booking
        SET decline_reason = 'too_close_to_start'
        WHERE id = ${requestId}
          AND status = 'requested'
          AND starts_at <= now() + make_interval(hours => ${MIN_APPROVE_WINDOW_HOURS}::int)`);
    } catch {
      // Annotation is best-effort telemetry, never part of the guard's correctness.
    }

    // Already actioned (approved/declined), lapsed (the 06-06 cron won the race), or too close to start —
    // all fall through to the SAME calm result. Never a 500, never a new error branch.
    await recordAudit({
      actorId: userId,
      action: "approve_request",
      outcome: "denied",
      meta: { reason: "not_pending", requestId },
    });
    return NOT_PENDING;
  }

  await recordAudit({ actorId: userId, action: "approve_request", outcome: "ok", meta: { requestId } });

  // D-83 — the send moves BEHIND Inngest. This emits an EVENT and returns; the `fitout/notify` function
  // performs the send with automatic retry, backoff and per-run observability, AND writes the durable in-app
  // notification row at parity (D-91). `emitNotify` swallows its own transport errors: a notification
  // failure must NEVER fail a money/state action whose durable write already succeeded (MANAGE-03).
  //
  // PLACEMENT IS LOAD-BEARING — after the flip has committed and after `recordAudit`, and NEVER inside a
  // `db.transaction`: `inngest.send` is an outbound HTTP call, so inside a transaction it would pin a
  // pooled connection across a network hop and — the real hazard — a rollback would leave an event already
  // sent for a booking that does not exist. This action opens no transaction; keep it that way.
  //
  // The pay link routes to the SAME Phase-5 checkout the /book page now treats an `approved` hold as active
  // for (06-04). The total is the SERVER-FROZEN quote (D-49), never a recompute. The `href` is ABSOLUTE
  // because this one string feeds both channels (D-91) and a root-relative href renders as a dead link in
  // an email client — the in-app dropdown handles an absolute same-origin URL fine, the reverse is not true.
  const whenLabel = composeWhenLabel(whenLabelInput(row));
  const totalLabel = formatMoney(row.quotedTotalCents ?? 0, row.currency ?? DISPLAY_CURRENCY);
  const title = row.title ?? "your space";
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  // The REAL deadline, read back off the row the UPDATE just wrote — not `now() + APPROVAL_PAYMENT_WINDOW`.
  // D-94's LEAST(...) cap means those two differ on every short-notice approve, and telling a booker they
  // have 12 hours when the window actually closes when the session starts is the exact failure D-99 names.
  // `expires_at` is a timestamptz read through `db.execute`, which returns Postgres TEXT — hence the shared
  // `isoUtc` mask in the RETURNING above and the single hydration here (the 07-06 boundary contract).
  const payByIso = flipped[0]?.expiresAtIso ?? null;
  const payByLabel = composeDeadlineLabel(
    payByIso === null ? row.startsAt : new Date(payByIso),
    row.timezone,
    row.city,
  );
  await emitNotify({
    type: "request_approved",
    recipientId: row.bookerId,
    bookingId: requestId,
    email: row.bookerEmail,
    payload: {
      type: "request_approved",
      listingTitle: title,
      whenLabel,
      totalLabel,
      payByLabel,
      href: `${base}/listings/${row.listingId}/book?hold=${requestId}`,
    },
  });

  // D-65 freshness (no websockets/polling): the flip changes the host inbox + dashboard state immediately.
  revalidatePath("/host/requests");
  revalidatePath("/host");
  return { ok: true };
}

/**
 * declineRequest — the host declines a pending request (HOST-01 / BOOK-05, D-66). Owner-gated, then an
 * ATOMIC status-scoped flip `requested → declined` (expires_at = NULL). Freeing the slot is AUTOMATIC —
 * `declined` leaves the occupying set, so the 06-01 EXCLUDE + the 06-02 lazy reads free it with no manual
 * slot manipulation. On a genuine flip the booker is emailed fire-and-forget. A 0-row flip (already
 * actioned/lapsed) is a calm "no longer pending". Nothing is ever refunded (no money moved, D-63).
 */
export async function declineRequest(requestId: string): Promise<RequestActionResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sign in to manage your requests." };
  }

  const row = await loadOwnedRequest(requestId, userId);
  if (!row) return DENIED;

  // ATOMIC status-scoped flip (T-06-21). `AND status='requested'` makes it idempotent (a 2nd decline is a
  // 0-row no-op) and never touches an approved/confirmed/other row. No expires_at guard: a host may decline
  // right up to the SLA edge; a race with the 06-06 cron is fine (whoever flips first wins atomically).
  const flipped = (await db.execute(sql`
    UPDATE booking SET status = 'declined', expires_at = NULL
    WHERE id = ${requestId} AND status = 'requested'
    RETURNING id
  `)) as unknown as { id: string }[];

  if (flipped.length === 0) return NOT_PENDING; // already actioned/lapsed — calm, never a 500

  // D-83 — emitted post-commit, exactly as in `approveRequest` above (see the rationale there; it is not
  // repeated). `expired: false` picks the "the host couldn't take it" copy variant rather than the SLA-lapse
  // one — a HOST decline and a lapsed request are two different sentences, which is why the payload carries
  // the variant as a boolean rather than a label. Freeing the slot is automatic (declined is non-occupying —
  // 06-01 EXCLUDE + 06-02 lazy reads); nothing is refunded/voided (D-63).
  const whenLabel = composeWhenLabel(whenLabelInput(row));
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  await emitNotify({
    type: "request_declined",
    recipientId: row.bookerId,
    bookingId: requestId,
    email: row.bookerEmail,
    payload: {
      type: "request_declined",
      listingTitle: row.title ?? "your space",
      whenLabel,
      expired: false,
      href: `${base}/bookings/${requestId}`,
    },
  });

  // D-65 freshness: the decline clears the request from the host inbox + dashboard immediately.
  revalidatePath("/host/requests");
  revalidatePath("/host");
  return { ok: true };
}
