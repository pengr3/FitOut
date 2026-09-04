// DS-12 / D-18 — THIS TEST *IS* THE CI CHECK. There is no CI in this repository.
//
// D-18 asks for "a check that regenerates the token module and fails on any diff". There is no
// workflows directory, no pipeline, no hosted runner — so the regen-diff gate has exactly one place
// it can live: `npm run test:design`, which plan 10-17 wires into `build`. That makes this file the
// enforcement, not a description of enforcement that happens elsewhere. Deleting it does not
// weaken a CI gate; it removes the only one.
//
// WHAT IT ASSERTS. It re-renders `src/lib/design/tokens.generated.ts`, `public/icon-court.svg` and
// `public/icon-grove.svg` from the live `src/app/globals.css`, in memory, and compares BYTES to what
// is committed. Exact equality, trailing newline included, with NO normalisation of whitespace or
// line endings — normalising is how a drift check learns to forgive, and the one difference it must
// never forgive is a value. (Line endings are pinned to LF for those three paths in `.gitattributes`
// so this holds on every platform; without that pin, `text=auto` plus `core.autocrlf` hands a fresh
// Windows clone CRLF and this file goes red for a reason that is not drift.)
//
// WHY BYTE EQUALITY AND NOT A VALUE-BY-VALUE COMPARISON. A comparison of parsed values would pass on
// a module whose banner had been deleted, whose type had been widened, or whose committed text was
// half-written — all states in which the file no longer means what a reader believes it means. The
// generator is the definition; the committed file either is its output or it is not.
//
// THIS TEST DOES NOT COMPILE ANYTHING THROUGH TAILWIND, and that is worth saying out loud. Plan
// 10-12 found that `@tailwindcss/postcss` caches its compiled design system keyed on the INPUT FILE
// PATH, so a second compile of `globals.css` in one run silently returns the first one's output —
// which had been making a control pass for the wrong reason all phase. Nothing here reaches that
// cache: the generator and this test both read the stylesheet with the plain brace-depth parser in
// `config/design-tokens-source.mjs`, which holds no state between calls.
//
// OBSERVED RED, THEN GREEN (the plan's mutation check, run 2026-08-12):
//   • One character changed in the committed module — court `--brand` hex `#da2d34` → `#da2d35`:
//     **1 failed / 6 passed**, and the failure diff named the changed line.
//   • Reverted with `npm run design:tokens`: **7 passed**.
//   That is the correct blast radius. A single wrong hex fails the module assertion and leaves the
//   icon assertions and the guard-the-guard alone, so the failure output points at the artifact that
//   actually moved instead of reporting the whole gate as broken.
//
// IF THIS FILE IS RED, RUN `npm run design:tokens`. Do not edit the generated file to match, and do
// not edit this test. Both are downstream of `globals.css`; the stylesheet is the only editable
// source. Every failure message below says so, because the instinct on a red byte-comparison is to
// make the two sides agree rather than to ask which one is authored.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file:
//   • That the hex values are CORRECT conversions of their oklch. This asserts the committed file is
//     the generator's output; if the generator's colour maths were wrong, both sides would be wrong
//     together. `contrast.test.ts` independently pins court `--brand` to `#da2d34` with hand-rolled
//     WCAG maths and its own culori call, which is the cross-check that catches that class of bug.
//   • That the favicons RENDER. An SVG that parses as text and paints as nothing would pass here.
//     Phase 11's GATE-01 pass is the first thing that sees a real browser tab.
//   • That every consumer actually imports from the generated module. That is a source-scan claim,
//     and 10-17's DS-13 leak gate owns it; today there is exactly one consumer (the listing map).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

import { readThemeTokens } from "./helpers/compile-css";
import {
  hexOf,
  renderTokensModule,
  renderIconSvg,
} from "../../scripts/generate-design-tokens.mjs";

/** The three committed artifacts, hard-coded exactly as the generator hard-codes its destinations. */
const TOKENS_MODULE_PATH = resolve(__dirname, "../../src/lib/design/tokens.generated.ts");
const ICON_PATHS = {
  court: resolve(__dirname, "../../public/icon-court.svg"),
  grove: resolve(__dirname, "../../public/icon-grove.svg"),
} as const;

const REGENERATE = "run `npm run design:tokens` — do NOT edit the generated file, and do NOT edit this test";

const tokens = readThemeTokens();

/**
 * The token keys the RENDERED module text declares for one theme, parsed out of the emitted text
 * rather than out of the input. Counting the input would prove nothing about what was written.
 */
function renderedKeysFor(text: string, theme: string): string[] {
  const start = text.indexOf(`\n  ${theme}: {\n`);
  if (start === -1) return [];
  const end = text.indexOf("\n  },", start);
  if (end === -1) return [];
  return text.slice(start, end).match(/"--[a-z0-9-]+":/g) ?? [];
}

describe("D-18 — the committed token module is the generator's output, byte for byte", () => {
  it("matches a fresh render of src/app/globals.css exactly", () => {
    const committed = readFileSync(TOKENS_MODULE_PATH, "utf8");
    const rendered = renderTokensModule(tokens);
    expect(
      committed,
      `src/lib/design/tokens.generated.ts has drifted from src/app/globals.css — ${REGENERATE}`,
    ).toBe(rendered);
  });

  it("still carries the DO NOT EDIT banner on its first line", () => {
    // The banner is the only thing standing between a generated file and a reader who edits it by
    // hand, so its absence is asserted separately from the byte comparison — a rendered file that
    // had lost the banner would match itself perfectly.
    const committed = readFileSync(TOKENS_MODULE_PATH, "utf8");
    expect(committed.split("\n")[0]).toContain("DO NOT EDIT");
    expect(committed).toContain("npm run design:tokens");
  });
});

describe("D-19 — both themed favicons are the generator's output, byte for byte", () => {
  for (const theme of ["court", "grove"] as const) {
    it(`public/icon-${theme}.svg matches a fresh render`, () => {
      const committed = readFileSync(ICON_PATHS[theme], "utf8");
      const rendered = renderIconSvg(theme, tokens);
      expect(
        committed,
        `public/icon-${theme}.svg has drifted from src/app/globals.css — ${REGENERATE}`,
      ).toBe(rendered);
    });
  }
});

// ---------------------------------------------------------------------------
// Guard the guard (T-10-06 / T-10-30). Every assertion above is an equality
// between two strings, and the cheapest way for both sides to agree is for both
// to be EMPTY: a generator that threw its output away and a committed file that
// had been truncated to nothing would compare equal and pass perfectly. So the
// render is checked for substance independently of what is on disk.
// ---------------------------------------------------------------------------
describe("guard-the-guard: an empty render cannot match an empty file", () => {
  it("renders a module with real content", () => {
    const rendered = renderTokensModule(tokens);
    expect(rendered.length).toBeGreaterThan(500);
    expect(rendered).toContain("export const THEME_TOKENS");
  });

  it("renders at least 20 token keys for every theme", () => {
    // 23 colour tokens per theme today. The floor is 20 rather than the exact count on purpose:
    // this assertion exists to reject a VACUOUS render, and the exact contract is asserted as set
    // equality by theme-tokens.test.ts, which is where a token going missing should fail.
    const rendered = renderTokensModule(tokens);
    for (const theme of ["court", "grove"] as const) {
      const keys = renderedKeysFor(rendered, theme);
      expect(keys.length, `theme "${theme}" rendered ${keys.length} token keys`).toBeGreaterThanOrEqual(20);
    }
  });

  it("renders a DIFFERENT icon per theme, each with its own two colours", () => {
    // Two themes rendering the same file would satisfy every byte comparison above while the grove
    // swap changed nothing in the tab — the exact silent failure D-19 exists to make visible. The
    // hex count is the second half: an icon that lost its fills entirely would still differ from
    // nothing, so both marks are required to carry two distinct colours.
    const hexesOf = (svg: string) => [...new Set(svg.match(/#[0-9a-f]{6}\b/g) ?? [])];
    const court = renderIconSvg("court", tokens);
    const grove = renderIconSvg("grove", tokens);

    expect(court.length).toBeGreaterThan(200);
    expect(court).not.toBe(grove);
    expect(hexesOf(court)).toHaveLength(2);
    expect(hexesOf(grove)).toHaveLength(2);
    expect(hexesOf(court)).not.toEqual(hexesOf(grove));
  });

  it("refuses to render a colour that is outside the sRGB gamut (WR-11)", () => {
    // The generator threw on alpha but CLAMPED an out-of-gamut colour, which is the same class of
    // lie with none of the noise. `formatHex` clamps each channel independently; browsers gamut-map
    // in OKLCH, preserving hue and trading chroma. The two disagree, so the generated hex would be
    // a plausible-looking DIFFERENT colour from the one that renders — and the byte comparisons
    // above would then pin that wrong colour permanently.
    //
    // The control is the real value `globals.css` records as having shipped: chroma 0.245 against a
    // ~0.235 ceiling for its lightness and hue.
    const OUT_OF_GAMUT = "oklch(0.577 0.245 27.325)";
    expect(() => hexOf("--destructive", OUT_OF_GAMUT)).toThrow(/outside the sRGB gamut/);

    // Observed failing AND observed passing: an in-gamut colour must still convert, or this check
    // would be satisfied by a function that threw on everything.
    expect(hexOf("--brand", "oklch(0.55 0.20 25)")).toMatch(/^#[0-9a-f]{6}$/);

    // Every token the themes actually declare must clear it, which is what makes the throw free.
    for (const [theme, map] of Object.entries(tokens)) {
      for (const [name, value] of Object.entries(map as Record<string, string>)) {
        if (!value.startsWith("oklch(")) continue;
        expect(() => hexOf(name, value), `${theme} ${name}`).not.toThrow();
      }
    }
  });
});
