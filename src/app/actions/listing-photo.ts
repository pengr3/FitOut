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
//     the refusing party — the bytes are already on Cloudinary before this action runs — at its two
//     refusals below the provenance gate (the photo cap, and an insert the database refused), and
//     nowhere above it, and ONLY for an id no live row names (WR-02). See the ⚠⚠ block at the
//     LISTING_MAX_PHOTOS branch: the same destroy two branches up is an arbitrary-delete primitive
//     against our own account, because a refusal above the gate proves nothing about the publicId —
//     and the same destroy without the reference check deletes an asset a surviving row still points
//     at, which no part of the product can then repair.
//   - EVERY ACTION ANSWERS (WR-03/WR-04): all three return their `{ ok: false, error }` shape rather
//     than rejecting, on every path including a lost insert race and a failed transaction. The
//     client (`photo-uploader.tsx`) updates optimistically and reverts on that shape; a rejection
//     escaping a server action leaves the grid showing what the database refused, and — on
//     persistPhoto — a billed asset nothing will ever name.
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
// LVER-03 / D-242 — the SECOND material-edit detection site. Photos are one of D-231's five material
// fields and this file is the only place they change; see the call sites in persistPhoto/removePhoto.
import { markForReReview } from "@/lib/listing/re-review";
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

export type PhotoResult = { ok: true; flipped?: boolean } | { ok: false; error: string };
export type PersistPhotoResult =
  | { ok: true; photo: ListingPhotoRow; flipped: boolean }
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

/**
 * The rows of THIS listing that still name `publicId` (WR-02, WR-03).
 *
 * ⚠ IT EXISTS BECAUSE "PROVENANCE PASSED" AND "NOTHING POINTS AT THESE BYTES" ARE DIFFERENT CLAIMS,
 * and `persistPhoto` has two places where it is about to destroy an asset and only the first claim
 * has been established. `isOwnCloudinaryAsset` answers "is this id ours to delete at all"; this
 * answers "is anything still using it". A destroy on the strength of the first alone deletes the
 * bytes out from under a surviving row, and no part of the product can repair that: the public
 * listing page renders a 404 image from an address the database still calls valid.
 *
 * Scoped to `listingId` — covered by `listing_photo_listing_idx`, so it is one indexed read — and
 * that scope is complete rather than convenient: both call sites sit BELOW the provenance gate,
 * which has already proven the id is under this listing's own folder, and `persistPhoto` cannot
 * write such an id against any other listing because that call's provenance gate would demand a
 * different prefix.
 *
 * This is a READ, and hoisting it says nothing about where the DESTROYS may sit. Read the ⚠⚠ block
 * in `persistPhoto` before moving either of those.
 */
async function rowsNamingAsset(listingId: string, publicId: string) {
  return db
    .select({ id: listingPhoto.id })
    .from(listingPhoto)
    .where(and(eq(listingPhoto.listingId, listingId), eq(listingPhoto.publicId, publicId)));
}

function revalidateEdit(listingId: string) {
  revalidatePath(`/host/listings/${listingId}/edit`);
}

/**
 * Append one photo's metadata to the owner's listing. position = the current photo count (so the very
 * first upload lands at 0 = cover, D-04). Rejects beyond the soft max and validates the metadata is
 * present (the columns are NOT NULL). Returns the created row so the client can update its grid.
 *
 * IT ALWAYS ANSWERS. Every refusal — including one the DATABASE makes, when a concurrent call has
 * taken the position this one read (WR-03) — comes back as `{ ok: false, error }`. It never rejects.
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
    // gate and nowhere above it" (SIX behavioural cases asserting the captured destroys are the
    // EMPTY ARRAY on every pre-provenance path, on every rejection path, and on the WR-02
    // already-referenced path below, plus one asserting they contain exactly the refused publicId
    // here) and "D-187 — the source ordering inside persistPhoto" (an index assertion over
    // comment-stripped code, which is what stops the call migrating upward in a refactor that every
    // behavioural case would still pass).
    //
    // ⚠ AND PROVENANCE IS NOT THE WHOLE PRECONDITION (WR-02). `isOwnCloudinaryAsset` proves the id
    // is OURS and under THIS listing's folder. It does not prove the asset is UNREFERENCED, and the
    // destroy below is unconditional destruction. Both values of an already-stored photo are
    // rendered on the host's own edit page, so a host who re-submits a pair they already have —
    // a double-fired widget callback, a retried action, a copied pair — while sitting at the cap
    // gets the asset deleted while its `listing_photo` row survives untouched. The public listing
    // page then renders a 404 image from an address the database still calls valid, and nothing in
    // the product can repair it: `removePhoto` would delete a row whose bytes are already gone.
    // Owner-scoped and silent, which is worse than loud.
    //
    // ONE INDEXED READ, INSIDE THE BRANCH, BELOW THE PROVENANCE GATE — the placement rules in the
    // block above are unchanged and this read does not move the destroy relative to any of them.
    // `rowsNamingAsset` carries the reasoning about why a listing-scoped read is the complete
    // answer here.
    const referencing = await rowsNamingAsset(listingId, publicId);

    // Best-effort, and BOTH of the helper's failure shapes are handled: it RESOLVES
    // `{ result: "not found" }` for an id that is not there and REJECTS only on network/auth failure
    // (`src/lib/cloudinary.ts`), so the `if` and the `catch` are two halves of one guard rather than
    // belt-and-braces. Neither may change what the host sees — a Cloudinary hiccup must never turn a
    // legitimate refusal into a different sentence. No `revalidateEdit`: nothing in the database
    // changed.
    if (referencing.length > 0) {
      // The asset is live. Refusing the write is the whole of the correct behaviour here; there is
      // no orphan to clean up, because a row names it. Logged so the tolerated non-cleanup is
      // visible rather than being an absence nobody can see.
      console.warn(
        "[listing-photo:destroy] SKIPPED at the photo cap — a live row still names this asset (WR-02)",
        { listingId, publicId },
      );
    } else {
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
    }
    return {
      ok: false,
      error: `You can add up to ${LISTING_MAX_PHOTOS} photos. Remove one to add another.`,
    };
  }

  // ⚠ THE INSERT CAN LOSE A RACE, AND IT MUST ANSWER RATHER THAN THROW (WR-03). `position` was read
  // by a NON-TRANSACTIONAL `photoCount()` above and is used as the insert value, under
  // `uniqueIndex("listing_photo_position_uq").on(listingId, position)` (`src/lib/db/schema.ts`). The
  // widget runs with `multiple: true` and up to 20 files, and `photo-uploader.tsx`'s `onSuccess`
  // fires once per file and launches `void addPhoto(...)` WITHOUT awaiting the previous one — so two
  // calls reading the same count is the normal case here, not an edge case. The second insert
  // violates the index.
  //
  // This is the identical shape `reorderPhotos` documents at its own `catch`: with no `try` the
  // rejection ESCAPES the server action instead of returning the `{ ok: false, error }` shape
  // `photo-uploader.tsx` is written against. Its consequences here are worse than a stale grid,
  // which is why this is not merely symmetry: the bytes are ALREADY on Cloudinary, so an escaping
  // rejection leaves a permanently billed orphan on a path D-187's cleanup never covered — and the
  // client's `void addPhoto(...)` has no `.catch`, so the host is shown NO toast at all and the
  // photo simply never appears. Serialising the client would narrow this window; it would not close
  // it, because two tabs still collide. The server has to answer.
  //
  // ⚠ THE INSERT IS NOW PAIRED WITH THE RE-REVIEW FLIP IN ONE TRANSACTION (LVER-03, T-18-0602), and
  // everything the paragraph above says about answering rather than throwing is unchanged and now
  // covers both statements. See the block inside for why the pairing is atomic rather than sequential.
  const id = randomUUID();
  let flipped = false;
  try {
    flipped = await db.transaction(async (tx) => {
      await tx.insert(listingPhoto).values({ id, listingId, publicId, url, position });

      // ── LVER-03 / D-231 / D-242: MATERIAL-EDIT DETECTION — SITE TWO OF TWO. ────────────────────────
      // Material-edit detection lives in TWO places by necessity: `draftSchema` carries no photos
      // field, so `saveListingStep` (`src/app/actions/listing.ts`, the other site, which watches
      // address / space type / capacity / price) structurally cannot see a photo change at all — and
      // swapping the photos on an approved listing is the single highest-signal fake-listing edit
      // there is. `reorderPhotos` is DELIBERATELY excluded from both sites: reordering changes which
      // photo is the cover, not what the space is, so it is not a material edit. That is a stated
      // choice, not an omission — `tests/listing/material-edit.test.ts` asserts it as a case.
      //
      // ⚠ WHERE THIS SITS IS BEHAVIOUR, NOT TIDINESS — the same rule the ⚠⚠ block above states for
      // the destroy, for a related reason. It is BELOW the provenance gate and BELOW the insert, so a
      // photo our pipeline could not have produced is REJECTED and trips nothing: a refusal changed
      // no photo, and pulling an approved listing back into a human review queue because somebody
      // sent us a url we declined would hand any signed-in host a way to knock their own — or, if the
      // ownership guard ever regressed, anyone's — listing off the market with a request that writes
      // no row at all. Nothing above the provenance gate may call this.
      //
      // ATOMIC, NOT SEQUENTIAL. The flip shares this transaction rather than following it, so the
      // photo row and the review state commit or roll back together. An approved listing carrying a
      // photo the review state does not know about is a sellable fake — the same sentence
      // `saveListingStep` writes over its own in-transaction call — and a flip that ran after a
      // committed insert would produce exactly that every time the process died between the two.
      return (await markForReReview(tx, listingId, "listing_photos")).flipped;
    });
  } catch (err) {
    console.warn(`[listing-photo] insert failed for listing ${listingId}`, err);

    // THE SAME TWO CLAIMS AS THE CAP BRANCH, IN THE SAME ORDER (WR-02). Provenance passed far above,
    // so the id IS ours to delete — but "the insert failed" does not imply "nothing names these
    // bytes". Two concurrent submissions of the SAME pair collide on position exactly like two
    // different photos do, and there the loser's publicId is the one the WINNER's row now names.
    // Destroying it because our own statement lost would delete a live photo.
    //
    // THE WHOLE BLOCK IS GUARDED, because this path is reached precisely when the database is
    // misbehaving: an unguarded read here would reject for the same reason the insert did and the
    // action would escape after all, which is the defect this branch exists to remove. Both of the
    // destroy helper's failure shapes are covered — a non-ok RESOLVE by the `if`, a rejection by the
    // `catch` — the same pairing `removePhoto` and the cap branch use.
    try {
      const stillNamed = await rowsNamingAsset(listingId, publicId);
      if (stillNamed.length > 0) {
        console.warn(
          "[listing-photo:destroy] SKIPPED after a refused insert — a live row still names this asset (WR-02)",
          { listingId, publicId },
        );
      } else {
        const res = await destroyListingPhoto(publicId);
        if (res.result !== "ok") {
          console.warn(
            "[listing-photo:destroy] non-ok after a refused insert — orphan tolerated (WR-03)",
            { listingId, publicId, result: res.result },
          );
        }
      }
    } catch (cleanupErr) {
      console.error(
        "[listing-photo:destroy] failed after a refused insert — orphan tolerated (WR-03)",
        { listingId, publicId, err: cleanupErr },
      );
    }
    return { ok: false, error: LISTING_UPLOAD_FAILED_MESSAGE };
  }

  revalidateEdit(listingId);
  return { ok: true, photo: { id, publicId, url, position }, flipped };
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
  return { ok: true, flipped: false };
}

/**
 * Remove one photo: delete its metadata row, re-pack the remaining positions so they stay contiguous
 * (no gaps, 0 = cover preserved), then destroy the Cloudinary asset by its stored public_id (orphan
 * cleanup, T-04-ORPHAN). The delete + re-pack run in one transaction; the external Cloudinary destroy
 * happens after commit and is best-effort (a destroy hiccup must not fail the user's removal).
 *
 * IT ALWAYS ANSWERS (WR-04). A transaction the database refuses comes back as `{ ok: false, error }`
 * like every other refusal, because the caller removed the tile optimistically before awaiting it.
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

  let flipped = false;
  try {
    flipped = await db.transaction(async (tx) => {
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

      // ── LVER-03 / D-231 / D-242: MATERIAL-EDIT DETECTION — SITE TWO OF TWO, second call. ──────────
      // The same two sentences as `persistPhoto`'s call: material-edit detection lives in TWO places
      // by necessity, because `draftSchema` has no photos field and `saveListingStep`
      // (`src/app/actions/listing.ts`) therefore cannot see a photo change; and `reorderPhotos` is
      // DELIBERATELY excluded because reordering does not change what the space is. Removing a photo
      // does — a listing whose evidence a host deletes after approval has changed what ops checked,
      // and "delete the photo that gave the lie away" is the reachable half of the swap.
      //
      // INSIDE THE EXISTING TRANSACTION, so the delete, the re-pack and the flip commit or roll back
      // together, and the `catch` below still answers rather than throwing (WR-04). The destroy after
      // this block is unmoved and still reached only after a COMMITTED delete.
      return (await markForReReview(tx, listingId, "listing_photos")).flipped;
    });
  } catch (err) {
    // THE SAME OMISSION `reorderPhotos` DOCUMENTS AS FIXED, WHICH LIVED ON HERE (WR-04). Its own
    // paragraph says it: with no `try` the rejection ESCAPED the server action instead of returning
    // the `{ ok: false, error }` shape `photo-uploader.tsx` is written against, and the optimistic
    // UI never reverted. `handleRemove` removes the tile BEFORE awaiting this call, so the escape
    // leaves the grid showing a photo gone that the database still holds — until a reload puts it
    // back, which is the worst way for a host to find out.
    //
    // The re-pack is not merely theoretically fallible: two removals racing on one listing re-pack
    // OVERLAPPING position ranges against the same non-deferrable unique index, and a connection
    // drop mid-transaction ends the same way. Neither is a shape the reads above can rule out.
    //
    // ⚠ THE ORDERING SURVIVES THIS. The destroy below is still reached only after a COMMITTED
    // delete: this branch returns, so a transaction that rolled back never reaches it. Cleaning up
    // an asset whose row is still there is precisely the WR-02 defect.
    console.warn(`[listing-photo] remove failed for listing ${listingId}`, err);
    return { ok: false, error: "We couldn't remove that photo. Please try again." };
  }

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
  return { ok: true, flipped };
}
