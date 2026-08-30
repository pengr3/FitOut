// WR-04 — THE RULE: *no `pb-*` composed through `cn()` alongside `STICKY_BAR_CLEARANCE` may be
// deleted by the merge.*
//
// `cn` is not string concatenation. It is `clsx` + `extendTailwindMerge` (`src/lib/utils.ts:41-47`),
// and tailwind-merge resolves a `py-*` / `pb-*` conflict by **DELETING the earlier class before any
// CSS exists**. So on a call like the checkout page's, ARGUMENT ORDER decides which clearance
// survives to the DOM at all — not which one wins a cascade, which is a different mechanism at a
// later stage. A `pb-20` written before a `py-8` is not a smaller padding. It is **no padding**.
//
// This is the gap this file closes. `src/app/listings/[id]/book/page.tsx:546-552` is CORRECT TODAY
// and measured — 80px at 320 / 639 / 640 / 768 / 1023 and 48px at 1024 / 1280, both themes
// (`17.1-EVIDENCE.md` § P4). Nothing was broken when this gate was written. What was missing was any
// instrument that would notice the single most plausible "tidy" anyone will ever perform on that
// line.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE MEASUREMENT THIS FILE ENCODES — probed through this repo's own `cn`, 31 August 2026
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// With `P = "mx-auto w-full max-w-4xl px-4 py-8 sm:py-12"`, `K = STICKY_BAR_CLEARANCE = "pb-20"`,
// `T = "sm:pb-20 lg:pb-12"`:
//
//   SHIPPED   cn(P, K, T)   →  mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 pb-20 sm:pb-20 lg:pb-12
//   HOISTED   cn(K, P, T)   →  mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 sm:pb-20 lg:pb-12
//                                                                          ↑ `pb-20` GONE
//   FLATTENED one literal   →  mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:pb-12
//                                                                          ↑ BOTH clearance terms GONE
//
// HOISTED — moving a named constant to the front of a call whose first argument is a bare literal —
// leaves `<main>` reserving **32px (`py-8`) under a 64px bar below 640px**. That is strictly worse
// than the defect phase 17.1 just repaired, which was 80px below 640px and only failed from 640px up.
// It is one keystroke, it reads as tidier, and before this file nothing anywhere would have said so.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE CONSTANT WAS NOT FOLDED — the rejected shape, recorded as a number rather than an opinion
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The obvious repair is to fold the breakpoint variant INTO the constant, so the class list carries
// one term instead of two that can reorder against each other. Probed the same way, with
// `KA = "pb-20 sm:pb-20"`:
//
//   A shipped  cn(P, KA, "lg:pb-12")  →  … px-4 py-8 sm:py-12 pb-20 sm:pb-20 lg:pb-12   (identical)
//   A hoisted  cn(KA, P, "lg:pb-12")  →  … px-4 py-8 sm:py-12 lg:pb-12                  (BOTH gone)
//
// It does not remove the fragility; it DOUBLES the blast radius. The killer is `py-*`, not the
// sibling `pb-*`: `py-8` deletes a preceding `pb-20` and `sm:py-12` deletes a preceding `sm:pb-20`,
// so folding the two survivors into one argument means the same hoist deletes both instead of one.
// The counterfactual is watched red below, under (c), so the rejection is a measurement.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS PARSES THE REAL SOURCE AND NOT A COPY OF THE ARGUMENT LIST
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The obvious version of this test is: import `cn`, retype the three arguments here, assert the
// output contains `pb-20`. **That is not a guard.** It is a SECOND COPY of the argument list, and it
// stays green forever while the real file is reordered — the failure mode is precisely the edit it
// was written to catch.
//
// This repository has paid for that defect class twice, in writing:
//
//   • `tests/design/helpers/strip-comments.ts:12-26` — the brand recipe reported **21/21 passed**,
//     and the whole design suite **405 tests passed**, while the primary booker CTA was no longer
//     coral. Six pinned counts, all green, all satisfied by prose.
//   • `tests/design/sticky-offset.test.ts:9-13` — *"a per-file map would say these files are correct
//     today; the failure this gate exists to catch is the NEXT one."*
//
// So the subject is read out of the tree: walk `src/`, find every `CallExpression` whose callee is
// `cn` and whose arguments mention `STICKY_BAR_CLEARANCE`, resolve that ACTUAL argument list, feed it
// through the REAL `cn`, and assert nothing was deleted. Same idiom as `sticky-offset.test.ts:155-160`
// (`import ts from "typescript"` + `stripComments`), same node classes as `leak.test.ts:213-250` and
// `skeleton-measurements.test.ts:211-239`.
//
// And it is a RULE, not a path inventory. The subject is *every* `cn()` site composing the constant,
// so the next route that grows a sticky bar is covered on the day it is written. Two sites match
// today, and the `(detail)` layout is one of them and is NOT fragile (no `py-*` in its arguments, so
// hoisting there keeps `pb-20` — measured). That is exactly why the rule must not be scoped to the
// checkout file: the fragile site is the one that has a layout string, and which site that is
// changes.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHERE THIS RUNS — verified end to end, because the alternative instrument does not run at all
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
//   `.github/workflows/ci.yml:601-602`  job 1 `gate-db-free` runs `npm run build`
//   `package.json:11`                   `"build": "npm run lint && npm run test:design && next build"`
//   `package.json:28`                   `"test:design": "vitest run --config vitest.design.config.ts"`
//   `vitest.design.config.ts:50`        includes `tests/design/**/*.test.ts`, `environment: "node"`,
//                                       NO `globalSetup`, NO `setupFiles` — the DB-free guarantee (D-16)
//
// So this file runs on every push, with no Postgres and no browser. Contrast the only instrument
// WR-04 found for this padding today: `.github/workflows/ci.yml:841` runs exactly
// `e2e/price-parity.spec.ts`, so `e2e/mobile-booker-path.spec.ts`'s `expectDocumentEndClearsBar` —
// the RENDERED measurement of this very padding — never executes in CI. `tests/design/` is therefore
// not merely a reasonable home for this rule; it is the only place a guard for it can bite.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — ALL THREE PROBES, DRIVEN AGAINST THE REAL TREE. 31 August 2026. GREEN IS 15 PASSED.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`). Each
// probe below was applied to the SOURCE, run, its output copied here verbatim, then REVERTED and
// re-greened before the next was started. No probe was kept; `git status --porcelain src/` was clean
// after each. A watched red that is later tidied to match the tree is no longer evidence of anything
// (`sticky-offset.test.ts:~111`).
//
// Command for all three: `npx vitest run --config vitest.design.config.ts
// tests/design/clearance-merge-order.test.ts`
//
//   (a) THE HOIST — THE EDIT THIS GATE EXISTS FOR. `STICKY_BAR_CLEARANCE` moved to be the FIRST
//       argument of `cn` in `src/app/listings/[id]/book/page.tsx:547-551`, the layout literal second.
//       Nothing else touched. **2 failed / 13 passed.** The rule names the file, the LINE, the class
//       that vanished and the string that came out, so the failure is readable without a REPL:
//
//         AssertionError: `cn` is tailwind-merge, not class concatenation: it DELETES a `pb-*` that
//         precedes a conflicting `py-*`, before any CSS exists. A clearance composed BEFORE the
//         layout string is therefore not a smaller padding — it is NO padding, and the page's last
//         rows sit under the fixed bar. Keep `STICKY_BAR_CLEARANCE` AFTER the "… py-8 sm:py-12"
//         argument, and `sm:pb-20` AFTER `sm:py-12`.: expected [ Array(1) ] to deeply equal []
//
//         - []
//         + [
//         +   "src/app/listings/[id]/book/page.tsx:547 — `pb-20` was DELETED by the merge (variant
//         +    `<none>`). Merged output: \"mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 sm:pb-20
//         +    lg:pb-12\"",
//         + ]
//
//       The SECOND failure is the positive half, and it is worth reading beside the first because it
//       fires on the same edit from the other direction — not "something was deleted" but "the result
//       is no longer the one that was measured on the live route":
//
//         AssertionError: the `pb-*` classes that survive the merge changed. …
//         expected { …(2) } to deeply equal { …(2) }
//
//           "src/app/listings/[id]/book/page.tsx": {
//         -   "": "pb-20",
//             "lg": "lg:pb-12",
//             "sm": "sm:pb-20",
//           },
//
//       Both fired, which is what the pairing is for: one bad edit, two readable failures. Reverted →
//       15 passed.
//
//   (b) THE FLATTEN — THE EDIT THAT DELETES THE GATE'S SUBJECT INSTEAD OF REORDERING IT. The whole
//       argument list at `:547-551` replaced by the single literal
//       `"mx-auto w-full max-w-4xl px-4 pb-20 py-8 sm:pb-20 sm:py-12 lg:pb-12"`, and the now-unused
//       import deleted. That string merges to `… px-4 py-8 sm:py-12 lg:pb-12` — BOTH clearance terms
//       gone, the page silently reserving 32px under a 64px bar — and the checkout site no longer
//       matches the rule at all. **3 failed / 12 passed**, and the two counts fire together, which is
//       precisely the signature that says "abandoned" rather than "moved":
//
//         AssertionError: the number of files importing `STICKY_BAR_CLEARANCE` changed. This is not a
//         failure of the merge-order rule — every site may still be safe — it is a prompt to read the
//         new one and update this count deliberately, in the commit that changes it. Importers found:
//         src/app/listings/[id]/(detail)/layout.tsx: expected 1 to be 2 // Object.is equality
//
//         AssertionError: the number of `cn()` calls composing `STICKY_BAR_CLEARANCE` changed. Read
//         this beside the importer count above: the two dropping TOGETHER means a call site abandoned
//         the constant; this one dropping ALONE means the constant is still imported but is no longer
//         composed through `cn` — so this rule silently stopped covering it, which is the direction no
//         absence assertion can notice. Sites found: src/app/listings/[id]/(detail)/layout.tsx:80:
//         expected 1 to be 2 // Object.is equality
//
//       …plus the positive table, which loses the whole `book/page.tsx` row. Note what did NOT fire:
//       `deletes no pb-* clearance at any site` PASSED, over a tree where the checkout clearance had
//       just been merged out of existence — because the surviving site is clean and an absence
//       assertion cannot notice its subject was taken away. That is the entire reason the counts are
//       pinned separately from the rule, and this is the probe that measures it. Reverted → 15 passed.
//
//   (c) THE SHAPE-A COUNTERFACTUAL — WHY THE VARIANT WAS NOT FOLDED INTO THE CONSTANT.
//       `src/lib/design/measurements.ts:345` set to `"pb-20 sm:pb-20"`, the literal `sm:pb-20` dropped
//       from the checkout call, and the hoist from (a) applied on top. **2 failed / 13 passed**, and
//       the rule names BOTH variants where (a) named one — the fold does not remove the hazard, it
//       doubles it:
//
//         AssertionError: … expected [ …(2) ] to deeply equal []
//
//         - []
//         + [
//         +   "src/app/listings/[id]/book/page.tsx:547 — `pb-20` was DELETED by the merge (variant
//         +    `<none>`). Merged output: \"mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:pb-12\"",
//         +   "src/app/listings/[id]/book/page.tsx:547 — `sm:pb-20` was DELETED by the merge (variant
//         +    `sm`). Merged output: \"mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:pb-12\"",
//         + ]
//
//       And the positive half recorded the fold's OTHER cost, unprompted — the sibling route, which
//       has no `py-*` to lose to and was never fragile, silently changed the classes it emits:
//
//           "src/app/listings/[id]/(detail)/layout.tsx": {
//             "": "pb-20",
//             "lg": "lg:pb-0",
//         +   "sm": "sm:pb-20",
//           },
//
//       A no-op on that route's computed padding, and a change to a shipped route's class list for a
//       hazard it does not have. Shape A is therefore rejected on a measurement rather than on taste.
//       Both files reverted → 15 passed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   • IT READS SOURCE, NOT COMPUTED GEOMETRY. It proves the class SURVIVES THE MERGE. It cannot
//     prove the box renders 80px, that the bar is 64px, or that no ancestor overrides the padding.
//     That measurement is `e2e/mobile-booker-path.spec.ts`'s `expectDocumentEndClearsBar`, driven at
//     640 / 768 / 1023 in both themes — and CI does not run it (`.github/workflows/ci.yml:841`). The
//     two instruments are complementary and neither subsumes the other.
//   • IT UNDERSTANDS `pb-*` ONLY. A clearance expressed as `mb-*`, as `padding-bottom` in an inline
//     style, or as an arbitrary property is invisible here. Widening the utility set is a one-line
//     change to `isPaddingBottom` when a second spelling first appears; it is not widened
//     speculatively, because an assertion over shapes that do not exist cannot be watched red.
//   • IT FOLLOWS THE CONSTANT. A clearance hard-coded as a bare `pb-20` literal with no constant is
//     out of subject BY CONSTRUCTION — the site never matches. That is a deliberate scope: the
//     constant is what phase 17 made the single declared knob, and a call site that abandons it has
//     a different problem than argument order.
//   • IT RESOLVES ONLY STRING LITERALS AND THE CONSTANT ITSELF. Any other argument shape — a
//     template literal, a conditional, a spread, an object — is reported as a VIOLATION rather than
//     skipped. Fail-closed, the same direction `sticky-offset.test.ts` takes with an unresolvable
//     offset: an argument this gate cannot resolve is one nobody can check by reading either.
//   • VARIANTS ARE SPLIT AT THE LAST `:`. An arbitrary variant that contains a colon inside brackets
//     (`[&:hover]:pb-4`) would be bucketed under a nonsense variant key. None exists in the tree, and
//     the direction is loud rather than silent: a mis-bucketed term reports as a deleted class.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, type Dirent } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

import { cn } from "@/lib/utils";
import { STICKY_BAR_CLEARANCE } from "@/lib/design/measurements";
import { stripComments } from "./helpers/strip-comments";

/** The scanned tree, as one constant — the vacuity probe is a one-line edit here. */
const SRC_DIR = resolve(process.cwd(), "src");

/** The composing function this rule is about. `cn` is `clsx` + tailwind-merge (`src/lib/utils.ts`). */
const COMPOSER = "cn";

/**
 * The clearance constant, by NAME (for the AST) and by VALUE (for the merge).
 *
 * The value is the REAL import rather than a retyped `"pb-20"`, so a change to the constant flows
 * into this gate automatically instead of silently decoupling it. That is the same reason WR-05
 * exists as a separate finding, and this file is deliberately compatible with its fix: the rule
 * asserts over *whatever* `pb-*` terms the arguments contain, so adding a `STICKY_BAR_CLEARANCE_SM`
 * later changes nothing here but the pinned positive table.
 */
const CONSTANT_NAME = "STICKY_BAR_CLEARANCE";
const RESOLVABLE_IDENTIFIERS: Readonly<Record<string, string>> = {
  [CONSTANT_NAME]: STICKY_BAR_CLEARANCE,
};

/**
 * How many files under `src/` IMPORT the constant, and how many `cn()` sites COMPOSE it.
 *
 * PINNED SEPARATELY, and the separation is the point — the reasoning `sticky-offset.test.ts:~185`
 * gives for `EXPECTED_STICKY_SITES` applies twice over here, because "somebody added a site",
 * "somebody broke a site" and "somebody removed the gate's subject" must not be the same failure.
 *
 * The two numbers fail in DIFFERENT DIRECTIONS, which is why both are needed:
 *
 *   • SITES dropping to 1 while IMPORTS stays 2 means the constant is still imported but stopped
 *     being composed through `cn` — inlined into a template literal, say, or moved onto a
 *     `class-variance-authority` variant. The rule silently stops covering that site, and only this
 *     number notices.
 *   • IMPORTS dropping to 1 as well means the call site abandoned the constant altogether — the
 *     FLATTEN edit. That is the probe that proves this gate cannot be silenced by deleting its
 *     subject.
 *   • Either number going UP means a new route grew a sticky bar. The correct response is NOT to
 *     bump the number: it is to READ the new site, decide whether its arguments are ordered safely,
 *     and extend the positive table below deliberately, in the commit that adds it.
 *
 * TWO AND TWO TODAY: `src/app/listings/[id]/book/page.tsx` and
 * `src/app/listings/[id]/(detail)/layout.tsx`, each importing once and composing once.
 */
const EXPECTED_IMPORT_FILES = 2;
const EXPECTED_CN_SITES = 2;

/**
 * The `pb-*` terms that SURVIVE the merge at each site, per variant — the positive half.
 *
 * Paired with the rule below in the shape `sticky-offset.test.ts` uses, so ONE bad edit produces TWO
 * readable failures rather than one. The rule answers "was anything deleted?"; this answers "is the
 * result still the result we measured?". A `toEqual([])` is satisfied just as well by a scan that
 * found nothing, and this table is what makes that indistinguishable case fail.
 *
 * WHAT THIS TABLE ENCODES, IN RENDERED PIXELS (`17.1-EVIDENCE.md` § P4, both themes):
 *
 *   `/listings/[id]/book`   — 80px at 320 / 639 / 640 / 768 / 1023, and 48px at 1024 / 1280.
 *                             `pb-20` covers the 64px bar + 16px gap below `sm:`; `sm:pb-20` is what
 *                             makes that true from 640px up, where `sm:py-12`'s 48px would otherwise
 *                             win its own layer; `lg:pb-12` hands back exactly the 48px `sm:py-12`
 *                             supplies at the first width where no bar renders.
 *   `/listings/[id]`        — the `(detail)` wrapper, below the footer, so the padding covers the
 *                             footer too (`[17-D9]`). `lg:pb-0` tracks the bar's own `lg:hidden`.
 */
const EXPECTED_SURVIVING_PB: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "src/app/listings/[id]/book/page.tsx": { "": "pb-20", sm: "sm:pb-20", lg: "lg:pb-12" },
  "src/app/listings/[id]/(detail)/layout.tsx": { "": "pb-20", lg: "lg:pb-0" },
};

/** Repo-relative, forward-slashed. See `leak.test.ts:157-165` for why the normalisation matters. */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  // `Dirent<string>[]`, spelled out rather than inferred through `ReturnType<typeof readdirSync>` —
  // that alias resolves to the BUFFER overload on this @types/node, and the walk would not compile.
  let entries: Dirent<string>[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    // `[]` rather than a throw — 11-02's rule: a broken scan must surface as ONE named
    // guard-the-guard failure, not as a stack trace that buries which gate went quiet.
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

// -------------------------------------------------------------------------------------------------
// Class-token arithmetic. Two functions, both deliberately dumb, both fixture-tested below.
// -------------------------------------------------------------------------------------------------

/** Everything before the FINAL `:` — `""` for an unvariant class, `"sm"` for `sm:pb-20`. */
export function variantOf(token: string): string {
  const cut = token.lastIndexOf(":");
  return cut === -1 ? "" : token.slice(0, cut);
}

/** The bare utility, variant stripped, `!` important-modifier tolerated. */
export function isPaddingBottom(token: string): boolean {
  const cut = token.lastIndexOf(":");
  const base = cut === -1 ? token : token.slice(cut + 1);
  return /^!?pb-/.test(base);
}

/**
 * The `pb-*` term per variant in a class list, LAST ONE WINNING.
 *
 * Last-wins is not a convenience: it is what a deliberate override MEANS in a tailwind-merge class
 * list. `cn(K, "sm:pb-20 lg:pb-12")` says "80px, and 48px from `lg:` up", and the survivor the author
 * intended at each variant is the last one they wrote at that variant.
 */
export function pbByVariant(classList: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const token of classList.split(/\s+/).filter(Boolean)) {
    if (isPaddingBottom(token)) found.set(variantOf(token), token);
  }
  return found;
}

// -------------------------------------------------------------------------------------------------
// The scan.
// -------------------------------------------------------------------------------------------------

/**
 * One resolved argument of a matched `cn()` call.
 *
 * `unresolvable` is a FAILURE carrier, not a skip — see NOT COVERED. It records the AST shape so the
 * failure message can say *what* it could not read rather than merely that it could not.
 */
export type ResolvedArg =
  | { readonly kind: "literal"; readonly text: string }
  | { readonly kind: "constant"; readonly name: string; readonly text: string }
  | { readonly kind: "unresolvable"; readonly shape: string };

export type Site = {
  readonly file: string;
  readonly line: number;
  readonly args: readonly ResolvedArg[];
};

export type ScanResult = {
  readonly sites: readonly Site[];
  /** Did this module `import { STICKY_BAR_CLEARANCE }`? Counted separately — see the pins above. */
  readonly importsConstant: boolean;
};

function parse(path: string, text: string): ts.SourceFile {
  return ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function resolveArg(node: ts.Expression): ResolvedArg {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return { kind: "literal", text: node.text };
  }
  if (ts.isIdentifier(node)) {
    const value = RESOLVABLE_IDENTIFIERS[node.text];
    if (value !== undefined) return { kind: "constant", name: node.text, text: value };
    return { kind: "unresolvable", shape: `identifier \`${node.text}\`` };
  }
  return { kind: "unresolvable", shape: ts.SyntaxKind[node.kind] };
}

/**
 * Every `cn(...)` call in one module whose argument list mentions the clearance constant, plus
 * whether the module imports it.
 *
 * Source is COMMENT-STRIPPED before the parse. That is not belt-and-braces here, it is load-bearing:
 * `src/app/listings/[id]/(detail)/page.tsx:493` names the constant in prose to explain where it went,
 * and `book/page.tsx` names it four times in the block above the call. A stripper that became a
 * pass-through would not change the AST match (a comment is not a `CallExpression`), but it WOULD
 * change the import count — which is why the stripper is asserted non-vacuous below.
 */
export function scanText(path: string, rawText: string): ScanResult {
  const sf = parse(path, stripComments(rawText));
  const sites: Site[] = [];
  let importsConstant = false;

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          if (element.name.text === CONSTANT_NAME) importsConstant = true;
        }
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === COMPOSER &&
      node.arguments.some((arg) => ts.isIdentifier(arg) && arg.text === CONSTANT_NAME)
    ) {
      sites.push({
        file: path,
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        args: node.arguments.map(resolveArg),
      });
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return { sites, importsConstant };
}

// -------------------------------------------------------------------------------------------------
// The rule.
// -------------------------------------------------------------------------------------------------

/** The class list a site's resolved arguments carry, in argument order, before the merge. */
export function composedInput(site: Site): string {
  return site.args
    .map((arg) => (arg.kind === "unresolvable" ? "" : arg.text))
    .filter(Boolean)
    .join(" ");
}

/** The class list the REAL `cn` produces for a site's resolved arguments. */
export function mergedOutput(site: Site): string {
  return cn(...site.args.map((arg) => (arg.kind === "unresolvable" ? "" : arg.text)));
}

/**
 * Every way a site breaks the rule, each rendered as one readable line for the failure diff.
 *
 * Two shapes, both fail-closed:
 *   1. an argument this gate cannot resolve, and
 *   2. a `pb-*` present in the arguments whose expected survivor is missing from, or different in,
 *      the merged output — i.e. tailwind-merge deleted or replaced it.
 */
export function violationsOf(site: Site): string[] {
  const found: string[] = [];

  for (const arg of site.args) {
    if (arg.kind === "unresolvable") {
      found.push(
        `${site.file}:${site.line} — \`${COMPOSER}()\` composes \`${CONSTANT_NAME}\` beside an ` +
          `argument this gate cannot resolve (${arg.shape}). An argument nobody can read statically ` +
          `is one nobody can check by reading either; keep the list to string literals and the constant.`,
      );
    }
  }
  if (found.length > 0) return found;

  const expected = pbByVariant(composedInput(site));
  const output = mergedOutput(site);
  const survived = pbByVariant(output);

  for (const [variant, className] of expected) {
    const actual = survived.get(variant);
    if (actual === className) continue;
    found.push(
      `${site.file}:${site.line} — \`${className}\` ` +
        (actual === undefined
          ? "was DELETED by the merge"
          : `was replaced by \`${actual}\` in the merge`) +
        ` (variant \`${variant || "<none>"}\`). Merged output: "${output}"`,
    );
  }
  return found;
}

// -------------------------------------------------------------------------------------------------
// Run the scan once, at module scope, exactly as `sticky-offset.test.ts` does.
// -------------------------------------------------------------------------------------------------

const walked: string[] = [];
const importers: string[] = [];
const sites: Site[] = [];
for (const file of collectSourceFiles(SRC_DIR)) {
  const name = label(file);
  walked.push(name);
  const result = scanText(name, readFileSync(file, "utf8"));
  if (result.importsConstant) importers.push(name);
  sites.push(...result.sites);
}

/** The positive half, built from the scan: file → the `pb-*` terms that survived, per variant. */
const survivingPbByFile: Record<string, Record<string, string>> = {};
for (const site of sites) {
  survivingPbByFile[site.file] = Object.fromEntries(pbByVariant(mergedOutput(site)));
}

describe("WR-04 — no sticky-bar clearance is deleted by the class merge", () => {
  // ---------------------------------------------------------------------------------------------
  // GUARD THE GUARD, ASSERTED FIRST. The real assertion is `toEqual([])`, which a scanner that
  // visited nothing satisfies perfectly. `sticky-offset.test.ts`'s probe (c) measured exactly that
  // direction on the sibling gate: the rule itself PASSED over a tree it never opened.
  // ---------------------------------------------------------------------------------------------

  it("walked a real source tree rather than an empty one", () => {
    expect(
      walked.length,
      'the scanner walked 0 files. Every assertion in this file is "a list was empty" or "a count ' +
        'was N", and a scan that opened nothing satisfies the first perfectly.',
    ).toBeGreaterThanOrEqual(50);
  });

  it("reached both files that compose the clearance, by name", () => {
    // Named explicitly so a count of 2 cannot come from a scanner that read two other files.
    expect(walked, "the scanner never reached the checkout page").toContain(
      "src/app/listings/[id]/book/page.tsx",
    );
    expect(walked, "the scanner never reached the listing detail layout").toContain(
      "src/app/listings/[id]/(detail)/layout.tsx",
    );
  });

  it("its comment stripper is not a no-op on this tree", () => {
    // `(detail)/page.tsx` names the constant in PROSE and nowhere else — it explains that the
    // clearance moved to the layout (`:493`). If the stripper became a pass-through that mention
    // would still not match a `CallExpression`, but the file's shape is the exact hazard this suite
    // has been bitten by, and this is the cheapest place to notice the stripper died.
    const path = resolve(SRC_DIR, "app/listings/[id]/(detail)/page.tsx");
    const raw = readFileSync(path, "utf8");
    expect(raw, "the sentinel file stopped naming the constant in prose").toContain(CONSTANT_NAME);
    expect(
      stripComments(raw),
      "the comment stripper left a prose mention of the constant in the source it hands the AST",
    ).not.toContain(CONSTANT_NAME);
  });

  // ---------------------------------------------------------------------------------------------
  // The two pinned counts. Separate on purpose — see the constants' docblock.
  // ---------------------------------------------------------------------------------------------

  it(`has exactly ${EXPECTED_IMPORT_FILES} files importing ${CONSTANT_NAME}`, () => {
    expect(
      importers.length,
      `the number of files importing \`${CONSTANT_NAME}\` changed. This is not a failure of the ` +
        "merge-order rule — every site may still be safe — it is a prompt to read the new one and " +
        "update this count deliberately, in the commit that changes it. Importers found: " +
        importers.join(", "),
    ).toBe(EXPECTED_IMPORT_FILES);
  });

  it(`has exactly ${EXPECTED_CN_SITES} cn() sites composing ${CONSTANT_NAME}`, () => {
    expect(
      sites.length,
      `the number of \`${COMPOSER}()\` calls composing \`${CONSTANT_NAME}\` changed. Read this ` +
        "beside the importer count above: the two dropping TOGETHER means a call site abandoned the " +
        "constant; this one dropping ALONE means the constant is still imported but is no longer " +
        "composed through `cn` — so this rule silently stopped covering it, which is the direction " +
        "no absence assertion can notice. Sites found: " +
        sites.map((s) => `${s.file}:${s.line}`).join(", "),
    ).toBe(EXPECTED_CN_SITES);
  });

  // ---------------------------------------------------------------------------------------------
  // The rule, and its positive half.
  // ---------------------------------------------------------------------------------------------

  it("deletes no pb-* clearance at any site", () => {
    const violations = sites.flatMap(violationsOf);
    expect(
      violations,
      "`cn` is tailwind-merge, not class concatenation: it DELETES a `pb-*` that precedes a " +
        "conflicting `py-*`, before any CSS exists. A clearance composed BEFORE the layout string is " +
        "therefore not a smaller padding — it is NO padding, and the page's last rows sit under the " +
        `fixed bar. Keep \`${CONSTANT_NAME}\` AFTER the "… py-8 sm:py-12" argument, and \`sm:pb-20\` ` +
        "AFTER `sm:py-12`.",
    ).toEqual([]);
  });

  it("still merges to the measured class list at every site", () => {
    // The pair to the assertion above, and it fires from the other direction on the same edit: the
    // rule says "nothing was deleted", this says "the result is still the one that was measured on
    // the live route". A hoist trips both, and the two failures read differently on purpose.
    expect(
      survivingPbByFile,
      "the `pb-*` classes that survive the merge changed. If this is deliberate, re-measure the " +
        "route (the rendered padding at 320 / 639 / 640 / 768 / 1023 / 1280, both themes) and update " +
        "the table — do not adjust it to match a diff.",
    ).toEqual(EXPECTED_SURVIVING_PB);
  });

  // ---------------------------------------------------------------------------------------------
  // Both-directions self-tests, over fixtures never written to disk — so what the real assertion
  // runs is the same code path the fixtures prove.
  // ---------------------------------------------------------------------------------------------

  it("flags the hoisted order and spares the shipped one", () => {
    const shipped = scanText(
      "fake-shipped.tsx",
      'export const A = <div className={cn("mx-auto px-4 py-8 sm:py-12", STICKY_BAR_CLEARANCE, "sm:pb-20 lg:pb-12")} />;\n',
    );
    expect(shipped.sites).toHaveLength(1);
    expect(violationsOf(shipped.sites[0])).toEqual([]);

    const hoisted = scanText(
      "fake-hoisted.tsx",
      'export const A = <div className={cn(STICKY_BAR_CLEARANCE, "mx-auto px-4 py-8 sm:py-12", "sm:pb-20 lg:pb-12")} />;\n',
    );
    expect(hoisted.sites).toHaveLength(1);
    const violations = violationsOf(hoisted.sites[0]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("`pb-20` was DELETED by the merge");
  });

  it("flags the folded constant harder than the plain hoist, which is why it was rejected", () => {
    // Shape A, simulated on a fixture rather than on the tree: fold `sm:pb-20` into the constant and
    // hoist. The killer is `py-*`, so the same edit now deletes BOTH terms instead of one.
    const site: Site = {
      file: "fake-shape-a.tsx",
      line: 1,
      args: [
        { kind: "constant", name: CONSTANT_NAME, text: "pb-20 sm:pb-20" },
        { kind: "literal", text: "mx-auto px-4 py-8 sm:py-12" },
        { kind: "literal", text: "lg:pb-12" },
      ],
    };
    const violations = violationsOf(site);
    expect(violations).toHaveLength(2);
    expect(violations.join("\n")).toContain("`pb-20` was DELETED");
    expect(violations.join("\n")).toContain("`sm:pb-20` was DELETED");
  });

  it("does not mistake a class or a call named in a comment for a real site", () => {
    const commented = scanText(
      "fake-comment.tsx",
      [
        "// `cn(STICKY_BAR_CLEARANCE, \"py-8\")` would delete the clearance outright.",
        "/* import { STICKY_BAR_CLEARANCE } from \"@/lib/design/measurements\"; */",
        'export const A = <div className="w-full" />; // trailing cn(STICKY_BAR_CLEARANCE, "py-8")',
      ].join("\n"),
    );
    expect(commented.sites).toEqual([]);
    expect(commented.importsConstant).toBe(false);
  });

  it("treats an argument it cannot resolve as a failure, not as a pass", () => {
    // The safe direction, and the same one `sticky-offset.test.ts` takes with an offset it cannot
    // parse. A template literal here would hide an interpolated `py-*` from the whole rule.
    const dynamic = scanText(
      "fake-dynamic.tsx",
      "export const A = <div className={cn(STICKY_BAR_CLEARANCE, `px-4 ${pad}`)} />;\n",
    );
    expect(dynamic.sites).toHaveLength(1);
    expect(violationsOf(dynamic.sites[0])[0]).toContain("cannot resolve");

    const conditional = scanText(
      "fake-conditional.tsx",
      'export const A = <div className={cn(STICKY_BAR_CLEARANCE, wide ? "py-12" : "py-8")} />;\n',
    );
    expect(violationsOf(conditional.sites[0])[0]).toContain("cannot resolve");
  });

  it("is not a site when cn() does not compose the constant", () => {
    // The scope, asserted rather than assumed: this gate follows the CONSTANT. A bare `pb-20`
    // literal is a different finding and is out of subject by construction (see NOT COVERED).
    const bare = scanText(
      "fake-bare.tsx",
      'export const A = <div className={cn("pb-20", "px-4 py-8")} />;\n',
    );
    expect(bare.sites).toEqual([]);
  });

  it("reads an import only where one is written", () => {
    const named = scanText(
      "fake-import.tsx",
      'import { STICKY_BAR_CLEARANCE } from "@/lib/design/measurements";\n',
    );
    expect(named.importsConstant).toBe(true);

    const other = scanText(
      "fake-other-import.tsx",
      'import { STICKY_BAR_HEIGHT } from "@/lib/design/measurements";\n',
    );
    expect(other.importsConstant).toBe(false);
  });

  it("parses variants and pb-* utilities the way the rule assumes", () => {
    expect(variantOf("pb-20")).toBe("");
    expect(variantOf("sm:pb-20")).toBe("sm");
    expect(variantOf("dark:lg:pb-0")).toBe("dark:lg");

    expect(isPaddingBottom("pb-20")).toBe(true);
    expect(isPaddingBottom("sm:pb-20")).toBe(true);
    expect(isPaddingBottom("!pb-20")).toBe(true);
    expect(isPaddingBottom("pb-[80px]")).toBe(true);
    // …and refuses the neighbours that are NOT this rule's subject.
    expect(isPaddingBottom("py-8")).toBe(false);
    expect(isPaddingBottom("px-4")).toBe(false);
    expect(isPaddingBottom("mb-20")).toBe(false);
    expect(isPaddingBottom("pbx-20")).toBe(false);

    // Last-wins per variant, which is what a deliberate override means.
    expect(Object.fromEntries(pbByVariant("pb-4 pb-20 sm:pb-8 sm:pb-20 lg:pb-12"))).toEqual({
      "": "pb-20",
      sm: "sm:pb-20",
      lg: "lg:pb-12",
    });
  });

  it("uses the REAL cn, so a change to the merge configuration reaches this gate", () => {
    // Not a tautology: `cn` is `extendTailwindMerge`d (`src/lib/utils.ts:41-47`), and the whole rule
    // is a claim about THAT function's behaviour. Importing it rather than modelling it is what makes
    // this file a gate over the app instead of a gate over a description of the app.
    expect(cn("pb-20", "py-8")).toBe("py-8");
    expect(cn("py-8", "pb-20")).toBe("py-8 pb-20");
    expect(STICKY_BAR_CLEARANCE).toMatch(/^pb-/);
  });
});
