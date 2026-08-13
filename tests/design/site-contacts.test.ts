// SHELL-02 / D-26 — THE SUPPORT SLOT, GUARDED IN BOTH OF ITS STATES.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// D-26, VERBATIM, INCLUDING THE CLAUSE OF THE APPROVED SPEC THAT IT AMENDS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// From `11-CONTEXT.md` § `SUPPORT_EMAIL` — the UI-SPEC's declared blocking input:
//
//   **D-26 (DELIBERATE DEPARTURE from approved `11-UI-SPEC.md` — record it, do not silently
//   reconcile):** FitOut owns no domain and has no support inbox (`metadataBase` falls back to
//   `localhost:3000`; the only real address anywhere in `src/` is Resend's `onboarding@resend.dev`
//   sender). The user's call was **"just placeholder for now."**
//     - `SUPPORT_EMAIL` stays `null` and **the footer renders no support entry at all** — no greyed
//       link, no `mailto:`, no "coming soon". This is the spec's own *nothing false ships* path, just
//       held open longer than it assumed. **Inventing an address remains banned**
//       (`11-UI-SPEC.md` § Anti-Patterns).
//     - **`site-contacts.test.ts` INVERTS rather than softens.** While `SUPPORT_EMAIL` is null it
//       asserts that **zero** support affordances render anywhere; it flips back to demanding a
//       non-null string containing `@` plus exactly one `mailto:` the moment the constant is set. The
//       gate is never absent — the failure mode this phase exists to prevent is a gate quietly
//       reduced to nothing.
//     - The unfilled slot is carried as a named **`human_needed`** item on phase completion, the same
//       convention the roadmap already uses for the sales-gated PayMongo threads.
//     - **Amends `11-UI-SPEC.md` AC#8 and § The unfilled slot.** The "phase cannot complete with the
//       placeholder in place" clause no longer holds; the `human_needed` item replaces it.
//
// So AC#8's sentence *"A phase-completion check that accepts a null here has accepted a rubber
// stamp"* is superseded on its own terms: what would be a rubber stamp is a gate that went quiet.
// This file is the thing that does not go quiet. The failure mode it exists to prevent, in the
// phase's own words: **a gate quietly reduced to nothing is worse than no gate.**
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE SHAPE: TWO BRANCHES, NEITHER EMPTY, SELECTED BY READING THE CONSTANT AT TEST TIME
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The branch is chosen from `SUPPORT_EMAIL` itself, imported from `src/lib/site.ts`. One `describe`
// runs today and the other runs the day someone sets an address — and BOTH are written now, because a
// branch nobody has ever executed is not a gate. The unreachable one is exercised against synthetic
// fixtures through the SAME functions the real assertions call (`leak.test.ts:208-212`'s rule), in
// both directions, so "it will work when the constant flips" is a demonstration and not a promise.
//
// ── WHY THE FOOTER'S OWN `mailto:` IS NOT A VIOLATION, AND HOW THAT IS PROVED RATHER THAN ASSUMED ──
//
// `site-footer.tsx` CONTAINS the string `mailto:` and the label `Support` today, inside the branch
// that never renders. A gate that simply banned those substrings would be red against the exact
// implementation D-26 asks for — this phase's named failure mode arriving from the opposite
// direction, and the eleventh instance of the grep-versus-source collision Phase 11 has now recorded.
//
// So the null branch does not assert "zero occurrences". It asserts **zero UNGUARDED occurrences**,
// where "guarded" is decided over the AST: the literal must sit lexically inside the true-branch of a
// conditional whose test names `SUPPORT_EMAIL`, and that conditional's else-branch must be the `null`
// keyword. Beside it sits the assertion that makes the guarded branch harmless in the first place —
// **the footer contains no address-shaped literal at all**, guarded or not. A fabricated address
// cannot hide in the dead branch, and the live branch can only ever emit the constant.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — FOUR RUNS, ALL REAL (14 August 2026)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// GREEN, in BOTH states, because a two-state gate has two greens and only recording one of them
// would hide exactly the branch that has never run:
//
//   • `SUPPORT_EMAIL === null` (today)              → **23 passed | 3 skipped (26)**
//   • `SUPPORT_EMAIL` set + the link rendered       → **20 passed | 6 skipped (26)**
//
// The skip counts are the branch selector working: `describe.runIf` stands the other state's block
// down, and the numbers moving in opposite directions is the visible proof that BOTH blocks exist.
//
// Command for all six runs:
// `npx vitest run --config vitest.design.config.ts tests/design/site-contacts.test.ts`
//
//   (a) NULL BRANCH — A FABRICATED ADDRESS ARRIVES. `<li><a href="mailto:support@fitout.ph">Support
//       </a></li>` added to `site-footer.tsx` OUTSIDE the guard, exactly as the plan prescribes.
//       **4 failed | 19 passed | 3 skipped:**
//
//         FAIL … > D-26 (SUPPORT_EMAIL === null) — zero support affordances render anywhere
//              > every `mailto:` in src/ sits inside a verified SUPPORT_EMAIL guard
//         AssertionError: expected [ 'src/components/patterns/…' ] to deeply equal []
//         + [ "src/components/patterns/site-footer.tsx:189 — \"mailto:support@fitout.ph\"" ]
//
//         FAIL … > every `Support` label in src/ sits inside a verified SUPPORT_EMAIL guard
//         AssertionError: expected [ Array(1) ] to deeply equal []
//         + [ "src/components/patterns/site-footer.tsx:188 — \"Support\"" ]
//
//         FAIL … > the footer carries NO address-shaped literal — not even inside the guard
//         AssertionError: src/components/patterns/site-footer.tsx contains an address-shaped
//         literal. A fabricated contact address is a real-world claim shipped to users (11-UI-SPEC
//         § Anti-Patterns); the only address this file may ever emit is SUPPORT_EMAIL,
//         interpolated.: expected [ 'support@fitout.ph' ] to deeply equal []
//
//         FAIL … > every address-shaped literal in src/ is declared in EXCLUDED_ADDRESSES with a
//              reason  → the fabricated address is reported as an undeclared one, by file and line.
//
//       THE FILE, THE LINE AND THE LITERAL ARE ALL IN THE MESSAGES, which is the difference between
//       a gate and an alarm. Reverted → 23 passed | 3 skipped.
//
//   (b) NON-NULL BRANCH — THE CONSTANT IS SET AND NOTHING RENDERS. `SUPPORT_EMAIL = "help@example
//       .test"` in `src/lib/site.ts`, with the footer's guarded entry DELETED. The null branch stood
//       down and the demanding one took over — visible in the skip count going 3 → 6.
//       **2 failed | 18 passed | 6 skipped:**
//
//         FAIL … > D-26 (SUPPORT_EMAIL is set) — the footer must actually render it
//              > renders EXACTLY ONE `mailto:` usage
//         AssertionError: src/components/patterns/site-footer.tsx renders 0 `mailto:` usages;
//         SUPPORT_EMAIL is set to a non-null address, so the footer MUST render exactly one.
//         Setting the constant without rendering the link is the drift this branch exists to
//         catch.: expected +0 to be 1
//
//         FAIL … > the footer declares EXACTLY ONE SUPPORT_EMAIL conditional
//         AssertionError: src/components/patterns/site-footer.tsx declares 0 SUPPORT_EMAIL
//         conditionals; exactly one is the contract. Zero means the guard was removed and the
//         constant no longer controls anything.: expected +0 to be 1
//
//       The SECOND failure is the one worth reading: deleting the entry does not merely fail the
//       state that demands it, it fails the structural assertion that runs in BOTH states. There is
//       no configuration of this tree in which the guard can quietly disappear.
//
//   (c) NON-NULL BRANCH — TWO OF THEM. The guarded `<a>` duplicated inside the one conditional.
//       **1 failed | 19 passed | 6 skipped:**
//
//         FAIL … > renders EXACTLY ONE `mailto:` usage
//         AssertionError: src/components/patterns/site-footer.tsx renders 2 `mailto:` usages …
//         expected 2 to be 1
//
//       Restored to the single guarded entry with the constant STILL SET → **20 passed | 6 skipped**,
//       which is the non-null green recorded above: the branch that cannot run today has been run,
//       red twice and green once, against the real file rather than only against a fixture. Constant
//       then reverted to `null` → 23 passed | 3 skipped, null branch running again.
//
//   (d) GUARD-THE-GUARD — THE PROBE WORTH READING. `SRC_DIR` re-pointed at `src-nope`.
//       **4 failed | 19 passed | 3 skipped:**
//
//         FAIL … > guard-the-guard … > walked at least 100 files under src/
//         AssertionError: the scanner walked 0 files under src/. Every zero below is green against
//         a scan that opened nothing, and an absence assertion cannot notice it was handed an empty
//         list.: expected +0 to be greater than or equal to 100
//
//         FAIL … > reached the three files this gate is actually about, BY NAME
//         AssertionError: the walker never reached the footer: expected [] to include
//         'src/components/patterns/site-footer.t…'
//
//       AND ALL THREE NULL-BRANCH ZERO-ASSERTIONS PASSED OVER THE EMPTY TREE — unguarded `mailto:`,
//       unguarded `Support`, undeclared addresses, every one of them a clean result over a scan that
//       opened nothing. Exactly as `sheet-absent.test.ts` probe (d) and plan `11-13`'s probe (c)
//       recorded: a forward scan over an empty list and an inverse `toEqual([])` are each perfectly
//       satisfied by a scan of nothing, permanently, and indistinguishably from a real clean run.
//       That is the entire argument for the file floor, the by-name reach assertions and the positive
//       control below, and it is why this file puts its walked-file count in the failure message
//       rather than only its verdict. Reverted → 23 passed | 3 skipped.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • **IT CANNOT TELL YOU THE ADDRESS IS CORRECT, OR THAT ANYBODY READS IT.** The non-null branch
//     asserts a string with an `@` in it and a link that interpolates it. Whether mail sent there
//     reaches a human is a fact about the business, not about the tree. This gate's whole claim is
//     the negative one: *nothing false is shipped while there is no address.*
//   • It reads authored SOURCE. A `mailto:` assembled at runtime — a variable, a `cva` map, a
//     concatenation — is invisible. That is the safe direction for a BAN (it can miss a violation,
//     never invent one) but it is a real hole, and the same one `sheet-absent.test.ts` records.
//   • The label probe matches the capitalised word `Support` only. A lowercase "support" inside body
//     copy is ordinary English and banning it would forbid the app from ever explaining anything;
//     the cost is that a lowercase link label would slip past. Link labels in this app are
//     sentence-capitalised by the copy contract, so the shape being policed is the one that exists.
//   • Comments are invisible BY CONSTRUCTION, not by stripping — the walk is over AST literal and
//     JSX-text nodes, which comments never produce. `src/lib/site.ts` and `site-footer.tsx` both
//     discuss `mailto:` and addresses at length in prose, and must be able to keep doing so.
//   • `EXCLUDED_ADDRESSES` is a DECLARATION that matches the tree today. If a future plan adds a
//     legitimate address-shaped literal, the honest change is a row WITH ITS REASON — never a
//     loosened regex.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

import { SUPPORT_EMAIL } from "@/lib/site";

const SRC_DIR = resolve(process.cwd(), "src");

/** The two files this gate is about, addressed by name so a rename cannot silently narrow the scan. */
const SITE_MODULE = "src/lib/site.ts";
const FOOTER = "src/components/patterns/site-footer.tsx";
/** The exclusion list's own site. If the walker never reaches it, the list below is decorative. */
const EMAIL_MODULE = "src/lib/email.ts";

/**
 * The scanner must walk at least this many files before any zero means anything. 100 is well under
 * the real count (252 at the time of writing) and well over any plausible partial scan.
 */
const MIN_FILES = 100;

/**
 * The scan covers ALL of `src/**`, which is WIDER than the plan's `src/app/**` + `src/components/**`,
 * and the widening is load-bearing rather than tidy-mindedness.
 *
 * `src/lib/email.ts:16` is the one real address in this repository — the Resend sandbox sender. Under
 * the narrower scope it would sit outside the scan entirely, and its exclusion row below would be a
 * row that never fires: a declared exception to a rule that never reached it. Declaring an exclusion
 * the scanner cannot see is exactly the shape of a gate that has quietly become decoration, so the
 * scan is widened until the exclusion is doing real work.
 */
const SCAN_ROOT_LABEL = "src/";

/**
 * EVERY ADDRESS-SHAPED LITERAL IN `src/` THAT IS NOT A CONTACT AFFORDANCE, WITH THE REASON IT IS ONE.
 *
 * Keyed `file — literal`, not by the address alone: an exclusion that travels with its site cannot be
 * reused to wave through the same string appearing somewhere it has no business being. This is the
 * `EXCLUDED_PAIRS` shape from `src/lib/design/contrast-pairs.ts:34-36` — a row without a reason is
 * not a row.
 */
const EXCLUDED_ADDRESSES: Readonly<Record<string, string>> = {
  "src/lib/email.ts — onboarding@resend.dev":
    "Resend's SANDBOX SENDER, in the `EMAIL_FROM` fallback — the From: header on transactional mail, " +
    "never published to a user as somewhere to write. It is also the closest thing this repo has to a " +
    "real address, which is precisely why D-26 refuses to promote it into the footer: replies to it go " +
    "nowhere, so shipping it as support would be the fabrication the whole decision exists to prevent.",
  "src/app/(auth)/forgot-password/page.tsx — you@example.com":
    "The `placeholder` on the email INPUT. It is an example of the shape the person should type, " +
    "rendered greyed inside the field, and it makes no claim about anything FitOut owns.",
  "src/app/(auth)/login/page.tsx — you@example.com": "Same email-input placeholder, login form.",
  "src/app/(auth)/signup/page.tsx — you@example.com": "Same email-input placeholder, signup form.",
  "src/components/group/rsvp-form.tsx — you@example.com":
    "Same email-input placeholder, the group RSVP form's optional notify-me field.",
};

/** An address-shaped literal. Deliberately loose: over-matching here costs a declared row, never a miss. */
const ADDRESS = /[\w.+-]+@[\w-]+\.[\w.]+/g;

/** The scheme that turns a string into a way to contact somebody. */
const MAILTO = "mailto:";

/**
 * The label. Capitalised and word-bounded — see the NOT COVERED note on why lowercase is out of scope.
 */
const SUPPORT_LABEL = /\bSupport\b/;

/** Collect every `.ts` / `.tsx` file under a directory. Returns `[]` for a missing directory. */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * WINDOWS PATH NORMALISATION — `focus-recipe.test.ts:89`'s idiom, load-bearing rather than cosmetic.
 * `path.relative` emits backslashes on this box while every path written in this file is
 * forward-slash; without this line every prefix filter and every by-name assertion stops matching and
 * the zeros all pass vacuously (T-10-27).
 */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

/** One authored literal, with where it is and whether the SUPPORT_EMAIL guard encloses it. */
type Literal = {
  readonly file: string;
  readonly line: number;
  readonly text: string;
  /** Lexically inside the true-branch of a conditional whose test names `SUPPORT_EMAIL`. */
  readonly guarded: boolean;
  /** The literal is a template HEAD whose first substitution reads `SUPPORT_EMAIL`. */
  readonly interpolatesConstant: boolean;
};

/** One `SUPPORT_EMAIL` conditional, and the only property that can make it dishonest. */
type Guard = {
  readonly file: string;
  readonly line: number;
  /**
   * TRUE when the conditional renders SOMETHING when the constant is null — a greyed link, a
   * "coming soon", a disabled control. D-26 forbids all of them; the else-branch must be `null`.
   */
  readonly hasElseBranch: boolean;
};

type Scan = {
  /** Every file the walker opened, normalised. */
  readonly walked: string[];
  /** Every authored literal / JSX text chunk, with its guard status. */
  readonly literals: readonly Literal[];
  /** Every `SUPPORT_EMAIL` conditional found. */
  readonly guards: readonly Guard[];
};

/**
 * Parse one module and report its literals and its guards.
 *
 * Exported shape is `(path, text)` rather than `(path)` so the synthetic fixtures below run through
 * the SAME code path the real assertions run — `leak.test.ts:208-212`'s rule, and the only way the
 * unreachable branch can be proved.
 *
 * COMMENTS ARE INVISIBLE BY CONSTRUCTION. The walk visits string literals, template chunks and JSX
 * text; the TypeScript parser produces no node for a comment, so this file's own prose about
 * `mailto:` — and `site.ts`'s, and the footer's — can never be counted as a call site. That is the
 * difference between this and a grep, and it is why the criterion is expressed over the AST.
 */
function analyseSource(file: string, text: string): { literals: Literal[]; guards: Guard[] } {
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const guards: Guard[] = [];
  /** The character ranges that count as "inside the guard's true-branch". */
  const guardedRanges: Array<[number, number]> = [];

  const collectGuards = (node: ts.Node): void => {
    // `SUPPORT_EMAIL !== null ? (<entry/>) : null`
    if (ts.isConditionalExpression(node) && node.condition.getText(sf).includes("SUPPORT_EMAIL")) {
      guards.push({
        file,
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        // Anything other than the bare `null` keyword renders SOMETHING in the unfilled state.
        hasElseBranch: node.whenFalse.kind !== ts.SyntaxKind.NullKeyword,
      });
      guardedRanges.push([node.whenTrue.getStart(sf), node.whenTrue.getEnd()]);
    }
    // `SUPPORT_EMAIL !== null && <entry/>` — the other legal shape, which has no else-branch at all.
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
      node.left.getText(sf).includes("SUPPORT_EMAIL")
    ) {
      guards.push({
        file,
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        hasElseBranch: false,
      });
      guardedRanges.push([node.right.getStart(sf), node.right.getEnd()]);
    }
    ts.forEachChild(node, collectGuards);
  };
  collectGuards(sf);

  const literals: Literal[] = [];
  const collectLiterals = (node: ts.Node): void => {
    let text: string | null = null;
    let interpolatesConstant = false;

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      text = node.text;
    } else if (ts.isTemplateHead(node)) {
      text = node.text;
      // `\`mailto:${SUPPORT_EMAIL}\`` — the head is `mailto:` and the FIRST substitution is what
      // decides whether an address was interpolated or retyped.
      const parent = node.parent;
      if (parent && ts.isTemplateExpression(parent)) {
        interpolatesConstant =
          parent.templateSpans[0]?.expression.getText(sf).includes("SUPPORT_EMAIL") ?? false;
      }
    } else if (ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      text = node.text;
    } else if (ts.isJsxText(node)) {
      text = node.text;
    }

    if (text !== null && text.trim() !== "") {
      const start = node.getStart(sf);
      literals.push({
        file,
        line: sf.getLineAndCharacterOfPosition(start).line + 1,
        text,
        guarded: guardedRanges.some(([from, to]) => start >= from && start < to),
        interpolatesConstant,
      });
    }
    ts.forEachChild(node, collectLiterals);
  };
  collectLiterals(sf);

  return { literals, guards };
}

/** Walk a tree and analyse every module in it. Takes the directory so probe (d) is a one-line edit. */
function scanTree(dir: string): Scan {
  const walked: string[] = [];
  const literals: Literal[] = [];
  const guards: Guard[] = [];
  for (const file of collectSourceFiles(dir)) {
    const name = label(file);
    walked.push(name);
    const result = analyseSource(name, readFileSync(file, "utf8"));
    literals.push(...result.literals);
    guards.push(...result.guards);
  }
  return { walked, literals, guards };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE ASSERTION FUNCTIONS. Every one takes its input as an argument, so the branch that cannot run
// against the real tree today can still be run against a fixture.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Every `mailto:` literal NOT enclosed by a verified guard, rendered `file:line — "text"`. */
function unguardedMailto(scan: Scan): string[] {
  return scan.literals
    .filter((l) => l.text.includes(MAILTO) && !l.guarded)
    .map((l) => `${l.file}:${l.line} — ${JSON.stringify(l.text)}`);
}

/** Every `Support` label NOT enclosed by a verified guard. */
function unguardedSupportLabel(scan: Scan): string[] {
  return scan.literals
    .filter((l) => SUPPORT_LABEL.test(l.text) && !l.guarded)
    .map((l) => `${l.file}:${l.line} — ${JSON.stringify(l.text.trim())}`);
}

/** Every address-shaped literal whose `file — address` pair is not declared in `EXCLUDED_ADDRESSES`. */
function undeclaredAddresses(scan: Scan): string[] {
  const found: string[] = [];
  for (const l of scan.literals) {
    for (const match of l.text.match(ADDRESS) ?? []) {
      const key = `${l.file} — ${match}`;
      if (!(key in EXCLUDED_ADDRESSES)) found.push(`${l.file}:${l.line} — ${match}`);
    }
  }
  return found;
}

/** Every address-shaped literal in ONE file, guarded or not. Used to prove the footer fabricates none. */
function addressesIn(file: string, text: string): string[] {
  const { literals } = analyseSource(file, text);
  return literals.flatMap((l) => l.text.match(ADDRESS) ?? []);
}

/** Every `mailto:` usage in ONE file, with whether it interpolates the constant. */
function mailtoUsages(file: string, text: string): Literal[] {
  return analyseSource(file, text).literals.filter((l) => l.text.includes(MAILTO));
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Scanned ONCE at module level; the `it()` blocks below only assert against this result.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const scan = scanTree(SRC_DIR);
const footerSource = existsSync(resolve(process.cwd(), FOOTER))
  ? readFileSync(resolve(process.cwd(), FOOTER), "utf8")
  : "";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// GUARD-THE-GUARD FIRST, on purpose: every zero below is worthless if the scan opened nothing.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("guard-the-guard — the scanner read the tree it is asserting about", () => {
  it(`walked at least ${MIN_FILES} files under ${SCAN_ROOT_LABEL}`, () => {
    expect(
      scan.walked.length,
      `the scanner walked ${scan.walked.length} files under ${SCAN_ROOT_LABEL}. Every zero below ` +
        `is green against a scan that opened nothing, and an absence assertion cannot notice it was ` +
        `handed an empty list.`,
    ).toBeGreaterThanOrEqual(MIN_FILES);
  });

  it("reached the three files this gate is actually about, BY NAME", () => {
    // A count alone survives any one of these being renamed out of the scan. The footer is the file
    // the assertions are about; `site.ts` is where the branch is chosen; `email.ts` is the exclusion
    // list's only real site, and if the walker misses it the list below is decoration.
    expect(scan.walked, "the walker never reached the footer").toContain(FOOTER);
    expect(scan.walked, "the walker never reached the site module").toContain(SITE_MODULE);
    expect(scan.walked, "the walker never reached the email layer").toContain(EMAIL_MODULE);
  });

  it("FLAGS a real support affordance — the positive control", () => {
    // Without this, every zero below is satisfied by a walker whose matchers match nothing at all.
    // Run through `analyseSource`, the same function the real scan calls.
    const offender = analyseSource(
      "fake-offender.tsx",
      'export const A = <a href="mailto:someone@example.test">Support</a>;',
    );
    const fake: Scan = { walked: ["fake-offender.tsx"], literals: offender.literals, guards: [] };
    expect(unguardedMailto(fake)).toHaveLength(1);
    expect(unguardedSupportLabel(fake)).toHaveLength(1);
    expect(undeclaredAddresses(fake)).toEqual([
      "fake-offender.tsx:1 — someone@example.test",
    ]);
  });

  it("does NOT flag prose — comments produce no node, which is the whole reason this is an AST walk", () => {
    // `site.ts` and `site-footer.tsx` both explain the decision at length and must keep being able
    // to. A grep-shaped gate would be red against the tree that documents itself correctly.
    const prose = analyseSource(
      "fake-prose.tsx",
      [
        "// Support -> mailto:support@fitout.ph is what this file deliberately does NOT render.",
        "/* an address like help@fitout.example must never ship */",
        'export const A = <p className="text-sm">Anything</p>; // mailto:another@fitout.example',
      ].join("\n"),
    );
    const fake: Scan = { walked: ["fake-prose.tsx"], literals: prose.literals, guards: [] };
    expect(unguardedMailto(fake)).toEqual([]);
    expect(unguardedSupportLabel(fake)).toEqual([]);
    expect(undeclaredAddresses(fake)).toEqual([]);
  });

  it("pointed at a directory that does not exist, finds nothing — which is why the floor exists", () => {
    // The vacuity probe as a PERMANENT assertion rather than a one-off. This is the measurement
    // `sheet-absent.test.ts` probe (d) and plan 11-13's probe (c) both recorded: over a tree the
    // scanner never opened, every absence assertion reports a perfectly clean result, permanently
    // and indistinguishably from a real clean run.
    const empty = scanTree(resolve(process.cwd(), "src-nope"));
    expect(empty.walked).toEqual([]);
    expect(unguardedMailto(empty), "…and it reports a perfectly clean result over nothing").toEqual([]);
    expect(unguardedSupportLabel(empty)).toEqual([]);
    expect(undeclaredAddresses(empty)).toEqual([]);
  });

  it("read the footer source it is about", () => {
    expect(footerSource.length, `${FOOTER} read as empty or missing`).toBeGreaterThan(500);
    expect(footerSource).toContain("data-testid=\"site-footer\"");
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE STRUCTURE THAT MAKES BOTH BRANCHES POSSIBLE — asserted in EITHER state, because the guard is
// what carries the contract from one to the other.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("the guard itself — one conditional, no else-branch, in either state", () => {
  const footerGuards = scan.guards.filter((g) => g.file === FOOTER);

  it("the footer declares EXACTLY ONE SUPPORT_EMAIL conditional", () => {
    // A zero here would mean the guard was deleted — after which the null branch's "no unguarded
    // affordance" assertions stay green forever over a footer that simply has no support entry and
    // no way to grow one. The count is the positive half of the absence.
    expect(
      footerGuards.length,
      `${FOOTER} declares ${footerGuards.length} SUPPORT_EMAIL conditionals; exactly one is the ` +
        `contract. Zero means the guard was removed and the constant no longer controls anything.`,
    ).toBe(1);
  });

  it("the guard has NO ELSE-BRANCH — the entry is absent, never disabled (D-26)", () => {
    for (const g of footerGuards) {
      expect(
        g.hasElseBranch,
        `${g.file}:${g.line} renders something when SUPPORT_EMAIL is null. D-26 forbids every ` +
          `version of that — a greyed link, a "coming soon", a disabled control, a tooltip. An ` +
          `affordance that looks present and does nothing is a worse lie than an absence.`,
      ).toBe(false);
    }
  });

  it("the footer carries NO address-shaped literal — not even inside the guard", () => {
    // THE ASSERTION THAT MAKES THE GUARDED BRANCH SAFE. The guard means nothing rendered today; this
    // means nothing FALSE can be rendered tomorrow either, because the only address the file can
    // emit is the one interpolated from the constant.
    expect(
      addressesIn(FOOTER, footerSource),
      `${FOOTER} contains an address-shaped literal. A fabricated contact address is a real-world ` +
        `claim shipped to users (11-UI-SPEC § Anti-Patterns); the only address this file may ever ` +
        `emit is SUPPORT_EMAIL, interpolated.`,
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// BRANCH 1 — while `SUPPORT_EMAIL` is null. Runs today.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe.runIf(SUPPORT_EMAIL === null)(
  "D-26 (SUPPORT_EMAIL === null) — zero support affordances render anywhere",
  () => {
    it("SUPPORT_EMAIL is exactly `null` — not `\"\"`, not `undefined`", () => {
      // The empty string is neither null nor undefined, so it would take the OTHER branch and fail
      // it. That is the correct outcome, but the honest spelling of "no address yet" is `null`, and
      // this assertion is what keeps the two states from blurring into a third.
      expect(SUPPORT_EMAIL).toBeNull();
      expect(SUPPORT_EMAIL).not.toBe("");
      expect(SUPPORT_EMAIL).not.toBeUndefined();
    });

    it("every `mailto:` in src/ sits inside a verified SUPPORT_EMAIL guard", () => {
      expect(unguardedMailto(scan)).toEqual([]);
    });

    it("every `Support` label in src/ sits inside a verified SUPPORT_EMAIL guard", () => {
      expect(unguardedSupportLabel(scan)).toEqual([]);
    });

    it("every address-shaped literal in src/ is declared in EXCLUDED_ADDRESSES with a reason", () => {
      expect(
        undeclaredAddresses(scan),
        `an address-shaped literal appeared in src/ that is not a declared exclusion. If it is a ` +
          `legitimate non-contact literal, add a row to EXCLUDED_ADDRESSES with the reason it is ` +
          `one. Do NOT loosen the regex — see this file's NOT COVERED footer.`,
      ).toEqual([]);
    });

    it("every declared exclusion is a row with a real reason, and every one of them still fires", () => {
      // Both directions. A row whose reason is empty is not a row (`contrast-pairs.ts`'s rule); a row
      // whose site no longer contains its address is a stale exemption that would silently wave
      // through a future literal at the same path.
      const foundKeys = new Set<string>();
      for (const l of scan.literals) {
        for (const match of l.text.match(ADDRESS) ?? []) foundKeys.add(`${l.file} — ${match}`);
      }
      for (const [key, why] of Object.entries(EXCLUDED_ADDRESSES)) {
        expect(why.length, `EXCLUDED_ADDRESSES["${key}"] has no reason`).toBeGreaterThan(40);
        expect(
          foundKeys.has(key),
          `EXCLUDED_ADDRESSES declares "${key}" but the scan no longer finds it. A stale exemption ` +
            `waves through whatever appears at that path next — delete the row instead.`,
        ).toBe(true);
      }
    });

    it("declares the Resend sender as data with a reason, rather than by accident of the regex", () => {
      // Named explicitly because it is the ONE real address in this repository and the single most
      // likely thing for someone to promote into the footer. The reason it must not be is in the row.
      expect(EXCLUDED_ADDRESSES).toHaveProperty(`${EMAIL_MODULE} — onboarding@resend.dev`);
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// BRANCH 2 — the moment `SUPPORT_EMAIL` is set. Unreachable today; proved against fixtures below.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe.runIf(SUPPORT_EMAIL !== null)(
  "D-26 (SUPPORT_EMAIL is set) — the footer must actually render it",
  () => {
    it("is a string containing `@`", () => {
      expect(typeof SUPPORT_EMAIL).toBe("string");
      expect(
        String(SUPPORT_EMAIL),
        `SUPPORT_EMAIL is set to ${JSON.stringify(SUPPORT_EMAIL)}, which is not an address.`,
      ).toContain("@");
    });

    it("renders EXACTLY ONE `mailto:` usage", () => {
      const usages = mailtoUsages(FOOTER, footerSource);
      expect(
        usages.length,
        `${FOOTER} renders ${usages.length} \`mailto:\` usages; SUPPORT_EMAIL is set to a non-null ` +
          `address, so the footer MUST render exactly one. Setting the constant without rendering ` +
          `the link is the drift this branch exists to catch.`,
      ).toBe(1);
    });

    it("interpolates the CONSTANT rather than a retyped address", () => {
      const usages = mailtoUsages(FOOTER, footerSource);
      for (const u of usages) {
        expect(
          u.interpolatesConstant,
          `${u.file}:${u.line} writes the address into the \`mailto:\` instead of interpolating ` +
            `SUPPORT_EMAIL. Two spellings of one address is the drift src/lib/site.ts exists to end.`,
        ).toBe(true);
        expect(u.text.match(ADDRESS) ?? [], `${u.file}:${u.line} hardcodes an address`).toEqual([]);
      }
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE UNREACHABLE BRANCH, EXERCISED. A branch nobody has ever executed is not a gate.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("synthetic fixtures — both branches run, in both directions", () => {
  /** The footer as it will look the day someone supplies an address. */
  const GOOD_FOOTER = [
    'import { SUPPORT_EMAIL } from "@/lib/site";',
    "export function SiteFooter() {",
    "  return (",
    '    <footer data-testid="site-footer">',
    "      {SUPPORT_EMAIL !== null ? (",
    "        <a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>",
    "      ) : null}",
    "    </footer>",
    "  );",
    "}",
  ].join("\n");

  it("NON-NULL, correct: exactly one usage, interpolating the constant, no literal address", () => {
    const usages = mailtoUsages("fake-good.tsx", GOOD_FOOTER);
    expect(usages).toHaveLength(1);
    expect(usages[0].interpolatesConstant).toBe(true);
    expect(addressesIn("fake-good.tsx", GOOD_FOOTER)).toEqual([]);
  });

  it("NON-NULL, nothing rendered: the count assertion is what catches it", () => {
    const none = GOOD_FOOTER.replace(
      "        <a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>\n",
      "        <span>nothing</span>\n",
    );
    expect(mailtoUsages("fake-none.tsx", none)).toHaveLength(0);
  });

  it("NON-NULL, rendered twice: the same assertion catches the other direction", () => {
    const twice = GOOD_FOOTER.replace(
      "        <a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>",
      "        <a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>\n        <a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>",
    );
    expect(mailtoUsages("fake-twice.tsx", twice)).toHaveLength(2);
  });

  it("NON-NULL, address retyped instead of interpolated: caught on BOTH halves", () => {
    const retyped = GOOD_FOOTER.replace(
      "<a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>",
      '<a href="mailto:help@example.test">Support</a>',
    );
    const usages = mailtoUsages("fake-retyped.tsx", retyped);
    expect(usages).toHaveLength(1);
    expect(usages[0].interpolatesConstant).toBe(false);
    expect(addressesIn("fake-retyped.tsx", retyped)).toEqual(["help@example.test"]);
  });

  it("NULL, correct: the guarded usage is NOT reported as an unguarded affordance", () => {
    // The shape the real tree has today. Without this, the null branch's three zeros would be
    // satisfied by a gate that simply banned the substrings — and would be red against the exact
    // implementation D-26 prescribes.
    const { literals, guards } = analyseSource("fake-guarded.tsx", GOOD_FOOTER);
    const fake: Scan = { walked: ["fake-guarded.tsx"], literals, guards };
    expect(unguardedMailto(fake)).toEqual([]);
    expect(unguardedSupportLabel(fake)).toEqual([]);
    expect(guards).toHaveLength(1);
    expect(guards[0].hasElseBranch).toBe(false);
  });

  it("NULL, an ELSE-BRANCH appears: the disabled affordance D-26 forbids", () => {
    const greyed = GOOD_FOOTER.replace(
      "      ) : null}",
      '      ) : <span className="opacity-50">Support (coming soon)</span>}',
    );
    const { guards, literals } = analyseSource("fake-greyed.tsx", greyed);
    expect(guards).toHaveLength(1);
    expect(guards[0].hasElseBranch, "an else-branch was not detected").toBe(true);
    // And the label in the else-branch is UNGUARDED, so it is reported as an affordance too.
    const fake: Scan = { walked: ["fake-greyed.tsx"], literals, guards };
    expect(unguardedSupportLabel(fake).length).toBeGreaterThan(0);
  });

  it("NULL, an affordance OUTSIDE the guard: reported with its file and its literal", () => {
    // Probe (a) in the header, as a permanent assertion.
    const leaked = GOOD_FOOTER.replace(
      '    <footer data-testid="site-footer">',
      '    <footer data-testid="site-footer">\n      <a href="mailto:support@fitout.ph">Support</a>',
    );
    const { literals, guards } = analyseSource("fake-leaked.tsx", leaked);
    const fake: Scan = { walked: ["fake-leaked.tsx"], literals, guards };
    expect(unguardedMailto(fake)).toEqual([
      'fake-leaked.tsx:5 — "mailto:support@fitout.ph"',
    ]);
    expect(unguardedSupportLabel(fake)).toEqual(['fake-leaked.tsx:5 — "Support"']);
    expect(addressesIn("fake-leaked.tsx", leaked)).toEqual(["support@fitout.ph"]);
  });

  it("the `&&` guard shape is honoured too, so a legal refactor does not read as a violation", () => {
    const andForm = GOOD_FOOTER.replace(
      "      {SUPPORT_EMAIL !== null ? (\n        <a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>\n      ) : null}",
      "      {SUPPORT_EMAIL !== null && <a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>}",
    );
    const { literals, guards } = analyseSource("fake-and.tsx", andForm);
    const fake: Scan = { walked: ["fake-and.tsx"], literals, guards };
    expect(guards).toHaveLength(1);
    expect(guards[0].hasElseBranch).toBe(false);
    expect(unguardedMailto(fake)).toEqual([]);
  });
});
