// 17-D1 / 17-D2, item 2 — the STRUCTURE behind `/listings/[id]`'s soft-404 finding, gated per commit.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE MEASUREMENT THIS FILE STANDS ON, AND WHAT WOULD MAKE IT OBSOLETE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Phase 17.1 plan 01, § P1 (`17.1-EVIDENCE.md`), drove a real production server —
// `npm run build && node ./node_modules/next/dist/bin/next start -p 3100`, Next.js 16.2.7, built from
// `d69f1e4` — and read the status LINE with `curl -o /dev/null`, twice, identically both times:
//
//     /listings/{draft-id}       ->  404
//     /listings/{nonexistent}    ->  404
//     /listings/{published-id}  ->  200   (the control)
//
// 17.1-01-SUMMARY.md's conclusion: "the shipped layout assert holds in a production build." No repair
// was licensed and no file changed as a result — item 2 closed on a NEGATIVE finding. This file exists
// because that finding's only standing automated witness was `e2e/public-listing.spec.ts:385`
// (`"a draft listing 404s to the public"`), and CI runs exactly one e2e spec — `e2e/price-parity.spec.ts`,
// D-24 — so every OTHER e2e file, this one included, is sampled at "whenever a human remembers to run
// it" (`17.1-VALIDATION.md`'s own honest-gap table). Items 1b, 3 and 4 each got a per-commit gate
// (`clearance-merge-order.test.ts`, `tests/security/paymongo-seam.test.ts`,
// `empty-state-adoption.test.ts`); item 2 had none. This is that gate.
//
// OBSOLETE WHEN: the route stops being reachable through this file tree at all (e.g. the (detail)
// group is deleted or merged), or a `sitemap.ts`/`robots.ts` ships and makes the soft-404 class a
// non-issue by construction — at which point delete this file rather than widen it.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS GATE IS FOR, AND WHAT IT DELIBERATELY CANNOT DO
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// It reads STRUCTURE. `e2e/public-listing.spec.ts:385` reads a RENDERING (`res?.status()`, against a
// real browser and a real server) — the pairing is the whole design, exactly as
// `tests/design/error-boundaries.test.ts` pairs with `e2e/error-leak.spec.ts` and
// `tests/design/invite-notfound-parity.test.ts` pairs with a human-read `curl` transcript. Neither
// substitutes for the other:
//
//   • The e2e spec is the ONLY instrument in this repo that can see an HTTP status line. It needs a
//     browser and a server, so nothing here runs it and nothing here can reproduce its number.
//   • This file proves the STRUCTURE that produces the number `e2e/public-listing.spec.ts:385` reads:
//     that the non-public branch of `page.tsx` really calls `notFound()` (not a comment saying so),
//     and that the exact set of Suspense boundaries (`loading.tsx` files) under this route tree is
//     the one the finding was measured against. It runs in `npm run test:design` — build-blocking, on
//     every commit — closing the sampling gap named above.
//
// ⚠ THIS FILE TAKES NO POSITION ON *WHEN* THE STATUS LINE IS COMMITTED, AND THAT IS DELIBERATE, NOT AN
// OMISSION. Three comment blocks elsewhere claim the mechanism is "the layout's blocking await wins
// the 404 before the Suspense shell flushes a 200" — `(detail)/layout.tsx:29-31`,
// `(detail)/page.tsx:259-260`, `e2e/public-listing.spec.ts:261-270`. § P1's production reading (404 on
// the draft, not 200) is the fact that matters, and it does not depend on which of those two renderers
// wins the race — a filed, separate finding, and NOT this file's business to adjudicate. Asserting the
// shell-flush story here — in either direction — would encode a rendering claim in a file that cannot
// observe rendering at all. So this file pins two things a status line cannot express, and stops:
// `notFound()` is reachable on the branch the finding is about, and the Suspense boundaries this route
// tree exposes are exactly the ones that were true when § P1 was measured.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE `notFound()` CHECK IS AN AST WALK, GUARD-RESOLVED — AND NOT AN IMPORTED HELPER
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/design/invite-notfound-parity.test.ts` exports a same-shaped `collectNotFoundCalls` (a real
// CallExpression named `notFound`, not a mention in a comment) built for the OPPOSITE property — proving
// a segment calls it NOWHERE. Importing it here was tried and measured, not assumed: a throwaway file
// that did `import { collectNotFoundCalls } from "./invite-notfound-parity.test"` and asserted one
// thing went from 1 test to **9 passed** — importing a sibling `.test.ts` file re-executes that
// module's top-level `describe`/`it` registration as a side effect of loading it, so its whole 8-test
// suite runs a second time, nested inside the importer, on every future run of THIS file. That is not
// "reuse", it is silent duplication of somebody else's suite under a name that does not say so. So the
// walk below is a small, independent reimplementation of the same technique (a CallExpression whose
// callee is the identifier `notFound`) — and it goes one step further than the import would have, by
// also resolving the nearest enclosing `if` so "notFound() exists somewhere in the file" cannot pass
// for "notFound() guards the non-public branch".
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE LOADING.TSX INVENTORY IS DECLARED, WITH A REASON PER ROW — NOT DERIVED FROM DISK
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that walks the tree and asserts "every loading.tsx it finds is fine" is green on a tree with
// ZERO Suspense boundaries under this route — which is exactly the shape `error-boundaries.test.ts`'s
// header and `empty-state-adoption.test.ts` both warn against, in this repo, in writing, more than
// once. So the two rows below are named, with the argument for each, and compared against disk in
// BOTH directions: deleting one fails, adding a third under this subtree fails, same as
// `error-boundaries.test.ts`'s five-row inventory.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — 31 AUGUST 2026. GREEN IS 10 PASSED. ALL FOUR BELOW WERE ACTUALLY RUN, NOT PREDICTED —
// every number quoted is a real vitest transcript against this file, and every mutation touched only
// this test file's own constants (never `src/`), reverted immediately after the read.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Command: `npx vitest run --config vitest.design.config.ts tests/design/soft-404-status.test.ts`
//
//   (a) THE RENAMED BOUNDARY. `LOADING_INVENTORY`'s first row edited to a path that does not exist on
//       disk (`…/(detail)/loading-nope.tsx`), disk left untouched. **2 failed / 8 passed**:
//
//         AssertionError: the set of loading.tsx files under src/app/listings/[id] is not the
//         declared inventory. …: expected [ …(2) ] to deeply equal [ …(2) ]
//         - "src/app/listings/[id]/(detail)/loading-nope.tsx",
//         + "src/app/listings/[id]/(detail)/loading.tsx",
//
//         AssertionError: src/app/listings/[id]/(detail)/loading-nope.tsx is declared but was not
//         found on disk: expected false to be true
//
//       Note what did NOT fail: the COUNT assertion — disk still has 2 files, only the NAME
//       disagreed, which is exactly why the count and the set are separate `it`s (the
//       `error-boundaries.test.ts` trap this file's header already cites). Reverted → 10 passed.
//
//   (b) THE UNDECLARED FILE, WITHOUT TOUCHING `src/`. Rather than writing a real extra `loading.tsx`
//       under `src/app` — which would itself be an implementation edit — the declared inventory's
//       SECOND row was deleted instead, leaving disk with 2 files against 1 declared (the same
//       asymmetry an undeclared new file would produce, from the other side). **2 failed / 7 passed**
//       (9 total: `it.each` now emits one row, not two):
//
//         AssertionError: found: src/app/listings/[id]/(detail)/loading.tsx,
//         src/app/listings/[id]/book/loading.tsx: expected 2 to be 1
//
//         AssertionError: the set of loading.tsx files under src/app/listings/[id] is not the
//         declared inventory. …: expected [ …(2) ] to deeply equal [ Array(1) ]
//         + "src/app/listings/[id]/book/loading.tsx",
//
//       Reverted → 10 passed.
//
//   (c) THE VACUITY GUARD, WATCHED FAILING FIRST. `LISTINGS_ID_DIR` pointed at a sibling directory
//       that does not exist (`src/app/listings/[id]-nope`). **3 failed / 7 passed**, and the guard is
//       verifiably the first failure reported:
//
//         AssertionError: scanned: (nothing): expected 0 to be greater than or equal to 5
//         AssertionError: found: (nothing): expected +0 to be 2
//         AssertionError: the set of loading.tsx files … : expected [] to deeply equal [ …(2) ]
//
//       Recorded honestly: the two `notFound()` assertions on `page.tsx` did NOT fail here, because
//       `PAGE_PATH` is resolved independently of `LISTINGS_ID_DIR` — this scanner has no
//       `toEqual([])`-shaped assertion that an emptied WALK could satisfy vacuously, which is the
//       property the guard exists to protect. Reverted → 10 passed.
//
//   (d) THE DISCRIMINATING CALL, AGAINST A SECOND REAL FILE — not a fixture. `PAGE_PATH` retargeted
//       (in this test file only) at `src/app/listings/[id]/book/page.tsx`, an unmodified file that
//       calls `notFound()` four times for reasons that have nothing to do with `isPubliclyViewable`
//       (`!userId || !holdId`, `bk.bookerId !== userId`, `bk.listingId !== id`, `!lst`). **1 failed /
//       9 passed**:
//
//         AssertionError: none of notFound()'s call sites in src/app/listings/[id]/book/page.tsx
//         (lines: 71:!userId || !holdId, 110:!bk || bk.bookerId !== userId, 114:bk.listingId !== id,
//         150:!lst) are guarded by a condition mentioning isPubliclyViewable. …: expected [] to not
//         deeply equal []
//
//       Proves the guard-resolution assertion is not satisfied merely by "a file with some
//       `notFound()` calls in it" — a real route with four unrelated ones is red. Reverted → 10
//       passed.
//
//   (e) THE UNGUARDED CALL AND THE WRONG GUARD, ON FIXTURES. Asserted as a PERMANENT case below (not a
//       one-off mutation, since it is a synthetic source, never written to disk): a bare `notFound();`
//       with no enclosing `if` reports `guard: null` rather than inventing one, and `notFound()` inside
//       `if (someUnrelatedFlag)` reports a call AND a guard, but a guard that does not mention
//       `isPubliclyViewable` — so neither shape could pass the guard-resolution assertion above by
//       accident.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// PHASE 18 (D-208 / D-247) — WHAT THE GUARD NOW HAS TO BE, AND WHY AN ARGUMENT COUNT JOINED THE PINS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-13's "draft/unlisted/missing → 404" grew a fourth member: a listing awaiting ops review is hidden
// from bookers too, and it is hidden by REUSING this exact soft-404 rather than by inventing a
// "pending review" surface (D-229). So `isPubliclyViewable` took a THIRD REQUIRED positional
// parameter, and this file now pins the ARITY of the page's call as well as its name.
//
// The arity is not a restatement of what `tsc` already enforces. It is enforced only while the
// parameter stays required — and the one edit that quietly undoes the whole phase is giving it a
// default, after which every call site still compiles, the guard still mentions the rule, and an
// unreviewed listing is public again with nothing red anywhere. `PUBLICLY_VIEWABLE_ARITY`'s docblock
// carries the argument in full.
//
// ⚠ THE SAME LIMIT APPLIES TO THE NEW PIN AS TO EVERY OTHER ONE IN THIS FILE: it proves the guard is
// CALLED, with all its terms, and resolves through the one shared expression. It does NOT prove a
// `404` reaches the wire — see NOT COVERED, first bullet, which has been true since this file was
// written and did not become less true by the gate getting stricter. The production-build `curl`
// reading of the pending case is a one-time audit and belongs to plan 18-14.
//
// The THIRD leak surface D-247 names — `src/lib/listing/og-facts.ts`, which used to hold its own copy
// of the rule and so kept painting an Open Graph card for a listing this route 404s — is pinned in
// `tests/design/og-routes.test.ts`, not here. It is a different route tree and a different file, and
// splitting them keeps each gate's failure message about one thing.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   • THE HTTP STATUS LINE, AT ALL. Nothing here boots a server. `e2e/public-listing.spec.ts:385` is
//     the only instrument that reads one, and it is sampled per D-24's gap, not per commit.
//   • THE SHELL-FLUSH TIMING MECHANISM, in either direction — see the callout above.
//   • `layout.tsx`'s `assertPublicListing()` call. The finding's repair-that-wasn't lives entirely in
//     `page.tsx`'s branch per the gap this file was asked to close; the layout's own call is a
//     separately-filed finding (the three stale comments named above) and is not asserted here.
//   • SYNTACTIC LAUNDERING, like its siblings: `if (mustHide(row)) { doNotFound(); }` where
//     `doNotFound` is a local wrapper that itself calls `notFound()` passes everything here. The e2e
//     spec is what would see that, on the one route it drives.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync, type Dirent } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

/** The tree this gate is about — one directory below `src/app/listings/`. */
const LISTINGS_ID_DIR = resolve(process.cwd(), "src/app/listings/[id]");

/** The file the finding is about, and the one this gate parses for the `notFound()` guard. */
const PAGE_PATH = "src/app/listings/[id]/(detail)/page.tsx";

/** The expression the non-public branch's condition must mention — D-13's rule, as one function. */
const PUBLICLY_VIEWABLE_CHECK = "isPubliclyViewable";

/**
 * How many arguments that call must take. THREE since phase 18 (D-208): status, deletedAt, and the
 * ops review state.
 *
 * ── WHY AN ARGUMENT COUNT IS A REAL GATE AND NOT A TAUTOLOGY ──────────────────────────────────────
 *
 * A two-argument call does not compile today, so at first glance `tsc` already owns this and pinning
 * it here buys nothing. It owns it only for as long as the third parameter stays REQUIRED. The one
 * edit that quietly re-opens the leak is giving that parameter a default — `reviewState = "approved"`
 * — at which point every existing call keeps compiling, the page's guard silently stops testing the
 * review term, and an unreviewed listing is public again with a green `tsc` and a green suite.
 *
 * That default is also the tempting edit, because a required third parameter is exactly what makes
 * adding a fourth call site briefly painful. `src/lib/listing/public-listing.ts`'s docblock says why
 * the pain is the feature — grep missed the OG surface, the compiler did not — and this assertion is
 * what makes removing the pain show up as a failure rather than as a convenience.
 */
const PUBLICLY_VIEWABLE_ARITY = 3;

/** The scanner must see at least this many files under `LISTINGS_ID_DIR`, or it is not scanning (7
 *  today: `(detail)/{layout,loading,page}.tsx`, `book/{layout,loading,page}.tsx`,
 *  `opengraph-image.tsx`). Loose enough to survive one added file, tight enough to fail on an emptied
 *  or mis-pointed directory (probe (d) above). */
const MIN_FILES_UNDER_TREE = 5;

type LoadingRow = {
  readonly path: string;
  readonly why: string;
};

/**
 * THE DECLARED INVENTORY. Two rows, each with the argument for why that Suspense boundary exists on
 * this route tree — compared against disk in BOTH directions below, same idiom as
 * `error-boundaries.test.ts`'s `BOUNDARIES`.
 */
const LOADING_INVENTORY: readonly LoadingRow[] = [
  {
    path: "src/app/listings/[id]/(detail)/loading.tsx",
    why:
      "The Suspense boundary `src/lib/listing/public-listing.ts`'s own header names as the CAUSE of " +
      "the original soft-404 (the page suspends, so the shell — whatever wins the race — can flush " +
      "before the page's `notFound()` runs). `tests/design/loading-coverage.test.ts` (AC#15, " +
      "build-blocking) forbids deleting it outright: every server-awaiting page needs one, dead or " +
      "not. So this route can never simply lose its Suspense boundary as an accidental 'fix' for the " +
      "very defect it produces — the repair that shipped instead lives elsewhere.",
  },
  {
    path: "src/app/listings/[id]/book/loading.tsx",
    why:
      "Wraps the checkout page in the same kind of boundary, which gives it the identical mechanism " +
      "— but `public-listing.ts`'s header lists this route among the eight ACCEPTED (not fixed) " +
      "soft-404s: reached only via `redirect()` from a server action, no `<a href>` anywhere points " +
      "at it, and it needs an unguessable `?hold=<uuid>` query param, so nothing can crawl it. Pinned " +
      "here so a future author does not assume this file is the fixed one, or is absent.",
  },
];

function parse(fileName: string, text: string): ts.SourceFile {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/** Every file with a given basename under a directory, recursively. `[]` on a missing tree — a broken
 *  scan surfaces as one named guard failure, never a stack trace that buries which gate went quiet
 *  (`error-boundaries.test.ts`'s `collect`, same shape). */
function collectByBasename(dir: string, basename: string, out: string[] = []): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectByBasename(full, basename, out);
    else if (entry.name === basename) out.push(full);
  }
  return out;
}

/** Every file under a directory, recursively — used only by the vacuity guard to prove the tree is
 *  real, not to derive the loading.tsx inventory (which stays declared, per the header). */
function collectAllFiles(dir: string, out: string[] = []): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectAllFiles(full, out);
    else out.push(full);
  }
  return out;
}

const rel = (p: string) => relative(process.cwd(), p).replace(/\\/g, "/");

type GuardedCall = {
  readonly line: number;
  /** Source text of the nearest enclosing `if` condition, or `null` if the call is unguarded. */
  readonly guard: string | null;
};

/**
 * Every CallExpression named `notFound`, each resolved to the nearest enclosing `if` statement's
 * condition (or `null` if none encloses it). A CALL, not a mention — `not-found.tsx`-style renderer
 * files and this file's own header can say the word freely without being counted.
 *
 * This is a deliberate reimplementation of `invite-notfound-parity.test.ts`'s `collectNotFoundCalls`
 * technique rather than an import of it — see the header for the measured reason (importing a sibling
 * `.test.ts` file re-runs its whole suite as a side effect: 1 test became 9, watched, not assumed).
 */
function findNotFoundCalls(sf: ts.SourceFile): GuardedCall[] {
  const out: GuardedCall[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "notFound"
    ) {
      let cur: ts.Node | undefined = node.parent;
      let guard: string | null = null;
      while (cur !== undefined) {
        if (ts.isIfStatement(cur)) {
          guard = cur.expression.getText(sf);
          break;
        }
        cur = cur.parent;
      }
      out.push({ line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, guard });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/**
 * Every CallExpression of `name`, with how many arguments each one was passed.
 *
 * A CALL, parsed — not a regex over the text — for the same reason `findNotFoundCalls` is: this
 * file's own header names `isPubliclyViewable` repeatedly, and a comment that describes the rule must
 * never be counted as an instance of it. Argument counts come off `node.arguments.length`, so
 * whitespace, line breaks and a multi-line condition are all irrelevant to the reading.
 */
function findCallsNamed(sf: ts.SourceFile, name: string): { line: number; argCount: number }[] {
  const out: { line: number; argCount: number }[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) {
      out.push({
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        argCount: node.arguments.length,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** Whether `moduleSpecifier` is imported into the file with `bindingName` among its named imports. */
function importsNamedFrom(sf: ts.SourceFile, moduleSpecifier: string, bindingName: string): boolean {
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    if (stmt.moduleSpecifier.text !== moduleSpecifier) continue;
    const named = stmt.importClause?.namedBindings;
    if (named !== undefined && ts.isNamedImports(named)) {
      for (const el of named.elements) {
        if ((el.propertyName?.text ?? el.name.text) === bindingName) return true;
      }
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE SCAN, run once at module load.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const ALL_FILES_UNDER_TREE = collectAllFiles(LISTINGS_ID_DIR).map(rel);
const ON_DISK_LOADING = collectByBasename(LISTINGS_ID_DIR, "loading.tsx").map(rel).sort();

const pageAbsPath = resolve(process.cwd(), PAGE_PATH);
const pageSourceText = existsSync(pageAbsPath) ? readFileSync(pageAbsPath, "utf8") : "";
const pageSourceFile = parse(PAGE_PATH, pageSourceText);
const pageNotFoundCalls = findNotFoundCalls(pageSourceFile);
const pageImportsNotFound = importsNamedFrom(pageSourceFile, "next/navigation", "notFound");
const pageViewableCalls = findCallsNamed(pageSourceFile, PUBLICLY_VIEWABLE_CHECK);

describe("17-D1 / 17-D2 item 2 — the structure behind the measured soft-404 on /listings/[id]", () => {
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // GUARD THE GUARD, ASSERTED FIRST. An emptied or mis-pointed `LISTINGS_ID_DIR` must not let any
  // assertion below pass by finding nothing to disagree with (probe (d) in the header).
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("the scan reached a real, non-empty tree, and really read page.tsx", () => {
    expect(
      ALL_FILES_UNDER_TREE.length,
      `scanned: ${ALL_FILES_UNDER_TREE.join(", ") || "(nothing)"}`,
    ).toBeGreaterThanOrEqual(MIN_FILES_UNDER_TREE);

    expect(ALL_FILES_UNDER_TREE, `the scan never opened ${PAGE_PATH}`).toContain(rel(pageAbsPath));

    // Not a no-op read: the real file is 800+ lines. A wrong path or an ENOENT-swallowed read would
    // produce an empty string, and every list assertion below would then be vacuously satisfiable.
    expect(
      pageSourceText.length,
      `${PAGE_PATH} read as ${pageSourceText.length} characters — the source scan did not really open it`,
    ).toBeGreaterThan(20_000);
    expect(pageSourceFile.statements.length, `${PAGE_PATH} parsed to zero statements`).toBeGreaterThan(0);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // notFound() ON THE NON-PUBLIC BRANCH — a real call, guarded by the same rule D-13 states.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it(`${PAGE_PATH} imports notFound from next/navigation`, () => {
    expect(
      pageImportsNotFound,
      `${PAGE_PATH} does not import { notFound } from "next/navigation" — a locally-shadowed ` +
        "identifier of the same name would satisfy a bare CallExpression scan without ever raising " +
        "the real one.",
    ).toBe(true);
  });

  it(`${PAGE_PATH} calls notFound(), guarded by ${PUBLICLY_VIEWABLE_CHECK}`, () => {
    expect(
      pageNotFoundCalls.length,
      `${PAGE_PATH} calls notFound() ${pageNotFoundCalls.length} times — the non-public branch (D-13) ` +
        "has no reachable notFound() call at all, so a draft/unlisted/deleted listing's body would " +
        "render as if it were public.",
    ).toBeGreaterThanOrEqual(1);

    const guarded = pageNotFoundCalls.filter(
      (c) => c.guard !== null && c.guard.includes(PUBLICLY_VIEWABLE_CHECK),
    );
    expect(
      guarded,
      `none of notFound()'s call sites in ${PAGE_PATH} (lines: ` +
        `${pageNotFoundCalls.map((c) => `${c.line}:${c.guard ?? "unguarded"}`).join(", ")}) are ` +
        `guarded by a condition mentioning ${PUBLICLY_VIEWABLE_CHECK}. A notFound() call that exists ` +
        "but does not gate on publicness is not the D-13 rule — it is a coincidence with the right " +
        "function name.",
    ).not.toEqual([]);
  });

  it(`the guard's ${PUBLICLY_VIEWABLE_CHECK} call passes all ${PUBLICLY_VIEWABLE_ARITY} terms (D-208)`, () => {
    expect(
      pageViewableCalls.length,
      `${PAGE_PATH} contains no parsed call to ${PUBLICLY_VIEWABLE_CHECK} at all. The assertion above ` +
        "reads the guard as TEXT, so a mention inside a condition satisfies it; this one reads a " +
        "CallExpression, and the two disagreeing means the guard names the rule without invoking it.",
    ).toBeGreaterThanOrEqual(1);

    const wrongArity = pageViewableCalls.filter((c) => c.argCount !== PUBLICLY_VIEWABLE_ARITY);
    expect(
      wrongArity,
      `${PAGE_PATH} calls ${PUBLICLY_VIEWABLE_CHECK} with the wrong number of arguments at line(s) ` +
        `${wrongArity.map((c) => `${c.line} (${c.argCount})`).join(", ")}. Expected ` +
        `${PUBLICLY_VIEWABLE_ARITY}: status, deletedAt and the ops REVIEW STATE (D-208). A ` +
        "two-argument call compiles only if someone gave the third parameter a default — which leaves " +
        "every call site green while the page silently stops testing the review term, and an " +
        "unreviewed listing becomes publicly readable again. That is the exact defect this pin " +
        "exists to catch; read src/lib/listing/public-listing.ts's docblock before changing it.",
    ).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // THE loading.tsx INVENTORY — declared, checked in both directions. COUNT AND SET ARE SEPARATE
  // `it`s: written as one block, a sixth file would fail the count first and never name itself
  // (`error-boundaries.test.ts`'s own recorded trap, probe (c) in ITS header).
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("finds exactly the declared number of loading.tsx files under this tree", () => {
    expect(
      ON_DISK_LOADING.length,
      `found: ${ON_DISK_LOADING.join(", ") || "(nothing)"}`,
    ).toBe(LOADING_INVENTORY.length);
  });

  it("finds exactly the declared loading.tsx files, by name", () => {
    expect(
      ON_DISK_LOADING,
      "the set of loading.tsx files under src/app/listings/[id] is not the declared inventory. A " +
        "MISSING row means a Suspense boundary the soft-404 finding was measured against is gone — " +
        "re-measure § P1 before trusting the old reading. An EXTRA one means a new route segment grew " +
        "a Suspense boundary that needs a row here, with the argument for why its own soft-404 status " +
        "is accepted or fixed.",
    ).toEqual(LOADING_INVENTORY.map((r) => r.path).sort());
  });

  it.each(LOADING_INVENTORY.map((r) => [r.path, r] as const))(
    "%s exists on disk, as declared",
    (path) => {
      expect(existsSync(resolve(process.cwd(), path)), `${path} is declared but was not found on disk`).toBe(
        true,
      );
    },
  );

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // BOTH-DIRECTIONS SELF-TESTS on fixtures never written to disk, through the SAME functions the real
  // assertions above run.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("counts a three-term guard as three, and a defaulted two-term one as two", () => {
    // BOTH DIRECTIONS on the arity reader, because it is the assertion whose failure mode is silence:
    // a counter that always returned PUBLICLY_VIEWABLE_ARITY would pass the real assertion above
    // forever, including on the very edit — a defaulted third parameter — it exists to catch.
    const three = parse(
      "fixture-three.tsx",
      "if (!row || !isPubliclyViewable(a.status, a.deletedAt, a.reviewState)) { notFound(); }",
    );
    expect(findCallsNamed(three, PUBLICLY_VIEWABLE_CHECK).map((c) => c.argCount)).toEqual([
      PUBLICLY_VIEWABLE_ARITY,
    ]);

    // The regression shape itself: still compiles against a defaulted parameter, still mentions the
    // rule, still guards a notFound() — and no longer tests the review term.
    const two = parse(
      "fixture-two.tsx",
      "if (!row || !isPubliclyViewable(a.status, a.deletedAt)) { notFound(); }",
    );
    expect(findCallsNamed(two, PUBLICLY_VIEWABLE_CHECK).map((c) => c.argCount)).toEqual([2]);

    // A MENTION in a comment is not a call — the reason this is an AST walk and not a regex, and the
    // reason this very file may go on describing `isPubliclyViewable` in prose as much as it likes.
    const commented = parse(
      "fixture-viewable-comment.tsx",
      "// isPubliclyViewable(a, b) used to be called here\nexport const A = 1;",
    );
    expect(findCallsNamed(commented, PUBLICLY_VIEWABLE_CHECK)).toEqual([]);
  });

  it("flags a guarded call, spares a comment, and reports an unguarded call honestly", () => {
    const guarded = parse(
      "fixture-guarded.tsx",
      [
        // The page's guard, quoted at its CURRENT three-argument shape (D-208). Kept in step with the
        // real line on purpose: a fixture frozen at the old two-argument form would still pass, while
        // quietly documenting a rule the codebase no longer has.
        "if (",
        "  !row ||",
        "  !isPubliclyViewable(row.listing.status, row.listing.deletedAt, row.listing.reviewState)",
        ") {",
        "  notFound();",
        "}",
      ].join("\n"),
    );
    const guardedCalls = findNotFoundCalls(guarded);
    expect(guardedCalls).toHaveLength(1);
    expect(guardedCalls[0]?.guard).toContain("isPubliclyViewable");
    // …and the same fixture read through the arity walk, so the two readers are known to agree on the
    // shape the real page carries rather than each being right about a different file.
    expect(findCallsNamed(guarded, PUBLICLY_VIEWABLE_CHECK).map((c) => c.argCount)).toEqual([
      PUBLICLY_VIEWABLE_ARITY,
    ]);

    // A CALL with no enclosing `if` at all — the scanner must say so rather than inventing a guard.
    const unguarded = parse("fixture-unguarded.tsx", "notFound();");
    expect(findNotFoundCalls(unguarded)).toEqual([{ line: 1, guard: null }]);

    // Guarded, but by something that has nothing to do with publicness — must NOT count as satisfying
    // the D-13 property, only as "a call that exists".
    const wrongGuard = parse(
      "fixture-wrong-guard.tsx",
      "if (someUnrelatedFlag) {\n  notFound();\n}",
    );
    const wrongGuardCalls = findNotFoundCalls(wrongGuard);
    expect(wrongGuardCalls).toHaveLength(1);
    expect(wrongGuardCalls[0]?.guard).not.toContain(PUBLICLY_VIEWABLE_CHECK);

    // A MENTION in a comment must not be counted at all — the whole reason this is an AST walk.
    const commented = parse(
      "fixture-comment.tsx",
      "// this branch used to call notFound() here but no longer does\nexport const A = 1;",
    );
    expect(findNotFoundCalls(commented)).toEqual([]);
  });

  it("resolves the notFound import binding, both directions", () => {
    const real = parse(
      "fixture-import.tsx",
      'import { notFound } from "next/navigation";\nnotFound();',
    );
    expect(importsNamedFrom(real, "next/navigation", "notFound")).toBe(true);

    // A same-named LOCAL function is not the import — this is what the import-binding check is for.
    const shadowed = parse(
      "fixture-shadow.tsx",
      "function notFound() { throw new Error('local'); }\nnotFound();",
    );
    expect(importsNamedFrom(shadowed, "next/navigation", "notFound")).toBe(false);

    // A namespace import carries no named bindings at all.
    const namespaceImport = parse(
      "fixture-namespace.tsx",
      'import * as nav from "next/navigation";\nnav.notFound();',
    );
    expect(importsNamedFrom(namespaceImport, "next/navigation", "notFound")).toBe(false);
  });

  it("collectByBasename returns [] for a missing tree rather than throwing", () => {
    expect(collectByBasename(resolve(process.cwd(), "src/app/listings/[id]-nope"), "loading.tsx")).toEqual(
      [],
    );
  });
});
