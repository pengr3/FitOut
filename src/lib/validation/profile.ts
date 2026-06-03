// Shared profile validation schema (Zod 4) — consumed by Plan 04's profile edit form +
// server action. Covers the editable profile fields from D-09/D-10:
//   firstName (public display name, required), lastName (PRIVATE), phone, bio ("About"),
//   city. Capability flags (canBook/canHost/role) are NOT here — they are input:false on
//   the user table and flipped only by privileged server actions, never via this form.
//
// avatarUrl/avatarPublicId are set by the avatar upload action (Cloudinary result), not
// edited as free text, so they are intentionally excluded from this schema.

import { z } from "zod";

export const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  bio: z.string().max(500).optional(), // "About" — keep it short.
  city: z.string().max(120).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
