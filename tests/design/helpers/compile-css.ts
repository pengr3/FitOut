// Programmatic Tailwind compilation of `src/app/globals.css`, plus the one import site for token
// data, for every test in the design gate.
//
// WHY COMPILE AT ALL: the design system's most dangerous failure mode (AP-2) is invisible in the
// source stylesheet — dropping or rewriting `@theme inline` still leaves an app-wide theme switcher
// that works, while silently killing nested-subtree theming. The only place that bug is legible is
// the COMPILER'S OUTPUT: what `var(…)` reference does `.bg-brand` actually emit? So the gate reads
// the compiled CSS, not the authored CSS.
//
// NO DATABASE, BY CONSTRUCTION. This runs under `vitest.design.config.ts`, which declares no
// `globalSetup` and no `setupFiles` — see that file's header. Nothing here opens a connection.
//
// `postcss` is imported directly although it is not a direct devDependency: it is a hard dependency
// of `@tailwindcss/postcss`, so it cannot be absent while Tailwind v4 is installed. Noted here so a
// future reader does not "fix" it by inventing a second CSS pipeline.
//
// ===========================================================================================
// THEME-04 SPIKE (RESEARCH Open Question 5 / A7) — RUN 2026-08-11, jsdom 29.1.1, Node v24.13.0
// ===========================================================================================
//
// VERDICT: jsdom RESOLVES nested custom properties.
//
// This overturns assumption A7 ("jsdom cannot resolve custom-property cascades through
// getComputedStyle, so THEME-04 needs Playwright"), which was recorded as unverified. jsdom 29's
// CSS engine performs selector matching AND inheritance for custom properties. Exact snippet:
//
//   const dom = new JSDOM(`<!doctype html><html><head><style>
//        :root,[data-theme="court"]{--brand:red}
//        [data-theme="grove"]{--brand:green}
//      </style></head>
//      <body data-theme="court">
//        <div id="outer"><div data-theme="grove"><div id="nested">x</div></div></div>
//      </body></html>`);
//   const w = dom.window;
//   w.getComputedStyle(w.document.getElementById("nested")).getPropertyValue("--brand");
//
//   →  "green"                                      (the NESTED grove value — resolution works)
//   →  body[data-theme=court] reads "red"           (the outer value is not clobbered)
//   →  documentElement reads "red"                  (the :root half of the selector list works)
//
// TWO HARD LIMITS FOUND IN THE SAME SPIKE — both decisive, both measured:
//
//   1. jsdom DOES NOT SUBSTITUTE `var()`. With `.bg-brand{background-color:var(--brand)}` in the
//      same stylesheet, `getPropertyValue("background-color")` returns the literal string
//      "var(--brand)" for BOTH the court element and the nested grove element. jsdom can tell you
//      which value a custom property HOLDS; it can never tell you what colour an element PAINTS.
//   2. jsdom IGNORES `@layer` ENTIRELY. A declaration whose only home is `@layer utilities { … }`
//      computes to "" (empty), and loses outright to a bare `:root` rule when both exist. Tailwind
//      v4 emits every utility and every theme variable inside `@layer`, so a jsdom assertion run
//      against the COMPILED stylesheet sees nothing at all — it would be a permanently vacuous
//      pass, the exact failure class this phase exists to remove.
//
// CONSEQUENCE FOR PLAN 10-16 (THEME-04):
//
//   • The compiled-CSS check stays MANDATORY and is the primary assertion: every `@theme inline`
//     entry's utility must emit `var(--token)` and never `var(--color-token)`. Limit 1 means no
//     jsdom assertion can ever substitute for it, because the indirection bug lives in the `var()`
//     reference that jsdom refuses to follow.
//   • The `/dev/theme` human look remains the cover for the visual claim (a painted colour is out
//     of reach of both layers here; Phase 11's GATE-01 screenshot is where that lands).
//   • A jsdom nested-subtree assertion is now PERMITTED as a supplementary check — the verdict says
//     it would genuinely work — but ONLY if it (a) injects the RAW `[data-theme]` blocks parsed out
//     of `globals.css` (use `readThemeTokens()` / a hand-built <style>), never the compiled output,
//     and (b) asserts on `getPropertyValue("--token")` directly, never on a resolved colour.
//     Written into a `<style>` without `@layer`, it passes; written from compiled CSS, it is
//     vacuous. If 10-16 cannot honour both constraints, it must skip the jsdom layer rather than
//     weaken the assertion.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file rather than
// over-trusts it:
//   • This proves what the COMPILER EMITS, not what a browser PAINTS. Nothing reachable from here
//     can catch a cascade bug that only appears with real layout, real specificity resolution
//     across a real cascade order, or a real paint.
//   • Tailwind's content scan runs against the working tree, so the set of emitted utilities is a
//     function of what the app currently uses. An assertion that a utility EXISTS is really an
//     assertion that something in `src/**` still references it.
//   • No visual-regression baseline may be captured in this phase: GATE-01 is Phase 11, and DS-01
//     (the type-scale change) invalidates any screenshot taken before it. A green run here says
//     nothing about pixels.

import { readFile } from "node:fs/promises";

import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

import { GLOBALS_CSS_PATH } from "../../../config/design-tokens-source.mjs";

// One import site for token data across the whole design suite (D-16): tests import the parser
// from here so no test can accidentally hand-roll a second one.
export {
  readThemeTokens,
  readGlobalTokens,
  parseThemeTokens,
  parseGlobalTokens,
  THEME_NAMES,
  GLOBALS_CSS_PATH,
} from "../../../config/design-tokens-source.mjs";

/**
 * Module-level cache. Tailwind's content scan walks the repo, so the first compile costs real time
 * and every subsequent one is free. Vitest gives each test FILE its own module registry, so this
 * caches within a file, which is where the repeated calls are.
 */
let compiled: Promise<string> | null = null;

/**
 * Compile the real `src/app/globals.css` through Tailwind v4 and return the emitted CSS.
 *
 * `from` is passed so `@import "tailwindcss"`, `@import "tw-animate-css"` and
 * `@import "shadcn/tailwind.css"` resolve against the stylesheet's own directory — without it the
 * imports are left unresolved and the output is a near-empty file that every assertion then reads
 * as "the utility is missing".
 */
export function compileGlobalsCss(): Promise<string> {
  if (compiled === null) {
    compiled = (async () => {
      const source = await readFile(GLOBALS_CSS_PATH, "utf8");
      const result = await postcss([tailwindcss()]).process(source, {
        from: GLOBALS_CSS_PATH,
      });
      return result.css;
    })();
  }
  return compiled;
}

/**
 * The raw declaration body of the FIRST rule whose selector matches `selector` exactly
 * (whitespace-normalised). Returns `null` when no such rule exists — callers must treat `null` as a
 * failure, never as an empty pass.
 */
export function declarationsFor(css: string, selector: string): string | null {
  const wanted = normaliseSelector(selector);
  let body: string | null = null;
  postcss.parse(css).walkRules((rule) => {
    if (body !== null) return;
    if (normaliseSelector(rule.selector) !== wanted) return;
    body = (rule.nodes ?? []).map((node) => `${node.toString()};`).join("\n");
  });
  return body;
}

/**
 * The value of the first `--name:` declaration anywhere in `css`. The leading `--` is optional in
 * `name`. Returns `null` when the property is never declared.
 */
export function customPropertyValue(css: string, name: string): string | null {
  const prop = name.startsWith("--") ? name : `--${name}`;
  let value: string | null = null;
  postcss.parse(css).walkDecls((decl) => {
    if (value === null && decl.prop === prop) value = decl.value;
  });
  return value;
}

function normaliseSelector(selector: string): string {
  return selector.replace(/\s+/g, " ").trim();
}
