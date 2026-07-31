// The durable booking confirmation (BOOK-03 · D-43). The OWNER-GATE below, not the route group, is the
// security boundary (Security V4) — that is unchanged and remains the only thing keeping this page private.
//
// Phase 7 MOVED this file from src/app/bookings/[id] into the (app) group. Route groups do not change URLs,
// so it still serves /bookings/[id]; the move exists because Plan 06 adds a real /bookings segment and
// declaring `bookings` in BOTH the root and the (app) group is an avoidable Next.js routing ambiguity that
// Plans 09 and 12 would keep compounding. No behaviour in this file changed with the move.
//
// It also closes part of 07-UI-SPEC Open Question 1: inside (app) this page now inherits the booker header
// and therefore the D-92 notification bell. The (app) layout's own session redirect is DESIRABLE here rather
// than a regression — the page already refused to render without a session (it 404s), so the only change is
// that a signed-out visitor lands on /login instead of a 404. `/` and `/listings/[id]` remain header-less;
// that residual bell-coverage gap is accepted and is recorded in the 07-06 SUMMARY.
//
// Security boundaries enforced here:
//   - T-04-CONFIRMIDOR (a MUST-NOT-SKIP control): the booking is loaded owner-gated —
//     booking.bookerId === session.userId, else notFound(). A missing row and a row owned by a DIFFERENT
//     booker return the SAME bare 404, so guessing/leaking an id reveals nothing (V4/IDOR, D-43).
//   - T-04-ENUMID: the URL uses the opaque randomUUID booking id (unguessable); the FIT- reference is
//     display-only and non-sequential (derived one-way from the id — you cannot walk it back, V6).
//
// DURABLE: this is a pure RSC read of persisted booking state — it needs NO client/countdown/ephemeral
// hold state, so it survives a refresh or a later revisit unchanged. Times are timestamptz UTC, displayed
// venue-local at the edge (SC#2); the total is the server-FROZEN quote (booking.quotedTotalCents, D-49),
// never a client recompute.
//
// ── Plan 07-12 completed the page. FOUR ADDITIONS; every branch that shipped before is untouched. ────────
//   (a) The CANCEL ENTRY POINT (D-104). On a `confirmed` booking whose session is still ahead, a neutral
//       outline link BELOW the primary content and behind a Separator — present but not competing. It is a
//       LINK to /bookings/[id]/cancel, never an inline action, so D-78's itemised breakdown is always seen
//       before an irreversible money action.
//   (b) The UNPAID-HOLD cancel on `requested` / `approved` — a plain confirm dialog with no breakdown and no
//       money UI, because no money moved (D-63). The copy lives in CancelRequestDialog.
//   (c) The D-97 EXPIRED-APPROVAL recovery branch: a `cancelled` row that the SYSTEM retired (rather than a
//       party cancelling it) after an approval lapsed. Calm, plus a one-click resubmission when the slot is
//       genuinely free.
//   (d) The `cancelled` and derived-`completed` branches, both CALM — never an alarm colour, never --success.
//
// ── Plan 08-07 adds ONE more, on the confirmed branch only. ───────────────────────────────────────────────
//   (e) THE D-119 GROUP ENTRY: a coral `Invite people` on a confirmed, session-ahead, exclusive-occupancy
//       booking that is not yet a group, or a neutral `Manage group · {N} coming` link once it is. Its cost
//       to the surface is that the shipped coral `Find another space` DEMOTES to a ghost link — one primary
//       per surface (08-UI-SPEC Open Q3), and the differentiator gets the slot. Nothing else moved: the
//       cancel entry, every other status branch and all the money on this page are untouched.
//
// THE CLOCK. `now` is read from POSTGRES once, via `readDbNow`, and threaded into every status derivation and
// date comparison on the page, so the badge, the completed derivation and the availability read all agree
// with the DB and with the /bookings list's SQL partition. A bare `SELECT now()` through `db.execute` hands
// back Postgres TEXT rather than a Date — a cast over it satisfies tsc, eslint AND `next build`, then throws
// on `.getTime()` with the first real row; `readDbNow` is the ONE hydrating reader (the 07-06 boundary
// contract). There is no JS clock read anywhere on this page.

import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";
import { CalendarCheckIcon, HourglassIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing } from "@/lib/db/schema";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { bookingReference } from "@/lib/booking/reference";
import { readDbNow } from "@/lib/booking/bookings-query";
import { getAvailability } from "@/lib/availability/read-model";
import { getHeadcount, getOwnedGroupByBooking } from "@/lib/group/rsvp";
import { SPACE_TYPE_LABELS, type SpaceTypeValue } from "@/lib/listing-vocab";
import { venueTzNote } from "@/lib/venue-time";
import { APPROVAL_SLA_HOURS, APPROVAL_PAYMENT_WINDOW_HOURS } from "@/lib/payments/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PendingPaymentState } from "@/components/booking/pending-payment-state";
import { PaymentReversedState } from "@/components/booking/payment-reversed-state";
import { RequestCountdown } from "@/components/booking/request-countdown";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { CancelRequestDialog } from "@/components/booking/cancel-request-dialog";
import { CreateGroupButton } from "@/components/group/create-group-button";
import {
  ExpiredApprovalState,
  type ExpiredApprovalSlot,
} from "@/components/booking/expired-approval-state";
import { deriveDisplayStatus, declinedCopy } from "@/components/booking/booking-status";

/**
 * Is the lapsed booking's own window still bookable? Decides which D-97 variant renders (07-UI-SPEC § 10).
 *
 * A COURTESY, NEVER THE GATE (Security V4). `reRequestSameWindow` re-mints through `createPendingHold`, so
 * the booking_no_overlap EXCLUDE re-adjudicates the slot on every submit no matter what this read concluded.
 * The read exists only so a button that would certainly fail is not offered — a one-click recovery that
 * bounces is worse than no button at all.
 *
 * The three outcomes are kept distinct because the copy differs and truthfulness matters more than brevity:
 * a slot that is merely PAST or inside the listing's minimum notice must not be described as one somebody
 * else booked. Reads the venue-local day of the session start; a window that no slot covers (the host closed
 * those hours since, or the window straddles venue-local midnight) reads as `unavailable`, which is both the
 * safe answer and the honest one.
 */
async function readSlotState(
  listingId: string,
  startsAt: Date,
  endsAt: Date,
  timezone: string,
  now: Date,
): Promise<ExpiredApprovalSlot> {
  const [year, month, day] = format(startsAt, "yyyy-MM-dd", { in: tz(timezone) })
    .split("-")
    .map(Number);
  const availability = await getAvailability(db, listingId, { year, month, day }, now);
  const startMs = startsAt.getTime();
  const endMs = endsAt.getTime();
  // Half-open '[)' overlap, identical to the constraint and the read model.
  const covering = availability.slots.filter((s) => {
    const a = new Date(s.startUtc).getTime();
    const b = new Date(s.endUtc).getTime();
    return a < endMs && startMs < b;
  });
  if (covering.length === 0) return "unavailable";
  if (covering.every((s) => s.state === "available")) return "free";
  if (covering.some((s) => s.state === "unavailable")) return "taken";
  return "unavailable"; // past / too_soon / beyond_horizon — free, but not requestable
}

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  // ?paid=1 is the checkout return UX signal ONLY — never proof of payment (D-57). Next 16 async params.
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await params;
  const { paid } = await searchParams;

  // A session is required to own a booking — no session can never be the owner (→ 404, reveal nothing).
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) notFound();

  const [bk] = await db
    .select({
      id: booking.id,
      listingId: booking.listingId,
      bookerId: booking.bookerId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      status: booking.status,
      quotedTotalCents: booking.quotedTotalCents,
      // D-74: the listing-priced portion. Consulted ONLY by the pre-0016 fullDay fallback below.
      spacePriceCents: booking.spacePriceCents,
      // WR-06 (drizzle 0016) — the PERSISTED pricing-mode snapshot that now DRIVES the label (see below).
      fullDay: booking.fullDay,
      currency: booking.currency,
      expiresAt: booking.expiresAt,
      // ── Plan 07-12 additions, all read-only display inputs. ──
      // D-79: what actually went back to the booker. NULL on a hold that was never paid.
      refundCents: booking.refundCents,
      // Set ONLY by a party cancellation (cancel-booking.ts). NULL means the SYSTEM retired the hold, which
      // is exactly the D-97 lapse — and is what separates it from a booking someone chose to cancel.
      cancelledBy: booking.cancelledBy,
      // D-61 creation-time snapshot. Only a request-mode booking ever had an approval to lapse.
      bookingMode: booking.bookingMode,
      paymentId: booking.paymentId,
    })
    .from(booking)
    .where(eq(booking.id, id));

  // Owner-gate (T-04-CONFIRMIDOR, D-43) — the route group is NOT the gate. Missing OR not-mine → the same 404.
  if (!bk || bk.bookerId !== userId) notFound();

  // Truthfulness (D-57): never render "Booking confirmed" until the DB says 'confirmed'. On return from the
  // hosted checkout the webhook — NOT this ?paid=1 signal — is the confirm authority. Branch on the DB state:
  if (bk.status === "pending") {
    // Returned from checkout (?paid=1) → the neutral "finalizing…" interstitial that self-resolves once the
    // webhook confirms (it only ever refreshes; it never fabricates the confirmed state client-side).
    if (paid === "1") return <PendingPaymentState />;
    // Abandoned pending hold (no ?paid) → back to the reserve page to finish checkout (Phase-4 behavior).
    redirect(`/listings/${bk.listingId}/book?hold=${bk.id}`);
  }
  // D-58 auto-refund landing: the webhook reversed a payment for a slot that was genuinely gone → the calm
  // reversed state (you weren't charged), never a "Booking confirmed".
  if (bk.status === "cancelled" && paid === "1") {
    return <PaymentReversedState listingId={bk.listingId} />;
  }
  // The states we render a booking-detail card for. 07-12 ADDS `cancelled`: a cancelled booking is durable
  // history the booker is entitled to see (a refund figure, or the D-97 recovery), and 404ing it was the
  // reason confirming a cancellation used to land on a dead page. `completed` is NOT here and must not be —
  // it is DERIVED at read time from a `confirmed` row whose endsAt has passed (D-102) and is never stored, so
  // a row carrying the unused enum value is a data fault, not a state to render.
  const RENDERABLE = ["requested", "approved", "declined", "confirmed", "cancelled"];
  if (!RENDERABLE.includes(bk.status)) notFound();

  const [lst] = await db
    .select({
      title: listing.title,
      primarySpaceType: listing.primarySpaceType,
      city: listing.city,
      timezone: listing.timezone,
      // The hourly rate is deliberately NOT selected any more: nothing on this page compares a frozen price
      // against a CURRENT listing rate, and that absence is the Pitfall-3 fix. Only the day rate remains,
      // for the pre-0016 positive-match fullDay fallback.
      dayRateCents: listing.dayRateCents,
      // D-109 — the group entry is an EXCLUSIVE-occupancy affordance. The enum has exactly one value in v1
      // (and the column is NOT NULL DEFAULT 'exclusive'), so today this predicate is always true; it is
      // written out anyway so the open-capacity mode Phase 9 adds cannot inherit an invite flow that was
      // designed around "one payer, one exclusive lock" without someone deciding it should.
      occupancyMode: listing.occupancyMode,
    })
    .from(listing)
    .where(eq(listing.id, bk.listingId));
  if (!lst) notFound();

  const timezone = lst.timezone;
  const inTz = tz(timezone);
  const title = lst.title ?? "Untitled space";
  const spaceTypeLabel = lst.primarySpaceType
    ? SPACE_TYPE_LABELS[lst.primarySpaceType as SpaceTypeValue]
    : null;

  // fullDay is the booking row's OWN persisted creation-time snapshot (booking.full_day, drizzle 0016 /
  // WR-06) — the same flag the price was frozen with. The Total shown is always the frozen all-in
  // quotedTotalCents (D-49); this only chooses "Full day" vs an hour range.
  //
  // ⚠️ THE OLD "space price is not equal to the hourly run total" DERIVATION IS GONE, AND MUST NOT COME
  // BACK (08-RESEARCH Pitfall 3), for the same reason spelled out on the reserve page: the D-108 extra-guest
  // surcharge is folded INTO spacePriceCents (A1), so an ordinary hourly booking with one extra guest no
  // longer matches the plain hourly run total, and that inequality would label it "Full day".
  //
  // ⚠️ GREP TRIPWIRE (the 07-04 payout-sweep idiom). The absence of the old derivation is checked by grepping
  // this file for the two identifiers it was written with. A grep is only a real guard if it cannot be
  // tripped by the very comment forbidding it — so neither is spelled out anywhere here, comments included.
  // If you are tempted to name them "just in prose", don't: it disarms the check for good.
  //
  // The fallback is for pre-0016 rows only (full_day IS NULL) and is a POSITIVE day-rate match rather than
  // an inequality (the re-request.ts:234 idiom), so it can only ever ADD "Full day" on an exact match —
  // nothing hourly can be mislabeled by it.
  const quoted = bk.quotedTotalCents ?? 0;
  const fullDay =
    bk.fullDay ?? (lst.dayRateCents != null && (bk.spacePriceCents ?? quoted) === lst.dayRateCents);

  const dateLabel = format(bk.startsAt, "EEEE, MMM d, yyyy", { in: inTz });
  const timeLabel = fullDay
    ? "Full day"
    : `${format(bk.startsAt, "h:mm a", { in: inTz })} – ${format(bk.endsAt, "h:mm a", { in: inTz })}`;
  const tzNote = venueTzNote(lst.city, timezone);
  const totalLabel = formatMoney(quoted, bk.currency ?? DISPLAY_CURRENCY);

  // THE CLOCK — Postgres, read once, hydrated once, threaded into every derivation below (see the header).
  const now = await readDbNow(db);
  const whenLabel = `${dateLabel}, ${timeLabel}`;

  // ── requested (BOOK-06, D-66): "Request sent — awaiting host". Calm, NO pay CTA, "you haven't been charged". ──
  if (bk.status === "requested") {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <Card>
          <CardContent className="space-y-6 py-8">
            <div className="flex flex-col items-center gap-3 text-center">
              {/* Neutral secondary badge — a calm, expected state; NEVER red, NEVER --success (icon + text). */}
              <Badge variant="secondary" className="gap-1.5">
                <HourglassIcon className="size-4" aria-hidden="true" />
                Awaiting host
              </Badge>
              <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-[28px]">
                Request sent
              </h1>
              <p className="mx-auto max-w-prose text-sm text-muted-foreground">
                Your request to book {title} on {dateLabel}, {timeLabel} is with the host. You&apos;ll get an
                email when they respond — usually within {APPROVAL_SLA_HOURS} hours. You haven&apos;t been
                charged — you&apos;ll only pay if the host approves.
              </p>
            </div>

            <Separator />

            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Space</dt>
                <dd className="text-right font-medium">
                  {title}
                  {spaceTypeLabel && (
                    <span className="block font-normal text-muted-foreground">{spaceTypeLabel}</span>
                  )}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">When</dt>
                <dd className="text-right">
                  <span>{dateLabel}</span>
                  <span className="block tabular-nums text-muted-foreground">{timeLabel}</span>
                </dd>
              </div>
              {/* Labeled "You'll pay if approved" — NOT "Total charged" (nothing charged at request time, D-63). */}
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">You&apos;ll pay if approved</dt>
                <dd className="text-right text-base font-semibold tabular-nums">{totalLabel}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">{tzNote}</p>

            <Separator />

            {/* (b) The unpaid-hold cancel — a plain confirm dialog ("Cancel this request?") carrying NO
                breakdown and NO money UI, because no money moved (D-63). Below the primary content, like
                every other cancel entry on this page. */}
            <CancelRequestDialog bookingId={bk.id} />
          </CardContent>
        </Card>
      </main>
    );
  }

  // ── approved (BOOK-06, D-66): "Your request was approved — pay now". The ONE coral CTA + payment-window countdown. ──
  if (bk.status === "approved") {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <Card>
          <CardContent className="space-y-6 py-8">
            <div className="flex flex-col items-center gap-3 text-center">
              {/* Neutral OUTLINE badge — approved is positive but NOT terminal; --success stays reserved for confirmed. */}
              <Badge variant="outline" className="gap-1.5">
                <CalendarCheckIcon className="size-4" aria-hidden="true" />
                Approved
              </Badge>
              <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-[28px]">
                Your request was approved
              </h1>
              <p className="mx-auto max-w-prose text-sm text-muted-foreground">
                Good news — the host approved your booking for {dateLabel}, {timeLabel}. Pay {totalLabel} to
                lock in your slot. This approval is held for {APPROVAL_PAYMENT_WINDOW_HOURS} hours.
              </p>
              {/* Payment-window countdown (display cue only; the DB now() vs expires_at is the sole authority). */}
              {bk.expiresAt && (
                <RequestCountdown
                  expiresAt={bk.expiresAt.toISOString()}
                  label="Pay within"
                  expiredLabel="Payment window closed"
                />
              )}
            </div>

            <Separator />

            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Space</dt>
                <dd className="text-right font-medium">
                  {title}
                  {spaceTypeLabel && (
                    <span className="block font-normal text-muted-foreground">{spaceTypeLabel}</span>
                  )}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">When</dt>
                <dd className="text-right">
                  <span>{dateLabel}</span>
                  <span className="block tabular-nums text-muted-foreground">{timeLabel}</span>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="text-right text-base font-semibold tabular-nums">{totalLabel}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">{tzNote}</p>

            <Separator />

            {/* The ONE coral CTA introduced this phase — pay-on-approval → the SAME Phase-5 reserve/checkout page. */}
            <Button asChild className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
              <Link href={`/listings/${bk.listingId}/book?hold=${bk.id}`}>Pay now</Link>
            </Button>

            {/* (b) The same no-money cancel dialog as the `requested` branch — an approved-but-unpaid hold is
                still an unpaid hold. Beneath the pay CTA so the primary action stays primary. */}
            <CancelRequestDialog bookingId={bk.id} />
          </CardContent>
        </Card>
      </main>
    );
  }

  // ── declined — ONE enum value, two truthfully-different endings (T8 · 07-18). A booker who cancelled their
  //    own unpaid `requested` hold is stored `declined` + cancelled_by='booker' (cancelUnpaidHold); a genuine
  //    host decline / SLA lapse leaves cancelled_by NULL (or 'host'/'system'). `declinedCopy(bk.cancelledBy)`
  //    IS the selection — the booker-vs-host conditional is NOT re-implemented inline here — and the badge is
  //    threaded the same `cancelledBy` so it agrees with the lists (booker-cancel → "Cancelled", host-decline
  //    → "Declined"). The copy is parameter-free, so the venue/time renders on a SEPARATE sibling line, the
  //    same two-line layout the `cancelled` branch uses. Muted — NEVER red (mirrors HoldExpiredState). ──
  if (bk.status === "declined") {
    const copy = declinedCopy(bk.cancelledBy);
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <Card>
          <CardContent
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-4 py-10 text-center"
          >
            <BookingStatusBadge
              status="declined"
              endsAt={bk.endsAt}
              now={now}
              side="booker"
              cancelledBy={bk.cancelledBy}
            />
            <div className="space-y-1">
              <h1 className="text-xl leading-tight font-semibold">{copy.heading}</h1>
              <p className="mx-auto max-w-prose text-sm text-muted-foreground">{copy.body}</p>
              {/* The venue/time as a sibling line (copy is parameter-free) — mirrors the `cancelled` branch. */}
              <p className="mx-auto max-w-prose text-sm text-muted-foreground">
                {title} · {whenLabel}
              </p>
              <p className="text-xs text-muted-foreground">{tzNote}</p>
            </div>
            {/* Coral recovery forward-action (reuses the confirmation forward-action slot). */}
            <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Link href="/">Find another space</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // ── cancelled (07-12) — two genuinely different events sharing one enum value (D-79). ──────────────────
  if (bk.status === "cancelled") {
    // (c) THE D-97 LAPSE. Three conditions, each excluding something this branch must NOT swallow:
    //   - `cancelledBy === null`   — a PARTY cancellation was a decision, not a lapse. Keeps every
    //                                booker-cancelled and host-cancelled booking (and its refund) out.
    //   - `bookingMode === request`— only a request-mode booking ever had an approval to lapse.
    //   - `paymentId === null`     — money never moved, so "you weren't charged anything" is TRUE.
    // These are the same conditions `reRequestSameWindow` re-checks server-side; this branch only decides
    // what to render.
    //
    // KNOWN EDGE, stated rather than hidden: the D-58 gone-slot backstop also lands a booking here with no
    // `cancelled_by` and no persisted payment id. Its own landing is the `?paid=1` PaymentReversedState
    // branch above, which fires on the return from checkout; a later revisit WITHOUT `?paid=1` on a
    // request-mode booking would read as a lapse. Vanishingly rare (it needs a payment to land for a slot
    // already gone) and the recovery offered is still the right one — but it is an edge, not a proof.
    const lapsedApproval =
      bk.cancelledBy === null && bk.bookingMode === "request" && bk.paymentId === null;

    if (lapsedApproval) {
      const slot = await readSlotState(bk.listingId, bk.startsAt, bk.endsAt, timezone, now);
      return (
        <ExpiredApprovalState
          bookingId={bk.id}
          listingId={bk.listingId}
          whenLabel={whenLabel}
          // Usually null: both retirement paths CLEAR expires_at when they flip the hold terminal, so the
          // instant the window closed is not retained. The component carries a deadline-free copy variant
          // rather than inventing a deadline we do not have — see its prop doc.
          deadlineLabel={
            bk.expiresAt
              ? `${format(bk.expiresAt, "EEE, MMM d, h:mm a", { in: inTz })}${lst.city ? ` (${lst.city} time)` : ""}`
              : null
          }
          tzNote={tzNote}
          slot={slot}
        />
      );
    }

    // (d) The generic cancelled landing. CALM — muted badge, never an alarm colour, never --success.
    //
    // D-79: the badge label is ALWAYS and ONLY `Cancelled`. The refund renders as a SIBLING line beneath it,
    // never interpolated into the badge — a variable money string inside a fixed-vocabulary element breaks
    // the badge grammar everywhere it is shared with a table column.
    //
    // ⚠️ D-57 — WHY A NON-ZERO REFUND ALWAYS READS "on its way" AND NEVER "refunded". The cancel action's
    // PayMongo POST records INTENT only; refund status is asynchronous and the payment.refunded webhook is
    // the single writer of terminal state. That webhook writes settlement to `host_payout_ledger.state`, and
    // a pre-session cancellation has no ledger row (the payout sweep runs at endsAt + PAYOUT_DELAY_HOURS and
    // skips cancelled) — so there is NO settled-refund signal on a booking row to read. Claiming "Refunded"
    // would therefore be claiming it off the POST, which is exactly what D-57 forbids. The settled variant
    // is deliberately not rendered; if a settlement signal is ever persisted, this is where it lands.
    const refundCents = bk.refundCents;
    const refundLine =
      refundCents == null
        ? null
        : refundCents > 0
          ? `${formatMoney(refundCents, bk.currency ?? DISPLAY_CURRENCY)} refund on its way`
          : "No refund — cancelled inside the no-refund window";

    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <Card>
          <CardContent
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-4 py-10 text-center"
          >
            <div className="flex flex-col items-center gap-1.5">
              <BookingStatusBadge status="cancelled" endsAt={bk.endsAt} now={now} side="booker" />
              {/* The D-79 sibling line. Never a bare "₱0 refunded" — the zero case always carries its reason. */}
              {refundLine && (
                <p className="text-sm tabular-nums text-muted-foreground">{refundLine}</p>
              )}
            </div>
            <div className="space-y-1">
              <h1 className="text-xl leading-tight font-semibold">This booking was cancelled</h1>
              <p className="mx-auto max-w-prose text-sm text-muted-foreground">
                {title} · {whenLabel}
              </p>
              {refundCents != null && refundCents > 0 && (
                <p className="mx-auto max-w-prose text-sm text-muted-foreground">
                  Refunds usually land back on your original payment method within a few days.
                </p>
              )}
              <p className="text-xs text-muted-foreground">{tzNote}</p>
            </div>
            <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Link href="/">Find another space</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // ── confirmed, and the DERIVED `completed` (D-102) — the one terminal --success surface, and its inert
  //    afterlife. `completed` is never stored: `deriveDisplayStatus` reads it off a `confirmed` row whose
  //    endsAt has passed, against the DB clock, exactly as the /bookings list's SQL derives it. Nothing here
  //    writes, so it cannot drift and cannot race the occupancy predicate. ──
  const reference = bookingReference(bk.id);
  const isCompleted = deriveDisplayStatus("confirmed", bk.endsAt, now) === "completed";
  // (a) The cancel entry appears ONLY while the session is still ahead — the same D-94 rule the action and
  //     the review page enforce, so all three agree about when cancellation is possible. A finished session
  //     has nothing to cancel, which is also why the completed branch carries no entry.
  //
  // (e) 08-07 — the D-119 GROUP ENTRY turns on the SAME predicate, so the two entries are named ONCE rather
  //     than restated. Both mean "there is still a session to act on": you cannot cancel a session that has
  //     started, and you cannot usefully invite people to one either.
  const sessionAhead = !isCompleted && bk.startsAt.getTime() > now.getTime();

  // ── (e) THE D-119 GROUP ENTRY POINT (08-UI-SPEC §1). ────────────────────────────────────────────────────
  // THREE conditions, and the branch is exhaustive about them because every OTHER status renders above:
  //   - `status === 'confirmed'` — a group is a coordination layer on a booking that is PAID and real
  //     (D-119). pending / requested / approved / declined / cancelled all return before this line, so this
  //     re-states the invariant rather than discovering it; it is written out so the guard survives anyone
  //     later adding a status to this branch.
  //   - `sessionAhead`          — see above. A finished or in-progress session has no one left to invite.
  //   - `occupancyMode`         — D-109; see the select above.
  // ALL THREE ARE COURTESIES. `createGroup` re-checks ownership, confirmation AND the listing's occupancy
  // mode server-side before it writes anything — the mode in BOTH its pre-read gate and the INSERT's own
  // WHERE — so a hand-crafted POST that skipped this UI gains nothing (Security V4). Until CR-05 this
  // sentence named only the first two, and the mode was the one condition NO server check enforced: a
  // direct POST on a drop-in pass minted the listing's daily admissions cap as RSVP seats.
  //
  // The reads are owner-scoped IN their own WHERE (`organizerId` is an argument to both, 08-06) — this page
  // never filters a group in JS after reading it, because a foreign roster must be UNREADABLE, not merely
  // unrendered.
  const groupEligible =
    bk.status === "confirmed" && sessionAhead && lst.occupancyMode === "exclusive";
  const group = groupEligible
    ? await getOwnedGroupByBooking(db, { bookingId: bk.id, organizerId: userId })
    : null;
  // `{N} coming` is the CONFIRMED-yes count, server-computed — the same figure the management surface makes
  // its focal point, so the two can never disagree about how many people are coming.
  const groupHeadcount = group
    ? await getHeadcount(db, { groupId: group.groupId, organizerId: userId })
    : null;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <Card>
        <CardContent className="space-y-6 py-8">
          {/* Focal point: reassurance first — the badge (icon + text, never color-only) + reference. The
              badge derivation is the SHARED one, so `Confirmed` here and `Completed` once the session ends
              read identically to the same booking on /bookings and /host/bookings. Completed is muted, NOT
              green: it is inert history, not a live success. */}
          <div className="flex flex-col items-center gap-3 text-center">
            <BookingStatusBadge status="confirmed" endsAt={bk.endsAt} now={now} side="booker" />
            <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-[28px]">
              {isCompleted ? "This session is done" : "Booking confirmed"}
            </h1>
            <div className="space-y-0.5">
              <p className="text-sm text-muted-foreground">Booking reference</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-[28px]">
                {reference}
              </p>
            </div>
          </div>

          <Separator />

          <dl className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Space</dt>
              <dd className="text-right font-medium">
                {title}
                {spaceTypeLabel && (
                  <span className="block font-normal text-muted-foreground">{spaceTypeLabel}</span>
                )}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">When</dt>
              <dd className="text-right">
                <span>{dateLabel}</span>
                <span className="block tabular-nums text-muted-foreground">{timeLabel}</span>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="text-right text-base font-semibold tabular-nums">{totalLabel}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">{tzNote}</p>

          <Separator />

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isCompleted
                ? "This page is your record of the session — it stays here if you come back later."
                : "This page is your confirmation — it stays here if you refresh or come back later."}
            </p>

            {/* (e) THE GROUP ENTRY (D-119 / 08-UI-SPEC §1) — the differentiator's front door, and the ONE
                coral on this surface. Two mutually-exclusive shapes:
                  - not yet a group → the coral `Invite people` + its helper line. This is the phase's
                    headline action, so it takes the accent slot (08-UI-SPEC §Color accent #1).
                  - already a group → a NEUTRAL outline `Manage group · {N} coming` link. Once the group
                    exists, management is a calm return trip, not a headline action; making it coral would
                    keep shouting at an organizer who has already done the thing. */}
            {groupEligible &&
              (group ? (
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/bookings/${bk.id}/group`}>
                    Manage group · {groupHeadcount?.confirmed ?? 0} coming
                  </Link>
                </Button>
              ) : (
                <div className="space-y-2">
                  <CreateGroupButton bookingId={bk.id} />
                  <p className="text-sm text-muted-foreground">
                    Invite friends to this booking and track who&apos;s coming.
                  </p>
                </div>
              ))}

            {/* ⚠️ DEMOTED FROM CORAL TO `ghost` (08-UI-SPEC §1 / Open Q3). This was the confirmed branch's
                one coral forward action; `Invite people` now holds that slot, and one-primary-per-surface
                forbids two. The demotion is UNCONDITIONAL on this branch rather than tied to whether the
                group entry rendered: a completed session's "find another space" is a calm afterthought, not
                a call to action, and a rule that flipped a shipped button's weight depending on a date is a
                rule nobody can hold in their head. The `declined` and `cancelled` branches keep their coral
                — there, finding another space genuinely IS the one thing left to do. */}
            <Button asChild variant="ghost" className="w-full">
              <Link href="/">Find another space</Link>
            </Button>
          </div>

          {/* (a) THE CANCEL ENTRY POINT (D-104). Below the primary content and behind its own Separator —
              present but not competing, and NEVER on a list row. A LINK, not an action: it routes to the
              /bookings/[id]/cancel review so the D-78 itemised breakdown (and the exact refund SC#2
              promises) is always seen before an irreversible money action. Neutral outline — not coral,
              which would advertise the action FitOut least wants taken, and not an alarm colour, which
              would misrepresent a refund the booker is contractually entitled to. */}
          {sessionAhead && (
            <>
              <Separator />
              <Button asChild variant="outline" className="w-full">
                <Link href={`/bookings/${bk.id}/cancel`}>Cancel booking</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
