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
import { uploadAvatar } from "@/lib/cloudinary";
import {
  avatarFileSchema,
  AVATAR_UPLOAD_FAILED_MESSAGE,
} from "@/lib/validation/profile";

export type AvatarResult =
  | { ok: true; avatarUrl: string }
  | { ok: false; error: string };

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
