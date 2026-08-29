// AC#20 — HOW MANY PLACES IN `e2e/` DECIDE, FROM A COMPUTED STYLE, WHETHER FOCUS IS DRAWN.
//
// It runs under `tests/design/**`, so it is DB-free and executes inside `npm run build`
// (`package.json` → `"build": "npm run lint && npm run test:design && next build"`). That is the whole
// reason this is a design gate and not an e2e spec: AC#20 is a claim about SOURCE, and a claim about
// source that only runs when somebody remembers to run the browser suite is a convention, not a gate.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IS BEING COUNTED, AND WHY "A DEFINITION" IS NOT THE SAME AS "MENTIONS `boxShadow`"
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-16's one-import-site rule, applied to `e2e/`. `e2e/helpers/focus.ts:1-33` states the property this
// file exists to keep true: *"Two copies of a focus criterion is the drift that goes silent in the worst
// direction."* DS-05 ships exactly one recipe, Tailwind draws its `ring-*` as a BOX-SHADOW rather than
// an outline, and the day DS-05 stops painting a `ring-*` one copy of that knowledge gets updated and
// every other copy keeps reporting green about a mechanism that no longer exists.
//
//   A DEFINITION reads `outlineStyle` / `outlineWidth` / `boxShadow` off a style reading and turns it
//   into a pass/fail.
//   A CONSUMER calls `expectRing`, `readFocus`, `indicatorOf` or `sameIndicator` and asserts on the
//   answer.
//
// `expectVisibleFocus` in `e2e/overflow-320.spec.ts:1035` is a CONSUMER and MUST NOT be reported. It
// exists precisely so the criterion is not restated — it calls `readFocus` and then `expectRing`. A gate
// that flagged it would drive somebody to inline the very duplication AC#20 forbids, which is the shape
// of a gate that makes a codebase worse.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE PLAN SAID "EXACTLY ONE". THE TREE SAYS THREE, AND ALL THREE ARE CORRECT. (17-02, MEASURED)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// 17-02's `<action>` states the subject as *"The answer must be exactly one, and it must be
// `e2e/helpers/focus.ts`"*. Measured against the tree on 2026-08-29, that assertion is RED AGAINST
// CORRECT CODE — the eleventh instance in this phase of a prescribed rule that is wrong about the tree
// it polices, and the same failure class the plan itself warns about two paragraphs earlier when it
// mandates `stripComments`. The three sites, each with the reason it is not drift:
//
//   1. `e2e/helpers/focus.ts` — `readFocus` + `expectRing`. THE criterion. Everything else layers on it.
//   2. `e2e/auth-keyboard.spec.ts:547` — `expectIndicatorPaints`, which its own docblock introduces as
//      *"a strictly stronger claim than `expectRing`, and it is here because `expectRing` alone has a
//      hole this walk would otherwise report green through"*: a `ring-*` compiles to a five-layer
//      shadow of which three layers are transparent placeholders, so a ring whose COLOUR went
//      transparent hands `expectRing` a long non-`none` string and passes. Deleting this in the name of
//      one-definition would delete a real assertion. Same file, `:656` — the wordmark keeps the
//      BROWSER-DEFAULT outline by `(auth)/layout.tsx`'s deliberate choice and carries no DS-05 ring at
//      all, so the one element in the tree `expectRing`'s recipe does not describe needs its own read.
//   3. `e2e/avatar-crop.spec.ts:1438` — the crop stage draws a PERMANENT `box-shadow: 0 0 0 9999em`
//      (IC-04's scrim), so `expectRing` is satisfied by furniture there whether or not focus is drawn.
//      The colour-really-painted read is what makes that surface measurable at all.
//
// So the enforceable form of AC#20 is not a count. It is a CLOSED INVENTORY: the set of files that
// define a focus verdict must EQUAL a declared set, and every declared entry carries prose a reviewer
// can check — `src/lib/design/selector-contract.ts:230-248`'s rule, *"a row without a reason is not a
// row"*, and the same shape `tests/design/sheet-absent.test.ts` uses for its (empty) legitimate-call-site
// map. A new file computing a focus verdict is red; the inventory is not somewhere to file it away.
//
// TWO PROPERTIES KEEP THE INVENTORY FROM DEGRADING INTO AN ALLOWLIST, and they are asserted, not hoped:
//   • every declared exception must ALSO import from `./helpers/focus` — it LAYERS on the one
//     definition rather than replacing it, and a file that read the properties without importing the
//     helper would be a genuine second criterion;
//   • the failure message argues the reader OUT of adding a row, and names the import as the fix.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE SCAN STRIPS COMMENTS *AND* STRING BODIES — TWO FALSE-POSITIVE CLASSES, BOTH LIVE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   (i) PROSE. `e2e/overflow-320.spec.ts:1017-1034` and `e2e/auth-keyboard.spec.ts:468-490` both QUOTE
//       DS-05's recipe in a docblock, naming `box-shadow` and the outline in explanation. An unstripped
//       scan reports both as definitions — RED against correct code. `stripComments` is mandatory here,
//       not defensive.
//  (ii) FAILURE MESSAGES. This one is not in the plan and was found by measurement.
//       `e2e/avatar-crop.spec.ts:2605-2609` reads
//
//           expect(
//             sameIndicator(indicatorOf(step.active), indicatorOf(unfocused)),
//             `… (outline ${step.active.outlineStyle} ${step.active.outlineWidth}, box-shadow ` +
//               `${step.active.boxShadow}), so what it draws is decoration rather than an indicator.`,
//           ).toBe(false);
//
//       The VERDICT comes from `sameIndicator` + `indicatorOf`, both imported from the one helper. The
//       three property names appear only inside the message, interpolated so the failure prints real
//       numbers — which is this repo's house style and is the OPPOSITE of a second definition. Comment
//       stripping does not touch it, because a template literal is not a comment. A scan that stopped
//       at `stripComments` would flag the most textbook consumer in the tree.
//
// So the scanner below blanks string and template-literal TEXT, keeps ordinary code, and treats a read
// inside a `${…}` substitution as a MESSAGE read rather than a verdict read. Both sets are reported, and
// guard (c) asserts the message set is non-empty — a discriminator that never discriminates is the
// vacuity failure this repository has now recorded nine times.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • KEBAB-CASE READS ARE INVISIBLE. `e2e/avatar-crop.spec.ts:1428` reads the same properties as
//     `computed(el, ["outline-style", "outline-width"])` — string keys, which this scan blanks along
//     with every other string. That file is on the inventory for its camelCase read on the next line,
//     so the gate is correct there today; a NEW file whose only reads were kebab-case would be missed.
//     Closing it means matching inside string literals, which reintroduces false-positive class (ii)
//     wholesale. The trade is recorded rather than hidden.
//   • It counts DEFINITION SITES BY FILE, not by function. A second definition added to
//     `auth-keyboard.spec.ts` is inside an already-declared file and does not move the set.
//   • It says nothing about whether the one criterion is CORRECT — `tests/design/focus-recipe.test.ts`
//     pins DS-05's spelling; this file only pins how many places restate it.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED (2026-08-29, plan 17-02). GREEN IS 6 PASSED.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`). The
// self-test at the bottom drives `undeclaredViolation` both ways on synthetic sources, which is the
// message's reachability proof; this is the same thing against the real scan.
//
// MUTATION: `e2e/rogue-focus-probe.spec.ts` was written — eight lines, a `page.evaluate` returning the
// three properties and an `expect` on `boxShadow !== "none" || parseFloat(outlineWidth) > 0`, i.e. the
// most natural way somebody re-derives the criterion without noticing they have. Command:
// `npx vitest run --config vitest.design.config.ts tests/design/focus-definition.test.ts`.
// Observed 2 failed / 4 passed, and BOTH failures are the intended ones:
//
//     × every focus verdict in e2e/ is declared, with a reason
//       + 1 file(s) in e2e/ compute a focus verdict from outlineStyle / outlineWidth / boxShadow and
//       + are not on the declared inventory:
//       +     e2e/rogue-focus-probe.spec.ts — line(s) 6, 8
//       + … THE FIX IS `import { expectRing } from "./helpers/focus"` …
//
//     × every declared site layers on the one definition instead of replacing it
//       e2e/rogue-focus-probe.spec.ts defines a focus verdict but never imports `./helpers/focus`.
//
// The three guard clauses stayed GREEN throughout, which is the correct behaviour: the tree was still
// scannable and the classifier still discriminating — only the claim moved. The probe file was deleted
// and `git status --porcelain e2e/` printed nothing; re-run 6 passed.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, type Dirent } from "node:fs";
import { join, relative, resolve } from "node:path";

import { stripComments } from "./helpers/strip-comments";

/** The scanned tree, as ONE constant — the wrong-directory probe is a one-line edit here. */
const E2E_DIR = resolve(process.cwd(), "e2e");

/** The one canonical definition. Exempted BY PATH, never by pattern: a pattern exemption would also
 *  exempt every file that copied the pattern, which is the thing being counted. */
const CANONICAL = "e2e/helpers/focus.ts";

/** The three computed-style properties a focus verdict is made of (`Indicator` in the helper). */
const FOCUS_PROPERTIES = ["outlineStyle", "outlineWidth", "boxShadow"] as const;

/** Calling any of these is what a CONSUMER does. All four are exports of the one helper. */
const CONSUMER_CALLS = ["expectRing", "readFocus", "indicatorOf", "sameIndicator"] as const;

/** The import specifier every declared site must carry, proving it layers rather than replaces. */
const HELPER_IMPORT = "./helpers/focus";

/**
 * Below the measured 45 `.ts` files under `e2e/` (35 specs + helpers + fixtures, 2026-08-29), well over
 * any partial read. A floor, not an equality: adding a spec must never turn this gate red.
 */
const MIN_SCANNED_FILES = 30;

/**
 * EVERY FILE THAT MAY DEFINE A FOCUS VERDICT, WITH THE REASON IT MAY — the `EXCLUDED_PAIRS` /
 * `SELECTOR_CONTRACT` shape, where a row without a reason is not a row. The reasons are summarised from
 * each site's own docblock; the header above carries them in full.
 *
 * ⚠ THIS IS NOT AN ALLOWLIST TO ADD YOUR FILE TO. Every entry here names a question `expectRing` DOES
 * NOT ASK. If the sentence you would write for a new row is "it checks whether focus is drawn", you are
 * restating the criterion and the fix is `import { expectRing } from "./helpers/focus"`.
 */
const DECLARED_DEFINITIONS: Readonly<Record<string, string>> = {
  [CANONICAL]:
    "THE criterion. `readFocus` takes the reading and `expectRing` turns it into the verdict every " +
    "other file consumes. D-16's one import site.",
  "e2e/auth-keyboard.spec.ts":
    "TWO questions `expectRing` cannot ask. (1) `expectIndicatorPaints` (:547) strips fully " +
    "transparent shadow layers before deciding, because a `ring-*` whose colour went transparent is " +
    "still a non-`none` box-shadow and passes `expectRing` while painting nothing. (2) The wordmark " +
    "(:656) keeps the BROWSER-DEFAULT outline by `(auth)/layout.tsx`'s deliberate choice and carries " +
    "no DS-05 ring, so it is the one element the recipe does not describe.",
  "e2e/avatar-crop.spec.ts":
    "The crop stage draws a PERMANENT `box-shadow: 0 0 0 9999em` — IC-04's scrim — so `expectRing` " +
    "is satisfied there by furniture whether or not focus is indicated. The colour-really-painted " +
    "read (:1438) is what makes that one surface measurable.",
};

const rel = (p: string) => relative(process.cwd(), p).replace(/\\/g, "/");

/**
 * Every `.ts` file under `e2e/`, repo-relative. `[]` on an unreadable tree rather than a throw — 11-02's
 * rule: a broken scan surfaces as ONE named guard-the-guard failure, never a stack trace that buries
 * which gate went quiet. Guard (a) is what converts that `[]` into a red.
 */
function collectSources(dir: string, out: string[] = []): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSources(full, out);
    else if (entry.name.endsWith(".ts")) out.push(rel(full));
  }
  return out;
}

/**
 * Split comment-free source into the two contexts a property name can appear in.
 *
 * `kept` is the source with every string and template-literal TEXT blanked and newlines preserved, so a
 * match's line number is still the file's line number (the same contract `stripComments` keeps).
 * `messageAt[i]` is true when position `i` sits inside a `${…}` substitution — i.e. inside something
 * being formatted into a failure message.
 *
 * A CHARACTER SCANNER, NOT A PARSER, for `strip-comments.ts:27-42`'s reason: `//` and `/*` mean nothing
 * inside a string, and neither does a quote inside a template. The mode stack is what keeps a backtick
 * inside a double-quoted string from opening a template.
 */
function partitionContexts(source: string): { kept: string; messageAt: boolean[] } {
  type Mode =
    | { readonly k: "code"; braces: number; readonly sub: boolean }
    | { readonly k: "str"; readonly q: string }
    | { readonly k: "tpl" };

  const stack: Mode[] = [{ k: "code", braces: 0, sub: false }];
  const kept: string[] = [];
  const messageAt: boolean[] = [];
  let subDepth = 0;
  let i = 0;

  const push = (ch: string, isCode: boolean) => {
    kept.push(ch === "\n" ? "\n" : isCode ? ch : " ");
    messageAt.push(subDepth > 0);
  };

  while (i < source.length) {
    const top = stack[stack.length - 1];
    const ch = source[i];

    if (top.k === "str" || top.k === "tpl") {
      if (ch === "\\") {
        push(source[i], false);
        if (i + 1 < source.length) push(source[i + 1], false);
        i += 2;
        continue;
      }
      if (top.k === "tpl" && ch === "$" && source[i + 1] === "{") {
        push("$", false);
        push("{", false);
        stack.push({ k: "code", braces: 0, sub: true });
        subDepth += 1;
        i += 2;
        continue;
      }
      if ((top.k === "str" && ch === top.q) || (top.k === "tpl" && ch === "`")) stack.pop();
      push(ch, false);
      i += 1;
      continue;
    }

    // Code context.
    if (ch === '"' || ch === "'") {
      stack.push({ k: "str", q: ch });
      push(ch, false);
      i += 1;
      continue;
    }
    if (ch === "`") {
      stack.push({ k: "tpl" });
      push(ch, false);
      i += 1;
      continue;
    }
    if (ch === "{") {
      top.braces += 1;
      push(ch, true);
      i += 1;
      continue;
    }
    if (ch === "}") {
      if (top.sub && top.braces === 0) {
        stack.pop();
        subDepth -= 1;
        push(ch, false);
        i += 1;
        continue;
      }
      top.braces -= 1;
      push(ch, true);
      i += 1;
      continue;
    }
    push(ch, true);
    i += 1;
  }

  return { kept: kept.join(""), messageAt };
}

type Reads = {
  /** 1-based line numbers where a focus property is read into ordinary code — a VERDICT read. */
  readonly verdict: readonly number[];
  /** 1-based line numbers where one appears only inside a `${…}` — a MESSAGE read. */
  readonly message: readonly number[];
};

/**
 * THE CLASSIFIER. Matches a PROPERTY ACCESS (`something.boxShadow`), never a bare identifier, so a type
 * declaration (`readonly boxShadow: string`) and an object-literal key are not reads.
 */
function classifyReads(rawSource: string): Reads {
  const { kept, messageAt } = partitionContexts(stripComments(rawSource));
  const pattern = new RegExp(`\\.(?:${FOCUS_PROPERTIES.join("|")})\\b`, "g");
  const verdict: number[] = [];
  const message: number[] = [];

  for (const match of kept.matchAll(pattern)) {
    const at = match.index;
    const line = kept.slice(0, at).split("\n").length;
    (messageAt[at] ? message : verdict).push(line);
  }
  return { verdict, message };
}

/** A file that calls the shared helper. Read off the same comment-stripped, string-blanked source. */
function callsHelper(rawSource: string): boolean {
  const { kept } = partitionContexts(stripComments(rawSource));
  return CONSUMER_CALLS.some((fn) => new RegExp(`\\b${fn}\\s*\\(`).test(kept));
}

/**
 * The failure message, BUILT BY A FUNCTION so the self-test below drives the same code path
 * (`money-path-invariants.test.ts:71-77`'s rule: a message that has only ever been produced by a
 * passing assertion — i.e. never — is a message nobody has read). Returns `null` when the set is legal.
 */
function undeclaredViolation(found: ReadonlyMap<string, Reads>): string | null {
  const undeclared = [...found.keys()].filter((f) => DECLARED_DEFINITIONS[f] === undefined).sort();
  if (undeclared.length === 0) return null;

  const detail = undeclared
    .map((f) => {
      // De-duplicated: one line often carries three matches (`{ outlineStyle: s.outlineStyle, … }`),
      // and a report reading "line(s) 6, 6, 6" invites the reader to look for three separate defects.
      const lines = [...new Set(found.get(f)?.verdict ?? [])].sort((a, b) => a - b);
      return `    ${f} — line(s) ${lines.join(", ")}`;
    })
    .join("\n");

  return (
    `${undeclared.length} file(s) in e2e/ compute a focus verdict from ` +
    `${FOCUS_PROPERTIES.join(" / ")} and are not on the declared inventory:\n\n${detail}\n\n` +
    `D-16's rule is ONE IMPORT SITE, and \`${CANONICAL}\` is it. Quoting that file's own header: ` +
    `"Two copies of a focus criterion is the drift that goes silent in the worst direction." The drift ` +
    `this prevents is specific and dated: the day DS-05 stops painting a \`ring-*\` — Tailwind renders ` +
    `it as a box-shadow, which is why these three property names travel together — ONE copy gets ` +
    `updated and the other keeps reporting GREEN about a mechanism that no longer exists. Nothing goes ` +
    `red at that moment. That is the failure mode, and it has no symptom.\n\n` +
    `THE FIX IS \`import { expectRing } from "${HELPER_IMPORT}"\`, and then assert on its answer. ` +
    `\`expectVisibleFocus\` in e2e/overflow-320.spec.ts:1035 is the worked example: it asks the same ` +
    `question this file was about to re-derive, and it asks it by calling the helper.\n\n` +
    `⚠ DO NOT FIX THIS BY ADDING A ROW TO DECLARED_DEFINITIONS. Every row there names a question ` +
    `\`expectRing\` CANNOT ask — a transparent-layer strip, a browser-default outline on the one ` +
    `element with no ring, a permanent scrim that satisfies the naive check. If the sentence you would ` +
    `write is "it checks whether focus is drawn", you are restating the criterion and the row is the ` +
    `duplication AC#20 forbids, filed where nobody will re-read it.`
  );
}

const scanned = collectSources(E2E_DIR);
const sources = new Map(scanned.map((f) => [f, readFileSync(resolve(process.cwd(), f), "utf8")]));
const readsByFile = new Map<string, Reads>();
for (const [file, raw] of sources) {
  const reads = classifyReads(raw);
  if (reads.verdict.length > 0 || reads.message.length > 0) readsByFile.set(file, reads);
}
const definitionFiles = [...readsByFile.entries()]
  .filter(([, r]) => r.verdict.length > 0)
  .map(([f]) => f)
  .sort();
/**
 * Files carrying at least one MESSAGE read. Note this is not "message-ONLY files": all three sites in
 * the tree both compute a verdict and print one, and asking for a file that only ever interpolates
 * would be asking for a file that does not exist. What has to be non-empty for the discriminator to be
 * doing anything is the MESSAGE side, wherever it lives.
 */
const messageReadFiles = [...readsByFile.entries()]
  .filter(([, r]) => r.message.length > 0)
  .map(([f]) => f)
  .sort();
const consumerFiles = scanned.filter((f) => f !== CANONICAL && callsHelper(sources.get(f) ?? "")).sort();

describe("AC#20 / D-16 — one focus-indicator definition in e2e/", () => {
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  // GUARD-THE-GUARD, THREE CLAUSES, BEFORE THE REAL ONE. `loading-coverage.test.ts:495-532`'s shape.
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  it("(a) scanned the tree it is supposed to be policing", () => {
    expect(
      scanned.length,
      `scanned ${scanned.length} .ts file(s) under ${rel(E2E_DIR)} — 45 measured 2026-08-29. A scan ` +
        `pointed at a tree that moved finds no second definition anywhere and reads exactly like a ` +
        `pass, which is the vacuity failure this repository has recorded eight times.`,
    ).toBeGreaterThanOrEqual(MIN_SCANNED_FILES);

    // Named, not merely counted: one file from each side of the classification, so a scan that found
    // 40 unrelated files cannot satisfy the floor above.
    expect(scanned).toContain(CANONICAL);
    expect(scanned).toContain("e2e/overflow-320.spec.ts");
  });

  it("(b) really read every file it counted", () => {
    for (const file of scanned) {
      const stripped = stripComments(sources.get(file) ?? "").trim();
      expect(
        stripped.length,
        `${file} stripped to zero source. A file that reads as empty contributes no definitions and ` +
          `no consumers — a broken read must be a NAMED failure here, never a silent zero downstream.`,
      ).toBeGreaterThan(0);
    }
  });

  it("(c) the classifier is discriminating over the real tree", () => {
    // Both lists non-empty, or one of the two assertions below is free.
    expect(
      definitionFiles,
      `no file in e2e/ was classified as defining a focus verdict — not even ${CANONICAL}, which is ` +
        `where the definition lives. The classifier is broken, not the tree.`,
    ).toContain(CANONICAL);

    expect(
      consumerFiles.length,
      `zero CONSUMERS found. Every assertion here would then be about a tree in which nobody uses the ` +
        `shared helper, which is not this one: ${consumerFiles.length} file(s) call it.`,
    ).toBeGreaterThan(0);

    // The specific consumer AC#20 must not mistake for a definition, asserted by name.
    expect(
      consumerFiles,
      `e2e/overflow-320.spec.ts stopped being recognised as a consumer. Its \`expectVisibleFocus\` ` +
        `calls \`readFocus\` and \`expectRing\` rather than restating the criterion.`,
    ).toContain("e2e/overflow-320.spec.ts");
    expect(
      definitionFiles,
      `e2e/overflow-320.spec.ts was flagged as a SECOND DEFINITION. It is not: it quotes DS-05's ` +
        `recipe in a docblock (:1017-1034) and calls the helper. This is the comment-blindness ` +
        `regression — \`stripComments\` is not running, or is running after the match.`,
    ).not.toContain("e2e/overflow-320.spec.ts");

    // And the message/verdict discriminator itself is exercised by the REAL tree, not only by the
    // fixtures below. e2e/avatar-crop.spec.ts:2605-2609 interpolates all three property names into a
    // failure string while taking its verdict from `sameIndicator` — if `${…}` context were not
    // tracked, those lines would read as verdicts and every consumer would be one message away from
    // being called a second definition.
    expect(
      messageReadFiles,
      `no MESSAGE read was found anywhere in e2e/, so the \`\${…}\` half of the classifier has never ` +
        `fired against real source. Either the substitution tracking is broken or the house style of ` +
        `printing the measured values into the failure changed — the first is a defect in this ` +
        `instrument, the second is a finding.`,
    ).toContain("e2e/avatar-crop.spec.ts");

    const cropReads = readsByFile.get("e2e/avatar-crop.spec.ts");
    expect(
      cropReads?.message.length ?? 0,
      `e2e/avatar-crop.spec.ts carries no message reads. :2605-2609 has three.`,
    ).toBeGreaterThan(0);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  // THE CLAIM.
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  it("every focus verdict in e2e/ is declared, with a reason", () => {
    expect(undeclaredViolation(readsByFile) ?? "").toBe("");
  });

  it("every declared site layers on the one definition instead of replacing it", () => {
    for (const file of definitionFiles) {
      if (file === CANONICAL) continue;
      expect(
        (sources.get(file) ?? "").includes(HELPER_IMPORT),
        `${file} defines a focus verdict but never imports \`${HELPER_IMPORT}\`. Every declared row ` +
          `on this inventory is a question layered ON TOP of \`expectRing\` — a file that reads the ` +
          `properties WITHOUT importing the helper is not layering, it is a second criterion, and ` +
          `D-16's one-import-site rule is the thing it breaks.`,
      ).toBe(true);
    }

    // The inventory is CLOSED in both directions: a declared row whose file stopped defining anything
    // is a stale row, and a stale exemption is how an allowlist grows quietly.
    for (const declared of Object.keys(DECLARED_DEFINITIONS)) {
      expect(
        definitionFiles,
        `${declared} is on DECLARED_DEFINITIONS but no longer computes a focus verdict. If it was ` +
          `refactored onto the helper — which is the good outcome — DELETE the row. An inventory ` +
          `carrying exemptions nobody needs is an inventory nobody reads.`,
      ).toContain(declared);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  // BOTH DIRECTIONS, on synthetic sources never written to disk, THROUGH THE SAME FUNCTIONS the real
  // assertions call — so the message above is demonstrably reachable and the classifier demonstrably
  // able to fail.
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  it("the classifier works in both directions", () => {
    // IS a second definition: reads a computed style into a pass/fail.
    const secondDefinition = [
      'import { test, expect } from "@playwright/test";',
      "test('the button rings', async ({ page }) => {",
      "  const drawn = await page.evaluate(() => {",
      "    const s = getComputedStyle(document.activeElement);",
      '    return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, boxShadow: s.boxShadow };',
      "  });",
      '  expect(drawn.boxShadow !== "none" || parseFloat(drawn.outlineWidth) > 0).toBe(true);',
      "});",
    ].join("\n");

    const defReads = classifyReads(secondDefinition);
    expect(defReads.verdict.length, "a real computed-style verdict was not detected").toBeGreaterThan(0);

    // ONLY LOOKS like one: DS-05's recipe quoted in prose, the property names interpolated into a
    // failure message, and the verdict taken from the shared helper. This is `expectVisibleFocus` and
    // `avatar-crop.spec.ts:2605` in miniature, and it must classify as a CONSUMER.
    const consumerOnly = [
      'import { expectRing, readFocus } from "./helpers/focus";',
      "/**",
      " * DS-05 draws a ring as a box-shadow, so a visible indicator is a non-`none` boxShadow or a",
      " * real outlineStyle with an outlineWidth. Quoted here on purpose.",
      " */",
      "export async function expectVisibleFocus(page, where) {",
      "  const reading = await readFocus(page); // outlineStyle / outlineWidth / boxShadow live here",
      "  expectRing(reading, where);",
      "  expect(sameIndicator(a, b), `${where}: outline ${reading.outlineStyle} ` +",
      "    `${reading.outlineWidth}, box-shadow ${reading.boxShadow}`).toBe(false);",
      "}",
    ].join("\n");

    const consumerReads = classifyReads(consumerOnly);
    expect(
      consumerReads.verdict,
      "a docblock quoting DS-05 plus a failure message interpolating the property names was " +
        "classified as a second definition — this is exactly the RED-against-correct-code failure " +
        "the header's classes (i) and (ii) describe.",
    ).toEqual([]);
    expect(
      consumerReads.message.length,
      "the message interpolations were not seen at all, so the discriminator is not discriminating — " +
        "it would report the same empty verdict list for a file that mentions nothing.",
    ).toBeGreaterThan(0);
    expect(callsHelper(consumerOnly)).toBe(true);

    // AND THE MESSAGE IS DRIVEN, both ways, through the function the real assertion uses.
    expect(undeclaredViolation(new Map([[CANONICAL, defReads]]))).toBeNull();

    const message = undeclaredViolation(new Map([["e2e/rogue-focus.spec.ts", defReads]]));
    expect(message).not.toBeNull();
    expect(message).toContain("e2e/rogue-focus.spec.ts");
    expect(message).toContain("D-16");
    expect(message).toContain('import { expectRing } from "./helpers/focus"');
    expect(message).toContain("DO NOT FIX THIS BY ADDING A ROW");
  });
});
