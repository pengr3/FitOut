// The PUBLIC, un-authenticated listing detail page (LIST-06 / D-13).
//
// This RSC is placed OUTSIDE the (app)/(host) route groups on purpose: those layouts call
// auth.api.getSession() and redirect, whereas LIST-06 requires that ANYONE — with no session — can
// view a PUBLISHED listing. It inverts the gate of (app)/profile/page.tsx: no redirect, render for the
// anonymous public.
//
// Security boundaries enforced here:
//   - T-05-NONPUB: only status === "published" (and non-deleted) listings render; draft/unlisted and
//     missing ids notFound() (404) so non-public listings are never viewable by link.
//   - T-05-PII: the row is projected through publicListing() — the exact street + exact coordinates are
//     withheld unless the host set showExactAddress (D-09); the map draws a fuzzed circle otherwise.
//   - T-05-OWNERLEAK: host info shown comes from the Phase-1 publicProfile() allow-list, never raw user.
//   - T-05-BOOKABLE: the book CTA is derived from deriveBookable() (status + emailVerified +
//     payoutsEnabled), never from status alone — a published-but-not-payable listing shows a disabled
//     "Not bookable yet" affordance (payoutsEnabled is false until Plan 06 wires PayMongo). Real
//     booking is Phase 4+, so the coral CTA is a state-reflecting placeholder.

import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";
import { UsersIcon } from "lucide-react";

import { db } from "@/lib/db";
import { getAvailability } from "@/lib/availability/read-model";
import { DISPLAY_CURRENCY } from "@/lib/money";
import { allInRateParts } from "@/lib/booking/all-in-rate";
import { SERVICE_FEE_BPS } from "@/lib/payments/config";
import {
  listing,
  user,
  hostPayout,
  listingPhoto,
  listingAmenity,
  listingActivityTag,
} from "@/lib/db/schema";
import { deriveBookable } from "@/lib/bookability";
import { publicListing } from "@/lib/listing-public";
import { publicProfile } from "@/lib/profile";
import {
  SPACE_TYPE_LABELS,
  AMENITY_LABELS,
  ACTIVITY_TAG_LABELS,
  type AmenityValue,
  type ActivityTagValue,
} from "@/lib/listing-vocab";
import { PhotoGallery } from "@/components/listing/photo-gallery";
import { ListingMapPanel } from "@/components/listing/listing-map-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AvailabilityCalendar,
  BookingSelectionProvider,
  RailSelectionSummary,
} from "@/components/availability/availability-calendar";
import { BookCta } from "@/components/booking/book-cta";
import { CancellationPolicyDisclosure } from "@/components/booking/cancellation-policy-disclosure";
import { placeHold } from "@/app/actions/booking";
import { slotSelectionSchema } from "@/lib/validation/booking";
// venue-tz labels + the shared DISPLAY_CURRENCY are now imported (Plan 07 promoted both out of this file
// so the reserve + confirmation surfaces share ONE source and can never drift from the listing page).
import { gmtLabelFor, cityLabelFor } from "@/lib/venue-time";

export default async function PublicListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ start?: string; end?: string; fullDay?: string; resume?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  // Sign-in resume (D-41): after signing in at Book, the CTA returns here with the selected window in the
  // URL + resume=1. Re-validate the SHAPE (end>start, ISO) and hand it to the CTA to auto-resume checkout,
  // so the booker never re-picks the slot. Anything malformed simply drops the resume (no crash).
  const resumeParsed =
    sp.resume === "1"
      ? slotSelectionSchema.safeParse({ startUtc: sp.start, endUtc: sp.end, fullDay: sp.fullDay === "1" })
      : null;
  const resumeWindow = resumeParsed?.success ? resumeParsed.data : null;

  // Fetch the listing + host + cached payout flag in one query (LEFT JOIN so a host with no payout row
  // still resolves — payoutsEnabled just defaults false). deletedAt IS NULL excludes soft-deleted rows.
  const rows = await db
    .select()
    .from(listing)
    .innerJoin(user, eq(listing.hostId, user.id))
    .leftJoin(hostPayout, eq(hostPayout.userId, user.id))
    .where(and(eq(listing.id, id), isNull(listing.deletedAt)));
  const row = rows[0];

  // Draft/unlisted/missing → 404 to the public (D-13). Only published listings are viewable by link.
  if (!row || row.listing.status !== "published") {
    notFound();
  }

  // The sell-gate (never status alone). payoutsEnabled is false until Plan 06 → "Not bookable yet".
  const bookable = deriveBookable(
    { status: row.listing.status },
    {
      emailVerified: row.user.emailVerified,
      payoutsEnabled: row.host_payout?.payoutsEnabled ?? false,
    },
  );

  const [photoRows, amenityRows, tagRows] = await Promise.all([
    db
      .select()
      .from(listingPhoto)
      .where(eq(listingPhoto.listingId, id))
      .orderBy(asc(listingPhoto.position)),
    db.select().from(listingAmenity).where(eq(listingAmenity.listingId, id)),
    db.select().from(listingActivityTag).where(eq(listingActivityTag.listingId, id)),
  ]);

  // Project to ONLY the public shape — withholds exact street/coords unless showExactAddress (D-09).
  const pub = publicListing(
    {
      ...row.listing,
      photos: photoRows.map((p) => ({ id: p.id, url: p.url, position: p.position })),
      amenities: amenityRows.map((a) => a.amenity),
      activityTags: tagRows.map((t) => t.tag),
    },
    { showExactAddress: row.listing.showExactAddress },
  );

  // Host info via the Phase-1 allow-list (no private fields leak — T-05-OWNERLEAK).
  const host = publicProfile(row.user);

  const title = pub.title ?? "Untitled space";
  const spaceTypeLabel = pub.primarySpaceType ? SPACE_TYPE_LABELS[pub.primarySpaceType] : null;
  const amenityLabels = pub.amenities.map((a) => AMENITY_LABELS[a as AmenityValue] ?? a);
  const activityLabels = pub.activityTags.map((t) => ACTIVITY_TAG_LABELS[t as ActivityTagValue] ?? t);

  // Location summary line + map caption honor the approximate/exact toggle.
  const coarseLocation = [pub.neighborhood, pub.city, pub.region].filter(Boolean).join(", ");
  const exactLocation = [pub.addressLine1, pub.city, pub.region].filter(Boolean).join(", ");
  const mapCaption = pub.showExactAddress
    ? exactLocation || coarseLocation
    : coarseLocation
      ? `Approximate area — ${coarseLocation}. The exact address is shared after booking.`
      : "Approximate area. The exact address is shared after booking.";

  // D-75: search and listing pages display the ALL-IN rate so the number never goes up between browsing
  // and paying. These surfaces create no hold, so nothing is frozen here and the frozen-quote contract is
  // unaffected — the invariant holds because both surfaces and checkout use the SAME SERVICE_FEE_BPS.
  //
  // A RATE, never a promised total. 5% of an hourly rate × N hours can differ by one centavo from 5% of
  // (rate × N hours). Labelling these `/hr` and `/day` means no total is promised until checkout, so the
  // rounding edge cannot break D-75's "never goes up". Do NOT add a computed "estimated total" here —
  // that would create a promise the checkout could break by a centavo.
  //
  // Composed by the SHARED helper both browse surfaces use, so this page and the search grid cannot drift.
  const priceParts = allInRateParts(pub, DISPLAY_CURRENCY);

  // Availability (AVAIL-03) — always render in the venue's local timezone (SC#2). Seed the FIRST day
  // (today, venue-tz) server-side via the read model; the client calendar fetches later day-changes.
  const timezone = row.listing.timezone;
  const cityLabel = cityLabelFor(pub.city, timezone);
  const gmtLabel = gmtLabelFor(timezone);
  const nowInTz = tz(timezone);
  const now = new Date();
  const initialDate = {
    year: Number(format(now, "yyyy", { in: nowInTz })),
    month: Number(format(now, "M", { in: nowInTz })),
    day: Number(format(now, "d", { in: nowInTz })),
  };
  const initialDay = await getAvailability(db, id, initialDate);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <PhotoGallery photos={pub.photos} title={title} />

      <BookingSelectionProvider>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
        {/* Main content column */}
        <div className="space-y-8">
          <header className="space-y-2">
            <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-[28px]">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[spaceTypeLabel, coarseLocation].filter(Boolean).join(" · ") || "Fitness space"}
            </p>
            {host.firstName && (
              <p className="text-sm text-muted-foreground">Hosted by {host.firstName}</p>
            )}
          </header>

          {pub.description && (
            <>
              <Separator />
              <section className="space-y-3">
                <h2 className="text-xl font-semibold">About this space</h2>
                <p className="text-base leading-relaxed whitespace-pre-line text-foreground">
                  {pub.description}
                </p>
              </section>
            </>
          )}

          <Separator />
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Amenities</h2>
            {amenityLabels.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {amenityLabels.map((label) => (
                  <li key={label}>
                    <Badge variant="secondary">{label}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No amenities listed yet.</p>
            )}
            {activityLabels.length > 0 && (
              <ul className="flex flex-wrap gap-2 pt-1">
                {activityLabels.map((label) => (
                  <li key={label}>
                    <Badge variant="outline">{label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Separator />
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Location</h2>
            {pub.lat != null && pub.lng != null ? (
              <ListingMapPanel
                lat={pub.lat}
                lng={pub.lng}
                showExactAddress={pub.showExactAddress}
                caption={mapCaption}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{coarseLocation || "Location coming soon."}</p>
            )}
          </section>

          <Separator />
          <section className="space-y-3">
            {/* Heading stays server-rendered; the calendar itself is the client boundary (SC#2). */}
            <h2 className="text-xl font-semibold">Availability</h2>
            <AvailabilityCalendar
              listingId={id}
              timezone={timezone}
              cityLabel={cityLabel}
              gmtLabel={gmtLabel}
              unitCount={row.listing.unitCount}
              bookable={bookable}
              initialDate={initialDate}
              initialDay={initialDay}
            />
          </section>
        </div>

        {/* Booking rail — price + state-reflecting CTA */}
        <aside>
          <Card className="lg:sticky lg:top-8">
            <CardContent className="space-y-4 py-6">
              <div>
                <p className="text-2xl font-semibold tracking-tight">
                  {priceParts[0] ?? "Price on request"}
                </p>
                {priceParts[1] && (
                  <p className="text-sm text-muted-foreground">{priceParts[1]}</p>
                )}
                {priceParts.length > 0 && (
                  <p className="text-sm text-muted-foreground">Service fee included</p>
                )}
              </div>

              {/* D-81 — the refund promise, next to the price it qualifies. GENERIC mode: there is no
                  booking yet, so rungs are stated relative to session start; checkout re-states the same
                  ladder as concrete dates once a window is picked. A NULL tier renders nothing. */}
              <CancellationPolicyDisclosure tier={row.listing.cancellationPolicy} />

              {pub.maxOccupancy != null && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <UsersIcon className="size-4" aria-hidden="true" />
                  Up to {pub.maxOccupancy} {pub.maxOccupancy === 1 ? "person" : "people"}
                </p>
              )}

              {/* Selection summary — appears once the booker picks a run/full day (display-only). */}
              <RailSelectionSummary
                timezone={timezone}
                currency={DISPLAY_CURRENCY}
                hourlyRateCents={pub.hourlyRateCents}
                dayRateCents={pub.dayRateCents}
                // D-75: threaded from the server so the rail's estimate uses the SAME rate checkout
                // charges — a client-side default could silently disagree with a configured override.
                serviceFeeBps={SERVICE_FEE_BPS}
              />

              {bookable ? (
                // Bookable → placeHold mints the pending hold on ENTERING checkout (D-39) then redirects to
                // the reserve page; when sign-in is required the window is threaded through the callbackURL
                // so checkout resumes on return (D-41). The lifted picker selection drives it via context.
                <BookCta listingId={id} placeHold={placeHold} resumeWindow={resumeWindow} />
              ) : (
                // Published but not payable → disabled neutral affordance + explanatory tooltip (D-13).
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0} className="inline-block w-full">
                        <Button size="lg" variant="secondary" disabled className="w-full">
                          Not bookable yet
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      This space isn&apos;t accepting bookings yet — the host is finishing their
                      payout setup.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <p className="text-center text-xs text-muted-foreground">
                {bookable
                  ? "You won't be charged yet."
                  : "You can browse now — booking opens once this space is ready."}
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
      </BookingSelectionProvider>
    </main>
  );
}
