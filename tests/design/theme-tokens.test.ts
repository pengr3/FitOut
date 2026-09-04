// THEME-02 / THEME-03 — the two theme blocks declare the IDENTICAL key set, and grove really travels.
//
// WHY SET EQUALITY IS THE ASSERTION. A token declared in `court` and forgotten in `grove` does not
// error and does not render wrong in any obvious way: the grove subtree simply inherits court's
// value through the cascade and looks *plausible*. That is a silent fallthrough, and it is the exact
// defect a second theme exists to expose. Reviewing two ~24-line blocks side by side is precisely
// the task humans are worst at, so it is asserted instead.
//
// WHY THIS READS THE SOURCE STYLESHEET, NOT COMPILED CSS. The question here is what each block
// DECLARES — a structural property of the authored file. Tailwind's output flattens the two blocks
// into `@layer` and does not preserve "which rule declared what" in a form worth re-deriving, and
// jsdom would be worse still (see the THEME-04 SPIKE verdict in helpers/compile-css.ts). The parser
// in config/design-tokens-source.mjs is a real brace-depth walker and is itself under test in
// infra.test.ts, so trusting it here is not trusting a regex.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file rather than
// over-trusts it:
//   • This proves the two blocks declare the same NAMES. It says nothing about whether the VALUES
//     are legible — that is contrast.test.ts, and both are needed.
//   • It cannot see a token that neither theme declares. A name used in a component but declared
//     nowhere renders as nothing in BOTH themes, which is a uniform failure this test calls equal.
//   • Global-only tokens (z-index, motion — D-05) live in a plain `:root` block and are invisible
//     here BY DESIGN. If a future plan moves one into a theme block it must be added to both.

import { describe, it, expect } from "vitest";

import { readThemeTokens, GLOBALS_CSS_PATH } from "./helpers/compile-css";
import { readFileSync } from "node:fs";

/** The 24 names the two-theme contract declares. Every one must exist in BOTH blocks. */
const REQUIRED_TOKENS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--brand",
  "--brand-foreground",
  "--success",
  "--success-foreground",
  "--destructive",
  "--destructive-foreground",
  "--ring",
  "--border",
  "--input",
  "--radius",
] as const;

/** The `.dark` value of `--brand`. It must never appear in a theme block's parsed values. */
const DORMANT_DARK_BRAND = "oklch(0.645 0.205 25)";

const themes = readThemeTokens();

describe("THEME-02 — court and grove declare the identical key set", () => {
  it("has exactly equal key sets", () => {
    const court = Object.keys(themes.court).sort();
    const grove = Object.keys(themes.grove).sort();
    const onlyInCourt = court.filter((k) => !grove.includes(k));
    const onlyInGrove = grove.filter((k) => !court.includes(k));
    // Named both ways round so a failure says WHICH block is short, not just "not equal".
    expect(onlyInCourt, "declared in court but missing from grove").toEqual([]);
    expect(onlyInGrove, "declared in grove but missing from court").toEqual([]);
    expect(court).toEqual(grove);
  });

  it("declares all 24 contracted token names in both themes", () => {
    for (const token of REQUIRED_TOKENS) {
      expect(themes.court[token], `court is missing ${token}`).toBeDefined();
      expect(themes.grove[token], `grove is missing ${token}`).toBeDefined();
    }
  });
});

describe("THEME-03 / D-02 — grove is a real second theme, not a copy of court", () => {
  it("moves the brand hue", () => {
    expect(themes.grove["--brand"]).not.toBe(themes.court["--brand"]);
  });

  it("moves the geometry", () => {
    // --radius is the single number the seven calc()-derived --radius-* steps scale off, so this one
    // difference re-shapes every rounded surface in the app.
    expect(themes.grove["--radius"]).not.toBe(themes.court["--radius"]);
  });

  it("keeps --destructive and --success global (identical in both themes)", () => {
    // Declared in BOTH blocks even though the value never moves — key-set equality requires the row.
    expect(themes.grove["--destructive"]).toBe(themes.court["--destructive"]);
    expect(themes.grove["--success"]).toBe(themes.court["--success"]);
  });
});

describe("D-04 — the cascade shape the theme blocks must keep", () => {
  const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

  it("uses bare unlayered [data-theme] selectors, never a raised-specificity form", () => {
    // `:root[data-theme="grove"]` / `html[data-theme="grove"]` still re-skin the app-wide switch, so
    // nothing looks broken — but they stop matching a nested `<div data-theme="grove">` and kill
    // THEME-04 silently. This is the anti-pattern the UI-SPEC names first.
    expect(css).not.toMatch(/:root\s*\[data-theme/);
    expect(css).not.toMatch(/html\s*\[data-theme/);
  });

  it("keeps grove AFTER court, because equal specificity means source order decides", () => {
    const court = css.indexOf('[data-theme="court"]');
    const grove = css.indexOf('[data-theme="grove"]');
    expect(court).toBeGreaterThan(-1);
    expect(grove).toBeGreaterThan(court);
  });

  it("keeps the dormant .dark block (D-03 — a cheap future theme, not a third one)", () => {
    expect(css).toMatch(/^\.dark \{/m);
  });

  it("has no --brand-strong escape hatch (D-11 — considered and rejected)", () => {
    expect(css).not.toMatch(/--brand-strong/);
  });
});

// ---------------------------------------------------------------------------
// Guard the guard (T-10-06): every assertion above compares two maps. Two EMPTY
// maps are trivially equal, and a parser that swallowed `.dark` would produce
// two maps that are equal and wrong.
// ---------------------------------------------------------------------------
describe("guard-the-guard", () => {
  it("parsed at least 24 keys from each theme", () => {
    expect(Object.keys(themes.court).length).toBeGreaterThanOrEqual(24);
    expect(Object.keys(themes.grove).length).toBeGreaterThanOrEqual(24);
  });

  it("never let the dormant .dark block leak into either theme", () => {
    // `.dark` redeclares --brand, --success and ~20 other names. A parser that read it would
    // overwrite both themes with dark-mode values and every assertion here would still pass.
    expect(Object.values(themes.court)).not.toContain(DORMANT_DARK_BRAND);
    expect(Object.values(themes.grove)).not.toContain(DORMANT_DARK_BRAND);
    expect(themes.court["--background"]).toBe("oklch(1 0 0)");
  });
});
