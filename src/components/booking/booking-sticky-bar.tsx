"use client";

// RESP-02 / D-48 / D-59 #3 — THE LISTING PAGE'S STICKY BOTTOM BAR, AND THE ONE OVERLAY BEHIND IT.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THE REQUIREMENT ACTUALLY ASKS FOR
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// At 375px a booker must be able to see a price and reach a 44px action WITHOUT SCROLLING. Before this
// file the listing page answered "what do I do here" only after the whole main column had gone past:
// the rail is a `lg:` column, so on a phone it stacked below the description, the calendar, the map, the
// policy and the host block. That is the requirement's whole content, and it is measured rather than
// asserted — `e2e/mobile-booker-path.spec.ts` reads this bar's box with `scrollY === 0`.
//
// TWO STATES, AND THE SECOND ONE IS A DECISION RATHER THAN A CONVENIENCE (D-59 #3, fewest taps on the
// money path):
//
//   no selection    `Check availability`     opens the sheet
//   selection       `Book · {total}`         submits the hold DIRECTLY — the sheet is SKIPPED
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ `shadow-sticky` GETS ITS FIRST PRODUCT CALL SITE HERE, AND ITS OFFSET IS AN UPWARD CAST
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `globals.css` declares the step as `0 -1px 12px -2px …` (court) / `0 -2px 20px -4px …` (grove). The
// NEGATIVE y-offset means the shadow is thrown UPWARD, onto the content the bar is covering. That is
// authored for a bottom-anchored bar and is wrong on anything else: on a top header it would cast the
// shadow up off the screen and leave the boundary a booker actually sees completely flat. THIS STEP MUST
// NEVER GO ON A TOP HEADER. `tests/design/elevation-z.test.ts` pins its call sites PER FILE with
// `toEqual`, so adding one is an inventory edit somebody has to justify rather than a free choice; the
// second and last one is the checkout bar (plan 12-11).
//
// `z-(--z-sticky)` (10) and NOT `--z-sheet` (20), which is the step that looks like it was made for
// this. `globals.css` records the whole argument at the token: a bottom bar that floated above the
// sheet's own scrim would be claiming the page is still interactive while the sheet says it is not.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE TRIGGER STAYS A `DialogTrigger`, AND THAT IS THE 12-07 DEFECT BEING AVOIDED ON PURPOSE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Radix's modal dialog sets `onCloseAutoFocus` to `preventDefault()` and then focuses
// `context.triggerRef.current` — it suppresses the browser's own focus restore in order to focus ITS
// trigger, and that ref is populated only by `<DialogTrigger>`. 12-07 measured what happens without one:
// `Escape` drops focus to `<body>`.
//
// So the sheet is opened through the pattern's `trigger` slot, uncontrolled, exactly as every other
// adopter does. But this bar has a second hazard the lightbox did not: THE TRIGGER ITSELF DISAPPEARS
// while the sheet is open. A booker who opens the sheet with nothing selected and then picks a window
// inside it flips this bar into its `Book · {total}` state, which unmounts the `Check availability`
// button — so at the moment the sheet closes, `triggerRef.current` points at a node that is no longer in
// the document and Radix's restore is a no-op on it. `restoreFocusToAction` below is 12-07's fix in this
// file's own shape: it focuses whichever button the bar is currently rendering, which is the trigger
// when the trigger is there and the Book action when it has replaced it.
//
// ⚠ `ResponsiveDialog` IS RENDERED UNCONDITIONALLY, and only its `trigger` is conditional. Rendering the
// whole overlay behind the same condition would UNMOUNT the open sheet the instant the booker picked a
// window in it — the sheet would slam shut on the tap that was supposed to reveal the price.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE MAY NOT DO (GATE-05 / T-12-10-BARPRICE)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// It performs no arithmetic on any money value and it composes no figure. The rate strings arrive
// already formatted from `allInRateParts`, which is `server-only` precisely so the fee rate and the
// formula stay out of the browser bundle; the selection's total comes from `selectedTotalLabel`, which
// is ONE lookup in the server-built table plus the SAME `formatMoney` call `PriceBreakdown`'s `Total`
// makes. That identity is why the bar's amount and the sheet's `Total` are byte-equal, and it is what a
// locally summed figure would break at the rounding edge while every other gate stayed green.

import * as React from "react";

import {
  selectedTotalLabel,
  useBookingSelection,
  type AllInTable,
} from "@/components/availability/availability-calendar";
import { BookCta, type PlaceHoldFn } from "@/components/booking/book-cta";
import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";
import { Button } from "@/components/ui/button";
import { STICKY_BAR_HEIGHT } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";

/**
 * The sheet's accessible name. REQUIRED and non-empty by `ResponsiveDialog`'s own contract — a dialog
 * with no name is a WCAG 4.1.2 failure — and deliberately the same sentence the desktop CTA uses, so a
 * screen-reader user meets one name for one job rather than two synonyms for it.
 */
const SHEET_TITLE = "Book this space";

/**
 * The close control's name. NOT the vendored `Close`: the photo lightbox on this same route already owns
 * `Close photos`, and two entries reading `Close` in a screen reader's element list are two controls a
 * user cannot tell apart (12-07's Next Phase Readiness records this as owed by this plan).
 */
const SHEET_CLOSE_LABEL = "Close booking";

export type BookingStickyBarProps = {
  /**
   * The listing's advertised rate parts, ALREADY FORMATTED and already all-in — `allInRateParts`'s
   * output, e.g. `["₱497.00/hr", "₱3,033.32/day"]`. Empty means the listing quotes no rate, in which
   * case the bar says `Price on request`, exactly as the rail's headline does.
   */
  rateParts: string[];
  /** The server-built table of every price the booker can select. A LOOKUP, never ingredients (D-130). */
  allIn: AllInTable;
  currency: string;
  /** The sheet's contents — `<BookingPanel placement="sheet">`, composed by the RSC. */
  sheet: React.ReactNode;

  // ── the selection-state action, which is `BookCta` in another box (see the header) ───────────────
  listingId: string;
  occupancyMode: "exclusive" | "open_capacity";
  placeHold: PlaceHoldFn;
  placeOpenHold: PlaceHoldFn;
};

export function BookingStickyBar({
  rateParts,
  allIn,
  currency,
  sheet,
  listingId,
  occupancyMode,
  placeHold,
  placeOpenHold,
}: BookingStickyBarProps) {
  const { selection, openSelection } = useBookingSelection();

  // The SAME lookup and the SAME format the sheet's `Total` uses — see `selectedTotalLabel`. Null while
  // nothing is selected, which is exactly the condition that decides which action this bar renders.
  const total = selectedTotalLabel(allIn, selection, openSelection, currency);

  const actionRef = React.useRef<HTMLDivElement | null>(null);
  const restoreFocusToAction = React.useCallback((event: Event) => {
    const button = actionRef.current?.querySelector("button");
    // No button to restore to means the bar is mid-swap in a way this file did not anticipate; leaving
    // Radix's own behaviour alone is strictly better than calling `preventDefault()` and focusing
    // nothing, which is the exact shape of the defect this handler exists for.
    if (!button) return;
    event.preventDefault();
    button.focus();
  }, []);

  return (
    <div
      data-testid="booking-sticky-bar"
      className={cn(
        "fixed inset-x-0 bottom-0 z-(--z-sticky) flex items-center gap-3 border-t bg-card px-4 shadow-sticky lg:hidden",
        STICKY_BAR_HEIGHT,
      )}
    >
      {/* ⚠ NEITHER LINE MAY WRAP AT 320px, and `whitespace-nowrap` is what says so at the class site.
          A wrapped rate turns a 64px bar into a 64px bar with clipped text, and a wrapped
          `Service fee included` is a disclosure the booker cannot finish reading — on the one surface
          that carries the price at that width. `min-w-0` lets this column shrink so the 44px action
          keeps its own width; `e2e/mobile-booker-path.spec.ts` case (b) measures both line boxes
          against a single-line reference at 320px rather than trusting the class. */}
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold tabular-nums whitespace-nowrap">
          {rateParts[0] ?? "Price on request"}
        </p>
        {rateParts.length > 0 && (
          <p className="text-xs text-muted-foreground whitespace-nowrap">Service fee included</p>
        )}
      </div>

      <div ref={actionRef} className="flex shrink-0 items-center">
        <ResponsiveDialog
          title={SHEET_TITLE}
          closeLabel={SHEET_CLOSE_LABEL}
          onCloseAutoFocus={restoreFocusToAction}
          // The trigger is the bar's action ONLY while nothing is selected. With a window picked, D-59
          // #3 replaces it with the hold submission and the sheet becomes unreachable from here —
          // which is the point: the booker has already answered the question the sheet asks.
          trigger={
            total === null ? (
              <Button variant="brand" size="touch" className="shrink-0">
                Check availability
              </Button>
            ) : undefined
          }
        >
          {sheet}
        </ResponsiveDialog>

        {/* THE SAME CONTROL THE RAIL RENDERS, in its bar layout — one action, one guard, one server
            ruling. See `BookCta`'s `layout` prop for why the fork lives there rather than here.
            `resumeWindow`/`resumeOpen` are deliberately NOT threaded: `BookCta` auto-submits a restored
            selection once on mount, and the rail placement is the mount that carries them. */}
        {total !== null && (
          <BookCta
            listingId={listingId}
            placeHold={placeHold}
            placeOpenHold={placeOpenHold}
            occupancyMode={occupancyMode}
            layout="bar"
            label={`Book · ${total}`}
          />
        )}
      </div>
    </div>
  );
}
