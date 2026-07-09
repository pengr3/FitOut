// Listing edit wizard host (RSC). Reads the session (canHost re-check — defense in depth), loads the
// caller's OWN non-deleted listing + its photos/amenities/tags, and seeds the client wizard. IDOR:
// a listing that isn't the caller's returns notFound() (we don't leak existence). lat/lng are read
// back out of the PostGIS point with the correct axis order (y = latitude, x = longitude).

import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  listing,
  listingPhoto,
  listingAmenity,
  listingActivityTag,
} from "@/lib/db/schema";
import { ListingWizard, type WizardListing } from "./wizard";

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

  const rows = await db
    .select()
    .from(listing)
    .where(and(eq(listing.id, id), isNull(listing.deletedAt)));
  const row = rows[0];
  // IDOR guard: not found OR not the caller's → 404 (don't reveal another host's listing exists).
  if (!row || row.hostId !== session.user.id) {
    notFound();
  }

  const [photos, amenities, tags] = await Promise.all([
    db.select().from(listingPhoto).where(eq(listingPhoto.listingId, id)),
    db.select().from(listingAmenity).where(eq(listingAmenity.listingId, id)),
    db.select().from(listingActivityTag).where(eq(listingActivityTag.listingId, id)),
  ]);

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
    currency: row.currency,
    bookingMode: row.bookingMode,
    showExactAddress: row.showExactAddress,
    status: row.status,
    amenities: amenities.map((a) => a.amenity),
    activityTags: tags.map((t) => t.tag),
    photoCount: photos.length,
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <ListingWizard
        listing={wizardListing}
        hostEmail={u.email ?? session.user.email ?? ""}
        emailVerified={Boolean(u.emailVerified ?? session.user.emailVerified)}
      />
    </div>
  );
}
