// D-03 — THE KNOWN-FAILURES ALLOWLIST IS CHECKED IN, EVERY ENTRY CARRIES A WRITTEN REASON, AND IT
// CANNOT SILENTLY GROW.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE IS FOR — the growth guard, not the entries
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// An allowlist without a growth guard is a quarantine queue. Playwright already fails closed in ONE
// direction for free: a `test.fail`-marked case that STARTS PASSING is reported as `Expected to fail,
// but passed` and exits non-zero (MEASURED 19.1-02, `evidence/testfail-behaviour.txt` Q2 — and it
// costs all three CI attempts, so a stale entry is not free either). Nothing in the runner fails
// closed in the OTHER direction: nothing stops a new entry being added. That direction is what this
// file builds, by pinning the entry TOTAL to a named constant that only a deliberate edit can move.
//
// ── WHY A PINNED COUNT IN A DESIGN TEST RATHER THAN A CUSTOM REPORTER ─────────────────────────────
//
// The interlock, and it is the whole argument (19.1-RESEARCH.md § D-03, options A vs D):
//
//   1. this census runs in the design suite            `vitest.design.config.ts`
//   2. the design suite runs inside the build          `package.json` → `"build"` runs `test:design`
//   3. the build runs as a step of `gate-db-free`      `.github/workflows/ci.yml`
//   4. `gate-db-free` becomes a required status check  19.1-15
//
// So the guard inherits every protection this phase built — the constrained job, the workflow
// invariants, the required check — and adds ZERO new machinery to the gate that carries the
// money-path specs. A reporter would be ~120 lines of new code on exactly that gate.
//
// ── WHY IT IS BUILD-BLOCKING AND DB-FREE, AND WHY NO CONFIG EDIT WAS MADE ─────────────────────────
//
// `vitest.design.config.ts` collects `tests/design/**/*.test.ts`, declares no `globalSetup` and no
// `setupFiles`. A new file in this directory is collected AUTOMATICALLY: no config edit is needed for
// this one, and none is permitted — adding either of those two keys is what would reintroduce the
// Docker dependency that config exists to exclude. (Same rule stated at
// `tests/design/workflow-invariants.test.ts:63-70` and `tests/design/e2e-email-silence.test.ts:24-31`.)
//
// ── WHAT AN ENTRY IS, SPELLED OUT SO THE COUNT IS UNAMBIGUOUS ─────────────────────────────────────
//
// An ENTRY is a call to `test.fail(` or `test.fixme(` in a file under `e2e/` — the two annotations
// that make a red test stop failing the run. `test.skip(condition, reason)` is deliberately NOT an
// entry: this repository uses it for rows a fixture cannot reach (`e2e/overflow-320.spec.ts:925`,
// `e2e/one-tree.spec.ts:734`, `e2e/visual/surfaces.spec.ts:414`), each throwing its own reason into
// the run's output. Counting those would conflate a documented unreachable row with a quarantined
// failure and would make the pinned total move for reasons that have nothing to do with D-03.
// ⚠ On the FORBIDDEN files below the rule is stricter and covers all three forms, because D-01's
// prohibition is written that way.
//
// ── THE FOUR WATCHED REDS ─────────────────────────────────────────────────────────────────────────
//
// An absence assertion cannot notice that its own subject is gone, so each assertion here was driven
// red before it was trusted. Each mutation was applied alone to the TRACKED tree, observed, and
// reverted with a checksum pair; the full transcripts, with the revert proofs, are in
// `.planning/phases/19.1-…/evidence/known-failures-census.txt`.
//
//   (a) ADD an annotation to `e2e/tabular-figures.spec.ts`'s grove case, with a condition and a long
//       enough reason, WITHOUT moving the pinned constant → 1 failed / 6 passed, on the COUNT
//       assertion: *"The allowlist holds 3 entries (e2e/avatar-crop.spec.ts:1125,
//       e2e/tabular-figures.spec.ts:416, e2e/tabular-figures.spec.ts:454) but `PINNED_ENTRY_TOTAL` in
//       this file is 2."* The message names the constant and states the order — reason first, number
//       second. A well-formed entry is still a red one.
//   (b) REPLACE an existing entry's reason with an indirection (a template literal) → 1 failed /
//       6 passed, on the REASON assertion: *"Entry whose reason is not a plain string literal:
//       e2e/tabular-figures.spec.ts:416"*, with the message naming variables, template literals,
//       helper calls and imported constants as the shapes it rejects.
//   (c) ADD an annotation to `e2e/cancel.spec.ts` → 2 failed / 5 passed. The FORBIDDEN-FILE assertion
//       fires by name: *"e2e/cancel.spec.ts carries an allowlist entry, and D-01 forbids it
//       PERMANENTLY: it sits on the refund path …"*, and the count assertion fires alongside it. Two
//       independent guards catch this one, which is the intended shape for the money path.
//   (d) BREAK the scan — point `SPEC_ROOT` at `e2e/helpers`, a real directory with no spec files →
//       4 failed / 3 passed, the FIRST being the non-vacuity assertion: *"The walk over
//       `e2e/helpers/` found ZERO spec files. That is not a clean tree — it is a BROKEN SCAN …"*. The
//       comment-stripping proof fails closed in the same run, so a broken scan cannot report either a
//       clean tree or a proven strip.
//
// Each mutation was reverted with a `git hash-object` pair and a `git status --porcelain` proof, and
// the file was green (7 passed) after each.
//
// ── THE TWO ADDED BY 19.1-REVIEW.md WR-03, AND THE ONE THAT MUST STAY GREEN ───────────────────────
//
// WR-03's measurement: the four reds above are all about the TOTAL, and a total is only half a pin.
// Both vectors below were run against the TRACKED tree with `PINNED_ENTRY_TOTAL` untouched at 2 and
// with both pinned paths still present and still walked, and BOTH were GREEN at 7 passed before the
// two assertions named below existed — a guard whose name is "the allowlist cannot silently grow"
// passing over a quarantine that had MOVED. Transcripts, with the applied-count beside every
// mutation and a sha256 revert pair: `evidence/guards-review-wr01-02-03-05-{pre,post}-fix.txt`.
//
//   (e) SUBSTITUTION — the entry leaves `e2e/tabular-figures.spec.ts` and an equally well-formed one
//       appears in `e2e/price-parity.spec.ts`, which is not a pinned path and not a forbidden one.
//       Count unchanged at 2. Caught by the CONTAINMENT test ("every allowlist entry lives in a spec
//       `PINNED_ENTRY_SPECS` names") — and, because the vacated spec is also a pinned one, by the
//       OCCUPANCY test beside it. Each was proved to catch it ALONE by loosening the other.
//   (f) COLLAPSE — the same entry moves into `e2e/avatar-crop.spec.ts`, the OTHER pinned spec, so
//       both entries now live in one file. Count unchanged at 2 and containment still holds, because
//       every entry is in a pinned path. Caught by the OCCUPANCY test only. It is why containment
//       alone is not the whole repair: `PINNED_ENTRY_SPECS` is a list of WHERE, and a `⊆` assertion
//       cannot notice that one of the wheres is now empty.
//   (g) POSITIVE CONTROL, WHICH MUST STAY GREEN — the entry moves to a DIFFERENT LINE of the same
//       spec. Verified green at 7 passed. The pin is over PATHS on purpose (see
//       `PINNED_ENTRY_SPECS`' docblock), and a guard that reddened on an unrelated edit above an
//       entry is a guard people delete. An allow-list with no legitimate member is a red-only
//       instrument, and a red-only instrument gets widened by the first person it inconveniences.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { stripComments } from "../helpers/source-text";

/** The directory the walk covers. Every Playwright spec in this repository lives under it. */
const SPEC_ROOT = "e2e";

/**
 * THE PINNED ENTRY TOTAL. The list can only grow by a deliberate edit to THIS NUMBER, inside a test
 * the build runs — and the entry's reason is written at its call site BEFORE the number moves, never
 * after. The number is a record of a decision, not the mechanism for making one.
 *
 * ⚠ IT IS A SUM OF WHAT EARLIER PLANS RECORDED, NOT A SURVEY. 19.1-08, 19.1-10 and 19.1-11 each
 * decided a route per failure and wrote the surviving annotations down; this is their total. If the
 * census and the sum ever disagree, the census is right about the tree and the discrepancy is
 * investigated rather than reconciled by editing this constant.
 *
 * THE ENTRIES, EACH WITH ITS REASON IN ONE CLAUSE (line numbers are as of 19.1-11 and are indicative
 * only — they move, and nothing here asserts them):
 *
 *   1. `e2e/avatar-crop.spec.ts:1125` — "Escape, the overlay click and the close control all do
 *      nothing while a save is in flight". Needs a live Cloudinary credential in the SERVER process
 *      for the save to land; `ci.yml` cannot carry one, because a shipped invariant
 *      (`scripts/verify-workflows.mjs:813`) asserts zero `secrets.` references in any job and the
 *      repository is being published (D-07/D-08). Only the round-trip assertion is unreachable; it is
 *      covered by `tests/profile/avatar.test.ts:137` and `tests/profile/avatar-field.test.tsx:309`.
 *      Recorded by 19.1-10, `evidence/triage-upload-capability.txt`.
 *
 *   2. `e2e/tabular-figures.spec.ts:416` — "(1) court — the reference lines up, and the money pair is
 *      measured". `tabular-nums` equalises the digit advances exactly on a developer machine and
 *      leaves exactly 1px per digit in `mcr.microsoft.com/playwright:v1.60.0-noble`, measured with the
 *      identical tree, CSS and font asset served by ONE dev server to both renderers — a RENDERER
 *      capability gap, not a product property. Recorded by 19.1-11,
 *      `evidence/known-failures-census.txt`; corroborated by 19.1-09,
 *      `evidence/triage-skeleton-geometry.txt` §5 (the same image quantising glyph advances).
 *
 * ⚠ TWO FAILURES THAT ARE DELIBERATELY NOT HERE, because "it was on the fourteen-failure list" is not
 * the same claim as "it is an entry":
 *   • `e2e/host-headings.spec.ts` — a SPEC DEFECT, REPAIRED by 19.1-08. A repaired defect is not an
 *     annotation candidate, and this list does not grow for it.
 *   • `e2e/tabular-figures.spec.ts`'s "(2) grove" case — MEASURED PASSING in the container (19.1-11,
 *     `evidence/known-failures-census.txt` §1e). An entry for it would have been a false reason AND an
 *     unexpected pass, which fails the run by name and burns all three attempts.
 */
const PINNED_ENTRY_TOTAL = 2;

/**
 * The same two entries as data, so the docblock above and the number above cannot drift apart
 * silently: a test below asserts this table's length equals `PINNED_ENTRY_TOTAL`, and another asserts
 * every path in it resolves.
 *
 * Paths only — NOT line numbers. Line numbers move on any edit above them (19.1-08, 19.1-10 and this
 * plan each found a cited `:NNN` had drifted), and a guard that reddens on an unrelated edit is a
 * guard people delete.
 *
 * ⚠ THIS TABLE IS ASSERTED IN BOTH DIRECTIONS, AND THAT IS WHAT MAKES IT A LOCATION PIN RATHER THAN A
 * SECOND COPY OF THE COUNT (19.1-REVIEW.md WR-03). Three assertions run over it, and together they
 * are a BIJECTION rather than three separate softer claims:
 *
 *   • `PINNED_ENTRY_SPECS.length === PINNED_ENTRY_TOTAL`   — this table and that number agree;
 *   • every collected entry's spec IS in this table         — CONTAINMENT, so an entry cannot appear
 *                                                             anywhere this table does not name;
 *   • every path in this table CARRIES an entry             — OCCUPANCY, so an entry cannot quietly
 *                                                             vacate a named path either.
 *
 * With the total pinned at 2 and the table holding 2 paths, those three force exactly one entry per
 * listed path. Drop either of the last two and a SUBSTITUTION at an unchanged total goes green: that
 * was WR-03's measurement, reproduced against the tracked tree before the two tests were written
 * (header, watched reds (e) and (f)).
 *
 * ⚠ IF A FUTURE ENTRY LEGITIMATELY SHARES A FILE WITH AN EXISTING ONE, the bijection is what will go
 * red, and the correct response is to say so here — this table becomes a list of paths with a stated
 * multiplicity, and the length assertion above changes with it. The wrong response is to delete the
 * occupancy test, which is the only thing standing between this list and a quarantine that has moved.
 */
const PINNED_ENTRY_SPECS = [
  "e2e/avatar-crop.spec.ts",
  "e2e/tabular-figures.spec.ts",
] as const;

/**
 * D-01 — FILES THAT MAY NEVER CARRY AN ALLOWLIST ENTRY, WITH THE DECISION BESIDE THEM.
 *
 * Quoted from 19.1-07, `evidence/triage-cancel-refund.txt`'s `PROHIBITION` line, which is the recorded
 * source rather than a recollection of a conversation:
 *
 *   "`e2e/cancel.spec.ts` is PERMANENTLY INELIGIBLE for the known-failures allowlist, by D-01. It sits
 *    on the refund path, and D-01 names it as the specific test whose quarantine was rejected: a green
 *    badge sitting on top of an unverified refund behaviour is the exact failure mode this phase exists
 *    to prevent. A failure in this file is repaired or left red — never annotated with `test.fail`,
 *    never `test.fixme`, never `test.skip`, never grep-excluded from `gate-e2e`, and never recorded in
 *    any allowlist entry."
 *
 * ⚠ THE PROHIBITION IS ENCODED HERE PRECISELY BECAUSE IT ALSO LIVES IN THAT FILE. 19.1-07 added a
 * docblock to `e2e/cancel.spec.ts` citing D-01 four times; if a future round strips that docblock, the
 * citation goes with it. A prohibition that lives only in the file it protects is deleted by the same
 * edit it was meant to stop — so it is ALSO asserted from out here, against a PATH rather than a
 * comment.
 */
const FORBIDDEN_ENTRY_FILES = [
  {
    spec: "e2e/cancel.spec.ts",
    decision: "D-01",
    why: "it sits on the refund path",
  },
] as const;

/**
 * The floor a reason must clear. A reason is read AT THE CALL SITE by whoever is deciding whether the
 * entry still deserves to exist, and "flaky" or "fails in CI" tells that reader nothing. 120
 * characters is roughly one sentence plus one citation, which is the shortest thing that can carry
 * both the capability that is missing and where the evidence for it lives.
 */
const MIN_REASON_LENGTH = 120;

/**
 * A KNOWN fixture with a KNOWN entry count, so the pattern itself is proved to still match. Without
 * this, a pattern that stopped matching would report a clean tree and every assertion below would pass
 * over nothing.
 *
 * Three annotation calls, one of them inside a comment: the stripped scan must find TWO and the raw
 * scan THREE.
 */
const PATTERN_FIXTURE = [
  'test.fail(!!process.env.CI, "a fixture entry, with a condition and a reason long enough to be a real one");',
  '  // test.fixme(!!process.env.CI, "a fixture entry that lives in a COMMENT and must not be counted");',
  'test.fixme(!!process.env.CI, "a second fixture entry, written in the other annotation form");',
].join("\n");
const PATTERN_FIXTURE_STRIPPED_ENTRIES = 2;
const PATTERN_FIXTURE_RAW_ENTRIES = 3;

/** The two annotations that make a red test stop failing the run. See the header for why not `skip`. */
const ENTRY_PATTERN = /\btest\.(fail|fixme)\s*\(/g;

/** All three forms, for the forbidden files only — D-01's prohibition names each of them. */
const ANY_ANNOTATION_PATTERN = /\btest\.(fail|fixme|skip)\s*\(/g;

/** Read a repo-relative file as text. */
function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

/** Repo-relative path with forward slashes, so a comparison means the same thing on both platforms. */
function normalise(relativePath: string): string {
  return relativePath.split("\\").join("/");
}

/**
 * Comment removal that PRESERVES LINE STRUCTURE, by blanking each comment character rather than
 * deleting it.
 *
 * ⚠ WHY THIS EXISTS ALONGSIDE THE SHARED HELPER RATHER THAN INSTEAD OF IT. `stripComments`
 * (`tests/helpers/source-text.ts:57`) DELETES block comments, newlines included, so every line number
 * after the first docblock would be wrong — and this census reports entries BY LINE. The shared helper
 * therefore stays the authority on what counts as code, and a test below asserts that this function
 * removes exactly the same content it does (identical text once whitespace is discarded). If the two
 * ever disagree, that assertion is red and this local variant is the one that is wrong.
 */
function blankComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (m) => " ".repeat(m.length));
}

/** Every `*.spec.ts` under `e2e/`, recursively, as normalised repo-relative paths. */
function specFiles(dir: string = SPEC_ROOT, out: string[] = []): string[] {
  const absolute = resolve(process.cwd(), dir);
  if (!existsSync(absolute)) return out;
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) specFiles(rel, out);
    else if (entry.name.endsWith(".spec.ts")) out.push(normalise(rel));
  }
  return out.sort();
}

type Entry = {
  spec: string;
  line: number;
  form: string;
  condition: string;
  reason: string;
  reasonIsStringLiteral: boolean;
};

/**
 * The argument expressions of a call whose `(` is at `open`, split at the TOP level only — so a
 * comma inside a nested call, an object, an array or a string does not split an argument. Returns
 * `null` if the call is unterminated, which a syntactically valid file cannot produce.
 */
function callArguments(source: string, open: number): string[] | null {
  const args: string[] = [];
  let current = "";
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;

  for (let i = open; i < source.length; i++) {
    const ch = source[i];

    if (quote !== null) {
      current += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
      if (depth > 1) current += ch;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      if (depth === 0) {
        args.push(current);
        return args.map((a) => a.trim());
      }
      current += ch;
      continue;
    }
    if (ch === "," && depth === 1) {
      args.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  return null;
}

/**
 * The text of an expression that is a concatenation of STRING LITERALS ONLY, and whether it is one.
 *
 * The residue test is the sharp half: once every `"…"`/`'…'` literal is removed, nothing may remain
 * but whitespace and `+`. A template literal leaves its backticks, a variable leaves its identifier
 * and a call leaves its parentheses — so all three are rejected, which is what "the reason is readable
 * at the call site" requires.
 */
function stringLiteralConcatenation(expression: string): {
  ok: boolean;
  text: string;
} {
  const literal = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
  let text = "";
  for (const match of expression.matchAll(literal))
    text += match[1] ?? match[2] ?? "";
  const residue = expression.replace(literal, "");
  return { ok: text.length > 0 && /^[\s+]*$/.test(residue), text };
}

/** Every allowlist entry in one file's text, in line order. `code` must be line-preserving. */
function entriesIn(spec: string, code: string): Entry[] {
  const found: Entry[] = [];
  for (const match of code.matchAll(ENTRY_PATTERN)) {
    const at = match.index ?? 0;
    const open = at + match[0].length - 1;
    const args = callArguments(code, open) ?? [];
    const reasonExpression = args[1] ?? "";
    const literal = stringLiteralConcatenation(reasonExpression);
    found.push({
      spec,
      line: code.slice(0, at).split("\n").length,
      form: `test.${match[1]}`,
      condition: (args[0] ?? "").trim(),
      reason: literal.ok ? literal.text : reasonExpression,
      reasonIsStringLiteral: literal.ok,
    });
  }
  return found;
}

/**
 * The whole allowlist, sorted by spec path then by line so the reported order is DETERMINISTIC — a
 * diff of this file's failure output between two runs then reflects a real change in the allowlist
 * rather than filesystem enumeration order.
 *
 * @param strip pass `false` to scan the raw text, which is how the stripping is proved load-bearing.
 */
function collectEntries(strip = true): Entry[] {
  const entries: Entry[] = [];
  for (const spec of specFiles()) {
    const source = readSource(spec);
    entries.push(...entriesIn(spec, strip ? blankComments(source) : source));
  }
  return entries.sort((a, b) =>
    a.spec === b.spec ? a.line - b.line : a.spec < b.spec ? -1 : 1,
  );
}

/** `spec:line` — the form every failure message below reports an entry in. */
function locate(entry: Entry): string {
  return `${entry.spec}:${entry.line}`;
}

describe("D-03 — the known-failures allowlist cannot silently grow", () => {
  it("the scan reached real spec files AND the entry pattern still matches (non-vacuity, both halves)", () => {
    const files = specFiles();

    expect(
      files.length,
      `The walk over \`${SPEC_ROOT}/\` found ZERO spec files. That is not a clean tree — it is a ` +
        "BROKEN SCAN, and a broken scan reports an empty allowlist that looks exactly like a genuinely " +
        "empty one. Every assertion below would then be passing over nothing. Fix the walk (or the " +
        "directory constant) rather than trusting the green.",
    ).toBeGreaterThan(0);

    // The sharper half of the same guard: the two files that DO carry entries must be among the walked
    // files. A walk that reached a non-zero number of the WRONG files would clear the count above.
    const missing = PINNED_ENTRY_SPECS.filter((spec) => !files.includes(spec));
    expect(
      missing,
      `The walk did not reach ${missing.join(", ")}, which the pinned docblock names as carrying an ` +
        "entry. Either the walk stopped covering part of `e2e/`, or those specs were moved or deleted " +
        "without this file's constants moving with them. Both are silent no-ops otherwise.",
    ).toEqual([]);

    const fixtureStripped = entriesIn(
      "fixture.spec.ts",
      blankComments(PATTERN_FIXTURE),
    );
    expect(
      fixtureStripped.length,
      "The entry pattern matched a different number of entries in the KNOWN fixture than the fixture " +
        `contains (${PATTERN_FIXTURE_STRIPPED_ENTRIES} outside comments). The pattern has stopped ` +
        "recognising an annotation, so a real allowlist could grow without this file noticing. This " +
        "assertion is the only thing standing between a broken pattern and a clean-looking tree.",
    ).toBe(PATTERN_FIXTURE_STRIPPED_ENTRIES);

    expect(
      entriesIn("fixture.spec.ts", PATTERN_FIXTURE).length,
      "The RAW scan of the known fixture found a different number of annotation calls than the " +
        `fixture contains (${PATTERN_FIXTURE_RAW_ENTRIES} including the one inside a comment). The ` +
        "fixture's third call is what makes the stripping check below meaningful, so this number and " +
        "the one above must differ by exactly the commented-out call.",
    ).toBe(PATTERN_FIXTURE_RAW_ENTRIES);
  });

  it("the entry total equals the pinned constant, and the entries are reported in a deterministic order", () => {
    const entries = collectEntries();

    expect(
      entries.map(locate),
      `The allowlist holds ${entries.length} entr${entries.length === 1 ? "y" : "ies"} ` +
        `(${entries.map(locate).join(", ") || "none"}) but \`PINNED_ENTRY_TOTAL\` in this file is ` +
        `${PINNED_ENTRY_TOTAL}.\n` +
        "THE LIST CAN ONLY GROW BY A DELIBERATE EDIT TO THAT NUMBER, and the order matters: write the " +
        "new entry's REASON at its call site first, then move the number, then add its clause to the " +
        "constant's docblock. The number is the RECORD of a decision, not the mechanism for making " +
        "one. If the count went DOWN, an entry was repaired or removed — delete its docblock clause in " +
        "the same commit, or the next reader inherits a list that claims a quarantine that no longer " +
        "exists.\n" +
        "⚠ If the entry you are adding lives on a money path, read `FORBIDDEN_ENTRY_FILES` before you " +
        "touch this number at all.",
    ).toHaveLength(PINNED_ENTRY_TOTAL);

    // The docblock and the number are two records of one fact; this is what stops them drifting.
    expect(
      PINNED_ENTRY_SPECS.length,
      "`PINNED_ENTRY_SPECS` and `PINNED_ENTRY_TOTAL` disagree. They are two records of the same list — " +
        "the number the census asserts and the paths its docblock names — so a change to one without " +
        "the other means the docblock no longer describes the count.",
    ).toBe(PINNED_ENTRY_TOTAL);

    const sorted = [...entries].sort((a, b) =>
      a.spec === b.spec ? a.line - b.line : a.spec < b.spec ? -1 : 1,
    );
    expect(
      entries.map(locate),
      "The collected entries are not in path-then-line order, so this file's failure output would " +
        "depend on filesystem enumeration order and a diff between two runs would not mean a change " +
        "in the allowlist.",
    ).toEqual(sorted.map(locate));
  });

  // ── WHERE THE ENTRIES ARE, WHICH THE TOTAL ABOVE CANNOT SEE (19.1-REVIEW.md WR-03) ──────────────
  //
  // These two are deliberately SEPARATE `it` blocks rather than two more `expect`s inside the count
  // test, and the reason is the one-to-one proof: a conjunct that shares a case with another cannot
  // be shown to be the thing that caught a given mutation. Loosening either one alone leaves the
  // substitution vector caught by exactly one named case (header, (e) and (f)).

  it("every allowlist entry lives in a spec `PINNED_ENTRY_SPECS` NAMES — a substitution at an unchanged total is red", () => {
    const entries = collectEntries();

    const unpinned = [...new Set(entries.map((e) => e.spec))].filter(
      (spec) => !(PINNED_ENTRY_SPECS as readonly string[]).includes(spec),
    );
    expect(
      unpinned,
      `Allowlist entr${unpinned.length === 1 ? "y lives" : "ies live"} in ${unpinned.join(", ") || "(none)"}, ` +
        "which `PINNED_ENTRY_SPECS` does not name.\n" +
        `THE TOTAL IS ONLY HALF THE PIN. An entry deleted from one spec and added to another keeps the ` +
        `count at ${PINNED_ENTRY_TOTAL}, keeps both pinned paths resolvable, and keeps them walked — ` +
        "so every other assertion in this file stays green while the docblock above describes a " +
        "quarantine that has MOVED. That is a guard whose name (\"the allowlist cannot silently " +
        "grow\") is satisfiable by a silent SUBSTITUTION, which is the same defect shape one level up " +
        "from the count.\n" +
        "THE CORRECT RESPONSE: write the new entry's clause into `PINNED_ENTRY_TOTAL`'s docblock and " +
        "add its path to `PINNED_ENTRY_SPECS`, in the same commit as the annotation itself. If the " +
        "entry moved because a spec was RENAMED, move the path here instead — same commit, same rule. " +
        "⚠ If the spec named above sits on a money path, read `FORBIDDEN_ENTRY_FILES` before you add " +
        "anything at all.",
    ).toEqual([]);
  });

  it("every spec `PINNED_ENTRY_SPECS` names STILL CARRIES an entry — a pinned path cannot quietly empty", () => {
    const entries = collectEntries();

    const carrying = new Set(entries.map((e) => e.spec));
    const vacated = PINNED_ENTRY_SPECS.filter((spec) => !carrying.has(spec));
    expect(
      vacated,
      `\`PINNED_ENTRY_SPECS\` names ${vacated.join(", ") || "(none)"}, which carr${vacated.length === 1 ? "ies" : "y"} ` +
        "no allowlist entry at all.\n" +
        "THE OTHER HALF OF THE LOCATION PIN, and containment cannot see it: if BOTH entries end up in " +
        "ONE of the two pinned specs, every entry is still in a named path, the count is still " +
        `${PINNED_ENTRY_TOTAL}, and a quarantine has still moved. Containment is \`⊆\`; this is the ` +
        "`⊇` that turns the pair into an identity.\n" +
        "THE CORRECT RESPONSE, and it depends on WHY the path emptied. If the failure was REPAIRED — " +
        "which is the outcome this phase wants — delete its clause from `PINNED_ENTRY_TOTAL`'s " +
        "docblock, remove its path here, and move the number DOWN, all in the same commit; the next " +
        "reader must not inherit a list claiming a quarantine that no longer exists. If the entry " +
        "merely MOVED, put it back or record where it went. Never satisfy this by adding a fresh " +
        "annotation to the vacated file.",
    ).toEqual([]);
  });

  it("every entry carries a reason that is a STRING LITERAL and long enough to be read", () => {
    const entries = collectEntries();

    const notLiteral = entries.filter((e) => !e.reasonIsStringLiteral);
    expect(
      notLiteral.map(locate),
      `Entr${notLiteral.length === 1 ? "y" : "ies"} whose reason is not a plain string literal: ` +
        `${notLiteral.map((e) => `${locate(e)} → \`${e.reason}\``).join("; ")}.\n` +
        "THE REASON IS READ AT THE CALL SITE by whoever is deciding whether this entry still deserves " +
        "to exist, so an indirection — a variable, a template literal, a helper call, a constant " +
        "imported from elsewhere — defeats the only thing the reason is for. Concatenated literals " +
        '(`"…" + "…"`) are fine and are what the existing entries use; anything that has to be ' +
        "resolved by reading a second file is not.",
    ).toEqual([]);

    const tooShort = entries.filter(
      (e) =>
        e.reasonIsStringLiteral && e.reason.trim().length < MIN_REASON_LENGTH,
    );
    expect(
      tooShort.map((e) => `${locate(e)} (${e.reason.trim().length} chars)`),
      `Entr${tooShort.length === 1 ? "y" : "ies"} whose reason is shorter than ` +
        `${MIN_REASON_LENGTH} characters.\n` +
        "A reason must name the CAPABILITY, INVARIANT or MEASUREMENT that makes the failure expected, " +
        'and where the evidence for it lives. "flaky", "fails in CI" and "known issue" are the ' +
        "shapes this floor exists to reject: they turn the allowlist into a quarantine queue that " +
        "nobody can ever empty, because nobody can tell what would have to change.",
    ).toEqual([]);
  });

  it("every entry carries a CONDITION, so the test still runs and still asserts locally", () => {
    const entries = collectEntries();

    const unconditional = entries.filter(
      (e) =>
        e.condition === "" ||
        /^true$/i.test(e.condition) ||
        /^["'`]/.test(e.condition),
    );
    expect(
      unconditional.map(locate),
      `Bare or unconditional annotation(s): ${unconditional.map(locate).join(", ")}.\n` +
        "A BARE ANNOTATION HIDES THE BEHAVIOUR EVERYWHERE, including on the developer machine where " +
        "the missing capability is PRESENT and the assertion is meaningful. Every entry in this " +
        "allowlist exists because something is absent in ONE environment; the annotation must be " +
        "false exactly where that thing exists. Pass a condition — `!!process.env.CI` is what the " +
        "existing entries use, and 19.1-10 recorded why the condition is `CI` rather than a probe for " +
        "the credential itself.",
    ).toEqual([]);
  });

  it("no entry lives in a file D-01 forbids, and none of those files carries any annotation at all", () => {
    const entries = collectEntries();

    for (const forbidden of FORBIDDEN_ENTRY_FILES) {
      const offending = entries.filter((e) => e.spec === forbidden.spec);
      expect(
        offending.map(locate),
        `${forbidden.spec} carries an allowlist entry, and ${forbidden.decision} forbids it ` +
          `PERMANENTLY: ${forbidden.why}, and a green badge sitting on top of an unverified refund ` +
          "behaviour is the exact failure mode this phase exists to prevent. A failure in this file " +
          "is REPAIRED or LEFT RED — never annotated, never grep-excluded, never allowlisted. Remove " +
          "the annotation; do not move `PINNED_ENTRY_TOTAL` to accommodate it.",
      ).toEqual([]);

      // Stricter than the entry rule, because D-01 names all three forms by hand.
      const source = blankComments(readSource(forbidden.spec));
      const anyAnnotation = [...source.matchAll(ANY_ANNOTATION_PATTERN)].map(
        (m) =>
          `${forbidden.spec}:${source.slice(0, m.index ?? 0).split("\n").length} (${m[0]})`,
      );
      expect(
        anyAnnotation,
        `${forbidden.spec} carries a test annotation. ${forbidden.decision} names each form it ` +
          'forbids: "never annotated with `test.fail`, never `test.fixme`, never `test.skip`, never ' +
          'grep-excluded from `gate-e2e`, and never recorded in any allowlist entry". `test.skip` is ' +
          "included here — and only here — because on this file a skipped case and a quarantined one " +
          "buy the same false green over the same refund path.",
      ).toEqual([]);
    }
  });

  it("every path this file names resolves to a real file — a stale path is a silent no-op", () => {
    const walked = specFiles();

    const unresolved: string[] = [];
    for (const spec of [
      ...PINNED_ENTRY_SPECS,
      ...FORBIDDEN_ENTRY_FILES.map((f) => f.spec),
      ...collectEntries().map((e) => e.spec),
    ]) {
      const absolute = resolve(process.cwd(), spec);
      if (!existsSync(absolute) || !statSync(absolute).isFile())
        unresolved.push(spec);
    }
    expect(
      [...new Set(unresolved)],
      `Path(s) named in this file that do not resolve: ${[...new Set(unresolved)].join(", ")}.\n` +
        "A STALE PATH IS A SILENT NO-OP: the forbidden-file assertion would pass over a file that no " +
        "longer exists at that name, and the pinned docblock would describe entries nobody can find. " +
        "If a spec was renamed or moved, move its path here in the same commit.",
    ).toEqual([]);

    const forbiddenOutsideWalk = FORBIDDEN_ENTRY_FILES.map(
      (f) => f.spec,
    ).filter((spec) => !walked.includes(spec));
    expect(
      forbiddenOutsideWalk,
      `Forbidden file(s) outside the walk: ${forbiddenOutsideWalk.join(", ")}. The prohibition is ` +
        "enforced against the collected entries, so a forbidden file the walk never visits is a " +
        "prohibition that cannot fire.",
    ).toEqual([]);
  });

  it("comment-stripping is LOAD-BEARING here, not decorative — and it agrees with the shared helper", () => {
    const stripped = collectEntries();
    const raw = collectEntries(false);

    // Direction 1: the strip must actually remove something, or the whole file could be counting prose.
    expect(
      raw.length,
      "The stripped and the raw scans found the SAME number of entries, so comment removal is " +
        "currently proving nothing and this file's central claim — that it counts CODE and not the " +
        "docblocks discussing the code — is unproven. The tree today contains at least one annotation " +
        "call written INSIDE a comment (`e2e/avatar-crop.spec.ts` discusses `test.fail()` in prose " +
        "above its own entry). If that prose has been edited away, re-point this assertion at whatever " +
        "prose remains, or delete it deliberately rather than letting it quietly stop proving " +
        "anything. Without the strip, the allowlist could GROW INSIDE A COMMENT.",
    ).toBeGreaterThan(stripped.length);

    // Direction 2, and it is the sharp one: this local blanker preserves line numbers, which the shared
    // helper cannot. It must remove EXACTLY what the shared helper removes, or "we strip with the
    // repository's helper" would be a claim about a function this file does not actually use.
    const disagreements = specFiles().filter((spec) => {
      const source = readSource(spec);
      const compact = (text: string) => text.replace(/\s+/g, "");
      return compact(blankComments(source)) !== compact(stripComments(source));
    });
    expect(
      disagreements,
      `\`blankComments\` and the shared \`stripComments\` disagree on: ${disagreements.join(", ")}.\n` +
        "The shared helper (`tests/helpers/source-text.ts:57`) is the AUTHORITY on what counts as " +
        "code in this repository; the local variant exists only because the shared one deletes " +
        "newlines and this census reports entries BY LINE. When they disagree, the local one is the " +
        "one that is wrong — fix it here, do not fork the definition of a comment.",
    ).toEqual([]);
  });
});
