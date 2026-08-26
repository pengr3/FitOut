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
//   - ORPHAN CLEANUP AT THE REFUSAL (D-187, T-16.1-17): persistPhoto destroys the asset when IT is
//     the refusing party — the bytes are already on Cloudinary before this action runs — but
//     STRICTLY BELOW the provenance gate, and nowhere above it. See the ⚠⚠ block at the
//     LISTING_MAX_PHOTOS branch: the same destroy two branches up is an arbitrary-delete primitive
//     against our own account, because a refusal above the gate proves nothing about the publicId.
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
import {
  LISTING_MAX_PHOTOS,
  LISTING_UPLOAD_FAILED_MESSAGE,
} from "@/lib/listing/upload-policy";

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
    return { ok: false, error: LISTING_UPLOAD_FAILED_MESSAGE };
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
    //
    // ⚠ IT RETURNS, AND THAT IS WHY THE COMMENT ABOVE IS NOW TRUE (WR-10). This branch used to only
    // LOG, delegating the actual refusal to `isOwnCloudinaryAsset`'s own missing-cloud-name guard.
    // That was correct by accident of the validator's signature: give `cloudName` a default
    // parameter one day and the property this comment claims is silently gone while the comment
    // still reads like the guard. It also emitted TWO warn lines for one rejection in the state
    // every CI run is in. The validator's own guard stays as defence in depth.
    console.warn(
      "[listing-photo] CLOUDINARY_CLOUD_NAME is not configured — refusing to persist photo metadata (D-165).",
    );
    return { ok: false, error: LISTING_UPLOAD_FAILED_MESSAGE };
  }
  if (!isOwnCloudinaryAsset({ url, publicId, listingId, cloudName })) {
    // Δ15 / rule F1 — the SHIPPED literal, naming no vendor, no url and no folder. The distinction
    // between "empty" and "not ours" belongs in the server log, not in the host's error toast.
    console.warn(
      `[listing-photo] rejected photo metadata that our pipeline could not have produced, listing ${listingId} (D-165).`,
    );
    return { ok: false, error: LISTING_UPLOAD_FAILED_MESSAGE };
  }

  const position = await photoCount(listingId);
  if (position >= LISTING_MAX_PHOTOS) {
    // ORPHAN CLEANUP AT THE REFUSAL (D-187, T-16.1-17). The bytes are ALREADY on Cloudinary by the
    // time this action runs — the upload goes browser→Cloudinary direct and only the metadata comes
    // here — so a refusal that destroys nothing leaves an asset no row will ever name, no page will
    // ever render and no host can ever reach, billed forever. The most reachable spelling is a
    // single click: a listing holding 18 photos, a host who selects 20 (the widget permits it), all
    // 20 upload, 2 persist and 18 are refused RIGHT HERE — `photo-uploader.tsx` toasts the sentence
    // below and returns, and before D-187 nothing destroyed anything.
    //
    // ⚠⚠ WHERE THIS BRANCH SITS IN THE FUNCTION IS THE ENTIRE REASON THE CLEANUP IS SAFE. THE ORDER
    // IS BEHAVIOUR, NOT TIDINESS. Everything from the provenance call downward has PROVEN that
    // `publicId` names an asset our own signed-upload pipeline produced under THIS listing's folder.
    // Every refusal ABOVE it has proven nothing of the sort — no session, not your listing, empty
    // fields, no cloud name, and above all the provenance REJECTION itself, which proves the
    // opposite: that the id is NOT ours to delete. A destroy on any of those paths would hand any
    // signed-in caller an arbitrary-delete primitive against our own Cloudinary account — name
    // another host's cover photo, or `fitout/avatars/<victim-userId>`, take the refusal, and we
    // delete it for them. That is precisely the class of attack
    // `src/lib/listing/cloudinary-provenance.ts` was written to stop, so the cleanup placed two
    // branches up would introduce a DESTRUCTIVE IDOR inside the phase that exists to prevent one.
    // Do NOT hoist this into a shared helper at the top of the function, and do NOT "simplify" the
    // guards above into one block that shares it.
    //
    // The line is held by tests, not only by this paragraph, so the day someone moves it they meet a
    // red suite: `tests/listing/photos.test.ts` → "D-187 — the destroy lives BELOW the provenance
    // gate and nowhere above it" (five behavioural cases asserting the captured destroys are the
    // EMPTY ARRAY on every pre-provenance and rejection path, plus one asserting they contain
    // exactly the refused publicId here) and "D-187 — the source ordering inside persistPhoto" (an
    // index assertion over comment-stripped code, which is what stops the call migrating upward in a
    // refactor that every behavioural case would still pass).
    //
    // Best-effort, and BOTH of the helper's failure shapes are handled: it RESOLVES
    // `{ result: "not found" }` for an id that is not there and REJECTS only on network/auth failure
    // (`src/lib/cloudinary.ts`), so the `if` and the `catch` are two halves of one guard rather than
    // belt-and-braces. Neither may change what the host sees — a Cloudinary hiccup must never turn a
    // legitimate refusal into a different sentence. No `revalidateEdit`: nothing in the database
    // changed.
    try {
      const res = await destroyListingPhoto(publicId);
      if (res.result !== "ok") {
        console.warn("[listing-photo:destroy] non-ok at the photo cap — orphan tolerated (D-187)", {
          listingId,
          publicId,
          result: res.result,
        });
      }
    } catch (err) {
      console.error("[listing-photo:destroy] failed at the photo cap — orphan tolerated (D-187)", {
        listingId,
        publicId,
        err,
      });
    }
    return {
      ok: false,
      error: `You can add up to ${LISTING_MAX_PHOTOS} photos. Remove one to add another.`,
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
 *
 * ⚠ `orderedIds` IS UNTRUSTED AND MUST BE A PERMUTATION OF THIS LISTING'S PHOTOS, checked before the
 * transaction opens (WR-02). It used to be used raw, and two client-supplied shapes broke it:
 *   - DUPLICATES write the same row twice, so its final position is the LAST index — leaving another
 *     index unclaimed and two rows able to land on one position.
 *   - A SUBSET leaves the omitted rows at their original positions, which the two-phase parking never
 *     touches. `[a=0,b=1,c=2]` reordered as `["c"]` parks `c` at −1 and then sets it to 0, which `a`
 *     still holds — the (listingId, position) unique index rejects the statement.
 * Either way the transaction throws, and there was no `try`, so the rejection ESCAPED the server
 * action instead of returning the `{ ok: false, error }` shape `photo-uploader.tsx:136-143` is
 * written against — the optimistic UI never reverted and the grid kept showing an order the database
 * had refused. The shape check and the catch are both here for that: this action always answers.
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

  // A PERMUTATION, OR NOTHING. Same length, no duplicates, and exactly this listing's photo ids —
  // the three together spell "a reordering of what is there", which is the only input this action
  // has a meaning for. The row read is scoped to `listingId`, so an id belonging to another listing
  // is simply absent from `ownedIds` and fails the membership test (IDOR, again).
  const rows = await db
    .select({ id: listingPhoto.id })
    .from(listingPhoto)
    .where(eq(listingPhoto.listingId, listingId));
  const ownedIds = new Set(rows.map((r) => r.id));
  const distinct = new Set(orderedIds);
  if (
    distinct.size !== orderedIds.length ||
    orderedIds.length !== ownedIds.size ||
    orderedIds.some((id) => !ownedIds.has(id))
  ) {
    console.warn(
      `[listing-photo] rejected a reorder that is not a permutation of listing ${listingId}'s photos.`,
    );
    return {
      ok: false,
      error: "We couldn't reorder those photos. Please refresh and try again.",
    };
  }

  try {
    await db.transaction(async (tx) => {
      // Phase 1: temporary negative slots — no collision with a row still holding a final position.
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
  } catch (err) {
    // The permutation check closes every shape we know how to name. This closes the ones we do not:
    // a concurrent removal between the read and the transaction, a connection drop mid-phase. The
    // caller gets the refusal shape it is written against instead of an exception, so its optimistic
    // order reverts and the grid stops showing an order the database refused.
    console.warn(`[listing-photo] reorder failed for listing ${listingId}`, err);
    return { ok: false, error: "We couldn't reorder those photos. Please try again." };
  }

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
  //
  // BOTH FAILURE SHAPES, NOT ONE (D-187, RESEARCH § I-5 — measured live against the vendor). The
  // helper answers HTTP 200 `{ result: "not found" }` for an id that is not there, i.e. it RESOLVES,
  // and REJECTS only on network/auth failure. This site carried the `catch` alone, so the non-ok
  // RESOLVE slipped through silently and the orphan it leaves behind was invisible in the log. The
  // two are logged distinguishably on purpose: `warn` = the vendor answered and declined, `error` =
  // we never got an answer at all. This is a log line and nothing more — neither shape changes this
  // action's result, and neither changes its ordering; the row is already deleted either way.
  try {
    const res = await destroyListingPhoto(photo.publicId);
    if (res.result !== "ok") {
      console.warn("[listing-photo:destroy] non-ok on removal — orphan tolerated (T-04-ORPHAN)", {
        listingId,
        publicId: photo.publicId,
        result: res.result,
      });
    }
  } catch (err) {
    console.error(`Cloudinary destroy failed for ${photo.publicId}:`, err);
  }

  revalidateEdit(listingId);
  return { ok: true };
}
