// THEME-04 — a nested `[data-theme]` subtree renders in its OWN theme, and the two mechanisms that
// make that true are asserted rather than trusted.
//
// WHY THIS REQUIREMENT NEEDS A TEST AT ALL, AND WHY THE OBVIOUS TEST IS WORTHLESS. The failure mode
// is not "theming is broken" — it is "theming still works everywhere anyone would think to look".
// Drop the word `inline` from the `@theme` block and every utility starts emitting
// `var(--color-background)` instead of `var(--background)`. The app-wide switcher keeps working
// perfectly, because next-themes sets the attribute on `<html>` and the `--color-*` aliases resolve
// there. What dies, silently and completely, is every NESTED subtree: a `<div>` carrying the second
// theme now renders the root theme's colours, its radius and its type. A verification that only
// toggles the root attribute passes against exactly that broken build (RESEARCH Pitfall 3). So the
// primary assertion here is a claim about the COMPILED STYLESHEET, which is the only artifact where
// the bug is legible.
//
// ── THE ASSERTION LAYER WAS DECIDED BY MEASUREMENT, NOT PREFERENCE ────────────────────────────────
// Plan 10-02 ran the spike and recorded its verdict in `helpers/compile-css.ts` under the
// `THEME-04 SPIKE` marker: **jsdom RESOLVES nested custom properties** — the opposite of the
// research's assumption — with two hard limits that decide the shape of this file:
//
//   1. jsdom NEVER substitutes `var()`. It can say which value a custom property HOLDS; it can never
//      say what colour an element PAINTS. The indirection bug lives in precisely the `var()`
//      reference jsdom refuses to follow, so no jsdom assertion can stand in for the compiled check.
//   2. jsdom IGNORES `@layer` ENTIRELY, and Tailwind v4 emits every utility and every theme variable
//      inside `@layer`. A jsdom assertion run over COMPILED output therefore sees nothing at all —
//      a permanently vacuous pass.
//
// Consequently: the compiled-CSS block below is MANDATORY and primary. The verdict also PERMITS a
// supplementary jsdom layer, on two conditions — it must inject the RAW theme blocks read out of
// `globals.css` (never compiled output) and assert `getPropertyValue("--token")` directly (never a
// resolved colour). Both are honoured, in the sibling file `theme-nesting-render.test.tsx`, which
// exists because the verdict came back RESOLVES; had it come back the other way that file would be
// absent and this one would stand alone.
//
// ── OBSERVED RED, NOT ASSUMED ─────────────────────────────────────────────────────────────────────
//   • The word `inline` deleted from `globals.css`'s `@theme inline` block → the pair of
//     theme-nesting files exits NON-ZERO (`EXIT=1`) at **5 failed / 11 passed**. All three utility
//     assertions fired with the emitted text quoted — `background-color: var(--color-background)`
//     where `var(--background)` was required, and `border-radius: var(--radius-lg)` where
//     `var(--radius)` was — the zero-occurrences assertion reported **201** alias references, and
//     the source assertion caught the bare block.
//   • THE MOST INSTRUCTIVE PART OF THAT RUN IS WHAT STAYED GREEN. Every structural assertion here —
//     both theme selectors unlayered and source-ordered, no specificity prefix, two nested panes on
//     the page — passed against a build in which nested theming was completely dead. So did all four
//     assertions in the sibling jsdom file, because a broken `@theme` block does not touch the
//     `[data-theme]` rules it reads. That is the concrete demonstration of why the compiled check is
//     primary and everything else here is supplementary: a `[data-theme]`-shaped verification proves
//     nothing on its own, which is exactly RESEARCH Pitfall 3.
//   • Restored → exits 0 with **16 passed** across the two files (12 here, 4 there).
//
// ── NOT COVERED — real blind spots, listed so the next reader under-trusts this file ──────────────
//   • This proves what the COMPILER EMITS and what a custom property HOLDS. It does not prove what a
//     browser PAINTS. That claim is covered by the human look at `/dev/theme` in plan 10-17, and by
//     Phase 11's theme-swap smoke, which drives a real browser through the Playwright seam plan
//     10-05 built. (While writing plan 10-16 the page was also driven through a real Chromium and
//     both panes read back their own brand, radius, type scale and elevation — recorded in
//     `10-16-SUMMARY.md`, but that was a one-off probe and is deliberately NOT committed as a gate:
//     a visual-regression baseline in this phase is a scope alarm, GATE-01 is Phase 11, and DS-01
//     invalidates anything shot before it.)
//   • The emitted-utility set is a function of what `src/**` currently references. An assertion that
//     a rule EXISTS is really an assertion that something still uses it — which is why the utilities
//     chosen below are ones `/dev/theme` itself renders in both panes.
//   • Nothing here can see a THIRD theme being added and only half-declared. That is THEME-02's
//     key-set equality test.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import postcss from "postcss";

import { compileGlobalsCss, declarationsFor, GLOBALS_CSS_PATH } from "./helpers/compile-css";

const PAGE_PATH = resolve(process.cwd(), "src/app/dev/theme/page.tsx");
const LAYOUT_PATH = resolve(process.cwd(), "src/app/layout.tsx");

const globalsSource = readFileSync(GLOBALS_CSS_PATH, "utf8");
const pageSource = readFileSync(PAGE_PATH, "utf8");
const layoutSource = readFileSync(LAYOUT_PATH, "utf8");

/**
 * The utilities whose emitted `var()` reference IS the mechanism.
 *
 * One per travelling dimension — colour surface, colour accent, geometry — because a partial break
 * is possible: `@theme inline` covers every entry in the block, but a future edit could move one
 * family out of it and leave the rest correct. All three are rendered by `/dev/theme` in both panes,
 * so each is emitted by the ordinary content scan with nothing forced.
 */
const MECHANISM = [
  { utility: ".bg-background", property: "background-color", token: "--background" },
  { utility: ".bg-brand", property: "background-color", token: "--brand" },
  { utility: ".rounded-lg", property: "border-radius", token: "--radius" },
] as const;

/** Every top-level rule of the AUTHORED stylesheet whose selector names a theme attribute. */
function authoredThemeRules(): { selector: string; layered: boolean }[] {
  const found: { selector: string; layered: boolean }[] = [];
  postcss.parse(globalsSource).walkRules((rule) => {
    if (!rule.selector.includes("[data-theme=")) return;
    found.push({
      selector: rule.selector.replace(/\s+/g, " ").trim(),
      layered: rule.parent?.type !== "root",
    });
  });
  return found;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// THE MANDATORY LAYER — the compiled stylesheet, where the bug is legible.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe("THEME-04 — every utility resolves at the ELEMENT, not at the root", () => {
  it.each(MECHANISM)(
    "`$utility` emits `$property: var($token)`",
    async ({ utility, property, token }) => {
      const body = declarationsFor(await compileGlobalsCss(), utility);
      expect(body, `${utility} is not emitted at all — has its last call site gone?`).not.toBeNull();
      expect(body).toContain(`${property}: var(${token})`);
    },
  );

  it("emits ZERO `--color-*` indirections — the one assertion that catches a dropped `inline`", async () => {
    // THE LOAD-BEARING ONE. `@theme` (without `inline`) registers every entry as a `--color-*`
    // variable of its own and points utilities at THAT, which resolves wherever the variable was
    // declared — the root. `@theme inline` substitutes the value into the utility instead, so the
    // reference is to the raw token and resolution is deferred to the element the utility lands on.
    // Counting the alias prefix across the WHOLE output is what makes this insensitive to which
    // particular utilities happen to have call sites today.
    const css = await compileGlobalsCss();
    const hits = css.match(/var\(--color-/g) ?? [];
    expect(
      hits.length,
      `${hits.length} utilities resolve through a --color-* alias, so nested themes are dead`,
    ).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// THE AUTHORED STYLESHEET — the selector shape, which is the second way to kill this silently.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe("THEME-04 — the theme blocks stay bare, unlayered attribute selectors", () => {
  it("declares the theme block with `inline`, and never as a bare block", () => {
    expect(globalsSource).toContain("@theme inline");
    // A bare `@theme {` alongside it would reintroduce the alias family for whatever it holds, and
    // the zero-occurrences assertion above would then be reporting on a partially-broken contract.
    expect(/@theme\s*\{/.test(globalsSource), "a bare @theme block was added").toBe(false);
  });

  it("keeps both theme selectors OUT of any `@layer`, with grove second", () => {
    // Equal specificity (0,1,0) and source order are the whole mechanism. Unlayered also matters:
    // an unlayered rule outranks everything Tailwind emits inside `@layer theme`, which is what lets
    // a theme block override the framework's own defaults without a specificity war.
    const rules = authoredThemeRules();
    expect(rules.length, "the two theme blocks are not both present").toBe(2);
    expect(rules.every((r) => !r.layered), "a theme block was moved inside an @layer").toBe(true);
    expect(rules[0].selector).toContain('[data-theme="court"]');
    expect(rules[1].selector).toBe('[data-theme="grove"]');
  });

  it("never raises the theme selectors' specificity with an element or `:root` prefix", () => {
    // SAME FAILURE CLASS AS DROPPING `inline`, and it looks like a tightening rather than a break:
    // both forms still match `<html data-theme="grove">`, so the app-wide switch survives, while a
    // nested `<div data-theme="grove">` stops matching entirely. The court block's `:root,` is a
    // separate SELECTOR IN A LIST, not a prefix, which is why it is legal and these are not.
    expect(globalsSource).not.toContain(":root[data-theme=");
    expect(globalsSource).not.toContain("html[data-theme=");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// THE SURFACE THAT EXERCISES IT — two nested subtrees, neither of them the document root.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe("THEME-04 — `/dev/theme` renders two nested themed subtrees", () => {
  it("carries exactly one element per theme", () => {
    // Exactly one, not at least one: two panes is the comparison. A third would mean somebody added
    // a theme without adding a column, and a missing one means the page has stopped being a diff.
    expect(pageSource.split('data-theme="court"').length - 1).toBe(1);
    expect(pageSource.split('data-theme="grove"').length - 1).toBe(1);
  });

  it("puts both on ordinary elements inside the component, never on the document root", () => {
    // THE ASSERTION THAT DISTINGUISHES THIS PAGE FROM A ROOT TOGGLE. A preview that set the theme on
    // `<html>` — or that rendered one theme and asked the reviewer to flip the switcher — would
    // satisfy every other assertion in this file while proving nothing about nesting at all, because
    // the root is where a build with no `inline` still works.
    expect(/<div\s+data-theme="court"/.test(pageSource)).toBe(true);
    expect(/<div\s+data-theme="grove"/.test(pageSource)).toBe(true);
  });

  it("leaves the root theme to the runtime, so the panes are genuinely nested", () => {
    // The root layout must not hard-code a theme attribute: next-themes sets it before paint, and a
    // literal here would both fight that script and turn one of the two panes into a same-theme
    // no-op that nobody would notice.
    expect(layoutSource).not.toContain("data-theme=");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// GUARD THE GUARD. Two of the assertions above are ZERO-OCCURRENCE claims, and an empty compile
// satisfies both perfectly.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

describe("guard-the-guard", () => {
  it("compiled something real, so the zero-occurrence claims are not vacuous", async () => {
    const css = await compileGlobalsCss();
    expect(css.length, "the compile produced nothing — every absence assertion above is empty").toBeGreaterThan(
      10000,
    );
    expect(css).toContain("[data-theme");
  });

  it("read the real page and the real stylesheet, not two empty strings", () => {
    // The same shape one level up: three `.split().length - 1` counts and two `not.toContain`s all
    // pass against a file that failed to read. A truncated read is the quiet version of a deleted
    // gate.
    expect(globalsSource.length).toBeGreaterThan(5000);
    expect(pageSource.length).toBeGreaterThan(2000);
    expect(layoutSource).toContain("<html");
  });
});
