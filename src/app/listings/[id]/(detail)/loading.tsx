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

// THE MONTH GRID IS PLATED TOO (plan 12-09 · BFLOW-05). The availability section is several hundred
// pixels of this page and this fallback reserved none of it, so the resolved calendar used to arrive
// by pushing everything below it down the screen. `CalendarMonthSkeleton` reads the same two strings
// the resolved `Calendar` reads (`CALENDAR_CELL` and the call site's width), which is what makes "the
// placeholder and the grid are the same box" a construction rather than two numbers that agree today
// — `e2e/calendar-hit-area.spec.ts` measures the pair at 320 / 768 / 1280 in both themes.
//
// It is `aria-hidden` here for the SAME reason the mosaic plate above it is, and the reason is worth
// restating because this plate is the one that arrives carrying a `role="status"` of its own:
// `PanelSkeleton` already owns this route's one busy region, and two regions announcing one wait is
// rule 6 of `src/lib/design/live-regions.ts`. The component's region is a contract asserted in
// `tests/design/skeleton-a11y.test.tsx` and declared as `calendar-month-loading`; a surface that
// mounts it as its OWN busy region gets an announced one, and this route is not that surface.

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE PLATE'S MONTH IS COMPUTED HERE, ONCE, AND THAT IS THE WHOLE OF THE SINGLE-SOURCE ARGUMENT
// (19.1 · FINDING D-A2)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `CalendarMonthSkeleton` used to reserve six week rows unconditionally. A month folds into 4, 5 or 6
// of them, and only 2 of the 12 months after September 2026 are six-row months — so the plate stood
// 410px tall against a 357.19px grid, a **52.81px layout shift**, measured at 320 / 768 / 1280 in both
// themes and live ten months in twelve. The plate now reserves the month's OWN rows.
//
// ⚠ WHY THE MONTH IS COMPUTED IN THIS FILE AND NOT IN THE COMPONENT. The plate is the pre-hydration
// paint: this file is a Server Component, so its output is produced on the server, and the
// `"use client"` component it mounts is rendered AGAIN on the client during hydration. If the
// component derived the month from its own `new Date()`, the two renders would each read their own
// clock — and a browser east of the server crosses a month boundary hours before the server does. On
// the last night of a month those two renders emit a different number of week rows for the same
// boundary, which is a hydration mismatch. That would trade a layout shift for a React error and call
// it a repair.
//
// So the month is read from a clock EXACTLY ONCE, here, and travels to the component as a serialized
// prop. The client never derives it; there is nothing for it to disagree with.
// `tests/design/calendar-plate-month.test.tsx` is build-blocking and holds three proofs of that
// property, including a `renderToString` → `hydrateRoot` across a month boundary carrying a
// deliberately clock-reading control that must FAIL.
//
// THE ZONE. `src/lib/db/schema.ts:223` declares `Asia/Manila` as every listing's default and the
// launch region, and the resolved calendar renders in the LISTING's zone — which this file cannot
// know, because a `loading.tsx` receives neither params nor a database. The launch zone is therefore
// the closest single answer available, and the residual is stated rather than hidden: for a listing in
// some other zone, during the hours when its calendar date differs from Manila's AND the two dates
// fall in different months AND those months fold into a different number of rows, the plate is one row
// out. That is a handful of hours a year against ten months in twelve, and it is strictly better than
// the constant it replaces.
//
// THE OTHER RESIDUAL — THE SEARCHED MONTH. `/listings/[id]?date=…` can open the resolved grid on a
// month that is not the current one (D-59 #1, `(detail)/page.tsx`), and a `loading.tsx` cannot read
// search params. The plate then reserves the current month's rows for another month's grid. Unchanged
// by this repair, and unfixable from here: it would need the fallback to see the request, which is
// what a `loading.tsx` is defined not to do.

import { tz } from "@date-fns/tz";
import { format } from "date-fns";

import {
  CalendarMonthSkeleton,
  type MonthLocal,
} from "@/components/availability/availability-calendar";
import { PanelSkeleton } from "@/components/patterns/panel-skeleton";
import { MOSAIC_ASPECT } from "@/lib/design/measurements";

/** The launch region — `src/lib/db/schema.ts:223`'s `timezone` default, and the reason above. */
const PLATE_MONTH_TZ = "Asia/Manila";

/**
 * THE PLATE'S MONTH AS A FUNCTION OF ONE INSTANT — exported so its VALUE can be asserted rather than
 * its shape (19.1-REVIEW.md WR-05).
 *
 * ⚠ WHY THIS IS A NAMED EXPORT AND NOT THREE LINES IN THE COMPONENT BODY, WHICH IS WHERE IT LIVED.
 * The mount-site census below in `tests/design/calendar-plate-month.test.tsx` could only reach the
 * component's SOURCE, so all it could assert was `/<CalendarMonthSkeleton\s+month=\{/` — a regex ANY
 * expression satisfies. The whole correctness of the D-A2 repair was in the arithmetic that regex did
 * not look at, and it was MEASURED silently undoable: adding `- 1` here (the slip someone applying
 * `Date`'s 0-based convention makes) reserves AUGUST's six rows against SEPTEMBER's five-row grid —
 * D-A2's 52.81px shift, verbatim — with the design suite green at 81 files / 1426 passed. The
 * evidence pair is `evidence/guards-review-wr01-02-03-05-{pre,post}-fix.txt` § WR-05.
 *
 * ⚠ `month` IS 1-BASED, which is `MonthLocal`'s declared convention and NOT `Date`'s.
 * `weekRowsForMonth` validates nothing, so `{year: 2027, month: 0}` does not throw — it resolves
 * through `Date.UTC(2027, -1, 1)` to December 2026 and returns a plausible 5. That is why the value
 * is asserted at three named instants (a 0-based slip, a UTC-instead-of-Manila slip and a
 * year-rollover slip each redden a different one) rather than range-checked here.
 *
 * The instant is a PARAMETER rather than a clock read for the reason the whole block above states:
 * this file reads the clock exactly once, at the mount, and everything downstream of that read is a
 * serialized number.
 */
export function plateMonthAt(now: Date): MonthLocal {
  const inLaunchTz = tz(PLATE_MONTH_TZ);
  return {
    year: Number(format(now, "yyyy", { in: inLaunchTz })),
    month: Number(format(now, "M", { in: inLaunchTz })),
  };
}

export default function ListingDetailLoading() {
  // THE ONE CLOCK READ, in `(detail)/page.tsx:437-455`'s own idiom — `new Date()` formatted `{ in: tz }`
  // — so the two files answer "what month is it in the venue's zone" the same way. Everything
  // downstream of it is a serialized number.
  //
  // ⚠ `new Date()` AND NOT `Date.now()`, AND THE DIFFERENCE IS ENFORCED. `react-hooks/purity` rejects
  // `Date.now()` inside a component body ("Cannot call impure function during render") and `npm run
  // lint` is part of `npm run build`, so the tidier-looking spelling does not compile. The rule is
  // right about client components and merely blunt here: this one renders on the server, once per
  // request, and the value it produces is serialized rather than re-derived. Recorded because
  // "simplify to Date.now()" is a plausible edit that turns the build red.
  //
  // ⚠ THE DERIVATION IS `plateMonthAt`, AND THE MOUNT-SITE CENSUS ASSERTS THAT IT STILL IS. Inlining
  // the arithmetic back into this body — the plausible "tidy-up" — leaves the exported helper correct
  // and unused, which the value cases above cannot see. `calendar-plate-month.test.tsx` reads the
  // identifier out of the `month={…}` prop and requires it to be bound to a call to this function.
  const plateMonth = plateMonthAt(new Date()); // ONE read, bound once — two reads could straddle the boundary this repair is about

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
      <div aria-hidden="true" className="mt-8">
        <CalendarMonthSkeleton month={plateMonth} />
      </div>
    </main>
  );
}
