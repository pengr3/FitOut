// @vitest-environment jsdom

// 09-UI-SPEC § 2 / § 2a / § 2b / § 2c — the drop-in booker surface, as an executable contract.
//
// WHAT THIS FILE IS ACTUALLY GUARDING, in order of how much it would cost to get wrong:
//
//   (1) THE PAYLOAD. A drop-in booking sends a DATE and a pass count and NOTHING that resembles a time
//   window (OC-02 / T-09-26). Case (6) asserts the exact key set of the object that leaves the browser,
//   not merely that the right fields are present — an extra `startUtc` riding along would be a client
//   asserting when a pass starts, and a pass does not start.
//
//   (2) THE ABSENCE OF THE HOUR PICKER. § 2's first visual rule is that the hour chips are GONE and their
//   absence is the primary signal. A disabled hour grid would tell a booker the hours exist but are
//   unavailable — the opposite of the truth. Case (1) asserts the absence directly, because "we did not
//   render it" is exactly the kind of thing a later refactor re-adds by accident.
//
//   (3) THE FULLY-BOOKED DATE IS PROGRAMMATICALLY DISABLED, not merely greyed (a11y, non-negotiable).
//   Case (3) reads the button's own disabled state and its label, not a class name: a `line-through` that
//   a screen reader cannot see is decoration, not information.
//
//   (4) THE DATE-CHANGE RESET (§ 2c). PassStepper is deliberately CONTROLLED so the rail can reset the
//   count to 1 and re-bound the max when the date changes (09-11). That rule lives in the CONSUMER and
//   the component cannot enforce it from the inside, so it is asserted here — case (4).
//
//   (5) THE STALE-CLEAR (IN-03). Case (5): a failed day fetch must leave NOTHING of the previous day on
//   screen. Stale-but-plausible availability is worse than an error, because it is believed.
//
//   (6) THE RACE LOSS (OC-13). Case (7): the sold-out sentence is the SERVER's, rendered through the
//   shipped calm notice path, with a calendar refresh. The component holds no copy of that sentence.
//
// The fixtures are CLOCK-RELATIVE (09-03's lesson) and pinned to two adjacent days inside the current
// venue-local month, so the second date is always present in the same rendered month grid.

import * as React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { format } from "date-fns";
import { tz, TZDate } from "@date-fns/tz";

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));

const getDayAvailability = vi.fn();
const getOpenMonthAvailability = vi.fn();
vi.mock("@/app/actions/availability", () => ({
  getDayAvailability: (...args: unknown[]) => getDayAvailability(...args),
  getOpenMonthAvailability: (...args: unknown[]) => getOpenMonthAvailability(...args),
}));

vi.mock("@/app/actions/capability", () => ({ activateBooking: vi.fn() }));

import type { DayAvailability } from "@/lib/availability/read-model";
import type { PlaceHoldResult } from "@/app/actions/booking";
import { SOLD_OUT_MESSAGE } from "@/lib/availability/open-capacity";
import {
  AvailabilityCalendar,
  BookingSelectionProvider,
} from "@/components/availability/availability-calendar";
import { BookCta } from "@/components/booking/book-cta";

const TZ = "Asia/Manila";
const CITY = "Makati";
const LISTING_ID = "listing-drop-in";

// Clock-relative: the year and month come from the real clock, so nothing here can go stale. The DAY is
// pinned to the 10th/11th because every month has both, which keeps the second date inside the same
// rendered month grid — the picker treats `initialDate` as "today" for its own before/horizon matchers, so
// no assertion depends on where the real clock sits inside the month.
const nowInTz = tz(TZ);
const YEAR = Number(format(new Date(), "yyyy", { in: nowInTz }));
const MONTH = Number(format(new Date(), "M", { in: nowInTz }));
const DAY_A = { year: YEAR, month: MONTH, day: 10 };
const DAY_B = { year: YEAR, month: MONTH, day: 11 };

function iso(d: { year: number; month: number; day: number }): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

function labelFor(d: { year: number; month: number; day: number }): string {
  return format(new TZDate(d.year, d.month - 1, d.day, TZ), "EEEE, MMM d", { in: nowInTz });
}

function instant(d: { year: number; month: number; day: number }, hour: number): string {
  return new Date(new TZDate(d.year, d.month - 1, d.day, hour, 0, 0, TZ).getTime()).toISOString();
}

/** An open-capacity day payload shaped exactly as 09-04's read model returns it. */
function openDay(
  d: { year: number; month: number; day: number },
  over: Partial<NonNullable<DayAvailability["openCapacity"]>> = {},
): DayAvailability {
  return {
    timezone: TZ,
    unitCount: 1,
    hasHours: true,
    bookingMode: "instant",
    slots: [],
    occupancyMode: "open_capacity",
    openCapacity: {
      remaining: 6,
      cap: 10,
      state: "open",
      perHeadPriceCents: 35_000,
      dayOpenUtc: instant(d, 6),
      dayCloseUtc: instant(d, 22),
      openTime: "06:00:00",
      closeTime: "22:00:00",
      bookable: true,
      ...over,
    },
  };
}

/** The venue is CLOSED that weekday: the listing is known, there is simply no pass to sell. */
function closedDay(): DayAvailability {
  return {
    timezone: TZ,
    unitCount: 1,
    hasHours: false,
    bookingMode: "instant",
    slots: [],
    occupancyMode: "open_capacity",
    openCapacity: null,
  };
}

/**
 * A hold action stand-in with the real signature, so the call ARGUMENT this file asserts on is the same
 * shape the server action would receive. `undefined` models the success path (the action redirects, so on
 * the client the promise resolves to nothing).
 */
function makeHold(result?: PlaceHoldResult) {
  const fn = vi.fn<(input: unknown) => Promise<PlaceHoldResult>>();
  fn.mockResolvedValue(result as PlaceHoldResult);
  return fn;
}
type HoldMock = ReturnType<typeof makeHold>;

function renderPicker(opts: {
  initialDay?: DayAvailability | null;
  initialFullDates?: string[];
  placeOpenHold?: HoldMock;
  bookable?: boolean;
}) {
  const placeOpenHold = opts.placeOpenHold ?? makeHold();
  const placeHold = makeHold();
  const view = render(
    // Phase-12 seam A: the provider owns the day. The drop-in fork below is UNAFFECTED — DatePassPicker
    // still owns its own day state — so the provider's day simply goes unused on this branch, and every
    // assertion in this file is unchanged.
    <BookingSelectionProvider
      listingId={LISTING_ID}
      initialDate={DAY_A}
      initialDay={opts.initialDay === undefined ? openDay(DAY_A) : opts.initialDay}
    >
      <AvailabilityCalendar
        listingId={LISTING_ID}
        timezone={TZ}
        cityLabel={CITY}
        gmtLabel="GMT+8"
        unitCount={1}
        bookable={opts.bookable ?? true}
        initialDate={DAY_A}
        initialDay={opts.initialDay === undefined ? openDay(DAY_A) : opts.initialDay}
        occupancyMode="open_capacity"
        initialFullDates={opts.initialFullDates ?? []}
      />
      <BookCta
        listingId={LISTING_ID}
        placeHold={placeHold}
        placeOpenHold={placeOpenHold}
        occupancyMode="open_capacity"
      />
    </BookingSelectionProvider>,
  );
  return { ...view, placeOpenHold, placeHold };
}

/** The month-grid button for a venue-local date (react-day-picker tags the cell with `data-day`). */
function dayButton(container: HTMLElement, d: { year: number; month: number; day: number }) {
  return container.querySelector<HTMLButtonElement>(`td[data-day="${iso(d)}"] button`);
}

beforeEach(() => {
  refresh.mockClear();
  push.mockClear();
  getDayAvailability.mockReset();
  getOpenMonthAvailability.mockReset();
  getOpenMonthAvailability.mockResolvedValue({ cap: 10, fullDates: [] });
});
afterEach(cleanup);

describe("DatePassPicker — a day and a pass count, never an hour (OPEN-02 · § 2)", () => {
  it("(1) an available date shows the day, the chip, the entry window and the pass helper — and NO hour picker", () => {
    const { container } = renderPicker({});

    expect(screen.getByText(labelFor(DAY_A))).toBeTruthy();
    expect(screen.getByText("Spots available")).toBeTruthy();
    expect(screen.getByText(`Open 6:00 AM – 10:00 PM · ${CITY} time`)).toBeTruthy();
    expect(
      screen.getByText("Your pass covers the whole day — come any time while they're open."),
    ).toBeTruthy();
    expect(screen.getByText("Pick a day — your pass is good any time they're open.")).toBeTruthy();
    // The pre-hold stepper (§ 2c), bounded by the date's own remaining count.
    expect(screen.getByText("How many passes?")).toBeTruthy();

    // § 2's FIRST rule: the hour chips are gone. Not disabled — absent. The hourly picker's toggle group
    // and its whole-day shortcut must not exist anywhere in this tree.
    expect(container.querySelector('[data-slot="toggle-group"]')).toBeNull();
    expect(screen.queryByText("Book full day")).toBeNull();
    // ...and no bookable hour affordance either: every button in the tree is a calendar day, a stepper
    // control, or the CTA — never a time.
    for (const b of container.querySelectorAll("button")) {
      expect(b.textContent ?? "").not.toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/);
    }
  });

  it("(2) a fully booked date says so, names the cap and offers the next step — the grid stays interactive", () => {
    const { container } = renderPicker({
      initialDay: openDay(DAY_A, { remaining: 0, cap: 4, state: "full" }),
    });

    expect(screen.getByText("Fully booked")).toBeTruthy();
    expect(screen.getByText("All 4 passes for this day are taken. Try another day.")).toBeTruthy();
    // OC-14 — v1 ships no back-in-stock alert, so this state must not offer one.
    expect(container.textContent ?? "").not.toMatch(/waitlist|notify me|get alerted/i);
    // OC-11 "never a dead end": other dates are still pickable, and no pass count is offered for this one.
    expect(screen.queryByText("How many passes?")).toBeNull();
    const selectable = container.querySelectorAll("td[data-day] button:not([disabled])");
    expect(selectable.length).toBeGreaterThan(0);
  });

  it("(3) a fully booked date in the month grid is PROGRAMMATICALLY disabled and labelled", () => {
    const { container } = renderPicker({ initialFullDates: [iso(DAY_B)] });

    const full = dayButton(container, DAY_B);
    expect(full).toBeTruthy();
    // react-day-picker carries `disabled` on the button, or `aria-disabled` when it is the roving focus
    // target. Either satisfies the a11y contract; a class alone would not.
    const programmaticallyDisabled =
      full!.hasAttribute("disabled") || full!.getAttribute("aria-disabled") === "true";
    expect(programmaticallyDisabled).toBe(true);
    expect(full!.getAttribute("aria-label")).toContain("fully booked");
    // The non-colour signal (§ Color): the numeral is struck, not merely tinted.
    expect(full!.className).toContain("line-through");

    // The picked date is NOT full, so it stays selectable — a full date disables itself, not the grid.
    expect(dayButton(container, DAY_A)!.hasAttribute("disabled")).toBe(false);
  });

  it("(4) picking a new date resets the pass count to 1 and re-bounds it (§ 2c)", async () => {
    getDayAvailability.mockResolvedValue(openDay(DAY_B, { remaining: 2, cap: 10, state: "low" }));
    const { container } = renderPicker({});

    fireEvent.click(screen.getByRole("button", { name: "Add a pass" }));
    fireEvent.click(screen.getByRole("button", { name: "Add a pass" }));
    expect(container.querySelector<HTMLInputElement>("#requested-passes")!.value).toBe("3");

    fireEvent.click(dayButton(container, DAY_B)!);

    await waitFor(() => expect(screen.getByText(labelFor(DAY_B))).toBeTruthy());
    // Reset to 1 — carrying 3 passes onto a date with 2 left would hand the server a request it could
    // only ever grant DOWN, firing the OC-07 partial path on the happy path.
    expect(container.querySelector<HTMLInputElement>("#requested-passes")!.value).toBe("1");
    // ...and re-bounded to the NEW date's remaining count.
    expect(screen.getByText("Only 2 left")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add a pass" }));
    expect(container.querySelector<HTMLInputElement>("#requested-passes")!.value).toBe("2");
    expect(screen.getByRole("button", { name: "Add a pass" }).hasAttribute("disabled")).toBe(true);
  });

  it("(5) a failed day fetch clears the previous day rather than leaving it on screen (IN-03)", async () => {
    getDayAvailability.mockRejectedValue(new Error("network"));
    const { container } = renderPicker({});

    expect(screen.getByText(labelFor(DAY_A))).toBeTruthy();
    fireEvent.click(dayButton(container, DAY_B)!);

    await waitFor(() => expect(screen.getByText("Couldn't load this day")).toBeTruthy());
    expect(
      screen.getByText("Something went wrong fetching availability. Pick the day again to retry."),
    ).toBeTruthy();
    // Nothing of the previous day survives: no chip, no entry window, no pass count.
    expect(screen.queryByText("Spots available")).toBeNull();
    expect(screen.queryByText(`Open 6:00 AM – 10:00 PM · ${CITY} time`)).toBeNull();
    expect(screen.queryByText("How many passes?")).toBeNull();
    // ...and the CTA is no longer armed with the date that failed.
    expect(screen.getByRole("button", { name: "Book this space" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Pick a day above to book.")).toBeTruthy();
  });

  it("(6) Book sends EXACTLY {listingId, date, requestedPasses, idempotencyKey} — no window rides along (T-09-26)", async () => {
    const { container, placeOpenHold } = renderPicker({});

    fireEvent.click(screen.getByRole("button", { name: "Add a pass" }));
    expect(container.querySelector<HTMLInputElement>("#requested-passes")!.value).toBe("2");

    fireEvent.click(screen.getByRole("button", { name: "Book this space" }));

    await waitFor(() => expect(placeOpenHold).toHaveBeenCalledTimes(1));
    const payload = placeOpenHold.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({ listingId: LISTING_ID, date: iso(DAY_A), requestedPasses: 2 });
    // 09-23 (CR-06) widened this payload by exactly ONE field: a per-selection idempotency token. It is
    // opaque to this assertion (it carries a nonce) but its PRESENCE and its type are pinned, because the
    // server's tokenless replay arm was narrowed on the strength of it existing.
    expect(typeof payload.idempotencyKey).toBe("string");
    expect((payload.idempotencyKey as string).length).toBeGreaterThan(0);
    // Asserted as a KEY SET, not just by presence: a smuggled window field would be a client asserting
    // when a pass starts, and a pass does not start.
    expect(Object.keys(payload).sort()).toEqual(["date", "idempotencyKey", "listingId", "requestedPasses"]);
    for (const forbidden of ["startUtc", "endUtc", "fullDay"]) {
      expect(payload).not.toHaveProperty(forbidden);
    }
  });

  it("(6b) the idempotency token is STABLE per selection and CHANGES when the selection does (CR-06)", async () => {
    // The memo's dependency list IS the design, and nothing else measures it. A `sold-out` mock is used so
    // the CTA leaves `pending` and can be clicked again — a success redirects and unmounts the control.
    const placeOpenHold = makeHold({ ok: false, reason: "sold-out", error: SOLD_OUT_MESSAGE });
    const { container } = renderPicker({ placeOpenHold });
    const bookButton = () => screen.getByRole("button", { name: "Book this space" });
    const keyOf = (call: number) =>
      (placeOpenHold.mock.calls[call][0] as Record<string, unknown>).idempotencyKey as string;
    const bookAgain = async (nth: number) => {
      await waitFor(() => expect(bookButton().hasAttribute("disabled")).toBe(false));
      fireEvent.click(bookButton());
      await waitFor(() => expect(placeOpenHold).toHaveBeenCalledTimes(nth));
    };

    await bookAgain(1);
    await bookAgain(2);
    // Same listing, same date, same pass count → the SAME token. This is the D-42 double-submit guarantee
    // the server's tokenless arm used to provide by accident, now stated deliberately by the client.
    expect(keyOf(1)).toBe(keyOf(0));

    // Change the SELECTION and the token must change with it. Without this, CR-06's journey — buy 2
    // passes, pay, come back for 2 more — would read as a replay of the first purchase forever.
    fireEvent.click(screen.getByRole("button", { name: "Add a pass" }));
    expect(container.querySelector<HTMLInputElement>("#requested-passes")!.value).toBe("2");
    await bookAgain(3);
    expect(keyOf(2)).not.toBe(keyOf(0));
  });

  it("(7) a lost race renders the SERVER's sold-out sentence and refreshes the calendar (OC-13)", async () => {
    const placeOpenHold = makeHold({ ok: false, reason: "sold-out", error: SOLD_OUT_MESSAGE });
    renderPicker({ placeOpenHold });

    fireEvent.click(screen.getByRole("button", { name: "Book this space" }));

    await waitFor(() => expect(screen.getByText(SOLD_OUT_MESSAGE)).toBeTruthy());
    // The shipped calm notice path: a neutral status line, never red, never a modal.
    const notice = screen.getByText(SOLD_OUT_MESSAGE);
    expect(notice.getAttribute("role")).toBe("status");
    expect(notice.className).toContain("text-muted-foreground");
    expect(notice.className).not.toContain("destructive");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("(8) a weekday the venue is closed says so, and a non-open payload falls back to the no-hours shell", async () => {
    getDayAvailability.mockResolvedValue(closedDay());
    const { container } = renderPicker({});

    fireEvent.click(dayButton(container, DAY_B)!);

    await waitFor(() => expect(screen.getByText(`Closed on ${labelFor(DAY_B)}`)).toBeTruthy());
    expect(screen.getByText("This space isn't open on this day. Try another day.")).toBeTruthy();

    cleanup();

    // No payload at all (an unknown/unpublished listing) → the shipped no-hours empty state, verbatim.
    renderPicker({ initialDay: null });
    expect(screen.getByText("No availability yet")).toBeTruthy();
    expect(screen.getByText("This host hasn't set their hours yet. Check back soon.")).toBeTruthy();
  });

  it("(9) the tz note stays, aria-linked, and the grid is described by it (SC#2)", () => {
    const { container } = renderPicker({});

    const note = screen.getByText(`Times shown in ${CITY} time (GMT+8)`);
    expect(note.id).toBe("availability-tz-note");
    const described = container.querySelector('[aria-describedby="availability-tz-note"]');
    expect(described).toBeTruthy();
    expect(within(described as HTMLElement).getByRole("grid")).toBeTruthy();
  });
});
