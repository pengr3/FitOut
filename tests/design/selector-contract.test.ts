// GATE-04's regression-blocking half: the D-32 floor on the e2e suite's accessible queries, and the ban
// on any `data-testid` that is not declared in `src/lib/design/selector-contract.ts`.
//
// WHAT THIS FILE IS FOR, IN ONE SENTENCE. D-134's real regression is somebody restyling a surface and,
// when a shipped spec goes red because the markup moved, "fixing" it by converting `getByRole` into a
// test id. That trade looks like maintenance and is a silent loss: a role query asserts accessibility as
// a side effect, and a test id asserts nothing except that a string is still in the DOM. This file makes
// that trade fail the build.
//
// It runs under `tests/design/**`, so it is DB-free and executes inside `npm run build`
// (`package.json` → `"build": "npm run lint && npm run test:design && next build"`).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE MEASURED NUMBERS (e2e/, 13 August 2026 — 12 `.ts` files: 11 specs + `helpers/theme.ts`)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   getByRole      92   ← GATED. D-32 floor.
//   getByLabel     30   ← GATED. D-32 floor.
//   getByText      63   ← RECORDED, NOT GATED.
//   .locator(      23   ← RECORDED, NOT GATED. (`11-UI-SPEC.md` § GATE-04 says 22. 23 is what the tree
//                          holds; the spec is off by one and the measurement wins.)
//   getByTestId(    0   ← RECORDED. Zero today, because `src/` had zero `data-testid` when this landed.
//
// ALL FIVE COUNTS ARE IDENTICAL RAW AND COMMENT-STRIPPED TODAY — measured both ways before this file
// was written, not assumed. No spec currently quotes a query token in prose, so the stripper changes
// nothing at HEAD. It is here for the day one does: `use-server-exports.test.ts` and `type-scale.test.ts`
// each had a prose mention silently inflate a count in this repository, and a comment in an e2e spec
// explaining *why* a `getByRole` was chosen is exactly the well-intentioned edit that would make this
// floor pass for a reason unrelated to the suite.
//
// WHY ONLY TWO OF THEM ARE GATED. A floor on `getByText` would freeze copy, and this phase's own
// copywriting contract rewrites copy on several surfaces (`/host/requests` alone changes its heading).
// A floor on `.locator(` would be perverse: those 23 structural calls ARE the fragile selectors this
// phase exists to reduce, so a floor would forbid the improvement and reward the status quo. Both are
// printed in the floor assertion's failure message anyway, because when the floor breaks the first
// question is always "where did it go", and a rise in `.locator(` matching a fall in `getByRole` is the
// answer.
//
// WHY A FLOOR AND NOT AN EQUALITY (D-32, and `11-UI-SPEC.md` AC#32 read as a floor). An equality pinned
// at 92/30 goes red on every legitimate new assertion Phases 12-19 write, and the obvious fix for that
// red is to bump the number. Bumping a number to make a gate green is the rubber-stamp habit this phase
// exists to remove — an equality would import it through the gate meant to prevent it.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — FOUR WAYS, ALL REAL (13 August 2026). GREEN IS 5 PASSED.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`). Command
// for all four: `npx vitest run --config vitest.design.config.ts tests/design/selector-contract.test.ts`
//
//   (a) THE FLOOR. `e2e/public-listing.spec.ts:112`'s
//       `page.getByRole("button", { name: /book|not bookable yet/i })` rewritten to
//       `page.locator('[data-testid="book-cta"]')` — the exact shape of the regression, an accessible
//       query traded for a structural one. 1 failed / 4 passed:
//
//         FAIL  … > the e2e suite's accessible-query coverage only goes up (D-32)
//         AssertionError: e2e/ has 91 `getByRole(` occurrences. The D-32 floor is 92, and it is a FLOOR
//         — coverage may only go UP. A count going DOWN means an accessible query was converted to a
//         brittle one. Also measured this run: getByLabel 30, getByText 63, .locator( 24, getByTestId(
//         0. Do NOT fix this by lowering the floor.: expected 91 to be greater than or equal to 92
//
//       `.locator(` moved 23 → 24 in the SAME message in which `getByRole` moved 92 → 91. That pairing
//       is the whole diagnosis, printed without anybody having to go looking for it — which is why the
//       three ungated counts are carried in the gated assertion's failure message rather than merely
//       recorded in this header. Reverted → 5 passed.
//
//   (b) THE UNDECLARED-ID BAN. `data-testid="not-declared"` added to the wrapper `<div>` at
//       `src/components/booking/book-cta.tsx:217`. 1 failed / 4 passed:
//
//         FAIL  … > no `data-testid` appears in src/ that the contract does not declare
//         AssertionError: expected [ Array(1) ] to deeply equal []
//         + [
//         +   "src/components/booking/book-cta.tsx:217 — data-testid=\"not-declared\" is NOT declared
//         +    in SELECTOR_IDS. An ad-hoc test id is a GATE-04 failure, not a convention breach: add a
//         +    row to src/lib/design/selector-contract.ts with a reason and an owner, or use a
//         +    role/label query instead.",
//         + ]
//
//       File, line AND value, all three — "an undeclared id exists somewhere in src/" is not an
//       actionable failure, and the remedy is spelled out in the message because the wrong remedy
//       (delete the id, or widen the scan) is the easier one to reach for. Reverted → 5 passed.
//
//   (c) GUARD-THE-GUARD, e2e side. `E2E_DIR` re-pointed at `e2e-nope`, a directory that does not exist.
//       2 failed / 3 passed:
//
//         FAIL  … > the scanners actually read the trees they are asserting about
//         AssertionError: the e2e scanner found 0 spec files. A floor asserted against a scanner that
//         silently stopped reading passes vacuously — which is the exact failure mode this file exists
//         to prevent.: expected +0 to be greater than or equal to 10
//
//         FAIL  … > the e2e suite's accessible-query coverage only goes up (D-32)
//         AssertionError: e2e/ has 0 `getByRole(` occurrences. … Also measured this run: getByLabel 0,
//         getByText 0, .locator( 0, getByTestId( 0.: expected 0 to be greater than or equal to 92
//
//       Both moved, and the second one is a coincidence of this particular floor being a MINIMUM: 0 is
//       below 92, so the floor happens to fail too. Do not read that as the floor covering the vacuity
//       case — probe (d) is what shows it does not. Reverted → 5 passed.
//
//   (d) GUARD-THE-GUARD, src side — THE PROBE WORTH READING, because it measures the silent direction
//       instead of arguing it. `SRC_DIR` re-pointed at `src-nope`. 1 failed / 4 passed:
//
//         FAIL  … > the scanners actually read the trees they are asserting about
//         AssertionError: the src scanner found 0 .tsx files. The undeclared-id ban is green against an
//         empty scan, so this number is what makes that green mean anything.: expected 0 to be greater
//         than or equal to 50
//
//       THE UNDECLARED-ID BAN PASSED. Against a tree it never opened, over 0 files, it reported a
//       perfectly clean `[]` — indistinguishable in every way from a real clean run, and it would stay
//       that way forever. An absence assertion cannot notice that it was handed nothing; only a
//       positive control over the scan can. That is the whole justification for `collectFiles()`
//       returning `[]` rather than throwing on a missing directory: the throw would be caught by
//       whoever moved the directory, but a scan narrowed by a WRONG GLOB (the realistic version of this
//       failure) never throws at all, and the 50-file floor is what catches that. Reverted → 5 passed.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • THE FORWARD DIRECTION IS NOT ASSERTED HERE, AND THAT IS DELIBERATE. "Every id declared in
//     `SELECTOR_IDS` actually appears in `src/`" — D-32's existence half — is NOT checked by this file.
//     At wave 1 it would be vacuously true against an empty set (17 declared ids, zero rendered), and
//     from wave 4 onward it would be RED for every id whose owning plan has not run yet, which makes it
//     a gate that must be disabled to get work done. **It is owned by plan `11-22`**, the plan that
//     closes the last adoption, and that plan's Task 4 also asserts the two directions are exact
//     complements. The `owner` column in `src/lib/design/selector-contract.ts` is what makes this
//     hand-off auditable rather than forgotten: every declared id names the plan that owes it, so an id
//     still missing when `11-22` runs is traceable to the plan that failed to ship it. If you are
//     reading this after `11-22` has run, this bullet is stale and should be gone — say so.
//   • The undeclared-id scan reads `src/**/*.tsx` only, and only JSX attributes with a STRING-LITERAL
//     value. A `data-testid` composed at runtime (`data-testid={id}`, a spread, a template with a
//     substitution) is invisible to it. That is the safe direction for a BAN — it can miss a violation,
//     never invent one — but it is a real hole, and the fix if one ever ships is a lint rule at the call
//     site, not a looser scan here.
//   • The floor counts TEXT OCCURRENCES of `getByRole(` / `getByLabel(` after comments are stripped. It
//     does not know whether a query is inside a skipped test, inside dead code, or asserted at all. A
//     spec that keeps its 92 queries and deletes every `expect` would pass this file. That is what the
//     e2e suite itself is for; this file guards the SELECTOR STRATEGY, not the assertions.
//   • Nothing here proves a declared id is a GOOD id. The scope rule ("only where a role or label query
//     cannot express the target") lives in the inventory's header as prose and is enforced by review —
//     T-11-A11YLOSS is dispositioned `accept`, with Phase 17's axe pass owning breadth.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

import { stripComments } from "./helpers/strip-comments";
import {
  SELECTOR_IDS,
  SELECTOR_ATTRIBUTE,
} from "@/lib/design/selector-contract";

const E2E_DIR = resolve(process.cwd(), "e2e");
const SRC_DIR = resolve(process.cwd(), "src");

/** D-32's two floors. FLOORS. Raising one because coverage grew is fine; lowering one is the bug. */
const GET_BY_ROLE_FLOOR = 92;
const GET_BY_LABEL_FLOOR = 30;

/** The scanner must see at least this many spec files, or it is not scanning (guard-the-guard). */
const MIN_SPEC_FILES = 10;

/** Two specs named individually: the double-booking flow and the open-capacity flow. */
const REQUIRED_SPECS = ["e2e/search-and-book.spec.ts", "e2e/open-capacity.spec.ts"] as const;

/** Every token counted. The first two are gated; the rest are printed when a gate breaks. */
const COUNTED = ["getByRole(", "getByLabel(", "getByText(", ".locator(", "getByTestId("] as const;

type CountedToken = (typeof COUNTED)[number];

/** Windows: `relative()` returns backslashes, and every assertion here compares POSIX paths (T-10-27). */
const posix = (abs: string): string => relative(process.cwd(), abs).split("\\").join("/");

/**
 * Every file under `dir` matching `ext`, recursively.
 *
 * Returns `[]` when `dir` does not exist rather than throwing. That is deliberate and it is the reason
 * the guard-the-guard assertion below exists: a scanner pointed at a moved or renamed directory should
 * surface as ONE named assertion about the scan, not as a stack trace that buries which gate went quiet.
 */
function collectFiles(dir: string, ext: RegExp, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, ext, out);
    else if (ext.test(entry.name)) out.push(full);
  }
  return out;
}

/** Non-overlapping occurrences of a literal token. */
function countToken(text: string, token: string): number {
  return text.split(token).length - 1;
}

/**
 * Count every `COUNTED` token across the e2e tree, WITH COMMENTS STRIPPED.
 *
 * Exported shape is (path, text) rather than (path) for the same reason `leak.test.ts:208-212` gives:
 * the synthetic self-tests below feed this the fixtures, so the code path the real assertion runs is the
 * one the fixtures prove. Stripping matters because a spec's own comment quoting `getByRole(` — or this
 * file's header, were it ever moved under `e2e/` — would inflate the count and make the floor pass for a
 * reason that has nothing to do with the suite.
 */
function countIn(texts: readonly string[]): Record<CountedToken, number> {
  const counts = Object.fromEntries(COUNTED.map((t) => [t, 0])) as Record<CountedToken, number>;
  for (const text of texts) {
    const stripped = stripComments(text);
    for (const token of COUNTED) counts[token] += countToken(stripped, token);
  }
  return counts;
}

/** One `data-testid` found in the tree: where it is and what it says. */
type FoundId = { readonly file: string; readonly line: number; readonly value: string };

/**
 * Collect every JSX `data-testid` whose value is a string literal, by PARSING rather than matching.
 *
 * Parsing is what makes a `data-testid` inside a `//` comment, inside a plain string constant, or inside
 * a prose block comment invisible — none of those is a `JsxAttribute` node, so none is reachable here.
 * A regex over the same text counts all three, which is how a gate ends up red for a sentence.
 *
 * Both literal spellings are collected: `data-testid="x"` (a direct `StringLiteral` initializer) and
 * `data-testid={"x"}` (a `JsxExpression` wrapping one). Missing the braced form would leave a legal
 * spelling of an ad-hoc id outside the ban.
 */
function collectTestIds(path: string, text: string): FoundId[] {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: FoundId[] = [];

  const literalValue = (init: ts.Node | undefined): string | null => {
    if (!init) return null;
    if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) return init.text;
    if (ts.isJsxExpression(init) && init.expression) return literalValue(init.expression);
    return null;
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxAttribute(node) && node.name.getText(sf) === SELECTOR_ATTRIBUTE) {
      const value = literalValue(node.initializer);
      if (value !== null) {
        found.push({
          file: path,
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          value,
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return found;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The trees, scanned ONCE at module level; the `it()` blocks only assert.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const specFiles = collectFiles(E2E_DIR, /\.ts$/).map(posix);
const specCounts = countIn(
  collectFiles(E2E_DIR, /\.ts$/).map((f) => readFileSync(f, "utf8")),
);

const tsxFiles = collectFiles(SRC_DIR, /\.tsx$/);
const foundIds: FoundId[] = tsxFiles.flatMap((f) =>
  collectTestIds(posix(f), readFileSync(f, "utf8")),
);

const declared = new Set<string>(SELECTOR_IDS);

/** The other three counts, rendered for the floor's failure message — a fall here needs its companion. */
const companionCounts = (): string =>
  `getByLabel ${specCounts["getByLabel("]}, getByText ${specCounts["getByText("]}, ` +
  `.locator( ${specCounts[".locator("]}, getByTestId( ${specCounts["getByTestId("]}`;

describe("GATE-04 — the structural-selector contract", () => {
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  // ASSERTION 3 first, on purpose: every assertion below it is worthless if the scan is empty.
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  it("the scanners actually read the trees they are asserting about", () => {
    expect(
      specFiles.length,
      `the e2e scanner found ${specFiles.length} spec files. A floor asserted against a scanner that ` +
        `silently stopped reading passes vacuously — which is the exact failure mode this file exists ` +
        `to prevent.`,
    ).toBeGreaterThanOrEqual(MIN_SPEC_FILES);

    // Two named files, because a count alone survives the whole suite being replaced by 10 new specs.
    // These two are the ones the double-booking guarantee and the open-capacity guarantee hang on.
    for (const required of REQUIRED_SPECS) {
      expect(
        specFiles,
        `${required} was not found by the e2e scanner. Either it was renamed — in which case fix this ` +
          `list and say why in the header — or the scanner is looking in the wrong place.`,
      ).toContain(required);
    }

    // The src side has its own vacuity hole: a `.tsx` scan that finds nothing reports a clean tree.
    expect(
      tsxFiles.length,
      `the src scanner found ${tsxFiles.length} .tsx files. The undeclared-id ban is green against an ` +
        `empty scan, so this number is what makes that green mean anything.`,
    ).toBeGreaterThanOrEqual(50);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  // ASSERTION 1 — the D-32 floor.
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  it("the e2e suite's accessible-query coverage only goes up (D-32)", () => {
    expect(
      specCounts["getByRole("],
      `e2e/ has ${specCounts["getByRole("]} \`getByRole(\` occurrences. The D-32 floor is ` +
        `${GET_BY_ROLE_FLOOR}, and it is a FLOOR — coverage may only go UP. A count going DOWN means an ` +
        `accessible query was converted to a brittle one. Also measured this run: ${companionCounts()}. ` +
        `Do NOT fix this by lowering the floor.`,
    ).toBeGreaterThanOrEqual(GET_BY_ROLE_FLOOR);

    expect(
      specCounts["getByLabel("],
      `e2e/ has ${specCounts["getByLabel("]} \`getByLabel(\` occurrences. The D-32 floor is ` +
        `${GET_BY_LABEL_FLOOR}, and it is a FLOOR — coverage may only go UP. A count going DOWN means a ` +
        `form control lost the label query that was also proving it had a label. Also measured this ` +
        `run: ${companionCounts()}. Do NOT fix this by lowering the floor.`,
    ).toBeGreaterThanOrEqual(GET_BY_LABEL_FLOOR);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  // ASSERTION 2 — the undeclared-id ban. The direction that can fail today.
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  it("no `data-testid` appears in src/ that the contract does not declare", () => {
    const violations = foundIds
      .filter((f) => !declared.has(f.value))
      .map(
        (f) =>
          `${f.file}:${f.line} — ${SELECTOR_ATTRIBUTE}="${f.value}" is NOT declared in SELECTOR_IDS. ` +
          `An ad-hoc test id is a GATE-04 failure, not a convention breach: add a row to ` +
          `src/lib/design/selector-contract.ts with a reason and an owner, or use a role/label query ` +
          `instead.`,
      );

    expect(violations).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  // ASSERTION 4 — both-directions self-tests, on fixtures never written to disk.
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  it("the id collector reads markup and not prose", () => {
    const fixture = [
      "// A comment mentioning data-testid=\"comment-ghost\" — prose, not markup.",
      "/* A block comment with data-testid=\"block-ghost\" in it. */",
      'const label = \'data-testid="string-ghost"\';',
      "export function Thing() {",
      '  return <div data-testid="site-header">{label}</div>;',
      "}",
    ].join("\n");

    const values = collectTestIds("fake.tsx", fixture).map((f) => f.value);

    // The real attribute is collected — without this the two negatives below are satisfied by a
    // collector that finds nothing at all, which is the vacuity trap in miniature.
    expect(values).toEqual(["site-header"]);
    expect(values).not.toContain("comment-ghost");
    expect(values).not.toContain("block-ghost");
    expect(values).not.toContain("string-ghost");

    // The braced literal spelling is the same violation as the quoted one.
    const braced = collectTestIds("fake2.tsx", 'const A = <p data-testid={"row-card"} />;');
    expect(braced.map((f) => f.value)).toEqual(["row-card"]);

    // A runtime-composed id is NOT collected. Asserted rather than merely documented, so the blind
    // spot in the NOT COVERED footer is a measured fact and not a guess.
    const dynamic = collectTestIds("fake3.tsx", "const B = <p data-testid={id} />;");
    expect(dynamic).toEqual([]);
  });

  it("the query counter reads code and not comments", () => {
    const fixture = [
      "// Do not convert this to getByRole( in a comment — it must not count.",
      "/* getByLabel( in a block comment must not count either. */",
      'test("real", async ({ page }) => {',
      '  await page.getByRole("button", { name: "Book" }).click();',
      '  await page.getByLabel("Email").fill("a@b.c");',
      "});",
    ].join("\n");

    const counts = countIn([fixture]);
    expect(counts["getByRole("]).toBe(1);
    expect(counts["getByLabel("]).toBe(1);

    // And the control on the control: without stripping, the same fixture counts the prose. If this
    // ever reads 1, the stripper stopped working and every count above is silently inflated.
    expect(countToken(fixture, "getByRole(")).toBe(2);
  });
});
