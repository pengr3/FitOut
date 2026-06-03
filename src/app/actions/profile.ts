"use server";

// Profile edit server action (AUTH-05, D-09/D-10).
//
// SECURITY CONTRACT:
//   - Re-validates the submitted fields with the SAME shared profileSchema the client form uses
//     (src/lib/validation/profile.ts). The client is never trusted — the encrypted server-action
//     payload is still attacker-controlled, so we parse() again here (threat T-04-01).
//   - Requires an authenticated session; the update targets the CALLER's own row only — auth.api
//     .updateUser writes the user behind the session cookie, so a client cannot edit another user
//     (threat T-04-06).
//   - Only the editable profile fields (firstName/lastName/phone/bio/city) flow through here. The
//     privilege-bearing flags canBook/canHost/role are input:false on the user table (src/lib/auth.ts)
//     and are NOT in profileSchema — they can never be set via this action (the activation actions in
//     src/app/actions/capability.ts flip them through a privileged path instead).

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile";

export type ProfileResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Persist the signed-in user's editable profile fields after re-validating server-side.
 * Returns { ok:true } on success, or a structured error the client form can surface inline.
 */
export async function updateProfile(
  input: ProfileInput,
): Promise<ProfileResult> {
  // 1. Require a session (T-04-06).
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to edit your profile." };
  }

  // 2. Re-validate with the shared schema (never trust the client — T-04-01).
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { firstName, lastName, phone, bio, city } = parsed.data;

  // 3. Persist to the caller's own row. canBook/canHost/role are input:false and absent here,
  //    so this action can only ever touch the profile fields (no privilege escalation).
  try {
    await auth.api.updateUser({
      body: {
        firstName,
        // Optional fields: send "" -> null-ish clears rather than leaving stale values.
        lastName: lastName ?? "",
        phone: phone ?? "",
        bio: bio ?? "",
        city: city ?? "",
      },
      headers: requestHeaders,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save your profile. Please try again." };
  }
}
