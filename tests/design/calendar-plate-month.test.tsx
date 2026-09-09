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
// The mount site's own derivation, imported rather than reimplemented — see the WR-05 block at the
// foot of this file. If the export is renamed this file stops compiling, which is the strongest form
// the link can take (the idiom `e2e/cancel.spec.ts:31-39` states the rule for).
import { plateMonthAt } from "@/app/listings/[id]/(detail)/loading";

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
  }, 15_000);
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
    // `toFake: ["Date"]` for the reason spelled out on `hydrateAcrossClocks` below: faking the whole
    // timer suite stalls React's scheduler.
    vi.useFakeTimers({ toFake: ["Date"] });

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
   * IDENTICAL harness — same function, same instants, same assertions — is what proves the harness can
   * see the hazard at all.
   */
  function ClockReadingPlate() {
    // UTC deliberately, and it cost a red to learn why. Reading the LOCAL month makes this control a
    // function of the RUNNER's timezone: on this box (Asia/Manila, +08) both instants below are
    // already February in local time, the two renders agreed, and the control reported no mismatch —
    // a control that cannot fail, in the file whose whole subject is tests that cannot fail. Reading
    // UTC pins the boundary to the instants themselves. Recorded in
    // `evidence/triage-plate-month.txt` section 4.
    const now = new Date();
    const rows = weekRowsForMonth({ year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 });
    return (
      <div data-testid="clock-reading-plate">
        {Array.from({ length: rows }).map((_, week) => (
          <div key={week} className="mt-2 grid grid-cols-7" />
        ))}
      </div>
    );
  }

  /**
   * THE BOUNDARY, chosen so that a clock read actually changes the answer.
   *
   * January 2027 is a SIX-row month and February 2027 is a FIVE-row one, so a component that reads
   * its own clock emits a different number of rows on each side of this pair. A boundary between two
   * months of the SAME shape would leave the control green and prove nothing — most month boundaries
   * are exactly that, which is part of why this class of bug is so quiet.
   *
   * The eight hours between them is the real-world shape of the disagreement: a venue at +08 has
   * already crossed into the new month while a server at UTC has not.
   */
  const SERVER_INSTANT = new Date("2027-01-31T20:00:00.000Z");
  const CLIENT_INSTANT = new Date("2027-02-01T04:00:00.000Z");

  /**
   * `renderToString` under `SERVER_INSTANT`, then a real `hydrateRoot` under `CLIENT_INSTANT`,
   * collecting every recoverable error React reports. A hydration mismatch IS a recoverable error, so
   * a non-empty result is the mismatch.
   *
   * ⚠ `toFake: ["Date"]` AND NOT THE WHOLE TIMER SUITE. Faking `setTimeout` too stalls React's own
   * scheduler, and the hydration work then never flushes — which reads as "no mismatch" and would turn
   * this harness into one that cannot fail. That failure was OBSERVED before the option was narrowed
   * (the control came back with zero recoverable errors), which is the reason the control exists.
   */
  const ROW_MARK = /mt-2 grid grid-cols-7/g;
  const countRows = (html: string) => (html.match(ROW_MARK) ?? []).length;

  function hydrateAcrossClocks(node: React.ReactElement): {
    recoverable: string[];
    serverRows: number;
    finalRows: number;
  } {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(SERVER_INSTANT);
    const html = renderToString(node);

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    vi.setSystemTime(CLIENT_INSTANT);
    const recoverable: string[] = [];
    let root: ReturnType<typeof hydrateRoot> | null = null;
    act(() => {
      root = hydrateRoot(container, node, {
        onRecoverableError: (error) => {
          recoverable.push(error instanceof Error ? error.message : String(error));
        },
      });
    });
    const finalRows = countRows(container.innerHTML);
    act(() => {
      root?.unmount();
    });
    container.remove();
    return { recoverable, serverRows: countRows(html), finalRows };
  }

  it("CONTROL — a plate that reads the clock DOES mismatch across a month boundary", () => {
    const { recoverable, serverRows, finalRows } = hydrateAcrossClocks(<ClockReadingPlate />);

    // Non-vacuity, both ends. The two renders must genuinely DISAGREE (January's six against
    // February's five), and hydration must genuinely have RUN — otherwise "no errors" below would
    // only mean "the harness rendered the same thing twice", which is the exact way this control
    // first passed over nothing.
    expect(
      serverRows,
      "the server pass did not render JANUARY's six rows, so the two sides never disagreed and this " +
        "control is measuring nothing",
    ).toBe(6);
    expect(
      finalRows,
      "after hydration the control should hold FEBRUARY's five rows — the client's answer. If it " +
        "still holds six, React never hydrated and this harness is measuring nothing.",
    ).toBe(5);

    expect(
      recoverable.length,
      "the control did NOT mismatch, so this harness cannot detect a server/client month " +
        "disagreement and the assertion below proves nothing. Fix the harness before trusting it.",
    ).toBeGreaterThan(0);
  });

  it("the plate does NOT mismatch, because its month arrives as a prop", () => {
    const { recoverable, serverRows, finalRows } = hydrateAcrossClocks(
      <CalendarMonthSkeleton month={SIX_ROW_MONTH} />,
    );

    // The same non-vacuity check, and the answer it must give is the PROP's — six rows on BOTH sides
    // of the very boundary that took the control from six to five.
    expect(
      [serverRows, finalRows],
      "the plate did not keep its prop's six rows across the boundary that took the control from " +
        "six to five",
    ).toEqual([6, 6]);

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

  /** The derivation's name READ from the export, never copied — PATTERNS §B. */
  const DERIVATION = plateMonthAt.name;

  /** `loading.tsx`'s code with comments blanked. Its prose names every string asserted below. */
  function mountSiteCode(): string {
    const source = readFileSync(resolve(process.cwd(), LOADING_PATH), "utf8");
    // Comments in this file DISCUSS `"use client"` by name — the whole hazard note is about why it
    // must not be there — so the directive census reads code only. Same trick, same reason, as
    // `tests/design/availability-tz-note-id.test.ts`.
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  }

  it("is a Server Component and passes the plate an explicit month", () => {
    const code = mountSiteCode();
    expect(
      code.includes("CalendarMonthSkeleton"),
      "the comment-stripping left nothing to search, so both assertions below would pass over an " +
        "empty string",
    ).toBe(true);

    expect(
      code.includes('"use client"') || code.includes("'use client'"),
      `${LOADING_PATH} declared "use client". The whole of the single-source argument is that this ` +
        "file runs on the server ONCE and the month reaches the plate as a serialized prop; a client " +
        "directive here puts the clock read back on both sides.",
    ).toBe(false);

    expect(
      /<CalendarMonthSkeleton\s+month=\{/.test(code),
      `${LOADING_PATH} mounts CalendarMonthSkeleton without an explicit \`month\` prop.`,
    ).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // 19.1-REVIEW.md WR-05 — THE MONTH'S *VALUE*, WHICH THE THREE ASSERTIONS ABOVE CANNOT SEE
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  //
  // `/<CalendarMonthSkeleton\s+month=\{/` is satisfied by ANY expression, so the whole correctness of
  // the D-A2 repair lived in arithmetic nothing looked at. MEASURED, on the tracked tree, before the
  // cases below existed: adding `- 1` to the month expression — the slip someone applying `Date`'s
  // 0-based convention makes, in a file whose own prop is 1-based — left the design suite GREEN at
  // 81 files / 1426 passed, while the plate reserved AUGUST 2026's six rows against SEPTEMBER's
  // five-row grid. That is D-A2's 52.81px shift restored under a fully green suite. The two
  // `CalendarMonthSkeleton` render suites above pass their own literal months, the hydration harness
  // passes `SIX_ROW_MONTH`, and the purity census only forbids clock reads, so none of them is
  // looking at the number the mount site actually computes.
  // Transcript: `evidence/guards-review-wr01-02-03-05-{pre,post}-fix.txt` § WR-05.
  //
  // TWO CONJUNCTS, BOUND ONE-TO-ONE:
  //   • the VALUE cases assert what `plateMonthAt` returns at three named instants;
  //   • the BINDING case asserts the mount site still USES it — because a helper that is correct and
  //     unused is exactly what "tidying the arithmetic back inline" produces, and the value cases
  //     cannot see that.

  describe("the derivation returns the LAUNCH-ZONE month, at the value level", () => {
    // The three instants are chosen so that each slip reddens a DIFFERENT named case rather than all
    // three at once: a 0-based slip moves every month, a UTC-instead-of-Manila slip only shows up
    // within +08 of a date boundary, and a year-rollover slip only shows up across 31 December.
    it.each([
      {
        at: "2026-08-31T16:30:00.000Z",
        want: { year: 2026, month: 9 },
        why: "00:30 on 1 September in Manila while UTC is still 31 August — a UTC read answers 8",
      },
      {
        at: "2026-09-30T15:59:00.000Z",
        want: { year: 2026, month: 9 },
        why: "23:59 on 30 September in Manila — still September, and a 0-based slip answers 8",
      },
      {
        at: "2026-12-31T16:30:00.000Z",
        want: { year: 2027, month: 1 },
        why: "00:30 on 1 January 2027 in Manila — the YEAR rolls with the month, and a 0-based slip " +
          "answers month 0, which `weekRowsForMonth` does not reject: it resolves through " +
          "Date.UTC(2027, -1, 1) to December 2026 and returns a plausible 5",
      },
    ])("derives $at as $want", ({ at, want, why }) => {
      expect(
        plateMonthAt(new Date(at)),
        `${DERIVATION}(new Date("${at}")) must be ${JSON.stringify(want)} — ${why}.\n` +
          "`MonthLocal.month` is 1-BASED, which is `DayLocal`'s convention throughout " +
          "availability-calendar.tsx and NOT `Date`'s, and `weekRowsForMonth` VALIDATES NOTHING: a " +
          "month of 0 or 13 returns a plausible row count for the wrong month instead of throwing. " +
          "That is why this is asserted as a value rather than range-checked.\n" +
          "THE CORRECT RESPONSE: fix the arithmetic in `plateMonthAt`. Never adjust the expectations " +
          "here to match — these three instants ARE the contract, and D-A2 is what the plate " +
          "reserving another month's rows looks like on screen (52.81px, ten months in twelve).",
      ).toEqual(want);
    });

    it("gives two months in different zones-of-the-boundary different answers (non-vacuity)", () => {
      // Guard-the-guard: if `plateMonthAt` returned a constant, every case above could still be
      // satisfied by three separately-wrong-but-equal answers only if they agreed — they do not, and
      // this states that they do not, so the sweep cannot degenerate.
      const answers = new Set(
        ["2026-08-31T16:30:00.000Z", "2026-09-30T15:59:00.000Z", "2026-12-31T16:30:00.000Z"].map(
          (at) => JSON.stringify(plateMonthAt(new Date(at))),
        ),
      );
      expect(
        answers.size,
        "the three instants above collapsed to fewer than two distinct months, so the case list " +
          "could be satisfied by a derivation that ignores its argument",
      ).toBeGreaterThan(1);
    });
  });

  it(`the mount site's \`month\` prop is DERIVED FROM ${plateMonthAt.name}, not computed inline`, () => {
    const code = mountSiteCode();

    const propExpression = /<CalendarMonthSkeleton\s+month=\{([^}]*)\}/.exec(code)?.[1]?.trim();
    expect(
      propExpression,
      `${LOADING_PATH} mounts CalendarMonthSkeleton with no readable \`month={…}\` expression.`,
    ).toBeTruthy();

    const identifier = /^[A-Za-z_$][\w$]*$/.test(propExpression!) ? propExpression! : null;
    const derived =
      propExpression!.startsWith(`${DERIVATION}(`) ||
      (identifier !== null &&
        new RegExp(`\\b(const|let|var)\\s+${identifier}\\s*=\\s*${DERIVATION}\\(`).test(code));

    expect(
      derived,
      `${LOADING_PATH} passes \`month={${propExpression}}\`, which is not a call to \`${DERIVATION}\` ` +
        `and is not an identifier bound to one.\n` +
        `THE VALUE CASES ABOVE TEST ${DERIVATION}; THIS ONE TESTS THAT THE PAGE STILL USES IT. ` +
        "Inlining the year/month arithmetic back into the component body — the plausible 'tidy-up', " +
        "and the shape this file was repaired away from — leaves the helper correct, exported and " +
        "UNUSED, with every value case still green over arithmetic the page no longer runs. That is " +
        "the same defect one level up: a check satisfied by something other than what it claims to " +
        "measure.\n" +
        "THE CORRECT RESPONSE: pass `month={plateMonth}` with `const plateMonth = " +
        `${DERIVATION}(new Date())\`, or call it inline. If the derivation genuinely has to change, ` +
        "change it INSIDE the helper so the three instants above still judge it.",
    ).toBe(true);
  });
});
