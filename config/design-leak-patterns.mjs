// The SINGLE source of truth for what counts as a raw design value in this repo.
//
// WHY THIS FILE IS PLAIN ESM AND WHY IT LIVES OUTSIDE `src/` (D-16 + landmine L15):
//
//   D-16 requires ONE exported pattern list with TWO consumers — the ESLint rule
//   (`fitout/no-raw-design-value`, wired in plan 10-17) and the Vitest design gate
//   (`tests/design/leak.test.ts`). `eslint.config.mjs` is ESM JavaScript and cannot import a `.ts`
//   module without a loader, so the list cannot be TypeScript. And a module that literally contains
//   the hex and palette regexes would TRIP ITS OWN GATE if it sat under `src/app/**` or
//   `src/components/**`. Both constraints point at the same answer: a plain `.mjs` module in a
//   `config/` directory outside the scanned tree. Do not "improve" this into TypeScript — that
//   silently forks the list in two, which is the exact failure D-16 exists to prevent.
//
// WHAT IS BANNED, AND WHY IT IS WIDER THAN DS-13 (D-15):
//
//   DS-13's literal wording bans raw hex, `rgb(`/`oklch(`-style colour functions and arbitrary
//   `text-[NNpx]`. D-15 is the recorded, deliberate WIDENING of that to also ban numbered Tailwind
//   palette classes (`bg-zinc-50`) and the `white`/`black` classes. Reason: a numbered palette class
//   is a raw design value wearing a utility's clothes — it survives a theme switch unchanged and is
//   therefore exactly as theme-breaking as `#71717a`, while being far more common (19 app sites at
//   baseline vs 2 hex sites). Widening the ban once, with a reason on the record, is the whole of
//   D-15; widening it again without one erodes the discipline (see UI-SPEC § Resolved Q2).
//
// THERE IS NO VENDORED EXEMPTION (D-17):
//
//   `src/components/ui/**` — the 30 shadcn primitives — is INSIDE `LEAK_SCAN_GLOBS`, on purpose.
//   Those primitives are where every card, dialog and button in the app is actually defined; an
//   exemption for them would exempt the majority of the rendered surface and leave the gate policing
//   only the thin layer above it. Vendored files are forked files here, and forked files are ours.
//
// STATELESSNESS: every `pattern` below is declared WITHOUT the `g` flag. A `g`-flagged RegExp
// carries `lastIndex` across `.test()` calls and would make every second call return a different
// answer — a shared, module-level, reused pattern list is precisely where that bites.

/**
 * @typedef {object} DesignLeakPattern
 * @property {string} id       Stable machine key; referenced by tests and by the ESLint rule's report.
 * @property {string} label    Human-facing name used in the violation message.
 * @property {RegExp} pattern  Stateless (no `g` flag) matcher, run against a single source line or literal.
 * @property {string} why      The recorded reason this class is banned, including known tolerated debt.
 */

/**
 * Every Tailwind utility prefix that takes a COLOUR, as one shared regex fragment (WR-07).
 *
 * The palette and white/black patterns each used to carry their own hand-written, and DIFFERENT,
 * list of roles — so a shape banned as a palette class was legal as a white one, and neither list
 * was complete. Verified unmatched before this fragment existed: `border-b-gray-200`,
 * `border-t-slate-300`, `divide-x-zinc-200`, `border-l-white`, `ring-offset-white`, `from-white`,
 * `to-black`, `decoration-white`, `shadow-black`, `caret-white`, `placeholder-white`.
 *
 * Two families account for most of the gap and both are ordinary authoring, not exotica:
 *
 *   • DIRECTIONAL EDGES. `border-b-…`, `border-x-…`, `divide-y-…`. A single-side border is the
 *     normal way to draw a table rule or a list separator, and `border-b-border` becoming
 *     `border-b-gray-200` is one character class away from the form that WAS banned.
 *   • PREFIXED ROLES. `ring-offset-…`, `from-/via-/to-` gradient stops, `decoration-`, `shadow-`,
 *     `caret-`, `placeholder-`. `ring-offset-white` is the one this phase should care about most:
 *     the hardcoded white offset band is the exact defect `focus-recipe.test.ts` exists to prevent,
 *     and the leak gate could not see it written literally.
 *
 * Ordered longest-alternative-first where one name prefixes another (`ring-offset` before `ring`),
 * since JS alternation is first-match rather than longest-match.
 *
 * EXPORTED, AND THAT IS THE POINT (WR-08). This fragment was introduced to stop the palette and
 * white/black patterns disagreeing about which roles they police — and two hours earlier in the same
 * fix pass, `tests/design/brand-recipe.test.ts` grew its OWN hand-written role list for the
 * diluted-accent scan, without the two families this one exists for. The result was that
 * `border-b-gray-200` was banned by the leak gate while `border-b-brand/40` — a diluted accent edge,
 * the exact shape `border-brand/30` had to be measured and exempted for — was invisible to the
 * design gate. Verified unmatched by that scan before this export existed: `border-b-brand/30`,
 * `border-t-brand/40`, `divide-x-brand/50`.
 *
 * A third hand-written copy is how this defect returns. Import it; do not retype it.
 */
export const COLOUR_ROLE =
  "(?:bg|text|border(?:-[trblxyse])?|ring-offset|ring|from|via|to|fill|stroke|outline|decoration|divide(?:-[xy])?|placeholder|accent|caret|shadow)";

/** The 22 numbered Tailwind hues. Split out only so the pattern below stays readable. */
const PALETTE_HUES =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

/** @type {readonly DesignLeakPattern[]} */
export const DESIGN_LEAK_PATTERNS = [
  {
    id: "raw-hex",
    label: "raw hex colour",
    // Colour-context anchored: the hex must be the whole (trimmed) literal, or be immediately
    // preceded by `=`, a quote, `(`, `[`, `_`, `:` or `,`. Landmine L14: an unanchored
    // `#[0-9a-f]{3,8}` flags GitHub issue references like `see #3388 for details` (a real shape at
    // src/lib/db/schema.ts:730). The anchor keeps prose safe without needing an escape hatch.
    //
    // `[` AND `_` ARE LOAD-BEARING (CR-02, phase 10 review). Without them the anchor missed the
    // TAILWIND ARBITRARY-VALUE form — `bg-[#E8484E]`, `text-[#fff]`, `border-[#000]`,
    // `shadow-[0_1px_2px_#00000010]` — which is the idiomatic way a hex enters a Tailwind codebase
    // and a form this phase itself uses for non-hex values (`bg-[color-mix(…)]` at button.tsx:50).
    // Both halves of D-16 import this list, so the hole was shared: `npm run lint` and
    // `npm run test:design` were BOTH green on `hover:bg-[#c0392b]`.  `[` opens the arbitrary value;
    // `_` is Tailwind's space escape inside one, so it is the character preceding a hex in any
    // multi-part arbitrary value (a box-shadow, a gradient).
    //
    // A PLAIN SPACE IS ADMITTED TOO, BUT ONLY AFTER A CSS VALUE TOKEN (WR-11). `_` covers the
    // Tailwind arbitrary form; it does NOT cover the same colour written in an inline `style`
    // object, an SVG attribute, or a CSS shorthand, where the separator is a real space. All four
    // shapes below were probed against the shipped `findDesignLeaks` and returned `[]`:
    //
    //   "0 1px 2px #00000010"     a box-shadow in a style object
    //   "1px solid #ccc"          a border shorthand
    //   "inset 0 0 4px #000000"   an inset shadow
    //   "0 2px 8px #0000001a"     `style={{ boxShadow: … }}` — a frozen colour surviving a theme
    //                             switch, the single failure DS-13 exists to prevent, invisible to
    //                             `npm run lint` AND `npm run test:design`
    //
    // WHY THE ANCHOR IS THE PRECEDING TOKEN AND NOT THE PRECEDING CHARACTER. The obvious anchor —
    // "a digit, `)`, `%` or `,` before the space" — does not work, and was measured not working:
    // the character before the space in `2px #00000010`, `solid #ccc` and `4px #000000` is `x`,
    // `d` and `x`, all word characters, exactly like the `see ` in `see #3388 for details`. A
    // single character cannot separate CSS from prose here. What can is the preceding TOKEN: a
    // length with a unit, a percentage, a `)`, a `,`, or one of the border/shadow keywords. Prose
    // ends in an ordinary word, so `see #3388 for details`, `Closes #123` and `the PR #4021 landed`
    // still do not match — landmine L14 stays closed. Verified against both sets before adoption.
    pattern: new RegExp(
      `(?:^\\s*|[=_"'([:,]\\s*|(?:[0-9](?:px|rem|em|ch|ex|vh|vw|vmin|vmax|pt|pc|in|cm|mm|q|deg|%)|[0-9)%,]|\\b(?:inset|solid|dashed|dotted|double|groove|ridge|outset|none|transparent|currentcolor)\\b)\\s+)#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b`,
    ),
    why: "A hex literal is frozen at authoring time: it cannot respond to a theme switch or to dark mode. Real hits at baseline: src/components/listing/listing-map.tsx:22 (BRAND_CORAL) and :34 (fill=\"#fff\"). Deliberately NOT matched: a bare `#3388` in prose or a comment (issue references), because the pattern requires a colour context.",
  },
  {
    id: "color-function",
    label: "raw colour function",
    // The trailing `(` is MANDATORY (landmine L14): a bare `oklch` matches `in_oklch,` inside
    // src/components/ui/button.tsx:16's `color-mix(in_oklch,var(--secondary),var(--foreground)_5%)`.
    // CASE-INSENSITIVE (WR-07): CSS colour functions are case-insensitive, so `RGB(255,0,0)` and
    // `Oklch(…)` are valid, render identically, and were unmatched. The trailing `(` keeps doing
    // the work that matters — it is what stops `in_oklch,` inside the color-mix idiom matching —
    // and the `i` flag does not weaken it.
    pattern: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/i,
    why: "A literal colour function in a component is a token that was never declared. `color-mix(` is deliberately ABSENT from this list: a color-mix over two declared tokens is not a leak, it is this phase's prescribed hover idiom (button.tsx:16) and it tracks the theme correctly.",
  },
  {
    id: "arbitrary-text-px",
    label: "arbitrary text size",
    // px-only, per UI-SPEC § Resolved Open Questions 2.
    //
    // The optional `length:` prefix is Tailwind's own data-type hint (WR-07). `text-[length:14px]`
    // is the form authors reach for precisely when the bare one is ambiguous with a colour, so the
    // shape most likely to be typed deliberately was the one shape not matched.
    pattern: /text-\[(?:length:)?[0-9.]+px\]/,
    why: "An arbitrary type size bypasses the declared type scale (DS-02), so the ladder stops being a ladder. px-only by resolved decision (UI-SPEC Q2): it matches DS-13's literal wording and the measured baseline of 14 app / 0 vendored sites. KNOWN, TOLERATED DEBT, deliberately not matched: the 4 vendored rem sites — ui/button.tsx:27, ui/calendar.tsx:93, ui/calendar.tsx:102, ui/toggle.tsx:20 — all `text-[0.8rem]`. They are recorded rather than silently missed, and plan 10-11 asserts them as a positive control.",
  },
  {
    id: "palette-class",
    label: "numbered Tailwind palette class",
    pattern: new RegExp(`\\b${COLOUR_ROLE}-(?:${PALETTE_HUES})-(?:50|[1-9]00|950)\\b`),
    why: "D-15's recorded widening of DS-13. A numbered palette class resolves to a fixed colour that survives a theme switch unchanged, making it exactly as theme-breaking as a hex literal. 19 app sites, 0 vendored, at baseline. Use a semantic token class instead (bg-muted, text-muted-foreground, border-border).",
  },
  {
    id: "white-black-class",
    label: "white/black utility class",
    pattern: new RegExp(`\\b${COLOUR_ROLE}-(?:white|black)\\b`),
    why: "D-15's recorded widening of DS-13. `bg-white` is `--background` in court and wrong in every other theme and in dark mode; `text-black` is the same bug inverted. 8 app sites + 1 vendored (ui/dialog.tsx:42) at baseline — the vendored one is IN SCOPE by D-17. Shares COLOUR_ROLE with the palette pattern, so the two cannot drift apart on which roles they police.",
  },
];

/**
 * The trees the gate polices, as ESLint `files:` globs.
 *
 * D-17: `src/components/**` is unqualified on purpose — it includes `src/components/ui/**`, the 30
 * vendored shadcn primitives. There is no vendored exemption anywhere in this file.
 *
 * `src/lib/**` is deliberately OUT of scope: `src/lib/design/tokens.generated.ts` (plan 10-14) must
 * be free to hold hex fallbacks, and `src/lib/db/schema.ts:730` holds the `#3388` issue reference.
 * @type {readonly string[]}
 */
export const LEAK_SCAN_GLOBS = [
  "src/app/**/*.{ts,tsx}",
  "src/components/**/*.{ts,tsx}",
];

/**
 * The same scope expressed as forward-slash path prefixes, for the Vitest walker (which recurses
 * the filesystem itself rather than expanding globs). Must stay in lockstep with LEAK_SCAN_GLOBS.
 *
 * Note what is NOT here: `config/`. This module contains every banned pattern as a literal and
 * would flag itself if the gate ever scanned it — the reason the list lives outside `src/` (L15).
 * @type {readonly string[]}
 */
export const LEAK_SCAN_PREFIXES = ["src/app/", "src/components/"];

/** The ESLint rule id both consumers report under, so a violation reads the same from either gate. */
export const LEAK_DISABLE_RULE_ID = "fitout/no-raw-design-value";

/**
 * Run every pattern over one chunk of text and return the ids that matched.
 * Shared by the ESLint rule and the Vitest gate so "what counts as a hit" is also single-sourced.
 * @param {string} text
 * @returns {string[]} ids of the matching patterns, in declaration order
 */
export function findDesignLeaks(text) {
  const hits = [];
  for (const entry of DESIGN_LEAK_PATTERNS) {
    if (entry.pattern.test(text)) hits.push(entry.id);
  }
  return hits;
}
