// The focus reading, and the ONE definition of what "a visible focus indicator" means in this suite.
//
// ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────────────────────────────
//
// `FocusReading`, `readFocus` and `expectRing` were module-local to `e2e/overflow-320.spec.ts` until
// plan 15-12. A second spec now needs the same three — `e2e/auth-keyboard.spec.ts`, which walks the
// whole tab order of the six auth documents and measures an indicator on EVERY stop rather than two
// per route. Two copies of a focus criterion is the drift that goes silent in the worst direction:
// the day DS-05 stops painting a `ring-*` (or starts painting a real outline), one copy would be
// updated and the other would keep reporting green about a mechanism that no longer exists. D-16's
// "one import site" rule, applied to `e2e/`.
//
// The three declarations below are MOVED, not rewritten — same bodies, same failure messages, same
// `inHeader` field, which the auth walk never reads. A move you can diff is worth more here than a
// tidier type: `overflow-320.spec.ts` reports 60 passed / 15 skipped before and after, and that
// equality is the whole proof that the extraction changed no behaviour.
//
// WHAT STAYED BEHIND, and why. `expectVisibleFocus` is still module-local to
// `overflow-320.spec.ts`: it is built on that file's `inHeader` notion — "walk until focus leaves the
// site header, then assert the ring there too" — and the auth documents render NO site header at all
// since D-162, so the loop it runs would be a no-op on every route this file's newer half serves.
// The docblock explaining why a ring is a box-shadow also stayed on it; plan 15-12's acceptance
// criteria forbid editing any comment in that file, so the paragraph is re-stated on `expectRing`
// here rather than moved out from under the function it also documents.
//
// ── WHAT IS NEW HERE (plan 15-12) ─────────────────────────────────────────────────────────────────
//
// `describeStop`'s projection (`StopProbe.descriptor`), `probeActiveStop`, `probeCandidateStops`,
// `walkForward` and `walkBackward`. These exist for the keyboard walk and are not used by the 320px
// harness. They are here rather than in the walk's own file because the descriptor projection and the
// indicator reading have to agree about the SAME element — a descriptor computed one way for the
// focused stop and another way for the unfocused baseline would compare two different things and
// pass.

import { expect, type Page } from "@playwright/test";

type FocusReadingShape = {
  readonly tag: string;
  readonly label: string;
  readonly inHeader: boolean;
  readonly outlineStyle: string;
  readonly outlineWidth: string;
  readonly boxShadow: string;
};

export type FocusReading = FocusReadingShape;

/** What the document element currently has focus on, and whether anything is drawn around it. */
export async function readFocus(page: Page): Promise<FocusReading | null> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (el === null || el === document.body || el === document.documentElement) return null;
    const s = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      label: (el.getAttribute("aria-label") ?? el.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 40),
      inHeader: el.closest('[data-testid="site-header"]') !== null,
      outlineStyle: s.outlineStyle,
      outlineWidth: s.outlineWidth,
      boxShadow: s.boxShadow,
    };
  });
}

/**
 * GATE-A11Y's focus half, and it is a RENDERED check rather than "focus moved".
 *
 * MOVED VERBATIM from `e2e/overflow-320.spec.ts` by plan 15-12. The paragraph that used to explain
 * it sits on `expectVisibleFocus` in that file and is restated here because the two functions
 * shipped under one docblock and only one of them travelled:
 *
 * DS-05 ships exactly one recipe — `focus-visible:ring-2 focus-visible:ring-ring
 * focus-visible:ring-offset-2 focus-visible:ring-offset-background`
 * (`tests/design/focus-recipe.test.ts` pins its spelling across the tree) — and Tailwind draws a
 * `ring-*` as a **box-shadow**, not as an outline. So "the ring is visible" is: a non-`none`
 * box-shadow, or a real outline with a width. Either satisfies the criterion; NEITHER is satisfied by
 * focus merely having moved, which is the weaker assertion this function exists instead of.
 *
 * The keyboard is what makes it a `:focus-visible` match. A programmatic `.focus()` does not qualify
 * in Chromium, so a version of this that called `.focus()` would report every control as ringless and
 * would be red on a correct tree. Every walk in this file therefore presses real keys.
 */
export function expectRing(reading: FocusReading, where: string): void {
  const hasOutline = reading.outlineStyle !== "none" && parseFloat(reading.outlineWidth) > 0;
  const hasRing = reading.boxShadow !== "none" && reading.boxShadow.trim() !== "";
  expect(
    hasOutline || hasRing,
    `${where}: \`${reading.tag}\` ("${reading.label}") has keyboard focus and draws NOTHING — ` +
      `outline: ${reading.outlineStyle} ${reading.outlineWidth}, box-shadow: ${reading.boxShadow}. ` +
      "DS-05 is the one focus mechanism in this app and it paints a `ring-*`, which Chromium reports " +
      "as a box-shadow. A control with no visible focus is a defect, not a variant.",
  ).toBe(true);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE STOP PROJECTION — plan 15-12
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/** The three properties that decide whether anything is drawn around an element. */
export type Indicator = {
  readonly outlineStyle: string;
  readonly outlineWidth: string;
  readonly boxShadow: string;
};

/**
 * One tab stop, read from the live document.
 *
 * A SUPERSET OF `FocusReading` on purpose: `expectRing` takes a `FocusReading`, and a `StopProbe`
 * satisfies it structurally, so the walk applies the SAME criterion the 320px harness applies rather
 * than a second one that happens to agree today.
 */
export type StopProbe = FocusReadingShape & {
  /**
   * The string the spec compares and the summary prints. Format (plan 15-12's `<expected_sequences>`):
   *
   *   links    `a:<trimmed text>@<landmark>`     e.g. `a:FitOut@main`, `a:Terms@contentinfo`
   *   inputs   `input[<type>]:<label text>`      e.g. `input[email]:Email`
   *   buttons  `button[<type or role>]:<text>`   e.g. `button[submit]:Log in`
   *
   * `<landmark>` is the nearest ancestor `main` or `footer` (reported as `contentinfo`), and it is
   * the field that tells the layout's wordmark apart from the footer's identically-named link — the
   * two are the same tag with the same text and the same href, and a projection without a landmark
   * would report them as one string.
   */
  readonly descriptor: string;
  /** `name` attribute, when the element has one. T-15-25 matches the reset token input on THIS. */
  readonly fieldName: string | null;
  /** The literal `class` attribute — the wordmark's `ring-`-free assertion reads it. */
  readonly classes: string;
  /** `type` as the ATTRIBUTE reads, or null when absent. `input` with no `type` is `text` via the IDL. */
  readonly typeAttr: string | null;
  /** `role` attribute, or null. Present on the signup intent pair (`role="radio"`). */
  readonly role: string | null;
  /** Does the element match `:focus-visible` right now? False for anything not focused. */
  readonly focusVisible: boolean;
  /** `offsetParent === null` — no layout box, therefore not rendered and not focusable. */
  readonly noLayoutBox: boolean;
  /** The `tabindex` attribute parsed to a number, or null when absent/unparseable. */
  readonly tabindex: number | null;
};

/**
 * Everything a browser might put in the sequential focus order, plus the things that only LOOK
 * focusable.
 *
 * DELIBERATELY WIDER THAN THE TAB ORDER. `input[type=hidden]` matches, and that is the point: the
 * unfocused baseline and the positive-`tabindex` census both need to see elements the walk must NOT
 * reach, so that "the token input was never focused" is a statement about an element this file can
 * prove exists rather than one it failed to find.
 */
const CANDIDATE_SELECTOR =
  'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]';

type ProbeMode = "active" | "candidates";

/**
 * ONE `page.evaluate`, two modes, and the mode parameter is what keeps `describeStop` single.
 *
 * The alternative — two evaluates — means two copies of the descriptor projection, and the failure
 * that shape produces is invisible: the focused stop would be described one way and the unfocused
 * baseline another, the lookup by descriptor would miss every time, and a "the indicator changed on
 * focus" assertion would silently measure nothing.
 */
async function runProbe(page: Page, mode: ProbeMode): Promise<StopProbe | StopProbe[] | null> {
  return page.evaluate(
    ({ probeMode, selector }) => {
      const collapse = (s: string): string => s.replace(/\s+/g, " ").trim();

      /** Nearest `main` / `footer` ancestor, `footer` reported by its landmark role. */
      const landmarkOf = (el: Element): string => {
        const lm = el.closest("main, footer");
        if (lm === null) return "none";
        return lm.tagName.toLowerCase() === "footer" ? "contentinfo" : "main";
      };

      /**
       * An input's accessible name, resolved through its LABEL ASSOCIATION and never through
       * `textContent` — which is empty on every `<input>`, so a projection that used it would name
       * every field the empty string and compare four indistinguishable stops as equal.
       *
       * `el.labels` IS the `label[for=<id>]` association shadcn's `FormLabel` renders (it also picks
       * up a wrapping `<label>`), resolved by the platform rather than by a querySelector this file
       * would have to escape React's generated ids into.
       */
      const nameOfField = (el: HTMLElement): string => {
        const labels = (el as HTMLInputElement).labels;
        if (labels !== null && labels !== undefined && labels.length > 0) {
          return collapse(labels[0].textContent ?? "");
        }
        return collapse(el.getAttribute("aria-label") ?? "");
      };

      const describeStop = (el: HTMLElement): StopProbeShape => {
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute("role");
        const text = collapse(el.textContent ?? "");
        const fieldName = nameOfField(el);

        let descriptor: string;
        if (tag === "a") {
          descriptor = `a:${text}@${landmarkOf(el)}`;
        } else if (tag === "input" || tag === "textarea" || tag === "select") {
          // The IDL `type`, not the attribute: `<Input>` with no `type` prop renders no attribute at
          // all and the platform reads `text` — which is what a keyboard user is actually in.
          const idlType = (el as HTMLInputElement).type;
          descriptor = `${tag}[${idlType}]:${fieldName}`;
        } else if (tag === "button") {
          // ROLE FIRST. The signup intent pair is `type="button" role="radio"`, and what it ANNOUNCES
          // is the interesting half — `button[button]` would describe two radios and a Google button
          // with one string.
          descriptor = `button[${role ?? (el as HTMLButtonElement).type}]:${text}`;
        } else {
          // Anything else is a finding rather than a stop, and it is named so the failure says what
          // arrived (a dev-overlay host, a stray `tabindex`, a custom element) instead of "differs".
          descriptor = `${tag}:${collapse(el.getAttribute("aria-label") ?? text)}@${landmarkOf(el)}`;
        }

        const s = getComputedStyle(el);
        const rawTabindex = el.getAttribute("tabindex");
        const parsedTabindex =
          rawTabindex === null || rawTabindex.trim() === "" ? null : Number.parseInt(rawTabindex, 10);

        return {
          descriptor,
          tag,
          // A superset of `readFocus`'s label: the resolved field name stands in when there is no
          // text, so `expectRing`'s failure message names the control instead of printing `("")`.
          label: (el.getAttribute("aria-label") ?? (text !== "" ? text : fieldName)).slice(0, 40),
          inHeader: el.closest('[data-testid="site-header"]') !== null,
          outlineStyle: s.outlineStyle,
          outlineWidth: s.outlineWidth,
          boxShadow: s.boxShadow,
          fieldName: el.getAttribute("name"),
          classes: el.getAttribute("class") ?? "",
          typeAttr: el.getAttribute("type"),
          role,
          focusVisible: el.matches(":focus-visible"),
          noLayoutBox: el.offsetParent === null,
          tabindex:
            parsedTabindex !== null && Number.isNaN(parsedTabindex) ? null : parsedTabindex,
        };
      };

      if (probeMode === "active") {
        const el = document.activeElement as HTMLElement | null;
        if (el === null || el === document.body || el === document.documentElement) return null;
        return describeStop(el);
      }
      return Array.from(document.querySelectorAll<HTMLElement>(selector)).map(describeStop);
    },
    { probeMode: mode, selector: CANDIDATE_SELECTOR },
  ) as Promise<StopProbe | StopProbe[] | null>;
}

/** The shape `describeStop` returns inside the page. Kept in sync with `StopProbe` by construction. */
type StopProbeShape = {
  descriptor: string;
  tag: string;
  label: string;
  inHeader: boolean;
  outlineStyle: string;
  outlineWidth: string;
  boxShadow: string;
  fieldName: string | null;
  classes: string;
  typeAttr: string | null;
  role: string | null;
  focusVisible: boolean;
  noLayoutBox: boolean;
  tabindex: number | null;
};

/** The element that has focus right now, projected — or null when focus is not on the document. */
export async function probeActiveStop(page: Page): Promise<StopProbe | null> {
  return (await runProbe(page, "active")) as StopProbe | null;
}

/**
 * Every focusable-LOOKING element in the document, projected, with nothing focused.
 *
 * This is the UNFOCUSED baseline. `expectRing` on its own accepts an element that draws a permanent
 * box-shadow whether focused or not; comparing each stop's focused reading against its entry here is
 * what makes the indicator an INDICATOR rather than a decoration.
 */
export async function probeCandidateStops(page: Page): Promise<StopProbe[]> {
  return (await runProbe(page, "candidates")) as StopProbe[];
}

/** Only the indicator triple, for the difference check. */
export function indicatorOf(probe: Indicator): Indicator {
  return {
    outlineStyle: probe.outlineStyle,
    outlineWidth: probe.outlineWidth,
    boxShadow: probe.boxShadow,
  };
}

export function sameIndicator(a: Indicator, b: Indicator): boolean {
  return (
    a.outlineStyle === b.outlineStyle &&
    a.outlineWidth === b.outlineWidth &&
    a.boxShadow === b.boxShadow
  );
}

/**
 * THE ONE ELEMENT IN THE TAB ORDER THAT IS NOT THE APP'S, named rather than filtered silently.
 *
 * `next dev` mounts its own dev-tools indicator as a `<nextjs-portal>` custom element appended to
 * `<body>`, and it takes a tab stop. MEASURED 25 August 2026: it appears as the LAST stop on every
 * auth document — and on the very first page load of a run it was sometimes absent (it mounts
 * asynchronously), which is what makes ignoring it a correctness requirement rather than tidiness: a
 * declared sequence that included it would be flaky, and one that did not would be red half the time.
 *
 * IT IS NOT PRODUCT MARKUP. It does not exist in a production build, no visitor can reach it, and it
 * draws no focus indicator of its own (`outline: none 3px`, no box-shadow, and it does not even match
 * `:focus-visible`) — so an `expectRing` applied to it would fail on a correct tree.
 *
 * ⚠ THE PARTITION IS ASSERTED, NOT TRUSTED. `e2e/auth-keyboard.spec.ts` checks that every element
 * dropped here is a `nextjs-portal` AND that all of them sit at the END of the raw sequence, so this
 * filter can never quietly swallow a product control that appeared in the middle of the order. That
 * assertion is the difference between excluding the dev server's own furniture and narrowing a check
 * until a number matches.
 */
export const DEV_OVERLAY_TAG = "nextjs-portal";

export function partitionDevOverlay(raw: StopProbe[]): {
  readonly stops: StopProbe[];
  readonly overlay: StopProbe[];
} {
  return {
    stops: raw.filter((s) => s.tag !== DEV_OVERLAY_TAG),
    overlay: raw.filter((s) => s.tag === DEV_OVERLAY_TAG),
  };
}

/**
 * THE BOUND, and `overflow-320.spec.ts` already gives the right reason for it: an unbounded loop on a
 * focus-trapped page never returns, and a hang is a worse failure report than an assertion. 40 is
 * that file's figure, reused so the two walks agree; the longest declared auth sequence is 14 stops,
 * so the bound is nearly triple the widest real document.
 */
export const WALK_BOUND = 40;

/**
 * Put the sequential-focus starting point back at the TOP of the document, using only the keyboard.
 *
 * ⚠ THIS IS AN INSTRUMENT CORRECTION AND IT WAS MEASURED, NOT PREDICTED. It exists for exactly one
 * of the seven cases and the measurement is worth writing down, because it looks like a defect and
 * is not one:
 *
 *   `/forgot-password` post-submit is reached by CLICKING `Send reset link`, and the branch REPLACES
 *   the form — so the control that had focus is removed from the document while it has it. Chromium
 *   keeps the sequential navigation starting point where that element was, so the next Tab resumes
 *   BELOW the wordmark. Probed 25 August 2026: the forward walk on that branch reported six stops
 *   beginning `a:Back to log in@main`, with `a:FitOut@main` absent — while the BACKWARD walk on the
 *   same document reached `a:FitOut@main` as its final stop. The wordmark was in the order the whole
 *   time; the walk was starting below it.
 *
 * Walking backward until focus leaves the document puts the starting point above the first stop, so
 * a forward walk then begins at stop 1 on every case.
 *
 * WHAT IT COSTS, MEASURED RATHER THAN GUESSED — and the first guess was wrong, which is why the
 * numbers are here. On a FRESHLY LOADED document the first Shift+Tab does not leave immediately: it
 * WRAPS to the last stop, so the reset walks the whole order backwards before it falls off the top.
 * Presses observed 14 September 2026: `/login` 13, `/signup` 17, `/forgot-password` 11, post-submit 2
 * (focus was already one stop below the wordmark), reset-with-token 11, missing-token 10,
 * `/signup` at 320 17. All well inside the 40-press bound, and the bound is what stops a focus trap
 * turning this into a hang.
 *
 * A NOTE THE NEXT READER IS OWED: the underlying behaviour is not a bug and is not being papered
 * over. "Focus resumes where the removed control was" is what browsers do and what a keyboard user
 * experiences; this function makes the SEQUENCE the assertion is about — the document's tab order —
 * measurable independently of how the document was reached.
 */
export async function resetFocusToTop(page: Page, maxPresses: number = WALK_BOUND): Promise<number> {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Shift+Tab");
    if ((await probeActiveStop(page)) === null) return i + 1;
  }
  return maxPresses;
}

/**
 * Press Tab from wherever focus is, collecting each stop, until focus leaves the document.
 *
 * REAL KEY PRESSES, not `.focus()` — see `expectRing`. Call it after `resetFocusToTop` so the first
 * press lands on the document's first tab stop rather than wherever the last interaction left off.
 */
export async function walkForward(page: Page, maxPresses: number = WALK_BOUND): Promise<StopProbe[]> {
  const stops: StopProbe[] = [];
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Tab");
    const stop = await probeActiveStop(page);
    if (stop === null) break;
    stops.push(stop);
  }
  return stops;
}

/**
 * The same walk backward: Shift+Tab from wherever focus is, until focus leaves the document.
 *
 * Bounded identically. Call it immediately after `walkForward` — focus is then past the END of the
 * document and the first Shift+Tab lands on the LAST stop. MEASURED rather than assumed (25 August
 * 2026, all seven cases): the sequence it returns is the forward sequence reversed, exactly.
 */
export async function walkBackward(
  page: Page,
  maxPresses: number = WALK_BOUND,
): Promise<StopProbe[]> {
  const stops: StopProbe[] = [];
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Shift+Tab");
    const stop = await probeActiveStop(page);
    if (stop === null) break;
    stops.push(stop);
  }
  return stops;
}
