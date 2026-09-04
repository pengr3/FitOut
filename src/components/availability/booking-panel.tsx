"use client";

// RESP-02 / D-48 — ONE BOOKING PANEL, TWO PLACEMENTS, `hidden` AS THE MECHANISM.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE RULE THIS FILE IS THE DECLARED EXCEPTION TO, AND WHY THE EXCEPTION IS BOUNDED
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Phase 11's responsive rules are (1) reorder with CSS, never with conditional rendering, and (2) move
// one instance, do not render two. D-48 puts the booking rail INSIDE a sheet on mobile while BFLOW-02
// keeps the desktop order; a React portal is a runtime decision, so there is no CSS that relocates a
// mounted subtree across one. The resolution is the precedent Phase 11 itself set for the host nav
// drawer: ONE SOURCE OF TRUTH, TWO PLACEMENTS FOR THE DOM, `hidden` AS THE MECHANISM — not `sr-only`,
// not `opacity-0` — so the inactive copy leaves the ACCESSIBILITY TREE and not merely the screen.
//
// That last distinction is the whole of it. `getByRole` excludes what is hidden from the accessibility
// tree, so `max-lg:hidden` on the rail placement is what makes "exactly one Book button at 375px AND at
// 1280px" true rather than aspirational — and it is why a `getByTestId` count is explicitly REJECTED as
// the assertion: a testid query finds the hidden copy and would be green against two live controls.
//
// THREE HARD CONDITIONS make the duplication safe rather than merely tolerated, and all three are
// measured in `e2e/mobile-booker-path.spec.ts`:
//
//   1. THIS COMPONENT OWNS ZERO STATE — it declares no React state hook of any kind and performs no
//      fetch. The selection and the day both live in `BookingSelectionProvider` (plan 12-02's seam A),
//      mounted ONCE above both placements. Two views, one state, one fetch — asserted as exactly ONE
//      availability request per day selection, at both widths, by a `page.route` counter filtered on
//      the server-action header.
//      ⚠ THE TWO HOOK NAMES ARE DESCRIBED AND NEVER SPELLED IN THIS FILE, and that is deliberate: the
//      plan's acceptance criterion is a `grep` for them over this file expecting NO match, and a
//      comment that names the thing it forbids disarms the check. Six instances of that exact shape are
//      already on the record in this repository (`booking-row.tsx:112`, `responsive-dialog.tsx`'s
//      viewport-height note, 11-07's two, 11-08's three, 12-07's finding 4). Do not helpfully re-add
//      them.
//   2. EXACTLY ONE OF ANYTHING A USER CAN REACH. Asserted with ROLE queries at both widths.
//   3. EXACTLY ONE PRICE HOOK PER SURFACE. `rail-price-total` from the rail placement,
//      `sheet-price-total` from the sheet placement, never both from one document.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ WHAT `placement` SELECTS, AND THE MEASUREMENT THAT DECIDED IT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// 12-UI-SPEC describes the desktop copy as living in "the listing's main column + rail". Those are two
// grid cells with four sections of prose between them, so the desktop copy is not one DOM subtree and
// cannot be: the month grid renders in the main column (BFLOW-02's order) and the price and CTA render
// in the 360px rail. `placement` is therefore what says WHICH OF THE TWO ARRANGEMENTS this mount is:
//
//   "rail"   the price summary + the CTA, inside the rail's `PanelCard sticky`. The month grid is NOT
//            here — it is in the main column, where BFLOW-02 puts it and where
//            `e2e/calendar-hit-area.spec.ts` measures its 44px cells at four widths.
//   "sheet"  the month grid, the day's slot chips, the same price summary and the CTA, in one overlay,
//            with the action bar PINNED inside the scroll container.
//
// MEASURED, before this was written rather than after: the calendar's own container is a definite
// `w-[calc(7*var(--cell-size)+18px)]` = 326px at `md:` and above (`availability-calendar.tsx`'s
// `CALENDAR_GRID_WIDTH`, whose derivation and 320px-overflow history are at the constant). The rail's
// content box is 360 − 48 = 312px at `sm:` and up. Rendering the grid in the rail placement therefore
// overflows the panel by 14px at every desktop width, deletes the main-column Availability section the
// requirement's own order names, and leaves the desktop page a wide empty column beside a crammed rail.
// The arrangement fork is the cost of not doing that, and it is bounded: it selects the ARRANGEMENT and
// nothing else. It never decides what to fetch and it never decides what a figure is.
//
// ⚠ IT MUST NOT GROW TO SELECT A THIRD THING. The sheet is the rail in another presentation — same
// rows, same order, same weights, same figures, same sentences. The moment `placement` selects a
// different price, a different label or a different action, BFLOW-04's "one fact" stops being a
// property of the code.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE RESUME PROPS GO TO EXACTLY ONE MOUNT, AND THAT IS A CORRECTNESS RULE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `BookCta` auto-submits a restored selection ONCE ON MOUNT (D-41's sign-in resume). It is now mounted
// up to three times on this route — the rail placement, the sheet placement and the sticky bar — so
// threading `resumeWindow`/`resumeOpen` to more than one of them would fire two or three holds for one
// return from `/login`. The RAIL placement is the one that carries them, because it is mounted at every
// width (it is `display:none` below `lg:`, which still runs effects) while the sheet's is mounted only
// while the sheet is open. Every other mount passes null, deliberately and with this note beside it.

import {
  AvailabilityCalendar,
  RailPassSummary,
  RailSelectionSummary,
  selectedTotalLabel,
  useBookingSelection,
  type AllInTable,
  type DayLocal,
} from "@/components/availability/availability-calendar";
import { BookCta, type OpenPick, type PlaceHoldFn } from "@/components/booking/book-cta";
import { Button } from "@/components/ui/button";
import type { DayAvailability } from "@/lib/availability/read-model";
import type { SlotSelectionValue } from "@/components/availability/slot-selection";
import { cn } from "@/lib/utils";

/** Which of the two arrangements this mount is. See the header for what it may and may not select. */
export type BookingPanelPlacement = "rail" | "sheet";

export type BookingPanelProps = {
  placement: BookingPanelPlacement;

  // ── identity + the availability surface (read by the sheet placement only) ───────────────────────
  listingId: string;
  timezone: string;
  cityLabel: string;
  gmtLabel: string;
  unitCount: number;
  occupancyMode: "exclusive" | "open_capacity";
  initialDate: DayLocal;
  initialDay: DayAvailability | null;
  initialFullDates: string[];
  todayDate: DayLocal;

  // ── money: FINISHED figures only (D-130 / GATE-05) ──────────────────────────────────────────────
  /** The server-built table of every price the booker can select. A LOOKUP, never ingredients. */
  allIn: AllInTable;
  currency: string;
  /** The host's raw rates, for the breakdown's run LABEL only — see `RailSelectionSummary`'s own note. */
  hourlyRateCents: number | null;
  dayRateCents: number | null;
  perHeadPriceCents: number | null;

  // ── the CTA ─────────────────────────────────────────────────────────────────────────────────────
  bookable: boolean;
  placeHold: PlaceHoldFn;
  placeOpenHold: PlaceHoldFn;
  /** D-41's sign-in resume. Non-null on EXACTLY ONE mount — see the header. */
  resumeWindow?: SlotSelectionValue | null;
  resumeOpen?: OpenPick | null;
};

/**
 * The booking interaction, in whichever arrangement `placement` names.
 *
 * ZERO STATE, and that is condition 1 rather than a style: every value it renders comes from
 * `useBookingSelection()` or from a prop the RSC computed. This file declares no React state hook at
 * all, and the scan for the two hook names is expected to stay empty — see the header for why neither
 * name is written out here.
 */
export function BookingPanel({
  placement,
  listingId,
  timezone,
  cityLabel,
  gmtLabel,
  unitCount,
  occupancyMode,
  initialDate,
  initialDay,
  initialFullDates,
  todayDate,
  allIn,
  currency,
  hourlyRateCents,
  dayRateCents,
  perHeadPriceCents,
  bookable,
  placeHold,
  placeOpenHold,
  resumeWindow = null,
  resumeOpen = null,
}: BookingPanelProps) {
  const { selection, openSelection } = useBookingSelection();
  const isSheet = placement === "sheet";
  const isOpenCapacity = occupancyMode === "open_capacity";

  // The SAME lookup and the SAME format the breakdown's `Total` uses, so the pinned bar's label and the
  // figure directly above it cannot differ (see `selectedTotalLabel`). Null until something is selected,
  // in which case the CTA keeps its shipped name and its disabled state.
  const total = selectedTotalLabel(allIn, selection, openSelection, currency);

  const cta = bookable ? (
    <BookCta
      listingId={listingId}
      placeHold={placeHold}
      placeOpenHold={placeOpenHold}
      occupancyMode={occupancyMode}
      resumeWindow={resumeWindow}
      resumeOpen={resumeOpen}
      // D-59 #3 restated at the one place the booker reads it: with a window already picked the action
      // names the amount it is about to place a hold for. `undefined` falls back to the shipped label,
      // which is what keeps every existing `getByRole("button", { name: "Book this space" })` — the
      // shared e2e fixture's included — resolving on the rail placement exactly as it always has.
      label={isSheet && total ? `Book · ${total}` : undefined}
    />
  ) : (
    // ── PUBLISHED BUT NOT PAYABLE — a disabled affordance and a STATIC explanation (D-56) ──────────
    // Byte-identical to the branch this replaced in `(detail)/page.tsx`, moved rather than rewritten:
    // it is the same two elements, with the same copy, and the reason it is static rather than a
    // tooltip is recorded at the site it moved from and in D-56.
    <div className="space-y-2">
      <Button size="lg" variant="secondary" disabled className="w-full">
        Not bookable yet
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        This space isn&apos;t accepting bookings yet — the host is finishing their payout setup.
      </p>
    </div>
  );

  return (
    <div data-testid="booking-panel" data-placement={placement} className="space-y-4">
      {/* THE MONTH GRID IS THE SHEET ARRANGEMENT'S ONLY EXTRA PART, and the rail's omission is a
          measurement rather than a preference — the derivation is in this file's header. */}
      {isSheet && (
        <AvailabilityCalendar
          listingId={listingId}
          timezone={timezone}
          cityLabel={cityLabel}
          gmtLabel={gmtLabel}
          unitCount={unitCount}
          bookable={bookable}
          initialDate={initialDate}
          initialDay={initialDay}
          occupancyMode={occupancyMode}
          initialFullDates={initialFullDates}
          todayDate={todayDate}
        />
      )}

      {/* The selection summary — the REAL `PriceBreakdown`, itemised, from the widened table. `surface`
          is the ONLY thing `placement` hands it, and it selects the total's structural hook so that one
          document never holds two elements carrying one id (condition 3). */}
      {isOpenCapacity ? (
        <RailPassSummary
          timezone={timezone}
          currency={currency}
          allIn={allIn}
          perHeadPriceCents={perHeadPriceCents}
          surface={placement}
        />
      ) : (
        <RailSelectionSummary
          timezone={timezone}
          currency={currency}
          allIn={allIn}
          hourlyRateCents={hourlyRateCents}
          dayRateCents={dayRateCents}
          surface={placement}
        />
      )}

      {/* ── THE ACTION ────────────────────────────────────────────────────────────────────────────
          In the sheet it is PINNED: `sticky bottom-0` inside `DialogContent`, which is the sheet's own
          scroll container (`max-sm:overflow-y-auto`). That is the whole reason the sheet works at
          320×568, where its content does not fit — the booker can be anywhere in the month grid and the
          amount and the action are still on screen. `-mx-4 px-4` is `DialogContent`'s own `p-4` paid
          back, so the bar is full-bleed against the sheet's edges rather than floating inside them. */}
      <div
        className={cn(
          isSheet && "sticky bottom-0 -mx-4 space-y-2 border-t bg-card px-4 pt-3 pb-1",
        )}
      >
        {cta}
        {bookable && (
          <p className="text-center text-xs text-muted-foreground">
            You won&apos;t be charged yet.
          </p>
        )}
      </div>
    </div>
  );
}
