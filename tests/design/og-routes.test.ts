// AC#12 / AC#13 / AC#14 — the three properties that make the invite share card safe, and the one
// that makes every share card paintable at all.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS GATE IS FOR, IN ONE PARAGRAPH
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// An Open Graph image is an UNAUTHENTICATED endpoint that every intermediary fetches automatically —
// a chat service, a link scanner, a corporate URL-preview proxy, a spam filter. For `/invite/<token>`
// the URL contains a bearer credential, so an image whose RESPONSE VARIED BY TOKEN would be a probe
// oracle wearing an image's clothing: the thing plan 11-19 closed at the page level, reopened one
// layer down and this time only ever visible to something automated. The controls are structural —
// the route takes no route-parameter argument and reaches no database — and structural controls are
// exactly what a source gate can prove.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE FOUR GROUPS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   AC#14  every `opengraph-image.tsx` imports `THEME_TOKENS`. HALF OF THIS IS ALREADY PAID FOR:
//          `tests/design/leak.test.ts` scans the whole `src/app` tree (its own assertion at :335-336
//          pins that), so a raw hex in an OG route already fails `npm run build` today. What that
//          gate CANNOT see is a route that paints nothing at all, or one that reaches for a `var(--x)`
//          string — satori resolves no custom properties and parses no `oklch()`, so both render as
//          nothing rather than as a violation. One assertion here, one already free.
//
//   AC#12  the invite OG route reads no token and touches no database. Asserted three ways: no
//          identifier by that name anywhere in the file, a default export whose signature CANNOT
//          receive one, and an import ALLOW-LIST (not a denylist — see below).
//
//   AC#13  `robots: { index: false, follow: false }` and `referrer: "no-referrer"` survive on the
//          invite page's `generateMetadata`. This is the assertion that catches the most likely
//          regression in the whole plan: somebody converting `metadata` → `generateMetadata`, or
//          later editing the returned object, and dropping two lines that nothing visible depends on.
//          The URL of that page IS the credential, and it is unfixable after a crawler has been
//          through. Asserted on the AST of the RETURNED OBJECT, so a `robots` mentioned in a comment
//          or sitting in an unrelated local variable does not satisfy it.
//
//   plus    every OG route exports `size`, `contentType` and `alt`; the invite card's renderable text
//           is a closed set of literals; and the last-resort PNG constant really is a 1 × 1 PNG.
//
// ── DENYLISTS ARE THE WRONG SHAPE FOR THE IMPORT CHECK, AND THIS ONE IS AN ALLOW-LIST ────────────
// The plan asked for "imports nothing from `@/lib/db` or `@/lib/group`". A denylist over module
// specifiers is walked around by `../../../lib/db` without anybody intending to walk around it — and
// more to the point, by `@/lib/booking/…` or any other module that happens to reach a database two
// hops down. So the assertion is inverted: EVERY import specifier in that file must appear on a
// declared list, and adding a legitimate one is a deliberate edit to this file. That is the same
// shape plan 11-16 landed on for its inventory ("every found site must be declared", so an emptied
// scan still fires) rather than the forward shape that goes quiet when the tree empties.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — SIX PROBES, ALL REAL (17 August 2026). GREEN IS 12 PASSED.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`), and
// this phase has now found plan-prescribed probes to be VACUOUS more than once. Command for all six:
//   npx vitest run --config vitest.design.config.ts tests/design/og-routes.test.ts
//
//   (a) AC#13 — the `referrer: "no-referrer"` LINE DELETED from the invite `generateMetadata`.
//       1 failed / 11 passed, naming file AND line, verbatim:
//
//         × AC#13 — every object generateMetadata returns carries both privacy properties
//         AssertionError: the invite page's URL IS the credential. … : expected [ Array(1) ] to
//         deeply equal []
//         + [
//         +   "src/app/(public)/invite/[token]/page.tsx:140 — the returned object has no
//         +    `referrer: \"no-referrer\"`. Without it the token rides out in a Referer header on
//         +    every navigation away from this page.",
//         + ]
//
//       Reverted → 12 passed.
//
//   (b) AC#12 — the invite OG route's signature changed to `Image({ params }: { params: Promise<{
//       token: string }> })` with `const { token } = await params;` in the body. 2 failed / 10
//       passed — the identifier scan and the ARITY check fire independently, which is the point of
//       having both:
//
//         × AC#12 — the invite card cannot read the token
//         AssertionError: src/app/(public)/invite/[token]/opengraph-image.tsx names the
//         route-parameter identifier at line(s) 112, 112, 113. … : expected [ 112, 112, 113 ] to
//         deeply equal []
//
//         × AC#12 — the invite card's default export cannot receive the route parameters
//         AssertionError: an unread argument can be read again tomorrow. … : expected 1 to be +0
//
//       Reverted → 12 passed.
//
//   (c) AC#14 — the `THEME_TOKENS` import removed from `src/app/opengraph-image.tsx` and the three
//       token references replaced by the EQUIVALENT hand-written hexes, which is what somebody
//       actually does when the import is in the way. Both halves of the pair fire, in two files:
//
//         this gate:  1 failed / 11 passed
//         +   "src/app/opengraph-image.tsx — does not import { THEME_TOKENS } from
//         +    \"@/lib/design/tokens.generated\""
//
//         leak.test.ts:  1 failed / 24 passed
//         +   "src/app/opengraph-image.tsx:39 raw hex colour `#ffffff` — use a design token (DS-13 / D-15)",
//         +   "src/app/opengraph-image.tsx:39 raw hex colour `#0a0a0a` — use a design token (DS-13 / D-15)",
//         +   "src/app/opengraph-image.tsx:39 raw hex colour `#da2d34` — use a design token (DS-13 / D-15)",
//
//       So the half this file adds is the one leak.test.ts cannot see, and vice versa. Reverted.
//
//   (d) VACUITY — `APP_DIR` re-pointed at `src/app-nope`. 6 failed / 6 passed, and the GUARD is the
//       first failure, by construction:
//
//         × the scanner actually read the tree it is asserting about
//         AssertionError: the src/app scan read 0 files. Every assertion below is quantified over
//         what this scan found, so a scanner that opened nothing passes the whole file — which is
//         the exact failure mode this assertion exists to prevent.: expected 0 to be greater than
//         or equal to 40
//
//       Worth reading the other five: "has no default-exported function declaration", "expected []
//       to deeply equal [ '@/app/og-render', …(1) ]", "the invite card parsed to zero renderable
//       children", "does not export generateMetadata", "no BLANK_PNG constant found". Every one of
//       those is a `toEqual([])` or a "for each" that an empty scan would otherwise satisfy — which
//       is exactly the shape 11-16 found 15 of 16 assertions passing under. Reverted.
//
//   (e) THE CONTENT CHECK, BOTH DIRECTIONS ON THE REAL FILE.
//       (e1) `{HEADLINE}` replaced by the literal JSX text `You&apos;re invited` → 12 passed. GREEN
//            ON PURPOSE, and stated so nobody reads it as a hole: a literal is not an
//            interpolation, and the property is "nothing from the request reaches the card".
//       (e2) a SECOND child expression added — `{HEADLINE}{alt}`, i.e. an identifier that is not on
//            the allow-list → 1 failed / 11 passed:
//
//              × AC#12 — nothing from the request can reach the invite card's text
//              + [ "src/app/(public)/invite/[token]/opengraph-image.tsx:91 — renders {alt}" ]
//
//            Reverted. (e1) without (e2) would have been a probe that proves nothing.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// NOT COVERED — stated so the next reader under-trusts this file:
//   • IT READS SOURCE. It cannot tell you the rendered image is legible, correctly sized, or that
//     the fonts loaded. Those were measured by hand against `npm run dev` and the PNG headers are in
//     11-20-SUMMARY.md.
//   • It does not check `metadataBase`, which resolves to `http://localhost:3000` until
//     `NEXT_PUBLIC_APP_URL` is set — so every absolute `og:image` URL this phase produces points at
//     localhost. That is plan 11-14's second named `human_needed` item, carried deliberately, NOT a
//     defect here and NOT something this gate should paper over by asserting a URL shape nobody has
//     chosen yet.
//   • The import allow-list is one level deep. It proves the invite route imports only two modules;
//     it does not prove those two reach no database. They are `@/lib/design/tokens.generated` (a
//     generated constant table) and `@/app/og-render` (fonts + `ImageResponse`), and both are
//     readable in a minute.
//   • Byte-identity of the three responses is a RUNTIME property. It was measured with `curl` and
//     recorded in the SUMMARY; nothing in CI re-measures it.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { stripComments } from "../helpers/source-text";

/**
 * The tree this gate is about. A `const` rather than an inline literal so probe (d) — repointing it
 * at a directory that does not exist — is a one-word edit, and the guard is what catches it.
 */
const APP_DIR = resolve(process.cwd(), "src/app");

/** Next's file convention. Every share card in the app is a file with exactly this name. */
const OG_ROUTE_FILENAME = "opengraph-image.tsx";

/**
 * The three cards, named. A COUNT alone survives the whole tree being replaced by three other files,
 * so the routes are pinned by path as well — and a fourth card appearing is a deliberate edit here,
 * because a new share surface is exactly the kind of thing that should not arrive unremarked.
 */
const EXPECTED_OG_ROUTES = [
  "src/app/(public)/invite/[token]/opengraph-image.tsx",
  "src/app/listings/[id]/opengraph-image.tsx",
  "src/app/opengraph-image.tsx",
];

const INVITE_OG = "src/app/(public)/invite/[token]/opengraph-image.tsx";
const INVITE_PAGE = "src/app/(public)/invite/[token]/page.tsx";
const RENDERER = "src/app/og-render.ts";

/** The one legal source of a colour in an image renderer (satori reads no CSS). */
const TOKENS_MODULE = "@/lib/design/tokens.generated";
const TOKENS_BINDING = "THEME_TOKENS";

/** Every module the invite card is allowed to import. See the header for why this is an ALLOW-list. */
const INVITE_OG_ALLOWED_IMPORTS = [TOKENS_MODULE, "@/app/og-render"];

/** The three exports Next's `opengraph-image` convention reads off each route module. */
const REQUIRED_OG_EXPORTS = ["size", "contentType", "alt"];

/** The identifier the invite card must never name. */
const ROUTE_PARAM_IDENTIFIER = "params";

/** Every JSX child expression the invite card is allowed to render. */
const INVITE_CARD_ALLOWED_EXPRESSIONS = ["HEADLINE"];

/** The scanner must see at least this many files under `src/app`, or it is not scanning. */
const MIN_APP_FILES = 40;

/** Windows: `relative()` returns backslashes, and every assertion here compares POSIX paths. */
const posix = (abs: string): string => relative(process.cwd(), abs).split("\\").join("/");

/**
 * Every `.ts`/`.tsx` under `dir`, recursively. Returns `[]` for a missing directory rather than
 * throwing, so a moved tree surfaces as ONE named assertion about the scan instead of a stack trace
 * that buries which gate went quiet (the `invite-notfound-parity.test.ts` idiom).
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

export function parse(path: string, text: string): ts.SourceFile {
  return ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/** `module specifier → the named bindings imported from it`. Namespace/default imports yield a set. */
export function collectImports(path: string, text: string): Map<string, Set<string>> {
  const sf = parse(path, text);
  const imports = new Map<string, Set<string>>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const spec = stmt.moduleSpecifier.text;
    const bindings = imports.get(spec) ?? new Set<string>();
    const named = stmt.importClause?.namedBindings;
    if (named && ts.isNamedImports(named)) for (const el of named.elements) bindings.add(el.name.text);
    if (named && ts.isNamespaceImport(named)) bindings.add(`* as ${named.name.text}`);
    if (stmt.importClause?.name) bindings.add(`default as ${stmt.importClause.name.text}`);
    imports.set(spec, bindings);
  }
  return imports;
}

/** Named exports: `export const x = …`, `export function f()`, `export type T` (types included). */
export function collectExportedNames(path: string, text: string): Set<string> {
  const sf = parse(path, text);
  const names = new Set<string>();
  const exported = (node: ts.Node): boolean =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  const isDefault = (node: ts.Node): boolean =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);

  for (const stmt of sf.statements) {
    if (!exported(stmt) || isDefault(stmt)) continue;
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) names.add(decl.name.text);
      }
    } else if (
      (ts.isFunctionDeclaration(stmt) ||
        ts.isClassDeclaration(stmt) ||
        ts.isTypeAliasDeclaration(stmt) ||
        ts.isInterfaceDeclaration(stmt)) &&
      stmt.name
    ) {
      names.add(stmt.name.text);
    }
  }
  return names;
}

/**
 * How many parameters the DEFAULT-exported function declares, or `null` when there is no
 * default-exported function declaration.
 *
 * This is the sharper half of AC#12: an unread `params` can be re-read tomorrow, whereas a signature
 * that declares nothing cannot be handed anything without an edit that shows up in review.
 */
export function defaultExportParamCount(path: string, text: string): number | null {
  const sf = parse(path, text);
  for (const stmt of sf.statements) {
    if (!ts.isFunctionDeclaration(stmt)) continue;
    const mods = ts.getModifiers(stmt) ?? [];
    const isDefault =
      mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
      mods.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
    if (isDefault) return stmt.parameters.length;
  }
  return null;
}

/**
 * Every identifier in the file, with the line it sits on — BY PARSING, which is the difference that
 * matters. A regex for the word would be satisfied by the header comment explaining why the word is
 * absent, and this file's whole subject is a property that a comment must be free to describe.
 */
export function identifierSites(path: string, text: string, name: string): number[] {
  const sf = parse(path, text);
  const lines: number[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === name) {
      lines.push(sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return lines;
}

/** One thing a scraper could end up reading off a card, and how it got there. */
export type CardChild =
  | { readonly kind: "text"; readonly value: string; readonly line: number }
  | { readonly kind: "expression"; readonly code: string; readonly line: number };

/**
 * The renderable CHILDREN of the JSX in a file — the text a card actually paints.
 *
 * Attribute values are deliberately excluded (`style={{ … }}` is not something anybody reads), which
 * is why this walks `JsxExpression` nodes whose PARENT is an element rather than every one of them.
 */
export function collectCardChildren(path: string, text: string): CardChild[] {
  const sf = parse(path, text);
  const found: CardChild[] = [];
  const lineOf = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) {
      const value = node.text.trim();
      if (value.length > 0) found.push({ kind: "text", value, line: lineOf(node) });
    } else if (
      ts.isJsxExpression(node) &&
      node.parent &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) &&
      node.expression
    ) {
      found.push({ kind: "expression", code: node.expression.getText(sf), line: lineOf(node) });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** Every template literal WITH a substitution — the ordinary way a request-derived value arrives. */
export function templateSubstitutionSites(path: string, text: string): number[] {
  const sf = parse(path, text);
  const lines: number[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isTemplateExpression(node)) {
      lines.push(sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return lines;
}

/** Every object literal RETURNED by the named exported function, with its line. */
export function returnedObjectLiterals(
  path: string,
  text: string,
  fnName: string,
): { readonly node: ts.ObjectLiteralExpression; readonly line: number }[] {
  const sf = parse(path, text);
  const out: { node: ts.ObjectLiteralExpression; line: number }[] = [];
  for (const stmt of sf.statements) {
    if (!ts.isFunctionDeclaration(stmt) || stmt.name?.text !== fnName || !stmt.body) continue;
    const visit = (node: ts.Node): void => {
      if (ts.isReturnStatement(node) && node.expression) {
        const expr = ts.isParenthesizedExpression(node.expression)
          ? node.expression.expression
          : node.expression;
        if (ts.isObjectLiteralExpression(expr)) {
          out.push({ node: expr, line: sf.getLineAndCharacterOfPosition(expr.getStart(sf)).line + 1 });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(stmt.body);
  }
  return out;
}

/** The initializer of `name` on an object literal, or `null`. Shorthand and spreads yield `null`. */
export function propertyOf(obj: ts.ObjectLiteralExpression, name: string): ts.Expression | null {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = prop.name;
    const keyText = ts.isIdentifier(key) || ts.isStringLiteral(key) ? key.text : null;
    if (keyText === name) return prop.initializer;
  }
  return null;
}

const isFalseLiteral = (expr: ts.Expression | null): boolean =>
  expr !== null && expr.kind === ts.SyntaxKind.FalseKeyword;

const stringValue = (expr: ts.Expression | null): string | null =>
  expr !== null && ts.isStringLiteral(expr) ? expr.text : null;

/**
 * The base64 payload of the `BLANK_PNG` constant in the renderer, decoded.
 *
 * Rung 3 of the never-non-2xx guard is a hand-written base64 literal, and a hand-written binary
 * constant is precisely the thing nobody re-reads. A typo in it does not throw — it serves a 200
 * with a corrupt body, which is the failure the whole rung exists to avoid.
 */
export function blankPngFrom(path: string, text: string): Buffer | null {
  const sf = parse(path, text);
  let found: Buffer | null = null;
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "BLANK_PNG" &&
      node.initializer
    ) {
      const literals: string[] = [];
      const inner = (n: ts.Node): void => {
        if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) literals.push(n.text);
        ts.forEachChild(n, inner);
      };
      inner(node.initializer);
      const payload = literals.find((l) => l.length > 40);
      if (payload) found = Buffer.from(payload, "base64");
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The tree, scanned ONCE at module level; the `it()` blocks only assert.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const appFiles = collectFiles(APP_DIR).map(posix);
const textByFile = new Map<string, string>(
  collectFiles(APP_DIR).map((abs) => [posix(abs), readFileSync(abs, "utf8")]),
);
const ogRoutes = appFiles.filter((f) => f.endsWith(`/${OG_ROUTE_FILENAME}`)).sort();

describe("AC#12 / AC#13 / AC#14 — the OG routes, the invite card, and the two privacy lines", () => {
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // GUARD THE GUARD, ASSERTED FIRST. Every group below is a "for each OG route …" or a `toEqual([])`,
  // and a scan that opened nothing satisfies all of them perfectly (probe (d)).
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  it("the scanner actually read the tree it is asserting about", () => {
    expect(
      appFiles.length,
      `the src/app scan read ${appFiles.length} files. Every assertion below is quantified over what ` +
        `this scan found, so a scanner that opened nothing passes the whole file — which is the exact ` +
        `failure mode this assertion exists to prevent.`,
    ).toBeGreaterThanOrEqual(MIN_APP_FILES);

    expect(
      ogRoutes.length,
      `found ${ogRoutes.length} '${OG_ROUTE_FILENAME}' files: ${ogRoutes.join(", ") || "(none)"}. A ` +
        `glob that silently matched nothing passes all four groups below.`,
    ).toBe(3);

    expect(ogRoutes).toEqual(EXPECTED_OG_ROUTES);

    for (const required of [INVITE_PAGE, RENDERER]) {
      expect(appFiles, `the scan never opened ${required}`).toContain(required);
    }

    // POSITIVE CONTROL ON THE PARSER. If a real route parses to zero identifiers, then "does not name
    // the route parameter" is a statement about the parser rather than about the file.
    for (const route of ogRoutes) {
      expect(
        identifierSites(route, textByFile.get(route) ?? "", "div").length +
          identifierSites(route, textByFile.get(route) ?? "", "style").length,
        `${route} parsed to zero JSX identifiers, which no real card in this tree does — the parser ` +
          `is failing silently on it.`,
      ).toBeGreaterThan(0);
    }
  });

  it("AC#14 — every share card paints from THEME_TOKENS", () => {
    // The raw-hex half is already paid for by tests/design/leak.test.ts, which scans this whole tree
    // (its :335-336 assertion pins that it reaches src/app). What that gate cannot see is a card that
    // reaches for a CSS custom property instead: satori resolves none, so `var(--background)` renders
    // as nothing at all rather than as a violation.
    const violations: string[] = [];
    for (const route of ogRoutes) {
      const bindings = collectImports(route, textByFile.get(route) ?? "").get(TOKENS_MODULE);
      if (!bindings?.has(TOKENS_BINDING)) {
        violations.push(`${route} — does not import { ${TOKENS_BINDING} } from "${TOKENS_MODULE}"`);
      }
    }
    expect(
      violations,
      `satori resolves no CSS custom properties and parses no oklch(), so an OG route cannot paint ` +
        `through the stylesheet the way every other surface does. The generated token table is the ` +
        `ONE sanctioned duplicate of a token value (DS-12 / D-18) and the only legal source of a ` +
        `colour here — writing the hex out instead fails tests/design/leak.test.ts, and reaching for ` +
        `a var(--x) string fails nothing and renders nothing.`,
    ).toEqual([]);
  });

  it("every share card declares the three exports Next's convention reads", () => {
    const violations: string[] = [];
    for (const route of ogRoutes) {
      const names = collectExportedNames(route, textByFile.get(route) ?? "");
      for (const required of REQUIRED_OG_EXPORTS) {
        if (!names.has(required)) violations.push(`${route} — no \`export const ${required}\``);
      }
      if (defaultExportParamCount(route, textByFile.get(route) ?? "") === null) {
        violations.push(`${route} — no default-exported function; nothing renders`);
      }
    }
    expect(
      violations,
      "without `size` the scraper is told nothing about the dimensions and renders a guess; without " +
        "`contentType` the type tag is missing; without `alt` the card is unreadable to anyone using " +
        "a screen reader on a link preview.",
    ).toEqual([]);
  });

  it("AC#12 — the invite card cannot read the token", () => {
    const text = textByFile.get(INVITE_OG) ?? "";
    const sites = identifierSites(INVITE_OG, text, ROUTE_PARAM_IDENTIFIER);
    expect(
      sites,
      `${INVITE_OG} names the route-parameter identifier at line(s) ${sites.join(", ")}. An image ` +
        `whose response varies by token is a probe oracle: the invite URL carries a bearer ` +
        `credential, and every chat service, link scanner and preview proxy that sees the link ` +
        `fetches this endpoint automatically. Asserted on the AST, so the header is free to DESCRIBE ` +
        `this property — it just may not name the identifier.`,
    ).toEqual([]);
  });

  it("AC#12 — the invite card's default export cannot receive the route parameters", () => {
    const arity = defaultExportParamCount(INVITE_OG, textByFile.get(INVITE_OG) ?? "");
    expect(arity, `${INVITE_OG} has no default-exported function declaration`).not.toBeNull();
    expect(
      arity,
      "an unread argument can be read again tomorrow. A signature that declares nothing cannot be " +
        "handed the token without an edit somebody has to make on purpose.",
    ).toBe(0);
  });

  it("AC#12 — the invite card imports only from its declared allow-list", () => {
    const specifiers = [...collectImports(INVITE_OG, textByFile.get(INVITE_OG) ?? "").keys()];
    const undeclared = specifiers.filter((s) => !INVITE_OG_ALLOWED_IMPORTS.includes(s));
    expect(
      undeclared,
      `an ALLOW-list rather than a denylist, on purpose: a denylist over "@/lib/db" and "@/lib/group" ` +
        `is walked around by a relative path, and says nothing about the next module that reaches a ` +
        `database two hops down. If one of these is legitimate, add it to INVITE_OG_ALLOWED_IMPORTS ` +
        `in this file — which is a deliberate edit, which is the point.`,
    ).toEqual([]);

    // The list is not vacuous: the file really does import both of the modules it is allowed to.
    expect(specifiers.sort()).toEqual([...INVITE_OG_ALLOWED_IMPORTS].sort());
  });

  it("AC#12 — nothing from the request can reach the invite card's text", () => {
    const text = textByFile.get(INVITE_OG) ?? "";
    const children = collectCardChildren(INVITE_OG, text);

    // CLOSURE, stated forward: every renderable child must be a literal or an ALLOWED expression.
    // Written this way round (11-16's lesson) so an emptied card does not satisfy it by having
    // nothing to check — the count assertion below is the other half.
    const undeclared = children
      .filter((c) => c.kind === "expression" && !INVITE_CARD_ALLOWED_EXPRESSIONS.includes(c.code))
      .map((c) => `${INVITE_OG}:${c.line} — renders {${(c as { code: string }).code}}`);
    expect(
      undeclared,
      "the card names the product and nothing else: no venue, no date, no address, no organizer, no " +
        "headcount, no booking reference. Everything an unfurl states is stated to every intermediary " +
        "that fetches it (T-11-OGOVERSHARE).",
    ).toEqual([]);

    expect(
      templateSubstitutionSites(INVITE_OG, text),
      "a template literal with a substitution is the ordinary way a request-derived value arrives in " +
        "a card. There are none in this file and there should be none.",
    ).toEqual([]);

    // The other half of the closure: the card DOES render something, and the wordmark is part of it.
    expect(children.length, "the invite card parsed to zero renderable children").toBeGreaterThanOrEqual(2);
    expect(children.some((c) => c.kind === "text" && c.value === "FitOut")).toBe(true);
  });

  it("AC#13 — every object generateMetadata returns carries both privacy properties", () => {
    const text = textByFile.get(INVITE_PAGE) ?? "";

    expect(
      collectExportedNames(INVITE_PAGE, text).has("generateMetadata"),
      `${INVITE_PAGE} does not export generateMetadata`,
    ).toBe(true);

    const returns = returnedObjectLiterals(INVITE_PAGE, text, "generateMetadata");
    expect(
      returns.length,
      "generateMetadata returns no object literal this gate can read. Either it now returns a value " +
        "built elsewhere — in which case this assertion is blind and must be rewritten, not deleted — " +
        "or the parse is broken.",
    ).toBeGreaterThanOrEqual(1);

    const violations: string[] = [];
    for (const { node, line } of returns) {
      const robots = propertyOf(node, "robots");
      if (robots === null || !ts.isObjectLiteralExpression(robots)) {
        violations.push(
          `${INVITE_PAGE}:${line} — the returned object has no \`robots\` object. An indexed invite ` +
            `link is a public one, and the token is the whole credential.`,
        );
      } else {
        if (!isFalseLiteral(propertyOf(robots, "index")))
          violations.push(`${INVITE_PAGE}:${line} — \`robots.index\` is not literally \`false\``);
        if (!isFalseLiteral(propertyOf(robots, "follow")))
          violations.push(`${INVITE_PAGE}:${line} — \`robots.follow\` is not literally \`false\``);
      }
      if (stringValue(propertyOf(node, "referrer")) !== "no-referrer") {
        violations.push(
          `${INVITE_PAGE}:${line} — the returned object has no \`referrer: "no-referrer"\`. Without ` +
            `it the token rides out in a Referer header on every navigation away from this page.`,
        );
      }
    }
    expect(
      violations,
      "the invite page's URL IS the credential. These two lines are invisible in the rendered page, " +
        "nothing fails when they go, and the damage is done by a crawler nobody watches — which is " +
        "why they are asserted on the AST of the RETURNED OBJECT rather than by a text search that a " +
        "comment would satisfy. Unfixable after a crawler has already been through.",
    ).toEqual([]);
  });

  it("the last-resort PNG constant really is a 1 × 1 PNG", () => {
    const png = blankPngFrom(RENDERER, textByFile.get(RENDERER) ?? "");
    expect(png, `no BLANK_PNG constant found in ${RENDERER}`).not.toBeNull();
    const bytes = png as unknown as Buffer;
    expect(
      bytes.subarray(0, 8).toString("hex"),
      "a hand-written base64 binary constant is the thing nobody re-reads, and a typo in it does not " +
        "throw — it serves a 200 with a corrupt body, which is the exact failure the rung exists to " +
        "avoid.",
    ).toBe("89504e470d0a1a0a");
    expect(bytes.readUInt32BE(16)).toBe(1);
    expect(bytes.readUInt32BE(20)).toBe(1);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // BOTH DIRECTIONS, on synthetic sources, through the SAME functions the real assertions run — so
  // the fixtures prove the code path above rather than a lookalike (`leak.test.ts:208-212`).
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("the scanners flag a card that reads the token and spare one that cannot", () => {
    const reads = [
      "export default async function Image({ params }: { params: Promise<{ token: string }> }) {",
      "  const { token } = await params;",
      "  return <div>{token}</div>;",
      "}",
    ].join("\n");
    expect(identifierSites("fixture.tsx", reads, ROUTE_PARAM_IDENTIFIER).length).toBeGreaterThan(0);
    expect(defaultExportParamCount("fixture.tsx", reads)).toBe(1);

    const constant = [
      "export default async function Image() {",
      "  return <div>You are invited</div>;",
      "}",
    ].join("\n");
    expect(identifierSites("fixture.tsx", constant, ROUTE_PARAM_IDENTIFIER)).toEqual([]);
    expect(defaultExportParamCount("fixture.tsx", constant)).toBe(0);

    // A COMMENT naming the identifier does not trip the scan — which is what lets the real file's
    // header describe the property at all.
    const commented = ["// this route never touches params", "export const alt = 'x';"].join("\n");
    expect(identifierSites("fixture.ts", commented, ROUTE_PARAM_IDENTIFIER)).toEqual([]);
  });

  it("the scanners flag a card that interpolates and spare one that renders a constant", () => {
    const interpolating = [
      "const venue = 'x';",
      "export const A = () => <div><span>{venue}</span></div>;",
    ].join("\n");
    const kids = collectCardChildren("fixture.tsx", interpolating);
    expect(kids.filter((c) => c.kind === "expression").map((c) => (c as { code: string }).code)).toEqual([
      "venue",
    ]);

    const constant = [
      "const HEADLINE = 'You are invited';",
      "export const A = () => <div><span>{HEADLINE}</span><b>FitOut</b></div>;",
    ].join("\n");
    const constantKids = collectCardChildren("fixture.tsx", constant);
    expect(
      constantKids
        .filter((c) => c.kind === "expression")
        .every((c) => INVITE_CARD_ALLOWED_EXPRESSIONS.includes((c as { code: string }).code)),
    ).toBe(true);
    expect(constantKids.some((c) => c.kind === "text" && c.value === "FitOut")).toBe(true);

    // An ATTRIBUTE is not a renderable child: `style={{ … }}` must not be mistaken for card text.
    const styled = 'export const A = () => <div style={{ padding: 64 }}>FitOut</div>;';
    expect(collectCardChildren("fixture.tsx", styled).filter((c) => c.kind === "expression")).toEqual([]);

    expect(templateSubstitutionSites("fixture.ts", "const a = `x ${y} z`;")).toEqual([1]);
    expect(templateSubstitutionSites("fixture.ts", "const a = `x y z`;")).toEqual([]);
  });

  it("the metadata scanner flags a missing referrer, a flipped robots, and a commented-out one", () => {
    const both = [
      "export async function generateMetadata() {",
      "  return { title: 'x', robots: { index: false, follow: false }, referrer: 'no-referrer' };",
      "}",
    ].join("\n");
    const bothReturns = returnedObjectLiterals("fixture.ts", both, "generateMetadata");
    expect(bothReturns.length).toBe(1);
    const bothRobots = propertyOf(bothReturns[0]!.node, "robots") as ts.ObjectLiteralExpression;
    expect(isFalseLiteral(propertyOf(bothRobots, "index"))).toBe(true);
    expect(isFalseLiteral(propertyOf(bothRobots, "follow"))).toBe(true);
    expect(stringValue(propertyOf(bothReturns[0]!.node, "referrer"))).toBe("no-referrer");

    const missingReferrer = [
      "export async function generateMetadata() {",
      "  return { title: 'x', robots: { index: false, follow: false } };",
      "}",
    ].join("\n");
    const missing = returnedObjectLiterals("fixture.ts", missingReferrer, "generateMetadata");
    expect(stringValue(propertyOf(missing[0]!.node, "referrer"))).toBeNull();

    const flipped = [
      "export async function generateMetadata() {",
      "  return { robots: { index: true, follow: false }, referrer: 'no-referrer' };",
      "}",
    ].join("\n");
    const flippedReturns = returnedObjectLiterals("fixture.ts", flipped, "generateMetadata");
    const flippedRobots = propertyOf(flippedReturns[0]!.node, "robots") as ts.ObjectLiteralExpression;
    expect(isFalseLiteral(propertyOf(flippedRobots, "index"))).toBe(false);

    // THE COMMENT CASE, which is the whole reason this is an AST assertion.
    const commentedOut = [
      "export async function generateMetadata() {",
      '  // referrer: "no-referrer"',
      "  return { robots: { index: false, follow: false } };",
      "}",
    ].join("\n");
    const commentedReturns = returnedObjectLiterals("fixture.ts", commentedOut, "generateMetadata");
    expect(stringValue(propertyOf(commentedReturns[0]!.node, "referrer"))).toBeNull();

    // And the import scanner, both directions.
    const named = collectImports("fixture.ts", `import { THEME_TOKENS } from "${TOKENS_MODULE}";`);
    expect([...(named.get(TOKENS_MODULE) ?? [])]).toEqual([TOKENS_BINDING]);
    const dbImport = collectImports("fixture.ts", 'import { db } from "@/lib/db";');
    expect([...dbImport.keys()].filter((s) => !INVITE_OG_ALLOWED_IMPORTS.includes(s))).toEqual([
      "@/lib/db",
    ]);
    const relativeDbImport = collectImports("fixture.ts", 'import { db } from "../../../lib/db";');
    expect([...relativeDbImport.keys()].filter((s) => !INVITE_OG_ALLOWED_IMPORTS.includes(s))).toEqual([
      "../../../lib/db",
    ]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// D-247 — THE THIRD LEAK SURFACE. THE ONE THAT SURVIVES THE OTHER TWO FIXES AND IS INVISIBLE IN A
// BROWSER.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-208 hides a submitted-but-unapproved listing: it drops out of search, and its public page 404s.
// Two surfaces, both closed in phase 18 — and a listing's title, space type, city and hourly rate
// stayed readable anyway, by anyone who asked `/listings/<id>/opengraph-image` for a picture.
//
// The reason is worth stating plainly, because it is a class of defect and not an oversight:
// `src/lib/listing/og-facts.ts` did not CALL the page's viewability rule, it RESTATED it — one
// hand-written line asserting the status was published. Two copies of a rule are equal only until
// someone edits one. Phase 18 edited one. `tsc` could not help, because a copy is not a call site: the
// required-third-parameter census that reddened the page and the layout was structurally blind to the
// one file that had written the condition out longhand.
//
// So this group pins the SHAPE that makes the recurrence impossible rather than the behaviour of any
// one state:
//
//   1. `og-facts.ts` imports and CALLS `isPubliclyViewable`, with every term.
//   2. `og-facts.ts` holds no independent published-status literal of its own — no second copy to
//      drift. Counted over COMMENT-STRIPPED code and over parsed string literals, never over the raw
//      file: this module's header necessarily discusses the very rule it must not restate, and a bare
//      substring count would be falsely red against the correct file (`tests/helpers/source-text.ts`
//      documents that trap and is the repo's sanctioned answer to it).
//   3. the OG route calls `listingCardFacts` and falls back to the generic card when it yields null,
//      so "renders nothing identifying" is reachable at all.
//
// ⚠ WHAT THIS CANNOT SEE, STATED SO IT IS NOT SILENTLY CLAIMED. Nothing here renders an image or
// reads an HTTP response. `tests/design/soft-404-status.test.ts:31-39` puts the same limit in its own
// words for the page — the e2e spec is the ONLY instrument in this repo that can see a status line —
// and it binds here at least as hard, since no e2e spec drives an OG route at all. The BEHAVIOURAL
// half of D-208 lives in `tests/listing/status-gate.test.ts`; the production-build `curl` reading is
// a one-time audit belonging to plan 18-14. What this group proves is that the guard is CALLED and
// that it resolves through the one shared expression — which is precisely the property whose absence
// caused the leak.

/** The projection every listing share surface reads through — the third call site of the rule. */
const OG_FACTS = "src/lib/listing/og-facts.ts";

/** The route that paints the card from it. */
const LISTING_OG = "src/app/listings/[id]/opengraph-image.tsx";

/** The one shared viewability expression, and the module that owns it. */
const VIEWABLE_GUARD = "isPubliclyViewable";
const PUBLIC_LISTING_MODULE = "@/lib/listing/public-listing";

/** status, deletedAt, reviewState (D-208). Same count `soft-404-status.test.ts` pins on the page. */
const VIEWABLE_GUARD_ARITY = 3;

/** The projection function, and the card the route must fall back to when it returns null. */
const FACTS_FN = "listingCardFacts";
const FALLBACK_CARD = "GenericCard";

/**
 * The status literal that must appear in this module's CODE exactly zero times. A restated rule is
 * spelled with it; a called rule never mentions it.
 */
const RESTATED_STATUS_LITERAL = "published";

/** Every CallExpression of `name` in a parsed file, with how many arguments it was passed. */
function callArgCounts(path: string, text: string, name: string): number[] {
  const sf = parse(path, text);
  const counts: number[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) {
      counts.push(node.arguments.length);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return counts;
}

/** The text of every StringLiteral in a parsed file. Comments hold none, by construction. */
function stringLiterals(path: string, text: string): string[] {
  const sf = parse(path, text);
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) out.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** The source text of the `whenFalse` branch of every ternary in a parsed file. */
function ternaryFallbacks(path: string, text: string): string[] {
  const sf = parse(path, text);
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isConditionalExpression(node)) out.push(node.whenFalse.getText(sf));
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

const ogFactsPath = resolve(process.cwd(), OG_FACTS);
const ogFactsText = existsSync(ogFactsPath) ? readFileSync(ogFactsPath, "utf8") : "";
const ogFactsCode = stripComments(ogFactsText);
const listingOgText = textByFile.get(LISTING_OG) ?? "";

describe("D-247 — an unreviewed listing renders NO Open Graph card", () => {
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // GUARD THE GUARD. `og-facts.ts` lives in `src/lib`, OUTSIDE the `src/app` scan every other group
  // in this file quantifies over, so it is read separately — and a separate read is a separate way to
  // silently open nothing. Every zero-count assertion below is satisfied perfectly by an empty string.
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  it("the scanner really opened both files, and stripping left real code behind", () => {
    expect(
      ogFactsText.length,
      `${OG_FACTS} read as ${ogFactsText.length} characters — the scan did not open it, and every ` +
        "prohibition below is then a statement about the empty string.",
    ).toBeGreaterThan(2_000);

    expect(
      ogFactsCode.length,
      `comment-stripping ${OG_FACTS} left ${ogFactsCode.length} characters. This module is mostly ` +
        "prose, so the stripped remainder is small — but an empty one means the stripper ate the " +
        "code, which would make the banned-literal count below pass vacuously forever.",
    ).toBeGreaterThan(500);

    expect(listingOgText.length, `the src/app scan never opened ${LISTING_OG}`).toBeGreaterThan(2_000);
    expect(appFiles, `the src/app scan never opened ${LISTING_OG}`).toContain(LISTING_OG);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // 1 + 2 — ONE RULE, CALLED. NOT A SECOND COPY OF IT.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it(`${OG_FACTS} imports ${VIEWABLE_GUARD} from the module that owns it`, () => {
    const bindings = collectImports(OG_FACTS, ogFactsText).get(PUBLIC_LISTING_MODULE);
    expect(
      [...(bindings ?? [])],
      `${OG_FACTS} does not import { ${VIEWABLE_GUARD} } from "${PUBLIC_LISTING_MODULE}". A ` +
        "locally-defined helper of the same name would satisfy the call-expression assertion below " +
        "while being a second copy of the rule wearing the shared one's name — which is the exact " +
        "defect D-247 is about, reintroduced under a better disguise.",
    ).toContain(VIEWABLE_GUARD);
  });

  it(`${OG_FACTS} CALLS ${VIEWABLE_GUARD} with all ${VIEWABLE_GUARD_ARITY} terms`, () => {
    const counts = callArgCounts(OG_FACTS, ogFactsText, VIEWABLE_GUARD);
    expect(
      counts.length,
      `${OG_FACTS} contains no parsed call to ${VIEWABLE_GUARD}. Importing it is not using it: the ` +
        "share card would go on being drawn from whatever this module decided on its own.",
    ).toBeGreaterThanOrEqual(1);

    expect(
      counts.filter((n) => n !== VIEWABLE_GUARD_ARITY),
      `${OG_FACTS} calls ${VIEWABLE_GUARD} with ${counts.join(", ")} argument(s); expected ` +
        `${VIEWABLE_GUARD_ARITY} — status, deletedAt and the ops review state (D-208). A short call ` +
        "compiles only against a defaulted parameter, and a defaulted review term is a card painted " +
        "for a listing nobody has approved.",
    ).toEqual([]);
  });

  it(`${OG_FACTS} holds NO independent status literal of its own`, () => {
    // Two readings of the same prohibition, because they fail differently. The AST reading cannot be
    // fooled by prose at all; the stripped-text reading catches a comparison spelled against some
    // other constant that the literal scan would miss.
    expect(
      stringLiterals(OG_FACTS, ogFactsCode).filter((s) => s === RESTATED_STATUS_LITERAL),
      `${OG_FACTS} names the status literal "${RESTATED_STATUS_LITERAL}" in CODE. That is how the ` +
        "restated rule was spelled before D-247: one line asserting the status, drifting away from " +
        "the page's rule the moment the page's rule grew a term — and the drift was invisible, " +
        "because an OG route is never rendered in a browser. There is one expression now; call it.",
    ).toEqual([]);

    expect(
      ogFactsCode.match(/status\s*[!=]==?\s*["'`]/g) ?? [],
      `${OG_FACTS} compares a status field directly in CODE (comments are stripped before this ` +
        "count, so the module's header is free to explain the prohibition it is under). Route the " +
        `decision through ${VIEWABLE_GUARD} instead — see D-247.`,
    ).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // 3 — AND THE ROUTE ACTUALLY HAS SOMEWHERE TO FALL BACK TO.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it(`${LISTING_OG} draws from ${FACTS_FN} and falls back to ${FALLBACK_CARD} on null`, () => {
    expect(
      callArgCounts(LISTING_OG, listingOgText, FACTS_FN).length,
      `${LISTING_OG} never calls ${FACTS_FN} — so whatever guard that projection carries is not what ` +
        "decides this card's contents.",
    ).toBeGreaterThanOrEqual(1);

    const fallbacks = ternaryFallbacks(LISTING_OG, listingOgText);
    expect(
      fallbacks.filter((t) => t.includes(FALLBACK_CARD)),
      `no ternary in ${LISTING_OG} falls back to <${FALLBACK_CARD} />. A null from ${FACTS_FN} is ` +
        "the ONLY thing standing between an unreviewed listing and a share card with its title, " +
        "space type, city and rate on it; if nothing consumes the null, the guard upstream is " +
        `decoration. The fallback must also stay INDISTINGUISHABLE from the one a nonexistent id ` +
        "gets, or the card becomes a route-existence oracle — see that function's own docblock.",
    ).not.toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // BOTH-DIRECTIONS SELF-TESTS on fixtures never written to disk, through the SAME functions above.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("the D-247 scanners flag the restated rule and spare the called one", () => {
    // THE PRE-D-247 SHAPE — the line this whole group exists to make impossible. Both readings must
    // see it, or the group is decoration.
    const restated = 'const row = rows[0];\nif (!row || row.status !== "published") return null;';
    expect(stringLiterals("fixture-restated.ts", restated)).toContain(RESTATED_STATUS_LITERAL);
    expect(restated.match(/status\s*[!=]==?\s*["'`]/g) ?? []).not.toEqual([]);

    // THE SHIPPED SHAPE — no literal, no comparison, three arguments.
    const called =
      "const row = rows[0];\n" +
      "if (!row || !isPubliclyViewable(row.status, row.deletedAt, row.reviewState)) return null;";
    expect(stringLiterals("fixture-called.ts", called)).not.toContain(RESTATED_STATUS_LITERAL);
    expect(called.match(/status\s*[!=]==?\s*["'`]/g) ?? []).toEqual([]);
    expect(callArgCounts("fixture-called.ts", called, VIEWABLE_GUARD)).toEqual([VIEWABLE_GUARD_ARITY]);

    // THE DEFAULTED-PARAMETER REGRESSION — compiles, reads plausibly, tests nothing about review.
    const short = "if (!isPubliclyViewable(row.status, row.deletedAt)) return null;";
    expect(callArgCounts("fixture-short.ts", short, VIEWABLE_GUARD)).toEqual([2]);

    // A COMMENT, which is why the prohibitions run over stripped text and parsed literals. The real
    // module's header quotes the banned shape at length; that must never be a violation.
    const commented = stripComments(
      '// the old line was: if (row.status !== "published") return null;\nexport const A = 1;',
    );
    expect(stringLiterals("fixture-commented.ts", commented)).not.toContain(RESTATED_STATUS_LITERAL);
    expect(commented.match(/status\s*[!=]==?\s*["'`]/g) ?? []).toEqual([]);

    // And the fallback reader, both directions.
    expect(
      ternaryFallbacks("fixture-fallback.tsx", "const x = facts ? <Card /> : <GenericCard />;"),
    ).toEqual(["<GenericCard />"]);
    expect(
      ternaryFallbacks("fixture-nofallback.tsx", "const x = facts ? <Card /> : null;").filter((t) =>
        t.includes(FALLBACK_CARD),
      ),
    ).toEqual([]);
  });
});
