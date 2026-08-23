// HFLOW-05 / 14-CONTEXT D-156 — THE EARNINGS SURFACE'S STRING-LITERAL FREEZE, AS A TEST.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE SILENT FAILURE THIS CATCHES
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// HFLOW-05 is a TOKEN PASS. The whole requirement is "change the container, the header and the type
// roles on `/host/earnings`, and change NOTHING ELSE" — and the reason is not tidiness. Those payout
// figures have never moved real money: PayMongo's `/v2` money movement is sales-gated, so no host has
// ever seen a live number on this page. Restructuring a surface whose numbers are unproven is work
// that gets redone the moment the rails turn on, which is why D-156 freezes it.
//
// "We only changed tokens" is a claim, and at 274 lines of route plus six components it is a claim
// nobody can verify by reading a diff — the class attributes are on the same lines as the copy, and
// a reviewer scanning for moved classes is scanning past moved sentences. Worse, the drift that
// matters here is not a rewrite. It is one word softened, one heading retitled, one status label made
// friendlier: a DISCLOSURE change about money, wearing a polish costume. Nothing else in this repo
// would report it.
//
// So the claim is made mechanical. This gate walks the TypeScript AST of every file on the earnings
// surface, collects every string a host could read or a branch could turn on, and compares that set
// against an inventory pinned in this file. A token pass leaves the inventory untouched. Anything
// else names itself.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IS FROZEN, WHAT IS DELIBERATELY NOT, AND WHY THE LINE IS DRAWN STRUCTURALLY
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that pinned EVERY string literal would pin the work itself: the shell string, the heading's
// classes and the type-role swap are all string literals, and they are precisely what HFLOW-05 is
// permitted to move. So two positions are excluded, and both exclusions are STRUCTURAL — decided by
// where the string sits in the syntax tree, never by what it looks like:
//
//   1. STYLING POSITIONS. The value of a `className` JSX attribute, the value of an object property
//      whose name ends in `className`, and any string in a style position inside a `cn()`-family
//      call. These are the tokens. Excluding them is the difference between a gate that permits the
//      token pass and a gate that forbids it.
//
//   2. MODULE SPECIFIERS on import/export declarations and on a dynamic import. Adopting a shared
//      constant or a shared pattern necessarily adds one, and a module path is not something a host
//      reads. The permitted change set names "the heading element, its import" in one breath.
//
// BECAUSE THE LINE IS POSITIONAL, MOVING A STRING ACROSS IT IS CAUGHT IN BOTH DIRECTIONS. A class
// name that migrates out of a `className` and into a rendered sentence is an ADDED literal. A
// sentence that is quietly demoted into a styling position disappears from the inventory and is a
// REMOVED one. A textual exclusion — "skip anything that looks like a class" — would have waved both
// through, and would additionally have gone blind the day a status value and a utility shared a
// spelling. That is why the exclusion set is three syntactic shapes and not a regex.
//
// Everything else is pinned: JSX text, attribute values that are not classes, the discriminants the
// component branches on (`"paid"`, `"refunded"`, `"failed"`, `"enabled"`), the date format string,
// the raw SQL, and every sentence in the two payout banners.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ THE LANDMINE THIS GATE ALSO EXISTS TO STOP SOMEBODY STEPPING ON
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/design/type-scale.test.ts`'s `DISPLAY_INVENTORY` pins
// `"src/components/host/payout-summary.tsx": 2` — the two summary figures carry two declared
// display-role headings, and they render on `/host/earnings`.
//
// `14-UI-SPEC.md` § Typography states, of the Display role: *"Nowhere. No host surface in this phase
// carries a display-scale heading."* THAT SENTENCE IS MEASURABLY FALSE. It was measured false during
// research, before any Phase-14 plan ran, and it is recorded here rather than quietly worked around.
//
// The hazard is a reader who takes the spec's sentence as an instruction and "fixes"
// `payout-summary.tsx` to match it. That single edit turns `type-scale.test.ts` red AND violates
// HFLOW-05, because D-156 freezes that file — one edit, two breakages, and the second one is the
// requirement rather than a test. Nothing changes. `type-scale.test.ts` is not edited. The two
// display headings stay.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE DOES NOT IMPORT `stripComments`, UNLIKE ITS THREE SIBLINGS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The suite's default is to strip comments before a source scan, because a text scan otherwise
// reports every file that explains itself (`skeleton-measurements.test.ts:13-34` measured nine such
// false positives on a clean tree). This scan has no such problem and no such need: it reads the
// PARSED tree and asks for string-literal, template and JSX-text nodes by kind. A comment is trivia
// attached to a token, never a node of those kinds, so the scanner cannot see one at all. Importing
// the stripper would run a no-op and imply a protection that is not here.
//
// The consequence is worth stating plainly rather than leaving implied: THIS GATE DOES NOT FREEZE
// COMMENTS. A header can be rewritten freely. That is the correct division — a comment is what a
// developer reads, and what a host reads is what D-156 froze — but it does mean the file's prose is
// governed by review, as it was before.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • JSX TEXT IS COMPARED WITH ITS WHITESPACE COLLAPSED. Source indentation is inside the text node,
//     so a raw comparison would go red on a re-indent that changed nothing a host sees. The price is
//     real: re-wrapping a paragraph across different lines, with the same words in the same order, is
//     invisible here. Quoted strings are NOT normalised — their whitespace was typed on purpose.
//   • THIS FILE READS SOURCE. It says nothing about what renders. A sentence that is present in the
//     tree but placed behind a condition that is now never true is unchanged to this gate and gone
//     from the page.
//   • COPY ASSEMBLED AT RUNTIME IS INVISIBLE — a sentence built from a template with a substitution
//     keeps its fixed spans here while its meaning changes with the substituted value. The same hole
//     `price-surface.test.ts` records for its own phrase scan, and the same safe direction: it can
//     miss a violation, it cannot invent one.
//   • A LITERAL THAT MOVES BETWEEN TWO SCANNED FILES reports as one removal and one addition rather
//     than as a move. That is deliberate — on this surface, WHICH file says a thing is part of what
//     is frozen — but the failure message will not say "moved", so read both halves.
//   • THE SETS ARE DEDUPED. Two identical sentences becoming one, or one becoming two, is invisible.
//     Nothing on this surface renders the same string twice for two different reasons, and a count
//     would go red on an ordinary extraction into a shared branch.
//   • THE SCANNED SET IS DISCOVERED FROM DISK AND THEN CHECKED AGAINST A DECLARATION, so a new file
//     dropped into the earnings directory fails until somebody declares it. That closes the obvious
//     way around a per-file freeze — move the copy somewhere unscanned — only for the two directories
//     named below. Copy relocated to a third directory is out of reach of this gate.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import ts from "typescript";

/** The tree root every path below is resolved against. */
const ROOT = process.cwd();

/** The route segment HFLOW-05 is written about — scanned whole, recursively. */
const EARNINGS_DIR = "src/app/(host)/host/earnings";

/** The directory holding the payout components, and the prefix that selects them. */
const PAYOUT_DIR = "src/components/host";
const PAYOUT_PREFIX = "payout-";

/**
 * The call expressions whose string arguments are styling rather than copy.
 *
 * `cn` is this repo's own merge helper; the other three are the names it and its ancestors are
 * commonly aliased to. Listing the aliases costs nothing and means a future rename does not silently
 * reclassify every class on the surface as frozen copy.
 */
const STYLE_CALLEES: ReadonlySet<string> = new Set(["cn", "clsx", "cx", "twMerge"]);

/** Windows path separators, normalised, so the declared inventory reads the same on either OS. */
function toPosix(path: string): string {
  return path.split("\\").join("/");
}

/** Every `.ts`/`.tsx` file under a directory, recursively, as repo-relative POSIX paths. */
function sourceFilesUnder(dir: string): string[] {
  const out: string[] = [];
  const walk = (abs: string): void => {
    for (const entry of readdirSync(abs)) {
      const child = join(abs, entry);
      if (statSync(child).isDirectory()) walk(child);
      else if (/\.tsx?$/.test(entry)) out.push(toPosix(relative(ROOT, child)));
    }
  };
  walk(resolve(ROOT, dir));
  return out;
}

/** The surface, discovered from disk rather than listed — see the last blind spot above. */
function scannedFiles(): string[] {
  const payouts = readdirSync(resolve(ROOT, PAYOUT_DIR))
    .filter((name) => name.startsWith(PAYOUT_PREFIX) && /\.tsx?$/.test(name))
    .map((name) => `${PAYOUT_DIR}/${name}`);
  return [...sourceFilesUnder(EARNINGS_DIR), ...payouts].sort();
}

/**
 * Every node that sits in a STYLING position, or is a module path.
 *
 * The descent is deliberately narrow. From a styling ROOT it recurses only through the shapes that
 * pass a class through unchanged — parentheses, a JSX expression container, both arms of a ternary,
 * the operands of `&&` / `||` / `??`, array elements, the spans of a template, and a nested
 * `cn()`-family call. It stops at everything else, which is what keeps a COMPARISON operand out:
 * in `state === "refunded" && "tabular-nums"` the left side is a binary expression whose operator is
 * not in the pass-through set, so `"refunded"` is never reached and stays frozen — while the class
 * beside it is excluded. A "strings inside a `cn()` call" rule would have lost that distinction and
 * unfrozen a discriminant this page branches money display on.
 */
function stylingAndModuleNodes(sf: ts.SourceFile): ReadonlySet<ts.Node> {
  const excluded = new Set<ts.Node>();

  const markStyle = (node: ts.Node | undefined): void => {
    if (node === undefined) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      excluded.add(node);
      return;
    }
    if (ts.isParenthesizedExpression(node)) return markStyle(node.expression);
    if (ts.isJsxExpression(node)) return markStyle(node.expression);
    if (ts.isConditionalExpression(node)) {
      markStyle(node.whenTrue);
      markStyle(node.whenFalse);
      return;
    }
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      if (
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.QuestionQuestionToken
      ) {
        markStyle(node.left);
        markStyle(node.right);
      }
      return;
    }
    if (ts.isArrayLiteralExpression(node)) {
      node.elements.forEach(markStyle);
      return;
    }
    if (ts.isTemplateExpression(node)) {
      excluded.add(node.head);
      node.templateSpans.forEach((span) => excluded.add(span.literal));
      return;
    }
    if (isStyleCall(node)) {
      node.arguments.forEach(markStyle);
      return;
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.name.text === "className") {
      markStyle(node.initializer);
    }
    if (
      ts.isPropertyAssignment(node) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      node.name.text.toLowerCase().endsWith("classname")
    ) {
      markStyle(node.initializer);
    }
    if (isStyleCall(node)) {
      node.arguments.forEach(markStyle);
    }
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      excluded.add(node.moduleSpecifier);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0
    ) {
      excluded.add(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return excluded;
}

function isStyleCall(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    STYLE_CALLEES.has(node.expression.text)
  );
}

/**
 * Every frozen string in one module, sorted and deduped.
 *
 * PARAMETERISED BY TEXT rather than reading the path itself, for `leak.test.ts:208-212`'s rule: the
 * guard-the-guard fixtures below run this exact function, so the code proved by the fixtures is the
 * code the shipped assertion runs.
 */
function frozenStringsIn(rel: string, text: string): string[] {
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const excluded = stylingAndModuleNodes(sf);
  const found: string[] = [];

  const collect = (node: ts.Node): void => {
    if (!excluded.has(node)) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        found.push(node.text);
      } else if (
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      ) {
        found.push(node.text);
      } else if (ts.isJsxText(node)) {
        const collapsed = node.text.replace(/\s+/g, " ").trim();
        if (collapsed !== "") found.push(collapsed);
      }
    }
    ts.forEachChild(node, collect);
  };

  collect(sf);
  return [...new Set(found)].sort();
}

/**
 * THE PINNED INVENTORY — generated from the shipped tree before a single earnings file was touched,
 * which is why this gate was green on its first run.
 *
 * Sorted and deduped per file, so re-ordering the JSX is not a failure and a genuine addition or
 * deletion is. A row here is not a chore to bump: an entry moving means the earnings surface now says
 * something different, and D-156 says it must not. If a later phase legitimately reopens this surface
 * (the rails turning on is the case everybody expects), the inventory changes in THAT plan's commit,
 * with that plan's argument attached — not as a green-the-build edit.
 */
const FROZEN: Readonly<Record<string, readonly string[]>> = {
  "src/app/(host)/host/earnings/loading.tsx": ["Earnings", "Loading your earnings"],
  "src/app/(host)/host/earnings/page.tsx": [
    "\n      AND kind = 'host_cancel_fee'\n      AND recovered_cents < -net_cents\n  ",
    '\n    SELECT COALESCE(SUM(-net_cents - recovered_cents), 0)::int AS "outstandingDebitCents"\n    FROM host_payout_ledger\n    WHERE host_id = ',
    "/",
    "/login",
    "Booking",
    "Commission",
    "Earnings",
    "Expected",
    "FitOut keeps a 10% commission. You always receive the listed price minus 10% — we cover the payment processing costs. Payout dates are shown in each space&apos;s local time.",
    "MMM d",
    "No earnings yet",
    "Payout",
    "Space",
    "Status",
    "When",
    "When someone books your space, each payout shows up here — held until after the session, then paid to you automatically.",
    "Your space",
    "col",
    "enabled",
    "h2",
    "paid",
    "payout",
    "refunded",
    "−",
  ],
  "src/components/host/payout-banner.tsx": [
    "Bookings are paused",
    "Finish payout setup",
    "Finish setting up payouts",
    "Payouts enabled",
    "Review payout setup",
    "Set up payouts",
    "Set up payouts to accept bookings",
    "You can create and publish listings now. To accept bookings and get paid, set up payouts.",
    "You&apos;re all set to get paid — your published listings can accept bookings.",
    "You've started payout setup. Finish it so guests can book your space and you get paid.",
    "Your payout account needs attention — guests can&apos;t book until it&apos;s resolved.",
    "destructive",
    "enabled",
    "incomplete",
    "not_started",
    "paused",
    "true",
    "use client",
  ],
  "src/components/host/payout-ledger-status.ts": [
    "Expected",
    "Held",
    "Held until after the session",
    "Needs attention",
    "Paid",
    "Processing",
    "Refunded",
    "This booking was refunded — no payout.",
    "attention",
    "failed",
    "held",
    "neutral",
    "paid",
    "positive",
    "processing",
    "refunded",
  ],
  "src/components/host/payout-row.tsx": [
    "Booking",
    "FitOut commission (10%)",
    "Your payout",
    "refunded",
    "−",
  ],
  "src/components/host/payout-state-badge.tsx": [
    "destructive",
    "failed",
    "outline",
    "secondary",
    "true",
  ],
  "src/components/host/payout-status.ts": [
    "declined",
    "enabled",
    "incomplete",
    "not_started",
    "paused",
  ],
  "src/components/host/payout-summary.tsx": ["Paid out", "Upcoming payouts"],
};

const DISCOVERED = scannedFiles();
const ACTUAL: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  DISCOVERED.map((rel) => [rel, frozenStringsIn(rel, readFileSync(resolve(ROOT, rel), "utf8"))]),
);

describe("HFLOW-05 / D-156 — the earnings surface is frozen except for its tokens", () => {
  it("scans exactly the files it declares, in both directions", () => {
    const declared = Object.keys(FROZEN).sort();
    const undeclared = DISCOVERED.filter((rel) => !declared.includes(rel));
    const missing = declared.filter((rel) => !DISCOVERED.includes(rel));
    expect(
      [
        ...undeclared.map((rel) => `UNDECLARED on disk: ${rel}`),
        ...missing.map((rel) => `DECLARED but absent: ${rel}`),
      ],
      "the earnings surface gained or lost a file. A new file here is the obvious way around a " +
        "per-file copy freeze — put the new sentence somewhere the gate does not look — so it fails " +
        "until it is declared below WITH its strings. A file that vanished is either a deletion " +
        "nobody meant or a move, and both need the inventory updated deliberately (D-156).",
    ).toEqual([]);
  });

  it("changes not one string a host reads or a branch turns on", () => {
    const drift = Object.entries(FROZEN).flatMap(([rel, pinned]) => {
      const actual = ACTUAL[rel] ?? [];
      return [
        ...actual
          .filter((s) => !pinned.includes(s))
          .map((s) => `${rel}: ADDED ${JSON.stringify(s)}`),
        ...pinned
          .filter((s) => !actual.includes(s))
          .map((s) => `${rel}: REMOVED ${JSON.stringify(s)}`),
      ];
    });
    expect(
      drift,
      "the earnings surface's copy or semantics moved. HFLOW-05 is a TOKEN PASS (14-CONTEXT D-156): " +
        "the container, the page header and the type roles may change and NOTHING else may. These " +
        "figures have never moved real money — PayMongo /v2 payout rails are sales-gated — so a " +
        "rewrite here is work that gets redone, and a softened word about money is a disclosure " +
        "change wearing a polish costume. If the change is genuinely intended, it belongs in a plan " +
        "that says so, and the inventory in this file moves in that plan's commit.",
    ).toEqual([]);
  });

  it("found real strings in every declared file, so a broken walk cannot pass quietly", () => {
    const empty = Object.entries(ACTUAL)
      .filter(([, strings]) => strings.length === 0)
      .map(([rel]) => rel);
    expect(
      empty,
      "these files parsed to zero frozen strings. A zero-violation assertion reads identically " +
        "whether the tree is clean or the walker never arrived, so every file on this surface must " +
        "be shown yielding something (leak.test.ts:208-212's rule).",
    ).toEqual([]);
    expect(
      Object.values(ACTUAL).reduce((n, strings) => n + strings.length, 0),
      "the whole surface parsed to implausibly few strings — suspect the scan, not the tree.",
    ).toBeGreaterThan(60);
  });
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
// Guard-the-guard, over fixtures never written to disk — so what the fixtures prove is the same
// code path the three assertions above run.
// ───────────────────────────────────────────────────────────────────────────────────────────────

describe("guard-the-guard — the scan catches copy and lets the token pass through", () => {
  const BEFORE = [
    'import { cn } from "@/lib/utils";',
    "export function S({ paid }: { paid: boolean }) {",
    "  return (",
    '    <div className="mx-auto w-full px-4 py-10">',
    '      <h1 className="text-xl font-semibold">Earnings</h1>',
    '      <p className={cn("text-sm", paid && "tabular-nums")}>Held until after the session</p>',
    "    </div>",
    "  );",
    "}",
  ].join("\n");

  it("reports a one-character change to a rendered sentence", () => {
    const after = BEFORE.replace("Held until", "held until");
    expect(frozenStringsIn("fixture.tsx", BEFORE)).toContain("Held until after the session");
    expect(frozenStringsIn("fixture.tsx", after)).not.toContain("Held until after the session");
    expect(frozenStringsIn("fixture.tsx", after)).toContain("held until after the session");
  });

  it("reports a heading retitled, which is the disclosure shape this gate is for", () => {
    const after = BEFORE.replace(">Earnings<", ">Your earnings<");
    expect(frozenStringsIn("fixture.tsx", after)).not.toContain("Earnings");
  });

  it("says nothing about a container, a heading class or a type role changing", () => {
    const after = BEFORE.replace('"mx-auto w-full px-4 py-10"', "{HOST_LIST_SHELL}")
      .replace('"text-xl font-semibold"', '"text-heading"')
      .replace('cn("text-sm", paid', 'cn("text-label", paid');
    expect(frozenStringsIn("fixture.tsx", after)).toEqual(frozenStringsIn("fixture.tsx", BEFORE));
  });

  it("says nothing about an import being added for the constant and the pattern", () => {
    const after = BEFORE.replace(
      'import { cn } from "@/lib/utils";',
      'import { cn } from "@/lib/utils";\nimport { HOST_LIST_SHELL } from "@/lib/design/measurements";',
    );
    expect(frozenStringsIn("fixture.tsx", after)).toEqual(frozenStringsIn("fixture.tsx", BEFORE));
  });

  it("keeps a comparison operand frozen even when it sits inside a style call", () => {
    const source =
      'const a = cn("tabular-nums", state === "refunded" && "line-through");';
    const strings = frozenStringsIn("fixture.ts", source);
    expect(strings).toContain("refunded");
    expect(strings).not.toContain("tabular-nums");
    expect(strings).not.toContain("line-through");
  });

  it("catches a class-shaped string that migrates into a position a host can read", () => {
    const source = "export const A = <p>tabular-nums</p>;";
    expect(frozenStringsIn("fixture.tsx", source)).toContain("tabular-nums");
  });

  it("ignores a comment, including one that spells a frozen sentence", () => {
    const withComment = BEFORE.replace(
      "  return (",
      '  // was: <h1>Payouts</h1>, and the copy read "Nothing here yet"\n  return (',
    );
    expect(frozenStringsIn("fixture.tsx", withComment)).toEqual(
      frozenStringsIn("fixture.tsx", BEFORE),
    );
  });

  it("collapses JSX indentation but not the whitespace inside a quoted string", () => {
    const wrapped = "export const A = <p>\n   Held until\n   after the session\n</p>;";
    expect(frozenStringsIn("fixture.tsx", wrapped)).toEqual(["Held until after the session"]);
    expect(frozenStringsIn("fixture.ts", 'const a = "two  spaces";')).toEqual(["two  spaces"]);
  });
});
