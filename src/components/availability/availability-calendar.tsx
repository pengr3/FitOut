"use client";

// Booker availability calendar (AVAIL-03 · SC#2). Replaces the "Availability coming soon" placeholder
// on the public listing page with a real month grid → day → hourly SlotPicker, all rendered in the
// VENUE's local timezone (react-day-picker `timeZone` + date-fns `tz()`), independent of the browser tz.
// A visible, aria-associated tz note ("Times shown in {City} time ({GMT±N})") is always shown (SC#2).
//
// This file exports three small, related client pieces so the selection made in the calendar (main
// column) can drive the summary in the booking rail (a different grid column) without prop-drilling a
// callback across the RSC boundary:
//   - BookingSelectionProvider — holds the lifted { selection } state; wraps the whole booking grid.
//   - AvailabilityCalendar     — the month grid + SlotPicker; writes selection into the context.
//   - RailSelectionSummary     — reads selection; shows date · time range · est. price in the rail.
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
import { formatMoney } from "@/lib/money";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { SlotPicker, type SlotSelectionValue } from "@/components/availability/slot-picker";
import { DatePassPicker } from "@/components/availability/date-pass-picker";

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
};

const BookingSelectionContext = React.createContext<SelectionContext | null>(null);

/** Provides the lifted booker selection to the calendar + the rail summary. Wrap the booking grid. */
export function BookingSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = React.useState<SlotSelectionValue | null>(null);
  const [openSelection, setOpenSelection] = React.useState<OpenSelectionValue | null>(null);
  const value = React.useMemo(
    () => ({ selection, setSelection, openSelection, setOpenSelection }),
    [selection, openSelection],
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
}: AvailabilityCalendarProps) {
  const { setSelection, setOpenSelection } = useBookingSelection();
  const [day, setDay] = React.useState<DayLocal>(initialDate);
  const [dayAvail, setDayAvail] = React.useState<DayAvailability | null>(initialDay);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  // Venue-local "today" and the 90-day horizon end (D-26), built as venue-tz instants so the day
  // matchers compare in the venue tz — never the browser tz.
  const todayStart = React.useMemo(
    () => new TZDate(initialDate.year, initialDate.month - 1, initialDate.day, timezone),
    [initialDate, timezone],
  );
  const horizonEnd = React.useMemo(
    () =>
      new TZDate(
        initialDate.year,
        initialDate.month - 1,
        initialDate.day + BOOKING_HORIZON_DAYS,
        timezone,
      ),
    [initialDate, timezone],
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
  // identical on every render (rules-of-hooks). The exclusive day state those hooks hold is simply unused
  // on this branch — DatePassPicker owns its own.
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

  async function handleDaySelect(picked: Date | undefined) {
    if (!picked) return;
    const inTz = tz(timezone);
    const next: DayLocal = {
      year: Number(format(picked, "yyyy", { in: inTz })),
      month: Number(format(picked, "M", { in: inTz })),
      day: Number(format(picked, "d", { in: inTz })),
    };
    setDay(next);
    setSelection(null); // a new day clears any prior slot selection in the rail
    setLoading(true);
    setError(false);
    try {
      const res = await getDayAvailability(listingId, next);
      setDayAvail(res);
    } catch {
      // IN-03: a failed day fetch must NOT leave the prior day's slots on screen (stale-but-plausible).
      // Clear the grid and flag an inline error so the user sees a retry hint, not wrong availability.
      setDayAvail(null);
      setError(true);
    } finally {
      setLoading(false);
    }
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

          {loading ? (
            <div className="flex flex-wrap gap-2" aria-live="polite" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-20 rounded-lg" />
              ))}
            </div>
          ) : error ? (
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
   */
  allIn: AllInTable;
};

/** In the booking rail, ABOVE the CTA: the chosen date · time range · est. price (display-only). */
export function RailSelectionSummary({
  timezone,
  currency,
  allIn,
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

  // D-75: the rail is the LAST number a booker sees before checkout, so it must be ALL-IN. Showing the
  // space price here and charging space + fee on the next screen is the "number goes up between browsing
  // and paying" failure D-75 exists to prevent — and at 5% of the booking it is not a rounding edge.
  // Unlike a search card this IS a total for a chosen window, and it is EXACT rather than approximate:
  // the RSC built this table by applying computeServiceFee to the same space price checkout freezes, at
  // the same rate, so the two agree to the centavo. A LOOKUP, never arithmetic (D-130) — and a lookup is
  // what keeps "exact" true, since multiplying a per-hour all-in figure here would round n times instead
  // of once. A missing key means no estimate line, exactly as a null rate always has.
  const cents = selection.fullDay ? allIn.fullDay : (allIn.hourly[hours] ?? null);

  return (
    <div className="space-y-1 rounded-lg border p-3 text-sm">
      <p className="font-semibold">{dateLabel}</p>
      <p className="text-muted-foreground">
        <span className="tabular-nums">{timeLabel}</span>
        {!selection.fullDay && ` · ${hours} ${hours === 1 ? "hour" : "hours"}`}
      </p>
      {cents != null && (
        <p className="pt-0.5">
          <span className="text-muted-foreground">Est. </span>
          <span className="font-semibold tabular-nums">{formatMoney(cents, currency)}</span>
        </p>
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
   */
  allIn: AllInTable;
};

/** In the booking rail, ABOVE the CTA: the chosen date · pass count · est. all-in price (display-only). */
export function RailPassSummary({ timezone, currency, allIn }: RailPassSummaryProps) {
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
  const cents = allIn.perPass[passes] ?? null;

  return (
    <div className="space-y-1 rounded-lg border p-3 text-sm">
      <p className="font-semibold">{dateLabel}</p>
      <p className="text-muted-foreground">
        <span className="tabular-nums">{passes}</span> {passes === 1 ? "pass" : "passes"}
      </p>
      {cents != null && (
        <p className="pt-0.5">
          <span className="text-muted-foreground">Est. </span>
          <span className="font-semibold tabular-nums">{formatMoney(cents, currency)}</span>
        </p>
      )}
    </div>
  );
}
