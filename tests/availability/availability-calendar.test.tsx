// @vitest-environment jsdom

// AVAIL-03 / the Phase-3 rule that a non-bookable listing gets a READ-ONLY PREVIEW, never a dead end.
//
// WHY THIS FILE EXISTS AT ALL. `availability-calendar.tsx`'s own header states the rule — "Selection is
// enabled ONLY when the listing is `bookable` (deriveBookable) — a published-but-not-payable listing
// renders the real availability read-only" — and it is implemented in one place, `disabled={!bookable}`
// at :282, handed to SlotPicker. Until now that rule was covered ONLY by Playwright
// (e2e/availability.spec.ts:271) and by NOTHING in the vitest suite. Quick task 260810-sti is what made
// the gap worth closing: hours became the fourth term of the sell-gate, so `bookable === false` on a
// PUBLISHED listing is now reachable for a brand-new reason (an empty weekly calendar) and is reachable
// by ordinary hosts rather than only by not-yet-onboarded ones.
//
// THE ASSERTION IS THE PREVIEW, NOT JUST THE REFUSAL. Both halves matter and the first is the one that
// is easy to lose in a refactor:
//   - the real availability STILL RENDERS (the available chip is in the document). An empty panel, or a
//     "not bookable" placeholder in place of the grid, would be the dead end this rule forbids — a
//     booker must be able to see what the space actually offers and come back for it.
//   - but clicking it produces NO SELECTION, so nothing can be carried into a hold.
//
// HOW IT IS MEASURED. Selection is observed BEHAVIOURALLY, through a probe child that reads
// `useBookingSelection()` and prints the lifted value into the DOM — never by reaching into Radix
// internals. The `disabled` / `aria-disabled` attribute is asserted only as a SECONDARY check: the
// behavioural form survives a Radix version bump or a swap of the underlying primitive, the attribute
// form does not. The two cases are a MEASURED PAIR — case 2 (`bookable`) is what stops case 1 from
// passing for a trivial reason such as the chip never being clickable in jsdom at all.
//
// The date is never changed, so the mocked `getDayAvailability` is never called and the day under test
// is exactly the server-rendered `initialDay` — no fetch, no async settling, no flake.
//
// ⚠️ HONEST ABOUT WHAT THIS IS. This is a REACHABILITY proof, not a RED anchor: it characterises
// behaviour that already existed and was already correct, so it was GREEN the moment it was written.
// Mutation M3 below is what measures it.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// MUTATION M3, EXECUTED 2026-08-10 (quick task 260810-sti, Task 3). A mutation that is described but
// never run is a comment; this is the observed failure, verbatim. Restored by editing the statement back
// (`git diff --exit-code src/` clean).
//
//   M3 — src/components/availability/availability-calendar.tsx (the SlotPicker prop)
//        `disabled={!bookable}` → `disabled={false}`
//     → case (1) RED:
//       AssertionError: expected '2026-08-15T02:00:00.000Z|2026-08-15T0…' to be 'no selection' // Object.is equality
//       Expected: "no selection"
//       Received: "2026-08-15T02:00:00.000Z|2026-08-15T03:00:00.000Z|false"
//        ❯ tests/availability/availability-calendar.test.tsx:186:53
//
//       Read the received value: a booker on a listing that CANNOT be sold had a real, complete
//       10:00–11:00 AM selection lifted into the shared booking context — the exact object the rail
//       summarises and the Book CTA would carry into a hold.
//     → Matched the prediction exactly; no divergence. Case (2) stayed GREEN throughout, which is what
//       proves case (1)'s RED is about the GATE and not about the chip having become unclickable — the
//       measured pair doing its job.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// PHASE 12 (seam A) — case (3) is a DIFFERENT KIND OF TEST from (1) and (2) and should be read as one.
//
// (1) and (2) are the reachability pair above. (3) is a RED ANCHOR for the stale-response guard
// introduced when `day`/`dayAvail`/`dayLoading`/`dayError` moved out of AvailabilityCalendar and into
// BookingSelectionProvider (T-12-02-RACE). Two placements sharing one hook makes overlapping day reads
// real rather than theoretical, and the loser resolving LAST would paint the wrong day's hours under
// the right day's heading — stale-but-plausible availability, the exact failure IN-03 refuses.
//
// It is written against the CONTEXT, not against a day click: `selectDay` is the transition the sheet
// and the calendar both run, and react-day-picker's month grid is not the thing under test here. The
// two responses are resolved OUT OF ORDER on purpose (newer first, older second) — the only ordering
// a correct implementation and a naive one disagree about.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

// jsdom implements no ResizeObserver, and Radix's ScrollArea (which wraps the hour chips) measures
// itself with one. Same stub as tests/listing/wizard-occupancy.test.tsx.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));

// The server-action module graph must never load under jsdom (it reaches the DB and PayMongo). The date
// is never changed in either case, so neither of these is ever actually invoked — the mock exists to keep
// the import graph inert, and `getDayAvailability` is asserted to have stayed uncalled.
const getDayAvailability = vi.fn();
const getOpenMonthAvailability = vi.fn();
vi.mock("@/app/actions/availability", () => ({
  getDayAvailability: (...args: unknown[]) => getDayAvailability(...args),
  getOpenMonthAvailability: (...args: unknown[]) => getOpenMonthAvailability(...args),
}));

import type { DayAvailability } from "@/lib/availability/read-model";
import {
  AvailabilityCalendar,
  BookingSelectionProvider,
  useBookingSelection,
  type DayLocal,
  type OpenSelectionValue,
} from "@/components/availability/availability-calendar";
import { RailRateHeadline } from "@/components/booking/rail-rate-headline";

const TIMEZONE = "Asia/Manila"; // UTC+8 all year, no DST — every instant below is plain UTC arithmetic
const CITY = "Makati";
const GMT = "GMT+8";
const LISTING_ID = "L_cal_readonly";

// Clock-relative, never a calendar literal: a hardcoded month would eventually stop being the month
// react-day-picker renders. Five days out is comfortably inside the booking horizon.
const HOUR_MS = 3_600_000;
const target = new Date(Date.now() + 5 * 24 * HOUR_MS);
const DAY: DayLocal = {
  year: target.getUTCFullYear(),
  month: target.getUTCMonth() + 1,
  day: target.getUTCDate(),
};

/** 02:00Z on the venue-local date IS 10:00 AM in Manila — so the chip's label is known independently. */
const AVAILABLE_START = new Date(Date.UTC(DAY.year, DAY.month - 1, DAY.day, 2, 0, 0)).toISOString();
const AVAILABLE_END = new Date(Date.UTC(DAY.year, DAY.month - 1, DAY.day, 3, 0, 0)).toISOString();
const OCCUPIED_START = AVAILABLE_END; // 11:00 AM Manila
const OCCUPIED_END = new Date(Date.UTC(DAY.year, DAY.month - 1, DAY.day, 4, 0, 0)).toISOString();

const AVAILABLE_LABEL = "10:00 AM";
const OCCUPIED_LABEL = "11:00 AM";

/** One available hour and one occupied hour: the preview must show BOTH, whatever `bookable` says. */
const INITIAL_DAY: DayAvailability = {
  timezone: TIMEZONE,
  unitCount: 1,
  hasHours: true,
  bookingMode: "instant",
  occupancyMode: "exclusive",
  openCapacity: null,
  slots: [
    { startUtc: AVAILABLE_START, endUtc: AVAILABLE_END, state: "available", freeUnits: 1, unitCount: 1 },
    { startUtc: OCCUPIED_START, endUtc: OCCUPIED_END, state: "unavailable", freeUnits: 0, unitCount: 1 },
  ],
};

/** Reads the LIFTED selection and prints it — selection observed behaviourally, not via Radix state. */
function SelectionProbe() {
  const { selection } = useBookingSelection();
  return (
    <div data-testid="probe">
      {selection ? `${selection.startUtc}|${selection.endUtc}|${selection.fullDay}` : "no selection"}
    </div>
  );
}

function renderCalendar(bookable: boolean) {
  return render(
    // Phase-12 seam A: the provider owns the day now, so it takes what the RSC used to hand only to the
    // calendar. THE WRAPPER MOVED; NO ASSERTION BELOW CHANGED.
    <BookingSelectionProvider listingId={LISTING_ID} initialDate={DAY} initialDay={INITIAL_DAY}>
      <AvailabilityCalendar
        listingId={LISTING_ID}
        timezone={TIMEZONE}
        cityLabel={CITY}
        gmtLabel={GMT}
        unitCount={1}
        bookable={bookable}
        initialDate={DAY}
        initialDay={INITIAL_DAY}
        occupancyMode="exclusive"
      />
      <SelectionProbe />
    </BookingSelectionProvider>,
  );
}

/** The available hour's chip — found by its own visible label, never by class or DOM position. */
function availableChip(): HTMLElement {
  return screen.getByText(AVAILABLE_LABEL).closest("button") as HTMLElement;
}

/** The booker's gesture: click a start hour, then an end hour. One click only anchors (slot-selection.ts
 *  step 4 lifts null while pending), so a single click could never distinguish the two cases. */
function pickOneHour(chip: HTMLElement): void {
  fireEvent.click(chip);
  fireEvent.click(chip);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AvailabilityCalendar — a non-bookable listing is a READ-ONLY PREVIEW, never a dead end", () => {
  it("(1) bookable=false still renders the real availability, and clicking it selects NOTHING", () => {
    renderCalendar(false);

    // THE PREVIEW HALF, and the one a refactor is most likely to break: the real hours are on screen.
    // If this ever fails because the grid was replaced by a "not bookable" placeholder, that is the
    // dead end the Phase-3 rule exists to forbid — do not "fix" it by deleting the assertion.
    const chip = availableChip();
    expect(chip).toBeTruthy();
    expect(screen.getByText(OCCUPIED_LABEL)).toBeTruthy(); // the occupied hour is previewed too

    // THE REFUSAL HALF — behavioural. The gesture completes; no selection is lifted.
    pickOneHour(chip);
    expect(screen.getByTestId("probe").textContent).toBe("no selection");

    // Secondary, and deliberately secondary: the a11y attribute. Asserted after the behaviour so a Radix
    // internals change reports as an attribute drift rather than masquerading as a security regression.
    expect(chip.hasAttribute("disabled") || chip.getAttribute("aria-disabled") === "true").toBe(true);

    // The date was never changed, so the day under test is exactly what the server rendered.
    expect(getDayAvailability).not.toHaveBeenCalled();
  });

  it("(2) bookable=true renders the SAME chip and clicking it DOES produce a selection", () => {
    renderCalendar(true);

    const chip = availableChip();
    expect(chip).toBeTruthy();

    pickOneHour(chip);
    expect(screen.getByTestId("probe").textContent).toBe(
      `${AVAILABLE_START}|${AVAILABLE_END}|false`,
    );

    expect(getDayAvailability).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// (3) The hoisted day: a stale response must never overwrite a newer one (T-12-02-RACE)
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** A second venue-local day, far enough from DAY that its chips carry different labels. */
const DAY_A: DayLocal = { ...DAY, day: DAY.day };
const DAY_B: DayLocal = { ...DAY, day: DAY.day + 1 };

/** 01:00Z = 9:00 AM Manila; 07:00Z = 3:00 PM Manila. Two labels that cannot be confused for each other. */
function dayWithHour(d: DayLocal, utcHour: number): DayAvailability {
  const start = new Date(Date.UTC(d.year, d.month - 1, d.day, utcHour, 0, 0)).toISOString();
  const end = new Date(Date.UTC(d.year, d.month - 1, d.day, utcHour + 1, 0, 0)).toISOString();
  return {
    ...INITIAL_DAY,
    slots: [{ startUtc: start, endUtc: end, state: "available", freeUnits: 1, unitCount: 1 }],
  };
}

const A_LABEL = "9:00 AM"; // DAY_A's only hour  (01:00Z)
const B_LABEL = "3:00 PM"; // DAY_B's only hour  (07:00Z)

/** Drives the HOISTED transition directly — the same `selectDay` the calendar and the sheet both call. */
function DayDriver() {
  const { selectDay, dayLoading, dayError } = useBookingSelection();
  return (
    <div>
      <button type="button" onClick={() => selectDay(DAY_A)}>
        go A
      </button>
      <button type="button" onClick={() => selectDay(DAY_B)}>
        go B
      </button>
      <span data-testid="flags">{`${dayLoading}|${dayError}`}</span>
    </div>
  );
}

describe("BookingSelectionProvider — one hook owns the day, and the LATEST day wins", () => {
  it("(3) an OLDER day's response resolving last does not overwrite the newer day's availability", async () => {
    // Hand out deferred promises so the resolution ORDER is under the test's control, not the runtime's.
    const resolvers: Array<(v: DayAvailability) => void> = [];
    getDayAvailability.mockImplementation(
      () => new Promise<DayAvailability>((resolve) => resolvers.push(resolve)),
    );

    render(
      <BookingSelectionProvider listingId={LISTING_ID} initialDate={DAY} initialDay={INITIAL_DAY}>
        <AvailabilityCalendar
          listingId={LISTING_ID}
          timezone={TIMEZONE}
          cityLabel={CITY}
          gmtLabel={GMT}
          unitCount={1}
          bookable
          initialDate={DAY}
          initialDay={INITIAL_DAY}
          occupancyMode="exclusive"
        />
        <DayDriver />
      </BookingSelectionProvider>,
    );

    // Two day selections in flight at once — the race this guard exists for.
    fireEvent.click(screen.getByText("go A"));
    fireEvent.click(screen.getByText("go B"));
    expect(getDayAvailability).toHaveBeenCalledTimes(2);
    expect(resolvers).toHaveLength(2);

    // GUARD THE GUARD: without a real race there is nothing to discard, so prove both calls are pending
    // and that the calendar is in its loading state before either resolves.
    expect(screen.getByTestId("flags").textContent).toBe("true|false");

    // Resolve the NEWER selection (B) first…
    await act(async () => {
      resolvers[1](dayWithHour(DAY_B, 7));
    });
    expect(screen.getByText(B_LABEL)).toBeTruthy();

    // …then let the OLDER one (A) land late. A naive implementation writes it and the grid silently
    // becomes day A's hours under day B's heading.
    await act(async () => {
      resolvers[0](dayWithHour(DAY_A, 1));
    });

    expect(
      screen.queryByText(A_LABEL),
      "the older day's late response overwrote the newer day's availability (T-12-02-RACE)",
    ).toBeNull();
    expect(screen.getByText(B_LABEL)).toBeTruthy();

    // The stale resolution must also not touch the flags: no phantom skeleton, no phantom error.
    expect(screen.getByTestId("flags").textContent).toBe("false|false");
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// (4) D-41 — the rail's rate headline and the breakdown's run line never coexist
//
// A DIFFERENT KIND OF TEST AGAIN, and worth reading as one. (1)/(2) are a reachability pair and (3)
// is a red anchor for a race; (4) is a PRESENCE/ABSENCE pair over one client leaf.
//
// WHAT IT IS ACTUALLY ABOUT. 12-05 puts the real `PriceBreakdown` in the booking rail, whose run line
// reads `₱473.33/hr × 2 hours` — the host's RAW space rate, because the service fee is disclosed on
// its own line beneath it. This headline reads `₱497.00/hr` — the ALL-IN browse rate (D-75). Both are
// correct and they are not the same number; with the breakdown in the rail they would sit ~60px apart
// wearing the same `/hr` suffix, on the panel where money commits. So the headline exists in exactly
// one state.
//
// BOTH DIRECTIONS ARE ASSERTED, and the first is the one a refactor loses silently: a component that
// never rendered at all would satisfy "absent once a selection exists" perfectly, and a deep-linked
// booker would land on a rail with no price on it whatsoever. Driven through the CONTEXT rather than
// through a click, for the same reason case (3) is: `setSelection` / `setOpenSelection` are what the
// calendar, the picker and (from 12-10) the sheet all ultimately call.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The formatted, server-composed strings the RSC hands down (`allInRateParts`'s output shape). */
const RATE_PARTS = ["₱497.00/hr", "₱3,033.32/day"];

/** A complete exclusive selection, in the shape SlotPicker lifts. */
const A_SELECTION = { startUtc: AVAILABLE_START, endUtc: AVAILABLE_END, fullDay: false };

/** A complete drop-in selection, in the shape DatePassPicker lifts (OC-02: a date and a count). */
const AN_OPEN_SELECTION: OpenSelectionValue = {
  kind: "open",
  date: DAY,
  dateIso: `${DAY.year}-${String(DAY.month).padStart(2, "0")}-${String(DAY.day).padStart(2, "0")}`,
  passes: 2,
};

/** Writes a selection into the shared context — the transition, without the picker around it. */
function SelectionDriver() {
  const { setSelection, setOpenSelection } = useBookingSelection();
  return (
    <div>
      <button type="button" onClick={() => setSelection(A_SELECTION)}>
        pick a window
      </button>
      <button type="button" onClick={() => setOpenSelection(AN_OPEN_SELECTION)}>
        pick passes
      </button>
    </div>
  );
}

function renderHeadline() {
  return render(
    <BookingSelectionProvider listingId={LISTING_ID} initialDate={DAY} initialDay={INITIAL_DAY}>
      <RailRateHeadline parts={RATE_PARTS} />
      <SelectionDriver />
    </BookingSelectionProvider>,
  );
}

describe("RailRateHeadline — one rate on the rail at a time (D-41)", () => {
  it("(4) is PRESENT with no selection and ABSENT once a window is picked", () => {
    renderHeadline();

    // THE PRESENCE HALF. A booker who deep-links to this listing, or whose searched window could not
    // be honoured, must still see a price. Do not "fix" a failure here by deleting the assertion.
    expect(screen.getByText(RATE_PARTS[0])).toBeTruthy();
    expect(screen.getByText(RATE_PARTS[1])).toBeTruthy();
    expect(screen.getByText("Service fee included")).toBeTruthy();

    fireEvent.click(screen.getByText("pick a window"));

    // THE ABSENCE HALF — the whole of D-41. From here the breakdown states the same fact more
    // precisely, and its run line carries the SPACE rate under the identical `/hr` suffix.
    expect(
      screen.queryByText(RATE_PARTS[0]),
      "the all-in rate headline is still on the rail while a window is selected: two different " +
        "correct rates, same /hr suffix, ~60px apart, on the panel where money commits (D-41)",
    ).toBeNull();
    expect(screen.queryByText("Service fee included")).toBeNull();
  });

  it("(4b) disappears for the DROP-IN selection too, which writes the other channel", () => {
    // The headline reads `₱262.50/person` on this branch and the breakdown's run line reads
    // `₱250.00/person × 2 passes` — the same collision, on the mode that uses `openSelection`. A
    // component that consulted only `selection` would pass (4) and leave both rates on screen here.
    renderHeadline();
    expect(screen.getByText(RATE_PARTS[0])).toBeTruthy();

    fireEvent.click(screen.getByText("pick passes"));

    expect(
      screen.queryByText(RATE_PARTS[0]),
      "the rate headline survived a drop-in selection — `openSelection` is not being consulted",
    ).toBeNull();
  });

  it("(4c) says `Price on request` when the listing advertises no rate at all", () => {
    // The pre-existing fallback, asserted because the move out of the RSC is the moment it could have
    // been dropped: an empty parts array must render the words, not an empty heading.
    render(
      <BookingSelectionProvider listingId={LISTING_ID} initialDate={DAY} initialDay={INITIAL_DAY}>
        <RailRateHeadline parts={[]} />
      </BookingSelectionProvider>,
    );
    expect(screen.getByText("Price on request")).toBeTruthy();
    expect(screen.queryByText("Service fee included")).toBeNull();
  });
});
