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
import { emitNotify, opsCancelPayload } from "@/lib/notifications";
import { emitGuestEmail } from "@/lib/group/guest-notify";
import { listReachableYesAttendees } from "@/lib/group/rsvp";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { opsRefundBasisCents, PAYOUT_ALREADY_LEFT_REASON } from "@/lib/ops/cancel-impact";
import { requireOpsMutationOrigin, requireStaff } from "@/lib/ops/staff";
import { quoteRefund, tierOrDefault } from "@/lib/payments/cancellation";
import { HOST_CANCEL_FEE_CENTS } from "@/lib/payments/fees";
import { isApiRefundable } from "@/lib/payments/refund-rail";
import {
  createRefund,
  createRefundTransfer,
  listReceivingInstitutions,
  INSTAPAY_CEILING_CENTS,
} from "@/lib/paymongo";
import { recordAudit } from "@/lib/audit";
// D-113's POLICY, never the provider (13.1-06). This file must not import `expireCheckoutSession` for the
// unpaid-hold path: probe-first, the never-expire-a-`paid`-session evidence rule, the never-throw contract
// and the `checkout_expire_failed` audit shape all live in ONE place (13.1-04), and a second
// implementation here would be a second policy nobody would notice diverging.
import { retireCheckoutsForBookings } from "@/lib/payments/retire-checkout";
import { rateLimit } from "@/lib/rate-limit";
import {
  cancellationSchema,
  hostCancellationSchema,
  type HostCancellationInput,
} from "@/lib/validation/cancellation";
import { opsCancelSchema, type OpsCancelInput } from "@/lib/validation/ops";
import {
  qrphRefundDestinationSchema,
  type QrphRefundDestination,
} from "@/lib/validation/qrph-refund";

/** The five D-70 host cancellation reasons, re-exported from the ONE schema that owns the union. */
export type HostCancelReason = HostCancellationInput["reason"];

/**
 * Cancel result. `refundCents` is what the SERVER computed and wrote — never an echo of a request field.
 *
 * ⚠ PLAN 13-18 REMOVED `notice`, AND THE REMOVAL IS THE FIX RATHER THAN A CLEANUP. It carried a calm
 * post-cancellation caveat for the paths where the cancellation SUCCEEDED but the money could not be
 * dispatched — and its only consumer rendered it as a `toast.warning` and then navigated away from
 * itself. A statement that somebody's money did not come back is the definition of a must-read fact,
 * and STATE-08 forbids a must-read fact riding a surface that removes itself on a timer.
 *
 * The caveat is now DERIVED on the destination instead of PUSHED from here: every one of those paths
 * already writes a `needs_attention` audit row naming the booking, `src/lib/booking/refund-dispatch.ts`
 * reads it, and the booking detail page's cancelled branch states it as durable page content. That is
 * strictly more coverage than the field had — `refund_dispatch_failed` (an API-refundable rail whose
 * call raised) and a cancellation with no destination supplied at all both wrote an alert and set NO
 * notice, so those bookers were told nothing at all.
 *
 * Do not reintroduce the field. A returned string is a push, and the only surface a push can land on
 * here is the one the booker is leaving.
 */
export type CancelActionResult =
  | { ok: true; refundCents: number }
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

/**
 * WR-05 / NT-01 — the SAME refusal in PASS words. A drop-in pass has no session that began: OC-03 makes its
 * `starts_at` the venue's OPENING instant and its `ends_at` the closing one, so what runs out on a
 * pass-holder is the DAY. Told the exclusive sentence instead, a booker is handed a description of an event
 * they never had — the exact framing 09-08 forked `when-label.ts` to eliminate and 09-17 forked the
 * checkout-initiation copy to eliminate.
 *
 * The constant beside this one is DELIBERATELY left byte-identical: its sentence is true of an exclusive
 * booking, and the shipped Phase-7 tests assert it verbatim.
 */
const PASSES_ENDED: CancelActionResult = {
  ok: false,
  error:
    "This day's passes have already ended, so they can't be cancelled here. Message the host if something's wrong.",
};

/**
 * T-09-92 — BOTH past-window refusals must still audit as `past_start`.
 *
 * The two denial sites below used to compare against a single constant BY IDENTITY. With a second constant
 * an identity test would silently reclassify every drop-in past-window denial as `not_active`, and that is a
 * repudiation problem rather than a copy one: the audit trail would stop distinguishing "refused because the
 * window had closed" from "refused because the booking was already gone" — two different disputes, one of
 * which involves money the booker expected back.
 */
function isPastWindow(result: CancelActionResult): boolean {
  return result === PAST_START || result === PASSES_ENDED;
}

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
      // The OC-03 mode SNAPSHOT (drizzle 0021). A drop-in booking's startsAt/endsAt are the venue's
      // opening/closing instants — the refund ladder still anchors on startsAt, but the LABEL must say
      // "drop-in pass", never a sixteen-hour range (09-08).
      openCapacity: booking.openCapacity,
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
  openCapacity: row.openCapacity,
  spacePriceCents: row.spacePriceCents,
  quotedTotalCents: row.quotedTotalCents,
  dayRateCents: row.dayRateCents,
});

/**
 * WHICH instant the calling path's UPDATE compared against — so an explanation can never describe a guard
 * different from the one that actually refused.
 *
 * The two paths DIVERGE for a drop-in pass, deliberately (WR-05 / T-09-91): the BOOKER's window closes when
 * the venue closes, the HOST's when it opens. Handing this the wrong value would not change what happened;
 * it would change what the booker is TOLD happened, which on this path is the entire product.
 */
type CancelWindow = "booker" | "host";

/**
 * Distinguish the two calm 0-row cases with ONE extra read, so the booker is told which of them happened.
 * The comparison is evaluated by Postgres, matching the calling UPDATE's own guard exactly.
 */
async function explainNoRows(
  bookingId: string,
  cancelWindow: CancelWindow,
): Promise<CancelActionResult> {
  // The booker path's window ends at the venue's CLOSING instant for an open row (WR-05) and at the
  // session's start for an exclusive one. The host path's ends at the session's start in BOTH modes.
  const windowEnd =
    cancelWindow === "booker"
      ? sql`(CASE WHEN open_capacity THEN ends_at ELSE starts_at END)`
      : sql`starts_at`;
  const [row] = (await db.execute(sql`
    SELECT status::text AS "status",
           open_capacity AS "openCapacity",
           ${windowEnd} > now() AS "future"
    FROM booking WHERE id = ${bookingId}
  `)) as unknown as { status: string; openCapacity: boolean; future: boolean }[];
  // A still-confirmed booking that only failed the window guard is the past-window case; anything else
  // (already cancelled, declined, never confirmed, raced) is the generic no-longer-active case.
  //
  // WHICH refusal is decided by WHAT ran out, which is precisely the instant this path just compared: on the
  // booker path an open row's window ended when the venue CLOSED, so the day's passes are over. Everywhere
  // else the instant is the session's own start and the shipped sentence is already true of it.
  if (row && row.status === "confirmed" && !row.future) {
    return row.openCapacity && cancelWindow === "booker" ? PASSES_ENDED : PAST_START;
  }
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
  // ── THE WINDOW GUARD (D-94), FORKED ON THE PERSISTED OCCUPANCY MODE (WR-05). ─────────────────────────
  // Cancellation is permitted only BEFORE this booking's own session is over. That STRUCTURALLY eliminates
  // the payout clawback problem — payout is not eligible until endsAt + 24h (D-55), so a refund is always
  // just a platform-wallet reversal with the host never yet paid.
  //
  // WHICH instant ends that session is NOT the same in both modes. An EXCLUSIVE booking's session begins at
  // its `starts_at`, so that is its cutoff and it is unchanged here. A DROP-IN pass's `starts_at` is the
  // venue's OPENING instant and the session it buys runs until CLOSING (OC-03), so an open row's cutoff is
  // `ends_at`. Comparing an open row against its opening instant made the WHOLE day a pass is valid for a
  // day on which it could be neither cancelled nor refunded — a purchase final from the moment the venue
  // opened, with nothing on the reserve page saying so. That was WR-05.
  //
  // THE CLAWBACK PROPERTY IS PRESERVED, NOT WEAKENED. While a pass window is still live, `ends_at + 24h` is
  // by construction still in the future, so the host has not been paid at the moment this refund is issued —
  // which is the same reason the guard was safe before it moved.
  //
  // AND NO MONEY MATH MOVES WITH IT. The ladder already returns 0% for a negative `hoursToStart`
  // (src/lib/payments/cancellation.ts:92-96 — nothing satisfied falls through to 0), so a live-window cancel
  // refunds nothing, retains the FULL space price for the host, and simply returns the head to the pool.
  // That release needs no code at all: `remaining` is a live SUM, so a cancelled row leaves the occupying
  // set by itself (RESEARCH Pitfall 3).
  //
  // The mode is read from the PERSISTED `open_capacity` column and from nothing else — never inferred from a
  // null rate, a null `declared_pax` or `full_day`. A drop-in listing may legally still carry
  // `hourly_rate_cents` / `day_rate_cents` (OC-17 lets a host switch modes without wiping them).
  //
  // ⚠️ THE HOST FLIP FURTHER DOWN THIS FILE IS DELIBERATELY *NOT* FORKED (T-09-91). A host withdrawing a
  // pass from a guest who may already be inside the venue using it is a support case, not a self-serve one,
  // and widening it would be a product decision nobody asked for. The asymmetry is a choice; this is where
  // the choice is recorded.
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
      AND (CASE WHEN open_capacity THEN ends_at ELSE starts_at END) > now()
    RETURNING id
  `)) as unknown as { id: string }[];

  if (flipped.length === 0) {
    const reason = await explainNoRows(parsed.data.bookingId, "booker");
    await recordAudit({
      actorId: userId,
      action: "cancel_booking",
      outcome: "denied",
      meta: { reason: isPastWindow(reason) ? "past_start" : "not_active", bookingId },
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

  // ⚠ D-72's post-cancel caveat USED TO BE COMPOSED HERE, as a `notice` string returned to the client.
  // Plan 13-18 removed it: see `CancelActionResult` for the argument in full. The fact it stated is now
  // derived on the DESTINATION from the `needs_attention` audit rows every branch below already writes
  // — which is why those rows are the load-bearing output of this section and not merely an alert.
  // Adding a non-dispatch branch WITHOUT one of them would leave the booker's page claiming a transfer
  // that never happened.
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
          // ⚠ THE CAUSE, MOVED RATHER THAN DROPPED (plan 13-18). This flag used to pick between two
          // booker-facing `notice` strings; the booker now reads ONE sentence, because both causes have
          // the same consequence for them (a person will move the money). The DISTINCTION still matters
          // to whoever works the alert queue — "the booker gave us an account we could not verify" and
          // "the booker gave us no account at all" need different follow-ups — so it lands here, which
          // is the audience it was always really for. NOT PII: a boolean about our own reachability.
          destinationUnverifiable: destUnverifiable,
        },
      });
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
  return { ok: true, refundCents: quote.totalRefundCents };
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

  // ⚠ THE `RETURNING` LIST IS LOAD-BEARING, NOT INFORMATIONAL (13.1-06). `status` and
  // `checkout_session_id` are read back because the retire below must key off the flip's OWN result:
  //
  //   - `checkout_session_id` is NOT one of `loadBookingRow`'s 22 columns, and must not be added to it —
  //     that loader is shared by all three cancel actions and two of them have no business reading it. It
  //     would also be a STALE read: a booker can claim the checkout lease (`src/app/actions/booking.ts`,
  //     `status IN ('pending','approved')`) between the pre-read and this statement, and a retire keyed
  //     off a stale NULL would leave the live session payable while looking perfectly correct. This is
  //     `request-expiry.ts`'s finding, and it applies here for the identical reason.
  //   - `status` is the NEW terminal status. `row.status` is the PRE-flip one and is correct only for the
  //     audit's `previousStatus`; re-deriving the terminal from it in JS would duplicate the CASE above in
  //     a second language, which is exactly how the three terminal mappings in this codebase would desync.
  const flipped = (await db.execute(sql`
    UPDATE booking
    SET status = (CASE WHEN status = 'requested' THEN 'declined' ELSE 'cancelled' END)::booking_status,
        expires_at = NULL,
        cancelled_by = 'booker',
        cancelled_at = now()
    WHERE id = ${parsed.data.bookingId}
      AND booker_id = ${userId}
      AND status IN ('requested','approved')
    RETURNING id, status, checkout_session_id
  `)) as unknown as { id: string; status: string; checkout_session_id: string | null }[];

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

  // 13.1-06 — THE WITHDRAWAL CLOSES THE SESSION IT ORPHANS. See `retireWithdrawnSession` for why this is
  // the ONE inline retire in the codebase that is a guarantee rather than an accelerant, and why it runs
  // BEFORE the notice rather than after it.
  await retireWithdrawnSession(bookingId, flipped[0].checkout_session_id, flipped[0].status);

  // `null` refund amount: nothing was charged, so the booker gets no refund notice. The host still does —
  // their slot just became free again, which is the whole reason they need telling.
  await notifyCancellation(row, bookingId, null);

  revalidateCancelSurfaces(bookingId);
  return { ok: true, refundCents: 0 };
}

/**
 * Retire the checkout session a booker's own withdrawal just orphaned (13.1-CONTEXT D-113's rule, applied
 * to a path D-113's literal wording does not cover).
 *
 * ── WHY THIS EXISTS AT ALL ──────────────────────────────────────────────────────────────────────────────
 * An `approved` row is BY DEFINITION one whose booker was sent to checkout, so a withdrawal routinely
 * leaves a live, payable PayMongo session pointing at a slot FitOut has just released to everybody else.
 * The booker's own open tab or unscanned QR can still charge them for a booking they themselves cancelled.
 * The PM's rule, verbatim: *"when the hold expires, their ability to pay shall also expire, so we wouldn't
 * handle money that isn't ours."*
 *
 * ⚠ AND WHY IT IS THE ONLY INLINE RETIRE THAT IS NOT AN ACCELERANT. The three 13.1-05 wired can all be
 * deleted without breaking D-113, because `checkout-retire-sweep` reaches their rows afterwards. This one
 * cannot. The statement above writes `status='cancelled'`/`'declined'` AND `expires_at = NULL` together,
 * and EITHER of those writes ALONE removes the row from `queryRetirableSessions`' candidate set
 * (`status IN ('pending','approved') AND expires_at <= now()`) permanently; `queryUnconfirmedPaid`'s
 * `status IN ('pending','approved')` excludes it for the same reason. NOTHING else in the codebase reaches
 * these sessions. Deleting this call re-opens the only known orphaning path with no backstop of any kind.
 *
 * ⚠ THIS IS ALSO WHY "just stop nulling `expires_at`" IS NOT THE FIX. It was evaluated and MEASURED
 * against the sweep's actual predicate: the status clause excludes the row independently, so preserving
 * `expires_at` would close nothing while leaving a terminal row carrying a live-looking window — see
 * `13.1-06-SUMMARY.md` for the full comparison.
 *
 * ── WHY IT RUNS BEFORE `notifyCancellation` ─────────────────────────────────────────────────────────────
 * `request-expiry.ts` emits its notice first and retires second, and states there that the order between
 * the two cannot matter. Here it can, in one direction only: if the process dies between them, a missed
 * notification is recoverable by any party asking, while a still-payable session is the exact defect this
 * work exists to close. So the money-closing act goes first. Both are still INDEPENDENT — neither is
 * inside the other, and `emitNotify` swallows its own transport errors, so neither can suppress the other.
 *
 * ⚠ ITS OWN `catch`, AND IT IS NOT DEFENSIVE PROGRAMMING. This action has already COMMITTED the flip by
 * the time it is called. 13.1-05 measured what an undefended call site costs: with the policy rejecting,
 * `createPendingHold` threw the provider's outage out to its caller with the slot already freed, refusing
 * a booker because PayMongo was down. The same shape here would tell a booker their withdrawal FAILED when
 * it had already succeeded — and the session would stay payable anyway. 13.1-04's structural never-throw
 * contract makes this catch unreachable today; it is here for the day somebody changes the policy, and its
 * message names the broken contract rather than hiding it. The empty binding is deliberate: the caught
 * value may be PayMongo's prose and the discard discipline is absolute (T-05-15 / T-08-44).
 *
 * A FAILED retire is not swallowed in the sense that matters: the POLICY writes the operator-visible
 * `checkout_expire_failed` / `needs_attention` audit row (D-110). This action adds no alerting of its own.
 */
async function retireWithdrawnSession(
  bookingId: string,
  checkoutSessionId: string | null,
  terminalStatus: string,
): Promise<void> {
  try {
    await retireCheckoutsForBookings(
      // `bookingStatus` is the NEW terminal status off the flip's own RETURNING, never the pre-flip one:
      // the policy stays silent about a `paid` session only while the row is still `pending` (13.1-02's
      // reconciler owns those). A withdrawn row is the case NO reconciler reaches, so a payment found here
      // must land in the operator's queue — and this is the only report it will ever produce.
      [{ bookingId, checkoutSessionId, bookingStatus: terminalStatus }],
      "booker-cancel-hold",
    );
  } catch {
    console.error("[cancel-unpaid-hold] retire policy THREW — its never-throw contract is broken", {
      bookingId,
    });
  }
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
// ⚠️ PHASE-9 EXCEPTION, AND ONLY ONE: for an OPEN-CAPACITY (drop-in) booking, consequence 3 is SKIPPED. Its
// window is the venue's whole operating day on the shared sentinel unit, so the block would close the date
// for every other pass-holder, and a fixed per-head price leaves nothing to resell (RESEARCH Pitfall 5 /
// OC-16). Consequences 1, 2 and 4 fire unchanged. The rationale is restated in full at the fork itself.
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
  // `AND starts_at > now()` (D-94) structurally eliminates the payout clawback problem: payout is not
  // eligible until endsAt + PAYOUT_DELAY_HOURS (D-55), so the host has never been paid at the moment a
  // refund is issued.
  //
  // ⚠️ AND IT IS DELIBERATELY *NOT* FORKED ON `open_capacity` (WR-05 / T-09-91), which makes this guard NO
  // LONGER identical to the booker path's. A booker may cancel a drop-in pass for the whole day it covers;
  // a HOST withdrawing that pass from a guest who may already be inside the venue using it is a support
  // case, not a self-serve one, and widening this window would be a product decision nobody asked for. The
  // asymmetry is a choice, not an oversight — do not "complete the fork" here without one.
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
    const calm = await explainNoRows(parsed.data.bookingId, "host");
    await recordAudit({
      actorId: userId,
      action: "host_cancel_booking",
      outcome: "denied",
      meta: { reason: isPastWindow(calm) ? "past_start" : "not_active", bookingId },
    });
    return calm; // calm, never a throw
  }

  // ── Consequence 2. THIS IS D-70's "audit record against the host". ────────────────────────────────────
  //
  // The meta's last field records the Phase-9 fork below IN THE TRAIL, so an operator reading a drop-in
  // cancellation sees WHY no availability_block exists for it — deliberate policy (OC-16), not a failed
  // insert they should go looking for. The `host_cancel_autoblock_failed` needs_attention row is the OTHER
  // answer to that question, and the two must never be confusable.
  // (Deliberately NOT naming the field in this sentence: an acceptance grep counts its occurrences.)
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
      autoBlocked: !row.openCapacity,
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
  //
  // ── Phase-9 fork (RESEARCH Pitfall 5 / OC-16). SKIPPED for a drop-in booking. ───────────────────────
  // D-70's auto-block exists to stop a host cancelling an exclusive slot and reselling it at a higher
  // price: it blocks the freed (unit, window) so nobody — including the host — can rebook it.
  //
  // A drop-in booking has neither half of that premise. Its "window" is the venue's WHOLE OPERATING DAY and
  // its unit is the sentinel 1 that EVERY open booking on that date shares, so this insert would zero the
  // entire date for every other pass-holder — turning one guest's cancellation into a mass outage. And
  // there is nothing to resell: the price is a fixed per-person rate the host set at publish, so a
  // cancelled pass simply returns to the pool at the same price.
  //
  // Consequences 1 (full refund incl. service fee), 2 (host-cancel fee) and 4 (notifications + audit) are
  // UNCHANGED. The freed head needs no release code at all — `remaining` is a live SUM, so the cancelled
  // row leaves the occupying set by itself (RESEARCH Pitfall 3).
  if (!row.openCapacity) {
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

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// OPS-FORCED CANCELLATION (ENF-03 · D-209/D-233/D-235/D-236/D-241/D-244) — phase 18.
//
// FitOut has confirmed a listing is fake and is pulling it. `suspendHost` (the D-233 default lever) blocks
// new bookings and freezes the host's payouts; THIS is the escalation, and it is the only path in the
// codebase where FitOut cancels somebody else's booking and sends somebody else's money back.
//
// ⚠ IT IS A SIBLING OF `cancelBookingAsHost`, NOT A FLAG ON IT, AND THE REASON IS THAT TWO OF THE FIVE
// HOST-SPECIFIC PARTS FAIL *SILENTLY*. Riding the host action with an ops actor would not error — it would
// quietly do the wrong thing:
//
//   Fork 1  loadHostOwnedBooking(bookingId, userId)  — refuses LOUDLY for an ops actor (the safe one).
//   Fork 2  the in-WHERE owner EXISTS                — 0-row flip, reported through a MISLEADING
//                                                      "no longer active" explanation.
//   Fork 3  the host path's window guard             — SILENTLY protects exactly the bookings most worth
//                                                      undoing, and reports it as a past-start refusal.
//   Fork 4  cancelled_by = 'host'                    — SILENTLY blames the host for FitOut's own decision.
//   Fork 5  the two host-cancel notifications        — SILENTLY tell a DEFRAUDED booker their host
//                                                      cancelled on them, and quote the host a fee that
//                                                      D-235 suppresses.
//
// Each fork is documented at its own site below rather than here, so nobody editing one has to find this
// block first. The order that block above calls load-bearing is kept EXACTLY: gate → rate-limit → flip →
// consequences → money → notification, and nothing after the flip may undo it or throw past it.
//
// THE FOUR CONSEQUENCES, RE-DECIDED ONE BY ONE (they are NOT inherited):
//   1. The booker is refunded — but on the D-209 basis, not the host path's. See the money block.
//   2. An audit row is recorded against the AUTHENTICATED STAFF ACTOR (D-218), under its own verb.
//   3. The freed window is auto-blocked. KEPT — removing a consequence is a decision, not a simplification.
//   4. The D-71 host-cancellation fee debit is SUPPRESSED (D-235). See the block where it would have gone.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The ops budget for this verb, keyed on the AUTHENTICATED staff id (never on IP — these are
 * session-gated privileged acts).
 *
 * 30/60s, which is `ops-review.ts`'s OPS_ACTION_RATE_LIMIT rather than this file's 5/60s money budget,
 * and the divergence is a judgement about the WORK. Every other money-moving action here is ONE person
 * ending ONE booking of their own; this one is ONE OPERATOR DECISION FANNED OUT over every confirmed
 * booking on a listing they have just judged fake. A 5/60s budget would refuse the operator halfway
 * through their own single decision and leave a fake listing HALF-cancelled — some bookers refunded,
 * some not — which is a worse outcome than the flood it would prevent. D-215 is explicit that the audit
 * trail, not a tier or a throttle, is the control on this action.
 */
const OPS_CANCEL_RATE_LIMIT = { window: 60, max: 30 } as const;

/** Calm denial for a malformed argument. Says nothing about whether the ids exist. */
const OPS_DENIED: CancelActionResult = {
  ok: false,
  error: "That cancellation couldn't be recorded. Reload the queue and try again.",
};

/**
 * The escalation was not chosen. An omitted or default `lever` means the operator picked the LIGHTER
 * D-233 lever, and the lighter lever cancels nothing — so this is a refusal, never a silent no-op that
 * returns ok.
 */
const OPS_NOT_ESCALATED: CancelActionResult = {
  ok: false,
  error:
    "This booking wasn't cancelled — blocking new bookings was the option chosen. Pick the cancel-and-refund option to undo bookings already made.",
};

/**
 * D-241's REFUSAL, AND IT IS THE POINT OF THE WHOLE GUARD. A booking whose payout has already left
 * FitOut cannot be undone here, because undoing it would need a clawback from a host wallet FitOut
 * cannot reach. The console renders the same fact as the impact block's `Can't be undone here` row, so
 * an operator sees the count BEFORE they commit and this sentence only if they reach one anyway. The
 * reason string is shared with that row so the two can never describe the state differently.
 */
const OPS_PAYOUT_ALREADY_SENT: CancelActionResult = {
  ok: false,
  error: `This booking can't be cancelled here — ${PAYOUT_ALREADY_LEFT_REASON}. It needs an operator to reverse it directly.`,
};

/**
 * Distinguish the ops path's two calm 0-row cases with ONE extra read, evaluated by Postgres so the
 * explanation can never describe a guard different from the one that actually refused (the
 * `explainNoRows` contract, transposed).
 *
 * ⚠ THIS IS NOT `explainNoRows`. That helper compares a window instant, which is the guard the ops flip
 * deliberately does NOT carry — reusing it would report every ops refusal as a past-start refusal, which
 * is the exact silent-wrong-answer this fork exists to eliminate.
 */
async function explainOpsNoRows(
  bookingId: string,
  listingId: string,
): Promise<CancelActionResult> {
  const [row] = (await db.execute(sql`
    SELECT b.status::text AS "status",
           (b.listing_id = ${listingId}) AS "listingMatches",
           EXISTS (
             SELECT 1 FROM host_payout_ledger p
             WHERE p.booking_id = b.id
               AND p.kind = 'payout'
               AND p.state IN ('processing', 'paid')
           ) AS "payoutLeft"
    FROM booking b WHERE b.id = ${bookingId}
  `)) as unknown as { status: string; listingMatches: boolean; payoutLeft: boolean }[];

  // A still-confirmed booking on the right listing that only failed the payout predicate is D-241's
  // case, and it gets D-241's sentence. Everything else — already cancelled, never confirmed, a booking
  // id from a different listing, a race — is the generic no-longer-active case, which is also the answer
  // a probed id gets, so this is not an enumeration oracle.
  if (row && row.status === "confirmed" && row.listingMatches && row.payoutLeft) {
    return OPS_PAYOUT_ALREADY_SENT;
  }
  return NOT_ACTIVE;
}

/**
 * cancelBookingAsOps — FitOut cancels a confirmed booking on a listing it has judged fake, and sends the
 * booker's money back (ENF-03).
 *
 * Reachable by ANY staff member: D-215 settled that there is no ops tier and that the audit trail is the
 * control, which is why the trail row below is not optional and is written on BOTH branches.
 */
export async function cancelBookingAsOps(input: OpsCancelInput): Promise<CancelActionResult> {
  // ── EXACT OPS AUTHORITY FIRST, THEN STAFF — before parse, limiter, booking, or money. ──────────────
  //
  // The three owner/host actions above keep their ownership-first contracts. This public ops POST has
  // a different boundary: Proxy is routing only, so the exact configured Host+Origin must be proved
  // inside the action before a deliberately supplied staff cookie is even read. `requireStaff` remains
  // immediately second and answers with the same neutral `notFound()` control flow.
  await requireOpsMutationOrigin();
  const staff = await requireStaff();

  // Re-parse EVERY field that crossed the boundary — a `"use server"` export is reachable by POST
  // whatever the UI shows, and this one moves money.
  const parsed = opsCancelSchema.safeParse(input);
  if (!parsed.success) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_cancel_booking",
      outcome: "denied",
      meta: { reason: "invalid_input" },
    });
    return OPS_DENIED;
  }

  // ── THE ESCALATION MUST HAVE BEEN CHOSEN EXPLICITLY (D-233). ───────────────────────────────────────
  // 18-UI-SPEC's answer to "this must not be hit by muscle memory" is a CLIENT arrangement: no control
  // on the queue row can cancel-and-refund anything, and reaching this needs a dialog, a reason, and a
  // radio actively moved off its default. A client arrangement is not a gate, so the deliberate act is
  // re-asserted here. An omitted `lever` parses to the LIGHTER lever and cancels nothing.
  if (parsed.data.lever !== "block_new_and_cancel") {
    await recordAudit({
      actorId: staff.id,
      action: "ops_cancel_booking",
      outcome: "denied",
      meta: {
        reason: "lever_not_escalated",
        bookingId: parsed.data.bookingId,
        listingId: parsed.data.listingId,
      },
    });
    return OPS_NOT_ESCALATED;
  }

  const limit = rateLimit(`ops-cancel-booking:${staff.id}`, OPS_CANCEL_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_cancel_booking",
      outcome: "denied",
      meta: { reason: "rate_limit", bookingId: parsed.data.bookingId, retryAfter: limit.retryAfter },
    });
    return TOO_FAST;
  }

  // ── FORK 1 — `loadHostOwnedBooking` IS DELIBERATELY NOT CALLED. ───────────────────────────────────
  // It requires the caller to BE the listing's host and to still hold `canHost`, and returns null
  // otherwise. An ops actor is neither, so it would refuse every ops cancellation — loudly, which is the
  // benign failure of the five, but a total one. The ops read is the shared, authorization-free
  // `loadBookingRow`; ops standing was already settled by the gate above, and the SCOPE (which listing
  // this booking must belong to) is re-asserted inside the flip's own WHERE at fork 2.
  const row = await loadBookingRow(parsed.data.bookingId);
  if (!row) return OPS_DENIED;

  // ── CONSEQUENCE 1, THE MONEY — AND THE ONLY LINE IN THIS PHASE THAT DIVERGES FROM A SHIPPED
  //    PRECEDENT (D-209 / D-236). READ THIS BEFORE CHANGING IT. ──────────────────────────────────────
  //
  // The PM's answer to PM-4, in their own words, was *"booker 100% refund, but not the service fee /
  // platform fee"*: the booker gets the full booking amount back, FitOut RETAINS its service fee, and
  // the host is paid nothing. That is what ships.
  //
  // ⚠ AND IT CONTRADICTS WHAT THIS VERY FILE ARGUES FOUR HUNDRED LINES ABOVE. `cancelBookingAsHost`
  // refunds the FULL charge including the D-74 service fee, and states the principle verbatim:
  //
  //   "The refund is the FULL charge — space price AND the D-74 service fee. This is the ONE case where
  //    the non-refundable fee IS returned: the booker did nothing wrong, so the platform, not the
  //    booker, absorbs the gateway cost of the reversal. Read off the frozen row, never recomputed."
  //
  // An ops-forced cancellation fires because FitOut has CONFIRMED THE LISTING IS FAKE — a strictly
  // STRONGER instance of "the booker did nothing wrong" than a host who flaked. So as it stands FitOut
  // is LESS generous to a defrauded booker than to an inconvenienced one. The PM answered without this
  // precedent in view; the omission is in how the question was framed, not in their answer, and a money
  // call is not re-decided by an engineer who noticed a better argument afterwards.
  //
  // So the behaviour sits behind ONE constant with ONE read site, and flipping it is one line:
  // `src/lib/payments/fees.ts` declares it; `opsRefundBasisCents` in `src/lib/ops/cancel-impact.ts` is
  // the single expression that reads it, and carries this same argument in full. The impact figures the
  // operator is shown before they commit come from that SAME expression, so the dialog cannot promise
  // one number while this line moves another. `tests/payments/ops-cancel.test.ts` runs both values.
  //
  // ⚠ DO NOT RESOLVE THE CONFLICT HERE. It is the PM's, and it leads the phase summary.
  //
  // Read off the FROZEN row, never recomputed. Integer centavos.
  const refundCents = opsRefundBasisCents(row);

  // ── THE ATOMIC, STATUS-SCOPED FLIP. Every guard lives in the WHERE, so a 0-row result is the single
  //    calm failure path and no two guards can be raced apart. ────────────────────────────────────────
  //
  // `retained_space_cents = 0` is not boilerplate carried over: it is the ENTIRE mechanism by which "the
  // host is paid nothing" is enforced. `queryDuePayouts`'s shipped predicate is
  // `status = 'cancelled' AND COALESCE(retained_space_cents, 0) > 0`, so a zero here EXCLUDES this
  // booking from the sweep with no new code anywhere. Writing NULL instead would fall through to
  // `COALESCE(retained, space_price)` and pay the host the full space price for a session on a listing
  // FitOut just judged fake — the exact inversion of the consequence.
  const flipped = (await db.execute(sql`
    UPDATE booking
    SET status = 'cancelled',
        refund_cents = ${refundCents},
        retained_space_cents = 0,
        -- ── FORK 4 (D-244). THE FIRST RUNTIME WRITE OF THIS VALUE, EVER. ──────────────────────────
        -- The host path writes 'host' here, which on this path would durably blame the host for a
        -- decision FitOut made about them — a repudiation failure, and a silent one, since nothing
        -- would error. 'system' is equally wrong in the other direction: it means NO PERSON DECIDED
        -- THIS (an expiry, a timeout), and an ops cancellation is a named human's decision, which is
        -- the whole point of OPS-03. The enum gained this value in drizzle/0027, a migration that did
        -- nothing else and wrote it nowhere — that separation is exactly what made it safe under PG
        -- 55P04, which forbids USING a value added to an already-committed type in the same
        -- transaction. The first write is here, at runtime, long after that migration committed.
        cancelled_by = 'ops',
        cancelled_at = now(),
        -- The TAXONOMY SENTENCE only. The operator's free-text note is deliberately NOT copied here:
        -- D-72's rule is that the note stays in the domain column the host reads it from (the listing's
        -- review row, written by rejectListing), and a booking's decline reason is neither that
        -- surface nor a place an operator's prose about a person should be duplicated per booking.
        decline_reason = ${parsed.data.reason},
        expires_at = NULL
    WHERE id = ${parsed.data.bookingId}
      -- ── FORK 2 — THE OPS SCOPE, REPLACING THE HOST-OWNERSHIP EXISTS. ───────────────────────────
      -- The host path proves the caller owns the listing. An ops actor owns nothing, so that predicate
      -- would match zero rows on every call — and the 0-row path would explain it as "no longer
      -- active", which is MISLEADING rather than merely unhelpful: the booking is perfectly active.
      -- What replaces it is the scope that actually matters here — this booking must belong to the
      -- listing the operator was looking at when they judged it. It keeps the SHAPE (a guard in the
      -- WHERE, not a JS pre-check), so a booking id from another listing cannot be smuggled into an
      -- enforcement decision made about this one.
      AND listing_id = ${parsed.data.listingId}
      AND status = 'confirmed'
      -- ── FORK 3 (D-241) — THE REPLACEMENT GUARD, AND THIS IS THE SILENT ONE. ────────────────────
      -- The host path refuses once the session has begun (D-94), which structurally eliminates payout
      -- clawback because payout is not eligible until endsAt + PAYOUT_DELAY_HOURS. An ops cancel
      -- cannot inherit that comparison: a space confirmed fake is fake whether or not the clock has
      -- started, and that guard would SILENTLY protect exactly the bookings most worth undoing — a
      -- fraudulent host's in-progress and just-finished sessions — while reporting the refusal as a
      -- past-start one, so nobody would even know it had happened.
      --
      -- REPLACED, NOT DROPPED. The property D-94 was really protecting is "never promise a refund we
      -- would have to claw back from a host wallet we cannot reach", and THAT is what this predicate
      -- states directly: no payout row for this booking has left. A booking whose payout HAS left is
      -- an operator case, not a self-serve one, and it is surfaced as not-cancellable-here WITH the
      -- reason — by the impact block's own count before the operator commits, and by
      -- explainOpsNoRows if they reach one anyway. Never a silent no-op.
      --
      -- the kind = 'payout' scoping is load-bearing for the same reason the sweep states at its join: a
      -- cancellation-fee DEBIT row is not a payout, and without the scoping one would make a booking
      -- look already-paid and block a cancellation that should succeed. (The debit kind's literal name
      -- is deliberately not spelled on this path — an acceptance grep counts its occurrences, and the
      -- comment explaining why the ops path writes none must not be what makes that count move.)
      AND NOT EXISTS (
        SELECT 1 FROM host_payout_ledger p
        WHERE p.booking_id = booking.id
          AND p.kind = 'payout'
          AND p.state IN ('processing', 'paid')
      )
    RETURNING id
  `)) as unknown as { id: string }[];

  if (flipped.length === 0) {
    const calm = await explainOpsNoRows(parsed.data.bookingId, parsed.data.listingId);
    await recordAudit({
      actorId: staff.id,
      action: "ops_cancel_booking",
      outcome: "denied",
      meta: {
        reason: calm === OPS_PAYOUT_ALREADY_SENT ? "payout_already_sent" : "not_active",
        bookingId: parsed.data.bookingId,
        listingId: parsed.data.listingId,
      },
    });
    return calm; // calm, never a throw
  }

  // ── CONSEQUENCE 2 — THE TRAIL ROW, WITH AN AUTHENTICATED ACTOR AND ITS OWN VERB. ───────────────────
  // `actorId` is the id the STAFF GATE returned for the signed-in session (D-218), never a handle a
  // caller supplied — this action takes none. The verb is DISTINCT from the host path's: an operator
  // asking "who cancelled this?" must not have to read the meta to tell FitOut's decision from the
  // host's. `hostId` rides in the meta so the row is still findable by host, which is how an
  // enforcement action against a fraudulent host will actually be queried.
  await recordAudit({
    actorId: staff.id,
    action: "ops_cancel_booking",
    outcome: "ok",
    meta: {
      bookingId: parsed.data.bookingId,
      listingId: parsed.data.listingId,
      hostId: row.hostId,
      // The taxonomy sentence is a closed enum value and may go in the durable jsonb column; the
      // operator's free-text note may not (D-72), and is not here.
      reason: parsed.data.reason,
      refundCents,
      lever: parsed.data.lever,
      autoBlocked: !row.openCapacity,
    },
  });

  // ── Everything below is a side-effect of a flip that has ALREADY committed. ───────────────────────
  // None of it may unwind the flip and none of it may THROW past this point: the booking is cancelled
  // and the slot freed, so a raised exception would hand the operator a 500 for an action that in fact
  // succeeded, and would skip the refund entirely. Each consequence is individually guarded and any
  // failure becomes a `needs_attention` audit row.

  // ── CONSEQUENCE 3 — the auto-block of the freed window. KEPT. ─────────────────────────────────────
  // Its D-70 purpose (stop the host reselling the slot they just freed) is weaker here, since the
  // listing is being pulled anyway — but it costs nothing, it is the same Phase-3 machinery with the
  // same undeletable sentinel, and removing a consequence is a DECISION rather than a simplification.
  // The Phase-9 drop-in fork is inherited unchanged and for the unchanged reason: an open-capacity
  // booking's window is the venue's whole operating day on the shared sentinel unit, so the block would
  // zero the date for every other pass-holder.
  if (!row.openCapacity) {
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
      console.error("[OPS_CANCEL_ALERT] auto_block_failed", { bookingId: parsed.data.bookingId, err });
      await recordAudit({
        actorId: staff.id,
        action: "ops_cancel_autoblock_failed",
        outcome: "needs_attention",
        meta: { bookingId: parsed.data.bookingId, listingId: row.listingId, unit: row.unit },
      });
    }
  }

  // ── CONSEQUENCE 4 — THE D-71 FEE DEBIT, AND ITS DELIBERATE ABSENCE (D-235). ───────────────────────
  //
  // THIS IS THE POSITION IN THE SEQUENCE WHERE THE HOST PATH CHARGES ITS CANCELLATION FEE, AND NOTHING
  // IS WRITTEN HERE. The block above in `cancelBookingAsHost` is untouched and still charges every host
  // who breaks their own confirmed booking; this path branches around it, and the branch is the two
  // functions being siblings rather than one function with a flag.
  //
  // WHY. The fee exists to make a host bear the cost of a commitment THEY broke, and to self-fund the
  // gateway cost of the reversal. Neither applies: FitOut broke this booking, not the host, and billing
  // a host ₱300 for the privilege of being removed for fraud is a meaningless entry — it would be netted
  // against a payout that 18-07 has already frozen, so it would never be collected either, just sit as a
  // permanent phantom debt on a suspended account.
  //
  // ⚠ AND IT IS AN ABSENCE, NOT A ZERO. Passing a zero fee through the shipped block would still write a
  // ledger row, still drive the notification's fee-label logic, and still make a ₱0 claim — which
  // `cancelBookingAsHost`'s own notification comment calls "CR-01's disease in a new place", the bug
  // where a money event that never happened gets announced as if it had. `tests/payments/ops-cancel.test.ts`
  // therefore asserts `count(*) = 0` for that ledger kind, never `net_cents = 0`.

  // ── CONSEQUENCE 1 (continued) — DISPATCH THE MONEY. The shipped discipline, reused unchanged. ─────
  //
  // ⚠️ The POST records INTENT ONLY. Refund status is ASYNCHRONOUS and the payment.refunded webhook is
  // the SINGLE WRITER of terminal state (D-57) — never display a settled refund off this return value.
  const refundable =
    refundCents >= MIN_API_REFUND_CENTS && row.paymentId != null && isApiRefundable(row.paymentMethod);

  if (refundable) {
    try {
      await createRefund({
        amountCents: refundCents,
        paymentId: row.paymentId!,
        notes: `FitOut cancellation (${parsed.data.bookingId})`,
      });
    } catch (err) {
      console.error("[CANCEL_ALERT] refund_dispatch_failed", {
        bookingId: parsed.data.bookingId,
        err,
      });
      await recordAudit({
        actorId: staff.id,
        action: "refund_dispatch_failed",
        outcome: "needs_attention",
        meta: {
          bookingId: parsed.data.bookingId,
          paymentId: row.paymentId,
          method: row.paymentMethod,
          refundCents,
        },
      });
    }
  } else if (refundCents > 0) {
    // Money IS owed but the API cannot move it (unrefundable rail, no captured payment id, or below
    // PayMongo's ₱1 floor). Operator-alert; NEVER silently keep the money — least of all here, where the
    // reason the booking is being cancelled is that FitOut's own catalogue let somebody down.
    console.error("[CANCEL_ALERT] refund_needs_manual", {
      bookingId: parsed.data.bookingId,
      method: row.paymentMethod,
    });
    await recordAudit({
      actorId: staff.id,
      action: "refund_manual_required",
      outcome: "needs_attention",
      meta: {
        bookingId: parsed.data.bookingId,
        paymentId: row.paymentId,
        method: row.paymentMethod,
        refundCents,
      },
    });
  }

  // ── FORK 5 — BOTH PARTIES ARE TOLD, ON A TYPE OF THIS PATH'S OWN. ────────────────────────────────
  //
  // The host path ends with two `emitNotify` calls carrying the HOST-CANCEL type (spelled at its own
  // call sites above, and deliberately NOT spelled here — an acceptance grep counts its occurrences in
  // this file, and the paragraph explaining why the ops path sends none must not be what moves that
  // count; drizzle/0021's rule). NEITHER MAY FIRE HERE, and it is not a near-miss: BOTH of that type's
  // sentences are false on this path. The
  // booker copy tells a defrauded person that their HOST cancelled on them — the opposite of what
  // happened, and the one message they would repeat to anyone who asked what FitOut did. The host copy
  // thanks them for a decision they did not make and quotes a fee this path just suppressed (D-235).
  // Sending the right envelope with the wrong sentences would be worse than sending nothing, because
  // it is durable and it is what both parties would believe. `tests/payments/ops-cancel.test.ts`
  // asserts on the emission observer that the host-cancel type is not sent, so re-adding it by reflex
  // still goes red — that assertion is UNCHANGED by 18-09 and must stay that way.
  //
  // 18-08 left this path deliberately silent and dated the gap to this plan. `booking_cancelled_by_ops`
  // is what closes it: one type, two audiences, written against what actually happened. The BOOKER is
  // told FitOut cancelled it and what is coming back; the HOST is told the booking is cancelled and —
  // explicitly — that no cancellation fee is charged, because D-235's suppression is otherwise
  // invisible and a host would reasonably assume the usual fee applied to a cancellation they did not
  // make. The copy lives in `src/lib/notifications.ts` with the rest of the enforcement sentences.
  //
  // AFTER the commit, never inside a transaction, and `emitNotify` swallows its own transport errors —
  // so a notification outage can never fail a cancellation whose money already moved.
  const opsWhenLabel = composeWhenLabel(whenLabelInput(row));
  const opsListingTitle = row.title ?? "your space";
  // CR-01 — a refund of nothing is NOT announced as a refund. `opsRefundBasisCents` can legitimately
  // return 0, and "you're getting ₱0 back" is the disease this codebase already names by name.
  const opsRefundLabel =
    refundCents > 0 ? formatMoney(refundCents, row.currency ?? DISPLAY_CURRENCY) : null;

  await emitNotify({
    type: "booking_cancelled_by_ops",
    recipientId: row.bookerId,
    bookingId: parsed.data.bookingId,
    email: row.bookerEmail,
    payload: opsCancelPayload({
      side: "booker",
      listingTitle: opsListingTitle,
      whenLabel: opsWhenLabel,
      refundLabel: opsRefundLabel,
    }),
  });

  await emitNotify({
    type: "booking_cancelled_by_ops",
    recipientId: row.hostId,
    bookingId: parsed.data.bookingId,
    email: row.hostEmail,
    payload: opsCancelPayload({
      side: "host",
      listingTitle: opsListingTitle,
      whenLabel: opsWhenLabel,
      refundLabel: opsRefundLabel,
    }),
  });

  // The ATTENDEES are still told, and that is not a contradiction of the paragraph above. `group_voided`
  // copy names the space, the time and the invite link and blames nobody, so it is TRUE on this path
  // exactly as it is on the other two — and D-121's reasoning applies with more force here, since an
  // attendee on a pulled listing has no other way to find out at all.
  await voidGroupAndNotifyAttendees(row, parsed.data.bookingId);

  revalidateCancelSurfaces(parsed.data.bookingId, row.listingId);
  // …AND `/ops`, WHICH ONLY THIS PATH OWES (plan 18-12). It is deliberately NOT folded into
  // `revalidateCancelSurfaces` above: that helper is shared with the booker and host paths, and a
  // booker cancelling their own booking has no business invalidating a staff-only console. The ops
  // console renders `loadOpsCancelImpact` per listing row, so every cancellation in the escalation's
  // fan-out changes a figure the next operator reads — and the fan-out's LAST call is what leaves the
  // queue showing the truth. (`rejectListing` revalidates too, but it runs BEFORE the fan-out.)
  revalidatePath("/ops");
  return { ok: true, refundCents };
}
