// STATE-01 — the loading state for `/profile`. Convention: see `(app)/bookings/loading.tsx`.
//
// THE HEADING IS RENDERED — "Your profile" is fixed — through the page's own classes rather than
// `PageHeader`, because it is `text-2xl` here and the pattern's contract is `text-xl`. The muted
// "Member since {date}" line under it is data-derived AND conditional (it is absent for a user with
// no `createdAt`), so it is not faked: a bar standing in for a line that may not exist is a shift
// in whichever direction the data goes.
//
// A PANEL, not a row list: `ProfileForm` is one boxed form — public fields, private fields, an
// avatar — and its height varies with the About field's content, which is exactly what
// `PANEL_MIN_HEIGHT` is a FLOOR rather than a height for.

import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function ProfileLoading() {
  return (
    // Container and the `mb-8` header offset are `(app)/profile/page.tsx`'s own, verbatim.
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
      </header>

      <PanelSkeleton label="Loading your profile" />
    </div>
  );
}
