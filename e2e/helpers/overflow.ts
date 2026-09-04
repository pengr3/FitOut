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

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE OVERLAY MEASUREMENT (plan 16-15) — AND WHY THE ONE ABOVE CANNOT ANSWER FOR AN OPEN MODAL
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ EVERY CLAUSE IN `expectNoOverflow` IS SATISFIED BY CONSTRUCTION WHILE A RADIX MODAL IS OPEN. That
// is not a hedge, it is three measurements taken on 26 August 2026 in real Chromium at 320x800:
//
//   (1) `document.body` COMPUTES `overflow: hidden` THE MOMENT A MODAL OPENS. Measured `visible` on
//       all seven ordinary routes in the table (`/`, `/terms`, `/privacy`, `/login`, `/signup`,
//       `/forgot-password`, `/reset-password`) and `hidden` — with `position: relative` — on
//       `/listings/[id]` with the booking sheet open and on `/profile` with the crop dialog open.
//       That is `react-remove-scroll`'s scroll lock, which the vendored dialog primitive installs.
//
//   (2) SO THE DOCUMENT CLAUSE GOES QUIET. `<body>` is a 320px box that now clips its own content, so
//       `documentElement.scrollWidth` can no longer exceed `clientWidth` whatever is inside it.
//       MEASURED by appending a 500px-wide `<div>` straight into the open dialog: `scrollWidth` 320,
//       `clientWidth` 320. The document says the page is fine while a fifth of the overlay's content
//       is unreachable.
//
//   (3) AND THE PER-ELEMENT CLAUSE GOES QUIET TWICE OVER. `isClipped` walks ancestors up to (but not
//       including) the document element, so it walks THROUGH `<body>` and reports every element on
//       the page as clipped — and separately, `DialogContent` itself computes `overflow-x: auto`
//       (Tailwind's `overflow-y-auto` makes the other axis compute to `auto` per CSS), so anything
//       inside it is clipped by the overlay's own box as well. The same injected 500px div came back
//       with `offenders: []`.
//
// So a row that opens an overlay and calls only `expectNoOverflow` measures NOTHING — it reports the
// state as covered and cannot fail. That is the measurement-side twin of the vacuity the route table's
// `tell` mechanism exists to catch, and it is why this second function is not a second copy of the
// first: it asks a DIFFERENT question, the one that is still answerable once the document's answer has
// been suppressed. Does anything inside the overlay lay out past the OVERLAY'S OWN right edge, and does
// the overlay's own box scroll sideways?
//
// SAME INJECTED DIV, ASKED THAT WAY: the crop dialog reported `scrollWidth 532` against `clientWidth
// 320` and 14 named offenders; the booking sheet reported 532 against 320 and 48. Clean, both report
// `320 === 320` and an empty list. That is a gate.
//
// ⚠ THE ANCESTOR WALK STOPS AT THE SCOPE, WHICH IS THE WHOLE TRICK. The scope element is the one doing
// the hiding, so treating its overflow as a clip would reproduce the defect this function exists to
// fix. Containers BETWEEN an element and the scope still clip — the sheet's own `max-h-72` scroll area
// is a real scroll container and an element inside it is not an overflow defect, which is the identical
// argument `collectOffenders` above makes for the map pane.

export type ScopedOverflowMeasurement = {
  /** False when the selector matched nothing — asserted before anything else is read. */
  found: boolean;
  /** The scope's own horizontal scroll extent and its visible width. */
  scrollWidth: number;
  clientWidth: number;
  /** Descendants past the scope's right edge that nothing between them and the scope clips. */
  offenders: string[];
  /** Laid-out descendants examined. Zero means the scope was empty and the numbers above are free. */
  examined: number;
};

/** One evaluate, one typed object, asserted in Node — the same idiom as `measureOverflow`. */
export async function measureOverflowWithin(
  page: Page,
  selector: string,
): Promise<ScopedOverflowMeasurement> {
  return page.evaluate((sel) => {
    const scope = document.querySelector<HTMLElement>(sel);
    if (!scope) return { found: false, scrollWidth: 0, clientWidth: 0, offenders: [], examined: 0 };

    const limit = scope.getBoundingClientRect().right;
    const offenders: string[] = [];
    let examined = 0;

    /** True when something between `el` and the SCOPE clips it horizontally. The scope itself does not. */
    const isClipped = (el: Element): boolean => {
      let parent = el.parentElement;
      while (parent && parent !== scope) {
        const style = getComputedStyle(parent);
        if (style.overflowX !== "visible" || style.overflow !== "visible") return true;
        parent = parent.parentElement;
      }
      return false;
    };

    for (const el of Array.from(scope.querySelectorAll<HTMLElement>("*"))) {
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

    return { found: true, scrollWidth: scope.scrollWidth, clientWidth: scope.clientWidth, offenders, examined };
  }, selector);
}

/**
 * AC#29, asked of an open overlay rather than of the document it has suppressed.
 *
 * Four assertions, in the order they have to run: the scope exists, it laid something out, its own box
 * does not scroll sideways, and nothing unclipped inside it reaches past its right edge. The first two
 * are the vacuity guards and they are not optional here — a selector that matched nothing and a scope
 * with nothing in it both satisfy the last two perfectly, which is the exact failure that made this
 * function necessary in the first place.
 */
export async function expectNoOverflowWithin(
  page: Page,
  selector: string,
  where: string,
): Promise<ScopedOverflowMeasurement> {
  const m = await measureOverflowWithin(page, selector);

  expect(
    m.found,
    `${where}: no element matched \`${selector}\`, so the scoped measurement measured nothing. The ` +
      "document-level scan cannot answer for an open overlay (see this file's header), so a missing " +
      "scope here is a silently unmeasured row rather than a missing diagnostic.",
  ).toBe(true);

  expect(
    m.examined,
    `${where}: the scoped measurement examined ${m.examined} elements inside \`${selector}\`. An ` +
      "empty scope never overflows, so this number is what makes the two assertions below mean " +
      `something. The floor is ${MIN_EXAMINED_ELEMENTS} — the same constant, for the same reason.`,
  ).toBeGreaterThanOrEqual(MIN_EXAMINED_ELEMENTS);

  expect(
    m.scrollWidth,
    `${where}: \`${selector}\` scrolls horizontally — scrollWidth ${m.scrollWidth} against a ` +
      `clientWidth of ${m.clientWidth}. The DOCUMENT will not report this: a modal locks body scroll, ` +
      "so the overflow is hidden inside the overlay's own box rather than widening the page. " +
      "Offending elements (right edge past the overlay):\n" +
      (m.offenders.length
        ? m.offenders.map((o) => `  ${o}`).join("\n")
        : "  (none — the overflow comes from something this collector cannot see: a margin, a " +
          "negative offset, or an element clipped by a container that is itself too wide)"),
  ).toBeLessThanOrEqual(m.clientWidth + OVERFLOW_TOLERANCE_PX);

  expect(
    m.offenders,
    `${where}: ${m.offenders.length} element(s) inside \`${selector}\` lay out past its ` +
      `${m.clientWidth}px box without being clipped by a container between them and it:\n` +
      m.offenders.map((o) => `  ${o}`).join("\n"),
  ).toEqual([]);

  return m;
}
