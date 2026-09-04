// The SINGLE `globals.css` token parser — the one place in the repo that answers "what does each
// theme actually declare?".
//
// WHY THIS FILE IS PLAIN ESM AND WHY IT LIVES OUTSIDE `src/` (D-16 + landmine L15):
//
//   Three consumers need this answer and they do not share a module system: the design tests
//   (`tests/design/**`, TypeScript via Vitest), the token generator (`scripts/generate-design-tokens.mjs`,
//   node ESM, plan 10-14) and — indirectly — the ESLint-side tooling. A `.mjs` module is the only
//   shape all three can import without a loader. Two parsers that disagree about which block holds
//   `--brand` is a silent, permanent drift between the committed token module and the stylesheet it
//   claims to mirror, which is precisely what D-18's drift check exists to make impossible.
//
// THE `.dark` BLOCK IS NEVER READ. It declares `--brand`, `--success` and ~30 other names that also
// exist in the theme blocks. Any parser that let `.dark` through would silently overwrite every
// per-theme value with its dark-mode variant and corrupt every downstream contrast assertion.
// `parseThemeTokens` matches ONLY on `[data-theme="…"]` and `parseGlobalTokens` matches ONLY the
// rule whose selector is exactly `:root`, so `.dark` is unreachable from both.
//
// GLOBAL TOKENS ARE A SEPARATE READ, ON PURPOSE (D-05). Z-index and motion tokens are declared once
// in a plain `:root` block and are deliberately NOT per-theme. THEME-02 asserts key-set EQUALITY
// between court and grove, so those global-only names must stay invisible to it — which they are,
// because a plain `:root { … }` rule is not a theme block and `readGlobalTokens()` is where they
// live instead.
//
// PATH SAFETY (T-10-08 / ASVS V12): `GLOBALS_CSS_PATH` is a hard-coded literal resolved from cwd.
// No function here derives a read path from an argument, from argv or from the environment. The
// pure parsers take CSS TEXT, never a filename.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** The two themes that must exist. Court is the default; grove is the proof the system travels. */
export const THEME_NAMES = ["court", "grove"];

/** The one stylesheet that declares them. Hard-coded — see PATH SAFETY above. */
export const GLOBALS_CSS_PATH = resolve(process.cwd(), "src/app/globals.css");

/**
 * @typedef {Record<string, string>} TokenMap
 * A map of declaration name (INCLUDING the leading `--`) to its raw, untrimmed-of-meaning value.
 */

/** Strip CSS block comments before any structural walk, so a comment can never unbalance a brace. */
function stripComments(cssText) {
  return String(cssText).replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * Split a stylesheet into its TOP-LEVEL rules only. Nested rules (`@layer base { * { … } }`) stay
 * inside their parent's body and are never returned as rules of their own; top-level statements
 * that end in `;` (`@import "tailwindcss";`) are skipped entirely.
 * @param {string} cssText
 * @returns {{ selector: string, body: string }[]}
 */
function topLevelRules(cssText) {
  const css = stripComments(cssText);
  /** @type {{ selector: string, body: string }[]} */
  const rules = [];
  let depth = 0;
  let preludeStart = 0;
  let bodyStart = 0;
  let selector = "";

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") {
      if (depth === 0) {
        selector = css.slice(preludeStart, i).trim();
        bodyStart = i + 1;
      }
      depth++;
    } else if (ch === "}") {
      if (depth > 0) depth--;
      if (depth === 0) {
        rules.push({ selector, body: css.slice(bodyStart, i) });
        preludeStart = i + 1;
      }
    } else if (ch === ";" && depth === 0) {
      // A top-level at-statement such as `@import "tailwindcss";` — not a rule.
      preludeStart = i + 1;
    }
  }
  return rules;
}

/**
 * Read every custom-property declaration sitting DIRECTLY in a rule body, skipping anything inside
 * a nested block.
 * @param {string} body
 * @returns {TokenMap}
 */
function declarationsOf(body) {
  /** @type {string[]} */
  const flat = [];
  let depth = 0;
  let segStart = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "{") {
      if (depth === 0) flat.push(body.slice(segStart, i));
      depth++;
    } else if (ch === "}") {
      if (depth > 0) depth--;
      if (depth === 0) segStart = i + 1;
    }
  }
  if (depth === 0) flat.push(body.slice(segStart));

  /** @type {TokenMap} */
  const out = {};
  const text = `${flat.join("\n")};`;
  const re = /(--[A-Za-z0-9_-]+)\s*:\s*([^;{}]*)(?:;)/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    out[match[1]] = match[2].trim();
  }
  return out;
}

/** Does this rule's selector list mention `[data-theme="<theme>"]`? Quote style is tolerated. */
function isThemeRule(selector, theme) {
  return new RegExp(`\\[\\s*data-theme\\s*=\\s*["']?${theme}["']?\\s*\\]`).test(
    selector,
  );
}

/**
 * Parse the per-theme token blocks out of stylesheet TEXT.
 *
 * A theme block is any top-level rule whose selector LIST contains `[data-theme="<name>"]` — which
 * is why `:root,\n[data-theme="court"] { … }` (court's real shape: it is both the default and a
 * named theme) is found as court, while a plain `:root { … }` is not a theme block at all.
 *
 * Returns `{}` for a theme whose block is absent rather than throwing, so callers can assert on the
 * absence. An EMPTY MAP IS NEVER A PASS: every consumer must assert the map is non-empty before
 * asserting anything about its contents, or the assertion is vacuous (T-10-06).
 *
 * @param {string} cssText
 * @returns {Record<string, TokenMap>}
 */
export function parseThemeTokens(cssText) {
  const rules = topLevelRules(cssText);
  /** @type {Record<string, TokenMap>} */
  const out = {};
  for (const theme of THEME_NAMES) {
    const rule = rules.find((r) => isThemeRule(r.selector, theme));
    out[theme] = rule ? declarationsOf(rule.body) : {};
  }
  return out;
}

/**
 * Parse the GLOBAL (non-per-theme) tokens out of stylesheet TEXT: the top-level rule whose selector
 * is exactly `:root`, and nothing else. By D-05 this block holds the names that deliberately do not
 * travel per theme (z-index, motion), so THEME-02's key-set equality test never sees them.
 * @param {string} cssText
 * @returns {TokenMap}
 */
export function parseGlobalTokens(cssText) {
  const rule = topLevelRules(cssText).find(
    (r) => r.selector.replace(/\s+/g, "") === ":root",
  );
  return rule ? declarationsOf(rule.body) : {};
}

/**
 * Read the live `globals.css` and return its per-theme token maps.
 * Throws if a theme block is missing — by the time anything calls this, a missing block is a bug,
 * and returning `{}` here would let a downstream gate pass vacuously.
 * @returns {Record<string, TokenMap>}
 */
export function readThemeTokens() {
  const tokens = parseThemeTokens(readFileSync(GLOBALS_CSS_PATH, "utf8"));
  for (const theme of THEME_NAMES) {
    if (Object.keys(tokens[theme] ?? {}).length === 0) {
      throw new Error(
        `[design-tokens-source] no [data-theme="${theme}"] block found in ${GLOBALS_CSS_PATH}`,
      );
    }
  }
  return tokens;
}

/**
 * Read the live `globals.css` and return its global-only tokens (the plain `:root` block).
 * Throws if that block is missing, for the same reason as `readThemeTokens`.
 * @returns {TokenMap}
 */
export function readGlobalTokens() {
  const tokens = parseGlobalTokens(readFileSync(GLOBALS_CSS_PATH, "utf8"));
  if (Object.keys(tokens).length === 0) {
    throw new Error(
      `[design-tokens-source] no plain \`:root\` block found in ${GLOBALS_CSS_PATH}`,
    );
  }
  return tokens;
}
