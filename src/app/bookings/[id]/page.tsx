// The durable booking confirmation (BOOK-03 · D-43). A top-level route (NOT under the (app)/(host) gated
// groups on purpose) — the OWNER-GATE, not the route group, is the security boundary (Security V4).
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
import { CheckCircle2Icon } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing } from "@/lib/db/schema";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { windowHours } from "@/lib/booking/pricing";
import { bookingReference } from "@/lib/booking/reference";
import { SPACE_TYPE_LABELS, type SpaceTypeValue } from "@/lib/listing-vocab";
import { venueTzNote } from "@/lib/venue-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PendingPaymentState } from "@/components/booking/pending-payment-state";
import { PaymentReversedState } from "@/components/booking/payment-reversed-state";

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
      currency: booking.currency,
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
  // Any other non-confirmed status has no confirmation to show.
  if (bk.status !== "confirmed") notFound();

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
  const reference = bookingReference(bk.id);
  const title = lst.title ?? "Untitled space";
  const spaceTypeLabel = lst.primarySpaceType
    ? SPACE_TYPE_LABELS[lst.primarySpaceType as SpaceTypeValue]
    : null;

  // fullDay is not persisted — re-derive from the FROZEN quote (see the reserve page). The Total shown is
  // always the frozen quotedTotalCents (D-49); the label only chooses "Full day" vs an hour range.
  const hours = windowHours(bk.startsAt, bk.endsAt);
  const quoted = bk.quotedTotalCents ?? 0;
  const hourlyTotal = lst.hourlyRateCents != null ? lst.hourlyRateCents * hours : null;
  const fullDay = hourlyTotal == null || quoted !== hourlyTotal;

  const dateLabel = format(bk.startsAt, "EEEE, MMM d, yyyy", { in: inTz });
  const timeLabel = fullDay
    ? "Full day"
    : `${format(bk.startsAt, "h:mm a", { in: inTz })} – ${format(bk.endsAt, "h:mm a", { in: inTz })}`;
  const tzNote = venueTzNote(lst.city, timezone);

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
              <dd className="text-right text-base font-semibold tabular-nums">
                {formatMoney(quoted, bk.currency ?? DISPLAY_CURRENCY)}
              </dd>
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
