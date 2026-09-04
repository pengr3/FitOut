// A `"use server"` module may only export async functions. This file is the GUARD for that rule,
// and it exists because a passing unit test was actively masking a dead feature for a whole phase.
//
// WHAT WENT WRONG. `src/app/actions/avatar.ts` opened with `"use server"` and then exported
// `AVATAR_MAX_BYTES` (a number) and `avatarFileSchema` (a Zod object) alongside the one legal export,
// `uploadAvatarAction`. Next.js enforces the server-actions module contract at MODULE EVALUATION, not
// at call time, so it rejected the WHOLE module and `uploadAvatarAction` never ran. A real user who
// clicked "Upload photo" on /profile got, in the browser console:
//
//   Uncaught (in promise) Error: A "use server" file can only export async functions, found number.
//   Read more: https://nextjs.org/docs/messages/invalid-use-server-value
//       at module evaluation (avatar.ts:88:1)
//
// Avatar upload had therefore NEVER worked in a browser since Phase 1.
//
// WHY NOTHING CAUGHT IT — the reason this guard is the real deliverable and the file move is not.
// `tests/profile/avatar.test.ts` imported `avatarFileSchema`/`AVATAR_MAX_BYTES` straight out of the
// `"use server"` module and asserted the size/content-type contract thoroughly. Vitest does not
// implement the `"use server"` export rule at all, so those assertions passed — GREEN — against a
// module that could not load in Next. The test suite was not merely silent about the bug; the bug's
// only symptom lived exactly in the gap between "the module's exports behave correctly when imported
// by Vitest" and "the module can be loaded by Next", and the test sat squarely inside that gap.
// Unit-level green is not evidence a server-action module evaluates. This file closes that gap.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// OBSERVED RED. Written and run BEFORE any source change (HEAD = b0ce3bc, `git status --short -- src/`
// empty), 7 August 2026. `npx vitest run tests/use-server-exports.test.ts`, exit code 1. Observed
// output, VERBATIM (its `367|` line pointer is as-run, i.e. before this block replaced the
// placeholder that stood here while the run was taken, so it now sits a few lines lower):
//
//    ❯ tests/use-server-exports.test.ts (4 tests | 1 failed) 20ms
//        × every "use server" module in src/ exports only async functions 13ms
//
//   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
//
//    FAIL  tests/use-server-exports.test.ts > the "use server" module contract > every "use server"
//    module in src/ exports only async functions
//   AssertionError: expected [ …(2) ] to deeply equal []
//
//   - Expected
//   + Received
//
//   - []
//   + [
//   +   "src/app/actions/avatar.ts:25 exports AVATAR_MAX_BYTES — not an async function: `5 * 1024 * 1024`",
//   +   "src/app/actions/avatar.ts:31 exports avatarFileSchema — not an async function: `z`",
//   + ]
//
//    ❯ tests/use-server-exports.test.ts:367:24
//       365|
//       366|   it('every "use server" module in src/ exports only async functions',…
//       367|     expect(violations).toEqual([]);
//          |                        ^
//
//   Test Files  1 failed (1)
//        Tests  1 failed | 3 passed (4)
//
// Both offenders named, at the right lines, and NOTHING else — the other 15 real `"use server"`
// modules in src/ came back clean, so this is not a scanner that fails on everything. The three
// self-tests below (scanner-finds-modules, comment-is-not-a-directive, shape-classification) passed
// in that same run. A guard that has never been watched failing is not a guard, so that run is
// recorded here rather than asserted from memory.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// HOW THE DETECTION WORKS, AND WHAT IT DOES NOT COVER. Read this before trusting a green run.
//
// It parses each file with the TypeScript compiler API (`ts.createSourceFile`) — NOT with grep. That
// distinction is load-bearing here: `grep -rl '"use server"' src/` returns 31 files, but 15 of them
// are pure/isomorphic modules whose header comments say, in prose, that they deliberately have NO
// `"use server"` directive (src/lib/money.ts, src/lib/booking/pricing.ts, …). A grep-based guard would
// have spent its life flagging comments. Likewise `grep 'export const'` would match inside a comment
// or a template string. Only real AST nodes are considered.
//
// COVERED:
//   • Directive detection: `"use server"` must be in the module's DIRECTIVE PROLOGUE (a leading string
//     -literal expression statement). Comments are not statements, so a mention in a comment is
//     correctly ignored; so is a `"use server"` string appearing later in the file.
//   • `export function` / `export default function` — must carry `async`.
//   • `export const|let|var` — the initializer must be an `async` arrow or `async function`.
//     `export const X = 5 * 1024 * 1024` and `export const s = z.foo()` are both flagged.
//   • `export class`, `export enum` — flagged (they are runtime values).
//   • `export default <expr>` — must be an `async` function expression/arrow.
//   • `export { a, b }` with NO module specifier — each name is resolved to its local declaration and
//     checked by the rules above; an unresolvable name is flagged rather than assumed safe.
//   • Type-only exports are exempt (`export type`, `export interface`, `export type { … }`), since
//     types erase before Next ever sees the module. `AvatarResult` in avatar.ts is exempt for this
//     reason and is NOT a violation.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file rather than
// over-trusts it:
//   • `export * from "./x"` and `export { a } from "./x"` are flagged WITHOUT resolving the target,
//     because this guard does not follow imports. That is deliberately strict: a re-export out of a
//     `"use server"` file is the same violation as the original export, and it is exactly the shape a
//     "compatibility shim" would take while looking like a fix. If a legitimate async-only re-export
//     is ever needed, this rule is what must be revisited — not silently deleted.
//   • Inline `"use server"` directives inside a function body (the other way to declare a server
//     action) are not examined at all. Only module-level directives are.
//   • A `const` whose initializer is an identifier or call that HAPPENS to evaluate to an async
//     function (`export const f = wrap(g)`) is flagged even though Next might accept it. Type
//     inference is not performed; the check is syntactic.
//   • This proves the module's EXPORT SHAPE is legal. It does not prove the module evaluates — a
//     bad import or a top-level throw is still only caught by `npm run build`.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

const SRC_DIR = resolve(process.cwd(), "src");

/** A single illegal export, rendered as one readable line for the failure diff. */
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

function parse(fileName: string, text: string): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/**
 * True only when `"use server"` sits in the module's directive prologue — i.e. it is one of the
 * leading string-literal expression statements. Comments are not statements, so prose mentions of
 * the directive (15 files in src/ have them) are correctly ignored.
 */
function hasUseServerDirective(sf: ts.SourceFile): boolean {
  for (const stmt of sf.statements) {
    const isDirective =
      ts.isExpressionStatement(stmt) && ts.isStringLiteral(stmt.expression);
    if (!isDirective) return false; // prologue is over; anything later is not a directive.
    const literal = (stmt as ts.ExpressionStatement).expression as ts.StringLiteral;
    if (literal.text === "use server") return true;
  }
  return false;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  return (ts.getModifiers(node) ?? []).some((m) => m.kind === kind);
}

const isExported = (n: ts.Node) => hasModifier(n, ts.SyntaxKind.ExportKeyword);
const isAsync = (n: ts.Node) => hasModifier(n, ts.SyntaxKind.AsyncKeyword);

/** An `async () => {}` / `async function () {}` initializer is the only legal exported value. */
function isAsyncFunctionExpression(node: ts.Node | undefined): boolean {
  if (!node) return false;
  return (
    (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && isAsync(node)
  );
}

/** First line of the node's source, trimmed and truncated — the evidence in the failure message. */
function snippet(node: ts.Node, sf: ts.SourceFile): string {
  const first = node.getText(sf).split("\n")[0].trim();
  return first.length > 72 ? `${first.slice(0, 72)}…` : first;
}

function lineOf(node: ts.Node, sf: ts.SourceFile): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

/**
 * Scan one already-parsed module. Returns one line per illegal export.
 * `label` is the path shown in failures (repo-relative, forward slashes).
 */
function findIllegalExports(sf: ts.SourceFile, label: string): Violation[] {
  const violations: Violation[] = [];
  const at = (node: ts.Node, name: string, why: string) =>
    violations.push(
      `${label}:${lineOf(node, sf)} exports ${name} — ${why}: \`${snippet(node, sf)}\``,
    );

  // Index top-level declarations by name so a local `export { x }` list can be resolved.
  const localDecls = new Map<string, ts.Statement>();
  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      localDecls.set(stmt.name.text, stmt);
    } else if (ts.isClassDeclaration(stmt) && stmt.name) {
      localDecls.set(stmt.name.text, stmt);
    } else if (ts.isEnumDeclaration(stmt)) {
      localDecls.set(stmt.name.text, stmt);
    } else if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) localDecls.set(d.name.text, stmt);
      }
    } else if (ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) {
      localDecls.set(stmt.name.text, stmt);
    }
  }

  /** Apply the rule to a declaration reached either via `export ...` or via `export { name }`. */
  function checkDeclaration(stmt: ts.Statement, name: string): void {
    // Types erase before Next sees the module — always legal.
    if (ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) return;

    if (ts.isFunctionDeclaration(stmt)) {
      if (!isAsync(stmt)) at(stmt, name, "not an async function");
      return;
    }
    if (ts.isClassDeclaration(stmt)) {
      at(stmt, name, "a class, not an async function");
      return;
    }
    if (ts.isEnumDeclaration(stmt)) {
      at(stmt, name, "an enum, not an async function");
      return;
    }
    if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(d.name) || d.name.text !== name) continue;
        if (!isAsyncFunctionExpression(d.initializer)) {
          at(d, name, "not an async function");
        }
      }
      return;
    }
    at(stmt, name, "not an async function");
  }

  for (const stmt of sf.statements) {
    // `export { … }` / `export * from …` / `export type { … }`
    if (ts.isExportDeclaration(stmt)) {
      if (stmt.isTypeOnly) continue; // erases.
      if (stmt.moduleSpecifier) {
        at(
          stmt,
          "(re-export)",
          "a re-export from another module, which this guard cannot verify and which is the same violation if the target is not async",
        );
        continue;
      }
      if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) {
          if (el.isTypeOnly) continue;
          const local = (el.propertyName ?? el.name).text;
          const decl = localDecls.get(local);
          if (!decl) {
            at(el, el.name.text, "exported but not declared in this module");
          } else {
            checkDeclaration(decl, local);
          }
        }
      }
      continue;
    }

    // `export default <expr>`
    if (ts.isExportAssignment(stmt)) {
      if (!isAsyncFunctionExpression(stmt.expression)) {
        at(stmt, "default", "not an async function");
      }
      continue;
    }

    if (!isExported(stmt)) continue;

    if (ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) continue;

    if (ts.isFunctionDeclaration(stmt)) {
      if (!isAsync(stmt)) at(stmt, stmt.name?.text ?? "default", "not an async function");
    } else if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (!isAsyncFunctionExpression(d.initializer)) {
          const name = ts.isIdentifier(d.name) ? d.name.text : snippet(d.name, sf);
          at(d.initializer ?? d, name, "not an async function");
        }
      }
    } else if (ts.isClassDeclaration(stmt)) {
      at(stmt, stmt.name?.text ?? "default", "a class, not an async function");
    } else if (ts.isEnumDeclaration(stmt)) {
      at(stmt, stmt.name.text, "an enum, not an async function");
    }
  }

  return violations;
}

/** Every `"use server"` module under src/, with its illegal exports. */
function scanSrc(): { serverModules: string[]; violations: Violation[] } {
  const serverModules: string[] = [];
  const violations: Violation[] = [];
  for (const file of collectSourceFiles(SRC_DIR)) {
    const sf = parse(file, readFileSync(file, "utf8"));
    if (!hasUseServerDirective(sf)) continue;
    const label = relative(process.cwd(), file).split("\\").join("/");
    serverModules.push(label);
    violations.push(...findIllegalExports(sf, label));
  }
  return { serverModules, violations };
}

describe('the "use server" module contract', () => {
  const { serverModules, violations } = scanSrc();

  // Guard-the-guard: if the scanner silently stopped finding server modules (a moved directory, a
  // broken directive check), the real assertion below would pass vacuously — which is the exact
  // failure mode this whole file was written to prevent.
  it("finds the server-action modules it is supposed to be policing", () => {
    expect(serverModules.length).toBeGreaterThan(10);
    expect(serverModules).toContain("src/app/actions/avatar.ts");
  });

  it("does not mistake a comment or a string for the directive", () => {
    const commentOnly = parse(
      "fake-comment.ts",
      '// Pure/isomorphic: no "use client"/"use server" directive here.\nexport const X = 1;\n',
    );
    expect(hasUseServerDirective(commentOnly)).toBe(false);

    const lateString = parse(
      "fake-late.ts",
      'export const label = "use server";\nexport const N = 1;\n',
    );
    expect(hasUseServerDirective(lateString)).toBe(false);

    const real = parse("fake-real.ts", '"use server";\nexport const N = 1;\n');
    expect(hasUseServerDirective(real)).toBe(true);
  });

  it("flags the illegal export shapes and exempts the legal ones", () => {
    const sf = parse(
      "fake-mixed.ts",
      [
        '"use server";',
        "import { z } from 'zod';",
        "export const MAX = 5 * 1024;",
        "export const schema = z.string();",
        "export type Result = { ok: boolean };",
        "export interface Shape { a: number }",
        "export function sync() { return 1; }",
        "export async function ok(x: number) { return x; }",
        "export const okArrow = async () => 1;",
        "export class Thing {}",
        "const helper = 3;",
        "export { helper };",
      ].join("\n"),
    );
    expect(hasUseServerDirective(sf)).toBe(true);
    const found = findIllegalExports(sf, "fake-mixed.ts").join("\n");

    // Flagged: every runtime value that is not an async function.
    expect(found).toContain("exports MAX");
    expect(found).toContain("exports schema");
    expect(found).toContain("exports sync");
    expect(found).toContain("exports Thing");
    expect(found).toContain("exports helper");
    // Exempt: async functions and anything type-only.
    expect(found).not.toContain("exports ok ");
    expect(found).not.toContain("okArrow");
    expect(found).not.toContain("Result");
    expect(found).not.toContain("Shape");
  });

  it('every "use server" module in src/ exports only async functions', () => {
    expect(violations).toEqual([]);
  });
});
