// Profile view/edit (AUTH-05, D-09/D-10) — the logged-in "your profile" surface.
//
// Server Component: reads the session (redirecting to /login if absent — the per-page gate, not the
// optimistic middleware), then renders the edit form seeded with the current values. The page is
// explicitly split into a PUBLIC section (what other users see: avatar, first name, About, city,
// "member since") and a PRIVATE section (account-only: last name, phone) per D-09/D-10. The actual
// public-vs-private leak boundary is enforced server-side by publicProfile() (src/lib/profile.ts);
// this split is the matching UX so the user understands what is shown publicly.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { formatMemberSince } from "@/lib/profile";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const u = session.user as typeof session.user & {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    bio?: string | null;
    city?: string | null;
    avatarUrl?: string | null;
  };

  const memberSince = u.createdAt
    ? formatMemberSince(new Date(u.createdAt))
    : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        {memberSince && (
          <p className="mt-1 text-sm text-muted-foreground">
            Member since {memberSince}
          </p>
        )}
      </header>

      <ProfileForm
        initial={{
          firstName: u.firstName ?? "",
          lastName: u.lastName ?? "",
          phone: u.phone ?? "",
          bio: u.bio ?? "",
          city: u.city ?? "",
        }}
        avatarUrl={u.avatarUrl ?? null}
        displayName={u.firstName ?? u.email ?? "You"}
      />
    </div>
  );
}
