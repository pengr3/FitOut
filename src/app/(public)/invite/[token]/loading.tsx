// STATE-01 — the loading state for `/invite/[token]`. Convention: see `(app)/bookings/loading.tsx`.
//
// WHY THIS FILE EXISTS AT ALL, GIVEN `(public)/loading.tsx` IS ONE DIRECTORY UP. A `loading.tsx`
// applies to its segment AND every child, so without this file an invite would fall back to `/`'s
// search-page skeleton: a 6-cell card grid under a "Find a space to play" heading, on a route whose
// resolved content is a single 512px card. Inheriting a fallback whose shape is wrong is worse than
// having none, and the shapes here differ in every dimension — container width, heading, body.
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
