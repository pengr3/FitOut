"use server";

// Listing lifecycle server actions (LIST-01/03/04/05 · D-01/D-02/D-03/D-04/D-05).
//
// SECURITY CONTRACT (mirrors the Phase-1 input:false discipline — profile.ts / capability.ts):
//   - SESSION: every action requires an authenticated session (auth.api.getSession).
//   - OWNERSHIP (T-03-IDOR): every mutating action asserts listing.hostId === session.user.id via
//     assertOwnership() BEFORE any write, and every UPDATE re-scopes its WHERE to (id AND hostId) as
//     belt-and-suspenders. A non-owner is rejected — they can never edit/publish/unlist/delete
//     someone else's listing.
//   - STATUS / hostId / publishedAt are NEVER accepted from a client body (T-03-STATUS). status is
//     transitioned ONLY by publishListing / unlistListing here; saveListingStep writes ONLY the
//     draftSchema-parsed editable fields (Zod strips any smuggled status/hostId/publishedAt).
//   - PRICE / capacity (T-03-PRICE): re-validated as positive INTEGER cents / positive int server-side
//     via publishSchema at publish — the client price is never trusted.
//   - PUBLISH GATE (D-02): publishListing enforces, server-side, publishSchema.parse(row) AND ≥3
//     photos AND host.emailVerified === true. This is where the Phase-1 soft email-verification gate
//     (01-CONTEXT D-07) is enforced. This plan is payment-agnostic — payout/bookability is Plan 06.
//   - Soft-deleted rows (deletedAt IS NOT NULL) are excluded from normal reads/writes.

import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql, type InferInsertModel } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  listing,
  listingPhoto,
  listingAmenity,
  listingActivityTag,
  user,
} from "@/lib/db/schema";
import {
  draftSchema,
  publishSchema,
  type DraftListingInput,
} from "@/lib/validation/listing";

const MIN_PHOTOS = 3; // D-02/D-04 — minimum photos to publish.

export type ListingResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Resolve the signed-in user's id, or null if there is no session (copied from capability.ts). */
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

/**
 * IDOR guard: load a non-deleted listing and return it ONLY if it belongs to `userId`, else null.
 * Every mutating action funnels through this before touching a row.
 */
async function assertOwnership(listingId: string, userId: string) {
  const rows = await db
    .select()
    .from(listing)
    .where(and(eq(listing.id, listingId), isNull(listing.deletedAt)));
  const row = rows[0];
  if (!row || row.hostId !== userId) return null;
  return row;
}

/**
 * Create an empty DRAFT owned by the signed-in user (D-01 draft-first). The wizard then autosaves
 * into it via saveListingStep. status defaults to "draft" and bookingMode to "instant" (D-62 — the
 * demand-first default flip, was "request" under D-04). This create-code default is independent of
 * (and mirrors) the DB SET DEFAULT flipped in 06-01's migration; existing listings are unaffected.
 */
export async function createDraftListing(): Promise<ListingResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to create a listing." };
  }
  const id = randomUUID();
  await db.insert(listing).values({
    id,
    hostId: userId,
    status: "draft",
    bookingMode: "instant",
  });
  return { ok: true, id };
}

/**
 * Autosave one wizard step (D-01). Re-validates with the shared draftSchema (never trusts the client),
 * writes ONLY the editable draft fields to the OWNER's row (never status/hostId/publishedAt), maps
 * lat/lng → PostGIS point {x:lng, y:lat} (Pitfall 1), and replaces the amenity/activity-tag join rows
 * when those arrays are provided. Idempotent partial save — undefined fields are left untouched.
 */
export async function saveListingStep(
  listingId: string,
  input: DraftListingInput,
): Promise<ListingResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to edit a listing." };
  }

  const owned = await assertOwnership(listingId, userId);
  if (!owned) {
    return { ok: false, error: "We couldn't find that listing, or it isn't yours to edit." };
  }

  // Never trust the client — re-validate with the SAME schema the wizard form uses.
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;

  // Build the editable-field patch. status / hostId / publishedAt are NOT here — they can never be
  // set via autosave (they aren't in draftSchema, and Zod strips any smuggled keys). updatedAt is
  // always set so the SET clause is never empty on a sparse save.
  const patch: Partial<InferInsertModel<typeof listing>> = {
    title: d.title,
    description: d.description,
    primarySpaceType: d.primarySpaceType,
    addressLine1: d.addressLine1,
    addressLine2: d.addressLine2,
    city: d.city,
    region: d.region,
    postalCode: d.postalCode,
    country: d.country,
    neighborhood: d.neighborhood,
    maxOccupancy: d.maxOccupancy,
    hourlyRateCents: d.hourlyRateCents,
    dayRateCents: d.dayRateCents,
    bookingMode: d.bookingMode,
    showExactAddress: d.showExactAddress,
    updatedAt: new Date(),
  };
  // AXIS ORDER (Pitfall 1): x = longitude, y = latitude. Only write when BOTH are present.
  if (typeof d.lat === "number" && typeof d.lng === "number") {
    patch.location = { x: d.lng, y: d.lat };
  }

  await db.transaction(async (tx) => {
    // Re-scope the write to (id AND hostId) — defense in depth on top of assertOwnership.
    await tx
      .update(listing)
      .set(patch)
      .where(and(eq(listing.id, listingId), eq(listing.hostId, userId)));

    // Amenities / activity tags: when the array is provided, REPLACE the set atomically (no stale
    // rows leak across saves). An empty array clears them; undefined leaves them untouched.
    if (d.amenities !== undefined) {
      await tx.delete(listingAmenity).where(eq(listingAmenity.listingId, listingId));
      if (d.amenities.length > 0) {
        await tx
          .insert(listingAmenity)
          .values(d.amenities.map((amenity) => ({ listingId, amenity })));
      }
    }
    if (d.activityTags !== undefined) {
      await tx.delete(listingActivityTag).where(eq(listingActivityTag.listingId, listingId));
      if (d.activityTags.length > 0) {
        await tx
          .insert(listingActivityTag)
          .values(d.activityTags.map((tag) => ({ listingId, tag })));
      }
    }
  });

  revalidatePath(`/host/listings/${listingId}/edit`);
  return { ok: true, id: listingId };
}

/**
 * The strict draft→publish gate (D-02), enforced ENTIRELY server-side. Publishing requires:
 *   1. publishSchema.parse(row) — all core fields + BOTH positive integer-cents rates + lat/lng (D-03/D-10)
 *   2. ≥3 photos (D-04)
 *   3. host.emailVerified === true (the Phase-1 soft gate, 01-CONTEXT D-07)
 * On any failure it returns a structured error naming exactly what's missing (drives the wizard's
 * live "finish these to publish" checklist). status is flipped to "published" ONLY here, never from
 * a client field.
 */
export async function publishListing(listingId: string): Promise<ListingResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to publish a listing." };
  }

  const row = await assertOwnership(listingId, userId);
  if (!row) {
    return { ok: false, error: "We couldn't find that listing, or it isn't yours to publish." };
  }

  // The two non-form halves of the gate: the host's verified email and the listing's photo count.
  const hostRows = await db
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, userId));
  const emailVerified = hostRows[0]?.emailVerified ?? false;

  const photoRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listingPhoto)
    .where(eq(listingPhoto.listingId, listingId));
  const photoCount = photoRows[0]?.count ?? 0;

  // Re-validate ALL core fields from the PERSISTED row (never trust prior client state). lat/lng are
  // read back out of the PostGIS point with the correct axis order (y=lat, x=lng).
  const parsed = publishSchema.safeParse({
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    primarySpaceType: row.primarySpaceType ?? undefined,
    addressLine1: row.addressLine1 ?? undefined,
    addressLine2: row.addressLine2 ?? undefined,
    city: row.city ?? undefined,
    region: row.region ?? undefined,
    postalCode: row.postalCode ?? undefined,
    country: row.country ?? undefined,
    neighborhood: row.neighborhood ?? undefined,
    lat: row.location?.y,
    lng: row.location?.x,
    maxOccupancy: row.maxOccupancy ?? undefined,
    hourlyRateCents: row.hourlyRateCents ?? undefined,
    dayRateCents: row.dayRateCents ?? undefined,
    bookingMode: row.bookingMode,
    showExactAddress: row.showExactAddress,
  });

  const fieldErrors: Record<string, string[]> = {};
  if (!parsed.success) {
    Object.assign(fieldErrors, parsed.error.flatten().fieldErrors);
  }
  const hasMinPhotos = photoCount >= MIN_PHOTOS; // >= 3 photos (D-02/D-04)
  if (!hasMinPhotos) {
    const need = MIN_PHOTOS - photoCount;
    fieldErrors.photos = [
      `Add ${need} more photo${need === 1 ? "" : "s"} to publish (minimum ${MIN_PHOTOS}).`,
    ];
  }
  if (!emailVerified) {
    fieldErrors.emailVerified = ["Verify your email to publish."];
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Almost there — finish these to publish.", fieldErrors };
  }

  // Full gate passed. status is set HERE only — the single sanctioned draft→published transition.
  await db
    .update(listing)
    .set({ status: "published", publishedAt: new Date() })
    .where(and(eq(listing.id, listingId), eq(listing.hostId, userId)));

  revalidatePath("/host/listings");
  revalidatePath(`/host/listings/${listingId}/edit`);
  return { ok: true, id: listingId };
}

/**
 * Take a published listing off the market (D-05). Sets status="unlisted" — data is fully preserved
 * and the listing is re-publishable. Reversible; NOT destructive.
 */
export async function unlistListing(listingId: string): Promise<ListingResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to unlist a listing." };
  }
  const row = await assertOwnership(listingId, userId);
  if (!row) {
    return { ok: false, error: "We couldn't find that listing, or it isn't yours." };
  }
  await db
    .update(listing)
    .set({ status: "unlisted" })
    .where(and(eq(listing.id, listingId), eq(listing.hostId, userId)));

  revalidatePath("/host/listings");
  return { ok: true, id: listingId };
}

/**
 * Soft-delete a listing (Claude's discretion) — sets deletedAt so the row is retained (forward-safe
 * for when bookings FK to listings in later phases) but excluded from all normal reads.
 */
export async function softDeleteListing(listingId: string): Promise<ListingResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to delete a listing." };
  }
  const row = await assertOwnership(listingId, userId);
  if (!row) {
    return { ok: false, error: "We couldn't find that listing, or it isn't yours." };
  }
  await db
    .update(listing)
    .set({ deletedAt: new Date() })
    .where(and(eq(listing.id, listingId), eq(listing.hostId, userId)));

  revalidatePath("/host/listings");
  return { ok: true, id: listingId };
}
