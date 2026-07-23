"use server";

// D-97 one-click re-request on lapse (BOOK-07 / MANAGE-02) — the cheapest recovery from exactly the failure
// mode D-89 deliberately accepted.
//
// WHY THIS EXISTS AT ALL. D-82/D-87 chose a notification stack that is reliable but NOT unmissable (email +
// in-app, one reminder each, no SMS, no push). D-89 accepted that and made the payment window FORGIVING
// rather than fast, on the D-63 reasoning that a lapsed approval costs a slot and never money. This action is
// the other half of that bargain: when a lapse happens anyway, resubmitting the same window costs the booker
// one click — no re-picking a date, no re-navigating a calendar, nothing to re-enter.
//
// THE ONE STRUCTURAL RULE: a re-request INSERTS A NEW BOOKING ROW. It never flips a terminal booking back
// into a live status. See the comment on `createPendingHold` below — this is the whole correctness argument
// for the file and it is not negotiable.
//
// SECURITY CONTRACT (cloned from src/app/actions/host-requests.ts and cancel-booking.ts):
//   - SESSION: an authenticated session is required — a calm sign-in result otherwise.
//   - OWNERSHIP / IDOR (T-07-69 / Security V4): the source booking is loaded JOINED to its listing and
//     `booking.bookerId === session.user.id` is verified BEFORE any write. A MISSING row and a CROSS-USER row
//     return the SAME calm denial — byte for byte the string the cancel actions return — so a guessed or
//     leaked booking id is not an enumeration oracle in any direction.
//   - NO CLIENT-SUPPLIED TIME OR PRICE (T-07-70): the window is read off the STORED row and the price is
//     re-frozen inside `createPendingHold` from the listing's CURRENT rates. The action's entire input is one
//     booking id; there is deliberately no field in which a window, a rate or a total could arrive.
//   - LEAD-TIME + OCCUPANCY (T-07-70 / T-07-71): both are re-validated UNCONDITIONALLY, in-transaction,
//     against the DB clock, by `createPendingHold`. This action supplies no override and knows no bypass.
//   - NO MUTATION OF THE SOURCE ROW (T-07-72): this file contains no statement that can modify an existing
//     booking. The original row, its refund columns and any debit it carries are untouched, so a re-request
//     can never be used to evade a cancellation fee or reverse a refund.
//   - SPAM (T-07-73): rate-limited per identity with an audited denial.
//   - POST-ONLY: a POST server action invoked from a button, never a GET side-effect.

import { eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing, user } from "@/lib/db/schema";
import { windowHours } from "@/lib/booking/pricing";
import { composeDeadlineLabel, composeWhenLabel } from "@/lib/booking/when-label";
import { createPendingHold } from "@/lib/availability/units";
import { emitNotify } from "@/lib/notifications";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { APPROVAL_SLA_HOURS } from "@/lib/payments/config";
import { recordAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

/**
 * The entire re-request payload: one booking id. Mirrors `cancellationSchema`'s deliberate three-line shape —
 * there is no field for a window, a rate or a total because the server reads all three off the stored row.
 */
const reRequestSchema = z.object({ bookingId: z.string().min(1) });

/** The new booking's id is returned so the caller can route to its freshly-minted state. */
export type ReRequestResult = { ok: true; bookingId: string } | { ok: false; error: string };

/** T-07-73: same money-adjacent budget per identity as approve / cancel (5 per 60s). */
const RE_REQUEST_RATE_LIMIT = { window: 60, max: 5 } as const;

/**
 * The SAME calm denial the cancel actions return for a missing booking AND a cross-user booking (T-07-69).
 * Kept byte-identical on purpose: a booker who probes an id with both actions must learn nothing from the
 * pair of answers either.
 */
const DENIED: ReRequestResult = {
  ok: false,
  error: "We couldn't find that booking, or it isn't yours to manage.",
};

/** The source booking is still live, or was never a lapsed hold at all — calm, never a throw. */
const NOT_RESENDABLE: ReRequestResult = {
  ok: false,
  error: "This request is no longer available to resend.",
};

const NEEDS_SESSION: ReRequestResult = { ok: false, error: "Sign in to manage your bookings." };

const TOO_FAST: ReRequestResult = {
  ok: false,
  error: "You're going a little fast. Please try again in a moment.",
};

/** Resolve the signed-in user's id, or null if there is no session (cloned from host-requests.ts). */
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

// Aliased user joins: one read reaches BOTH the listing host (the new request's recipient) and the booker
// (their own receipt). Two joins onto `user` need distinct aliases.
const hostUser = alias(user, "host_user");
const bookerUser = alias(user, "booker_user");

type SourceBooking = NonNullable<Awaited<ReturnType<typeof loadOwnedLapsedBooking>>>;

/**
 * Owner-gated load of the source booking (T-07-69 / Security V4).
 *
 * `lapsed` is computed by POSTGRES rather than in JS. It is expressed as `expires_at IS NULL OR expires_at <=
 * now()` because the terminal flip NULLS the column: `request-expiry.ts` and the in-transaction stale-hold
 * sweep in `availability/units.ts` both clear `expires_at` when they retire a hold, so a guard written as
 * "expires_at has passed" alone would match nothing and this feature would be dead on arrival. The predicate
 * as written says the thing that is actually meant — this booking holds no live window any more.
 *
 * Returns null for a missing row AND for a cross-user row, so the two are indistinguishable to the caller.
 */
async function loadOwnedLapsedBooking(bookingId: string, userId: string) {
  const [row] = await db
    .select({
      id: booking.id,
      bookerId: booking.bookerId,
      listingId: booking.listingId,
      status: booking.status,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      // D-61 creation-time snapshot. Only a request-mode booking ever had an approval to lapse.
      bookingMode: booking.bookingMode,
      // WR-06 (07-17) — the persisted creation-time PRICING-MODE snapshot. Authoritative for the
      // re-price below; NULL only on pre-0016 rows.
      fullDay: booking.fullDay,
      // Set ONLY by a party cancellation (cancel-booking.ts). NULL means the system retired the hold, which
      // is precisely the lapse D-97 recovers from.
      cancelledBy: booking.cancelledBy,
      paymentId: booking.paymentId,
      // The D-74 frozen split — the ONLY input to the fullDay re-derivation below (never the all-in total).
      spacePriceCents: booking.spacePriceCents,
      quotedTotalCents: booking.quotedTotalCents,
      currency: booking.currency,
      lapsed: sql<boolean>`(${booking.expiresAt} IS NULL OR ${booking.expiresAt} <= now())`,
      // The listing's CURRENT facts. The mode is re-read rather than reused from the booking's snapshot: a
      // host who switched the listing to instant-book since should get an instant hold, not a request they
      // no longer accept.
      listingBookingMode: listing.bookingMode,
      hostId: listing.hostId,
      title: listing.title,
      timezone: listing.timezone,
      city: listing.city,
      hourlyRateCents: listing.hourlyRateCents,
      // Consulted ONLY by the pre-0016 fullDay fallback below — a positive day-rate match, never an
      // hourly-rate inequality (WR-06).
      dayRateCents: listing.dayRateCents,
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

/**
 * Is this booking a genuinely lapsed, unpaid, request-mode hold?
 *
 * FOUR CONDITIONS, each excluding a different thing that must NOT be resendable:
 *   - a terminal `declined` / `cancelled` status  — a live hold has nothing to resend;
 *   - no live window (`lapsed`)                   — belt-and-braces against a terminal row still carrying one;
 *   - `cancelledBy IS NULL`                       — a booking a PARTY cancelled was a decision, not a lapse.
 *                                                   This is what keeps a booker-cancelled or host-cancelled
 *                                                   booking (and its refund, and any host debit) out of here;
 *   - `paymentId IS NULL`                         — money never moved. A paid booking that later went terminal
 *                                                   is a refund story, and resending its window from this
 *                                                   surface would tell the booker they were never charged.
 * Plus the mode gate: only a request-mode booking ever had an approval to lapse in the first place.
 */
function isResendableLapse(row: SourceBooking): boolean {
  return (
    (row.status === "declined" || row.status === "cancelled") &&
    row.lapsed === true &&
    row.cancelledBy === null &&
    row.paymentId === null &&
    row.bookingMode === "request"
  );
}

/**
 * reRequestSameWindow — resubmit the SAME window of a lapsed request-to-book hold (D-97).
 *
 * The ORDER is load-bearing and mirrors the cancel actions: gate before rate-limit (so a stranger's id is
 * denied without consuming the owner's budget), rate-limit before any write, lapse-guard before the mint,
 * mint before notification. The client sends one booking id and nothing else.
 */
export async function reRequestSameWindow(bookingId: string): Promise<ReRequestResult> {
  // Re-validate the ONE field that crosses the boundary. A malformed id is a calm denial, not a 500.
  const parsed = reRequestSchema.safeParse({ bookingId });
  if (!parsed.success) return DENIED;

  const userId = await requireUserId();
  if (!userId) return NEEDS_SESSION;

  // Owner-gate BEFORE any write (T-07-69). Missing vs cross-user → the SAME calm denial.
  const row = await loadOwnedLapsedBooking(parsed.data.bookingId, userId);
  if (!row) return DENIED;

  // T-07-73: bound re-request spam against the host per identity; audit the denial (non-repudiable).
  const limit = rateLimit(`re-request:${userId}`, RE_REQUEST_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: userId,
      action: "re_request_booking",
      outcome: "denied",
      meta: { reason: "rate_limit", bookingId, retryAfter: limit.retryAfter },
    });
    return TOO_FAST;
  }

  if (!isResendableLapse(row)) return NOT_RESENDABLE;

  // WR-06 (07-17) — `fullDay` is the booking row's OWN persisted creation-time snapshot
  // (`booking.full_day`, written by createPendingHold at mint time), because this derivation is
  // PRICE-DETERMINING: createPendingHold re-freezes the price from it at the listing's current rates.
  //
  // The pre-fix code re-derived the mode as `spaceCents !== currentHourlyRate × hours` — but the frozen
  // spaceCents was priced at the rate in force at the ORIGINAL booking, so ANY host hourly-rate edit
  // since made the inequality lie, flipping every hourly re-request to full-day and silently minting the
  // flat day rate. The load-bearing property of the line below: an hourly-rate edit can no longer flip
  // ANYTHING to full-day, because inequality-with-the-current-hourly-rate is not a full-day trigger
  // anywhere on this path.
  //
  // The fallback exists ONLY for pre-0016 rows (full_day IS NULL): it treats a row as full-day solely on
  // a POSITIVE match against the day rate that is not also an exact hourly match — biasing to hourly on
  // coincidence, the same bias when-label.ts documents. (`?? quoted` covers a pre-07-08 row whose split
  // was never frozen; its fee was 0, so the two are equal.)
  const hours = windowHours(row.startsAt, row.endsAt);
  const spaceCents = row.spacePriceCents ?? row.quotedTotalCents ?? 0;
  const hourlyTotal = row.hourlyRateCents != null ? row.hourlyRateCents * hours : null;
  const fullDay =
    row.fullDay ??
    (row.dayRateCents != null && spaceCents === row.dayRateCents && spaceCents !== hourlyTotal);

  // The listing's CURRENT mode decides what is minted. A request listing mints a `requested` hold on the
  // APPROVAL_SLA_HOURS window; an instant listing mints the ordinary 15-minute checkout hold and the detail
  // page routes the booker straight on to pay.
  const asRequest = row.listingBookingMode === "request";

  // ── THE MINT. A NEW ROW, NEVER A STATUS FLIP BACK. ────────────────────────────────────────────────────
  //
  // A NEW row, never a status flip back. Resurrecting a terminal booking would re-enter the occupancy set
  // through a path the expiry sweeps do not model, and the GiST EXCLUDE is the sole occupancy authority — a
  // fresh insert is the only mechanism that consults it.
  //
  // `createPendingHold` re-validates, UNCONDITIONALLY and in-transaction against the DB clock: the listing's
  // current rates (so the price is re-frozen, never carried over), the D-93/D-96 mode-scoped lead time, and
  // the booking_no_overlap EXCLUDE itself. This action supplies no override for any of them (T-07-70/71).
  //
  // IDEMPOTENCY (a double-submit must not mint two holds) is `createPendingHold`'s own D-42 own-hold
  // pre-check: it matches an ACTIVE hold of this booker on this exact window and replays it, returning the
  // same id. A stable `idempotencyKey` is deliberately NOT passed — `booking_idem_uq` is a partial-UNIQUE
  // over all time, so a key derived from the source booking id would still be held by the FIRST re-request
  // long after that one had itself lapsed, and the second attempt would hit 23505 with no active hold to
  // replay and re-throw as a 500. The window match is scoped to live holds and is the correct guard here.
  const res = await createPendingHold(db, {
    listingId: row.listingId,
    bookerId: userId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    fullDay,
    holdStatus: asRequest ? "requested" : "pending",
    ...(asRequest ? { ttlMs: APPROVAL_SLA_HOURS * 60 * 60 * 1000 } : {}),
    bookingMode: asRequest ? "request" : "instant",
  });

  if ("error" in res) {
    // The slot was taken between the render-time availability check and this submit, or the window is now
    // inside the mode's minimum notice. Either way `mapBookingError` / the lead-time guard has ALREADY
    // produced the shipped Phase-3/4 language — no new error vocabulary is introduced here.
    await recordAudit({
      actorId: userId,
      action: "re_request_booking",
      outcome: "denied",
      meta: { reason: "unavailable", bookingId },
    });
    return { ok: false, error: res.error };
  }

  await recordAudit({
    actorId: userId,
    action: "re_request_booking",
    outcome: "ok",
    meta: { bookingId, newBookingId: res.id, replayed: res.replayed, mode: asRequest ? "request" : "instant" },
  });

  // ── Notifications, emitted POST-COMMIT and never inside a transaction (MANAGE-03 / T-07-58). ───────────
  //
  // A re-request IS a new request, so it emits exactly what `placeHold`'s request branch emits — both sides,
  // same two types, same payload shape. Deliberately not a reduced set: D-91 keeps the in-app channel at
  // parity with email, and a request the host is never told about is a request that silently expires.
  //
  // Skipped entirely on the instant branch, mirroring `placeHold`: an instant hold notifies nobody until the
  // payment webhook confirms it. A REPLAYED hold is skipped too — the first submit already told both sides,
  // and a double-click must not send the host the same request twice.
  if (asRequest && !res.replayed) {
    const currency = row.currency ?? DISPLAY_CURRENCY;
    const whenLabel = composeWhenLabel({
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      timezone: row.timezone,
      city: row.city,
      spacePriceCents: res.spacePriceCents,
      quotedTotalCents: res.quotedTotalCents,
      hourlyRateCents: row.hourlyRateCents,
    });
    // The host's real SLA deadline, off the row the insert just wrote. Under D-96 a session-start cap splits
    // the remaining time proportionally, so rendering APPROVAL_SLA_HOURS would be wrong on exactly the
    // short-notice re-requests where the deadline matters most (the D-99 failure, in an email).
    const respondByLabel =
      res.expiresAt === null
        ? "as soon as possible"
        : composeDeadlineLabel(res.expiresAt, row.timezone, row.city);
    const totalLabel = formatMoney(res.quotedTotalCents ?? 0, currency);
    const title = row.title ?? "your space";
    const bookerLabel = row.bookerFirstName?.trim() || "A guest";
    // ABSOLUTE hrefs: one payload string feeds BOTH channels (D-91), and a root-relative href is a dead link
    // in the email half.
    const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

    await emitNotify({
      type: "request_received",
      recipientId: userId,
      bookingId: res.id,
      email: row.bookerEmail,
      payload: {
        type: "request_received",
        listingTitle: title,
        whenLabel,
        totalLabel,
        href: `${base}/bookings/${res.id}`,
      },
    });
    await emitNotify({
      type: "new_request_to_host",
      recipientId: row.hostId,
      bookingId: res.id,
      email: row.hostEmail,
      payload: {
        type: "new_request_to_host",
        listingTitle: title,
        whenLabel,
        bookerLabel,
        totalLabel,
        respondByLabel,
        href: `${base}/host/requests`,
      },
    });
  }

  // The new hold occupies the slot immediately in the calendar + search (the 06-01 EXCLUDE + the 06-02 lazy
  // reads), and it appears on both inboxes — so every surface it touches is revalidated.
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${parsed.data.bookingId}`);
  revalidatePath(`/bookings/${res.id}`);
  revalidatePath("/host/requests");
  revalidatePath(`/listings/${row.listingId}`);

  return { ok: true, bookingId: res.id };
}
