"use client";

// Booker availability calendar (AVAIL-03 · SC#2). Replaces the "Availability coming soon" placeholder
// on the public listing page with a real month grid → day → hourly SlotPicker, all rendered in the
// VENUE's local timezone (react-day-picker `timeZone` + date-fns `tz()`), independent of the browser tz.
// A visible, aria-associated tz note ("Times shown in {City} time ({GMT±N})") is always shown (SC#2).
//
// This file exports three small, related client pieces so the selection made in the calendar (main
// column) can drive the summary in the booking rail (a different grid column) without prop-drilling a
// callback across the RSC boundary:
//   - BookingSelectionProvider — holds the lifted { selection } state AND the lifted DAY state; wraps
//                                the whole booking grid.
//   - AvailabilityCalendar     — the month grid + SlotPicker; writes selection into the context.
//   - RailSelectionSummary     — reads selection; shows date · time range · all-in price in the rail.
//
// PHASE 12 (RESP-02 / STATE-07 · seam A) — THE DAY IS HOISTED, AND THAT IS THE POINT OF THIS FILE NOW.
// `day`, `dayAvail`, `dayLoading` and `dayError` used to be four `useState` calls INSIDE
// AvailabilityCalendar, which made three later requirements impossible rather than merely awkward:
//   1. RESP-02's booking SHEET mounts a SECOND booking view. Two copies of this component would hold
//      two independent days and issue two availability requests for one day selection (AC#21 requires
//      exactly one).
//   2. STATE-07 / D-55 needs refreshed availability to land in the SAME PAINT as the collision notice.
//      `router.refresh()` provably cannot do that: Next's own contract is that refresh "will merge the
//      updated React Server Component payload WITHOUT LOSING unaffected client-side React (e.g.
//      useState)" — and the day's slots WERE client state seeded, on mount only, from a prop computed
//      for TODAY. The existing `router.refresh()` in book-cta.tsx is therefore a no-op on this grid.
//      `refreshDay()` below is the seam that actually works, and it returns its promise so the caller
//      can batch the notice and the new grid.
//   3. D-59 #1 ("never make the booker tell us something twice") needs the SEARCHED day to survive the
//      click from the search card. That day now arrives as the provider's `initialDate`.
// AvailabilityCalendar is a PURE CONSUMER of those four values; it owns no fetch.
//
// The calendar is ADVISORY (Pitfall 6): the DB EXCLUDE constraint is the sole authority and Phase 4
// re-derives + re-validates the selection. Selection is enabled ONLY when the listing is `bookable`
// (deriveBookable) — a published-but-not-payable listing renders the real availability read-only.
//
// PHASE 9 (OPEN-02) — this file FORKS, it does not change. A listing sold as day passes renders the
// DatePassPicker instead of the hour grid, and the rail renders RailPassSummary instead of
// RailSelectionSummary. Everything below the fork is the shipped exclusive surface, untouched: the fork
// ADDS a branch, it does not replace a surface.

import * as React from "react";
import { format } from "date-fns";
import { tz, TZDate } from "@date-fns/tz";

import { getDayAvailability } from "@/app/actions/availability";
// D-34 / GATE-05: from `horizon` and NOT from `slots`. `slots.ts` is a guarded server-only computation
// module; this constant was split out of it precisely so this line can exist in a `"use client"` file.
import { BOOKING_HORIZON_DAYS } from "@/lib/availability/horizon";
import type { DayAvailability } from "@/lib/availability/read-model";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { SlotPicker, type SlotSelectionValue } from "@/components/availability/slot-picker";
import { DatePassPicker } from "@/components/availability/date-pass-picker";
// D-38 / BFLOW-04 — the REAL breakdown, not a lookalike. See the note above RailSelectionSummary for
// why "one component" is the requirement rather than "two components that agree".
import { PriceBreakdown } from "@/components/booking/price-breakdown";

export type DayLocal = { year: number; month: number; day: number };

// D-130 / GATE-05 — the rail's prices arrive as a server-built lookup table of integer centavos.
//
// TYPE-ONLY, and that is load-bearing: `import type` is ERASED, so this line does not pull
// `all-in-table.ts` — and through it the guarded `service-fee.ts` — into the client graph. A value import
// of the same module would fail the build, which is exactly the enforcement working as intended.
//
// The shape, the reason it is a table rather than a unit rate, and the measured rounding divergence that
// rules the alternative out all live in `src/lib/booking/all-in-table.ts`, beside the code that builds it
// and the test that pins it. Not restated here — one place to keep true.
export type { AllInTable } from "@/lib/booking/all-in-table";
import type { AllInTable } from "@/lib/booking/all-in-table";

/**
 * Phase-9 (OPEN-02 · OC-02 / OC-06) — the DROP-IN selection. A calendar DATE and a number of passes, with
 * NO window shape of any kind: `dateIso` is the venue-local `YYYY-MM-DD` the hold action canonicalizes, and
 * the entry-window instants are derived server-side from the listing's own operating hours (T-09-26). A
 * booker never gets to say when their pass starts, because a pass does not start — it covers the day.
 */
export type OpenSelectionValue = {
  kind: "open";
  date: DayLocal;
  dateIso: string;
  passes: number;
};

// ---------------------------------------------------------------------------
// Shared lifted-selection context (calendar → rail summary)
// ---------------------------------------------------------------------------

type SelectionContext = {
  selection: SlotSelectionValue | null;
  setSelection: (sel: SlotSelectionValue | null) => void;
  /** Phase-9: the drop-in selection ({date, passes}). Null on an exclusive listing, and vice versa —
   *  the two are mutually exclusive because a listing is exactly one mode. */
  openSelection: OpenSelectionValue | null;
  setOpenSelection: (sel: OpenSelectionValue | null) => void;

  // ── Phase-12 seam A: ONE day, above every placement ────────────────────────────────────────────
  /** The venue-local calendar day every mounted booking view is showing. */
  day: DayLocal;
  /** That day's server-authoritative availability, or null when it could not be read. */
  dayAvail: DayAvailability | null;
  dayLoading: boolean;
  dayError: boolean;
  /** Move to `next`: sets the day, clears any slot selection, and fetches the day's availability. */
  selectDay: (next: DayLocal) => void;
  /** Re-fetch the CURRENT day. Returns the promise so a caller can await it — the D-55 collision seam. */
  refreshDay: () => Promise<void>;
};

const BookingSelectionContext = React.createContext<SelectionContext | null>(null);

type BookingSelectionProviderProps = {
  listingId: string;
  /** The day the booking views OPEN on — venue-local today, or the day the booker searched (D-59 #1). */
  initialDate: DayLocal;
  /** That day's availability, read server-side by the RSC so the first paint already carries it. */
  initialDay: DayAvailability | null;
  /**
   * D-59 #1 — the booker's SEARCHED window, already verified free by the RSC against the same read
   * model `initialDay` came from. Null on every other arrival. A REQUEST, never an authorisation:
   * `placeHold` re-derives availability and price inside its transaction and stays the sole authority
   * (D-130 / T-12-02-SEEDTRUST).
   */
  initialSelection?: SlotSelectionValue | null;
  children: React.ReactNode;
};

/**
 * Provides the lifted booker selection AND the lifted day to the calendar + the rail summary. Wrap the
 * booking grid.
 *
 * `getDayAvailability` (src/app/actions/availability.ts) is the ONLY read this hook performs, and it is
 * called from exactly one place in the whole client tree — right here. It is public, read-only, session-
 * less by design, Zod-validates its untrusted `dayLocal`, and re-enforces the published + non-deleted
 * gate independently (WR-01). Nothing about money or availability COMPUTATION crosses this boundary
 * (GATE-05): the client asks the server for a day and holds the answer.
 */
export function BookingSelectionProvider({
  listingId,
  initialDate,
  initialDay,
  initialSelection = null,
  children,
}: BookingSelectionProviderProps) {
  const [selection, setSelection] = React.useState<SlotSelectionValue | null>(initialSelection);
  const [openSelection, setOpenSelection] = React.useState<OpenSelectionValue | null>(null);

  const [day, setDay] = React.useState<DayLocal>(initialDate);
  const [dayAvail, setDayAvail] = React.useState<DayAvailability | null>(initialDay);
  const [dayLoading, setDayLoading] = React.useState(false);
  const [dayError, setDayError] = React.useState(false);

  /**
   * THE STALE-RESPONSE GUARD (T-12-02-RACE). Two placements now share one hook, so a booker tapping
   * days quickly has two reads genuinely in flight — this is a real race, not a theoretical one, and
   * the loser resolving last would paint the WRONG day's hours under the RIGHT day's heading: stale-
   * but-plausible availability, which is the one failure mode IN-03 already refuses to ship.
   *
   * A monotonic token rather than an AbortController: a server action is a POST the client cannot
   * meaningfully abort, and the token costs one integer. Any resolution whose token is not the latest
   * is DISCARDED — it must not touch `dayAvail`, `dayError` or `dayLoading` (clearing the flag from a
   * stale call would hide the newer call's own skeleton).
   */
  const tokenRef = React.useRef(0);

  const loadDay = React.useCallback(
    async (target: DayLocal) => {
      const token = ++tokenRef.current;
      setDayLoading(true);
      setDayError(false);
      try {
        const res = await getDayAvailability(listingId, target);
        if (token !== tokenRef.current) return;
        setDayAvail(res);
      } catch {
        if (token !== tokenRef.current) return;
        // IN-03: a failed day fetch must NOT leave the prior day's slots on screen (stale-but-plausible).
        // Clear the grid and flag an inline error so the user sees a retry hint, not wrong availability.
        setDayAvail(null);
        setDayError(true);
      } finally {
        if (token === tokenRef.current) setDayLoading(false);
      }
    },
    [listingId],
  );

  const selectDay = React.useCallback(
    (next: DayLocal) => {
      setDay(next);
      setSelection(null); // a new day clears any prior slot selection in the rail
      void loadDay(next);
    },
    [loadDay],
  );

  // Deliberately does NOT clear the selection: the collision path (12-13) drops its own selection with
  // the notice it renders, and a plain re-read of the current day must not silently discard the
  // booker's pick.
  const refreshDay = React.useCallback(() => loadDay(day), [loadDay, day]);

  const value = React.useMemo(
    () => ({
      selection,
      setSelection,
      openSelection,
      setOpenSelection,
      day,
      dayAvail,
      dayLoading,
      dayError,
      selectDay,
      refreshDay,
    }),
    [selection, openSelection, day, dayAvail, dayLoading, dayError, selectDay, refreshDay],
  );
  return (
    <BookingSelectionContext.Provider value={value}>{children}</BookingSelectionContext.Provider>
  );
}

/** Read the lifted booker selection. Consumed by the calendar, the rail summary, AND the Book CTA (Plan 07). */
export function useBookingSelection(): SelectionContext {
  const ctx = React.useContext(BookingSelectionContext);
  if (!ctx) {
    throw new Error("useBookingSelection must be used within a BookingSelectionProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// AvailabilityCalendar
// ---------------------------------------------------------------------------

type AvailabilityCalendarProps = {
  listingId: string;
  timezone: string;
  cityLabel: string;
  gmtLabel: string;
  unitCount: number;
  bookable: boolean;
  initialDate: DayLocal;
  initialDay: DayAvailability | null;
  /**
   * Phase-9 (OC-01) — which surface this listing gets, read from the LISTING ROW server-side and threaded
   * here by the RSC. This is the only input the fork below is allowed to consult: never a URL param, never
   * a client flag, never the shape of a payload a booker could influence (Security V4).
   */
  occupancyMode: "exclusive" | "open_capacity";
  /** Phase-9 — the initial month's fully-booked venue-local dates, seeded server-side. Drop-in only. */
  initialFullDates?: string[];
  /**
   * Phase-12 (D-59 #1) — VENUE-LOCAL TODAY, which is no longer the same thing as `initialDate`.
   *
   * `initialDate` used to mean both "the day this opens on" and "the earliest selectable day", because
   * they were always today. Now the page can open on the day the booker SEARCHED, and conflating the two
   * would disable every day before it — a booker who searched Friday could no longer pick Wednesday.
   * Optional and defaulting to `initialDate`, so a call site that does not seed a searched day (and every
   * existing test) behaves exactly as it did.
   */
  todayDate?: DayLocal;
};

const TZ_NOTE_ID = "availability-tz-note";

export function AvailabilityCalendar({
  listingId,
  timezone,
  cityLabel,
  gmtLabel,
  unitCount,
  bookable,
  initialDate,
  initialDay,
  occupancyMode,
  initialFullDates,
  todayDate,
}: AvailabilityCalendarProps) {
  // A PURE CONSUMER (Phase-12 seam A). The day, its availability and its two flags are owned by
  // BookingSelectionProvider above every placement; this component owns no fetch and no day state.
  const { selection, setSelection, setOpenSelection, day, dayAvail, dayLoading, dayError, selectDay } =
    useBookingSelection();

  // The horizon is anchored on TODAY, which `initialDate` no longer necessarily is — see the prop.
  const today = todayDate ?? initialDate;

  // Venue-local "today" and the 90-day horizon end (D-26), built as venue-tz instants so the day
  // matchers compare in the venue tz — never the browser tz.
  const todayStart = React.useMemo(
    () => new TZDate(today.year, today.month - 1, today.day, timezone),
    [today, timezone],
  );
  const horizonEnd = React.useMemo(
    () => new TZDate(today.year, today.month - 1, today.day + BOOKING_HORIZON_DAYS, timezone),
    [today, timezone],
  );
  // The react-day-picker `selected` day, as a venue-local-midnight instant.
  const selectedDate = React.useMemo(
    () => new TZDate(day.year, day.month - 1, day.day, timezone),
    [day, timezone],
  );

  // ─── Phase-9 fork (OPEN-02) ──────────────────────────────────────────────────────────────────────
  // A drop-in listing asks a DIFFERENT question ("which day?" instead of "which hours?"), so it gets a
  // different surface rather than a disabled version of this one. The branch is taken on the PERSISTED
  // mode threaded from the RSC — the same row the claim itself arbitrates on, so the picker a booker sees
  // and the mutation that admits them can never disagree.
  //
  // It sits AFTER the hooks above rather than at the very first line, so this component's hook order is
  // identical on every render (rules-of-hooks). The hoisted day in the context is simply unused on this
  // branch — DatePassPicker owns its own day state, and Phase-12 seam A deliberately did not disturb it.
  if (occupancyMode === "open_capacity") {
    return (
      <DatePassPicker
        listingId={listingId}
        timezone={timezone}
        cityLabel={cityLabel}
        gmtLabel={gmtLabel}
        bookable={bookable}
        initialDate={initialDate}
        initialDay={initialDay}
        initialFullDates={initialFullDates ?? []}
        // Same seam SlotPicker uses one screen down: the picker writes the lifted selection through a
        // callback instead of reaching into the context itself, so the two modules stay acyclic and the
        // picker renders standalone in a test.
        onSelectionChange={setOpenSelection}
      />
    );
  }
  // ─── the shipped exclusive surface, unchanged, from here down ────────────────────────────────────

  // The venue-local day the booker clicked, handed UP to the one hook that owns the day. Everything the
  // transition used to do inline — clearing the rail's selection, the loading flag, the error flag, the
  // fetch and its stale-response guard — lives in `selectDay` now, so the sheet's second placement runs
  // the identical transition rather than a second copy of it.
  function handleDaySelect(picked: Date | undefined) {
    if (!picked) return;
    const inTz = tz(timezone);
    selectDay({
      year: Number(format(picked, "yyyy", { in: inTz })),
      month: Number(format(picked, "M", { in: inTz })),
      day: Number(format(picked, "d", { in: inTz })),
    });
  }

  const dayKey = `${day.year}-${day.month}-${day.day}`;
  const dayLabel = format(selectedDate, "EEEE, MMM d", { in: tz(timezone) });
  const hasAnyAvailable = (dayAvail?.slots ?? []).some((s) => s.state === "available");

  return (
    <div className="space-y-3">
      <p id={TZ_NOTE_ID} className="text-sm text-muted-foreground">
        Times shown in {cityLabel} time ({gmtLabel})
      </p>

      <div
        aria-describedby={TZ_NOTE_ID}
        className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start"
      >
        <Calendar
          mode="single"
          timeZone={timezone}
          selected={selectedDate}
          onSelect={handleDaySelect}
          startMonth={todayStart}
          endMonth={horizonEnd}
          disabled={[{ before: todayStart }, { after: horizonEnd }]}
          components={{
            // Selected day = coral (UI-SPEC accent #1); today stays the neutral --muted ring.
            // This is a react-day-picker DayButton className, NOT a <Button> with a variant prop —
            // it stays a token class (10-UI-SPEC § the 29 / 20 / 9 split) and converting it breaks
            // day selection. The hover is the darkening color-mix rather than a 90%-alpha tint:
            // the tint measures 4.04:1 in court / 3.87:1 in grove because alpha over a light
            // surface LIGHTENS, and that failure is a property of the alpha, not of the element.
            DayButton: (dayButtonProps) => (
              <CalendarDayButton
                {...dayButtonProps}
                className="data-[selected-single=true]:bg-brand data-[selected-single=true]:text-brand-foreground data-[selected-single=true]:hover:bg-[color-mix(in_oklch,var(--brand),var(--foreground)_10%)]"
              />
            ),
          }}
          className="rounded-xl border"
        />

        <div className="min-w-0 space-y-3">
          <h3 className="text-sm font-semibold">{dayLabel}</h3>

          {dayLoading ? (
            <div className="flex flex-wrap gap-2" aria-live="polite" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-20 rounded-lg" />
              ))}
            </div>
          ) : dayError ? (
            <div className="rounded-xl border border-dashed p-6 text-center" role="alert">
              <p className="font-medium">Couldn&apos;t load this day</p>
              <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
                Something went wrong fetching availability. Pick the day again to retry.
              </p>
            </div>
          ) : !dayAvail || !dayAvail.hasHours ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="font-medium">No availability yet</p>
              <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
                This host hasn&apos;t set their hours yet. Check back soon.
              </p>
            </div>
          ) : !hasAnyAvailable ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="font-medium">Nothing open on {dayLabel}</p>
              <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
                Every time is booked or closed. Try another day.
              </p>
            </div>
          ) : (
            <SlotPicker
              key={dayKey}
              slots={dayAvail.slots}
              timezone={timezone}
              unitCount={unitCount}
              // D-100: the mode rides along on the read model, so the picker's minimum-notice copy can
              // never disagree with the thresholds the server actually enforces.
              mode={dayAvail.bookingMode}
              disabled={!bookable}
              onSelectionChange={setSelection}
              // D-59 #1: the picker mounts showing whatever the shared context holds — the RSC-seeded
              // searched window on the first paint, and null on every subsequent day (selectDay clears
              // it in the same transition that remounts this via `key`). Read once; see the prop.
              initialSelection={selection}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RailSelectionSummary
// ---------------------------------------------------------------------------

type RailSelectionSummaryProps = {
  timezone: string;
  currency: string;
  /**
   * D-74/D-75/D-130 — the FINISHED all-in figures, computed on the server.
   *
   * THIS PROP REPLACED `serviceFeeBps: number`, and the reason the old one existed is the reason this one
   * had to go further. The rate was threaded from the RSC so the rail could not fall back to the
   * SERVICE_FEE_BPS default — a non-public env override (`SERVICE_FEE_BPS=700`) is not inlined into the
   * browser bundle, so the rail would have kept quoting 5% while checkout charged 7%: the number going UP
   * between browsing and paying, which is exactly what D-75 forbids. That fixed the VALUE but left the
   * COMPUTATION on the client, which is what GATE-05 fails the build over: reaching `computeServiceFee`
   * from a `"use client"` module drags the guarded money graph into the browser bundle. Now nothing about
   * the fee — not the rate, not the formula — is shipped at all.
   *
   * D-38 WIDENED EACH VALUE TO `{space, fee, total}`, and the widening is a SHAPE change rather than a
   * computation move: all three figures are still produced by one `computeServiceFee` call inside the
   * guarded module, and `fee` is subtracted THERE (`allInCents − space`) rather than here. A client that
   * subtracts is a client that can be handed the wrong two numbers and asked to produce a plausible third.
   */
  allIn: AllInTable;
  /**
   * The host's RAW hourly and day rates, for the breakdown's run LABEL only (`₱473.33/hr × 2 hours`).
   *
   * ⚠️ THESE ARE NOT A D-130 BREACH, AND THE DISTINCTION IS THE WHOLE OF GATE-05. D-130 forbids handing a
   * client the INGREDIENTS OF A PRICE — a rate plus the fee rate, from which it would compute what to
   * charge. What crosses here is a rate that is only ever FORMATTED into a label; the figure beside it is
   * `allIn[…].space` and the figure below it is `allIn[…].total`, both finished on the server. Nothing on
   * this surface multiplies a rate by a count, and that is enforced rather than promised:
   * `tests/design/price-surface.test.ts` walks THIS FILE's AST and fails the build on any `+`, `-`, `*`
   * or `/` touching a money identifier or anything derived from one.
   *
   * THE RUN LINE IS THE SPACE RATE, NOT THE ALL-IN RATE, and that is what makes it honest: the fee is
   * disclosed on its own line directly beneath it, and the two add to the `Total`. It is also exactly why
   * D-41 removes the all-in headline the moment a selection exists — see `booking/rail-rate-headline.tsx`.
   */
  hourlyRateCents: number | null;
  dayRateCents: number | null;
};

/** In the booking rail, ABOVE the CTA: the chosen date · time range · the REAL itemised breakdown. */
export function RailSelectionSummary({
  timezone,
  currency,
  allIn,
  hourlyRateCents,
  dayRateCents,
}: RailSelectionSummaryProps) {
  const { selection } = useBookingSelection();
  if (!selection) return null;

  const inTz = tz(timezone);
  const start = new Date(selection.startUtc);
  const end = new Date(selection.endUtc);
  const dateLabel = format(start, "EEE, MMM d", { in: inTz });
  const hours = Math.max(1, Math.round((end.getTime() - start.getTime()) / 3_600_000));
  const timeLabel = selection.fullDay
    ? "Full day"
    : `${format(start, "h:mm a", { in: inTz })} – ${format(end, "h:mm a", { in: inTz })}`;

  // D-75: the rail is the LAST number a booker sees before checkout, so its TOTAL must be ALL-IN. Showing
  // the space price as the bottom line here and charging space + fee on the next screen is the "number
  // goes up between browsing and paying" failure D-75 exists to prevent — and at 5% of the booking it is
  // not a rounding edge. Unlike a search card this IS a total for a chosen window, and it is EXACT rather
  // than approximate: the RSC built this table by applying computeServiceFee to the same space price
  // checkout freezes, at the same rate, so the two agree to the centavo. A LOOKUP, never arithmetic
  // (D-130) — and a lookup is what keeps "exact" true, since multiplying a per-hour all-in figure here
  // would round n times instead of once. A MISSING KEY MEANS NO BREAKDOWN AT ALL, exactly as a null rate
  // has always meant no price line: it is never a cue to compute one on the client.
  //
  // D-38 widened each value from a single integer to `{space, fee, total}` — THREE finished figures for
  // this one selection — which is what lets the block below be the real `PriceBreakdown` rather than a
  // lookalike. `.total` is the identical integer this rail has rendered since Phase 11; the widening added
  // the two figures beside it and changed neither the arithmetic nor where it happens.
  const parts = selection.fullDay ? allIn.fullDay : (allIn.hourly[hours] ?? null);

  return (
    <div className="space-y-3 rounded-lg border p-3 text-sm">
      <div className="space-y-1">
        <p className="font-semibold">{dateLabel}</p>
        <p className="text-muted-foreground">
          <span className="tabular-nums">{timeLabel}</span>
          {!selection.fullDay && ` · ${hours} ${hours === 1 ? "hour" : "hours"}`}
        </p>
      </div>
      {/* D-38 / BFLOW-04 — THE SAME COMPONENT CHECKOUT RENDERS, fed the same three frozen values under
          the same names. BFLOW-04's claim is that a booker RECOGNISES the rail's price and checkout's
          price as one fact, which is a claim about pixels; the only way to make it true rather than
          asserted is for there to be one component. `e2e/price-one-fact.spec.ts` settles it by comparing
          the two totals' COMPUTED STYLES in a real browser, in both themes — not by observing that two
          files import the same module.
          D-40: the figure is labelled `Total` and carries no hedge, on both surfaces. It is exact by
          construction (see above), and hedging a guarantee the system actually makes teaches a booker to
          expect the number to move — D-75's failure mode restated as copy. 12-UI-SPEC AC#9.
          Every figure below is a finished server-computed prop; this file performs no arithmetic on any
          of them, which `tests/design/price-surface.test.ts` asserts over this file's AST. */}
      {parts != null && (
        <PriceBreakdown
          surface="rail"
          quotedTotalCents={parts.total}
          spacePriceCents={parts.space}
          serviceFeeCents={parts.fee}
          currency={currency}
          fullDay={selection.fullDay}
          hours={hours}
          hourlyRateCents={hourlyRateCents}
          dayRateCents={dayRateCents}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RailPassSummary — the drop-in branch of the rail summary (09-UI-SPEC § 2d)
// ---------------------------------------------------------------------------

type RailPassSummaryProps = {
  timezone: string;
  currency: string;
  /**
   * D-74/D-75/D-130 — the FINISHED all-in figures, computed on the server, for exactly the reason spelled
   * out on RailSelectionSummary's own prop above. Restating the consequence because this is a money surface
   * and the trap is silent: this module is `"use client"`, so neither the per-head SPACE price nor the fee
   * rate reaches it any more. It reads `allIn.perPass[passes]` and nothing else. The old pair of props
   * (`perHeadPriceCents` + `serviceFeeBps`) were together the INPUTS to a price, which is precisely what
   * D-130 forbids crossing this boundary — a client component may receive money as a finished figure,
   * never as the ingredients to compute one.
   *
   * D-38 widened each value to `{space, fee, total}` so this rail can render the REAL, ITEMISED
   * breakdown. The widening moved no computation: `perPass[N]`'s three figures come from one
   * `computeServiceFee(perHead × N)` call inside the guarded module, exactly as the single figure did.
   */
  allIn: AllInTable;
  /**
   * The host's RAW per-head price, for the breakdown's run LABEL only (`₱250.00/person × 3 passes`).
   *
   * The same distinction `RailSelectionSummary`'s own rate props record, and it binds identically here: a
   * rate that is FORMATTED into a label is not the ingredients of a price. The value beside it is
   * `allIn.perPass[N].space` and the bottom line is `.total`, both finished on the server, and the AST
   * scan in `tests/design/price-surface.test.ts` fails the build if this file ever multiplies the two.
   */
  perHeadPriceCents: number | null;
};

/** In the booking rail, ABOVE the CTA: the chosen date · pass count · the REAL itemised breakdown. */
export function RailPassSummary({
  timezone,
  currency,
  allIn,
  perHeadPriceCents,
}: RailPassSummaryProps) {
  const { openSelection } = useBookingSelection();
  if (!openSelection) return null;

  const { date, passes } = openSelection;
  const dateLabel = format(new TZDate(date.year, date.month - 1, date.day, timezone), "EEE, MMM d", {
    in: tz(timezone),
  });

  // D-75, and here the figure is EXACT rather than approximate. Open pricing is purely linear — no duration
  // term, no surcharge band, no rounding on a rate the booker never sees — so the RSC's
  // `computeServiceFee(perHead × N)` for this N is precisely the total `quoteOpenCapacity` freezes on the
  // row inside the claim's transaction. A LOOKUP, never arithmetic (D-130): note that "linear" describes
  // the SPACE price, not the all-in one, so multiplying an all-in per-pass figure here would still round N
  // times where checkout rounds once. That is why the table is keyed by pass count.
  //
  // The one case it can differ is a lost race: if the claim grants FEWER heads than were asked for, the
  // frozen total is lower, and the reserve page (09-13) states both figures before anything is charged.
  // The number can go DOWN with an explicit confirmation; it can never go up.
  //
  // D-38: the widened `{space, fee, total}` value for exactly this pass count. `.total` is the same
  // integer this rail always showed; `.space` and `.fee` are the two finished figures beside it that make
  // an ITEMISED breakdown possible without a single client computation. A missing key (a pass count past
  // the cap) still means no breakdown at all — never a cue to derive one here.
  const parts = allIn.perPass[passes] ?? null;

  return (
    <div className="space-y-3 rounded-lg border p-3 text-sm">
      <div className="space-y-1">
        <p className="font-semibold">{dateLabel}</p>
        <p className="text-muted-foreground">
          <span className="tabular-nums">{passes}</span> {passes === 1 ? "pass" : "passes"}
        </p>
      </div>
      {/* D-38 / BFLOW-04 — the same component, on the drop-in branch. `PriceBreakdown` already handles the
          pass shape through its optional `perHeadPriceCents` / `passes` props (OC-08), so NO FORK is
          needed: a pass is priced per head with no duration term at all, and the run label resolves that
          branch first, which is why `fullDay` and `hours` below say nothing and are never read.
          D-40 binds HARDER here than on the exclusive branch: open pricing is purely linear, so this
          `.total` is precisely the figure `quoteOpenCapacity` freezes on the row inside the claim's own
          transaction. The one case it moves is a lost race granting fewer heads — it moves DOWN, and the
          reserve page states both figures before anything is charged (09-13). */}
      {parts != null && (
        <PriceBreakdown
          surface="rail"
          quotedTotalCents={parts.total}
          spacePriceCents={parts.space}
          serviceFeeCents={parts.fee}
          perHeadPriceCents={perHeadPriceCents}
          passes={passes}
          currency={currency}
          fullDay={false}
          hours={0}
          hourlyRateCents={null}
          dayRateCents={null}
        />
      )}
    </div>
  );
}
