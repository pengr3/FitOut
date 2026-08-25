"use server";

// Avatar upload server action (D-11, AUTH-05).
//
// SECURITY CONTRACT:
//   - The Cloudinary api_secret lives ONLY on the server (src/lib/cloudinary.ts). The file is routed
//     through this server action so the secret is never shipped to the client (threat T-04-05).
//   - The uploaded file is UNTRUSTED: we validate content-type (JPEG/PNG/WebP — the shared
//     AVATAR_ALLOWED_TYPES list) and size (<= 5MB) with Zod BEFORE touching Cloudinary (threat
//     T-04-04). THE FRAMING IS THE USER'S: since CROP-01 the client sends the 400x400 square the
//     user positioned in the crop dialog, and the server does not re-frame it (D-171). Cloudinary's
//     retained 400x400 transformation is a DIMENSION normaliser for the BYPASS path only — this
//     action is publicly reachable and the Zod guard checks type and bytes but not pixel dimensions,
//     so a hostile aspect ratio from a client that skipped the cropper still cannot blow up storage.
//     Its `gravity` is `center`, which cannot select a region; see src/lib/cloudinary.ts's header.
//   - The action requires an authenticated session and writes the avatar to the CALLER's own user row
//     (server-side, from session.user.id) — a client cannot target another user (threat T-04-06).
//
// PHASE-2 SEAM: for the listing galleries (many large images) graduate to a signed direct-to-Cloudinary
// CLIENT upload via cloudinary.utils.api_sign_request(...) so big files never transit our server.
// Routing a single small avatar through the server action (here) is the deliberately simpler v1 choice
// (RESEARCH Pattern 5 note). avatarUrl/avatarPublicId are the only Cloudinary results we persist.
//
// ⚠️ THIS FILE MAY EXPORT NOTHING BUT ASYNC FUNCTIONS (and types, which erase). Next enforces that at
// MODULE EVALUATION, so one stray value export kills every action in the file, not just itself. This
// module used to export AVATAR_MAX_BYTES (a number) and avatarFileSchema (a Zod object); Next refused
// to load it — "A 'use server' file can only export async functions, found number" — and
// uploadAvatarAction below never ran, i.e. avatar upload was dead in the browser for all of Phase 1
// while tests/profile/avatar.test.ts stayed green against those same two exports. Both now live in
// @/lib/validation/profile (directive-free, so the client form can share the contract) and are
// deliberately NOT re-exported from here: a re-export out of a "use server" module is the same
// violation wearing a compatibility shim. tests/use-server-exports.test.ts holds this line repo-wide.

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { destroyAvatar, uploadAvatar } from "@/lib/cloudinary";
import { AVATAR_REMOVE_FAILED_MESSAGE } from "@/lib/avatar";
import {
  avatarFileSchema,
  AVATAR_UPLOAD_FAILED_MESSAGE,
} from "@/lib/validation/profile";

export type AvatarResult =
  | { ok: true; avatarUrl: string }
  | { ok: false; error: string };

/**
 * The removal result. A SECOND type rather than a reuse of `AvatarResult`, because a successful
 * removal has no URL to hand back — the circle falls to initials — and a success shape carrying an
 * `avatarUrl` the caller must ignore is a shape that invites somebody to render it.
 *
 * `export type` is legal in a `"use server"` module because types erase; see the file header for the
 * incident that makes every OTHER export shape here fatal at module evaluation.
 */
export type AvatarRemoveResult = { ok: true } | { ok: false; error: string };

/**
 * Upload the avatar from the form to Cloudinary and store { avatarUrl, avatarPublicId } on the
 * signed-in user's row. Returns the new URL (so the client can update the preview) or an error.
 */
export async function uploadAvatarAction(
  formData: FormData,
): Promise<AvatarResult> {
  // 1. Require a session (T-04-06) — the avatar is written to THIS user, server-side.
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to upload an avatar." };
  }

  // 2. Validate the untrusted file (type + size) BEFORE uploading (T-04-04).
  const file = formData.get("avatar");
  const parsed = avatarFileSchema.safeParse(file);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid image.",
    };
  }

  // 3. Convert to a Buffer and upload via the server-only Cloudinary helper (secret stays server-side).
  try {
    const arrayBuffer = await parsed.data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { secure_url, public_id } = await uploadAvatar(
      buffer,
      session.user.id,
    );

    // 4. Persist BOTH the URL and the public_id (the latter enables later delete/replace).
    await auth.api.updateUser({
      body: { avatarUrl: secure_url, avatarPublicId: public_id },
      headers: requestHeaders,
    });

    return { ok: true, avatarUrl: secure_url };
  } catch {
    // IMPORTED, NOT SPELLED, as of plan 16-10. The crop dialog reports a local encode failure with
    // this same sentence — to the person, bytes that could not be made and bytes that would not
    // upload are one outcome — and a `"use server"` module may export nothing but async functions,
    // so the shared home is `@/lib/validation/profile` beside the other two shipped avatar
    // sentences. The value is byte-unchanged.
    return { ok: false, error: AVATAR_UPLOAD_FAILED_MESSAGE };
  }
}

/**
 * Remove the signed-in user's avatar (CROP-03, D-169): null BOTH columns on their own row, THEN
 * destroy the Cloudinary asset best-effort.
 *
 * ⚠ THE ORDER IS BEHAVIOUR, NOT TIDINESS, AND IT EXISTS SO THE UI NEVER LIES. If the destroy ran
 * first and the row write then failed, a live profile would point at an asset that no longer exists —
 * a broken image on a public surface, and no amount of retrying fixes it because the bytes are gone.
 * In this order the worst case is an ORPHANED ASSET nobody references: invisible to every person,
 * knowingly tolerated by D-169, logged with both ids below, and swept by Phase 16.1's orphan audit.
 * `listing-photo.ts:206-210` makes the identical trade for the same reason.
 *
 * ⚠ AND THE DESTROY NEVER CHANGES THIS ACTION'S RESULT. An un-guarded `await` here would turn a
 * Cloudinary outage into a user-facing removal failure on a profile whose avatar is ALREADY gone —
 * which is the UI lying again, arriving through the other door. Both of the helper's failure shapes
 * are handled: it RESOLVES `{ result: "not found" }` for a missing id and only REJECTS on network or
 * auth failure, so the `if` and the `catch` are two halves of one guard rather than belt-and-braces.
 *
 * The write targets `session.user.id`'s own row through Better Auth's own session-scoped API and
 * never a client-supplied id (T-16-41) — this action takes no arguments at all, which is the
 * strongest available spelling of that.
 */
export async function removeAvatarAction(): Promise<AvatarRemoveResult> {
  // 1. Require a session (T-16-41). Same idiom as uploadAvatarAction above, deliberately verbatim.
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to remove your photo." };
  }

  const userId = session.user.id;
  // Read BEFORE the write — the row is about to stop carrying it, and it is the only handle on the
  // asset. `getSession` reads the row (no cookie cache is configured), so this is not a stale value.
  const publicId =
    (session.user as { avatarPublicId?: string | null }).avatarPublicId ?? null;

  // 2. NULL BOTH COLUMNS FIRST. Better Auth owns this row, so this is `updateUser` and not a Drizzle
  //    write — the same call `uploadAvatarAction` uses to SET the pair.
  //
  //    Running it even when there is no stored id keeps removal IDEMPOTENT rather than making
  //    "there was nothing to remove" an error: a person pressing the confirm twice, or a row whose
  //    url and id ever disagreed, both end at the same truthful state.
  try {
    await auth.api.updateUser({
      body: { avatarUrl: null, avatarPublicId: null },
      headers: requestHeaders,
    });
  } catch {
    // The ONLY failure a person is told about, and it is the one that matters: the row still points
    // at a photo. The dialog stays open on this sentence (rule F5) and the asset is untouched.
    return { ok: false, error: AVATAR_REMOVE_FAILED_MESSAGE };
  }

  // 3. …and only then the asset. Skipped entirely when there was nothing stored, so an idempotent
  //    second removal makes no Cloudinary call at all.
  if (publicId) {
    try {
      const res = await destroyAvatar(publicId);
      if (res.result !== "ok") {
        console.warn("[avatar:destroy] non-ok — orphan tolerated (D-169)", {
          userId,
          publicId,
          result: res.result,
        });
      }
    } catch (err) {
      // Orphan cleanup — best-effort; the columns are already null. A failed destroy leaves an
      // orphaned asset (D-169, swept by Phase 16.1's orphan audit) but must NOT surface as a
      // user-facing removal failure.
      console.warn("[avatar:destroy] failed — orphan tolerated (D-169)", {
        userId,
        publicId,
        err,
      });
    }
  }

  return { ok: true };
}
