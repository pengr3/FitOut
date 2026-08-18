// STATE-01 — the loading state for `/listings/[id]`. Convention: see `(app)/bookings/loading.tsx`.
//
// IT LIVES INSIDE `(detail)` FOR THE SAME REASON THE LAYOUT DOES. `book/` is a sibling of this route
// group, not a child, so a `loading.tsx` here cannot leak onto the checkout route — the file tree
// enforces the split, exactly as `(detail)/layout.tsx` explains for the public header. `book/` has
// its own, with a different shape.
//
// NO HEADING: the resolved h1 is the listing's title.
//
// THE RESIDUAL THIS FILE RECORDED IS CLOSED (plan 12-07). It used to read:
//
//   "The resolved page opens with `PhotoGallery` — a 16:9 hero plus a 4-up strip of 4:3 thumbnails —
//    which is several hundred pixels this fallback does not reproduce. It is not reproduced because it
//    CANNOT be, honestly: `measurements.ts` has no 16:9 constant … the strip renders only when the
//    listing has more than one photo, and a listing with no photos renders a short muted bar instead.
//    That is three resolved heights behind one fallback."
//
// BOTH of that paragraph's reasons have since stopped being true, and they stopped being true for the
// same reason. `MOSAIC_ASPECT` was declared in plan 12-01, so the 16:9 constant now exists; and BFLOW-03
// made the mosaic ONE `MOSAIC_ASPECT` box at every photo count — zero, one, three, eight — so there is
// no longer a family of resolved heights to choose between. The plate below reads the same string the
// mosaic reads, which is what makes "the skeleton and the real gallery are the same height" a
// construction rather than a coincidence (measurements.ts § why a constant and not a matching literal).
//
// It is `aria-hidden` on purpose. `PanelSkeleton` already owns this route's one busy region; a second
// announced region for the same wait is rule 6 of the live-region inventory (`src/lib/design/
// live-regions.ts`), and this plate has no content to announce anyway.

import { PanelSkeleton } from "@/components/patterns/panel-skeleton";
import { MOSAIC_ASPECT } from "@/lib/design/measurements";

export default function ListingDetailLoading() {
  return (
    // Container is `listings/[id]/(detail)/page.tsx`'s own, verbatim.
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <div
        aria-hidden="true"
        className={`${MOSAIC_ASPECT} w-full rounded-xl bg-muted`}
      />
      <div className="mt-8">
        <PanelSkeleton label="Loading this listing" />
      </div>
    </main>
  );
}
