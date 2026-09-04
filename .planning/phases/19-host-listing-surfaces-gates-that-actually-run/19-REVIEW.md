---
phase: 19-host-listing-surfaces-gates-that-actually-run
reviewed: 2026-09-04T15:20:00Z
depth: standard
scope: plan 19-12 only (eac5541..HEAD)
files_reviewed: 4
files_reviewed_list:
  - .github/workflows/ci.yml
  - scripts/refuse-mail-credential.mjs
  - scripts/verify-workflows.mjs
  - tests/design/mail-credential-refusal.test.ts
findings:
  critical: 2
  warning: 4
  info: 4
  total: 10
status: issues_found
---

# Phase 19 (plan 19-12): Code Review Report

**Reviewed:** 2026-09-04
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Plan 19-12 replaces an inert `${{ env.RESEND_API_KEY }}` shell test with a committed Node script
that reads `Object.keys(process.env)`, adds four parse-based invariants, and adds a build-blocking
design test. The core mechanism is sound and, on the paths the plan named, **fails closed**: an
unreadable prefix source exits 1, a moved/reformatted declaration exits 1, an empty capture exits 1,
and the `run:` step's non-zero exit fails the job. `node scripts/verify-workflows.mjs` exits 0 at
`All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8)`, and
`tests/design/mail-credential-refusal.test.ts` passes 5/5 locally. `src/lib/email.ts:38`
(`const key = process.env.RESEND_API_KEY`) confirms the chosen prefix covers the actual switch —
`startsWith("RESEND")` is a superset of the one variable that arms the transport, so the prefix
strictness is defensible and produces no false negative against the real mail vector.

**The defect class being fixed is nevertheless reproduced twice, in the verification layer.** Both
CR findings are the same shape as CR-01 round 1: a control documented as covered while a one-token
edit to `ci.yml` disables it with all 48 invariants still green. CR-01 is **empirically
demonstrated** (a live `RESEND_API_KEY` in the process environment, exit 0). CR-02 follows by
inspection of what Invariants A and C read. Both are cheap to close (one conjunct each).

Findings already recorded in `evidence/19-REVIEW-round1-2026-09-04.md` as carried-forward (CR-02
branch protection, WR-01 listing-mutation try/catch, WR-03 `container.env`/`services.*.env` parse
blind spot, WR-04 stale citations) are **not** re-raised. Round 1's WR-02 *is* re-raised below as
CR-02, because plan 19-12 added a new step whose entire value depends on the property WR-02 named
as missing — the old finding is not merely still open, it now guards a privacy control instead of a
test runner.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: the refusal script takes its prefix source from `argv[2]`, nothing asserts `ci.yml` passes no argument, and the script's own header claims otherwise — a one-token edit restores the inert guard with all 48 invariants green

**File:** `scripts/refuse-mail-credential.mjs:43-46`, `scripts/refuse-mail-credential.mjs:61`,
`scripts/verify-workflows.mjs:766-775`

**Issue:** The script resolves its prefix source as
`process.argv[2] ?? fileURLToPath(new URL("./verify-workflows.mjs", import.meta.url))`. Its header
states, verbatim:

> The optional argument overrides where the prefix declaration is read from. It exists ONLY for
> `tests/design/mail-credential-refusal.test.ts`'s missing-declaration case; `ci.yml` invokes this
> script with no arguments, **and Invariant A asserts that.**

Invariant A asserts no such thing. Its four conjuncts are:

```js
e2eMailStep !== undefined &&
  e2eMailRun.includes(MAIL_REFUSAL_SCRIPT) &&
  !e2eMailRun.includes("${{") &&
  e2eMailStep?.env === undefined
```

`includes(MAIL_REFUSAL_SCRIPT)` is satisfied by `node scripts/refuse-mail-credential.mjs <anything>`.
Invariant C's `e2eRuns.findIndex((r) => r.includes(MAIL_REFUSAL_SCRIPT))` is satisfied identically.
So `ci.yml:1368` can be edited to pass any path, and the guard then scans for a prefix of the
editor's choosing while every one of the 48 invariants — including all four added by this plan —
stays green. Measured, not supposed:

```
$ RESEND_API_KEY=live_secret_abc node scripts/refuse-mail-credential.mjs <decoy-with-ZZUNUSED-decl>
refuse-mail-credential: prefix=ZZUNUSED read from …/decoy.mjs — scanned 84 environment
variable name(s), 0 begin with it.
EXIT=0
```

That is a fail-open with a live credential present, reached through a supported, documented input,
under a comment asserting the input is machine-checked. The accidental path (a decoy with **no**
declaration) does fail closed — but the property the header claims, and the one the phase is about,
is not held by anything.

**Fix:** Add the missing conjunct to Invariant A and make the argument test-only.

```js
// scripts/verify-workflows.mjs — Invariant A
const refusalInvocation = e2eMailRun.trim();
check(
  `"${CI_E2E_JOB}"'s mail refusal reads the REAL process environment — no \${{ }} expression, no env: map, NO ARGUMENTS`,
  e2eMailStep !== undefined &&
    refusalInvocation === `node ${MAIL_REFUSAL_SCRIPT}` &&   // exact, not `includes`
    !e2eMailRun.includes("${{") &&
    e2eMailStep?.env === undefined,
  …
);
```

and, in `scripts/refuse-mail-credential.mjs`, gate the override so a production invocation cannot
silently accept one:

```js
const override = process.argv[2];
if (override && process.env.MAIL_REFUSAL_ALLOW_SOURCE_OVERRIDE !== "1") {
  console.log("::error::This script takes no arguments outside its own test harness.");
  process.exit(1);
}
```

(or delete the argument entirely and have the test point at a temp directory containing a
`verify-workflows.mjs` sibling). Either way, correct the header sentence — a false coverage claim in
a comment is the exact artifact CR-01 round 1 was.

---

### CR-02: nothing asserts the mail-refusal STEP is unconditional — `continue-on-error: true` on it detaches D-14's only current-run half while all 48 invariants stay green

**File:** `scripts/verify-workflows.mjs:731-736`, `scripts/verify-workflows.mjs:766-775`,
`scripts/verify-workflows.mjs:807-820`, `.github/workflows/ci.yml:1367-1368`

**Issue:** The "unconditional" invariant is scoped to the **job**:

```js
e2e?.if === undefined && e2e?.["continue-on-error"] !== true
```

Invariants A and C read the step's `name`, `run` and `env` and its position among `runsOf(e2e)`.
None of them reads the step's own `if:` or `continue-on-error:`. Adding

```yaml
      - name: Refuse to run the suite with a live mail credential in the environment
        run: node scripts/refuse-mail-credential.mjs
        continue-on-error: true
```

leaves the step present, correctly named, correctly ordered, expression-free and `env:`-free — all
48 invariants green — while the script's `process.exit(1)` no longer stops the job. Migrate, seed
and Playwright then run, and `ci.yml:264-297` is measured at fourteen real outbound sends. `if:
false` has the same effect one step further out (Invariant C's `findIndex` is over `run` strings and
does not care whether the step will execute).

This is round 1's WR-02 in a materially worse position. There it detached a test runner; here it
detaches the only half of D-14 that protects the **current** run — the property `ci.yml:1362-1366`
and `scripts/verify-workflows.mjs:502-506` both state is the entire reason the step exists.

**Fix:** Quantify the unconditional check over the steps that carry the gate, not just the job.

```js
const conditionalSteps = stepsOf(e2e)
  .filter((s) => s?.if !== undefined || s?.["continue-on-error"] === true)
  .map((s, i) => String(s?.name ?? `step[${i}]`));
check(
  `"${CI_E2E_JOB}" has NO conditional or soft-failing step — a gate step that cannot fail the job is not a gate`,
  e2e?.if === undefined && e2e?.["continue-on-error"] !== true && conditionalSteps.length === 0,
  `job if=${JSON.stringify(e2e?.if ?? null)}  job continue-on-error=${JSON.stringify(e2e?.["continue-on-error"] ?? null)}  ` +
    `conditional/soft steps=[${conditionalSteps.join(", ") || "(none)"}]`,
);
```

If a future step legitimately needs a condition, that is a decision to record — same rule the
existing job-level comment already states.

---

## Warnings

### WR-01: neither half of D-14 protects the run that introduces a step-level `env:` on the Playwright step

**File:** `.github/workflows/ci.yml:285-297`, `scripts/verify-workflows.mjs:519-544`

**Issue:** `ci.yml`'s "WHICH HALF COVERS WHAT" paragraph partitions the surface into: parse half
(workflow/job/step `env:` keys, next run only) and runtime half (`container.env`, secrets, runner
variables, this run). A mail key added as a **step-level `env:` on the Playwright step** falls in a
seam neither half covers *on the run that introduces it*: the refusal script runs earlier in a
different process and cannot see a later step's `env:`, and the parse half that would catch it runs
on `gate-db-free`, which the file itself documents as parallel and non-cancelling. The suite boots
with the key and mails real addresses; the red arrives on job 1 of the same run, too late.

The paragraph is written to be exhaustive about known holes ("A list that omits a known hole is the
same defect as a header that omits a job") and this one is not in it.

**Fix:** Either state the seam in the same paragraph, or close it — a cheap closure is to assert
that no step in `gate-e2e` declares an `env:` map at all (today none does), which makes the runtime
half total over that job:

```js
const e2eStepEnvs = stepsOf(e2e).filter((s) => s?.env !== undefined).map((s, i) => String(s?.name ?? `step[${i}]`));
check(
  `no step in "${CI_E2E_JOB}" declares its own env: — the refusal reads the job's process environment, and a step env: is invisible to it`,
  e2eStepEnvs.length === 0,
  `steps with env:=[${e2eStepEnvs.join(", ") || "(none)"}]`,
);
```

---

### WR-02: `process.exit()` immediately after `console.log` can truncate the `::error::` annotations and flake a build-blocking test

**File:** `scripts/refuse-mail-credential.mjs:70`, `:81`, `:97`, `:104`

**Issue:** Every exit path is `console.log(...)` followed synchronously by `process.exit(n)`.
`process.stdout` writes are only guaranteed synchronous for pipes on Linux and Windows; on macOS a
pipe write is asynchronous, and `process.exit()` discards anything still buffered. The consequences
are ordered by severity: the exit code (the property CI consumes) is always correct, so the control
stays fail-closed; but the `::error::` annotations that tell the operator *which variable* tripped
it can be lost, and `tests/design/mail-credential-refusal.test.ts:107-110`/`:136-141` assert on
`result.stdout` through a pipe — so on a macOS contributor's machine this becomes a flaky
**build-blocking** gate. A flaky gate gets retried until green, which is the failure mode this whole
phase exists to remove.

**Fix:** Set the exit code and let the process drain, or flush explicitly.

```js
process.exitCode = 1;
return;            // top-level ESM module: falls off the end, stdout flushes, exit code 1 stands
```

Apply to all four exits (the trailing `process.exit(0)` is redundant and can be deleted outright).

---

### WR-03: the unreadable-source hard stop — one of the two the script names — has no test

**File:** `scripts/refuse-mail-credential.mjs:64-71`, `tests/design/mail-credential-refusal.test.ts:130-145`

**Issue:** The header declares two hard stops: the source cannot be **read**, and the declaration
cannot be **parsed**. The design suite instruments only the second (a decoy file that exists and
carries no declaration). The `catch` on `readFileSync` — the branch that fires when
`verify-workflows.mjs` is deleted, renamed, or unreadable — is never executed by any test, and it is
the branch where a fail-open would be most expensive. It is currently correct; it is simply not
proven, in a file whose stated purpose is that "a fail-closed control that is only ever exercised by
the thing it is supposed to protect has no instrument at all".

**Fix:** Add the missing direction, using a path that is guaranteed not to exist:

```ts
it("exits 1 naming the source path when the prefix source cannot be READ at all", () => {
  const absent = join(tmpdir(), `mail-prefix-absent-${process.pid}-${Date.now()}.mjs`);
  const result = runRefusal({ ...baseEnv(), [VIOLATING_KEY]: SENTINEL }, [absent]);
  expect(result.status).toBe(1);
  expect(result.stdout).toContain(absent);
  expect(`${result.stdout}${result.stderr}`).not.toContain(SENTINEL);
});
```

Note the violating key is set deliberately: it proves the read failure stops the scan rather than
being papered over by a hit.

---

### WR-04: Invariant B's "shares the pattern" conjunct only checks the pattern's TEXT is present, not that the script uses it

**File:** `scripts/verify-workflows.mjs:782-796`

**Issue:** `sharesPattern = refusalSource.includes(MAIL_KEY_PREFIX_DECL.source)` is a substring test
over the whole file — comments included. A refusal script that keeps the pattern text in a comment
(or in dead code) while matching with a *different* regex satisfies it. `holdsNoCopy` has the mirror
weakness in the other direction: it is `!refusalSource.includes("RESEND")` over raw text, so it also
fires on an unrelated word containing the prefix, and it does not fire on an obfuscated copy
(`"RES" + "END"`). This is the weakest of the three conjuncts backing the header's "the TWO HALVES
asserted UNDRIFTABLE" claim (`ci.yml:244-247`), and the same substring-on-a-documented-file vacuity
this script's own header (lines 6-32) argues against — reproduced inside the checker.

**Fix:** Assert the *behaviour* instead of the text. The script is spawnable and cheap; run it with
a fixture whose declaration carries a known-distinct prefix and assert the reported prefix comes
back:

```js
const probe = spawnSync(process.execPath, [MAIL_REFUSAL_SCRIPT, PROBE_FIXTURE], { encoding: "utf8", env: { PATH: process.env.PATH } });
const readsDeclaration = probe.status === 0 && probe.stdout.includes("prefix=ZZPROBE");
```

If a spawn inside the checker is unwanted, at minimum note in the comment that `sharesPattern` is a
text check and that `tests/design/mail-credential-refusal.test.ts` is what proves the pattern is
actually used.

---

## Info

### IN-01: `expect(result.stdout).toMatch(/\b\d+\b/)` is close to vacuous

**File:** `tests/design/mail-credential-refusal.test.ts:118`

**Issue:** The test's name promises it "reports the prefix, the count scanned and its source", but
`/\b\d+\b/` matches any digit anywhere in the output — including a digit inside a path, or inside a
future unrelated line. It cannot distinguish "reported a count" from "printed something numeric".

**Fix:** `expect(result.stdout).toMatch(/scanned \d+ environment variable name\(s\)/)`.

---

### IN-02: `spawnSync` failure is never asserted, and produces a confusing `TypeError`

**File:** `tests/design/mail-credential-refusal.test.ts:98-100`, `:108`, `:138`

**Issue:** If the spawn itself fails (bad `execPath`, missing script, EACCES), `result.status` is
`null` and `result.stdout` is `null`; `result.stdout.split("\n")` then throws
`TypeError: Cannot read properties of null` rather than naming the real failure. Cheap to make
legible in a file whose whole idiom is "a diagnostic that cannot be misread".

**Fix:** In `runRefusal`, add
`if (result.error) throw new Error(\`could not spawn ${SCRIPT}: ${result.error.message}\`);`
before returning.

---

### IN-03: error output goes to stdout, diverging from the sibling checker, and the tests now pin it

**File:** `scripts/refuse-mail-credential.mjs:67-69`, `:76-80`, `:88-96`

**Issue:** All `::error::` lines use `console.log`. `scripts/verify-workflows.mjs` writes every fatal
and every failure list to `console.error` (`:138-152`, `:167-178`, `:1075-1077`). GitHub picks up
workflow commands from both, so this is not a functional defect — but the two halves of one control
now disagree on their stream, and `mail-credential-refusal.test.ts` asserts specifically on
`result.stdout`, which silently makes the choice load-bearing.

**Fix:** Either move the `::error::` lines to `console.error` and assert on
`${result.stdout}${result.stderr}` in the test, or add one sentence to the script header recording
that stdout is deliberate and why.

---

### IN-04: `ci.yml` still calls the refusal "job 5's FIRST step" in a paragraph this plan rewrote

**File:** `.github/workflows/ci.yml:267`, `.github/workflows/ci.yml:1337`

**Issue:** The step is fourth (`checkout`, `setup-node`, `npm ci`, refusal). Round 1 recorded this as
IN-06; plan 19-12 re-authored both sentences and kept the inaccuracy, while
`scripts/refuse-mail-credential.mjs:3` and `tests/design/mail-credential-refusal.test.ts:2` state it
correctly ("first step after `npm ci`" / "runs first, before the database is migrated"). Three sites
describing one step, two of them right. The invariant itself (C) is precise — only `npm ci` may
precede — so the prose is the only thing out of step.

**Fix:** "job 5's FIRST `run:` step after `npm ci`" in both places, matching Invariant C's wording.

---

_Reviewed: 2026-09-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Scope: plan 19-12 source changes only (eac5541..HEAD)_
