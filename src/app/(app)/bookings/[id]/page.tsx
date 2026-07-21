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
// never a client recompute. No "My Bookings" list and no cancel/manage — those are Phase 7.

import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";
import { CalendarCheckIcon, CheckCircle2Icon, HourglassIcon, XCircleIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing } from "@/lib/db/schema";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { windowHours } from "@/lib/booking/pricing";
import { bookingReference } from "@/lib/booking/reference";
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
      // D-74: the listing-priced portion, used to re-derive fullDay (see below).
      spacePriceCents: booking.spacePriceCents,
      currency: booking.currency,
      expiresAt: booking.expiresAt,
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
  // The remaining states we render a booking-detail card for are requested / approved / declined / confirmed.
  // Anything else (a plain cancelled without ?paid, completed) has no confirmation to show → the same bare 404.
  const RENDERABLE = ["requested", "approved", "declined", "confirmed"];
  if (!RENDERABLE.includes(bk.status)) notFound();

  const [lst] = await db
    .select({
      title: listing.title,
      primarySpaceType: listing.primarySpaceType,
      city: listing.city,
      timezone: listing.timezone,
      hourlyRateCents: listing.hourlyRateCents,
      dayRateCents: listing.dayRateCents,
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

  // fullDay is not persisted — re-derive from the frozen SPACE PRICE (see the reserve page). The Total
  // shown is always the frozen all-in quotedTotalCents (D-49); the label only chooses "Full day" vs an
  // hour range. Compared against the SPACE price, never the all-in total: under D-74 the latter is
  // `space + service fee` and can never equal `hourlyRate × hours`, which would mislabel every hourly
  // booking as "Full day". The `?? quoted` fallback covers a pre-Phase-7 row (fee was 0).
  const hours = windowHours(bk.startsAt, bk.endsAt);
  const quoted = bk.quotedTotalCents ?? 0;
  const hourlyTotal = lst.hourlyRateCents != null ? lst.hourlyRateCents * hours : null;
  const fullDay = hourlyTotal == null || (bk.spacePriceCents ?? quoted) !== hourlyTotal;

  const dateLabel = format(bk.startsAt, "EEEE, MMM d, yyyy", { in: inTz });
  const timeLabel = fullDay
    ? "Full day"
    : `${format(bk.startsAt, "h:mm a", { in: inTz })} – ${format(bk.endsAt, "h:mm a", { in: inTz })}`;
  const tzNote = venueTzNote(lst.city, timezone);
  const totalLabel = formatMoney(quoted, bk.currency ?? DISPLAY_CURRENCY);

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
          </CardContent>
        </Card>
      </main>
    );
  }

  // ── declined (optional calm landing, recommended over a bare 404). Muted — NEVER red (mirrors HoldExpiredState). ──
  if (bk.status === "declined") {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <Card>
          <CardContent
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-4 py-10 text-center"
          >
            <Badge variant="secondary" className="gap-1.5 text-muted-foreground">
              <XCircleIcon className="size-4" aria-hidden="true" />
              Declined
            </Badge>
            <div className="space-y-1">
              <h1 className="text-xl leading-tight font-semibold">This request wasn&apos;t available</h1>
              <p className="mx-auto max-w-prose text-sm text-muted-foreground">
                The host couldn&apos;t take your booking for {dateLabel}, {timeLabel}. You haven&apos;t been
                charged — plenty of other spaces are open.
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

  // ── confirmed (UNCHANGED) — the one terminal --success surface. ──
  const reference = bookingReference(bk.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <Card>
        <CardContent className="space-y-6 py-8">
          {/* Focal point: reassurance first — the success badge (icon + text, never color-only) + reference. */}
          <div className="flex flex-col items-center gap-3 text-center">
            <Badge className="gap-1.5 border-transparent bg-success text-success-foreground">
              <CheckCircle2Icon className="size-4" aria-hidden="true" />
              Confirmed
            </Badge>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-[28px]">
              Booking confirmed
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
              This page is your confirmation — it stays here if you refresh or come back later.
            </p>
            {/* At most one optional coral forward action (UI-SPEC accent #4); the badge stays --success. */}
            <Button asChild className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
              <Link href="/">Find another space</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
