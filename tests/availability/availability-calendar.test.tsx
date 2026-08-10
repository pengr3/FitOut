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

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

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
} from "@/components/availability/availability-calendar";

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
    <BookingSelectionProvider>
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
