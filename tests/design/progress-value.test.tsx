// @vitest-environment jsdom

// WR-06 (phase-17 code review) — a `role="progressbar"` that FILLS must also SAY how full it is.
//
// WHAT THE DEFECT WAS. `src/components/ui/progress.tsx` destructured `value` out of the props spread
// and spent it on the indicator's `translateX` only, so it never reached `ProgressPrimitive.Root`.
// Radix treats a missing `value` as INDETERMINATE and omits both `aria-valuenow` and `aria-valuetext`
// (`node_modules/@radix-ui/react-progress/dist/index.mjs:16,29,35`). The shipped element was therefore
// `role="progressbar"` with a name, an `aria-valuemin` and an `aria-valuemax`, a bar visibly filled to
// N% — and no current value anywhere in the accessibility tree. That is SC 4.1.2's Value clause, on
// the host listing wizard (`src/app/(host)/host/listings/[id]/edit/wizard.tsx`).
//
// WHY THIS FILE HAD TO EXIST FOR IT TO BE CAUGHT. `aria-valuenow` is OPTIONAL for `progressbar` — an
// indeterminate bar is legal ARIA — so no axe rule fires and the GATE-02 sweep that found this same
// bar's missing NAME was green on its missing VALUE. A source scan would be no better: the old file
// mentioned `value` three times and forwarded it zero. Only a RENDER can tell the difference, which is
// why every assertion below reads the computed DOM rather than the source text.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — the fix reverted, verbatim, then restored (30 August 2026)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `value={value}` deleted from `ProgressPrimitive.Root` in `src/components/ui/progress.tsx`, leaving
// the file byte-for-byte as it shipped before this review:
//
//   × forwards `value` to Root, so the bar has a current value at all
//     → AssertionError: <Progress value={42} /> rendered no aria-valuenow. Radix omits the attribute
//       when `value` does not reach Root, which is exactly the WR-06 defect: the bar fills to 42% and
//       announces as indeterminate.: expected null to be '42' // Object.is equality
//   × derives the human-readable aria-valuetext Radix computes from the value
//     → AssertionError: expected null to be '17%' // Object.is equality
//   × moves aria-valuenow with the value, rather than pinning one number
//     → AssertionError: expected null to be '16.666666666666664' // Object.is equality
//   × keeps the indicator's transform and the announced value in agreement
//     → AssertionError: expected null to be '42' // Object.is equality
//   × still forwards the call site's own props alongside the value
//     → AssertionError: expected null to be '16.666666666666664' // Object.is equality
//
//   5 failed / 2 passed. The two that stayed green are the guard-the-guard query control and the
//   INDETERMINATE case, and that split is the correct one rather than a gap: both assert the ABSENCE
//   of a value, and the defect was an absence. Restored → 7 passed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   • ANNOUNCEMENT. Whether a screen reader speaks "17%" is browser + AT behaviour, not a DOM
//     property. What is pinned here is the markup contract that makes the announcement possible.
//   • GEOMETRY. jsdom has no layout engine, so the `translateX` assertion below reads the inline
//     style string, not a painted box. That the bar is 42% WIDE is GATE-01's business.
//   • THE CALL SITE. This file tests the primitive. That `wizard.tsx` passes a sane 0–100 float is
//     that file's own concern; the case table below covers the range it can produce.

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { Progress } from "@/components/ui/progress";

afterEach(() => {
  cleanup();
});

/** The wizard's real arithmetic: `((stepInList + 1) / steps.length) * 100` over a six-step list. */
const WIZARD_STEP_1_OF_6 = (1 / 6) * 100;

describe("WR-06 — the Progress primitive forwards its value into the accessibility tree", () => {
  // -------------------------------------------------------------------------------------------
  // GUARD THE GUARD, FIRST. Every assertion below is "this attribute has this value". A query that
  // silently matched nothing would make `?.getAttribute()` return undefined and several of these
  // read as vacuously satisfiable, so the query itself is controlled before it is trusted.
  // -------------------------------------------------------------------------------------------

  it("finds exactly one progressbar, and finds nothing when nothing is rendered", () => {
    expect(screen.queryAllByRole("progressbar")).toHaveLength(0);
    render(<Progress value={42} />);
    expect(screen.queryAllByRole("progressbar")).toHaveLength(1);
  });

  it("still renders an INDETERMINATE bar when no value is passed — the legal ARIA case", () => {
    // The negative control, and it is not a formality: if this went red the fix would have replaced
    // "no value ever" with "a value always", which is a different wrong answer. A caller that wants
    // an indeterminate bar must still be able to have one by passing no `value`.
    render(<Progress />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBeNull();
    expect(bar.getAttribute("aria-valuetext")).toBeNull();
    expect(bar.getAttribute("data-state")).toBe("indeterminate");
  });

  // -------------------------------------------------------------------------------------------
  // The contract.
  // -------------------------------------------------------------------------------------------

  it("forwards `value` to Root, so the bar has a current value at all", () => {
    render(<Progress value={42} />);
    const bar = screen.getByRole("progressbar");
    expect(
      bar.getAttribute("aria-valuenow"),
      "<Progress value={42} /> rendered no aria-valuenow. Radix omits the attribute when `value` " +
        "does not reach Root, which is exactly the WR-06 defect: the bar fills to 42% and announces " +
        "as indeterminate.",
    ).toBe("42");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("derives the human-readable aria-valuetext Radix computes from the value", () => {
    // THIS IS THE ATTRIBUTE AN AT ACTUALLY SPEAKS, and it is the reason the call site is allowed to
    // pass an unrounded float: Radix's `defaultGetValueLabel` is `${Math.round(value / max * 100)}%`
    // (index.mjs:66-68), so 16.666… announces as "17%" without the call site rounding anything.
    render(<Progress value={WIZARD_STEP_1_OF_6} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuetext")).toBe("17%");
    expect(bar.getAttribute("aria-valuenow")).toBe(String(WIZARD_STEP_1_OF_6));
  });

  it("moves aria-valuenow with the value, rather than pinning one number", () => {
    // A single-value assertion is satisfied by a hardcoded attribute. Six rows — the wizard's real
    // step ladder, ends included — are not.
    for (const step of [0, 1, 2, 3, 4, 5]) {
      const value = ((step + 1) / 6) * 100;
      render(<Progress value={value} />);
      expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(String(value));
      cleanup();
    }
    render(<Progress value={0} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
  });

  it("keeps the indicator's transform and the announced value in agreement", () => {
    // The whole defect was these two disagreeing — the CSS knew the number and the a11y tree did
    // not — so they are asserted TOGETHER, from one render, rather than in separate tests that
    // could both pass while describing different bars.
    const { container } = render(<Progress value={42} />);
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator, "the primitive rendered no indicator to compare against").not.toBeNull();
    expect((indicator as HTMLElement).style.transform).toBe("translateX(-58%)");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("42");
  });

  it("still forwards the call site's own props alongside the value", () => {
    // `aria-labelledby` is what plan 17-07 added at the wizard call site. It rides `...props`, and
    // the WR-06 fix must not have changed the order in a way that drops it — or the NAME clause the
    // phase closed would regress while the VALUE clause was being fixed.
    render(
      <>
        <p id="progress-label">Step 1 of 6</p>
        <Progress value={WIZARD_STEP_1_OF_6} aria-labelledby="progress-label" className="mt-2" />
      </>,
    );
    const bar = screen.getByRole("progressbar", { name: "Step 1 of 6" });
    expect(bar.getAttribute("aria-valuenow")).toBe(String(WIZARD_STEP_1_OF_6));
    expect(bar.className).toContain("mt-2");
  });
});
