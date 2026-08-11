// DS-01 — the app renders in Geist.
//
// `@theme inline` shipped `--font-sans: var(--font-sans)`. A custom property that references itself
// is invalid at computed-value time: the browser discards it, `font-family` falls through to the
// platform default, and EVERY SCREEN in the app rendered in a fallback face rather than Geist. The
// bug is one line long, invisible in review, and cost nothing to introduce — which is exactly why it
// is worth a permanent test rather than a one-off fix.
//
// WHY THIS ASSERTS AGAINST COMPILED OUTPUT, NOT THE SOURCE STYLESHEET. Reading `globals.css` and
// grepping for the bad string proves the string is gone; it does not prove the compiler resolves
// `font-sans` to Geist. The failure mode being guarded is a RESOLUTION failure, so the assertion
// runs on what Tailwind emits (`compileGlobalsCss()`), where `--default-font-family` and the
// `.font-sans` utility are visible. jsdom cannot stand in here: it never substitutes `var()` and it
// ignores `@layer` outright, and Tailwind v4 emits everything inside `@layer` — see the THEME-04
// SPIKE verdict in `helpers/compile-css.ts`.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file rather than
// over-trusts it:
//   • This proves the stylesheet RESOLVES to `var(--font-geist-sans)`. It does not prove that
//     variable is defined at runtime — that comes from `geistSans.variable` on <html> in
//     `src/app/layout.tsx`, and only a browser (Phase 11's GATE-01 screenshot) can confirm the glyphs.
//   • The self-reference scan is textual over the emitted CSS. A cycle spread across two properties
//     (`--a: var(--b); --b: var(--a)`) is invisible to it; only direct self-reference is caught.
//   • Nothing here says anything about the TYPE SCALE (sizes, weights, tracking). That is plan 10-05.

// REWRITTEN IN PART BY PLAN 10-12, and the reason generalises. Three assertions here read artifacts
// that existed only because Tailwind's content scan rooted at the REPOSITORY: `.font-sans` and
// `.font-mono` are used as class names NOWHERE in `src/`, so the only thing emitting them — and the
// `:root` variables that came with them — was PLANNING PROSE (deferred item D-1). Narrowing the
// content root to `src/` removed the prose, the rules vanished, and three green assertions went red
// against a stylesheet that had not changed and an app whose fonts still work perfectly.
//
// They were not testing nothing; they were testing the wrong artifact. `font-sans` reaches the app
// through `@apply font-sans` inside `@layer base`, which INLINES the declaration and never needs the
// `.font-sans` utility rule to be generated at all. So the assertions now read the two things that
// are actually load-bearing — the `html` rule an unstyled element really gets, and `.font-heading`,
// which has two real call sites — and state the "IF it were used" claim explicitly through the
// safelist where that is what is meant. Verified in the SHIPPED bundle at the time of the rewrite:
// `html{font-family:var(--font-geist-sans)}` and `.font-heading{font-family:var(--font-geist-sans)}`
// are both present; `.font-sans` and `.font-mono` are absent and nothing in `src/` wants them.

import { describe, it, expect } from "vitest";

import {
  compileGlobalsCss,
  compileGlobalsCssWith,
  customPropertyValue,
} from "./helpers/compile-css";

/**
 * Every `--name: var(--other …)` declaration in the emitted CSS, as `[name, other]` pairs. The
 * trailing `[,)]` means a self-reference WITH a fallback (`--x: var(--x, sans-serif)`) is caught
 * too — that shape is just as invalid at computed-value time as the bare one.
 */
function varReferences(css: string): [string, string][] {
  const re = /(--[A-Za-z0-9_-]+)\s*:\s*var\(\s*(--[A-Za-z0-9_-]+)\s*[,)]/g;
  const pairs: [string, string][] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(css)) !== null) pairs.push([match[1], match[2]]);
  return pairs;
}

describe("DS-01 — the --font-sans cycle is gone from the compiled stylesheet", () => {
  it("emits no self-referential custom property anywhere (--X: var(--X))", async () => {
    const css = await compileGlobalsCss();
    const cycles = varReferences(css)
      .filter(([prop, ref]) => prop === ref)
      .map(([prop]) => prop);
    expect(
      cycles,
      `self-referential custom properties are discarded by the browser: ${cycles.join(", ")}`,
    ).toEqual([]);
  }, 60_000);

  it("resolves font-sans to the variable layout.tsx actually defines", async () => {
    // Stated as the conditional it really is: IF a surface uses `font-sans`, it resolves to Geist.
    // Asserted through the safelist because nothing in `src/` uses the class — the base layer
    // `@apply`s it, which inlines the declaration without generating the utility. Before the content
    // root was narrowed this passed on a rule emitted by planning prose.
    const css = await compileGlobalsCssWith(["font-sans", "font-figure"]);
    const rule = /\.font-sans\s*\{([^}]*)\}/.exec(css);
    expect(rule, "no .font-sans rule even with the utility safelisted").not.toBeNull();
    expect(rule![1].replace(/\s+/g, " ").trim()).toBe(
      "font-family: var(--font-geist-sans);",
    );
  }, 60_000);

  it("safelisting cannot fabricate a font family that was never declared", async () => {
    // The control for the assertion above. `font-figure` is safelisted beside `font-sans` and is
    // declared in no `@theme` block, so if it were emitted anyway the test above would be proving
    // something about the safelist rather than about the token.
    const css = await compileGlobalsCssWith(["font-sans", "font-figure"]);
    expect(/\.font-figure\s*\{/.exec(css)).toBeNull();
  }, 60_000);

  it("carries the fix through to --default-font-family", async () => {
    // This is the one Tailwind puts on `html` by default, so it is what an unstyled element gets.
    const css = await compileGlobalsCss();
    expect(customPropertyValue(css, "--default-font-family")).toBe(
      "var(--font-geist-sans)",
    );
  }, 60_000);

  it("puts Geist on `html` itself, which is what actually carries DS-01", async () => {
    // THE STRONGEST FORM OF THIS CLAIM, and the one the app depends on. `@layer base { html { @apply
    // font-sans } }` is the single line that reaches every screen; it inlines the declaration, so
    // this rule — not the `.font-sans` utility — is the artifact that decides whether the app renders
    // in Geist. Unforced and unsafelisted: it is emitted because the stylesheet really says so.
    const css = await compileGlobalsCss();
    const rule = /(?:^|\})\s*html\s*\{([^}]*font-family[^}]*)\}/m.exec(css);
    expect(rule, "no `html { font-family }` rule in the compiled output").not.toBeNull();
    expect(rule![1]).toContain("var(--font-geist-sans)");
  }, 60_000);

  it("keeps font-heading as a Geist alias (D-20 — the seam survives)", async () => {
    // D-20 deliberately KEEPS this token rather than deleting it: real branding later needs a place
    // to slot a display face in without touching a call site. It must not be the cycle again.
    //
    // Unlike `font-sans` this needs NO safelist — `card.tsx` and `dialog.tsx` both carry the class,
    // so the rule is emitted by real usage. That difference is the point: the alias is proven
    // end-to-end, from two shipped call sites through `@theme inline` to the layout variable.
    const css = await compileGlobalsCss();
    const rule = /\.font-heading\s*\{([^}]*)\}/.exec(css);
    expect(rule, "no .font-heading rule — has the last call site been removed?").not.toBeNull();
    expect(rule![1].replace(/\s+/g, " ").trim()).toBe(
      "font-family: var(--font-geist-sans);",
    );
  }, 60_000);

  it("drops the 13 unused side-nav and data-visualisation tokens", async () => {
    // Grep-verified zero-referenced before deletion. Keeping them meant authoring 13 grove values
    // nobody would ever see, each an unverifiable contrast pairing.
    const css = await compileGlobalsCss();
    expect(css).not.toMatch(/--sidebar/);
    expect(css).not.toMatch(/--chart-\d/);
  }, 60_000);

  // -------------------------------------------------------------------------
  // Guard the guard (T-10-06): every assertion above is a negative or an
  // equality against compiled text. An empty compile would pass most of them.
  // -------------------------------------------------------------------------
  it("guard-the-guard: the compile is real, not an empty string", async () => {
    const css = await compileGlobalsCss();
    expect(css.length).toBeGreaterThan(10000);
    expect(css).toMatch(/--font-/);
    expect(varReferences(css).length).toBeGreaterThan(0);
  }, 60_000);
});
