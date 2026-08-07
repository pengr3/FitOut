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
