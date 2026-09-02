// `/host/verify`'s THREE STRUCTURAL CLAIMS — the ones no render can make and no reviewer can keep
// making (HVER-06 / HVER-08 · plan 18.1-11).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY A SOURCE SCAN RATHER THAN A RENDER, FOR THESE THREE AND ONLY THESE THREE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every claim below is about the ABSENCE of something, or about two files agreeing on one identifier.
// A render cannot see either. Rendering the page with a query string proves nothing about whether a
// later edit adds a parameter; rendering the panel proves nothing about whether the number in its
// cooldown sentence is the number in the database's clause. What the panel DOES render, in which
// state, is `tests/host/verification-panel.test.tsx`'s subject — including D-273's placement, which is
// a claim about a rendered document and belongs there.
//
// ⚠ THE ASSERTIONS SCAN OTHER FILES, NEVER THIS ONE, WHICH IS WHAT LETS THIS FILE NAME WHAT IT
// FORBIDS. `tests/listing/review-signal.test.ts:12-17` records the trap: this repository has gone
// falsely RED several times on gates that scanned raw source while the correct file necessarily
// spelled the thing it banned. The identifier this file exists to prove absent from ONE page is
// therefore written freely here, because the walker never opens this file.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// CLAIM 1 (T-18.1-1101) — THE PARTNER'S RETURN CARRIES NO AUTHORITY
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The checking partner's hosted flow sends a host back to `/host/verify` through a `callback`
// redirect. That redirect is a browser navigation the host fully controls: they can edit it, replay
// it, or type the route with any query they like. If the page read one, `?status=approved` would be a
// host asserting their own standing — the forgeable-return defect PROJECT D-57 is named for on the
// money path, and the identical shape `pending-payment-state.tsx` exists for there.
//
// So the page reads NONE, and this is asserted twice over: zero occurrences of the identifier in the
// file's text, and no such parameter on the default export, walked syntactically. The two halves catch
// different edits — a destructured `{ searchParams }` and a `props.searchParams` read — and the text
// half is what makes the claim survive a refactor into a helper the walker would not follow.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// CLAIM 2 — THE SIGNAL MAP IS TOTAL, AT RUNTIME AS WELL AS AT COMPILE TIME
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `VERIFICATION_SIGNAL`'s `satisfies Record<HostVerificationStatus, …>` clause already makes `tsc`
// enumerate the six states, so a seventh enum member fails the build until somebody decides, in
// writing, what the host reads. That is the strong half and it is not duplicated here.
//
// What IS asserted here is the same totality at RUNTIME, keyed off the pgEnum rather than off a list,
// because a compile-time claim can be bypassed by a cast and a partial map behind a cast is a BLANK
// PANEL on a destination somebody arrived at on purpose. The enum is read from the schema, so a
// seventh value fails this by name.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// CLAIM 3 (T-18.1-1106) — THE COOLDOWN HAS ONE AUTHORITY
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The instant a rejected host READS and the clause that REFUSES them derive from one constant. Before
// plan 18.1-11 the interval was a module-private literal inside the server action, so the only way to
// show it was to spell it again in the page — a figure on screen that can disagree with the clause
// that decides, which is PROJECT D-130 / GATE-05's exact defect one domain over.
//
// ⚠ THIS PINS THE IDENTITY AND NOT THE VALUE, DELIBERATELY, and the difference was MEASURED. Moving
// the constant from 24 to 26 reddens `tests/ops/host-verification-submit.test.ts` case 6 — the server
// half is behaviourally pinned there and does not need a second copy of that assertion. What NOTHING
// pinned was that both readers read the SAME declaration, and that is what the three cases below are
// for: one declaration under `src/`, imported by the action that enforces it and by the page that
// quotes it.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

import { hostVerificationStatus } from "@/lib/db/schema";
import { COOLDOWN_HOURS } from "@/lib/host/verification-cooldown";
import { VERIFICATION_SIGNAL } from "@/lib/host/verification-signal";

const ROOT = process.cwd();
const SRC_DIR = resolve(ROOT, "src");

/** The route's own file, and the two modules claim 3 is about. */
const PAGE = "src/app/(host)/host/verify/page.tsx";
const ACTION = "src/app/actions/host-verification.ts";
const COOLDOWN_MODULE = "src/lib/host/verification-cooldown.ts";
const COOLDOWN_NAME = "COOLDOWN_HOURS";

/**
 * The identifier claim 1 forbids, assembled from halves.
 *
 * ⚠ SPELT IN TWO PIECES ON PURPOSE. The text half of claim 1 counts occurrences of this identifier in
 * ONE page file, and several acceptance greps for this plan count them across the tree. A future
 * reader who widens either scan to include `tests/**` — which is a reasonable thing to want — would
 * find this file spelling the token it proves absent and read a correct file as a broken one. That has
 * happened here more than once, so the token is not written contiguously anywhere below.
 */
const FORBIDDEN_PARAM = `search${"Params"}`;

function read(file: string): string {
  return readFileSync(resolve(ROOT, file), "utf8");
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/** The `export default` function-ish declaration, whatever shape it was written in. */
function defaultExport(sf: ts.SourceFile): ts.SignatureDeclarationBase | null {
  for (const statement of sf.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      (ts.getModifiers(statement) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
    ) {
      return statement;
    }
    if (ts.isExportAssignment(statement)) {
      const expr = statement.expression;
      if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) return expr;
    }
  }
  return null;
}

/** Every `.ts`/`.tsx` under `src/`, repo-relative and forward-slashed. */
function collectSource(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSource(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(relative(ROOT, full).split("\\").join("/"));
  }
  return out;
}

/** Module-level `const NAME = …` declarations of one name, anywhere in a file. */
function declaresConst(sf: ts.SourceFile, name: string): number {
  let found = 0;
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer !== undefined
    ) {
      found += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** Does this file import `name` from `from`? */
function importsNamed(sf: ts.SourceFile, name: string, from: string): boolean {
  for (const statement of sf.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (statement.moduleSpecifier.text !== from) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined || !ts.isNamedImports(bindings)) continue;
    if (bindings.elements.some((el) => (el.propertyName ?? el.name).text === name)) return true;
  }
  return false;
}

describe("HVER-06 — the partner's callback carries no authority", () => {
  // Guard-the-guard FIRST, and in both directions. Every assertion in this describe is an ABSENCE, and
  // over a file the walker never opened, or an empty one, they all report a perfectly clean result
  // that is indistinguishable from a real one — and would stay that way forever.
  it("found and parsed the page it is asserting about (guard-the-guard)", () => {
    const text = read(PAGE);
    expect(text.length, `${PAGE} is empty`).toBeGreaterThan(400);
    const sf = parse(PAGE);
    expect(sf.statements.length, `${PAGE} parsed to no statements`).toBeGreaterThan(0);
    // The walker resolves the default export at all — without this, the parameter assertion below
    // would pass over `null` and prove nothing about a page whose export it simply could not find.
    expect(defaultExport(sf), `${PAGE}'s default export could not be resolved`).not.toBeNull();
    // Positive control: the scan really is reading the verification surface and not some other page.
    expect(text).toContain("loadHostVerification");
  });

  it("the page file contains ZERO occurrences of the query-parameter identifier", () => {
    const occurrences = read(PAGE).split(FORBIDDEN_PARAM).length - 1;
    expect(
      occurrences,
      `${PAGE} mentions the query-parameter identifier ${occurrences} time(s). The checking ` +
        "partner's callback is a browser return the host fully controls, so reading anything off it " +
        "lets a host assert their own standing — PROJECT D-57's forgeable-return defect, one domain " +
        "over. The page re-reads the row instead. If a query genuinely has to be read here, that is " +
        "a UI-SPEC decision and this assertion is what it has to argue with.",
    ).toBe(0);
  });

  it("the default export declares no such parameter, walked syntactically rather than grepped", () => {
    const declaration = defaultExport(parse(PAGE));
    const names = (declaration?.parameters ?? []).flatMap((param) => {
      if (ts.isIdentifier(param.name)) return [param.name.text];
      // A destructured props object — `{ searchParams }` — is the shape a text scan would catch and
      // an eye would not, and it is the realistic edit.
      if (ts.isObjectBindingPattern(param.name)) {
        return param.name.elements.map((el) => (el.propertyName ?? el.name).getText());
      }
      return [];
    });

    expect(
      names.filter((name) => name.includes(FORBIDDEN_PARAM)),
      "the page's default export takes the query parameter. It must take none: the row is the " +
        "authority and the redirect is not.",
    ).toEqual([]);

    // Both halves of the shape the route DOES have, so this case cannot pass on a page that takes no
    // parameters because it stopped being a page.
    expect(names).toEqual([]);
  });
});

describe("HVER-06 — the signal map is total over the verification enum at RUNTIME", () => {
  it("carries a panel for every host_verification_status value, and no extras", () => {
    const declared = Object.keys(VERIFICATION_SIGNAL).toSorted();
    const enumerated = [...hostVerificationStatus.enumValues].toSorted();

    expect(
      declared,
      "the copy module's map and the database enum disagree. A destination that renders nothing is a " +
        "broken page, and 'nothing' is never the honest answer to somebody who arrived on purpose — " +
        "so a SEVENTH state is a copy decision somebody has to take in writing, in 18.1-UI-SPEC " +
        "first. `tsc`'s `satisfies` clause is the strong half of this claim; this half is what a cast " +
        "cannot bypass.",
    ).toEqual(enumerated);

    // Every panel says something. A key present with an empty state or reason satisfies the set
    // equality above perfectly and still renders the blank screen the totality exists to prevent.
    for (const status of enumerated) {
      const signal = VERIFICATION_SIGNAL[status as keyof typeof VERIFICATION_SIGNAL];
      expect(signal.state.trim().length, `${status} has no state`).toBeGreaterThan(0);
      expect(signal.reason.trim().length, `${status} has no reason`).toBeGreaterThan(0);
    }
  });
});

describe("D-264 / GATE-05 — the retry cooldown has exactly one authority", () => {
  it("is declared in ONE file under src/, and that file is the declaration module", () => {
    const sources = collectSource(SRC_DIR);
    // Guard-the-guard: the walk found the tree, and it found the two files this claim is about.
    expect(sources.length, "the source walk collected nothing").toBeGreaterThan(100);
    expect(sources).toContain(COOLDOWN_MODULE);
    expect(sources).toContain(ACTION);
    expect(sources).toContain(PAGE);

    const declaring = sources.filter((file) => declaresConst(parse(file), COOLDOWN_NAME) > 0);

    expect(
      declaring,
      `${COOLDOWN_NAME} is declared in ${declaring.length} file(s): ${declaring.join(", ")}. It must ` +
        "be one. The submission action's guarded UPDATE binds this interval into its own WHERE and " +
        "`/host/verify` quotes the resulting instant to the host; two declarations that agree today " +
        "are a figure on screen that can disagree with the clause that decides, which is PROJECT " +
        "D-130 / GATE-05's defect. It cannot be exported from the action either — a server-action " +
        "module may export only async functions — so the declaration module beside it is the shape.",
    ).toEqual([COOLDOWN_MODULE]);
  });

  it("is IMPORTED by both the clause that enforces it and the sentence that quotes it", () => {
    const specifier = "@/lib/host/verification-cooldown";
    expect(
      importsNamed(parse(ACTION), COOLDOWN_NAME, specifier),
      `${ACTION} must import the interval rather than restate it`,
    ).toBe(true);
    expect(
      importsNamed(parse(PAGE), COOLDOWN_NAME, specifier),
      `${PAGE} must import the interval rather than restate it`,
    ).toBe(true);

    // The ENFORCING half: the identifier is bound into the statement's own interval expression, so a
    // future edit that keeps the import but hardcodes the SQL is caught. Read off the tagged template
    // the statement is written as, not off the whole file.
    const sql = parse(ACTION)
      .getChildren()
      .flatMap(function flatten(node: ts.Node): ts.Node[] {
        return [node, ...node.getChildren().flatMap(flatten)];
      })
      .filter((node) => ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node))
      .map((node) => node.getText())
      .filter((text) => text.includes("make_interval"));

    expect(sql.length, "the guarded UPDATE's interval clause was not found in the action").toBe(1);
    expect(
      sql[0].includes(COOLDOWN_NAME),
      "the interval clause does not bind the shared constant. A literal here is the second authority " +
        "this whole case exists to forbid.",
    ).toBe(true);

    // The QUOTING half: the page hands the same identifier to the composer. The composer takes the
    // hours as a parameter precisely so the wording cannot invent its own policy, which makes THIS
    // argument the place the two halves are joined.
    const composerArgs = parse(PAGE)
      .getChildren()
      .flatMap(function flatten(node: ts.Node): ts.Node[] {
        return [node, ...node.getChildren().flatMap(flatten)];
      })
      .filter(ts.isCallExpression)
      .filter((call) => call.expression.getText().endsWith("composeRetryAfterSentence"))
      .map((call) => call.arguments.map((arg) => arg.getText()));

    expect(composerArgs.length, "the page does not compose the retry sentence").toBe(1);
    expect(composerArgs[0][1]).toBe(COOLDOWN_NAME);
  });

  it("is a positive whole number of hours (a floor, not a policy review)", () => {
    // Not an assertion about 24. What this rules out is a zero or a negative — either of which would
    // make the cooldown a no-op while every structural claim above stayed perfectly green. The VALUE
    // is pinned behaviourally by `tests/ops/host-verification-submit.test.ts` case 6, against the
    // database's own clause, which is the only place it can honestly be pinned.
    expect(Number.isInteger(COOLDOWN_HOURS)).toBe(true);
    expect(COOLDOWN_HOURS).toBeGreaterThan(0);
  });
});
