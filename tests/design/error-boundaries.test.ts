// AC#19 / STATE-02 — every route group has an error boundary, each offers TWO actions, and none of
// them can render anything off the error object except `digest`.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS GATE IS FOR, AND WHAT IT DELIBERATELY CANNOT DO
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// It reads STRUCTURE. `e2e/error-leak.spec.ts` reads a RENDERING. Neither substitutes for the other
// and the pairing is the whole design, so both files name the other's coverage:
//
//   • The e2e spec throws a real `new Error("SENTINEL_LEAK_PROBE")` and proves the resulting document
//     does not contain it. It proves ONE boundary, on ONE route, with ONE message shape — and it
//     cannot run in CI's build-only job, because it needs a browser and a server.
//   • This file proves the OTHER FOUR boundaries and `global-error.tsx` are built the same way, on
//     every run of `npm run build` (which is `lint && test:design && next build`). It cannot see a
//     rendering at all: a boundary that passed every assertion here and then rendered the message
//     through a helper this scan does not follow would be green.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE INVENTORY IS DECLARED, WITH A REASON PER ROW — NOT DERIVED FROM DISK
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that walks `src/app/**` and asserts "every error.tsx it finds is well formed" is green on a
// tree with ZERO boundaries — which was this repository's state until plan 11-18. So the SIX paths
// and their six route-out targets are written down below, and the walk is compared AGAINST them in
// both directions: a missing boundary fails, an UNDECLARED boundary fails, and a group that moves
// fails. The route out is product copy, so each row carries the argument for its destination; a row
// whose reason nobody can state is a row that should not be there.
//
// ⚠ FIVE → SIX ON 1 SEPTEMBER 2026 (plan 18-12): `src/app/(ops)/ops/error.tsx`, the FitOut Ops
// console's boundary. Probe (c) below created a hypothetical sixth boundary and watched this file
// refuse it; this is the same event with a real row behind it, and the two reds it produced were the
// two probe (c) predicted, verbatim and in the same order. It is also the first row to override the
// shared copy sentences — see `TITLE`'s docblock for the rule that permits it and the argument that
// keeps it from being a relaxation.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE ERROR-OBJECT CHECK IS AN AST WALK AND NOT A GREP
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The plan states this criterion as `grep -rc "error.message\|error.stack"` returning zero. That grep
// is right about the code and wrong about the file: it counts a mention in a COMMENT, and the header
// of `src/app/error.tsx` is a security argument that would very reasonably want to name the two
// properties it is refusing to render. (Those five files avoid spelling them anyway, deliberately and
// with the reason recorded in place — the same trap `src/app/not-found.tsx` documents for its own
// zero-count criterion — so both instruments agree today. The AST is the one that will still be right
// when the next author writes the obvious comment.)
//
// It also unwraps casts. `(error as Error & { digest?: string }).digest` is the sanctioned line in
// all five boundaries; `(error as Error).message` is the same defect wearing the same clothes, and a
// naive "is the expression an identifier named error" check misses it.
//
// `cause` IS BANNED ALONGSIDE `message` AND `stack`, which is one property wider than the plan asked
// for. `err.cause` is where a wrapped original error lives — the PayMongo response, the Postgres
// driver error — so rendering it discloses strictly more than rendering `message` does. Widening a
// ban by one property with the reason on the record is cheap here; discovering the omission from a
// leaked constraint name is not.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — 17 AUGUST 2026. GREEN IS 17 PASSED.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Command: `npx vitest run --config vitest.design.config.ts tests/design/error-boundaries.test.ts`
//
//   (a) THE LEAK, INJECTED. `<p>{error.message}</p>` rendered inside `src/app/error.tsx`'s boundary —
//       the same edit the e2e spec's probe (a) used, in the SAME tree, so the two layers were watched
//       against ONE defect. **1 failed / 15 passed** (before the split described in (c); the green
//       total was 16 at that moment). Verbatim:
//
//         AssertionError: these boundaries read text off the error object. Server error text carries
//         table names, file paths and connection strings, and in this app it can carry a PayMongo
//         endpoint or a Postgres constraint name — only `digest` … may cross into the DOM
//         (T-11-ERRLEAK).: expected [ Array(1) ] to deeply equal []
//         + [ "src/app/error.tsx:100 error.message" ]
//
//       …and `npx playwright test e2e/error-leak.spec.ts --project=chromium` in the same tree:
//       **2 failed / 1 passed**, `Expected: 0 / Received: 1` on the rendered-document count and
//       `Expected: 1 / Received: 2` on the flight-channel closure. TWO instruments, ONE edit, and
//       neither can substitute for the other. Reverted → both green.
//
//   (b) THE ERROR OBJECT HANDED TO THE PATTERN. `error={error}` added to the `ErrorState` call in
//       `src/app/(app)/error.tsx` — which does not even compile, and that is the point of the
//       criterion: the type is the primary mitigation and this assertion is what notices if the type
//       is ever widened. Run with the type error present, since Vitest does not typecheck.
//       **1 failed / 15 passed**:
//
//         AssertionError: these boundaries pass the error object itself into ErrorState. The pattern
//         has no `error` prop, so this only compiles if somebody widened its type …: expected
//         [ Array(1) ] to deeply equal []
//         + [ "src/app/(app)/error.tsx:47 error={…error…}" ]
//
//       Reverted → green.
//
//   (c) THE SIXTH BOUNDARY. `src/app/(public)/error.tsx` created — a REAL candidate, not a straw man:
//       the root boundary unmounts the public shell on a failed `/`, and a `(public)` boundary is the
//       fix. Written up in the phase's `deferred-items.md`.
//
//       THE FIRST RUN OF THIS PROBE FOUND A DEFECT IN THIS FILE, and that is why it is recorded at
//       length. The count and the set-equality were two `expect`s in ONE `it`, so the count failed
//       first, the set-equality never ran, and the whole report was **1 failed / 15 passed** with the
//       message `expected 6 to be 5` — a number, naming no file. That is exactly the trap
//       `loading-coverage.test.ts` documents for its own pinned count. Split into two `it` blocks;
//       re-run: **2 failed / 15 passed**, and the second one names it:
//
//         AssertionError: scanned: src/app/(app)/error.tsx, …, src/app/(public)/error.tsx,
//         src/app/error.tsx: expected 6 to be 5
//
//         AssertionError: the set of error.tsx files on disk is not the declared inventory. …:
//         expected [ 'src/app/(app)/error.tsx', …(5) ] to deeply equal [ …(4) ]
//         + "src/app/(public)/error.tsx",
//
//       Deleted → 17 passed.
//
//   (d) VACUITY. `APP_DIR` pointed at `src/app-nope`. **7 failed / 10 passed**, and every failure is a
//       GUARD or a per-row clause driven by the DECLARED inventory — not one of the list assertions:
//
//         AssertionError: scanned: (nothing): expected +0 to be 5
//         AssertionError: the set of error.tsx files on disk is not the declared inventory …:
//         expected [] to deeply equal [ 'src/app/(app)/error.tsx', …(4) ]
//         AssertionError: src/app/error.tsx is declared in BOUNDARIES but was not found on disk:
//         expected undefined to be defined            ×5, one per declared row
//
//       RECORDED HONESTLY: three assertions PASSED over the empty walk — "really parsed every
//       boundary it counted" (an empty loop), "lets no boundary read text off the error object" and
//       "lets no boundary hand the error object to the pattern" (both `toEqual([])` over an emptied
//       input). A list assertion cannot notice that its input was emptied. That is the SIXTH time
//       this phase has recorded that failure mode (11-02 probe d, 11-15 probe e, 11-17 probe d,
//       11-18's own global-error probe c), and it is why the file count is asserted first, why the
//       set is named rather than counted, and above all why every per-file clause is driven by
//       `BOUNDARIES` rather than by the walk — so a missing file surfaces as `undefined` in a named
//       row instead of as one fewer item in a list nobody counted.
//
//       Note what did NOT fail: "has a global-error.tsx as well", because it resolves its own path
//       and does not go through `APP_DIR`. Stated so the ten passes are not read as ten healthy
//       assertions. Reverted → 17 passed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   • SYNTACTIC, LIKE ITS SIBLING `loading-coverage.test.ts`. `{renderTheError(error)}` — the message
//     laundered through a helper in another module — passes everything here. The e2e spec is what
//     would see that, on the one route it drives.
//   • It says nothing about `global-error.tsx`'s internals beyond existence; that surface has its own
//     gate, `tests/design/global-error.test.ts`, because its constraints are entirely different (it
//     has no stylesheet, so it has no pattern to compose and no class to write).
//   • It cannot prove a boundary is REACHED. Which boundary catches which throw is a routing fact,
//     confirmed for the root one by driving `/dev/throw` and reading `[boundary] root` off the server
//     console (plan 11-18's SUMMARY). The other four are argued from the tree, not measured.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync, type Dirent } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

/** The scanned tree, as ONE constant — probe (d) above is a one-line edit here. */
const APP_DIR = resolve(process.cwd(), "src/app");

/**
 * The copy contract's two sentences (11-UI-SPEC § Copywriting Contract) — the DEFAULT every boundary
 * carries unless its own row overrides them with an argument.
 *
 * ⚠ THEY WERE "IDENTICAL ON ALL FIVE" UNTIL PLAN 18-12, AND THE OLD SENTENCE IS AMENDED RATHER THAN
 * LEFT STANDING. The rule these two strings encode was never "every boundary says the same words" —
 * it is that a boundary says WHAT FAILED and WHAT TO DO, in the product's calm register, and never a
 * stack trace or an apology. Five boundaries whose subject is "this page" say it identically because
 * "this page" is genuinely all any of them can name. `(ops)/ops/error.tsx` covers a route group with
 * exactly ONE page in it (D-246), so it can name the actual thing that failed — "The queue didn't
 * load" — and a boundary that CAN be specific and chooses the generic sentence is worse copy, not
 * safer copy.
 *
 * THE OVERRIDE IS PER-ROW AND CARRIES ITS OWN REASON, so this is a declared exception with an
 * argument rather than a relaxation: a sixth boundary that quietly reworded the shared sentence for
 * no reason still fails, because it would have to add a `copyWhy` saying why and somebody would read
 * it. `ErrorState`'s two-action shape, the `digest`-only rule and the route-out clause are untouched
 * — the copy is the only thing a row may vary, and only in words it can actually be more precise in.
 */
const TITLE = "Something didn't load";
const BODY = "We hit a problem loading this page. Trying again usually fixes it.";

/** The pattern every boundary composes, and the props that make it a two-action surface. */
const PATTERN_MODULE = "@/components/patterns/error-state";
const PATTERN_EXPORT = "ErrorState";

/** Read off the error object, these are disclosures. `cause` is the widening — see the header. */
const BANNED_ERROR_PROPERTIES = ["message", "stack", "cause"] as const;

type BoundaryRow = {
  readonly path: string;
  readonly href: string;
  readonly label: string;
  readonly why: string;
  /** Overrides the shared contract sentence. Requires `copyWhy` — see `TITLE`'s docblock. */
  readonly title?: string;
  readonly body?: string;
  /** Why this boundary may be more specific than "this page". Required whenever `title` is set. */
  readonly copyWhy?: string;
};

/**
 * THE DECLARED INVENTORY. Six rows, each with the destination its group's route out points at and
 * the argument for that destination. Derived from nothing — compared against disk in both directions.
 */
const BOUNDARIES: readonly BoundaryRow[] = [
  {
    path: "src/app/error.tsx",
    href: "/",
    label: "Back to search",
    why:
      "The root boundary covers `/`, `/listings/**`, `/invite/**` and `/dev/**` — everything below " +
      "the root layout that no nearer boundary claims. Search is the product's core value, so " +
      "someone whose page failed is sent to the thing they came to do rather than to a generic home.",
  },
  {
    path: "src/app/(app)/error.tsx",
    href: "/bookings",
    label: "Your bookings",
    why:
      "Renders inside `(app)/layout.tsx`, whose blocking session gate has already run — so this " +
      "surface always has a signed-in booker behind it. Their persistent recourse is the " +
      "reservations they already hold, not a fresh search.",
  },
  {
    path: "src/app/(host)/host/error.tsx",
    href: "/host",
    label: "Host dashboard",
    why:
      "On `host/`, NOT on `(host)/`: the shell and its session gate live at `(host)/host/layout.tsx`, " +
      "so a boundary one level up would render with no host chrome at all. The dashboard is the one " +
      "screen summarising everything a host owes and is owed.",
  },
  {
    path: "src/app/(auth)/error.tsx",
    href: "/login",
    label: "Back to log in",
    why:
      "The ONE boundary with no signed-in user behind it — `(auth)/layout.tsx` has no session gate. " +
      "Sending an anonymous visitor to a gated route would bounce them straight back through the " +
      "redirect they were already stuck at.",
  },
  {
    path: "src/app/(legal)/error.tsx",
    href: "/",
    label: "Back to FitOut",
    why:
      "The boundary that should never fire: `/terms` and `/privacy` are static and reach nothing. It " +
      "exists so the group that has none today is not the group that has none the day a legal page " +
      "grows a read. Not 'Back to search' — someone reading the terms was not mid-search.",
  },
  {
    path: "src/app/(ops)/ops/error.tsx",
    href: "/",
    label: "Back to FitOut",
    why:
      "On `ops/`, NOT on `(ops)/`, and here that placement is a SECURITY fact rather than a " +
      "cosmetic one. `(ops)/ops/layout.tsx` awaits `assertStaff()` above the Suspense boundary — the " +
      "layer that wins the 404 status line (D-219 / D-247) — so a boundary at `(ops)/error.tsx` " +
      "would render both with no ops chrome AND on the far side of that layer, which is the " +
      "route-existence oracle wearing an error message. The route out is `/` and NOT `/ops`: D-246 " +
      "holds the console at exactly one page, so pointing the persistent recourse at the page the " +
      "operator is already on is the dead end `empty-state-adoption.test.ts` records refusing — and " +
      "an ops staffer is also a user, so `/` is a real destination for them.",
    title: "The queue didn't load",
    body: "We hit a problem loading the review queue. Trying again usually fixes it.",
    copyWhy:
      "THE ONLY BOUNDARY IN THIS INVENTORY THAT CAN NAME WHAT FAILED. The other five each cover a " +
      "route group with several pages in it, so \"this page\" is genuinely the most they can say. " +
      "D-246 gives `(ops)` exactly ONE page, and it is the review queue — so this boundary knows " +
      "precisely which surface the reader was on, and \"The queue didn't load\" is a true, more " +
      "useful sentence than the generic one. The register, the two actions and the digest-only rule " +
      "are unchanged; only the noun is narrower.",
  },
];

const GLOBAL_ERROR_PATH = "src/app/global-error.tsx";

function parse(fileName: string, text: string): ts.SourceFile {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/** Every file with a given basename under a directory, recursively. `[]` on a missing tree. */
function collect(dir: string, basename: string, out: string[] = []): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    // 11-02's rule: a broken scan surfaces as one named guard failure, never a stack trace that
    // buries which gate went quiet.
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collect(full, basename, out);
    else if (entry.name === basename) out.push(full);
  }
  return out;
}

const rel = (p: string) => relative(process.cwd(), p).replace(/\\/g, "/");

/** The `"use client"` directive as a PROLOGUE statement — not as a substring anywhere in the file. */
function hasUseClientPrologue(sf: ts.SourceFile): boolean {
  for (const stmt of sf.statements) {
    if (!ts.isExpressionStatement(stmt)) return false;
    const expr = stmt.expression;
    if (!ts.isStringLiteral(expr)) return false;
    if (expr.text === "use client") return true;
  }
  return false;
}

/**
 * Strip the wrappers a cast can hide behind and return the innermost expression.
 *
 * `(error as Error & { digest?: string })` is the sanctioned line in all five boundaries, so a check
 * that only recognised a bare identifier would also fail to recognise `(error as Error).message`.
 */
function unwrap(node: ts.Expression): ts.Expression {
  let e: ts.Expression = node;
  for (;;) {
    if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e)) {
      e = e.expression;
      continue;
    }
    if (ts.isTypeAssertionExpression(e)) {
      e = e.expression;
      continue;
    }
    return e;
  }
}

/** Property reads off a binding named `error` whose property name is a disclosure. */
function errorTextReads(label: string, sf: ts.SourceFile): string[] {
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node)) {
      const base = unwrap(node.expression);
      if (
        ts.isIdentifier(base) &&
        base.text === "error" &&
        (BANNED_ERROR_PROPERTIES as readonly string[]).includes(node.name.text)
      ) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        out.push(`${label}:${line} error.${node.name.text}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** The local binding(s) the pattern was imported under — `import { ErrorState as Panel }` counts. */
function patternBindings(sf: ts.SourceFile): Set<string> {
  const bindings = new Set<string>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    if (stmt.moduleSpecifier.text !== PATTERN_MODULE) continue;
    const named = stmt.importClause?.namedBindings;
    if (named !== undefined && ts.isNamedImports(named)) {
      for (const el of named.elements) {
        if ((el.propertyName?.text ?? el.name.text) === PATTERN_EXPORT) bindings.add(el.name.text);
      }
    }
  }
  return bindings;
}

type PatternCall = {
  /** The attribute names handed to the pattern, in source order. */
  readonly props: string[];
  /** Any attribute whose value expression mentions the `error` binding — `file:line name={…}`. */
  readonly errorProps: string[];
  /** String-literal props, by name — the copy contract's two sentences live here. */
  readonly literals: Record<string, string>;
  /** `href` values of link elements inside the `routeOut` slot. */
  readonly routeOutHrefs: string[];
  /** Visible text inside the `routeOut` slot, trimmed and joined. */
  readonly routeOutText: string;
};

/** Every `<ErrorState …>` call site in the module, resolved through the import binding. */
function patternCalls(label: string, sf: ts.SourceFile): PatternCall[] {
  const bindings = patternBindings(sf);
  const calls: PatternCall[] = [];

  const collectHrefsAndText = (node: ts.Node, hrefs: string[], text: string[]): void => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      for (const attr of node.attributes.properties) {
        if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name)) continue;
        if (attr.name.text !== "href") continue;
        const init = attr.initializer;
        if (init !== undefined && ts.isStringLiteral(init)) hrefs.push(init.text);
      }
    }
    if (ts.isJsxText(node)) {
      const t = node.text.trim();
      if (t.length > 0) text.push(t);
    }
    ts.forEachChild(node, (child) => collectHrefsAndText(child, hrefs, text));
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText(sf);
      if (bindings.has(tag)) {
        const props: string[] = [];
        const errorProps: string[] = [];
        const literals: Record<string, string> = {};
        const routeOutHrefs: string[] = [];
        const routeOutText: string[] = [];

        for (const attr of node.attributes.properties) {
          if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name)) continue;
          const name = attr.name.text;
          props.push(name);
          const init = attr.initializer;
          if (init === undefined) continue;

          if (ts.isStringLiteral(init)) {
            literals[name] = init.text;
            continue;
          }
          if (!ts.isJsxExpression(init) || init.expression === undefined) continue;
          const expr = init.expression;

          if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
            literals[name] = expr.text;
          }

          // Does this prop's value mention the `error` binding anywhere? `digest` is computed
          // OUTSIDE the call in every boundary, so a mention here is the error object crossing.
          let mentionsError = false;
          const scanForError = (n: ts.Node): void => {
            if (ts.isIdentifier(n) && n.text === "error") mentionsError = true;
            ts.forEachChild(n, scanForError);
          };
          scanForError(expr);
          if (mentionsError) {
            const line = sf.getLineAndCharacterOfPosition(attr.getStart(sf)).line + 1;
            errorProps.push(`${label}:${line} ${name}={…error…}`);
          }

          if (name === "routeOut") collectHrefsAndText(expr, routeOutHrefs, routeOutText);
        }

        calls.push({
          props,
          errorProps,
          literals,
          routeOutHrefs,
          routeOutText: routeOutText.join(" "),
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return calls;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE SCAN, run once at module load.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

type BoundaryScan = {
  readonly label: string;
  readonly statements: number;
  readonly useClient: boolean;
  readonly textReads: string[];
  readonly calls: PatternCall[];
};

const ON_DISK = collect(APP_DIR, "error.tsx").map(rel).sort();

const SCANNED = new Map<string, BoundaryScan>(
  ON_DISK.map((label) => {
    const sf = parse(label, readFileSync(resolve(process.cwd(), label), "utf8"));
    return [
      label,
      {
        label,
        statements: sf.statements.length,
        useClient: hasUseClientPrologue(sf),
        textReads: errorTextReads(label, sf),
        calls: patternCalls(label, sf),
      },
    ];
  }),
);

describe("AC#19 — six boundaries, two actions each, and no error text in any of them", () => {
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // GUARD THE GUARD, ASSERTED FIRST. Probe (d) in the header measured four list assertions passing
  // perfectly over an empty walk.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  // THE COUNT AND THE SET ARE SEPARATE `it` BLOCKS, and that is not tidiness. Written as two
  // `expect`s in one block, the count fails FIRST and the set-equality never runs — so a sixth
  // boundary reported "expected 6 to be 5" and never named which file it was. ⚠ THAT SPLIT PAID FOR
  // ITSELF IN PLAN 18-12, when the sixth boundary really landed: the run reported BOTH the count AND
  // the named set in one pass, so the remedy was legible without a second invocation. That is the same trap
  // `loading-coverage.test.ts` records for its own pinned count, measured here in probe (c) before
  // the split.

  it("finds exactly six error.tsx files on disk", () => {
    expect(ON_DISK.length, `scanned: ${ON_DISK.join(", ") || "(nothing)"}`).toBe(BOUNDARIES.length);
  });

  it("finds exactly the six DECLARED boundaries, by name", () => {
    expect(
      ON_DISK,
      "the set of error.tsx files on disk is not the declared inventory. A NEW boundary needs a row " +
        "in BOUNDARIES with its route out and the argument for it; a MISSING one is STATE-02 " +
        "regressing — this repository had zero boundaries before plan 11-18 and a walk-only gate " +
        "would have been green on that tree.",
    ).toEqual(BOUNDARIES.map((b) => b.path).sort());
    // Named as well as counted, so a walk that finds only the group boundaries cannot look healthy.
    expect(
      Array.from(SCANNED.keys()),
      "src/app/error.tsx was not among the parsed boundaries — the root one covers `/`, " +
        "`/listings/**` and `/invite/**`, and is the one the e2e leak probe drives",
    ).toContain("src/app/error.tsx");
  });

  it("really parsed every boundary it counted", () => {
    for (const scan of SCANNED.values()) {
      expect(scan.statements, `${scan.label} parsed to zero statements`).toBeGreaterThan(0);
    }
  });

  it("has a global-error.tsx as well", () => {
    // Its INTERNALS are `tests/design/global-error.test.ts`'s (different constraints entirely — no
    // stylesheet, so no pattern to compose and no class to write). Existence belongs here, with the
    // rest of STATE-02's inventory.
    expect(
      existsSync(resolve(process.cwd(), GLOBAL_ERROR_PATH)),
      `${GLOBAL_ERROR_PATH} does not exist. It is the boundary for a failure in the root layout — ` +
        "the one error the five route boundaries cannot catch, because they render inside it.",
    ).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // The per-row clauses. DRIVEN BY THE DECLARED INVENTORY, not by the walk — so a missing file
  // surfaces as `undefined` in a named row rather than as one fewer item in a list nobody counted.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it.each(BOUNDARIES.map((b) => [b.path, b] as const))(
    "%s is a client component composing the pattern with two actions",
    (path, row) => {
      const scan = SCANNED.get(path);
      expect(scan, `${path} is declared in BOUNDARIES but was not found on disk`).toBeDefined();
      if (scan === undefined) return;

      expect(
        scan.useClient,
        `${path} has no "use client" directive in its prologue. Next renders a boundary from a React ` +
          "class error boundary and the `reset` it hands down closes over client state, so a server " +
          "component here does not work at all.",
      ).toBe(true);

      expect(scan.calls, `${path} does not render ${PATTERN_EXPORT}`).toHaveLength(1);
      const call = scan.calls[0];

      // TWO ACTIONS, ALWAYS (T-11-DEADEND). `onRetry` is the transient recourse, `routeOut` the
      // persistent one. `routeOut` is a required prop, so a one-button boundary does not compile —
      // this assertion is what notices if that requirement is ever relaxed.
      expect(
        call.props,
        `${path} does not pass onRetry — the boundary's retry action is missing`,
      ).toContain("onRetry");
      expect(
        call.props,
        `${path} does not pass routeOut. A bare "Something went wrong" with one button is a failure ` +
          "of the STATE-02 contract: retry covers a transient fault, the route out covers a " +
          "persistent one, and without it the only recourse is the back button into the same error.",
      ).toContain("routeOut");

      // The route out points where the inventory says, and says what the copy contract says.
      expect(call.routeOutHrefs, `${path}'s route out: ${row.why}`).toEqual([row.href]);
      expect(call.routeOutText, `${path}'s route-out label`).toBe(row.label);

      // The copy contract's two sentences — the shared default, or the row's own declared override.
      // A row may only override BOTH TOGETHER and only with a `copyWhy`, which is what keeps this an
      // argued exception rather than a hole: see `TITLE`'s docblock.
      expect(
        [row.title === undefined, row.body === undefined, row.copyWhy === undefined],
        `${path} declares a partial copy override. A boundary either carries the shared contract ` +
          "sentences or declares BOTH its own title and its own body WITH the argument for being " +
          "more specific than \"this page\". Half an override is a reworded boundary nobody argued for.",
      ).toEqual([row.title === undefined, row.title === undefined, row.title === undefined]);
      if (row.copyWhy !== undefined) {
        expect(row.copyWhy.trim().length, `${path}'s copyWhy is not an argument`).toBeGreaterThan(40);
      }
      expect(call.literals.title, `${path} title`).toBe(row.title ?? TITLE);
      expect(call.literals.body, `${path} body`).toBe(row.body ?? BODY);

      // `digest` crosses, and it is the only thing that does — asserted from the other side below.
      expect(call.props, `${path} does not pass digest`).toContain("digest");
    },
  );

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // The two security clauses, as lists over the whole scanned set.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("lets no boundary read text off the error object", () => {
    const reads = Array.from(SCANNED.values()).flatMap((s) => s.textReads);
    expect(
      reads,
      "these boundaries read text off the error object. Server error text carries table names, file " +
        "paths and connection strings, and in this app it can carry a PayMongo endpoint or a " +
        "Postgres constraint name — only `digest`, the opaque hash Next generates for exactly this " +
        "purpose, may cross into the DOM (T-11-ERRLEAK).",
    ).toEqual([]);
  });

  it("lets no boundary hand the error object to the pattern", () => {
    const passed = Array.from(SCANNED.values()).flatMap((s) =>
      s.calls.flatMap((c) => c.errorProps),
    );
    expect(
      passed,
      `these boundaries pass the error object itself into ${PATTERN_EXPORT}. The pattern has no ` +
        "`error` prop, so this only compiles if somebody widened its type — which is exactly the " +
        "reviewable act this assertion exists to make visible, since the type is the primary " +
        "mitigation and this is the thing that notices when the type stops being it.",
    ).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // BOTH-DIRECTIONS SELF-TESTS, on fixtures never written to disk — so the code path the real
  // assertions run is the same one the fixtures prove.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("flags a boundary that renders the error's message, and one that casts first", () => {
    const bare = parse("fake-bare.tsx", "export const A = <p>{error.message}</p>;");
    expect(errorTextReads("fake-bare.tsx", bare)).toEqual(["fake-bare.tsx:1 error.message"]);

    // The shape a grep for `error.message` catches and a naive AST check does not.
    const cast = parse("fake-cast.tsx", "export const A = <p>{(error as Error).message}</p>;");
    expect(errorTextReads("fake-cast.tsx", cast)).toEqual(["fake-cast.tsx:1 error.message"]);

    const stack = parse("fake-stack.tsx", "export const A = <pre>{error.stack}</pre>;");
    expect(errorTextReads("fake-stack.tsx", stack)).toEqual(["fake-stack.tsx:1 error.stack"]);

    // The widening this file argues for in its header.
    const cause = parse("fake-cause.tsx", "export const A = <p>{String(error.cause)}</p>;");
    expect(errorTextReads("fake-cause.tsx", cause)).toEqual(["fake-cause.tsx:1 error.cause"]);
  });

  it("does NOT flag a boundary that renders only the digest — including through the cast", () => {
    const digest = parse(
      "fake-digest.tsx",
      "const digest = (error as Error & { digest?: string }).digest;\nexport const A = <p>{digest}</p>;",
    );
    expect(errorTextReads("fake-digest.tsx", digest)).toEqual([]);
  });

  it("does NOT flag the property names written in a comment", () => {
    // The whole reason this is an AST walk and not the plan's prescribed grep.
    const commented = [
      "// this boundary renders neither error.message nor error.stack, only the digest",
      "/* not error.cause either */",
      "export const A = <p>{digest}</p>;",
    ].join("\n");
    expect(errorTextReads("fake-comment.tsx", parse("fake-comment.tsx", commented))).toEqual([]);
  });

  it("resolves the pattern through its import, alias included, and ignores a look-alike", () => {
    const aliased = [
      'import { ErrorState as Panel } from "@/components/patterns/error-state";',
      'export const A = <Panel title="t" body="b" onRetry={reset} routeOut={<a href="/x">Out</a>} />;',
    ].join("\n");
    const calls = patternCalls("fake-alias.tsx", parse("fake-alias.tsx", aliased));
    expect(calls).toHaveLength(1);
    expect(calls[0].routeOutHrefs).toEqual(["/x"]);
    expect(calls[0].routeOutText).toBe("Out");
    expect(calls[0].literals.title).toBe("t");

    // A component with the same NAME from somewhere else is not this pattern.
    const impostor = [
      'import { ErrorState } from "./local-error-state";',
      "export const A = <ErrorState title=\"t\" />;",
    ].join("\n");
    expect(patternCalls("fake-impostor.tsx", parse("fake-impostor.tsx", impostor))).toEqual([]);
  });

  it("flags the error object crossing into the pattern, however it is spelled", () => {
    const direct = [
      'import { ErrorState } from "@/components/patterns/error-state";',
      "export const A = <ErrorState error={error} />;",
    ].join("\n");
    expect(patternCalls("fake-prop.tsx", parse("fake-prop.tsx", direct))[0].errorProps).toEqual([
      "fake-prop.tsx:2 error={…error…}",
    ]);

    // Laundered through a member access on a prop that is not called `error` — still the object.
    const laundered = [
      'import { ErrorState } from "@/components/patterns/error-state";',
      "export const A = <ErrorState body={error.message} />;",
    ].join("\n");
    expect(patternCalls("fake-laundered.tsx", parse("fake-laundered.tsx", laundered))[0].errorProps)
      .toEqual(["fake-laundered.tsx:2 body={…error…}"]);

    // …and the sanctioned shape is NOT flagged: `digest` is computed outside the call.
    const clean = [
      'import { ErrorState } from "@/components/patterns/error-state";',
      "export const A = <ErrorState digest={digest} onRetry={reset} />;",
    ].join("\n");
    expect(patternCalls("fake-clean.tsx", parse("fake-clean.tsx", clean))[0].errorProps).toEqual([]);
  });

  it("reads the directive from the prologue, not from anywhere in the file", () => {
    expect(hasUseClientPrologue(parse("a.tsx", '"use client";\nexport const A = 1;'))).toBe(true);
    expect(hasUseClientPrologue(parse("b.tsx", 'const s = "use client";\nexport const A = s;'))).toBe(
      false,
    );
    expect(hasUseClientPrologue(parse("c.tsx", '// "use client"\nexport const A = 1;'))).toBe(false);
  });
});
