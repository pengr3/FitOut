// STATE-01 — the loading state for `/host/listings`, migrated onto the shared inventory (plan 11-17).
//
// WHAT CHANGED. The shipped file drew its own grid: `aspect-[4/3]` for the media box and two `h-4`
// bars per cell, all literal, plus an `h-7 w-40` bar standing in for the title. Every one of those is
// now `patterns/card-grid-skeleton.tsx` reading `RESULT_CARD_MEDIA` / `TEXT_BAR_HEIGHT` out of
// `src/lib/design/measurements.ts`, so the placeholder and the real `<AspectRatio ratio={4 / 3}>` in
// `listing-card.tsx` cannot drift apart. It also had no `role="status"` at all — same AC#18 hole as
// the booker model next door; the pattern supplies it.
//
// ── THE HEADER ROW DELIBERATELY OMITS THE PAGE'S `Create listing` CTA, AND A GATE DECIDED IT ──────
// The real header is `<h1>` beside a `variant="brand"` CTA that renders only when the host HAS
// listings, so the row is two heights: 36px with the button, 28px without. This fallback is shown on
// the path where the grid is about to appear, so on pure geometry the button belongs here — and it
// was written here first. `tests/design/brand-recipe.test.ts` went red on it, verbatim:
//
//   AssertionError: expected 21 to be 20   (adopts the brand variant at exactly 20 call sites)
//   AssertionError: expected 6 to be 5     (lands the 5 host conversions on the host surface)
//
// The gate is right and the geometry argument loses. DS-08 / D-21 pins coral to twenty buttons
// someone asked for, and a loading state is the one screen where a saturated focal point is
// unambiguously wrong: it would be the only chromatic thing on a page made entirely of grey
// placeholders, drawing the eye to a control while the content it belongs beside does not exist yet.
// Bumping 20 → 21 to keep an 8px header row is the rubber-stamp reflex this phase exists to remove.
// So: 8px of accepted residual on the header row, recorded here and in the SUMMARY.
//
// SECOND RESIDUAL, ALSO RECORDED RATHER THAN PAPERED OVER: a host with ZERO listings sees this grid
// fallback and then an `EmptyState`, which is a shape change no skeleton can avoid — `loading.tsx`
// runs before the query that decides which of the two the page is. The grid is the right guess
// because it is the steady state; the zero case is a first-run-only mismatch.

import { PageHeader } from "@/components/patterns/page-header";
import { CardGridSkeleton } from "@/components/patterns/card-grid-skeleton";

export default function LoadingListings() {
  return (
    // Container and the `mb-8` header offset are `(host)/host/listings/page.tsx`'s own, verbatim.
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-8">
        <PageHeader title="Your listings" />
      </div>

      <CardGridSkeleton label="Loading your listings" />
    </div>
  );
}
