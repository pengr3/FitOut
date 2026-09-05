// @vitest-environment jsdom

// 19.1 · FINDING D-A2 — THE MONTH PLATE RESERVES THE ROWS THE MONTH ACTUALLY HAS, AND ITS ROW COUNT
// COMES FROM A PROP RATHER THAN FROM A CLOCK.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT WAS WRONG, MEASURED
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `CalendarMonthSkeleton` rendered `Array.from({ length: 6 })` week rows unconditionally. A month of
// 28-31 days folded into seven-day rows takes 4, 5 or 6 of them, and only 2 of the 12 months from
// September 2026 are six-row months. Measured on `/listings/{seeded}` at 320 / 768 / 1280 in both
// themes, 5 September 2026 (`evidence/triage-plate-month.txt` section 1):
//
//   skeleton {"width":288,"height":410}  resolved {"width":288,"height":357.1875}
//   Δwidth 0, Δheight 52.8125
//
// 52.81px is exactly one week row (44 + 8) plus the 0.81px weekday-row approximation the component
// declares. That is a real layout shift on the listing route, live 10 months in 12, and it is the
// whole of what `e2e/calendar-hit-area.spec.ts`'s AC#15 pair was red on.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE ROW COUNT IS A PROP AND NOT A CLOCK READ — THE HAZARD THAT NEARLY SANK THE REPAIR
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The plate is the PRE-HYDRATION paint. `src/app/listings/[id]/(detail)/loading.tsx` is a Server
// Component, so the plate's markup is produced on the server; the `"use client"` component inside it
// is then rendered again on the client during hydration. If BOTH sides derived the month from their
// own `new Date()`, they could disagree — a browser east of the server crosses midnight, and with it a
// month boundary, hours before the server does. The two renders would then emit a different number of
// week rows for the same boundary, which is a hydration mismatch: a layout shift traded for a React
// error.
//
// So the month is computed ONCE, on the server, at the mount site, and travels to the component as a
// serialized prop. `CalendarMonthSkeleton` reads no clock at all. That is not a comment in this file;
// it is the property the two blocks below EXERCISE:
//
//   • `describe("the plate is a pure function of its month prop")` renders the component under two
//     system clocks four months apart and requires byte-identical HTML.
//   • `describe("server render and client hydration cannot disagree")` does a real
//     `renderToString` under one clock and a real `hydrateRoot` under another, collecting React's
//     `onRecoverableError`. It carries its OWN CONTROL: `ClockReadingPlate`, the shape this repair
//     rejected, put through the identical harness and required to FAIL. Without that control the
//     hydration test would be a test that cannot fail, which is the failure mode this whole phase
//     exists to remove.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE DOES *NOT* ASSERT AGAINST ITSELF
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `weekRowsForMonth` is never compared to a number this file computed with the same arithmetic. It is
// checked twice, independently:
//
//   1. against a DAY-WALKING derivation written here (start at the 1st, step one day at a time,
//      count the week-start crossings) — a different algorithm for the same question;
//   2. against what `react-day-picker` ACTUALLY RENDERS, by mounting the repository's own
//      `ui/calendar.tsx` for each month and counting its `tbody tr`.
//
// (2) is what makes the week-start question a measurement rather than an assumption. `ui/calendar.tsx`
// passes no `weekStartsOn`, no `ISOWeek` and no `fixedWeeks`, so the grid folds on the default
// locale's week start — and the sweep below includes NOVEMBER 2026, which starts on a Sunday and
// therefore renders 5 rows on a Sunday-start calendar and 6 on a Monday-start one. A helper that
// guessed the wrong week start is red on that month specifically.
//
// ── NOT COVERED ──────────────────────────────────────────────────────────────────────────────────
//   • jsdom measures no boxes. "The plate and the grid are the same height" is
//     `e2e/calendar-hit-area.spec.ts` AC#15's claim; this file's claim is the ROW COUNT that height is
//     a product of.
//   • THE SEARCHED MONTH. `/listings/[id]?date=…` can open the resolved grid on a month that is not
//     the current one, and `loading.tsx` cannot see search params. The plate then reserves the current
//     month's rows for a different month's grid. Recorded at the mount site; unchanged by this file.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CalendarMonthSkeleton,
  weekRowsForMonth,
  type MonthLocal,
} from "@/components/availability/availability-calendar";
import { Calendar } from "@/components/ui/calendar";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Every placeholder bar in the plate — `skeleton-a11y.test.tsx`'s selector, verbatim. */
const BAR_SELECTOR = '[data-slot="skeleton"]';

/**
 * A DAY-WALKING count of a month's week rows, deliberately NOT the arithmetic the helper uses.
 *
 * The helper computes `ceil((leadingBlanks + daysInMonth) / 7)` in one expression. This one starts a
 * row, steps a day at a time, and opens a new row every time the weekday returns to the week start.
 * Two algorithms that agree on 24 consecutive months are not two spellings of one mistake.
 */
function weekRowsByWalking({ year, month }: MonthLocal, weekStartsOn: number): number {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let rows = 1;
  for (let day = 2; day <= daysInMonth; day += 1) {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (weekday === weekStartsOn) rows += 1;
  }
  return rows;
}

/** 24 consecutive months from the month FINDING D-A2 was measured in. */
const MONTH_SWEEP: MonthLocal[] = Array.from({ length: 24 }, (_, i) => ({
  year: 2026 + Math.floor((8 + i) / 12),
  month: ((8 + i) % 12) + 1,
}));

/**
 * The two months the repair has to be right on, named rather than computed, because "verified only in
 * the month you happened to run it in" is precisely how the six-row assumption survived for a year.
 *
 * September 2026 — the month D-A2 was measured in; 1 Sept is a Tuesday, 30 days → FIVE rows.
 * January 2027  — one of only two six-row months in the 12 that follow; 1 Jan is a Friday, 31 days
 *                 → SIX rows. It is also the month the ORIGINAL hard-coded six was accidentally
 *                 correct in, so a repair that silently kept returning 6 is green here and red above.
 */
const FIVE_ROW_MONTH: MonthLocal = { year: 2026, month: 9 };
const SIX_ROW_MONTH: MonthLocal = { year: 2027, month: 1 };

describe("weekRowsForMonth agrees with a second derivation and with the real grid", () => {
  it("matches a day-walking count over 24 consecutive months (Sunday-start)", () => {
    // Guard-the-guard: a sweep that lost its entries is green and measures nothing.
    expect(MONTH_SWEEP).toHaveLength(24);
    // ...and a sweep in which every month has the same shape could not tell the shapes apart.
    const shapes = new Set(MONTH_SWEEP.map((m) => weekRowsByWalking(m, 0)));
    expect(
      [...shapes].sort(),
      "the sweep must contain both five-row and six-row months, or it cannot distinguish a derived " +
        "count from a hard-coded one",
    ).toEqual([5, 6]);

    for (const month of MONTH_SWEEP) {
      expect(
        weekRowsForMonth(month),
        `${month.year}-${String(month.month).padStart(2, "0")}: the helper and the day-walking ` +
          "count disagree about how many seven-day rows this month folds into",
      ).toBe(weekRowsByWalking(month, 0));
    }
  });

  it("matches what react-day-picker actually renders, month by month", () => {
    // THE WEEK-START QUESTION, SETTLED BY MEASUREMENT. `ui/calendar.tsx` passes no `weekStartsOn`,
    // so this loop is what says which day the grid folds on — and November 2026 (a Sunday 1st) is
    // the month where a Sunday-start and a Monday-start calendar give different answers.
    expect(
      MONTH_SWEEP.some((m) => m.year === 2026 && m.month === 11),
      "the sweep must include November 2026 — a month starting on the week-start day is the only " +
        "shape that discriminates a Sunday-start grid from a Monday-start one",
    ).toBe(true);

    for (const month of MONTH_SWEEP) {
      const { container, unmount } = render(
        <Calendar mode="single" month={new Date(month.year, month.month - 1, 1)} />,
      );
      const renderedRows = container.querySelectorAll("tbody tr").length;
      const label = `${month.year}-${String(month.month).padStart(2, "0")}`;

      expect(renderedRows, `${label}: the grid rendered no week rows at all`).toBeGreaterThan(0);
      expect(
        weekRowsForMonth(month),
        `${label}: the plate would reserve ${weekRowsForMonth(month)} week rows against a grid that ` +
          `renders ${renderedRows}. Every pixel of AC#15's ±2px is one week row × 52px, so a ` +
          "disagreement here IS the layout shift.",
      ).toBe(renderedRows);
      unmount();
    }
  });
});

describe("the plate reserves the rows its month has", () => {
  it.each([
    { name: "a five-row month (2026-09, the month D-A2 was measured in)", month: FIVE_ROW_MONTH, rows: 5 },
    { name: "a six-row month (2027-01, where the old hard-coded six was right)", month: SIX_ROW_MONTH, rows: 6 },
  ])("renders $name as $rows week rows of seven cells", ({ month, rows }) => {
    const { container } = render(<CalendarMonthSkeleton month={month} />);

    // The count is the geometry claim this layer can make: `rows` × 7 day cells + 7 weekday marks
    // + 1 caption. jsdom cannot measure the box; it can prove the plate is a MONTH.
    expect(container.querySelectorAll(BAR_SELECTOR)).toHaveLength(rows * 7 + 7 + 1);

    // ...and the rows are real rows, not 35 cells in one flat grid.
    expect(container.querySelectorAll(".mt-2.grid.grid-cols-7")).toHaveLength(rows);
  });

  it("gives the two months DIFFERENT row counts", () => {
    // The assertion the hard-coded six passes trivially and a derived count cannot: whatever the
    // numbers are, they must not be the same number.
    const five = render(<CalendarMonthSkeleton month={FIVE_ROW_MONTH} />);
    const fiveBars = five.container.querySelectorAll(BAR_SELECTOR).length;
    five.unmount();

    const six = render(<CalendarMonthSkeleton month={SIX_ROW_MONTH} />);
    const sixBars = six.container.querySelectorAll(BAR_SELECTOR).length;

    expect(
      sixBars - fiveBars,
      "a six-row month must render exactly one more week of cells than a five-row one. Equal counts " +
        "mean the plate is still reserving a constant number of rows.",
    ).toBe(7);
  });
});

describe("the plate is a pure function of its month prop", () => {
  it("renders identically under two system clocks four months apart", () => {
    vi.useFakeTimers();

    // 30 September 2026, 23:30 in a +08 venue — the eve of a month boundary.
    vi.setSystemTime(new Date("2026-09-30T15:30:00.000Z"));
    const { container: a } = render(<CalendarMonthSkeleton month={SIX_ROW_MONTH} />);
    const underClockA = a.innerHTML;
    cleanup();

    // Four months later, in a month with a DIFFERENT row count. If the component read the clock at
    // all, this is where the HTML would move.
    vi.setSystemTime(new Date("2027-01-31T20:00:00.000Z"));
    const { container: b } = render(<CalendarMonthSkeleton month={SIX_ROW_MONTH} />);

    expect(
      b.innerHTML,
      "the plate's markup moved when only the system clock moved. Its row count must come from the " +
        "`month` prop the server computed, never from a clock each side reads for itself.",
    ).toBe(underClockA);
  });

  it("declares no clock read in the plate's own source", () => {
    // A shape guard beside the behavioural one above. Behaviour proves today's component is pure;
    // this proves the SHAPE that keeps it pure cannot come back by accident in a diff.
    const source = readFileSync(
      resolve(process.cwd(), "src/components/availability/availability-calendar.tsx"),
      "utf8",
    );
    const start = source.indexOf("export function weekRowsForMonth");
    const end = source.indexOf("// ---", source.indexOf("export function CalendarMonthSkeleton"));

    expect(start, "`weekRowsForMonth` is not exported from the component module").toBeGreaterThan(-1);
    expect(end, "could not find the end of the CalendarMonthSkeleton block").toBeGreaterThan(start);

    const region = source
      .slice(start, end)
      // Comments describe the hazard by name; the prohibition is about CODE.
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");

    for (const forbidden of ["new Date()", "Date.now(", "getTimezoneOffset"]) {
      expect(
        region.includes(forbidden),
        `\`${forbidden}\` appears in the plate's own code. The plate is the pre-hydration paint: a ` +
          "clock read here is a value the server and the client derive SEPARATELY, and near a month " +
          "boundary they derive different ones. The month must arrive as a prop.",
      ).toBe(false);
    }

    // Non-vacuity: the stripped region must still contain the code the prohibition is about.
    expect(
      region.includes("weekRowsForMonth") && region.includes("Array.from"),
      "the comment-stripping left nothing to search, so the prohibition above passed over an empty " +
        "string",
    ).toBe(true);
  });
});

describe("server render and client hydration cannot disagree about the month", () => {
  /**
   * The rejected shape, kept HERE as a control rather than in the product: a plate that derives its
   * own month from the clock. It is what the hydration hazard looks like, and putting it through the
   * identical harness is what proves the harness can see the hazard at all.
   */
  function ClockReadingPlate() {
    const now = new Date();
    const rows = weekRowsForMonth({ year: now.getFullYear(), month: now.getMonth() + 1 });
    return (
      <div data-testid="clock-reading-plate">
        {Array.from({ length: rows }).map((_, week) => (
          <div key={week} className="mt-2 grid grid-cols-7" />
        ))}
      </div>
    );
  }

  /**
   * `renderToString` under `serverInstant`, then `hydrateRoot` under `clientInstant`, collecting every
   * recoverable error React reports. A hydration mismatch is a recoverable error, so a non-empty
   * result IS the mismatch.
   *
   * The two instants are 24 hours apart across a month boundary — the "browser east of the server,
   * near midnight" case, which is the one the decision required be made impossible.
   */
  function hydrateAcrossClocks(node: React.ReactElement): string[] {
    const serverInstant = new Date("2026-09-30T20:00:00.000Z"); // still September for the server
    const clientInstant = new Date("2026-10-01T04:00:00.000Z"); // already October for the client

    vi.useFakeTimers();
    vi.setSystemTime(serverInstant);
    const html = renderToString(node);

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    vi.setSystemTime(clientInstant);
    const recoverable: string[] = [];
    let root: ReturnType<typeof hydrateRoot> | null = null;
    act(() => {
      root = hydrateRoot(container, node, {
        onRecoverableError: (error) => {
          recoverable.push(error instanceof Error ? error.message : String(error));
        },
      });
    });
    act(() => {
      root?.unmount();
    });
    container.remove();
    return recoverable;
  }

  it("CONTROL — a plate that reads the clock DOES mismatch across a month boundary", () => {
    // September 2026 is a five-row month and October 2026 is a five-row month too, so the control
    // needs a boundary where the row count actually moves: 31 Jan 2027 (six rows) -> 1 Feb 2027
    // (five rows). Proved with its own instants rather than the shared helper's.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-31T20:00:00.000Z"));
    const html = renderToString(<ClockReadingPlate />);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    vi.setSystemTime(new Date("2027-02-01T04:00:00.000Z"));
    const recoverable: string[] = [];
    let root: ReturnType<typeof hydrateRoot> | null = null;
    act(() => {
      root = hydrateRoot(container, <ClockReadingPlate />, {
        onRecoverableError: (error) => {
          recoverable.push(error instanceof Error ? error.message : String(error));
        },
      });
    });
    act(() => {
      root?.unmount();
    });
    container.remove();

    expect(
      recoverable.length,
      "the control did NOT mismatch, so this harness cannot detect a server/client month " +
        "disagreement and the assertion below proves nothing. Fix the harness before trusting it.",
    ).toBeGreaterThan(0);
  });

  it("the plate does NOT mismatch, because its month arrives as a prop", () => {
    const recoverable = hydrateAcrossClocks(<CalendarMonthSkeleton month={FIVE_ROW_MONTH} />);
    expect(
      recoverable,
      "hydrating the plate across a month boundary produced a recoverable React error. The month " +
        "must be computed ONCE on the server and serialized; if either side derives it, this is " +
        "what that costs.",
    ).toEqual([]);
  });
});

describe("the mount site computes the month once, on the server", () => {
  const LOADING_PATH = "src/app/listings/[id]/(detail)/loading.tsx";

  it("is a Server Component and passes the plate an explicit month", () => {
    const source = readFileSync(resolve(process.cwd(), LOADING_PATH), "utf8");

    expect(
      source.includes('"use client"') || source.includes("'use client'"),
      `${LOADING_PATH} declared "use client". The whole of the single-source argument is that this ` +
        "file runs on the server ONCE and the month reaches the plate as a serialized prop; a client " +
        "directive here puts the clock read back on both sides.",
    ).toBe(false);

    expect(
      /<CalendarMonthSkeleton\s+month=\{/.test(source),
      `${LOADING_PATH} mounts CalendarMonthSkeleton without an explicit \`month\` prop.`,
    ).toBe(true);
  });
});
