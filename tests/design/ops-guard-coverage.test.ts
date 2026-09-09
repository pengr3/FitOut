// OPS-02, STRUCTURALLY — the three-layer guard (D-216 / D-219 / D-247), pinned as a property of the
// source tree rather than as a claim in a summary.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ WHAT THIS FILE DOES NOT PROVE, SAID FIRST BECAUSE IT IS THE HALF PEOPLE ASSUME
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// **IT CANNOT SEE AN HTTP STATUS LINE.** `tests/design/soft-404-status.test.ts:31-39` states the rule
// this file inherits, verbatim: *"The e2e spec is the ONLY instrument in this repo that can see an
// HTTP status line. It needs a browser and a server, so nothing here runs it and nothing here can
// reproduce its number."* And PROJECT D-24 keeps every e2e spec but one out of CI, so even that
// instrument is sampled at "whenever a human remembers to run it".
//
// OPS-02's last clause — a non-staff caller cannot distinguish `/ops` from a route that does not
// exist — is therefore settled by a ONE-TIME PRODUCTION-BUILD `curl` AUDIT recorded as evidence, and
// that audit is **plan 18-14's first task**: staff -> 200, non-staff -> 404, signed-out -> 404,
// `/ops/xyz` -> 404, all four read off a `next build` + `next start` server. Nothing below substitutes
// for it. Pairing a structural gate with a manual audit is the shipped pattern here
// (`soft-404-status.test.ts` pairs with `e2e/public-listing.spec.ts:385`;
// `invite-notfound-parity.test.ts` pairs with a human-read `curl` transcript); claiming the structural
// half settles the requirement would be this phase's Pitfall 9 exactly.
//
// WHAT IT DOES PROVE, and it is the half a Vitest run can honestly own: that the three layers EXIST,
// that each is in the position its job requires, and that the shapes which would silently retire one
// of them are absent.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE THREE LAYERS, AND WHY EACH NEEDS ITS OWN CLAUSE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
//   LAYER 1  `assertStaff()` in `(ops)/ops/layout.tsx`, ABOVE the Suspense boundary `loading.tsx`
//            creates. It exists ONLY to win the status line and its own header says — in
//            `src/proxy.ts:1`'s words — that it is NOT the security boundary. Asserted here as a
//            POSITION, not merely a presence: inside the default export's body, awaited, with no JSX
//            ancestor of any kind.
//   LAYER 2  `requireStaff()` in every `(ops)` page, independently, every render. Next's own
//            authentication guide is the argument: a layout "does not control whether the rest of the
//            route renders", and it does not re-render on navigation under Partial Rendering.
//   LAYER 3  `requireStaff()` as the FIRST statement of every ops server action. Next requires Server
//            Actions be treated "with the same security considerations as public-facing API
//            endpoints" — no layout and no page can cover a POST.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS IS AN AST WALK AND NOT A GREP — MEASURED IN THIS VERY COMMIT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// 18-12's own plan states the criterion as `grep -c "requireStaff()" src/app/(ops)/ops/page.tsx`
// returning 1. Run against the shipped, CORRECT file it returns **2** — because that page's header
// carries the doctrine paragraph explaining why the page re-gates, and that paragraph names the
// function. This is at least the eighth instance of that shape in this repository (18-05 hit it three
// times in one plan, 18-10 twice more), and it is why every count below is over CALL EXPRESSIONS: a
// mention in a comment or in a string is invisible to this file by construction, and a self-test at
// the bottom proves it rather than asserting it.
//
// The walk also RESOLVES THE BINDING through the import, `card-pattern-coverage.test.ts`'s idiom. A
// locally-declared `function requireStaff() {}` satisfies a bare call-expression scan perfectly while
// gating nothing at all — and on this surface that is not a hypothetical tidy-up, it is what a
// "let's stop importing from lib in a route file" refactor produces.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// GUARD THE GUARD — asserted FIRST, because four of the clauses below are "a list was empty"
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A walk that resolves to nothing satisfies every absence assertion in this file perfectly. That
// failure has been measured in this repository often enough that `loading-coverage.test.ts`,
// `blocking-session-gate.test.ts`, `error-boundaries.test.ts` and `soft-404-status.test.ts` all open
// with the same guard. Here it is sharper than usual: a RENAME of the route group — `(ops)` to
// anything else — would empty the scan, and the zero-`not-found.tsx` and zero-`redirect` clauses would
// then report a clean, green, entirely vacuous pass over a console that had moved.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   • THE STATUS LINE. See the top. Plan 18-14.
//   • IT IS SYNTACTIC, like its two siblings. `await gate()` where `gate` is a re-export of
//     `requireStaff` under another name passes nothing here, and `await someHelper()` that calls
//     `requireStaff` one module down fails the clause even though the guard runs. Both are deliberate:
//     the property being pinned is that the CALL IS AT THE SITE, which is what makes it readable by a
//     human reviewing the route file.
//   • IT PROVES THE GATE IS CALLED, NEVER THAT IT REFUSES. That `requireStaff` returns `notFound()`
//     for a NULL role, a near-miss role and a signed-out caller — and that all three refusals are
//     INDISTINGUISHABLE from each other — is `tests/ops/staff-guard.test.ts`'s subject, measured
//     against a real Better Auth session on an isolated schema, with the inverted predicate
//     mutation-scored at 4 of 7 cases red.
//   • THE ACTION CENSUS IS BY FILENAME PLUS ONE NAMED EXCEPTION. `ops-*.ts` plus
//     `cancelBookingAsOps`. An eighth ops action added to a file matching neither is invisible —
//     which is why the exception is DECLARED by name rather than inferred, and why the count is
//     pinned. Phase 20 brings the census to SEVENTEEN; see `EXPECTED_OPS_ACTIONS`.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync, type Dirent } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

/** The scanned trees, as constants — the vacuity probe is a one-line edit here. */
const APP_DIR = resolve(process.cwd(), "src/app");
const OPS_GROUP_DIR = resolve(APP_DIR, "(ops)");
const ACTIONS_DIR = resolve(APP_DIR, "actions");

/** The ONE module both guards must resolve to. A same-named local helper is not this. */
const GUARD_MODULE = "@/lib/ops/staff";
const BOUNDARY_GUARD = "requireStaff";
const ORIGIN_GUARD = "requireOpsMutationOrigin";
const STATUS_LINE_GUARD = "assertStaff";

/** The layout that carries layer 1, by path — so a MOVED layout fails rather than disappears. */
const OPS_LAYOUT = "src/app/(ops)/ops/layout.tsx";

/**
 * The ops server actions, and the count they are pinned at.
 *
 * FIVE live in `src/app/actions/ops-review.ts` and are found by the filename glob. The SIXTH —
 * `cancelBookingAsOps` — lives in `src/app/actions/cancel-booking.ts` beside the booker and host
 * cancellation paths, because it shares their refund rail, and a filename-only census would miss the
 * one ops action that MOVES MONEY. It is declared by name here rather than found, and the total is
 * pinned, so an ops action added to a file matching neither convention fails this file.
 *
 * THE SEVENTH IS `revealHostContact`, added by plan 18.1-13 (OPS-06 / D-257 / D-271) in
 * `src/app/actions/ops-contact.ts`. It needs NO `EXTRA_OPS_ACTIONS` row — that filename is what the
 * `ops-*.ts` glob is for — and `EXTRA_OPS_ACTIONS` is therefore byte-unchanged by that plan. What
 * moved is this number and this paragraph, together, in one commit, which is what the pin is for.
 *
 * ⚠ IT IS ALSO THE ONE OPS ACTION THAT RETURNS PII, and that makes the layer-3 clause below matter
 * more here than anywhere else on this surface rather than less. The other six FLIP something and are
 * refused by guards in their `WHERE`; this one READS a host's email and phone and hands them to
 * whoever called it, so `requireStaff()` being the FIRST statement — before the parse, before the
 * rate limit — is the entire boundary. The behavioural half (a non-staff and a signed-out caller each
 * refused BEFORE any read, with a positive staff control so the refusal cannot be passing for the
 * wrong reason) is `tests/ops/host-contact-reveal.test.ts`'s subject; this file owns the syntactic
 * half, which is the one a human can check by reading the route file.
 */
const EXTRA_OPS_ACTIONS: readonly { readonly file: string; readonly name: string }[] = [
  { file: "src/app/actions/cancel-booking.ts", name: "cancelBookingAsOps" },
];
const EXPECTED_OPS_ACTIONS = 17;
const OPS_AUTH_ACTION_FILE = "src/app/actions/ops-auth.ts";

/** D-246. One queue, one page. Every extra page costs a `loading.tsx` and moves three pinned counts. */
const EXPECTED_OPS_PAGES = 1;

/**
 * The two refusal shapes D-219 forbids on this route group.
 *
 * A 403 tells a prober the route is real; a bounce to `/login` tells them the same thing more
 * politely. Refusal is `notFound()` and nothing else — asserted here as the ABSENCE of the two
 * alternatives at any `(ops)` call site, with the presence half proved in
 * `tests/ops/staff-guard.test.ts` case 6 (all four refusals indistinguishable).
 */
const FORBIDDEN_REFUSALS = ["forbidden", "redirect"] as const;

const rel = (p: string) => relative(process.cwd(), p).replace(/\\/g, "/");

function parse(file: string, text: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/** Every file with a given basename under a directory, recursively. `[]` on a missing tree. */
function collect(dir: string, basename: string, out: string[] = []): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collect(full, basename, out);
    else if (entry.name === basename) out.push(full);
  }
  return out;
}

/** Every `.ts`/`.tsx` file under a directory, recursively. */
function collectAll(dir: string, out: string[] = []): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectAll(full, out);
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/**
 * The local bindings a module imports for `wanted` from `module`.
 *
 * `import { requireStaff } from "@/lib/ops/staff"` yields `requireStaff`; `import { requireStaff as
 * gate }` yields `gate`. A module that declares its OWN `requireStaff` yields nothing, which is the
 * whole point.
 */
export function bindingsFor(sf: ts.SourceFile, moduleName: string, wanted: string): Set<string> {
  const bindings = new Set<string>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    if (stmt.moduleSpecifier.text !== moduleName) continue;
    const named = stmt.importClause?.namedBindings;
    if (named === undefined || !ts.isNamedImports(named)) continue;
    for (const el of named.elements) {
      if ((el.propertyName?.text ?? el.name.text) === wanted) bindings.add(el.name.text);
    }
  }
  return bindings;
}

type GuardCall = {
  readonly line: number;
  readonly awaited: boolean;
  readonly jsxAncestor: boolean;
  readonly suspenseAncestor: boolean;
  readonly inDefaultExport: boolean;
};

/** The last segment of a JSX tag name — so `Suspense` and `React.Suspense` are one tag. */
function tagName(node: ts.JsxTagNameExpression, sf: ts.SourceFile): string {
  return node.getText(sf).split(".").pop() ?? "";
}

/** `export default async function X() {}`, or `null`. */
function defaultExportFunction(sf: ts.SourceFile): ts.FunctionDeclaration | null {
  for (const stmt of sf.statements) {
    if (!ts.isFunctionDeclaration(stmt)) continue;
    const modifiers = ts.getModifiers(stmt) ?? [];
    if (
      modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
      modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
    ) {
      return stmt;
    }
  }
  return null;
}

/**
 * Every call to one of `bindings`, with the ancestry that decides whether it is in a position to do
 * its job. CALL EXPRESSIONS ONLY — a comment or a string naming the guard is invisible here.
 */
export function guardCalls(sf: ts.SourceFile, bindings: ReadonlySet<string>): GuardCall[] {
  const found: GuardCall[] = [];
  const defaultExport = defaultExportFunction(sf);

  const inDefaultExportBody = (node: ts.Node): boolean => {
    const body = defaultExport?.body;
    if (body === undefined) return false;
    let cursor: ts.Node | undefined = node.parent;
    while (cursor) {
      if (cursor === body) return true;
      cursor = cursor.parent;
    }
    return false;
  };

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      bindings.has(node.expression.text)
    ) {
      let awaited = false;
      let jsxAncestor = false;
      let suspenseAncestor = false;
      let cursor: ts.Node | undefined = node.parent;
      while (cursor) {
        if (ts.isAwaitExpression(cursor)) awaited = true;
        if (ts.isJsxElement(cursor)) {
          jsxAncestor = true;
          if (tagName(cursor.openingElement.tagName, sf) === "Suspense") suspenseAncestor = true;
        } else if (ts.isJsxSelfClosingElement(cursor)) {
          jsxAncestor = true;
          if (tagName(cursor.tagName, sf) === "Suspense") suspenseAncestor = true;
        } else if (ts.isJsxFragment(cursor) || ts.isJsxExpression(cursor)) {
          jsxAncestor = true;
        }
        cursor = cursor.parent;
      }
      found.push({
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        awaited,
        jsxAncestor,
        suspenseAncestor,
        inDefaultExport: inDefaultExportBody(node),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** Every bare-identifier call to one of `names`, anywhere in the module. */
export function bareCalls(sf: ts.SourceFile, names: readonly string[]): string[] {
  const hits: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      names.includes(node.expression.text)
    ) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      hits.push(`${sf.fileName}:${line} ${node.expression.text}()`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return hits;
}

/**
 * Whether the guard is the function's FIRST statement.
 *
 * `const staff = await requireStaff();` and a bare `await requireStaff();` both qualify; anything
 * before either does not. That ordering is the shipped rule and it is not decorative: ops standing is
 * a property of the CALLER alone, so settling it first means a non-staff caller is refused without
 * consuming anybody's rate-limit budget and without learning whether the ids they sent exist.
 */
export function guardsFirst(fn: ts.FunctionDeclaration, bindings: ReadonlySet<string>): boolean {
  const first = fn.body?.statements[0];
  if (first === undefined) return false;
  let expr: ts.Expression | undefined;
  if (ts.isExpressionStatement(first)) expr = first.expression;
  else if (ts.isVariableStatement(first)) {
    expr = first.declarationList.declarations[0]?.initializer;
  }
  if (expr === undefined) return false;
  const inner = ts.isAwaitExpression(expr) ? expr.expression : expr;
  return (
    ts.isCallExpression(inner) &&
    ts.isIdentifier(inner.expression) &&
    bindings.has(inner.expression.text)
  );
}

/** Exact two-stage mutation boundary: resolved origin guard first, resolved staff guard second. */
export function guardsFirstAndSecond(
  fn: ts.FunctionDeclaration,
  originBindings: ReadonlySet<string>,
  staffBindings: ReadonlySet<string>,
): boolean {
  const statements = fn.body?.statements;
  if (statements === undefined || statements.length < 2) return false;

  const calledBinding = (statement: ts.Statement, bindings: ReadonlySet<string>): boolean => {
    let expr: ts.Expression | undefined;
    if (ts.isExpressionStatement(statement)) expr = statement.expression;
    else if (ts.isVariableStatement(statement)) {
      expr = statement.declarationList.declarations[0]?.initializer;
    }
    if (expr === undefined) return false;
    const inner = ts.isAwaitExpression(expr) ? expr.expression : expr;
    return (
      ts.isCallExpression(inner) &&
      ts.isIdentifier(inner.expression) &&
      bindings.has(inner.expression.text)
    );
  };

  return (
    calledBinding(statements[0], originBindings) &&
    calledBinding(statements[1], staffBindings)
  );
}

/** Every exported async function declaration in a module, by name. */
function exportedFunctions(sf: ts.SourceFile): Map<string, ts.FunctionDeclaration> {
  const out = new Map<string, ts.FunctionDeclaration>();
  for (const stmt of sf.statements) {
    if (!ts.isFunctionDeclaration(stmt) || stmt.name === undefined) continue;
    const modifiers = ts.getModifiers(stmt) ?? [];
    if (!modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    if (modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) continue;
    out.set(stmt.name.text, stmt);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE SCAN, run once at module load.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

type OpsFile = {
  readonly label: string;
  readonly sf: ts.SourceFile;
  readonly statements: number;
};

const OPS_FILES: OpsFile[] = collectAll(OPS_GROUP_DIR)
  .sort()
  .map((abs) => {
    const label = rel(abs);
    const sf = parse(label, readFileSync(abs, "utf8"));
    return { label, sf, statements: sf.statements.length };
  });

const OPS_PAGES = collect(OPS_GROUP_DIR, "page.tsx").sort().map(rel);
const OPS_NOT_FOUND = collect(OPS_GROUP_DIR, "not-found.tsx").sort().map(rel);

/** `src/app/actions/ops-*.ts` — the filename half of the action census. */
const OPS_ACTION_FILES = (() => {
  let entries: Dirent[] = [];
  try {
    entries = readdirSync(ACTIONS_DIR, { withFileTypes: true });
  } catch {
    return [] as string[];
  }
  return entries
    .filter((e) => e.isFile() && e.name.startsWith("ops-") && e.name.endsWith(".ts"))
    .map((e) => rel(join(ACTIONS_DIR, e.name)))
    .sort();
})();

type ActionRow = {
  readonly file: string;
  readonly name: string;
  readonly guardsFirst: boolean;
  readonly originFirst: boolean;
  readonly originFirstStaffSecond: boolean;
  readonly bound: boolean;
};

const ACTIONS: ActionRow[] = (() => {
  const rows: ActionRow[] = [];
  const scanFile = (label: string, only?: string): void => {
    const abs = resolve(process.cwd(), label);
    if (!existsSync(abs)) return;
    const sf = parse(label, readFileSync(abs, "utf8"));
    const bindings = bindingsFor(sf, GUARD_MODULE, BOUNDARY_GUARD);
    const originBindings = bindingsFor(sf, GUARD_MODULE, ORIGIN_GUARD);
    for (const [name, fn] of exportedFunctions(sf)) {
      if (only !== undefined && name !== only) continue;
      rows.push({
        file: label,
        name,
        guardsFirst: guardsFirst(fn, bindings),
        originFirst: guardsFirst(fn, originBindings),
        originFirstStaffSecond: guardsFirstAndSecond(fn, originBindings, bindings),
        bound: bindings.size > 0,
      });
    }
  };
  for (const file of OPS_ACTION_FILES) scanFile(file);
  for (const extra of EXTRA_OPS_ACTIONS) scanFile(extra.file, extra.name);
  return rows;
})();

const LAYOUT_ABS = resolve(process.cwd(), OPS_LAYOUT);
const LAYOUT_SF = existsSync(LAYOUT_ABS)
  ? parse(OPS_LAYOUT, readFileSync(LAYOUT_ABS, "utf8"))
  : null;

describe("OPS-02 — the three-layer guard, as a property of the source tree", () => {
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // GUARD THE GUARD, ASSERTED FIRST.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("scanned a real, non-empty (ops) tree", () => {
    expect(
      OPS_FILES.length,
      `scanned: ${OPS_FILES.map((f) => f.label).join(", ") || "(nothing)"}. A walk that opened ` +
        "nothing satisfies the zero-not-found, zero-redirect and one-page clauses below perfectly — " +
        "which is exactly what a RENAME of the route group would produce.",
    ).toBeGreaterThanOrEqual(4);
    // Named as well as counted: the four route files this group is required to have.
    const labels = OPS_FILES.map((f) => f.label);
    for (const required of [
      OPS_LAYOUT,
      "src/app/(ops)/ops/page.tsx",
      "src/app/(ops)/ops/loading.tsx",
      "src/app/(ops)/ops/error.tsx",
    ]) {
      expect(labels, `${required} was not found by the walk`).toContain(required);
      expect(existsSync(resolve(process.cwd(), required)), `${required} is not on disk`).toBe(true);
    }
  });

  it("really parsed every (ops) file it counted", () => {
    for (const file of OPS_FILES) {
      expect(file.statements, `${file.label} parsed to zero statements`).toBeGreaterThan(0);
    }
  });

  it("found the ops actions it is supposed to be policing, and each named file exists", () => {
    expect(
      OPS_ACTION_FILES.length,
      "no src/app/actions/ops-*.ts was found — the layer-3 clause below would then be asserting " +
        "over an empty set and would pass against a console with no gate on any action at all.",
    ).toBeGreaterThan(0);
    for (const extra of EXTRA_OPS_ACTIONS) {
      expect(
        existsSync(resolve(process.cwd(), extra.file)),
        `${extra.file} is declared here but is not on disk`,
      ).toBe(true);
      expect(
        ACTIONS.some((a) => a.name === extra.name),
        `${extra.name} is declared as an ops action but the walk never found it in ${extra.file}`,
      ).toBe(true);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // LAYER 1 — the status line, and its POSITION.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it(`${OPS_LAYOUT} awaits ${STATUS_LINE_GUARD}() above any JSX`, () => {
    expect(LAYOUT_SF, `${OPS_LAYOUT} is not on disk`).not.toBeNull();
    if (LAYOUT_SF === null) return;

    const bindings = bindingsFor(LAYOUT_SF, GUARD_MODULE, STATUS_LINE_GUARD);
    expect(
      [...bindings],
      `${OPS_LAYOUT} does not import { ${STATUS_LINE_GUARD} } from "${GUARD_MODULE}". A ` +
        "locally-declared function of the same name satisfies a bare call scan while gating nothing.",
    ).not.toEqual([]);

    const calls = guardCalls(LAYOUT_SF, bindings);
    expect(
      calls.length,
      `${OPS_LAYOUT} makes no real call to ${STATUS_LINE_GUARD}() — layer 1 is missing, so a ` +
        "non-staff caller gets a 200 with a not-found body and a prober separates \"exists but " +
        "forbidden\" from \"does not exist\" with one curl (D-219 / D-247).",
    ).toBe(1);

    const call = calls[0];
    expect(
      call.awaited,
      `${OPS_LAYOUT}:${call.line} calls ${STATUS_LINE_GUARD}() without awaiting it. An un-awaited ` +
        "promise does not block the shell flush, which is the only thing this layer is for.",
    ).toBe(true);
    expect(
      call.suspenseAncestor,
      `${OPS_LAYOUT}:${call.line} sits inside a <Suspense> subtree. A boundary streams the shell ` +
        "around it BEFORE it resolves, so the ops chrome — which says \"Ops\" — reaches the browser " +
        "and only then does the refusal happen. Bytes on the wire cannot be un-sent, and here they " +
        "ARE the existence oracle.",
    ).toBe(false);
    expect(
      call.jsxAncestor,
      `${OPS_LAYOUT}:${call.line} has a JSX ancestor. The assert must run in the layout function's ` +
        "body, before any element exists — not inside a rendered subtree, which is where a " +
        "well-meaning \"extract this\" refactor puts it.",
    ).toBe(false);
    expect(
      call.inDefaultExport,
      `${OPS_LAYOUT}:${call.line} sits outside the layout's default export. A gate in a helper or a ` +
        "sibling component runs wherever that component is MOUNTED, which may be inside a streaming " +
        "boundary — containment is the property, not source order.",
    ).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // LAYER 2 — every page re-gates, and there is exactly one page.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("gives every (ops) page its own resolved requireStaff() call", () => {
    const ungated = OPS_PAGES.filter((label) => {
      const sf = parse(label, readFileSync(resolve(process.cwd(), label), "utf8"));
      const bindings = bindingsFor(sf, GUARD_MODULE, BOUNDARY_GUARD);
      return bindings.size === 0 || guardCalls(sf, bindings).length === 0;
    });
    expect(
      ungated,
      `these (ops) pages do not call ${BOUNDARY_GUARD}() from ${GUARD_MODULE} themselves. The ` +
        "layout is NOT the gate: Next's own authentication guide says a layout \"does not control " +
        "whether the rest of the route renders\", and under Partial Rendering it does not re-render " +
        "on navigation at all (D-216).",
    ).toEqual([]);
  });

  it(`resolves src/app/(ops)/**/page.tsx to exactly ${EXPECTED_OPS_PAGES} file (D-246)`, () => {
    expect(
      OPS_PAGES,
      "the ops console is not one page. D-246: one queue, hosts and listings interleaved, oldest " +
        "first, everything needed to decide on the same screen. A second page is not only a product " +
        "change — it costs another loading.tsx and moves all three of loading-coverage's pinned " +
        "counts, so the product answer and the cheap answer agree.",
    ).toHaveLength(EXPECTED_OPS_PAGES);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // LAYER 3 — every ops action gates FIRST.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("makes the exact origin guard first and staff guard second in every privileged ops action", () => {
    const bad = ACTIONS.filter(
      (action) => action.file !== OPS_AUTH_ACTION_FILE && !action.originFirstStaffSecond,
    ).map((action) => `${action.file}:${action.name}`);
    expect(
      bad,
      `these ops server actions do not open with a resolved ${BOUNDARY_GUARD}() call. Next requires ` +
        "Server Actions be treated with the same security considerations as public-facing API " +
        "endpoints — a \"use server\" export is reachable by POST whatever the UI shows, so neither " +
        "the layout nor the page covers it. FIRST, before the parse and before the rate limit: ops " +
        "standing is a property of the caller alone, so settling it first refuses a non-staff caller " +
        "without consuming anybody's budget and without telling them whether the ids they sent exist.",
    ).toEqual([]);
  });

  it("makes the exact origin guard first in every signed-out ops authentication action", () => {
    const authActions = ACTIONS.filter((action) => action.file === OPS_AUTH_ACTION_FILE);
    expect(authActions.map((action) => action.name).sort()).toEqual([
      "acceptStaffInviteAction",
      "requestOpsPasswordReset",
      "resetOpsPassword",
      "signInOps",
      "signOutOps",
      "signOutOpsAction",
    ]);
    expect(
      authActions.filter((action) => !action.originFirst).map((action) => action.name),
      "signed-out ops authentication cannot require staff, but every mutation must reject a wrong " +
        "Host/Origin before parsing credentials or calling Better Auth",
    ).toEqual([]);
  });

  it("pins the complete review-action subset to the same two-stage boundary", () => {
    const bad = ACTIONS.filter(
      (action) =>
        action.file === "src/app/actions/ops-review.ts" && !action.originFirstStaffSecond,
    ).map((action) => `${action.file}:${action.name}`);
    expect(
      bad,
      "every privileged review action must resolve requireOpsMutationOrigin from the staff module " +
        "as statement one and requireStaff from that module as statement two",
    ).toEqual([]);
  });

  it(`pins the ops action census at ${EXPECTED_OPS_ACTIONS}`, () => {
    expect(
      ACTIONS.map((a) => `${a.file}:${a.name}`).sort(),
      "the set of ops server actions changed. A NEW one needs no edit here if it lives in an " +
        "ops-*.ts file — but a new one that does NOT is invisible to the glob and has to be declared " +
        "in EXTRA_OPS_ACTIONS, which is the whole reason this count is pinned as well as the clause " +
        "above being asserted.",
    ).toHaveLength(EXPECTED_OPS_ACTIONS);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // D-219 — the refusal shape, and the absence of a second 404 body.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("resolves src/app/(ops)/**/not-found.tsx to ZERO files", () => {
    expect(
      OPS_NOT_FOUND,
      "an (ops)-scoped not-found.tsx exists. A DISTINCT 404 body under /ops is itself the existence " +
        "oracle D-219 exists to remove: the refusal must be byte-identical to what any bad URL " +
        "produces, and that is the ROOT src/app/not-found.tsx. This is the one file whose mere " +
        "presence — whatever it contains — is the defect.",
    ).toEqual([]);
  });

  it("lets no (ops) file refuse with anything but notFound()", () => {
    const hits = OPS_FILES.flatMap((f) => bareCalls(f.sf, FORBIDDEN_REFUSALS));
    expect(
      hits,
      "these (ops) call sites refuse with something other than notFound(). A 403 tells a prober the " +
        "route is real; a bounce to /login tells them the same thing more politely. Both are " +
        "distinguishable refusals, and a distinguishable refusal IS the oracle (D-219). That the " +
        "guard's own notFound() is indistinguishable from a nonexistent route across all four " +
        "refusal classes is measured in tests/ops/staff-guard.test.ts case 6.",
    ).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // BOTH-DIRECTIONS SELF-TESTS, on fixtures never written to disk — so the code path the real
  // assertions run is the same one the fixtures prove.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("does not count a guard named in a COMMENT or in a STRING", () => {
    // THE MEASURED CASE, not a hypothetical: the shipped (ops) page's header explains why the page
    // re-gates, and that paragraph names the function — which is why `grep -c` returns 2 against a
    // correct file and this scan returns 1.
    const src = [
      "import { requireStaff } from \"@/lib/ops/staff\";",
      "// this page calls requireStaff() itself, first, every render",
      "const note = \"requireStaff()\";",
      "export default async function Page() { await requireStaff(); return null; }",
    ].join("\n");
    const sf = parse("fake-page.tsx", src);
    expect(guardCalls(sf, bindingsFor(sf, GUARD_MODULE, BOUNDARY_GUARD))).toHaveLength(1);
  });

  it("does not count a LOCALLY DECLARED function of the same name", () => {
    const src = [
      "async function requireStaff() { return { id: \"anyone\" }; }",
      "export default async function Page() { await requireStaff(); return null; }",
    ].join("\n");
    const sf = parse("fake-local.tsx", src);
    // No import, so no binding, so no call — the shape a "stop importing from lib" refactor makes.
    expect(bindingsFor(sf, GUARD_MODULE, BOUNDARY_GUARD).size).toBe(0);
    expect(guardCalls(sf, bindingsFor(sf, GUARD_MODULE, BOUNDARY_GUARD))).toHaveLength(0);
  });

  it("counts a guard imported under an ALIAS", () => {
    const src = [
      "import { assertStaff as gate } from \"@/lib/ops/staff\";",
      "export default async function Layout() { await gate(); return null; }",
    ].join("\n");
    const sf = parse("fake-alias.tsx", src);
    const bindings = bindingsFor(sf, GUARD_MODULE, STATUS_LINE_GUARD);
    expect([...bindings]).toEqual(["gate"]);
    expect(guardCalls(sf, bindings)).toHaveLength(1);
  });

  it("sees a guard moved BELOW the returned JSX, in both of the shapes that hides it", () => {
    const inline = [
      "import { assertStaff } from \"@/lib/ops/staff\";",
      "export default async function Layout({ children }) {",
      "  return <Suspense fallback={null}>{await assertStaff()}{children}</Suspense>;",
      "}",
    ].join("\n");
    const sfInline = parse("fake-below.tsx", inline);
    const [call] = guardCalls(sfInline, bindingsFor(sfInline, GUARD_MODULE, STATUS_LINE_GUARD));
    expect(call?.jsxAncestor).toBe(true);
    expect(call?.suspenseAncestor).toBe(true);

    // The shape a source-order check misses entirely: textually ABOVE the JSX, mounted inside it.
    const extracted = [
      "import { assertStaff } from \"@/lib/ops/staff\";",
      "async function Gate() { await assertStaff(); return null; }",
      "export default async function Layout({ children }) { return <div><Gate />{children}</div>; }",
    ].join("\n");
    const sfExtracted = parse("fake-extracted.tsx", extracted);
    const [extractedCall] = guardCalls(
      sfExtracted,
      bindingsFor(sfExtracted, GUARD_MODULE, STATUS_LINE_GUARD),
    );
    expect(extractedCall?.jsxAncestor).toBe(false);
    expect(
      extractedCall?.inDefaultExport,
      "a guard extracted into a sibling component is textually above the JSX and runs wherever that " +
        "component is mounted — the containment clause is the only one that sees it",
    ).toBe(false);
  });

  it("does not accept a guard that is merely PRESENT in an action but not first", () => {
    const src = [
      "import { requireStaff } from \"@/lib/ops/staff\";",
      "export async function doThing(input) {",
      "  const parsed = schema.safeParse(input);",
      "  const staff = await requireStaff();",
      "  return staff;",
      "}",
    ].join("\n");
    const sf = parse("fake-action.ts", src);
    const bindings = bindingsFor(sf, GUARD_MODULE, BOUNDARY_GUARD);
    const fn = exportedFunctions(sf).get("doThing");
    expect(fn, "the fixture's exported function was not found").toBeDefined();
    if (fn === undefined) return;
    expect(guardsFirst(fn, bindings)).toBe(false);

    // …and the same module with the gate first IS accepted, so the fixture proves a difference.
    const fixed = src.replace(
      "  const parsed = schema.safeParse(input);\n  const staff = await requireStaff();",
      "  const staff = await requireStaff();\n  const parsed = schema.safeParse(input);",
    );
    const sfFixed = parse("fake-action-fixed.ts", fixed);
    const fnFixed = exportedFunctions(sfFixed).get("doThing");
    expect(fnFixed).toBeDefined();
    if (fnFixed === undefined) return;
    expect(guardsFirst(fnFixed, bindingsFor(sfFixed, GUARD_MODULE, BOUNDARY_GUARD))).toBe(true);
  });

  it("rejects swapped, missing, and locally-decoyed mutation guard sequences", () => {
    const valid = [
      'import { requireOpsMutationOrigin, requireStaff } from "@/lib/ops/staff";',
      "export async function decide(input) {",
      "  await requireOpsMutationOrigin();",
      "  const staff = await requireStaff();",
      "  return { input, staff };",
      "}",
    ].join("\n");

    const accepts = (source: string): boolean => {
      const sf = parse("fake-mutation.ts", source);
      const fn = exportedFunctions(sf).get("decide");
      if (fn === undefined) return false;
      return guardsFirstAndSecond(
        fn,
        bindingsFor(sf, GUARD_MODULE, ORIGIN_GUARD),
        bindingsFor(sf, GUARD_MODULE, BOUNDARY_GUARD),
      );
    };

    expect(accepts(valid)).toBe(true);
    expect(
      accepts(
        valid.replace(
          "  await requireOpsMutationOrigin();\n  const staff = await requireStaff();",
          "  const staff = await requireStaff();\n  await requireOpsMutationOrigin();",
        ),
      ),
    ).toBe(false);
    expect(accepts(valid.replace("  await requireOpsMutationOrigin();\n", ""))).toBe(false);
    expect(
      accepts(
        valid.replace(
          'import { requireOpsMutationOrigin, requireStaff } from "@/lib/ops/staff";',
          'import { requireStaff } from "@/lib/ops/staff";\n' +
            "async function requireOpsMutationOrigin() {}",
        ),
      ),
    ).toBe(false);
  });
});
