// @vitest-environment jsdom

// AC#18 / STATE-01 / T-11-A11YFILL — a skeleton must announce itself, and this is the gate that makes
// the 1.09:1 skeleton fill a LEGAL declared exclusion instead of a WCAG 1.4.11 failure.
//
// THE TWO FILES ARE ONE ARGUMENT. `src/lib/design/contrast-pairs.ts` carries `muted` on `background`
// and `muted` on `card` in `EXCLUDED_PAIRS` at 1.09:1 / 1.13:1, on the grounds that a skeleton bar is
// a NON-INFORMATIONAL placeholder — it stands for content that does not exist yet, so there is
// nothing for its contrast to make legible. That argument holds only while the loading state's
// MEANING is carried somewhere else: a `role="status"` region, `aria-busy="true"`, a non-empty
// accessible name, and every pulse bar `aria-hidden`. Remove the wrapper and the fill becomes the
// only carrier of "loading", the exclusion's premise is false, and the app ships a real 1.4.11
// failure with a principled-looking comment next to it. This file is what stops that being a promise.
// If it is ever deleted, the two exclusion rows must be deleted with it — both files say so.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE MEASURED FACT THAT SHAPED THE COMPONENTS: `role="status"` TAKES NO NAME FROM ITS CONTENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `11-UI-SPEC § Loading` prescribes the wrapper as `<div role="status" aria-busy="true">` "carrying an
// `sr-only` label naming what is loading", and states the falsifiable claim as "exactly one
// `role="status"` with a NON-EMPTY accessible name". Those two sentences are not compatible, and it
// was measured rather than argued (probed with `dom-accessibility-api`, the engine behind
// `getByRole(…, { name })`):
//
//   <div role="status"><span class="sr-only">Loading spaces</span></div>   → accessible name ""
//   the same div plus aria-label="Loading spaces"                          → "Loading spaces"
//
// `status` is `nameFrom: author` in ARIA — name-from-content is not permitted for it, so the sr-only
// child names nothing. All three patterns therefore carry BOTH: `aria-label` for the NAME, and the
// `sr-only` span as the live region's CONTENT, which is the thing a screen reader announces when the
// region appears. They are different mechanisms and the UI-SPEC's own claim needs the first one.
// The synthetic control below pins this, so a future "simplification" that drops the `aria-label` as
// redundant goes red HERE, with the reason attached, instead of shipping unnamed regions.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — three probes, all reverted, recorded verbatim (13 August 2026)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// (a) COUNT 0. `role="status"` deleted from `panel-skeleton.tsx`, verbatim:
//
//       AssertionError: PanelSkeleton must render exactly one role="status" — found 0. Zero leaves
//       the 1.09:1 fill as the only carrier of the loading state, which turns contrast-pairs.ts's two
//       skeleton exclusions into real WCAG 1.4.11 failures. Two status regions in one skeleton
//       announce the same load twice.: expected +0 to be 1 // Object.is equality
//
//     1 failed / 9 passed; only the PanelSkeleton case moved — the RowList and CardGrid cases stayed
//     green, which is what makes the failure name the component. Reverted → 10 passed.
//
// (b) COUNT 2. A second `<div role="status" aria-busy="true" aria-label={label} />` added inside
//     `panel-skeleton.tsx`'s existing region, verbatim:
//
//       AssertionError: PanelSkeleton must render exactly one role="status" — found 2. … expected 2
//       to be 1 // Object.is equality
//
//     1 failed / 9 passed. Reverted → 10 passed. The count is asserted as EQUALITY, not
//     `toBeGreaterThan(0)`, precisely because the 2 case is invisible to a floor — and this shape is
//     not hypothetical: the natural way to compose a grid of panels is to nest one skeleton inside
//     another.
//
// (c) THE NAME CLAUSE, which neither of the plan's two prescribed probes reaches. `aria-label`
//     removed from `card-grid-skeleton.tsx`, leaving the `sr-only` span exactly as the UI-SPEC's
//     prose describes it, verbatim:
//
//       AssertionError: CardGridSkeleton's status region must be named by the label it was passed;
//       role="status" is nameFrom:author, so an sr-only child alone leaves it "": expected null to be
//       'Loading test content' // Object.is equality
//
//     1 failed / 9 passed. Reverted → 10 passed. This is the probe that matters most, because the
//     failure it catches LOOKS correct in review — the sr-only sentence is right there in the markup,
//     and the region it is supposed to name has no name at all.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   • GEOMETRY. This renders in jsdom, which has no layout engine: every box here is 0×0 and every
//     computed style is whatever the inline class string says, not what it paints. It says NOTHING
//     about whether the skeleton is the same size as the content it stands in for — that is the ±2px
//     `boundingBox()` comparison in plan `11-21`, in both themes, and D-131 records that jsdom cannot
//     reach that class of bug at all. The sibling `skeleton-measurements.test.ts` proves the classes
//     come from one inventory; neither file proves the inventory is right.
//   • ANNOUNCEMENT. A live region being announced is browser + screen-reader behaviour, not a DOM
//     property. What is asserted here is the markup contract that makes announcement possible —
//     `role`, `aria-busy`, a name, hidden decoration. Whether VoiceOver actually speaks it is Phase
//     17's manual pass.
//   • COMPOSITION. Each pattern is rendered in isolation. A SURFACE that mounts two of them at once,
//     or nests one inside another's slot, can put two status regions on one page while every
//     assertion here stays green. That is a fact about the composing surface, and it belongs to the
//     plans that compose them.
//   • `aria-hidden` is asserted as an ATTRIBUTE on each bar, not as exclusion from a computed
//     accessibility tree. jsdom exposes no such tree; the attribute is the contract.

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { CardGridSkeleton } from "@/components/patterns/card-grid-skeleton";
import { RowListSkeleton } from "@/components/patterns/row-list-skeleton";
import { PanelSkeleton } from "@/components/patterns/panel-skeleton";
import {
  CalendarDaySkeleton,
  CalendarMonthSkeleton,
} from "@/components/availability/availability-calendar";
import { SELECTOR_IDS } from "@/lib/design/selector-contract";

/**
 * Deliberately NOT one of the product's real sentences. `patterns/` holds no product copy, so the
 * label is the surface's to supply — a test that used "Loading your bookings" would quietly assert a
 * copy decision this layer is not allowed to make.
 */
const LABEL = "Loading test content";

/** The pulse bars, found the way the primitive marks itself (`ui/skeleton.tsx:6`). */
const BAR_SELECTOR = '[data-slot="skeleton"]';

afterEach(() => {
  cleanup();
});

const CASES = [
  {
    name: "CardGridSkeleton",
    testId: "skeleton-card-grid",
    element: <CardGridSkeleton label={LABEL} />,
  },
  {
    name: "RowListSkeleton",
    testId: "skeleton-row-list",
    element: <RowListSkeleton label={LABEL} />,
  },
  {
    name: "PanelSkeleton",
    testId: "skeleton-panel",
    element: <PanelSkeleton label={LABEL} />,
  },
] as const;

describe("AC#18 — every skeleton announces itself exactly once", () => {
  // -------------------------------------------------------------------------------------------
  // GUARD THE GUARD, FIRST. Every assertion below runs inside `it.each` over `CASES`; a `CASES`
  // that lost an entry would silently stop testing a component while the suite stayed green, and
  // the bar loop is a `for…of` that an empty list satisfies perfectly.
  // -------------------------------------------------------------------------------------------

  it("covers all three declared skeleton shapes", () => {
    expect(CASES).toHaveLength(3);
    for (const testCase of CASES) {
      expect([...SELECTOR_IDS], `${testCase.name} renders an undeclared id`).toContain(
        testCase.testId,
      );
    }
  });

  it("proves role=status takes NO accessible name from its content", () => {
    // THE MEASUREMENT THAT PUT `aria-label` ON ALL THREE COMPONENTS, as a runnable control rather
    // than a header sentence. The markup below is exactly what `11-UI-SPEC § Loading` prescribes in
    // prose, and its accessible name is the empty string. If a future ARIA/dom-accessibility-api
    // change ever makes `status` name-from-content, THIS test fails — and the correct response is to
    // delete it together with the `aria-label`s, not to relax it.
    render(
      <div role="status" aria-busy="true" data-testid="content-named">
        <span className="sr-only">{LABEL}</span>
      </div>,
    );
    expect(screen.queryAllByRole("status")).toHaveLength(1);
    expect(
      screen.queryAllByRole("status", { name: LABEL }),
      "a status region named only by its content would make the aria-label redundant",
    ).toHaveLength(0);
  });

  it("can tell one status region from two", () => {
    // The counting mechanism the two watched reds rely on, controlled here so those probes are
    // backed by an assertion rather than by memory.
    render(
      <div>
        <div role="status" aria-label="one" />
        <div role="status" aria-label="two" />
      </div>,
    );
    expect(screen.queryAllByRole("status")).toHaveLength(2);
  });

  // -------------------------------------------------------------------------------------------
  // The contract, per shape.
  // -------------------------------------------------------------------------------------------

  it.each(CASES)("$name renders one named, busy status region", ({ name, testId, element }) => {
    const { container } = render(element);

    // EXACTLY ONE — an equality, never a floor. Zero means the fill is the only carrier of
    // "loading"; two means the same load is announced twice. A floor sees neither of those.
    const regions = screen.queryAllByRole("status");
    expect(
      regions.length,
      `${name} must render exactly one role="status" — found ${regions.length}. Zero leaves the ` +
        "1.09:1 fill as the only carrier of the loading state, which turns contrast-pairs.ts's two " +
        "skeleton exclusions into real WCAG 1.4.11 failures. Two status regions in one skeleton " +
        "announce the same load twice.",
    ).toBe(1);

    const region = regions[0];
    expect(region.getAttribute("aria-busy"), `${name}'s status region must be aria-busy`).toBe(
      "true",
    );
    expect(region.getAttribute("data-testid"), `${name} must carry its declared hook`).toBe(testId);

    // The NAME, and it must equal the label the surface passed — not merely be non-empty, or a
    // hardcoded sentence inside `patterns/` would satisfy it.
    expect(
      region.getAttribute("aria-label"),
      `${name}'s status region must be named by the label it was passed; role="status" is ` +
        "nameFrom:author, so an sr-only child alone leaves it \"\"",
    ).toBe(LABEL);
    expect(screen.queryAllByRole("status", { name: LABEL })).toHaveLength(1);

    // …and the live region's CONTENT, which is the other half and a different mechanism.
    const srOnly = container.querySelectorAll(".sr-only");
    expect(srOnly, `${name} must carry exactly one sr-only label element`).toHaveLength(1);
    expect(srOnly[0].textContent).toBe(LABEL);
  });

  it.each(CASES)("$name hides every pulse bar from assistive technology", ({ name, element }) => {
    const { container } = render(element);
    const bars = container.querySelectorAll(BAR_SELECTOR);

    // Guard-the-guard on the loop below: a skeleton with no bars would satisfy "every bar is
    // hidden" without hiding anything, which is the vacuity shape plan 11-02's probe (d) measured.
    expect(bars.length, `${name} rendered no pulse bars at all`).toBeGreaterThan(0);

    const exposed = [...bars].filter((bar) => bar.getAttribute("aria-hidden") !== "true");
    expect(
      [...exposed].map((bar) => bar.className),
      `${name} exposes ${exposed.length} pulse bar(s) to assistive technology. A decorative ` +
        "placeholder that is announced turns a 1.09:1 fill into meaningful non-text content.",
    ).toEqual([]);
  });

  // -------------------------------------------------------------------------------------------
  // The count props, asserted so the bar loops above are running over a shape the surface chose.
  // -------------------------------------------------------------------------------------------

  it("wires the count props through rather than ignoring them", () => {
    const { container: grid } = render(<CardGridSkeleton label={LABEL} count={2} />);
    // Three bars per cell — one media block and two text bars.
    expect(grid.querySelectorAll(BAR_SELECTOR)).toHaveLength(6);
    cleanup();

    const { container: rowList } = render(<RowListSkeleton label={LABEL} rows={2} />);
    expect(rowList.querySelectorAll(BAR_SELECTOR)).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 12-UI-SPEC AC#16 — THE TWO CALENDAR SKELETONS (plan 12-09 · BFLOW-05)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// WHY THEY ARE A SECOND BLOCK RATHER THAN TWO MORE `CASES` ROWS. Everything above is about
// `src/components/patterns/**` — a layer with a declared no-product-copy rule (`label` is required and
// has no default, so the sentence belongs to the surface) and a declared one-hook-per-shape rule. The
// two below are DOMAIN components: one takes its sentence from the day it is loading, the other owns
// its sentence outright because the Copywriting Contract assigns it one, and only one of the two
// carries a `data-testid` at all. Folding them into `CASES` would mean loosening three assertions
// that are correct about `patterns/`, which is how a shared fixture stops being a contract.
//
// WHY THEY ARE TESTABLE AT ALL, WHICH THEY WERE NOT BEFORE THIS PLAN. The day plate used to be inline
// JSX inside `AvailabilityCalendar`, so reaching it in jsdom meant mounting react-day-picker, a
// context provider and a server action — which is why plan 12-06 could correct these two regions and
// then only assert the correction by scanning source. Plan 12-09 extracted `CalendarDaySkeleton`
// markup-for-markup, and the month plate was written as a component from the start.
//
// WHAT THIS BLOCK STILL CANNOT SEE, restated from the footer above because it bites harder here: jsdom
// has no layout engine, so it says NOTHING about the month plate being the same box as the resolved
// month grid. That is `e2e/calendar-hit-area.spec.ts`'s ±2px comparison, in a real browser, in both
// themes — and the plate exists to prevent a layout shift, so the geometry half is the requirement and
// this half is the accessibility that makes its 1.09:1 fill legal.

/** The day plate's sentence comes from the surface, exactly as the `patterns/` shapes' do. */
const DAY_LABEL = "Loading times for Friday, Aug 21";

/**
 * The month plate's sentence is the Copywriting Contract's, and the test states it as a LITERAL rather
 * than importing the component's own constant. Importing it would make this assertion true by
 * construction — the component would be compared against itself — and the sentence is a product
 * decision the contract owns, not an implementation detail the component may change silently.
 */
const MONTH_LABEL = "Loading the calendar";

/**
 * The month plate takes the month it stands in for, and this file has to pick one (19.1 · D-A2).
 *
 * It used to take nothing and reserve six week rows unconditionally, which is why the count assertion
 * below could be the literal `7 * 6 + 7 + 1`. A month folds into 4, 5 or 6 rows, so that literal was a
 * fact about August 2026 rather than about the plate. The cases here name a FIVE-row month and a
 * SIX-row one and derive the expected bar count from each, because a plate checked only in a six-row
 * month is exactly how the original assumption survived.
 *
 * The row counts are stated as literals rather than imported from `weekRowsForMonth`: importing the
 * component's own arithmetic would make the count assertion true by construction, which is the
 * mistake the MONTH_LABEL note above already refuses to make. The helper is checked against a second
 * derivation and against the real react-day-picker grid in
 * `tests/design/calendar-plate-month.test.tsx`; here it is simply given a month and held to a number.
 */
const FIVE_ROW_MONTH = { year: 2026, month: 9 } as const; // 1 Sept 2026 is a Tuesday, 30 days
const SIX_ROW_MONTH = { year: 2027, month: 1 } as const; // 1 Jan 2027 is a Friday, 31 days

const CALENDAR_CASES = [
  {
    name: "CalendarDaySkeleton",
    label: DAY_LABEL,
    testId: null,
    element: <CalendarDaySkeleton label={DAY_LABEL} />,
  },
  {
    name: "CalendarMonthSkeleton",
    label: MONTH_LABEL,
    testId: "skeleton-calendar",
    element: <CalendarMonthSkeleton month={FIVE_ROW_MONTH} />,
  },
] as const;

describe("AC#16 — the calendar's two skeletons announce themselves exactly once", () => {
  it("covers both calendar skeleton shapes, and the one that declares a hook declares it", () => {
    // Guard-the-guard: an `it.each` over a list that lost an entry is green and tests nothing.
    expect(CALENDAR_CASES).toHaveLength(2);
    for (const testCase of CALENDAR_CASES) {
      if (testCase.testId === null) continue;
      expect(
        [...SELECTOR_IDS],
        `${testCase.name} renders an id that GATE-04's inventory does not declare`,
      ).toContain(testCase.testId);
    }
  });

  it.each(CALENDAR_CASES)("$name renders one named, busy status region", ({ name, label, element }) => {
    render(element);

    const regions = screen.queryAllByRole("status");
    expect(
      regions.length,
      `${name} must render exactly one role="status" — found ${regions.length}. Zero leaves the ` +
        "1.09:1 fill as the only carrier of the loading state, which turns contrast-pairs.ts's two " +
        "skeleton exclusions into real WCAG 1.4.11 failures. Two announce one wait twice, which is " +
        "rule 6 of the live-region inventory.",
    ).toBe(1);

    const region = regions[0];
    expect(region.getAttribute("aria-busy"), `${name}'s status region must be aria-busy`).toBe("true");

    // NO `aria-live` ATTRIBUTE. `role="status"` is already implicitly polite, and writing the
    // attribute beside it on a LOADING region is how `search-results.tsx`'s original defect looked in
    // review — correct-seeming markup around a region with nothing to announce.
    expect(
      region.getAttribute("aria-live"),
      `${name} writes an explicit aria-live beside role="status"; the role is already implicitly ` +
        "polite and `patterns/card-grid-skeleton.tsx` is the shape these two follow",
    ).toBeNull();

    // THE NAME, computed rather than read off the attribute — this is the clause that would go red on
    // a "simplification" that drops the `aria-label` as redundant, leaving the sr-only child in place
    // and the region computing "".
    expect(
      screen.queryAllByRole("status", { name: label }),
      `${name}'s status region must compute the accessible name "${label}". role="status" is ` +
        "nameFrom:author, so an sr-only child alone leaves it empty — see the synthetic control above.",
    ).toHaveLength(1);
    expect(
      screen.queryAllByRole("status", { name: "" }),
      `${name} computed an EMPTY accessible name, which is the defect this file exists for`,
    ).toHaveLength(0);
  });

  it.each(CALENDAR_CASES)("$name carries its live region's CONTENT as well as its name", ({
    name,
    label,
    element,
  }) => {
    const { container } = render(element);
    const srOnly = container.querySelectorAll(".sr-only");
    expect(srOnly, `${name} must carry exactly one sr-only label element`).toHaveLength(1);
    expect(
      srOnly[0].textContent,
      `${name}'s sr-only content and its aria-label must come from ONE binding — two sentences for ` +
        "one wait is two answers to the same question",
    ).toBe(label);
  });

  it.each(CALENDAR_CASES)("$name hides every placeholder bar from assistive technology", ({
    name,
    element,
  }) => {
    const { container } = render(element);
    const bars = container.querySelectorAll(BAR_SELECTOR);
    expect(bars.length, `${name} rendered no placeholder bars at all`).toBeGreaterThan(0);

    const exposed = [...bars].filter((bar) => bar.getAttribute("aria-hidden") !== "true");
    expect(
      exposed.map((bar) => bar.className),
      `${name} exposes ${exposed.length} placeholder bar(s) to assistive technology. A decorative ` +
        "1.09:1 fill that is announced is meaningful non-text content, and the exclusion rows in " +
        "contrast-pairs.ts stop being true.",
    ).toEqual([]);
  });

  it.each([
    { label: "a five-row month (2026-09)", month: FIVE_ROW_MONTH, rows: 5 },
    { label: "a six-row month (2027-01)", month: SIX_ROW_MONTH, rows: 6 },
  ])(
    "the month plate renders a full 7 × N grid for $label, plus a caption and a weekday row",
    ({ month, rows }) => {
      // The COUNT is the geometry claim this layer can actually make. jsdom cannot measure the box,
      // but it can prove the plate is a MONTH rather than three bars in a border: `rows` × 7 day cells
      // + 7 weekday marks + 1 caption. A plate with fewer cells would be the right height only by
      // accident — and a plate with a CONSTANT number of cells is the right height only in the two
      // months of twelve that happen to have that many rows (19.1 · D-A2).
      const { container } = render(<CalendarMonthSkeleton month={month} />);
      expect(container.querySelectorAll(BAR_SELECTOR)).toHaveLength(rows * 7 + 7 + 1);
    },
  );

  it("the month plate carries its declared hook as a string literal on the region itself", () => {
    render(<CalendarMonthSkeleton month={FIVE_ROW_MONTH} />);
    const region = screen.queryAllByRole("status")[0];
    expect(
      region.getAttribute("data-testid"),
      "the hook must be on the REGION, because e2e/calendar-hit-area.spec.ts measures that element's " +
        "box against the resolved calendar's",
    ).toBe("skeleton-calendar");
  });
});
