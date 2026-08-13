// STATE-01 — the card-grid loading shape. THE skeleton for every 4:3-media result grid: `/`'s
// `loading.tsx`, `search-results.tsx`'s in-component `isPending` state, and `/host/listings`.
//
// WHY ONE COMPONENT AND NOT THREE LOOKALIKES. `/` genuinely needs two loading states —
// `SearchResults` wraps `router.push` in `startTransition`, so React keeps the current UI and flags
// `isPending` instead of falling back to `loading.tsx`, which only covers first load and hard
// navigation (11-UI-SPEC § Loading). Both are correct and both must render THIS component, or the
// same page shimmers two different ways depending on how you arrived at it.
//
// A SERVER COMPONENT, DELIBERATELY. `patterns/` takes no `"use client"` unless the pattern's own
// behaviour requires it: a client pattern drags every surface that composes it toward the client
// boundary, which is the D-130 hazard plan 11-01 closed. This one renders markup and nothing else.
//
// NO PRODUCT COPY. `label` is required and has no default — the sentence ("Loading spaces") belongs
// to the surface and to the UI-SPEC that approved it, never to a file in `patterns/`.

import { Skeleton } from "@/components/ui/skeleton";
import { RESULT_CARD_MEDIA, TEXT_BAR_HEIGHT } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";

export function CardGridSkeleton({
  label,
  count = 6,
}: {
  /** What is loading, as a full sentence. Announced; never rendered visibly. */
  label: string;
  /** Cells to render. 6 is the shipped grid's page size. */
  count?: number;
}) {
  return (
    // THE MANDATORY SHELL, and it is what makes the 1.09:1 skeleton fill a legal declared exclusion
    // rather than a WCAG 1.4.11 failure: the loading state's MEANING is carried here, by a named live
    // region, and not by the fill. See `contrast-pairs.ts`'s two `muted` exclusions, which say so.
    //
    // `aria-label` IS REQUIRED, NOT BELT-AND-BRACES — measured, not assumed. `role="status"` is
    // nameFrom:author, so a status region containing only an `sr-only` span computes an accessible
    // name of `""` (probed with `dom-accessibility-api` via @testing-library: content-only → `""`,
    // with `aria-label` → the label). The UI-SPEC's falsifiable claim is "exactly one `role=status`
    // with a NON-EMPTY accessible name", which the sr-only child alone cannot satisfy. The span stays
    // because it is the live region's CONTENT — what a screen reader announces when the region
    // appears — which is a different thing from the region's name, and both are wanted.
    <div role="status" aria-busy="true" aria-label={label} data-testid="skeleton-card-grid">
      <span className="sr-only">{label}</span>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-3">
            {/* Every box class comes from `measurements.ts` — `RESULT_CARD_MEDIA` is the constant
                that replaces the `aspect-[4/3]` literal in the shipped analog
                (`(host)/host/listings/loading.tsx:13`), and it is the same number as
                `<AspectRatio ratio={4 / 3}>` in the real card. That is the whole mechanism behind
                "the grid does not shift when the results land".

                THE FRACTION WIDTHS BELOW STAY LITERAL, ON PURPOSE. `w-3/4` and `w-1/2` are
                PROPORTIONS of the cell, not measurements of anything real: no title in the product
                is three-quarters of a card wide, and no future edit to the real card can make these
                two numbers wrong. They are the only exemption `skeleton-measurements.test.ts`
                declares, and this comment is the reason that exemption is justified rather than
                convenient. `w-full` is not a measurement either — it is "fill the parent". */}
            <Skeleton aria-hidden="true" className={cn(RESULT_CARD_MEDIA, "w-full rounded-xl")} />
            <Skeleton aria-hidden="true" className={cn(TEXT_BAR_HEIGHT, "w-3/4")} />
            <Skeleton aria-hidden="true" className={cn(TEXT_BAR_HEIGHT, "w-1/2")} />
          </div>
        ))}
      </div>
    </div>
  );
}
