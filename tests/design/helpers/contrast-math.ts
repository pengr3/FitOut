// ONE HOME FOR THE WCAG MATHS — the seven functions every contrast gate in this suite measures with.
//
// WHY THIS MODULE EXISTS (D-16, applied one level down). `./compile-css` is already the ONE import
// site for token DATA across the design suite, so no test can hand-roll a second stylesheet parser.
// Until plan 15-13 the same rule did not cover the ARITHMETIC: `contrast.test.ts` held these seven
// functions module-locally, and the moment a second gate needed to measure a ratio there were two
// honest options — import from a `.test.ts` file, or copy the functions. Both end in two
// implementations of WCAG 2.x that are free to disagree about a number, which is the one failure a
// contrast gate must not have: a green run in one file and a red run in another, over the same pair.
//
// THEY ARE STILL DELIBERATELY HAND-ROLLED. The point of writing the luminance and the ratio out by
// hand is that no assertion depends on ONE library being right twice — culori converts the colour,
// this module measures it. Moving them did not change that; it made it true for both gates instead
// of one.
//
// TWO MECHANICS THAT ARE EASY TO GET WRONG, AND BOTH CHANGE THE ANSWER — carried here with the
// functions they describe, because a caller that reads only this file still has to know them:
//
//   1. RATIOS ARE COMPUTED ON THE 8-BIT HEX, never on the float. `oklch(...)` → sRGB gives
//      out-of-range and sub-integer channels; a contrast checker and a screenshot both see the
//      rounded 8-bit value, so that is what is measured. Rounding moves ratios in the third decimal,
//      which matters at a 0.05 epsilon.
//   2. COMPOSITE FIRST, MEASURE SECOND (T-10-10). A tint is not the raw token pair and it is not the
//      solid-on-surface pair either — it is the ink on (the tint composited over the real surface).
//      Asserting the raw pair is the exact mistake that let the focus ring ship measuring 2.58 as a
//      token pair and 1.54 as rendered. Compositing is done in gamma space, on the 8-bit channels,
//      which is what the browser's `color-mix(in oklab, X 10%, transparent)` over an opaque surface
//      resolves to closely enough for an accessibility floor.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file rather than
// over-trusts it:
//   • This is a luminance model (WCAG 2.x). Clearing a bar is a floor, not a claim that a pairing is
//     comfortable, and it says nothing about colour-blind differentiability.
//   • `mixInOklch` MODELS `color-mix(in oklch, …)`; it is not the browser's own implementation, and a
//     browser rounding differently is part of what the 0.05 epsilon exists to absorb.
//   • Nothing here knows what an element actually renders. These are functions over colours; which
//     colours a surface PAIRS is a fact about the tree, and it lives in the gates that call them.

import { converter, formatHex, parse } from "culori";

import { DERIVED_SURFACES } from "../../../src/lib/design/contrast-pairs";

const toRgb = converter("rgb");
const toOklch = converter("oklch");

export function hexOf(cssValue: string): string {
  const rgb = toRgb(parse(cssValue));
  if (rgb === undefined) throw new Error(`unparseable colour: ${cssValue}`);
  return formatHex(rgb);
}

export function channelsOf(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG 2.x relative luminance, from 8-bit sRGB channels. */
export function luminance(hex: string): number {
  const [r, g, b] = channelsOf(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(aHex: string, bHex: string): number {
  const [hi, lo] = [luminance(aHex), luminance(bHex)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `fg` at `alpha` opacity over the opaque `bg`, composited in gamma space on 8-bit channels. */
export function composite(fgHex: string, alpha: number, bgHex: string): string {
  const f = channelsOf(fgHex);
  const b = channelsOf(bgHex);
  const mixed = f.map((c, i) => Math.round(c * alpha + b[i] * (1 - alpha)));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** `color-mix(in oklch, aValue, bValue <pct>%)` — the shipped hover idiom. */
export function mixInOklch(aValue: string, bValue: string, pct: number): string {
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
 * Resolve a pairing-inventory name to a hex: a real token, or a `DERIVED_SURFACES` mix.
 * Throws on an unknown name — an inventory row naming a token that does not exist must fail loudly,
 * never resolve to a default that quietly passes.
 *
 * TAKES THE TOKEN MAP RATHER THAN A THEME NAME, and that is the whole difference from the
 * `contrast.test.ts`-local function this was extracted from. That one closed over a module-level
 * `themes` object; a second gate importing it would either have got the first gate's map or built a
 * second one, and two maps is the same defect as two ratio functions one level up. The map is passed
 * in, both gates read it from the same `readThemeTokens()`, and there is no map here to disagree
 * with. `label` names the theme in the failure text, which is the only thing the theme name was ever
 * used for.
 *
 * RENAMED `resolve` → `resolveToken` ON THE WAY OUT: `resolve` is also `node:path`'s, and the gates
 * that import this module import that one beside it.
 */
export function resolveToken(
  tokens: Readonly<Record<string, string>>,
  name: string,
  label: string,
): string {
  const derived = DERIVED_SURFACES[name as keyof typeof DERIVED_SURFACES];
  if (derived !== undefined) {
    const base = tokens[`--${derived.base}`];
    const mixWith = tokens[`--${derived.mixWith}`];
    if (base === undefined || mixWith === undefined) {
      throw new Error(`[${label}] derived surface "${name}" has a missing base token`);
    }
    return mixInOklch(base, mixWith, derived.pct);
  }
  const value = tokens[`--${name}`];
  if (value === undefined) {
    throw new Error(`[${label}] the inventory names --${name}, which no theme block declares`);
  }
  return hexOf(value);
}
