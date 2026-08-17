// AC#9 and AC#10 — the placeholder notice cannot be silently deleted, and real-looking terms cannot
// be silently drafted (11-UI-SPEC § `/terms` and `/privacy`).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// AC#4'S COUPLING, WHICH IS THE WHOLE REASON THIS FILE EXISTS AS WELL AS THE PAGES
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// **THE PLACEHOLDER NOTICE IS REMOVED ONLY IN THE SAME COMMIT THAT SUPPLIES REAL LEGAL COPY, AND
// THAT COMMIT DELETES THESE ASSERTIONS WITH IT — NOT BEFORE.**
//
// The two files this is about:
//
//     src/app/(legal)/terms/page.tsx
//     src/app/(legal)/privacy/page.tsx
//
// Both carry the same rule in their own headers, so it is findable from either end. If you are here
// because this gate went red while you were removing the notice: that is the gate working. Delete the
// notice and these assertions together, in the commit that adds the real document, and not in any
// other commit.
//
// WHY THE COUPLING RATHER THAN A PLAIN "DON'T DELETE THIS": a page that LOOKS like terms and is
// filler makes a claim to users the business has not made (T-11-FAKETERMS). Removing the notice
// alone produces exactly that page. Removing the gate alone removes the only thing that would ever
// notice — nothing else in this repository reads legal prose. Either half on its own is the failure
// mode, which is why they are tied to each other rather than each being independently forbidden.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY IT IS AN AST WALK OVER TEXT, AND NOT A GREP OVER THE FILE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Phase 11 has been tripped ELEVEN times by a prescribed text grep that a correct file's own
// explanation satisfies. This gate would be the twelfth and worst instance: it bans the vocabulary of
// legal drafting, and the most natural thing for a maintainer to write in a comment is *why* that
// vocabulary is banned. So:
//
//   1. `stripComments` (the shared quote-aware scanner, `tests/design/helpers/strip-comments.ts`)
//      removes every comment first — line, trailing and block, including the `{/* … */}` JSX form.
//      NOT a `/\*[\s\S]*?\*/` regex: `strip-comments.test.ts` records what one of those does to
//      `accept="image/*"` — it eats 86 lines and then vouches for source it never read.
//   2. What remains is parsed, and only three node kinds are read: JSX TEXT, STRING LITERALS, and the
//      flattened value of a `+` chain of string literals. An identifier, a class name, an import
//      specifier and a type annotation are all invisible.
//
// THE `+` CHAIN IS NOT DECORATION. Both pages hold their notice body as `"…" + "…"` across lines,
// which is the shape long copy naturally takes under a line-length limit. A per-literal scan alone
// would miss a banned phrase straddling the join, and that is an ordinary editing accident rather
// than an adversarial one. The flattened value is scanned as a fourth chunk, so the join is covered
// without joining UNRELATED nodes together (which would invent phrases nobody wrote).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// CLOSURE IS STATED FORWARDS: EVERY PAGE FOUND UNDER `(legal)` MUST BE DECLARED HERE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The obvious phrasing — "the two declared pages must satisfy the rules" — is satisfied perfectly by
// an inventory somebody emptied, and by a third legal page nobody added a row for. Phase 11 has now
// measured that failure four times (11-02 probe (d), `sticky-offset.test.ts` probe (c),
// `card-pattern-coverage.test.ts` probe (c), and 11-16's probe (e), where a blinded scanner passed
// 15 of 16 assertions INCLUDING the file's headline closure assertion).
//
// So the direction here is: WALK the group, and require every `page.tsx` the walk finds to have a row
// in `LEGAL_PAGES`. An emptied inventory then fails on the pages it no longer covers, and a new
// `/cookies` page fails until somebody writes its sentinel down. The reverse direction is asserted
// too, so a page that MOVED fails rather than silently dropping out of scope.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — SIX PROBES, ALL RUN. 17 August 2026. GREEN IS 21 PASSED.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`), and
// the prior wave's standing instruction is stricter than that: confirm each probe goes RED on a
// broken tree AND GREEN on a correct one before trusting it. Command for all six:
// `npx vitest run --config vitest.design.config.ts tests/design/legal-copy.test.ts`
//
//   (a) AC#9 — THE NOTICE DELETED FROM `/terms`. Both copy constants AND the whole notice block
//       removed from `terms/page.tsx`, which is what a real deletion looks like (removing only the
//       JSX leaves the sentinel alive as an unreferenced constant, and the string assertion would
//       still pass — the id count is what catches that half). **2 failed / 19 passed**, both on
//       `/terms` and neither on `/privacy`, which is the correct blast radius:
//
//         AssertionError: src/app/(legal)/terms/page.tsx no longer contains the exact string
//         "not FitOut's terms of service". AC#4: the placeholder notice is removed ONLY in the same
//         commit that supplies real legal copy… : expected 0 to be greater than or equal to 1
//         AssertionError: src/app/(legal)/terms/page.tsx declares
//         data-testid="legal-placeholder-notice" 0 times; it must be exactly one… expected +0 to be 1
//
//       Reverted → 21 passed.
//
//   (b) AC#10 — REAL-LOOKING TERMS DRAFTED ON `/privacy`. `<p className="text-body">You agree to
//       these terms.</p>` added above the `<h2>`. **2 failed / 19 passed**, naming the term, the
//       file, the LINE, and quoting the sentence:
//
//         AssertionError: src/app/(legal)/privacy/page.tsx contains clause language. The five terms
//         are you agree, hereby, shall, warrant, indemnif… : expected [ Array(1) ] to deeply equal []
//         +   "src/app/(legal)/privacy/page.tsx:153 — `you agree` in \"You agree to these terms.\"",
//
//       The second failure is the discovered-pages form of the same clause, which is what would fire
//       on an undeclared page. Reverted → 21 passed.
//
//   (c) VACUITY — THE SCANNER BLINDED. `LEGAL_DIR` re-pointed at `src/app/(legal-nope)`, so the walk
//       opens nothing. **11 failed / 10 passed**, and the ONE line worth reading in this whole block
//       is which assertion survived:
//
//         AssertionError: the walk found no legal pages at all. A banned-term scan over zero files
//         reports a perfectly clean tree, permanently… : expected 0 to be greater than or equal to 2
//         AssertionError: LEGAL_PAGES names a file the walk never found… expected [ …(2) ] to
//         deeply equal []
//         AssertionError: src/app/(legal)/terms/page.tsx was never scanned: expected undefined to
//         be defined                                             (×5, one per by-name assertion)
//
//       **`finds none across every page the walk discovered` PASSED** — a perfect clean sheet over a
//       scan of nothing, permanently, and indistinguishable from a real clean run. That is the
//       phase's recurring vacuity result for the fourth time, and it is the entire argument for the
//       ≥2-file floor, the ≥10-chunk floor, the by-name reach assertions and the positive control
//       that requires BOTH collection paths to find real text. Reverted → 21 passed.
//
//   (d) CLOSURE — AN UNDECLARED THIRD PAGE. `src/app/(legal)/cookies/page.tsx` created with a bare
//       `<h1>` and no row in `LEGAL_PAGES` — the "just one more legal page" edit. **2 failed / 19
//       passed**, and the forward direction is what caught it:
//
//         AssertionError: a page under `src/app/(legal)/` has no row in LEGAL_PAGES, so nothing
//         checks its notice or its copy… : expected [ 'src/app/(legal)/cookies/page.tsx' ] to
//         deeply equal []
//         AssertionError: src/app/(legal)/cookies/page.tsx yielded 0 readable text chunks…
//         expected 2 to be greater than 10
//
//       A backwards-only gate ("both declared pages are fine") would have been GREEN here. Deleted
//       → 21 passed.
//
//   (e) VACUITY — THE INVENTORY EMPTIED. `LEGAL_PAGES` replaced with `[]` (the declarations kept
//       alive under an unused binding, so the probe measured the EMPTY INVENTORY and not a compile
//       error). **1 failed / 12 passed — of THIRTEEN tests, not twenty-one.** Both `it.each` groups
//       simply vanish, which is what makes an emptied inventory invisible to a count-free reading:
//
//         AssertionError: a page under `src/app/(legal)/` has no row in LEGAL_PAGES… :
//         expected [ …(2) ] to deeply equal []
//         +   "src/app/(legal)/privacy/page.tsx",
//         +   "src/app/(legal)/terms/page.tsx",
//
//       This is the probe the header's closure paragraph exists for. Restored → 21 passed.
//
//   (f) THE NOTICE HAND-ROLLED. `terms/page.tsx`'s `<PanelCard tone="muted">` replaced with
//       `<div className="rounded-xl bg-muted p-4">` and the import dropped — the notice's copy, its
//       hook and its position all intact, only its surface gone. **1 failed / 20 passed**:
//
//         AssertionError: src/app/(legal)/terms/page.tsx does not import { PanelCard } from
//         "@/components/patterns/panel-card".: expected false to be true
//
//       **BOTH AC#9 ASSERTIONS STAYED GREEN**, which is the whole argument for that third group: the
//       "unmissable" half of T-11-FAKETERMS's mitigation can be removed without touching a single
//       string this gate would otherwise check. Reverted → 21 passed.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • IT READS SOURCE, NOT THE RENDERED PAGE. It cannot tell you the notice rendered, that it was
//     visible, that it was above the fold, or that it was not `display:none`. Plan 11-15 MEASURED
//     those in a browser at 320×568 in both themes and wrote the numbers into its SUMMARY; this file
//     asserts none of them. `e2e/` is where a rendered assertion would live.
//   • IT CANNOT JUDGE WHETHER A SENTENCE *READS* AS AN OBLIGATION. The five banned terms are a crude
//     proxy, deliberately so — see `BANNED_TERMS`. Prose that avoids all five and still reads as a
//     binding promise passes this gate completely. **A human decides that**, and the pages' own
//     headers say what the standard is: every bullet describes what the published document will
//     cover, and none describes what FitOut does, charges or is liable for.
//   • A BANNED TERM ASSEMBLED AT RUNTIME IS INVISIBLE. `` `you ${verb}` ``, `["you","agree"].join(" ")`
//     or a phrase imported from another module would all pass. The `+` chain is covered because it is
//     the shape these files actually use; the rest is not, and dynamic legal copy would be a much
//     larger problem than this gate.
//   • IT SAYS NOTHING ABOUT THE OUTLINE'S TRUTHFULNESS. That the published document will cover what a
//     bullet says it covers is unfalsifiable until the document exists.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, type Dirent } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

import { SELECTOR_IDS } from "@/lib/design/selector-contract";

import { stripComments } from "./helpers/strip-comments";

/** The scanned tree, as ONE constant — probe (c) is a one-line edit here. */
const LEGAL_DIR = resolve(process.cwd(), "src/app/(legal)");

/** The declared selector id the notice hangs off. Cross-checked against the contract below. */
const NOTICE_ID = "legal-placeholder-notice";

/** The pattern module the notice must compose. See `PANEL` below for why this is asserted at all. */
const PANEL_MODULE = "@/components/patterns/panel-card";
const PANEL_BINDING = "PanelCard";

/**
 * THE FIVE BANNED TERMS, AND THE ONE-LINE REASON THEY ARE THIS CRUDE.
 *
 * This is a vocabulary ban, not a semantic one, and it is meant to be: it fails LOUDLY the moment
 * somebody "helpfully" drafts real-looking terms, which is the single most likely way these two
 * placeholder pages stop being placeholders without anybody deciding that they should.
 *
 * Matched case-insensitively and as SUBSTRINGS, which is deliberate on all five — `indemnif` catches
 * both `indemnify` and `indemnification`, `warrant` catches `warranty` and `warranties`. The cost is
 * that `shall` also matches inside `marshall` and `warrant` inside `warrantable`; neither word has
 * any business on a page whose whole body is a list of section names, so the over-match is accepted
 * rather than narrowed with word boundaries that would then miss `indemnification`.
 */
const BANNED_TERMS = [
  "you agree",
  "hereby",
  "shall",
  "warrant",
  "indemnif",
] as const;

type LegalPage = {
  /** Repo-relative, forward-slashed. */
  readonly file: string;
  /**
   * THE SENTINEL, asserted by string EQUALITY as a substring of a text chunk.
   *
   * A fuzzy match ("contains the word placeholder") survives a rewrite that softens the disclaimer
   * into something a reader skims past, which is the realistic way this notice dies — not deletion.
   */
  readonly sentinel: string;
  /** The `<h1>`, used as the JSX-TEXT half of the positive control. */
  readonly headline: string;
};

/**
 * THE DECLARED LEGAL PAGES.
 *
 * Emptying this list does NOT make the file pass — closure runs forwards (see the header). Both rows
 * are also the positive control: each names a string that must be FOUND, so a scanner that read
 * nothing fails here rather than reporting a clean tree.
 */
const LEGAL_PAGES: readonly LegalPage[] = [
  {
    file: "src/app/(legal)/terms/page.tsx",
    sentinel: "not FitOut's terms of service",
    headline: "Terms of Service",
  },
  {
    file: "src/app/(legal)/privacy/page.tsx",
    sentinel: "not FitOut's privacy policy",
    headline: "Privacy Policy",
  },
];

/** Repo-relative, forward-slashed. See `leak.test.ts:157-165` for why the normalisation matters. */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

/** Every `page.tsx` under the group. `[]` on a missing directory — 11-02's rule, see probe (c). */
function collectPages(dir: string, out: string[] = []): string[] {
  let entries: Dirent<string>[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    // A broken scan surfaces as ONE named guard-the-guard failure, not as a stack trace that buries
    // which gate went quiet.
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectPages(full, out);
    else if (entry.name === "page.tsx") out.push(full);
  }
  return out;
}

/** One readable chunk of authored text, with the line it came from in the ORIGINAL file. */
type Chunk = { readonly text: string; readonly line: number; readonly kind: "jsx" | "literal" | "concat" };

export type PageScan = {
  readonly file: string;
  /** Every JSX text node, string literal and flattened `+` chain, comments already removed. */
  readonly chunks: readonly Chunk[];
  /** `file:line — "term" in "…"` for every banned term found in a chunk. */
  readonly banned: readonly string[];
  /** How many `data-testid="legal-placeholder-notice"` attributes the module declares. */
  readonly noticeIds: number;
  /** `moduleSpecifier` → the set of EXPORTED names imported from it. */
  readonly imports: ReadonlyMap<string, ReadonlySet<string>>;
};

/**
 * Scan one module's TEXT.
 *
 * `(path, text)` rather than `(path)` on purpose: the self-tests below feed it fixtures that are
 * never written to disk, so the thing the real assertions run is the same code path the fixtures
 * prove (`leak.test.ts:208-212`'s rule).
 */
export function scanSource(path: string, raw: string): PageScan {
  const text = stripComments(raw);
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );

  const chunks: Chunk[] = [];
  const imports = new Map<string, Set<string>>();
  let noticeIds = 0;

  const lineOf = (node: ts.Node): number =>
    sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  /**
   * The value of a `+` chain whose every leaf is a plain string literal, or `null`.
   *
   * Nothing else flattens — a `+` with an identifier in it is not authored copy this gate can read,
   * and pretending otherwise would report phrases nobody wrote.
   */
  const flattenConcat = (node: ts.Node): string | null => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isParenthesizedExpression(node)) return flattenConcat(node.expression);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = flattenConcat(node.left);
      const right = flattenConcat(node.right);
      return left === null || right === null ? null : left + right;
    }
    return null;
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      const set = imports.get(specifier) ?? new Set<string>();
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        // `propertyName` is the EXPORTED name when the import is aliased; `name` is the local one.
        for (const element of bindings.elements) set.add((element.propertyName ?? element.name).text);
      }
      if (node.importClause?.name) set.add("default");
      imports.set(specifier, set);
    }

    // The declared hook, counted the way `selector-contract.test.ts` collects ids: a JSX attribute
    // whose value is a string LITERAL. `data-testid={id}` is deliberately not counted — the contract
    // cannot see it either, so counting it here would disagree with the gate next door.
    if (ts.isJsxAttribute(node)) {
      const name = ts.isIdentifier(node.name) ? node.name.text : node.name.getText(sf);
      const init = node.initializer;
      if (name === "data-testid" && init && ts.isStringLiteral(init) && init.text === NOTICE_ID) {
        noticeIds += 1;
      }
    }

    if (ts.isJsxText(node)) {
      const value = node.text.trim();
      if (value.length > 0) chunks.push({ text: value, line: lineOf(node), kind: "jsx" });
    } else if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      if (node.text.length > 0) chunks.push({ text: node.text, line: lineOf(node), kind: "literal" });
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      const joined = flattenConcat(node);
      if (joined !== null) chunks.push({ text: joined, line: lineOf(node), kind: "concat" });
    }

    ts.forEachChild(node, visit);
  };
  visit(sf);

  const banned: string[] = [];
  for (const chunk of chunks) {
    const haystack = chunk.text.toLowerCase();
    for (const term of BANNED_TERMS) {
      if (haystack.includes(term)) {
        const excerpt = chunk.text.length > 90 ? `${chunk.text.slice(0, 90)}…` : chunk.text;
        banned.push(`${path}:${chunk.line} — \`${term}\` in "${excerpt}"`);
      }
    }
  }

  return { file: path, chunks, banned, noticeIds, imports };
}

/** Does this module import `binding` from `module`? */
export function importsBinding(scan: PageScan, module: string, binding: string): boolean {
  return scan.imports.get(module)?.has(binding) === true;
}

/** Every chunk containing `needle`, verbatim. String equality on a substring, never a fuzzy match. */
export function chunksContaining(scan: PageScan, needle: string): readonly Chunk[] {
  return scan.chunks.filter((c) => c.text.includes(needle));
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The scan, run ONCE at module level; the `it()` blocks only assert.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const discovered: string[] = collectPages(LEGAL_DIR).map(label);
const scans = new Map<string, PageScan>();
for (const file of discovered) {
  scans.set(file, scanSource(file, readFileSync(resolve(process.cwd(), file), "utf8")));
}

/** Pages the walk found that nobody declared. THE closure direction — see the header. */
const undeclared = discovered.filter((f) => !LEGAL_PAGES.some((p) => p.file === f));
/** Declared rows the walk never found. The reverse, so a MOVED page fails rather than dropping out. */
const missing = LEGAL_PAGES.filter((p) => !discovered.includes(p.file)).map((p) => p.file);

describe("guard-the-guard — the scanner reached both pages and read real text", () => {
  // ASSERTED FIRST. Every real assertion below is either "a list was empty" or "a count was one",
  // and a scan that opened nothing satisfies the first kind perfectly.

  it("found at least two page.tsx files under src/app/(legal)", () => {
    expect(
      discovered.length,
      "the walk found no legal pages at all. A banned-term scan over zero files reports a " +
        "perfectly clean tree, permanently, and is indistinguishable from a real clean run.",
    ).toBeGreaterThanOrEqual(2);
  });

  it("declares every page the walk found, and finds every page it declares", () => {
    expect(
      undeclared,
      "a page under `src/app/(legal)/` has no row in LEGAL_PAGES, so nothing checks its notice or " +
        "its copy. Add a row with its sentinel sentence — closure is stated FORWARDS here on " +
        "purpose, so an emptied inventory fails instead of passing.",
    ).toEqual([]);
    expect(
      missing,
      "LEGAL_PAGES names a file the walk never found. If it moved, move the row in the same commit.",
    ).toEqual([]);
  });

  it("read a non-zero number of text chunks out of every page", () => {
    for (const file of discovered) {
      const scan = scans.get(file);
      expect(scan, `${file} was never scanned`).toBeDefined();
      expect(
        scan!.chunks.length,
        `${file} yielded 0 readable text chunks. A parser that produced nothing passes both real ` +
          "assertion groups below with a clean sheet.",
      ).toBeGreaterThan(10);
    }
  });

  it("reaches BOTH collection paths on the real files — JSX text and string literals", () => {
    // THE POSITIVE CONTROL. Both real groups are absence/equality assertions; this one fails if the
    // collector stops seeing either node kind, which is the way a walk quietly narrows.
    for (const page of LEGAL_PAGES) {
      const scan = scans.get(page.file);
      expect(scan, `${page.file} was never scanned`).toBeDefined();
      const jsx = scan!.chunks.filter((c) => c.kind === "jsx" && c.text === page.headline);
      expect(
        jsx.length,
        `${page.file} — the collector never saw the <h1> "${page.headline}" as JSX TEXT. It reads ` +
          "string literals only, so JSX prose is now invisible to the banned-term scan.",
      ).toBeGreaterThanOrEqual(1);

      const literals = scan!.chunks.filter((c) => c.kind === "literal");
      expect(
        literals.length,
        `${page.file} — the collector saw no string literals at all.`,
      ).toBeGreaterThan(5);
    }
  });

  it("keys its hook off the id `selector-contract.ts` already declares", () => {
    // The `key_links` edge. Renaming the id in the contract without renaming it here would leave two
    // files quietly describing different systems.
    expect(SELECTOR_IDS, `\`${NOTICE_ID}\` is not a declared selector id`).toContain(NOTICE_ID);
  });
});

describe("AC#9 — the placeholder notice is present, once, and says what it must", () => {
  it.each(LEGAL_PAGES)("$file carries its sentinel sentence verbatim", (page) => {
    const scan = scans.get(page.file);
    expect(scan, `${page.file} was never scanned`).toBeDefined();
    const hits = chunksContaining(scan!, page.sentinel);
    expect(
      hits.length,
      `${page.file} no longer contains the exact string "${page.sentinel}".\n\n` +
        "AC#4: the placeholder notice is removed ONLY in the same commit that supplies real legal " +
        "copy, and that commit deletes these assertions with it. If you are removing the notice " +
        "without adding the real document, stop — a page that looks like terms and is filler makes " +
        "a claim to users the business has not made.",
    ).toBeGreaterThanOrEqual(1);
  });

  it.each(LEGAL_PAGES)("$file declares the notice hook exactly once", (page) => {
    const scan = scans.get(page.file);
    expect(
      scan!.noticeIds,
      `${page.file} declares data-testid="${NOTICE_ID}" ${scan!.noticeIds} times; it must be ` +
        "exactly one. Zero means the notice is gone (see AC#4 above); two means a selector that " +
        "was supposed to identify one element now identifies two.",
    ).toBe(1);
  });

  it.each(LEGAL_PAGES)("$file renders the notice as the PanelCard pattern, not a hand-rolled box", (page) => {
    // NOT strictly AC#9, and included anyway: the test id alone is satisfied by a bare `<div>` with
    // the right attribute, which is a notice that has quietly lost its surface, its padding and its
    // muted tone — i.e. the "unmissable" half of T-11-FAKETERMS's mitigation, gone, with the string
    // assertions above still perfectly green.
    //
    // Asserted HERE rather than by adding two rows to `card-pattern-coverage.test.ts`: that file's
    // `EXPECTED_SURFACES` is derived from the 11-UI-SPEC's three `Replaces` lists and these pages are
    // in none of them, so extending it would break its own stated derivation. The container claim
    // belongs to the surface that makes it.
    const scan = scans.get(page.file);
    expect(
      importsBinding(scan!, PANEL_MODULE, PANEL_BINDING),
      `${page.file} does not import { ${PANEL_BINDING} } from "${PANEL_MODULE}".`,
    ).toBe(true);
  });
});

describe("AC#10 — neither page's body carries clause language", () => {
  it.each(LEGAL_PAGES)("$file uses none of the five banned terms", (page) => {
    const scan = scans.get(page.file);
    expect(
      scan!.banned,
      `${page.file} contains clause language. The five terms are ${BANNED_TERMS.join(", ")} — a ` +
        "crude ban, deliberately, because it fires the moment somebody drafts real-looking terms on " +
        "a page whose own notice says it is not a binding agreement. If the real document has " +
        "arrived, delete these assertions and the notice in ONE commit (AC#4).",
    ).toEqual([]);
  });

  it("finds none across every page the walk discovered, declared or not", () => {
    // The forward-closure form of the same clause: a third legal page fails the row check above AND
    // is scanned here regardless, so it cannot ship un-policed even for one commit.
    const all = discovered.flatMap((f) => scans.get(f)?.banned ?? []);
    expect(all).toEqual([]);
  });
});

describe("both-directions self-tests, over fixtures never written to disk", () => {
  it("flags a banned phrase in JSX text", () => {
    const scan = scanSource(
      "fake-drafted.tsx",
      "export const A = () => <p>You agree to the following</p>;",
    );
    expect(scan.banned).toHaveLength(1);
    expect(scan.banned[0]).toContain("you agree");
    expect(scan.banned[0]).toContain("fake-drafted.tsx:1");
  });

  it("spares a banned word that appears only in a comment — all three syntaxes", () => {
    // THE EXEMPTION, and the reason this file strips before it parses. The most likely place any of
    // the five words appears in a correct tree is a comment explaining that they are banned.
    for (const fixture of [
      'const A = 1; // the word "shall" is banned here',
      '// hereby, and indemnify, are also banned\nconst A = 1;',
      '/* a maintainer explaining that "you agree" must not appear */\nconst A = 1;',
      'const A = () => <div>{/* no warranty language here either */}<span>ok</span></div>;',
    ]) {
      const scan = scanSource("fake-comment.tsx", fixture);
      expect(scan.banned, `a comment was read as copy in: ${fixture}`).toEqual([]);
    }
  });

  it("flags a banned phrase that straddles a `+` join, and reports it once per chain", () => {
    // The shape both real pages use for their notice body. A per-literal scan alone misses this.
    const scan = scanSource(
      "fake-split.tsx",
      'const BODY = "By using this service you " + "agree to the following.";',
    );
    expect(scan.banned, "a phrase split across a `+` join went unreported").toHaveLength(1);
    expect(scan.banned[0]).toContain("you agree");
    expect(scan.chunks.filter((c) => c.kind === "concat")).toHaveLength(1);
  });

  it("matches case-insensitively and as a substring", () => {
    const shouty = scanSource("fake-shouty.tsx", 'const A = "The parties HEREBY covenant";');
    expect(shouty.banned).toHaveLength(1);

    const inflected = scanSource(
      "fake-inflected.tsx",
      'const A = "indemnification and any warranties";',
    );
    // `indemnif` + `warrant`, both as substrings of longer words.
    expect(inflected.banned).toHaveLength(2);
  });

  it("does not read identifiers, class names or import specifiers as copy", () => {
    // The other direction: a false positive here would make the gate noise, and noise is how a gate
    // stops being read. `shallow` is an identifier; the module specifier is a string literal but
    // carries none of the five terms.
    const scan = scanSource(
      "fake-code.tsx",
      [
        'import { shallowEqual } from "@/lib/shallow-warrantless";',
        "const shallCheck = shallowEqual;",
        'export const A = () => <p className="text-body">Nothing operative here.</p>;',
      ].join("\n"),
    );
    // The import specifier IS a string literal and DOES contain `warrant` — which is correct
    // behaviour for a substring ban, and is why the real pages import nothing so named. Recorded as
    // an assertion rather than a caveat so a future narrowing has to change a line here.
    expect(scan.banned.map((b) => b.split("—")[1]?.trim())).toEqual([
      '`shall` in "@/lib/shallow-warrantless"',
      '`warrant` in "@/lib/shallow-warrantless"',
    ]);
  });

  it("fails AC#9's sentinel check on a page that dropped the notice", () => {
    // The AC#9 half, exercised through the same function the real assertion uses.
    const gutted = scanSource(
      "fake-gutted.tsx",
      [
        'export const metadata = { title: "Terms of Service" };',
        "export default function P() {",
        '  return <><h1 className="text-display">Terms of Service</h1><p>Section one.</p></>;',
        "}",
      ].join("\n"),
    );
    expect(chunksContaining(gutted, "not FitOut's terms of service")).toEqual([]);
    expect(gutted.noticeIds).toBe(0);
    expect(importsBinding(gutted, PANEL_MODULE, PANEL_BINDING)).toBe(false);

    // …and the positive twin, so this is not merely "a fixture with nothing in it fails".
    const intact = scanSource(
      "fake-intact.tsx",
      [
        `import { ${PANEL_BINDING} } from "${PANEL_MODULE}";`,
        "export default function P() {",
        `  return <div data-testid="${NOTICE_ID}"><${PANEL_BINDING} tone="muted">` +
          `<p>{"Placeholder — these are not FitOut's terms of service."}</p></${PANEL_BINDING}></div>;`,
        "}",
      ].join("\n"),
    );
    expect(chunksContaining(intact, "not FitOut's terms of service")).toHaveLength(1);
    expect(intact.noticeIds).toBe(1);
    expect(importsBinding(intact, PANEL_MODULE, PANEL_BINDING)).toBe(true);
    expect(intact.banned).toEqual([]);
  });

  it("counts a dynamic data-testid as absent, matching the selector contract next door", () => {
    const dynamic = scanSource("fake-dynamic.tsx", "const A = () => <p data-testid={id} />;");
    expect(dynamic.noticeIds).toBe(0);
    const braced = scanSource(
      "fake-braced.tsx",
      `const A = () => <p data-testid={"${NOTICE_ID}"} />;`,
    );
    // `selector-contract.test.ts:375` records the same result for the same reason: its collector
    // reads string-literal initializers only, and this file must agree with it or the two gates
    // disagree about what "declared" means.
    expect(braced.noticeIds).toBe(0);
  });
});
