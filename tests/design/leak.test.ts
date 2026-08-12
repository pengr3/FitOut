// DS-13 — the authoritative raw-design-value gate. No hex literal, colour function, arbitrary pixel
// type size, numbered Tailwind palette class or white/black utility class may appear anywhere under
// `src/app/**` or `src/components/**`.
//
// WHY THIS FILE IS THE AUTHORITY AND THE ESLINT RULE IS NOT (D-16). Both halves read the SAME
// exported list — `config/design-leak-patterns.mjs` — so they can never disagree about what counts.
// They differ in what they can promise. ESLint gives an author a squiggle at the moment of typing,
// which is where the rule is cheapest to obey; but a rule that lives only in ESLint is one
// `// eslint-disable` away from silence, and on Next 16 it does not run during `next build` at all
// (landmine L1: `next lint` was removed and `next build` no longer invokes ESLint). This file runs
// inside `npm run test:design`, which plan 10-17 wires into `build` — so THIS is the thing a leak
// cannot get past, and the ESLint rule is the ergonomics.
//
// THERE IS NO CI IN THIS REPOSITORY (landmine L2). `.github/workflows` does not exist. The npm
// script layer IS the gate boundary, which is why `package.json`'s `build` reads
// `npm run lint && npm run test:design && next build` and why weakening that string is the single
// edit that would turn this gate off without touching a test.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// OBSERVED RED. 12 August 2026, plan 10-17 Task 2, on the clean tree at commit 4e4b69a immediately
// after `package.json`'s `build` script became
// `npm run lint && npm run test:design && next build`.
//
// WHAT WAS INJECTED: one line, `const LEAK_PROBE = "#ff0000";`, inserted at
// `src/components/ui/badge.tsx:18` — inside the vendored tree, which D-17 refuses to exempt. Nothing
// else in the working tree changed; the probe was reverted afterwards and
// `git status --porcelain src/components/ui/badge.tsx` printed nothing.
//
// (1) `npm run build`, exit code 1. Observed output, VERBATIM, with the 9 pre-existing warnings
//     (react-hooks/incompatible-library ×2, @typescript-eslint/no-unused-vars ×7 — the phase
//     baseline, unrelated to this gate) elided at the marked line:
//
//        > fitout@0.1.0 build
//        > npm run lint && npm run test:design && next build
//
//        > fitout@0.1.0 lint
//        > eslint
//
//        […9 pre-existing warnings in 4 other files…]
//
//        C:\Users\Admin\Roaming\FitOut\src\components\ui\badge.tsx
//          18:7   warning  'LEAK_PROBE' is assigned a value but never used                 @typescript-eslint/no-unused-vars
//          18:20  error    Raw design value "#ff0000" — use a design token (DS-13 / D-15)  fitout/no-raw-design-value
//
//        ✖ 11 problems (1 error, 10 warnings)
//
//     The rule id and the injected file are both named, and `&&` short-circuited: neither
//     `test:design` nor `next build` ran. That is the whole of DS-13's "fails the build" — on Next
//     16 the npm script layer is the only place it can happen (L1), and this repository has no CI
//     to fall back on (L2).
//
// (2) `npm run test:design -- leak`, exit code 1 — the Vitest half catching the same probe
//     INDEPENDENTLY of ESLint, which is why the plan runs it separately rather than trusting the
//     short-circuited build. Observed output, VERBATIM (its `408|` line pointer is as-run, i.e.
//     before this block replaced the placeholder that stood here, so the assertion now sits lower):
//
//        ❯ tests/design/leak.test.ts (18 tests | 1 failed) 16ms
//            × finds no raw design value under src/app/** or src/components/** 7ms
//
//       ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
//
//        FAIL  tests/design/leak.test.ts > the DS-13 raw-design-value gate > finds no raw design
//        value under src/app/** or src/components/**
//       AssertionError: expected [ Array(1) ] to deeply equal []
//
//       - Expected
//       + Received
//
//       - []
//       + [
//       +   "src/components/ui/badge.tsx:18 raw hex colour `#ff0000` — use a design token (DS-13 / D-15)",
//       + ]
//
//        ❯ tests/design/leak.test.ts:408:24
//           406|
//           407|   it("finds no raw design value under src/app/** or src/components/**"…
//           408|     expect(violations).toEqual([]);
//              |                        ^
//
//       Test Files  1 failed (1)
//            Tests  1 failed | 17 passed (18)
//
//     One failure of eighteen, naming the file, the line, the pattern CLASS and the matched text —
//     and the seventeen guard-the-guard and fixture assertions stayed green, which is what makes the
//     failure point at the tree rather than at the scanner.
//
// (3) Probe reverted; `npm run build` exit code 0 in 72s (lint ~17s / 0 errors / 9 warnings, design
//     gate ~12s / 20 files / 374 assertions, then `next build`). RESEARCH § Pattern 7 measured lint
//     at 85s before 10-12 narrowed Tailwind's content root; on this box today it is 17s, so the
//     accepted price of T-10-35 is roughly 29 seconds of extra build, not 85.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// HOW THE DETECTION WORKS, AND WHAT IT DOES NOT COVER. Read this before trusting a green run.
//
// It parses each file with the TypeScript compiler API and inspects STRING LITERALS AND TEMPLATE
// CHUNKS ONLY — the exact node classes the ESLint rule visits (`Literal` / `TemplateElement`). That
// is not a stylistic preference, it is this phase's most expensive lesson: a raw `grep` over source
// text has produced a wrong count in twelve separate places in phase 10, because a comment that
// NAMES a banned string is textually indistinguishable from a call site that USES one — and every
// file that bans a string has to name it. Comments are not literals, so the collision cannot happen
// here by construction.
//
// COVERED:
//   • `const C = "#E8484E"`, `fill="#fff"` — string literals anywhere, including JSX attributes.
//   • Template chunks: the literal text either side of a `${…}` in a `cn(`…`)` class string.
//   • The escape hatch is the repo's existing ESLint one — `// eslint-disable-next-line
//     fitout/no-raw-design-value` on the line above, or `// eslint-disable-line …` on the line
//     itself. No bespoke marker was invented; a second mechanism would need re-teaching to every
//     future gate and would be invisible to the editor.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file rather than
// over-trusts it:
//   • A FILE-LEVEL `/* eslint-disable fitout/no-raw-design-value */` is deliberately NOT honoured
//     here. ESLint would obey it; this gate would not, and would go red. That asymmetry is the safe
//     direction — the authoritative half is the stricter half — and it means a whole-file opt-out is
//     impossible rather than merely discouraged.
//   • It reads text, never values. `const c = COLOURS.brand` is invisible, and so is a hex assembled
//     from parts. The mitigation is `src/lib/design/tokens.generated.ts`: the one sanctioned place a
//     literal may live, byte-checked against the stylesheet by `token-drift.test.ts`.
//   • `src/lib/**` is out of scope by design (see the exclusion test below), so a leak that migrates
//     into a library module escapes this gate. That is the price of letting the generated token
//     module exist at all.
//   • Runtime is out of reach entirely. This proves what the SOURCE contains, not what the browser
//     paints — the lesson plan 10-15 paid for when a component that passed `tsc`, lint, 318 design
//     assertions and a build still shipped two conflicting `<link rel="icon">` tags.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

import {
  DESIGN_LEAK_PATTERNS,
  LEAK_SCAN_PREFIXES,
  LEAK_DISABLE_RULE_ID,
  findDesignLeaks,
} from "../../config/design-leak-patterns.mjs";

const SRC_DIR = resolve(process.cwd(), "src");

/** A single leak, rendered as one readable line for the failure diff. */
type Violation = string;

/** Collect every .ts/.tsx file under a directory, recursively. */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Repo-relative, forward-slashed. The `split("\\").join("/")` is not cosmetic: every scope check
 * and every assertion below compares against a forward-slash prefix, and on Windows `relative()`
 * returns backslashes — plan 10-14 watched an equivalent gate report 5 failures of 8 with exactly
 * this normalisation removed (T-10-27).
 */
function pathLabel(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

/** The scope, read from the shared list rather than retyped here. */
function inScope(label: string): boolean {
  return LEAK_SCAN_PREFIXES.some((prefix) => label.startsWith(prefix));
}

type Hit = { readonly id: string; readonly label: string; readonly match: string };

/** Every pattern that matches this chunk of text, with the matched substring for the message. */
function leaksIn(text: string): Hit[] {
  const hits: Hit[] = [];
  for (const entry of DESIGN_LEAK_PATTERNS) {
    const match = entry.pattern.exec(text);
    if (match !== null) {
      hits.push({ id: entry.id, label: entry.label, match: match[0].trim() });
    }
  }
  return hits;
}

const DISABLE_NEXT_LINE = `eslint-disable-next-line ${LEAK_DISABLE_RULE_ID}`;
const DISABLE_SAME_LINE = `eslint-disable-line ${LEAK_DISABLE_RULE_ID}`;

function isExempt(lines: readonly string[], line: number): boolean {
  const own = lines[line - 1] ?? "";
  const above = lines[line - 2] ?? "";
  return own.includes(DISABLE_SAME_LINE) || above.includes(DISABLE_NEXT_LINE);
}

/**
 * Scan one module's TEXT. Exported shape is deliberately (path, text) rather than (path): the
 * synthetic self-tests below feed it fixtures that are never written to disk, so the thing the real
 * assertion runs is the same code path the fixtures prove.
 */
function scanText(path: string, text: string): Violation[] {
  const lines = text.split(/\r?\n/);
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations: Violation[] = [];

  const visit = (node: ts.Node): void => {
    let chunk: string | null = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      chunk = node.text;
    } else if (
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      chunk = node.text;
    }
    if (chunk !== null) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      if (!isExempt(lines, line)) {
        for (const hit of leaksIn(chunk)) {
          violations.push(
            `${path}:${line} ${hit.label} \`${hit.match}\` — use a design token (DS-13 / D-15)`,
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return violations;
}

/** The whole gate tree, scanned ONCE at module level; the `it()` blocks only assert. */
function scanGateTree(): {
  walked: string[];
  scanned: string[];
  violations: Violation[];
} {
  const walked: string[] = [];
  const scanned: string[] = [];
  const violations: Violation[] = [];
  for (const file of collectSourceFiles(SRC_DIR)) {
    const path = pathLabel(file);
    walked.push(path);
    if (!inScope(path)) continue;
    scanned.push(path);
    violations.push(...scanText(path, readFileSync(file, "utf8")));
  }
  return { walked, scanned, violations };
}

const { walked, scanned, violations } = scanGateTree();

/** The 30 vendored shadcn primitives. D-17: they are IN scope, with no exemption. */
const VENDORED_PRIMITIVES = scanned.filter((path) =>
  path.startsWith("src/components/ui/"),
);

/**
 * The one module in the repo allowed to hold hex literals, and the reason the exclusion below is
 * asserted rather than assumed. Plan 10-15 handed this to 10-17 explicitly.
 */
const GENERATED_TOKENS = "src/lib/design/tokens.generated.ts";
const generatedTokenViolations = scanText(
  GENERATED_TOKENS,
  readFileSync(resolve(process.cwd(), GENERATED_TOKENS), "utf8"),
);

const ESLINT_CONFIG = readFileSync(
  resolve(process.cwd(), "eslint.config.mjs"),
  "utf8",
);

describe("the DS-13 raw-design-value gate", () => {
  // ---------------------------------------------------------------------------------------------
  // Guard-the-guard. The real assertion is `toEqual([])`, which a scanner that visited nothing
  // satisfies perfectly. Everything in this section exists so that a vacuous pass is impossible.
  // ---------------------------------------------------------------------------------------------

  it("walks src/ and keeps exactly the two trees the shared scope declares", () => {
    expect(walked.length).toBeGreaterThan(150);
    expect(scanned.length).toBeGreaterThan(100);
    expect(scanned.every(inScope)).toBe(true);
    // The walk is wider than the scope, which is what makes the exclusion below meaningful rather
    // than an artifact of never having looked.
    expect(walked.length).toBeGreaterThan(scanned.length);
  });

  it("excludes src/lib/design/** — the generated token module's hex literals are legal by construction", () => {
    // 10-15's handoff, made checkable. `tokens.generated.ts` carries 46 hex literals BY DESIGN;
    // they are legal precisely because they are generated from the stylesheet and byte-compared on
    // every run by `token-drift.test.ts`. Scanning that directory would force either a permanently
    // red gate or a weakened pattern list — so the exclusion is asserted three ways: the file was
    // walked, it is not scanned, and scanning it WOULD produce violations.
    expect(walked).toContain(GENERATED_TOKENS);
    expect(scanned).not.toContain(GENERATED_TOKENS);
    expect(generatedTokenViolations.length).toBeGreaterThanOrEqual(40);
  });

  it("visits all 30 vendored primitives — there is no vendored exemption (D-17)", () => {
    // D-17 made checkable. The primitives are where every card, dialog and button in the app is
    // actually defined; an exemption for them would exempt the majority of the rendered surface and
    // leave the gate policing only the thin layer above it.
    expect(VENDORED_PRIMITIVES).toHaveLength(30);
    expect(VENDORED_PRIMITIVES).toContain("src/components/ui/button.tsx");
    expect(VENDORED_PRIMITIVES).toContain("src/components/ui/badge.tsx");
    // dialog.tsx:42 carried the one vendored `bg-black` at baseline (landmine L7). It is fixed, and
    // this is the file that proves the gate would have seen it.
    expect(VENDORED_PRIMITIVES).toContain("src/components/ui/dialog.tsx");
  });

  it("visits the specific files whose leaks this phase removed", () => {
    // Each of these shipped a real violation at the phase baseline. If a future refactor moves one
    // out of the scanned set, this goes red rather than the gate quietly shrinking.
    expect(scanned).toContain("src/components/listing/listing-map.tsx");
    expect(scanned).toContain("src/app/(auth)/login/page.tsx");
    expect(scanned).toContain("src/app/(host)/host/layout.tsx");
  });

  // ---------------------------------------------------------------------------------------------
  // Synthetic fixtures: what the rule flags. Fed to the same `scanText` the real assertion uses.
  // ---------------------------------------------------------------------------------------------

  it("flags a raw hex assigned to a constant", () => {
    const found = scanText(
      "fixture.ts",
      'export const BRAND_CORAL = "#E8484E";\n',
    ).join("\n");
    expect(found).toContain("raw hex colour");
    expect(found).toContain("#E8484E");
  });

  it("flags a raw hex in a JSX attribute", () => {
    // The shape that actually shipped, at `listing-map.tsx:34`, inside an inline SVG string.
    const found = scanText(
      "fixture.tsx",
      'export const Pin = () => <circle fill="#fff" />;\n',
    ).join("\n");
    expect(found).toContain("raw hex colour");
  });

  it("flags a raw hex inside a Tailwind arbitrary value (CR-02)", () => {
    // THE FORM THE ANCHOR ORIGINALLY MISSED, and the one that matters most: `bg-[#…]` is how a hex
    // actually enters a Tailwind codebase. Both halves of D-16 read the same list, so this hole was
    // shared — lint AND this gate were green on it. A gate never observed failing on a form is not
    // a gate for that form, which is why each shape below is asserted rather than assumed.
    for (const shape of [
      'export const S = <div className="bg-[#E8484E]" />;\n',
      'export const S = <p className="text-[#fff]" />;\n',
      'export const S = <div className="border-[#000]" />;\n',
      'export const S = <div className="shadow-[0_1px_2px_#00000010]" />;\n',
    ]) {
      const found = scanText("fixture.tsx", shape).join("\n");
      expect(found, shape).toContain("raw hex colour");
    }
  });

  it("flags a numbered Tailwind palette class", () => {
    const found = scanText(
      "fixture.tsx",
      'export const S = <div className="bg-zinc-50" />;\n',
    ).join("\n");
    expect(found).toContain("numbered Tailwind palette class");
  });

  it("flags a white/black utility class", () => {
    const found = scanText(
      "fixture.tsx",
      'export const S = <div className="bg-black/10 backdrop-blur" />;\n',
    ).join("\n");
    expect(found).toContain("white/black utility class");
  });

  it("flags an arbitrary pixel type size", () => {
    const found = scanText(
      "fixture.tsx",
      'export const S = <p className="text-[28px]" />;\n',
    ).join("\n");
    expect(found).toContain("arbitrary text size");
  });

  it("flags a raw colour function", () => {
    const found = scanText(
      "fixture.ts",
      'export const C = "oklch(0.5 0 0)";\n',
    ).join("\n");
    expect(found).toContain("raw colour function");
  });

  it("flags a leak inside a template chunk, not just a plain string", () => {
    const found = scanText(
      "fixture.ts",
      "export const c = (x: string) => `bg-zinc-50 ${x} text-[28px]`;\n",
    ).join("\n");
    expect(found).toContain("numbered Tailwind palette class");
    expect(found).toContain("arbitrary text size");
  });

  // ---------------------------------------------------------------------------------------------
  // Synthetic fixtures: what the rule must NOT flag. Both classes are real shapes in this tree and
  // both were observed as false positives against the live ESLint before the patterns were anchored
  // (RESEARCH § Landmine L14).
  // ---------------------------------------------------------------------------------------------

  it("does not flag a GitHub issue reference (landmine L14)", () => {
    // The real shape at `src/lib/db/schema.ts:730`. Out of scope today, but the pattern is live —
    // an unanchored `#[0-9a-f]{3,8}` reads `#3388` as a colour.
    expect(scanText("fixture.ts", 'const why = "see #3388 for details";\n')).toEqual([]);
  });

  it("does not flag the color-mix hover idiom (landmine L14)", () => {
    // `src/components/ui/button.tsx:16`. A color-mix over two DECLARED tokens is not a leak — it is
    // this phase's prescribed hover recipe and it tracks the theme correctly. The trailing `(` in
    // the colour-function pattern is what keeps `in_oklch,` from matching.
    expect(
      scanText(
        "fixture.tsx",
        'const v = "bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]";\n',
      ),
    ).toEqual([]);
  });

  it("does not flag the four vendored rem type sizes (recorded, tolerated debt)", () => {
    // `ui/button.tsx:27`, `ui/calendar.tsx:93`, `ui/calendar.tsx:102`, `ui/toggle.tsx:20`. The
    // arbitrary-size pattern is px-only by resolved decision (UI-SPEC § Resolved Q2): it matches
    // DS-13's literal wording and the measured baseline. These four are debt that is RECORDED
    // rather than silently missed, and this assertion is what keeps the decision visible.
    expect(scanText("fixture.tsx", 'const v = "text-[0.8rem]";\n')).toEqual([]);
    // A semantic token class, which is the whole point of the exercise, is likewise silent.
    expect(
      scanText("fixture.tsx", 'const v = "bg-muted text-muted-foreground";\n'),
    ).toEqual([]);
  });

  it("honours the repo's existing eslint-disable escape hatch", () => {
    const disabled = scanText(
      "fixture.ts",
      `// eslint-disable-next-line ${LEAK_DISABLE_RULE_ID}\nexport const C = "#E8484E";\n`,
    );
    expect(disabled).toEqual([]);

    const sameLine = scanText(
      "fixture.ts",
      `export const C = "#E8484E"; // eslint-disable-line ${LEAK_DISABLE_RULE_ID}\n`,
    );
    expect(sameLine).toEqual([]);

    // Control: the hatch must be SPECIFIC. A disable for some other rule leaves this one armed.
    const otherRule = scanText(
      "fixture.ts",
      '// eslint-disable-next-line @next/next/no-img-element\nexport const C = "#E8484E";\n',
    );
    expect(otherRule.length).toBe(1);
  });

  // ---------------------------------------------------------------------------------------------
  // D-16: one list, two consumers.
  // ---------------------------------------------------------------------------------------------

  it("shares one pattern list, one scope AND one rule id with the ESLint rule (D-16)", () => {
    expect(ESLINT_CONFIG).toContain("config/design-leak-patterns.mjs");
    expect(ESLINT_CONFIG).toContain("DESIGN_LEAK_PATTERNS");
    expect(ESLINT_CONFIG).toContain("LEAK_SCAN_GLOBS");

    // THE ID IS ASSERTED AS AN IMPORT, NOT AS A SPELLING (WR-14). This used to require the literal
    // `"fitout/no-raw-design-value": "error"` to appear in the config — which passed just as well
    // when the id was RE-TYPED there as when it was shared, and so tested the very duplication it
    // was meant to rule out. What matters is that the config derives the id from the constant, so
    // renaming the rule cannot leave the two halves disagreeing about which
    // `eslint-disable-next-line` comments are honoured.
    expect(ESLINT_CONFIG).toContain("LEAK_DISABLE_RULE_ID");
    expect(ESLINT_CONFIG).toContain("[LEAK_DISABLE_RULE_ID]: \"error\"");
    expect(ESLINT_CONFIG).not.toContain(`"${LEAK_DISABLE_RULE_ID}": "error"`);

    // The plugin key and the rule name must be SPLIT from the shared id rather than respelled, or
    // the plugin could be registered under a name the reported id does not match.
    const [pluginName, ruleName] = LEAK_DISABLE_RULE_ID.split("/");
    expect(pluginName).toBe("fitout");
    expect(ruleName).toBe("no-raw-design-value");
    expect(ESLINT_CONFIG).toContain("LEAK_DISABLE_RULE_ID.split(\"/\")");
    expect(ESLINT_CONFIG).toContain("[LEAK_PLUGIN_NAME]:");
    expect(ESLINT_CONFIG).toContain("[LEAK_RULE_NAME]:");
  });

  it("agrees with findDesignLeaks, the shared classifier both gates call", () => {
    expect(findDesignLeaks('const C = "#E8484E"')).toEqual(["raw-hex"]);
    // Both hex shapes go through the SHARED classifier, so neither half of D-16 can disagree.
    expect(findDesignLeaks("bg-[#E8484E]")).toEqual(["raw-hex"]);
    expect(findDesignLeaks("shadow-[0_1px_2px_#00000010]")).toEqual(["raw-hex"]);
    expect(findDesignLeaks("bg-zinc-50")).toEqual(["palette-class"]);
    expect(findDesignLeaks("bg-black")).toEqual(["white-black-class"]);
    expect(findDesignLeaks("text-[28px]")).toEqual(["arbitrary-text-px"]);
    expect(findDesignLeaks("oklch(0.5 0 0)")).toEqual(["color-function"]);
    expect(findDesignLeaks("see #3388 for details")).toEqual([]);
    // Five classes, and the count is pinned so a silently deleted pattern is a failure here rather
    // than a quieter gate everywhere.
    expect(DESIGN_LEAK_PATTERNS).toHaveLength(5);
  });

  // ---------------------------------------------------------------------------------------------
  // The authoritative assertion.
  // ---------------------------------------------------------------------------------------------

  it("finds no raw design value under src/app/** or src/components/**", () => {
    expect(violations).toEqual([]);
  });
});
