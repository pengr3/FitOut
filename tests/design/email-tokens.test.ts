// EMAIL-02 — AN EMAIL IS PAINTED FROM THE GENERATED TOKENS, AND CANNOT BE LEFT BEHIND BY A THEME SWAP.
//
// Email cannot read a custom property, so it needs literal colour values — and a literal typed by
// hand drifts. It already has, elsewhere in this tree: the single-listing map carried a coral that
// stopped matching `--brand` when that token was re-derived for contrast, and nothing in the
// repository could tell. `src/lib/design/tokens.generated.ts` exists so that one class of bug has a
// single, checked home; this file is what makes the EMAIL tier's use of it falsifiable.
//
// It lives in `tests/design/**` because `npm run build` is `lint && test:design && next build`. A
// colour gate that only runs under `npm test` is a colour gate that a build can ship past.
//
// ── THE ONE ASSERTION THAT CARRIES THIS FILE ──────────────────────────────────────────────────────
//
// The SET of `#`-prefixed literals in a rendered email equals EXACTLY the seven declared token
// values — read from `THEME_TOKENS` AT TEST TIME, never copied into this file. That direction
// matters. A test that pinned `#da2d34` as a string would go red when the stylesheet legitimately
// re-derived the brand, and the instinct would be to update the test; a test that reads the token
// moves WITH the stylesheet and can only go red when the EMAIL stops matching it. Set equality in
// both directions is what makes it total: a hand-typed colour anywhere in the pipeline arrives as an
// eighth member, and a token that stopped being read leaves a hole.
//
// ── AND THE ONE THAT MAKES IT A CONTRACT RATHER THAN A COINCIDENCE ────────────────────────────────
//
// 15-UI-SPEC AC#18: flipping the theme owner flips every rendered hex, with ZERO edits to the shell.
// That is only achievable because `renderEmail` reads its palette INSIDE the function (15-RESEARCH
// § Pattern 3) — a module-scope `const PALETTE = THEME_TOKENS[DEFAULT_THEME]` is frozen at import
// and a theme argument would be silently ignored. The flip is asserted by ITERATING `THEMES` rather
// than by naming the two literals, so a third theme joining the union joins this gate for free.
//
// ── WHAT THIS FILE DOES NOT COVER — real blind spots ──────────────────────────────────────────────
//
//   • THAT THE HEX IS THE RIGHT CONVERSION OF ITS OKLCH. This asserts the email uses the generated
//     values; if the generator's colour maths were wrong, the stylesheet and the email would be
//     wrong together. `contrast.test.ts` is the independent cross-check for that.
//   • THAT THE COLOURS ARE USED IN THE RIGHT PLACES. A shell that painted the body ink with the
//     brand and the CTA with the border would still harvest exactly these seven. Which token paints
//     what is `15-UI-SPEC § The Email Shell`'s table and a human's eye; this file only proves no
//     EIGHTH value exists and no declared one went missing.
//   • CONTRAST IN THE RENDERED EMAIL. The pairs are the app's own and are graded by the app's own
//     contrast gate; nothing here re-checks them against an email client's rendering.
//   • THAT ANY EMAIL ACTUALLY SENDS THROUGH THE SHELL. Zero callers exist after plan 15-01. The
//     nineteen adopters are 15-03/15-04's work, and until they land this proves a correct renderer,
//     not a correct inbox.
//
// ── WHEN THIS FILE GOES RED ───────────────────────────────────────────────────────────────────────
//
// Fix `src/lib/email-shell.ts` — read the token instead of writing a value. Do NOT edit
// `tokens.generated.ts` (it is generated; `token-drift.test.ts` compares it BYTE-FOR-BYTE against a
// fresh render of `globals.css`), and do NOT copy the failing hex into this file. If a genuinely new
// colour role is needed in email, it is a new TOKEN in the stylesheet and a new entry in the tuple
// below — in that order.
//
// ── WHY THE HARVEST REGEX IS SAFE ON AN HTML DOCUMENT ─────────────────────────────────────────────
//
// A numeric character reference looks like a colour to a `#`-scanner: `&#8203;` yields `#8203`. Plan
// 15-01 chose NAMED entities for the preheader's padding for exactly this reason, and `escapeHtml`'s
// own `&#39;` is short enough that the three-hex-digit floor below cannot reach it. That choice is
// asserted here rather than left as a note, because it is a property of the SHELL that this gate's
// correctness depends on — see the numeric-reference case.
//
// ── MUTATION VERIFICATION (anti-vacuity house standard) ───────────────────────────────────────────
//
// Each mutation was applied to `src/lib/email-shell.ts`, this file was re-run, the RED was recorded
// VERBATIM, and the mutation reverted — `git diff --exit-code src/` clean afterwards. Walked
// 2026-08-24.
//
// M1 — A HAND-TYPED HEX THAT IS INVISIBLE TO THE DEFAULT THEME, which is why it is listed first:
//      `const rule = palette["--border"].hex;` → `const rule = "#e5e5e5";`. That literal IS court's
//      `--border`, so the default-theme harvest is UNCHANGED.
//      `npx vitest run tests/design/email-tokens.test.ts --config vitest.design.config.ts` → VERBATIM:
//        × renderEmail(content, "grove") paints from THEME_TOKENS.grove 7ms
//        × writes no hex literal of its own in the shell 1ms
//        AssertionError: renderEmail did not honour the "grove" argument. …: expected
//          Set{ '#eaf3f2', '#ffffff', …(5) } to deeply equal Set{ '#eaf3f2', '#ffffff', …(5) }
//        AssertionError: src/lib/email-shell.ts contains a hex literal. …: expected [ '#e5e5e5' ]
//          to deeply equal []
//              Tests  2 failed | 11 passed (13)
//      ⚠ READ THAT FAILURE LIST AGAIN: the main set-equality STAYED GREEN. A hand-typed colour that
//      happens to equal the current token is undetectable by output alone — it only surfaces on a
//      theme flip, and only if someone runs one. This is the measured justification for BOTH the
//      THEMES iteration and the source scan; either one alone would have shipped this mutation.
//
// M2 — MISSPELL A TOKEN KEY, optional-chained so it compiles AND renders:
//      `palette["--muted-foreground"].hex` → `palette["--muted-forground"]?.hex`. → VERBATIM:
//        × harvests the default theme's seven and nothing else 7ms
//        × harvests exactly seven distinct values 1ms
//        × renderEmail(content, "court") paints from THEME_TOKENS.court 1ms
//        × renderEmail(content, "grove") paints from THEME_TOKENS.grove 1ms
//        × renders the literal `undefined` nowhere 2ms
//        AssertionError: … expected Set{ '#f5f5f5', '#ffffff', …(4) } to deeply equal
//          Set{ '#f5f5f5', '#ffffff', …(5) }
//        AssertionError: expected 6 to be 7 // Object.is equality
//        AssertionError: the "court" render contains the literal string "undefined" — almost
//          certainly a mistyped token key resolving to nothing. …: expected true to be false
//              Tests  5 failed | 8 passed (13)
//      i.e. the `undefined` negative control is live, and it is the assertion that NAMES the cause;
//      the set equality only reports a hole.
//
// M2b — the same misspelling WITHOUT the optional chain (`palette["--muted-forground"].hex`), for
//      the record, because it is the shape a careless edit actually takes:
//        TypeError: Cannot read properties of undefined (reading 'hex')
//         Test Files  1 failed (1)
//              Tests  no tests
//      It throws at import and collects zero tests. Loud, and caught — but note it fails the FILE
//      rather than an assertion, so the `undefined` control above is what covers the quiet variant.
//
// M3 — HARD-CODE THE THEME so the argument cannot move: `THEME_TOKENS[theme]` →
//      `THEME_TOKENS[DEFAULT_THEME]`. → VERBATIM:
//        × renderEmail(content, "grove") paints from THEME_TOKENS.grove 7ms
//        × actually moves the palette between themes rather than rendering the same document twice 1ms
//        AssertionError: renderEmail did not honour the "grove" argument. …: expected
//          Set{ '#f5f5f5', '#ffffff', …(5) } to deeply equal Set{ '#eaf3f2', '#ffffff', …(5) }
//        AssertionError: every theme rendered the same colour set: expected 1 to be 2
//              Tests  2 failed | 11 passed (13)
//      i.e. AC#18 is enforced, not described. Note the default-theme case stays green — a frozen
//      palette is correct for exactly one theme, which is how this ships unnoticed without the flip.
//
// M4 — A NUMERIC CHARACTER REFERENCE IN THE PREHEADER PADDING: `"&zwnj;&nbsp;"` → `"&#8203;&nbsp;"`,
//      the exact substitution plan 15-01 declined. → VERBATIM:
//        × harvests the default theme's seven and nothing else 7ms
//        × harvests exactly seven distinct values 1ms
//        × renderEmail(content, "court") paints from THEME_TOKENS.court 1ms
//        × renderEmail(content, "grove") paints from THEME_TOKENS.grove 1ms
//        × emits no numeric character reference long enough to look like a colour 1ms
//        × writes no hex literal of its own in the shell 1ms
//        AssertionError: expected 8 to be 7 // Object.is equality
//        AssertionError: src/lib/email-shell.ts writes a long numeric character reference. Use a
//          NAMED entity …: expected [ '&#8203' ] to deeply equal []
//        AssertionError: src/lib/email-shell.ts contains a hex literal. …: expected [ '#8203' ] to
//          deeply equal []
//              Tests  6 failed | 7 passed (13)
//      i.e. `#8203` really does arrive as a phantom eighth colour. Without the numeric-reference
//      case the failure would be six red assertions all pointing at a colour problem that is not a
//      colour problem — which is why that case exists to name the real cause.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

import { renderEmail, type EmailContent } from "@/lib/email-shell";
import { THEME_TOKENS } from "@/lib/design/tokens.generated";
import { DEFAULT_THEME, THEMES } from "@/lib/design/theme";

const SHELL = "src/lib/email-shell.ts";
const GENERATED = "src/lib/design/tokens.generated.ts";
const readRepo = (path: string) => readFileSync(resolve(__dirname, "../../", path), "utf8");

const SHELL_SOURCE = readRepo(SHELL);
const GENERATED_SOURCE = readRepo(GENERATED);

/**
 * The seven token keys EMAIL-02 pins, in the order 15-UI-SPEC § The Email Shell's token map gives
 * them: the outer ground, the column surface, the ink, the footer's quieter ink, the footer rule,
 * the one accent, and the label that sits on it.
 *
 * SEVEN AND NO MORE is the contract. An email that needed an eighth role would be an email doing
 * something the shell does not do — the shell has one accent, one rule and one ink.
 */
const EMAIL_TOKEN_KEYS = [
  "--muted",
  "--card",
  "--foreground",
  "--muted-foreground",
  "--border",
  "--brand",
  "--brand-foreground",
] as const;

/**
 * A representative message. It carries a CTA deliberately: without one, the accent and the accent's
 * ink are never emitted and the harvest is five values, not seven — which would make a
 * seven-member expectation fail for a reason that has nothing to do with drift.
 *
 * Its strings are plain ASCII on purpose. A quote or an apostrophe would put `&#39;` into the
 * document, and a `#`-scanner reading an escaped payload is a scanner grading the wrong thing.
 * Escaping is `email-shell.test.ts`'s subject; this file's subject is colour.
 */
const REPRESENTATIVE: EmailContent = {
  heading: "Your booking is confirmed",
  paragraphs: [
    "Court 2 at Ortigas Padel, Saturday 9:00 to 10:00.",
    "Show this to the host when you arrive.",
  ],
  cta: { label: "View booking", href: "https://fitout.example/bookings/bk-1" },
};

/** Every `#`-prefixed literal in a document, lowercased and de-duplicated. */
function harvestHexes(html: string): Set<string> {
  return new Set((html.match(/#[0-9a-f]{3,8}\b/gi) ?? []).map((hex) => hex.toLowerCase()));
}

/** The seven declared values for one theme, read from the generated module AT TEST TIME. */
function declaredHexes(theme: (typeof THEMES)[number]): Set<string> {
  return new Set(EMAIL_TOKEN_KEYS.map((key) => THEME_TOKENS[theme][key].hex.toLowerCase()));
}

const rendered = Object.fromEntries(
  THEMES.map((theme) => [theme, renderEmail(REPRESENTATIVE, theme)]),
) as Record<(typeof THEMES)[number], { html: string; text: string }>;

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// GUARD THE GUARD, ASSERTED FIRST (T-15-07). The assertion this file exists for is a SET EQUALITY,
// and the cheapest way for two sets to agree is for both to be EMPTY: a renderer that returned "" and
// a token module that had been truncated would compare equal and report a clean pipeline forever.
// Same shape as token-drift.test.ts's own guard block, and for the same reason.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("guard-the-guard: two empty sets compare equal", () => {
  it("reads a token module with real content for every theme", () => {
    expect(GENERATED_SOURCE, `${GENERATED} no longer declares the map this gate reads`).toContain(
      "export const THEME_TOKENS",
    );
    for (const theme of THEMES) {
      const keys = Object.keys(THEME_TOKENS[theme]);
      expect(
        keys.length,
        `theme "${theme}" carries ${keys.length} token keys. The floor is 20 rather than the exact ` +
          "count on purpose: this rejects a VACUOUS module, and the exact contract is theme-tokens" +
          ".test.ts's set equality, which is where a token going missing should fail.",
      ).toBeGreaterThanOrEqual(20);
    }
  });

  it("renders a document with real substance for every theme", () => {
    for (const theme of THEMES) {
      expect(
        rendered[theme].html.length,
        `renderEmail(content, "${theme}") returned ${rendered[theme].html.length} characters. An ` +
          "empty document harvests an empty hex set, which compares equal to an empty expectation.",
      ).toBeGreaterThan(800);
    }
  });

  it("harvests a non-empty hex set, and a non-empty expectation, for every theme", () => {
    for (const theme of THEMES) {
      expect(
        harvestHexes(rendered[theme].html).size,
        `the harvest over the "${theme}" render found no colour values at all.`,
      ).toBeGreaterThan(0);
      expect(
        declaredHexes(theme).size,
        `the expectation built from THEME_TOKENS.${theme} is empty — the seven keys resolved to ` +
          "nothing, so the equality below would be trivially satisfiable.",
      ).toBe(EMAIL_TOKEN_KEYS.length);
    }
  });

  it("declares a default theme that is one of the themes it iterates", () => {
    // The whole file iterates THEMES; if DEFAULT_THEME were outside that list, the main assertion
    // would be grading a theme the flip case never visits.
    expect(THEMES as readonly string[]).toContain(DEFAULT_THEME);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("EMAIL-02 — the rendered hex set is EXACTLY the seven declared token values", () => {
  it("harvests the default theme's seven and nothing else", () => {
    expect(
      harvestHexes(rendered[DEFAULT_THEME].html),
      `the colour values in a rendered email are not the seven ${DEFAULT_THEME} tokens the email ` +
        `tier is allowed to read (${EMAIL_TOKEN_KEYS.join(", ")}). An EXTRA member is a hand-typed ` +
        "literal that has entered the pipeline — the exact drift tokens.generated.ts exists to " +
        "prevent. A MISSING member is a token the shell stopped reading. Fix the shell; do not copy " +
        "the failing value into this test, and do not edit the generated module.",
    ).toEqual(declaredHexes(DEFAULT_THEME));
  });

  it("harvests exactly seven distinct values", () => {
    // Belt and braces on the set equality: today no two of the seven share a value in either theme,
    // so the cardinality is an independent statement of the same contract that fails louder when
    // two roles collapse onto one colour.
    expect(harvestHexes(rendered[DEFAULT_THEME].html).size).toBe(EMAIL_TOKEN_KEYS.length);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("15-UI-SPEC AC#18 — flipping the theme flips every rendered hex, with no shell edit", () => {
  // THEMES is iterated rather than "court" and "grove" being named as two literal cases: a third
  // theme joining the union joins this gate for free, which is the point of the union having one
  // owner (src/lib/design/theme.ts).
  for (const theme of THEMES) {
    it(`renderEmail(content, "${theme}") paints from THEME_TOKENS.${theme}`, () => {
      expect(
        harvestHexes(rendered[theme].html),
        `renderEmail did not honour the "${theme}" argument. 15-RESEARCH § Pattern 3: the palette ` +
          "must be read INSIDE the renderer. A module-scope read is frozen at import time, and a " +
          "theme passed per call is then silently ignored — every assertion except this one stays " +
          "green while the email is stuck on whichever theme happened to be the default.",
      ).toEqual(declaredHexes(theme));
    });
  }

  it("actually moves the palette between themes rather than rendering the same document twice", () => {
    // Without this, a shell that ignored the argument AND a token module whose two themes were
    // identical would satisfy every case above. The two themes must genuinely differ.
    const sets = THEMES.map((theme) => [...harvestHexes(rendered[theme].html)].sort().join(","));
    expect(new Set(sets).size, "every theme rendered the same colour set").toBe(THEMES.length);
    expect(rendered[THEMES[0]].html).not.toBe(rendered[THEMES[1]].html);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("negative controls — the failure modes a set equality alone would miss", () => {
  it("renders the literal `undefined` nowhere", () => {
    // `tsconfig.json` sets `strict: true` but NOT `noUncheckedIndexedAccess` [15-RESEARCH § Pattern
    // 3], and THEME_TOKENS' value type is `Record<string, TokenValue>`. So a MISTYPED token key
    // compiles clean. Written as `palette["--mutd"]?.hex` it yields undefined and renders the WORD
    // into a style attribute — a style a client drops silently, leaving an unstyled email that no
    // type-check and no set equality complains about (the missing hex just leaves a hole, and the
    // word `undefined` is not a `#` literal). This is the only cheap thing that catches it.
    for (const theme of THEMES) {
      expect(
        rendered[theme].html.includes("undefined"),
        `the "${theme}" render contains the literal string "undefined" — almost certainly a ` +
          "mistyped token key resolving to nothing. Check every palette read in the shell.",
      ).toBe(false);
    }
  });

  it("emits no numeric character reference long enough to look like a colour", () => {
    // The harvest above scans for `#` + three-to-eight hex digits. `&#8203;` would satisfy that and
    // arrive as a phantom eighth member; `escapeHtml`'s own `&#39;` is two digits and cannot. Plan
    // 15-01 chose NAMED entities for the preheader padding precisely so this gate stays honest, and
    // a note in a docblock is not a gate — so it is asserted, on both the source and the output.
    expect(
      SHELL_SOURCE.match(/&#[0-9a-f]{3,}/gi) ?? [],
      `${SHELL} writes a long numeric character reference. Use a NAMED entity: a numeric one reads ` +
        "as a colour value to this file's harvest and would fail EMAIL-02 for a reason that has " +
        "nothing to do with colour.",
    ).toEqual([]);
    for (const theme of THEMES) {
      expect(rendered[theme].html.match(/&#[0-9a-f]{3,}/gi) ?? []).toEqual([]);
    }
  });

  it("writes no hex literal of its own in the shell", () => {
    // The harvest proves the OUTPUT is right. This proves the INPUT PATH is the generated module.
    // They are not the same claim: a hand-typed `#ffffff` for the preheader's hiding colour is
    // INVISIBLE to a set equality, because #ffffff is already court's `--card` and the set would be
    // unchanged. It would only surface on a theme flip — and only if someone ran one. Note that the
    // repo-wide leak gate does NOT cover this file: it scans src/app/** and src/components/**, and
    // src/lib/** is outside its tree.
    expect(
      SHELL_SOURCE.match(/#[0-9a-f]{3,8}\b/gi) ?? [],
      `${SHELL} contains a hex literal. Every colour in an email is read from ` +
        `${GENERATED} — that module is the ONLY sanctioned duplicate of a design-token value in ` +
        "this repository, and it is checked byte-for-byte against globals.css on every test run. A " +
        "literal here is checked by nothing.",
    ).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("the generated module still shapes the way this gate assumes", () => {
  it("declares the same key set for every theme, and all seven email keys in each", () => {
    // Not a byte-level "untouched" claim — that is discharged by `git diff --exit-code` in the
    // plan's verification block, which is the right tool for it, and by token-drift.test.ts, which
    // owns the comparison against globals.css. This is the structural half: the seven keys this
    // file reads exist in every theme, and no theme has drifted to a different key set.
    const keySets = THEMES.map((theme) => Object.keys(THEME_TOKENS[theme]).sort().join(","));
    expect(new Set(keySets).size, "the themes declare different token keys from one another").toBe(1);

    for (const theme of THEMES) {
      for (const key of EMAIL_TOKEN_KEYS) {
        expect(
          THEME_TOKENS[theme][key],
          `THEME_TOKENS.${theme} has no "${key}". The email tier reads it; without it the palette ` +
            "read yields undefined and the shell renders that word into a style attribute.",
        ).toBeTruthy();
        expect(
          THEME_TOKENS[theme][key].hex,
          `THEME_TOKENS.${theme}["${key}"].hex is not a six-digit sRGB value.`,
        ).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});
