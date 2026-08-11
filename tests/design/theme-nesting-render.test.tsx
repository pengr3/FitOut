// @vitest-environment jsdom

// THEME-04, the supplementary layer: a NESTED `[data-theme]` subtree really does resolve its own
// token values, asserted against a rendered tree rather than against text.
//
// ── THIS FILE EXISTS BECAUSE THE SPIKE CAME BACK ONE WAY AND NOT THE OTHER ────────────────────────
// Plan 10-02's recorded verdict (`helpers/compile-css.ts`, `THEME-04 SPIKE`) is **jsdom RESOLVES
// nested custom properties**, overturning the research's assumption A7. Plan 10-16 was written to
// branch on that verdict: RESOLVES adds this file, DOES NOT RESOLVE omits it and leaves the
// compiled-CSS proof standing alone. The verdict also attached two conditions, and BOTH are what
// keep this file from being a vacuous pass:
//
//   (a) IT MUST INJECT THE RAW THEME BLOCKS, NEVER COMPILED OUTPUT. jsdom ignores `@layer`
//       completely, and Tailwind v4 emits every utility and every theme variable inside one. The
//       same assertions written against `compileGlobalsCss()` would read `""` for everything and
//       pass by never testing anything. The blocks below are lifted VERBATIM out of `globals.css` by
//       a plain CSS parse — the authored selectors, the authored values, no compiler in the path.
//   (b) IT MUST ASSERT ON `getPropertyValue("--token")`, NEVER ON A RESOLVED COLOUR. jsdom does not
//       substitute `var()`; asking it for `background-color` returns the literal string
//       `"var(--brand)"` on every element in the document, in either theme. So this file says which
//       value a custom property HOLDS at a given depth, and says nothing whatever about paint.
//
// ── WHAT IT ADDS OVER THE COMPILED CHECK, WHICH IS NARROW BUT REAL ────────────────────────────────
// The compiled check proves the utilities are pointed at the raw tokens. This proves the other half
// of the same claim from the opposite direction: that the SELECTOR SHAPE — two unlayered, equal
// specificity, source-ordered attribute selectors — actually re-binds those tokens on a nested host
// and inherits into its children, rather than only on the document root. That is the property
// `:root[data-theme=…]` would break while leaving the compiled output untouched.
//
// ── OBSERVED, AND THE OBSERVATION IS A WARNING ABOUT THIS FILE ────────────────────────────────────
// With the word `inline` deleted from `globals.css`, the sibling file goes to 5 failed / 11 passed
// and THIS FILE STAYS FULLY GREEN — all four cases — because a broken `@theme` block does not touch
// the `[data-theme]` rules these assertions read. Nested theming was dead in that build and nothing
// here noticed. Read that as the boundary of this file rather than as a defect in it: it proves the
// selector shape re-binds tokens, and it can never prove that anything reads them.
//
// ── NOT COVERED — real blind spots ────────────────────────────────────────────────────────────────
//   • Paint. See (b). Nothing here can distinguish a correct theme from one whose every utility
//     points at the wrong token — that is the sibling file's job, and it is why that one is primary.
//   • The CASCADE ORDER of the real stylesheet. This injects two rules into an empty document; the
//     shipped sheet has ~130KB of layered utilities around them.
//   • Whether `/dev/theme` renders these subtrees. Asserted structurally in the sibling file.

import * as React from "react";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, cleanup } from "@testing-library/react";

import postcss from "postcss";

import { GLOBALS_CSS_PATH, readThemeTokens } from "./helpers/compile-css";

const themes = readThemeTokens();

/**
 * The two `[data-theme]` rules, VERBATIM from the authored stylesheet.
 *
 * A CSS parse rather than a regex, for the reason this phase has now hit a dozen times: the file is
 * full of long block comments that name selectors and quote braces-adjacent syntax, and a textual
 * slice would either swallow one or stop inside one. `rule.toString()` returns exactly the authored
 * bytes of each rule, comments and all.
 */
function authoredThemeCss(): string {
  const blocks: string[] = [];
  postcss.parse(readFileSync(GLOBALS_CSS_PATH, "utf8")).walkRules((rule) => {
    if (rule.selector.includes("[data-theme=")) blocks.push(rule.toString());
  });
  return blocks.join("\n");
}

/** Every space removed — see the one assertion that uses it for why that is sound there. */
const squash = (value: string): string => value.replace(/\s+/g, "");

let style: HTMLStyleElement;

beforeAll(() => {
  style = document.createElement("style");
  style.textContent = authoredThemeCss();
  document.head.appendChild(style);
});

afterAll(() => {
  style.remove();
  cleanup();
});

describe("THEME-04 — a nested subtree re-binds its own tokens", () => {
  it("lifted two real theme blocks out of the stylesheet", () => {
    // GUARD THE GUARD, and it comes first because everything below is a value comparison that an
    // empty <style> would turn into a comparison of two undefineds. Both selectors must be present
    // AND the tokens they are checked against must be non-empty.
    const css = style.textContent ?? "";
    expect(css).toContain('[data-theme="court"]');
    expect(css).toContain('[data-theme="grove"]');
    expect(css.length).toBeGreaterThan(1000);
    expect(themes.court["--brand"]).toBeTruthy();
    expect(themes.grove["--brand"]).toBeTruthy();
    expect(themes.court["--brand"]).not.toBe(themes.grove["--brand"]);
  });

  it("gives a nested host, and its children, the nested theme's values", () => {
    render(
      <div data-theme="court" data-testid="outer">
        <span data-testid="outer-child">court</span>
        <div data-theme="grove" data-testid="inner">
          <span data-testid="inner-child">grove</span>
        </div>
      </div>,
    );

    const brandOf = (testId: string) =>
      getComputedStyle(screen.getByTestId(testId)).getPropertyValue("--brand").trim();

    // The outer host holds court's accent; the nested host holds grove's; and — the half that
    // actually matters for a real pane — inheritance carries each one down to descendants that
    // declare no theme of their own. Every component inside a pane is such a descendant.
    expect(brandOf("outer")).toBe(themes.court["--brand"]);
    expect(brandOf("outer-child")).toBe(themes.court["--brand"]);
    expect(brandOf("inner")).toBe(themes.grove["--brand"]);
    expect(brandOf("inner-child")).toBe(themes.grove["--brand"]);
  });

  it("re-binds geometry and type at the nested host too, not only colour", () => {
    // D-02: the second theme travels in HUE and in GEOMETRY, and DS-02 makes type travel with it. A
    // nesting mechanism that reached colour and stopped would leave grove's shape and its type scale
    // pinned to whatever the root happened to be — the failure that is easiest to read past, because
    // the page would still look like two themes.
    render(
      <div data-theme="court">
        <div data-theme="grove" data-testid="geometry" />
      </div>,
    );

    const nested = getComputedStyle(screen.getByTestId("geometry"));
    expect(nested.getPropertyValue("--radius").trim()).toBe(themes.grove["--radius"]);
    expect(nested.getPropertyValue("--fs-display").trim()).toBe(themes.grove["--fs-display"]);
    // WHITESPACE-INSENSITIVE FOR THIS ONE ONLY, and the reason is measured rather than assumed:
    // jsdom re-serialises a multi-token custom-property value and drops the spaces around the alpha
    // slash, so the authored `oklch(0.17 0.02 190 / 0.1)` reads back as `oklch(0.17 0.02 190/0.1)`.
    // That is a serialisation difference, not a cascade one — the two single-token values above are
    // compared byte-for-byte precisely because they can be.
    expect(squash(nested.getPropertyValue("--elevation-raised"))).toBe(
      squash(themes.grove["--elevation-raised"]),
    );
    // …and the values it re-binds are genuinely different ones, or the assertions above would hold
    // just as well against a mechanism that never fired.
    expect(themes.grove["--radius"]).not.toBe(themes.court["--radius"]);
    expect(themes.grove["--fs-display"]).not.toBe(themes.court["--fs-display"]);
  });

  it("leaves the document root on the first theme, which is why the root switch hides this bug", () => {
    // `:root` is a separate selector in the court block's list, so an untouched `<html>` reads
    // court. THAT is the state a build with a broken `@theme inline` still gets right — and the
    // reason a verification that only toggles the root attribute proves nothing. Asserted here so
    // the distinction is executable rather than a comment.
    expect(getComputedStyle(document.documentElement).getPropertyValue("--brand").trim()).toBe(
      themes.court["--brand"],
    );
  });
});
