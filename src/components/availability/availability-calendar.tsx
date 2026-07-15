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

import * as React from "react";
import { format } from "date-fns";
import { tz, TZDate } from "@date-fns/tz";

import { getDayAvailability } from "@/app/actions/availability";
import { BOOKING_HORIZON_DAYS } from "@/lib/availability/slots";
import type { DayAvailability } from "@/lib/availability/read-model";
import { formatMoney } from "@/lib/money";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { SlotPicker, type SlotSelectionValue } from "@/components/availability/slot-picker";

type DayLocal = { year: number; month: number; day: number };

// ---------------------------------------------------------------------------
// Shared lifted-selection context (calendar → rail summary)
// ---------------------------------------------------------------------------

type SelectionContext = {
  selection: SlotSelectionValue | null;
  setSelection: (sel: SlotSelectionValue | null) => void;
};

const BookingSelectionContext = React.createContext<SelectionContext | null>(null);

/** Provides the lifted booker selection to the calendar + the rail summary. Wrap the booking grid. */
export function BookingSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = React.useState<SlotSelectionValue | null>(null);
  const value = React.useMemo(() => ({ selection, setSelection }), [selection]);
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
}: AvailabilityCalendarProps) {
  const { setSelection } = useBookingSelection();
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
            DayButton: (dayButtonProps) => (
              <CalendarDayButton
                {...dayButtonProps}
                className="data-[selected-single=true]:bg-brand data-[selected-single=true]:text-brand-foreground data-[selected-single=true]:hover:bg-brand/90"
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
  hourlyRateCents: number | null;
  dayRateCents: number | null;
};

/** In the booking rail, ABOVE the CTA: the chosen date · time range · est. price (display-only). */
export function RailSelectionSummary({
  timezone,
  currency,
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

  const cents = selection.fullDay ? dayRateCents : hourlyRateCents != null ? hourlyRateCents * hours : null;

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
