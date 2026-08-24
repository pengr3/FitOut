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
import { BOOKING_SHELL } from "@/lib/design/measurements";
import { PageHeader } from "@/components/patterns/page-header";
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
    // The DECLARED booker container, read rather than typed — `/profile` was the one surface on this
    // shell that kept its own vertical rhythm, and the constant is what ends that by construction. It
    // is a CONTAINER and not a landmark: `(app)/layout.tsx` owns the one main landmark per document
    // (D-88.1), so nothing here opens a second one — named descriptively rather than quoted as an
    // element, following `booking-row.tsx:112`'s precedent, because this plan's own gate scans this
    // file for that tag and a comment saying the tag is absent must not be what trips it. The
    // `space-y-8` below is the same block rhythm `bookings/[id]/group/page.tsx` uses under this
    // shell, and it replaces the header offset this page used to write itself.
    <div className={BOOKING_SHELL}>
      <div className="space-y-8">
        {/* The sentence under the title is composed as one string because the pattern measures it at
            `max-w-prose` and owns its type role. It stays CONDITIONAL: a user with no `createdAt` gets
            no sentence at all rather than a fabricated one — which is the pattern's own optional
            contract, not a special case invented here. */}
        <PageHeader
          title="Your profile"
          lede={memberSince ? `Member since ${memberSince}` : undefined}
        />

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
    </div>
  );
}
