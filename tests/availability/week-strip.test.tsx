// @vitest-environment jsdom

// HFLOW-04 · D-152 / D-153 — the week strip's RENDERED half, and the two silent failures it exists to
// catch. `week-strip.test.ts` beside this file already proves the derivation over 48 cases; nothing here
// re-tests it. What is provable only against rendered output is the wiring, and both ways it can break
// are quiet:
//
//   • A PREVIEW THAT ONLY UPDATES AFTER A SAVE ROUND-TRIP HAS FAILED ITS OWN PURPOSE. D-152 exists so a
//     host who types nine in the morning where they meant nine at night sees it BEFORE they commit. Fed
//     `initialWindows` instead of the live watched value, the strip still renders, still looks correct on
//     first paint, and is simply always one save behind — a defect no typecheck and no snapshot notices.
//     Case 3 is the assertion that fails on it, and it is written as "the sentence changed AND nothing
//     was sent", because a preview that refreshed itself by re-reading the server would pass a weaker
//     test while breaking the same promise.
//
//   • A DECORATIVE GRID THAT IS NOT HIDDEN FROM ASSISTIVE TECHNOLOGY turns seven columns of meaningless
//     boxes into seven columns of announced noise. D-153 makes the bars decoration and the sentences the
//     meaning; if the grid loses `aria-hidden`, a screen-reader user gets the seven sentences AND every
//     day caption and every bar, and a sighted reviewer sees nothing wrong at all. Case 1 is the
//     assertion that fails on it.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — TWO PROBES, BOTH RUN AND BOTH REVERTED (23 August 2026). GREEN IS 6 PASSED.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`). Command
// for both: `npx vitest run tests/availability/week-strip.test.tsx`
//
//   (a) THE PREVIEW WIRED TO THE SAVED VALUE. `weekly-hours-editor.tsx`'s `windows={liveWindows}`
//       replaced by `windows={initialWindows}` — i.e. the strip fed what was last saved instead of what
//       the host is typing, which is the one plausible wrong wiring and the one that still renders a
//       perfectly correct-looking strip. **1 failed / 5 passed**, on case 3 alone:
//
//         AssertionError: expected 'Monday: 9:00 AM to 5:00 PM' to be 'Monday: 6:00 AM to 5:00 PM'
//
//       That diff IS D-152 stated as a failure: the host has already picked six in the morning and the
//       preview is still describing the nine o'clock they are replacing. Reverted → 6 passed.
//
//   (b) THE DECORATIVE GRID UN-HIDDEN. `aria-hidden="true"` removed from the seven-column grid in
//       `week-strip.tsx` — the "helpful" edit that turns 14 pieces of decoration into announced noise.
//       **1 failed / 5 passed**, on case 1:
//
//         AssertionError: expected null to be 'true' // Object.is equality
//
//       The two clauses after it would have fired on the same edit — every bar and every day caption
//       stops being inside a hidden subtree — but the attribute assertion is first and expectations
//       fail fast. Reverted → 6 passed.
//
// WHAT THIS FILE CANNOT SEE, stated so the next reader under-trusts it. jsdom computes no layout, so
// "the bar is 6.66px tall at the 320px floor" is not assertable here and is not attempted — the geometry
// is checked as the percentages the component writes, and whether a 33 by 7 pixel mark is LEGIBLE is a
// human call routed to 14-VALIDATION § Manual-Only (D-131 is the standing reason this split exists).
// Nor does jsdom implement the accessibility tree: "hidden from assistive technology" is asserted here as
// the two things that are checkable — the attribute on the grid, and the fact that every bar and caption
// lies inside that subtree while the seven sentences lie outside it — plus a role query, which Testing
// Library resolves with `hidden: false` and therefore genuinely will not reach into an aria-hidden
// subtree.

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

// The editor's only server coupling. Stubbed as the TRANSPORT under test: case 3 asserts this mock's
// call count is zero, which is what "the preview is live rather than post-save" means mechanically.
vi.mock("@/app/actions/operating-hours", () => ({
  saveOperatingHours: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { saveOperatingHours } from "@/app/actions/operating-hours";
import { WeekStrip } from "@/components/availability/week-strip";
import { WeeklyHoursEditor } from "@/components/availability/weekly-hours-editor";

// Radix's select measures itself with a ResizeObserver jsdom does not implement. Stubbed here rather
// than in the shared setup so the blast radius is this file; nothing asserted below is a measurement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const CITY = "Cebu City";

/** The strip's structure, walked once so no case re-derives it. */
function readStrip(root: HTMLElement) {
  const grid = root.querySelector<HTMLElement>('[data-testid="week-strip"]');
  if (!grid) throw new Error("the strip rendered no grid");
  const columns = Array.from(grid.children) as HTMLElement[];
  return {
    grid,
    columns,
    /** Every column's track (the first child) and the positioned bars inside it. */
    tracks: columns.map((column) => column.firstElementChild as HTMLElement),
    segments: columns.flatMap((column) =>
      Array.from((column.firstElementChild as HTMLElement).children),
    ) as HTMLElement[],
  };
}

/** `"37.5%"` → `37.5`. The component writes percentages; jsdom does not resolve them to pixels. */
const percent = (value: string) => Number.parseFloat(value.replace("%", ""));

/** Is this element inside a subtree that assistive technology is told to skip? */
const isHiddenFromAT = (el: Element) => el.closest('[aria-hidden="true"]') !== null;

const ALARM = /destructive|-red-|-amber-|-orange-|-yellow-/;

const paintedClasses = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>("*")).flatMap((el) =>
    Array.from(el.classList).filter((c) => !c.includes(":")),
  );

describe("WeekStrip — the bars are decoration and the sentences are the meaning (D-153)", () => {
  it("(1) hides the whole grid from assistive technology: seven sentences reachable, zero bars", () => {
    const { container } = render(
      <WeekStrip
        cityLabel={CITY}
        windows={[
          { dayOfWeek: 1, openTime: "06:00", closeTime: "22:00" },
          { dayOfWeek: 5, openTime: "08:00", closeTime: "12:00" },
        ]}
      />,
    );
    const { grid, segments } = readStrip(container);

    expect(grid.getAttribute("aria-hidden")).toBe("true");

    // NOT VACUOUS: there are bars to hide. A strip that drew nothing would satisfy every clause below
    // perfectly, which is the shape of vacuity `card-pattern-coverage.test.ts`'s probe (c) measured.
    expect(segments.length).toBe(2);
    for (const bar of segments) expect(isHiddenFromAT(bar)).toBe(true);
    // The day captions are inside the same subtree, so they are hidden by inheritance — each one is
    // repeated as the subject of its own sentence, and announcing both would say every weekday twice.
    for (const column of readStrip(container).columns) {
      expect(isHiddenFromAT(column.querySelector("p") as Element)).toBe(true);
    }

    // …and the MEANING is reachable. `getByRole` resolves with `hidden: false`, so this query cannot
    // see into the grid at all: seven items is the text equivalent and nothing else.
    const announced = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(announced).toEqual([
      "Sunday: closed",
      "Monday: 6:00 AM to 10:00 PM",
      "Tuesday: closed",
      "Wednesday: closed",
      "Thursday: closed",
      "Friday: 8:00 AM to 12:00 PM",
      "Saturday: closed",
    ]);
  });

  it("(2) renders exactly seven sentences, one per weekday, in weekday order", () => {
    const { container } = render(<WeekStrip cityLabel={CITY} windows={[]} />);

    const list = container.querySelector<HTMLElement>('[data-testid="week-strip-text"]');
    expect(list?.tagName).toBe("UL");
    const items = Array.from(list?.querySelectorAll("li") ?? []);
    expect(items).toHaveLength(7);
    // Pinned against the LABELS, not against seven of anything: an ISO re-basing that kept the count
    // and shifted the names would pass a length assertion and misalign every column against the day
    // rows directly beneath it.
    expect(items.map((li) => li.textContent?.split(":")[0])).toEqual([
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]);
    // The columns are in the same order and there are seven of them — this is the pairing D-153 rests
    // on, and it is the only place the drawn order and the announced order are compared as rendered.
    expect(readStrip(container).columns).toHaveLength(7);
  });

  it("(4) draws two windows that touch at an endpoint as two adjacent bars with no gap", () => {
    const { container } = render(
      <WeekStrip
        cityLabel={CITY}
        windows={[
          { dayOfWeek: 3, openTime: "09:00", closeTime: "12:00" },
          { dayOfWeek: 3, openTime: "12:00", closeTime: "15:00" },
        ]}
      />,
    );
    const { tracks } = readStrip(container);
    const wednesday = Array.from(tracks[3].children) as HTMLElement[];

    // TWO elements, not one. Coalescing them would draw the same picture and announce a range the host
    // never typed — the "tidy-up" 14-04 watched its own derivation fail against.
    expect(wednesday).toHaveLength(2);

    const [first, second] = wednesday.map((bar) => ({
      top: percent(bar.style.top),
      height: percent(bar.style.height),
    }));
    expect(first.top).toBeCloseTo(37.5, 6);
    expect(first.height).toBeCloseTo(12.5, 6);
    // NO GAP AND NO OVERLAP: the second bar starts exactly where the first ends, so the pair merges
    // into one visual run. That is correct rather than an artefact — the space IS open continuously
    // across the boundary, which is what the half-open convention the schema shares with the exclusion
    // constraint means. The tolerance is floating-point slack on a percentage, far below one device
    // pixel of a 160px track.
    expect(second.top).toBeCloseTo(first.top + first.height, 6);
    expect(second.height).toBeCloseTo(12.5, 6);

    // And the sentence names BOTH ranges, from the same call that positioned the two bars.
    expect(screen.getAllByRole("listitem")[3].textContent).toBe(
      "Wednesday: 9:00 AM to 12:00 PM, and 12:00 PM to 3:00 PM",
    );
  });

  it("(5) draws an unset week as seven empty tracks and says so without alarm", () => {
    const { container } = render(<WeekStrip cityLabel={CITY} windows={[]} />);
    const { tracks, segments } = readStrip(container);

    expect(tracks).toHaveLength(7);
    expect(segments).toHaveLength(0);
    expect(screen.getByText("Closed every day — no hours set yet.")).toBeTruthy();
    expect(screen.getByText(`Midnight to midnight · ${CITY} time`)).toBeTruthy();

    // AN UNSET WEEK IS NOT AN ERROR. It is the truthful picture of a listing nobody has set up yet, and
    // the place that fact becomes actionable is the shipped hours-missing signal — not here.
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0);
    expect(paintedClasses(container).filter((c) => ALARM.test(c))).toEqual([]);
  });

  it("(6) renders ZERO live regions, so a later helpful addition fails here", () => {
    // GATE-03 rule 6. The select the host just changed already announces its own new value; a second
    // announcement for one action is the defect, not the courtesy. Asserted as a COUNT rather than as
    // "the banned politeness level is absent", so `aria-live="polite"` and `role="status"` are caught
    // by the same clause that catches the assertive one.
    const { container } = render(
      <WeekStrip cityLabel={CITY} windows={[{ dayOfWeek: 2, openTime: "07:00", closeTime: "09:00" }]} />,
    );

    expect(
      container.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]'),
    ).toHaveLength(0);
  });
});

describe("WeekStrip inside the editor — the preview is LIVE, not post-save (D-152)", () => {
  it("(3) re-draws the day the host just edited, with zero network calls", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { container } = render(
      <WeeklyHoursEditor
        listingId="listing-under-test"
        cityLabel={CITY}
        gmtLabel="GMT+8"
        initialWindows={[{ dayOfWeek: 1, openTime: "09:00", closeTime: "17:00" }]}
      />,
    );

    const mondayBefore = () => screen.getAllByRole("listitem")[1].textContent;
    expect(mondayBefore()).toBe("Monday: 9:00 AM to 5:00 PM");

    // Radix mirrors each Select into a hidden native <select> for form submission, and firing `change`
    // on it drives the SAME `onValueChange` the visible trigger does — without needing the pointer
    // capture APIs jsdom has never implemented. The first one is the open time of the only window.
    const openTime = container.querySelectorAll("select")[0];
    act(() => {
      fireEvent.change(openTime, { target: { value: "06:00" } });
    });

    // THE ASSERTION D-152 EXISTS FOR: the sentence for that day changed, from a value that was never
    // saved and never round-tripped.
    expect(mondayBefore()).toBe("Monday: 6:00 AM to 5:00 PM");
    // …and no other day moved, so the change is attributable to the edit rather than to a re-render.
    expect(screen.getAllByRole("listitem")[0].textContent).toBe("Sunday: closed");

    // AND NOTHING WAS SENT. Both halves matter: the server action is the editor's only transport, and
    // `fetch` is what a "helpful" refresh would reach for instead.
    expect(vi.mocked(saveOperatingHours)).toHaveBeenCalledTimes(0);
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });
});
