// Public vs private profile projection (D-09 / D-10 — Airbnb-style split).
//
// One profile per identity is used in both booker and host contexts. It is split into a
// PUBLIC face (what other FitOut users may see) and PRIVATE account info (settings only,
// never rendered to other users). This module is the single place that defines the boundary
// so a public profile view CANNOT accidentally leak a private field (threat T-04-03).
//
//   PUBLIC  (visible to other users): avatarUrl, firstName, bio, city, createdAt ("member since")
//   PRIVATE (account settings only) : lastName, email, phone, role, connected accounts, ...
//
// "Member since" (createdAt) is stored as timestamptz (UTC) on the user row; this helper passes
// the Date through unchanged and the VIEWER's locale formats it (formatMemberSince) so it is never
// rendered from a naive/server-local timestamp (RESEARCH Pitfall 5).

/** The shape this projection reads from — a superset of the public+private user fields. */
export type ProfileUser = {
  id?: string;
  firstName: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  bio?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  avatarPublicId?: string | null;
  createdAt: Date;
};

/** The exact public subset — these are the ONLY fields other users may see (D-09). */
export type PublicProfile = {
  avatarUrl: string | null;
  firstName: string | null;
  bio: string | null;
  city: string | null;
  createdAt: Date;
};

/** Field names that are PRIVATE and must never appear in a public projection (D-09/D-10). */
export const PRIVATE_PROFILE_FIELDS = [
  "lastName",
  "email",
  "phone",
  "role",
  "avatarPublicId",
] as const;

/**
 * Project a user row down to ONLY the public profile fields (D-09/D-10). Anything not listed
 * here — lastName, email, phone, role, connected accounts — is intentionally dropped so it can
 * never be sent to another user. Keep this as an explicit allow-list (not a deny-list) so adding
 * a new private column to the user table does not silently leak it.
 */
export function publicProfile(user: ProfileUser): PublicProfile {
  return {
    avatarUrl: user.avatarUrl ?? null,
    firstName: user.firstName ?? null,
    bio: user.bio ?? null,
    city: user.city ?? null,
    createdAt: user.createdAt,
  };
}

/**
 * Render "member since" from the timestamptz createdAt in the VIEWER's locale (RESEARCH Pitfall 5).
 * Defaults to month + year (Airbnb-style "Member since June 2026"). `locale`/`timeZone` are
 * caller-supplied so a Server Component can pass the request locale, or the client its own.
 */
export function formatMemberSince(
  createdAt: Date,
  locale?: string,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    ...(timeZone ? { timeZone } : {}),
  }).format(createdAt);
}
