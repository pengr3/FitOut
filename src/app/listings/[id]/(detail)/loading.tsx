// STATE-01 — the loading state for `/listings/[id]`. Convention: see `(app)/bookings/loading.tsx`.
//
// IT LIVES INSIDE `(detail)` FOR THE SAME REASON THE LAYOUT DOES. `book/` is a sibling of this route
// group, not a child, so a `loading.tsx` here cannot leak onto the checkout route — the file tree
// enforces the split, exactly as `(detail)/layout.tsx` explains for the public header. `book/` has
// its own, with a different shape.
//
// NO HEADING: the resolved h1 is the listing's title.
//
// RESIDUAL, MEASURED AND RECORDED RATHER THAN FAKED. The resolved page opens with `PhotoGallery` —
// a 16:9 hero plus a 4-up strip of 4:3 thumbnails — which is several hundred pixels this fallback
// does not reproduce. It is not reproduced because it CANNOT be, honestly: `measurements.ts` has no
// 16:9 constant (`RESULT_CARD_MEDIA` is 4:3, the card grid's ratio, and reaching for it here would
// put a wrong number on screen with a right-looking import), the strip renders only when the listing
// has more than one photo, and a listing with no photos renders a short muted bar instead. That is
// three resolved heights behind one fallback, which is precisely the case the UI-SPEC's
// "skeletons NOT to build" rule is about. Handed to plan 11-21, whose ±2px rendered comparison is
// the only thing that can measure the gap; jsdom cannot see it at all (D-131).

import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function ListingDetailLoading() {
  return (
    // Container is `listings/[id]/(detail)/page.tsx`'s own, verbatim.
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <PanelSkeleton label="Loading this listing" />
    </main>
  );
}
