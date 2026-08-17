// AC#21 — `src/app/global-error.tsx` renders in FitOut's colours without a stylesheet, and reaches
// nothing.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// HALF OF THIS GATE IS ALREADY PAID FOR, AND SAYING SO IS THE POINT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The UI-SPEC states the rule as two assertions: no hand-typed colour, and the generated token module
// is imported. The FIRST is already enforced — `tests/design/leak.test.ts` walks `src/app/**`
// (`LEAK_SCAN_PREFIXES`), so a hex literal, an `rgb(`/`oklch(` call or an arbitrary px type size in
// `global-error.tsx` fails `npm run build` today, with no line of test added here. Duplicating it
// would produce a second, weaker copy of a shipped gate.
//
// So this file asserts only what leak.test.ts CANNOT see, and each clause is a distinct failure that
// a raw-value scan is blind to:
//
//   1. the token module is IMPORTED — a file with no colour at all passes the leak gate perfectly;
//   2. the count of class attributes is ZERO — a utility class is not a raw value, it is a string
//      naming a rule that does not exist in this document, and it paints as nothing;
//   3. no import of the persistence layer — the build-time property, not a style one (see below);
//   4. no import of the framework's client-side link component — the router lives inside the tree
//      that just failed;
//   5. the document is really rendered here (`<html>` and `<body>`), because every negative above is
//      satisfied perfectly by a file that renders nothing.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY CLAUSE 3 IS A BUILD PROPERTY RATHER THAN TIDINESS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `/_not-found` is prerendered, so `next build` renders part of this tree with no infrastructure
// present. A style-less document that reached the persistence layer on a prerenderable path would
// make the build try to open a connection, which is CI job 1's DB-free property gone. The import
// specifier is therefore checked as an IMPORT — through the AST — and not as a substring, so that a
// comment discussing the database module is not a failure and an aliased re-export is not a bypass.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — RUN 17 AUGUST 2026, BOTH GATES, BOTH DIRECTIONS, REVERTED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Command for all four: `npx vitest run --config vitest.design.config.ts
// tests/design/global-error.test.ts tests/design/leak.test.ts`.
// GREEN IS 38 PASSED (13 here + 25 in leak.test.ts) — both counts measured separately, because a
// combined total cannot tell you which file went quiet.
//
//   (a) THE PRESCRIBED PROBE. `className="text-red-500"` added to the panel element in
//       `src/app/global-error.tsx`. **2 failed / 36 passed** — one failure from each gate, which is
//       exactly the pairing the UI-SPEC claims. Verbatim:
//
//         tests/design/global-error.test.ts › carries zero class attributes
//         AssertionError: global-error.tsx carries class attributes, which name rules that do not
//         exist in this document: it renders its own <html> and receives no global stylesheet, so a
//         utility class paints as nothing. Inline style objects only (AC#21).: expected
//         [ Array(1) ] to deeply equal []
//         + [ "src/app/global-error.tsx:209 className" ]
//
//         tests/design/leak.test.ts › finds no raw design value under src/app/** or src/components/**
//         + [ "src/app/global-error.tsx:209 numbered Tailwind palette class `text-red-500` — use a
//             design token (DS-13 / D-15)" ]
//
//       Reverted → 38 passed.
//
//   (a2) THE HALF THAT PROVES THE TWO GATES ARE NOT REDUNDANT, and it is the more likely mistake by
//       far: the same attribute holding a SEMANTIC token class, `className="text-muted-foreground"`
//       — which is what every other file in this app writes, and which is not a raw value at all.
//       **1 failed / 37 passed**: this file alone, with the identical message. leak.test.ts stayed
//       green. Without clause 2 the likeliest way to break this page would ship unseen.
//       Reverted → 38 passed.
//
//   (b) THE IMPORT. The token-module import deleted and the colours replaced with a local constant
//       object holding the same six values — the shape a "drop the dependency" edit takes.
//       **3 failed / 35 passed**:
//
//         AssertionError: global-error.tsx must read its colours from the generated token module
//         (DS-12 / D-18) …: expected [ 'react' ] to include '@/lib/design/tokens.generated'
//         AssertionError: global-error.tsx grew an import. …: expected [ 'react' ] to deeply equal
//         [ …(2) ]
//         AssertionError: expected [ …(6) ] to deeply equal []
//         + "src/app/global-error.tsx:101 raw hex colour `#ffffff` — use a design token (DS-13 / D-15)"
//         + …five more, one per colour this document needs
//
//       The six hex reports are the whole argument for DS-12 / D-18 in one diff: the values a
//       hand-written copy would freeze are exactly the ones the generated module keeps honest.
//       Reverted → 38 passed.
//
//   (c) VACUITY. `GLOBAL_ERROR_PATH` pointed at `src/app/global-error-nope.tsx`. **5 failed /
//       33 passed**, and every failure is a GUARD or a POSITIVE — not one of the three negative
//       clauses:
//
//         AssertionError: src/app/global-error.tsx does not exist. Every other assertion in this
//         file is a claim about its contents and passes vacuously without it: expected false to be
//         true
//         AssertionError: src/app/global-error.tsx parsed to zero statements: expected 0 to be
//         greater than 0
//         AssertionError: … expected [] to include '@/lib/design/tokens.generated'
//         AssertionError: global-error.tsx must render its own <html> …: expected [] to include 'html'
//         AssertionError: global-error.tsx grew an import. …: expected [] to deeply equal [ …(2) ]
//
//       RECORDED HONESTLY, BECAUSE IT IS THE INTERESTING PART: the three NEGATIVE clauses — zero
//       class attributes, no persistence-layer import, no client-link import — ALL PASSED, silently
//       and perfectly, over a file that does not exist. A `toEqual([])` cannot notice that its input
//       was emptied. That is the scan-of-nothing failure mode plan 11-17's probe (d) and plan
//       11-15's probe (e) recorded before it, and it is precisely why `existsSync` and the statement
//       count are asserted FIRST, and why the positive clauses (the token import found, `<html>` and
//       `<body>` found, the import list pinned) sit alongside the negatives rather than the
//       negatives standing alone. Reverted → 38 passed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   • IT READS SOURCE, NOT PIXELS. That the inline styles produce a LEGIBLE page — contrast,
//     spacing, a touch target that is really 44px — is not checked anywhere in this repository yet.
//     Plan 11-22 baselines this surface; that is the layer that can see it.
//   • It cannot prove the file ever RENDERS. `global-error.tsx` fires only when the root layout
//     throws, and nothing in this repository can currently force that, which is also why the missing
//     document `<title>` is recorded in the file's own header as a gap rather than guessed at.
//   • Clause 3 is an IMPORT check on THIS FILE, not a transitive one. A module that itself reaches
//     the persistence layer would pass. Today the only import besides React's type is the generated
//     token module, whose contents are literals and whose import graph is empty — asserted below by
//     pinning the import list to exactly those two, so a third import is a named failure rather than
//     an unexamined risk.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

/** The file under test, as ONE constant — probe (c) above is a one-line edit here. */
const GLOBAL_ERROR_PATH = resolve(process.cwd(), "src/app/global-error.tsx");
const LABEL = "src/app/global-error.tsx";

const TOKEN_MODULE = "@/lib/design/tokens.generated";
const DB_MODULE = "@/lib/db";
const LINK_MODULE = "next/link";

function parse(fileName: string, text: string): ts.SourceFile {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/** Every module specifier this file imports from, in source order. */
function importsOf(sf: ts.SourceFile): string[] {
  const out: string[] = [];
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    out.push(stmt.moduleSpecifier.text);
  }
  return out;
}

/**
 * Every JSX class attribute, as `file:line attrName`.
 *
 * BOTH SPELLINGS. React's is `className`; the DOM's own attribute name is `class`, and JSX accepts
 * it on a host element with a warning rather than an error — so a gate that checked only the React
 * spelling would wave through the one a hand-written HTML paste would produce. Both are equally
 * useless in this document.
 */
function classAttributesIn(label: string, sf: ts.SourceFile): string[] {
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      for (const attr of node.attributes.properties) {
        if (!ts.isJsxAttribute(attr)) continue;
        const name = attr.name.getText(sf);
        if (name === "className" || name === "class") {
          const line = sf.getLineAndCharacterOfPosition(attr.getStart(sf)).line + 1;
          out.push(`${label}:${line} ${name}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** Every host element tag name rendered by the file. */
function hostTagsIn(sf: ts.SourceFile): string[] {
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      out.push(node.tagName.getText(sf));
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** The `"use client"` directive, as a PROLOGUE statement — not as a substring anywhere in the file. */
function hasUseClientPrologue(sf: ts.SourceFile): boolean {
  for (const stmt of sf.statements) {
    if (!ts.isExpressionStatement(stmt)) return false;
    const expr = stmt.expression;
    if (!ts.isStringLiteral(expr)) return false;
    if (expr.text === "use client") return true;
  }
  return false;
}

const EXISTS = existsSync(GLOBAL_ERROR_PATH);
const SOURCE = EXISTS ? readFileSync(GLOBAL_ERROR_PATH, "utf8") : "";
const SF = parse(LABEL, SOURCE);
const IMPORTS = importsOf(SF);
const CLASS_ATTRS = classAttributesIn(LABEL, SF);
const TAGS = hostTagsIn(SF);

describe("AC#21 — global-error.tsx is styled from tokens, by hand, and reaches nothing", () => {
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // GUARD THE GUARD, ASSERTED FIRST. Four of the clauses below are negatives, and a file that does
  // not exist satisfies every one of them. Probe (c) in the header measured exactly that.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("finds the file it is supposed to be policing", () => {
    expect(
      EXISTS,
      `${LABEL} does not exist. Every other assertion in this file is a claim about its contents ` +
        "and passes vacuously without it.",
    ).toBe(true);
  });

  it("really parsed it", () => {
    // A glob can match a file while the parse silently yields an empty statement list (a changed
    // ScriptKind, a parser flag) — which would make every negative clause green for no real reason.
    expect(SF.statements.length, `${LABEL} parsed to zero statements`).toBeGreaterThan(0);
    expect(SOURCE.length).toBeGreaterThan(0);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // The five real clauses.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("imports the generated token module — the only legal way it can have a colour", () => {
    expect(
      IMPORTS,
      "global-error.tsx must read its colours from the generated token module (DS-12 / D-18): it " +
        "renders before any stylesheet, so it needs literals, and a literal typed by hand drifts — " +
        "which already happened once, to the listing map's coral. leak.test.ts stops the hand-typed " +
        "colour; nothing but this stops the file having no colour at all.",
    ).toContain(TOKEN_MODULE);
  });

  it("carries zero class attributes", () => {
    expect(
      CLASS_ATTRS,
      "global-error.tsx carries class attributes, which name rules that do not exist in this " +
        "document: it renders its own <html> and receives no global stylesheet, so a utility class " +
        "paints as nothing. Inline style objects only (AC#21).",
    ).toEqual([]);
  });

  it("imports nothing from the persistence layer", () => {
    const db = IMPORTS.filter((m) => m === DB_MODULE || m.startsWith(`${DB_MODULE}/`));
    expect(
      db,
      "global-error.tsx reaches the database module. `/_not-found` is prerendered, so `next build` " +
        "renders part of this tree with no infrastructure — a style-less document on a prerenderable " +
        "path that opens a connection is CI job 1's DB-free property gone (T-11-GLOBALDB).",
    ).toEqual([]);
  });

  it("imports the framework's client-side link component nowhere", () => {
    expect(
      IMPORTS.filter((m) => m === LINK_MODULE),
      "global-error.tsx uses the client router's link component. That router lives inside the tree " +
        "that just failed; the route out must be a plain anchor, so the browser performs a real " +
        "document load rather than a transition back into the failure.",
    ).toEqual([]);
  });

  it("renders its own document and is a client component", () => {
    // The positive half. Without it every negative above is satisfied by a file that renders nothing.
    expect(TAGS, "global-error.tsx must render its own <html> — it replaces the root layout").toContain(
      "html",
    );
    expect(TAGS, "…and its own <body>").toContain("body");
    expect(
      hasUseClientPrologue(SF),
      "an error boundary is rendered from a React class boundary and its `reset` closes over client " +
        "state, so this file must carry the `use client` directive in its prologue",
    ).toBe(true);
  });

  it("pins the import list, so clause 3 cannot be bypassed transitively", () => {
    // NOT COVERED bullet 3, made mechanical. Clause 3 checks THIS file's imports; a third import
    // could reach the persistence layer through a module this gate never opens. Two imports is the
    // whole graph today: React's type-only import and the generated token module, whose contents are
    // literals. A third one is a named failure requiring somebody to look at what it drags in.
    expect(
      IMPORTS.slice().sort(),
      "global-error.tsx grew an import. Check what it reaches before bumping this list: this file " +
        "renders on a path `next build` prerenders, with no infrastructure present.",
    ).toEqual(["react", TOKEN_MODULE].sort());
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // BOTH-DIRECTIONS SELF-TESTS, on fixtures never written to disk — so the code path the real
  // assertions run is the same one the fixtures prove.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("flags a synthetic source that carries a class attribute", () => {
    const bad = parse("fake-bad.tsx", 'export const A = <div className="p-4">x</div>;');
    expect(classAttributesIn("fake-bad.tsx", bad)).toEqual(["fake-bad.tsx:1 className"]);
    // …and the DOM spelling, which JSX accepts on a host element with only a warning.
    const badRaw = parse("fake-raw.tsx", 'export const A = <div class="p-4">x</div>;');
    expect(classAttributesIn("fake-raw.tsx", badRaw)).toEqual(["fake-raw.tsx:1 class"]);
  });

  it("does NOT flag a synthetic source that uses only an inline style object", () => {
    const good = parse(
      "fake-good.tsx",
      "export const A = <div style={{ padding: 4 }}>x</div>;",
    );
    expect(classAttributesIn("fake-good.tsx", good)).toEqual([]);
    // …and the walk really visited the fixture, so the empty result is a result and not a no-op.
    expect(hostTagsIn(good)).toEqual(["div"]);
  });

  it("does not mistake the word in a comment or a string for a class attribute", () => {
    const prose = parse(
      "fake-prose.tsx",
      [
        "// this file must carry no className attribute",
        'const note = "className";',
        "export const A = <div style={{ padding: 4 }}>{note}</div>;",
      ].join("\n"),
    );
    expect(classAttributesIn("fake-prose.tsx", prose)).toEqual([]);
  });

  it("reads the directive from the prologue, not from anywhere in the file", () => {
    const real = parse("fake-client.tsx", '"use client";\nexport const A = 1;');
    expect(hasUseClientPrologue(real)).toBe(true);
    const mentioned = parse(
      "fake-mentioned.tsx",
      'const s = "use client";\nexport const A = s;',
    );
    expect(hasUseClientPrologue(mentioned)).toBe(false);
    const commented = parse("fake-commented.tsx", '// "use client"\nexport const A = 1;');
    expect(hasUseClientPrologue(commented)).toBe(false);
  });

  it("resolves an import specifier rather than matching a substring", () => {
    const commented = parse(
      "fake-db-comment.tsx",
      ['// deliberately imports nothing from "@/lib/db"', 'import { x } from "react";'].join("\n"),
    );
    expect(importsOf(commented)).toEqual(["react"]);
    const real = parse("fake-db.tsx", 'import { db } from "@/lib/db";');
    expect(importsOf(real)).toEqual(["@/lib/db"]);
    // The subpath form the filter is written to catch, too.
    const subpath = parse("fake-db-sub.tsx", 'import { s } from "@/lib/db/schema";');
    expect(importsOf(subpath)[0]?.startsWith(`${DB_MODULE}/`)).toBe(true);
  });
});
