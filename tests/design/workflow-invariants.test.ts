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
const EXPECTED_GREEN = "All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8).";

/**
 * The refusal step's `name:`, READ from the checker that already spells it once as
 * `CI_E2E_MAIL_STEP`, rather than typed a second time here. A copy would be a second source of truth
 * wearing the costume of a constant — the drift class this phase has spent four plans on.
 */
const MAIL_STEP_NAME = (() => {
  const decl = /^const CI_E2E_MAIL_STEP = "(.+)";$/m;
  const match = decl.exec(readFileSync(CHECKER, "utf8").replace(/\r\n/g, "\n"));
  if (!match || !match[1]) {
    throw new Error(
      `could not read the refusal step's name from ${CHECKER} with ${decl.source} — this test ` +
        `cannot anchor a mutation on a string it could not read, and guessing one would make every ` +
        `red case below a green that means nothing`,
    );
  }
  return match[1];
})();

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

/** Inserts `line`, indented four spaces, immediately after the `gate-e2e:` job key line. */
function withJobKey(line: string): (ci: string) => string {
  const jobKeyDecl = /^const CI_E2E_JOB = "(.+)";$/m;
  const match = jobKeyDecl.exec(readFileSync(CHECKER, "utf8").replace(/\r\n/g, "\n"));
  const jobKey = match?.[1] ?? "gate-e2e";
  return (ci) => insertAfterLineContaining(ci, `\n  ${jobKey}:`, `    ${line}`);
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
      expectRed(result, "mail refusal reads the REAL process environment");
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
      expectRed(result, "mail refusal reads the REAL process environment");
    });
  });
});
