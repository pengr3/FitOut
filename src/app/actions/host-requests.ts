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
//   - EMAIL DoS (T-06-22): sendRequestApproved / sendRequestDeclined are fire-and-forget (`void`) — a
//     Resend failure can never block or fail the action.
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
import { APPROVAL_PAYMENT_WINDOW_HOURS } from "@/lib/payments/config";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { sendRequestApproved, sendRequestDeclined } from "@/lib/email";
import { composeWhenLabel, type WhenLabelInput } from "@/lib/booking/when-label";
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
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      quotedTotalCents: booking.quotedTotalCents,
      currency: booking.currency,
      hostId: listing.hostId,
      hostCanHost: hostUser.canHost,
      title: listing.title,
      timezone: listing.timezone,
      city: listing.city,
      hourlyRateCents: listing.hourlyRateCents,
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
  quotedTotalCents: row.quotedTotalCents,
  hourlyRateCents: row.hourlyRateCents,
});

/**
 * approveRequest — the host approves a pending request (HOST-01 / PAY-05, D-64/D-66). Owner-gated, then
 * an ATOMIC, DB-clock-SLA-guarded flip `requested → approved` that ALSO sets the payment-window expiry to
 * now()+APPROVAL_PAYMENT_WINDOW_HOURS so the booker gets the FULL window to pay (mirrors the confirmBooking
 * GREATEST/payment-window idiom — the approved hold occupies the slot until the payment window lapses).
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
  // now()` refuses a lapsed approve. Setting expires_at = now()+APPROVAL_PAYMENT_WINDOW_HOURS opens the
  // booker's full payment window so the approved hold keeps occupying the slot until that window lapses.
  const flipped = (await db.execute(sql`
    UPDATE booking
    SET status = 'approved',
        expires_at = now() + make_interval(hours => ${APPROVAL_PAYMENT_WINDOW_HOURS})
    WHERE id = ${requestId} AND status = 'requested' AND expires_at > now()
    RETURNING id
  `)) as unknown as { id: string }[];

  if (flipped.length === 0) {
    // Already actioned (approved/declined) or lapsed (the 06-06 cron won the race) — calm, never a 500.
    await recordAudit({
      actorId: userId,
      action: "approve_request",
      outcome: "denied",
      meta: { reason: "not_pending", requestId },
    });
    return NOT_PENDING;
  }

  await recordAudit({ actorId: userId, action: "approve_request", outcome: "ok", meta: { requestId } });

  // Fire the booker the pay-now email FIRE-AND-FORGET (T-06-22 — a Resend failure never fails the action).
  // The pay link routes to the SAME Phase-5 checkout the /book page now treats an `approved` hold as active
  // for (06-04). The total is the SERVER-FROZEN quote (D-49), never a recompute.
  const whenLabel = composeWhenLabel(whenLabelInput(row));
  const totalLabel = formatMoney(row.quotedTotalCents ?? 0, row.currency ?? DISPLAY_CURRENCY);
  const title = row.title ?? "your space";
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  void sendRequestApproved(
    row.bookerEmail,
    title,
    whenLabel,
    totalLabel,
    `${base}/listings/${row.listingId}/book?hold=${requestId}`,
  );

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

  // Fire the booker the declined email FIRE-AND-FORGET (T-06-22). Freeing the slot is automatic (declined
  // is non-occupying — 06-01 EXCLUDE + 06-02 lazy reads); nothing is refunded/voided (D-63).
  const whenLabel = composeWhenLabel(whenLabelInput(row));
  void sendRequestDeclined(row.bookerEmail, row.title ?? "your space", whenLabel);

  // D-65 freshness: the decline clears the request from the host inbox + dashboard immediately.
  revalidatePath("/host/requests");
  revalidatePath("/host");
  return { ok: true };
}
