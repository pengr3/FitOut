// Listing edit wizard host (RSC). Reads the session (canHost re-check — defense in depth), loads the
// caller's OWN non-deleted listing + its photos/amenities/tags, and seeds the client wizard. IDOR:
// a listing that isn't the caller's returns notFound() (we don't leak existence). lat/lng are read
// back out of the PostGIS point with the correct axis order (y = latitude, x = longitude).

import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  listing,
  listingPhoto,
  listingAmenity,
  listingActivityTag,
  listingReview,
} from "@/lib/db/schema";
import { getModeLockState } from "@/lib/listing/mode-lock";
import { composeDeadlineLabel } from "@/lib/booking/when-label";
import { HOST_PANEL_SHELL, WIZARD_CHECKLIST_GRID } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";
import { ListingWizard, type ModeLockDisplay, type WizardListing } from "./wizard";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & {
    canHost?: boolean;
    email?: string | null;
    emailVerified?: boolean;
  };
  if (!u.canHost) {
    redirect("/");
  }

  const latestRejectedReview = db
    .select({ reason: listingReview.reason })
    .from(listingReview)
    .where(and(eq(listingReview.listingId, id), eq(listingReview.state, "rejected")))
    .orderBy(desc(listingReview.submittedAt), desc(listingReview.id))
    .limit(1)
    .as("latest_rejected_review");

  const rows = await db
    .select({
      listing,
      rejectionReason: latestRejectedReview.reason,
    })
    .from(listing)
    .leftJoin(latestRejectedReview, sql`true`)
    .where(
      and(
        eq(listing.id, id),
        eq(listing.hostId, session.user.id),
        isNull(listing.deletedAt),
      ),
    );
  const selected = rows[0];
  // IDOR guard: absent, deleted, or owned by someone else all collapse to the same 404.
  if (!selected) {
    notFound();
  }
  const row = selected.listing;

  const [photos, amenities, tags, lock] = await Promise.all([
    db.select().from(listingPhoto).where(eq(listingPhoto.listingId, id)),
    db.select().from(listingAmenity).where(eq(listingAmenity.listingId, id)),
    db.select().from(listingActivityTag).where(eq(listingActivityTag.listingId, id)),
    // OC-17 — the mode lock is computed HERE, on the server, from the DB clock (09-06). The wizard renders
    // it and derives nothing: a browser clock that runs fast must not be able to un-grey a card.
    getModeLockState(db, id),
  ]);

  // D-105 / copy rule O10: the unlock instant is rendered venue-local with the timezone named, HERE, by the
  // shipped label helper — the alert component formats nothing. A client-side format would show the host's
  // own clock, which for a host travelling is a different instant from the one the lock actually lifts at.
  // `unlocksAt` is non-null exactly when `locked` is true (MAX(ends_at) over the counted set), and the
  // discriminated union makes the compiler insist on both values for the locked branch.
  const modeLock: ModeLockDisplay =
    lock.locked && lock.unlocksAt
      ? {
          locked: true,
          lockedByCount: lock.lockedByCount,
          unlocksAtLabel: composeDeadlineLabel(lock.unlocksAt, row.timezone, row.city),
        }
      : { locked: false };

  const wizardListing: WizardListing = {
    id: row.id,
    title: row.title,
    description: row.description,
    primarySpaceType: row.primarySpaceType,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    region: row.region,
    postalCode: row.postalCode,
    country: row.country,
    neighborhood: row.neighborhood,
    lat: row.location?.y ?? null, // y = latitude (Pitfall 1)
    lng: row.location?.x ?? null, // x = longitude
    maxOccupancy: row.maxOccupancy,
    hourlyRateCents: row.hourlyRateCents,
    dayRateCents: row.dayRateCents,
    // D-123/D-125 — the mode drives which pricing fields the wizard renders and which publish-checklist
    // rows it lists. `occupancyMode` is NOT NULL (default `exclusive`), so the wizard decides from the row
    // as a whole whether that value was ever actually CHOSEN; passing it through unmassaged is what lets it.
    occupancyMode: row.occupancyMode,
    perHeadPriceCents: row.perHeadPriceCents,
    // D-108 — passed through INCLUDING null; the wizard seeds the app-level defaults (fee ₱0, includes 1)
    // so a pre-Phase-8 listing renders as the flat-priced space it already is.
    included: row.included,
    extraHeadFee: row.extraHeadFee,
    currency: row.currency,
    bookingMode: row.bookingMode,
    // D-77 — passed through as-is, INCLUDING null. A pre-Phase-7 listing has no tier and must reach the
    // wizard unchosen so the step renders with nothing selected and the publish checklist reads unmet.
    cancellationPolicy: row.cancellationPolicy,
    showExactAddress: row.showExactAddress,
    status: row.status,
    amenities: amenities.map((a) => a.amenity),
    activityTags: tags.map((t) => t.tag),
    photoCount: photos.length,
    // Ordered { id, publicId, url, position } for the client uploader/reorder grid (0 = cover, D-04).
    photos: [...photos]
      .sort((a, b) => a.position - b.position)
      .map((p) => ({
        id: p.id,
        publicId: p.publicId,
        url: p.url,
        position: p.position,
      })),
  };

  return (
    // THE SHELL WIDENS AT THE LARGE BREAKPOINT AND ONLY THERE (D-149). Below it nothing about this
    // page's width changes: the shared host panel container is byte-identical to the string this file
    // used to type by hand, so the small-screen diff is a constant swap and nothing else.
    <div className={cn(HOST_PANEL_SHELL, "lg:max-w-5xl")}>
      {/*
        THE TWO-COLUMN GRID, FROM THE DECLARED TRACK. `WIZARD_CHECKLIST_GRID` owns the 288px number
        and `WIZARD_CHECKLIST_COL` — the width the checklist column itself carries, over in the wizard
        — is derived from it. They are ONE NUMBER WRITTEN TWICE and the derivation lives in
        `measurements.ts`; a column that does not fill its own track leaves a gap nobody chose, with
        no visible cause. Neither value is typed here.

        THE DISPLAY AND GAP UTILITIES ARE THE CALL SITE'S, which is what the track's own docstring
        asks for: only the track carries a derived value. `grid` is unprefixed on purpose — below the
        large breakpoint this is a ONE-column grid, and its 32px row gap is exactly the vertical
        rhythm the wizard's own root used to supply, so the small-screen layout is unmoved.
      */}
      <div className={cn("grid gap-8", WIZARD_CHECKLIST_GRID)}>
        <ListingWizard
          listing={wizardListing}
          hostEmail={u.email ?? session.user.email ?? ""}
          emailVerified={Boolean(u.emailVerified ?? session.user.emailVerified)}
          modeLock={modeLock}
          reReviewContext={
            row.reviewState === "rejected"
              ? { reason: selected.rejectionReason?.trim() || null }
              : null
          }
        />
      </div>
    </div>
  );
}
