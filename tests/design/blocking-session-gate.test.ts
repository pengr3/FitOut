// T-04-06 / T-04-02 — THE RULE: *the session gate and both capability redirects run to completion
// before either group layout returns any JSX.*
//
// Plan 11-12 moved the two group layouts' ambient database reads behind `<Suspense>` boundaries so
// that a `loading.tsx` under `(app)` or `(host)` can actually render — Next's documented behaviour is
// that a layout awaiting runtime data blocks navigation, so until that moved, STATE-01 was
// unverifiable on most of both groups. The thing that must NOT move with it is the gate.
//
// A `<Suspense>` boundary is a promise that the shell around it may be streamed to the browser BEFORE
// the boundary resolves. A `redirect()` taken inside a streamed child is therefore taken AFTER the
// gated markup has already been sent, and bytes on the wire cannot be un-sent. `(app)/layout.tsx` is
// the only thing between an anonymous request and every booker page; `(host)/host/layout.tsx` is the
// only thing between a booker-only account and the host dashboard. This file is what makes "we did
// not move them" a mechanical fact rather than a claim in a commit message.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS WALKS PARENTS AND NOT LINE NUMBERS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The plan's own acceptance criterion is *"the `getSession` call and every `redirect(` appear BEFORE
// any `<Suspense` in source order"*. That check is green on this tree AND on a broken one, for two
// independent reasons, both of which are live in the very files it polices:
//
//   • IT COUNTS PROSE. `(app)/layout.tsx:14` and `(host)/host/layout.tsx:16` each write `<Suspense>`
//     inside the paragraph explaining why the gate may not go inside one — twenty-five lines ABOVE
//     the `getSession` call. A source-order grep reports both layouts as already violating the rule
//     they satisfy. Measured, not predicted: see the Verification table in `11-12-SUMMARY.md`.
//   • IT CHECKS THE WRONG PROPERTY. Source order is not lexical containment. A `redirect()` that is
//     textually first can still sit inside a component DEFINED above the JSX and MOUNTED inside a
//     boundary below it, which is the exact shape a well-meaning "let's extract this" refactor
//     produces — and it is invisible to any line-number comparison.
//
// So the scan is an AST walk with `setParentNodes`, and the property it asserts is stronger than the
// plan's: every gate call must sit inside the DEFAULT EXPORT'S BODY with NO JSX ancestor of any kind.
// "No `Suspense` ancestor" alone would pass the extracted-component shape above; "inside the default
// export" is what closes it. The `Suspense` clause is kept as its own named assertion anyway, because
// it is THE failure this file exists to catch and its message should say so.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — FOUR PROBES, ALL REVERTED, RECORDED VERBATIM (14 August 2026). GREEN IS 17 PASSED.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`).
// Command for all four: `npx vitest run --config vitest.design.config.ts
// tests/design/blocking-session-gate.test.ts`
//
//   (a) THE GATE BEHIND A BOUNDARY, INLINE. `(app)/layout.tsx`'s `if (!session?.user) redirect(…)`
//       deleted and rewritten as `{!session?.user && redirect("/login")}` INSIDE the existing bell
//       boundary. 2 failed / 15 passed:
//
//         AssertionError: a session gate sits inside a `<Suspense>` subtree. A boundary streams the
//         shell around it BEFORE it resolves, so the gated markup reaches the browser and only then
//         does the redirect happen — bytes already on the wire cannot be un-sent (T-04-06 /
//         T-04-02).: expected [ Array(1) ] to deeply equal []
//
//         - []
//         + [
//         +   "src/app/(app)/layout.tsx:86 — redirect() inside <Suspense>",
//         + ]
//
//         AssertionError: a session gate has a JSX ancestor. A gate must run in the layout
//         function's body, before any element exists …: expected [ Array(1) ] to deeply equal []
//
//         - []
//         + [
//         +   "src/app/(app)/layout.tsx:86 — redirect() has a JSX ancestor",
//         + ]
//
//       Note what did NOT move: the per-file redirect COUNT stayed at 1, because the gate was
//       relocated rather than removed. A count-only gate is green on this edit. Reverted → 17 passed.
//
//   (b) THE SHAPE THE ANCESTOR WALK ALONE WOULD MISS. `(app)/layout.tsx`'s gate extracted into a
//       sibling `AnonymousGate` component in the same file and mounted inside the existing boundary —
//       textually ABOVE the JSX, so the plan's source-order grep is green on it. 3 failed / 14 passed:
//
//         AssertionError: a session gate sits OUTSIDE the layout's default export. A gate in a helper
//         or in a sibling component runs wherever that component is mounted — which may be inside a
//         streaming boundary — so containment in the exported layout body is the property, not source
//         order.: expected [ …(2) ] to deeply equal []
//
//         - []
//         + [
//         +   "src/app/(app)/layout.tsx:35 — getSession() in AnonymousGate, not the default export",
//         + "src/app/(app)/layout.tsx:37 — redirect() in AnonymousGate, not the default export",
//         + ]
//
//         AssertionError: the scanner found no getSession call in either layout: expected 3 to be 2
//         AssertionError: a layout's redirect count changed …: expected [ 2, 2 ] to deeply equal [ 1, 2 ]
//
//       THE SUSPENSE CLAUSE AND THE JSX-ANCESTOR CLAUSE BOTH STAYED GREEN on this edit — the gate
//       really is lexically outside all JSX; it is only MOUNTED inside a boundary. That is the whole
//       argument for the containment clause existing, and it is pinned as a permanent fixture below
//       (`flags a gate extracted into a sibling component`). Reverted → 17 passed.
//
//   (c) THE AMBIENT READ INLINED BACK. `countUnread` re-inlined into `(host)/host/layout.tsx` — the
//       "optimisation" that undoes the whole plan while every gate assertion stays green. 1 failed /
//       16 passed:
//
//         AssertionError: a group layout performs an ambient database read again. Every await in a
//         layout blocks navigation for the whole group, which is what makes a `loading.tsx` under it
//         useless (STATE-01). These reads belong in
//         src/components/patterns/ambient-notifications.tsx, behind a boundary.: expected [ Array(1)
//         ] to deeply equal []
//
//         - []
//         + [
//         +   "src/app/(host)/host/layout.tsx: countUnread",
//         + ]
//
//       Reverted → 17 passed.
//
//   (d) VACUITY — THE PROBE WORTH READING, AND IT CHANGED THIS FILE. `SRC_DIR` re-pointed at
//       `src-nope`, so every file the scan opens is missing. FIRST RUN: 4 failed / 13 passed — and
//       `keeps the host's canHost capability gate` PASSED, because it was written as a `for…of` over
//       the parsed files and a loop over nothing satisfies every assertion inside it. It was rewritten
//       as one `toEqual` over ALL declared layouts with `?? null` for an unparsed one, and the probe
//       re-run: 5 failed / 12 passed:
//
//         AssertionError: the scanner parsed 0 of the 2 group layouts. Every clause in this file is
//         "a list was empty", and a scan that opened nothing satisfies all of them perfectly.:
//         expected [] to deeply equal [ 'src/app/(app)/layout.tsx', …(1) ]
//         AssertionError: the scanner found 0 redirect() calls across both layouts. An AST walk that
//         silently matched nothing would make every clause below pass against a layout with NO GATE
//         AT ALL.: expected 0 to be greater than or equal to 3
//         AssertionError: a layout's redirect count changed …: expected [] to deeply equal [ 1, 2 ]
//         AssertionError: the child was never parsed: src/components/patterns/ambient-
//         notifications.tsx is missing: expected null not to be null
//         AssertionError: the canHost capability gate (D-04 / T-04-02) changed …: expected [ null,
//         null ] to deeply equal [ false, true ]
//
//       …AND ALL FOUR ABSENCE CLAUSES — the Suspense clause, the JSX-ancestor clause, the
//       default-export-containment clause and the ambient-read clause — STILL PASSED, over a tree the
//       scanner never opened, each reporting a perfectly clean `[]` indistinguishable from a real
//       clean run. That is not fixable: an absence assertion cannot notice it was handed nothing.
//       Only a positive control over the scan can, which is why the four guards are asserted FIRST
//       here and why every count is pinned as an EQUALITY rather than a floor. Reverted → 17 passed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   • THIS READS STRUCTURE, NOT BEHAVIOUR. It proves the gate is written in a position that runs
//     before any JSX exists. It cannot prove the redirect actually FIRES, that it lands on `/login`,
//     or that the response carries no gated markup. That is `e2e/login-persistence.spec.ts` and
//     `e2e/stale-session-selfheal.spec.ts` (plus `e2e/mode-switch.spec.ts` for the canHost half), and
//     the pairing is named here so it is legible rather than assumed. A signed-out `curl -s -i` on
//     `/bookings` and `/host` is the third layer, recorded in `11-12-SUMMARY.md`.
//   • IT POLICES TWO NAMED FILES PLUS ONE NAMED CHILD. A THIRD gated layout added tomorrow is not in
//     `LAYOUTS` and is invisible here. The alternative — walking every `layout.tsx` and inferring
//     which ones gate — would make "this layout has no gate" and "this layout is not a gate" the same
//     state, which is precisely the shape that cannot be watched red. The list is deliberate; adding
//     a gated layout means adding a line here, in that commit.
//   • THE CHILD CLAUSE IS ONE FILE DEEP. It asserts `ambient-notifications.tsx` performs no session
//     read and no redirect. It does not follow that file's imports, so a gate hidden two modules down
//     would pass. That file's own header states the prohibition; this is the mechanical half of it,
//     not the whole of it.
//   • IT SAYS NOTHING ABOUT WHAT THE STREAMED CHILD READS. Owner-scoping (T-07-82) is asserted by the
//     absence of any session/header access in the child plus the shape of the query itself, not here.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

/** The scanned tree, as one constant — probe (d) above is a one-line edit here. */
const SRC_DIR = resolve(process.cwd(), "src");

/**
 * The two gated group layouts, and the per-file redirect count each one is pinned at.
 *
 * `(app)` has ONE (`/login`, no session). `(host)` has TWO (`/login`, no session; `/`, no canHost) —
 * the second is D-04/T-04-02's capability gate and is the one a "tidy-up" is most likely to drop,
 * because it looks like a duplicate of the first until you read what it checks.
 *
 * The counts are EQUALITIES, not floors. A floor is satisfied by a layout that grew a redirect and
 * lost the one that mattered.
 */
const LAYOUTS = [
  { label: "src/app/(app)/layout.tsx", redirects: 1, canHostGuard: false },
  { label: "src/app/(host)/host/layout.tsx", redirects: 2, canHostGuard: true },
] as const;

/** The async child the ambient read moved into. It may not gate; that is its whole contract. */
const CHILD_LABEL = "src/components/patterns/ambient-notifications.tsx";

/**
 * The reads that must no longer appear in either layout.
 *
 * Asserted as IDENTIFIERS over the AST rather than as a text grep, which matters in both directions:
 * both layouts now DESCRIBE these three reads in prose ("the unread count, the recent list and the
 * database clock"), and a grep that counted those sentences would be red on a correct tree — the same
 * seventh-instance-in-this-phase failure `sticky-offset.test.ts` and `skeleton-measurements.test.ts`
 * both work around. Deliberately named descriptively in the layouts for that reason; named literally
 * HERE, because this file is outside the trees those greps scan.
 */
const AMBIENT_READS = ["countUnread", "listRecent", "readDbNow"] as const;

type Gate = {
  readonly file: string;
  readonly kind: "getSession" | "redirect";
  readonly line: number;
  readonly suspenseAncestor: boolean;
  readonly jsxAncestor: boolean;
  readonly inDefaultExport: boolean;
  readonly awaited: boolean;
  /** The enclosing function's name, for the failure message on the containment clause. */
  readonly enclosing: string;
};

type Scan = {
  readonly file: string;
  readonly parsed: boolean;
  readonly statements: number;
  readonly identifiers: readonly string[];
  readonly gates: readonly Gate[];
  readonly hasDefaultExport: boolean;
  readonly canHostRedirect: boolean;
};

function parse(file: string, text: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/** The default-exported function declaration, or `null`. `export default async function X() {}`. */
function defaultExportFunction(sf: ts.SourceFile): ts.FunctionDeclaration | null {
  for (const statement of sf.statements) {
    if (!ts.isFunctionDeclaration(statement)) continue;
    const modifiers = ts.getModifiers(statement) ?? [];
    const exported = modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    const isDefault = modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
    if (exported && isDefault) return statement;
  }
  return null;
}

/** The last segment of a JSX tag name — so `Suspense` and `React.Suspense` are the same tag. */
function tagName(node: ts.JsxTagNameExpression, sf: ts.SourceFile): string {
  return node.getText(sf).split(".").pop() ?? "";
}

/** The nearest enclosing named function, for the containment failure message. */
function enclosingFunctionName(node: ts.Node, sf: ts.SourceFile): string {
  let cursor: ts.Node | undefined = node.parent;
  while (cursor) {
    if (ts.isFunctionDeclaration(cursor)) return cursor.name?.getText(sf) ?? "(anonymous function)";
    if (ts.isMethodDeclaration(cursor) || ts.isFunctionExpression(cursor))
      return cursor.name?.getText(sf) ?? "(anonymous function)";
    if (ts.isArrowFunction(cursor)) return "(arrow function)";
    cursor = cursor.parent;
  }
  return "(module scope)";
}

/**
 * Walk one module and classify every gate call in it.
 *
 * `getSession` is matched on the PROPERTY NAME, so `auth.api.getSession(...)` and any re-spelling of
 * the same call through a different alias are both found; `redirect` is matched on a bare identifier
 * call, which is how `next/navigation` exposes it. Both are call EXPRESSIONS, so a mention in a
 * comment or in a string is invisible here by construction — asserted as a self-test below.
 */
export function scanGates(file: string, text: string): Scan {
  const sf = parse(file, text);
  const defaultExport = defaultExportFunction(sf);
  const gates: Gate[] = [];
  const identifiers: string[] = [];
  let canHostRedirect = false;

  const inDefaultExportBody = (node: ts.Node): boolean => {
    if (defaultExport?.body === undefined) return false;
    const body = defaultExport.body;
    let cursor: ts.Node | undefined = node.parent;
    while (cursor) {
      if (cursor === body) return true;
      cursor = cursor.parent;
    }
    return false;
  };

  const ancestry = (node: ts.Node): { suspense: boolean; jsx: boolean; awaited: boolean } => {
    let suspense = false;
    let jsx = false;
    let awaited = false;
    let cursor: ts.Node | undefined = node.parent;
    while (cursor) {
      if (ts.isAwaitExpression(cursor)) awaited = true;
      if (ts.isJsxElement(cursor)) {
        jsx = true;
        if (tagName(cursor.openingElement.tagName, sf) === "Suspense") suspense = true;
      } else if (ts.isJsxSelfClosingElement(cursor)) {
        jsx = true;
        if (tagName(cursor.tagName, sf) === "Suspense") suspense = true;
      } else if (ts.isJsxFragment(cursor) || ts.isJsxExpression(cursor)) {
        jsx = true;
      }
      cursor = cursor.parent;
    }
    return { suspense, jsx, awaited };
  };

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) identifiers.push(node.text);

    // `if (!u.canHost) { redirect("/") }` — the D-04 capability gate, matched as a real IF whose
    // consequent really redirects, rather than as the presence of the word anywhere in the file.
    if (ts.isIfStatement(node) && node.expression.getText(sf).includes("canHost")) {
      let found = false;
      const look = (n: ts.Node): void => {
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "redirect")
          found = true;
        ts.forEachChild(n, look);
      };
      look(node.thenStatement);
      if (found) canHostRedirect = true;
    }

    if (ts.isCallExpression(node)) {
      let kind: Gate["kind"] | null = null;
      if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "getSession")
        kind = "getSession";
      else if (ts.isIdentifier(node.expression) && node.expression.text === "redirect")
        kind = "redirect";

      if (kind !== null) {
        const { suspense, jsx, awaited } = ancestry(node);
        gates.push({
          file,
          kind,
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          suspenseAncestor: suspense,
          jsxAncestor: jsx,
          inDefaultExport: inDefaultExportBody(node),
          awaited,
          enclosing: enclosingFunctionName(node, sf),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return {
    file,
    parsed: true,
    statements: sf.statements.length,
    identifiers,
    gates,
    hasDefaultExport: defaultExport !== null,
    canHostRedirect,
  };
}

/** `null` when the file is unreadable — probe (d)'s shape, surfaced as ONE named guard failure. */
function scanFile(label: string): Scan | null {
  try {
    const text = readFileSync(resolve(SRC_DIR, label.replace(/^src\//, "")), "utf8");
    return scanGates(label, text);
  } catch {
    return null;
  }
}

const SCANS = LAYOUTS.map((layout) => ({ layout, scan: scanFile(layout.label) }));
const PARSED = SCANS.filter((entry) => entry.scan !== null);
const ALL_GATES = PARSED.flatMap((entry) => entry.scan!.gates);
const CHILD = scanFile(CHILD_LABEL);

describe("T-04-06 / T-04-02 — the session gates run before any JSX in both group layouts", () => {
  // ---------------------------------------------------------------------------------------------
  // GUARD THE GUARD, ASSERTED FIRST. Every real clause below is `toEqual([])`, which a scanner that
  // opened nothing satisfies perfectly. Probe (d) in the header measured exactly that.
  // ---------------------------------------------------------------------------------------------

  it("parsed both group layouts, by name", () => {
    expect(
      PARSED.map((entry) => entry.layout.label),
      `the scanner parsed ${PARSED.length} of the ${LAYOUTS.length} group layouts. Every clause in ` +
        'this file is "a list was empty", and a scan that opened nothing satisfies all of them ' +
        "perfectly.",
    ).toEqual(LAYOUTS.map((layout) => layout.label));
    for (const entry of PARSED) {
      expect(entry.scan!.statements, `${entry.layout.label} yielded no statements`).toBeGreaterThan(3);
      expect(entry.scan!.hasDefaultExport, `${entry.layout.label} has no default export`).toBe(true);
    }
  });

  it("found real gate calls rather than none", () => {
    const redirects = ALL_GATES.filter((gate) => gate.kind === "redirect");
    const sessions = ALL_GATES.filter((gate) => gate.kind === "getSession");
    expect(
      redirects.length,
      "the scanner found 0 redirect() calls across both layouts. An AST walk that silently matched " +
        "nothing would make every clause below pass against a layout with NO GATE AT ALL.",
    ).toBeGreaterThanOrEqual(3);
    expect(sessions.length, "the scanner found no getSession call in either layout").toBe(2);
  });

  it("pins each layout's redirect count separately", () => {
    // Separate from the total, and an EQUALITY: the host's SECOND redirect is D-04's capability gate,
    // and a total-only floor is satisfied by a tree that dropped it and grew one somewhere else.
    expect(
      PARSED.map((entry) => entry.scan!.gates.filter((gate) => gate.kind === "redirect").length),
      "a layout's redirect count changed. (app) gates on the session only; (host) gates on the " +
        "session AND on canHost (D-04 / T-04-02), and the second is the one a tidy-up drops.",
    ).toEqual(LAYOUTS.map((layout) => layout.redirects));
  });

  it("parsed the streamed child too", () => {
    expect(CHILD, `the child was never parsed: ${CHILD_LABEL} is missing`).not.toBeNull();
    expect(
      CHILD?.identifiers.length ?? 0,
      "the child was never parsed, so the clause asserting it holds no gate is vacuous",
    ).toBeGreaterThan(20);
  });

  // ---------------------------------------------------------------------------------------------
  // The real clauses.
  // ---------------------------------------------------------------------------------------------

  it("puts no session gate inside a <Suspense> subtree", () => {
    const violations = ALL_GATES.filter((gate) => gate.suspenseAncestor).map(
      (gate) => `${gate.file}:${gate.line} — ${gate.kind}() inside <Suspense>`,
    );
    expect(
      violations,
      "a session gate sits inside a `<Suspense>` subtree. A boundary streams the shell around it " +
        "BEFORE it resolves, so the gated markup reaches the browser and only then does the redirect " +
        "happen — bytes already on the wire cannot be un-sent (T-04-06 / T-04-02).",
    ).toEqual([]);
  });

  it("puts no session gate inside ANY JSX", () => {
    // The wider clause, and the one that survives a rename. `<Suspense>` is the boundary the app uses
    // today; `React.Suspense`, a custom wrapper around one, or a route-level `loading.tsx` boundary
    // are all the same hazard, and none of them is spelled `Suspense` at the call site.
    const violations = ALL_GATES.filter((gate) => gate.jsxAncestor).map(
      (gate) => `${gate.file}:${gate.line} — ${gate.kind}() has a JSX ancestor`,
    );
    expect(
      violations,
      "a session gate has a JSX ancestor. A gate must run in the layout function's body, before any " +
        "element exists — anything inside the returned tree can be streamed, deferred or wrapped in " +
        "a boundary by a component this file cannot see.",
    ).toEqual([]);
  });

  it("keeps every gate inside the layout's own default export", () => {
    const violations = ALL_GATES.filter((gate) => !gate.inDefaultExport).map(
      (gate) => `${gate.file}:${gate.line} — ${gate.kind}() in ${gate.enclosing}, not the default export`,
    );
    expect(
      violations,
      "a session gate sits OUTSIDE the layout's default export. A gate in a helper or in a sibling " +
        "component runs wherever that component is mounted — which may be inside a streaming " +
        "boundary — so containment in the exported layout body is the property, not source order.",
    ).toEqual([]);
  });

  it("awaits the session read, so the gate really blocks", () => {
    const violations = ALL_GATES.filter((gate) => gate.kind === "getSession" && !gate.awaited).map(
      (gate) => `${gate.file}:${gate.line} — getSession() is not awaited`,
    );
    expect(
      violations,
      "the session read is not awaited. An un-awaited read returns a promise, `!session?.user` is " +
        "false for every promise, and the gate silently admits everybody — the one failure mode that " +
        "leaves the redirect visibly present in the source.",
    ).toEqual([]);
  });

  it("keeps the host's canHost capability gate", () => {
    // Written as one `toEqual` over SCANS rather than a `for` loop over PARSED, and the difference is
    // measured rather than stylistic: probe (d) showed the loop form PASSING over an empty PARSED,
    // because a `for…of` over nothing satisfies every assertion inside it. `?? null` makes an
    // unparsed file a value that cannot equal `true` or `false`, so this clause fails under vacuity
    // instead of joining the four that structurally cannot.
    expect(
      SCANS.map((entry) => entry.scan?.canHostRedirect ?? null),
      "the canHost capability gate (D-04 / T-04-02) changed. `(host)` must guard on canHost AND " +
        "redirect; `(app)` must not, because the booker surface has no capability requirement.",
    ).toEqual(LAYOUTS.map((layout) => layout.canHostGuard));
  });

  it("leaves no ambient database read in either layout", () => {
    const violations = PARSED.flatMap((entry) =>
      AMBIENT_READS.filter((name) => entry.scan!.identifiers.includes(name)).map(
        (name) => `${entry.layout.label}: ${name}`,
      ),
    );
    expect(
      violations,
      "a group layout performs an ambient database read again. Every await in a layout blocks " +
        `navigation for the whole group, which is what makes a \`loading.tsx\` under it useless ` +
        `(STATE-01). These reads belong in ${CHILD_LABEL}, behind a boundary.`,
    ).toEqual([]);
  });

  it("lets the streamed child hold no gate at all", () => {
    const violations = (CHILD?.gates ?? []).map(
      (gate) => `${gate.file}:${gate.line} — ${gate.kind}()`,
    );
    expect(
      violations,
      `${CHILD_LABEL} performs a session read or a redirect. It is rendered inside a \`<Suspense>\` ` +
        "boundary by construction, so any security decision it takes is taken after the shell around " +
        "it has been streamed. Its own header states this; this is the mechanical half.",
    ).toEqual([]);
  });

  // ---------------------------------------------------------------------------------------------
  // Both-directions self-tests, over fixtures never written to disk — so the thing the real
  // assertions run is the same code path the fixtures prove.
  // ---------------------------------------------------------------------------------------------

  it("flags a redirect inside a Suspense subtree and spares one above it", () => {
    const bad = scanGates(
      "fake-bad.tsx",
      [
        "export default async function L({ children }) {",
        "  return (",
        '    <Suspense fallback={<S />}>{session ? children : redirect("/login")}</Suspense>',
        "  );",
        "}",
      ].join("\n"),
    );
    expect(bad.gates).toHaveLength(1);
    expect(bad.gates[0].suspenseAncestor).toBe(true);
    expect(bad.gates[0].jsxAncestor).toBe(true);

    const good = scanGates(
      "fake-good.tsx",
      [
        "export default async function L({ children }) {",
        "  const session = await auth.api.getSession({ headers: await headers() });",
        '  if (!session?.user) redirect("/login");',
        "  return <Suspense fallback={<S />}>{children}</Suspense>;",
        "}",
      ].join("\n"),
    );
    expect(good.gates).toHaveLength(2);
    expect(good.gates.every((gate) => !gate.suspenseAncestor && !gate.jsxAncestor)).toBe(true);
    expect(good.gates.every((gate) => gate.inDefaultExport)).toBe(true);
    expect(good.gates.find((gate) => gate.kind === "getSession")?.awaited).toBe(true);
  });

  it("sees through a qualified React.Suspense tag", () => {
    // The rename that would make an ancestor check comparing `tagName === "Suspense"` blind.
    const qualified = scanGates(
      "fake-qualified.tsx",
      'export default function L() { return <React.Suspense>{redirect("/login")}</React.Suspense>; }',
    );
    expect(qualified.gates[0].suspenseAncestor).toBe(true);
  });

  it("flags a gate extracted into a sibling component, which source order cannot see", () => {
    // Probe (b)'s shape as a permanent fixture: the redirect is textually FIRST and lexically inside
    // a component that the boundary below mounts. Every line-number comparison passes on this.
    const extracted = scanGates(
      "fake-extracted.tsx",
      [
        "async function AnonymousGate() {",
        "  const session = await auth.api.getSession({ headers: await headers() });",
        '  if (!session?.user) redirect("/login");',
        "  return null;",
        "}",
        "export default function L({ children }) {",
        "  return <Suspense fallback={null}><AnonymousGate />{children}</Suspense>;",
        "}",
      ].join("\n"),
    );
    expect(extracted.gates).toHaveLength(2);
    // Neither has a Suspense ancestor, and neither has a JSX ancestor — the two clauses that look
    // like they cover this are both green. Only containment catches it.
    expect(extracted.gates.every((gate) => !gate.suspenseAncestor)).toBe(true);
    expect(extracted.gates.every((gate) => !gate.jsxAncestor)).toBe(true);
    expect(extracted.gates.every((gate) => !gate.inDefaultExport)).toBe(true);
    expect(extracted.gates[0].enclosing).toBe("AnonymousGate");
  });

  it("does not count a gate named in a comment or in a string", () => {
    // THE REASON THIS IS AN AST WALK. Both real layouts, and the streamed child, explain the rule at
    // length and name these APIs while doing it — which is why they name them DESCRIPTIVELY today.
    const commented = scanGates(
      "fake-comment.tsx",
      [
        "// The gate is auth.api.getSession(...) followed by redirect(\"/login\").",
        "/* and a block comment naming getSession and redirect() too */",
        'export const NOTE = "never call redirect() in here";',
        "export default function L() { return null; }",
      ].join("\n"),
    );
    expect(commented.gates).toEqual([]);
    // …and the walk really ran over that fixture rather than returning early.
    expect(commented.identifiers).toContain("NOTE");
  });

  it("flags an un-awaited session read", () => {
    const unawaited = scanGates(
      "fake-unawaited.tsx",
      [
        "export default async function L() {",
        "  const session = auth.api.getSession({ headers: await headers() });",
        '  if (!session?.user) redirect("/login");',
        "  return null;",
        "}",
      ].join("\n"),
    );
    expect(unawaited.gates.find((gate) => gate.kind === "getSession")?.awaited).toBe(false);
  });

  it("recognises the canHost guard only when it really redirects", () => {
    const real = scanGates(
      "fake-canhost.tsx",
      'export default function L() { if (!u.canHost) { redirect("/"); } return null; }',
    );
    expect(real.canHostRedirect).toBe(true);

    const toothless = scanGates(
      "fake-canhost-toothless.tsx",
      'export default function L() { if (!u.canHost) { console.warn("no host"); } return null; }',
    );
    expect(toothless.canHostRedirect).toBe(false);
  });
});
