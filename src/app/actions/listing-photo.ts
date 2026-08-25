"use server";

// Listing photo metadata server actions (LIST-02 · D-04). Photo BYTES never transit this server —
// they go browser→Cloudinary via the signed direct upload (see /api/cloudinary/sign). These actions
// persist and reorder only the { public_id, url, position } METADATA row, and destroy the Cloudinary
// asset on removal (orphan cleanup).
//
// SECURITY CONTRACT (mirrors listing.ts / the Phase-1 input:false discipline):
//   - SESSION: every action requires an authenticated session (auth.api.getSession).
//   - OWNERSHIP (T-04-IDOR): every action asserts listing.hostId === session.user.id via
//     assertOwnership() BEFORE any write, and every row write is re-scoped to listingId — a non-owner
//     can never persist/reorder/remove another host's photos.
//   - position is SERVER-assigned (append = current count; reorder = index) — it is never taken from a
//     client field. position 0 = the cover (D-04).
//   - ORPHAN CLEANUP (T-04-ORPHAN): removePhoto destroys the Cloudinary asset by its stored public_id.
//   - PROVENANCE (D-165, T-16-14/15/16): persistPhoto stores { publicId, url } only when the pair is
//     one OUR pipeline could have produced — url parsed and matched against our own Cloudinary
//     delivery origin, publicId scoped to fitout/listings/<listingId>/ — and FAILS CLOSED when the
//     cloud name is unconfigured. The stored url is rendered as <img src> on a PUBLIC page.

import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listing, listingPhoto } from "@/lib/db/schema";
import { destroyListingPhoto } from "@/lib/cloudinary";
import { isOwnCloudinaryAsset } from "@/lib/listing/cloudinary-provenance";

// Generous soft cap (D-04). Publishing needs >=3; this bounds the top end so a single listing can't be
// used to stockpile unbounded assets. Kept high enough to never get in a real host's way.
const MAX_PHOTOS = 20;

export type ListingPhotoRow = {
  id: string;
  publicId: string;
  url: string;
  position: number;
};

export type PhotoResult = { ok: true } | { ok: false; error: string };
export type PersistPhotoResult =
  | { ok: true; photo: ListingPhotoRow }
  | { ok: false; error: string };

/** Resolve the signed-in user's id, or null if there is no session (copied from listing.ts). */
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

/**
 * IDOR guard: return the non-deleted listing ONLY if it belongs to `userId`, else null. Every action
 * funnels through this before touching a photo row.
 */
async function assertOwnership(listingId: string, userId: string) {
  const rows = await db
    .select({ id: listing.id, hostId: listing.hostId })
    .from(listing)
    .where(and(eq(listing.id, listingId), isNull(listing.deletedAt)));
  const row = rows[0];
  if (!row || row.hostId !== userId) return null;
  return row;
}

/** Count the photos currently attached to a listing (used to append at the next position). */
async function photoCount(listingId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listingPhoto)
    .where(eq(listingPhoto.listingId, listingId));
  return rows[0]?.count ?? 0;
}

function revalidateEdit(listingId: string) {
  revalidatePath(`/host/listings/${listingId}/edit`);
}

/**
 * Append one photo's metadata to the owner's listing. position = the current photo count (so the very
 * first upload lands at 0 = cover, D-04). Rejects beyond the soft max and validates the metadata is
 * present (the columns are NOT NULL). Returns the created row so the client can update its grid.
 */
export async function persistPhoto(
  listingId: string,
  input: { publicId: string; url: string },
): Promise<PersistPhotoResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to add photos." };
  }
  const owned = await assertOwnership(listingId, userId);
  if (!owned) {
    return { ok: false, error: "We couldn't find that listing, or it isn't yours." };
  }

  const publicId = input.publicId?.trim();
  const url = input.url?.trim();
  if (!publicId || !url) {
    return { ok: false, error: "That photo didn't upload. Please try again." };
  }

  // PROVENANCE (D-165). Everything above proves WHO is writing. This proves WHAT they are writing is
  // something our own signed-upload pipeline could have produced — because the stored url becomes a
  // plain <img src> on the PUBLIC listing page, and a host who skips the widget and calls this action
  // directly would otherwise serve arbitrary third-party content under FitOut's surface.
  //
  // The cloud name is resolved HERE, once, and PASSED IN. The check itself
  // (src/lib/listing/cloudinary-provenance.ts) reads no ambient configuration on purpose.
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    // FAIL CLOSED — and this branch must NEVER become an early `return { ok: true }` or a skip.
    // .github/workflows/ci.yml records at :151 and :875 that the test jobs hold no Cloudinary
    // credential, so this is the branch that runs continuously; a skip here would make the guard
    // dead exactly where it is exercised most while every test of it passed vacuously. An app with
    // no cloud name configured cannot legitimately be persisting a Cloudinary url in any case.
    console.warn(
      "[listing-photo] CLOUDINARY_CLOUD_NAME is not configured — refusing to persist photo metadata (D-165).",
    );
  }
  if (!isOwnCloudinaryAsset({ url, publicId, listingId, cloudName })) {
    // Δ15 / rule F1 — the SHIPPED literal, naming no vendor, no url and no folder. The distinction
    // between "empty" and "not ours" belongs in the server log, not in the host's error toast.
    console.warn(
      `[listing-photo] rejected photo metadata that our pipeline could not have produced, listing ${listingId} (D-165).`,
    );
    return { ok: false, error: "That photo didn't upload. Please try again." };
  }

  const position = await photoCount(listingId);
  if (position >= MAX_PHOTOS) {
    return {
      ok: false,
      error: `You can add up to ${MAX_PHOTOS} photos. Remove one to add another.`,
    };
  }

  const id = randomUUID();
  await db.insert(listingPhoto).values({ id, listingId, publicId, url, position });

  revalidateEdit(listingId);
  return { ok: true, photo: { id, publicId, url, position } };
}

/**
 * Rewrite photo positions to match `orderedIds` (0 = cover, D-04). Atomic: the whole reorder runs in a
 * single transaction. Because the (listingId, position) unique index is NOT deferrable, a naive
 * single-pass "set position = i" would collide mid-swap (e.g. a reversal), so we do it in TWO phases —
 * first park every row at a temporary NEGATIVE position (distinct and disjoint from the final 0..n-1
 * range), then assign the final contiguous positions. Every update is re-scoped to listingId (IDOR).
 */
export async function reorderPhotos(
  listingId: string,
  orderedIds: string[],
): Promise<PhotoResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to reorder photos." };
  }
  const owned = await assertOwnership(listingId, userId);
  if (!owned) {
    return { ok: false, error: "We couldn't find that listing, or it isn't yours." };
  }

  await db.transaction(async (tx) => {
    // Phase 1: temporary negative slots — no collision with any row still holding a final position.
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(listingPhoto)
        .set({ position: -(i + 1) })
        .where(
          and(eq(listingPhoto.id, orderedIds[i]), eq(listingPhoto.listingId, listingId)),
        );
    }
    // Phase 2: final contiguous positions (0 = cover).
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(listingPhoto)
        .set({ position: i })
        .where(
          and(eq(listingPhoto.id, orderedIds[i]), eq(listingPhoto.listingId, listingId)),
        );
    }
  });

  revalidateEdit(listingId);
  return { ok: true };
}

/**
 * Remove one photo: delete its metadata row, re-pack the remaining positions so they stay contiguous
 * (no gaps, 0 = cover preserved), then destroy the Cloudinary asset by its stored public_id (orphan
 * cleanup, T-04-ORPHAN). The delete + re-pack run in one transaction; the external Cloudinary destroy
 * happens after commit and is best-effort (a destroy hiccup must not fail the user's removal).
 */
export async function removePhoto(
  listingId: string,
  photoId: string,
): Promise<PhotoResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to remove photos." };
  }
  const owned = await assertOwnership(listingId, userId);
  if (!owned) {
    return { ok: false, error: "We couldn't find that listing, or it isn't yours." };
  }

  // Load the target row (scoped to the owned listing) to get its public_id + position.
  const rows = await db
    .select()
    .from(listingPhoto)
    .where(and(eq(listingPhoto.id, photoId), eq(listingPhoto.listingId, listingId)));
  const photo = rows[0];
  if (!photo) {
    return { ok: false, error: "That photo is no longer here." };
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(listingPhoto)
      .where(and(eq(listingPhoto.id, photoId), eq(listingPhoto.listingId, listingId)));
    // Re-pack: close the gap so positions stay contiguous. A single UPDATE statement checks the unique
    // index once at statement end, so decrementing everything above the removed slot never collides.
    await tx
      .update(listingPhoto)
      .set({ position: sql`${listingPhoto.position} - 1` })
      .where(
        and(
          eq(listingPhoto.listingId, listingId),
          gt(listingPhoto.position, photo.position),
        ),
      );
  });

  // Orphan cleanup — best-effort; the row is already gone. A failed destroy leaves an orphan asset but
  // must not surface as a user-facing removal failure.
  try {
    await destroyListingPhoto(photo.publicId);
  } catch (err) {
    console.error(`Cloudinary destroy failed for ${photo.publicId}:`, err);
  }

  revalidateEdit(listingId);
  return { ok: true };
}
