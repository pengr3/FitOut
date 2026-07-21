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

import { eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing, user } from "@/lib/db/schema";
import { readDbNow } from "@/lib/booking/bookings-query";
import { composeWhenLabel, type WhenLabelInput } from "@/lib/booking/when-label";
import { emitNotify } from "@/lib/notifications";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { quoteRefund, tierOrDefault } from "@/lib/payments/cancellation";
import { isApiRefundable } from "@/lib/payments/refund-rail";
import { createRefund } from "@/lib/paymongo";
import { recordAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { cancellationSchema } from "@/lib/validation/cancellation";

/** Cancel result. `refundCents` is what the SERVER computed and wrote — never an echo of a request field. */
export type CancelActionResult = { ok: true; refundCents: number } | { ok: false; error: string };

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

type OwnedBooking = NonNullable<Awaited<ReturnType<typeof loadOwnedBooking>>>;

/**
 * Owner-gated load (T-07-48 / Security V4). Returns the booking ONLY if the signed-in user is its booker;
 * a missing row and a cross-user row both fall through to null and are therefore indistinguishable to the
 * caller. Everything the two cancel paths need — the frozen money split, the snapshotted tier, the payment
 * id and rail, the venue-local label inputs, and both parties' notification addresses — comes back in this
 * ONE read, so no branch below has to re-query and risk reading a row that changed underneath it.
 *
 * Timestamps arrive as real Dates here because this is a Drizzle `select()` and not a raw `execute()` —
 * see the RawBookingRow contract in bookings-query.ts for why that distinction matters.
 */
async function loadOwnedBooking(bookingId: string, userId: string) {
  const [row] = await db
    .select({
      id: booking.id,
      bookerId: booking.bookerId,
      listingId: booking.listingId,
      status: booking.status,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      // The D-67 creation-time tier SNAPSHOT. NEVER listing.cancellationPolicy (T-07-51).
      cancellationPolicy: booking.cancellationPolicy,
      // The D-74 frozen split. spacePriceCents is the ONLY refundable basis; the service fee never is.
      spacePriceCents: booking.spacePriceCents,
      serviceFeeCents: booking.serviceFeeCents,
      quotedTotalCents: booking.quotedTotalCents,
      currency: booking.currency,
      paymentId: booking.paymentId,
      paymentMethod: booking.paymentMethod,
      title: listing.title,
      timezone: listing.timezone,
      city: listing.city,
      hourlyRateCents: listing.hourlyRateCents,
      hostId: listing.hostId,
      hostEmail: hostUser.email,
      bookerEmail: bookerUser.email,
      bookerFirstName: bookerUser.firstName,
    })
    .from(booking)
    .innerJoin(listing, eq(booking.listingId, listing.id))
    .innerJoin(hostUser, eq(listing.hostId, hostUser.id))
    .innerJoin(bookerUser, eq(booking.bookerId, bookerUser.id))
    .where(eq(booking.id, bookingId));
  // Re-check ownership server-side (the route group is NOT the gate). Missing and not-mine both → null.
  if (!row || row.bookerId !== userId) return null;
  return row;
}

/** Project an owned booking onto the SHARED venue-local formatter's structural input (07-02). */
const whenLabelInput = (row: OwnedBooking): WhenLabelInput => ({
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  timezone: row.timezone,
  city: row.city,
  spacePriceCents: row.spacePriceCents,
  quotedTotalCents: row.quotedTotalCents,
  hourlyRateCents: row.hourlyRateCents,
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

/** Both sides are told, post-commit. Emission never blocks or fails the action (MANAGE-03). */
async function notifyCancellation(
  row: OwnedBooking,
  bookingId: string,
  refundLabel: string | null,
): Promise<void> {
  const whenLabel = composeWhenLabel(whenLabelInput(row));
  const listingTitle = row.title ?? "your space";
  const bookerLabel = row.bookerFirstName?.trim() || "A guest";

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
      href: "/host/bookings",
    },
  });

  // The BOOKER gets the refund figure in writing — but ONLY when money actually moved. An unpaid hold has
  // nothing to refund, and a "₱0 refunded" notice would invent an event that never happened.
  if (refundLabel !== null) {
    await emitNotify({
      type: "refund_issued",
      recipientId: row.bookerId,
      bookingId,
      email: row.bookerEmail,
      payload: {
        type: "refund_issued",
        listingTitle,
        whenLabel,
        refundLabel,
        href: `/bookings/${bookingId}`,
      },
    });
  }
}

/** The three surfaces a cancellation changes. Shared so the two paths can never revalidate different sets. */
function revalidateCancelSurfaces(bookingId: string): void {
  revalidatePath("/bookings");
  revalidatePath("/host/bookings");
  revalidatePath(`/bookings/${bookingId}`);
}

/**
 * cancelBookingAsBooker — cancel a PAID (`confirmed`) booking (BOOK-07 / PAY-06). The client sends ONLY a
 * booking id; the tier, the rung and every peso are derived server-side from the booking's own snapshot,
 * evaluated against the Postgres clock.
 *
 * The ORDER below is load-bearing: gate before rate-limit (so a stranger's id is denied without consuming
 * the owner's budget), rate-limit before any write, clock before quote, quote before flip, flip before
 * money, money before notification. Nothing after the flip may undo it.
 */
export async function cancelBookingAsBooker(bookingId: string): Promise<CancelActionResult> {
  // Re-validate the ONE field that crosses the boundary. A malformed id is a calm denial, not a 500.
  const parsed = cancellationSchema.safeParse({ bookingId });
  if (!parsed.success) return DENIED;

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
    // Money IS owed but the API cannot move it: an unrefundable rail (QRPh / UBP — Pitfall 1, and the rail
    // is unknown on a pre-07-09 row, which `isApiRefundable` correctly reads as unrefundable), no captured
    // payment id, or an amount below PayMongo's ₱1 floor. Operator-alert; never silently keep the money.
    //
    // ⚠️ THIS IS THE SINGLE DOCUMENTED SEAM FOR THE D-72 QRPh REFUND FORM (Plan 16). If the Plan-16
    // test-mode probe confirms QRPh is unrefundable, the collect-and-never-store bank-details form hangs
    // HERE, off this one branch. Do NOT build it now, and do NOT add a second branch for it elsewhere.
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
  }

  // AFTER the commit, never inside a transaction (this action opens none). `emitNotify` swallows its own
  // transport errors, so a notification outage can never fail a cancellation whose money already moved.
  await notifyCancellation(
    row,
    bookingId,
    formatMoney(quote.totalRefundCents, row.currency ?? DISPLAY_CURRENCY),
  );

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

  // `null` refund label: nothing was charged, so the booker gets no refund notice. The host still does —
  // their slot just became free again, which is the whole reason they need telling.
  await notifyCancellation(row, bookingId, null);

  revalidateCancelSurfaces(bookingId);
  return { ok: true, refundCents: 0 };
}
