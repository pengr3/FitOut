// The reserve / checkout page (BOOK-01/02 · D-39/D-42/D-44). Reached ONLY from the placeHold POST action
// (the listing "Book this space" CTA), which mints the pending hold and redirects here with ?hold=<id>.
//
// This RSC READS the hold — it NEVER creates one. Hold creation lives exclusively in the placeHold POST
// action (Pitfall 2 / T-04-GETDUP): a GET render that minted a hold would duplicate it on every
// prefetch / refresh / Back. So there is deliberately NO placeHold / createPendingHold call here.
//
// Security boundaries enforced here:
//   - T-04-RESERVEIDOR: the hold is loaded owner-gated — a missing row, a hold owned by a DIFFERENT
//     booker, or no session all notFound() (a bare 404 reveals nothing about another booker's hold).
//   - D-42 idempotency: an already-`confirmed` OWN hold revisited here REDIRECTS to the durable
//     confirmation — a booked user must NEVER be shown "your hold expired".
//   - D-44 graceful expiry: a genuinely expired / cancelled (non-confirmed) hold renders the calm
//     HoldExpiredState, never a stale reserve form.
//
// Times are timestamptz UTC, displayed venue-local at the edge (SC#2). Prices are the server-FROZEN quote
// (booking.quotedTotalCents, D-49) — never a client recompute.

import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing, listingPhoto } from "@/lib/db/schema";
import { windowHours } from "@/lib/booking/pricing";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { SPACE_TYPE_LABELS, type SpaceTypeValue } from "@/lib/listing-vocab";
import { venueTzNote } from "@/lib/venue-time";
import { PriceBreakdown } from "@/components/booking/price-breakdown";
import { HoldExpiredState } from "@/components/booking/hold-expired-state";
import { ReserveView } from "@/components/booking/reserve-view";

export default async function ReservePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hold?: string | string[] }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const holdId = Array.isArray(sp.hold) ? sp.hold[0] : sp.hold;

  // Session gate first — a hold belongs to a booker, so no session can never be the owner (→ 404, not a
  // login bounce: reaching this page always follows an authenticated placeHold redirect).
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId || !holdId) notFound();

  const now = new Date();

  // Owner-gated hold read (T-04-RESERVEIDOR). The URL id ≠ /listings/[id] path id: the hold row carries
  // its own listingId; we trust the row, not the path segment.
  const [bk] = await db
    .select({
      id: booking.id,
      listingId: booking.listingId,
      bookerId: booking.bookerId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      status: booking.status,
      expiresAt: booking.expiresAt,
      quotedTotalCents: booking.quotedTotalCents,
      // The D-74 frozen split. `quotedTotalCents` is the ALL-IN charge; these two are its parts, frozen at
      // hold creation. Both are read (never recomputed) so the breakdown the booker agrees to is exactly
      // the amount that will be charged.
      spacePriceCents: booking.spacePriceCents,
      serviceFeeCents: booking.serviceFeeCents,
      currency: booking.currency,
    })
    .from(booking)
    .where(eq(booking.id, holdId));
  if (!bk || bk.bookerId !== userId) notFound();

  // Defense in depth: the legit flow always lands on the hold's OWN listing (placeHold redirects to
  // /listings/${listingId}/book). A mismatched path id is a crafted URL → 404 rather than a confusing render.
  if (bk.listingId !== id) notFound();

  // D-42: an already-confirmed OWN hold → the durable confirmation, NEVER the expiry state (a booked user
  // must never be told their hold expired). Short-circuits before any expiry check.
  if (bk.status === "confirmed") redirect(`/bookings/${bk.id}`);

  // D-44: only a still-live hold with a future TTL renders the reserve/pay form. Live = a `pending` instant
  // hold OR an `approved` request (PAY-05 / D-63 — this same pay page is reused for pay-on-approval, so the
  // approved booker lands on the exact Phase-5 "Confirm & pay" surface). Anything else (cancelled/declined,
  // a not-yet-approved `requested`, or a hold past its expires_at) degrades to the calm expiry interstitial.
  const active =
    (bk.status === "pending" || bk.status === "approved") &&
    !!bk.expiresAt &&
    bk.expiresAt.getTime() > now.getTime();
  if (!active) return <HoldExpiredState listingId={bk.listingId} />;

  // Live hold → load the listing facts (rates + venue tz) + the cover thumb for the summary.
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

  const [cover] = await db
    .select({ url: listingPhoto.url })
    .from(listingPhoto)
    .where(eq(listingPhoto.listingId, bk.listingId))
    .orderBy(asc(listingPhoto.position))
    .limit(1);

  const timezone = lst.timezone;
  const inTz = tz(timezone);
  const tzNote = venueTzNote(lst.city, timezone);
  const title = lst.title ?? "Untitled space";
  const spaceTypeLabel = lst.primarySpaceType
    ? SPACE_TYPE_LABELS[lst.primarySpaceType as SpaceTypeValue]
    : null;

  // fullDay is NOT persisted on the booking row (schema.ts) — re-derive it from the frozen SPACE PRICE: a
  // full-day hold froze the flat day rate, an hourly hold froze hourlyRate × hours. The Total shown is
  // ALWAYS the frozen all-in quotedTotalCents (D-49) regardless of this label; only the "/day" vs "/hr × N"
  // wording depends on the derivation. Bias to hourly on an exact coincidence (shows the real hours).
  //
  // ⚠️ Compared against `spacePriceCents`, NOT the all-in total. Under D-74 the charged total is
  // `space + service fee`, so it can never equal `hourlyRate × hours` and would mislabel EVERY hourly
  // booking as "Full day". `quotedTotalCents` remains the fallback for a pre-Phase-7 row (fee was 0).
  const hours = windowHours(bk.startsAt, bk.endsAt);
  const quoted = bk.quotedTotalCents ?? 0;
  // The D-74 split, read off the frozen row. LEGACY FALLBACK: a pre-Phase-7 booking has a null split and
  // genuinely had no service fee, so `space = the whole charge, fee = 0` reproduces exactly what it was
  // charged — and `serviceFeeCents === 0` makes PriceBreakdown omit the fee row entirely.
  const spacePriceCents = bk.spacePriceCents ?? quoted;
  const serviceFeeCents = bk.serviceFeeCents ?? 0;
  const hourlyTotal = lst.hourlyRateCents != null ? lst.hourlyRateCents * hours : null;
  const fullDay = hourlyTotal == null || spacePriceCents !== hourlyTotal;

  const dateLabel = format(bk.startsAt, "EEEE, MMM d", { in: inTz });
  const timeLabel = fullDay
    ? "Full day"
    : `${format(bk.startsAt, "h:mm a", { in: inTz })} – ${format(bk.endsAt, "h:mm a", { in: inTz })}`;

  const summary = (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {cover?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.url} alt={title} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
              No photo
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <h2 className="text-xl leading-tight font-semibold">{title}</h2>
          {spaceTypeLabel && <p className="text-sm text-muted-foreground">{spaceTypeLabel}</p>}
          <p className="text-sm text-muted-foreground">{tzNote}</p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Your booking</h3>
        <p className="mt-1 text-base">{dateLabel}</p>
        <p className="text-base text-muted-foreground">
          <span className="tabular-nums">{timeLabel}</span>
          {!fullDay && ` · ${hours} ${hours === 1 ? "hour" : "hours"}`}
        </p>
      </div>
    </div>
  );

  const breakdown = (
    <PriceBreakdown
      quotedTotalCents={quoted}
      spacePriceCents={spacePriceCents}
      serviceFeeCents={serviceFeeCents}
      currency={bk.currency ?? DISPLAY_CURRENCY}
      fullDay={fullDay}
      hours={hours}
      hourlyRateCents={lst.hourlyRateCents}
      dayRateCents={lst.dayRateCents}
    />
  );

  // Server-formatted charged amount for the `Confirm & pay` reassurance (D-57) — the frozen quote (D-49),
  // never a client recompute.
  const totalLabel = formatMoney(quoted, bk.currency ?? DISPLAY_CURRENCY);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="space-y-1">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-[28px]">
          Review and book
        </h1>
        <p className="text-sm text-muted-foreground">{tzNote}</p>
      </header>

      <div className="mt-8">
        <ReserveView
          holdId={bk.id}
          listingId={bk.listingId}
          expiresAt={bk.expiresAt!.toISOString()}
          totalLabel={totalLabel}
          summary={summary}
          breakdown={breakdown}
        />
      </div>
    </main>
  );
}
