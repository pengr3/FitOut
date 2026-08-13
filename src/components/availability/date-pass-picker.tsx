"use client";

// DatePassPicker (OPEN-02 · OC-02 / OC-03 / OC-06 / OC-11 — 09-UI-SPEC § 2, § 2a, § 2b, § 2c) — the booker
// surface for a listing sold as DAY PASSES, mounted by AvailabilityCalendar's fork on the persisted mode.
//
// ⚠️ THE HOUR PICKER IS ABSENT, NOT DISABLED — AND ITS ABSENCE IS THE PRIMARY SIGNAL (§ 2). This file
// mounts no hour-chip component, no scrolling chip grid and no whole-day shortcut, and it must never
// acquire one: a drop-in pass covers the venue's whole operating day, so offering hours would be an
// affordance for a choice that does not exist. This surface asks "which day?", the hourly one asks "which
// hours?", and the difference between those two questions is the whole feature. A greyed-out hour grid
// would tell a booker the hours exist but are unavailable — the opposite of the truth (O2).
//
// Those absences are grep-enforced by this plan's own acceptance gate, so the words for the things that
// must not appear are deliberately not written anywhere in this file — not even to forbid them.
//
// THE MONTH GRID IS BINARY (§ 2a, Open Q3): a date is selectable or it is fully booked. No per-cell counts
// and no dots — 42 markers competing with 42 date numerals is illegible at 320px, so the exact number lives
// in the day panel's chip, at or below the server's own threshold, and nowhere else (O4).
//
// A FULLY BOOKED DATE IS PROGRAMMATICALLY DISABLED, never merely greyed (§ 2a, an a11y non-negotiable): it
// goes through react-day-picker's own `disabled` matcher, so screen readers and keyboard navigation agree
// with the paint. The strike-through + muted numeral is the hourly picker's shipped unavailable convention
// (slot-picker.tsx:187), reused rather than reinvented, and it is a second, non-colour signal — never red.
// Selling out is a normal marketplace outcome (O5), and the panel always names the next step, so this is
// never a dead end. OC-14 — v1 ships NO back-in-stock alert of any kind, so no control of that sort may be
// added here: the next step is another day, and advertising a mechanism that does not exist is worse than
// offering nothing.
//
// ADVISORY, NEVER THE GATE (Security V4). Everything below — the disabled dates, the stepper's ceiling, the
// per-date `bookable` flag — is a courtesy that keeps a booker from ASKING for something that cannot be
// granted. `createOpenCapacityHold` re-reads the cap, the live admissions SUM and the DB clock inside its
// own transaction, so a crafted request can only ever be granted DOWN.
//
// ZERO ARITHMETIC ON MONEY (O9). This file computes no price of any kind — not a per-head total, not an
// estimate. The rail does not compose one either any more (D-130 / GATE-05): RailPassSummary LOOKS UP a
// figure the RSC already computed, so no fee rate and no per-head price reaches either file.

import * as React from "react";
import { format } from "date-fns";
import { tz, TZDate } from "@date-fns/tz";

import { getDayAvailability, getOpenMonthAvailability } from "@/app/actions/availability";
// D-34 / GATE-05: from `horizon` and NOT from `slots`. `slots.ts` is a guarded server-only computation
// module; this constant was split out of it precisely so this line can exist in a `"use client"` file.
import { BOOKING_HORIZON_DAYS } from "@/lib/availability/horizon";
import type { DayAvailability } from "@/lib/availability/read-model";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { SpotsLeftChip } from "@/components/availability/spots-left-chip";
import { PassStepper } from "@/components/booking/pass-stepper";
import { cn } from "@/lib/utils";
// Type-only, and deliberately so: AvailabilityCalendar imports THIS module for its fork, so a runtime
// import back would be a cycle. `import type` is erased, leaving the dependency one-directional.
import type { DayLocal, OpenSelectionValue } from "@/components/availability/availability-calendar";

type DatePassPickerProps = {
  listingId: string;
  timezone: string;
  cityLabel: string;
  gmtLabel: string;
  /** deriveBookable for the LISTING. False renders the real availability read-only (no stepper, no CTA). */
  bookable: boolean;
  initialDate: DayLocal;
  initialDay: DayAvailability | null;
  /** The initial month's fully-booked venue-local `YYYY-MM-DD` dates, computed server-side (OC-11). */
  initialFullDates: string[];
  /** Writes the lifted {date, passes} selection that the rail summary and the Book CTA both read. */
  onSelectionChange: (sel: OpenSelectionValue | null) => void;
};

// The same id the hourly calendar uses for its tz note. Exactly one of the two surfaces renders per
// listing (a listing is exactly one mode), so the id can never appear twice in one document.
const TZ_NOTE_ID = "availability-tz-note";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** The venue-local calendar date as the wire shape `placeOpenHold` canonicalizes (`openHoldSchema`). */
function isoFor(d: DayLocal): string {
  return `${d.year}-${pad2(d.month)}-${pad2(d.day)}`;
}

function monthKeyFor(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

export function DatePassPicker({
  listingId,
  timezone,
  cityLabel,
  gmtLabel,
  bookable,
  initialDate,
  initialDay,
  initialFullDates,
  onSelectionChange,
}: DatePassPickerProps) {
  const [day, setDay] = React.useState<DayLocal>(initialDate);
  const [dayAvail, setDayAvail] = React.useState<DayAvailability | null>(initialDay);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  // § 2c — the pass count is owned HERE, not by the stepper, precisely so that picking a new date can reset
  // it to 1 and re-bound its max. PassStepper is deliberately controlled for this reason (09-11); a stepper
  // that owned its own count could not honour the rule from the inside.
  const [passes, setPasses] = React.useState(1);
  const [viewMonth, setViewMonth] = React.useState<{ year: number; month: number }>({
    year: initialDate.year,
    month: initialDate.month,
  });
  // The fully-booked date set, kept per visited month so navigating back does not re-fetch. Seeded from the
  // server-rendered payload so the first paint already has the right dates disabled.
  const [fullByMonth, setFullByMonth] = React.useState<Record<string, string[]>>(() => ({
    [monthKeyFor(initialDate.year, initialDate.month)]: initialFullDates,
  }));

  // Venue-local "today" and the 90-day horizon end (D-26), built as venue-tz instants so the day matchers
  // compare in the venue tz — never the browser tz. Same construction as the hourly calendar's.
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
  const selectedDate = React.useMemo(
    () => new TZDate(day.year, day.month - 1, day.day, timezone),
    [day, timezone],
  );
  const viewMonthDate = React.useMemo(
    () => new TZDate(viewMonth.year, viewMonth.month - 1, 1, timezone),
    [viewMonth, timezone],
  );

  // Every visited month's full dates as venue-local-midnight instants, for BOTH the `disabled` matcher and
  // the `full` modifier: one array drives the a11y state and the paint, so they cannot disagree.
  const fullMatchers = React.useMemo(() => {
    const isoDates = new Set(Object.values(fullByMonth).flat());
    return [...isoDates].map((iso) => {
      const [y, m, d] = iso.split("-").map(Number);
      return new TZDate(y, m - 1, d, timezone);
    });
  }, [fullByMonth, timezone]);

  // One read per month change, on a public read model, bounded by the booking horizon (T-09-42 accept).
  React.useEffect(() => {
    const key = monthKeyFor(viewMonth.year, viewMonth.month);
    if (fullByMonth[key]) return;
    let cancelled = false;
    void (async () => {
      let fullDates: string[] = [];
      try {
        fullDates = (await getOpenMonthAvailability(listingId, viewMonth)).fullDates;
      } catch {
        // A failed month read leaves that month's dates SELECTABLE, and that direction is deliberate: the
        // claim is the only gate, so a booker who picks a date that has since sold out gets the calm OC-13
        // refusal — whereas failing closed would hide dates that are genuinely open.
        fullDates = [];
      }
      if (!cancelled) setFullByMonth((prev) => ({ ...prev, [key]: fullDates }));
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId, viewMonth, fullByMonth]);

  async function handleDaySelect(picked: Date | undefined) {
    if (!picked) return;
    const inTz = tz(timezone);
    const next: DayLocal = {
      year: Number(format(picked, "yyyy", { in: inTz })),
      month: Number(format(picked, "M", { in: inTz })),
      day: Number(format(picked, "d", { in: inTz })),
    };
    setDay(next);
    // § 2c — a new date resets the count to 1 and re-bounds the max, mirroring how a new day clears the
    // prior slot selection on the hourly calendar. Carrying 4 passes onto a date with 2 left would hand the
    // server a request it could only grant DOWN, firing the OC-07 partial path on the happy path.
    setPasses(1);
    setLoading(true);
    setError(false);
    try {
      const res = await getDayAvailability(listingId, next);
      setDayAvail(res);
    } catch {
      // IN-03: a failed day fetch must NOT leave the prior day's state on screen (stale-but-plausible).
      setDayAvail(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function handleMonthChange(next: Date) {
    const inTz = tz(timezone);
    setViewMonth({
      year: Number(format(next, "yyyy", { in: inTz })),
      month: Number(format(next, "M", { in: inTz })),
    });
  }

  const inTz = tz(timezone);
  const dayLabel = format(selectedDate, "EEEE, MMM d", { in: inTz });
  // Present ONLY when this listing is open-capacity AND the venue opens on the picked weekday. A non-open
  // payload means the read model returned its unknown/unpublished fallback, which lands on the same
  // dashed no-hours shell the hourly calendar renders for the identical case.
  const openPayload = dayAvail?.occupancyMode === "open_capacity" ? dayAvail : null;
  const oc = openPayload?.openCapacity ?? null;

  // What the CTA is allowed to act on. `oc.bookable` is the server's own past-date / horizon verdict for
  // this date; the day panel below explains the refusal rather than leaving a silently dead CTA.
  const selectable = !!oc && bookable && oc.bookable && oc.state !== "full" && !loading && !error;

  React.useEffect(() => {
    // ONE source for the rail summary and the Book CTA. Writing null on every non-selectable state is the
    // IN-03 stale-clear rule applied to the selection itself: a failed fetch, a sold-out date or a loading
    // panel must never leave the previous date bookable in the rail.
    onSelectionChange(
      selectable ? { kind: "open", date: day, dateIso: isoFor(day), passes } : null,
    );
  }, [selectable, day, passes, onSelectionChange]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {"Pick a day — your pass is good any time they're open."}
      </p>
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
          month={viewMonthDate}
          onMonthChange={handleMonthChange}
          startMonth={todayStart}
          endMonth={horizonEnd}
          // The fully-booked dates ride in the SAME matcher array as the horizon bounds, so react-day-picker
          // renders them with its own disabled semantics (the button carries `disabled`, or `aria-disabled`
          // when it is the roving focus target) — not a class that merely looks unavailable.
          disabled={[{ before: todayStart }, { after: horizonEnd }, ...fullMatchers]}
          modifiers={{ full: fullMatchers }}
          components={{
            DayButton: (dayButtonProps) => {
              const isFull = dayButtonProps.modifiers.full === true;
              return (
                <CalendarDayButton
                  {...dayButtonProps}
                  className={cn(
                    // Selected day = coral (UI-SPEC accent #1); today stays the neutral --muted ring.
                    // A day chip, not a <Button> with a variant prop — it stays a token class and
                    // must not be converted. The hover darkens with a color-mix instead of tinting
                    // at 90% alpha, which measures 4.04:1 in court / 3.87:1 in grove.
                    "data-[selected-single=true]:bg-brand data-[selected-single=true]:text-brand-foreground data-[selected-single=true]:hover:bg-[color-mix(in_oklch,var(--brand),var(--foreground)_10%)]",
                    isFull && "text-muted-foreground line-through",
                  )}
                  // Spread last and only when full, so an available date keeps react-day-picker's own
                  // localized label instead of having it overwritten with undefined.
                  {...(isFull
                    ? {
                        "aria-label": `${format(dayButtonProps.day.date, "EEEE, MMM d", {
                          in: inTz,
                        })} — fully booked`,
                      }
                    : {})}
                />
              );
            },
          }}
          className="rounded-xl border"
        />

        <div className="min-w-0 space-y-3">
          {loading ? (
            // ONE panel skeleton, not the hourly picker's eight chip skeletons: there is one answer coming,
            // not a grid of them, and a chip grid flashing in would promise hours that never arrive.
            <div aria-live="polite" aria-busy="true">
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-dashed p-6 text-center" role="alert">
              <p className="font-medium">{"Couldn't load this day"}</p>
              <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
                Something went wrong fetching availability. Pick the day again to retry.
              </p>
            </div>
          ) : !openPayload ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="font-medium">No availability yet</p>
              <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
                {"This host hasn't set their hours yet. Check back soon."}
              </p>
            </div>
          ) : !oc ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="font-medium">Closed on {dayLabel}</p>
              <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
                {"This space isn't open on this day. Try another day."}
              </p>
            </div>
          ) : oc.state === "full" ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{dayLabel}</h3>
              <SpotsLeftChip state={oc.state} remaining={oc.remaining} />
              <p className="max-w-prose text-base">
                All {oc.cap} passes for this day are taken. Try another day.
              </p>
            </div>
          ) : !oc.bookable ? (
            // The venue's closing instant for this date has already gone by (an evening browse of "today").
            // The grid stays fully interactive and the copy names the next step, exactly as sold-out does.
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="font-medium">Closed for today</p>
              <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
                {"Today's passes are no longer available. Try another day."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{dayLabel}</h3>
              {/* The chip renders the SERVER-decided state verbatim; nothing here re-derives a threshold. */}
              <SpotsLeftChip state={oc.state} remaining={oc.remaining} />
              <p className="text-sm tabular-nums text-muted-foreground">
                Open {format(new Date(oc.dayOpenUtc), "h:mm a", { in: inTz })} –{" "}
                {format(new Date(oc.dayCloseUtc), "h:mm a", { in: inTz })} · {cityLabel} time
              </p>
              <p className="max-w-prose text-base">
                {"Your pass covers the whole day — come any time while they're open."}
              </p>
              {bookable && (
                <PassStepper
                  // Remount on a date change so the control starts from the new date's own bound rather
                  // than animating down from the previous date's ceiling.
                  key={isoFor(day)}
                  value={passes}
                  max={Math.max(1, oc.remaining)}
                  onChange={setPasses}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
