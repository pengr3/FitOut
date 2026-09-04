// STATE-01 — the loading state for `/invite/[token]`. Convention: see `(app)/bookings/loading.tsx`.
//
// WHY THIS FILE EXISTS AT ALL, GIVEN `(public)/loading.tsx` IS ONE DIRECTORY UP. A `loading.tsx`
// applies to its segment AND every child, so without this file an invite would resolve through `/`'s
// search-page skeleton: a 6-cell card grid under a "Find a space to play" heading, on a route whose
// resolved content is a single 512px card. Inheriting a fallback whose shape is wrong is worse than
// having none, and the shapes here differ in every dimension — container width, heading, body.
//
// ⚠ CORRECTION TO THE PLAN, MEASURED. 11-17's interface note says this file exists *"so it does not
// inherit `/`'s"*, which overstates what a child boundary can do: a nested `loading.tsx` adds an
// INNER Suspense boundary, it does not suppress the ancestor's. Streamed HTML for
// `/invite/deadbeef`, byte offsets from `curl` on 17 August 2026:
//
//     23261  Loading spaces        ← (public)/loading.tsx, in the shell
//     23290  skeleton-card-grid
//     26966  hidden id=            ← the first streamed replacement…
//     27948  Loading this invite   ← …which is THIS file
//     29306  hidden id=            ← and then the resolved invite card
//
// So the real sequence on a hard load is outer fallback → inner fallback → content, and the outer
// stage is the wrong shape. The swap needs no data (both fallbacks are static), so it is normally
// sub-frame — but it is visible on a slow connection, and it is inherent to nested boundaries rather
// than specific to this route (`(app)/bookings/loading.tsx` fronts `/bookings/[id]` the same way).
// The structural fix is to scope `/`'s fallback with a `(public)/(home)/` route group so the
// `(public)` segment carries none; that is a page MOVE with a pinned-inventory blast radius
// (`DISPLAY_INVENTORY` keys on `src/app/(public)/page.tsx`) and belongs to a plan that owns the file
// tree, not to this one. Logged in the phase's `deferred-items.md`.
//
// This file is still strictly better than not having it: without it the invite would sit under the
// search-grid skeleton for the WHOLE token lookup instead of for one chunk.
//
// THE BOX IS `InviteCard`, the SAME shell the resolved page and `not-found.tsx` both render. That
// is not tidiness: 08-06 folded malformed, unknown, regenerated, voided and cancelled tokens onto
// ONE identical response so the route cannot become a probe oracle, and a fallback that framed the
// wait differently would be a third surface for someone walking the token space to measure against.
// One component, three call sites, no drift possible.
//
// NO HEADING. The resolved h1 is "You're invited to {space}" — data-derived, so there is nothing
// static to render, and inventing a placeholder sentence here would also be inventing an answer to
// the question the token is being resolved to decide.

import { InviteCard } from "@/components/group/invite-card";
import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function InviteLoading() {
  return (
    <InviteCard>
      <PanelSkeleton label="Loading this invite" />
    </InviteCard>
  );
}
