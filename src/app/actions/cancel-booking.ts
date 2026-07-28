"use server";

// Booker-initiated cancellation (BOOK-07 · PAY-06 · D-67/D-68/D-69/D-74/D-78/D-79/D-94) — ROADMAP SC#2.
//
// Two entry points, deliberately separate because they are different events wearing similar words:
//   cancelBookingAsBooker : a PAID (`confirmed`) booking. Money moves. The refund is computed from the
//                           booking's own snapshot against the DB clock, written to the row, and dispatched
//                           to PayMongo.
//   cancelUnpaidHold      : an UNPAID `requested` / `approved` hold. NOTHING moves. It reuses the canonical
//                           decline/release terminal mapping rather than inventing a second one.
//
// This clones src/app/actions/host-requests.ts (session → owner-gate → rate-limit → atomic status-scoped
// UPDATE → audit → notify → revalidate) but swaps the host-ownership guard for a BOOKER-ownership guard.
//
// SECURITY CONTRACT:
//   - SESSION: both actions require an authenticated session — a calm sign-in result otherwise.
//   - OWNERSHIP / IDOR (T-07-48 / Security V4): the booking is loaded JOINED to its listing + the listing
//     host + the booker, and `booking.bookerId === session.user.id` is verified BEFORE any UPDATE. The
//     route group is NOT the gate. A MISSING row and a CROSS-USER row return the SAME calm denial, so a
//     guessed or leaked booking id reveals nothing — missing and not-mine are indistinguishable. The
//     owner scope is ALSO repeated inside each UPDATE's WHERE (`AND booker_id = ${userId}`) as defence in
//     depth, so even a future refactor that broke the pre-read gate could not cancel a stranger's booking.
//   - REPLAY / DOUBLE-ACTION (T-07-49): every UPDATE is status-scoped, so a second cancel claims 0 rows and
//     is a calm message — never a 500, never a second refund. PayMongo's `refund:${paymentId}`
//     Idempotency-Key is the second layer beneath that.
//   - MONEY (T-07-47 / T-07-51): the refund is computed server-side from the booking's SNAPSHOTTED tier
//     (`booking.cancellation_policy`, NEVER the listing's current tier — a host retiering mid-flight must
//     not rewrite terms already agreed) and its FROZEN amounts. `cancellationSchema` has exactly one field,
//     so there is no request shape in which an amount could arrive.
//   - CLOCK (T-07-50): the rung is evaluated against the POSTGRES clock, never a JS Date. Rung boundaries
//     are sharp; a preview and an action straddling one on two different clocks would show the booker one
//     number and hand them another, which is precisely the promise SC#2 makes.
//   - POST-ONLY: both are POST server actions invoked from a button, never a GET side-effect.
//
// ⚠️ THE PREVIEW/CONFIRM RULE, STATED ONCE, DELIBERATELY: the ACTION RECOMPUTES. The review page's number
// is a preview, not a promise the server honours later. This is the only defensible rule for money — there
// is no signed quote token, so "honour what the page showed" would mean trusting a figure that reached the
// server through the client. It is also strictly safe in ONE direction: time only moves toward the session,
// so a boundary crossed between preview and confirm can only ever lower the refund, never raise it. What is
// guaranteed absolutely, and is asserted by test, is that the amount WRITTEN to `refund_cents`, the amount
// DISPATCHED to PayMongo, and the amount RETURNED to the caller all come from ONE `quoteRefund` call. The
// review page discloses the concrete instant each rung changes (D-81 / `rungBoundaries`) so a booker near a
// boundary can see it coming rather than be surprised by it.

import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { availabilityBlock, booking, listing, user } from "@/lib/db/schema";
import { readDbNow } from "@/lib/booking/bookings-query";
import { composeWhenLabel, type WhenLabelInput } from "@/lib/booking/when-label";
import { emitNotify } from "@/lib/notifications";
import { emitGuestEmail } from "@/lib/group/guest-notify";
import { listReachableYesAttendees } from "@/lib/group/rsvp";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { quoteRefund, tierOrDefault } from "@/lib/payments/cancellation";
import { HOST_CANCEL_FEE_CENTS } from "@/lib/payments/config";
import { isApiRefundable } from "@/lib/payments/refund-rail";
import {
  createRefund,
  createRefundTransfer,
  listReceivingInstitutions,
  INSTAPAY_CEILING_CENTS,
} from "@/lib/paymongo";
import { recordAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import {
  cancellationSchema,
  hostCancellationSchema,
  type HostCancellationInput,
} from "@/lib/validation/cancellation";
import {
  qrphRefundDestinationSchema,
  type QrphRefundDestination,
} from "@/lib/validation/qrph-refund";

/** The five D-70 host cancellation reasons, re-exported from the ONE schema that owns the union. */
export type HostCancelReason = HostCancellationInput["reason"];

/**
 * Cancel result. `refundCents` is what the SERVER computed and wrote — never an echo of a request field.
 * `notice` (optional, D-72) is a calm post-cancellation caveat for the paths where the cancellation
 * SUCCEEDED but the refund could not be dispatched to the supplied destination (transfer failure, the
 * InstaPay ceiling, or an unverifiable institution list) — the operator seam has the money; the booker is
 * told plainly rather than left to infer.
 */
export type CancelActionResult =
  | { ok: true; refundCents: number; notice?: string }
  | { ok: false; error: string };

// WR-06: money-moving budget per identity — mirrors approveRequest / confirmBooking (5 per 60s).
const CANCEL_RATE_LIMIT = { window: 60, max: 5 } as const;

/** The SAME calm denial for a missing booking AND a cross-user booking (IDOR — leak nothing, T-07-48). */
const DENIED: CancelActionResult = {
  ok: false,
  error: "We couldn't find that booking, or it isn't yours to manage.",
};

/** Calm result for a 0-row cancel — already cancelled or raced (never a 500, T-07-49). */
const NOT_ACTIVE: CancelActionResult = {
  ok: false,
  error: "This booking is no longer active — it may have already been cancelled.",
};

/** D-94: cancellation is refused once the session has begun. */
const PAST_START: CancelActionResult = {
  ok: false,
  error:
    "This session has already started, so it can't be cancelled here. Message the host if something's wrong.",
};

const NEEDS_SESSION: CancelActionResult = { ok: false, error: "Sign in to manage your bookings." };

const TOO_FAST: CancelActionResult = {
  ok: false,
  error: "You're going a little fast. Please try again in a moment.",
};

/**
 * D-72: a malformed destination or an institution not on the live InstaPay list is rejected BEFORE the
 * flip — the booking stays live, the booker fixes the form, nothing has been cancelled with no way to pay
 * the refund out. Calm and non-specific (which field failed is the FORM's job to say; this is the server
 * backstop for a bypassed client).
 */
const INVALID_DESTINATION: CancelActionResult = {
  ok: false,
  error:
    "Check your refund account details — pick a bank or e-wallet from the list and re-enter the account name and number.",
};

/** The ONLY destination fragment that may outlive the transfer call (D-72): a masked last-4. */
function maskAccountLast4(accountNumber: string): string {
  return `••••${accountNumber.slice(-4)}`;
}

/**
 * PayMongo refuses a refund below 100 centavos (₱1.00) — documented on the Refund resource. A non-zero
 * refund under the floor would 4xx, so it takes the operator-alert path instead of a call we know fails.
 * An API limit, not a FitOut policy knob, which is why it lives here rather than in payments/config.ts.
 */
const MIN_API_REFUND_CENTS = 100;

/** Resolve the signed-in user's id, or null if there is no session (cloned from host-requests.ts). */
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

// Aliased user joins: one read reaches BOTH the listing host (their cancellation notice) and the booker
// (their refund notice). Two joins onto `user` need distinct aliases.
const hostUser = alias(user, "host_user");
const bookerUser = alias(user, "booker_user");

type OwnedBooking = NonNullable<Awaited<ReturnType<typeof loadBookingRow>>>;

/**
 * The ONE read every cancel path shares. Everything the three paths need — the frozen money split, the
 * snapshotted tier, the payment id and rail, the occupied unit, the venue-local label inputs, both parties'
 * notification addresses, and the host's `canHost` capability — comes back here, so no branch below has to
 * re-query and risk reading a row that changed underneath it.
 *
 * It performs NO authorization. The two gates below own that, and they are what callers must use.
 *
 * Timestamps arrive as real Dates here because this is a Drizzle `select()` and not a raw `execute()` —
 * see the RawBookingRow contract in bookings-query.ts for why that distinction matters.
 */
async function loadBookingRow(bookingId: string) {
  const [row] = await db
    .select({
      id: booking.id,
      bookerId: booking.bookerId,
      listingId: booking.listingId,
      status: booking.status,
      // The unit this booking occupies (D-21). The host-cancel auto-block must close the SAME unit —
      // blocking the whole listing would punish the host's other units for a single cancellation.
      unit: booking.unit,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      // The D-67 creation-time tier SNAPSHOT. NEVER listing.cancellationPolicy (T-07-51).
      cancellationPolicy: booking.cancellationPolicy,
      // The D-74 frozen split. spacePriceCents is the ONLY refundable basis; the service fee never is.
      spacePriceCents: booking.spacePriceCents,
      serviceFeeCents: booking.serviceFeeCents,
      quotedTotalCents: booking.quotedTotalCents,
      // The WR-06 pricing-mode snapshot — the AUTHORITY the shared formatter renders "Full day" vs an
      // hour range from (08-15 / CR-01), including on the group-cancellation email. Never re-derived
      // from a price: the D-108 per-head surcharge is folded into spacePriceCents.
      fullDay: booking.fullDay,
      currency: booking.currency,
      paymentId: booking.paymentId,
      paymentMethod: booking.paymentMethod,
      title: listing.title,
      timezone: listing.timezone,
      city: listing.city,
      // The formatter's pre-0016 positive-match reference only.
      dayRateCents: listing.dayRateCents,
      hostId: listing.hostId,
      hostCanHost: hostUser.canHost,
      hostEmail: hostUser.email,
      bookerEmail: bookerUser.email,
      bookerFirstName: bookerUser.firstName,
    })
    .from(booking)
    .innerJoin(listing, eq(booking.listingId, listing.id))
    .innerJoin(hostUser, eq(listing.hostId, hostUser.id))
    .innerJoin(bookerUser, eq(booking.bookerId, bookerUser.id))
    .where(eq(booking.id, bookingId));
  return row ?? null;
}

/**
 * BOOKER owner-gate (T-07-48 / Security V4). Returns the booking ONLY if the signed-in user is its booker;
 * a missing row and a cross-user row both fall through to null and are therefore indistinguishable to the
 * caller.
 */
async function loadOwnedBooking(bookingId: string, userId: string) {
  const row = await loadBookingRow(bookingId);
  // Re-check ownership server-side (the route group is NOT the gate). Missing and not-mine both → null.
  if (!row || row.bookerId !== userId) return null;
  return row;
}

/**
 * HOST owner-gate (T-07-61). The mirror image of the booker gate, cloned from host-requests.ts's
 * `loadOwnedRequest`: the signed-in user must be the LISTING's host AND still hold `canHost`. A missing
 * booking, a booking on someone else's listing, and a de-capability'd host all fall through to null and are
 * therefore indistinguishable — the caller returns the SAME `DENIED` string the booker path returns, so a
 * guessed or leaked booking id is not an enumeration oracle in either direction.
 *
 * `canHost` is checked here and not only at the route because a host whose capability was revoked must not
 * keep a live money-moving action just because they still hold a URL.
 */
async function loadHostOwnedBooking(bookingId: string, userId: string) {
  const row = await loadBookingRow(bookingId);
  if (!row || row.hostId !== userId || !row.hostCanHost) return null;
  return row;
}

/** Project an owned booking onto the SHARED venue-local formatter's structural input (07-02). */
const whenLabelInput = (row: OwnedBooking): WhenLabelInput => ({
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
 * Distinguish the two calm 0-row cases with ONE extra read, so the booker is told which of them happened.
 * `starts_at > now()` is evaluated by Postgres, matching the UPDATE's own guard exactly.
 */
async function explainNoRows(bookingId: string): Promise<CancelActionResult> {
  const [row] = (await db.execute(sql`
    SELECT status::text AS "status", starts_at > now() AS "future"
    FROM booking WHERE id = ${bookingId}
  `)) as unknown as { status: string; future: boolean }[];
  // A still-confirmed booking that only failed the start-time guard is the post-start case; anything else
  // (already cancelled, declined, never confirmed, raced) is the generic no-longer-active case.
  if (row && row.status === "confirmed" && !row.future) return PAST_START;
  return NOT_ACTIVE;
}

/**
 * The app's base URL, from the SAME `BETTER_AUTH_URL` convention auth.ts / email.ts / paymongo-connect.ts
 * and every other emitNotify call site already use (booking.ts:218, host-requests.ts:258, request-expiry.ts:188,
 * webhook/route.ts:255). Do NOT introduce a second env var for this.
 *
 * ⚠️ EVERY `href` in a notification payload MUST be ABSOLUTE. One payload string feeds BOTH channels (D-91):
 * the in-app dropdown resolves an absolute same-origin URL fine, but an email client has no origin to resolve
 * a root-relative `/bookings/123` against, so a relative href is a DEAD LINK in the email half — silently, in
 * the one message the recipient most needs to act on. This regressed here once (found by 07-10) and is
 * asserted against in tests/booking/cancellation.test.ts.
 */
function appBaseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

/** Both sides are told, post-commit. Emission never blocks or fails the action (MANAGE-03). */
async function notifyCancellation(
  row: OwnedBooking,
  bookingId: string,
  refundCents: number | null,
): Promise<void> {
  const whenLabel = composeWhenLabel(whenLabelInput(row));
  const listingTitle = row.title ?? "your space";
  const bookerLabel = row.bookerFirstName?.trim() || "A guest";
  const base = appBaseUrl();

  // The HOST learns their slot is free again. Always sent — a host must never discover a cancellation by
  // turning up to an empty space.
  await emitNotify({
    type: "booking_cancelled_by_booker",
    recipientId: row.hostId,
    bookingId,
    email: row.hostEmail,
    payload: {
      type: "booking_cancelled_by_booker",
      listingTitle,
      whenLabel,
      bookerLabel,
      href: `${base}/host/bookings`,
    },
  });

  // The BOOKER gets the refund figure in writing — but ONLY when money actually moved. An unpaid hold has
  // nothing to refund, a 0%-rung cancellation refunds nothing, and a "₱0 refunded" notice would invent a
  // money event that never happened (D-79 / CR-01). The guard keys on the AMOUNT, and the label is
  // composed HERE, at the single point past the guard — so no call site can ever hand this function a
  // pre-formatted "₱0" string that reads as a truthy label for a refund that does not exist.
  if (refundCents !== null && refundCents > 0) {
    await emitNotify({
      type: "refund_issued",
      recipientId: row.bookerId,
      bookingId,
      email: row.bookerEmail,
      payload: {
        type: "refund_issued",
        listingTitle,
        whenLabel,
        refundLabel: formatMoney(refundCents, row.currency ?? DISPLAY_CURRENCY),
        href: `${base}/bookings/${bookingId}`,
      },
    });
  }
}

/**
 * D-121 — CANCELLING A BOOKING CANCELS ITS GROUP. Two consequences, in this order:
 *   1. The invite is VOIDED, so the link stops accepting RSVPs. Someone must not be able to keep saying
 *      "I'm coming" to a session that is not happening — and the void, not a UI branch, is what stops it
 *      (`getGroupByToken` filters on `voided_at IS NULL`, so a voided link renders exactly like an unknown
 *      one — T-08-17 holds through cancellation too).
 *   2. Every REACHABLE yes attendee is told. "Reachable" is doing real work: an account attendee gets the
 *      durable in-app row + email via `fitout/notify`, a guest-with-email gets the email-only
 *      `fitout/guest-email` path (a guest has no `user.id` and would fail the notification FK — RESEARCH
 *      Pitfall 2), and a BLANK-EMAIL guest is unreachable BY DESIGN (D-117). That last one is a product
 *      decision the invite page discloses up front ("this is your only confirmation"), not an oversight to
 *      route around by inventing a channel for them.
 *
 * MONEY IS DELIBERATELY UNTOUCHED. The organizer bought the slot; per-attendee refunds do not exist (D-114).
 * Nothing in here reads or writes a money column, and nothing in here may change the refund math.
 *
 * WHOLLY GUARDED, like every other post-commit consequence on these paths (the 07-11 discipline): the
 * cancellation and its refund have ALREADY committed by the time this runs, so a failure here must surface
 * as a `needs_attention` audit row rather than as a 500 for an action that in fact succeeded — or, worse, an
 * exception thrown before the refund's own notification.
 *
 * IDEMPOTENT: the UPDATE is scoped `voided_at IS NULL`, so a repeat claims 0 rows and notifies nobody twice.
 */
async function voidGroupAndNotifyAttendees(row: OwnedBooking, bookingId: string): Promise<void> {
  try {
    const [group] = (await db.execute(sql`
      UPDATE booking_group
      SET voided_at = now()
      WHERE booking_id = ${bookingId}
        AND voided_at IS NULL
      RETURNING id, access_token AS "accessToken"
    `)) as unknown as { id: string; accessToken: string }[];
    // No group on this booking (the overwhelmingly common case), or it was already voided. Either way
    // there is nothing to announce.
    if (!group) return;

    const attendees = await listReachableYesAttendees(db, group.id);
    const whenLabel = composeWhenLabel(whenLabelInput(row));
    const listingTitle = row.title ?? "the space";
    const href = `${appBaseUrl()}/invite/${group.accessToken}`;

    let notified = 0;
    for (const attendee of attendees) {
      // The ORGANIZER already has their own cancellation notice (and, on the host path, their refund
      // notice). Telling them a second time that their own booking is off is noise, not news.
      if (attendee.userId != null && attendee.userId === row.bookerId) continue;

      if (attendee.userId != null) {
        await emitNotify({
          type: "group_cancelled",
          recipientId: attendee.userId,
          bookingId,
          email: attendee.accountEmail,
          payload: { type: "group_cancelled", listingTitle, whenLabel, href },
        });
        notified += 1;
      } else if (attendee.guestEmail != null) {
        await emitGuestEmail({
          to: attendee.guestEmail,
          kind: "group_cancelled",
          listingTitle,
          whenLabel,
          href,
        });
        notified += 1;
      }
    }

    await recordAudit({
      actorId: "system",
      action: "group_voided_on_cancel",
      outcome: "ok",
      // A COUNT, never a roster: an audit row must not become a durable copy of who was coming (T-07-38).
      meta: { bookingId, groupId: group.id, notified },
    });
  } catch {
    // DELIBERATELY no error object: an enqueue error can echo a payload carrying a guest's address back at
    // the log line (the same no-leak rule as the D-72 transfer catch above).
    console.error("[CANCEL_ALERT] group_void_failed", { bookingId });
    await recordAudit({
      actorId: "system",
      action: "group_void_failed",
      outcome: "needs_attention",
      meta: { bookingId },
    });
  }
}

/**
 * The surfaces a cancellation changes. Shared so the paths can never revalidate different sets.
 * `listingId` is passed by the HOST path, whose auto-block also changes the PUBLIC listing's availability —
 * without it the freed-then-blocked window would keep rendering as bookable to browsers until the next
 * revalidation, which is exactly the resale window D-70 exists to close.
 */
function revalidateCancelSurfaces(bookingId: string, listingId?: string): void {
  revalidatePath("/bookings");
  revalidatePath("/host/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  if (listingId) {
    revalidatePath(`/host/bookings/${bookingId}`);
    revalidatePath(`/listings/${listingId}`);
  }
}

/**
 * cancelBookingAsBooker — cancel a PAID (`confirmed`) booking (BOOK-07 / PAY-06). The client sends ONLY a
 * booking id; the tier, the rung and every peso are derived server-side from the booking's own snapshot,
 * evaluated against the Postgres clock.
 *
 * `destination` (OPTIONAL, D-72 / Plan 07-16): on a rail PayMongo cannot API-refund (QRPh — settled by the
 * 2026-07-23 probe recorded in refund-rail.ts), the booker supplies a bank/e-wallet destination that passes
 * STRAIGHT THROUGH to createRefundTransfer and is NEVER persisted — only the transfer id and a masked
 * last-4 survive, in the audit trail. It is re-validated server-side (shape + live-BIC membership), bound
 * to the authenticated booker AND this specific booking (it is only ever used inside this owner-gated
 * flow, on the row just flipped), and the amount is ALWAYS the server-computed `quote.totalRefundCents` —
 * a destination is NEVER read from a prior request, a session value or a stored record (T-07-94).
 *
 * The ORDER below is load-bearing: gate before rate-limit (so a stranger's id is denied without consuming
 * the owner's budget), rate-limit before any write, clock before quote, quote before flip, flip before
 * money, money before notification. Nothing after the flip may undo it.
 */
export async function cancelBookingAsBooker(
  bookingId: string,
  destination?: QrphRefundDestination,
): Promise<CancelActionResult> {
  // Re-validate the ONE field that crosses the boundary. A malformed id is a calm denial, not a 500.
  const parsed = cancellationSchema.safeParse({ bookingId });
  if (!parsed.success) return DENIED;

  // D-72: SHAPE-validate the optional destination with the SAME schema the form uses — server-action
  // argument types are not enforced at runtime, so a crafted payload lands here raw. safeParse also STRIPS
  // unknown keys, so a smuggled amount-shaped field never survives past this line (not that anything below
  // reads one — the transfer amount is the server quote by construction). Malformed → calm denial BEFORE
  // any write: the booking must not end up cancelled with an unusable refund destination.
  let suppliedDest: QrphRefundDestination | null = null;
  if (destination !== undefined) {
    const parsedDest = qrphRefundDestinationSchema.safeParse(destination);
    if (!parsedDest.success) return INVALID_DESTINATION;
    suppliedDest = parsedDest.data;
  }

  const userId = await requireUserId();
  if (!userId) return NEEDS_SESSION;

  // Owner-gate BEFORE any UPDATE (T-07-48). Missing vs cross-user → the SAME calm denial.
  const row = await loadOwnedBooking(parsed.data.bookingId, userId);
  if (!row) return DENIED;

  // T-07-52: bound cancel-spam per identity; audit the denial (non-repudiable).
  const limit = rateLimit(`cancel-booking:${userId}`, CANCEL_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: userId,
      action: "cancel_booking",
      outcome: "denied",
      meta: { reason: "rate_limit", bookingId, retryAfter: limit.retryAfter },
    });
    return TOO_FAST;
  }

  // T-07-50 — the POSTGRES clock, read ONCE, hydrated at the boundary. `readDbNow` exists because a bare
  // `SELECT now()` through `execute` hands back Postgres TEXT, not a Date: passing that straight into
  // quoteRefund compiles, lints and builds cleanly and then throws on `.getTime()` with the first real row.
  const now = await readDbNow(db);

  // T-07-51 — the tier is the BOOKING's snapshot. A host who retiered the listing after this booking was
  // made does not get to rewrite its refund terms, in either direction.
  const quote = quoteRefund({
    tier: tierOrDefault(row.cancellationPolicy),
    // D-74: the refundable basis is the SPACE price alone. `quotedTotalCents` is the all-in charge and
    // includes the non-refundable service fee; using it would refund platform revenue. The fallback covers
    // a pre-07-08 row whose split was never frozen — for those the fee was 0, so the two are equal.
    spacePriceCents: row.spacePriceCents ?? row.quotedTotalCents ?? 0,
    serviceFeeCents: row.serviceFeeCents ?? 0,
    startsAt: row.startsAt,
    now,
  });

  // ── D-72: verify the destination's institution against the LIVE InstaPay list, BEFORE the flip. ───────
  // T-07-99 — `institutionBic` is never accepted as a free string: it must be a member of the set
  // `listReceivingInstitutions()` returns. An unknown BIC is rejected here, while the booking is still
  // live, so the booker fixes the form instead of ending up cancelled with an undeliverable refund.
  // The destination is consulted ONLY when it will actually be used: a rail the API can refund ignores it
  // entirely (the standard createRefund path needs no destination and must never read one).
  //
  // If the institutions fetch itself FAILS (observed live 2026-07-23: the Money Movement endpoints 404
  // until PayMongo enables the feature — evidence in refund-rail.ts), the cancellation still proceeds and
  // the money block below routes to the `needs_attention` operator seam: an unverifiable list must not
  // block a booker's right to cancel, and firing a transfer at an unverified institution is not an option.
  let dest: QrphRefundDestination | null = null;
  let destUnverifiable = false;
  if (suppliedDest && !isApiRefundable(row.paymentMethod) && quote.totalRefundCents > 0) {
    const d = suppliedDest;
    try {
      const institutions = await listReceivingInstitutions();
      if (!institutions.some((i) => i.bic === d.institutionBic)) return INVALID_DESTINATION;
      dest = d;
    } catch {
      destUnverifiable = true;
    }
  }

  // The ATOMIC, owner-scoped, status-scoped, DB-clock-guarded flip. EVERY guard lives in the WHERE, so a
  // 0-row result is the single calm failure path and none of the guards can be raced apart from the others.
  //
  // D-79 — the single `cancelled` status is kept DELIBERATELY. The GiST EXCLUDE predicate is the COMPLEMENT
  // (`status NOT IN ('cancelled','declined','completed')`), so a new `cancelled_partial` value would default
  // to OCCUPYING and permanently block the slot of every partially-refunded cancellation. D-79 did not avoid
  // an audit; it avoided a live bug. Freeing the slot is therefore automatic and needs no slot manipulation.
  //
  // `AND starts_at > now()`: cancellation is permitted only BEFORE the session begins (D-94). This
  // STRUCTURALLY eliminates the payout clawback problem — payout is not eligible until endsAt + 24h (D-55),
  // so a refund is always just a platform-wallet reversal with the host never yet paid.
  //
  // `retained_space_cents` is what reaches the host: 07-04's payout basis is
  // COALESCE(retained_space_cents, space_price_cents), so writing it here IS the D-69 mechanism.
  const flipped = (await db.execute(sql`
    UPDATE booking
    SET status = 'cancelled',
        refund_cents = ${quote.totalRefundCents},
        retained_space_cents = ${quote.retainedSpaceCents},
        cancelled_by = 'booker',
        cancelled_at = now(),
        expires_at = NULL
    WHERE id = ${parsed.data.bookingId}
      AND booker_id = ${userId}
      AND status = 'confirmed'
      AND starts_at > now()
    RETURNING id
  `)) as unknown as { id: string }[];

  if (flipped.length === 0) {
    const reason = await explainNoRows(parsed.data.bookingId);
    await recordAudit({
      actorId: userId,
      action: "cancel_booking",
      outcome: "denied",
      meta: { reason: reason === PAST_START ? "past_start" : "not_active", bookingId },
    });
    return reason; // calm, never a throw
  }

  await recordAudit({
    actorId: userId,
    action: "cancel_booking",
    outcome: "ok",
    meta: {
      bookingId,
      refundCents: quote.totalRefundCents,
      retainedCents: quote.retainedSpaceCents,
      tier: quote.tier,
      refundBps: quote.refundBps,
    },
  });

  // ── Money. Everything below this line is a side-effect of a flip that has ALREADY committed. ──────────
  //
  // A refund-dispatch failure must NOT unwind the status flip: the slot is already freed and that is the
  // correct outcome for the host and for every other booker. The failure surfaces as a needs_attention
  // audit row — the established operator-alert channel (D-58, D-90) — never as a silent loss and never as
  // a rollback that would resurrect an occupied slot nobody is going to use.
  //
  // ⚠️ The POST records INTENT ONLY. Refund status is ASYNCHRONOUS (pending → processing → succeeded |
  // failed) and the payment.refunded / payment.refund.updated webhook is the SINGLE WRITER of terminal
  // state (D-57). Never display "Refunded ₱500" off this POST — "₱500 refund on its way" is the truth.
  const refundable =
    quote.totalRefundCents >= MIN_API_REFUND_CENTS &&
    row.paymentId != null &&
    isApiRefundable(row.paymentMethod);

  // D-72: the calm post-cancel caveat for the destination paths where the money could NOT be dispatched.
  let notice: string | undefined;

  if (refundable) {
    try {
      await createRefund({
        amountCents: quote.totalRefundCents,
        paymentId: row.paymentId!,
        notes: `Booker cancellation (${bookingId})`,
      });
    } catch (err) {
      console.error("[CANCEL_ALERT] refund_dispatch_failed", { bookingId, err });
      await recordAudit({
        actorId: userId,
        action: "refund_dispatch_failed",
        outcome: "needs_attention",
        meta: {
          bookingId,
          paymentId: row.paymentId,
          method: row.paymentMethod,
          refundCents: quote.totalRefundCents,
        },
      });
    }
  } else if (quote.totalRefundCents > 0) {
    // Money IS owed but createRefund cannot move it: an unrefundable rail (QRPh — settled by the
    // 2026-07-23 probe, refund-rail.ts; and the rail is unknown on a pre-07-09 row, which `isApiRefundable`
    // correctly reads as unrefundable), no captured payment id, or an amount below PayMongo's ₱1 floor.
    //
    // THIS IS THE SINGLE D-72 SEAM (Plan 16, built): with a VERIFIED destination, the refund goes out as
    // an InstaPay transfer; every other shape of this branch stays the operator-alert path — never a
    // silent retention.
    if (dest) {
      if (quote.totalRefundCents > INSTAPAY_CEILING_CENTS) {
        // T-07-98: a transfer above the InstaPay ceiling is DOOMED — alert, never fire it.
        console.error("[CANCEL_ALERT] refund_over_instapay_ceiling", {
          bookingId,
          refundCents: quote.totalRefundCents,
        });
        await recordAudit({
          actorId: userId,
          action: "refund_over_instapay_ceiling",
          outcome: "needs_attention",
          meta: { bookingId, refundCents: quote.totalRefundCents },
        });
        notice =
          "Your booking is cancelled. This refund is above the instant-transfer limit, so our team will arrange it with you directly.";
      } else {
        try {
          const transfer = await createRefundTransfer({
            bookingId: parsed.data.bookingId,
            amountCents: quote.totalRefundCents, // SERVER-frozen — never a client figure (T-07-94)
            currency: row.currency ?? DISPLAY_CURRENCY,
            attempt: 1,
            // Straight through — never persisted (D-72). Projected onto the transfer's account shape.
            destination: {
              number: dest.accountNumber,
              name: dest.accountName,
              bic: dest.institutionBic,
            },
          });
          // D-72: ONLY the transfer id and a masked last-4 outlive the call. No account number, no
          // account name, no BIC — not in this audit meta, not in any log line, not in any column.
          await recordAudit({
            actorId: userId,
            action: "refund_transfer_dispatched",
            outcome: "ok",
            meta: {
              bookingId,
              transferId: transfer.transferId,
              destinationLast4: maskAccountLast4(dest.accountNumber),
              refundCents: quote.totalRefundCents,
            },
          });
        } catch {
          // DELIBERATELY no `err` in this log line: a PayMongo error detail can echo the destination
          // fields back, and the D-72 no-leakage rule covers log lines too — the leakage test feeds this
          // path an error that DOES echo the account number, so logging it would go red.
          //
          // And DELIBERATELY no retry: PayMongo requires a NEW reference_number per attempt, so a silent
          // same-reference retry is exactly what the per-attempt design forbids. The booker gets a calm
          // recovery message instead; the operator seam has the money.
          console.error("[CANCEL_ALERT] refund_transfer_failed", { bookingId });
          await recordAudit({
            actorId: userId,
            action: "refund_transfer_failed",
            outcome: "needs_attention",
            meta: {
              bookingId,
              refundCents: quote.totalRefundCents,
              destinationLast4: maskAccountLast4(dest.accountNumber),
            },
          });
          notice =
            "Your booking is cancelled, but we couldn't send the refund to that account. Our team has been alerted and will arrange your refund — you may be asked to re-enter your details.";
        }
      }
    } else {
      // No usable destination: none supplied, or the institution list was unverifiable (Money Movement
      // not enabled — the live 404, refund-rail.ts). Operator-alert; never silently keep the money.
      console.error("[CANCEL_ALERT] refund_needs_manual", { bookingId, method: row.paymentMethod });
      await recordAudit({
        actorId: userId,
        action: "refund_manual_required",
        outcome: "needs_attention",
        meta: {
          bookingId,
          paymentId: row.paymentId,
          method: row.paymentMethod,
          refundCents: quote.totalRefundCents,
        },
      });
      if (destUnverifiable) {
        notice =
          "Your booking is cancelled. We couldn't verify your refund account right now, so our team will arrange your refund directly.";
      }
    }
  }

  // AFTER the commit, never inside a transaction (this action opens none). `emitNotify` swallows its own
  // transport errors, so a notification outage can never fail a cancellation whose money already moved.
  // The AMOUNT is passed, never a pre-formatted label — notifyCancellation suppresses the refund notice
  // when it is 0 (CR-01) and composes the label itself past that guard.
  await notifyCancellation(row, bookingId, quote.totalRefundCents);

  // D-121 — the group consequence, AFTER the money notice so the booker's own messages are never delayed
  // behind an attendee fan-out. Guarded internally; it cannot throw past this line.
  await voidGroupAndNotifyAttendees(row, bookingId);

  revalidateCancelSurfaces(bookingId);
  return notice
    ? { ok: true, refundCents: quote.totalRefundCents, notice }
    : { ok: true, refundCents: quote.totalRefundCents };
}

/**
 * cancelUnpaidHold — cancel an UNPAID `requested` / `approved` hold. No money ever moved (D-63,
 * pay-on-approval), so there is NO quote, NO PayMongo call and NO breakdown: just the flip, the audit, the
 * notification and the revalidate.
 *
 * The terminal mapping (`requested → declined`, `approved → cancelled`) is NOT a local choice. It is the
 * CANONICAL mapping documented in src/inngest/functions/request-expiry.ts and mirrored by the in-transaction
 * stale-hold sweep in availability/units.ts. Diverging here would desync all three, and the symptom would be
 * a slot whose freed-ness disagreed with its displayed status. Expressed as a single CASE inside the UPDATE
 * so both statuses are handled in ONE atomic, status-scoped, owner-scoped statement.
 *
 * No `starts_at > now()` guard: an unpaid hold past its start is inert either way, and refusing to let a
 * booker tidy it up would strand a row for no benefit — there is no money and no clawback to protect.
 */
export async function cancelUnpaidHold(bookingId: string): Promise<CancelActionResult> {
  const parsed = cancellationSchema.safeParse({ bookingId });
  if (!parsed.success) return DENIED;

  const userId = await requireUserId();
  if (!userId) return NEEDS_SESSION;

  const row = await loadOwnedBooking(parsed.data.bookingId, userId);
  if (!row) return DENIED;

  const limit = rateLimit(`cancel-booking:${userId}`, CANCEL_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: userId,
      action: "cancel_unpaid_hold",
      outcome: "denied",
      meta: { reason: "rate_limit", bookingId, retryAfter: limit.retryAfter },
    });
    return TOO_FAST;
  }

  const flipped = (await db.execute(sql`
    UPDATE booking
    SET status = (CASE WHEN status = 'requested' THEN 'declined' ELSE 'cancelled' END)::booking_status,
        expires_at = NULL,
        cancelled_by = 'booker',
        cancelled_at = now()
    WHERE id = ${parsed.data.bookingId}
      AND booker_id = ${userId}
      AND status IN ('requested','approved')
    RETURNING id
  `)) as unknown as { id: string }[];

  if (flipped.length === 0) {
    await recordAudit({
      actorId: userId,
      action: "cancel_unpaid_hold",
      outcome: "denied",
      meta: { reason: "not_active", bookingId },
    });
    return NOT_ACTIVE;
  }

  await recordAudit({
    actorId: userId,
    action: "cancel_unpaid_hold",
    outcome: "ok",
    meta: { bookingId, previousStatus: row.status },
  });

  // `null` refund amount: nothing was charged, so the booker gets no refund notice. The host still does —
  // their slot just became free again, which is the whole reason they need telling.
  await notifyCancellation(row, bookingId, null);

  revalidateCancelSurfaces(bookingId);
  return { ok: true, refundCents: 0 };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// HOST-INITIATED CANCELLATION (HOST-02 · PAY-06 · D-70/D-71/D-80) — ROADMAP SC#3.
//
// A host breaking an ALREADY-CONFIRMED booking is a different event from a booker changing their mind, and
// the economics are the reason (07-CONTEXT § Specific Ideas — the user reasons from economics first). D-63
// refused to bill a host for a REJECTION, because nobody can fairly be billed for a reversal they were
// asked to make. A host cancelling a booking the booker already PAID for is the opposite case: a broken
// commitment, fairly billable, and the fee self-funds the ~2.5% gateway cost the platform would otherwise
// absorb for nothing.
//
// FOUR CONSEQUENCES FIRE, and all four are load-bearing (D-70/D-71):
//   1. The booker is refunded 100% — INCLUDING the D-74 service fee, and REGARDLESS of the listing's tier.
//   2. An audit row is recorded against the HOST.
//   3. The freed window is AUTO-BLOCKED on the same listing AND unit, with a sentinel `reason` the unblock
//      action refuses to delete. This is the anti-resell mechanism; without it the whole apparatus is a
//      formality, because the host could cancel and immediately relist the same slot at a higher price.
//   4. A flat, config-tunable fee is charged as a SIGNED DEBIT on host_payout_ledger, capped at the booking
//      value AT WRITE TIME, netted against the host's next payout by the 07-04 sweep.
//
// ⚠️ THE TIER IS DELIBERATELY NOT CONSULTED. `quoteRefund` is NOT called anywhere below and must not be.
// The refund ladder answers "how much does the BOOKER forfeit for changing their mind" — a question that
// has no meaning when the booker did nothing. A strict-tier booking cancelled by the host one hour out
// still refunds 100%; that is asserted by test, at exactly the rung that would otherwise award 0%.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

/** WR-06 / T-07-68: same money-moving budget per identity as approve / booker-cancel (5 per 60s). */
const HOST_CANCEL_RATE_LIMIT = { window: 60, max: 5 } as const;

/** The sentinel `availability_block.reason` that marks a block as SYSTEM-created and undeletable. */
const HOST_CANCEL_BLOCK_REASON = "host_cancellation";

/**
 * The D-71 fee for this booking, CAPPED AT THE BOOKING VALUE. Pure, so the preview and the write can never
 * disagree about the figure the host was shown and the figure they are charged.
 *
 * The cap is enforced HERE, at write time, and NOT at netting time. Netting time is too late: the debit row
 * would already misstate the debt, every consumer that reads it (the sweep, /host/earnings' outstanding
 * line, this action's own preview) would show the uncapped number, and the cap would have to be re-derived
 * on every sweep against a booking row that may have changed.
 *
 * The basis is the SPACE price, not the all-in charged total — the fee can never exceed what the host would
 * have EARNED, and the host never earns the platform's service fee.
 */
function cappedHostCancelFee(row: OwnedBooking): number {
  return Math.min(HOST_CANCEL_FEE_CENTS, row.spacePriceCents ?? row.quotedTotalCents ?? 0);
}

/** The host's unrecovered D-71 debt — the SAME `SUM(-net_cents - recovered_cents)` the sweep and /host/earnings use. */
async function readOutstandingDebitCents(hostId: string): Promise<number> {
  const [{ outstandingCents = 0 } = { outstandingCents: 0 }] = (await db.execute(sql`
    SELECT COALESCE(SUM(-net_cents - recovered_cents), 0)::int AS "outstandingCents"
    FROM host_payout_ledger
    WHERE host_id = ${hostId}
      AND kind = 'host_cancel_fee'
      AND recovered_cents < -net_cents
  `)) as unknown as { outstandingCents: number }[];
  return outstandingCents;
}

/**
 * previewHostCancelFee — the owner-gated read that feeds the dialog's Step-2 consequences pane.
 *
 * Returns the ALREADY-CAPPED fee. The UI renders the figure it is handed and NEVER applies the cap itself:
 * a cap applied in two places is a cap that can disagree with itself, and the half the host would notice is
 * the half that under-states what they are about to be charged.
 */
export async function previewHostCancelFee(
  bookingId: string,
): Promise<{ feeCents: number; outstandingCents: number } | null> {
  const parsed = cancellationSchema.safeParse({ bookingId });
  if (!parsed.success) return null;

  const userId = await requireUserId();
  if (!userId) return null;

  const row = await loadHostOwnedBooking(parsed.data.bookingId, userId);
  if (!row) return null;

  return {
    feeCents: cappedHostCancelFee(row),
    outstandingCents: await readOutstandingDebitCents(row.hostId),
  };
}

/**
 * cancelBookingAsHost — the host cancels a confirmed booking (HOST-02 / PAY-06 · D-70/D-71/D-80), firing all
 * four consequences. The client sends ONLY a booking id and one of five enumerated reasons; the refund, the
 * fee and the blocked window are all derived server-side from the booking's own row (T-07-63).
 *
 * The ORDER is load-bearing and mirrors the booker path: gate before rate-limit (so a stranger's id is
 * denied without consuming the owner's budget), rate-limit before any write, flip before any consequence,
 * consequences before money, money before notification. Nothing after the flip may undo it.
 */
export async function cancelBookingAsHost(
  bookingId: string,
  reason: HostCancelReason,
): Promise<CancelActionResult> {
  // Re-validate BOTH fields that cross the boundary. Server-action argument types are NOT enforced at
  // runtime, so a crafted reason string would otherwise land verbatim in an audit row and a durable column.
  // A malformed id or an unknown reason is a calm denial, never a throw.
  const parsed = hostCancellationSchema.safeParse({ bookingId, reason });
  if (!parsed.success) return DENIED;

  const userId = await requireUserId();
  if (!userId) return NEEDS_SESSION;

  // T-07-61 — HOST owner-gate BEFORE any write. Missing, cross-host, and de-capability'd → the SAME calm
  // denial the booker path returns, byte for byte.
  const row = await loadHostOwnedBooking(parsed.data.bookingId, userId);
  if (!row) return DENIED;

  // T-07-68: bound host-cancel spam per identity; audit the denial (non-repudiable).
  const limit = rateLimit(`host-cancel:${userId}`, HOST_CANCEL_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: userId,
      action: "host_cancel_booking",
      outcome: "denied",
      meta: { reason: "rate_limit", bookingId, retryAfter: limit.retryAfter },
    });
    return TOO_FAST;
  }

  // T-07-50 — CLOCK. There is deliberately NO `readDbNow` call on this path, and its absence is the
  // stronger position rather than a gap. The booker path hydrates a JS Date because `quoteRefund` needs one
  // to evaluate a rung; this path evaluates NO rung (the tier is not consulted), so the only time authority
  // it needs is Postgres `now()` INSIDE the UPDATE's own WHERE and SET below — which cannot be raced apart
  // from the status check the way a read-then-compare in JS could be. Do not "complete the pattern" by
  // adding a clock read here that nothing would compare against.

  // The refund is the FULL charge — space price AND the D-74 service fee. This is the ONE case where the
  // non-refundable fee IS returned: the booker did nothing wrong, so the platform, not the booker, absorbs
  // the gateway cost of the reversal. Read off the frozen row, never recomputed.
  const refundCents = row.quotedTotalCents ?? 0;
  const feeCents = cappedHostCancelFee(row);

  // The ATOMIC, status-scoped, DB-clock-guarded flip. Every guard lives in the WHERE, so a 0-row result is
  // the single calm failure path and none of them can be raced apart from the others.
  //
  // `retained_space_cents = 0` is what makes the 07-04 sweep's predicate
  // (`status = 'cancelled' AND COALESCE(retained_space_cents, 0) > 0`) correctly EXCLUDE this booking: the
  // host gets no payout for a session they cancelled AND owes the fee. Writing NULL here instead would fall
  // through to `COALESCE(retained, space_price)` and pay the host the full space price — the exact
  // inversion of the consequence.
  //
  // `AND starts_at > now()` (D-94) is the same guard the booker path carries, and it structurally eliminates
  // the payout clawback problem: payout is not eligible until endsAt + PAYOUT_DELAY_HOURS (D-55), so the
  // host has never been paid at the moment a refund is issued.
  const flipped = (await db.execute(sql`
    UPDATE booking
    SET status = 'cancelled',
        refund_cents = ${refundCents},
        retained_space_cents = 0,
        cancelled_by = 'host',
        cancelled_at = now(),
        decline_reason = ${parsed.data.reason},
        expires_at = NULL
    WHERE id = ${parsed.data.bookingId}
      -- DEFENCE IN DEPTH (T-07-61) — the host-side equivalent of the booker path's in-WHERE booker scope.
      -- Host ownership lives on the LISTING, not on the booking, so it cannot be a bare column predicate —
      -- hence the EXISTS. Without it the pre-read gate would be the ONLY layer on this path, and a future
      -- refactor that broke it could cancel, refund and fee-charge a STRANGER's booking. That is not
      -- hypothetical: it is exactly what happened when the gate was removed during this plan's mutation
      -- check, and this predicate is what now stops the WRITE even if the read gate ever regresses.
      AND EXISTS (
        SELECT 1 FROM listing l WHERE l.id = booking.listing_id AND l.host_id = ${userId}
      )
      AND status = 'confirmed'
      AND starts_at > now()
    RETURNING id
  `)) as unknown as { id: string }[];

  if (flipped.length === 0) {
    const calm = await explainNoRows(parsed.data.bookingId);
    await recordAudit({
      actorId: userId,
      action: "host_cancel_booking",
      outcome: "denied",
      meta: { reason: calm === PAST_START ? "past_start" : "not_active", bookingId },
    });
    return calm; // calm, never a throw
  }

  // ── Consequence 2. THIS IS D-70's "audit record against the host". ────────────────────────────────────
  await recordAudit({
    actorId: userId,
    action: "host_cancel_booking",
    outcome: "ok",
    meta: {
      bookingId,
      reason: parsed.data.reason,
      feeCents,
      refundCents,
      listingId: row.listingId,
    },
  });

  // ── Everything below is a side-effect of a flip that has ALREADY committed. ───────────────────────────
  //
  // None of it may unwind the flip, and none of it may THROW past this point either: the booking is already
  // cancelled and the slot already freed, so a raised exception would hand the host a 500 for an action that
  // in fact succeeded, and would skip the refund entirely. Each consequence is therefore individually
  // guarded and any failure becomes a `needs_attention` audit row — the established operator-alert channel
  // (D-58/D-90) — so a consequence can fail LOUDLY but never silently, and never by taking the others down.

  // ── Consequence 3. AUTO-BLOCK the freed window (D-70's actual anti-resell mechanism). ─────────────────
  // Reuses the Phase-3 availability_block machinery verbatim — same listing, same UNIT, same [startsAt,
  // endsAt) window. `reason` carries the sentinel that removeBlock refuses to delete (07-RESEARCH Open
  // Question 3): availability_block rows are deleted to unblock and nothing previously marked a block as
  // system-created, so without that refusal a host could simply delete their own punitive block and defeat
  // this consequence entirely.
  try {
    await db.insert(availabilityBlock).values({
      id: randomUUID(),
      listingId: row.listingId,
      unit: row.unit,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      reason: HOST_CANCEL_BLOCK_REASON,
    });
  } catch (err) {
    console.error("[HOST_CANCEL_ALERT] auto_block_failed", { bookingId, err });
    await recordAudit({
      actorId: userId,
      action: "host_cancel_autoblock_failed",
      outcome: "needs_attention",
      meta: { bookingId, listingId: row.listingId, unit: row.unit },
    });
  }

  // ── Consequence 4. The D-71 SIGNED DEBIT, capped at write time. ───────────────────────────────────────
  // gross/commission are meaningless for a debit — it never transfers, it only NETS against a future payout
  // — so gross = -fee, commission = 0, net = -fee keeps the arithmetic coherent if anything ever sums the
  // column. Inserted `held`; the sweep moves it to `paid` once recovered_cents reaches -net_cents.
  //
  // T-07-64 — `ON CONFLICT (booking_id, kind) DO NOTHING` IS the at-most-once lock, exactly as the sweep's
  // claim INSERT is. An empty RETURNING means this booking's fee was already charged, which is a calm no-op
  // and never a second charge. There is DELIBERATELY no app-level "already charged?" pre-query: a
  // read-then-write is precisely the race the composite UNIQUE exists to kill.
  try {
    const charged = (await db.execute(sql`
      INSERT INTO host_payout_ledger (id, booking_id, host_id, kind, gross_cents,
        commission_rate_bps, commission_cents, net_cents, recovered_cents, currency, state)
      VALUES (${randomUUID()}, ${parsed.data.bookingId}, ${row.hostId}, 'host_cancel_fee', ${-feeCents},
        0, 0, ${-feeCents}, 0, ${row.currency ?? DISPLAY_CURRENCY}, 'held')
      ON CONFLICT (booking_id, kind) DO NOTHING
      RETURNING id
    `)) as unknown as { id: string }[];
    if (charged.length === 0) {
      await recordAudit({
        actorId: userId,
        action: "host_cancel_fee_already_charged",
        outcome: "ok",
        meta: { bookingId, feeCents },
      });
    }
  } catch (err) {
    console.error("[HOST_CANCEL_ALERT] fee_debit_failed", { bookingId, err });
    await recordAudit({
      actorId: userId,
      action: "host_cancel_fee_failed",
      outcome: "needs_attention",
      meta: { bookingId, hostId: row.hostId, feeCents },
    });
  }

  // ── Consequence 1 (the money). Same dispatch discipline as the booker path. ───────────────────────────
  //
  // ⚠️ The POST records INTENT ONLY. Refund status is ASYNCHRONOUS and the payment.refunded webhook is the
  // SINGLE WRITER of terminal state (D-57) — never display "Refunded ₱1,050" off this return value.
  const refundable =
    refundCents >= MIN_API_REFUND_CENTS && row.paymentId != null && isApiRefundable(row.paymentMethod);

  if (refundable) {
    try {
      await createRefund({
        amountCents: refundCents,
        paymentId: row.paymentId!,
        notes: `Host cancellation (${bookingId})`,
      });
    } catch (err) {
      console.error("[CANCEL_ALERT] refund_dispatch_failed", { bookingId, err });
      await recordAudit({
        actorId: userId,
        action: "refund_dispatch_failed",
        outcome: "needs_attention",
        meta: { bookingId, paymentId: row.paymentId, method: row.paymentMethod, refundCents },
      });
    }
  } else if (refundCents > 0) {
    // Money IS owed but the API cannot move it (unrefundable rail, no captured payment id, or below
    // PayMongo's ₱1 floor). Operator-alert; never silently keep the money. The D-72 QRPh form (Plan 16)
    // hangs off the BOOKER path's single documented seam — do NOT add a second branch for it here.
    console.error("[CANCEL_ALERT] refund_needs_manual", { bookingId, method: row.paymentMethod });
    await recordAudit({
      actorId: userId,
      action: "refund_manual_required",
      outcome: "needs_attention",
      meta: { bookingId, paymentId: row.paymentId, method: row.paymentMethod, refundCents },
    });
  }

  // AFTER the commit, never inside a transaction. `emitNotify` swallows its own transport errors, so a
  // notification outage can never fail a cancellation whose money already moved.
  const whenLabel = composeWhenLabel(whenLabelInput(row));
  const listingTitle = row.title ?? "your space";
  const refundLabel = formatMoney(refundCents, row.currency ?? DISPLAY_CURRENCY);
  const base = appBaseUrl();

  // The BOOKER learns their session is off and what is coming back. `booking_cancelled_by_host` is its own
  // notification type because "your host cancelled" and "your booking was cancelled" are different sentences
  // to receive, and only one of them is the recipient's own doing.
  await emitNotify({
    type: "booking_cancelled_by_host",
    recipientId: row.bookerId,
    bookingId,
    email: row.bookerEmail,
    payload: {
      type: "booking_cancelled_by_host",
      listingTitle,
      whenLabel,
      refundLabel,
      side: "booker", // WR-04: every write declares its audience; the booker copy is byte-unchanged.
      href: `${base}/bookings/${bookingId}`,
    },
  });

  // The HOST gets their own copy — a durable record of what they did and what it cost, so the fee is never
  // first discovered as an unexplained shortfall on a later payout. `side: "host"` routes both channels to
  // host-perspective copy (WR-04); `feeLabel` is present ONLY when a fee was actually charged — a "₱0 fee"
  // claim would invent a money event exactly the way CR-01's "₱0 refund" did.
  await emitNotify({
    type: "booking_cancelled_by_host",
    recipientId: row.hostId,
    bookingId,
    email: row.hostEmail,
    payload: {
      type: "booking_cancelled_by_host",
      listingTitle,
      whenLabel,
      refundLabel,
      side: "host",
      ...(feeCents > 0
        ? { feeLabel: formatMoney(feeCents, row.currency ?? DISPLAY_CURRENCY) }
        : {}),
      href: `${base}/host/bookings`,
    },
  });

  // D-121 — the SAME group consequence as the booker path. A host cancellation is the case where the
  // attendees are least likely to find out any other way, so omitting it here would be the worse of the
  // two omissions.
  await voidGroupAndNotifyAttendees(row, bookingId);

  revalidateCancelSurfaces(bookingId, row.listingId);
  return { ok: true, refundCents };
}
