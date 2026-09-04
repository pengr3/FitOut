import { expect, type Locator } from "@playwright/test";

// RESP-03 CLAUSE C's MEASUREMENT — the ONE definition of "this text did not wrap", extracted so more
// than one spec can ask the question the same way.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS (plan 17-04)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// RESP-03's literal wording is *"no price, countdown or label wraps or overflows"* — TWO assertions, and
// until this file only the second one existed anywhere. `scrollWidth <= clientWidth` is GREEN on a
// `₱1,234.00` that has wrapped onto a second line inside a fixed 64px bar: the text is clipped, not
// overflowing, and `e2e/helpers/overflow.ts` reports success. A wrap is not an overflow, and no shipped
// gate could see one.
//
// The measurement itself was NOT invented here. It shipped inside `e2e/mobile-booker-path.spec.ts` case
// (b) (`:456-486` before this extraction), where it measured the sticky bar's two lines at 320px. Plan
// 17-04 needed the same question asked of five more subjects on two routes — and plan 17-11 needs it
// again inside `e2e/overflow-320.spec.ts`, for the booking-surface status chips this spec's seed cannot
// reach. Three copies of a no-wrap criterion is the drift that goes silent in the worst direction: the
// day a subject stops resolving a numeric `line-height`, one copy would grow the guard and the other two
// would keep reporting green about a comparison against `NaN`. D-16's "one import site" rule, applied to
// `e2e/` — the same argument `expectRing` (`helpers/focus.ts`) and `expectNoOverflow` (`helpers/overflow.ts`)
// were extracted under, in that order.
//
// THE DECLARATIONS ARE MOVED, NOT REWRITTEN. Same reading, same tolerance, same two guards, same reasons
// in the messages — `focus.ts`'s rule, and the before/after run counts are the whole proof the extraction
// changed no behaviour:
//
//   `npx playwright test e2e/mobile-booker-path.spec.ts --project=chromium --workers=1`
//   BEFORE (at b29ed9d, the extraction source inlined):  8 passed, 0 skipped, 0 failed  (49.7s)
//   AFTER  (case (b) calling this function):             8 passed, 0 skipped, 0 failed  (47.7s)
//
// The counts are the claim; the seconds are there only so the next reader knows both runs did the same
// work rather than one of them short-circuiting.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE REFERENCE IS THE ELEMENT'S OWN RESOLVED LINE-HEIGHT AND NEVER A LITERAL
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `clientHeight <= 24` would be wrong in one theme or the other on almost every subject. MEASURED at
// 320px on 2026-08-29, the same two elements in both themes:
//
//   sticky bar, rate line   court  font 16px  line-height 24px    · grove  font 17px  line-height 27.2px
//   sticky bar, fee note    court  font 12px  line-height 16px    · grove  font 13px  line-height 17.33px
//
// Every `--leading-*` token and every step of the `text-*` ladder is re-declared per theme
// (`globals.css`), so the one-line reference is a per-element, per-theme fact. Reading it off the element
// is the only spelling that is right in both.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE GUARDS ARE THE POINT, AND EACH ONE TURNS A SILENT PASS INTO A RED
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// (a) NON-EMPTY TEXT. An empty line never wraps, so the height clause below it would be free. This is
//     the same vacuity argument `MIN_EXAMINED_ELEMENTS` makes for the overflow scan.
// (b) A FINITE LINE-HEIGHT. `line-height: normal` parses to `NaN`, and `NaN <= anything` is FALSE —
//     which Playwright's `toBeLessThanOrEqual` reports as a failure, not a pass. The danger is the
//     mirror image: `expect(NaN).toBeLessThanOrEqual(NaN + 1)` is red on a CORRECT tree, so without this
//     guard the diagnosis ("the box is one pixel too tall") names the wrong thing entirely. It is
//     mandatory because a clause nobody can diagnose is a clause that gets deleted.
// (c) A MEASURABLE BOX — added by plan 17-04, and it is a measurement rather than a precaution.
//     `clientHeight` is **0 on every non-replaced `display: inline` element**, so a no-wrap assertion
//     pointed at an inline `<span>` compares `0 <= lineHeight + 1` and can never fail. And the source
//     does not tell you which subjects those are: `[data-testid="price-total"]` IS written as a
//     `<span>` (`price-breakdown.tsx:373`) and measured `display: "block"` with `clientHeight: 28`,
//     because it is a flex ITEM and flex items are blockified. A reader auditing this from the JSX would
//     conclude the wrong thing in both directions, which is exactly when a guard has to be a
//     measurement instead.
//
//     WATCHED RED, 2026-08-29, `/listings/[id]` at 320px: a `<span>` carrying
//     `"₱1,234.00 a very long money string that will wrap twice"` was appended into `<main>` inside a
//     60px-wide `<p>` — genuinely wrapped, eight line boxes deep — and read back
//     `{ display: "inline", clientHeight: 0, rectHeight: 189, lineHeight: 24 }`. Without guard (c) the
//     height clause compares `0 <= 25` and reports a wrap that is 165px tall as green. With it, the
//     failure names the display, both heights and the text. (Probe run and deleted; the injected-element
//     idiom is `helpers/overflow.ts`'s, from its own overlay measurements.)
//
// ⚠ THE SUBJECT MUST BE THE TEXT'S OWN BOX, NOT THE RESERVATION AROUND IT, and the checkout countdown is
// the worked example. `[data-testid="hold-countdown"]` is `HOLD_COUNTDOWN_BOX` = `h-8 min-w-24` — a
// 32px RESERVATION whose whole job is to stop the header reflowing once a second. Measured: the box
// reports `clientHeight 32` against a resolved `line-height` of 20px, so pointing this function at it is
// red on a correct tree; its `p[role="timer"]` child reports `clientHeight 20` against the same 20px and
// is the element whose text can actually wrap. Aim at the element that renders the characters.

export type WrapReading = {
  /** The element's content-box height. 0 on a `display: inline` element — see guard (c). */
  readonly clientHeight: number;
  /** The element's own resolved `line-height`, in px. `NaN` when it computes to `normal`. */
  readonly lineHeight: number;
  /** The border-box height. Non-zero even for an inline element, which is what makes guard (c) work. */
  readonly rectHeight: number;
  /** The computed `display`, named in guard (c)'s failure so the reader knows which box they measured. */
  readonly display: string;
  /** The trimmed rendered text — guard (a)'s subject, and the failure message's evidence. */
  readonly text: string;
};

/**
 * ONE `evaluate`, ONE typed object, asserted in Node — `helpers/overflow.ts`'s idiom, and for its reason:
 * an `expect` inside the browser callback reports through the page rather than through the runner, so its
 * message arrives without the `where` prefix every failure in this suite is read by.
 */
export async function readWrap(locator: Locator): Promise<WrapReading> {
  return locator.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      clientHeight: el.clientHeight,
      lineHeight: parseFloat(style.lineHeight),
      rectHeight: el.getBoundingClientRect().height,
      display: style.display,
      text: (el.textContent ?? "").trim(),
    };
  });
}

/**
 * "This text renders on ONE line" — the whole of RESP-03's clause C, for one element.
 *
 * `where` is the last required argument and every message is prefixed `${where}: `, which is this
 * directory's convention (`expectRing`, `expectNoOverflow`, `boxOf`).
 *
 * `tolerancePx` defaults to 1 — `skeleton-geometry.spec.ts`'s number, carried through the extraction
 * source. Fractional layout against integer expectations: grove's fee note resolves a 17.33px line-height
 * and lays out at 17.33px, and the two disagree in the third decimal on some zoom levels.
 */
export async function expectNoWrap(
  locator: Locator,
  where: string,
  tolerancePx: number = 1,
): Promise<void> {
  // A PRECONDITION RATHER THAN A GUARD, and it runs before the reading because `locator.evaluate` on a
  // selector that matches nothing spends the whole timeout and then reports the selector — never the
  // subject. `boxOf`'s first line, for `boxOf`'s reason.
  await expect(
    locator,
    `${where}: no element matched, so there is nothing to measure a wrap on. A subject that stopped ` +
      "rendering and a subject that fits on one line are the same green to every assertion below.",
  ).toHaveCount(1);

  const m = await readWrap(locator);

  // ── GUARD (a) — an empty line never wraps ────────────────────────────────────────────────────────
  expect(
    m.text.length,
    `${where}: rendered no text, so a no-wrap assertion over it is free.`,
  ).toBeGreaterThan(0);

  // ── GUARD (b) — `line-height: normal` parses to NaN and compares false against every bound ───────
  expect(
    Number.isFinite(m.lineHeight),
    `${where}: resolves no numeric line-height (${JSON.stringify(m.text)}), so there is no ` +
      "single-line reference to compare against. A `normal` line-height parses to NaN, which fails " +
      "every bound — the clause below would be red on a correct tree and would name the wrong defect.",
  ).toBe(true);

  // ── GUARD (c) — an inline box reports `clientHeight` 0 and passes every bound ────────────────────
  expect(
    m.clientHeight,
    `${where}: computes \`display: ${m.display}\` and reports a content-box height of ` +
      `${m.clientHeight} (border box ${m.rectHeight}). \`clientHeight\` is 0 on every non-replaced ` +
      "inline element, so the clause below would compare `0 <= lineHeight + tolerance` and could not " +
      `fail. Text: ${JSON.stringify(m.text)}. Aim at the block or flex-item box that renders the ` +
      "characters — see this file's header for the two subjects where the source does not tell you " +
      "which that is.",
  ).toBeGreaterThan(0);

  expect(
    m.clientHeight,
    `${where}: this text WRAPS — it renders ${m.clientHeight}px against a one-line box of ` +
      `${m.lineHeight}px. Text: ${JSON.stringify(m.text)}. A wrap is not an overflow and no ` +
      "`scrollWidth` gate can see one: the second line is CLIPPED rather than accommodated inside a " +
      "declared box (the sticky bar is a fixed 64px, the hold countdown a fixed 32px), so the booker " +
      "reads half a price or half a disclosure and the harness reports success (RESP-03 clause C).",
  ).toBeLessThanOrEqual(m.lineHeight + tolerancePx);
}
