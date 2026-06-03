"use server";

// Avatar upload server action (D-11, AUTH-05).
//
// SECURITY CONTRACT:
//   - The Cloudinary api_secret lives ONLY on the server (src/lib/cloudinary.ts). The file is routed
//     through this server action so the secret is never shipped to the client (threat T-04-05).
//   - The uploaded file is UNTRUSTED: we validate content-type (image/*) and size (<= 5MB) with Zod
//     BEFORE touching Cloudinary (threat T-04-04). Cloudinary's transformation additionally normalizes
//     to 400x400 face-cropped, so a hostile aspect ratio cannot blow up storage.
//   - The action requires an authenticated session and writes the avatar to the CALLER's own user row
//     (server-side, from session.user.id) — a client cannot target another user (threat T-04-06).
//
// PHASE-2 SEAM: for the listing galleries (many large images) graduate to a signed direct-to-Cloudinary
// CLIENT upload via cloudinary.utils.api_sign_request(...) so big files never transit our server.
// Routing a single small avatar through the server action (here) is the deliberately simpler v1 choice
// (RESEARCH Pattern 5 note). avatarUrl/avatarPublicId are the only Cloudinary results we persist.

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { uploadAvatar } from "@/lib/cloudinary";

/** Max avatar size — 5 MB. Larger files are rejected before any upload (T-04-04). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Validate an uploaded avatar File: must be a non-empty image/* under the size cap. Exported so the
 * test suite can assert the guard in isolation and so callers re-validate the same contract.
 */
export const avatarFileSchema = z
  .instanceof(File, { message: "An image file is required." })
  .refine((f) => f.size > 0, { message: "The file is empty." })
  .refine((f) => f.type.startsWith("image/"), {
    message: "Only image files are allowed.",
  })
  .refine((f) => f.size <= AVATAR_MAX_BYTES, {
    message: "Image must be 5 MB or smaller.",
  });

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
    return { ok: false, error: "Could not upload your photo. Please try again." };
  }
}
