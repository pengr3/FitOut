import { expect, test, type Page } from "@playwright/test";

// G-01 — no ScrollArea child lays out wider than the panel it lives in, measured in real pixels in
// real Chromium.
//
// THE DEFECT. Radix renders every child of `ScrollArea.Viewport` inside ONE wrapper div and
// hardcodes `style={{ minWidth: "100%", display: "table" }}` on it
// (`@radix-ui/react-scroll-area/dist/index.mjs:130`). `display: table` shrink-wraps to max-content,
// so `min-width: 100%` is a floor with no ceiling: long unbreakable content widens the wrapper past
// the panel and the overflow is clipped. The gap was reported on the notification panel — signed in
// with 20 rows, the viewport measured 384.0px while the wrapper and every row measured 976.9px,
// overflowing 592.9px to the right. `src/components/ui/scroll-area.tsx` forces the wrapper to a
// block box; its own comment carries the full diagnosis and the horizontal-ScrollArea caveat.
//
// WHY THIS SPEC EXISTS ALONGSIDE `npm run test:design -- scroll-area`, and why neither layer alone
// is sufficient — the same two-layer argument `reduced-motion.spec.ts` makes for itself:
//
//   • The design gate reads the COMPILED stylesheet and runs inside `npm run build`
//     (`build = lint && test:design && next build`), so it is the layer that can actually stop the
//     fix being deleted. What it proves is that the rule is EMITTED.
//   • It cannot prove the rule LANDS. jsdom performs no layout — `getBoundingClientRect()` returns
//     zeros — so the claim this fix really makes, a measured width, is out of reach of every test
//     in `tests/design/**`. Widths are the actual claim, so they are measured with the same
//     instrument that produced the 384.0 / 976.9 diagnosis in the first place.
//
// WHY `/dev/theme` AND NOT THE NOTIFICATION PANEL. The panel needs an authenticated session and 20
// seeded rows; a gate with those dependencies is a gate that stops running the first time the seed
// changes. `/dev/theme` needs neither — it renders two `SlotPicker`s from static fixtures, no auth
// and no database — and it is the page `reduced-motion.spec.ts` already drives. The real panel was
// confirmed once by hand and that measurement lives in the plan's SUMMARY, not in a spec.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// TWO TRAPS THIS FILE IS BUILT AROUND. Both produce a GREEN result against a page proving nothing.
//
//   1. EVERY "NOTHING OVERFLOWS" ASSERTION PASSES PERFECTLY AGAINST A PAGE THAT RENDERS NO
//      SCROLLAREA AT ALL. `expect(all).toPass()` over an empty list is a pass. So the viewport count
//      is asserted FIRST and by name, before any width is read. The observed count on this page is
//      2 (one `SlotPicker` per theme pane); the assertion is `>= 1` so deleting a pane is not a
//      failure, but deleting the component is.
//
//   2. AN INERT PROBE MAKES THE PROBE ASSERTION VACUOUS. The oversized-content probe below is what
//      makes this gate independent of what the fixtures happen to render — under `display: table`
//      the wrapper shrink-wraps to the probe, so the pre-fix code fails BY CONSTRUCTION rather than
//      by hoping some seeded listing title is long enough. But a probe that did not actually
//      overflow would make "the wrapper is still within the viewport" trivially true. So the probe
//      asserts its own oversize (`scrollWidth > viewport.clientWidth`) before the width claim is
//      read — exactly what `readPulse` returns `animationName` for in `reduced-motion.spec.ts`.
//
// AND ONE INHERITED TRAP — STALE CSS FROM A REUSED DEV SERVER (`reduced-motion.spec.ts` trap 4).
// `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, and the dev server is what
// serves the compiled stylesheet. A server left running across a `git checkout` of
// `src/components/ui/scroll-area.tsx` can keep serving CSS that no longer matches the tree. IF THIS
// FILE FAILS ON A CLEAN `git status`, KILL THE SERVER ON :3000 AND RE-RUN BEFORE TOUCHING THE
// COMPONENT. The false-green twin — someone deletes the override, a stale server keeps serving the
// rule — is closed at the other layer: the design gate reads the source tree and recompiles, and it
// runs inside `npm run build`.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// RED RUN — 2026-08-13. Recorded verbatim, because a gate nobody watched fail is not a gate.
//
//   Mutation: the override token was deleted from the Viewport's `className` in
//   `src/components/ui/scroll-area.tsx`. The dev server that had been running on :3000 was stopped
//   first, so Playwright booted its own against the mutated tree and trap 4 could not launder the
//   result.
//
//   `npx playwright test e2e/scroll-area-overflow.spec.ts`
//
//   (Pasted verbatim, so the `:216` / `:255` line references are the ones that run printed. They
//   have since shifted to 222 / 260 — this record grew, and the run carried two temporary
//   `console.log`s that dumped the measurement objects and were removed before commit.)
//
//     x  1 [chromium] › e2e\scroll-area-overflow.spec.ts:216:7 › G-01 — ScrollArea wrapper › the
//        wrapper computes to display:block and fits inside its panel (4.0s)
//        Error: viewport #0: the Radix wrapper computes display:table — the override is not applying
//        expect(received).toBe(expected) // Object.is equality
//        Expected: "block"
//        Received: "table"
//
//     x  2 [chromium] › e2e\scroll-area-overflow.spec.ts:255:7 › G-01 — ScrollArea wrapper › an
//        oversized child cannot widen the wrapper past the panel (2.2s)
//        Error: viewport #0: the wrapper widened to 2510.140625px inside a 578px panel
//        expect(received).toBeLessThanOrEqual(expected)
//        Expected: <= 578.5
//        Received:    2510.140625
//
//     2 failed
//
//   MEASURED IN BOTH DIRECTIONS, per viewport — the two panes measured IDENTICALLY in every run:
//
//     unfixed, no probe    viewport 578px   wrapper  578.0px   child 578px   display: table
//     unfixed, with probe  viewport 578px   wrapper 2510.1px   probe scrollWidth 2510px
//     FIXED,   no probe    viewport 578px   wrapper  578.0px   child 578px   display: block
//     FIXED,   with probe  viewport 578px   wrapper  578.0px   probe scrollWidth 2510px
//
//   THE FIRST LINE IS THE WHOLE ARGUMENT FOR THE PROBE, AND IT IS THE FINDING OF THIS RUN. Unfixed
//   and unprobed, this page measures 578 = 578 and its one rendered child measures 578 too: the
//   `/dev/theme` fixtures are short time chips in a wrapping flex row, so they never trigger the
//   shrink-wrap on their own. BOTH WIDTH ASSERTIONS — the wrapper's and the children's — PASSED
//   AGAINST THE BROKEN PRIMITIVE. Only the computed-`display` assertion and the probe caught it.
//   A spec written the obvious way (measure the page, assert nothing overflows) would have been
//   green here on day one and green forever after, and would have been reported as covering G-01.
//
//   That is why the mechanism is asserted separately from the symptom, and why the probe exists:
//   it turns "this page happens to be fine" into "this wrapper CANNOT be widened", which is the
//   claim the fix actually makes. The probe's own `scrollWidth` is identical (2510px) in both
//   directions — it is genuinely oversized either way; what changes is whether the wrapper follows
//   it from 578px to 2510px.
//
//   GREEN RUN, token restored, same command: 2 passed (18.6s cold, ~5s warm).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file:
//   • One page and one viewport size (Playwright's Desktop Chrome default). It does not sweep
//     breakpoints, and it does not visit the notification panel.
//   • It proves nothing about VERTICAL behaviour. IN-14's `max-h-[inherit]` is a separate fix with
//     its own evidence; nothing here would notice if scrolling broke.
//   • It cannot see a horizontal ScrollArea, because none exists. If one is ever added, this spec
//     will assert the wrong thing about it — read the caveat in the component before adding one.

const PAGE = "/dev/theme";

/** Subpixel tolerance. The diagnosis measured 976.9 against 384.0, so this is nowhere near signal. */
const TOLERANCE_PX = 0.5;

type ViewportMeasurement = {
  index: number;
  /** `false` means Radix rendered no wrapper at all — a structural failure, never an empty pass. */
  wrapperFound: boolean;
  viewportClientWidth: number;
  wrapperWidth: number;
  wrapperDisplay: string;
  /** Every DIRECT child of the wrapper — the app's own content. */
  childWidths: number[];
};

/**
 * Measure every ScrollArea viewport on the page as it renders.
 *
 * `viewport.firstElementChild` is the div Radix hardcodes; the app's own children are nested one
 * level deeper, inside it. Both levels are measured because they fail differently: the wrapper is
 * the mechanism, the children are the symptom a human sees.
 */
async function measureViewports(page: Page): Promise<ViewportMeasurement[]> {
  return page.evaluate(() => {
    const viewports = Array.from(
      document.querySelectorAll('[data-slot="scroll-area-viewport"]'),
    );
    return viewports.map((viewport, index) => {
      const wrapper = viewport.firstElementChild as HTMLElement | null;
      if (wrapper === null) {
        return {
          index,
          wrapperFound: false,
          viewportClientWidth: viewport.clientWidth,
          wrapperWidth: 0,
          wrapperDisplay: "",
          childWidths: [] as number[],
        };
      }
      return {
        index,
        wrapperFound: true,
        viewportClientWidth: viewport.clientWidth,
        wrapperWidth: wrapper.getBoundingClientRect().width,
        wrapperDisplay: getComputedStyle(wrapper).display,
        childWidths: Array.from(wrapper.children).map(
          (child) => child.getBoundingClientRect().width,
        ),
      };
    });
  });
}

type ProbeMeasurement = {
  index: number;
  viewportClientWidth: number;
  /** The probe's own content extent. Asserted to exceed the panel, or the next number means nothing. */
  probeScrollWidth: number;
  wrapperWidth: number;
};

/**
 * Append ~300 unbreakable characters INTO the wrapper (not as a sibling of it), measure, remove.
 *
 * Under `display: table` the wrapper shrink-wraps to this child and blows past the panel, so the
 * unfixed primitive fails here by construction. The probe is removed inside the same evaluate, so
 * nothing survives into another assertion or a screenshot.
 */
async function measureWithProbe(page: Page): Promise<ProbeMeasurement[]> {
  return page.evaluate(() => {
    // No spaces and no hyphens: nothing here gives the line breaker anywhere to break.
    const PROBE_TEXT = "G01overflowprobe".repeat(19);
    const viewports = Array.from(
      document.querySelectorAll('[data-slot="scroll-area-viewport"]'),
    );
    return viewports.map((viewport, index) => {
      const wrapper = viewport.firstElementChild as HTMLElement;
      const probe = document.createElement("div");
      probe.dataset.g01Probe = "true";
      probe.textContent = PROBE_TEXT;
      probe.style.whiteSpace = "nowrap";
      wrapper.appendChild(probe);
      const measurement = {
        index,
        viewportClientWidth: viewport.clientWidth,
        probeScrollWidth: probe.scrollWidth,
        wrapperWidth: wrapper.getBoundingClientRect().width,
      };
      probe.remove();
      return measurement;
    });
  });
}

/** Trap 1: assert the page renders the thing under test before asserting anything about it. */
function expectReachable(count: number) {
  expect(
    count,
    `${PAGE} rendered NO [data-slot="scroll-area-viewport"] — every width assertion in this file ` +
      "passes vacuously against a page with no ScrollArea on it, so this is a failure, not a skip. " +
      "Two are expected (one SlotPicker per theme pane).",
  ).toBeGreaterThanOrEqual(1);
}

test.describe("G-01 — ScrollArea wrapper", () => {
  test("the wrapper computes to display:block and fits inside its panel", async ({
    page,
  }) => {
    await page.goto(PAGE);
    const measurements = await measureViewports(page);
    expectReachable(measurements.length);

    for (const m of measurements) {
      expect(
        m.wrapperFound,
        `viewport #${m.index}: Radix rendered no content wrapper`,
      ).toBe(true);

      // The mechanism. This is the assertion a source scan can never make: a class that is present
      // but never compiled, or compiled but outranked, reads exactly like a correct one in source
      // and shows up here as `table`.
      expect(
        m.wrapperDisplay,
        `viewport #${m.index}: the Radix wrapper computes display:${m.wrapperDisplay} — the override is not applying`,
      ).toBe("block");

      // The claim.
      expect(
        m.wrapperWidth,
        `viewport #${m.index}: the wrapper measures ${m.wrapperWidth}px inside a ${m.viewportClientWidth}px panel`,
      ).toBeLessThanOrEqual(m.viewportClientWidth + TOLERANCE_PX);

      // The symptom. Real rendered content, not just the wrapper — this is the level the developer
      // actually saw clipped.
      m.childWidths.forEach((width, childIndex) => {
        expect(
          width,
          `viewport #${m.index} child #${childIndex}: ${width}px inside a ${m.viewportClientWidth}px panel`,
        ).toBeLessThanOrEqual(m.viewportClientWidth + TOLERANCE_PX);
      });
    }
  });

  test("an oversized child cannot widen the wrapper past the panel", async ({
    page,
  }) => {
    await page.goto(PAGE);
    const measurements = await measureWithProbe(page);
    expectReachable(measurements.length);

    for (const m of measurements) {
      // Trap 2: the probe must genuinely overflow, or the assertion after it is decorative.
      expect(
        m.probeScrollWidth,
        `viewport #${m.index}: the probe is not oversized (${m.probeScrollWidth}px against a ` +
          `${m.viewportClientWidth}px panel) — it proves nothing in this state`,
      ).toBeGreaterThan(m.viewportClientWidth);

      expect(
        m.wrapperWidth,
        `viewport #${m.index}: the wrapper widened to ${m.wrapperWidth}px inside a ${m.viewportClientWidth}px panel`,
      ).toBeLessThanOrEqual(m.viewportClientWidth + TOLERANCE_PX);
    }
  });
});
