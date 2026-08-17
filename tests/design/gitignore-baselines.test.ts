// GATE-01's static half: a visual-regression baseline generated on Windows or macOS can never be
// committed. BOTH HALVES — the rules exist in `.gitignore`, AND git tracks zero files matching them.
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
// WATCHED RED — FOUR PROBES ACROSS THREE FAILURE MODES (13 August 2026). GREEN IS 4 PASSED.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
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
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
