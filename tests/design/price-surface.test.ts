// BFLOW-04 / D-42 / C1 (D-73) / C7 — THE PRICE SURFACE'S COPY AND ARITHMETIC CONTRACT, AS A TEST.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE IS NET-NEW WORK AND NOT AN EXTENSION OF SOMETHING
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `src/components/booking/price-breakdown.tsx` has carried a GREP TRIPWIRE in its header since Phase
// 7. Two whole-source greps guard its copy: one for the tax-sounding bundle C1/D-73 forbids, one for
// the three booker-facing reassurances rule C7 forbids. The header says so. The plans said so.
//
// MEASURED WHEN THIS FILE WAS WRITTEN: neither grep existed as a committed test. They existed only as
// `<verify>` bash lines inside Phase-7 and Phase-11 PLAN files — documents nobody re-runs, in a
// directory the build does not read. For roughly a year the file's most load-bearing constraint was
// enforced by a sentence describing an enforcement that was not there.
//
// That matters more now, not less: D-38 made this component render on TWO surfaces, so a copy
// regression here reaches the listing rail as well as checkout. This file is the first commit at
// which the tripwire is a thing that fails.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE TRIPWIRE'S OWN RULE APPLIES TO THE TEST THAT ENFORCES IT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A grep is only a real guard if it cannot be tripped by the very text forbidding the string. The
// component's header states the rule for itself; this file inherits it, because a test that spells a
// banned phrase in order to search for it would be a permanent false positive the moment anyone
// pointed the scan at the test directory — and, worse, the phrase would then live in the repository
// as a copy-pasteable string.
//
// So every forbidden phrase below is stored in TWO PIECES and joined at runtime. That is the
// `payout-sweep` idiom this repo already uses ("spells the name in two pieces so the tripwire does
// not trip on its own documentation"). The pieces are chosen to split mid-word, so no fragment reads
// as the phrase in a search of this file either.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY TWO OF THESE SCANS KEEP COMMENTS AND ONE STRIPS THEM
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The default in this suite is to strip comments FIRST — `sheet-absent.test.ts` records the reason
// ("a scan that counted prose would demand they stop explaining themselves"). Assertion 4 follows it.
//
// Assertions 1 and 2 deliberately do NOT, and the difference is the whole point of a tripwire. The
// hazard being guarded is not "the phrase renders"; it is "the phrase EXISTS in this file", because
// the moment it does, every future grep for it matches its own prohibition and the guard is dead
// forever. A comment is exactly where that arrives — "just in a comment, to explain what we must not
// say". The component's header is explicit about it: *"If you are tempted to write one out 'just in a
// comment', don't: it disarms the check for good."* A comment-stripped scan would permit precisely
// the edit that disarms it.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY ASSERTION 3 IS AN AST WALK AND A REGEX WOULD BE ACTIVELY WRONG
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `skeleton-measurements.test.ts:13-34` established the rule with a measurement: a text scan of a
// clean tree reported nine violations, every one of them prose. `price-breakdown.tsx` is the extreme
// case of that shape. Its header explains AT LENGTH why it must not compute — it literally contains
// the sentence "A component that computed `total = space + fee` itself could disagree with what
// PayMongo charges" — so a regex for `spacePriceCents +` reports the file's own contract as a breach
// of itself. A gate with a 100% false-positive rate on a clean tree is a gate someone deletes, and
// the honest documentation is not optional: you cannot explain a ban without naming the thing banned.
//
// So assertion 3 parses. `ts.createSourceFile` + `forEachChild`, arithmetic BINARY EXPRESSIONS only,
// operands resolved through a taint set so `const t = spacePriceCents; const u = t * 2;` is caught
// too. Comments are invisible to it by construction rather than by filtering.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — every probe run, every one reverted, recorded verbatim (18 August 2026)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`).
// Command for all four:
// `npx vitest run --config vitest.design.config.ts tests/design/price-surface.test.ts`
//
// (a) THE C7 TRIPWIRE, TRIPPED THE WAY IT WILL ACTUALLY BE TRIPPED — one of the three forbidden
//     reassurances added to `price-breakdown.tsx` AS A COMMENT (`// PROBE: <phrase>` above the C1
//     paragraph), not as rendered copy, because that is the edit the component's header warns about
//     and the edit a comment-stripping scan would wave through. 1 failed / 15 passed:
//
//       FAIL  tests/design/price-surface.test.ts > (2) C7 — no booker-facing reassurance the service
//             fee makes false > spells none of the three forbidden phrases contiguously
//       AssertionError: a price surface spells a C7-forbidden phrase:
//       ["src/components/booking/price-breakdown.tsx:21 — the same claim in the register a booker is
//       most likely to believe. The fee is disclosed rather than hidden, but the sentence reads as
//       'there is no such fee', which is not true."]. Rule C7 (07-UI-SPEC.md) forbids these on every
//       booker surface once D-74 ships — two of the three are false statements about money and the
//       third promises a finality the fee contradicts. The phrase must not appear in this file AT
//       ALL, comments included, because a grep that matches its own prohibition is not a guard.:
//       expected [ Array(1) ] to deeply equal []
//
//     The failure names the FILE, the LINE and the REASON the phrase is forbidden — and does it
//     WITHOUT PRINTING THE PHRASE, which is the same discipline the file under test keeps and the
//     reason `why` is a mandatory field rather than a comment. Reverted → 16 passed.
//
// (b) THE ARITHMETIC BAN. `const t = spacePriceCents + serviceFeeCents;` added to the component body
//     immediately above `runLabel`. 1 failed / 15 passed:
//
//       FAIL  tests/design/price-surface.test.ts > (3) zero arithmetic — the component computes no
//             money figure > performs no arithmetic on any money prop or anything derived from one
//       AssertionError: src/components/booking/price-breakdown.tsx performs arithmetic on a money
//       prop: ["src/components/booking/price-breakdown.tsx:187 — `spacePriceCents + serviceFeeCents`
//       (operator +, touches spacePriceCents, serviceFeeCents)"]. Every figure this component renders
//       is computed on the server and passed in (D-130 / GATE-05). A figure computed here can
//       disagree with what PayMongo charges, and the number the booker agreed to MUST be the number
//       they are charged. This became sharper in 12-04: the component is now a CLIENT component, so
//       an arithmetic edit here runs in the browser.: expected [ Array(1) ] to deeply equal []
//
//     Node text, line and the operator, so the failure is actionable without opening the file.
//     Reverted → 16 passed.
//
// (c) VACUITY — the probe worth reading. `ROOT` re-pointed at `nowhere-at-all`, a directory that does
//     not exist. 6 failed / 10 passed:
//
//       FAIL  … guard-the-guard … > opened every declared price-surface file
//       AssertionError: the scanner opened 0 of 3 declared price-surface files (missing:
//       src/components/booking/price-breakdown.tsx,
//       src/components/availability/availability-calendar.tsx,
//       src/app/listings/[id]/book/page.tsx). Every absence asserted below is green against a scan
//       that read nothing, and an absence assertion cannot notice it was handed an empty list.:
//       expected +0 to be 3
//
//       FAIL  … > scans the set by NAME, not merely the right number of files
//       FAIL  … > read the component under test, and read enough of it to mean something
//       FAIL  … > the arithmetic scanner actually parsed the component
//       FAIL  … (1) … > DOES still render the label D-73 requires
//       FAIL  … (3) … > has not simply lost the props it must not compute with
//
//     AND ALL THREE REAL ABSENCE ASSERTIONS PASSED — both tripwires and the hedge ban reported a
//     perfectly clean result over files that were never opened, indistinguishable from a genuine
//     clean run, and it would have stayed that way forever. That is the entire argument for asserting
//     the guards FIRST. Note WHICH extra two fired: the two POSITIVE controls — "the fee label is
//     still rendered" and "the money props are still there" — which is the second reason every ban
//     here is written beside an assertion that the thing it guards still exists. Reverted → 16
//     passed.
//
// (d) THE SELF-PROBE — does THIS file spell any forbidden phrase? `PHRASE_SCAN_FILES` temporarily
//     extended with `tests/design/price-surface.test.ts`, pointing both tripwires at their own
//     source. 2 failed / 14 passed, and the two failures are ONLY the guard-the-guard membership
//     assertions reacting to the widened set:
//
//       AssertionError: the scanner opened 4 of 3 declared price-surface files (missing: none).
//       …: expected 4 to be 3
//       AssertionError: expected [ …(4) ] to deeply equal [ …(3) ]
//       +   "tests/design/price-surface.test.ts",
//
//     BOTH TRIPWIRES PASSED over this file's own source: the two-piece encoding holds, and nothing
//     here spells a banned phrase contiguously. Probe removed — a permanent self-scan would make this
//     file unable to document its own failure modes in the header above, and the membership
//     assertion is what makes re-running the probe a one-line edit rather than a rewrite.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • THIS FILE READS SOURCE. It says NOTHING about what renders. The load-bearing BFLOW-04 claim —
//     that the rail's total and the checkout's total are computed-style IDENTICAL, same weight, same
//     size, same tabular figures — is `e2e/price-one-fact.spec.ts` (plan 12-05), in a real browser.
//     jsdom cannot see that class of defect at all: it has no layout and no cascade, so two elements
//     with different classes report the same (empty) computed style.
//   • Nor does it prove the two surfaces show the same NUMBER. That is `e2e/price-parity.spec.ts`
//     for checkout (DB vs DOM) and 12-05 for the rail.
//   • The phrase scan is CONTIGUITY-based over raw text plus a whitespace-collapsed copy. Copy
//     assembled at runtime from fragments — a template with a substitution, a word from a map keyed
//     by a prop — is invisible to it. That is the safe direction for a ban (it can miss a violation,
//     never invent one), but it is a real hole, and it is the same hole `sheet-absent.test.ts`
//     records for its own class scan.
//   • Assertion 4's needle is CASE-SENSITIVE and anchored at a word boundary, because the label it
//     bans is a specific abbreviation and the same three letters appear inside ordinary words. A
//     lower-case spelling of the label would pass.
//   • Assertion 3 bans BINARY arithmetic on the money props. A unary negation, a `Math.*` call, or a
//     `.reduce()` that sums an array of them would not be caught. None exists today; the realistic
//     regression is `total = space + fee`, which is what is guarded.
//   • The declared file set is a DECLARATION. A fourth price surface added in a later plan is not
//     scanned until someone adds it here — which is why the set is asserted by NAME, so the omission
//     is at least visible in this file rather than silent.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import ts from "typescript";

import { stripComments } from "./helpers/strip-comments";

/**
 * The tree root every path below is resolved against.
 *
 * A PARAMETERISABLE root rather than a hardcoded `resolve(process.cwd(), "src")` for one reason: the
 * vacuity probe (c) in the header is a one-line edit, and the guard-the-guard assertions below run
 * the same code path the real assertions run — `leak.test.ts:208-212`'s rule.
 */
const ROOT = process.cwd();

/** The component the two grep tripwires guard. Everything in assertions 1-3 is about this file. */
const PRICE_BREAKDOWN = "src/components/booking/price-breakdown.tsx";
/** The rail summaries — where the banned abbreviation lived until D-40 removed it. */
const AVAILABILITY_CALENDAR = "src/components/availability/availability-calendar.tsx";
/** The checkout route that composes the breakdown. */
const BOOK_PAGE = "src/app/listings/[id]/book/page.tsx";

/**
 * The files assertions 1 and 2 scan for forbidden copy.
 *
 * Just the component today: the tripwire is a property of the file that OWNS the fee line's wording.
 * Probe (d) in the header temporarily added this test file to prove the two-piece encoding holds.
 */
const PHRASE_SCAN_FILES = [PRICE_BREAKDOWN] as const;

/** Every declared price surface — the set assertion 4 scans, asserted by name as well as by count. */
const PRICE_SURFACE_FILES = [PRICE_BREAKDOWN, AVAILABILITY_CALENDAR, BOOK_PAGE] as const;

/**
 * A file shorter than this was not really read. `sheet-absent.test.ts`'s `MIN_COMPONENT_FILES` floor,
 * expressed per-file because this gate opens a DECLARED set rather than walking a tree: the failure
 * it has to notice is "the path moved and `existsSync` said no", not "the glob narrowed".
 */
const MIN_FILE_BYTES = 1000;

/**
 * WINDOWS PATH NORMALISATION — `focus-recipe.test.ts:89`'s idiom, load-bearing rather than cosmetic.
 * `path.relative` emits backslashes on this box while every path written in this file is
 * forward-slash; without this the reported labels stop matching the declared names and the
 * membership assertion below fails for a reason that has nothing to do with the tree.
 */
function posix(abs: string): string {
  return relative(ROOT, abs).split("\\").join("/");
}

type Opened = {
  /** The declared, forward-slash relative path. */
  readonly rel: string;
  /** Raw source, comments INCLUDED — assertions 1 and 2 need them. See the header. */
  readonly raw: string;
  /** The same source with comments removed — assertion 4's input. */
  readonly stripped: string;
};

/** Open one declared file, or `null` when it is not there. Never throws: a broken scan must surface
 *  as ONE named guard-the-guard failure, not as a stack trace that buries which gate went quiet. */
function openFile(rel: string): Opened | null {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) return null;
  const raw = readFileSync(abs, "utf8");
  return { rel: posix(abs), raw, stripped: stripComments(raw) };
}

/** Scanned ONCE at module level; the `it()` blocks below only assert against these. */
const opened = new Map<string, Opened>();
for (const rel of new Set([...PHRASE_SCAN_FILES, ...PRICE_SURFACE_FILES])) {
  const file = openFile(rel);
  if (file !== null) opened.set(rel, file);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE FORBIDDEN PHRASES, EACH IN TWO PIECES AND EACH WITH THE REASON IT IS FORBIDDEN
// ─────────────────────────────────────────────────────────────────────────────────────────────────

type Forbidden = {
  /** The phrase, split mid-word so neither fragment reads as it. Joined at runtime, never written. */
  readonly pieces: readonly [string, string];
  /** WHY it is banned. Travels into the failure message — a row without a reason is not a row. */
  readonly why: string;
};

/**
 * C1 / D-73 — THE TAX-SOUNDING BUNDLE.
 *
 * The booker-facing fee is platform revenue, not a government levy. Presenting it as one is
 * inaccurate to customers and is the precise pattern junk-fee rules (US FTC, EU/UK) and PH DTI
 * price-display requirements target. The product's FIRST framing was that bundled label; it was
 * changed deliberately after pushback, which is exactly the kind of decision a later copy pass
 * reverses by accident. Both separator spellings, because the hazard is the bundling and not the
 * conjunction.
 */
const TAX_BUNDLE: readonly Forbidden[] = [
  {
    pieces: ["Tax", "es and fees"],
    why:
      "bundles the platform's service fee under a tax-sounding label. It is revenue, not a levy — " +
      "D-73 assigns this line the exact label `Service fee` and forbids re-bundling it.",
  },
  {
    pieces: ["Tax", "es & fees"],
    why:
      "the ampersand spelling of the same bundle. Banned beside the other one because a copy pass " +
      "that shortens a label is exactly how a reverted decision comes back.",
  },
];

/**
 * C7 (`.planning/milestones/v1.0-ui-specs/07-UI-SPEC.md`, rule C7) — THE THREE REASSURANCES.
 *
 * Once D-74 shipped a real, non-refundable booker-facing service fee, no booker surface may claim
 * that nothing was added to the price or that the figure shown is conclusive. The strings are not
 * merely off-brand: two of the three are FALSE statements about money, and the third promises a
 * finality the fee itself contradicts. One of them was live in this very component until Phase 7
 * replaced it.
 */
const C7_REASSURANCES: readonly Forbidden[] = [
  {
    pieces: ["no ad", "ded fees"],
    why:
      "a reassurance that nothing was added to the price. FALSE since D-74: a non-refundable 5% " +
      "service fee is added, and is disclosed on the line below the run line.",
  },
  {
    pieces: ["no hid", "den fees"],
    why:
      "the same claim in the register a booker is most likely to believe. The fee is disclosed " +
      "rather than hidden, but the sentence reads as 'there is no such fee', which is not true.",
  },
  {
    pieces: ["fin", "al price"],
    why:
      "promises the figure is conclusive. A hold can be re-priced (D-108 surcharge, a partial " +
      "open-capacity grant), so the claim is one the system cannot keep on every path.",
  },
];

/**
 * Find every contiguous occurrence of a forbidden phrase, as `file:line — why`.
 *
 * TWO PASSES, and the second is not decoration. Raw text catches the phrase written normally. A
 * WHITESPACE-COLLAPSED copy catches it split across a line break — which is not exotic in JSX prose,
 * where a formatter wraps a sentence wherever the column limit falls, and the RENDERED text is
 * contiguous even though the source is not. The collapsed pass cannot report a line, so it reports
 * the file; that is the honest thing to say about a match found in a normalised copy.
 *
 * Case-insensitive: the copywriting contract bans the phrase, not one capitalisation of it.
 */
function findPhrases(file: Opened, phrases: readonly Forbidden[]): string[] {
  const hits: string[] = [];
  const lines = file.raw.split("\n");
  const collapsed = file.raw.replace(/\s+/g, " ").toLowerCase();

  for (const phrase of phrases) {
    const needle = phrase.pieces.join("").toLowerCase();

    let foundOnALine = false;
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(needle)) {
        foundOnALine = true;
        hits.push(`${file.rel}:${index + 1} — ${phrase.why}`);
      }
    });

    if (!foundOnALine && collapsed.includes(needle)) {
      hits.push(`${file.rel} (wrapped across lines) — ${phrase.why}`);
    }
  }

  return hits;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE ARITHMETIC SCANNER
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The identifiers the ban seeds from.
 *
 * The first three are the component's THREE FROZEN VALUES — the props whose independence is the
 * whole contract (`spacePriceCents` is the host payout basis, `serviceFeeCents` is platform revenue,
 * `quotedTotalCents` is what is charged), and deriving any one from the other two here is the
 * regression. The rest are the other server-computed money props on the same component; they are in
 * the seed because a ban that stops at three is a ban with three exemptions nobody decided on.
 */
const MONEY_IDENTIFIERS = [
  "quotedTotalCents",
  "spacePriceCents",
  "serviceFeeCents",
  "runPriceCents",
  "extraHeadCents",
  "extraSurchargeCents",
  "perHeadPriceCents",
  "hourlyRateCents",
  "dayRateCents",
] as const;

/**
 * THE RAIL'S SEEDS (plan 12-05, T-12-05-RAILCOMPUTE) — the same ban, on the OTHER surface that now
 * renders the breakdown.
 *
 * 12-05 made the listing rail render the real `PriceBreakdown` from `AllInTable`, which means
 * `availability-calendar.tsx` is a price surface in the arithmetic sense for the first time: it picks a
 * key out of a server-built table and passes three finished figures down. The regression this seeds
 * against is not hypothetical — it is the exact edit the module's own header argues against, twice, in
 * prose (`n × allIn(unit) ≠ allIn(n × unit)`): a `.total` multiplied by a count, or a `.space` added to a
 * `.fee` to save a lookup, either of which drifts from the frozen quote by up to n−1 centavos while every
 * other gate stays green.
 *
 * `allIn` is the table itself, so the taint set carries it into `const parts = allIn.hourly[hours]` and
 * from there to anything built out of `parts`. The nine names above ride along because the rail now
 * receives the host's raw rates for the run LABEL — formatting a rate is legal, multiplying it is the
 * thing this scan exists to refuse, and the distinction is invisible to a grep.
 */
const RAIL_MONEY_IDENTIFIERS = [...MONEY_IDENTIFIERS, "allIn"] as const;

/** The operators that make a new number out of old ones. Compound assignment included. */
const ARITHMETIC_OPERATORS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.PlusToken,
  ts.SyntaxKind.MinusToken,
  ts.SyntaxKind.AsteriskToken,
  ts.SyntaxKind.SlashToken,
  ts.SyntaxKind.PercentToken,
  ts.SyntaxKind.AsteriskAsteriskToken,
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
]);

type ArithmeticScan = {
  /** `file:line — expression (operator, touches …)` for every violation. */
  readonly violations: string[];
  /** Every money identifier the walker actually SAW. The positive control for the parse. */
  readonly seen: string[];
  /** How many binary expressions of any kind were visited — the second half of the parse control. */
  readonly binaryExpressions: number;
};

/**
 * Walk a module's AST and report arithmetic on any money identifier, or on anything derived from one.
 *
 * The taint set is what makes this more than a two-name grep: `const t = spacePriceCents;` makes `t`
 * money, so `t * 2` is caught. Computed to a FIXPOINT rather than in source order, because a
 * declaration can legally follow its use inside a function body.
 */
function scanArithmetic(
  rel: string,
  text: string,
  /**
   * The identifiers the taint set starts from. Parameterised by plan 12-05 so a SECOND price surface
   * can be scanned with the names that are money ON THAT SURFACE — the rail holds a table called
   * `allIn`, not the component's three frozen props — without widening the component's own seed set and
   * quietly changing what the shipped assertion means.
   */
  seeds: readonly string[] = MONEY_IDENTIFIERS,
): ArithmeticScan {
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const tainted = new Set<string>(seeds);
  const seen = new Set<string>();

  /** Every identifier name appearing anywhere under `node`. */
  const identifiersIn = (node: ts.Node): string[] => {
    const names: string[] = [];
    const walk = (n: ts.Node): void => {
      if (ts.isIdentifier(n)) names.push(n.text);
      ts.forEachChild(n, walk);
    };
    walk(node);
    return names;
  };

  // Fixpoint over variable declarations: a name initialised from tainted money is itself money.
  const declarations: Array<{ name: string; init: ts.Node }> = [];
  const collectDeclarations = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined
    ) {
      declarations.push({ name: node.name.text, init: node.initializer });
    }
    ts.forEachChild(node, collectDeclarations);
  };
  collectDeclarations(sf);

  let grew = true;
  while (grew) {
    grew = false;
    for (const declaration of declarations) {
      if (tainted.has(declaration.name)) continue;
      if (identifiersIn(declaration.init).some((name) => tainted.has(name))) {
        tainted.add(declaration.name);
        grew = true;
      }
    }
  }

  const violations: string[] = [];
  let binaryExpressions = 0;

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && seeds.includes(node.text)) {
      seen.add(node.text);
    }

    if (ts.isBinaryExpression(node)) {
      binaryExpressions += 1;
      if (ARITHMETIC_OPERATORS.has(node.operatorToken.kind)) {
        const touched = [
          ...new Set(
            [...identifiersIn(node.left), ...identifiersIn(node.right)].filter((name) =>
              tainted.has(name),
            ),
          ),
        ];
        if (touched.length > 0) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          const operator = node.operatorToken.getText(sf);
          const expression = node.getText(sf).replace(/\s+/g, " ").slice(0, 120);
          violations.push(
            `${rel}:${line} — \`${expression}\` (operator ${operator}, touches ${touched.join(", ")})`,
          );
        }
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sf);

  return { violations, seen: [...seen].sort(), binaryExpressions };
}

const EMPTY_SCAN: ArithmeticScan = { violations: [], seen: [], binaryExpressions: 0 };

const breakdown = opened.get(PRICE_BREAKDOWN);
const arithmetic =
  breakdown === undefined ? EMPTY_SCAN : scanArithmetic(breakdown.rel, breakdown.raw);

/**
 * The rail's scan (plan 12-05). A SECOND walk over a second file, not a widening of the first — the
 * two surfaces hold different names and a shared seed set would have made each assertion weaker in the
 * other's direction.
 */
const calendar = opened.get(AVAILABILITY_CALENDAR);
const railArithmetic =
  calendar === undefined
    ? EMPTY_SCAN
    : scanArithmetic(calendar.rel, calendar.raw, RAIL_MONEY_IDENTIFIERS);

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE `Est.` INVENTORY — an EMPTY declared-exception map, and the emptiness IS the assertion
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * EVERY LEGITIMATE PLACE THE HEDGE MAY APPEAR, WITH THE REASON IT IS ONE. It is EMPTY, and that is
 * the assertion — the `EXCLUDED_PAIRS` / `Z_SHEET_INVENTORY` shape, where a row without a reason is
 * not a row.
 *
 * WHY IT IS EMPTY, IN ONE SENTENCE (D-40): the rail's figure is exact BY CONSTRUCTION — the RSC
 * applied `computeServiceFee` to the same space price checkout freezes, at the same rate, and
 * `space + fee === total` is asserted per key in `tests/booking/all-in-table.test.ts` — so the hedge
 * understated a guarantee the system actually makes and taught a booker to expect the number to
 * move, which is D-75's failure mode restated as copy.
 *
 * If a genuinely approximate figure ever appears on a booker surface (a multi-day range, a "from"
 * price over varying rates), the honest change is to add a row here WITH ITS REASON in that plan's
 * own commit — not to delete this inventory so the label becomes usable again.
 */
const HEDGE_INVENTORY: Record<string, string> = {};

/**
 * The banned abbreviation, anchored at a word boundary and case-sensitive.
 *
 * Both qualifications are deliberate. Without the boundary, every word ending in those three letters
 * plus a full stop matches. Without case-sensitivity, ordinary prose about an estimate matches — and
 * assertion 4 scans COMMENT-STRIPPED source precisely so the files may keep explaining why the label
 * was removed. What is banned is the LABEL.
 */
const HEDGE_LABEL = /\bEst\./g;

function findHedge(file: Opened): string[] {
  const hits: string[] = [];
  file.stripped.split("\n").forEach((line, index) => {
    for (const match of line.matchAll(HEDGE_LABEL)) {
      hits.push(`${file.rel}:${index + 1} — ${match[0]}`);
    }
  });
  return hits;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// GUARD-THE-GUARD FIRST, on purpose: every absence below is worthless if the scan opened nothing.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("guard-the-guard — the scanners read the files they are asserting about", () => {
  it("opened every declared price-surface file", () => {
    const missing = PRICE_SURFACE_FILES.filter((rel) => !opened.has(rel));
    expect(
      opened.size,
      `the scanner opened ${opened.size} of ${PRICE_SURFACE_FILES.length} declared price-surface ` +
        `files (missing: ${missing.join(", ") || "none"}). Every absence asserted below is green ` +
        `against a scan that read nothing, and an absence assertion cannot notice it was handed an ` +
        `empty list.`,
    ).toBe(PRICE_SURFACE_FILES.length);
  });

  it("scans the set by NAME, not merely the right number of files", () => {
    // A count alone survives one file being renamed out of the set and another wandering in. The
    // membership is what the NOT COVERED footer's "declaration" caveat is about.
    expect([...opened.keys()].sort()).toEqual([...PRICE_SURFACE_FILES].sort());
    for (const rel of PHRASE_SCAN_FILES) {
      expect(opened.has(rel), `${rel} is in the phrase scan but was never opened`).toBe(true);
    }
  });

  it("read the component under test, and read enough of it to mean something", () => {
    for (const rel of PRICE_SURFACE_FILES) {
      const file = opened.get(rel);
      expect(file, `${rel} was not opened`).toBeDefined();
      expect(
        file!.raw.length,
        `${rel} is ${file!.raw.length} bytes — too short to be the real file. A truncated or ` +
          `stubbed read makes every absence below vacuously true.`,
      ).toBeGreaterThan(MIN_FILE_BYTES);
      expect(file!.stripped.length, `${rel} stripped to nothing`).toBeGreaterThan(0);
    }
  });

  it("the arithmetic scanner actually parsed the component", () => {
    // The realistic failure is not a throw — `createSourceFile` happily parses garbage into an empty
    // tree. It is a scan that visited nothing and reported no violations, which is byte-identical to
    // a clean result. Two positive controls: the money props were SEEN, and binary expressions exist.
    expect(
      arithmetic.seen,
      `the AST walk found none of the money props in ${PRICE_BREAKDOWN}. Either the parse produced ` +
        `an empty tree or the props were renamed — in both cases assertion 3 below is asserting ` +
        `about nothing.`,
    ).toContain("quotedTotalCents");
    expect(arithmetic.seen).toContain("spacePriceCents");
    expect(arithmetic.seen).toContain("serviceFeeCents");
    expect(
      arithmetic.binaryExpressions,
      "the walker visited zero binary expressions. The component contains `??` fallbacks and `> 0` " +
        "render gates, so zero means the tree was never traversed.",
    ).toBeGreaterThan(0);
  });

  it("the arithmetic scanner actually parsed the RAIL too (12-05)", () => {
    // The same two positive controls, for the second surface. `availability-calendar.tsx` is the file
    // 12-05 turned into a price surface, and an empty-violations assertion over it is worth exactly as
    // little as one over the component if the walk saw nothing.
    expect(
      railArithmetic.seen,
      `the AST walk found no money identifier in ${AVAILABILITY_CALENDAR}. Either the parse produced ` +
        `an empty tree or the rail stopped receiving the all-in table — in both cases the rail's ` +
        `zero-arithmetic assertion below is asserting about nothing.`,
    ).toContain("allIn");
    expect(
      railArithmetic.binaryExpressions,
      "the rail walker visited zero binary expressions. The file computes an hour count and two " +
        "venue-tz month offsets, so zero means the tree was never traversed.",
    ).toBeGreaterThan(0);
  });

  it("pointed at a path that does not exist, opens nothing — which is why the floor exists", () => {
    // The vacuity probe as a permanent assertion rather than a one-off. `openFile` returns null for
    // a missing path instead of throwing, deliberately: the realistic version of this failure is a
    // moved file or a narrowed root, which never throws at all.
    expect(openFile("src/components/booking/price-breakdown-nope.tsx")).toBeNull();
    // …and a scan over nothing reports a perfectly clean result, indistinguishable from a real one.
    const empty = scanArithmetic("nothing.tsx", "");
    expect(empty.violations).toEqual([]);
    expect(empty.seen).toEqual([]);
    expect(empty.binaryExpressions).toBe(0);
  });

  it("the phrase scanner finds a phrase when there IS one, in both spellings it looks for", () => {
    // BOTH DIRECTIONS, through the same code path the real assertions use. Without this, every
    // "found nothing" below is equally consistent with a scanner that can never find anything.
    // The fixture is BUILT from the two-piece encoding, so this file still never spells a phrase.
    const needle = C7_REASSURANCES[0].pieces.join("");
    const inline: Opened = {
      rel: "fixture-inline.tsx",
      raw: `<p>We charge ${needle} here.</p>`,
      stripped: "",
    };
    expect(findPhrases(inline, C7_REASSURANCES)).toHaveLength(1);
    expect(findPhrases(inline, C7_REASSURANCES)[0]).toContain("fixture-inline.tsx:1");

    // The wrapped case — contiguous once rendered, not contiguous in source.
    const wrapped: Opened = {
      rel: "fixture-wrapped.tsx",
      raw: `<p>\n  ${needle.split(" ")[0]}\n  ${needle.split(" ").slice(1).join(" ")}\n</p>`,
      stripped: "",
    };
    const wrappedHits = findPhrases(wrapped, C7_REASSURANCES);
    expect(wrappedHits).toHaveLength(1);
    expect(wrappedHits[0]).toContain("wrapped across lines");

    // …and a clean fixture is clean, so the scanner is not simply always positive.
    expect(
      findPhrases({ rel: "fixture-clean.tsx", raw: "<p>Includes our service fee.</p>", stripped: "" }, [
        ...TAX_BUNDLE,
        ...C7_REASSURANCES,
      ]),
    ).toEqual([]);
  });

  it("the arithmetic scanner distinguishes a computation from a fallback", () => {
    // Same both-directions rule for assertion 3. `??` and `>` are BinaryExpressions too, and a
    // scanner that flagged them would go red on the shipped file for no reason.
    const bad = scanArithmetic(
      "fixture-bad.tsx",
      "export function F(){ const t = spacePriceCents + serviceFeeCents; return t; }",
    );
    expect(bad.violations).toHaveLength(1);
    expect(bad.violations[0]).toContain("operator +");

    const derived = scanArithmetic(
      "fixture-derived.tsx",
      "export function F(){ const a = spacePriceCents; const b = a * 2; return b; }",
    );
    expect(derived.violations, "a value derived from a money prop is still money").toHaveLength(1);
    expect(derived.violations[0]).toContain("operator *");

    const fine = scanArithmetic(
      "fixture-fine.tsx",
      "export function F(){ const v = runPriceCents ?? spacePriceCents; return serviceFeeCents > 0 ? v : v; }",
    );
    expect(
      fine.violations,
      "`??` and `>` are binary expressions but they compute no money figure — flagging them would " +
        "make this gate red on the shipped file, which is how a gate gets deleted.",
    ).toEqual([]);

    const unrelated = scanArithmetic(
      "fixture-unrelated.tsx",
      "export function F(){ return hours + 1; }",
    );
    expect(unrelated.violations, "arithmetic on a non-money value is not this gate's business").toEqual(
      [],
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// (1) C1 / D-73 — the fee is never re-bundled under a tax-sounding label
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("(1) C1 / D-73 — the service fee is never presented as a levy", () => {
  it("spells the tax-sounding bundle nowhere in the price surface, comments included", () => {
    const hits = PHRASE_SCAN_FILES.flatMap((rel) => {
      const file = opened.get(rel);
      return file === undefined ? [] : findPhrases(file, TAX_BUNDLE);
    });
    expect(
      hits,
      `a price surface bundles the service fee under a tax-sounding label: ${JSON.stringify(hits)}. ` +
        `The fee is platform revenue, not a government levy — D-73 assigns it the exact label ` +
        `\`Service fee\`. The phrase must not appear in the file AT ALL, comments included, because ` +
        `a grep that matches its own prohibition stops being a guard. Encode it in two pieces if you ` +
        `must refer to it.`,
    ).toEqual([]);
  });

  it("DOES still render the label D-73 requires — the absence alone is not the requirement", () => {
    // Asserted beside the ban because a file with no fee line at all satisfies the ban perfectly,
    // and "we deleted the disclosure" is the opposite of the recorded decision. `sheet-absent`'s
    // both-sides shape.
    const file = opened.get(PRICE_BREAKDOWN);
    expect(file).toBeDefined();
    expect(
      file!.stripped.includes("Service fee"),
      `${PRICE_BREAKDOWN} no longer renders the \`Service fee\` label. The D-74 fee is real, ` +
        `non-refundable and must be DISCLOSED (C1/D-73); removing the line is not a way to satisfy ` +
        `the ban above.`,
    ).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// (2) C7 — no reassurance that the fee does not exist, or that the figure is conclusive
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("(2) C7 — no booker-facing reassurance the service fee makes false", () => {
  it("spells none of the three forbidden phrases contiguously", () => {
    const hits = PHRASE_SCAN_FILES.flatMap((rel) => {
      const file = opened.get(rel);
      return file === undefined ? [] : findPhrases(file, C7_REASSURANCES);
    });
    expect(
      hits,
      `a price surface spells a C7-forbidden phrase: ${JSON.stringify(hits)}. Rule C7 ` +
        `(07-UI-SPEC.md) forbids these on every booker surface once D-74 ships — two of the three ` +
        `are false statements about money and the third promises a finality the fee contradicts. ` +
        `The phrase must not appear in this file AT ALL, comments included, because a grep that ` +
        `matches its own prohibition is not a guard.`,
    ).toEqual([]);
  });

  it("declares all three phrases, so the ban cannot quietly shrink", () => {
    // The count is the assertion. 07-UI-SPEC rule C7 enumerates exactly three; a row deleted to make
    // a copy change land would leave this file green and the contract two thirds enforced.
    expect(
      C7_REASSURANCES,
      "rule C7 (07-UI-SPEC.md:413) enumerates THREE forbidden phrases. If one was removed here to " +
        "let a copy change through, revise the rule in the spec and record the decision — do not " +
        "shrink the inventory.",
    ).toHaveLength(3);
    for (const phrase of C7_REASSURANCES) {
      expect(phrase.why.length, "a row without a reason is not a row").toBeGreaterThan(40);
      expect(phrase.pieces[0].length, "each piece must be a real fragment").toBeGreaterThan(1);
      expect(phrase.pieces[1].length).toBeGreaterThan(1);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// (3) ZERO ARITHMETIC — the component renders finished figures and computes none
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("(3) zero arithmetic — the component computes no money figure", () => {
  it("performs no arithmetic on any money prop or anything derived from one", () => {
    expect(
      arithmetic.violations,
      `${PRICE_BREAKDOWN} performs arithmetic on a money prop: ` +
        `${JSON.stringify(arithmetic.violations)}. Every figure this component renders is computed ` +
        `on the server and passed in (D-130 / GATE-05). A figure computed here can disagree with ` +
        `what PayMongo charges, and the number the booker agreed to MUST be the number they are ` +
        `charged. This became sharper in 12-04: the component is now a CLIENT component, so an ` +
        `arithmetic edit here runs in the browser.`,
    ).toEqual([]);
  });

  it("has not simply lost the props it must not compute with", () => {
    // The ban above is satisfied by a component that renders no money at all. The three frozen
    // values are asserted PRESENT beside it, for the same reason (1) asserts the label still renders.
    for (const prop of ["quotedTotalCents", "spacePriceCents", "serviceFeeCents"]) {
      expect(arithmetic.seen, `${prop} is gone from ${PRICE_BREAKDOWN}`).toContain(prop);
    }
  });

  it("nor does the RAIL compute one, now that it renders the same breakdown (12-05)", () => {
    expect(
      railArithmetic.violations,
      `${AVAILABILITY_CALENDAR} performs arithmetic on a money value: ` +
        `${JSON.stringify(railArithmetic.violations)}. The rail is a client module, so an arithmetic ` +
        `edit here runs in the BROWSER, on the last number a booker reads before checkout (D-75). The ` +
        `table is keyed by the selection precisely so no multiply is ever needed: ` +
        `n * allIn(unit) != allIn(n * unit), because computeServiceFee rounds ONCE over the whole ` +
        `space price, so a product computed here drifts from the frozen quote by up to n-1 centavos ` +
        `(T-12-05-RAILCOMPUTE). A missing key means NO breakdown, never a computed one.`,
    ).toEqual([]);
  });

  it("and the rail has not simply stopped rendering money (12-05)", () => {
    // Same both-sides rule as the component's positive control above. A rail that dropped the
    // breakdown satisfies the ban perfectly and deletes BFLOW-04 in the process, so the two things
    // that make it a price surface at all are asserted present: the table, and the component it feeds.
    expect(railArithmetic.seen, `the all-in table is gone from ${AVAILABILITY_CALENDAR}`).toContain(
      "allIn",
    );
    const file = opened.get(AVAILABILITY_CALENDAR);
    expect(file).toBeDefined();
    expect(
      file!.stripped.includes('surface="rail"'),
      `${AVAILABILITY_CALENDAR} no longer renders <PriceBreakdown surface="rail">. BFLOW-04's claim ` +
        `is that the rail and checkout are ONE component; a rail that went back to its own money ` +
        `markup would satisfy every ban in this file and fail the requirement.`,
    ).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// (4) D-40 — the hedge is gone from every price surface, and the exception list is empty
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("(4) D-40 — no price surface hedges a figure that is exact by construction", () => {
  it("declares an EMPTY exception inventory, and the emptiness is the assertion", () => {
    expect(
      Object.keys(HEDGE_INVENTORY),
      "there are zero declared exceptions: every figure the booker path renders is exact by " +
        "construction (D-40). If a genuinely approximate figure appears — a multi-day range, a " +
        "'from' price over varying rates — add a row here WITH ITS REASON in that plan's own " +
        "commit; do not delete this inventory to make the label usable again.",
    ).toEqual([]);
  });

  it("renders the abbreviation on no declared price surface", () => {
    const hits = PRICE_SURFACE_FILES.flatMap((rel) => {
      const file = opened.get(rel);
      return file === undefined ? [] : findHedge(file);
    }).filter((hit) => !(hit.split(" — ")[0] in HEDGE_INVENTORY));

    expect(
      hits,
      `a price surface still hedges its figure: ${JSON.stringify(hits)}. D-40 removed the label ` +
        `because the rail's number is EXACT — the RSC applies the same fee to the same space price ` +
        `checkout freezes — so hedging it understated a guarantee the system actually makes and ` +
        `taught the booker to expect the number to move (12-UI-SPEC AC#9).`,
    ).toEqual([]);
  });

  it("finds the abbreviation when it IS there — the scan is not always empty", () => {
    // Both directions again, through the same function the assertion above calls.
    const fixture: Opened = {
      rel: "fixture-hedge.tsx",
      raw: "",
      stripped: '<span className="text-muted-foreground">Est. </span>',
    };
    expect(findHedge(fixture)).toHaveLength(1);
    expect(findHedge(fixture)[0]).toContain("fixture-hedge.tsx:1");
    // …and it does not fire on the same three letters inside an ordinary word.
    expect(
      findHedge({ rel: "fixture-word.tsx", raw: "", stripped: "const guest = 1; // Request." }),
      "the word boundary and the case-sensitivity are what keep this from matching ordinary prose",
    ).toEqual([]);
  });
});
