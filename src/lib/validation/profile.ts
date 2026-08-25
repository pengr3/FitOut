// Shared profile validation schema (Zod 4) — consumed by Plan 04's profile edit form +
// server action. Covers the editable profile fields from D-09/D-10:
//   firstName (public display name, required), lastName (PRIVATE), phone, bio ("About"),
//   city. Capability flags (canBook/canHost/role) are NOT here — they are input:false on
//   the user table and flipped only by privileged server actions, never via this form.
//
// avatarUrl/avatarPublicId are set by the avatar upload action (Cloudinary result), not
// edited as free text, so they are intentionally excluded from profileSchema.
//
// The avatar FILE guard (AVATAR_MAX_BYTES + avatarFileSchema) does live here, below. It used
// to be exported from src/app/actions/avatar.ts, which is a `"use server"` module — and Next
// rejects a `"use server"` module that exports anything other than an async function AT MODULE
// EVALUATION ("A 'use server' file can only export async functions, found number"). That killed
// uploadAvatarAction outright, so avatar upload never worked in a browser. This module is
// directive-free, so both the server action and the client form can import the same contract.
// DO NOT move these two back into a `"use server"` file, and do not re-export them from one —
// a re-export out of a server-action module is the identical violation.
// tests/use-server-exports.test.ts enforces this repo-wide.

import { z } from "zod";
// The single avatar allow-list. Imported, not duplicated: @/lib/avatar is a directive-free leaf that
// the client file picker's `accept` reads too, so the picker and this schema cannot disagree.
import { AVATAR_ALLOWED_TYPES } from "@/lib/avatar";

export const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  bio: z.string().max(500).optional(), // "About" — keep it short.
  city: z.string().max(120).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Max avatar size — 5 MB. Larger files are rejected before any upload (T-04-04). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/**
 * The over-size refusal. UNCHANGED in value and NAMED as of plan 16-10, which is the whole of the
 * edit: CROP-01 applies this same check client-side before the decode, so the sentence now has two
 * consumers — the refine below and `components/profile/avatar-field.tsx` — and 16-UI-SPEC's "Reused
 * verbatim" table says reused, not rewritten. Two copies of a string are two strings (rule F2), and
 * a directive-free module is the only place a `"use server"` action and a client component can both
 * read one from.
 */
export const AVATAR_TOO_LARGE_MESSAGE = "Image must be 5 MB or smaller.";

/**
 * The save-failure sentence: the upload was accepted, tried and did not land.
 *
 * MOVED HERE FROM `src/app/actions/avatar.ts` BY PLAN 16-10, value byte-unchanged, and the move is
 * forced rather than tidying. It now has a SECOND consumer that cannot reach the first: the crop
 * dialog reports a local encode failure — no measured element, no crop rectangle, a rejecting
 * encoder — and to the person that is the same outcome as a refused upload, so it must be the same
 * sentence (one region, one source). The action is a `"use server"` module and may export nothing
 * but async functions, so it cannot be the shared home; `src/lib/avatar.ts` is ruled out too, since
 * 16-UI-SPEC pins this string as SHIPPED and re-declaring it beside the phase's new copy would make
 * it look authored. It lands beside the other two shipped avatar sentences instead, which is where
 * `Only image files are allowed.` and the one above already live. Still exactly one home.
 */
export const AVATAR_UPLOAD_FAILED_MESSAGE =
  "Could not upload your photo. Please try again.";

/**
 * Validate an uploaded avatar File: must be non-empty, under the size cap, and one of the three
 * types AVATAR_ALLOWED_TYPES declares — JPEG, PNG or WebP (it was `image/*` until CROP-01). The list
 * lives in `@/lib/avatar` and the client file picker's `accept` attribute reads that SAME array, so
 * a picker that offers what this schema refuses is not expressible. Narrowing also stops an SVG —
 * a scriptable document, not an image — reaching Cloudinary (threat T-16-23).
 *
 * The refusal message is unchanged and must stay so: 16-UI-SPEC pins it as the server-side backstop
 * and the client surfaces AVATAR_WRONG_TYPE_MESSAGE instead.
 *
 * There is deliberately NO pixel-size refine here. The server is handed a File and never learns how
 * many pixels are inside it, so such a check could not run — which is exactly why D-171 KEEPS the
 * 400x400 transform in src/lib/cloudinary.ts as the bounded-storage backstop. A real pixel guard is
 * Phase 16.1 (D-164 / D-166).
 *
 * Exported so the test suite can assert the guard in isolation and so callers re-validate the same
 * contract.
 */
export const avatarFileSchema = z
  .instanceof(File, { message: "An image file is required." })
  .refine((f) => f.size > 0, { message: "The file is empty." })
  .refine((f) => (AVATAR_ALLOWED_TYPES as readonly string[]).includes(f.type), {
    message: "Only image files are allowed.",
  })
  .refine((f) => f.size <= AVATAR_MAX_BYTES, {
    message: AVATAR_TOO_LARGE_MESSAGE,
  });
