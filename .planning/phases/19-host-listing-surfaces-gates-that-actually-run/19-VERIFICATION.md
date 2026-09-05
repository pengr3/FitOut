---
phase: 19-host-listing-surfaces-gates-that-actually-run
verified: 2026-09-05T09:30:00Z
status: gaps_found
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 7/9
  gaps_closed:
    - "Round-3 gap 1 (shell-key override) — Invariant A now carries a positive allow-list (`MAIL_STEP_ALLOWED_KEYS = [\"name\", \"run\"]`) ANDed with the step-presence conjunct. Independently reproduced: a `shell: cat {0}` style override, or any key outside the allow-list including one the checker's source never names (`working-directory`, verified `grep -c` = 0 in both files), now FAILs Invariant A."
    - "Round-3 gap 1 (expression-valued `continue-on-error`) — both comparisons (step-level and job-level) are now presence tests (`!== undefined` / `=== undefined`), matching the already-correct `if:` conjunct beside them. Independently reproduced: `continue-on-error: ${{ true }}`, a quoted string, and the literal boolean are all now caught, at both step and job level; the filtered-source gate confirms zero `=== true`/`!== true` comparisons remain."
    - "Round-3 gap 2 (untested `pull_request:` trigger deletion) — a new `ci` check now asserts `triggersOf(doc)` includes both `push` and `pull_request`. Independently reproduced: deleting the `pull_request:` key now FAILs with a named line, where before it left all 48 invariants green."
    - "The outer half of the custom-shell finding (`defaults:` block at workflow level or on `gate-e2e`, which the step-key allow-list cannot see) — a new check requires `undefined` at both levels. Confirmed present and enforced by direct read of the current checker output."
    - "Round-2's CR-01 (argument injection on the refusal step) remains genuinely closed in the RUNTIME code, independently reconfirmed this session on the CURRENT committed file (not merely by reading 19-14/19-15's SUMMARY prose): appending `/tmp/decoy.mjs` to `ci.yml`'s real refusal step `run:` still FAILs Invariant A on today's tree, exit 1. This closure is intact — see the new gaps below for why the STANDING TEST's coverage of that same closure is a separate, still-open finding (WR-01)."
  gaps_remaining: []
  new_gaps:
    - "A fourth round of the identical defect class was found and independently reproduced this session, confirmed by reading .planning/phases/19-host-listing-surfaces-gates-that-actually-run/19-REVIEW.md (committed c2ff08c) and then reproducing every material claim from scratch rather than trusting it: (1) CR-01 — the new trigger check tests key MEMBERSHIP, so a `branches:`/`paths-ignore:` FILTER under `pull_request:` (which leaves the key in place) detaches every gate in the file from real pull requests with the checker fully green; independently reproduced. (2) CR-02 — Invariant C identifies the refusal step by a substring match on `run:` text (`findIndex(...includes(MAIL_REFUSAL_SCRIPT))`) while Invariant A identifies the SAME step by exact `name:`. A decoy `run: echo node scripts/refuse-mail-credential.mjs` step inserted first in `gate-e2e` becomes Invariant C's anchor, so `precedes=[(none)]` and `holds=true` are printed while `actions/github-script@v7` (arbitrary JS) sits at step index 1 and the real refusal sits at index 5 — independently reproduced, byte-identical evidence to the review's. (3) CR-03 — nothing constrains `gate-db-free`, the job that actually EXECUTES the checker, `test:design` (both design-test files, including this round's own new instrument) and `next build`. Deleting its two-line checker step, independently reproduced, leaves 50 green with the checker never running again in CI. A `continue-on-error: true` on that job, or a `defaults:` block on it (the execution-defaults check is scoped only to the workflow level and to `gate-e2e`), have the identical silent-neutering effect and were not independently re-tested beyond direct-read confirmation of the scoping gap, per the review's own untried-but-argued reasoning. (4) WR-01 — reverting `scripts/verify-workflows.mjs:938`'s `e2eMailRun.trim() === MAIL_REFUSAL_RUN` back to `.includes(MAIL_REFUSAL_RUN)` (round 2's own CR-01 fix, the load-bearing regression the whole plan-19-13-through-19-15 lineage rests on) leaves the brand-new 12-case standing test at 12/12 GREEN — independently reproduced. The runtime protection is still present and still enforced against the actual committed `ci.yml` (independently reconfirmed — an appended argument still FAILs today), but the standing test suite whose entire thesis is 'the checker half now has a memory' has zero coverage of the one predicate the prior round's Critical finding rests on. This is layered, not fail-open, which is why it is graded Warning rather than Critical, consistent with 19-REVIEW.md's own severity call."
  regressions: []
gaps:
  - truth: "The guard's permitted shape is now a closed positive specification of the refusal step's key surface AND the checker's own invariant suite cannot be silently defeated by a single-token workflow edit anywhere in the file (round 4 of the property CR-01/CR-02/CR-03 from round 3, and CR-01/CR-02 from round 2, all named)"
    status: failed
    reason: "Three NEW single-attribute or single-step edits, all independently reproduced this session against the current committed tree (not read from 19-REVIEW.md's prose and trusted), leave `node scripts/verify-workflows.mjs` printing `All 50 invariants hold across 3 section(s) (baselines=11, ci=31, cross=8).` with exit 0 and zero FAIL lines, while the guard's actual protection is void or the checker itself is disabled: (1) a `branches:`/`paths-ignore:` FILTER under `pull_request:` (e.g. `branches: [does-not-exist]`) — the new trigger check (19-15's WR-01 fix) tests key membership, not whether the event is unfiltered, so the key survives and every gate including gate-e2e silently detaches from real pull requests. Independently reproduced: mutated, checker exit 0, no FAIL line, reverted, md5sum back to b655c2d87b03dd324d867218c6484f3f. (2) A decoy `run: echo node scripts/refuse-mail-credential.mjs` step inserted first in gate-e2e relocates Invariant C's anchor (substring match on `run:` text) away from the step Invariant A identifies by exact `name:` — independently reproduced: checker output printed `refusal step index=0 (of 9 steps) precedes=[(none)] ... and that holds=true` while `actions/github-script@v7` sat at index 1 and the real refusal at index 5, exit 0, zero FAIL lines, byte-identical to 19-REVIEW.md's own reproduction. Reverted, md5sum confirmed. (3) `gate-db-free` — the job that executes the checker itself, both design-test suites (including the new `tests/design/workflow-invariants.test.ts` this round shipped), lint and `next build` — has no invariant of its own. Independently reproduced: deleting its two-line checker step (`- name: Verify the workflow invariants...` / `run: node scripts/verify-workflows.mjs`) leaves 50 green, exit 0, and the checker never runs again in CI. `verify-workflows.mjs:41-44`'s own header states as settled fact that `gate-db-free` now runs this script on every push and pull request — no invariant enforces any part of that sentence."
    artifacts:
      - path: "scripts/verify-workflows.mjs"
        issue: "The `ci.yml runs on BOTH push and pull_request` check (~:487-494) tests `Object.keys(doc.on)` membership only, not whether `pull_request`'s value is unfiltered (`null`/`undefined`). Invariant C's predecessor test (~:994-1006) anchors on `e2eSteps.findIndex((s) => String(s?.run ?? \"\").includes(MAIL_REFUSAL_SCRIPT))` — a second, weaker identity for the same step Invariant A already pins by exact `name:`. No `check()` anywhere in the file constrains `gate-db-free` — the job holding the checker's own invocation, `test:design`, lint and `next build` — the way `gate-e2e`'s unconditional and execution-defaults checks constrain that job."
    missing:
      - "Assert the `pull_request` VALUE is unfiltered (`prFilter === null || prFilter === undefined`), not merely that the trigger key is present — per 19-REVIEW.md CR-01's fix sketch — and add a standing case that inserts a filter rather than deleting the key, so the next round does not re-measure the same axis a third time."
      - "Anchor Invariant C on the SAME step object Invariant A already identified by exact name (`e2eSteps.indexOf(e2eMailStep)`), never a second, substring-based identity for the same step, and add `e2ePrecede.length > 0` so an empty prefix is diagnosed as an anchor failure rather than read as a clean job — per 19-REVIEW.md CR-02's fix sketch."
      - "Give `gate-db-free` the same treatment `gate-e2e` already has: its own hard-stop-if-absent, an unconditional/no-`defaults:` invariant covering the job and every one of its steps, and a pinned exact-invocation check for both the checker step and the `npm run build` step — per 19-REVIEW.md CR-03's fix sketch. This is the job whose own header comment claims coverage the file does not implement."
      - "Add a standing case (19-REVIEW.md WR-01's minimum-case list named this one and it was the one dropped) that reverts the refusal step's `run:` exact-match conjunct back to a substring match and asserts the standing suite goes red — the runtime protection is present today, but nothing in the tree would notice it regressing."
  - truth: "SC4's literal text ('opening a pull request runs the specs, and a failing spec turns the run red') is protected against a one-line regression by the invariant suite specifically at the trigger level, not only demonstrated true of the current file"
    status: failed
    reason: "See gaps entry above, item (1) — the trigger-filter vector bears directly on CI-01/SC4's literal requirement text, since a `pull_request: branches: [main]`-shaped filter (which reads as a plausible, non-adversarial narrowing) silently exempts pull requests targeting this repository's own working branch (`dev`) from ever running gate-e2e, while the checker reports full green."
    artifacts:
      - path: "scripts/verify-workflows.mjs"
        issue: "Same as above — the trigger check tests membership, not the absence of a filter."
    missing:
      - "Same fix as above."
deferred: []
behavior_unverified_items: []
human_verification:
  - test: "Reconfirm with the PM whether CI-01's current closure state — `gate-e2e` runs the full functional suite and provably turns the workflow run red on a real failure, but (a) is not a required branch-protection check because branch protection is unreachable on this GitHub plan (403 — Free private repo), and (b) the `ci` workflow run is now red on EVERY push/PR because of 14 pre-existing e2e failures with no expected-failure boundary — is acceptable to ship as-is, or should a follow-up phase (suite repair + baseline regen, the billing/visibility decision, and either a deliberate `continue-on-error` or a checked-in known-failures allowlist) be scheduled before this milestone ships."
    expected: "A recorded PM decision. Carried forward unchanged across four verification rounds — 19-14/19-15 did not touch this surface (out of scope by their own assumptions blocks) and this session found no new evidence changing it."
    why_human: "Repository visibility/GitHub-plan spend, whether to fund a suite-repair phase now versus later, and whether a permanently-red `ci` workflow run is an acceptable interim state for the whole project are product/business/scheduling decisions no codebase check can resolve."
  - test: "Have a person read the rendered D-03 notice on `/host/listings` after a genuine creation failure (e.g. by temporarily forcing `createDraftListing`'s insert to reject in a local/staging environment) and judge whether the calm, muted copy above the grid — naming the state, the reason and the way out — actually reads as adequate and non-alarming to a host who just lost a creation attempt."
    expected: "A human confirms the notice is legible, calm, and does not imply a verification problem, matching 19-07's design intent."
    why_human: "Carried forward unchanged across four verification rounds — reachability, routing and copy content are machine-proven, but whether the rendered sentence reads as calm and adequate is a UX judgement no assertion makes. 19-14/19-15 did not touch this surface."
---

# Phase 19: Host Listing Surfaces & Gates That Actually Run Verification Report

**Phase Goal:** A host's own listing grid renders honestly and creating a listing lands where it
should — and the specs that would catch a regression run in CI instead of only by hand.
**Verified:** 2026-09-05
**Status:** gaps_found
**Re-verification:** Yes — after gap closure (plans 19-14/19-15, the fourth gap-closure round
following 19-09/19-10/19-11, 19-12, and 19-13)

## Goal Achievement — read this section first

**Two separate questions, kept separate per this round's instructions, because conflating them
would misclassify one as the other.**

### (a) Are the four literal ROADMAP success criteria met, right now, on the committed file?

**Yes, all four.** SC1 (card grid alignment), SC2 (wizard routing on Create listing), SC3 (the 404
reproduced-before-touched discipline) and SC4 (opening a pull request runs the functional Playwright
specs and a failing spec turns the run red) are all true of the currently committed code. SC1–SC3
were untouched by this round (confirmed via `git diff --stat` against the prior round's commit
range — no listing-grid, wizard-routing or draft-reuse file appears). SC4 was established via two
real, reverted mutations watched red in actual CI runs in round 1 (`33843226846`, `33842567618`)
and is unaffected by anything this round changed: `gate-e2e` still triggers on `pull_request`, still
runs `npx playwright test --project=chromium`, confirmed by direct read this session.

### (b) Is D-14's mail-credential-refusal guard, and the invariant suite built specifically to make
it "undriftable," now actually undriftable?

**No.** D-14 is a CONTEXT decision, not itself named in any ROADMAP success criterion — but this
phase's own CI-01 requirement text and three prior gap-closure rounds have treated "the guard cannot
be silently defeated by a single-token workflow edit" as the thing being built toward. This session
independently reproduced a **fourth round** of the identical defect class: three new Critical
vectors (a trigger *filter*, a decoy anchor for Invariant C, and an entirely unconstrained
`gate-db-free` job that executes the checker itself) plus one Warning (the standing test has zero
coverage of round 2's own load-bearing fix). All four were found by a fresh code review
(`19-REVIEW.md`, committed `c2ff08c`) and every one was independently reproduced from scratch this
session, not taken on trust. See the Judgment section below for why this is scored `gaps_found` on
the same standard the prior three rounds applied.

**Net effect on requirement bookkeeping:** `.planning/REQUIREMENTS.md` currently marks `CI-01` as
`Complete` (flipped by 19-15's close-out, correcting a stale plan assumption) while `HSURF-01` and
`HSURF-02` still read `Gaps Found` (a flip made after round 3, apparently not reverted even though
both truths have been VERIFIED regressions, untouched, for two rounds running). This verification
does **not** silently accept either state — see Requirements Coverage below.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On `/host/listings`, cards in a row end at the same bottom edge and every control stays inside its card at 320px, two-column and three-column bands (HSURF-01, SC1) | ✓ VERIFIED (regression — untouched) | `src/components/listing/listing-card.tsx` not in this round's diff (`git diff --stat` against the prior round's commit shows only `.github/workflows/ci.yml`, `scripts/refuse-mail-credential.mjs`, `scripts/verify-workflows.mjs`, `tests/design/*.test.ts`, and `.planning/` bookkeeping). Carried forward. |
| 2 | A host who presses *Create listing* lands on the edit wizard, not "We couldn't find that page" (HSURF-02, SC2) | ✓ VERIFIED (regression — untouched) | Not in this round's diff. Carried forward. |
| 3 | The 404's cause is reproduced and identified before any source file is touched; if it does not survive a clean production build, no application file changes (HSURF-02, SC3) | ✓ VERIFIED (regression — untouched) | Unchanged this round. |
| 4 | Opening a pull request runs the repository's functional Playwright specs, and a failing spec turns the run red — proven by watching one fail (CI-01, SC4, literal text, of the current committed file) | ✓ VERIFIED | Confirmed by direct read this session: `pull_request:` present in `ci.yml`'s `on:` block, `gate-e2e` runs `npx playwright test --project=chromium`. Established via two real reverted CI-run mutations in round 1; unaffected by this round's changes (which touch comments, the checker script, and test files, never `gate-e2e`'s executable steps). |
| 5 | `gate-e2e` functions as a gate that blocks a regression from merging, not only one that reports it | ⚠️ Not a literal SC4 clause — informational, human-verification (unchanged) | Still not a required branch-protection check (403 — GitHub plan/visibility). See Human Verification item 1. |
| 6 | A draft the host has genuinely started editing is NEVER reused (D-02, underpins HSURF-02) | ✓ VERIFIED (regression — untouched) | `src/app/actions/listing.ts` not in this round's diff. Carried forward. |
| 7 | A host whose listing creation genuinely fails lands back on the grid with a sentence naming what happened (D-03, underpins HSURF-02) | ✓ VERIFIED (regression — untouched) | Carried forward. |
| 8 | Round-2's specific gaps (argument injection past Invariant A, literal `continue-on-error: true`) remain closed | ✓ VERIFIED | Independently reconfirmed this session on the CURRENT tree: appending `/tmp/decoy.mjs` to `gate-e2e`'s real refusal step still FAILs Invariant A, exit 1. Reverted, md5sum confirmed unchanged. |
| 9 | Round-3's specific gaps (shell-key override, expression-valued `continue-on-error`, untested `defaults:` block, untested trigger deletion) are closed | ✓ VERIFIED | Independently reproduced this session: `working-directory` (a key the checker's source never names, `grep -c` = 0 in both files) now FAILs Invariant A; `continue-on-error: ${{ true }}` now FAILs the presence test at both step and job level; a workflow- or job-level `defaults:` block now FAILs; deleting `pull_request:` now FAILs a new trigger check. All four reverted, tree confirmed clean each time. |
| 10 | The guard and its invariant suite cannot be silently defeated by ANY single-token workflow edit — the "undriftable" property this whole gap-closure lineage has been building toward | ✗ FAILED — FOURTH ROUND, SAME DEFECT CLASS | Three NEW Critical vectors independently reproduced this session (trigger filter; decoy anchor for Invariant C; unconstrained `gate-db-free`), plus one Warning (WR-01: the standing test has zero coverage of round 2's own load-bearing fix, though the runtime protection itself remains intact). See gaps frontmatter and Judgment below. |

**Score:** 8/9 truths verified (row 5 excluded as informational, consistent with all three prior
rounds' convention)

### Judgment: is this round's work genuine, and is `gaps_found` the right call?

**19-14/19-15's declared scope is genuinely closed, and it is real, substantive work — not a
cosmetic patch.** Every one of round 3's four named gaps is independently confirmed closed this
session, on the current tree, not read from SUMMARY prose: the allow-list is a real positive
specification (confirmed by reading `MAIL_STEP_ALLOWED_KEYS` and its ANDed step-presence conjunct,
and by reproducing that `working-directory` — a key named nowhere in the checker's own source — is
red); both `continue-on-error` sites are genuinely presence-tested now, closing the expression-value
hole; the `defaults:` block check and the trigger-presence check are both new and both fire as
described. The invariant total moved exactly as documented (48 → 50, `ci` 29 → 31), and the count
appears byte-identical in three places (checker output, `ci.yml`'s prose, `EXPECTED_GREEN`),
independently confirmed by `grep -cF`.

**But a fresh code review, run immediately after this round and read before this verification began,
found a fourth round of the identical defect class — and every material claim in it was
independently reproduced from scratch this session, not trusted.** The pattern across all four
rounds is the same: each fix closes exactly the mutation that was measured, along the exact axis
that was measured, while the property the surrounding prose claims (a step's whole permitted shape;
an unfiltered trigger; one stable identity per step; a job that actually runs the checker being
itself protected) remains open one layer further out. CR-01 (trigger filter vs. trigger presence),
CR-02 (Invariant C's separate, weaker step-identity), and CR-03 (nothing at all constrains the job
that executes the checker) are three fresh instances of exactly the shape 19-14/19-15's own
`<objective>` diagnosed as the root cause of rounds 1–3 and claimed to be fixing. WR-01 is a
different but adjacent failure: the brand-new standing-test file, whose entire reason for existing
is "the checker half never had a memory," ships with zero regression coverage of the single most
consequential predicate the whole four-round lineage rests on (round 2's exact-invocation fix) —
confirmed by reverting it and watching the new 12-case suite report 12/12 green.

**Verdict: `gaps_found`, on the same standard the prior three rounds applied.** These are not human
judgment calls or manufactured technicalities — every one was mechanically reproduced and reverted
this session, with `git status --porcelain` and `md5sum` both confirming a clean tree afterward, and
each is fully within engineering control. The distinction this round asked me to hold onto: **none
of the four literal ROADMAP success criteria are false** — SC1–SC4 are all true of the current file,
independently reconfirmed. What remains open is the self-imposed, CI-01-adjacent hardening goal of
making the D-14 guard's own invariant suite immune to single-token defeat — a goal this phase's own
prior rounds set for itself and has not yet reached in four attempts.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tests/design/workflow-invariants.test.ts` | The checker half's first standing instrument; mutates a `mkdtemp` copy, spawns the shipped checker with only `cwd` differing | ✓ VERIFIED, WIRED | Confirmed: 12 cases, collected by `vitest.design.config.ts`'s existing include, therefore inside `npm run build` via `test:design`. Re-run this session: 12 passed. |
| `scripts/verify-workflows.mjs` (allow-list, presence tests, trigger check, defaults check) | Positive specification of the refusal step's key surface; presence over value for `continue-on-error`; trigger and defaults invariants that did not exist before this round | ⚠️ PARTIAL — round-3's four named gaps closed, but three NEW single-token vectors (trigger filter, Invariant C anchor, unconstrained `gate-db-free`) and one coverage gap (WR-01) independently reproduced | See gaps. |
| `.github/workflows/ci.yml` header prose | Comment-only changes; falsified entries updated in place per house style | ✓ VERIFIED | `git diff -U0` against the prior round's commit, non-`#` lines = 0, confirmed by direct measurement this session (`sed`/read of the trigger, defaults, and job sections shows no executable byte moved). |
| `scripts/refuse-mail-credential.mjs` (WR-03/WR-04 corrections) | False env-hit claim corrected; argv content no longer echoed | ✓ VERIFIED | Confirmed by direct read: the environment-hit message names only `container.env` and the runner environment (both true, and explicitly disclaims the non-prefixed-key case); the argument-refusal message prints an arithmetic count, not the argument content. |
| `.planning/REQUIREMENTS.md` | CI-01 marked per its actual state | ⚠️ FLAGGED, NOT SILENTLY ACCEPTED | CI-01 now reads `Complete`; HSURF-01/HSURF-02 still read `Gaps Found` despite both being VERIFIED regressions, untouched, for two rounds. See Requirements Coverage. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `gate-e2e` refusal step's key set | Invariant A (allow-list conjunct) | `Object.keys()` subset test against `MAIL_STEP_ALLOWED_KEYS`, ANDed with step-presence | ✓ WIRED | Confirmed: `working-directory` (grep -c = 0 in both files) FAILs; absence of the step still FAILs (vacuity guarded). |
| `continue-on-error` presence (step and job) | The unconditional invariant | `!== undefined` / `=== undefined` | ✓ WIRED | Confirmed: expression, quoted-string and literal-boolean forms all FAIL, at both levels. |
| `ci.yml`'s `pull_request:` KEY presence | The new trigger invariant | `triggersOf(doc).includes(...)` | ⚠️ WIRED FOR DELETION, NOT WIRED FOR FILTERING (new finding) | Confirmed: deleting the key FAILs; adding a `branches:`/`paths-ignore:` filter under the key leaves it green — membership, not "is this event unfiltered," is what's tested. |
| The refusal step Invariant A identifies (by exact `name:`) | The same step as Invariant C's predecessor anchor | Two DIFFERENT identity computations for one step | ✗ NOT WIRED TOGETHER (new finding) | Confirmed: a decoy `run:` substring match becomes Invariant C's anchor while Invariant A still correctly targets the real step by name — `precedes=[(none)]`/`holds=true` printed while an arbitrary `uses:` action runs ahead of the real refusal. |
| `gate-db-free` (the job that runs the checker, `test:design`, lint, `next build`) | any invariant constraining its own execution | none | ✗ NOT WIRED (new finding) | Confirmed: deleting the two-line checker step from `gate-db-free` leaves 50 green; the checker never runs in CI again and nothing detects it. |
| Round-2's exact-invocation fix (`.trim() === MAIL_REFUSAL_RUN`) | a standing regression case in `workflow-invariants.test.ts` | none | ✗ NOT WIRED (new finding, WR-01) | Confirmed: reverting to `.includes(...)` leaves the 12-case suite at 12/12 green. The runtime protection on the real file is still intact — reconfirmed separately. |
| `gate-e2e` (job) | branch protection required-check list | GitHub repository setting | ✗ NOT WIRED (regression, unchanged across 4 rounds) | Still 403; recorded PM hold. |

### Data-Flow Trace (Level 4)

Not applicable — this round is CI configuration and test-harness code only, not a data-rendering
surface.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Checker, clean tree | `node scripts/verify-workflows.mjs` | exit 0, `All 50 invariants hold across 3 section(s) (baselines=11, ci=31, cross=8).` | ✓ PASS |
| Design suite (workflow-invariants) | `npx vitest run --config vitest.design.config.ts tests/design/workflow-invariants.test.ts` | 12 passed | ✓ PASS |
| Full design suite | `npx vitest run --config vitest.design.config.ts` | 78 files, 1367 passed, 3 pre-existing skips | ✓ PASS |
| `npm run build` (lint + test:design + next build) | `npm run build` | exit 0 | ✓ PASS |
| Byte-identity of the invariant-count summary line | `grep -cF "All 50 invariants hold across 3 section(s) (baselines=11, ci=31, cross=8)." scripts/verify-workflows.mjs .github/workflows/ci.yml tests/design/workflow-invariants.test.ts` | `ci.yml=1`, `workflow-invariants.test.ts=1` (the checker's own line is dynamically generated, confirmed matching by direct run) | ✓ PASS |
| `working-directory` named nowhere in the source | `grep -c working-directory scripts/verify-workflows.mjs .github/workflows/ci.yml` | 0, 0 | ✓ PASS |
| Round-2 regression check — argument appended to the REAL refusal step | mutate `ci.yml`, `node scripts/verify-workflows.mjs` | exit 1, FAIL names Invariant A. Reverted; md5sum confirmed unchanged. | ✓ PASS — CLOSURE STILL INTACT |
| **NEW — CR-01: `pull_request: branches: [does-not-exist]`** | mutate `ci.yml`, `node scripts/verify-workflows.mjs` | exit 0, `All 50 invariants hold...` unchanged, no FAIL line. Reverted; md5sum confirmed unchanged. | ✗ CONFIRMS NEW DEFECT |
| **NEW — CR-02: decoy `run: echo node scripts/refuse-mail-credential.mjs` inserted first in `gate-e2e`** | mutate `ci.yml`, `node scripts/verify-workflows.mjs` | exit 0; evidence line reads `refusal step index=0 (of 9 steps) precedes=[(none)] ... and that holds=true`. Reverted; md5sum confirmed unchanged. | ✗ CONFIRMS NEW DEFECT |
| **NEW — CR-03: delete the checker step from `gate-db-free`** | mutate `ci.yml`, `node scripts/verify-workflows.mjs` | exit 0, `All 50 invariants hold...` unchanged, no FAIL line — and the checker step is genuinely gone. Reverted; md5sum confirmed unchanged. | ✗ CONFIRMS NEW DEFECT |
| **NEW — WR-01: revert `.trim() === MAIL_REFUSAL_RUN` to `.includes(...)`** | mutate `scripts/verify-workflows.mjs`, run design test | `Tests 12 passed (12)` — zero regression coverage of round 2's own load-bearing fix. Reverted; md5sum confirmed unchanged. | ✗ CONFIRMS COVERAGE GAP (runtime protection on the real file separately reconfirmed intact) |
| Post-mutation cleanup (5 mutations this session) | `md5sum` before/after + `git status --porcelain -- .github/workflows/ scripts/` | identical / empty, every time | ✓ CONFIRMED REVERTED |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention found in this repository; covered under Behavioral
Spot-Checks above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| HSURF-01 | 19-02, 19-03 | Cards align, controls stay inside card at every width | ✓ SATISFIED (this verification's assessment) | Truth #1. Untouched this round. `.planning/REQUIREMENTS.md` currently reads `Gaps Found` for this row — a state this verification believes is stale (both HSURF truths have been VERIFIED regressions for two consecutive rounds), but this verifier does not edit that file; flagged rather than silently accepted. |
| HSURF-02 | 19-04..19-07, 19-09, 19-10 | Creating a listing lands on the wizard, not a 404 | ✓ SATISFIED (this verification's assessment) | Truths #2/#3/#6/#7. Same flag as HSURF-01 above. |
| CI-01 | 19-01, 19-08, 19-11, 19-12, 19-13, 19-14, 19-15 | Functional Playwright specs run in CI as a new job, with a fail-closed mail-credential refusal | ⚠️ SC4's literal text SATISFIED; the invariant-suite hardening this requirement's supporting rounds have pursued is NOT — FOURTH ROUND | SC4/CI-01's literal text (truth #4) is satisfied of the current file. Rounds 2 and 3's specific defects are genuinely closed (truths #8, #9). But three new single-token defeats of the checker (including one that bears directly on SC4's own trigger clause) and one standing-test coverage gap were independently reproduced this session. `.planning/REQUIREMENTS.md` marks this row `Complete` (flipped by 19-15 after finding its own plan's premise stale) — this verification does not consider the invariant-suite-hardening goal fully earned, for the fourth consecutive round, though it does consider SC4's literal text satisfied. See Goal Achievement (a)/(b) above for why these are reported as two separate findings rather than one. |

No orphaned requirements — all three IDs declared across the 15 plans are exactly the three
`.planning/REQUIREMENTS.md` maps to Phase 19.

**REQUIREMENTS.md bookkeeping, reported rather than corrected:** `HSURF-01`/`HSURF-02` read
`Gaps Found` in the traceability table while their underlying truths have been VERIFIED, untouched
regressions for two consecutive verification rounds (this round did not re-derive them, only
confirmed they remain untouched by `git diff --stat`). `CI-01` reads `Complete`, set by 19-15's
close-out on the grounds that the two gaps 19-VERIFICATION.md's third round left open (the trigger
check and the outer `defaults:` check) are now closed — true, but this session's independent
reproduction of CR-01 (trigger *filter*, as opposed to trigger *deletion*) shows the specific
regression-protection standard the prior three rounds withheld `Complete` for is still not fully met.
19-REVIEW.md's own IN-05 finding makes the identical point. This verifier reports the discrepancy
rather than silently accepting either row's current value or hand-editing the file.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/verify-workflows.mjs` | ~487-494 | The new trigger check tests key membership, not filter absence | 🛑 Blocker | A `branches:`/`paths-ignore:` filter under `pull_request:` silently detaches every gate, including `gate-e2e`, from real pull requests while the checker is fully green. Bears directly on SC4/CI-01's literal text. |
| `scripts/verify-workflows.mjs` | ~994-1006 (Invariant C) vs ~890 (Invariant A) | Two different identity computations for the same refusal step — exact `name:` in one, substring-of-`run:` in the other | 🛑 Blocker | A decoy `run:` line earlier in the step list becomes Invariant C's anchor, making `every([])` vacuously true while an arbitrary `uses:` action runs ahead of the real refusal. |
| `.github/workflows/ci.yml` / `scripts/verify-workflows.mjs` | `gate-db-free` job (whole) | No invariant of any kind constrains the job that executes the checker itself, `test:design`, lint and `next build` | 🛑 Blocker | Deleting the checker step, or adding `continue-on-error: true` or a `defaults:` block to this one job, silently disables the checker, both design-test suites, ESLint and the build — with the checker's own header claiming this job "now runs this script on every push and pull request" as settled fact. |
| `tests/design/workflow-invariants.test.ts` | case list | No case exercises round 2's exact-invocation fix (`e2eMailRun.trim() === MAIL_REFUSAL_RUN`) | ⚠️ Warning | Reverting it to a substring match leaves the 12-case suite fully green. The runtime protection on the real committed file is intact and separately reconfirmed; only the standing-test memory of it is absent. |
| `src/components/listing/listing-card.tsx` | :186-195, :345-357 | `ConfirmDialog`'s handlers lack `try`/`catch` around the awaited server action (prior rounds) | ⚠️ Warning | Untouched by this round; carried forward, not re-derived. |
| Multiple files | multiple | ~11 stale `<file>:<line>` citations in guard failure messages (prior rounds) | ⚠️ Warning | Untouched by this round; carried forward, not re-derived. |

No `TBD`/`FIXME`/`XXX` debt markers found in the files this round modified.

### Human Verification Required

See frontmatter `human_verification` — two items, both carried forward unchanged across four
verification rounds because 19-14/19-15 did not touch either surface: (1) the PM's reconfirmation of
CI-01's non-required/permanently-red closure state; (2) a human read of the D-03 grid notice's copy
quality.

### Gaps Summary

**19-14/19-15's declared scope — round 3's four named gaps — is genuinely closed**, independently
reconfirmed this session against the current committed tree rather than trusted from SUMMARY prose.
The allow-list is a real positive specification; both `continue-on-error` sites are genuinely
presence-tested; the `defaults:` block check and the trigger-presence check are both new and both
fire. The invariant total moved exactly as documented and is byte-identical across the three places
it is spelled. This is substantive, not cosmetic, work.

**A fourth round of the same defect class was found and independently reproduced this session.**
`19-REVIEW.md` (committed `c2ff08c`, read before this verification began) reported three Critical
findings and one Warning; every material claim was reproduced from scratch against the working tree
rather than taken on trust, with reversion confirmed by `md5sum` and `git status --porcelain` each
time:

1. A `branches:`/`paths-ignore:` **filter** on `pull_request:` (not a deletion) leaves the new trigger
   check green, because it tests key membership rather than whether the event is unfiltered. This
   one bears directly on SC4/CI-01's own literal requirement text.
2. A decoy `run:` line whose text merely mentions the refusal script's path becomes Invariant C's
   anchor (a substring match), while Invariant A correctly anchors the same step by exact name — two
   identities for one step, and the weaker one governs the predecessor-ordering property.
3. `gate-db-free` — the job that runs the checker itself, both design-test suites, lint and the
   build — has no invariant of its own. Deleting its checker step, or soft-failing the whole job,
   silently disables the entire verification apparatus this phase has spent four rounds building.
4. The brand-new standing-test file has zero regression coverage of round 2's own load-bearing fix
   (the exact-invocation comparison) — a coverage gap, not a runtime one; the real committed file's
   protection is separately reconfirmed intact.

**Judged as genuine gaps, on the same standard the prior three rounds applied.** Each is fully within
engineering control, mechanically reproduced and reverted with no ambiguity, and each is the fourth
instance of a pattern this phase's own plans have repeatedly diagnosed and claimed to close: a fix
scoped to the axis that was measured, leaving the next axis open. This is scored `gaps_found`
consistent with rounds 1–3.

**Held distinctly, per this round's explicit instruction: none of the four literal ROADMAP success
criteria (SC1–SC4) are false.** All four are true of the currently committed file, independently
reconfirmed this session. What remains open is the narrower, self-imposed goal — carried across four
rounds, motivated by CI-01's supporting D-14 CONTEXT decision rather than by ROADMAP text — of making
the checker's own invariant suite immune to single-token defeat anywhere in the two workflow files.
That goal is not yet reached. Whoever plans the next round should weigh whether to continue chasing
that goal (which this session's "what I tried and could not defeat" section in `19-REVIEW.md`
suggests may be close — the allow-list itself, the refusal script itself, and credential-mapping
paths are all now genuinely closed) or to accept the current state as tracked residual risk against
SC1–SC4 being met, record the four human/PM decisions this implies, and close the phase.

---

_Verified: 2026-09-05_
_Verifier: Claude (gsd-verifier)_
