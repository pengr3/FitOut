// STATE-01 — the loading state for `/profile`. Convention: see `(app)/bookings/loading.tsx`.
//
// THE HEADING IS THE PATTERN'S NOW — "Your profile" is fixed, and as of plan 15-08 the PAGE composes
// `PageHeader` with the same title, so this is no longer a fallback imitating a hand-rolled heading:
// it is the same component, rendered twice. Until now this plate agreed with its page about the
// container only because the same string was typed in both files; the two read one constant now, so
// the fallback cannot draw a different box than the page it stands in for. The muted
// "Member since {date}" line under it is data-derived AND conditional (it is absent for a user with
// no `createdAt`), so it is not faked: a bar standing in for a line that may not exist is a shift
// in whichever direction the data goes.
//
// A PANEL, not a row list: `ProfileForm` is a boxed form — public fields, private fields, an
// avatar — and its height varies with the About field's content, which is exactly what
// `PANEL_MIN_HEIGHT` is a FLOOR rather than a height for. The page draws TWO panels as of plan 15-08
// and this plate still claims ONE, which is the honest arrangement rather than a leftover — see the
// measured note below.
//
// ⚠ ONE SKELETON, AND THE SECOND ONE WAS TRIED FIRST. Plan 15-08 asked for two, one per panel, so the
// plate would draw the same number of boxes as the page. `tests/design/loading-coverage.test.ts`
// refused it, verbatim:
//
//   AssertionError: a loading state must announce itself exactly once: either by composing ONE of the
//   three skeleton patterns, or — where the route has no resolved geometry to stand in for — by
//   writing one `role="status"` with an `aria-label`, because `role="status"` is nameFrom:author and
//   an sr-only child alone leaves the live region unnamed.: expected [ Array(1) ] to deeply equal []
//     + "src/app/(app)/profile/loading.tsx (patterns: 2, own role=status: 0, named: false)"
//
// That gate is AC#18 and its reason is the one this repo keeps everywhere else: *two skeletons in one
// fallback announce the same wait twice.* Each pattern carries its own `role="status"`, so a second
// call site is a second live region for a single navigation. The gate's other legal shape — zero
// patterns plus one hand-written named region — is closed too: the plate that takes it must join a
// PINNED two-file list of routes that deliberately get no skeleton, and this route is not one of them
// (it has resolved geometry; those two render nothing but a `redirect()`). So one panel skeleton is
// not a compromise between the plan and the gate; it is the only shape either of them permits.
//
// WHAT THE PLAN ACTUALLY WANTED IS STILL BOUGHT. The disagreement it names is that the page drew NO
// panel while this plate drew one — a fallback claiming a box its page never had. The page draws
// panels now, so this skeleton finally stands in for a real one. Claiming the first and taller of the
// two and letting the rest arrive is `(host)/host/earnings/loading.tsx`'s arrangement exactly.

import { BOOKING_SHELL } from "@/lib/design/measurements";
import { PageHeader } from "@/components/patterns/page-header";
import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function ProfileLoading() {
  return (
    // The container is the DECLARED booker shell, shared with `(app)/profile/page.tsx` rather than
    // copied from it; the `space-y-8` block rhythm is that page's own.
    <div className={BOOKING_SHELL}>
      <div className="space-y-8">
        <PageHeader title="Your profile" />

        <PanelSkeleton label="Loading your profile" />
      </div>
    </div>
  );
}
