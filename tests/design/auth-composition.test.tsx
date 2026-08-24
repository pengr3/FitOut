// @vitest-environment jsdom

// AUTHUI-01 / AUTHUI-03 — ONE COMPOSITION, FOUR SCREENS, AS A COMMAND THAT EXITS NON-ZERO.
//
// 15-UI-SPEC § "One composition, four screens" is the central claim of this phase's auth work: the
// four `(auth)` documents differ in their copy and their fields and in NOTHING structural. Until this
// file existed that claim was prose — four pages that each looked right in review, with no mechanism
// that would notice the fifth edit taking one of them out of the set.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE FOUR-LINK CHAIN — PAGE → PATTERN (AST) → ATTRIBUTE (DOM) → CONTRACT (UNION)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `cancel-page-shell.test.tsx:42-47`'s chain, on the same kind of surface and for the same reason.
// A source scan alone proves only the FIRST link — that a page composes a pattern. It cannot see what
// that pattern renders, so a gate built from source alone would stay perfectly green the day
// `PanelCard` lost its hook. So:
//
//   1. page → pattern      an AST walk, per file: which container each page composes, and that it
//                          composes no raw one. Aliased imports resolved, so `import { Card as Box }`
//                          is still a raw container.
//   2. pattern → attribute a RENDER of `PanelCard` in jsdom, reading the test-id attribute off the
//                          produced DOM rather than off the pattern's source.
//   3. attribute → contract that value pinned against `SELECTOR_IDS`, the closed union that declares
//                          it. A hook outside the union is a hook nothing declares.
//
// The fourth link is the COPY: the eight `title`/`description` literals are written into this file, so
// a change to any auth heading or lede has to move this file too and be seen in the diff (T-15-31).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY AN AST WALK AND NOT A GREP
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `cancel-page-shell.test.tsx:30-36`'s reason, and this phase has now paid it eight times (15-06 ×4,
// 15-07 ×3, 15-08 ×1, and once more in this plan's own Task 1 where a glob inside a block comment
// closed the comment). The converted pages carry headers that EXPLAIN the adoption — they name the
// pattern, the removed container and the removed regions in prose — so a text scan would report the
// comment describing the fix as the defect. An AST scan's unit is a JSX element and a JSX attribute,
// which a comment cannot be.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE MUTATION WALK — ⚠ NOT YET RUN. SIX PROBES PLANNED; ZERO OBSERVED.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ READ THIS BEFORE TRUSTING ANY ASSERTION BELOW. The file is GREEN at 13 passed against the
// unmutated tree, which proves only that it agrees with today's source. Not one of its assertions has
// been watched FAILING, and an assertion nobody has seen fail is an assertion nobody has tested. This
// block is written in the state the walk is actually in, rather than left blank or — worse — filled
// in from what the failures are expected to look like.
//
// Command for all six:
// `npx vitest run tests/design/auth-composition.test.tsx --config vitest.design.config.ts`
// GREEN IS 13 PASSED. `git diff --exit-code src/` must exit 0 after each probe is reverted.
//
//   (M1) RUN AND REVERTED. The pattern swapped back for the raw primitive UNDER AN ALIAS, on
//        `(auth)/forgot-password/page.tsx`: `import { PanelCard } from "@/components/patterns/panel-card"`
//        replaced by `import { Card as PanelCard } from "@/components/ui/card"`. This is the laundering
//        the `propertyName ?? name` resolution exists for — the TAG spelling never changes, so a scan
//        keyed on tag names reports a perfectly clean file. 2 failed / 11 passed:
//
//          AssertionError: an auth page renders a container from the vendored card primitive. 15-UI-SPEC
//          § "One composition, four screens" puts all four screens on PanelCard, and plan 15-07 spent
//          all four ALLOWED_RAW_CARD rows to get there — a raw container here is one of those rows
//          coming back without the allow-list entry that used to declare it. Aliasing the import does
//          not help: the scan resolves the EXPORTED name.: expected [ Array(1) ] to deeply equal []
//          + "src/app/(auth)/forgot-password/page.tsx:72 — <PanelCard> (imported from @/components/ui/card)"
//
//          AssertionError: src/app/(auth)/forgot-password/page.tsx's PanelCard title is not the
//          byte-for-byte string 15-UI-SPEC's copy table pins.: expected [] to deeply equal
//          [ 'Reset your password' ]
//
//        ⚠ THE SECOND FAILURE IS THE INTERESTING ONE AND IT WAS NOT PREDICTED. The copy check reads
//        `title` off PATTERN containers only, so when the pattern binding stops being one the eight
//        pinned literals stop being FOUND rather than stopping being EQUAL — an absence presenting as
//        a copy failure. Read (3) first when both fire; (6) is the echo, not a second defect.
//        ⚠ AND THE "exactly one PanelCard" LOOP INSIDE (3) NEVER RAN, because the raw-container
//        assertion above it threw first. Two assertions in one `it()` are ordered, not independent.
//   (M2) RUN AND REVERTED. A document loses its level-1 heading: the `titleAs="h1"` line deleted from
//        `(auth)/signup/page.tsx`'s call site. The prop DEFAULTS to `"h2"`, so this defect is silent
//        in review, silent in the browser and invisible to every other gate in the suite — the exact
//        failure `panel-card.tsx`'s `titleAs` docblock predicts. 1 failed / 12 passed:
//
//          AssertionError: an auth page does not pass titleAs="h1", so its PanelCard title renders as
//          the component'''s DEFAULT h2 and that document has no level-1 heading at all. The prop
//          defaults, so this failure is SILENT in review and in the browser — nothing looks wrong.
//          `panel-card.tsx`'''s titleAs docblock predicts this exact defect and 15-06 widened the union
//          for exactly this case: on these four routes the panel is not content under a page heading,
//          it IS the document.: expected [ '''src/app/(auth)/signup/page.tsx''' ] to deeply equal []
//          + "src/app/(auth)/signup/page.tsx"
//
//        ⚠ NOTHING ELSE FIRED, and that is the finding rather than a footnote. Case (10) renders
//        `PanelCard` with `titleAs="h1"` and still found its level-1 heading, because a render fixture
//        proves what the PATTERN can do, never what a page ASKED it to do. The two halves of the chain
//        are genuinely independent and this probe is what shows it.
//   (M3) RUN AND REVERTED. A second accent-filled control ships: `variant="outline"` → `variant="brand"`
//        on `(auth)/login/page.tsx`'s `Continue with Google` button. D-162 is "coral on the primary
//        action only", broken in the single most plausible way — by promoting the control right beside
//        it. 1 failed / 12 passed:
//
//          AssertionError: an auth screen carries a number of accent-filled controls other than one.
//          D-162 puts coral on the PRIMARY action only; a second one makes one screen ask twice and
//          there is then no primary action, only two. Zero is the other failure and it is not the safe
//          one — a screen with no accent has no primary action at all.: expected [ Array(1) ] to deeply
//          equal []
//          + "src/app/(auth)/login/page.tsx — 2 (lines 213, 230)"
//
//        BOTH LINE NUMBERS ARE IN THE REPORT ON PURPOSE. "This screen has two" is not actionable; a
//        developer has to know WHICH two before deciding which one was never meant to be accented.
//        ⚠ THE TOUCH-SIZE HALF OF THE SAME `it()` STAYED GREEN, because the mutated button already
//        carried `size="touch"`. The two assertions are independent and only one of them is about
//        count — which is why the 44px floor gets its own array rather than riding on this one.
//   (M4) PENDING — a heading's copy drifts: `title="Welcome back"` → `title="Welcome back!"`.
//   (M5) PENDING — the single landmark doubles: a second one opened inside `(auth)/layout.tsx`.
//   (M6) PENDING — a removed region comes back: `role="status"` restored on the login page's
//        post-reset notice, i.e. plan 15-07's `ResetNotice` demotion undone.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//   • NOTHING HERE RENDERS AN AUTH PAGE. All four are `"use client"` modules that reach `authClient`,
//     `next/navigation` and a server action; `vitest.design.config.ts` is database-free and
//     router-free by construction. The rendered proof lives in `e2e/login-persistence.spec.ts` and
//     `e2e/password-reset.spec.ts`, which pin the accessible names this file only pins as source.
//   • IT POLICES CONTAINERS, HEADING LEVELS, ACCENT COUNT, COPY AND LANDMARKS — NOT LAYOUT. A
//     hand-rolled box is invisible here exactly as it is to `card-pattern-coverage.test.ts`;
//     `leak.test.ts` and `elevation-z.test.ts` police that half, and 15-11's baselines police pixels.
//   • IT READS AUTHORED SOURCE. A `role` or a variant composed at runtime from a variable is invisible
//     to the walk. That direction is safe for a BAN (it can miss a violation, never invent one) and it
//     is a real hole — the same one `live-regions.ts`'s NOT COVERED footer records.
//   • THE LIVE-REGION HALF HERE IS TWO SPOT CHECKS, NOT AN INVENTORY. `tests/design/live-regions.test.tsx`
//     is the inventory, and as of plan 15-09 it audits all five Phase-15 surfaces. What this file adds
//     is the two DEMOTIONS, which an inventory structurally cannot assert: a region that is gone leaves
//     no row behind to be checked.

import { describe, it, expect, afterEach } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { render, screen, cleanup } from "@testing-library/react";

import { PanelCard } from "@/components/patterns/panel-card";
import { SELECTOR_ATTRIBUTE, SELECTOR_IDS } from "@/lib/design/selector-contract";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The surfaces, and the copy 15-UI-SPEC pins for them
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const LAYOUT = "src/app/(auth)/layout.tsx";

/**
 * The four screens with their heading and lede, byte-for-byte from 15-UI-SPEC § "One composition,
 * four screens" — which in turn records them as SHIPPED copy, unmoved by the conversion.
 *
 * Writing them here is deliberate friction (T-15-31). Two of the four ledes are load-bearing beyond
 * tone: the reset screens' wording is what keeps the flow from confirming whether an address has an
 * account, so a copy edit made without reading this table is a copy edit made without reading the
 * threat it satisfies.
 */
const AUTH_PAGES = [
  {
    path: "src/app/(auth)/login/page.tsx",
    title: "Welcome back",
    description: "Log in to your FitOut account.",
  },
  {
    path: "src/app/(auth)/signup/page.tsx",
    title: "Create your FitOut account",
    description: "Book a space or list one of your own.",
  },
  {
    path: "src/app/(auth)/forgot-password/page.tsx",
    title: "Reset your password",
    description: "Enter your email and we'll send you a reset link.",
  },
  {
    path: "src/app/(auth)/reset-password/page.tsx",
    title: "Set a new password",
    description: "Choose a strong password you don't reuse.",
  },
] as const;

/** The vendored primitive's module. ANY binding imported from here is a raw container. */
const UI_CARD_MODULE = "@/components/ui/card";
/** The pattern module whose component is the only container these four surfaces may render. */
const PANEL_MODULE = "@/components/patterns/panel-card";
/**
 * The chrome module. Two very different things live in it, and the distinction is the whole of the
 * layout assertion below: `BRAND_CLASS` is a STRING the wordmark reads, while `SiteChrome` is the
 * public HEADER composition D-162 removed from this surface. A binding imported from here is one or
 * the other, never both, and the scan sorts them by what the JSX does with them.
 *
 * ⚠ `SiteChrome` IS WHAT 15-09-PLAN CALLS "PublicHeader". There is no component by that name in this
 * tree; the public composition is `SiteChrome` called with `brand`/`brandHref`/`actions`. Asserting
 * the tree's spelling rather than the plan's is the point — a gate that banned a name nothing exports
 * would be green forever.
 */
const CHROME_MODULE = "@/components/patterns/site-chrome";
/** The footer this surface keeps (SHELL-02): `/terms` and `/privacy` stay reachable from signup. */
const FOOTER_MODULE = "@/components/patterns/site-footer";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The scanner
// ─────────────────────────────────────────────────────────────────────────────────────────────────

type Finding = { readonly what: string; readonly line: number };

type Scan = {
  /** Every JSX element whose tag resolves to a binding imported from `ui/card`. Must be empty. */
  readonly rawContainers: readonly Finding[];
  /** Every JSX element whose tag resolves to `PanelCard`, however the import spelled it. */
  readonly panelCards: readonly Finding[];
  /** Every `titleAs` attribute with a literal value, as `titleAs=h1`. */
  readonly titleAs: readonly Finding[];
  /** The `title` string literals passed to a pattern container, in source order. */
  readonly panelTitles: readonly string[];
  /** The `description` string literals passed to a pattern container, in source order. */
  readonly panelDescriptions: readonly string[];
  /** Every element carrying `variant="brand"`, with whether it also carries `size="touch"`. */
  readonly brandControls: readonly (Finding & { readonly touch: boolean })[];
  /** Every `<main>` opened in this module. */
  readonly mainElements: readonly Finding[];
  /** Every JSX element whose tag came from the chrome module — the header composition. */
  readonly chromeElements: readonly Finding[];
  /** Every JSX element whose tag came from the footer module. */
  readonly footerElements: readonly Finding[];
  /**
   * Every JSX element whose `className` expression reads the shared wordmark class constant, with
   * the `href` it links to and whether it carries a selector hook.
   */
  readonly wordmarks: readonly (Finding & {
    readonly href: string | null;
    readonly hasTestId: boolean;
  })[];
  /** Every live-region declaration: the politeness attribute, or a literal status/alert role. */
  readonly liveRegions: readonly Finding[];
  /** Total JSX elements seen — the guard-the-guard floor. A scan of nothing satisfies six empties. */
  readonly jsxElements: number;
};

/**
 * `(path, text)` rather than `(path)` on purpose — `leak.test.ts:208-212`'s rule and
 * `cancel-page-shell.test.tsx:94-102`'s signature. The positive control at the bottom feeds this
 * function a fixture that is never written to disk, so the code path the fixture proves is EXACTLY
 * the one the real assertions run. A `(path)` signature would have forced the fixture onto disk or
 * onto a second, unproven code path.
 *
 * Aliased imports are resolved through `propertyName ?? name`, so `import { Card as PanelCard }` is
 * still a raw container and renaming an import cannot launder one past the tag-name check. That is
 * mutation M1 in the header, and it is the reason this resolution exists rather than a tag scan.
 */
function scanModule(path: string, text: string): Scan {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );
  const lineOf = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  /** local JSX name → what module it came from. Built from import clauses, never from the tag. */
  const rawLocals = new Set<string>();
  const panelLocals = new Set<string>();
  const chromeComponentLocals = new Set<string>();
  const brandClassLocals = new Set<string>();
  const footerLocals = new Set<string>();

  const visitImports = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      const bindings = node.importClause?.namedBindings;
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          const local = element.name.text;
          // THE EXPORTED name decides what the binding IS; the LOCAL name is only how the JSX spells
          // it. Reading the local name would let a rename change the verdict.
          const exported = (element.propertyName ?? element.name).text;
          if (specifier === UI_CARD_MODULE) rawLocals.add(local);
          if (specifier === PANEL_MODULE && exported === "PanelCard") panelLocals.add(local);
          if (specifier === CHROME_MODULE) {
            // A STRING and a COMPONENT live in one module. Sorted by the exported name: the class
            // constant is data the wordmark reads, and everything else is chrome this surface drops.
            if (exported === "BRAND_CLASS") brandClassLocals.add(local);
            else chromeComponentLocals.add(local);
          }
          if (specifier === FOOTER_MODULE) footerLocals.add(local);
        }
      }
    }
    ts.forEachChild(node, visitImports);
  };
  visitImports(sf);

  const rawContainers: Finding[] = [];
  const panelCards: Finding[] = [];
  const titleAs: Finding[] = [];
  const panelTitles: string[] = [];
  const panelDescriptions: string[] = [];
  const brandControls: (Finding & { touch: boolean })[] = [];
  const mainElements: Finding[] = [];
  const chromeElements: Finding[] = [];
  const footerElements: Finding[] = [];
  const wordmarks: (Finding & { href: string | null; hasTestId: boolean })[] = [];
  const liveRegions: Finding[] = [];
  let jsxElements = 0;

  /**
   * The politeness attribute, assembled at runtime rather than written out — the disarmed-tripwire
   * idiom `cancel-page-shell.test.tsx:153-157` records, itself 13-03 Deviation 3's. A future
   * whole-tree text scan for that attribute must not be able to read THIS file's own source as a
   * violation, and a gate that cannot be written down without tripping another gate is a gate
   * somebody eventually deletes.
   */
  const POLITENESS_ATTR = ["aria", "live"].join("-");
  const TESTID_ATTR = SELECTOR_ATTRIBUTE;

  /** `x="literal"` → the literal; anything else (an expression, a ternary) → null. */
  const literalOf = (attr: ts.JsxAttribute): string | null => {
    const init = attr.initializer;
    if (init === undefined) return null;
    if (ts.isStringLiteral(init)) return init.text;
    if (ts.isJsxExpression(init) && init.expression !== undefined) {
      if (ts.isStringLiteral(init.expression)) return init.expression.text;
      if (ts.isNoSubstitutionTemplateLiteral(init.expression)) return init.expression.text;
    }
    return null;
  };

  const visitElement = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): void => {
    jsxElements += 1;

    const attrs = new Map<string, ts.JsxAttribute>();
    for (const property of node.attributes.properties) {
      if (ts.isJsxAttribute(property) && ts.isIdentifier(property.name)) {
        attrs.set(property.name.text, property);
      }
    }

    const tag = node.tagName;
    const tagText = tag.getText(sf);
    const line = lineOf(node);

    if (tagText === "main") mainElements.push({ what: "main", line });

    if (ts.isIdentifier(tag)) {
      const name = tag.text;
      if (rawLocals.has(name)) {
        rawContainers.push({ what: `<${name}> (imported from ${UI_CARD_MODULE})`, line });
      }
      if (panelLocals.has(name)) {
        panelCards.push({ what: `<${name}>`, line });
        const title = attrs.get("title");
        if (title !== undefined) {
          const value = literalOf(title);
          if (value !== null) panelTitles.push(value);
        }
        const description = attrs.get("description");
        if (description !== undefined) {
          const value = literalOf(description);
          if (value !== null) panelDescriptions.push(value);
        }
      }
      if (chromeComponentLocals.has(name)) chromeElements.push({ what: `<${name}>`, line });
      if (footerLocals.has(name)) footerElements.push({ what: `<${name}>`, line });
    }

    const titleAsAttr = attrs.get("titleAs");
    if (titleAsAttr !== undefined) {
      const value = literalOf(titleAsAttr);
      if (value !== null) titleAs.push({ what: `titleAs=${value}`, line });
    }

    const variant = attrs.get("variant");
    if (variant !== undefined && literalOf(variant) === "brand") {
      const size = attrs.get("size");
      brandControls.push({
        what: `<${tagText}>`,
        line,
        touch: size !== undefined && literalOf(size) === "touch",
      });
    }

    // THE WORDMARK, identified by the CONSTANT it reads rather than by its text or its position.
    // Reading `FitOut` out of the children would find the copy in three other places on these
    // screens; reading the class constant finds the one element whose type is shared with the app
    // chrome, which is the property D-162 actually bought.
    const className = attrs.get("className");
    if (className !== undefined && brandClassLocals.size > 0) {
      const init = className.initializer;
      let readsBrandClass = false;
      if (init !== undefined && ts.isJsxExpression(init) && init.expression !== undefined) {
        const walkExpression = (expr: ts.Node): void => {
          if (ts.isIdentifier(expr) && brandClassLocals.has(expr.text)) readsBrandClass = true;
          ts.forEachChild(expr, walkExpression);
        };
        walkExpression(init.expression);
      }
      if (readsBrandClass) {
        const href = attrs.get("href");
        wordmarks.push({
          what: `<${tagText}>`,
          line,
          href: href === undefined ? null : literalOf(href),
          hasTestId: attrs.has(TESTID_ATTR),
        });
      }
    }

    const politeness = attrs.get(POLITENESS_ATTR);
    if (politeness !== undefined) liveRegions.push({ what: POLITENESS_ATTR, line });
    const role = attrs.get("role");
    if (role !== undefined) {
      const value = literalOf(role);
      if (value === "status" || value === "alert") {
        liveRegions.push({ what: `role=${value}`, line });
      }
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) visitElement(node);
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return {
    rawContainers,
    panelCards,
    titleAs,
    panelTitles,
    panelDescriptions,
    brandControls,
    mainElements,
    chromeElements,
    footerElements,
    wordmarks,
    liveRegions,
    jsxElements,
  };
}

/**
 * THE POSITIVE CONTROL. A module that violates every clause this file claims to catch, fed to the
 * SAME scanner, and NEVER written to disk.
 *
 * `13-05`'s finding applied, and `cancel-page-shell.test.tsx:174-195`'s shape: a scan whose list of
 * things-to-catch was never shown catching one of them reports a clean tree forever, and nothing in
 * a green run distinguishes that from a correct tree. The raw container arrives UNDER AN ALIAS
 * because that is the cheapest way to launder a container past a tag-name scan, and it is exactly
 * mutation M1's shape.
 */
const VIOLATING_FIXTURE = [
  'import { Card as Box, CardContent } from "@/components/ui/card";',
  'import { PanelCard } from "@/components/patterns/panel-card";',
  'import { BRAND_CLASS, SiteChrome } from "@/components/patterns/site-chrome";',
  'import Link from "next/link";',
  "export function Bad() {",
  "  return (",
  "    <main>",
  '      <SiteChrome brand="FitOut" />',
  '      <Link href="/help" className={BRAND_CLASS} data-testid="site-brand">FitOut</Link>',
  '      <PanelCard title="Wrong heading" description="Wrong lede.">',
  "        <Box>",
  // ⚠ ASSEMBLED, NOT WRITTEN OUT. The fixture has to CARRY the politeness attribute for case (13) to
  // prove the scanner catches it, and this file must simultaneously contain zero literal spellings of
  // it — the disarmed-tripwire idiom again, on the one line where the two requirements collide.
  `          <CardContent role="status" ${["aria", "live"].join("-")}="polite">`,
  "            <p>static on arrival</p>",
  "          </CardContent>",
  "        </Box>",
  '        <button variant="brand" size="touch">One</button>',
  '        <button variant="brand">Two</button>',
  "      </PanelCard>",
  "    </main>",
  "  );",
  "}",
].join("\n");

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Read once, at module level; every `it()` below only asserts against these.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

type Read = { readonly path: string; readonly bytes: number; readonly scan: Scan };

function readAndScan(path: string): Read {
  const abs = resolve(process.cwd(), path);
  const text = readFileSync(abs, "utf8");
  return { path, bytes: statSync(abs).size, scan: scanModule(path, text) };
}

type PageUnderTest = Read & { readonly title: string; readonly description: string };

const pages: readonly PageUnderTest[] = AUTH_PAGES.map((page) => ({
  ...readAndScan(page.path),
  title: page.title,
  description: page.description,
}));
const layout = readAndScan(LAYOUT);

/** A file smaller than this is a stub or a truncated read; the smallest real one here is 6 KB. */
const MIN_BYTES = 2000;

/**
 * The per-file JSX-element floor, MEASURED against the tree this commit reads (24 August 2026) and set
 * a few elements below each real count rather than at it.
 *
 * Measured: layout 5 · login 28 · signup 35 · forgot-password 13 · reset-password 19. The four pages
 * differ by nearly a factor of three, which is the whole reason a single blanket floor was wrong: 20
 * was chosen from the two BIG pages and would have reported the two small ones — both perfectly
 * correct — as unparsed. That was watched happening on the first run of this file, and the numbers in
 * the failure are the ones written above.
 *
 * ⚠ THIS IS A VACUITY FLOOR, NOT AN INVENTORY. It exists so that a scan which silently produced
 * nothing (a syntax change, a wrong `ScriptKind`, a renamed path) cannot report every absence below
 * as satisfied. Setting it AT the measured count would make it an element census that goes red on any
 * innocuous markup addition, which is a pin people learn to bump without reading.
 */
const JSX_FLOOR: Readonly<Record<string, number>> = {
  "src/app/(auth)/layout.tsx": 5,
  "src/app/(auth)/login/page.tsx": 20,
  "src/app/(auth)/signup/page.tsx": 20,
  "src/app/(auth)/forgot-password/page.tsx": 10,
  "src/app/(auth)/reset-password/page.tsx": 15,
};

afterEach(() => {
  cleanup();
});

describe("AUTHUI-01 / AUTHUI-03 — one composition, four screens", () => {
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // GUARD THE GUARD, ASSERTED FIRST. Almost every assertion below is an ABSENCE, and an empty parse
  // satisfies all of them at once — `live-regions.test.tsx` probe (d) measured exactly that, over a
  // path the walker never opened, and reported a perfectly clean result indistinguishable from a
  // real one. This is the fourth time this repository has written this block for that reason.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(1) read all five real files rather than five empty ones", () => {
    const thin = [...pages, layout]
      .filter((file) => file.bytes < MIN_BYTES)
      .map((file) => `${file.path} — ${file.bytes} bytes`);
    expect(
      thin,
      "a surface read as (near) empty. Six assertions below are absences and an empty file passes " +
        "every one of them.",
    ).toEqual([]);
  });

  it("(2) resolved JSX in all five — an absence over an unentered tree is not an assertion", () => {
    const barren = [...pages, layout]
      .filter((file) => file.scan.jsxElements < (JSX_FLOOR[file.path] ?? Number.MAX_SAFE_INTEGER))
      .map(
        (file) =>
          `${file.path} — ${file.scan.jsxElements} JSX elements, floor ${JSX_FLOOR[file.path]}`,
      );
    // …and a file with no floor at all is a file somebody added to the set without measuring it. The
    // `MAX_SAFE_INTEGER` fallback above makes that loud instead of silently exempting it.
    expect(
      barren,
      "the scan resolved too few JSX elements on a surface that renders many. A parse that silently " +
        "produced nothing (a syntax change, a wrong ScriptKind) reports every ban below as satisfied.",
    ).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // LINK 1 — PAGE → PATTERN, by AST
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(3) every auth page composes exactly one PanelCard and zero raw containers", () => {
    expect(
      pages.flatMap((page) => page.scan.rawContainers.map((f) => `${page.path}:${f.line} — ${f.what}`)),
      "an auth page renders a container from the vendored card primitive. 15-UI-SPEC § \"One " +
        "composition, four screens\" puts all four screens on PanelCard, and plan 15-07 spent all four " +
        "ALLOWED_RAW_CARD rows to get there — a raw container here is one of those rows coming back " +
        "without the allow-list entry that used to declare it. Aliasing the import does not help: the " +
        "scan resolves the EXPORTED name.",
    ).toEqual([]);

    for (const page of pages) {
      expect(
        page.scan.panelCards.length,
        `${page.path} composes ${page.scan.panelCards.length} PanelCard elements, not 1. Zero means ` +
          "the page draws no box at all, which satisfies the raw-container ban above perfectly — the " +
          "empty-container cheat 15-08 measured on the profile page. Two means the screen nests or " +
          "splits its card, which is a second composition.",
      ).toBe(1);
    }
  });

  it("(4) every auth page passes titleAs=h1, so each auth document has one level-1 heading", () => {
    const missing = pages
      .filter((page) => page.scan.titleAs.filter((f) => f.what === "titleAs=h1").length !== 1)
      .map((page) => page.path);
    expect(
      missing,
      "an auth page does not pass titleAs=\"h1\", so its PanelCard title renders as the component's " +
        "DEFAULT h2 and that document has no level-1 heading at all. The prop defaults, so this " +
        "failure is SILENT in review and in the browser — nothing looks wrong. `panel-card.tsx`'s " +
        "titleAs docblock predicts this exact defect and 15-06 widened the union for exactly this " +
        "case: on these four routes the panel is not content under a page heading, it IS the document.",
    ).toEqual([]);
  });

  it("(5) every auth screen carries exactly one accent-filled control, and it is touch-sized", () => {
    const overloaded = pages
      .filter((page) => page.scan.brandControls.length !== 1)
      .map(
        (page) =>
          `${page.path} — ${page.scan.brandControls.length} ` +
          `(lines ${page.scan.brandControls.map((f) => f.line).join(", ")})`,
      );
    expect(
      overloaded,
      "an auth screen carries a number of accent-filled controls other than one. D-162 puts coral on " +
        "the PRIMARY action only; a second one makes one screen ask twice and there is then no " +
        "primary action, only two. Zero is the other failure and it is not the safe one — a screen " +
        "with no accent has no primary action at all.",
    ).toEqual([]);

    const untouched = pages.flatMap((page) =>
      page.scan.brandControls
        .filter((control) => !control.touch)
        .map((control) => `${page.path}:${control.line} — ${control.what}`),
    );
    expect(
      untouched,
      "an accent-filled control does not carry size=\"touch\". AUTHUI-03 gate 1 is a 44px floor on the " +
        "primary action, and it is an explicit opt-in rather than a responsive default (D-22) — so a " +
        "control that omits it is 36px and nothing else in the tree will notice.",
    ).toEqual([]);
  });

  it("(6) the eight heading and lede strings are the ones 15-UI-SPEC's copy table pins", () => {
    // T-15-31. These literals live HERE so that a copy change must move this file too and be seen in
    // the diff. Two of the four are anti-enumeration surfaces where the wording is a security
    // property rather than a tone.
    for (const page of pages) {
      expect(
        page.scan.panelTitles,
        `${page.path}'s PanelCard title is not the byte-for-byte string 15-UI-SPEC's copy table pins.`,
      ).toEqual([page.title]);
      expect(
        page.scan.panelDescriptions,
        `${page.path}'s PanelCard description is not the byte-for-byte string the copy table pins.`,
      ).toEqual([page.description]);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // THE SHELL — one landmark, one wordmark, no header, a footer
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(7) the (auth) layout opens exactly one document landmark", () => {
    expect(
      layout.scan.mainElements.length,
      "the (auth) layout does not open exactly ONE document landmark. D-88.1: one per document. This " +
        "element is in the LAYOUT rather than in each page because four pages plus one error boundary " +
        "is five places to forget it, and the boundary is where forgetting it is least visible — so a " +
        "second one here is the duplication that arrangement exists to make impossible.",
    ).toBe(1);

    const pageLandmarks = pages.flatMap((page) =>
      page.scan.mainElements.map((f) => `${page.path}:${f.line}`),
    );
    expect(
      pageLandmarks,
      "an auth PAGE opens its own document landmark, which would nest a second one inside the " +
        "layout's. The layout owns it for all four.",
    ).toEqual([]);
  });

  it("(8) the layout renders no header composition and keeps the footer", () => {
    expect(
      layout.scan.chromeElements.map((f) => `${LAYOUT}:${f.line} — ${f.what}`),
      "the (auth) layout renders the public header composition. D-162 chose ONE composition for all " +
        "four auth documents — a wordmark above one card on a quiet ground — and keeping the header " +
        "would put a header wordmark and a card-column wordmark on one screen, which is byte-for-byte " +
        "the duplication SHELL-01 removed in plan 11-10. Exactly one of the two survives.",
    ).toEqual([]);

    expect(
      layout.scan.footerElements.length,
      "the (auth) layout no longer renders the footer. SHELL-02: /terms and /privacy must stay " +
        "reachable from the page where somebody is being asked to create an account, and this is the " +
        "only element on the surface that reaches them.",
    ).toBeGreaterThanOrEqual(1);
  });

  it("(9) the wordmark reads the shared class constant, links home, and carries no selector hook", () => {
    expect(
      layout.scan.wordmarks.length,
      "the (auth) layout does not render exactly one element reading the shared wordmark class " +
        "constant. Reading the constant rather than re-typing the type utilities is what makes \"one " +
        "identity, two surfaces\" a fact about the tree instead of an instruction to whoever edits one " +
        "of them next.",
    ).toBe(1);

    const wordmark = layout.scan.wordmarks[0];
    expect(
      wordmark.href,
      "the auth wordmark does not link to the site root. It is the ONLY route out of /forgot-password " +
        "and /reset-password for a signed-in visitor, who loses the header's mode switch, bell and " +
        "profile link for the duration of the reset — the tradeoff the layout's header writes down.",
    ).toBe("/");
    expect(
      wordmark.hasTestId,
      "the auth wordmark carries a selector hook. `site-brand` is declared in the selector contract as " +
        "the CHROME's id and 15-UI-SPEC pins SELECTOR_IDS at +0 for this phase; copying it here would " +
        "put one hook on two unrelated elements and make every container query that scopes through it " +
        "resolve on whichever the page happens to render (T-15-19).",
    ).toBe(false);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // LINKS 2 AND 3 — PATTERN → ATTRIBUTE (DOM) → CONTRACT (UNION)
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(10) the pattern the four pages compose is what actually renders the hook", () => {
    // The link a source scan cannot make. Cases (3) and (4) prove the pages compose `PanelCard`;
    // only a render proves `PanelCard` emits the attribute a selector or an e2e assertion looks for.
    // Without this, the whole file would stay green the day the pattern lost its hook.
    render(
      <PanelCard title="Fixture" titleAs="h1" description="Fixture lede.">
        <p>content</p>
      </PanelCard>,
    );
    const rendered = screen.getByTestId("panel-card");
    expect(rendered.getAttribute(SELECTOR_ATTRIBUTE)).toBe("panel-card");
    // …and the widened `titleAs` really produces a level-1 heading, which case (4) asserts only as a
    // prop. `panel-card.tsx` hard-coded h2 until plan 15-06.
    expect(screen.getByRole("heading", { level: 1, name: "Fixture" })).toBeTruthy();
  });

  it("(11) the rendered id is a member of the closed selector contract", () => {
    // The third link. `panel-card` is not a string this file invented, it is a row in SELECTOR_IDS.
    // If the pattern's hook is ever renamed, this goes red beside case (10).
    expect(
      (SELECTOR_IDS as readonly string[]).includes("panel-card"),
      '"panel-card" is not in SELECTOR_IDS. The contract is closed; a hook outside it is a hook ' +
        "nothing declares, and a container query that scopes through it resolves on nothing.",
    ).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // THE TWO DEMOTIONS — what an inventory structurally cannot assert
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(12) neither demoted notice carries a live-region role", () => {
    // `tests/design/live-regions.test.tsx` audits the regions that EXIST. A region that was removed
    // leaves no row behind, so nothing there would notice it coming back — which is what these two
    // assert. Both were removed by plan 15-07 for one rule: a live region announces a CHANGE, and a
    // freshly navigated page is not a change, it is a page.
    const login = pages.find((page) => page.path.endsWith("login/page.tsx")) as PageUnderTest;
    expect(login).toBeDefined();
    expect(
      login.scan.liveRegions
        .filter((f) => f.what === "role=status")
        .map((f) => `${login.path}:${f.line} — ${f.what}`),
      "the login page declares a result region again. Plan 15-07 REMOVED it: the post-reset notice is " +
        "present on the FIRST paint of /login?reset=1, so it announces either nothing or a duplicate " +
        "of what a screen reader was about to read anyway.",
    ).toEqual([]);

    const reset = pages.find((page) =>
      page.path.endsWith("reset-password/page.tsx"),
    ) as PageUnderTest;
    expect(reset).toBeDefined();
    const resetRegions = reset.scan.liveRegions;
    expect(
      resetRegions.map((f) => f.what),
      "the reset page's live regions are not the ONE declared alert. Two would mean the missing-token " +
        "notice got its region back — it is the page for a malformed URL, not a change; zero would " +
        "mean the submit refusal lost its own, which is the opposite defect and the one that costs a " +
        "person the reason their reset failed.",
    ).toEqual(["role=alert"]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // THE POSITIVE CONTROL
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  it("(13) every scanner this file claims is shown catching its violation, on one fixture", () => {
    const bad = scanModule("fixture.tsx", VIOLATING_FIXTURE);

    // The raw container, INCLUDING the aliased one — mutation M1's laundering, caught.
    expect(bad.rawContainers.map((f) => f.what.split(" ")[0]).sort()).toEqual([
      "<Box>",
      "<CardContent>",
    ]);
    // …and the legitimate pattern container in the same file is still recognised, so the scanner is
    // not simply reporting everything it sees.
    expect(bad.panelCards.map((f) => f.what)).toEqual(["<PanelCard>"]);
    // The heading level, absent — the DEFAULT-to-h2 defect of mutation M2.
    expect(bad.titleAs).toEqual([]);
    // The copy, drifted from the pinned table — mutation M4.
    expect(bad.panelTitles).toEqual(["Wrong heading"]);
    expect(bad.panelDescriptions).toEqual(["Wrong lede."]);
    // Two accent controls, one of them not touch-sized — mutation M3 plus the 44px floor.
    expect(bad.brandControls).toHaveLength(2);
    expect(bad.brandControls.filter((control) => !control.touch)).toHaveLength(1);
    // The landmark, and the header composition D-162 removed.
    expect(bad.mainElements).toHaveLength(1);
    expect(bad.chromeElements.map((f) => f.what)).toEqual(["<SiteChrome>"]);
    expect(bad.footerElements).toEqual([]);
    // The wordmark, pointing at the wrong route AND carrying the chrome's hook — T-15-19.
    expect(bad.wordmarks).toHaveLength(1);
    expect(bad.wordmarks[0].href).toBe("/help");
    expect(bad.wordmarks[0].hasTestId).toBe(true);
    // Both live-region spellings — the role and the politeness attribute — on static content.
    expect(bad.liveRegions.map((f) => f.what).sort()).toEqual([
      ["aria", "live"].join("-"),
      "role=status",
    ]);
    // …and the guard-the-guard floor is itself non-vacuous: this fixture parses to real elements.
    expect(bad.jsxElements).toBeGreaterThan(5);
  });
});
