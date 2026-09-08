// RESP-04 — ONE COMPONENT TREE, ASSERTED AS A SOURCE FACT.
//
// Two clauses, and both are questions about the SOURCE rather than about a rendered page:
//
//   AC#10 — no file under `src/app/**` or `src/components/**` renders a viewport-conditional JSX
//           branch. `{isMobile ? <A/> : <B/>}` needs JS to know the viewport, breaks SSR, doubles the
//           visual-regression surface, and duplicates content for screen readers.
//   AC#11 — `src/` contains exactly ONE `matchMedia` call site and ZERO `useMediaQuery` imports.
//
// AC#14 IS NOT HERE, AND THAT IS DELIBERATE. `src/components/ui/sheet.tsx` absent /
// `src/components/patterns/responsive-dialog.tsx` present is owned by
// `tests/design/sheet-absent.test.ts` (its AC#26 — same claim, Phase 11's numbering), which asserts
// BOTH halves and additionally bans the `vaul`/gesture dependency that is the other way the sheet
// arrives. A second copy here would be two things to update and one thing to forget. The delegation
// itself is asserted below, because a delegation to a file that has been deleted or gutted is a hole
// with no symptom.
//
// THE OTHER HALF OF RESP-04 CANNOT LIVE HERE AT ALL. AC#12/13 — "the identifying container resolves
// exactly ONCE IN THE DOCUMENT at 320, 768 and 1280" — need a real browser: `[data-testid]` resolves
// against `display: none` nodes exactly as it resolves against painted ones, which is precisely why a
// COUNT is the right assertion and "is visible" is not, and why no source scan can produce it. Plan
// 17-09 owns that half in Playwright. This file is the half that can block `npm run build`.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY AC#11 COUNTS CALL EXPRESSIONS AND NEVER THE STRING (17-RESEARCH § Pitfall 7)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The sanctioned exception guards before it calls:
//
//   src/components/host/publish-checklist.tsx:148    if (typeof window.matchMedia !== "function") return;
//   src/components/host/publish-checklist.tsx:149    const query = window.matchMedia(PANEL_MEDIA_QUERY);
//
// Line 148 is a `typeof` GUARD — a property read inside a `typeof`, not a call — and it exists because
// jsdom implements no media-query engine, so the wizard's own unit tests throw without it. A scan
// counting the STRING `matchMedia` therefore returns **2** against a tree that is perfectly compliant,
// and a literal `toBe(1)` over that count is RED AGAINST CORRECT CODE. The obvious fix for such a red
// is to delete the guard — i.e. the gate would demand a real defect be introduced to make it green.
//
// This is the same class as this suite's standing prescribed-grep precedent, recorded at
// `loading-coverage.test.ts:325-334`: the plan's `\bw-[0-9]` grep reported six violations against a
// correct tree because it matched the `w-4` inside `max-w-4xl`. Both are cases where the prescribed
// instrument and the prescribed answer disagree, and in both the instrument is what is wrong.
//
// So the clause below walks the AST and counts `ts.isCallExpression` nodes whose callee resolves to
// `matchMedia` — as an identifier, as `window.matchMedia`, or as `window["matchMedia"]`. The trap is
// demonstrated rather than argued: the self-test at the bottom runs BOTH counters over one synthetic
// fixture carrying the guard and the call, and asserts the string counter says 2 while the call-site
// counter says 1.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE ONE SANCTIONED EXCEPTION, ASSERTED AS A POSITIVE FACT RATHER THAN CARRIED AS AN ALLOWLIST
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `usePublishChecklistPlacement()` (`src/components/host/publish-checklist.tsx:141`) reads
// `matchMedia("(min-width: 64rem)")` and returns `"panel" | "collapsible"`.
//
// It is compliant FOR THE REASON RESP-04 EXISTS, not in spite of it. It does not render two trees and
// hide one: it returns a NAME, the call site passes that name down as a prop, and exactly one node is
// mounted — so the one-instance-in-document count holds at all three widths. That is what the
// assertions below check: the hook's return type is a union of string literals (a placement name, not
// a tree), and the classifier finds zero viewport-conditional JSX branches in the component itself or
// in its one consumer. An allowlist would have said "this file is exempt", which is a weaker and
// less durable claim — an exemption survives the file becoming non-compliant.
//
// A SECOND COMPONENT REACHING FOR `matchMedia` IS A FINDING, NOT A PRECEDENT. The AC#11 failure
// message says so and points at escalation rather than at widening the allowlist, because the
// technique is sanctioned only where a count OVER THE DOCUMENT is the pinned property and CSS cannot
// deliver it (17-UI-SPEC § RESP-04). The four sanctioned techniques are, in order of preference:
// reorder with CSS; move one instance rather than render two; one dialog in two presentations; one
// source of truth for links with the inactive copy hidden using `hidden`.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — FOUR WAYS, ALL REAL (29 August 2026). GREEN IS 21 PASSED.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`).
// Command for all four:
// `npx vitest run --config vitest.design.config.ts tests/design/one-tree.test.ts`
//
//   (a) THE FORK ARRIVES. `export const ProbeA = isMobile ? <p /> : <span />;` appended to
//       `src/components/patterns/empty-state.tsx`. 1 failed / 20 passed:
//
//         FAIL  … > AC#10 … > finds zero viewport-conditional JSX branches under src/app/** and
//               src/components/**
//         AssertionError: A viewport-conditional JSX branch renders TWO trees where RESP-04 requires
//         one:
//         src/components/patterns/empty-state.tsx:155 — ternary on `isMobile` renders JSX on at
//         least one side
//         … expected [ Array(1) ] to deeply equal []
//         + [ "src/components/patterns/empty-state.tsx:155", ]
//
//       FILE, LINE, FORM and the TEST EXPRESSION — "something forks somewhere" is not an actionable
//       failure, and the four sanctioned techniques travel in the message because the person who just
//       wrote the ternary is exactly the person who has not read 17-UI-SPEC § RESP-04.
//       Reverted with `git checkout --` → 21 passed.
//
//   (b) THE SECOND CALL SITE. `const probeQuery = window.matchMedia("(min-width: 40rem)");` appended
//       to the same file. 1 failed / 20 passed:
//
//         FAIL  … > AC#11 … > counts exactly one `matchMedia` CALL SITE, in the one file allowed to
//               hold it
//         AssertionError: src/ holds 2 `matchMedia` CALL SITE(S):
//         src/components/host/publish-checklist.tsx:149 — window.matchMedia
//         src/components/patterns/empty-state.tsx:155 — window.matchMedia
//         (For contrast: a grep for the STRING reports 3 occurrences across the same tree …)
//         … expected […(2)] to deeply equal [ Array(1) ]
//
//       NOTE THE PARENTHETICAL, MEASURED RATHER THAN CLAIMED: two call sites, three string
//       occurrences. The two counters disagree by exactly the `typeof` guard, in the failure output
//       of a real run. Reverted → 21 passed.
//
//   (c) THE HOOK ARRIVES. `import { useMediaQuery } from "usehooks-ts";` appended to the same file.
//       1 failed / 20 passed:
//
//         FAIL  … > AC#11 … > imports `useMediaQuery` nowhere, under any spelling
//         AssertionError: a media-query hook was imported:
//         src/components/patterns/empty-state.tsx:155 — useMediaQuery from "usehooks-ts"
//         … + [ "src/components/patterns/empty-state.tsx:155", ]
//
//       Counted at the IMPORT rather than at the branch, because the import is what makes the branch
//       cheap. Reverted → 21 passed.
//
//   (d) GUARD-THE-GUARD — THE PROBE WORTH READING. `SRC_DIR` re-pointed at `src-nope`, a directory
//       that does not exist. 5 failed / 16 passed:
//
//         FAIL  … > guard-the-guard … > opened at least 20 pages and 50 component files
//         AssertionError: the scanner found 0 page.tsx files under src/app/**. AC#10 is an EMPTY-LIST
//         assertion and an empty list is exactly what a scan of nothing produces, so this floor is
//         what makes the green below mean anything.: expected 0 to be greater than or equal to 20
//
//         FAIL  … > guard-the-guard … > reaches both scanned trees, and the three files this gate is
//               about by name — AssertionError: the walker never reached src/app/
//
//       AND THE MEASUREMENT THAT MATTERS: **AC#10's empty-list clause PASSED, and so did AC#11's
//       zero-`useMediaQuery` clause.** Over a tree the scanner never opened, both reported a
//       perfectly clean result — indistinguishable from a real clean run, and it would stay that way
//       forever. An absence assertion cannot notice it was handed nothing; only a positive control
//       over the scan can. That is the whole argument for the two floors, and it is the same
//       measurement `sheet-absent.test.ts` probe (d) and `selector-contract.test.ts` probe (d) both
//       recorded. The three assertions that DID fire alongside the floors are the two
//       sanctioned-exception ones and the AC#11 call-site count — all three name a specific file, and
//       naming a file is what makes them notice an empty scan. Reverted → 21 passed.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • AC#10's scan is scoped to `src/app/**` and `src/components/**` because that is the tree the
//     criterion is written about. A viewport-conditional branch authored inside `src/lib/**` would be
//     invisible to it. `SCANNED_TREES` is one constant, so widening the scan is a one-line edit.
//   • THE CLASSIFIER IS DELIBERATELY NARROW AND NAMES ITS VOCABULARY. It recognises a viewport
//     reading as: a `matchMedia` call, a binding derived from one, a read of `innerWidth`/
//     `clientWidth` and their family, or an identifier whose camel-case words include `mobile`,
//     `desktop`, `tablet`, `viewport` or `breakpoint`. A fork keyed on a word nobody has used yet
//     (`isCompact`, `isNarrow`) is invisible. That is the SAFE direction for a ban — it can miss a
//     violation, never invent one — and the fix when a new spelling appears is to add the word here,
//     not to loosen the shape.
//   • It sees CONDITIONAL EXPRESSIONS, LOGICAL EXPRESSIONS and `if` statements that return JSX. A fork
//     hidden behind a `switch`, a lookup table of components, or a `useState` seeded from a viewport
//     read three assignments away is not reachable from this shape.
//   • Choosing a CLASS from a viewport read (`const pad = isMobile ? "p-2" : "p-4"`) is not flagged,
//     and that is correct rather than an oversight: RESP-04 bans forking the TREE. One tree styled
//     two ways is the first sanctioned technique. The self-test pins that direction explicitly.
//   • A green here says nothing about what renders. The one-instance-in-document counts at
//     320/768/1280 are plan 17-09's, in a real browser, for the `[data-testid]` reason above.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync, type Dirent } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

import { ACCENT_USES } from "@/lib/design/accent-uses";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE SCANNED TREES, AS CONSTANTS. Widening AC#10's scan, or pointing the vacuity probe at a
// directory that does not exist, is a one-line edit here — `loading-coverage.test.ts:219`'s rule.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const SRC_DIR = resolve(process.cwd(), "src");

/** The two trees AC#10 is written about. Order is the criterion's order, not alphabetical. */
const SCANNED_TREES = ["src/app", "src/components"] as const;

/** The one file allowed to hold a `matchMedia` call site, and the hook inside it. */
const SANCTIONED_MATCHMEDIA_FILE = "src/components/host/publish-checklist.tsx";
const SANCTIONED_HOOK = "usePublishChecklistPlacement";

/** Its one consumer — asserted beside it, because the exception's claim is about the CALL SITE too. */
const SANCTIONED_CONSUMER = "src/app/(host)/host/listings/[id]/edit/wizard.tsx";

/** The gate that owns AC#14. Asserted to still exist and to still name both files (see the header). */
const AC14_OWNER = "tests/design/sheet-absent.test.ts";

const PHASE_20_ONE_TREE_FILES = [
  "src/components/ops/staff-management-panel.tsx",
  "src/components/ops/staff-action-dialog.tsx",
] as const;

const PHASE_20_ACTION_FILES = [
  "src/app/(ops-auth)/%5Fops-auth/login/page.tsx",
  "src/app/(ops-auth)/%5Fops-auth/forgot-password/page.tsx",
  "src/app/(ops-auth)/%5Fops-auth/reset-password/page.tsx",
  "src/app/(ops-auth)/%5Fops-auth/invite/[token]/page.tsx",
  "src/app/(ops-auth)/%5Fops-auth/_components/staff-invite-setup-form.tsx",
  "src/app/(ops)/ops/error.tsx",
  "src/components/ops/ops-sign-out-control.tsx",
  ...PHASE_20_ONE_TREE_FILES,
] as const;

/**
 * Floors, not equalities. Both are well under the real counts (29 pages, ~130 component files on
 * 2026-08-29) and well over any plausible partial scan. Every AC#10 assertion below is "a list was
 * empty", and a walk that opened nothing satisfies that perfectly — `sheet-absent.test.ts` probe (d)
 * measured exactly that failure and it is indistinguishable from a clean run.
 */
const MIN_PAGES = 20;
const MIN_COMPONENT_FILES = 50;

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE CLASSIFIER'S VOCABULARY. Narrow on purpose — see the NOT COVERED note in the header.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Camel-case WORDS that make an identifier a viewport reading. Matched against the split words of a
 * name, never as a substring: a substring test on `mobile` would flag `automobile`, and more to the
 * point a substring test is how a classifier acquires false positives it can never be trusted past.
 */
const VIEWPORT_WORDS: ReadonlySet<string> = new Set([
  "mobile",
  "desktop",
  "tablet",
  "viewport",
  "breakpoint",
]);

/** Property reads that measure a box or a screen. A comparison against one of these is a fork. */
const VIEWPORT_PROPERTIES: ReadonlySet<string> = new Set([
  "innerWidth",
  "outerWidth",
  "innerHeight",
  "outerHeight",
  "clientWidth",
  "clientHeight",
  "availWidth",
  "availHeight",
]);

/** Split a camel-case / snake / kebab identifier into lower-case words. `isMobile` → is, mobile. */
function words(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

function isViewportName(name: string): boolean {
  return words(name).some((w) => VIEWPORT_WORDS.has(w));
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// SCANNING
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Every `.ts` / `.tsx` file under a directory, recursively. `[]` for a missing tree rather than a
 * throw — `loading-coverage.test.ts:311`'s rule: a broken scan must surface as ONE named
 * guard-the-guard failure, never as a stack trace that buries which gate went quiet. The realistic
 * version of this failure is a scan narrowed by a wrong path, which never throws at all.
 */
function collectSources(dir: string, out: string[] = []): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSources(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Windows: `relative()` emits backslashes and every path written in this file is forward-slash. */
const rel = (p: string): string => relative(process.cwd(), p).split("\\").join("/");

function parse(fileName: string, text: string): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

const lineOf = (sf: ts.SourceFile, node: ts.Node): number =>
  sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// AC#11 — `matchMedia` CALL SITES, counted as CALL EXPRESSIONS.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

export type CallSite = { readonly file: string; readonly line: number; readonly text: string };

/**
 * True for `matchMedia(q)`, `window.matchMedia(q)` and `window["matchMedia"](q)`.
 *
 * `typeof window.matchMedia` is a PropertyAccessExpression inside a TypeOfExpression and reaches this
 * predicate as no CallExpression at all — which is the entire point of the clause. See the header.
 */
function isMatchMediaCall(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (ts.isIdentifier(callee)) return callee.text === "matchMedia";
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text === "matchMedia";
  if (ts.isElementAccessExpression(callee)) {
    const arg = callee.argumentExpression;
    return ts.isStringLiteralLike(arg) && arg.text === "matchMedia";
  }
  return false;
}

function matchMediaCallSites(file: string, sf: ts.SourceFile): CallSite[] {
  const found: CallSite[] = [];
  const visit = (node: ts.Node): void => {
    if (isMatchMediaCall(node)) {
      found.push({ file, line: lineOf(sf, node), text: node.expression.getText(sf) });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/**
 * THE WRONG COUNTER, kept as a named function so the trap is runnable rather than argued.
 *
 * Nothing in this file ASSERTS against this over the real tree. It exists so the self-test can put
 * the two counters side by side on one fixture and show the string form returning 2 where the call
 * form returns 1, and so the AC#11 failure message can report what a grep would have said.
 */
function matchMediaStringOccurrences(text: string): number {
  return text.split("matchMedia").length - 1;
}

/** `useMediaQuery` reached through any import spelling: named, renamed, default or namespace. */
function useMediaQueryImports(file: string, sf: ts.SourceFile): CallSite[] {
  const found: CallSite[] = [];
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !stmt.importClause) continue;
    const clause = stmt.importClause;
    const from = ts.isStringLiteralLike(stmt.moduleSpecifier) ? stmt.moduleSpecifier.text : "?";
    const hit = (name: string) =>
      found.push({ file, line: lineOf(sf, stmt), text: `${name} from "${from}"` });

    if (clause.name && isMediaQueryName(clause.name.text)) hit(clause.name.text);
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings) && isMediaQueryName(bindings.name.text)) {
      hit(bindings.name.text);
    }
    if (bindings && ts.isNamedImports(bindings)) {
      for (const spec of bindings.elements) {
        // `propertyName` is the EXPORTED name in `import { useMediaQuery as x }`, which is the one
        // that says what was reached for; the local alias is checked too so a rename cannot hide it.
        const exported = spec.propertyName?.text ?? spec.name.text;
        if (isMediaQueryName(exported) || isMediaQueryName(spec.name.text)) hit(exported);
      }
    }
  }
  return found;
}

const isMediaQueryName = (name: string): boolean => {
  const w = words(name);
  return w.includes("media") && w.includes("query");
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// AC#10 — THE VIEWPORT-CONDITIONAL JSX CLASSIFIER.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

export type Offender = {
  readonly file: string;
  readonly line: number;
  readonly form: "ternary" | "logical" | "if";
  readonly test: string;
};

/** Strip parentheses and `as`/`satisfies` wrappers so a wrapped JSX node is still a JSX node. */
function unwrap(node: ts.Node): ts.Node {
  let n = node;
  while (
    ts.isParenthesizedExpression(n) ||
    ts.isAsExpression(n) ||
    ts.isSatisfiesExpression(n) ||
    ts.isNonNullExpression(n)
  ) {
    n = n.expression;
  }
  return n;
}

/** Does this expression evaluate to JSX on at least one path? */
function producesJsx(node: ts.Node): boolean {
  const n = unwrap(node);
  if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) return true;
  if (ts.isConditionalExpression(n)) return producesJsx(n.whenTrue) || producesJsx(n.whenFalse);
  if (ts.isBinaryExpression(n) && isLogicalOperator(n.operatorToken.kind)) {
    return producesJsx(n.left) || producesJsx(n.right);
  }
  if (ts.isArrayLiteralExpression(n)) return n.elements.some(producesJsx);
  return false;
}

function isLogicalOperator(kind: ts.SyntaxKind): boolean {
  return (
    kind === ts.SyntaxKind.AmpersandAmpersandToken ||
    kind === ts.SyntaxKind.BarBarToken ||
    kind === ts.SyntaxKind.QuestionQuestionToken
  );
}

/** Does any `return <JSX/>` live in this branch? Used for the `if` form. */
function branchReturnsJsx(node: ts.Node): boolean {
  if (ts.isReturnStatement(node)) return node.expression !== undefined && producesJsx(node.expression);
  let found = false;
  ts.forEachChild(node, (child) => {
    if (!found) found = branchReturnsJsx(child);
  });
  return found;
}

/**
 * Every binding in this module whose VALUE derives from a viewport reading, to a fixed point.
 *
 * Two passes are the realistic depth — `const mq = matchMedia(q)` then `const wide = mq.matches` —
 * and the loop runs until nothing new is added rather than a fixed number of times, so a third hop
 * is not a silent hole.
 */
function viewportBindings(sf: ts.SourceFile): Set<string> {
  const derived = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && node.initializer && readsViewport(node.initializer, derived)) {
        for (const name of boundNames(node.name)) {
          if (!derived.has(name)) {
            derived.add(name);
            changed = true;
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return derived;
}

/** Every identifier a binding name introduces, including destructured ones. */
function boundNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  const out: string[] = [];
  for (const element of name.elements) {
    if (ts.isBindingElement(element)) out.push(...boundNames(element.name));
  }
  return out;
}

/** Does this expression subtree read the viewport? The classifier's one predicate. */
function readsViewport(node: ts.Node, derived: ReadonlySet<string>): boolean {
  let found = false;
  const visit = (n: ts.Node): void => {
    if (found) return;
    if (isMatchMediaCall(n)) {
      found = true;
      return;
    }
    if (ts.isPropertyAccessExpression(n) && VIEWPORT_PROPERTIES.has(n.name.text)) {
      found = true;
      return;
    }
    if (ts.isIdentifier(n) && (isViewportName(n.text) || derived.has(n.text))) {
      found = true;
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

/**
 * THE CLASSIFIER. Every viewport-conditional JSX branch in one module.
 *
 * Exported shape is (file, text) rather than (file) for the same reason `leak.test.ts:208-212` gives:
 * the synthetic self-tests below feed this the fixtures, so the code path the fixtures prove is the
 * one the real assertion runs.
 */
function classify(file: string, text: string): Offender[] {
  const sf = parse(file, text);
  const derived = viewportBindings(sf);
  const offenders: Offender[] = [];

  const record = (node: ts.Node, form: Offender["form"], test: ts.Node): void => {
    offenders.push({
      file,
      line: lineOf(sf, node),
      form,
      test: test.getText(sf).replace(/\s+/g, " ").slice(0, 80),
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isConditionalExpression(node) && readsViewport(node.condition, derived)) {
      if (producesJsx(node.whenTrue) || producesJsx(node.whenFalse)) {
        record(node, "ternary", node.condition);
      }
    }
    if (
      ts.isBinaryExpression(node) &&
      isLogicalOperator(node.operatorToken.kind) &&
      readsViewport(node.left, derived) &&
      producesJsx(node.right)
    ) {
      record(node, "logical", node.left);
    }
    if (ts.isIfStatement(node) && readsViewport(node.expression, derived)) {
      const thenJsx = branchReturnsJsx(node.thenStatement);
      const elseJsx = node.elseStatement !== undefined && branchReturnsJsx(node.elseStatement);
      if (thenJsx || elseJsx) record(node, "if", node.expression);
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return offenders;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE FAILURE MESSAGES, built by functions the self-tests drive. A gate whose message is a bare
// number tells the next reader the count and not the finding.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

function offenderReport(offenders: readonly Offender[]): string {
  if (offenders.length === 0) return "(none)";
  return offenders
    .map((o) => `${o.file}:${o.line} — ${o.form} on \`${o.test}\` renders JSX on at least one side`)
    .join("\n");
}

function callSiteReport(sites: readonly CallSite[]): string {
  if (sites.length === 0) return "(none)";
  return sites.map((s) => `${s.file}:${s.line} — ${s.text}`).join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE TREES, SCANNED ONCE at module level; the `it()` blocks below only assert against this result.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

type Scanned = {
  readonly file: string;
  readonly statements: number;
  readonly offenders: readonly Offender[];
  readonly matchMedia: readonly CallSite[];
  readonly mediaQueryImports: readonly CallSite[];
  readonly text: string;
};

function scan(dir: string): Scanned[] {
  return collectSources(dir)
    .sort()
    .map((abs) => {
      const file = rel(abs);
      const text = readFileSync(abs, "utf8");
      const sf = parse(file, text);
      const inScannedTree = SCANNED_TREES.some((prefix) => file.startsWith(`${prefix}/`));
      return {
        file,
        statements: sf.statements.length,
        // AC#10 is written about the two trees; AC#11 is written about all of `src/`.
        offenders: inScannedTree ? classify(file, text) : [],
        matchMedia: matchMediaCallSites(file, sf),
        mediaQueryImports: useMediaQueryImports(file, sf),
        text,
      };
    });
}

const SCAN = scan(SRC_DIR);

const pages = SCAN.filter((f) => f.file.startsWith("src/app/") && f.file.endsWith("/page.tsx"));
const componentFiles = SCAN.filter((f) => f.file.startsWith("src/components/"));
const offenders = SCAN.flatMap((f) => f.offenders);
const callSites = SCAN.flatMap((f) => f.matchMedia);
const mediaQueryImports = SCAN.flatMap((f) => f.mediaQueryImports);

function phase20ActionSizeViolations(file: string): string[] {
  const source = readFileSync(resolve(process.cwd(), file), "utf8");
  const sf = parse(file, source);
  const violations: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ts.isIdentifier(node.tagName) &&
      node.tagName.text === "Button"
    ) {
      const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
      const size = attrs.find((attr) => attr.name.getText(sf) === "size")?.initializer?.getText(sf);
      const className = attrs
        .find((attr) => attr.name.getText(sf) === "className")
        ?.initializer?.getText(sf);
      if (size !== '"touch"' && !/\b(?:min-)?h-11\b/.test(className ?? "")) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        violations.push(`${file}:${line} — <Button> has neither size="touch" nor an h-11 floor`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return violations;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// GUARD THE GUARD, ASSERTED FIRST AND ON PURPOSE. Every clause below this block is "a list was
// empty", and a walk that opened nothing satisfies all of them perfectly and would do so forever.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("guard-the-guard — the scanner read the trees it is asserting about", () => {
  it(`opened at least ${MIN_PAGES} pages and ${MIN_COMPONENT_FILES} component files`, () => {
    expect(
      pages.length,
      `the scanner found ${pages.length} page.tsx files under src/app/**. AC#10 is an EMPTY-LIST ` +
        `assertion and an empty list is exactly what a scan of nothing produces, so this floor is ` +
        `what makes the green below mean anything.`,
    ).toBeGreaterThanOrEqual(MIN_PAGES);

    expect(
      componentFiles.length,
      `the scanner found ${componentFiles.length} files under src/components/**. Same argument as ` +
        `the page floor above: an absence assertion cannot notice it was handed an empty list.`,
    ).toBeGreaterThanOrEqual(MIN_COMPONENT_FILES);
  });

  it("reaches both scanned trees, and the three files this gate is about by name", () => {
    // Named individually rather than only counted: a count survives the whole tree being replaced,
    // and these three are the files every clause below is actually written about.
    const scannedFiles = SCAN.map((f) => f.file);
    for (const prefix of SCANNED_TREES) {
      expect(
        scannedFiles.some((f) => f.startsWith(`${prefix}/`)),
        `the walker never reached ${prefix}/`,
      ).toBe(true);
    }
    expect(scannedFiles, "the walker never reached the sanctioned exception").toContain(
      SANCTIONED_MATCHMEDIA_FILE,
    );
    expect(scannedFiles, "the walker never reached the exception's one consumer").toContain(
      SANCTIONED_CONSUMER,
    );
  });

  it("really parsed every file it counted", () => {
    // The half that is easy to forget: a walk can match 200 files while the parse silently yields an
    // empty statement list (a changed ScriptKind, a parser flag), and a classifier handed an empty
    // AST reports a perfectly clean tree.
    for (const file of SCAN) {
      expect(file.statements, `${file.file} parsed to zero statements`).toBeGreaterThan(0);
    }
  });

  it("is DISCRIMINATING — the same classifier flags a synthetic offender", () => {
    // THE POSITIVE CONTROL. A classifier that matches nothing makes the empty list below vacuous in a
    // way no count can detect, because the count and the list are both correct. This runs the real
    // `classify`, not a copy of it.
    const flagged = classify(
      "fake-control.tsx",
      "export const A = isMobile ? <Sheet /> : <Dialog />;",
    );
    expect(
      flagged.map((o) => o.form),
      "the classifier found nothing in a source that is nothing but a viewport-conditional branch, " +
        "which means the empty list in AC#10 below is passing over a predicate that never matches",
    ).toEqual(["ternary"]);
  });

  it("pointed at a directory that does not exist, finds nothing — which is why the floors exist", () => {
    // The vacuity probe as a permanent assertion rather than a one-off, `sheet-absent.test.ts`'s
    // idiom. `collectSources` returns `[]` for a missing tree instead of throwing, deliberately: the
    // realistic version of this failure is a scan narrowed by a wrong path, which never throws.
    const empty = scan(resolve(process.cwd(), "src-nope"));
    expect(empty).toEqual([]);
    expect(
      empty.flatMap((f) => f.offenders),
      "…and it reports a perfectly clean result over nothing",
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// AC#10 — zero viewport-conditional JSX branches.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("AC#10 — no file forks the component tree on the viewport", () => {
  it("finds zero viewport-conditional JSX branches under src/app/** and src/components/**", () => {
    expect(
      offenders.map((o) => `${o.file}:${o.line}`),
      `A viewport-conditional JSX branch renders TWO trees where RESP-04 requires one:\n` +
        `${offenderReport(offenders)}\n\n` +
        `It needs JS to know the viewport (so it is wrong during SSR and on the first client ` +
        `render), it doubles the visual-regression surface, and it duplicates the content for ` +
        `screen readers — \`[data-testid]\` and the accessibility tree both resolve against the ` +
        `hidden copy. The four sanctioned techniques, in order: reorder with CSS; MOVE one instance ` +
        `rather than render two; one dialog in two presentations (patterns/responsive-dialog.tsx); ` +
        `one source of truth for links with the inactive copy hidden using \`hidden\` — never ` +
        `\`sr-only\`, never \`opacity-0\`, so it leaves the accessibility tree.`,
    ).toEqual([]);
  });

  it("finds none in the sanctioned exception itself, which is the POSITIVE fact", () => {
    // `usePublishChecklistPlacement` is compliant BECAUSE it chooses one node rather than rendering
    // two — not because it is exempt. An allowlist would survive the file becoming non-compliant;
    // this assertion does not.
    for (const file of [SANCTIONED_MATCHMEDIA_FILE, SANCTIONED_CONSUMER]) {
      const row = SCAN.find((f) => f.file === file);
      expect(row, `${file} was not scanned`).toBeDefined();
      expect(
        offenderReport(row?.offenders ?? []),
        `${file} now forks the tree on the viewport. The whole argument for the one sanctioned ` +
          `matchMedia call site is that it CHOOSES one node instead of rendering two, so the ` +
          `one-instance-in-document count holds at 320, 768 and 1280. If that stops being true the ` +
          `exception has to be re-argued, not re-allowlisted (17-UI-SPEC § RESP-04).`,
      ).toBe("(none)");
    }
  });

  it("the exception returns a PLACEMENT NAME, not a tree — the mechanism behind the fact above", () => {
    const row = SCAN.find((f) => f.file === SANCTIONED_MATCHMEDIA_FILE);
    const sf = parse(SANCTIONED_MATCHMEDIA_FILE, row?.text ?? "");
    const hook = sf.statements.find(
      (s): s is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(s) && s.name?.text === SANCTIONED_HOOK,
    );
    expect(hook, `${SANCTIONED_HOOK} is no longer a function declaration in ${SANCTIONED_MATCHMEDIA_FILE}`).toBeDefined();

    const returnType = hook?.type;
    const literals =
      returnType && ts.isUnionTypeNode(returnType)
        ? returnType.types
            .filter(ts.isLiteralTypeNode)
            .map((t) => t.literal.getText(sf))
        : [];
    expect(
      literals.length,
      `${SANCTIONED_HOOK}'s return type is \`${returnType?.getText(sf) ?? "(none)"}\`. The whole ` +
        `reason this hook is sanctioned is that it returns a placement NAME which the call site ` +
        `passes down as a prop — one node is mounted, so the one-instance count holds at every ` +
        `width. A hook that returned a component, an element or \`boolean\` would be the forked ` +
        `variant RESP-04 bans, wearing the exception's name. Literals found: ` +
        `${literals.join(" | ") || "(none)"}.`,
    ).toBeGreaterThanOrEqual(2);
  });
});

describe("Phase 20 — Staff management reflows one canonical tree", () => {
  it("enrolls the panel and shared Revoke/Cancel dialog as exact scanned files", () => {
    for (const file of PHASE_20_ONE_TREE_FILES) {
      const row = SCAN.find((candidate) => candidate.file === file);
      expect(row, `${file} was not reached by the one-tree scan`).toBeDefined();
      expect(
        row?.offenders ?? [],
        `${file} forks its JSX on a viewport reading instead of reflowing one tree with CSS.`,
      ).toEqual([]);
    }
  });

  it("keeps the roster and action groups in one wrapping source tree from 320px through 1280px", () => {
    const panel = readFileSync(
      resolve(process.cwd(), "src/components/ops/staff-management-panel.tsx"),
      "utf8",
    );
    expect(panel).toContain("flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end");
    expect(panel).toContain(
      "flex min-w-0 flex-col gap-4 py-4 first:pt-0 last:pb-0 md:flex-row md:items-start md:justify-between",
    );
    expect(panel).toContain("sm:flex-row sm:flex-wrap md:justify-end");
    expect(panel).toMatch(/break-(?:all|words)/);

    const dialog = readFileSync(
      resolve(process.cwd(), "src/components/ops/staff-action-dialog.tsx"),
      "utf8",
    );
    expect(dialog.match(/<ResponsiveDialog\b/g)).toHaveLength(1);
    expect(dialog).toContain('className="w-full sm:w-auto"');
    expect(dialog).not.toMatch(/\bmatchMedia\s*\(/);
  });

  it("keeps every Phase 20 action at the 44px floor and adds no eleventh accent use", () => {
    expect(PHASE_20_ACTION_FILES.flatMap(phase20ActionSizeViolations)).toEqual([]);

    const phase20Sources = PHASE_20_ACTION_FILES.map((file) =>
      readFileSync(resolve(process.cwd(), file), "utf8"),
    ).join("\n");
    expect(phase20Sources).not.toMatch(
      /variant=["']brand["']|(?:bg|text|border|ring)-brand(?:\/\d+)?/,
    );
    expect(ACCENT_USES).toHaveLength(10);
    const phase20ActionFiles = new Set<string>(PHASE_20_ACTION_FILES);
    expect(ACCENT_USES.filter((use) => phase20ActionFiles.has(use.site))).toEqual([]);

    const shell = readFileSync(
      resolve(process.cwd(), "src/app/(ops-auth)/%5Fops-auth/layout.tsx"),
      "utf8",
    );
    expect(shell).toContain("min-h-11");
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// AC#11 — exactly one `matchMedia` CALL SITE, zero `useMediaQuery` imports.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("AC#11 — one viewport reading in the whole of src/, and it is the sanctioned one", () => {
  it("counts exactly one `matchMedia` CALL SITE, in the one file allowed to hold it", () => {
    const stringCount = SCAN.reduce((n, f) => n + matchMediaStringOccurrences(f.text), 0);
    expect(
      callSites.map((s) => s.file),
      `src/ holds ${callSites.length} \`matchMedia\` CALL SITE(S):\n${callSiteReport(callSites)}\n\n` +
        `(For contrast: a grep for the STRING reports ${stringCount} occurrences across the same ` +
        `tree, because ${SANCTIONED_MATCHMEDIA_FILE} guards with \`typeof window.matchMedia !== ` +
        `"function"\` before it calls. That guard is load-bearing — jsdom implements no media-query ` +
        `engine — so a string count is red against correct code. See this file's header.)\n\n` +
        `Exactly one call site is allowed, in ${SANCTIONED_MATCHMEDIA_FILE}, and it is sanctioned ` +
        `because ${SANCTIONED_HOOK} CHOOSES one node rather than rendering two. A SECOND component ` +
        `reaching for matchMedia is a FINDING, not a precedent: the technique is sanctioned only ` +
        `where a count over the DOCUMENT is the pinned property and CSS cannot deliver it. Record ` +
        `it and escalate (17-UI-SPEC § RESP-04) — do not widen this gate to accommodate it.`,
    ).toEqual([SANCTIONED_MATCHMEDIA_FILE]);
  });

  it("imports `useMediaQuery` nowhere, under any spelling", () => {
    expect(
      mediaQueryImports.map((s) => `${s.file}:${s.line}`),
      `a media-query hook was imported:\n${callSiteReport(mediaQueryImports)}\n\n` +
        `A shared \`useMediaQuery\` is the mechanism by which viewport-conditional rendering becomes ` +
        `cheap enough to spread — which is why AC#11 counts its imports rather than waiting for the ` +
        `branches AC#10 bans to show up. Reorder with CSS instead; see the four sanctioned ` +
        `techniques in this file's header.`,
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// AC#14 — DELEGATED. The claim is not restated here; the delegation is.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("AC#14 — owned by tests/design/sheet-absent.test.ts, and the hand-off is asserted", () => {
  it("the owning gate still exists and still names both files", () => {
    // NOT a second copy of AC#14 — nothing here looks at whether sheet.tsx exists. This asserts the
    // DELEGATION: a hand-off to a file that has been deleted or gutted is a hole with no symptom,
    // which is the same argument `sheet-absent.test.ts` itself makes for testing an absence.
    const owner = resolve(process.cwd(), AC14_OWNER);
    expect(existsSync(owner), `${AC14_OWNER} is gone, and this file's header hands AC#14 to it`).toBe(
      true,
    );
    const source = readFileSync(owner, "utf8");
    for (const claim of [
      "src/components/ui/sheet.tsx",
      "src/components/patterns/responsive-dialog.tsx",
    ]) {
      expect(
        source.includes(claim),
        `${AC14_OWNER} no longer mentions ${claim}. AC#14 is delegated to it precisely so there is ` +
          `ONE copy of that check; if the claim moved, move this delegation with it.`,
      ).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// BOTH-DIRECTIONS SELF-TESTS, on fixtures never written to disk — so the code path the real
// assertions run is the same one the fixtures prove.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("self-test — the classifier flags a forked tree and not a styled one", () => {
  const flagged = (src: string): string[] => classify("fake.tsx", src).map((o) => o.form);

  it("FLAGS the ternary, the logical form, an `if` that returns JSX, and a matchMedia binding", () => {
    expect(flagged("export const A = isMobile ? <Sheet /> : <Dialog />;")).toEqual(["ternary"]);
    expect(flagged("export const B = isDesktop && <Rail />;")).toEqual(["logical"]);
    expect(flagged("export const C = window.innerWidth < 768 ? <Bar /> : <Rail />;")).toEqual([
      "ternary",
    ]);
    expect(
      flagged(
        [
          "export function D() {",
          "  if (isTablet) return <Split />;",
          "  return <Stacked />;",
          "}",
        ].join("\n"),
      ),
    ).toEqual(["if"]);
    // Two hops from the reading to the branch — the fixed point in `viewportBindings` is what makes
    // this one reachable, and it is the shape the sanctioned exception would have had if it had
    // rendered instead of returning a name.
    expect(
      flagged(
        [
          'const query = window.matchMedia("(min-width: 64rem)");',
          "const wide = query.matches;",
          "export const E = wide ? <Panel /> : <Collapsible />;",
        ].join("\n"),
      ),
    ).toEqual(["ternary"]);
  });

  it("does NOT flag the sanctioned technique — a `lg:hidden` class-based reorder", () => {
    // THE FIXTURE THIS SECTION EXISTS FOR. Reordering with CSS is sanctioned technique #1, it is what
    // `src/app/listings/[id]/(detail)/page.tsx` actually ships for the booking rail and the sticky
    // bar, and a classifier that flagged it would be red against the correct answer — which is this
    // phase's named failure mode arriving from the opposite direction.
    expect(
      flagged(
        [
          "export const F = (",
          "  <>",
          '    <aside className="max-lg:hidden"><Rail /></aside>',
          '    <div className="lg:hidden"><StickyBar /></div>',
          "  </>",
          ");",
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("does NOT flag a status-conditional render, which is every other conditional in the app", () => {
    expect(flagged("export const G = isPending ? <Spinner /> : <Grid />;")).toEqual([]);
    expect(flagged("export const H = hasResults && <ResultsGrid />;")).toEqual([]);
    // The sanctioned exception's own shape: the choice arrives as a PROP and the component picks one
    // node. If this were flagged the gate would demand the one compliant fork be removed.
    expect(
      flagged(
        [
          "export function I({ placement }: { placement: 'panel' | 'collapsible' }) {",
          '  return placement === "panel" ? <Panel /> : <Collapsible />;',
          "}",
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("does NOT flag a viewport read that chooses a CLASS instead of a tree", () => {
    // One tree styled two ways is the first sanctioned technique, so this direction has to be pinned:
    // a classifier that flagged it would ban the remedy along with the defect.
    expect(flagged('const pad = isMobile ? "p-2" : "p-4"; export const J = <div className={pad} />;'))
      .toEqual([]);
  });

  it("does not mistake a commented-out fork, or the word `automobile`, for a real one", () => {
    expect(flagged("// export const K = isMobile ? <A /> : <B />;\nexport const L = <A />;")).toEqual(
      [],
    );
    // WORDS, never substrings. A substring test on `mobile` flags this, and a classifier with a
    // false positive is one nobody keeps.
    expect(flagged("export const M = automobile ? <A /> : <B />;")).toEqual([]);
  });

  it("builds a failure message that names the file, the line and the form", () => {
    // The message is what the next reader gets, so it is asserted rather than assumed. A bare count
    // tells them how many and not which.
    const report = offenderReport(classify("fake.tsx", "export const A = isMobile ? <A /> : <B />;"));
    expect(report).toContain("fake.tsx:1");
    expect(report).toContain("ternary");
    expect(report).toContain("isMobile");
    expect(offenderReport([])).toBe("(none)");
  });
});

describe("self-test — Pitfall 7, demonstrated rather than argued", () => {
  // The guard and the call, in the shipped order, as a fixture. This is the whole trap in five lines.
  const GUARDED_CALL = [
    "useEffect(() => {",
    '  if (typeof window.matchMedia !== "function") return;',
    "  const query = window.matchMedia(PANEL_MEDIA_QUERY);",
    "  return () => query.removeEventListener('change', sync);",
    "}, []);",
  ].join("\n");

  it("the STRING counter says 2 and the CALL-SITE counter says 1, on one compliant fixture", () => {
    // THE ASSERTION THIS SECTION EXISTS TO CARRY. AC#11 says "exactly one call site". A `toBe(1)`
    // over string occurrences is RED against this fixture, and the only edits that make it green are
    // deleting the guard (which makes the wizard's unit tests throw) or deleting the call (which
    // removes the feature). A gate that can only be satisfied by introducing a defect is not a gate.
    expect(matchMediaStringOccurrences(GUARDED_CALL)).toBe(2);
    expect(matchMediaCallSites("fake.tsx", parse("fake.tsx", GUARDED_CALL))).toHaveLength(1);
  });

  it("counts every call spelling, and no non-call spelling", () => {
    const spellings = [
      'matchMedia("(min-width: 64rem)");',
      'window.matchMedia("(min-width: 64rem)");',
      'window["matchMedia"]("(min-width: 64rem)");',
    ].join("\n");
    expect(matchMediaCallSites("fake.tsx", parse("fake.tsx", spellings))).toHaveLength(3);

    const nonCalls = [
      'const ok = typeof window.matchMedia === "function";',
      "const ref = window.matchMedia;",
      'const s = "matchMedia";',
      "// window.matchMedia(q) in a comment",
    ].join("\n");
    expect(
      matchMediaCallSites("fake.tsx", parse("fake.tsx", nonCalls)),
      "a `typeof` guard, a reference, a string and a comment are not call sites — that distinction " +
        "is the entire clause",
    ).toEqual([]);
    // …and the wrong counter cheerfully reports all four, which is the measurement, not the opinion.
    expect(matchMediaStringOccurrences(nonCalls)).toBe(4);
  });

  it("catches every import spelling of a media-query hook, and no prose", () => {
    const imports = [
      'import { useMediaQuery } from "usehooks-ts";',
      'import { useMediaQuery as useMq } from "@/hooks/use-media-query";',
      'import useMediaQuery from "@mui/material/useMediaQuery";',
    ].join("\n");
    const sf = parse("fake.tsx", imports);
    expect(useMediaQueryImports("fake.tsx", sf)).toHaveLength(3);

    const prose = [
      "// useMediaQuery is banned by AC#11",
      'import { Button } from "@/components/ui/button";',
    ].join("\n");
    expect(useMediaQueryImports("fake.tsx", parse("fake.tsx", prose))).toEqual([]);
  });

  it("builds a call-site message that names each site rather than only the total", () => {
    const sites = matchMediaCallSites("fake.tsx", parse("fake.tsx", GUARDED_CALL));
    const report = callSiteReport(sites);
    expect(report).toContain("fake.tsx:3");
    expect(report).toContain("window.matchMedia");
    expect(callSiteReport([])).toBe("(none)");
  });
});
