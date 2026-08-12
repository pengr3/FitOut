// G-01 — the Radix ScrollArea viewport's content wrapper is constrained to the panel width, and the
// override that constrains it actually COMPILES.
//
// THE DEFECT. Radix hardcodes `style={{ minWidth: "100%", display: "table" }}` on the one wrapper
// div it puts between the Viewport and your children (`@radix-ui/react-scroll-area/dist/index.mjs`,
// line 130). `display: table` shrink-wraps to max-content, so `min-width: 100%` is a floor with no
// ceiling: long unbreakable content widens the wrapper past the panel and the overflow is clipped.
// Measured in Chromium with the notification panel open — viewport 384.0px, wrapper and row
// 976.9px, overflowing 592.9px to the right. `src/components/ui/scroll-area.tsx` forces that wrapper
// to a block box; its own comment carries the full diagnosis and the horizontal caveat.
//
// WHY THIS FILE ASSERTS THE COMPILED STYLESHEET AND NOT JUST THE SOURCE.
//
//   A source scan asserts a STRING. The entire trap in this fix is that a class name can be present
//   and spelled plausibly while producing nothing at all — this repo has been bitten twice already
//   (`z-dialog` compiled to silence because Tailwind v4 has no z-index namespace; `text-label` was
//   deleted by tailwind-merge at every call site while the source still read correctly). The
//   override here has two spellings that BOTH compile under Tailwind 4.3 (the v3 `:!block` prefix
//   and the v4 `block!` suffix) and any number that do not. Only the emitted CSS can tell them
//   apart, so the emitted CSS is the primary assertion and the source scan is the secondary one.
//
//   This file runs inside `npm run build` — `build = lint && test:design && next build` — so it is
//   the layer that can actually stop the fix being removed. Playwright is not in that chain.
//
// THE OTHER HALF IS `e2e/scroll-area-overflow.spec.ts`, and neither layer alone is sufficient.
// jsdom performs no layout (`getBoundingClientRect()` returns zeros), so the claim this fix really
// makes — a measured width — cannot be asserted here at all. This file proves the rule is EMITTED;
// the Playwright spec proves it LANDS, in real pixels, on a real page.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHY ASSERTION 3 EXISTS — THE COMMENT-VERSUS-GREP COLLISION, ONE LAYER DEEPER THAN PHASE 10 HIT IT.
//
//   Tailwind's content scan is raw text: it does not parse, so a class name quoted inside a CODE
//   COMMENT is extracted and emitted exactly as one written in a `className` is. That means the
//   compiled-output assertion below can be kept GREEN by a comment alone, on a tree where the
//   className has lost the class and every ScrollArea is broken. Plans 10-11 through 10-13 each hit
//   the source-scan form of this collision; this is the compiled form, and it is worse, because the
//   artifact it fakes is the one that is supposed to be un-fakeable.
//
//   So the component's caveat comment is written DESCRIPTIVELY and never quotes the token, and
//   assertion 3 pins that property: the token count in the RAW file must equal the count in the
//   COMMENT-STRIPPED file. Without it, a future reword that quotes the class silently re-arms the
//   collision and assertion 2 becomes decorative. This was observed, not theorised — see the RED RUN
//   record below, where the comment was deliberately left in place while the className was emptied.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// RED RUN — 2026-08-13. Recorded verbatim, because a gate nobody watched fail is not a gate.
//
//   Mutation: the override token was deleted from the Viewport's `className` in
//   `src/components/ui/scroll-area.tsx` (the string went from
//   `size-full max-h-[inherit] <token> rounded-[inherit] …` to `size-full max-h-[inherit]
//   rounded-[inherit] …`). THE CAVEAT COMMENT WAS LEFT ENTIRELY IN PLACE — that is the point of the
//   run: if the comment quoted the token, assertion 2 would have stayed green against a broken tree.
//
//   `npm run test:design -- scroll-area`
//
//     FAIL  tests/design/scroll-area.test.ts > G-01 — the override is on the Viewport's className >
//     the token appears exactly once in the comment-stripped source
//     AssertionError: expected +0 to be 1 // Object.is equality
//
//     FAIL  tests/design/scroll-area.test.ts > G-01 — the override is on the Viewport's className >
//     the token is inside the Viewport's own className, not merely somewhere in the file
//     AssertionError: the Viewport className does not carry the override: size-full
//     max-h-[inherit] rounded-[inherit] transition-[color,box-shadow] outline-none
//     focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
//     focus-visible:ring-offset-background focus-visible:outline-1: expected false to be true
//
//     FAIL  tests/design/scroll-area.test.ts > G-01 — the override COMPILES to `display: block
//     !important` > the emitted stylesheet contains the escaped rule, nested exactly as Tailwind v4
//     writes it
//     AssertionError: the compiled stylesheet does not contain: .\[\&\>div\]\:block\! { &>div {
//     display: block !important; } }: expected false to be true
//
//     FAIL  tests/design/scroll-area.test.ts > G-01 — the comment does not quote the token
//     (assertion 2 stays non-vacuous) > the comment-stripped count equals the raw count and is
//     exactly 1
//     AssertionError: expected +0 to be 1 // Object.is equality
//
//      Test Files  1 failed (1)
//           Tests  4 failed | 5 passed (9)
//
//   THE THIRD FAILURE IS THE ONE THAT MATTERED. Assertion 2 reads the COMPILED stylesheet, and it
//   went red — so the caveat comment really is descriptive, nothing left in `src/` named the token,
//   and Tailwind emitted no such rule. Had it stayed green while the className was empty, the
//   comment would have been the reason and it would have had to be reworded before this fix could
//   ship. It also settles a second question in passing: the token IS named verbatim in this task's
//   PLAN.md, and the rule was still not emitted — `globals.css`'s `source("../")` really does hold
//   the content root at `src/` (plan 10-12), so planning prose cannot fake this assertion either.
//
//   GREEN RUN, token restored, same command: Test Files 1 passed (1), Tests 9 passed (9), 2.10s.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file:
//   • It proves what the COMPILER EMITS. It cannot see a browser refuse to apply the rule, cannot
//     see specificity lose to something else, and cannot measure a single pixel. That is the
//     Playwright spec's job and it is not optional.
//   • It asserts the override on `ScrollArea`'s Viewport. A call site that renders
//     `ScrollAreaPrimitive.Viewport` directly instead of using this component is outside its reach;
//     none exists today.
//   • The horizontal caveat in the component's comment is prose, and prose is not enforced. Nothing
//     here fails if someone adds `orientation="horizontal"` — the note is placed where that person
//     must read it, which is the most this layer can do.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { compileGlobalsCss } from "./helpers/compile-css";
import { stripComments } from "./helpers/strip-comments";

/**
 * The override, in this repo's spelling. The v4 SUFFIX form — `src/` has ~9 suffix-form arbitrary
 * variants (`ui/badge.tsx`'s `[&>svg]:size-3!`, several in `ui/command.tsx`) and zero prefix-form
 * ones. Both spellings compile under Tailwind 4.3; only one matches the house style.
 */
const OVERRIDE = "[&>div]:block!";

/**
 * The EXACT rule Tailwind 4.3 emits for it, whitespace-normalised.
 *
 * Note the shape: v4 emits NESTED CSS — the `&>div` combinator lives inside the escaped class rule —
 * NOT a flattened `.cls > div` selector. An assertion written against the flattened form reads
 * "missing" against a perfectly correct stylesheet, which is a false RED that costs an afternoon.
 * Printed from the compiler before being pinned here, not guessed.
 */
const EMITTED_RULE = String.raw`.\[\&\>div\]\:block\! { &>div { display: block !important; } }`;

const COMPONENT_PATH = resolve(
  process.cwd(),
  "src/components/ui/scroll-area.tsx",
);

const rawSource = readFileSync(COMPONENT_PATH, "utf8");
const strippedSource = stripComments(rawSource);

/** Literal (non-regex) occurrence count, so nothing in the token needs escaping. */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * The `className` string literal that belongs to the element carrying
 * `data-slot="scroll-area-viewport"`.
 *
 * Anchored on the data-slot rather than on the JSX tag name for two reasons: it is the same handle
 * the Playwright spec selects on, so both layers point at one element; and it survives the component
 * being renamed. Returns `null` when the shape is not found — callers must treat that as a failure,
 * never as an empty pass.
 */
function viewportClassName(source: string): string | null {
  const slot = source.indexOf('data-slot="scroll-area-viewport"');
  if (slot === -1) return null;
  const match = /className="([^"]*)"/.exec(source.slice(slot));
  return match === null ? null : match[1];
}

describe("G-01 — the override is on the Viewport's className", () => {
  it("the token appears exactly once in the comment-stripped source", () => {
    expect(countOccurrences(strippedSource, OVERRIDE)).toBe(1);
  });

  it("the token is inside the Viewport's own className, not merely somewhere in the file", () => {
    const className = viewportClassName(strippedSource);
    expect(
      className,
      'no element carrying data-slot="scroll-area-viewport" with a className was found',
    ).not.toBeNull();
    expect(
      className?.includes(OVERRIDE),
      `the Viewport className does not carry the override: ${className}`,
    ).toBe(true);
  });

  it("IN-14's max-height fix is still on the same element (this fix does not displace it)", () => {
    // The two overrides are independent and both load-bearing: removing `max-h-[inherit]` leaves the
    // row at 976.9px, and removing this one leaves the panel unscrollable. Pinned together so a
    // future edit to this className cannot quietly trade one for the other.
    const className = viewportClassName(strippedSource);
    expect(className).toContain("max-h-[inherit]");
  });
});

describe("G-01 — the override COMPILES to `display: block !important`", () => {
  it("the emitted stylesheet contains the escaped rule, nested exactly as Tailwind v4 writes it", async () => {
    const css = await compileGlobalsCss();
    const normalised = css.replace(/\s+/g, " ");
    expect(
      normalised.includes(EMITTED_RULE),
      `the compiled stylesheet does not contain: ${EMITTED_RULE}`,
    ).toBe(true);
  });

  it("carries !important — a plain `display: block` would lose to Radix's inline style", async () => {
    const css = await compileGlobalsCss();
    const normalised = css.replace(/\s+/g, " ");
    // The same rule minus the weight is what a spelling without the `!` produces. It compiles, it
    // looks right in a diff, and it does nothing at all: an inline style beats an unweighted
    // declaration regardless of specificity. Pinned as its own assertion so the failure names the
    // reason rather than just "text not found".
    expect(
      normalised.includes(
        String.raw`.\[\&\>div\]\:block { &>div { display: block; } }`,
      ),
      "the unweighted variant is emitted — check the override was not spelled without the `!`",
    ).toBe(false);
  });
});

describe("G-01 — the comment does not quote the token (assertion 2 stays non-vacuous)", () => {
  it("the comment-stripped count equals the raw count and is exactly 1", () => {
    const raw = countOccurrences(rawSource, OVERRIDE);
    const stripped = countOccurrences(strippedSource, OVERRIDE);
    expect(
      raw,
      "the caveat comment quotes the override token — Tailwind's content scan is raw text, so the " +
        "comment ALONE would keep the compiled-output assertion green after the className lost the " +
        "class. Reword the comment descriptively.",
    ).toBe(stripped);
    expect(stripped).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Guard the guard. Every assertion above is a substring check against a file
// read or a compile. An empty read or a compile that produced nothing makes the
// negative assertion pass for free and turns the positive ones into a false RED
// that gets "fixed" in the wrong place.
// ---------------------------------------------------------------------------
describe("guard-the-guard", () => {
  it("read the real component", () => {
    expect(rawSource.length).toBeGreaterThan(1000);
    expect(rawSource).toContain("ScrollAreaPrimitive.Viewport");
    expect(strippedSource).toContain("ScrollAreaPrimitive.Viewport");
  });

  it("the stripper actually removed the caveat comment", () => {
    // The comment is long and full of prose that must not reach a source scan. If the stripper
    // silently no-ops, assertion 3 compares a file with itself and proves nothing.
    expect(strippedSource.length).toBeLessThan(rawSource.length - 1500);
    expect(rawSource).toContain("HORIZONTAL SCROLLING");
    expect(strippedSource).not.toContain("HORIZONTAL SCROLLING");
  });

  it("compiled a real stylesheet whose content scan reached src/", async () => {
    const css = await compileGlobalsCss();
    expect(css.length).toBeGreaterThan(50_000);
    // A control on the scan root: `--brand` is a token the app really uses, so its absence would
    // mean the compile produced something other than this app's stylesheet.
    expect(css).toContain("--brand");
  });
});
