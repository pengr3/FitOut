// GATE-01's static half: a visual-regression baseline generated on Windows or macOS can never be
// committed. BOTH HALVES — the rules exist in `.gitignore`, AND git tracks zero files matching them.
//
// ⚠ AMENDED BY PLAN 17-02: THIS FILE NOW HAS A THIRD CLAUSE, AND IT IS ABOUT THE THEME SEGMENT RATHER
// THAN THE PLATFORM ONE. AC#26 has two halves and they read the same filenames from opposite ends, so
// the D-138 court-only rule is asserted at the bottom of this file rather than in a sibling — see the
// banner above `describe("GATE-01 / D-138 …")`, which carries its own argument for why that half scans
// the filesystem where the two above it ask git. Everything between here and there is about platforms
// and is unchanged; read the paragraphs below with "half 1" and "half 2" meaning the platform pair.
//
// It runs under `tests/design/**`, so it is DB-free and executes inside `npm run build`
// (`package.json` → `"build": "npm run lint && npm run test:design && next build"`).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS ONE CLAUSE OF GATE-01 GETS A STANDING TEST AND THE OTHER TWO DO NOT (D-30)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-30 splits GATE-01's proof BY KIND, because the three things it promises fail in different ways:
//
//   • "a missing baseline fails CI"  — DYNAMIC. It is triggered deliberately once, watched, and the
//   • "a few-pixel shift fails CI"     verbatim output committed. Both belong to plan `11-22`, which
//                                      is the plan that shoots the baselines and wires the comparison.
//                                      (The 11-03 plan text points at `11-21` for these; `11-21` is the
//                                      shell/overflow measurement plan and touches nothing visual.
//                                      `11-22`'s own `must_haves` claim both REDs. Corrected here.)
//
//   • "a non-Linux baseline is never committed" — STATIC, AND ABLE TO REGRESS IN SILENCE. Nothing runs
//     when somebody deletes a `.gitignore` line, and nothing runs when somebody reaches for `git add -f`
//     because "the file is ignored but I need it". Both are one-keystroke edits with NO SYMPTOM: the
//     suite stays green, CI stays green, and the damage only surfaces later as a comparison failing
//     against a reference nobody else can reproduce. An absence with no symptom is exactly the case
//     `tests/design/scaffold-residue.test.ts:16-20` argues needs a permanent test rather than a
//     one-off edit — "a deletion has no symptom".
//
// The rules match real filenames. Measured (11-RESEARCH § GATE-01 Finding 1): Playwright's baseline
// template is `{arg}-{projectName}-{platform}{ext}`, so a project named `visual` writes
// `shot-visual-win32.png` here and `shot-visual-linux.png` in the pinned image. Half 1 is not a
// decorative rule against a filename shape that never occurs.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY HALF 2 SHELLS OUT TO `git ls-files` INSTEAD OF WALKING THE FILESYSTEM
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// An untracked `*-win32.png` sitting in a working tree is HARMLESS AND EXPECTED. It is precisely what a
// developer's local `npx playwright test --update-snapshots` would produce, and `.gitignore` exists so
// that it can sit there without anybody having to think about it. The thing that must never happen is
// one being COMMITTED.
//
// A filesystem walk cannot tell those two apart. It would go red on a perfectly correct working tree,
// which is the fastest possible route to a gate somebody disables. `git ls-files` asks the only question
// that matters — is it in the index — and answers it in the same vocabulary the rules are written in.
//
// It also closes the hole half 1 cannot: `.gitignore` is advisory. `git add -f` bypasses it completely,
// so a file can be tracked while every rule that should have excluded it is still present and correct.
// Half 1 alone would be a fiction. Half 2 is what makes it a guarantee.
//
// ⚠ THIS IS THE FIRST TEST IN THIS REPOSITORY TO SHELL OUT TO `git`. Two consequences, both handled
// below rather than assumed away:
//
//   1. `git` may be absent, or the checkout may not be a repository (an exported tarball, a vendored
//      copy). `execFileSync` throws on both. The throw is caught and converted into ONE named assertion
//      failure, because a raw `ENOENT` stack in the middle of a design suite buries which gate went
//      quiet — the same reasoning `selector-contract.test.ts:174-180` gives for `collectFiles()`
//      returning `[]` instead of throwing.
//   2. A FAILED `git` INVOCATION MUST NOT PASS HALF 2. An empty string is what both "nothing is tracked"
//      and "git never ran" look like, and only one of those is good news. The guard-the-guard block
//      asserts the call succeeded AND that two control pathspecs return the tracked files they must —
//      including one that crosses a directory boundary, since a real baseline lives several levels deep
//      at `e2e/visual/<spec>.spec.ts-snapshots/…-win32.png`. That control is not ceremony: plan `11-02`
//      measured an absence assertion reporting a perfectly clean result against a tree it never opened,
//      indistinguishable from a real clean run and green forever.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — FOUR PROBES ACROSS THREE FAILURE MODES (13 August 2026).
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ "GREEN IS 4 PASSED" STOOD HERE AND IS NOW WRONG — READ THE PASS COUNTS INSIDE THIS BLOCK AS THE
// HISTORY THEY ARE. Plan 17-02 added three cases (the D-138 theme half and its control), so GREEN IS
// NOW 7 PASSED and every "1 failed / 3 passed" recorded below was a true reading of a 4-case file. The
// line is rewritten rather than deleted, and the old counts are kept rather than restated: a probe
// record whose numbers have been silently re-baselined is a probe record nobody can check.
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`). Command
// for all four: `npx vitest run --config vitest.design.config.ts tests/design/gitignore-baselines.test.ts`
//
//   (a) HALF 1 — THE RULE COMMENTED OUT. The `.gitignore` line was changed from the bare rule to
//       `# *-win32.png`, which is the strongest form of this mutation: the rule TEXT is still literally
//       in the file, so any check that looked for the string rather than the line would pass.
//       1 failed / 3 passed:
//
//         FAIL  … > the .gitignore carries both non-Linux platform rules, as rules and not as comments
//         AssertionError: .gitignore no longer carries `*-win32.png` as a standalone rule line
//         (comments do not count). Without it, a baseline shot on that platform is an ordinary
//         untracked file that `git add` will happily stage — and the reference every future CI run
//         compares against becomes one nobody else can reproduce. Restore the rule under the
//         "# playwright visual baselines" heading; do NOT satisfy this test with a comment.:
//         expected false to be true
//
//       Restored with `git checkout -- .gitignore` → 4 passed.
//
//   (b) HALF 2 — A BASELINE FORCE-ADDED TO THE INDEX. A throwaway file was written to
//       `e2e/visual/probe.spec.ts-snapshots/shot-visual-win32.png` — four levels deep, the real shape —
//       and staged with `git add -f`, the exact bypass half 1 cannot see. 1 failed / 3 passed:
//
//         FAIL  … > git tracks zero platform baselines
//         AssertionError: git tracks 1 platform baseline(s) that may never be committed:
//         e2e/visual/probe.spec.ts-snapshots/shot-visual-win32.png. `.gitignore` is advisory —
//         `git add -f` bypasses it entirely — so a correct rule set does not prevent this. …:
//         expected [ Array(1) ] to deeply equal []
//         - []
//         + [ "e2e/visual/probe.spec.ts-snapshots/shot-visual-win32.png" ]
//
//       THE PROBE CORRECTED THIS FILE'S OWN FAILURE MESSAGE. It used to advise `git rm --cached`
//       "(which also deletes the working-tree copy)". It does not — measured: after `git rm --cached`
//       the PNG was still on disk, and `git status --short --ignored` then reported `!! e2e/visual/`,
//       i.e. the rules correctly reclassifying it as ignored, which is the harmless end state. The
//       message now says that instead. A remedy sentence that misdescribes its own command is the same
//       defect class as a false header comment.
//
//   (c) THE COMMENT-ONLY FIXTURE — TWO PROBES, AND THE FIRST ONE IS THE ONE WORTH READING.
//
//       (c1) `stripGitignoreComments` was neutered to a pass-through. THE WHOLE FILE STAYED GREEN,
//            4 passed. The stripper the plan calls load-bearing is NOT what rejects a commented rule:
//            whole-line equality already does, because a line beginning `#` can never EQUAL a bare
//            rule. The prescribed probe would have been recorded as a watched red without ever
//            failing — which is 11-02's finding arriving in a new disguise, a guard whose own probe is
//            vacuous. A direct assertion on `ruleLines()` was added (Rule 2) so the stripper's real
//            job — keeping 17 prose lines out of the 33-rule floor the guard-the-guard block leans
//            on — is exercised. Re-running the SAME mutation against it, 1 failed / 3 passed:
//
//              FAIL  … > a rule argued for in a comment does not satisfy the rule check
//              AssertionError: expected [ '# testing', '/test-results', …(3) ] to deeply equal
//              [ '/test-results' ]
//
//       (c2) `hasRule` reduced to `body.includes(rule)` — the realistic "simplification", and the one
//            the fixture was actually written for. 1 failed / 3 passed:
//
//              FAIL  … > a rule argued for in a comment does not satisfy the rule check
//              AssertionError: a comment mentioning *-win32.png was accepted as the rule:
//              expected true to be false
//
//       Both reverted → 4 passed, and every probe mutation was confirmed gone by re-reading the two
//       functions rather than by grepping for a marker word — this header names that word four times,
//       so a marker grep would have "found" leftovers in its own account of not leaving any.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// PROBE (e) — NOT A PROBE. A REAL RED, IN CI, 19 PLANS LATER (17 August 2026, plan 11-22).
//
// THIS IS THE ONE THAT PAYS FOR THE WHOLE FILE, and it was not triggered on purpose.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Plan 11-22 moved `ci.yml`'s `gate-db-free` job INTO the pinned Playwright container so it could
// compare visual baselines. The container's uid is not the owner of the `actions/checkout` working
// directory, and git 2.35.2+ refuses to operate on a repository it thinks somebody else owns. Run
// 32020141784, job `gate-db-free`, exit 1 — and the ONLY failing assertion in the whole 700-test
// design suite was this file's guard-the-guard:
//
//   FAIL tests/design/gitignore-baselines.test.ts > GATE-01 — a non-Linux visual baseline can never
//   be committed (D-29/D-30) > actually read a .gitignore, and git actually answered
//   AssertionError: `git ls-files *-win32.png *-darwin.png` could not be run from /__w/FitOut/FitOut
//   — git exited 128: fatal: detected dubious ownership in repository at '/__w/FitOut/FitOut'
//   To add an exception for this directory, call:
//
//   	git config --global --add safe.directory /__w/FitOut/FitOut. This is NOT a pass. An
//   unavailable git returns nothing, and nothing is exactly what a clean index looks like, so half 2
//   would go vacuously green. …: expected false to be true
//
//   Test Files  1 failed | 38 passed (39)
//        Tests  1 failed | 696 passed | 3 skipped (700)
//
// WHAT WOULD HAVE HAPPENED WITHOUT THE DISCRIMINATED UNION, which is the entire argument for it.
// The obvious spelling of this gate is `const tracked = execFileSync(...).split("\n").filter(Boolean)`
// wrapped in a `try { } catch { return [] }`, and every reviewer would have called that defensive
// rather than wrong. Under it, `git ls-files` exits 128, the catch returns `[]`, half 2 asserts
// `[] ` has length 0 — and reports **GREEN**. From that commit onward, D-29's platform-baseline rule
// would have been enforced by nothing at all inside the container, the job would have been green
// every single run, and the failure would have been discovered the day somebody committed a
// `*-win32.png` and nothing objected.
//
// The gap between "git answered: nothing" and "git could not answer" is one `catch` block wide and
// it is the difference between a gate and a decoration. This file's own header (line 54) predicted
// this exact scenario in the abstract on 13 August; on 17 August the environment produced it.
//
// THE FIX WAS TO THE ENVIRONMENT, NOT TO THIS FILE. `ci.yml`'s containerized job now runs
// `git config --global --add safe.directory` before the build, and PROVES it took by running this
// file's own query as a step. Not one assertion here was softened, and softening one would have been
// the wrong repair by construction: the message above already says so, and it said so before anybody
// needed it to. If you are ever tempted to make this gate tolerate an unavailable git, re-read this
// block — that tolerance is the bug, and it is the bug this record exists to make unarguable.
//
// A NOTE ON REACH, so this is not over-read. `vitest.config.ts` EXCLUDES `tests/design/**`, so job 2's
// `npm test` never runs this file; only job 1's `npm run test:design` does. And an AST/grep sweep of
// `tests/`, `scripts/`, `src/`, `e2e/` and `config/` on 17 August found `execFileSync` at line 233
// below to be the ONLY runtime git shell-out in the repository — every other `git` string in `tests/`
// is prose in a recorded-evidence comment. So one containerized job needed the fix and one call site
// was at risk. That is a measurement, not an assumption, and it is the reason `gate-price-parity`
// (also containerized) was deliberately left without the step: it runs no code that shells out to
// git. The day it does, the step comes with it.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • IT DOES NOT PROVE A MISSING BASELINE FAILS. That is the dynamic half, and it is `11-22`'s
//     recorded OBSERVED RED. This file would be perfectly green in a repository where the visual
//     project had been deleted outright — which is the strongest reason to read the two as a pair.
//   • IT CANNOT SEE A BASELINE COMMITTED UNDER A NAME THE RULES DO NOT MATCH. The platform segment
//     comes from the project name and Playwright's own template; a baseline captured under a project
//     renamed away from `visual`, or written by a bespoke `.toMatchSnapshot()` with an explicit
//     filename, or saved as `.jpeg`, is invisible to both halves. `playwright.config.ts` carries the
//     matching warning on the project's `name`.
//   • It says NOTHING about whether the `*-linux.png` baselines that ARE committed are correct, current,
//     or shot in the pinned image. Only that the illegal platforms are absent.
//   • The index is this repository's index. A baseline inside a submodule or a nested checkout is not in
//     it, and git will not report it here.
//   • Half 1 asserts the rules are PRESENT, not that they are REACHED. A later `!` negation, or a more
//     specific rule earlier in the file, could in principle re-include a path while both lines survive
//     verbatim. Half 2 is what catches the consequence, which is the only part that matters.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, type Dirent } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const REPO_ROOT = process.cwd();
const GITIGNORE_PATH = resolve(REPO_ROOT, ".gitignore");

/** The two platform suffixes that may never reach the index (D-29). Both halves read this list. */
const FORBIDDEN_PLATFORM_RULES = ["*-win32.png", "*-darwin.png"] as const;

/**
 * Control pathspecs for the guard-the-guard block, chosen to exercise THE SAME glob machinery half 2
 * depends on rather than merely to prove `git` is installed:
 *
 *   `*-lock.json`  — a leading-`*` pathspec matching a file at the repository root.
 *   `*.spec.ts`    — a leading-`*` pathspec matching files INSIDE a directory, which is the property
 *                    half 2 actually needs: git pathspec wildcards cross `/`, so `*-win32.png` reaches
 *                    a baseline nested under `e2e/visual/<spec>.spec.ts-snapshots/`. If that ever
 *                    stopped being true, half 2 would go quietly, permanently vacuous.
 */
const CONTROL_PATHSPECS = {
  root: { pathspec: "*-lock.json", mustInclude: "package-lock.json" },
  nested: { pathspec: "*.spec.ts", mustInclude: "e2e/search-and-book.spec.ts" },
} as const;

/** The `.gitignore` must be at least this many real rules, or it is not the file we think it is. */
const MIN_RULE_LINES = 20;

/**
 * Drop comment lines from a `.gitignore` body.
 *
 * `#` is line-anchored in gitignore syntax — a `#` mid-line is a literal character, and a leading `#`
 * can be escaped as `\#` — so this is deliberately NOT the repo's `stripComments` helper, which speaks
 * JS/JSX comment syntax and would leave `# *-win32.png` untouched.
 *
 * WHAT THIS IS AND IS NOT FOR — corrected by measurement, not assumed. The plan called the stripping
 * the thing that stops a comment satisfying half 1. It is not: `hasRule` compares WHOLE LINES, and a
 * line beginning `#` can never equal a bare rule, so half 1 stays correct with this function neutered
 * (probe c1 in the header — the whole file stayed green). What the stripping is genuinely load-bearing
 * for is the rule COUNT in the guard-the-guard block: 17 of this repository's 50 non-blank `.gitignore`
 * lines are prose, so an unstripped floor would pass against a file gutted down to its own commentary.
 *
 * The underlying hazard is real and this repository has been bitten by it repeatedly — a count or a
 * presence check landing on prose is why `tests/design/strip-comments.test.ts` exists, and a RULE
 * satisfied by a COMMENT ARGUING FOR THAT RULE is that defect wearing its most persuasive disguise: the
 * reviewer reads the sentence, agrees with it, and moves on. Probe c2 shows the one-line
 * "simplification" that would open it here.
 */
function stripGitignoreComments(body: string): string {
  return body
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
}

/** Every non-comment, non-blank rule in a `.gitignore` body, trimmed. */
function ruleLines(body: string): string[] {
  return stripGitignoreComments(body)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Half 1, as one function, so the synthetic fixtures below exercise the real code path. */
function hasRule(body: string, rule: string): boolean {
  return ruleLines(body).includes(rule);
}

/**
 * The result of asking git what it tracks. A discriminated union rather than a bare `string[]`, so that
 * "git could not answer" is impossible to confuse with "git answered: nothing".
 */
type LsFiles =
  | { readonly ok: true; readonly paths: readonly string[] }
  | { readonly ok: false; readonly reason: string };

/** `git ls-files <pathspec…>`, with every failure mode converted into a named reason. */
function lsFiles(...pathspecs: readonly string[]): LsFiles {
  try {
    const stdout = execFileSync("git", ["ls-files", ...pathspecs], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      ok: true,
      paths: stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & {
      status?: number | null;
      stderr?: Buffer | string | null;
    };
    const detail =
      err.code === "ENOENT"
        ? "`git` is not on PATH"
        : `git exited ${err.status ?? "(no status)"}: ${String(err.stderr ?? err.message).trim()}`;
    return {
      ok: false,
      reason:
        `\`git ls-files ${pathspecs.join(" ")}\` could not be run from ${REPO_ROOT} — ${detail}. ` +
        `This is NOT a pass. An unavailable git returns nothing, and nothing is exactly what a clean ` +
        `index looks like, so half 2 would go vacuously green. If this repository is genuinely being ` +
        `checked out without git (an exported tarball, a vendored copy), the platform-baseline rule ` +
        `cannot be enforced there and this gate must be fixed deliberately, not skipped.`,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Read once at module level; the `it()` blocks only assert.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const gitignoreBody = readFileSync(GITIGNORE_PATH, "utf8");
const trackedBaselines = lsFiles(...FORBIDDEN_PLATFORM_RULES);
const controlRoot = lsFiles(CONTROL_PATHSPECS.root.pathspec);
const controlNested = lsFiles(CONTROL_PATHSPECS.nested.pathspec);

describe("GATE-01 — a non-Linux visual baseline can never be committed (D-29/D-30)", () => {
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  // GUARD-THE-GUARD FIRST: every assertion below is worthless if the file was empty or git never ran.
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  it("actually read a .gitignore, and git actually answered", () => {
    expect(
      gitignoreBody.length,
      `${GITIGNORE_PATH} is empty. Half 1 is a presence check, and a presence check against an empty ` +
        `string fails loudly — but an empty file also means every OTHER ignore rule in this repository ` +
        `is gone, which is a much larger problem than a baseline.`,
    ).toBeGreaterThan(0);

    const rules = ruleLines(gitignoreBody);
    expect(
      rules.length,
      `only ${rules.length} rule lines survived comment-stripping. Either .gitignore was gutted or the ` +
        `stripper is eating real rules — and the second failure mode would make half 1 red for a reason ` +
        `that has nothing to do with baselines.`,
    ).toBeGreaterThanOrEqual(MIN_RULE_LINES);

    // The git side. `ok: false` carries its own named reason; surface it verbatim.
    expect(trackedBaselines.ok, trackedBaselines.ok ? "" : trackedBaselines.reason).toBe(true);
    expect(controlRoot.ok, controlRoot.ok ? "" : controlRoot.reason).toBe(true);
    expect(controlNested.ok, controlNested.ok ? "" : controlNested.reason).toBe(true);

    // And the positive controls — a `git ls-files` that returns nothing for a pathspec that MUST match
    // is the vacuity trap in miniature, and half 2 cannot notice it from the inside.
    if (controlRoot.ok) {
      expect(
        controlRoot.paths,
        `the control pathspec \`${CONTROL_PATHSPECS.root.pathspec}\` returned nothing. git ran and ` +
          `reported no matches for a file that is definitely tracked, so half 2's empty result means ` +
          `nothing.`,
      ).toContain(CONTROL_PATHSPECS.root.mustInclude);
    }
    if (controlNested.ok) {
      expect(
        controlNested.paths,
        `the control pathspec \`${CONTROL_PATHSPECS.nested.pathspec}\` did not reach a file inside a ` +
          `directory. git pathspec wildcards crossing \`/\` is what lets \`*-win32.png\` find a baseline ` +
          `nested under e2e/visual/<spec>.spec.ts-snapshots/. If that changed, half 2 is vacuous.`,
      ).toContain(CONTROL_PATHSPECS.nested.mustInclude);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  // HALF 1 — the rules exist, as rules and not as prose.
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  it("the .gitignore carries both non-Linux platform rules, as rules and not as comments", () => {
    for (const rule of FORBIDDEN_PLATFORM_RULES) {
      expect(
        hasRule(gitignoreBody, rule),
        `.gitignore no longer carries \`${rule}\` as a standalone rule line (comments do not count). ` +
          `Without it, a baseline shot on that platform is an ordinary untracked file that \`git add\` ` +
          `will happily stage — and the reference every future CI run compares against becomes one ` +
          `nobody else can reproduce. Restore the rule under the "# playwright visual baselines" ` +
          `heading; do NOT satisfy this test with a comment.`,
      ).toBe(true);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  // HALF 2 — the index is clean. The half that catches `git add -f`, which half 1 cannot see at all.
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  it("git tracks zero platform baselines", () => {
    const paths = trackedBaselines.ok ? trackedBaselines.paths : [];

    expect(
      paths,
      `git tracks ${paths.length} platform baseline(s) that may never be committed: ` +
        `${paths.join(", ")}. \`.gitignore\` is advisory — \`git add -f\` bypasses it entirely — so a ` +
        `correct rule set does not prevent this. Remove each with \`git rm --cached <path>\`, which ` +
        `takes it out of the index and LEAVES it on disk — where the rules above then correctly ` +
        `classify it as ignored, which is the harmless state. Regenerate the real baseline in ` +
        `mcr.microsoft.com/playwright:v1.60.0-noble via the dispatch job (D-27).`,
    ).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  // BOTH DIRECTIONS, on fixtures never written to disk.
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  it("a rule argued for in a comment does not satisfy the rule check", () => {
    // The negative direction — the disguise this whole gate is most likely to be fooled by.
    const commentOnly = [
      "# testing",
      "/test-results",
      "",
      "# playwright visual baselines",
      "# *-win32.png is ignored, because a Windows baseline can never be committed.",
      "#*-darwin.png too",
    ].join("\n");

    for (const rule of FORBIDDEN_PLATFORM_RULES) {
      expect(hasRule(commentOnly, rule), `a comment mentioning ${rule} was accepted as the rule`).toBe(
        false,
      );
    }

    // AND THE STRIPPER IS ASSERTED DIRECTLY, because relying on it turned out not to exercise it.
    // Measured (probe c1 in the header): disabling `stripGitignoreComments` entirely left this whole
    // file GREEN — whole-line equality already rejects every comment above, since a line beginning `#`
    // can never EQUAL a bare rule. The stripper's real load-bearing job is the rule COUNT the
    // guard-the-guard block leans on: 17 of this repository's 50 non-blank `.gitignore` lines are
    // prose, so an unstripped floor would happily pass against a file reduced to nothing but its own
    // explanation. This line is what makes that job fail visibly if the stripper is ever "simplified".
    expect(ruleLines(commentOnly)).toEqual(["/test-results"]);

    // The positive direction — without it the negative above is satisfied by a `hasRule` that always
    // returns false, which would make half 1's green meaningless in exactly the same way.
    const realRules = [
      "# playwright visual baselines",
      "# only *-linux.png is legal",
      "*-win32.png",
      "  *-darwin.png  ",
    ].join("\n");

    for (const rule of FORBIDDEN_PLATFORM_RULES) {
      expect(hasRule(realRules, rule), `the bare rule ${rule} was not recognised`).toBe(true);
    }

    // A rule is a WHOLE line. `*-win32.png.bak` and `x*-win32.png` are different rules and neither
    // ignores what this one ignores; a substring check would accept both.
    expect(hasRule("*-win32.png.bak", "*-win32.png")).toBe(false);
    expect(hasRule("!*-win32.png", "*-win32.png")).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE THEME HALF OF AC#26 (D-138) — WHY IT LIVES IN THIS FILE AND WHY IT DOES *NOT* USE `git ls-files`
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Everything above is about the PLATFORM segment of a baseline's name. This is about the THEME segment,
// and it is the same gate's other half: `{arg}-{projectName}-{platform}{ext}` renders as
// `<surface>-<width>-<theme>-visual-linux.png`, so the two rules read the same filenames from opposite
// ends. One gate with two halves is one place a reader checks — which is why this extends the file
// rather than opening `tests/design/baseline-theme.test.ts` beside it.
//
// D-138 (2026-08-23) narrowed the visual sweep to ONE product theme. `grove` is not a second product
// surface to be photographed; it is a TOKEN-CONTRACT PROBE, and the thing that proves it is the fixed
// four-surface probe in `e2e/visual/theme-swap.spec.ts`, not a second full sweep. A `*-grove-*.png`
// landing under a `-snapshots/` directory is therefore not a stylistic preference someone exercised —
// it is the pre-D-138 shape coming back, and it comes back with a doubled baseline count, a doubled
// dispatch-job runtime, and a second set of references that can drift apart from the first.
//
// ─── WHY A FILESYSTEM SCAN HERE, WHEN HALF 2 ABOVE ARGUES HARD FOR `git ls-files` ───────────────────
//
// The argument above is that an untracked `*-win32.png` is HARMLESS AND EXPECTED, because it is exactly
// what a developer's local `--update-snapshots` produces. That reasoning does not carry over, and the
// reason is mechanical rather than a judgement call: `playwright.config.ts` pins `updateSnapshots` to an
// unconditional `"none"` (D-28), with `--update-snapshots` confined to the one dispatch workflow. NO
// LOCAL REGENERATION IS POSSIBLE, BY CONSTRUCTION. So there is no benign local process that writes a
// grove PNG into a `-snapshots/` directory — anything found there arrived deliberately, and the disk is
// the earlier and stricter place to catch it than the index. A scan that only asked git would stay green
// through the whole window between "the file exists and the next dispatch run will compare against it"
// and "somebody staged it".
//
// ─── THE VACUITY PROOF (measured, not asserted) ──────────────────────────────────────────────────────
//
// An empty-list result is free if the scan is pointed anywhere wrong, and this scan can go wrong in two
// ways the platform half cannot: a renamed spec file moves the `<spec>.spec.ts-snapshots/` directory, and
// a `path.join` on Windows produces `\` separators that a `/`-anchored filter silently never matches.
// So the CONTROL runs first and is an assertion, not a comment.
//
// PROBE (2026-08-29, plan 17-02). `VISUAL_DIR` was repointed at `e2e/visual-baselines` — a directory
// that does not exist — and the file re-run. Observed 1 failed / 6 passed, and WHICH clause failed is
// the whole result: the CONTROL fired, and the grove clause did not.
//
//     × the scan can see the baselines it is about to make a claim over
//       AssertionError: the court positive control found 0 files matching `*-court-visual-linux.png`
//       under e2e/visual-baselines, against a floor of 30 (36 measured 2026-08-29). The scan walked
//       0 file(s) under `*-snapshots/` in total. … expected +0 to be greater than or equal to 30
//
// `zero grove baselines are committed` PASSED in that same run, as did `the two classifiers are
// discriminating` — an empty directory contains no grove PNGs and no non-court files either, which is
// precisely the shape of a green that means nothing. `VISUAL_DIR` was restored and the file re-run:
// 7 passed. The floor is 30 against a measured 36 (all court, zero grove, 2026-08-29) and is a FLOOR
// rather than an equality on purpose — `visual-baselines.ts` carries `blocked` rows, and unblocking one
// ADDS baselines. A gate that went red because coverage grew would be a gate somebody deletes.

/** The tree the baselines live in. One constant — the probe above is a one-line edit here. */
const VISUAL_DIR = resolve(REPO_ROOT, "e2e/visual");

/** Playwright names a baseline directory `<spec file>-snapshots`. */
const SNAPSHOT_DIR_SUFFIX = "-snapshots";

/** The theme segment D-138 retired. Hyphens on both sides: it is a whole segment, not a substring. */
const GROVE_MARKER = "-grove-";

/** The one legal theme's full tail, platform included — the two halves of AC#26 meeting in one string. */
const COURT_BASELINE_SUFFIX = "-court-visual-linux.png";

/** Below the measured 36, above any plausible partial read. See the vacuity-proof note above. */
const MIN_COURT_BASELINES = 30;

/** Repo-relative and `/`-separated, so a message reads the same on Windows as in the container. */
const rel = (p: string) => relative(REPO_ROOT, p).replace(/\\/g, "/");

/**
 * Every file under a `*-snapshots/` directory anywhere in `VISUAL_DIR`, repo-relative.
 *
 * Returns `[]` on an unreadable tree rather than throwing — 11-02's rule, and the same one
 * `selector-contract.test.ts:174-180` gives: a broken scan must surface as ONE named guard-the-guard
 * failure, never as a stack trace that buries which gate went quiet. The control below is what converts
 * that `[]` into a red.
 */
function collectBaselines(dir: string, insideSnapshotDir: boolean, out: string[] = []): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectBaselines(full, insideSnapshotDir || entry.name.endsWith(SNAPSHOT_DIR_SUFFIX), out);
    } else if (insideSnapshotDir) {
      out.push(rel(full));
    }
  }
  return out;
}

/** `*-grove-*.png`, as a whole-segment match on the basename. */
function isGroveBaseline(path: string): boolean {
  return path.endsWith(".png") && basename(path).includes(GROVE_MARKER);
}

/** `*-court-visual-linux.png` — the positive control's subject. */
function isCourtBaseline(path: string): boolean {
  return path.endsWith(COURT_BASELINE_SUFFIX);
}

const baselineFiles = collectBaselines(VISUAL_DIR, false);
const courtBaselines = baselineFiles.filter(isCourtBaseline);
const groveBaselines = baselineFiles.filter(isGroveBaseline);

describe("GATE-01 / D-138 — court is the only theme with committed baselines", () => {
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  // THE POSITIVE CONTROL, FIRST AND AS AN ASSERTION. It is what makes the empty result below a fact
  // rather than a consequence of looking in the wrong place.
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  it("the scan can see the baselines it is about to make a claim over", () => {
    expect(
      courtBaselines.length,
      `the court positive control found ${courtBaselines.length} files matching ` +
        `\`*${COURT_BASELINE_SUFFIX}\` under ${rel(VISUAL_DIR)}, against a floor of ` +
        `${MIN_COURT_BASELINES} (36 measured 2026-08-29). The scan walked ${baselineFiles.length} file(s) ` +
        `under \`*${SNAPSHOT_DIR_SUFFIX}/\` in total.\n\n` +
        `This is a MEASUREMENT FAILURE, not a baseline failure. A scan pointed at a directory that moved ` +
        `— a renamed spec renames its \`<spec>.spec.ts${SNAPSHOT_DIR_SUFFIX}/\` directory with it — ` +
        `returns zero grove PNGs and reads exactly like a pass. Fix the scan before reading anything ` +
        `below it. If baselines were legitimately REMOVED, that is a finding about the sweep's coverage ` +
        `and it belongs in a plan, not in a lowered floor.`,
    ).toBeGreaterThanOrEqual(MIN_COURT_BASELINES);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  // THE CLAIM.
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  it("zero grove baselines are committed", () => {
    expect(
      groveBaselines,
      `${groveBaselines.length} grove baseline(s) are on disk:\n${groveBaselines.join("\n")}\n\n` +
        `D-138 (2026-08-23) narrowed the visual sweep to ONE product theme. \`grove\` is a ` +
        `TOKEN-CONTRACT probe, and it is proved by the fixed four-surface probe in ` +
        `\`e2e/visual/theme-swap.spec.ts\` — not by a second full sweep. A second theme's baselines ` +
        `double the reference set, double the dispatch job, and give the suite two references that can ` +
        `drift apart while both stay green.\n\n` +
        `⚠ THE WRONG REMEDY IS A \`.gitignore\` LINE. That is the same argument the platform half of ` +
        `this file makes about \`*-win32.png\`: \`.gitignore\` is ADVISORY and \`git add -f\` bypasses ` +
        `it entirely, so an ignore rule would leave this exact file exactly where it is. Remove each ` +
        `with \`git rm --cached <path>\` AND delete it from disk — this half scans the filesystem, not ` +
        `the index, because \`playwright.config.ts\` pins \`updateSnapshots: "none"\` (D-28) and no ` +
        `local process legitimately writes one of these.\n\n` +
        `The ONLY sanctioned write path for a baseline is the \`baselines.yml\` dispatch job, against ` +
        `the surface rows declared in \`src/lib/design/visual-baselines.ts\`. If grove genuinely needs ` +
        `a sweep, that reverses D-138 and it is a decision to raise, not a file to add.`,
    ).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  // BOTH DIRECTIONS, on names never written to disk — the same duty the comment fixture above serves.
  // Without this, both clauses are satisfied by a classifier stuck at `false`.
  // ───────────────────────────────────────────────────────────────────────────────────────────────────
  it("the two classifiers are discriminating", () => {
    expect(isGroveBaseline("e2e/visual/x.spec.ts-snapshots/home-320-grove-visual-linux.png")).toBe(true);
    expect(isCourtBaseline("e2e/visual/x.spec.ts-snapshots/home-320-court-visual-linux.png")).toBe(true);

    // A theme segment, not a substring: neither a surface NAMED grove nor a `.txt` beside a baseline
    // is a grove baseline, and calling either one would train a reader to ignore this gate.
    expect(isGroveBaseline("e2e/visual/x.spec.ts-snapshots/grovewood-320-court-visual-linux.png")).toBe(
      false,
    );
    expect(isGroveBaseline("e2e/visual/x.spec.ts-snapshots/home-320-grove-visual-linux.png.txt")).toBe(
      false,
    );
    expect(isCourtBaseline("e2e/visual/x.spec.ts-snapshots/home-320-court-visual-win32.png")).toBe(false);

    // And the real tree agrees with the real inventory: every file the scan walked is a court baseline,
    // which is the measured 2026-08-29 state and is what makes the count above the WHOLE population
    // rather than a subset that happens to clear the floor.
    expect(baselineFiles.filter((p) => !isCourtBaseline(p))).toEqual([]);
  });
});
