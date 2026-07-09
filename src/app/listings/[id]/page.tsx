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
import { CalendarClockIcon, UsersIcon } from "lucide-react";

import { db } from "@/lib/db";
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

/** Format integer minor units (cents) in the listing's currency (mirrors listing-card.formatMoney). */
function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return (cents / 100).toFixed(2);
  }
}

export default async function PublicListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  const priceParts: string[] = [];
  if (pub.hourlyRateCents != null) {
    priceParts.push(`${formatMoney(pub.hourlyRateCents, pub.currency)}/hr`);
  }
  if (pub.dayRateCents != null) {
    priceParts.push(`${formatMoney(pub.dayRateCents, pub.currency)}/day`);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <PhotoGallery photos={pub.photos} title={title} />

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
            <h2 className="text-xl font-semibold">Availability</h2>
            {/* Phase-3 placeholder (UI-SPEC line 130) — NOT a real calendar. */}
            <div className="rounded-xl border border-dashed p-6 text-center">
              <CalendarClockIcon
                className="mx-auto mb-2 size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="font-medium">Availability coming soon</p>
              <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
                This host is still setting up their calendar. Check back shortly.
              </p>
            </div>
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
              </div>

              {pub.maxOccupancy != null && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <UsersIcon className="size-4" aria-hidden="true" />
                  Up to {pub.maxOccupancy} {pub.maxOccupancy === 1 ? "person" : "people"}
                </p>
              )}

              {bookable ? (
                // Bookable → coral placeholder (wired Phase 4).
                <Button
                  size="lg"
                  className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  Book this space
                </Button>
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
    </main>
  );
}
