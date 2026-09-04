---
phase: 19-host-listing-surfaces-gates-that-actually-run
reviewed: 2026-09-05T00:35:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - scripts/refuse-mail-credential.mjs
  - scripts/verify-workflows.mjs
  - tests/design/mail-credential-refusal.test.ts
  - .github/workflows/ci.yml
findings:
  critical: 2
  warning: 5
  info: 4
  total: 11
status: issues_found
---

# Phase 19 (plan 19-13): Code Review Report

**Reviewed:** 2026-09-05
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Plan 19-13 closed the two defects it set out to close, and it closed them properly. Both were
re-tested against the working tree during this review:

- Appending any argument to `gate-e2e`'s refusal `run:` now turns Invariant A red, and the script
  itself refuses arguments before it touches a file or the environment. The `argv` override is gone,
  not gated. Design-test cases 7 and 8 are genuine red-before/green-after cases (case 8 reproduces
  the measured exit-0 fail-open verbatim); all 8 cases pass (`vitest run --config
  vitest.design.config.ts` → 8 passed).
- A step-level literal `continue-on-error: true` is now caught by the widened quantifier, and the
  invariant total is genuinely still 48 (`baselines=11, ci=29, cross=8`, re-run).
- The prefix-decoy vector the review brief asked about is genuinely closed: both the refusal script
  and Invariant B take the **first** `/^const MAIL_KEY_PREFIX = "…";$/m` match in
  `verify-workflows.mjs`, so a decoy declaration inserted ahead of the real one (even inside a
  template literal, where `^` still matches) makes Invariant B's `declMatches` false and goes red.
  That seam holds.

**But the third vector the brief asked for exists, and there are two of them.** Both were
reproduced by mutating `.github/workflows/ci.yml`, running `node scripts/verify-workflows.mjs`,
and observing `All 48 invariants hold`. Both mutations were reverted and `git status --porcelain`
is back to its pre-review state (three pre-existing untracked `.planning/` files only).

The shape of both is identical to CR-02: the newly-widened predicate was widened along the
*axis that was measured* (`if:` and literal `continue-on-error: true` on a step) rather than along
the axis the prose claims (`A gate step that cannot fail the job is not a gate; it is a report`).
Two other single-key step attributes still neutralize the refusal step with every invariant green.

## Critical Issues

### CR-01: A step-level `shell:` key neutralizes the mail refusal with all 48 invariants green

**File:** `scripts/verify-workflows.mjs:751-767` (the widened "unconditional" check),
`scripts/verify-workflows.mjs:808-819` (Invariant A), `.github/workflows/ci.yml:1402-1403`

**Issue:** GitHub Actions supports a custom shell of the form `shell: <command> [args] {0}`, where
the step's `run:` body is written to a temp file and handed to that command. Adding one line to the
refusal step:

```yaml
      - name: Refuse to run the suite with a live mail credential in the environment
        shell: cat {0}
        run: node scripts/refuse-mail-credential.mjs
```

leaves the `run:` string byte-identical (so Invariant A's new exact-equality conjunct passes), adds
no `env:`, no `if:` and no `continue-on-error:` (so the widened quantifier at :751-767 passes) and
does not move the step (so Invariant C passes). `cat` prints the script and exits 0 — the refusal
never executes, and the suite proceeds to migrate, seed and boot the app with a live mail credential
in the environment. **Reproduced:** applied to `ci.yml`, `node scripts/verify-workflows.mjs` printed
`All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8)`, exit 0, zero red lines.
Reverted; tree clean.

The same hole exists one level out via `defaults: { run: { shell: … } }` at job or workflow level —
`grep -n "shell\|defaults" scripts/verify-workflows.mjs` returns no matches at all, so neither is
read anywhere in the checker.

This is not a hypothetical distinction from the two closed vectors: the prose the same commit
added at `scripts/verify-workflows.mjs:750` and `.github/workflows/ci.yml:244-245` states the
property as "a gate step that cannot fail the job is not a gate", and a `shell:` override is
precisely a step that cannot fail the job.

**Fix:** Assert the refusal step's full attribute surface, not a hand-picked subset. The cheapest
correct form is an allow-list of keys on that step, added as conjuncts of Invariant A:

```js
// Only these keys may appear on the refusal step. Anything else — `shell:`, `working-directory:`,
// `timeout-minutes:`, a future Actions attribute nobody here has heard of — is a change to how the
// step executes, and a change to how a gate executes is a decision to record, not one to absorb.
const MAIL_STEP_ALLOWED_KEYS = ["name", "run"];
const mailStepKeys = Object.keys(e2eMailStep ?? {}).sort();
const mailStepExtraKeys = mailStepKeys.filter((k) => !MAIL_STEP_ALLOWED_KEYS.includes(k));
// …and add `mailStepExtraKeys.length === 0` to Invariant A's predicate, with
// `keys=[${mailStepKeys.join(", ")}]  unexpected=[${mailStepExtraKeys.join(", ")}]` in the evidence.
```

Add, in the same commit, a conjunct to the "unconditional" check that no `defaults` block exists at
workflow level or on `gate-e2e`:

```js
const shellDefaults =
  doc?.defaults?.run?.shell !== undefined || e2e?.defaults?.run?.shell !== undefined;
```

An allow-list is the right shape here rather than a deny-list of `shell`, because the failure class
is "an attribute the checker does not know about", and a deny-list can only ever name the ones it
already knows.

---

### CR-02: `continue-on-error` with an expression or quoted value defeats the check that was just widened for exactly this

**File:** `scripts/verify-workflows.mjs:756`, `scripts/verify-workflows.mjs:760-762`

**Issue:** Both the job read and the new step filter test for the JavaScript boolean `true`:

```js
.filter(({ step }) => step?.if !== undefined || step?.["continue-on-error"] === true)
…
e2e?.if === undefined &&
  e2e?.["continue-on-error"] !== true &&
  conditionalSteps.length === 0,
```

`continue-on-error` is documented as accepting an **expression**, not only a literal boolean
(`continue-on-error: ${{ matrix.experimental }}` is the canonical example in GitHub's own docs).
An expression parses to a *string*, so `=== true` is false and `!== true` is true — the predicate
stays green:

```
node -e "parse('continue-on-error: ${{ true }}')" → {"continue-on-error":"${{ true }}"}   === true? false
node -e "parse('continue-on-error: \"true\"')"    → {"continue-on-error":"true"}          === true? false
```

**Reproduced:** adding `continue-on-error: ${{ true }}` as a third line under the refusal step's
`name:`/`run:` pair and running the checker printed `All 48 invariants hold across 3 section(s)
(baselines=11, ci=29, cross=8)`, exit 0. This is CR-02 from `19-VERIFICATION.md` re-opened by a
one-token change to the mutation the verifier happened to write, with the step's non-zero exit again
unable to fail the job. The job-level read at :761 carries the identical hole, so the check is also
weaker than the 19-11 predicate it claims to be a strict widening of.

Note the asymmetry inside the same expression: `if:` is tested for *presence*
(`step?.if !== undefined`), which is correct and expression-proof. `continue-on-error` is tested for
*value*, which is not.

**Fix:** Test for presence on both, at both levels, exactly as `if:` already is. `continue-on-error:
false` on a gate step is noise that should be deleted anyway, so there is no legitimate value to
carve out:

```js
.filter(({ step }) => step?.if !== undefined || step?.["continue-on-error"] !== undefined)
…
e2e?.if === undefined &&
  e2e?.["continue-on-error"] === undefined &&
  conditionalSteps.length === 0,
```

and rename the invariant string from `no continue-on-error: true` to `no continue-on-error: AT ALL`
so the printed line stops describing the weaker property.

## Warnings

### WR-01: Nothing asserts `ci.yml`'s triggers — deleting `pull_request:` detaches the whole gate with 48 green

**File:** `scripts/verify-workflows.mjs:428-863` (the entire `ci` section), `.github/workflows/ci.yml:526-529`

**Issue:** The `baselines` section asserts its trigger set as an exact comparison
(`verify-workflows.mjs:305-310`) precisely because a substring check was measured green for an added
`push:`. The `ci` section does the opposite: `triggersOf(doc)` appears there only inside the
`parsed values (ci)` printout at :929. Deleting `pull_request:` from `ci.yml:529` — a one-line edit —
removes every gate in this file from pull requests while the checker reports all 48 invariants hold.
CI-01's requirement text is literally *"Opening a pull request runs the repository's functional
Playwright specs"*, so this is the one trigger whose absence falsifies the requirement the phase
claims.

This predates 19-13 rather than being introduced by it, but it is the same defeat class the round
exists to close and it lives in a file that was reviewed and edited this round.

**Fix:** Mirror the baselines assertion, as a superset test rather than an exact one (a future
`workflow_dispatch` addition is harmless):

```js
const ciTriggers = triggersOf(doc);
check(
  "ci.yml runs on BOTH push and pull_request — CI-01's requirement text is about pull requests",
  ciTriggers.includes("push") && ciTriggers.includes("pull_request"),
  `triggers=[${ciTriggers.join(", ")}]`,
);
```

Note this adds a 30th `ci` invariant, so the "the total stays 48" paragraph at `ci.yml:281-284`
must be updated in the same commit.

---

### WR-02: The two workflow-side tightenings have no standing test — only reverted manual mutations

**File:** `tests/design/mail-credential-refusal.test.ts` (whole file), `scripts/verify-workflows.mjs:808-819`, `:751-767`

**Issue:** The script half of D-14 has eight build-blocking cases. The checker half — the part that
actually caught nothing for a full verification round — has zero. Both 19-13 tightenings were proven
only by "twelve observed reds" applied by hand and reverted (`ci.yml:275-280`). Nothing in the tree
would notice if a future edit reverted `e2eMailRun.trim() === MAIL_REFUSAL_RUN` back to a
containment test, or dropped `conditionalSteps.length === 0` from the predicate: the checker would
go green, the design suite would go green, and CI would go green. The file's own governing argument
— *"a fail-closed control that is only ever exercised by the thing it is supposed to protect has no
instrument at all — which is exactly how CR-01 survived a whole verification round"*
(`mail-credential-refusal.test.ts:50-52`) — applies verbatim to the checker, and is not acted on.
That both CR-01 and CR-02 of this review are re-openings of predicates that were hand-verified once
is the concrete cost.

**Fix:** Add a `tests/design/workflow-invariants.test.ts` that mutates a **copy** of `ci.yml` in a
`mkdtemp` directory (never the tracked file) and spawns the checker against it, asserting exit 1 and
a named FAIL line — the same `spawnSync`-plus-temp-copy idiom `withScriptCopy` already establishes.
Minimum cases: appended argument on the refusal `run:`; `continue-on-error` on the refusal step;
`continue-on-error` on the job; a `shell:` key on the refusal step (CR-01); an expression-valued
`continue-on-error` (CR-02). This requires the checker to accept the workflow directory as a
parameter — do that via an **environment variable read only when `NODE_ENV === "test"` is not the
mechanism**; prefer a second exported entry point or a `--workflow-dir=` flag that the `ci.yml`
invocation provably never carries, and pin *that* invocation with the same exact-equality conjunct
Invariant A already uses on the refusal step. Do not repeat 19-12's mistake of adding a test-only
input to a security control with no invariant pinning its absence on the production path.

---

### WR-03: The refusal's failure message claims coverage of repository/environment secrets that the control cannot see

**File:** `scripts/refuse-mail-credential.mjs:119-121`

**Issue:**

```js
console.log("::error::A live mail credential is present in this job's REAL PROCESS ENVIRONMENT —");
console.log("::error::not merely in the workflow's `env:` maps. A container-level `env:` block, a");
console.log("::error::repository or environment secret, or a runner variable all reach here.");
```

Repository, organization and environment secrets do **not** populate a step's process environment in
GitHub Actions. They are only reachable through `${{ secrets.* }}` interpolated into an `env:` or
`with:` map — i.e. exactly "the workflow's `env:` maps" the sentence says this is *not* limited to.
A secret that is never mapped is invisible to `Object.keys(process.env)`; a secret that *is* mapped
under a non-provider-prefixed key (e.g. `MAILER_KEY: ${{ secrets.RESEND_API_KEY }}`) is invisible to
both halves of D-14, because both key off the name. The only inputs this scan genuinely adds over
the parse half are `container.env` and the runner environment — which is what
`verify-workflows.mjs:22-23` says, correctly, one file over.

This is the review focus's first category: a sentence describing a guarantee the adjacent code does
not implement, in the file whose header devotes twenty lines to why that is worse than no control.

**Fix:** State the two input classes this actually adds and name the one it cannot see:

```js
console.log("::error::not merely in the workflow's `env:` maps. A `container.env` block or a runner");
console.log("::error::variable reaches here and is invisible to the parse half.");
console.log("::error::⚠ A SECRET MAPPED UNDER A NON-PROVIDER-PREFIXED KEY IS INVISIBLE TO BOTH HALVES:");
console.log("::error::both key off the NAME. `verify-workflows.mjs`'s zero-`secrets.` invariant is");
console.log("::error::what covers that case, and it is a different assertion in a different file.");
```

---

### WR-04: The argument refusal echoes raw `process.argv` into the build log, against the file's own stated rule

**File:** `scripts/refuse-mail-credential.mjs:69`, rule stated at `:40-41`

**Issue:** `:40-41` states the file's governing rule: *"THIS FILE PRINTS VARIABLE NAMES AND NEVER
VARIABLE VALUES. A credential echoed into a build log is a wider disclosure than the send this
control exists to prevent."* Twenty-eight lines later:

```js
console.log(`::error::Received: ${process.argv.slice(2).join(" ")}`);
```

`argv` is unfiltered caller-controlled content. Invariant A prevents `ci.yml` from ever passing one,
but the script is also invoked by hand — the verifier's own reproduction was
`RESEND_API_KEY=… node scripts/refuse-mail-credential.mjs /tmp/decoy.mjs`, and a developer probing
this control by pasting a value (`node scripts/refuse-mail-credential.mjs "$RESEND_API_KEY"`) gets
it printed back with `::error::` framing. The count is the diagnostic; the content is not.

**Fix:** Print the count and the shape, never the content:

```js
console.log(`::error::Received ${process.argv.length - 2} argument(s). Their VALUES are deliberately`);
console.log("::error::not echoed — the rule this file states about variable values binds argv too.");
```

---

### WR-05: Invariant C's "only `npm ci` may precede" quantifies over `run` steps only

**File:** `scripts/verify-workflows.mjs:847-863`

**Issue:** `onlyInstallBefore` is computed over `e2eRuns` — `runsOf(e2e)`, which
(`verify-workflows.mjs:201`) filters to steps with a **string `run`**. Steps declaring `uses:` are
absent from the list entirely, so any number of them may be inserted ahead of the refusal without
moving `iE2eRefuse`. The supply-chain invariant restricts them to `actions/*`, but
`actions/github-script` alone can run arbitrary JavaScript in the job before the refusal fires. The
invariant string says "*only* `npm ci` may precede the refusal", and the evidence line repeats it —
a stronger claim than the code makes.

**Fix:** Compute the position over the full step list rather than the run-command list, and allow
only `actions/checkout`, `actions/setup-node` and a `run: npm ci`:

```js
const e2eSteps = stepsOf(e2e);
const iStepRefuse = e2eSteps.findIndex((s) => String(s?.run ?? "").includes(MAIL_REFUSAL_SCRIPT));
const PRECEDE_OK = ["actions/checkout", "actions/setup-node"];
const onlySetupBefore =
  iStepRefuse >= 0 &&
  e2eSteps.slice(0, iStepRefuse).every((s) =>
    String(s?.run ?? "").trim() === "npm ci" ||
    PRECEDE_OK.some((u) => String(s?.uses ?? "").startsWith(`${u}@`)),
  );
```

## Info

### IN-01: Two of Invariant A's five conjuncts are logically implied by a third

**File:** `scripts/verify-workflows.mjs:811-813`

**Issue:** Once `e2eMailRun.trim() === MAIL_REFUSAL_RUN` holds, `e2eMailRun.includes(MAIL_REFUSAL_SCRIPT)`
and `!e2eMailRun.includes("${{")` are unfalsifiable — the string is fully determined. They can never
discriminate, so the "five conjuncts" the comment at :798 and `ci.yml:249` count is really three
independent ones (step present, exact run, no `env:`). The count is used rhetorically in both files
as evidence of coverage depth, which makes the dead conjuncts more than cosmetic.

**Fix:** Delete the two implied conjuncts and correct "FIVE conjuncts" to "THREE" in both
`verify-workflows.mjs:798` and `.github/workflows/ci.yml:247-250` — or keep them and stop counting
them as independent coverage. Spending the freed line on CR-01's key allow-list would make the count
honest and higher at the same time.

---

### IN-02: `withScriptCopy` compares a `tmpdir()`-built path against a realpath-derived one

**File:** `tests/design/mail-credential-refusal.test.ts:157`, `:207`, `:218`

**Issue:** `paths.sibling` is `join(mkdtempSync(join(tmpdir(), …)), "verify-workflows.mjs")`, while
the string the script prints comes from `fileURLToPath(new URL("./verify-workflows.mjs",
import.meta.url))`. Node resolves the real path of the main entry module, so on any platform where
the temp directory is a symlink the two differ and `expect(result.stdout).toContain(paths.sibling)`
fails for a script that behaved correctly. macOS is the concrete case (`/var` → `/private/var`).
Linux CI and Windows are unaffected, so this will not fire in `gate-db-free`, but it is a
build-blocking test that can fail on a contributor's machine for a reason unrelated to the property.

**Fix:** `realpathSync` the temp directory immediately after `mkdtempSync`:

```js
const dir = realpathSync(mkdtempSync(join(tmpdir(), "mail-refusal-")));
```

---

### IN-03: Nothing pins that the argument refusal precedes the file and environment reads

**File:** `scripts/refuse-mail-credential.mjs:65-66`, `tests/design/mail-credential-refusal.test.ts:229-254`

**Issue:** `:65-66` states the ordering as a property — *"THE ARGUMENT REFUSAL, BEFORE ANY FILE OR
ENVIRONMENT READ. Nothing this script does is safe to do on behalf of a caller who thinks it is
configurable, so the refusal precedes the configuration."* Moving the `argv` block below
`readFileSync` and below the scan leaves all eight cases green: case 7 (clean env + argument) and
case 8 (violating env + argument) both still reach exit 1, just by a different route. The stated
ordering is documented intention, not a checked property — the same distinction the round's own
patterns block insists on.

**Fix:** Give case 7 a positive assertion that no scan output precedes the refusal, e.g.
`expect(result.stdout).not.toContain("read from")` alongside the existing
`not.toContain("0 begin with it")`; and add a case running the copy from a directory with **no**
sibling AND an argument, asserting the output names the argument refusal rather than the READ stop.

---

### IN-04: Prefix matching is case-sensitive against a `process.env` that is case-insensitive on Windows

**File:** `scripts/refuse-mail-credential.mjs:115-116`

**Issue:** `Object.keys(process.env).filter((name) => name.startsWith(prefix))` is case-sensitive.
On Windows, `process.env` lookups are case-insensitive while `Object.keys` returns the environment's
own casing, so a variable set as `resend_api_key` is readable by application code as
`process.env.RESEND_API_KEY` and invisible to this scan. On the deployed platform (Linux container)
the two spellings are genuinely different variables and `src/lib/email.ts` reads only the uppercase
one, so there is no exposure in CI — but the design suite exercises this script on Windows, where
its semantics differ from the platform it guards.

**Fix:** Match case-insensitively; there is no legitimate variable whose name differs from the
provider prefix only by case:

```js
const upperPrefix = prefix.toUpperCase();
const hits = names.filter((name) => name.toUpperCase().startsWith(upperPrefix)).sort();
```

---

## Working-tree note

Two `ci.yml` mutations were applied during this review to reproduce CR-01 and CR-02, then restored
from a byte-copy taken beforehand. `git status --porcelain` afterwards shows only the three
pre-existing untracked `.planning/` entries that were present when the review began, and
`node scripts/verify-workflows.mjs` reports `All 48 invariants hold` against the restored file.

---

_Reviewed: 2026-09-05T00:35:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
