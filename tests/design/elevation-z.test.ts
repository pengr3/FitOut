// DS-03 — three named elevation steps that actually travel per theme, and the four-step z scale
// that deliberately does not.
//
// WHY THE NAMED STEPS ARE LOAD-BEARING RATHER THAN A NAMING PREFERENCE. Tailwind's default
// `shadow-sm` / `shadow-md` / `shadow-lg` compile to LITERAL values — `--tw-shadow: 0 4px 6px -1px
// var(--tw-shadow-color, rgb(0 0 0 / 0.1)), …` — not to a `var()` reference. So a theme block that
// redeclares `--shadow-md` changes nothing at all, and a surface left on `shadow-md` is frozen
// against every theme forever. D-02's "pronounced elevation" in grove is unreachable without
// `@theme inline` steps whose value is a var(). That is why this file asserts the COMPILED rule
// still contains `var(--elevation-` and not a flattened literal: flattening is the exact edit a
// future reader makes while "simplifying", and nothing else in the repo would notice.
//
// WHY THE Z SCALE IS ASSERTED TO BE ABSENT FROM THE THEMES. D-05 splits the contract: colour, type,
// radius and elevation travel; the spacing grid, the z-index scale and the motion tokens do not. A
// per-theme z-index is not a style choice, it is a way for one theme to reorder the app's layers —
// so "these four names are declared in the plain `:root` block and in NEITHER theme block" is the
// assertion, not merely "they exist somewhere".
//
// NOT COVERED — real blind spots:
//   • This proves the steps compile theme-aware. It says nothing about whether any component uses
//     them; the 14 shadow call sites migrate in a later plan and the leak gate owns that.
//   • The z scale is ADVISORY against a third-party widget with its own internal z-index (Leaflet's
//     control corners sit at 1000). Accepted for this phase and recorded as a Phase 18 rule: wrap
//     the vendor in a stacking context rather than inflating the scale. Nothing here can catch it.
//   • Whether the three steps read as a hierarchy is a human look at `/dev/theme`.

import { describe, it, expect } from "vitest";

import {
  readThemeTokens,
  readGlobalTokens,
  compileGlobalsCssWith,
  declarationsFor,
  THEME_NAMES,
} from "./helpers/compile-css";

/** Exactly three steps. A fourth is a scale that has stopped being a scale. */
const ELEVATION_STEPS = ["raised", "overlay", "sticky"] as const;

/** The four z layers and their contracted values, in ascending order. */
const Z_SCALE = [
  ["--z-sticky", "10"],
  ["--z-sheet", "20"],
  ["--z-dialog", "30"],
  ["--z-toast", "40"],
] as const;

const themes = readThemeTokens();
const globals = readGlobalTokens();

/** Every `--elevation-*` key a theme declares, sorted. */
function elevationKeysOf(theme: string): string[] {
  return Object.keys(themes[theme] ?? {})
    .filter((key) => key.startsWith("--elevation-"))
    .sort();
}

describe("DS-03 — exactly three elevation steps, per theme", () => {
  it("declares the three steps and no fourth, in both themes", () => {
    const expected = ELEVATION_STEPS.map((step) => `--elevation-${step}`).sort();
    for (const theme of THEME_NAMES) {
      expect(
        elevationKeysOf(theme),
        `${theme}'s elevation scale is not exactly the three contracted steps`,
      ).toEqual(expected);
    }
  });

  it("gives grove its own depth rather than court's (D-02)", () => {
    // A copied value here is the Pitfall 7 shape: grove's "pronounced elevation" declared but
    // invisible. Every step must move, not just the one that is easiest to eyeball.
    for (const step of ELEVATION_STEPS) {
      expect(
        themes.grove[`--elevation-${step}`],
        `grove's ${step} step is identical to court's`,
      ).not.toBe(themes.court[`--elevation-${step}`]);
    }
  });
});

describe("the named steps compile to a theme-aware var(), not a literal", () => {
  // Safelisted: the 14 shadow call sites migrate in a later plan, so nothing in `src/**` says
  // `shadow-overlay` yet and Tailwind emits only what its content scan finds.
  const FORCED = [
    "shadow-raised",
    "shadow-overlay",
    "shadow-sticky",
    "shadow-floating",
  ];

  it.each(ELEVATION_STEPS)("`.shadow-%s` references var(--elevation-…)", async (step) => {
    const css = await compileGlobalsCssWith(FORCED);
    const body = declarationsFor(css, `.shadow-${step}`);
    expect(body, `no .shadow-${step} rule was emitted at all`).not.toBeNull();
    expect(body).toContain("var(--elevation-");
    expect(body).toContain(`var(--elevation-${step})`);
  });

  it("leaves Tailwind's default shadows literal, which is why the named steps exist", async () => {
    // The positive control for the whole premise: if `.shadow-md` ever became var-referencing this
    // file's reason for existing would have changed, and a reader should be told rather than
    // discovering it by rewriting the scale.
    const css = await compileGlobalsCssWith(["shadow-md"]);
    const body = declarationsFor(css, ".shadow-md") ?? "";
    expect(body, "expected the default shadow to still be emitted").not.toBe("");
    expect(body).not.toContain("var(--shadow-md)");
  });
});

describe("D-05 — the z scale is global, and is not a per-theme knob", () => {
  it("declares exactly 10 / 20 / 30 / 40 in the plain :root block", () => {
    for (const [token, value] of Z_SCALE) {
      expect(globals[token], `the global block is missing ${token}`).toBe(value);
    }
  });

  it("is strictly increasing", () => {
    const values = Z_SCALE.map(([token]) => Number.parseInt(globals[token], 10));
    for (let i = 1; i < values.length; i++) {
      expect(
        values[i],
        `${Z_SCALE[i][0]} must sit above ${Z_SCALE[i - 1][0]}`,
      ).toBeGreaterThan(values[i - 1]);
    }
  });

  it("appears in NEITHER theme block", () => {
    // A per-theme z-index is not a style choice — it lets one theme reorder the app's layers. This
    // is the assertion that keeps the D-05 split honest as later plans add tokens.
    for (const theme of THEME_NAMES) {
      for (const [token] of Z_SCALE) {
        expect(
          themes[theme]?.[token],
          `${token} must not be declared inside the ${theme} block`,
        ).toBeUndefined();
      }
    }
  });
});

describe("the zero-edit motion lever is wired", () => {
  it("makes every bare transition-* utility read the global motion tokens", async () => {
    // Setting the two `--default-transition-*` entries retunes the whole app with no component
    // edits. If this ever stops holding, motion silently reverts to Tailwind's 150ms default.
    const css = await compileGlobalsCssWith(["transition-colors"]);
    const body = declarationsFor(css, ".transition-colors") ?? "";
    expect(body).toContain("var(--motion-fast)");
    expect(body).toContain("var(--motion-ease-standard)");
  });
});

// ---------------------------------------------------------------------------
// Guard the guard (T-10-06). `readGlobalTokens()` throws on a missing block, but
// a block that parsed thin would still satisfy every `toBe` above by accident,
// and a safelist that fabricated rules would make the compiled section vacuous.
// ---------------------------------------------------------------------------
describe("guard-the-guard", () => {
  it("parsed at least 8 keys from the global block", () => {
    expect(
      Object.keys(globals).length,
      "the plain :root block parsed too thin to be the real one",
    ).toBeGreaterThanOrEqual(8);
  });

  it("never let a theme block leak into the global read", () => {
    // The global block and the court block are both `:root`-flavoured selectors. A parser that
    // matched the selector LIST rather than the exact selector would return court's colours here
    // and every assertion above would still pass.
    expect(globals["--brand"]).toBeUndefined();
    expect(globals["--radius"]).toBeUndefined();
  });

  it("safelisting cannot fabricate an elevation step that was never declared", () => {
    return expect(
      compileGlobalsCssWith([
        "shadow-raised",
        "shadow-overlay",
        "shadow-sticky",
        "shadow-floating",
      ]).then((css) => declarationsFor(css, ".shadow-floating")),
    ).resolves.toBeNull();
  });
});
