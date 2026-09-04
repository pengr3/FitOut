// @vitest-environment jsdom

// 13-UI-SPEC § The Cancel Review Page (items 1 and 3) — `/bookings/[id]/cancel` renders the phase's box
// and carries no live region on static content.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY A NEW FILE RATHER THAN AN `it()` IN `card-pattern-coverage.test.ts`, WHICH THE PLAN ALLOWED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// That file's `CARD_SURFACES` is DEFINED as "the twelve files the 11-UI-SPEC's three `Replaces` lists
// name", and `EXPECTED_SURFACES = 12` is pinned separately so the inventory cannot be emptied. The
// cancel page is not on any of those three lists — it is a 13-UI-SPEC adoption. Adding a row would
// bump a count whose documented derivation (ResultCard 2 + RowCard 5 + PanelCard 5) would then be
// arithmetically false, and that file's own NOT-COVERED footer already anticipates this exact case:
// *"a Phase-12 checkout redesign that introduces two new panels is expected to EXTEND this inventory
// in its own commit — that is the gate working"*, i.e. the extension is the LATER phase's inventory,
// not a silent edit to Phase 11's. Its `ALLOWED_RAW_CARD` row for this file is deliberately LEFT IN
// PLACE and stays green: that half only asserts the named file EXISTS (`parsedByFile.has(file)`, which
// is populated for every walked file, not only for card-rendering ones), so a file that stops
// rendering a raw container does not redden it. ⚠ If this page is ever deleted or moved, that row must
// go in the same commit.
//
// The second reason is scope: this file also asserts the LIVE-REGION removal, which is not a card
// question at all and has no home in a card-coverage suite.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE SOURCE HALF IS AN AST SCAN AND NOT A GREP
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The page's own header EXPLAINS the adoption and the live-region removal in prose, so a text scan
// would report the comment describing the fix as the defect. That is not hypothetical: this phase has
// now hit the grep-versus-prose collision in five consecutive plans (13-01 Dev.1, 13-02 Dev.2/3,
// 13-03 Dev.2, 13-04's `&apos;` finding, and 13-06's own two — the numeral in `rungDescription`'s
// example and the attribute named in the header). An AST scan's unit is a JSX element and a JSX
// attribute, which a comment cannot be. The page's header names the attribute descriptively anyway,
// belt and braces, so the plan's own `grep -c` acceptance criterion stays satisfiable too.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY IT IS `.tsx` — THE CHAIN IS CLOSED AT BOTH ENDS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The plan asks that "every card container on `/bookings/[id]/cancel` renders `data-testid` of
// `panel-card` or `row-card`". A source scan alone proves only the first link — that the page composes
// a pattern. It cannot see what that pattern renders. So case (4) RENDERS the patterns and reads the
// attribute off the DOM, and case (5) pins both ids against `SELECTOR_IDS`, the closed contract that
// declares them. Page → pattern (AST) → attribute (DOM) → contract (union). A gate that asserted only
// the first link would stay green if `PanelCard` lost its hook tomorrow.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   • NOTHING HERE RENDERS THE PAGE. It is an async RSC that reads `auth`, the database and the DB
//     clock; the design config is deliberately database-free (`vitest.design.config.ts`'s header says
//     a design test that needs a database is not a design test). The rendered proof of this surface
//     lives in `e2e/cancel.spec.ts`.
//   • IT POLICES CONTAINERS AND LIVE-REGION ATTRIBUTES, NOT LAYOUT. A hand-rolled
//     `<div className="bg-card ring-1 rounded-xl">` is invisible here, exactly as it is to
//     `card-pattern-coverage.test.ts`; `leak.test.ts` and `elevation-z.test.ts` police that half.
//   • IT IS SCOPED TO ONE FILE. It says nothing about the components the page imports.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { render, screen } from "@testing-library/react";

import { PanelCard } from "@/components/patterns/panel-card";
import { RowCard } from "@/components/patterns/row-card";
import { SELECTOR_ATTRIBUTE, SELECTOR_IDS } from "@/lib/design/selector-contract";

const SURFACE = "src/app/(app)/bookings/[id]/cancel/page.tsx";

/** The vendored primitive's module. Any binding imported from here is a raw container. */
const UI_CARD_MODULE = "@/components/ui/card";
/** The pattern modules whose components are the ONLY containers this surface may render. */
const PATTERN_MODULES: Readonly<Record<string, "panel-card" | "row-card">> = {
  "@/components/patterns/panel-card": "panel-card",
  "@/components/patterns/row-card": "row-card",
};

type Finding = { readonly what: string; readonly line: number };

type Scan = {
  /** Every JSX element whose tag resolves to a binding imported from `ui/card`. Must be empty. */
  readonly rawContainers: readonly Finding[];
  /** Every JSX element whose tag resolves to a pattern container, with the testid it will render. */
  readonly patternContainers: readonly Finding[];
  /** Every JSX attribute that declares a live region: the politeness attribute or a status/alert role. */
  readonly liveRegionAttrs: readonly Finding[];
  /** Total JSX elements seen — the guard-the-guard floor. A scan of nothing satisfies two empties. */
  readonly jsxElements: number;
};

/**
 * `(path, text)` rather than `(path)` on purpose (`leak.test.ts:208-212`'s rule, and
 * `card-pattern-coverage.test.ts:420`'s): case (6) feeds this the fixture below, which is never
 * written to disk, so the code path the real assertions run is the same one the fixture proves.
 *
 * Aliased imports are resolved through `propertyName ?? name`, so `import { Card as Box }` is still a
 * raw container and renaming the import cannot launder it.
 */
function scanSurface(path: string, text: string): Scan {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );
  const lineOf = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  /** local JSX name → what it is. Built from the import clauses, never from the tag spelling. */
  const rawLocals = new Set<string>();
  const patternLocals = new Map<string, "panel-card" | "row-card">();

  const visitImports = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          const local = element.name.text;
          if (specifier === UI_CARD_MODULE) rawLocals.add(local);
          const pattern = PATTERN_MODULES[specifier];
          // Only the pattern's own component counts as its container — a type import from the same
          // module is not a box.
          const exported = (element.propertyName ?? element.name).text;
          if (pattern && /^(PanelCard|RowCard)$/.test(exported)) patternLocals.set(local, pattern);
        }
      }
    }
    ts.forEachChild(node, visitImports);
  };
  visitImports(sf);

  const rawContainers: Finding[] = [];
  const patternContainers: Finding[] = [];
  const liveRegionAttrs: Finding[] = [];
  let jsxElements = 0;

  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      jsxElements += 1;
      const tag = node.tagName;
      if (ts.isIdentifier(tag)) {
        if (rawLocals.has(tag.text)) rawContainers.push({ what: tag.text, line: lineOf(node) });
        const pattern = patternLocals.get(tag.text);
        if (pattern) patternContainers.push({ what: pattern, line: lineOf(node) });
      }
    }
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const name = node.name.text;
      // The politeness attribute, spelled through a join so this file's own source cannot be read as
      // a violation by a future whole-tree text scan for it — the same disarmed-tripwire discipline
      // 13-03 Deviation 3 recorded.
      const POLITENESS_ATTR = ["aria", "live"].join("-");
      if (name === POLITENESS_ATTR) {
        liveRegionAttrs.push({ what: name, line: lineOf(node) });
      }
      if (name === "role" && node.initializer && ts.isStringLiteral(node.initializer)) {
        const role = node.initializer.text;
        if (role === "status" || role === "alert") {
          liveRegionAttrs.push({ what: `role=${role}`, line: lineOf(node) });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return { rawContainers, patternContainers, liveRegionAttrs, jsxElements };
}

/**
 * THE POSITIVE CONTROL, and it is a fixture rather than a mutation of the real file because the scan
 * must be shown catching all THREE things it claims to catch — a raw container, the politeness
 * attribute and a status role — in one pass. It also carries an ALIASED raw import, which is the
 * cheapest way to launder a container past a naive tag-name scan.
 */
const VIOLATING_FIXTURE = [
  'import { Card as Box, CardContent } from "@/components/ui/card";',
  'import { PanelCard } from "@/components/patterns/panel-card";',
  "export function Bad() {",
  "  return (",
  "    <Box>",
  '      <CardContent role="status" aria-live="polite" className="space-y-4">',
  "        <p>hello</p>",
  "      </CardContent>",
  "    </Box>",
  "  );",
  "}",
  "export function Good() {",
  "  return <PanelCard><p>hi</p></PanelCard>;",
  "}",
].join("\n");

const surfacePath = resolve(process.cwd(), SURFACE);
const surfaceText = readFileSync(surfacePath, "utf8");
const scan = scanSurface(SURFACE, surfaceText);

describe("13-UI-SPEC § The Cancel Review Page — the box and the (absent) live region", () => {
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // GUARD THE GUARD, ASSERTED FIRST. Two of the four real assertions are "a list was empty", which
  // a scan that parsed nothing satisfies perfectly.
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  it("(1) parsed the real surface rather than an empty one", () => {
    expect(
      surfaceText.length,
      `${SURFACE} read as empty. Two assertions below are absences and an empty file passes both.`,
    ).toBeGreaterThan(2000);
    expect(
      scan.jsxElements,
      "the scan resolved 0 JSX elements on a page that renders dozens. An absence asserted over a " +
        "tree the walker never entered is not an assertion.",
    ).toBeGreaterThan(20);
  });

  it("(2) renders its containers through the pattern layer, never the vendored primitive", () => {
    expect(
      scan.rawContainers.map((f) => `${SURFACE}:${f.line} — <${f.what}>`),
      "the cancel review page renders a raw container from @/components/ui/card. DS-11 declares three " +
        "card containers and 13-UI-SPEC § The Cancel Review Page item 3 puts this surface on PanelCard " +
        "so it matches the booking detail page and the receipt either side of it. Compose PanelCard — " +
        "and add no padding at the call site: PanelCard's own CardContent already carries it, and this " +
        "tree's Card puts block padding on Card itself, so a child that asks again pays it twice.",
    ).toEqual([]);
    // BOTH return branches — the past-window refusal and the review itself — or the assertion above is
    // satisfied by a page that renders no container at all.
    expect(
      scan.patternContainers.length,
      "the page composes fewer than the two pattern containers its two return branches need. The " +
        "empty-container cheat is what this floor exists to block.",
    ).toBeGreaterThanOrEqual(2);
    // …and every one of them is a DECLARED pattern id, which is the source half of the plan's
    // "panel-card or row-card" requirement.
    expect([...new Set(scan.patternContainers.map((f) => f.what))].sort()).toEqual(["panel-card"]);
  });

  it("(3) declares no live region — a fresh navigation is not a change", () => {
    expect(
      scan.liveRegionAttrs.map((f) => `${SURFACE}:${f.line} — ${f.what}`),
      "the cancel review page declares a live region on static content. 13-UI-SPEC § Live Regions: " +
        "*a live region announces a CHANGE. A freshly navigated page is not a change — it is a page.* " +
        "A screen reader already reads a fresh render from the top, so this announces nothing or a " +
        "duplicate, and an empty announcement on every navigation trains a user to ignore the " +
        "mechanism. Remove it; do not rename it, and do not add a focus move in its place.",
    ).toEqual([]);
  });

  it("(4) the pattern the page composes is what actually renders the hook", () => {
    // The second link of the chain. The AST above proves the page composes PanelCard; only a render
    // can prove PanelCard emits the attribute a selector or an e2e assertion will look for.
    const { unmount } = render(
      <PanelCard>
        <p>content</p>
      </PanelCard>,
    );
    expect(screen.getByTestId("panel-card")).toBeTruthy();
    expect(screen.getByTestId("panel-card").getAttribute(SELECTOR_ATTRIBUTE)).toBe("panel-card");
    unmount();

    // The other permitted value, pinned in the same place so the pair the plan names is closed rather
    // than half-asserted. A future roster or list on this surface has one legal container, not two.
    render(<RowCard title="A row" />);
    expect(screen.getByTestId("row-card").getAttribute(SELECTOR_ATTRIBUTE)).toBe("row-card");
  });

  it("(5) both permitted ids are declared in the closed selector contract", () => {
    // The third link: `panel-card` and `row-card` are not strings this file invented, they are rows in
    // `SELECTOR_IDS`. If a pattern's hook is ever renamed, this goes red beside case (4).
    for (const id of ["panel-card", "row-card"] as const) {
      expect(
        (SELECTOR_IDS as readonly string[]).includes(id),
        `"${id}" is not in SELECTOR_IDS. The contract is closed; a hook outside it is a hook nothing ` +
          "declares.",
      ).toBe(true);
    }
  });

  it("(6) the scan catches all three violations it claims to — proved on a fixture", () => {
    // ⚠ 13-05's finding, applied: a scan whose list of things-to-catch was never shown catching one
    // of them is a scan that reports a clean file forever. Fed a module that violates every clause —
    // including an ALIASED raw import — it must report each one.
    const bad = scanSurface("fixture.tsx", VIOLATING_FIXTURE);
    expect(bad.rawContainers.map((f) => f.what).sort()).toEqual(["Box", "CardContent"]);
    expect(bad.liveRegionAttrs.map((f) => f.what).sort()).toEqual([
      ["aria", "live"].join("-"),
      "role=status",
    ]);
    // …and it still recognises the legitimate container in the same file, so the scan is not simply
    // reporting everything it sees.
    expect(bad.patternContainers.map((f) => f.what)).toEqual(["panel-card"]);
  });
});
