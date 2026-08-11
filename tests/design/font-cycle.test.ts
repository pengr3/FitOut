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

import { describe, it, expect } from "vitest";

import { compileGlobalsCss, customPropertyValue } from "./helpers/compile-css";

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

  it("resolves --font-sans to the variable layout.tsx actually defines", async () => {
    const css = await compileGlobalsCss();
    expect(customPropertyValue(css, "--font-sans")).toBe(
      "var(--font-geist-sans)",
    );
  }, 60_000);

  it("carries the fix through to --default-font-family", async () => {
    // This is the one Tailwind puts on `html` by default, so it is what an unstyled element gets.
    const css = await compileGlobalsCss();
    expect(customPropertyValue(css, "--default-font-family")).toBe(
      "var(--font-geist-sans)",
    );
  }, 60_000);

  it("emits a .font-sans utility that sets font-family to Geist", async () => {
    // `@layer base { html { @apply font-sans } }` is the single line that carries DS-01 to every
    // screen, so the utility it applies is asserted directly rather than inferred from the token.
    const css = await compileGlobalsCss();
    const rule = /\.font-sans\s*\{([^}]*)\}/.exec(css);
    expect(rule, "no .font-sans rule in the compiled output").not.toBeNull();
    expect(rule![1].replace(/\s+/g, " ").trim()).toBe(
      "font-family: var(--font-geist-sans);",
    );
  }, 60_000);

  it("keeps --font-heading as a Geist alias (D-20 — the seam survives)", async () => {
    // D-20 deliberately KEEPS this token rather than deleting it: real branding later needs a place
    // to slot a display face in without touching a call site. It must not be the cycle again.
    const css = await compileGlobalsCss();
    expect(customPropertyValue(css, "--font-heading")).toBe(
      "var(--font-geist-sans)",
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
