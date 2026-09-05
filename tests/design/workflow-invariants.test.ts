// D-14's CHECKER HALF, GIVEN AN INSTRUMENT. This file mutates a COPY of `.github/workflows/ci.yml`
// and spawns the real `scripts/verify-workflows.mjs` against it, asserting a non-zero exit and a
// NAMED `FAIL` line.
//
// ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────────────────────────────
//
// The SCRIPT half of D-14 has eight build-blocking cases in `tests/design/mail-credential-refusal.test.ts`
// and has not regressed once. The CHECKER half — the half that actually caught nothing for a full
// verification round, three times running — had ZERO. Both of plan 19-13's tightenings were proven
// only by mutations applied by hand and then reverted, so nothing in the tree would notice a future
// edit reverting them: the checker would go green, the design suite would go green, and CI would go
// green.
//
// The sibling file already carries the governing sentence, at its own `:49-52`:
//
//     "A fail-closed control that is only ever exercised by the thing it is supposed to protect has
//      no instrument at all — which is exactly how CR-01 survived a whole verification round."
//
// That applies VERBATIM to the checker, and was not acted on until this file. Rounds 1, 2 and 3 each
// closed the one mutation that had been measured and left no instrument behind; round N+1 therefore
// began with no memory of round N. This file is that memory.
//
// ── WHY IT SPAWNS RATHER THAN IMPORTS ─────────────────────────────────────────────────────────────
//
// The contract `.github/workflows/ci.yml` consumes is a PROCESS EXIT CODE plus what the process
// printed. A test that imported a predicate and asserted on its return value would leave both of the
// things CI actually depends on unmeasured. `expectRed` below therefore asserts BOTH halves — a
// non-zero exit AND a `FAIL` line naming the right invariant — because "it went red" was never the
// property; "it went red for this reason" is. A non-zero exit alone is also satisfied by a hard stop
// or a crash.
//
// ── WHY IT MUTATES A COPY AND NEVER THE TRACKED FILE ──────────────────────────────────────────────
//
// A mutation is a measurement. A measurement left in the tree is a defect, and a test that writes a
// tracked file is a test that can leave the repository in a state its own green did not describe.
// Every mutation here lives inside a `realpathSync(mkdtempSync(...))` directory removed in a
// `finally`; the tracked `ci.yml` is READ and never written.
//
// ── ⚠ WHY THERE IS NO FLAG, AND WHY THAT IS THE LOAD-BEARING DECISION ─────────────────────────────
//
// `WORKFLOW_DIR`, `package.json` and the refusal script's path are ALREADY cwd-relative in the
// shipped checker (`scripts/verify-workflows.mjs:82-84`, `:188-197`, `:242`, `:826-832`), so pointing
// it at a mutated tree needs NOTHING but a different working directory. The alternative 19-REVIEW.md
// WR-02 sketched — a `--workflow-dir=` flag — would add a TEST-ONLY INPUT to a security control, and
// would then require a NEW invariant pinning that input's absence on the production path. That is
// plan 19-12's `argv[2]` mistake restated one file over: a test-only escape hatch that the thing
// being guarded against can also use is not a harness, it is the hole.
//
// So the checker is spawned exactly as `ci.yml` invokes it — `node scripts/verify-workflows.mjs`,
// no flag, no environment variable, no second entry point — and ONLY `cwd` differs. There is
// therefore nothing new to pin absent on the production path. A future reader must not "simplify"
// this into a flag; doing so re-opens the trade this comment records.
//
// ── ⚠ WHY THE HARNESS ASSERTS THE MUTATION APPLIED ────────────────────────────────────────────────
//
// Every mutation builder anchors on a string that exists in the tracked file. An anchor that drifts
// would silently produce an UNMUTATED copy, and every red case below would turn into a green that
// means nothing — the exact failure mode this whole file exists to remove. `withMutatedWorkflows`
// therefore asserts the mutated text DIFFERS from its input before it spawns anything.
//
// ── WHY IT IS BUILD-BLOCKING AND DB-FREE ──────────────────────────────────────────────────────────
//
// `vitest.design.config.ts` collects `tests/design/**/*.test.ts`, declares no `globalSetup` and no
// `setupFiles`, and `package.json`'s `"build"` runs `test:design`. A new file in this directory is
// collected automatically: no config edit is needed here, and none is permitted — adding either of
// those two keys is what would reintroduce the Docker dependency that config exists to exclude.
//
// ⚠ THE PROVIDER'S TOKEN IS NOT TYPED ANYWHERE IN THIS FILE, and neither is the snapshot-update
// flag. Neither is needed: every mutation below is about a step's ATTRIBUTES and its POSITION, never
// about a credential's value.

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/** The shipped checker, spawned as an absolute path so only `cwd` differs from CI's invocation. */
const CHECKER = resolve(process.cwd(), "scripts/verify-workflows.mjs");
/** The four files the checker reads from its WORKING DIRECTORY. Every one is copied into the temp tree. */
const REPO_CI = resolve(process.cwd(), ".github/workflows/ci.yml");
const REPO_BASELINES = resolve(process.cwd(), ".github/workflows/baselines.yml");
const REPO_PKG = resolve(process.cwd(), "package.json");
const REPO_REFUSAL = resolve(process.cwd(), "scripts/refuse-mail-credential.mjs");

/**
 * The exact summary line the control case pins, spelled ONCE so the invariant total lives in one
 * place in this file. A count change is then only possible by deliberately editing this constant,
 * which is the intended property rather than an inconvenience: it is what stops a future round from
 * adding a check and leaving a stale total sentence behind somewhere else.
 */
const EXPECTED_GREEN = "All 55 invariants hold across 3 section(s) (baselines=11, ci=36, cross=8).";

/**
 * Reads a single-line `const <NAME> = "<value>";` declaration out of the SHIPPED checker, so a string
 * this file must anchor a mutation on is spelled ONCE — in the checker — and READ here rather than
 * typed a second time. A copy would be a second source of truth wearing the costume of a constant,
 * which is the drift class this phase has spent five plans on.
 *
 * ⚠ IT THROWS AND DOES NOT FALL BACK, DELIBERATELY. A default would turn every red case anchored on
 * the missing string into a mutation that does not apply — and `withMutatedWorkflows`'s
 * differs-from-input assertion would then be the only thing between this file and a suite of greens
 * that mean nothing. Failing here, loudly, names the real cause: the declaration moved.
 */
function constFromChecker(declName: string): string {
  const decl = new RegExp(`^const ${declName} = "(.+)";$`, "m");
  const match = decl.exec(readFileSync(CHECKER, "utf8").replace(/\r\n/g, "\n"));
  if (!match || !match[1]) {
    throw new Error(
      `could not read ${declName} from ${CHECKER} with ${decl.source} — this test cannot anchor a ` +
        `mutation on a string it could not read, and guessing one would make every red case below ` +
        `a green that means nothing`,
    );
  }
  return match[1];
}

/** The refusal step's `name:`, read from the checker that already spells it once. */
const MAIL_STEP_NAME = constFromChecker("CI_E2E_MAIL_STEP");

/**
 * `gate-e2e`'s YAML job KEY, read rather than typed — and read HERE rather than inside
 * `withJobKey` for the reason `withJobKey`'s own docblock states: until plan 19.1-05 that helper
 * ended its read with `?? <a second copy of the key>`, a silent fallback where the reader beside it
 * throws (19-REVIEW.md finding IN-02). The fallback is deleted, not defaulted, and the key it used
 * to guess is now one more constant on this list.
 *
 * ⚠ NOTE THAT NEITHER THAT DOCBLOCK NOR THIS ONE SPELLS THE KEY. That is deliberate and it is this
 * repository's established shape for exactly this class — `ci.yml` never spells the snapshot-update
 * flag or the mail provider's token for the same reason. The cheapest audit of "this file holds no
 * second source of truth for a job key" is a grep for the key returning zero, and prose quoting the
 * literal it forbids is still the literal.
 */
const E2E_JOB = constFromChecker("CI_E2E_JOB");

/**
 * The checker step's `name:` inside `gate-db-free` — the step that RUNS the script this file spawns.
 * Read from the checker for the same reason as above, and load-bearing for a second one: the
 * invariant added by plan 19.1-01 anchors on this EXACT string, so a test that guessed it would be
 * mutating a step the checker is not looking at.
 */
const CHECKER_STEP_NAME = constFromChecker("CHECKER_STEP_NAME");

/**
 * `gate-db-free`'s YAML job KEY and its `name:` — two different things, read separately because the
 * checker spells them separately and for the reason it states there: GitHub matches a required
 * status check on the `name:`, never on the key, so the two can be moved independently and only one
 * of them detaches the job from branch protection.
 */
const CHECKER_JOB = constFromChecker("CI_CHECKER_JOB");
const CHECKER_CONTEXT = constFromChecker("CI_CHECKER_CONTEXT");

/**
 * The build step's `name:` inside `gate-db-free` — the step that runs lint, the design suite and the
 * Next build. Read from the checker for the same reason as every constant above, and load-bearing
 * for a reason peculiar to this one: this is the step that runs THIS FILE. A case that guessed the
 * name would mutate a step nothing is looking at and report a green for a job in which the
 * instrument no longer runs at all.
 */
const BUILD_STEP_NAME = constFromChecker("BUILD_STEP_NAME");

/**
 * The two branches `ci.yml`'s push trigger must reach, read from the checker for the reason every
 * constant above is read: the trigger cases below rewrite that branch list, and a case that TYPED
 * the names would be constructing a "correct" file out of its own guess rather than out of the
 * property the checker asserts. `CHECKER_DEFAULT_BRANCH` is additionally the name plan 15's ruleset
 * is about, so a case that dropped it by hand would be asserting on a coincidence.
 */
const CHECKER_DEV_BRANCH = constFromChecker("CI_DEV_BRANCH");
const CHECKER_DEFAULT_BRANCH = constFromChecker("CI_DEFAULT_BRANCH");

/**
 * The `name:` of every step the checker makes an ORDERING claim about, in both jobs that carry one,
 * plus the two project flags and the refusal script's path — all read from the checker for the
 * reason every constant above is read, and for one more that is peculiar to this group.
 *
 * ⚠ THESE ARE THE STRINGS THE REPAIRED PREDICATES ANCHOR ON. Before plan 19.1-06 the checker found
 * these steps by SEARCHING RUN BODIES for a substring; it now finds them by exact `name:`. A case
 * that typed one of these names would be moving a step the checker is not looking at, the mutation
 * would still apply, `withMutatedWorkflows`'s differs-from-input assertion would still be satisfied,
 * and the case would report a red that has nothing to do with its own name — which is precisely the
 * class of defect these cases exist to remember.
 */
const E2E_MIGRATE_STEP = constFromChecker("CI_E2E_MIGRATE_STEP");
const E2E_SEED_STEP = constFromChecker("CI_E2E_SEED_STEP");
const E2E_PLAY_STEP = constFromChecker("CI_E2E_PLAYWRIGHT_STEP");
const VISUAL_JOB = constFromChecker("CI_VISUAL_JOB");
const VISUAL_MIGRATE_STEP = constFromChecker("CI_VISUAL_MIGRATE_STEP");
const VISUAL_SEED_STEP = constFromChecker("CI_VISUAL_SEED_STEP");
const VISUAL_PLAY_STEP = constFromChecker("CI_VISUAL_PLAYWRIGHT_STEP");
const VISUAL_PROJECT = constFromChecker("CI_VISUAL_PROJECT");
const REFUSAL_SCRIPT = constFromChecker("MAIL_REFUSAL_SCRIPT");

/**
 * `baselines.yml`'s own step names and its staging glob — audit rows 11 and 12, the two sites the
 * research inventory did not list. Read from the checker like everything else, and kept SEPARATE
 * from the `gate-visual` names above even where the strings currently coincide, because the two
 * jobs are in different FILES and can be renamed independently. The checker's own declarations say
 * the same thing at their site.
 */
const BASELINES_JOB = constFromChecker("BASELINES_JOB");
const BASELINES_MIGRATE_STEP = constFromChecker("BASELINES_MIGRATE_STEP");
const BASELINES_STAGE_STEP = constFromChecker("BASELINES_STAGE_STEP");

/**
 * `.gitattributes` declares `* text=auto` and this working tree checks `ci.yml` out with CRLF. Every
 * inserted line uses the EOL detected from the file it is being inserted into; a harness that
 * normalised line endings would rewrite the whole copy and make every red red for the wrong reason.
 */
function eolOf(text: string): string {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

/**
 * The shape a spawned checker run comes back as. Spelled ONCE (plan 19.1-06).
 *
 * ⚠ IT IS A TYPE ALIAS RATHER THAN THREE INLINE ANNOTATIONS FOR A REASON THAT IS NOT STYLE.
 * The construct on the right-hand side below does not typecheck under this repository's `@types/node`
 * — it is two of the nine pre-existing `npx tsc --noEmit` errors recorded in the phase's
 * `deferred-items.md`, and it was already spelled TWICE here before this plan. Adding a third
 * function with the same annotation would have added two more errors to a count this plan is
 * required not to grow. Naming it once means the construct appears in ONE place: the count goes
 * DOWN by two rather than up by two, and whoever eventually fixes the underlying generic has one
 * line to change instead of three. The alias is deliberately NOT `any` — the call sites still read
 * `result.status`, `result.stdout` and `result.stderr` as strings.
 */
type CheckerRun = ReturnType<typeof spawnSync<string>>;

/**
 * The single harness every case goes through. Builds a throwaway tree holding exactly what the
 * checker reads from its working directory, applies `mutate` to `ci.yml`'s text, and spawns the
 * SHIPPED checker against it with nothing but `cwd` changed.
 */
function withMutatedWorkflows(
  mutate: (ci: string) => string,
  assert: (result: CheckerRun, dir: string) => void,
): void {
  withMutatedWorkflowPair({ ci: mutate }, assert);
}

/**
 * The general form, added by plan 19.1-06. Two of that plan's audit rows live in the `baselines`
 * and `cross` sections, so their cases must be able to mutate `baselines.yml` — one of them must
 * mutate BOTH files at once, because its whole point is that IDENTICAL decoys on both sides make a
 * byte-identity comparison hold between two strings that are neither job's real command.
 *
 * ⚠ EACH SUPPLIED MUTATOR IS ASSERTED SEPARATELY. The differs-from-input assertion is described in
 * the header above as "the single most important line in this file"; a pair form that only checked
 * that SOMETHING changed would let a drifted anchor in one file hide behind a live mutation in the
 * other, and the case would then measure a tree it did not describe. A mutator that is not supplied
 * is not asserted, because its file is copied verbatim on purpose.
 */
function withMutatedWorkflowPair(
  mutators: { ci?: (ci: string) => string; baselines?: (baselines: string) => string },
  assert: (result: CheckerRun, dir: string) => void,
): void {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "workflow-invariants-")));
  try {
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    mkdirSync(join(dir, "scripts"), { recursive: true });

    // `package.json` feeds `EXPECTED_IMAGE` (the pinned Playwright image tag must equal the
    // installed `@playwright/test` version).
    copyFileSync(REPO_PKG, join(dir, "package.json"));
    // The refusal script feeds Invariant B's shares-pattern and holds-no-copy conjuncts.
    copyFileSync(REPO_REFUSAL, join(dir, "scripts", "refuse-mail-credential.mjs"));

    const write = (
      name: "ci.yml" | "baselines.yml",
      source: string,
      mutate: ((text: string) => string) | undefined,
    ): void => {
      const original = readFileSync(source, "utf8");
      if (mutate === undefined) {
        // `baselines.yml` feeds the whole `baselines` section and both halves of `cross`, so it is
        // always present in the tree — verbatim unless a case asks otherwise.
        writeFileSync(join(dir, ".github", "workflows", name), original, "utf8");
        return;
      }
      const mutated = mutate(original);
      // ⚠ THE SINGLE MOST IMPORTANT LINE IN THIS FILE. A mutation that did not apply must be a RED,
      // never a green over an unmutated copy.
      expect(
        mutated,
        `the mutation of ${name} produced text identical to the input — its anchor has drifted, ` +
          `and every assertion below would be measuring an UNMUTATED copy`,
      ).not.toBe(original);
      writeFileSync(join(dir, ".github", "workflows", name), mutated, "utf8");
    };
    write("ci.yml", REPO_CI, mutators.ci);
    write("baselines.yml", REPO_BASELINES, mutators.baselines);

    assert(spawnSync(process.execPath, [CHECKER], { cwd: dir, encoding: "utf8" }), dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Both halves, because "it went red" was never the property. */
function expectRed(
  result: CheckerRun,
  invariantFragment: string,
): void {
  const stdout = String(result.stdout ?? "");
  const stderr = String(result.stderr ?? "");
  expect(
    result.status,
    `the checker exited 0 under a mutation that should be RED.\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`,
  ).not.toBe(0);
  const failLines = stdout.split(/\r?\n/).filter((l) => l.trimStart().startsWith("FAIL"));
  expect(
    failLines.some((l) => l.includes(invariantFragment)),
    `no FAIL line named ${JSON.stringify(invariantFragment)}. FAIL lines were:\n` +
      `${failLines.join("\n") || "(NO FAIL LINE)"}\n--- stderr ---\n${stderr}`,
  ).toBe(true);
}

/** Inserts `line`, indented eight spaces, immediately after the refusal step's `- name:` line. */
function withRefusalStepKey(line: string): (ci: string) => string {
  return (ci) => insertAfterLineContaining(ci, `- name: ${MAIL_STEP_NAME}`, `        ${line}`);
}

/**
 * Appends `argument` to the MAIL REFUSAL step's `run:` line, leaving everything else
 * byte-identical: same step, same name, same position, no new key. The step still runs the refusal
 * script — with an argument.
 *
 * ⚠ WHY THIS BUILDER EXISTS AT ALL, GIVEN `withAppendedCheckerArgument` ONE JOB OVER. That one
 * measures the same PROPERTY on `gate-db-free`'s checker step; this one measures it on the step
 * plan 19-13 actually fixed. They are not redundant, because the conjunct is a different line of
 * the checker in each case and either can be loosened without touching the other — and it is THIS
 * one, at `scripts/verify-workflows.mjs:982`, that round 2 wrote and that nothing in this file
 * remembered. See case 17's docblock for the measurement.
 *
 * Returns the input unchanged when the anchor is absent, so a drifted anchor lands on
 * `withMutatedWorkflows`'s differs-from-input assertion.
 */
function withAppendedRefusalArgument(argument: string): (ci: string) => string {
  return (ci) => {
    const eol = eolOf(ci);
    const anchor = `      - name: ${MAIL_STEP_NAME}${eol}`;
    const at = ci.indexOf(anchor);
    if (at < 0) return ci;
    const runEnd = ci.indexOf(eol, at + anchor.length);
    if (runEnd < 0) return ci;
    return `${ci.slice(0, runEnd)} ${argument}${ci.slice(runEnd)}`;
  };
}

/**
 * Inserts one line — or a whole BLOCK of lines — indented four spaces, immediately after the given
 * job's key line. The array form exists because a `defaults:` block is three lines deep and joining
 * them here rather than at the call site is what keeps the EOL detected from the file being
 * mutated; a caller that joined with `\n` would write LF into a CRLF copy and make the red red for
 * the wrong reason.
 *
 * ⚠ THE JOB KEY IS A PARAMETER AND THERE IS NO DEFAULT — 19-REVIEW.md finding IN-02, closed by plan
 * 19.1-05. This function used to read `CI_E2E_JOB` itself and fall back to a hard-coded second
 * copy of that key when the declaration did not match, three lines below a reader that THROWS on
 * exactly that condition and says why. The two behaviours cannot both be right. A fallback here is
 * strictly worse than one anywhere else in this file, because the string it guesses is the ANCHOR:
 * a wrong job key inserts the mutation into a job the checker is not being asked about, the
 * mutation applies, `withMutatedWorkflows`'s differs-from-input assertion is satisfied, and the
 * case then measures a red — or a green — that has nothing to do with its own name. Every call site
 * now passes a constant read through `constFromChecker`, which throws.
 */
function withJobKey(jobKey: string, lines: string | string[]): (ci: string) => string {
  return (ci) => {
    const eol = eolOf(ci);
    const block = (Array.isArray(lines) ? lines : [lines]).map((l) => `    ${l}`).join(eol);
    // The leading terminator is what pins `  <jobKey>:` to JOB level. It is composed from the EOL
    // of the file being mutated rather than hardcoded as `\n`, and the reason is NOT that the
    // hardcode was the defect — it was measured not to be (control B, 2026-09-05: with
    // `insertAfterLineContaining` repaired, restoring the `\n` anchor here leaves all 38 cases
    // green). The reason is that `\n` is a terminator on ONE of the two checkouts this repository
    // is built on, so anchor arithmetic spelled against it is right on that one and accidental on
    // the other. Composed from `eolOf`, an arithmetic error becomes EOL-SYMMETRIC: red on both
    // checkouts rather than red only on the runner. That difference is the whole subject of the
    // repair these lines come from.
    return insertAfterLineContaining(ci, `${eol}  ${jobKey}:`, block);
  };
}

/**
 * Inserts a COMPLETE zero-indented block on its own lines immediately BEFORE the `jobs:` key line —
 * i.e. at WORKFLOW level, outside every job. This is the level a step-key allow-list structurally
 * cannot see: nothing it inserts appears among the refusal step's own keys, yet a `defaults.run.shell`
 * here changes the interpreter for every step in the file, the refusal included.
 */
function withWorkflowLevelBlock(blockLines: string[]): (ci: string) => string {
  return (ci) => {
    const eol = eolOf(ci);
    const anchor = `${eol}jobs:${eol}`;
    const at = ci.indexOf(anchor);
    if (at < 0) return ci;
    const cut = at + eol.length;
    return `${ci.slice(0, cut)}${blockLines.join(eol)}${eol}${ci.slice(cut)}`;
  };
}

/**
 * Removes the pull-request trigger line from the `on:` block, INCLUDING its line terminator, so no
 * blank line is left behind to change the block's shape for a reason unrelated to the property under
 * test. The anchor is the key exactly as it appears in the file — two-space indent, nothing after the
 * colon — and a drifted anchor returns the input unchanged, landing on `withMutatedWorkflows`'s
 * differs-from-input assertion rather than silently deleting something else.
 */
function withoutPullRequestTrigger(): (ci: string) => string {
  return (ci) => {
    const eol = eolOf(ci);
    const line = "  pull_request:";
    const anchor = `${eol}${line}${eol}`;
    const at = ci.indexOf(anchor);
    if (at < 0) return ci;
    return `${ci.slice(0, at + eol.length)}${ci.slice(at + eol.length + line.length + eol.length)}`;
  };
}

/**
 * Adds a FILTER under the pull-request trigger, four-space indented, without touching the key. This
 * is 19-REVIEW.md CR-01's mutation class: the trigger survives, so a membership test cannot see it,
 * while the gates below it become unreachable from the pull requests the filter excludes.
 *
 * Returns the input unchanged when the anchor is absent, so a drifted anchor lands on
 * `withMutatedWorkflows`'s differs-from-input assertion.
 */
function withPullRequestFilter(filterLine: string): (ci: string) => string {
  // The anchor's leading terminator is composed from the file's own EOL for the reason given at
  // `withJobKey` — symmetry, not correctness. What this builder ACTUALLY did wrong on an LF
  // checkout was inherited from `insertAfterLineContaining`: the filter landed one line EARLY,
  // under `push:`, where `branches:` already exists, so `yaml` rejected the document with
  // `Map keys must be unique` and case 25 measured a parse error instead of the trigger invariant.
  return (ci) =>
    insertAfterLineContaining(ci, `${eolOf(ci)}  pull_request:`, `    ${filterLine}`);
}

/**
 * Rewrites the push trigger's branch list to exactly `branches`. Both the anchor and the replacement
 * are COMPOSED from the branch names read out of the checker, so this builder cannot construct a
 * file the checker was not asked about — and a rename of either branch lands on the differs-from-
 * input assertion rather than producing a quietly-different mutation.
 */
function withPushBranches(branches: string[]): (ci: string) => string {
  return (ci) => {
    const eol = eolOf(ci);
    const anchor = `${eol}    branches: [${CHECKER_DEV_BRANCH}, ${CHECKER_DEFAULT_BRANCH}]${eol}`;
    const at = ci.indexOf(anchor);
    if (at < 0) return ci;
    return `${ci.slice(0, at)}${eol}    branches: [${branches.join(", ")}]${eol}${ci.slice(
      at + anchor.length,
    )}`;
  };
}

/**
 * Rewrites the whole `on:` MAPPING block into the documented SEQUENCE spelling
 * `on: [push, pull_request]` — semantically a correct, MORE permissive file: both triggers present,
 * and push no longer narrowed to two branches, so it reaches every branch including both of the ones
 * the checker requires.
 *
 * ⚠ THIS BUILDER EXISTS TO PRODUCE A GREEN, NOT A RED. See its case's docblock. The anchor is the
 * entire block as this file writes it, composed from the branch names read out of the checker.
 */
function withSequenceFormTriggerBlock(): (ci: string) => string {
  return (ci) => {
    const eol = eolOf(ci);
    const anchor = [
      "on:",
      "  push:",
      `    branches: [${CHECKER_DEV_BRANCH}, ${CHECKER_DEFAULT_BRANCH}]`,
      "  pull_request:",
    ].join(eol);
    const at = ci.indexOf(`${eol}${anchor}${eol}`);
    if (at < 0) return ci;
    return `${ci.slice(0, at + eol.length)}on: [push, pull_request]${ci.slice(at + eol.length + anchor.length)}`;
  };
}

/**
 * Inserts a COMPLETE step, six-space `- ` indented, immediately BEFORE the refusal step's `- name:`
 * line — so the inserted step precedes the only control that protects the CURRENT run.
 */
function withStepBeforeRefusal(stepLines: string[]): (ci: string) => string {
  return (ci) => {
    const eol = eolOf(ci);
    const anchor = `      - name: ${MAIL_STEP_NAME}`;
    const at = ci.indexOf(anchor);
    if (at < 0) return ci;
    const block = stepLines.map((l) => `      ${l}`).join(eol);
    return `${ci.slice(0, at)}${block}${eol}${ci.slice(at)}`;
  };
}

/**
 * Removes `gate-db-free`'s checker step — BOTH of its lines, the `- name:` and the `run:` beneath it
 * — INCLUDING their line terminators, so no orphaned fragment is left behind to change the job's
 * shape for a reason unrelated to the property under test. Returns the input unchanged when the
 * anchor is absent, so a drifted anchor lands on `withMutatedWorkflows`'s differs-from-input
 * assertion rather than silently deleting something else.
 *
 * This is 19-REVIEW.md CR-03's mutation, verbatim: the two-line edit that left the checker printing
 * a clean green over the job that no longer ran it.
 */
function withoutCheckerStep(): (ci: string) => string {
  return (ci) => {
    const eol = eolOf(ci);
    const anchor = `      - name: ${CHECKER_STEP_NAME}${eol}`;
    const at = ci.indexOf(anchor);
    if (at < 0) return ci;
    const runEnd = ci.indexOf(eol, at + anchor.length);
    if (runEnd < 0) return ci;
    return `${ci.slice(0, at)}${ci.slice(runEnd + eol.length)}`;
  };
}

/**
 * Appends `argument` to the checker step's `run:` line, leaving everything else byte-identical: same
 * step, same name, same position, no new key. The step still runs the checker — with an argument.
 *
 * ⚠ THE ALLOW-LIST CANNOT SEE THIS, BY CONSTRUCTION. `run` is a PERMITTED key on that step, so the
 * key-set conjunct is satisfied before and after; only the exact-equality comparison of the `run`
 * VALUE puts the two commands on opposite sides. That is the property this builder exists to
 * measure, and it is the one a containment test would silently lose.
 *
 * Returns the input unchanged when the anchor is absent, so a drifted anchor lands on
 * `withMutatedWorkflows`'s differs-from-input assertion.
 */
function withAppendedCheckerArgument(argument: string): (ci: string) => string {
  return (ci) => {
    const eol = eolOf(ci);
    const anchor = `      - name: ${CHECKER_STEP_NAME}${eol}`;
    const at = ci.indexOf(anchor);
    if (at < 0) return ci;
    const runEnd = ci.indexOf(eol, at + anchor.length);
    if (runEnd < 0) return ci;
    return `${ci.slice(0, runEnd)} ${argument}${ci.slice(runEnd)}`;
  };
}

/**
 * Inserts a COMPLETE step at the TOP of `gate-db-free`'s step list — ahead of everything, including
 * the checker step. The job key is located first and the `steps:` key is found FROM THERE, because
 * `    steps:` on its own appears in every job in the file and an unscoped anchor would insert into
 * whichever job happens to come first.
 *
 * Returns the input unchanged when either anchor is absent, so a drifted anchor lands on
 * `withMutatedWorkflows`'s differs-from-input assertion.
 */
function withStepFirstInCheckerJob(stepLines: string[]): (ci: string) => string {
  return (ci) => {
    const eol = eolOf(ci);
    const jobAt = ci.indexOf(`${eol}  ${CHECKER_JOB}:${eol}`);
    if (jobAt < 0) return ci;
    const stepsAnchor = `${eol}    steps:${eol}`;
    const stepsAt = ci.indexOf(stepsAnchor, jobAt);
    if (stepsAt < 0) return ci;
    const cut = stepsAt + stepsAnchor.length;
    const block = stepLines.map((l) => `      ${l}`).join(eol);
    return `${ci.slice(0, cut)}${block}${eol}${ci.slice(cut)}`;
  };
}

/** Inserts `line`, indented eight spaces, immediately after the BUILD step's `- name:` line. */
function withBuildStepKey(line: string): (ci: string) => string {
  return (ci) => insertAfterLineContaining(ci, `- name: ${BUILD_STEP_NAME}`, `        ${line}`);
}

/**
 * Appends `argument` to the BUILD step's `run:` line — the adjacency probe, one step over from
 * `withAppendedCheckerArgument`. Same construction and same blind spot being measured: `run` is a
 * PERMITTED key on this step too, so the allow-list compares KEY SETS and cannot see a changed
 * value; only the trimmed exact-equality conjunct can.
 *
 * Returns the input unchanged when the anchor is absent, so a drifted anchor lands on
 * `withMutatedWorkflows`'s differs-from-input assertion.
 */
function withAppendedBuildArgument(argument: string): (ci: string) => string {
  return (ci) => {
    const eol = eolOf(ci);
    const anchor = `      - name: ${BUILD_STEP_NAME}${eol}`;
    const at = ci.indexOf(anchor);
    if (at < 0) return ci;
    const runEnd = ci.indexOf(eol, at + anchor.length);
    if (runEnd < 0) return ci;
    return `${ci.slice(0, runEnd)} ${argument}${ci.slice(runEnd)}`;
  };
}

/**
 * Removes `gate-db-free`'s BUILD step — the WHOLE step, not just its first two lines.
 *
 * ⚠ THE "WHOLE STEP" PART IS NOT TIDINESS, IT IS THE DIFFERENCE BETWEEN MEASURING THIS PROPERTY AND
 * MEASURING A DIFFERENT ONE. This step carries an `env:` map, and it is the LAST step of the job.
 * Deleting only its `- name:` and `run:` lines — the shape `withoutCheckerStep` uses, correctly,
 * for a two-line step — would leave that map orphaned at a deeper indent under the PRECEDING step,
 * where YAML attaches it to the CHECKER step. The checker would then go red on the checker step's
 * key-surface allow-list, and a case named for the build step would be passing on somebody else's
 * failure. That was observed while capturing this plan's evidence and is why the boundary below is
 * computed from indentation rather than assumed to be two lines.
 *
 * The step runs from its `- name:` line up to (not including) the first following line that is
 * non-blank and indented SIX SPACES OR LESS — i.e. the next step, the next comment at step level,
 * or the end of the job. Trailing blank lines are left in place so the separation before whatever
 * follows is unchanged.
 *
 * Returns the input unchanged when the anchor is absent, so a drifted anchor lands on
 * `withMutatedWorkflows`'s differs-from-input assertion.
 */
function withoutBuildStep(): (ci: string) => string {
  return (ci) => {
    const eol = eolOf(ci);
    const lines = ci.split(eol);
    const start = lines.findIndex((l) => l === `      - name: ${BUILD_STEP_NAME}`);
    if (start < 0) return ci;
    let end = start + 1;
    while (end < lines.length && (lines[end].trim() === "" || /^ {7,}/.test(lines[end]))) end += 1;
    while (end > start + 1 && lines[end - 1].trim() === "") end -= 1;
    return [...lines.slice(0, start), ...lines.slice(end)].join(eol);
  };
}

/**
 * Renames `gate-db-free`'s `name:` — and NOTHING else. The job key does not move, the steps do not
 * move, the checker invocation does not move: this is the edit that leaves the job perfectly intact
 * and detaches it from the required-status-check list SC5 installs on `main`. Returns the input
 * unchanged when the anchor is absent, so a drifted anchor lands on `withMutatedWorkflows`'s
 * differs-from-input assertion.
 */
function withRenamedCheckerJobName(): (ci: string) => string {
  return (ci) => {
    const anchor = `    name: ${CHECKER_CONTEXT}`;
    const at = ci.indexOf(anchor);
    if (at < 0) return ci;
    return `${ci.slice(0, at)}    name: ${CHECKER_JOB} (renamed)${ci.slice(at + anchor.length)}`;
  };
}

/**
 * ── THE JOB-SCOPED STEP PRIMITIVES (plan 19.1-06) ────────────────────────────────────────────────
 *
 * ⚠ EVERY ONE OF THESE TAKES A JOB KEY AND FINDS ITS STEP *FROM THERE*, AND THAT IS NOT TIDINESS.
 * `      - name: Migrate the database` appears in THREE jobs of `ci.yml`. The first draft of this
 * plan's hand-mutation harness used an UNSCOPED `indexOf` for exactly that anchor, and quietly
 * inserted two decoys into `gate-price-parity` — producing three reds attributed to vectors they
 * had nothing to do with. That was caught only because the FAIL lines named invariants the vectors
 * were not about. A mutation harness is subject to the same rule as the checker it measures: locate
 * the subject exactly, once, and never by a string that is ambiguous in the document.
 *
 * `withStepFirstInCheckerJob` above is the same idea for `gate-db-free`, written before these
 * existed; it is left alone rather than rewritten in terms of these, because its own docblock
 * already states the scoping argument and a case that passes is not a case to churn.
 */

/** The character offset of `  <jobKey>:` at job level, or -1. */
function jobKeyAt(ci: string, jobKey: string): number {
  return ci.indexOf(`${eolOf(ci)}  ${jobKey}:${eolOf(ci)}`);
}

/**
 * The `[start, end)` span of the TWO-LINE step named `stepName` inside `jobKey` — its `- name:`
 * line and the `run:` line beneath it, both including their terminators. Null when either the job
 * or the step is absent, so every caller returns its input unchanged and lands on the
 * differs-from-input assertion.
 *
 * Two lines is correct for every step these cases move: all of them carry exactly `name` and `run`.
 * `withoutBuildStep` above computes its boundary from INDENTATION instead, because the step it
 * removes carries an `env:` map — see its docblock for what happens when that distinction is
 * missed.
 */
function stepSpan(
  ci: string,
  jobKey: string,
  stepName: string,
): { start: number; end: number } | null {
  const eol = eolOf(ci);
  const job = jobKeyAt(ci, jobKey);
  if (job < 0) return null;
  const anchor = `      - name: ${stepName}${eol}`;
  const start = ci.indexOf(anchor, job);
  if (start < 0) return null;
  const end = ci.indexOf(eol, start + anchor.length);
  if (end < 0) return null;
  return { start, end: end + eol.length };
}

/** Inserts a complete step immediately AFTER the named step of the named job. */
function withStepAfterInJob(
  jobKey: string,
  afterStepName: string,
  stepLines: string[],
): (ci: string) => string {
  return (ci) => {
    const eol = eolOf(ci);
    const span = stepSpan(ci, jobKey, afterStepName);
    if (span === null) return ci;
    const block = stepLines.map((l) => `      ${l}`).join(eol);
    return `${ci.slice(0, span.end)}${block}${eol}${ci.slice(span.end)}`;
  };
}

/** Inserts a complete step immediately BEFORE the named step of the named job. */
function withStepBeforeInJob(
  jobKey: string,
  beforeStepName: string,
  stepLines: string[],
): (ci: string) => string {
  return (ci) => {
    const eol = eolOf(ci);
    const span = stepSpan(ci, jobKey, beforeStepName);
    if (span === null) return ci;
    const block = stepLines.map((l) => `      ${l}`).join(eol);
    return `${ci.slice(0, span.start)}${block}${eol}${ci.slice(span.start)}`;
  };
}

/**
 * MOVES the named step of the named job to sit immediately after another step of the same job.
 * Byte-for-byte the same step — same name, same `run:`, same keys — in a different POSITION. That
 * is the whole point: every conjunct except the ordering one is satisfied identically before and
 * after, so a red here can only come from the ordering claim.
 */
function withStepMovedAfterInJob(
  jobKey: string,
  stepName: string,
  afterStepName: string,
): (ci: string) => string {
  return (ci) => {
    const span = stepSpan(ci, jobKey, stepName);
    if (span === null) return ci;
    const text = ci.slice(span.start, span.end);
    const without = `${ci.slice(0, span.start)}${ci.slice(span.end)}`;
    const dest = stepSpan(without, jobKey, afterStepName);
    if (dest === null) return ci;
    return `${without.slice(0, dest.end)}${text}${without.slice(dest.end)}`;
  };
}

/** MOVES the named step of the named job to be the FIRST step of that job. */
function withStepMovedFirstInJob(jobKey: string, stepName: string): (ci: string) => string {
  return (ci) => {
    const eol = eolOf(ci);
    const span = stepSpan(ci, jobKey, stepName);
    if (span === null) return ci;
    const text = ci.slice(span.start, span.end);
    const without = `${ci.slice(0, span.start)}${ci.slice(span.end)}`;
    const job = jobKeyAt(without, jobKey);
    if (job < 0) return ci;
    const stepsAnchor = `${eol}    steps:${eol}`;
    const at = without.indexOf(stepsAnchor, job);
    if (at < 0) return ci;
    const cut = at + stepsAnchor.length;
    return `${without.slice(0, cut)}${text}${without.slice(cut)}`;
  };
}

/**
 * Rewrites the named step's `run:` line, replacing `from` with `to`. Used to switch the visual
 * job's Playwright invocation to a different project while a decoy elsewhere keeps naming the
 * right one — the two halves of RESEARCH.md inventory row 6's project-detection vector.
 */
function withStepRunReplacedInJob(
  jobKey: string,
  stepName: string,
  from: string,
  to: string,
): (ci: string) => string {
  return (ci) => {
    const span = stepSpan(ci, jobKey, stepName);
    if (span === null) return ci;
    const text = ci.slice(span.start, span.end);
    if (!text.includes(from)) return ci;
    return `${ci.slice(0, span.start)}${text.replace(from, to)}${ci.slice(span.end)}`;
  };
}

/** The FIRST line of the named step's `run:` body, without the `run: ` prefix. "" when absent. */
function firstRunLineOf(text: string, jobKey: string, stepName: string): string {
  const span = stepSpan(text, jobKey, stepName);
  if (span === null) return "";
  const eol = eolOf(text);
  const lines = text.slice(span.start, span.end).split(eol);
  const run = lines[1] ?? "";
  // Either `run: <command>` or `run: |` followed by an indented block — take the command line.
  const inline = run.replace(/^\s*run:\s?/, "");
  if (inline.trim() !== "" && inline.trim() !== "|") return inline.trim();
  const after = text.slice(span.end).split(eol);
  return (after[0] ?? "").trim();
}

/**
 * ⚠ `stepSpan` ABOVE IS TWO LINES AND THE STAGING STEP IS A BLOCK SCALAR, so this builder RENAMES
 * rather than deletes: renaming touches exactly one line and leaves the step's body untouched,
 * which is what makes the case measure the ANCHOR rather than a structural edit. It is also the
 * edit class this repository already cares most about — `withRenamedCheckerJobName` above is the
 * same idea one level up, and its docblock explains why a rename is the quiet one.
 */
function withRenamedStepInJob(
  jobKey: string,
  stepName: string,
  newName: string,
): (text: string) => string {
  return (text) => {
    const span = stepSpan(text, jobKey, stepName);
    if (span === null) return text;
    return `${text.slice(0, span.start)}      - name: ${newName}${eolOf(text)}${text.slice(
      span.start + `      - name: ${stepName}${eolOf(text)}`.length,
    )}`;
  };
}

/** Appends `argument` to the named step's `run:` line, inside the named job. */
function withAppendedRunArgumentInJob(
  jobKey: string,
  stepName: string,
  argument: string,
): (text: string) => string {
  return (text) => {
    const eol = eolOf(text);
    const span = stepSpan(text, jobKey, stepName);
    if (span === null) return text;
    const runEnd = span.end - eol.length;
    return `${text.slice(0, runEnd)} ${argument}${text.slice(runEnd)}`;
  };
}

/**
 * Shared insertion primitive. Returns the input UNCHANGED when the anchor is absent, so a drifted
 * anchor lands on `withMutatedWorkflows`'s differs-from-input assertion rather than producing a
 * quietly-different mutation somewhere else in the file.
 *
 * ⚠ THE SEARCH FOR THE LINE END STARTS **AFTER** THE ANCHOR, AND THAT IS NOT A MICRO-OPTIMISATION.
 * Some callers anchor on `${eol}  <key>:` — a leading line terminator is how a two-space-indented
 * key is pinned to JOB level rather than matched inside a deeper block. For such an anchor `at` is
 * the offset OF a line terminator, so a search that began at `at` returned `at` itself on an LF
 * tree: `cut` became the START of the anchored line and the insertion landed one line EARLY, at
 * the tail of whatever came before. On the CRLF checkout this working tree uses, the same search
 * skipped the `\r` and stopped at the `\n` one byte later — inside the SAME terminator — so `cut`
 * came out correct and the defect was invisible here. That is the entire mechanism behind the six
 * cases that were green on this box and red on the runner (phase 19.1 `deferred-items.md`,
 * "the SC2 guard suite is a WINDOWS-ONLY green"), and it is why the LF/CRLF equivalence case at the
 * end of this file exists: EOL-dependent behaviour in the harness is invisible to every case that
 * only ever runs on one kind of checkout.
 *
 * Searching from `at + anchor.length` is correct for BOTH anchor shapes — no anchor in this file
 * contains a line terminator anywhere but its first character — and is byte-for-byte identical to
 * the old behaviour for every anchor that carries no terminator at all.
 *
 * THIS LINE IS THE WHOLE REPAIR, and that was established by isolation rather than by argument
 * (2026-09-05, three controls run against an LF working tree):
 *   • both this line and the two `\n` anchors reverted → the six cases fail, case 37 fails;
 *   • ONLY the `\n` anchors reverted, this line repaired → all 38 green. The hardcoded anchors are
 *     NOT the defect;
 *   • ONLY this line reverted, the anchors composed from `eolOf` → the same six fail, and they fail
 *     on a CRLF checkout too. That is the shape a symmetric error takes: loud everywhere.
 * The phase's `deferred-items.md` attributed the failure to the anchors. It is the primitive.
 */
function insertAfterLineContaining(ci: string, anchor: string, insertion: string): string {
  const eol = eolOf(ci);
  const at = ci.indexOf(anchor);
  if (at < 0) return ci;
  const lineEnd = ci.indexOf(eol, at + anchor.length);
  if (lineEnd < 0) return ci;
  const cut = lineEnd + eol.length;
  return `${ci.slice(0, cut)}${insertion}${eol}${ci.slice(cut)}`;
}

/** A fragment of the unconditional invariant's printed name, stable across its 19-14 rename. */
const UNCONDITIONAL = "is unconditional";
/** A fragment of Invariant C's printed name, stable across its 19-14 rename. */
const REFUSAL_ORDERING = "refuses a live mail credential BEFORE it migrates";
/** A fragment of Invariant A's printed name, stable across its 19-14 rename. */
const MAIL_REFUSAL = "mail refusal reads the REAL process environment";
/** A fragment of the execution-defaults invariant's printed name (new in plan 19-15). */
const EXECUTION_DEFAULTS = "runs its steps with the runner's DEFAULT interpreter";
/** A fragment of the trigger invariant's printed name (new in plan 19-15). */
const CI_TRIGGERS = "runs on BOTH push and pull_request";
/** A fragment of the checker-step invariant's printed name (new in plan 19.1-01, CR-03). */
const CHECKER_STEP = "carries the step that RUNS this checker";
/**
 * A fragment of the `gate-db-free` display-name pin's printed name (new in plan 19.1-01). The job
 * key is COMPOSED IN rather than left out, because `gate-e2e` carries a display-name pin of its own
 * whose printed name is otherwise identical — a bare fragment would be satisfied by the wrong red.
 */
const CHECKER_DISPLAY_NAME = `"${CHECKER_JOB}" declares the exact display name`;
/**
 * A fragment of the build-step invariant's printed name (new in plan 19.1-05). Unique without the
 * job key — no other invariant in the checker names lint and the design suite — so the fragment is
 * the distinguishing clause itself rather than a composition.
 */
const BUILD_STEP = "carries the step that runs lint, the design suite and the build";
/**
 * Fragments of `gate-db-free`'s unconditional and job-defaults invariants (new in plan 19.1-05).
 * The job key is COMPOSED IN for the `CHECKER_DISPLAY_NAME` reason, and here it is not merely
 * prudent but REQUIRED: `gate-e2e` carries a sibling of each, and the two printed names share every
 * word after the job key. A bare fragment would be satisfied by the wrong job's red, which is the
 * one way a case in this file can pass while measuring nothing.
 */
const CHECKER_UNCONDITIONAL = `"${CHECKER_JOB}" is unconditional`;
const CHECKER_JOB_DEFAULTS = `"${CHECKER_JOB}" runs its steps with the runner's DEFAULT interpreter`;
/**
 * Fragments of the three ORDERING/PROJECT invariants repaired by plan 19.1-06. The job key is
 * COMPOSED IN for all three, for the `CHECKER_DISPLAY_NAME` reason and one sharper: the two
 * ordering invariants are siblings whose printed names would otherwise be confusable, and a case
 * that matched the wrong job's red would be reporting a pass on somebody else's failure.
 */
const E2E_SEED_ORDERING = `"${E2E_JOB}" seeds the demo catalogue BEFORE it runs the suite`;
const VISUAL_ORDERING = `"${VISUAL_JOB}" runs migrate, then seed, then playwright`;
const VISUAL_PROJECT_BY_NAME = `"${VISUAL_JOB}" runs the visual project BY NAME`;

describe("the workflow checker's own predicates, measured against a mutated copy", () => {
  // THE CONTROL. An identity mutation is impossible by construction (the differs-from-input
  // assertion would fire), so this case changes only a COMMENT line. It proves the copied tree is a
  // FAITHFUL SUBJECT — so that every red below is red for its own reason, rather than for a missing
  // `package.json`, an absent sibling workflow or a truncated copy.
  it("case 1 (control): an unmutated copy is green, and pins the invariant total", () => {
    withMutatedWorkflows(
      (ci) => `${ci}${eolOf(ci)}# a comment appended by the control case; no YAML key changes${eolOf(ci)}`,
      (result) => {
        expect(
          result.status,
          `the control case did not go green.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`,
        ).toBe(0);
        expect(String(result.stdout)).toContain(EXPECTED_GREEN);
      },
    );
  });

  // THE MEASURED CUSTOM-SHELL VECTOR (19-REVIEW.md CR-01, reproduced independently by
  // 19-VERIFICATION.md). This mutation leaves the `run:` string BYTE-IDENTICAL, adds no `env:`, no
  // `if:` and no `continue-on-error:`, and does not move the step — so every conjunct that existed
  // before plan 19-14 stayed green while the interpreter PRINTED the script instead of executing it,
  // and the suite proceeded to migrate, seed and boot with a live mail credential in the environment.
  it("case 2: a custom-shell override on the refusal step is red", () => {
    withMutatedWorkflows(withRefusalStepKey("shell: cat {0}"), (result) => {
      expectRed(result, MAIL_REFUSAL);
    });
  });

  // THE UNKNOWN-UNKNOWN, AND THE POINT OF THE WHOLE PLAN. `working-directory` is a real GitHub
  // Actions step attribute, plausible on a step like this one, and `grep -c` returned 0 for it
  // against BOTH `scripts/verify-workflows.mjs` and `.github/workflows/ci.yml` before it was chosen.
  // No predicate names it or its family. A red on case 2 alone would prove nothing more than another
  // deny-list entry would; THIS case is the only evidence that a key nobody has thought of is red by
  // default, which is the difference between a control and a record of the last audit.
  it("case 3: a step key the checker's source never names is red anyway", () => {
    withMutatedWorkflows(withRefusalStepKey("working-directory: ."), (result) => {
      expectRed(result, MAIL_REFUSAL);
    });
  });

  // An Actions EXPRESSION parses to a STRING, which is why a value comparison against the JavaScript
  // boolean was green in BOTH directions (`=== true` false, `!== true` true) — and why the fix is to
  // stop comparing values at all. `${{ matrix.experimental }}` is GitHub's own canonical example for
  // this key, so the expression form is the documented spelling, not an exotic one.
  it("case 4: continue-on-error as an Actions expression on the refusal step is red", () => {
    withMutatedWorkflows(withRefusalStepKey("continue-on-error: ${{ true }}"), (result) => {
      expectRed(result, UNCONDITIONAL);
    });
  });

  // A SECOND SPELLING of the same defeat, kept as its own case because "the expression form" and
  // "the quoted-string form" are different inputs, and a predicate that catches one is not proof it
  // catches the other. That inference is exactly what cost rounds 2 and 3.
  it("case 5: continue-on-error as a quoted string on the refusal step is red", () => {
    withMutatedWorkflows(withRefusalStepKey('continue-on-error: "true"'), (result) => {
      expectRed(result, UNCONDITIONAL);
    });
  });

  // REGRESSION, plan 19-13. This is the literal-boolean mutation that round already closed, kept
  // standing so the presence test cannot be loosened back into a value test without a red. It passed
  // BEFORE plan 19-14's predicate change as well as after — which is the evidence that this file
  // measures the same subject 19-13's hand-applied mutations did.
  it("case 6 (regression, 19-13): a literal continue-on-error on the refusal step is red", () => {
    withMutatedWorkflows(withRefusalStepKey("continue-on-error: true"), (result) => {
      expectRed(result, UNCONDITIONAL);
    });
  });

  // THE JOB LEVEL CARRIES THE IDENTICAL HOLE. The check claims to be a strict widening of what plan
  // 19-11 shipped at job level, and until plan 19-14 it was weaker there too: the job read compared
  // the same key against the same boolean.
  it("case 7: continue-on-error as an Actions expression on the JOB is red", () => {
    withMutatedWorkflows(withJobKey(E2E_JOB, "continue-on-error: ${{ true }}"), (result) => {
      expectRed(result, UNCONDITIONAL);
    });
  });

  // REGRESSION, plan 19-13. `if:` was ALREADY presence-tested and already correct — this is the
  // conjunct plan 19-14 copies for its sibling, kept standing so the shape that worked cannot be
  // quietly reverted alongside the shape that did not.
  it("case 8 (regression, 19-13): an if: on the refusal step is red", () => {
    withMutatedWorkflows(withRefusalStepKey("if: false"), (result) => {
      expectRed(result, UNCONDITIONAL);
    });
  });

  // WR-05. Before plan 19-14 the permitted-predecessor test quantified over RUN COMMANDS
  // (`runsOf`, which filters to steps carrying a string `run:`), so a `uses:` step was not merely
  // permitted — it was UNREACHABLE by the predicate that claimed to restrict what may precede the
  // refusal. Any number of them could sit ahead of the only control that protects the current run,
  // and one first-party action alone can execute arbitrary JavaScript in the job, while the
  // invariant's own name said only the install command may precede.
  it("case 9: a uses: step inserted ahead of the refusal is red", () => {
    withMutatedWorkflows(withStepBeforeRefusal(["- uses: actions/github-script@v7"]), (result) => {
      expectRed(result, REFUSAL_ORDERING);
    });
  });

  // CR-01's OUTER HALF (19-REVIEW.md, and 19-VERIFICATION.md gap 1's `missing:` bullet). Plan 19-14
  // closed the step's own attribute surface with an allow-list; this reaches into `gate-e2e` from
  // OUTSIDE the job entirely. The allow-list reads the keys ON the step, and a workflow-level
  // `defaults:` block puts no key there — yet it sets the interpreter for every step below it,
  // refusal included, with exactly the effect case 2 measured. `grep -n "shell\|defaults"` over the
  // whole checker returned no matches before plan 19-15: neither level was read anywhere.
  it("case 10: a workflow-level defaults: block is red", () => {
    withMutatedWorkflows(
      withWorkflowLevelBlock(["defaults:", "  run:", "    shell: cat {0}"]),
      (result) => {
        expectRed(result, EXECUTION_DEFAULTS);
      },
    );
  });

  // THE SECOND OF THE TWO WAYS IN, kept as its own case for the same reason cases 4 and 5 are two.
  // A check that closed the workflow level and not the job level would be the same partial answer —
  // "the axis that was measured rather than the axis the prose claims" — that this phase has now
  // paid for across four rounds.
  it("case 11: a job-level defaults: block on gate-e2e is red", () => {
    withMutatedWorkflows(
      withJobKey(E2E_JOB, ["defaults:", "  run:", "    shell: cat {0}"]),
      (result) => {
        expectRed(result, EXECUTION_DEFAULTS);
      },
    );
  });

  // WR-01, AND THE ONE MUTATION THAT FALSIFIES THE REQUIREMENT ITSELF. 19-VERIFICATION.md deleted
  // this single line from the tracked file, re-ran the checker and recorded `CHECKER-EXIT=0` with
  // `(NO FAIL LINE)` and the summary line unchanged at all 48 invariants — while EVERY gate in the
  // file, `gate-e2e` included, silently detached from pull requests. CI-01's requirement text is
  // literally "opening a pull request runs the repository's functional Playwright specs", so this
  // is the one trigger whose absence falsifies the requirement the phase claims to have satisfied.
  it("case 12: deleting the pull_request trigger is red", () => {
    withMutatedWorkflows(withoutPullRequestTrigger(), (result) => {
      expectRed(result, CI_TRIGGERS);
    });
  });

  // CR-03, AND THE ONE MUTATION THAT DELETES THE CHECKER ITSELF RATHER THAN ANYTHING IT CHECKS.
  // Every case above mutates something `gate-e2e` declares and measures the checker's answer. This
  // one deletes the two lines that RUN the checker, from `gate-db-free`, and measures the same
  // thing — because for the whole of plans 19-11 through 19-15 that edit was GREEN. It was
  // reproduced twice on the tracked file, by the reviewer and independently by the verifier: exit
  // 0, no FAIL line, and the summary line unchanged at all 50 invariants, over a workflow in which
  // nothing would ever evaluate them again. Every other red in this file was conditional on a step
  // whose existence nothing asserted.
  it("case 13 (CR-03): deleting gate-db-free's checker step is red", () => {
    withMutatedWorkflows(withoutCheckerStep(), (result) => {
      expectRed(result, CHECKER_STEP);
    });
  });

  // THE QUIETER HALF OF CR-03, AND THE ONE THAT SURVIVES EVERY OTHER INVARIANT INTACT. Case 13's
  // mutation removes work; this one removes nothing. The job key does not move, the steps do not
  // move, the checker invocation is byte-identical — so case 13's predicate, the hard stop, and
  // every universally-quantified assertion in the file all still pass. What moves is the ONE string
  // GitHub matches a required status check by, which SC5 is about to make required on `main`. It was
  // measured GREEN on the tracked file before this pin existed (guards-01-pre-fix.txt, MUTATION 2):
  // exit 0, no FAIL line, all 51 invariants reported holding, over a job that branch protection
  // would no longer recognise.
  it("case 14: renaming gate-db-free's display name is red", () => {
    withMutatedWorkflows(withRenamedCheckerJobName(), (result) => {
      expectRed(result, CHECKER_DISPLAY_NAME);
    });
  });

  // WHAT WAS MEASURED: `run` is a PERMITTED key on the checker step, so the allow-list conjunct is
  // satisfied identically before and after this mutation — it compares KEY SETS, and no key moved.
  // The step still exists, still carries its exact `name:`, still sits in the same position, and
  // still runs this checker. The ONLY conjunct that can discriminate here is the exact-equality
  // comparison of the `run` value after `.trim()`, which is why that conjunct is an equality and not
  // a containment test. Written as containment — which every argument list in the world satisfies —
  // this case would be GREEN, and that is review finding WR-01's defect, asserted here for
  // `gate-db-free` on the day it is repaired for `gate-e2e`.
  it("case 15 (WR-01): appending an argument to gate-db-free's checker invocation is red", () => {
    withMutatedWorkflows(withAppendedCheckerArgument("/tmp/decoy.mjs"), (result) => {
      expectRed(result, CHECKER_STEP);
    });
  });

  // ⚠ THE ONLY CASE IN PLAN 19.1-01 THAT ASSERTS GREEN, AND IT CARRIES ITS OWN JUSTIFICATION.
  //
  // A file of red cases can only ever show that the checker is capable of failing. It cannot show
  // that a defect class is CLOSED rather than MOVED — for that you need a mutation that SHOULD stay
  // green and does. This is that mutation: a step inserted FIRST in `gate-db-free`, ahead of the
  // checker step, whose `run:` merely MENTIONS this checker's path. Against a predicate that located
  // its subject by a substring of a `run:` body (19-REVIEW.md CR-02's defect, still live one job
  // over at the time of writing) this decoy CAPTURES THE ANCHOR: the real checker step is never
  // examined, and every conjunct is then evaluated against an `echo`. Against an anchor that selects
  // by the step's EXACT `name:`, it cannot — so the checker stays green and its summary line is
  // unchanged.
  //
  // ⚠ AND THE DECOY IS NOT HYPOTHETICAL IN THIS JOB. `gate-db-free`'s own FIRST step already carries
  // a multi-line `run:` of free text — `git config` lines, `echo`s and a shell control block — so a
  // substring anchor here would have been capturable on the day it was written, by a step that was
  // already in the file. That is why the anchor rule was applied to this job on arrival instead of
  // being retrofitted after something defeated it.
  //
  // The GREEN is asserted in BOTH halves, the case-1 shape: exit 0 AND the pinned summary line
  // present. Exit 0 alone would also be satisfied by a checker that did nothing at all.
  it("case 16 (anchor control): a decoy step mentioning the checker path stays green", () => {
    withMutatedWorkflows(
      withStepFirstInCheckerJob([
        "- name: Decoy step inserted by the anchor control case",
        '  run: echo "this step merely mentions scripts/verify-workflows.mjs"',
      ]),
      (result) => {
        expect(
          result.status,
          `the anchor control did not go green — a decoy step whose \`run:\` merely MENTIONS the ` +
            `checker path captured an anchor that is supposed to select by exact \`name:\`.\n` +
            `--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`,
        ).toBe(0);
        expect(String(result.stdout)).toContain(EXPECTED_GREEN);
      },
    );
  });

  // ⚠ WR-01 AT ITS ORIGINAL SITE, AND THE CASE THIS FILE WAS BUILT TO CONTAIN AND DID NOT
  // (19-REVIEW.md finding WR-01, named in that document's own minimum list and then dropped).
  //
  // WHAT WAS MEASURED, on 2026-09-05 against the tracked tree, before this case existed
  // (evidence/guards-05-pre-fix.txt, captures 1a–1c):
  //   1a. Appending an argument to this step's `run:` in `ci.yml` turned the checker RED. So the
  //       exact-equality conjunct plan 19-13 wrote at `scripts/verify-workflows.mjs:982` is
  //       CORRECT today. That is not the question.
  //   1b. The standing suite over the unmutated tree was 16 of 16 green — which proves nothing at
  //       all, and is recorded only so that 1c cannot be mistaken for it.
  //   1c. THE QUESTION. That conjunct was then loosened BY HAND, in the shipped checker, from
  //       `=== MAIL_REFUSAL_RUN` to `.startsWith(MAIL_REFUSAL_RUN)` — review finding WR-01's exact
  //       defect, reintroduced — and this file was re-run: SIXTEEN OF SIXTEEN, EXIT 0. Round 2's
  //       own load-bearing fix could be reverted and the instrument built to be the checker's
  //       memory did not move.
  //
  // WHY THIS CASE DOES NOT REVERT THE CONJUNCT, AND WHY THAT IS THE HONEST SHAPE RATHER THAN A
  // COMPROMISE. `withMutatedWorkflows` mutates a COPY of `ci.yml` and spawns the SHIPPED checker
  // at an absolute path; it cannot mutate the checker's source, and a harness that could would be
  // testing a checker nobody runs. So this case exercises the PROPERTY the conjunct is the only
  // thing that can see: `run` is a PERMITTED key on this step, so the allow-list conjunct compares
  // KEY SETS and is satisfied identically before and after; the step keeps its exact `name:`, its
  // position and its key surface. Written as containment — which every argument list in the world
  // satisfies — this mutation is GREEN. Loosen that conjunct again and this case fails. That is
  // the memory, and it is why the argument is `--decoy` rather than something inert: the refusal
  // script's own cases 7 and 8 prove it refuses ANY argument before it reads a file or the
  // environment, so an argument here is not cosmetic, it is a redirection of the only control that
  // protects the current run.
  it("case 17 (WR-01, SC3): appending an argument to the mail refusal invocation is red", () => {
    withMutatedWorkflows(withAppendedRefusalArgument("--decoy"), (result) => {
      expectRed(result, MAIL_REFUSAL);
    });
  });

  // ── CR-03's REMAINING VECTORS, PLAN 19.1-05 ───────────────────────────────────────────────────
  //
  // Cases 18–24 are the standing half of this plan's watched-red pairs. Every one of them was
  // measured on the TRACKED file BEFORE the predicate it names existed, and every one of those
  // measurements is in `evidence/guards-05-pre-fix.txt` with an md5 pair and an empty porcelain.
  // Five of the six greens recorded there are below; the sixth (the build step DELETED) is case 24,
  // and its docblock says why its pre-fix result was a red that proves nothing.

  // WHAT WAS MEASURED (guards-05-pre-fix.txt, MUTATION 2): this single line on `gate-db-free` left
  // the checker at exit 0 with all 52 invariants reported holding — over a job that could no longer
  // fail a pull request, and that runs lint, the whole design suite, the Next build and the very
  // script printing that green.
  //
  // ISOLATED BY CONSTRUCTION. A job-level key is outside every step allow-list in the file, so this
  // mutation can redden exactly one invariant and does. The literal-boolean spelling is the one
  // plan 19-13 closed for `gate-e2e`; it is first here so cases 19 and 20 are visibly the SAME
  // defeat in other clothes rather than three unrelated inputs.
  it("case 18 (CR-03): a literal continue-on-error on the gate-db-free JOB is red", () => {
    withMutatedWorkflows(withJobKey(CHECKER_JOB, "continue-on-error: true"), (result) => {
      expectRed(result, CHECKER_UNCONDITIONAL);
    });
  });

  // THE SECOND SPELLING, AND THE ONE THAT PROVES THE TEST IS A PRESENCE TEST. An Actions expression
  // parses to a STRING, so a value comparison against the JavaScript boolean is green in BOTH
  // directions — `=== true` false and `!== true` true, for the same input. `${{ matrix.experimental }}`
  // is GitHub's own canonical example for this key, so this is the DOCUMENTED spelling rather than
  // an exotic one. It is kept as its own case for the reason cases 4 and 5 are two: "the predicate
  // catches the literal form" is not evidence that it catches the expression form, and that
  // inference is what cost rounds 2 and 3.
  it("case 19 (CR-03): continue-on-error as an Actions expression on the gate-db-free JOB is red", () => {
    withMutatedWorkflows(withJobKey(CHECKER_JOB, "continue-on-error: ${{ true }}"), (result) => {
      expectRed(result, CHECKER_UNCONDITIONAL);
    });
  });

  // THE QUANTIFIER, ISOLATED. Cases 18 and 19 soften the JOB; this softens ONE STEP of it, and does
  // so on a step INSERTED for the purpose rather than on either of the two the allow-lists cover.
  // That isolation is the whole design of this case: a condition key on the checker step or on the
  // build step ALSO breaks that step's key-surface conjunct, so a red would arrive whether or not
  // the quantifier reached steps at all, and the case would be passing on somebody else's failure.
  // Here nothing but the unconditional predicate can see this step, so the red is the property.
  it("case 20 (CR-03): a condition key on ANY step of gate-db-free is red, on a step no allow-list covers", () => {
    withMutatedWorkflows(
      withStepFirstInCheckerJob([
        "- name: A step inserted by the quantifier case",
        "  if: false",
        '  run: echo "no allow-list covers this step; only the unconditional predicate can see it"',
      ]),
      (result) => {
        expectRed(result, CHECKER_UNCONDITIONAL);
      },
    );
  });

  // THE SAME DEFEAT ON THE STEP THAT MATTERS MOST, kept BESIDE case 20 rather than instead of it.
  // WHAT WAS MEASURED (guards-05-pre-fix.txt, MUTATION 6): `if: false` on the build step ALONE left
  // the checker at exit 0 with all 52 reported holding — with lint, the entire design suite (this
  // file included) and the Next build all skipped, in a job GitHub still reported as passing.
  //
  // ⚠ THIS MUTATION REDDENS TWO INVARIANTS AND THE CASE ASSERTS ONE BY NAME. `if:` is outside
  // `BUILD_STEP_ALLOWED_KEYS`, so the build-step invariant fails here too. That is why `expectRed`
  // matches a FAIL line by the invariant's NAME and not merely a non-zero exit: this case is about
  // the quantifier reaching the load-bearing step, and it says so in the line it requires.
  it("case 21 (CR-03): a condition key on gate-db-free's BUILD step is red on the unconditional invariant", () => {
    withMutatedWorkflows(withBuildStepKey("if: false"), (result) => {
      expectRed(result, CHECKER_UNCONDITIONAL);
    });
  });

  // WHAT WAS MEASURED (guards-05-pre-fix.txt, MUTATION 3): these three lines on `gate-db-free` left
  // the checker at exit 0 with all 52 reported holding. `cat {0}` writes each step's `run:` body to
  // a temp file and PRINTS it instead of executing it, so every step in the job — lint, the design
  // suite, the build, and the invocation of the checker printing that green — becomes a no-op that
  // exits 0. The `run:` strings stay byte-identical, no `env:` appears, no key lands on any step:
  // this is invisible to every allow-list in the file BY CONSTRUCTION, which is why it needs a
  // predicate of its own one level out.
  //
  // The block-insertion shape is case 11's, with the job key as a parameter rather than a fallback.
  it("case 22 (CR-03): a job-level defaults: block on gate-db-free is red", () => {
    withMutatedWorkflows(
      withJobKey(CHECKER_JOB, ["defaults:", "  run:", "    shell: cat {0}"]),
      (result) => {
        expectRed(result, CHECKER_JOB_DEFAULTS);
      },
    );
  });

  // THE ADJACENCY PROBE — the same property case 15 asserts for the checker step, one step over, on
  // the step whose allow-list differs from that one by exactly one key. WHAT WAS MEASURED
  // (guards-05-pre-fix.txt, MUTATION 5): appending an argument to this step's `run:` left the
  // checker at exit 0 with all 52 reported holding.
  //
  // It is green to two of the three conjuncts by construction and that is the point: the step keeps
  // its exact `name:`, keeps its position, and keeps its key set — `run` is PERMITTED here, so the
  // allow-list compares KEY SETS and no key moved. Only the trimmed exact-equality comparison of
  // the `run` VALUE can discriminate. Note also what does NOT catch it: `the job that runs
  // \`npm run build\` exists and declares NO services:` locates its subject with a SUBSTRING of a
  // `run:` body, and `npm run build --decoy` contains `npm run build`.
  it("case 23 (CR-03): appending an argument to gate-db-free's build invocation is red", () => {
    withMutatedWorkflows(withAppendedBuildArgument("--decoy"), (result) => {
      expectRed(result, BUILD_STEP);
    });
  });

  // THE STRUCTURAL MUTATION, AND THE ONE WHOSE PRE-FIX MEASUREMENT DISAGREED WITH THE PLAN THAT
  // ASKED FOR IT. WHAT WAS MEASURED (guards-05-pre-fix.txt, MUTATION 4): deleting this step was
  // ALREADY red before this plan — but on `the job that runs \`npm run build\` exists and declares
  // NO services: (T-11-DBFREE)`, a predicate whose subject is the DB-free property, which finds
  // that subject with `r.includes("npm run build")` over every job's run commands, and which is
  // satisfied by every SOFTENED form of this step (cases 21 and 23 are the proof). It goes red here
  // only because its own existence conjunct is falsified as a side effect. A red that arrives by
  // accident is not an invariant, and moving the build to a different job would take that accident
  // away while leaving this file's own gate deleted.
  //
  // So this case asserts the FAIL line names the BUILD-STEP invariant. Before this plan it would
  // have gone red on the wrong line — which is exactly the distinction `expectRed` exists to make,
  // and the reason it takes a fragment rather than just an exit code.
  it("case 24 (CR-03): deleting gate-db-free's build step is red ON THE BUILD-STEP INVARIANT", () => {
    withMutatedWorkflows(withoutBuildStep(), (result) => {
      expectRed(result, BUILD_STEP);
    });
  });

  // ── CR-01's TRIGGER VECTORS AND WR-02's FALSE RED, PLAN 19.1-06 ───────────────────────────────
  //
  // Cases 25–28 are the standing half of this plan's trigger measurements. Case 12 above already
  // asserts that DELETING `pull_request:` is red. That was the whole property until this plan, and
  // it was the axis that had been measured rather than the property the invariant's name claims:
  // three edits below leave the key exactly where it is and detach the gates anyway. Every one of
  // them was watched GREEN against the tracked file before the conjuncts existed
  // (`evidence/guards-06-pre-fix.txt`, VECTORS CR-01(a), (b), (c)) with an md5 pair and an empty
  // porcelain, and watched RED after (`evidence/guards-06-post-fix.txt`).

  // WHAT WAS MEASURED (guards-06-pre-fix.txt, VECTOR CR-01(a)): exit 0, all 55 reported holding,
  // over a file in which no pull request opened against any real branch runs any gate at all. The
  // key is present, so a membership test is satisfied; the branch list is what makes it inert.
  it("case 25 (CR-01): a nothing-matching branch list on the pull-request trigger is red", () => {
    withMutatedWorkflows(withPullRequestFilter("branches: [does-not-exist]"), (result) => {
      expectRed(result, CI_TRIGGERS);
    });
  });

  // THE SECOND MODIFIER, AND THE REASON THE CONJUNCT IS `filter == null` RATHER THAN A LIST OF
  // FORBIDDEN KEYS. WHAT WAS MEASURED (guards-06-pre-fix.txt, VECTOR CR-01(b)): exit 0, all 55
  // reported holding. `paths-ignore: ['**']` excludes every path there is, so every pull request
  // matches the ignore rule and no gate runs — a different key from case 25, the identical outcome.
  // Kept as its own case for the reason cases 4 and 5 are two: "the predicate catches the branch
  // form" is not evidence that it catches the path form, and that inference is what cost rounds 2
  // and 3. Deny-listing these two would leave `types:` and whatever round five finds; the checker
  // therefore denies ANY filter, and these two cases are the evidence that it does.
  it("case 26 (CR-01): an everything-matching path-ignore filter on the pull-request trigger is red", () => {
    withMutatedWorkflows(withPullRequestFilter("paths-ignore: ['**']"), (result) => {
      expectRed(result, CI_TRIGGERS);
    });
  });

  // THE OTHER TRIGGER, ALONG ITS OWN PROPERTY. WHAT WAS MEASURED (guards-06-pre-fix.txt, VECTOR
  // CR-01(c)): exit 0, all 55 reported holding, with `push` still present and still filtered — just
  // no longer reaching the default branch. That is the branch plan 15's ruleset protects, and a
  // required status check cannot be required on a branch the workflow never runs on, so this single
  // deleted name detaches every gate in the file from the ruleset while reading in review as a
  // narrowing somebody meant.
  //
  // ⚠ NOTE WHAT THIS CASE DOES *NOT* ASSERT, AND WHY THE OMISSION IS THE POINT. There is no sibling
  // case requiring the push trigger to be UNFILTERED, because this file's push filter is DELIBERATE
  // — such a case would demand the checker redden a correct file, which is how a correct check gets
  // deleted rather than repaired. The property is reachability, not shape; case 28 is the other half
  // of that same statement.
  it("case 27 (CR-01): removing the default branch from the push trigger's branch list is red", () => {
    withMutatedWorkflows(withPushBranches([CHECKER_DEV_BRANCH]), (result) => {
      expectRed(result, CI_TRIGGERS);
    });
  });

  // ⚠ A CASE THAT ASSERTS GREEN, AND THE SECOND OF THIS PLAN'S TWO POSITIVE CONTROLS (case 16 is
  // the other; case 30 below is the third, added by the same plan for the step-anchor class).
  //
  // WHY IT IS HERE. Every red case in this file shows the checker is capable of failing. Only a
  // mutation that SHOULD stay green can show that a defect class is CLOSED rather than MOVED — and
  // WR-02's defect class is the OPPOSITE of every other one measured in this phase. It is not a
  // mutation the checker fails to catch; it is a CORRECT FILE the checker used to REDDEN.
  //
  // WHAT WAS MEASURED (guards-06-pre-fix.txt, VECTOR WR-02): `on: [push, pull_request]` — the
  // sequence spelling docs.github.com documents alongside the mapping one — produced
  // `CHECKER-EXIT=1` and `1 of 55 invariant(s) FAILED`, naming this very invariant. `triggersOf`
  // ran `Object.keys` over an ARRAY, so the trigger names came back as the array indices "0" and
  // "1". A false red is not a harmless conservatism: the next person to hit it deletes the check,
  // and then the three reds above go with it.
  //
  // WHAT THIS CASE PINS. Not merely a zero exit — also the SUMMARY LINE, so a future edit that made
  // this spelling green by REMOVING or WEAKENING invariants would fail here rather than pass. That
  // is why this case asserts `EXPECTED_GREEN` and not just `status === 0`.
  //
  // ⚠ THE MUTATED FILE IS *MORE* PERMISSIVE THAN THE TRACKED ONE, DELIBERATELY. The sequence form
  // cannot express a filter, so push loses its `[dev, main]` narrowing and reaches every branch —
  // which is precisely why the push conjunct is written as REACHABILITY. A conjunct demanding a
  // literal branch list would redden this file, and this case is what stops anyone rewriting it
  // that way.
  it("case 28 (WR-02, POSITIVE CONTROL): the sequence spelling of the trigger block stays GREEN", () => {
    withMutatedWorkflows(withSequenceFormTriggerBlock(), (result) => {
      expect(
        result.status,
        `the sequence spelling of \`on:\` — a CORRECT file — did not go green. That is a FALSE RED, ` +
          `and a check that reddens correct files is the check that gets deleted rather than ` +
          `repaired (19-REVIEW.md WR-02).\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`,
      ).toBe(0);
      expect(String(result.stdout)).toContain(EXPECTED_GREEN);
    });
  });

  // ── CR-02 AND THE ORDERING ANCHORS, PLAN 19.1-06 ──────────────────────────────────────────────
  //
  // Cases 29–34 are the standing half of this plan's step-anchor measurements. Every predicate they
  // exercise used to locate its subject by SEARCHING EVERY `run:` BODY IN THE JOB for a substring.
  // A `run:` body is free text written by whoever edits the workflow, so that made an
  // attacker-controlled string the thing that decides which step a positive assertion is about.
  // Four of these six were watched GREEN on the tracked file before the repair
  // (`evidence/guards-06-pre-fix.txt`) and are RED after (`evidence/guards-06-post-fix.txt`).

  // ⚠ THE SHARPEST STATEMENT OF CR-02 IN THIS FILE, AND IT IS WORTH READING TWICE.
  // WHAT WAS MEASURED (guards-06-pre-fix.txt, VECTOR CR-02-DECOY-ONLY): exit 0, all 55 reported
  // holding. The invariant's own printed name says ONLY checkout, setup-node and `npm ci` may
  // precede the refusal step — and here is a fourth thing preceding it, in plain sight, under a
  // green check.
  //
  // THE MECHANISM IS THE PART TO UNDERSTAND. The predicate found the refusal step by
  // `findIndex(s => String(s?.run).includes(<the script path>))` — the FIRST step whose run body
  // mentions the script. This decoy mentions it and sits earlier, so the decoy became the anchor.
  // The preceding set was then `slice(0, <the decoy's index>)` — which does not contain the decoy.
  // THE DECOY EXCLUDED ITSELF FROM THE SET IT VIOLATES. No amount of care in the allow-list could
  // have caught that, because the allow-list was being applied to the wrong list.
  it("case 29 (CR-02): a decoy run body ahead of the refusal step is red — before the repair it excluded ITSELF from the set it violates", () => {
    withMutatedWorkflows(
      withStepBeforeRefusal([
        "- name: A decoy step whose run merely mentions the refusal script",
        `  run: echo "this step mentions ${REFUSAL_SCRIPT} and executes nothing"`,
      ]),
      (result) => {
        expectRed(result, REFUSAL_ORDERING);
      },
    );
  });

  // ⚠ A CASE THAT ASSERTS GREEN, AND THE THIRD OF THIS PLAN'S POSITIVE CONTROLS.
  //
  // WHAT IT PROVES, AND WHY CASE 29 CANNOT PROVE IT. Case 29 shows the checker now notices a decoy.
  // It does NOT show that the defect class was CLOSED rather than MOVED — an over-tight "repair"
  // that simply forbade any step from mentioning the refusal script would also make case 29 red,
  // and would be a predicate whose behaviour is broader than its printed name, which is this plan's
  // own prohibition. This case is the difference: the SAME decoy, with the SAME run body, placed
  // where it is LEGITIMATE — after everything the refusal step must precede — leaves the checker
  // green at the unchanged total. Mentioning the script is not the offence; PRECEDING the refusal
  // step is, and the repaired predicate distinguishes the two.
  //
  // ⚠ NOTE WHAT THIS CASE WOULD HAVE DONE BEFORE THE REPAIR: also green, because `findIndex`
  // returns the FIRST match and the real step is earlier. Its value is entirely forward-looking —
  // it is the guard on the repair, not a record of the defect. Case 29 is the record.
  it("case 30 (CR-02, POSITIVE CONTROL): the same decoy placed where it is legitimate leaves the checker GREEN", () => {
    withMutatedWorkflows(
      withStepAfterInJob(E2E_JOB, E2E_PLAY_STEP, [
        "- name: A decoy step whose run merely mentions the refusal script",
        `  run: echo "this step mentions ${REFUSAL_SCRIPT} and executes nothing"`,
      ]),
      (result) => {
        expect(
          result.status,
          `a step that merely MENTIONS the refusal script, placed after everything the refusal ` +
            `step must precede, went red. Mentioning the script is not the offence — preceding ` +
            `the refusal step is. A predicate whose behaviour is broader than its printed name is ` +
            `this plan's own prohibition.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`,
        ).toBe(0);
        expect(String(result.stdout)).toContain(EXPECTED_GREEN);
      },
    );
  });

  // THE REORDERING, WITHOUT A DECOY. This one was ALREADY red before the repair — nothing captured
  // the anchor, so the real step's own late index failed the comparison honestly. It is kept
  // standing anyway, because it is the case that fails if the ordering conjuncts are ever deleted
  // while the anchor repair is left in place: cases 29 and 34 both go red through the PRECEDING-set
  // conjunct, and neither would notice an ordering comparison quietly removed.
  it("case 31 (CR-02): the refusal step moved after the steps it must precede is red", () => {
    withMutatedWorkflows(
      withStepMovedAfterInJob(E2E_JOB, MAIL_STEP_NAME, E2E_PLAY_STEP),
      (result) => {
        expectRed(result, REFUSAL_ORDERING);
      },
    );
  });

  // RESEARCH.md INVENTORY ROW 5 — FLAGGED "NOT YET REPRODUCED", AND IT REPRODUCES.
  // WHAT WAS MEASURED (guards-06-pre-fix.txt, VECTOR ROW-5): exit 0, all 55 reported holding, with
  // the REAL seed step running AFTER the Playwright suite. `gate-e2e`'s own step comment records
  // that FIVE named specs fail against an empty catalogue and say so in their own messages, so this
  // is not a hypothetical: the suite would have run against an empty database with the invariant
  // whose printed name is "seeds the demo catalogue BEFORE it runs the suite" printing green.
  //
  // The decoy sits AFTER the refusal step deliberately, so that the refusal-ordering invariant is
  // untouched and this case can only go red on the one it names. It is the isolation discipline
  // case 20 established, applied to a different pair of predicates.
  it("case 32 (row 5): a decoy mentioning the seed command, with the real seed moved after the suite, is red", () => {
    withMutatedWorkflows(
      (ci) => {
        const decoyed = withStepAfterInJob(E2E_JOB, MAIL_STEP_NAME, [
          "- name: A decoy step whose run merely mentions the seed command",
          '  run: echo "this step mentions npm run db:seed and seeds nothing"',
        ])(ci);
        return withStepMovedAfterInJob(E2E_JOB, E2E_SEED_STEP, E2E_PLAY_STEP)(decoyed);
      },
      (result) => {
        expectRed(result, E2E_SEED_ORDERING);
      },
    );
  });

  // RESEARCH.md INVENTORY ROW 6, THE HALF WITH THE WORST CONSEQUENCE.
  // WHAT WAS MEASURED (guards-06-pre-fix.txt, VECTOR VISUAL-PROJECT): exit 0, ALL 55 REPORTED
  // HOLDING, over a file in which `gate-visual` runs `--project=chromium`. That job exists to run
  // GATE-01's comparison against 52 committed baselines; under this mutation it collects the
  // FUNCTIONAL suite instead, compares nothing, and reports success. The invariant printed as
  // "runs the visual project BY NAME" was satisfied by an `echo`.
  //
  // The decoy sits AFTER the real Playwright step so the ordering indices are unmoved and this case
  // reddens exactly one invariant — the one it names.
  it("case 33 (row 6): a decoy naming the visual project, with the real step switched to another project, is red", () => {
    withMutatedWorkflows(
      (ci) => {
        const decoyed = withStepAfterInJob(VISUAL_JOB, VISUAL_PLAY_STEP, [
          "- name: A decoy step whose run merely mentions the visual project",
          `  run: echo "this step mentions npx playwright test ${VISUAL_PROJECT} and runs nothing"`,
        ])(ci);
        return withStepRunReplacedInJob(
          VISUAL_JOB,
          VISUAL_PLAY_STEP,
          VISUAL_PROJECT,
          "--project=chromium",
        )(decoyed);
      },
      (result) => {
        expectRed(result, VISUAL_PROJECT_BY_NAME);
      },
    );
  });

  // THE VACUOUS ORDERING CLAIM. WHAT WAS MEASURED (guards-06-pre-fix.txt, VECTOR VACUOUS-PRECEDE):
  // exit 0, all 55 reported holding, with the refusal step promoted to FIRST in the job — i.e.
  // running before `actions/checkout`, so the script it invokes IS NOT ON DISK YET.
  //
  // `[].every(…)` IS TRUE. The invariant's own printed name claims "ONLY checkout, setup-node and
  // npm ci may precede it", and a step with NOTHING before it satisfies that by having nothing
  // before it at all — the claim was unfalsifiable in the one arrangement where it is most wrong.
  // The repair adds a non-empty conjunct, so an ordering claim can no longer hold over an empty set.
  it("case 34 (CR-02): the refusal step promoted to FIRST is red — an ordering claim may not hold vacuously", () => {
    withMutatedWorkflows(withStepMovedFirstInJob(E2E_JOB, MAIL_STEP_NAME), (result) => {
      expectRed(result, REFUSAL_ORDERING);
    });
  });

  // ── THE TWO SITES THE RESEARCH INVENTORY DID NOT LIST, PLAN 19.1-06 ───────────────────────────
  //
  // 19.1-RESEARCH.md inventoried ten anchoring and presence sites. The audit was carried out as a
  // SCAN of the whole checker for the SHAPE, not as a walk of those ten, and it found two more —
  // both in sections the plan's task text never mentions, and both confirmed by measurement. This
  // is what the inventory document's HOW THIS AUDIT WAS CARRIED OUT section means by the difference
  // between auditing the property and auditing the list.

  // AUDIT ROW 11. WHAT WAS MEASURED (guards-06-pre-fix.txt, VECTOR STAGE-GLOB): the invariant is
  // `a run command stages exactly the *-visual-linux.png glob` — an existential over EVERY run body
  // in the regeneration job. A decoy block scalar merely PRINTING that command, with the real
  // staging command changed to a glob that matches nothing, left the checker at exit 0 with all 55
  // reported holding. The regeneration job would have staged nothing and reported success — and
  // this tripwire's entire job is to notice what that commit contains.
  //
  // The mutation here is the same class in its quietest form: the decoy's run body is COPIED
  // VERBATIM from the real step (so no literal is typed in this file, and the decoy is
  // byte-faithful by construction), and the real step is RENAMED. Under the superseded existential
  // both bodies mention the glob and the check is green; under the name anchor there is no step by
  // that name and it is red.
  it("case 35 (row 11): renaming the staging step, with a decoy copying its command, is red", () => {
    withMutatedWorkflowPair(
      {
        baselines: (b) => {
          const realCommand = firstRunLineOf(b, BASELINES_JOB, BASELINES_STAGE_STEP);
          if (realCommand === "") return b;
          const decoyed = withStepBeforeInJob(BASELINES_JOB, BASELINES_STAGE_STEP, [
            "- name: A decoy step that merely prints the staging command",
            "  run: |",
            `    echo ${realCommand}`,
          ])(b);
          return withRenamedStepInJob(
            BASELINES_JOB,
            BASELINES_STAGE_STEP,
            `${BASELINES_STAGE_STEP} (renamed)`,
          )(decoyed);
        },
      },
      (result) => {
        expectRed(result, "stages exactly the *-visual-linux.png glob");
      },
    );
  });

  // AUDIT ROW 12, AND THE NASTIEST VECTOR IN THIS PLAN.
  // The `cross` section asserts that the two visual jobs' migrate commands are BYTE-IDENTICAL —
  // the machine that COMPARES must be the machine that SHOT (D-27). It found each command with
  // `runs.find(r => r.includes("db:migrate"))`, on BOTH sides. A decoy in ONE job makes the two
  // picks differ and goes red, which is why this looked safe. IDENTICAL decoys in BOTH jobs make
  // the two picks identical TO EACH OTHER — they are the same `echo` — and the comparison then
  // holds between two strings that are neither job's real command.
  //
  // WHAT WAS MEASURED (guards-06-pre-fix.txt, VECTOR CROSS-PICK): exit 0, all 55 reported holding,
  // with one job migrating `--baselines-only` and the other `--ci-only`. The comparison would have
  // measured a different tree than the one that was captured — which is the exact defect the
  // invariant's own comment says run 32216145319 cost, written up as an assertion so it could not
  // recur silently. It could.
  //
  // ⚠ THIS CASE MUTATES BOTH FILES, AND THAT IS THE PROPERTY. A single-file version of it is GREEN
  // against the superseded code for the right reason, and would have proved the site safe.
  it("case 36 (row 12): identical decoys in BOTH visual jobs, with the real migrate commands made to differ, is red", () => {
    withMutatedWorkflowPair(
      {
        baselines: (b) => {
          const real = firstRunLineOf(b, BASELINES_JOB, BASELINES_MIGRATE_STEP);
          if (real === "") return b;
          const decoyed = withStepBeforeInJob(BASELINES_JOB, BASELINES_MIGRATE_STEP, [
            "- name: A decoy step that merely prints the migrate command",
            `  run: echo ${real}`,
          ])(b);
          return withAppendedRunArgumentInJob(
            BASELINES_JOB,
            BASELINES_MIGRATE_STEP,
            "--baselines-only",
          )(decoyed);
        },
        ci: (ci) => {
          const real = firstRunLineOf(ci, VISUAL_JOB, VISUAL_MIGRATE_STEP);
          if (real === "") return ci;
          const decoyed = withStepBeforeInJob(VISUAL_JOB, VISUAL_MIGRATE_STEP, [
            "- name: A decoy step that merely prints the migrate command",
            `  run: echo ${real}`,
          ])(ci);
          return withAppendedRunArgumentInJob(VISUAL_JOB, VISUAL_MIGRATE_STEP, "--ci-only")(
            decoyed,
          );
        },
      },
      (result) => {
        expectRed(result, "migrate run commands are byte-identical");
      },
    );
  });

  // ── THE LINE-ENDING EQUIVALENCE CASES ─────────────────────────────────────────────────────────
  //
  // WHY THESE EXIST, AND WHY THEY ARE NOT DECORATION. Every case above runs against `ci.yml` and
  // `baselines.yml` AS THIS WORKING TREE CHECKED THEM OUT. `.gitattributes` declares `* text=auto`,
  // so that is CRLF on Windows and LF on the Ubuntu runner that actually gates the repository. The
  // 35 cases above therefore measure ONE line-ending convention per machine, and can say nothing
  // about the other — which is how six of them (7, 11, 18, 19, 22 and 25) came to be 36/36 green on
  // the author's laptop and `6 failed | 30 passed` in CI for the whole of phase 19.1, unnoticed
  // until the first push. The mechanism is written up at `insertAfterLineContaining`.
  //
  // TWO OF THE SIX WERE NOT PARSE ERRORS. Cases 7 and 11 target `gate-e2e`; on an LF tree their
  // mutation landed at the tail of the PRECEDING job, `gate-price-parity`, which no invariant in
  // the checker watches for softening — so the checker exited 0 and the cases failed on "the
  // checker exited 0 under a mutation that should be RED". A misplaced mutation is not merely a
  // noisier red than a correct one: it is a case measuring a property nobody named.
  //
  // These two cases close the class rather than the six instances. They are pure-function checks —
  // no temp tree, no spawned checker — so they cost milliseconds and, unlike everything above,
  // their subject is the HARNESS: a builder is EOL-correct or it is not, independently of which
  // argument a case happens to hand it, and independently of which machine is running.

  /** Every line terminator in `text` is a CRLF — no bare LF was written into a CRLF document. */
  function isPureCrlf(text: string): boolean {
    return text.split("\n").length === text.split("\r\n").length;
  }

  /** A COMPACT description of the first line at which two texts diverge, or null when identical. */
  function firstDifferingLine(expected: string, actual: string): string | null {
    if (expected === actual) return null;
    const e = expected.split("\n");
    const a = actual.split("\n");
    for (let i = 0; i < Math.max(e.length, a.length); i += 1) {
      if (e[i] !== a[i]) {
        return (
          `first divergence at line ${i + 1} — ` +
          `LF tree produced ${JSON.stringify(e[i] ?? "(past end of file)")}, ` +
          `CRLF tree produced ${JSON.stringify(a[i] ?? "(past end of file)")}`
        );
      }
    }
    return `identical lines but different lengths (${expected.length} vs ${actual.length})`;
  }

  /**
   * One entry per MUTATION BUILDER declared in this file, with a representative argument. The
   * argument is representative rather than exhaustive on purpose: the EOL dependence lives in the
   * builder's anchor arithmetic, not in the string a case hands it, so exercising each builder once
   * measures the property. `withJobKey` appears TWICE because its two argument shapes take
   * different code paths — the array form additionally JOINS the inserted lines, and joining with
   * the wrong terminator is the sibling defect of anchoring with one.
   *
   * Case 38 below asserts this table is a COMPLETE census of the builders in this file, so a
   * builder added later without an entry here is a RED rather than a silent gap.
   */
  const EOL_BUILDER_CENSUS: Array<{
    name: string;
    file: "ci" | "baselines";
    mutate: (text: string) => string;
  }> = [
    { name: "withRefusalStepKey", file: "ci", mutate: withRefusalStepKey("continue-on-error: true") },
    { name: "withAppendedRefusalArgument", file: "ci", mutate: withAppendedRefusalArgument("--decoy") },
    { name: "withJobKey (string form)", file: "ci", mutate: withJobKey(E2E_JOB, "continue-on-error: true") },
    {
      name: "withJobKey (array form)",
      file: "ci",
      mutate: withJobKey(CHECKER_JOB, ["defaults:", "  run:", "    shell: cat {0}"]),
    },
    {
      name: "withWorkflowLevelBlock",
      file: "ci",
      mutate: withWorkflowLevelBlock(["defaults:", "  run:", "    shell: cat {0}"]),
    },
    { name: "withoutPullRequestTrigger", file: "ci", mutate: withoutPullRequestTrigger() },
    {
      name: "withPullRequestFilter",
      file: "ci",
      mutate: withPullRequestFilter("branches: [does-not-exist]"),
    },
    { name: "withPushBranches", file: "ci", mutate: withPushBranches([CHECKER_DEV_BRANCH]) },
    { name: "withSequenceFormTriggerBlock", file: "ci", mutate: withSequenceFormTriggerBlock() },
    {
      name: "withStepBeforeRefusal",
      file: "ci",
      mutate: withStepBeforeRefusal(["- uses: actions/github-script@v7"]),
    },
    { name: "withoutCheckerStep", file: "ci", mutate: withoutCheckerStep() },
    {
      name: "withAppendedCheckerArgument",
      file: "ci",
      mutate: withAppendedCheckerArgument("/tmp/decoy.mjs"),
    },
    {
      name: "withStepFirstInCheckerJob",
      file: "ci",
      mutate: withStepFirstInCheckerJob([
        "- name: A step inserted by the EOL equivalence case",
        '  run: echo "eol"',
      ]),
    },
    { name: "withBuildStepKey", file: "ci", mutate: withBuildStepKey("if: false") },
    { name: "withAppendedBuildArgument", file: "ci", mutate: withAppendedBuildArgument("--decoy") },
    { name: "withoutBuildStep", file: "ci", mutate: withoutBuildStep() },
    { name: "withRenamedCheckerJobName", file: "ci", mutate: withRenamedCheckerJobName() },
    {
      name: "withStepAfterInJob",
      file: "ci",
      mutate: withStepAfterInJob(E2E_JOB, E2E_PLAY_STEP, [
        "- name: A decoy step inserted by the EOL equivalence case",
        '  run: echo "eol"',
      ]),
    },
    {
      name: "withStepBeforeInJob",
      file: "ci",
      mutate: withStepBeforeInJob(VISUAL_JOB, VISUAL_MIGRATE_STEP, [
        "- name: A decoy step inserted by the EOL equivalence case",
        '  run: echo "eol"',
      ]),
    },
    {
      name: "withStepMovedAfterInJob",
      file: "ci",
      mutate: withStepMovedAfterInJob(E2E_JOB, MAIL_STEP_NAME, E2E_PLAY_STEP),
    },
    {
      name: "withStepMovedFirstInJob",
      file: "ci",
      mutate: withStepMovedFirstInJob(E2E_JOB, MAIL_STEP_NAME),
    },
    {
      name: "withStepRunReplacedInJob",
      file: "ci",
      mutate: withStepRunReplacedInJob(
        VISUAL_JOB,
        VISUAL_PLAY_STEP,
        VISUAL_PROJECT,
        "--project=chromium",
      ),
    },
    {
      name: "withAppendedRunArgumentInJob",
      file: "ci",
      mutate: withAppendedRunArgumentInJob(VISUAL_JOB, VISUAL_MIGRATE_STEP, "--ci-only"),
    },
    // The one builder no case points at `ci.yml` — audit row 11 renames a step of `baselines.yml`.
    {
      name: "withRenamedStepInJob",
      file: "baselines",
      mutate: withRenamedStepInJob(
        BASELINES_JOB,
        BASELINES_STAGE_STEP,
        `${BASELINES_STAGE_STEP} (renamed)`,
      ),
    },
  ];

  // THE REPAIR'S OWN STANDING MEMORY. Reproduced before the fix by converting the two workflow
  // files to LF in the working tree; with the hardcoded `\n` anchors restored, this case fails on
  // `withJobKey` and `withPullRequestFilter` and NOTHING ELSE — which is what makes it a measurement
  // of the defect rather than a restatement of it.
  it("case 37 (EOL): every mutation builder produces the SAME mutation on an LF copy as on a CRLF one", () => {
    const sources = {
      ci: readFileSync(REPO_CI, "utf8").replace(/\r\n/g, "\n"),
      baselines: readFileSync(REPO_BASELINES, "utf8").replace(/\r\n/g, "\n"),
    };
    for (const { name, file, mutate } of EOL_BUILDER_CENSUS) {
      const lf = sources[file];
      const crlf = lf.replace(/\n/g, "\r\n");
      const onLf = mutate(lf);
      const onCrlf = mutate(crlf);

      // A builder that no-ops is measuring nothing, on either tree. This is the same guarantee
      // `withMutatedWorkflowPair` gives the cases above, restated here because these two cases do
      // not go through it — without it, deleting a builder's body would turn this case green.
      expect(onLf, `${name}: produced no change against an LF copy of ${file}.yml`).not.toBe(lf);
      expect(onCrlf, `${name}: produced no change against a CRLF copy of ${file}.yml`).not.toBe(crlf);

      // The property. Normalising the CRLF result is the ONLY licensed difference between the two.
      expect(
        firstDifferingLine(onLf, onCrlf.replace(/\r\n/g, "\n")),
        `${name}: mutated ${file}.yml DIFFERENTLY depending on the checkout's line endings. ` +
          `Every case that uses this builder therefore measures a different tree on the CI runner ` +
          `than it measures here`,
      ).toBe(null);

      // The sibling defect: a builder that anchors correctly but JOINS its inserted lines with a
      // hardcoded `\n` writes bare LFs into a CRLF document. That parses, so it would survive the
      // equivalence check above under normalisation — it is caught only by looking at the bytes.
      expect(
        isPureCrlf(onCrlf),
        `${name}: wrote a bare LF into a CRLF copy of ${file}.yml — an inserted line was joined ` +
          `or terminated with a hardcoded "\\n" instead of the EOL of the file being mutated`,
      ).toBe(true);
    }
  });

  // THE CENSUS, so case 37 cannot rot into a partial one. A builder added above without a
  // representative entry in `EOL_BUILDER_CENSUS` is the exact shape of the gap this repair closed,
  // and an untested new builder must be a RED rather than a silence.
  it("case 38 (EOL census): the equivalence table names every mutation builder declared in this file", () => {
    const source = readFileSync(resolve(process.cwd(), "tests/design/workflow-invariants.test.ts"), "utf8");
    const declared = [...source.matchAll(/^function (with[A-Za-z]+)\(/gm)].map((m) => m[1]);
    expect(
      declared.length,
      "no `function with…(` declarations were found — this census read the wrong file, and a " +
        "census that reads nothing passes trivially",
    ).toBeGreaterThan(0);

    // The two harness entry points are not builders: they take a mutator rather than being one.
    const HARNESS = new Set(["withMutatedWorkflows", "withMutatedWorkflowPair"]);
    const builders = declared.filter((n) => !HARNESS.has(n)).sort();
    // Table entries carry a parenthesised argument-shape suffix (`withJobKey (array form)`).
    const covered = [...new Set(EOL_BUILDER_CENSUS.map((e) => e.name.replace(/ \(.*\)$/, "")))].sort();

    expect(
      builders.filter((n) => !covered.includes(n)),
      "these mutation builders are declared in this file but carry no entry in " +
        "`EOL_BUILDER_CENSUS`, so nothing measures whether they behave the same on the LF checkout " +
        "the CI runner uses as they do on this CRLF one",
    ).toEqual([]);
    expect(
      covered.filter((n) => !builders.includes(n)),
      "`EOL_BUILDER_CENSUS` names builders that no longer exist — the table has drifted from the " +
        "file and is no longer a census of it",
    ).toEqual([]);
  });

  /** The line immediately following the first line EQUAL to `key`, or null when there is none. */
  function lineAfter(text: string, key: string): string | null {
    const lines = text.split(eolOf(text));
    const i = lines.indexOf(key);
    if (i < 0 || i + 1 >= lines.length) return null;
    return lines[i + 1];
  }

  // WHY THIS CASE EXISTS BESIDE CASE 37 RATHER THAN INSTEAD OF IT. Case 37 measures whether a
  // builder behaves the SAME on both checkouts; it cannot see a builder that is wrong on both.
  // Control C above is exactly that file: with `insertAfterLineContaining` reverted and the anchors
  // composed from `eolOf`, case 37 is GREEN and the six cases are red on every platform. That is
  // the fail-closed direction and much the lesser evil — but "the guard was green while the thing
  // it guards was broken" is the defect this whole phase exists to delete, so the placement claim
  // is asserted directly.
  //
  // ONLY TWO BUILDERS ARE LISTED, AND THAT IS NOT AN OVERSIGHT. These are the only two in the file
  // whose anchor's first character is a line terminator, which is the precondition for the
  // arithmetic defect: for every other anchor the search for the line end cannot degenerate,
  // because there is no terminator inside the anchor to find. Case 38's census is what keeps that
  // claim honest as builders are added — a new terminator-anchored builder arrives with an entry
  // there, and this case is the second thing its author must read.
  it("case 39 (EOL placement): the terminator-anchored builders insert on the line AFTER the key they name, on BOTH checkouts", () => {
    const lf = readFileSync(REPO_CI, "utf8").replace(/\r\n/g, "\n");
    for (const [flavour, ci] of [
      ["LF", lf],
      ["CRLF", lf.replace(/\n/g, "\r\n")],
    ] as const) {
      expect(
        lineAfter(withJobKey(E2E_JOB, "continue-on-error: true")(ci), `  ${E2E_JOB}:`),
        `${flavour}: withJobKey did not put its key on the line after "  ${E2E_JOB}:" — on an LF ` +
          `tree it used to land at the tail of the PRECEDING job, where cases 7 and 11 then ` +
          `measured a job no invariant watches and the checker exited 0`,
      ).toBe("    continue-on-error: true");

      const defaults = withJobKey(CHECKER_JOB, ["defaults:", "  run:", "    shell: cat {0}"])(ci);
      expect(
        [1, 2, 3].map((n) => defaults.split(eolOf(defaults))[
          defaults.split(eolOf(defaults)).indexOf(`  ${CHECKER_JOB}:`) + n
        ]),
        `${flavour}: withJobKey's array form did not put its three lines directly under ` +
          `"  ${CHECKER_JOB}:"`,
      ).toEqual(["    defaults:", "      run:", "        shell: cat {0}"]);

      expect(
        lineAfter(withPullRequestFilter("branches: [does-not-exist]")(ci), "  pull_request:"),
        `${flavour}: withPullRequestFilter did not put its filter on the line after ` +
          `"  pull_request:" — on an LF tree it used to land under "push:", which already has a ` +
          `branches: key, and case 25 measured "Map keys must be unique" instead of the trigger ` +
          `invariant`,
      ).toBe("    branches: [does-not-exist]");
    }
  });
});
