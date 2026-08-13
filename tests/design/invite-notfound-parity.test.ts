// AC#22 / T-11-ORACLE — the invite route's two inactive entrances read ONE declaration, and the 404
// branch that could tell them apart is unreachable.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE SECURITY PROPERTY, IN THE PHASE'S OWN WORDS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// 08-06 deliberately folded "malformed token" and "unknown token" onto ONE identical response so the
// invite page could not become a probe oracle. The invite token is a shared, guessable-LENGTH bearer
// credential sitting in a URL; a distinguishable not-found page reintroduces exactly that oracle,
// because an attacker learns which token shapes exist by which page they land on.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS GATE ASSERTS ON IMPORTS RATHER THAN ON RENDERED TEXT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Two literals that happen to match today are two things that drift tomorrow. A gate that rendered
// both surfaces and compared the strings would be GREEN on the day somebody rewords one of them and
// RED only after they reword the other — i.e. it would report the drift as a failure of the SECOND,
// correct, edit. So the property asserted here is structural: there is exactly ONE declaration of
// each sentence in `src/`, and every surface that shows it reaches that declaration by import.
//
// Deliberate consequence, and the plan calls it out: changing the VALUE in `src/lib/group/rsvp.ts`
// leaves this gate green. That is correct — one source, one value, nothing to drift. The words
// themselves are pinned once, as a literal, in `tests/group/rsvp-rate-limit.test.ts`.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// MEASURED: IDENTICAL MARKUP IS NOT IDENTICAL RESPONSE, WHICH IS WHY ASSERTION 6 EXISTS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `curl` against `next start` (production build, Next 16.2.7, plan 11-19), token substituted out of
// each body before comparison:
//
//   /invite/does-not-exist          → 200, 31060 B   (MALFORMED — fails inviteTokenSchema)
//   /invite/234567890ABCDEFGHJKM    → 200, 31072 B   (well-formed, names nothing)
//   /invite/QRSTVWXYZ0123456789A    → 200, 31072 B   (well-formed, names nothing)
//
//   unknown-A vs unknown-B  → BYTE-IDENTICAL
//   unknown-A vs malformed  → BYTE-IDENTICAL
//
// The only variation between the three raw bodies is the token itself, which appears twice in each
// (the caller already knows it). That is the 08-06 property, measured end to end rather than argued.
//
// AND THE PART THAT MARKUP PARITY CANNOT FIX: Next serves a `not-found.tsx` boundary with HTTP 404
// and the page's inactive branch with HTTP 200, and no `not-found.tsx` can set a status. A human
// cannot tell those two apart; a script reading status codes tells them apart instantly — and a
// script is the only thing that walks a 20-symbol token space. So the load-bearing control is
// assertion 6: NOTHING under the invite segment calls `notFound()`, so the 404 branch cannot be
// reached at all. `not-found.tsx` is the belt behind that braces.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — FOUR WAYS, ALL REAL (14 August 2026). GREEN IS 8 PASSED.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`).
// Command for all four:
//   npx vitest run --config vitest.design.config.ts tests/design/invite-notfound-parity.test.ts
//
//   (a) THE RETYPED SENTENCE. `INACTIVE_TITLE`'s value pasted as a literal into `not-found.tsx`'s
//       JSX in place of the imported identifier. 2 failed / 6 passed — the two halves the plan
//       predicted, each naming the file AND the line:
//
//         FAIL … > each sentence is declared exactly once in src/, and that once is rsvp.ts
//         AssertionError: INACTIVE_TITLE's sentence appears as renderable text in 2 places:
//         src/app/(public)/invite/[token]/not-found.tsx:44, src/lib/group/rsvp.ts:135. A second copy
//         is not untidiness — it is the drift that becomes the oracle: … : expected 2 to be 1
//
//         FAIL … > neither invite surface retypes a sentence it could import
//         AssertionError: expected [ Array(1) ] to deeply equal []
//         + [
//         +   "src/app/(public)/invite/[token]/not-found.tsx:44 — contains the INACTIVE_TITLE
//         +    sentence as renderable text. It is a prop or an import away; a literal here is a
//         +    second source.",
//         + ]
//
//       Reverted → 8 passed.
//
//   (b) THE REWORD (the plan's second watched red, and it is watched to prove a NON-failure).
//       `INACTIVE_TITLE` in `rsvp.ts` changed to "This invite has expired". 8 passed — green, and
//       correctly so: there is one source and one value, so nothing can be out of step with anything.
//       A gate that compared two rendered strings would have been green here too, while telling you
//       nothing; this one is green for a reason you can state.
//
//       What DOES go red on that edit is the copy pin: `npx vitest run
//       tests/group/rsvp-rate-limit.test.ts` → **6 failed**, not the 1 predicted, because five of that
//       file's unknown-token and malformed-token assertions compare the action's result against the
//       pinned sentence and the sixth is the pin itself:
//
//         AssertionError: expected 'This invite has expired. Ask the orga…'
//                             to be 'This invite is no longer active. Ask …'
//
//       So the words have six independent witnesses and the WIRING has this file. Reverted.
//
//   (c) VACUITY. `SRC_DIR` re-pointed at `src-nope`, a directory that does not exist. 4 failed /
//       4 passed, and the FIRST failure is the guard, by construction:
//
//         FAIL … > the scanners actually read the trees they are asserting about
//         AssertionError: the source scan read 0 files. "appears exactly once" over a scanner that
//         opened nothing passes perfectly — which is the exact failure mode this assertion exists to
//         prevent.: expected +0 to be greater than or equal to 100
//
//       This is the probe 11-13 recorded as the sharpest of the phase: an emptied inventory satisfies
//       a forward scan and an inverse `toEqual([])` equally well. Reverted → 8 passed.
//
//   (d) POSITIVE CONTROL. The `INACTIVE_TITLE` import deleted from `not-found.tsx` (and the JSX left
//       referencing it, which is what a half-finished edit looks like). 1 failed / 7 passed:
//
//         FAIL … > both invite surfaces import both sentences from the one declaration
//         AssertionError: a surface that renders the inactive state without importing its copy is
//         either showing different words or showing none. Both are the oracle.: expected
//         [ Array(1) ] to deeply equal []
//         + [ "src/app/(public)/invite/[token]/not-found.tsx — does not import INACTIVE_TITLE from
//         +    @/lib/group/rsvp" ]
//
//       Without this one, the "exactly once" and the "no retyped sentence" assertions are both
//       satisfiable by a file that shows no copy at all. Reverted → 8 passed.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// NOT COVERED — stated so the next reader under-trusts this file:
//   • It proves the copy has ONE SOURCE. It does not prove the two surfaces are VISUALLY
//     indistinguishable. They render the same component (assertion 5 pins that structurally), but
//     "a visitor cannot tell which one they landed on" is a human check, and it was made by hand
//     against `next start` — recorded in 11-19-SUMMARY.md, not here.
//   • It says nothing about the RESPONSE HEADERS. The bodies were compared by hand (above); nothing
//     in CI re-measures them.
//   • Assertion 6 scopes reachability to the invite segment plus the one shared component it renders.
//     A `notFound()` raised in a module further down the import graph would be invisible to it.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

import { INACTIVE_BODY, INACTIVE_TITLE } from "@/lib/group/rsvp";

/**
 * The tree this gate is about. A `const` rather than an inline literal so probe (c) — repointing it
 * at a directory that does not exist — is a one-character edit and the guard is what catches it.
 *
 * `rsvp.ts` is imported directly above, which is legal HERE because it reaches no database: it pulls
 * `drizzle-orm`'s `sql` tag and `isoUtc` from `bookings-query.ts`, whose own imports are all
 * type-only. `vitest.design.config.ts` still declares no `globalSetup` and no `setupFiles`, and this
 * file adds neither — that config's header is a hard constraint, not a preference.
 */
const SRC_DIR = resolve(process.cwd(), "src");

/** The declaration's home. Named, so "exactly once" cannot be satisfied by some other file. */
const DECLARATION = "src/lib/group/rsvp.ts";

/** The two entrances to the one inactive state. */
const INVITE_PAGE = "src/app/(public)/invite/[token]/page.tsx";
const INVITE_NOT_FOUND = "src/app/(public)/invite/[token]/not-found.tsx";

/** The component both of them render, and the module it lives in. */
const SHARED_SURFACE = "src/components/group/invite-card.tsx";
const SHARED_MODULE = "@/components/group/invite-card";
const SHARED_BINDING = "InviteInactive";

/** The module the two sentences are declared in, as an import specifier. */
const RSVP_MODULE = "@/lib/group/rsvp";

/** The segment whose 404 branch must stay unreachable, plus the component it renders. */
const INVITE_SEGMENT = "src/app/(public)/invite";

/** The scanner must see at least this many source files, or it is not scanning (guard-the-guard). */
const MIN_SRC_FILES = 100;

/** Windows: `relative()` returns backslashes, and every assertion here compares POSIX paths. */
const posix = (abs: string): string => relative(process.cwd(), abs).split("\\").join("/");

/**
 * Every `.ts`/`.tsx` under `dir`, recursively. Returns `[]` for a missing directory rather than
 * throwing, so a moved tree surfaces as ONE named assertion about the scan instead of a stack trace
 * that buries which gate went quiet (the `selector-contract.test.ts` idiom).
 */
function collectFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function parse(path: string, text: string): ts.SourceFile {
  return ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/** One piece of text a USER could end up reading, and where it is. */
type Renderable = { readonly line: number; readonly text: string };

/**
 * Every string a reader of the app could see, by PARSING rather than matching.
 *
 * Four node kinds, and each is a way the sentence could genuinely be retyped:
 *   • `StringLiteral` / `NoSubstitutionTemplateLiteral` — `const x = "…"`, a prop value.
 *   • template HEAD/MIDDLE/TAIL — the literal chunks of `` `… ${x} …` `` (this is how a third copy
 *     of the joined action sentence would arrive).
 *   • `JsxText` — `<h1>This invite is no longer active</h1>`, which is not a string literal at all
 *     and which a "string literal" scan would miss on the one surface that matters most.
 *
 * A COMMENT is none of these, which is the point: this file's own header quotes both sentences
 * nowhere, but `page.tsx`'s does discuss them, and a regex over source text would count that.
 */
export function collectRenderable(path: string, text: string): Renderable[] {
  const sf = parse(path, text);
  const found: Renderable[] = [];
  const push = (node: ts.Node, value: string) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    found.push({ line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, text: value });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) push(node, node.text);
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node))
      push(node, node.text);
    else if (ts.isJsxText(node)) push(node, node.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** `module specifier → the named bindings imported from it`. Default/namespace imports are ignored. */
export function collectImports(path: string, text: string): Map<string, Set<string>> {
  const sf = parse(path, text);
  const imports = new Map<string, Set<string>>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const spec = stmt.moduleSpecifier.text;
    const bindings = imports.get(spec) ?? new Set<string>();
    const named = stmt.importClause?.namedBindings;
    if (named && ts.isNamedImports(named)) {
      for (const el of named.elements) bindings.add(el.name.text);
    }
    imports.set(spec, bindings);
  }
  return imports;
}

/**
 * Lines that CALL `notFound()`. A call, not a mention: `not-found.tsx` is a not-found RENDERER and
 * names the function in its own header, and the whole reachability claim would be unassertable if
 * saying the word counted as raising it.
 */
export function collectNotFoundCalls(path: string, text: string): number[] {
  const sf = parse(path, text);
  const lines: number[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "notFound"
    ) {
      lines.push(sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return lines;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The tree, scanned ONCE at module level; the `it()` blocks only assert.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const sourceFiles = collectFiles(SRC_DIR).map(posix);
const textByFile = new Map<string, string>(
  collectFiles(SRC_DIR).map((abs) => [posix(abs), readFileSync(abs, "utf8")]),
);
const renderableByFile = new Map<string, Renderable[]>(
  [...textByFile].map(([file, text]) => [file, collectRenderable(file, text)]),
);
const importsByFile = new Map<string, Map<string, Set<string>>>(
  [...textByFile].map(([file, text]) => [file, collectImports(file, text)]),
);

/** Where a sentence is written out, as `file:line`, across the whole scanned tree. */
function sitesOf(sentence: string): string[] {
  const hits: string[] = [];
  for (const [file, renderables] of renderableByFile) {
    for (const r of renderables) if (r.text.includes(sentence)) hits.push(`${file}:${r.line}`);
  }
  return hits;
}

const titleSites = sitesOf(INACTIVE_TITLE);
const bodySites = sitesOf(INACTIVE_BODY);

/** Files under the invite segment, plus the one shared component those files render. */
const reachabilityScope = [
  ...sourceFiles.filter((f) => f.startsWith(INVITE_SEGMENT)),
  ...(textByFile.has(SHARED_SURFACE) ? [SHARED_SURFACE] : []),
];

describe("AC#22 / T-11-ORACLE — the invite 404 and the invite inactive state read one declaration", () => {
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // GUARD THE GUARD, ASSERTED FIRST. Every assertion below is an "exactly once" or a `toEqual([])`,
  // and a scan that opened nothing satisfies all of them perfectly (probe (c)).
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  it("the scanners actually read the trees they are asserting about", () => {
    expect(
      sourceFiles.length,
      `the source scan read ${sourceFiles.length} files. "appears exactly once" over a scanner that ` +
        `opened nothing passes perfectly — which is the exact failure mode this assertion exists to ` +
        `prevent.`,
    ).toBeGreaterThanOrEqual(MIN_SRC_FILES);

    // The four files every other assertion is about, named — a count survives the whole tree being
    // replaced by 200 other files.
    for (const required of [DECLARATION, INVITE_PAGE, INVITE_NOT_FOUND, SHARED_SURFACE]) {
      expect(sourceFiles, `the scan never opened ${required}`).toContain(required);
      expect(
        (renderableByFile.get(required) ?? []).length,
        `${required} parsed to ZERO renderable strings, which no real file in this tree does — the ` +
          `parser is failing silently on it.`,
      ).toBeGreaterThan(0);
    }

    // POSITIVE CONTROL. If the scanner cannot find the sentence where it demonstrably IS, then
    // "found nowhere else" is a statement about the scanner, not about the tree.
    expect(
      titleSites.some((s) => s.startsWith(`${DECLARATION}:`)),
      `the scan did not find INACTIVE_TITLE's sentence in ${DECLARATION}, where it is declared. ` +
        `Every "exactly once" below is vacuous until this passes.`,
    ).toBe(true);
    expect(bodySites.some((s) => s.startsWith(`${DECLARATION}:`))).toBe(true);

    expect(reachabilityScope.length, "the reachability scan resolved no files").toBeGreaterThanOrEqual(3);
  });

  it("both sentences are exported from @/lib/group/rsvp and are non-empty", () => {
    // Imported, not read off disk: this is the only assertion in the file that proves the module can
    // actually be LOADED, which is what every consumer does at runtime.
    expect(typeof INACTIVE_TITLE).toBe("string");
    expect(typeof INACTIVE_BODY).toBe("string");
    expect(INACTIVE_TITLE.trim().length).toBeGreaterThan(0);
    expect(INACTIVE_BODY.trim().length).toBeGreaterThan(0);
    expect(INACTIVE_TITLE).not.toBe(INACTIVE_BODY);
  });

  it("each sentence is declared exactly once in src/, and that once is rsvp.ts", () => {
    for (const [name, sites] of [
      ["INACTIVE_TITLE", titleSites],
      ["INACTIVE_BODY", bodySites],
    ] as const) {
      expect(
        sites.length,
        `${name}'s sentence appears as renderable text in ${sites.length} places: ${sites.join(", ")}. ` +
          `A second copy is not untidiness — it is the drift that becomes the oracle: the invite token ` +
          `is a bearer credential in a URL, so every way of failing to resolve one must produce the ` +
          `same words, and a reword applied to one copy tells an attacker which tokens exist. Import ` +
          `it from ${RSVP_MODULE} instead.`,
      ).toBe(1);
      expect(sites[0]?.startsWith(`${DECLARATION}:`)).toBe(true);
    }
  });

  it("both invite surfaces import both sentences from the one declaration", () => {
    const violations: string[] = [];
    for (const file of [INVITE_PAGE, INVITE_NOT_FOUND]) {
      const bindings = importsByFile.get(file)?.get(RSVP_MODULE) ?? new Set<string>();
      for (const id of ["INACTIVE_TITLE", "INACTIVE_BODY"]) {
        if (!bindings.has(id)) violations.push(`${file} — does not import ${id} from ${RSVP_MODULE}`);
      }
    }
    expect(
      violations,
      "a surface that renders the inactive state without importing its copy is either showing " +
        "different words or showing none. Both are the oracle.",
    ).toEqual([]);
  });

  it("both invite surfaces render the SAME inactive component", () => {
    // The structural half of "a visitor cannot tell which one they landed on". Two files rendering
    // their own markup can be made to match today; two files rendering one component cannot diverge
    // at all. This is the assertion that turns the plan's prose requirement into a fact.
    const violations: string[] = [];
    for (const file of [INVITE_PAGE, INVITE_NOT_FOUND]) {
      const bindings = importsByFile.get(file)?.get(SHARED_MODULE) ?? new Set<string>();
      if (!bindings.has(SHARED_BINDING)) {
        violations.push(
          `${file} — does not import { ${SHARED_BINDING} } from "${SHARED_MODULE}". If this surface ` +
            `has grown its own copy of the inactive markup, the two entrances to the inactive state ` +
            `can now look different, which is what 08-06 folded them together to prevent.`,
        );
      }
    }
    expect(violations).toEqual([]);
  });

  it("neither invite surface retypes a sentence it could import", () => {
    const violations: string[] = [];
    for (const file of [INVITE_PAGE, INVITE_NOT_FOUND, SHARED_SURFACE]) {
      for (const r of renderableByFile.get(file) ?? []) {
        for (const [name, sentence] of [
          ["INACTIVE_TITLE", INACTIVE_TITLE],
          ["INACTIVE_BODY", INACTIVE_BODY],
        ] as const) {
          if (r.text.includes(sentence)) {
            violations.push(
              `${file}:${r.line} — contains the ${name} sentence as renderable text. It is a prop or ` +
                `an import away; a literal here is a second source.`,
            );
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("nothing under the invite segment raises a 404 (the branch that could tell them apart)", () => {
    const violations: string[] = [];
    for (const file of reachabilityScope) {
      const lines = collectNotFoundCalls(file, textByFile.get(file) ?? "");
      for (const line of lines) violations.push(`${file}:${line}`);
      const bindings = importsByFile.get(file)?.get("next/navigation") ?? new Set<string>();
      if (bindings.has("notFound")) violations.push(`${file} — imports notFound from next/navigation`);
    }
    expect(
      violations,
      "a `notFound()` under this segment is reachable, and Next serves that boundary with HTTP 404 " +
        "while the page's inactive branch serves 200. Identical markup does not close that: a script " +
        "reading status codes distinguishes the two instantly, and a script is the only thing that " +
        "walks a 20-symbol token space. If a 404 is genuinely needed here, the copy parity is not " +
        "enough and the decision needs to be made explicitly (T-11-ORACLE).",
    ).toEqual([]);
  });

  it("the scanners flag a retyped sentence and spare a comment, an import and a prop", () => {
    // BOTH DIRECTIONS, on synthetic sources, through the SAME functions the real assertions run —
    // so the fixtures prove the code path above rather than a lookalike (`leak.test.ts:208-212`).
    const inline = collectRenderable(
      "fixture.tsx",
      ['export const A = () => <h1>' + INACTIVE_TITLE + "</h1>;"].join("\n"),
    );
    expect(inline.some((r) => r.text.includes(INACTIVE_TITLE))).toBe(true);

    const asString = collectRenderable("fixture.ts", `export const A = "${INACTIVE_TITLE}";`);
    expect(asString.some((r) => r.text.includes(INACTIVE_TITLE))).toBe(true);

    const inTemplate = collectRenderable("fixture.ts", "export const A = `" + INACTIVE_TITLE + ". ${x}`;");
    expect(inTemplate.some((r) => r.text.includes(INACTIVE_TITLE))).toBe(true);

    const commented = collectRenderable(
      "fixture.ts",
      [`// ${INACTIVE_TITLE}`, `/* ${INACTIVE_BODY} */`, "export const A = 1;"].join("\n"),
    );
    expect(commented.some((r) => r.text.includes(INACTIVE_TITLE) || r.text.includes(INACTIVE_BODY))).toBe(
      false,
    );

    const importer = collectRenderable(
      "fixture.tsx",
      [
        `import { INACTIVE_TITLE } from "${RSVP_MODULE}";`,
        "export const A = () => <h1>{INACTIVE_TITLE}</h1>;",
      ].join("\n"),
    );
    expect(importer.some((r) => r.text.includes(INACTIVE_TITLE))).toBe(false);

    // The import scanner, both directions.
    const named = collectImports("fixture.ts", `import { INACTIVE_TITLE, INACTIVE_BODY } from "${RSVP_MODULE}";`);
    expect([...(named.get(RSVP_MODULE) ?? [])].sort()).toEqual(["INACTIVE_BODY", "INACTIVE_TITLE"]);
    const aliased = collectImports("fixture.ts", `import * as rsvp from "${RSVP_MODULE}";`);
    expect([...(aliased.get(RSVP_MODULE) ?? [])]).toEqual([]);

    // The reachability scanner, both directions: a CALL counts, a mention in prose does not.
    expect(collectNotFoundCalls("fixture.ts", "import { notFound } from 'next/navigation';\nnotFound();"))
      .toEqual([2]);
    expect(collectNotFoundCalls("fixture.ts", "// nothing here calls notFound() on any path\nexport const A = 1;"))
      .toEqual([]);
  });
});
