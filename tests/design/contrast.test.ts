// DS-06 (every declared pairing clears WCAG AA in BOTH themes) + DS-07 (every token renders inside
// the sRGB gamut) + DS-05 (the focus indicator is visible on all three surfaces).
//
// THIS TEST IS THE AUTHORITY, NOT THE DOCUMENT (D-12). `10-UI-SPEC.md` carries a measured table for
// every pair below. If this test and that table ever disagree, the test wins and the table is
// corrected — the whole point of deriving values rather than picking them is that the derivation can
// be re-run.
//
// TWO MECHANICS THAT ARE EASY TO GET WRONG, AND BOTH CHANGE THE ANSWER:
//
//   1. RATIOS ARE COMPUTED ON THE 8-BIT HEX, never on the float. `oklch(...)` → sRGB gives
//      out-of-range and sub-integer channels; a contrast checker and a screenshot both see the
//      rounded 8-bit value, so that is what is measured. Rounding moves ratios in the third decimal,
//      which matters at a 0.05 epsilon.
//   2. ALPHA ROWS ARE COMPOSITED FIRST (T-10-10). `text-destructive` on `bg-destructive/10` is not
//      the raw destructive/destructive pair, and it is not destructive-on-background either — it is
//      destructive on (destructive at 10% over the real surface). Asserting the raw pair is the
//      exact mistake that let the focus ring ship measuring 2.58 as a token pair and 1.54 as
//      rendered. Compositing is done in gamma space, on the 8-bit channels, which is what the
//      browser's `color-mix(in oklab, X 10%, transparent)` over an opaque surface resolves to
//      closely enough for an accessibility floor.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file rather than
// over-trusts it:
//   • This measures the pairings the inventory DECLARES. It cannot see a pairing a component
//     invents — a `text-brand` child inside a `bg-muted` parent is a real rendered pairing that no
//     list here and no same-string drift check can catch. Phase 17's two-theme axe pass, on the
//     rendered DOM, is the mechanism for that class.
//   • WCAG 2.x is a luminance model. Clearing the bar is a floor, not a claim that the pairing is
//     comfortable, and it says nothing about colour-blind differentiability.
//   • The derived hover surface is computed here with a local OKLCH mix. That models
//     `color-mix(in oklch, …)`; it is not the browser's own implementation, and a browser rounding
//     differently is part of what the 0.05 epsilon exists to absorb.

import { describe, it, expect } from "vitest";
import { converter, formatHex, inGamut, parse } from "culori";

import { readThemeTokens, THEME_NAMES } from "./helpers/compile-css";
import {
  AA_EPSILON,
  CONTRAST_PAIRS,
  DERIVED_SURFACES,
  EXCLUDED_PAIRS,
  NON_TEXT_BAR,
  type ContrastPair,
} from "../../src/lib/design/contrast-pairs";

const toRgb = converter("rgb");
const toOklch = converter("oklch");
const srgbInGamut = inGamut("rgb");

/** The court `--brand` value the derivation lands on. Pinned so a silent edit cannot slide past. */
const COURT_BRAND_HEX = "#da2d34";

/** The value that shipped for `--destructive` before this plan. Out of gamut — used as a control. */
const OUT_OF_GAMUT_CONTROL = "oklch(0.577 0.245 27.325)";

const themes = readThemeTokens();

// ---------------------------------------------------------------------------
// Colour maths — deliberately hand-rolled, so the assertion does not depend on
// the same library being right about both the conversion and the ratio.
// ---------------------------------------------------------------------------

function hexOf(cssValue: string): string {
  const rgb = toRgb(parse(cssValue));
  if (rgb === undefined) throw new Error(`unparseable colour: ${cssValue}`);
  return formatHex(rgb);
}

function channelsOf(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG 2.x relative luminance, from 8-bit sRGB channels. */
function luminance(hex: string): number {
  const [r, g, b] = channelsOf(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(aHex: string, bHex: string): number {
  const [hi, lo] = [luminance(aHex), luminance(bHex)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `fg` at `alpha` opacity over the opaque `bg`, composited in gamma space on 8-bit channels. */
function composite(fgHex: string, alpha: number, bgHex: string): string {
  const f = channelsOf(fgHex);
  const b = channelsOf(bgHex);
  const mixed = f.map((c, i) => Math.round(c * alpha + b[i] * (1 - alpha)));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** `color-mix(in oklch, aValue, bValue <pct>%)` — the shipped hover idiom. */
function mixInOklch(aValue: string, bValue: string, pct: number): string {
  const a = toOklch(parse(aValue));
  const b = toOklch(parse(bValue));
  if (a === undefined || b === undefined) {
    throw new Error(`unparseable colour in mix: ${aValue} / ${bValue}`);
  }
  const hueA = a.h ?? 0;
  const hueB = b.h ?? 0;
  let dh = hueB - hueA;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return formatHex({
    mode: "oklch",
    l: a.l * (1 - pct) + b.l * pct,
    c: (a.c ?? 0) * (1 - pct) + (b.c ?? 0) * pct,
    h: hueA + dh * pct,
  });
}

/**
 * Resolve a `CONTRAST_PAIRS` name to a hex: a real token, or a `DERIVED_SURFACES` mix.
 * Throws on an unknown name — an inventory row naming a token that does not exist must fail loudly,
 * never resolve to a default that quietly passes.
 */
function resolve(theme: string, name: string): string {
  const tokens = themes[theme];
  const derived = DERIVED_SURFACES[name as keyof typeof DERIVED_SURFACES];
  if (derived !== undefined) {
    const base = tokens[`--${derived.base}`];
    const mixWith = tokens[`--${derived.mixWith}`];
    if (base === undefined || mixWith === undefined) {
      throw new Error(`[${theme}] derived surface "${name}" has a missing base token`);
    }
    return mixInOklch(base, mixWith, derived.pct);
  }
  const value = tokens[`--${name}`];
  if (value === undefined) {
    throw new Error(`[${theme}] the inventory names --${name}, which no theme block declares`);
  }
  return hexOf(value);
}

// ---------------------------------------------------------------------------
// The proof, run identically for both themes
// ---------------------------------------------------------------------------

describe.each(THEME_NAMES)("%s", (theme: string) => {
  const tokens = themes[theme];
  const colourTokens = Object.entries(tokens).filter(([, v]) =>
    v.startsWith("oklch("),
  );

  // DS-07 -------------------------------------------------------------------
  it("declares every colour token inside the sRGB gamut (DS-07)", () => {
    // An out-of-gamut oklch is silently clipped by the renderer, differently per engine, so the
    // colour that ships is not the colour that was measured. The shipped --destructive was chroma
    // 0.245 against a ~0.235 ceiling at its lightness and hue.
    const outside = colourTokens
      .filter(([, value]) => !srgbInGamut(value))
      .map(([name, value]) => `${name}: ${value}`);
    expect(outside, `out of sRGB gamut: ${outside.join(", ")}`).toEqual([]);
  });

  // DS-06 -------------------------------------------------------------------
  // Explicitly generic: `CONTRAST_PAIRS` is `as const`, so without this each row infers its own
  // literal type and `alpha` — which only some rows carry — is not on the union.
  it.each<ContrastPair>([...CONTRAST_PAIRS])(
    "$fg on $bg clears $bar + epsilon",
    ({ fg, bg, bar, alpha, fgAlpha, note }) => {
      const rawFgHex = resolve(theme, fg);
      const rawBgHex = resolve(theme, bg);
      // Composite FIRST, measure SECOND. This branch is the whole reason T-10-10 exists.
      const bgHex =
        alpha === undefined
          ? rawBgHex
          : composite(rawBgHex, alpha.value, resolve(theme, alpha.over));
      // A diluted INK composites over the surface it is painted on — which is the COMPOSITED
      // background, not the raw token, so this must run after the branch above and never before it.
      const fgHex = fgAlpha === undefined ? rawFgHex : composite(rawFgHex, fgAlpha, bgHex);
      const measured = contrast(fgHex, bgHex);
      const surface =
        alpha === undefined
          ? `${bg} ${bgHex}`
          : `${bg}/${alpha.value * 100}% over ${alpha.over} → ${bgHex}`;
      const ink = fgAlpha === undefined ? `${fg} (${fgHex})` : `${fg}/${fgAlpha * 100}% (${fgHex})`;
      expect(
        measured,
        `[${theme}] ${ink} on ${surface} measured ${measured.toFixed(2)}, needs ${(
          bar + AA_EPSILON
        ).toFixed(2)} — ${note}`,
      ).toBeGreaterThanOrEqual(bar + AA_EPSILON);
    },
  );

  // DS-05 -------------------------------------------------------------------
  it("keeps the focus ring visible on background, card AND muted (DS-05)", () => {
    // All three, not just the page: a focused control inside a card or on a tinted row is the
    // common case, and the ring-offset band guarantees a verified surface on both sides only if
    // every surface it can land on clears the bar.
    const ring = resolve(theme, "ring");
    for (const surface of ["background", "card", "muted"]) {
      const measured = contrast(ring, resolve(theme, surface));
      expect(
        measured,
        `[${theme}] ring on ${surface} measured ${measured.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(NON_TEXT_BAR + AA_EPSILON);
    }
  });
});

// ---------------------------------------------------------------------------
// Pinned values and the exclusion inventory
// ---------------------------------------------------------------------------

describe("the derived values this phase committed to", () => {
  it("renders court's --brand as the solved hex (D-12)", () => {
    // The LIGHTEST coral at hue 25 that clears 4.5 + AA_EPSILON against --brand-foreground.
    // Solved, not picked; pinned here so an edit that "just brightens the coral a bit" fails.
    expect(hexOf(themes.court["--brand"])).toBe(COURT_BRAND_HEX);
  });

  it("carries every failing pairing as data with a stated reason (D-13)", () => {
    // An inventory that omits a failing pair is indistinguishable from one that forgot it.
    // 3 at phase 10 (`--border`, `--input`, `destructive-40`); 6 since plan 11-07 added the two
    // skeleton fills and `ui/card.tsx:15`'s hairline. A FLOOR, not an equality (D-32) — a future
    // exclusion is a legitimate addition, but LOSING one is the silent direction this pins.
    expect(EXCLUDED_PAIRS.length).toBeGreaterThanOrEqual(6);
    for (const entry of EXCLUDED_PAIRS) {
      expect(entry.reason.length, `${entry.fg} on ${entry.bg}`).toBeGreaterThan(20);
      expect(entry.measured.length).toBeGreaterThan(0);
    }
  });

  it("does not smuggle an excluded pairing back into the measured inventory", () => {
    // A pairing cannot be both "we measure this" and "we exempt this" — that combination would let
    // an exemption sit in the file looking principled while the row it names is silently required.
    const measured = CONTRAST_PAIRS.map((p) => `${p.fg} on ${p.bg}`);
    for (const excluded of EXCLUDED_PAIRS) {
      expect(measured).not.toContain(`${excluded.fg} on ${excluded.bg}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Guard the guard (T-10-06) — every assertion above is "a list of things all
// passed". An empty list passes all of them.
// ---------------------------------------------------------------------------

describe("guard-the-guard", () => {
  it("measures at least 39 declared pairings", () => {
    // 29 when phase 10 wrote this; 37 by the end of it (WR-05's alpha-aware key exposed six rows
    // that were already rendering), and 39 since plan 11-07 declared the search card's two
    // `group-hover:bg-muted/40` pairings. Raised WITH the inventory rather than left at 29: a floor
    // eight rows below the truth would still pass with the whole hover section deleted, which is
    // exactly the vacuity this block exists to prevent.
    expect(CONTRAST_PAIRS.length).toBeGreaterThanOrEqual(39);
  });

  it("read at least 24 tokens from each theme", () => {
    for (const theme of THEME_NAMES) {
      expect(Object.keys(themes[theme]).length, theme).toBeGreaterThanOrEqual(24);
    }
  });

  it("has a gamut check that can actually fail", () => {
    // Positive control: the value that shipped for --destructive before this plan. If this returns
    // true, `inGamut` is not doing what the DS-07 assertion assumes and that assertion is vacuous.
    expect(srgbInGamut(OUT_OF_GAMUT_CONTROL)).toBe(false);
    expect(srgbInGamut(themes.court["--destructive"])).toBe(true);
  });

  it("has a contrast function that can actually fail", () => {
    // Positive control: the two hover recipes this phase REJECTED. `hover:bg-brand/90` over the
    // page background is the shape the research's code example used, and it does not clear 4.5.
    const brand = resolve("court", "brand");
    const background = resolve("court", "background");
    const brand90 = composite(brand, 0.9, background);
    expect(contrast(resolve("court", "brand-foreground"), brand90)).toBeLessThan(
      4.5,
    );
    // …and the color-mix replacement does clear it, which is why the inventory uses that one.
    expect(
      contrast(resolve("court", "brand-foreground"), resolve("court", "brand-hover")),
    ).toBeGreaterThan(4.5);
  });
});
