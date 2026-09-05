# Pre-flight: making FitOut public

**For:** the PM · **Prepared by:** plan 19.1-14, 2026-09-05 · **Repository state at authoring:** `PRIVATE`

This is the one document you need in order to take the flip decision. Four sections:
(a) why publishing `.planning/` as is is correct, (b) where every success criterion actually stands,
(c) what the secret scan found, (d) the command and how to confirm it worked.

---

## ⚠ READ THIS BEFORE THE FOUR SECTIONS — SC4 IS OPEN

**The `ci` run is red.** Run `33976831607` (2026-09-05T16:06Z) has overall conclusion `failure`:
two of its five jobs are red. Plan 19.1-13 measured this, declined to soften the criterion, and
handed the fact forward. It is repeated at the top here because **this plan's own task text was
written assuming the opposite**, and you should not have to notice that yourself.

Specifically, `19.1-14-PLAN.md`'s Task 3 `<context>` block tells you:

> *"the workflow run is green in all five jobs"* and *"Everything the phase owed is done"*

**Both sentences are false as of this run.** The delta:

| the plan's text assumes | what run 33976831607 measured |
|---|---|
| green in all five jobs | green in **three**; `gate-e2e` and `gate-visual` are `failure` |
| everything the phase owed is done | SC4 is **OPEN**; the phase must grow by three plans (D-02: 19.1-16, -17, -18) |

**This does not invalidate the pre-flight.** A pre-flight run against a partly-red CI is still a
valid pre-flight: the scan, the vector closure and the payload are all independent of whether the
suite is green. **It does change what publishing buys you.** D-08's stated reason for sequencing the
flip last was *"the first thing anyone sees is a green badge rather than a red one."* **Today the
first thing anyone sees is a red badge.** That is a real cost of publishing now, it is the one
argument D-08 made for this ordering, and the decision is yours with the fact in front of you rather
than behind it.

---

## (a) Why publishing `.planning/` as is is correct

D-07 publishes the planning directory **as is** — no redaction pass over `19-REVIEW.md` or
`19-VERIFICATION.md`. That is only correct if the vectors those documents describe are **closed**,
because a closed vector is a *defeated attack*, which is ordinary security writing, whereas an open
one published alongside the code it applies to is a recipe. This plan verifies the closure rather
than assuming it.

The ROADMAP states the constraint this section discharges, verbatim:

> **⚠ The disclosure sequencing in SC5 is load-bearing, not bureaucratic.** `19-REVIEW.md` and
> `19-VERIFICATION.md` are committed and contain exact payloads for three live vectors. Publishing
> before 1–3 land ships an attack recipe alongside the code it applies to.

**The three live vectors, each closed:**

| vector | what the published payload does | the invariant that now catches it | standing case(s) | evidence showing it RED |
|---|---|---|---|---|
| **CR-03** | softens or deletes `gate-db-free` — the job that runs the checker, lint, the design suite and the build — with `continue-on-error:`, `if:`, a job-level `defaults:`, or by deleting/arguing away its steps | `"gate-db-free" is unconditional — no if:, no continue-on-error: AT ALL, on the JOB or on ANY STEP` · `"gate-db-free" runs its steps with the runner's DEFAULT interpreter — NO defaults: block on the job` · `"gate-db-free" carries the step that runs lint, the design suite and the build, under its exact name, with the EXACT no-argument invocation, and NO KEY OUTSIDE [env, name, run]` | 18, 19, 20, 21, 22, 23, 24 | `evidence/guards-05-post-fix.txt` §"CR-03's VECTORS → THE INVARIANT THAT NOW CATCHES EACH" (pre-fix twin: `guards-05-pre-fix.txt`, where MUTATIONS 2, 3, 5 and 6 each left **exit 0 with all invariants reported holding**) |
| **CR-02** | plants a decoy `run:` body that captures Invariant C's ordering anchor, so the real mail-credential refusal can be moved after the suite it is supposed to precede | `"gate-e2e" refuses a live mail credential BEFORE it migrates, seeds or boots the suite` — re-anchored on the object already selected by exact `name:`, plus a non-empty-preceding-set conjunct that kills the vacuous `[].every(…)` form | 29, 31, 34 | `evidence/guards-06-post-fix.txt` §"CLOSING MAP" |
| **CR-01** | neuters the trigger presence check without deleting a key — `pull_request: branches: [does-not-exist]`, a `paths-ignore:` matching everything, or the default branch dropped from the push list | `ci.yml runs on BOTH push and pull_request … with pull_request UNFILTERED, and push reaching both "dev" and "main"` | 25, 26, 27 | `evidence/guards-06-post-fix.txt` §"CLOSING MAP" (pre-fix: `guards-06-pre-fix.txt` — all three edits exit 0 with all 55 holding) |

**The two review findings beside them, also closed:**

| finding | what it was | closure | standing case | evidence |
|---|---|---|---|---|
| **WR-01** | round 2's own load-bearing fix (`e2eMailRun.trim() === MAIL_REFUSAL_RUN`) had **no case** in the standing test, so loosening it back to `.includes(…)` left the suite 16/16 green — this is SC3 | the loosening now turns `tests/design/workflow-invariants.test.ts` red, naming case 17 | 17 | `evidence/guards-05-post-fix.txt` §"WR-01 / SC3 — THE INSTRUMENT NOW HAS THE MEMORY IT DID NOT HAVE" |
| **WR-02** | the reverse defect: the documented sequence spelling `on: [push, pull_request]` — a **correct** file — made the checker go red, because `Object.keys` over an array returned indices | `triggersOf` now returns names for all three spellings; the correct file stays green at the pinned total | 28 (a GREEN control) | `evidence/guards-06-post-fix.txt` §"CLOSING MAP" |

**And the checker-step half of SC1, watched red three ways and green once:**
`evidence/guards-01-post-fix.txt` — deleting `gate-db-free`'s checker step (MUTATION 1), renaming its
display name (MUTATION 2) and appending an argument to the checker invocation (MUTATION 3) each turn
the checker RED; MUTATION 4 is the **anchor control**, in which a decoy `run:` body mentioning the
checker's own path, placed first in the job, stays GREEN — proving the anchor selects by exact
`name:` and that the CR-02 defect class was closed rather than moved.

**Two findings are CARRIED, not closed, and neither is a disclosure vector.** A carry is a decision
with a written verdict; a silent omission is not. Both are recorded in
`evidence/sc2-audit-inventory.md` (rows 7 and 10) with what is open, why it was not closed, and what
mitigates it today:

- **Row 7 / D-19.1-C** — `buildJobs` locates the build job by a `run:` substring, which is literally
  the CR-02 idiom. **Its dangerous direction is inverted:** over-matching adds a phantom job and
  fails *closed*; a containment test cannot under-match. The claim "`gate-db-free` runs the build" is
  now owned by a separate name-anchored invariant with exact-equality invocation (cases 23, 24), and
  the site carries a rationale block saying this predicate is **not** coverage of the build step.
- **Row 10 / IN-04** — the mail environment-key scan walks workflow/job/step `env` but not
  `container.env` or `services.*.env`. **Mitigated by a strictly broader control:** the `cross`
  section's raw-text scan asserts the provider token appears **zero times anywhere** under
  `.github/workflows/`, over raw bytes, so it sees `container.env`, `services.*.env` and comments
  alike. What is incomplete is the *diagnosable location*, not the detection.

**Three further review findings remain OPEN and are named rather than dropped** — `IN-01` (one third
of Invariant B is unreachable through the `cwd`-only harness), `IN-03` (cases 4, 5, 6 and 8 do not
isolate the predicate they name), `IN-05` (`REQUIREMENTS.md` flipped `CI-01` to `Complete` against a
then-live falsifier; CR-01's closure removes the falsifier, but the flip was made without evidence
and is the verifier's call). **None of the three is an attack payload.** They are harness-coverage
and bookkeeping defects: publishing them exposes no method for defeating this project's CI that the
published invariants do not already defeat. `WR-03` — three of four line citations in a rationale
block pointing at unrelated code — is a documentation-accuracy finding and likewise discloses nothing
exploitable.

**Why not redact, and why not a private mirror.** Redaction is theatre: the original payload text
stays in git history across the whole commit range unless the history is rewritten, so redacting the
working tree buys the *appearance* of caution at the cost of damaging the record — and the record is
most of what makes this repository worth reading. Moving `.planning/` to a private mirror was
rejected because it breaks every in-repository link into the planning trail. Both were considered and
both were rejected in D-07 before this plan ran; this section is the evidence that the condition
D-07 depends on actually holds.

---

## (b) Where every success criterion actually stands

| # | criterion | verdict | the artefact that proves it |
|---|---|---|---|
| **SC1** | `gate-db-free` is itself constrained — deleting its checker step, or softening it with `continue-on-error:`, `if:` or a job-level `defaults:`, turns the checker RED | **MET** | `evidence/guards-01-post-fix.txt` (checker step: delete / rename / argue, plus the green anchor control) and `evidence/guards-05-post-fix.txt` (job-level softening, defaults block, build step). Cases 16–24. |
| **SC2** | every predicate audited for the axis-vs-property error; presence checks deny their neutering modifiers; every step anchor uses exact `name:` | **MET, with 2 carried** | `evidence/sc2-audit-inventory.md` — 24 rows: **8 REPAIRED, 14 CORRECT AS IS, 2 CARRIED** (rows 7 and 10, each with a written verdict and a stated mitigation). Watched-red pairs in `evidence/guards-06-{pre,post}-fix.txt`. Cases 25–36. |
| **SC3** | the standing test covers the predicates it was built for — reverting round 2's own fix turns it RED | **MET** | `evidence/guards-05-post-fix.txt` §WR-01: the loosening takes the standing suite from 16/16 green to `1 failed / 23 passed`, naming case 17. |
| **SC4** | the `ci` workflow run is **not red on every push** | **OPEN** | `evidence/suite-remeasurement.txt`. See the closure line quoted below. |
| **SC5** | the repository is **public** and the agreed status checks are **required** on the default branch | **NOT YET — this is the decision in front of you** | the public half is section (d) of this document; the required-checks half is `evidence/ruleset-main.json`, installed by plan 19.1-15 **after** the flip. |

**The SC4 closure line, quoted verbatim from `evidence/suite-remeasurement.txt`:**

> SC4 OPEN — run 33976831607 is red. Four `gate-e2e` failures and four `gate-visual` baselines remain,
> every one of them with a verdict above and a named owning plan below. The criterion is NOT softened:
> "not red on every push" is a property of the RUN, the run is red, and no reading of the sentence makes
> three-of-five green sufficient.

**Run identifier behind that line: `33976831607`.** Its overall conclusion — checked as the run's
conclusion, not as the conclusion of one job — is `failure`.

**What eleven plans did buy, all measured:** failures 14 → 3 in the measuring run (4 in the final one,
and the +1 is a flake this phase converted into an honest deterministic failure); merge wait
50m 29s → **26m 16s, a 47% fall**; retry executions 134 → 94. `gate-visual`'s standing failures went
12 → 4, and one regenerated row is byte-correct but the *page* will not hold still long enough to be
photographed (`D-19.1-E`). Plan 13 proposes three follow-up plans under D-02; **19.1-16 owns both
still-red originals** (`host-headings`, `overflow-320`).

---

## (c) The scan

The full record is `evidence/secret-scan-pre-public.txt`. Its verdict line, quoted:

> SCAN commits=2244 (all refs; gitleaks read 2217 of them and the 27 it did not are shown above to
> carry no added text) pass1=10 findings/0 credentials pass2=18 hits/0 credentials (patterns 1-3, the
> real key shapes, all ZERO) pass3=1 env file ever added (.env.example, all secret slots empty)
> control=DETECTS (and misses 2 of 3 canaries, which is why pass 2 exists) VERDICT=CLEAN — the flip is
> NOT blocked by this scan

- **Commits: 2244** across every ref, which is this repository's actual history length
  (`git log --all --oneline | wc -l` and `git rev-list --all --count` agree). gitleaks read 2217; the
  27 it did not read are accounted for by four measured classes that contribute no added text
  (3 merges, 5 empty, 15 binary/rename/mode-only, 5 deletion-only), and the accounting runs one commit
  in the *conservative* direction.
- **Tool:** gitleaks **v8.30.1**, `ghcr.io/gitleaks/gitleaks:latest`, subcommand `git` (not the
  deprecated `detect`), `--log-opts="--all"` so it walks **every ref** rather than the current branch.
  The mount was confirmed against a separate image **before** any result was read.
- **The detector exited 1 with ten findings, and all ten are non-credentials** — a vendor
  documentation sample quoted verbatim from `docs.didit.me`, an idempotency key that names itself as
  a probe, and a `curl` line whose credential is `$PAYMONGO_SECRET_KEY`, a variable reference with no
  value. Each is listed by file and line in the evidence file.
- **The three patterns that would name a real credential read ZERO** across every ref: the payment
  provider's test and live secret-key prefixes, and the transactional-mail key prefix.
- **The instrument was watched detecting**, on a throwaway repository, finding a secret that existed
  only in history after being deleted from the working tree — **and it missed two of three canaries**,
  including this project's mail-key prefix, which is precisely why the project-specific second pass is
  not optional.

**⚠ A hit anywhere blocks the flip.** There was none. Had there been one, the correct response is
**not** to rewrite history quietly: rotation must happen before or alongside any rewrite, because
scrubbing a live credential out of history does not un-leak it, and history rewriting on a shared
branch is your call, not the executor's.

---

## (d) The flip

**The executor has not run this and will not.** D-08 places the act with you: publishing is
irreversible and outward-facing, and pre-authorising the executor to run it was the option that was
explicitly rejected.

### The command

```bash
gh repo edit pengr3/FitOut --visibility public --accept-visibility-change-consequences
```

`--accept-visibility-change-consequences` is **required** whenever `--visibility` is used; `gh` refuses
the command without it.

### The read-back, immediately afterwards

```bash
gh repo view --json visibility --jq .visibility
# expect: PUBLIC

gh api repos/pengr3/FitOut/rulesets
# expect: []  (an empty list — no longer the 403 "Upgrade to GitHub Pro or make this
#              repository public to enable this feature")
```

**⚠ The API path is written WITHOUT a leading slash, and that is load-bearing on this shell.**
`gh api /repos/...` fails with
`invalid API endpoint: "C:/Program Files/Git/repos/pengr3/FitOut/..." — Your shell might be rewriting
URL paths as filesystem paths.` Omit the leading slash, or set `MSYS_NO_PATHCONV=1`.

### What happens next, and what does not

**The ruleset is applied AFTER the flip, by plan 19.1-15 — not by this plan and not by you.** The
settings API returns `403 "Upgrade to GitHub Pro or make this repository public to enable this
feature"` while the repository is private, re-probed and still standing on 2026-09-05. That 403 is
the single hard sequencing constraint in the phase.

The payload plan 15 will submit is already checked in at `evidence/ruleset-main.json`, authored here
so it is reviewable as configuration rather than as a sequence of clicks. It will be applied with:

```bash
gh api repos/pengr3/FitOut/rulesets -X POST --input .planning/phases/19.1-.../evidence/ruleset-main.json
```

### The five context strings, each with its CURRENT measured status

GitHub matches a required status check on the job's **display name**, never on the YAML key. All five
strings below were copied out of `.github/workflows/ci.yml`; the four in the payload were copied
programmatically rather than typed. **Status is measured from run `33976831607`.**

| # | context string (verbatim) | in the payload? | status in run 33976831607 |
|---|---|---|---|
| 1 | `gate-db-free (lint + design + build + workflow parse)` | **yes — required** | ✅ `success` |
| 2 | `gate-db (vitest against PostGIS 18)` | **yes — required** | ✅ `success` |
| 3 | `gate-price-parity (DB-vs-DOM price, 1 spec)` | **yes — required** | ✅ `success` |
| 4 | `gate-e2e (functional Playwright suite)` | **yes — required** | ❌ **`failure`** |
| 5 | `gate-visual (GATE-01 visual regression)` | **no — reports only** | ❌ **`failure`** |

**A context string that names a red job is still the correct string.** The name and the status are
separate facts, and both are needed. What follows from the table:

- **Of the four checks the payload makes required, one — `gate-e2e` — is red today.** Installing the
  ruleset in this state would block every merge into `main` until 19.1-16/-17/-18 land. That is
  19.1-15's decision to take with this number in front of it, and this plan draws no conclusion about
  it beyond making the fact impossible to miss.
- **`gate-visual` is deliberately absent from the payload (D-05)**, which is why its red does not
  gate anything. A pixel comparison must not be able to wedge a merge over antialiasing or a
  legitimate one-pixel design change. Four of its baselines are red *by design* pending `D-19.1-D`'s
  product question about whether the availability calendar's today-ring should follow venue-local
  today rather than the rendering host's clock.

### Two payload decisions, recorded

**"Require branches to be up to date before merging" is DISABLED**
(`strict_required_status_checks_policy: false`). *Reasoning, recorded here because JSON carries no
comment and an unknown top-level field risks a 422 on the POST:* with a single-developer repository
there is no collaborator to race, so the policy buys almost nothing — and it costs a full suite re-run
(**26m 16s** today) every time `main` moves between a green check and the merge click. D-13 defers
sharding, so this is the one lever available for keeping the merge wait bounded.

**Scope is the default branch only** (`~DEFAULT_BRANCH`, the symbolic reference rather than the
literal `main`, so it survives a future rename). Per D-06, `dev` stays unprotected: GSD keeps
committing directly to it, `ci` still runs on every `dev` push so the result stays visible, and only
the merge into `main` has to pass. Protecting `dev` would force a pull request and a full suite wait
on every commit and roughly halve execution pace. `bypass_actors` is empty and the optional
integration identifier is omitted.

**One mechanic is unresolved and is deliberately not planned around:** whether a
`required_status_checks` ruleset also blocks a *direct push* to `main`, as opposed to only a PR merge.
The documentation states this for the *required workflows* rule and addresses merges only for required
status checks. Plan 15 settles it after the flip with the read-only probe `gh ruleset check main` and
records the answer.

---

## The three things to confirm before you run it

1. **You have read section (a)** and accept that the three live vectors are closed, that two findings
   are carried with written verdicts, and that the three that remain open are harness-coverage and
   bookkeeping defects rather than attack payloads.
2. **The `SCAN` line in `evidence/secret-scan-pre-public.txt` reads `VERDICT=CLEAN`**, and the commit
   count it records (**2244**) matches this repository's history length. It does.
3. **You accept that the badge is red today.** SC4 is OPEN, `gate-e2e` and `gate-visual` are failing,
   and D-08's stated reason for sequencing the flip last — a green badge on arrival — is not
   available in this state.

---
