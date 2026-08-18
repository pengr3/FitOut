import { expect, type Page } from "@playwright/test";

// AC#29's MEASUREMENT, extracted so two specs share ONE definition of "nothing scrolls sideways".
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS MOVED OUT OF `overflow-320.spec.ts` (plan 12-11)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// That spec's whole design principle is that it NEEDS NO SEED: its route table discovers a listing id
// from the running catalogue and every other row is a static path, which is what lets thirteen route
// rows × two themes run without a database fixture. Its `/listings/[id]/book` row is the one that pays
// for that — reaching the RESOLVED checkout requires a session, a bookable listing and an open slot, so
// the row measures the SERVED, pre-hydration document instead (`served: true`), and the checkout's own
// header records the measurement behind that choice.
//
// Plan 12-11 put a fixed 64px confirm bar and a full-width disclosure trigger on that route, and neither
// is in the served skeleton. So the resolved checkout genuinely needed measuring at 320px — and the
// obvious move, adding a seeded row to that table, is the one `deferred-items.md` warns against by name:
// four DB-seeding specs already share one Postgres with a `postgres({max:1})` client apiece, the
// contention flake has been recorded four times, and that file says *"worth a real fix … before a fifth
// one lands."* Adding two seeded cases to a 26-case table would have made the cheapest gate in the suite
// depend on the flakiest thing in it.
//
// So the MEASUREMENT moved instead of the seed. `e2e/mobile-booker-path.spec.ts` already mints a real
// hold at phone widths; it takes the resolved checkout to 320px and calls the same function. Two specs,
// two fixtures, one definition of the assertion — which is the property that matters, because a second
// copy of this scan would be free to disagree with the first about what "clipped" means.

/** The floor. Not a breakpoint — the narrowest viewport the UI-SPEC's responsive baseline names. */
export const FLOOR_PX = 320;

/**
 * Sub-pixel tolerance, in `scroll-area-overflow.spec.ts:123`'s form.
 *
 * 0.5 rather than 0: `scrollWidth` is an integer but `clientWidth` can be affected by a fractional
 * scrollbar gutter, and the defect this measurement is about is measured in tens of pixels — the watched
 * red in `overflow-320.spec.ts` overflowed by 80. Half a pixel is nowhere near signal.
 */
export const OVERFLOW_TOLERANCE_PX = 0.5;

/**
 * The floor on how many laid-out elements a measured page must have, and it is a MEASUREMENT.
 *
 * Every assertion built on this scan is "a number is small" or "a list is empty", and a page that
 * rendered nothing satisfies both perfectly — so the scan has to prove it looked at something. The
 * number is set from the two SMALLEST surfaces in the route table rather than chosen: the root error
 * boundary lays out 12 elements (an icon, a heading, a body line and two actions) and the served
 * checkout shell lays out 14 (a header, a wordmark, an `h1` and a panel skeleton). The first draft used
 * 20 and went red on both — a guard tuned above the thing it is guarding is a guard that gets deleted.
 * 8 sits below both and still fires on a blank document, a redirect and a 404 body.
 */
export const MIN_EXAMINED_ELEMENTS = 8;

export type OverflowMeasurement = {
  scrollWidth: number;
  clientWidth: number;
  /** Unclipped elements whose right edge is past the viewport, outermost first. */
  offenders: string[];
  /** How many elements were examined. Zero means the page was empty and the number above is free. */
  examined: number;
};

/**
 * ONE evaluate, ONE typed object, asserted in Node — `scroll-area-overflow.spec.ts:143-172`'s idiom.
 *
 * `examined` is not decoration: every assertion built on this is "a number is small" or "a list is
 * empty", and a page with no elements satisfies both perfectly.
 */
export async function measureOverflow(page: Page): Promise<OverflowMeasurement> {
  return page.evaluate(() => {
    const de = document.documentElement;
    const limit = de.clientWidth;
    const offenders: string[] = [];
    let examined = 0;

    /** True when something between `el` and the document element clips it horizontally. */
    const isClipped = (el: Element): boolean => {
      let parent = el.parentElement;
      while (parent && parent !== de) {
        const style = getComputedStyle(parent);
        if (style.overflowX !== "visible" || style.overflow !== "visible") return true;
        parent = parent.parentElement;
      }
      return false;
    };

    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      examined += 1;
      if (rect.right <= limit + 0.5) continue;
      if (isClipped(el)) continue;
      const testId = el.getAttribute("data-testid");
      const cls = typeof el.className === "string" ? el.className : "";
      offenders.push(
        `${el.tagName.toLowerCase()}${testId ? `[${testId}]` : ""}.${cls.slice(0, 48)} right=${Math.round(rect.right)}`,
      );
    }

    return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, offenders, examined };
  });
}

/**
 * The three assertions AC#29 is made of, in the order they have to run.
 *
 * The vacuity guard FIRST, because the other two are satisfied by a page with nothing on it. Then the
 * document-level claim, and then the STRONGER per-element one — which is not implied by it: an element
 * can sit past the viewport without widening the document (a `position: fixed` box, or a row inside a
 * container that scrolls on its own), and this milestone puts two `position: fixed` bars on the booker
 * path, so that clause is now the one doing the work rather than a hedge.
 */
export async function expectNoOverflow(page: Page, where: string): Promise<OverflowMeasurement> {
  const m = await measureOverflow(page);

  expect(
    m.examined,
    `${where}: the measurement examined ${m.examined} elements. A page with nothing laid out on it ` +
      "never overflows, so this number is what makes the two assertions below mean something. The " +
      `floor is ${MIN_EXAMINED_ELEMENTS} — see the constant for the two surfaces it was measured from.`,
  ).toBeGreaterThanOrEqual(MIN_EXAMINED_ELEMENTS);

  expect(
    m.scrollWidth,
    `${where}: the document scrolls horizontally — scrollWidth ${m.scrollWidth} against a clientWidth ` +
      `of ${m.clientWidth}. Offending elements (right edge past the viewport):\n` +
      (m.offenders.length
        ? m.offenders.map((o) => `  ${o}`).join("\n")
        : "  (none — the overflow comes from something this collector cannot see: a margin, a " +
          "negative offset, or an element clipped by an ancestor that is itself too wide)"),
  ).toBeLessThanOrEqual(m.clientWidth + OVERFLOW_TOLERANCE_PX);

  expect(
    m.offenders,
    `${where}: ${m.offenders.length} element(s) lay out past the ${m.clientWidth}px viewport without ` +
      "being clipped by an ancestor:\n" +
      m.offenders.map((o) => `  ${o}`).join("\n"),
  ).toEqual([]);

  return m;
}
