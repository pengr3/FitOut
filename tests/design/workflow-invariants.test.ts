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
 * `.gitattributes` declares `* text=auto` and this working tree checks `ci.yml` out with CRLF. Every
 * inserted line uses the EOL detected from the file it is being inserted into; a harness that
 * normalised line endings would rewrite the whole copy and make every red red for the wrong reason.
 */
function eolOf(text: string): string {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

/**
 * The single harness every case goes through. Builds a throwaway tree holding exactly what the
 * checker reads from its working directory, applies `mutate` to `ci.yml`'s text, and spawns the
 * SHIPPED checker against it with nothing but `cwd` changed.
 */
function withMutatedWorkflows(
  mutate: (ci: string) => string,
  assert: (result: ReturnType<typeof spawnSync<string>>, dir: string) => void,
): void {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "workflow-invariants-")));
  try {
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    mkdirSync(join(dir, "scripts"), { recursive: true });

    // `package.json` feeds `EXPECTED_IMAGE` (the pinned Playwright image tag must equal the
    // installed `@playwright/test` version).
    copyFileSync(REPO_PKG, join(dir, "package.json"));
    // `baselines.yml` feeds the whole `baselines` section and both halves of `cross`.
    copyFileSync(REPO_BASELINES, join(dir, ".github", "workflows", "baselines.yml"));
    // The refusal script feeds Invariant B's shares-pattern and holds-no-copy conjuncts.
    copyFileSync(REPO_REFUSAL, join(dir, "scripts", "refuse-mail-credential.mjs"));

    const original = readFileSync(REPO_CI, "utf8");
    const mutated = mutate(original);
    // ⚠ THE SINGLE MOST IMPORTANT LINE IN THIS FILE. A mutation that did not apply must be a RED,
    // never a green over an unmutated copy.
    expect(
      mutated,
      "the mutation produced text identical to the input — its anchor has drifted, and every " +
        "assertion below would be measuring an UNMUTATED copy",
    ).not.toBe(original);
    writeFileSync(join(dir, ".github", "workflows", "ci.yml"), mutated, "utf8");

    assert(spawnSync(process.execPath, [CHECKER], { cwd: dir, encoding: "utf8" }), dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Both halves, because "it went red" was never the property. */
function expectRed(
  result: ReturnType<typeof spawnSync<string>>,
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
    const block = (Array.isArray(lines) ? lines : [lines])
      .map((l) => `    ${l}`)
      .join(eolOf(ci));
    return insertAfterLineContaining(ci, `\n  ${jobKey}:`, block);
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
 * Shared insertion primitive. Returns the input UNCHANGED when the anchor is absent, so a drifted
 * anchor lands on `withMutatedWorkflows`'s differs-from-input assertion rather than producing a
 * quietly-different mutation somewhere else in the file.
 */
function insertAfterLineContaining(ci: string, anchor: string, insertion: string): string {
  const eol = eolOf(ci);
  const at = ci.indexOf(anchor);
  if (at < 0) return ci;
  const lineEnd = ci.indexOf(eol, at);
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
});
