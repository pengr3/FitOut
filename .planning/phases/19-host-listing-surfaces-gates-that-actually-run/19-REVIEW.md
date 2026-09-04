---
phase: 19-host-listing-surfaces-gates-that-actually-run
reviewed: 2026-09-05T02:05:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - scripts/verify-workflows.mjs
  - scripts/refuse-mail-credential.mjs
  - tests/design/workflow-invariants.test.ts
  - tests/design/mail-credential-refusal.test.ts
  - .github/workflows/ci.yml
findings:
  critical: 3
  warning: 3
  info: 5
  total: 11
status: issues_found
---

# Phase 19 (plans 19-14 / 19-15): Code Review Report

**Reviewed:** 2026-09-05
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

### What this round genuinely got right, verified by experiment rather than by reading the prose

**The allow-list is a real positive specification, not a renamed deny-list.**
`MAIL_STEP_ALLOWED_KEYS` (`verify-workflows.mjs:149`) enumerates the permitted keys and rejects the
complement (`:896-897`), using exact string equality so a differently-cased or suffixed spelling of a
permitted key lands outside it. It is ANDed with `e2eMailStep !== undefined` (`:936`), so an absent or
renamed step is red rather than vacuously green — confirmed by reading, and the vacuity is called out
at `:928-930`. Case 3 (`working-directory`) is genuine evidence for the unknown-unknown claim.

**The standing test genuinely constrains the shipped checker.** I verified this destructively rather
than accepting it: neutering the allow-list conjunct to `true` (`verify-workflows.mjs:939`) turned
cases 2 and 3 red (`2 failed | 10 passed`), i.e. the mutated copy really is the subject and a weakened
predicate really is caught. `expectRed` asserts both a non-zero exit *and* a `FAIL` line naming the
invariant, so a hard stop or a crash cannot satisfy it, and `EXPECTED_GREEN` pins the whole summary
sentence including per-section counts.

**The refusal script has no new fail-open.** Every branch was traced: argument present → exit 1
(before any read); source unreadable → exit 1; declaration absent, empty or reshaped (trailing
whitespace defeats the `;$` anchor) → exit 1; any prefixed name in `process.env` → exit 1. The only
`exit 0` is the genuine clean-scan path. WR-03's and WR-04's replacements are accurate: the failure
message now names only `container.env` and the runner environment (both true), explicitly disclaims
the non-prefixed-key case, and the argument diagnostic prints `process.argv.length - 2` and no
content. Prior IN-03 (argument-guard ordering unpinned) and IN-04 (case-sensitive prefix vs. Windows
`process.env`) are unchanged and are not restated as new findings — I found no evidence they are worse
than described.

**The count documentation is correct.** Every surviving `48` is a past-tense measurement record
(`ci.yml:239,253,270,279,375`; `verify-workflows.mjs:467,785,806,914,927`;
`mail-credential-refusal.test.ts:20`; `workflow-invariants.test.ts:417`). The only two present-tense
counts are `ci.yml:362` and `workflow-invariants.test.ts:100`, byte-identical to the checker's actual
output. `ci.yml` changed in comments only this round (`git diff 07b9977..HEAD` over
non-`#` lines is empty). The eight-entry `gate-e2e` list matches the eight counted `check()` calls.

### The standing question: yes, a fourth round of vectors exists — three of them

The brief asked what single-token edit still defeats the guard while `node scripts/verify-workflows.mjs`
prints all 50 green. I found three, each reproduced by mutating `.github/workflows/ci.yml`, running the
checker, and observing `All 50 invariants hold across 3 section(s) (baselines=11, ci=31, cross=8)` with
exit 0 and zero `FAIL` lines. All three are the *same shape as every previous round*: the new predicate
was written along the axis that was measured (a deleted trigger key, a `uses:` step in the run list, a
key on the refusal step) rather than along the property the prose beside it claims.

1. **CR-01** — a `branches:`/`paths-ignore:` filter under `pull_request:`. The trigger check asks for
   key membership; a filter leaves the key.
2. **CR-02** — one decoy `run:` line whose text merely *contains* the refusal script's path. It
   relocates the anchor Invariant C computes its predecessor allow-list from, making `every([])`
   vacuously true while an arbitrary `uses:` action runs ahead of the real refusal.
3. **CR-03** — nothing constrains `gate-db-free`, the job that *executes the checker* and the whole
   design suite. Deleting its two-line checker step, or adding one `continue-on-error: true` to it,
   leaves 50 green.

Every mutation was reverted. `git status --porcelain` shows only the three pre-existing untracked
`.planning/` entries; `git diff --stat` is empty; the checker reports 50 green and both design suites
pass 20/20 against the restored tree.

## Critical Issues

### CR-01: A trigger *filter* detaches every gate from pull requests with all 50 invariants green

**File:** `scripts/verify-workflows.mjs:487-494`, `.github/workflows/ci.yml:623-626`

**Issue:** The new trigger invariant (plan 19-15's answer to WR-01) tests key membership only:

```js
const ciTriggers = triggersOf(doc);   // Object.keys(doc.on)
check("ci.yml runs on BOTH push and pull_request — …", ciTriggers.includes("push") && ciTriggers.includes("pull_request"), …);
```

`push:` and `pull_request:` are event *maps*, not flags. A filter inside the map decides whether the
event ever fires, and the key survives every filter. **Reproduced against the working tree:**

```yaml
on:
  push:
    branches: [dev, main]
  pull_request:
    branches: [does-not-exist]
```

→ `All 50 invariants hold across 3 section(s) (baselines=11, ci=31, cross=8).`, `CHECKER-EXIT=0`, no
`FAIL` line. Reverted; `md5sum` back to `b655c2d8…`.

`paths-ignore: ['**']` and `types: [labeled]` do the same. The realistic spelling is not even
adversarial: `pull_request: branches: [main]` looks like a tidy narrowing and silently exempts every
pull request into `dev` — which is this repository's working branch and half of the `push:` filter one
line above.

This is exactly the failure WR-01 was raised for, one token deeper, and it falsifies the same
sentence: CI-01's requirement text is *"opening a pull request runs the repository's functional
Playwright specs"*. `ci.yml:370-383` states the property as "`ci.yml` must run on BOTH `push` and
`pull_request`" and "deleting `pull_request:` … detaches EVERY gate here from pull requests" — the
first sentence is the claim, the second is the only thing the code implements. `tests/design/
workflow-invariants.test.ts` case 12 tests only the deletion, so the test suite records the measured
axis too.

**Fix:** Assert the event is unfiltered, not merely present. Absence of a filter is the property; a
deliberate filter is a decision to record, exactly as the `defaults:` block one screen above is
treated:

```js
// The event MAP, not just the key. A `branches:`/`branches-ignore:`/`paths:`/`paths-ignore:`/`types:`
// filter leaves the key in place while deciding the event never fires — the same open set the step
// allow-list closes one level in, so close it the same way: `null` (a bare `pull_request:`) is the
// only passing value, and a deliberate filter is removed here in the same commit that adds it.
const prFilter = doc?.on?.pull_request;
check(
  "ci.yml runs on push and on EVERY pull_request — the pull_request trigger carries no filter",
  ciTriggers.includes("push") &&
    ciTriggers.includes("pull_request") &&
    (prFilter === null || prFilter === undefined),
  `triggers=[${ciTriggers.join(", ")}]  pull_request=${JSON.stringify(prFilter ?? null)}`,
);
```

Add a case to `workflow-invariants.test.ts` alongside case 12 that inserts `branches: [does-not-exist]`
rather than deleting the key — otherwise the next round re-measures the same axis a third time.

---

### CR-02: One decoy `run:` line makes Invariant C's predecessor allow-list vacuous, with all 50 green

**File:** `scripts/verify-workflows.mjs:994-1006` (anchor + `onlySetupBefore`), contrast `:890`
(Invariant A's anchor)

**Issue:** Invariant A identifies the refusal step by **exact `name:`** (`:890`). Invariant C
identifies *the same step* by **substring of a run string** (`:994-996`):

```js
const iE2eStepRefuse = e2eSteps.findIndex((s) => String(s?.run ?? "").includes(MAIL_REFUSAL_SCRIPT));
const e2ePrecede = iE2eStepRefuse >= 0 ? e2eSteps.slice(0, iE2eStepRefuse) : [];
const onlySetupBefore = iE2eStepRefuse >= 0 && e2ePrecede.every(…);
```

Two identities for one step, and `findIndex` takes the first. Any step whose `run:` *mentions* the
path — including in an `echo` or a `#` comment — becomes the anchor, and everything the real refusal
was supposed to follow moves behind it. **Reproduced**, inserting two lines as `gate-e2e`'s first
steps:

```yaml
    steps:
      - run: echo node scripts/refuse-mail-credential.mjs
      - uses: actions/github-script@v7
      - uses: actions/checkout@v4
      …
```

→ `All 50 invariants hold…`, `CHECKER-EXIT=0`, and the invariant's own evidence line reads:

```
indices: refusal=0  db:migrate=3  db:seed=4  playwright=5  (of 6 run commands)
refusal step index=0 (of 9 steps)  precedes=[(none)]
permitted=[actions/checkout@…, actions/setup-node@…, run:npm ci]  and that holds=true
```

`precedes=[(none)]` and `holds=true` while `actions/github-script@v7` executes arbitrary JavaScript at
step index 1 and the real refusal sits at index 5. `every` over an empty list is true — the identical
vacuity class the file's hard stops exist to remove (`:280-282`, `:709-724`), reintroduced by the fix
for WR-05. A second reproduction with the decoy placed just before the real refusal (so the
`github-script` step sits between them) is green too.

The invariant's printed name — *"ONLY actions/checkout@, actions/setup-node@ and `npm ci` may precede
it, over the FULL step list"* — and `ci.yml:301-315`'s "WHAT REPLACED IT" paragraph both assert a
property the predicate does not hold. `⚠ THE TRAILING @ IS LOAD-BEARING` (`:990-991`) closes a
narrower hole while the anchor itself is open.

**Fix:** Anchor Invariant C on the step Invariant A already identified, so one step has one identity,
and make the empty-prefix case explicit rather than incidentally true:

```js
// The SAME step object Invariant A pinned by exact name — never "the first step whose run text
// mentions the path". A decoy `run: echo <path>` earlier in the list otherwise becomes the anchor and
// `every([])` reports the allow-list holding over nothing.
const iE2eStepRefuse = e2eMailStep === undefined ? -1 : e2eSteps.indexOf(e2eMailStep);
```

and add `e2ePrecede.length > 0` to the conjunct list (checkout, setup-node and `npm ci` must in fact
precede it — an empty prefix means the anchor moved, not that the job is clean). Add two cases to
`workflow-invariants.test.ts`: a decoy `run:` step inserted first, and a decoy plus a `uses:` step
inserted before the real refusal, both asserting a `FAIL` line naming Invariant C.

---

### CR-03: Nothing constrains `gate-db-free` — the job that actually executes the checker and the design suite

**File:** `.github/workflows/ci.yml:678-680` (job), `:865-866` (the checker step),
`scripts/verify-workflows.mjs:41-44` (the claim), `:814-830` and `:859-865` (both scoped to
`CI_E2E_JOB` only)

**Issue:** `verify-workflows.mjs`'s own header states as settled fact:

> `2. NOTHING RAN IT. … ci.yml`'s `gate-db-free` now runs this script on every push and pull request,
> so an added `push:` trigger on `baselines.yml` fails `ci` instead of waiting to be noticed."

No invariant enforces any part of that sentence. Three reproduced defeats, each leaving
`All 50 invariants hold…` and `CHECKER-EXIT=0`:

1. **Delete the checker step.** Removing the two tracked lines
   `- name: Verify the workflow invariants (parse, not grep)` / `run: node scripts/verify-workflows.mjs`
   from `gate-db-free` → 50 green, 0 `FAIL` lines. The checker never runs in CI again, and nothing
   anywhere would say so: `grep -rn "verify-workflows" tests/ package.json` finds no assertion over
   `ci.yml`'s invocation of it, and `workflow-invariants.test.ts` case 1 (the control) passes over a
   copy that no longer contains the step.
2. **`continue-on-error: true` on `gate-db-free`.** One line → 50 green. That job runs `npm run build`
   = `lint && test:design && next build`, so the same line simultaneously makes non-blocking: the
   workflow checker, `tests/design/mail-credential-refusal.test.ts` (D-14's runtime half), the new
   `tests/design/workflow-invariants.test.ts` (D-14's checker half), ESLint and `next build`. The
   entire verification apparatus this phase has spent four rounds building turns into a report.
3. **A job-level `defaults: { run: { shell: cat {0} } }` on `gate-db-free`.** The new execution-defaults
   invariant is `doc?.defaults === undefined && e2e?.defaults === undefined` (`:862`) — workflow level
   and `gate-e2e` only — so the same override that is red on `gate-e2e` is green on the job that runs
   the checker, with the same effect (`npm run build` and the checker printed, not executed).

The scoping rationale at `ci.yml:328-331` and `verify-workflows.mjs:855-858` — *"a `defaults:` block
on an unrelated job cannot change how `gate-e2e` executes"* — is true and irrelevant here:
`gate-db-free` is not an unrelated job, it is the job that decides whether any of this is enforced.
Likewise the doctrine at `:795-798` (*"A gate step that cannot fail the job is not a gate; it is a
report"*) is applied to `gate-e2e` and to no other job in the file, including the one whose whole
purpose is to run gates.

**Fix:** Give the checker-executing job the same treatment `gate-e2e` already has — its own hard stop,
its own invocation pin, and the unconditional/defaults predicates extended to it:

```js
const CI_CHECKER_JOB = "gate-db-free";
const CHECKER_SCRIPT = "scripts/verify-workflows.mjs";
const CHECKER_RUN = `node ${CHECKER_SCRIPT}`;
const checker = doc?.jobs?.[CI_CHECKER_JOB];
if (!checker) hardStop([`job "${CI_CHECKER_JOB}" not found in ${CI}.`, …]);

// A checker nothing invokes is the hole this script's own header records as its reason to exist.
const checkerStep = stepsOf(checker).find((s) => String(s?.run ?? "").trim() === CHECKER_RUN);
check(
  `"${CI_CHECKER_JOB}" runs this checker, unconditionally, with the exact no-argument invocation`,
  checkerStep !== undefined &&
    checker?.if === undefined &&
    checker?.["continue-on-error"] === undefined &&
    checker?.defaults === undefined &&
    stepsOf(checker).every((s) => s?.if === undefined && s?.["continue-on-error"] === undefined),
  `step=${checkerStep ? "present" : "(ABSENT)"}  job if=${JSON.stringify(checker?.if ?? null)}  ` +
    `job continue-on-error=${JSON.stringify(checker?.["continue-on-error"] ?? null)}  ` +
    `job defaults=${JSON.stringify(checker?.defaults ?? null)}`,
);
```

Do the same for the step that runs `npm run build` (which is what carries `test:design`), and add
matching cases to `workflow-invariants.test.ts`. Note this moves the `ci` count 31 → 32 (or → 33), so
`ci.yml:352-366` and `workflow-invariants.test.ts:100` must move in the same commit.

## Warnings

### WR-01: The exact-invocation conjunct — round 2's whole fix — has no case in the standing test

**File:** `tests/design/workflow-invariants.test.ts` (case list), `scripts/verify-workflows.mjs:938`

**Issue:** The prior review's WR-02 named its minimum case list explicitly: *"appended argument on the
refusal `run:`; `continue-on-error` on the refusal step; `continue-on-error` on the job; a `shell:`
key on the refusal step; an expression-valued `continue-on-error`."* Four of the five shipped as cases
2/4/5/6/7. The first — the one that closes round 2's CR-01 — did not.

**Measured:** reverting `:938` from `e2eMailRun.trim() === MAIL_REFUSAL_RUN` back to
`e2eMailRun.includes(MAIL_REFUSAL_RUN)` — the exact regression WR-02 was raised to prevent — leaves the
new suite at **12 passed / 12**. The allow-list cannot cover it, because `run` is a *permitted* key and
only its value changed. So the file whose thesis is "the checker half had zero regression coverage"
ships with zero coverage of the one predicate the previous round's Critical rests on.

Not Critical because the defence is genuinely layered: `refuse-mail-credential.mjs:67-84` refuses any
argument itself, and `mail-credential-refusal.test.ts` cases 7 and 8 do have standing coverage of that
half. The checker half does not.

**Fix:** Add a case using the existing harness — no new machinery is needed:

```ts
/** Round 2's CR-01. `run` is a PERMITTED key, so the allow-list is blind here by construction:
 *  only the exact-equality conjunct can see an appended argument. */
it("case 13 (regression, 19-13): an argument appended to the refusal run: is red", () => {
  withMutatedWorkflows(
    (ci) => ci.replace("run: node scripts/refuse-mail-credential.mjs", "run: node scripts/refuse-mail-credential.mjs /tmp/decoy.mjs"),
    (result) => expectRed(result, MAIL_REFUSAL),
  );
});
```

---

### WR-02: `triggersOf` mis-reads the documented sequence form, so both trigger invariants go red against a correct file

**File:** `scripts/verify-workflows.mjs:217-218`, used at `:320-325` and `:487-494`

**Issue:**

```js
const triggersOf = (doc) =>
  doc?.on == null ? [] : typeof doc.on === "string" ? [doc.on] : Object.keys(doc.on);
```

The scalar form (`on: push`) and the mapping form are handled; the **sequence** form is not.
`on: [push, pull_request]` is a documented GitHub Actions spelling, and `Object.keys` on an array
returns its indices. Measured with the same parser the checker loads:

```
parse('on: [push, pull_request]')            → {"on":["push","pull_request"]}
Object.keys(parse('on: [push, pull_request]').on) → ["0","1"]
```

So a correct `ci.yml` rewritten to the sequence form fails the brand-new trigger invariant, and a
correct `baselines.yml` rewritten to `on: [workflow_dispatch]` fails the exact-set invariant at
`:320-325` — the one guarding the most dangerous file in the repository. The checker's own doctrine
(`:479-482`) is that *"an exact set here would redden a correct file the day somebody adds a manual
dispatch, which is how a correct check gets deleted rather than fixed."* This is that failure mode,
introduced by the helper rather than by the predicate shape.

**Fix:**

```js
const triggersOf = (doc) =>
  doc?.on == null
    ? []
    : typeof doc.on === "string"
      ? [doc.on]
      : Array.isArray(doc.on)
        ? doc.on.map(String)      // `on: [push, pull_request]` — a documented spelling; Object.keys
        : Object.keys(doc.on);    //   over an array yields indices, reddening a CORRECT file.
```

(The CR-01 fix must then read the filter through a form-aware accessor: an array entry carries no
filter, which is the safe reading.)

---

### WR-03: Three of the four line citations in the new test file's load-bearing rationale point at unrelated code

**File:** `tests/design/workflow-invariants.test.ts:41-43`

**Issue:** The paragraph that justifies this round's single most consequential design decision — no
`--workflow-dir=` flag, `cwd` only — grounds itself on four citations:

> "`WORKFLOW_DIR`, `package.json` and the refusal script's path are ALREADY cwd-relative in the
> shipped checker (`scripts/verify-workflows.mjs:82-84`, `:188-197`, `:242`, `:826-832`)"

Checked line by line against the shipped file:

| cited | what is actually there | the real site |
|---|---|---|
| `:82-84` | `WORKFLOW_DIR` / `BASELINES` / `CI` — correct | — |
| `:188-197` | the `yaml`-could-not-load FATAL diagnostic | `package.json` is read at `:257` |
| `:242` | the `services.*.env` loop inside `secretHitsIn` | — |
| `:826-832` | the unconditional check's evidence line and the start of block 2b | the refusal script is read at `:958-959` |

The underlying claim is true — I verified all three reads are cwd-relative, and that `import.meta.url`
is used only for the `yaml` import and Invariant B's `selfSource`. But a reader who follows the
citations to check the claim lands on the parser diagnostic and a secrets scan, which is the "citation
that outlives what it describes" anti-pattern `19-VERIFICATION.md` already carries as a standing
warning (~11 stale `<file>:<line>` citations), now reproduced in a file created this round.

**Fix:** Cite `:82-84` (`WORKFLOW_DIR`), `:257` (`package.json`), `:128` + `:958-959`
(`MAIL_REFUSAL_SCRIPT`), and say plainly that `import.meta.url` is used at `:957` and `:185` and is
therefore *not* redirected by `cwd` — which is the fact the next reader actually needs (see IN-01).

## Info

### IN-01: One third of Invariant B is unreachable through the `cwd`-only harness, and the header does not say so

**File:** `tests/design/workflow-invariants.test.ts:39-52`, `scripts/verify-workflows.mjs:957`

**Issue:** Invariant B's `declMatches` conjunct reads `fileURLToPath(import.meta.url)` — the **shipped**
checker — while `sharesPattern` and `holdsNoCopy` read the cwd-relative copy. The harness copies the
refusal script but not the checker, so no mutation it can express reaches `declMatches`. That is a
correct consequence of the no-flag decision, not a bug, but the header's "ONLY `cwd` differs" framing
reads as though the whole checker were pointed at the temp tree.

**Fix:** One sentence in the header naming the boundary: mutations reach `WORKFLOW_DIR`,
`package.json` and the refusal script; they cannot reach the checker's own source, so Invariant B's
declaration conjunct has no case and is out of this instrument's reach by construction.

---

### IN-02: `withJobKey` silently falls back to a hard-coded `"gate-e2e"`, against the file's own stated rule

**File:** `tests/design/workflow-invariants.test.ts:200-202`

**Issue:** `MAIL_STEP_NAME` (`:107-118`) throws when its declaration cannot be read, with the argument
that guessing "would make every red case below a green that means nothing." Ninety lines later:

```ts
const match = jobKeyDecl.exec(readFileSync(CHECKER, "utf8").replace(/\r\n/g, "\n"));
const jobKey = match?.[1] ?? "gate-e2e";
```

That is the second spelling the file's own comment at `:103-106` forbids. It fails closed in practice
(a drifted key means the anchor is absent, the mutation is a no-op, and the differs-from-input
assertion fires), so the consequence is contained — but the two helpers state opposite rules five
screens apart.

**Fix:** Throw, with the same message shape as `MAIL_STEP_NAME`.

---

### IN-03: Cases 4, 5, 6 and 8 do not isolate the predicate they name

**File:** `tests/design/workflow-invariants.test.ts:332-373`

**Issue:** `continue-on-error` and `if` are both outside `MAIL_STEP_ALLOWED_KEYS`, so inserting either
on the refusal step trips Invariant A as well as the unconditional invariant. The named-`FAIL`-line
assertion keeps the cases honest about *which* predicate they measure (this is the failure mode 19-14
recorded), but none of them can distinguish "the unconditional predicate caught it" from "the
unconditional predicate caught it *and* the allow-list would have anyway." Case 7 (job level) is the
only unconditional case the allow-list cannot reach.

**Fix:** Cheap, if it is worth having: add one case placing `continue-on-error: ${{ true }}` on a step
the allow-list does not govern (e.g. the seed step), which isolates the quantifier — 19-13 proved
exactly that by hand and left no instrument behind.

---

### IN-04: The mail env-key scan still walks neither `container.env` nor `services.*.env` keys

**File:** `scripts/verify-workflows.mjs:578-597`, self-documented at `:575-577`

**Issue:** Carried forward from the prior round, honestly labelled in the code, and genuinely
mitigated for these two files by the `cross` section's raw-text token scan (`:1216-1226`), which sees
comments and every nesting level. Recorded so the mitigation stays visible: it is the raw scan and not
the parse scan that closes `container.env`, and the raw scan is case-sensitive
(`raw.split(MAIL_KEY_PREFIX)`), matching prior IN-04's observation about the runtime half. Neither
gap is exploitable on the deployed platform, where `src/lib/email.ts` reads only the upper-case name.

---

### IN-05: `REQUIREMENTS.md` flipped CI-01 to `Complete` this round, and CR-01 falsifies the standard that flip was made against

**File:** `.planning/REQUIREMENTS.md:248`, `:315` (outside the reviewed file set; recorded because it
is a claim about the reviewed files)

**Issue:** 19-15-SUMMARY records marking CI-01 complete after finding the plan's premise stale.
`19-VERIFICATION.md` withheld that status for three rounds on one stated ground: SC4's literal text
must be *regression-protected by the invariant suite*, not merely true of today's file. CR-01 shows it
is not — a `branches:` filter falsifies the requirement with the checker fully green.

**Fix:** Revert the row to its prior state until CR-01 is closed, or record the residual explicitly.

---

## Working-tree note

Six `.github/workflows/ci.yml` mutations and two `scripts/verify-workflows.mjs` mutations were applied
during this review to reproduce CR-01, CR-02, CR-03 and WR-01, each restored from a byte-copy taken
beforehand. `md5sum .github/workflows/ci.yml` is back to `b655c2d87b03dd324d867218c6484f3f`,
`git diff --stat` is empty, and `git status --porcelain` shows only the three pre-existing untracked
`.planning/` entries. `node scripts/verify-workflows.mjs` reports
`All 50 invariants hold across 3 section(s) (baselines=11, ci=31, cross=8).` and
`npx vitest run --config vitest.design.config.ts tests/design/workflow-invariants.test.ts
tests/design/mail-credential-refusal.test.ts` reports 2 files / 20 passed against the restored tree.

## What I tried and could not defeat

Recorded so the next round does not re-spend the effort:

- **Every attribute on the refusal step.** The allow-list is genuinely closed; `working-directory`,
  `shell`, `timeout-minutes`, `env`, `uses`, `id` and `with` are all red, and so is any key not yet
  invented. Renaming or deleting the step is red via the presence conjunct.
- **The refusal script itself.** No branch reaches `exit 0` with a prefixed variable present.
  A decoy `const MAIL_KEY_PREFIX = …` inserted *above* the real one in `verify-workflows.mjs` reddens
  Invariant B's `declMatches` (both sites take the first match); inserted below, it is inert. Gutting
  the script body reddens `mail-credential-refusal.test.ts` case 1 — provided `gate-db-free` still
  blocks, which is CR-03.
- **Mapping a credential into `gate-e2e`.** Any spelling of the provider token anywhere in
  `.github/workflows/` (values *or* comments, any nesting level including `container.env` and
  `services.*.env`) is red via the `cross` raw-text scan; any `secrets.` interpolation under a
  non-provider key is red via `secretHitsIn`, which does walk `container.env` and `services.*.env`
  values.
- **A duplicate refusal step.** Placed before the real one it is caught by the allow-list; placed
  after, the real one still executes.
- **`runs-on`, `timeout-minutes` and `container.options` on `gate-e2e`.** Unconstrained, but I could
  not turn any of them into a *silent green*: a bad `runs-on` leaves the run queued and eventually
  failed rather than passing, and Actions does not use the image entrypoint for container jobs.

---

_Reviewed: 2026-09-05T02:05:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
