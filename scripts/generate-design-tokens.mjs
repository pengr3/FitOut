// Generate the committed design-token module and the two themed favicons from `src/app/globals.css`.
//
// DS-12 / D-18. `globals.css` is the single source of truth for what a theme's colours ARE, and
// almost every surface in the app reads it directly through CSS custom properties. A handful of
// consumers cannot: an inline SVG string handed to a mapping library, a document-level error page
// that renders before the stylesheet loads, an HTML email. Those need a LITERAL — and a literal
// typed by hand drifts. It had already drifted: `src/components/listing/listing-map.tsx` shipped a
// coral that stopped matching `--brand` the moment that token was re-derived for contrast (10-03),
// and nothing in the repository could tell. This script is why that can only happen once.
//
// WHAT IT WRITES (three files, all committed):
//   • src/lib/design/tokens.generated.ts   — every COLOUR token of both themes, oklch + 8-bit hex
//   • public/icon-court.svg                — the court-themed letterform favicon (D-19)
//   • public/icon-grove.svg                — its grove twin
//
// D-18 SAYS "COMMITTED, WITH A CHECK THAT FAILS ON DRIFT" — NOT "BUILT AND GITIGNORED", and
// emphatically not "hand-written with an equality test". A build-time artifact is invisible in
// review and absent from a `git grep`; an equality test between two hand-maintained lists proves
// only that they agree with each other, and the cheapest way to make a red one green is to edit
// whichever side is convenient. Generating and committing makes the stylesheet the only editable
// source, and reduces the check to one question: was this regenerated? That check is
// `tests/design/token-drift.test.ts`, wired into `npm run test:design` — this repository has no CI
// (there is no workflows directory), so a test is the only place a regen-diff gate can live.
//
// PATH SAFETY (T-10-03 / ASVS V12). Every path this script reads or writes is a module-level
// `resolve(process.cwd(), "<literal>")` constant. The script takes NO parameters from the command
// line, reads none from the environment, and no function below derives a destination from anything
// a caller supplies. A codegen script that can be pointed at an arbitrary file is a write primitive;
// this one can only ever touch the three files named above.
//
// SHAPE. `renderTokensModule` and `renderIconSvg` are PURE — text in, text out, no filesystem — so
// the drift test can render into memory and compare bytes without the test itself being able to
// repair the file it is checking. All writing happens in `main()`, which runs only when this file
// is the process entry point.
//
// DETERMINISM IS A CORRECTNESS REQUIREMENT HERE, not a nicety: the drift test asserts BYTE equality.
// So there is no timestamp, no hostname, no version string and no dependence on object iteration
// order — keys are sorted by UTF-16 code unit (never with a locale-aware comparator, which is ICU-
// and therefore machine-dependent) and every string is emitted through `JSON.stringify`.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { converter, formatHex, parse } from "culori";

import {
  readThemeTokens,
  THEME_NAMES,
} from "../config/design-tokens-source.mjs";

/** The generated token module. Hard-coded — see PATH SAFETY above. */
const TOKENS_MODULE_PATH = resolve(
  process.cwd(),
  "src/lib/design/tokens.generated.ts",
);

/** The two themed favicons. Hard-coded, one per theme, in the same order as THEME_NAMES. */
const ICON_PATHS = {
  court: resolve(process.cwd(), "public/icon-court.svg"),
  grove: resolve(process.cwd(), "public/icon-grove.svg"),
};

const toRgb = converter("rgb");

/**
 * A declared value belongs in the generated module only when it is a SINGLE `oklch()` call and
 * nothing else. That is what separates the colour contract from everything else `globals.css`
 * declares per theme — type sizes, weights, tracking, radius — and it is also why the elevation
 * steps are absent: `0 2px 6px -1px oklch(…)` is a shadow shorthand that CONTAINS a colour, not a
 * colour, and there is no hex for it.
 */
const SINGLE_OKLCH = /^oklch\([^()]*\)$/;

/**
 * @typedef {Record<string, string>} TokenMap
 * @typedef {Record<string, TokenMap>} ThemeTokens
 */

/**
 * Convert one authored CSS colour to its 8-bit sRGB hex.
 *
 * Throws rather than returning a fallback on anything unexpected: a token that silently became
 * `#000000` would be a plausible-looking lie propagated into a favicon and a map pin, and a lie
 * that renders is the failure mode this whole module exists to remove.
 *
 * @param {string} name
 * @param {string} cssValue
 * @returns {string}
 */
function hexOf(name, cssValue) {
  const rgb = toRgb(parse(cssValue));
  if (rgb === undefined) {
    throw new Error(
      `[generate-design-tokens] ${name}: unparseable colour ${JSON.stringify(cssValue)}`,
    );
  }
  if (rgb.alpha !== undefined && rgb.alpha !== 1) {
    // An 8-bit hex has nowhere to put alpha, and silently dropping it would make the generated
    // literal a DIFFERENT colour from the one the stylesheet paints. No theme token carries alpha
    // today; if one ever does, this must grow an 8-digit form rather than lose the channel.
    throw new Error(
      `[generate-design-tokens] ${name}: ${JSON.stringify(cssValue)} carries alpha, which a 6-digit hex cannot represent`,
    );
  }
  return formatHex(rgb);
}

/**
 * The colour token names a theme declares, sorted by UTF-16 code unit.
 * @param {TokenMap} map
 * @returns {string[]}
 */
function colourKeysOf(map) {
  return Object.keys(map)
    .filter((key) => SINGLE_OKLCH.test(map[key]))
    .sort();
}

/**
 * Look a token up, failing loudly when it is missing. An absent `--brand` must never render as an
 * empty fill attribute — that produces a black square that looks deliberate.
 * @param {ThemeTokens} tokens
 * @param {string} theme
 * @param {string} name
 * @returns {string}
 */
function requireToken(tokens, theme, name) {
  const value = (tokens[theme] ?? {})[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `[generate-design-tokens] theme "${theme}" does not declare ${name}`,
    );
  }
  return value;
}

/**
 * Render the committed token module's full text. PURE — no filesystem, no clock.
 * @param {ThemeTokens} tokens
 * @returns {string}
 */
export function renderTokensModule(tokens) {
  const union = THEME_NAMES.map((name) => JSON.stringify(name)).join(" | ");

  const themeBlocks = THEME_NAMES.map((theme) => {
    const map = tokens[theme] ?? {};
    const keys = colourKeysOf(map);
    if (keys.length === 0) {
      throw new Error(
        `[generate-design-tokens] theme "${theme}" declares no oklch colour tokens`,
      );
    }
    const rows = keys.map((key) => {
      const oklch = map[key];
      const hex = hexOf(`${theme} ${key}`, oklch);
      return `    ${JSON.stringify(key)}: { oklch: ${JSON.stringify(oklch)}, hex: ${JSON.stringify(hex)} },`;
    });
    return [`  ${theme}: {`, ...rows, "  },"].join("\n");
  });

  return [
    "// DO NOT EDIT — generated by scripts/generate-design-tokens.mjs.",
    "// Run `npm run design:tokens` to regenerate; tests/design/token-drift.test.ts fails on any diff.",
    "//",
    "// DS-12 / D-18 — the ONLY sanctioned duplicate of a design-token value in this repository.",
    "//",
    "// WHY A DUPLICATE IS ALLOWED TO EXIST AT ALL. Nearly everything in this app paints through CSS",
    "// and reads these custom properties directly, which is why there is no other copy anywhere. A",
    "// few consumers genuinely cannot read CSS: an inline SVG string handed to a mapping library, a",
    "// document-level error page that renders before the stylesheet, an HTML email. They need a",
    "// literal — and a literal typed by hand drifts. It already had: the single-listing map carried a",
    "// coral that stopped matching --brand when that token was re-derived for contrast, and nothing",
    "// in the repository could tell. Import from here instead of writing a hex.",
    "//",
    "// THIS FILE SITS OUTSIDE THE DESIGN GATE'S SCANNED TREE ON PURPOSE. src/app/** and",
    "// src/components/** are scanned for raw colour values; src/lib/design/** is not. That asymmetry",
    "// is the whole design: the hex literals below are legal precisely because they are generated,",
    "// checked against the stylesheet on every test run, and unreachable by hand-editing without a",
    "// red test.",
    "//",
    "// ONLY COLOUR TOKENS APPEAR HERE. Both theme blocks also declare type, radius, elevation and",
    "// motion values, none of which has a hex. A key is included when its declared value is a single",
    "// oklch() call and nothing else — which is also why the elevation steps are absent: a shadow",
    "// shorthand CONTAINS a colour, it is not one.",
    "//",
    "// KEYS ARE SORTED by UTF-16 code unit rather than kept in stylesheet order, and never with a",
    "// locale-aware comparator, because the drift check asserts byte equality and a locale-aware sort",
    "// is machine-dependent.",
    "",
    "/** One token: the value `globals.css` authored, and its 8-bit sRGB equivalent. */",
    "export type TokenValue = { readonly oklch: string; readonly hex: string };",
    "",
    "/** The themes the stylesheet declares, in source order. */",
    `export const THEME_NAMES = [${THEME_NAMES.map((n) => JSON.stringify(n)).join(", ")}] as const;`,
    "",
    "/**",
    " * Every colour token of every theme, keyed by the custom-property name EXACTLY as it appears in",
    " * `globals.css` — leading `--` included, so a reader can grep one string across the stylesheet,",
    " * this module and every consumer.",
    " *",
    " * The theme union is spelled out rather than derived from THEME_NAMES so the type a consumer",
    " * hovers is the two literal names, not an indirection.",
    " */",
    `export const THEME_TOKENS: Record<${union}, Record<string, TokenValue>> = {`,
    ...themeBlocks,
    "};",
    "",
  ].join("\n");
}

/**
 * Render one theme's favicon. PURE — no filesystem, no clock.
 *
 * 32x32, a rounded square in the theme's own `--brand` with an "F" in `--brand-foreground`, which
 * is the one pairing both themes derive to 4.57:1 (D-12) — so the mark is legible in both by
 * construction rather than by eye.
 *
 * @param {string} themeName
 * @param {ThemeTokens} tokens
 * @returns {string}
 */
export function renderIconSvg(themeName, tokens) {
  const brand = hexOf(
    `${themeName} --brand`,
    requireToken(tokens, themeName, "--brand"),
  );
  const ink = hexOf(
    `${themeName} --brand-foreground`,
    requireToken(tokens, themeName, "--brand-foreground"),
  );

  return [
    "<!--",
    "  DO NOT EDIT — generated by scripts/generate-design-tokens.mjs from src/app/globals.css.",
    "  Run `npm run design:tokens` to regenerate; tests/design/token-drift.test.ts fails on any diff.",
    "",
    "  D-19 — the favicon is a THEMED letterform read from the token contract, so the browser tab is",
    "  one more surface the grove swap proves rather than the one place the old brand survives.",
    "  src/components/theme/favicon-swap.tsx points the icon link at this file or at its twin.",
    "",
    "  THE LETTERFORM IS AN OUTLINED PATH, AND THAT IS FORCED RATHER THAN STYLISTIC. An SVG favicon",
    "  renders in an isolated document that loads NO webfonts, so a font-family attribute here would",
    "  fall back to whatever sans the platform happens to ship — the mark would CLAIM to be Geist",
    "  while rendering as something else, differently per operating system, on every tab. (This",
    "  comment names that element descriptively instead of spelling it, because its absence from",
    "  this file is grep-asserted.)",
    "",
    "  D-127 HOLDS: no typeface has been chosen and no asset has been commissioned. This is an",
    "  outlined PLACEHOLDER — a geometric F in the theme's own two brand colours, which derive to",
    "  4.57:1 against each other — and it is meant to be replaced by real branding, not defended.",
    "-->",
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">',
    "  <title>FitOut</title>",
    `  <rect width="32" height="32" rx="7" fill="${brand}"/>`,
    `  <path d="M10 7H22V11.5H14.5V14.5H19V19H14.5V25H10Z" fill="${ink}"/>`,
    "</svg>",
    "",
  ].join("\n");
}

/**
 * Write `text` to `file` when it differs from what is already there, and report whether it changed.
 * Idempotent by construction, so a second run in a row is a no-op and leaves the tree clean — the
 * property the drift check depends on.
 * @param {string} file
 * @param {string} text
 * @returns {boolean}
 */
function writeIfChanged(file, text) {
  if (existsSync(file) && readFileSync(file, "utf8") === text) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  return true;
}

function main() {
  const tokens = readThemeTokens();

  /** @type {[string, string][]} */
  const targets = [[TOKENS_MODULE_PATH, renderTokensModule(tokens)]];
  for (const theme of THEME_NAMES) {
    const path = ICON_PATHS[theme];
    if (path === undefined) {
      throw new Error(
        `[generate-design-tokens] no icon destination declared for theme "${theme}"`,
      );
    }
    targets.push([path, renderIconSvg(theme, tokens)]);
  }

  let written = 0;
  for (const [file, text] of targets) {
    if (writeIfChanged(file, text)) written++;
  }
  console.log(
    `[generate-design-tokens] wrote ${written}/${targets.length} file(s).`,
  );
}

// Entry-point guard. `import.meta.main` is true only when this file is what node was asked to run,
// so importing the two render functions from a test has no side effect on disk. It is deliberately
// NOT derived from the command-line parameters node was invoked with — see PATH SAFETY above, and
// note that a criterion asserts this file never reads them.
if (import.meta.main === true) {
  main();
} else if (import.meta.main === undefined) {
  // Older node exposes no such flag. Failing loudly beats the alternative: a silent exit 0 that
  // writes nothing, leaving a stale committed module and a drift test that passes against it.
  throw new Error(
    "[generate-design-tokens] this node build does not expose an entry-point flag on import.meta; node >= 24 is required.",
  );
}
