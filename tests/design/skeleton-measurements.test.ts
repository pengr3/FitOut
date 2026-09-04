// AC#16 / STATE-01 / T-11-GEODRIFT — a skeleton may not hardcode its own box.
//
// WHAT THIS IS FOR. STATE-01's requirement is not "a skeleton exists". It is "the skeleton is built
// from the same measurements as the real content, so nothing shifts when the data arrives". A
// skeleton that writes `h-20` beside a real row that also writes `h-20` satisfies a review and
// drifts the first time one of them changes — and the drift shows up as the layout shift the
// skeleton was built to prevent. So the rule is mechanical: every box class in
// `src/components/patterns/*skeleton*.tsx` comes from `src/lib/design/measurements.ts`, and a literal
// height, width, size, aspect ratio or min/max box in one of those files is a failure.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE SCAN IS AN AST WALK AND NOT A GREP — AND THIS TREE IS THE POSITIVE CONTROL
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The plan's own acceptance criterion proposes a text grep:
//
//   grep -o 'h-[0-9]\|w-[0-9]\|aspect-\[' src/components/patterns/*skeleton*.tsx | grep -v w-3/4 ...
//
// Run against the THREE CLEAN FILES this gate polices, that command reports NINE hits (13 August
// 2026), every one of them prose:
//
//   card-grid-skeleton.tsx:aspect-[   ← the comment explaining that RESULT_CARD_MEDIA *replaces* the
//                                       `aspect-[4/3]` literal in the shipped analog
//   row-list-skeleton.tsx:h-2         ← the comment recording that the old loading.tsx hardcoded `h-20`
//   …plus w-3/w-1/w-2 six times, because `grep -o` prints `w-3`, so the `grep -v w-3/4` that was
//     meant to filter the proportional widths filters nothing at all.
//
// A gate with a 100% false-positive rate on a clean tree is a gate people delete. Worse, the same
// files are ALSO where the honest documentation has to live — you cannot explain which literal a
// constant replaced without naming that literal. So the scan reads STRING LITERALS AND TEMPLATE
// CHUNKS via `ts.createSourceFile`, exactly as `leak.test.ts:213-250` does, and a class name inside a
// comment is invisible to it by construction. The synthetic self-tests below pin that in both
// directions, and the three real files exercise it every run.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — both probes run, both reverted, recorded verbatim (13 August 2026)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// (a) THE RULE ITSELF. `row-list-skeleton.tsx`'s `cn(ROW_CARD_HEIGHT, "w-full rounded-xl")` was
//     changed to `cn("h-20", "w-full rounded-xl")` — the value of the constant, inlined, which is the
//     exact edit that looks harmless in review and is the whole of T-11-GEODRIFT. Verbatim:
//
//       AssertionError: these skeletons write literal box utilities. Every height, width, size and
//       aspect ratio in a skeleton must come from @/lib/design/measurements, or the skeleton and the
//       real content are free to drift apart — which is the layout shift the skeleton exists to
//       prevent (STATE-01 / AC#16). The only exemptions are the proportional widths w-1/2, w-2/3,
//       w-3/4, each with a stated reason in this file.: expected [ Array(1) ] to deeply equal []
//
//       - Expected
//       + Received
//
//       - []
//       + [
//       +   "src/components/patterns/row-list-skeleton.tsx: h-20",
//       + ]
//
//     1 failed / 7 passed. Note WHICH assertion failed: the literal ban, alone — the import
//     assertion stayed green, because the file still imported `ROW_CARD_HEIGHT` for the comment's
//     sake. That is the realistic shape of this regression and the reason both clauses exist.
//     Reverted (`git checkout --`, tree clean) → 8 passed.
//
// (b) VACUITY. `PATTERNS_DIR` was pointed at `src/components/patterns-nope`. Result: 2 failed /
//     6 passed — BOTH guard-the-guard assertions fired, verbatim:
//
//       AssertionError: matched: (nothing): expected 0 to be greater than or equal to 3
//       AssertionError: expected 0 to be greater than 30
//
//     …while the literal ban and the import check PASSED, perfectly and silently, over zero files.
//     That is the direction plan 11-02's probe (d) measured and it is why this file asserts its
//     guards FIRST: an absence assertion cannot notice that it was handed nothing. Reverted → 8
//     passed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — the D-57 gutter clause, both probes run, both reverted, verbatim (18 August 2026)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// (c) THE IMPORT HALF. `card-grid-skeleton.tsx`'s `cn(RESULT_GRID_GAP, "grid sm:grid-cols-2
//     lg:grid-cols-3")` was changed to the literal `"grid gap-4 sm:gap-6 sm:grid-cols-2
//     lg:grid-cols-3"` and `RESULT_GRID_GAP` dropped from the import — the constant's VALUE inlined,
//     which is the review-invisible edit that re-opens `[11-17]`. Verbatim:
//
//       AssertionError: these files render the search result grid's gutter without importing
//       RESULT_GRID_GAP from @/lib/design/measurements. The pending grid and the resolved grid stand
//       in for each other on the same route, so a gutter either of them owns privately is the ±4px
//       drift `[11-17]` recorded and D-57 closed — reachable again the moment one side stops
//       importing.: expected [ Array(1) ] to deeply equal []
//
//       - Expected
//       + Received
//
//       - []
//       + [
//       +   "src/components/patterns/card-grid-skeleton.tsx",
//       + ]
//
//     1 failed / 8 passed. THE BLAST RADIUS IS THE POINT, and it is why this clause exists as its own
//     assertion rather than as an extension of the two above: BOTH shipped clauses stayed GREEN
//     through it. The import check passed because the file still imports `RESULT_CARD_MEDIA` and
//     `TEXT_BAR_HEIGHT` (it asserts "at least one", by design — see probe (a)); the literal ban passed
//     because `gap-*` is spacing BETWEEN boxes, not a box, so `BOX_PREFIXES` cannot see it and must
//     not be widened to try. The inlined gutter was invisible to this entire file before this clause.
//     Reverted (`cp` from a pre-probe copy; `git diff` clean) → 9 passed.
//
// (d) THE RETIRED-STEP HALF, ISOLATED. The import left intact and only the class list changed, to
//     `cn(RESULT_GRID_GAP, "grid gap-5 sm:grid-cols-2 lg:grid-cols-3")` — i.e. the 20px step written
//     BESIDE the constant, which is the shape the `measurements.ts` header calls out as the violation
//     it is structurally unable to see. The import clause therefore passes and only the absence
//     clause can fire. Verbatim:
//
//       AssertionError: the 20px gutter step is RETIRED: it is not on the declared spacing ladder
//       (D-05), and both 16px and 24px are. A file still writing it has re-opened the drift.:
//       expected [ Array(1) ] to deeply equal []
//
//       - Expected
//       + Received
//
//       - []
//       + [
//       +   "src/components/patterns/card-grid-skeleton.tsx",
//       + ]
//
//     1 failed / 8 passed, and it is the OTHER expectation that fired — which is what makes the two
//     halves independently load-bearing rather than one assertion written twice. Reverted → 9 passed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   • THE BOX CAN BE RIGHT AND THE SHAPE STILL WRONG. This proves a skeleton's classes come from the
//     inventory. It cannot see that a card cell renders two text bars where the real card renders
//     four, or that a constant no longer matches the component it was derived from. That is the ±2px
//     `boundingBox()` comparison in plan `11-21`, run in both themes — and jsdom cannot catch this
//     class of bug AT ALL (D-131), so the sibling render gate cannot stand in for it either.
//   • Only classes written as literal text are seen. A class assembled at runtime — a token
//     interpolated into a template, a box picked out of a `Record` by a variable — is invisible, the
//     same hole `pair-drift.test.ts` and `selector-contract.test.ts` both declare.
//   • The import clause proves a measurement constant is IMPORTED, not that it is USED. A file could
//     import `ROW_CARD_HEIGHT`, never reference it, and satisfy this half — which is precisely what
//     probe (a) above demonstrates. The literal ban is what makes the pair meaningful; neither clause
//     is worth much alone.
//   • THE D-57 GUTTER CLAUSE IS A CLAIM ABOUT SOURCE TEXT, NOT ABOUT PIXELS. It proves both files
//     import the same constant and neither writes the retired step. It cannot prove the two grids
//     RENDER the same gutter — a wrapper with its own padding, a `cn` collision, a Tailwind class that
//     never got emitted, all pass here and all shift the layout. That is
//     `e2e/skeleton-geometry.spec.ts`'s `/`-based case, which measures both states' `boundingBox()`es
//     on the real route and asserts the absolute 16/24px as well as the equality.
//   • The scan is scoped to `patterns/*skeleton*.tsx`. A surface that hand-rolls its own skeleton
//     inline, instead of composing one of the three, is outside this gate entirely. Plan `11-22`'s
//     forward direction over `selector-contract.ts` is what would notice a shape that never shipped;
//     nothing here notices a fourth shape that shipped without joining the family.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import ts from "typescript";

import { stripComments } from "./helpers/strip-comments";

/** The scanned directory, as one constant — probe (b) above is a one-line edit here. */
const PATTERNS_DIR = resolve(process.cwd(), "src/components/patterns");

/** The module every box class must come from. */
const MEASUREMENTS_MODULE = "@/lib/design/measurements";

/**
 * The ONLY literals a skeleton may write for itself, carried as DATA with a reason — the idiom
 * `contrast-pairs.ts`'s `EXCLUDED_PAIRS` established, for the same reason: an exemption that is
 * merely absent from the pattern list is indistinguishable from one nobody argued for.
 */
const PROPORTIONAL_WIDTHS = [
  {
    token: "w-1/2",
    why: "A placeholder bar at half the cell's width. A PROPORTION of the skeleton, not a measurement of anything real — no title, price or metadata line in the product is defined as half a card wide, so no future edit to the real content can make this number wrong. There is nothing in `measurements.ts` it could be derived from, because there is nothing to derive it from.",
  },
  {
    token: "w-2/3",
    why: "Same argument, one step wider. Used in the panel shape so its three bars are visibly ragged rather than three identical blocks, which is what makes a placeholder read as text rather than as a table.",
  },
  {
    token: "w-3/4",
    why: "Same argument again, and the one the two shipped analogs already use for a title bar (`(host)/host/listings/loading.tsx:14`). Kept identical to the analog so the routes that migrate onto these patterns shimmer at the geometry they shimmer at today.",
  },
] as const;

const EXEMPT_TOKENS = new Set<string>(PROPORTIONAL_WIDTHS.map((entry) => entry.token));

/**
 * The box-utility prefixes a skeleton may not spell out for itself.
 *
 * WIDER THAN THE PLAN'S LIST, ON PURPOSE, and the precedent is `config/design-leak-patterns.mjs`'s
 * `COLOUR_ROLE` fragment (WR-07/WR-08): the plan names `h-` / `w-` / `aspect-[` / `size-` / `min-h-`,
 * which bans one spelling of a box while leaving its immediate siblings legal. `min-w-44` is a real
 * measurement in this very inventory (`AUTH_SLOT_BOX`), so a list that policed `min-h` and not
 * `min-w` would ban the header's height and wave through the auth slot's width. A hand-written list
 * with a hole in it is how the leak gate shipped `ring-offset-white` unseen.
 *
 * ORDERED LONGEST-FIRST where one prefix prefixes another (`min-h` before `h`), because the match
 * below is first-wins.
 */
const BOX_PREFIXES = ["min-h", "max-h", "min-w", "max-w", "aspect", "size", "h", "w"] as const;

/**
 * Utilities that are NOT measurements and stay legal: they are relative to a parent or a viewport
 * that the skeleton does not choose. `w-full` is "fill whatever contains me", which is exactly the
 * statement a placeholder should be making; `h-20` is "be eighty pixels tall", which is a claim about
 * the real content and therefore has to come from the inventory.
 */
const RELATIVE_VALUES = new Set([
  "full",
  "auto",
  "screen",
  "min",
  "max",
  "fit",
  "dvh",
  "dvw",
  "svh",
  "svw",
  "lvh",
  "lvw",
]);

/** A bare number (`4`, `0.5`), a fraction (`1/2`), an arbitrary value (`[4/3]`), or `px`. */
function isMeasurementValue(value: string): boolean {
  if (value.startsWith("[")) return true;
  if (value === "px") return true;
  if (/^\d+(\.\d+)?$/.test(value)) return true;
  if (/^\d+\/\d+$/.test(value)) return true;
  return false;
}

/** Strip the variant chain at bracket depth zero — `sm:h-16` is still a literal `h-16`. */
function utilityOf(token: string): string {
  const text = token.replace(/^!+/, "");
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "[" || ch === "(") depth++;
    else if (ch === "]" || ch === ")") depth--;
    else if (ch === ":" && depth === 0) start = i + 1;
  }
  return text.slice(start).replace(/^-/, "");
}

/**
 * Is this class token a literal box measurement?
 *
 * `aspect-*` is banned in EVERY form, not only the arbitrary one: `aspect-square` and `aspect-video`
 * are geometry decisions about the real content just as much as `aspect-[4/3]` is, and the plan's
 * `aspect-\[` spelling would have let the named ratios through.
 */
function boxViolationIn(rawToken: string): string | null {
  const utility = utilityOf(rawToken);
  if (EXEMPT_TOKENS.has(utility)) return null;
  for (const prefix of BOX_PREFIXES) {
    if (!utility.startsWith(`${prefix}-`)) continue;
    const value = utility.slice(prefix.length + 1);
    if (prefix === "aspect") return utility;
    if (RELATIVE_VALUES.has(value)) return null;
    return isMeasurementValue(value) ? utility : null;
  }
  return null;
}

type Scan = { readonly tokens: string[]; readonly violations: string[] };

/**
 * Walk one module's STRING LITERALS and template chunks — never its raw text. See the header: the
 * three real files all name a banned class in prose, and a text scan reports every one of them.
 */
function scanText(path: string, text: string): Scan {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const tokens: string[] = [];
  const violations: string[] = [];
  const visit = (node: ts.Node): void => {
    let chunk: string | null = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      chunk = node.text;
    } else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      chunk = node.text;
    }
    if (chunk !== null) {
      for (const raw of chunk.split(/\s+/).filter(Boolean)) {
        tokens.push(raw);
        const violation = boxViolationIn(raw);
        if (violation !== null) violations.push(`${path}: ${violation}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { tokens, violations };
}

/** Every named identifier a module imports from `@/lib/design/measurements`. */
function measurementImportsIn(path: string, text: string): string[] {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names: string[] = [];
  for (const statement of sf.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (statement.moduleSpecifier.text !== MEASUREMENTS_MODULE) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings !== undefined && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) names.push(element.name.text);
    }
  }
  return names;
}

/** `[]` on a missing directory rather than a throw — 11-02's rule: a broken scan must surface as one
 *  named guard-the-guard failure, not as a stack trace that buries which gate went quiet. */
function skeletonFiles(): string[] {
  let entries: string[];
  try {
    entries = readdirSync(PATTERNS_DIR);
  } catch {
    return [];
  }
  return entries.filter((name) => name.includes("skeleton") && name.endsWith(".tsx")).sort();
}

const FILES = skeletonFiles();
const SCANNED = FILES.map((name) => {
  const label = `src/components/patterns/${name}`;
  const text = readFileSync(join(PATTERNS_DIR, name), "utf8");
  return { name, label, text, ...scanText(label, text) };
});

describe("AC#16 — a skeleton's box comes from the measurement inventory", () => {
  // -------------------------------------------------------------------------------------------
  // GUARD THE GUARD, ASSERTED FIRST. Both real assertions below are "a list of things was empty"
  // and "a list of things was non-empty", and a scan that matched zero files satisfies the first
  // perfectly while the second never runs. Probe (b) in the header measured exactly that.
  // -------------------------------------------------------------------------------------------

  it("scans the three skeleton patterns it is supposed to be policing", () => {
    expect(FILES.length, `matched: ${FILES.join(", ") || "(nothing)"}`).toBeGreaterThanOrEqual(3);
    expect(FILES).toContain("card-grid-skeleton.tsx");
    expect(FILES).toContain("row-list-skeleton.tsx");
    expect(FILES).toContain("panel-skeleton.tsx");
  });

  it("collected real class strings out of every file it scanned", () => {
    // The second half of the vacuity guard, and the one that is easy to forget: a glob can match
    // three files while the AST walk silently yields nothing from them (a changed node kind, a
    // parser flag), and the literal ban would still report a clean `[]`.
    for (const file of SCANNED) {
      expect(file.tokens.length, `${file.label} yielded no string tokens at all`).toBeGreaterThan(5);
    }
    expect(SCANNED.reduce((n, f) => n + f.tokens.length, 0)).toBeGreaterThan(30);
  });

  it("declares every exemption as data, with a reason", () => {
    // The `EXCLUDED_PAIRS` rule, applied here: an exemption without an argument is a hole.
    expect(PROPORTIONAL_WIDTHS.length).toBe(3);
    for (const entry of PROPORTIONAL_WIDTHS) {
      expect(entry.why.length, entry.token).toBeGreaterThan(40);
    }
  });

  // -------------------------------------------------------------------------------------------
  // The two real clauses.
  // -------------------------------------------------------------------------------------------

  it("imports at least one measurement constant into every skeleton", () => {
    const missing = SCANNED.filter(
      (file) => measurementImportsIn(file.label, file.text).length === 0,
    ).map((file) => file.label);
    expect(
      missing,
      `these skeletons import nothing from ${MEASUREMENTS_MODULE}, so whatever box they render is ` +
        `their own invention (STATE-01 / AC#16)`,
    ).toEqual([]);
  });

  it("writes no literal height, width, size or aspect ratio of its own", () => {
    const violations = SCANNED.flatMap((file) => file.violations);
    expect(
      violations,
      "these skeletons write literal box utilities. Every height, width, size and aspect ratio in a " +
        `skeleton must come from ${MEASUREMENTS_MODULE}, or the skeleton and the real content are ` +
        "free to drift apart — which is the layout shift the skeleton exists to prevent " +
        `(STATE-01 / AC#16). The only exemptions are the proportional widths ` +
        `${[...EXEMPT_TOKENS].join(", ")}, each with a stated reason in this file.`,
    ).toEqual([]);
  });

  // -------------------------------------------------------------------------------------------
  // Both-directions self-tests on the classifier, over fixtures never written to disk — so the
  // thing the real assertion runs is the same code path the fixtures prove.
  // -------------------------------------------------------------------------------------------

  it("catches a literal box and lets a proportional width through", () => {
    const bad = scanText(
      "fake-bad.tsx",
      'export const A = <div className="h-20 w-full rounded-xl" />;',
    );
    expect(bad.violations).toEqual(["fake-bad.tsx: h-20"]);

    const good = scanText(
      "fake-good.tsx",
      'export const A = <div className="w-3/4 w-full space-y-3 gap-5 rounded-xl" />;',
    );
    expect(good.violations).toEqual([]);
  });

  it("is not fooled by a variant prefix, an arbitrary value or a named aspect ratio", () => {
    expect(boxViolationIn("sm:h-16")).toBe("h-16");
    expect(boxViolationIn("lg:min-w-44")).toBe("min-w-44");
    expect(boxViolationIn("h-[3.5rem]")).toBe("h-[3.5rem]");
    expect(boxViolationIn("aspect-[4/3]")).toBe("aspect-[4/3]");
    // The plan's `aspect-\[` spelling would have missed both of these.
    expect(boxViolationIn("aspect-square")).toBe("aspect-square");
    expect(boxViolationIn("aspect-video")).toBe("aspect-video");
    expect(boxViolationIn("size-12")).toBe("size-12");
    expect(boxViolationIn("min-h-40")).toBe("min-h-40");
    expect(boxViolationIn("h-px")).toBe("h-px");
    // A fraction is exempt only for the three declared widths — a HEIGHT fraction is not.
    expect(boxViolationIn("h-1/2")).toBe("h-1/2");
    expect(boxViolationIn("w-1/3")).toBe("w-1/3");
    expect(boxViolationIn("w-3/4")).toBeNull();
    // Relative-to-parent utilities are not measurements.
    expect(boxViolationIn("w-full")).toBeNull();
    expect(boxViolationIn("h-full")).toBeNull();
    expect(boxViolationIn("min-h-screen")).toBeNull();
    // Neither is anything outside the box family.
    expect(boxViolationIn("space-y-3")).toBeNull();
    expect(boxViolationIn("gap-5")).toBeNull();
    expect(boxViolationIn("lg:grid-cols-3")).toBeNull();
    expect(boxViolationIn("rounded-xl")).toBeNull();
    expect(boxViolationIn("sr-only")).toBeNull();
  });

  // -------------------------------------------------------------------------------------------
  // D-57 / `[11-17]` — THE ONE GUTTER, asserted on BOTH sides of the pair.
  //
  // This is the same rule as the literal ban above, applied to the one geometry that had ALREADY
  // drifted, and it needs its own clause because only one of the two files is a `patterns/*skeleton*`
  // and so only one of them is inside the scan above. `gap-*` is not a box utility either — it is
  // spacing BETWEEN boxes — so `BOX_PREFIXES` would never have caught it in either file.
  // -------------------------------------------------------------------------------------------

  it("gives the result grid and its skeleton ONE gutter, imported (D-57)", () => {
    const PAIR = [
      "src/components/search/search-results.tsx",
      "src/components/patterns/card-grid-skeleton.tsx",
    ] as const;

    // The retired 20px step, spelled as a fragment so this assertion's own source cannot satisfy
    // the `.includes()` it performs — the same reason `contrast-pairs.ts` describes the rejected
    // brand alpha class instead of quoting it.
    const RETIRED_GUTTER = `gap-${5}`;

    const read = PAIR.map((label) => ({
      label,
      text: readFileSync(resolve(process.cwd(), label), "utf8"),
    }));

    // GUARD THE GUARD, FIRST — both clauses below are absence/presence claims over file text, and
    // a `readFileSync` that returned an empty string satisfies the absence half perfectly. Probe (b)
    // in the header is what this is modelled on.
    for (const file of read) {
      expect(file.text.length, `${file.label} was read as empty`).toBeGreaterThan(200);
      expect(stripComments(file.text).trim().length, `${file.label} is all comment`).toBeGreaterThan(
        100,
      );
    }

    const notImporting = read
      .filter((file) => !measurementImportsIn(file.label, file.text).includes("RESULT_GRID_GAP"))
      .map((file) => file.label);
    expect(
      notImporting,
      `these files render the search result grid's gutter without importing RESULT_GRID_GAP from ` +
        `${MEASUREMENTS_MODULE}. The pending grid and the resolved grid stand in for each other on ` +
        `the same route, so a gutter either of them owns privately is the ±4px drift \`[11-17]\` ` +
        `recorded and D-57 closed — reachable again the moment one side stops importing.`,
    ).toEqual([]);

    // …and the retired step survives in NEITHER, comments included — counted over comment-stripped
    // source, because both files explain the hazard in prose and a bare text scan counts the
    // explanation. (This is the same finding the header records against the plan's prescribed grep.)
    const retained = read
      .filter((file) => stripComments(file.text).includes(RETIRED_GUTTER))
      .map((file) => file.label);
    expect(
      retained,
      `the 20px gutter step is RETIRED: it is not on the declared spacing ladder (D-05), and both ` +
        `16px and 24px are. A file still writing it has re-opened the drift.`,
    ).toEqual([]);

    // GUARD THE GUARD, SECOND DIRECTION: the absence assertion must be capable of firing. If
    // `stripComments` ever returns something a `.includes()` cannot match, the clause above passes
    // over anything.
    expect(stripComments(`const a = "${RETIRED_GUTTER} grid";`)).toContain(RETIRED_GUTTER);
    expect(stripComments(`// a comment naming ${RETIRED_GUTTER}`)).not.toContain(RETIRED_GUTTER);
  });

  it("does not mistake a class named in a comment for one written at a call site", () => {
    // THE REASON THIS IS AN AST WALK. All three real files do exactly this — see the header, where
    // the plan's prescribed grep reports nine hits against a clean tree.
    const commented = scanText(
      "fake-comment.tsx",
      [
        "// The constant replaces the `aspect-[4/3]` literal, which used to be `h-20`.",
        "/* and a block comment naming size-12 and min-h-40 too */",
        'export const A = <div className="w-full" />; // trailing h-4',
      ].join("\n"),
    );
    expect(commented.violations).toEqual([]);
    // …and the walk really did run over that fixture, rather than returning early.
    expect(commented.tokens).toContain("w-full");
  });
});
