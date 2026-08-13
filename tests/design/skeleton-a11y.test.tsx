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
