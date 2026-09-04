---
phase: 19-host-listing-surfaces-gates-that-actually-run
verified: 2026-09-05T00:50:00Z
status: gaps_found
score: 7/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 6/8
  gaps_closed:
    - "CR-01 (round 2, argument injection) — Invariant A now compares `gate-e2e`'s refusal step `run:` for EXACT equality (`e2eMailRun.trim() === MAIL_REFUSAL_RUN`) after `trim()`, and `scripts/refuse-mail-credential.mjs` deleted the `process.argv[2] ??` fallback and refuses any argument outright before reading a file or the environment. Independently reproduced this session: (a) `node scripts/refuse-mail-credential.mjs /tmp/decoy.mjs` now exits 1 with an `::error::` line, not 0; (b) appending an argument to `ci.yml`'s refusal `run:` and re-running `node scripts/verify-workflows.mjs` now prints a FAIL line naming Invariant A and exits 1, not the previous silent green. Reverted; tree confirmed clean."
    - "CR-02 (round 2, literal `continue-on-error: true` on a step) — the 'unconditional' invariant now quantifies over every step of `gate-e2e`, not only the job. Independently reproduced: adding `continue-on-error: true` under the refusal step's `run:` now prints a FAIL line naming the invariant and exits 1, not the previous silent green. Reverted; tree confirmed clean."
  gaps_remaining: []
  new_gaps:
    - "Two NEW ways to silently defeat the same guard were found and independently reproduced this session, both leaving `node scripts/verify-workflows.mjs`'s all-48-green report unchanged: a step-level `shell: cat {0}` on the refusal step (the `run:` body never executes), and `continue-on-error: ${{ true }}` — an expression, which GitHub Actions accepts and which parses to a *string*, defeating the `=== true` / `!== true` value comparisons the widened check still uses at lines 756/761 of `scripts/verify-workflows.mjs`. A third, pre-existing hole (deleting `pull_request:` from `ci.yml`'s triggers, which nothing in the `ci` section asserts) bears directly on SC4's literal wording and was also independently reproduced."
  regressions: []
gaps:
  - truth: "The guard shipped this round, and the invariant suite built to make it undriftable, cannot be silently defeated by a single-token workflow edit (round 2 of the same property CR-01/CR-02 named)"
    status: failed
    reason: "Two new single-attribute edits to the refusal step leave `node scripts/verify-workflows.mjs` reporting all 48 invariants green while the guard's actual protection is void. (1) shell-key hole: adding `shell: cat {0}` to the refusal step (`run:` byte-identical, no `env:`/`if:`/`continue-on-error:`, step not moved) means `cat` prints the script text and exits 0 instead of executing it — the refusal never runs, and CI proceeds to migrate/seed/boot with a live mail credential in the environment, yet the checker prints `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8)`. Independently reproduced this session (not read from 19-REVIEW.md): mutated `ci.yml`, ran the checker, got CHECKER-EXIT=0, `(NO FAIL LINE)`, reverted, `git status --porcelain` and a byte diff both confirmed identical to the pre-mutation file. (2) continue-on-error-expression hole: `scripts/verify-workflows.mjs:756` (`step?.[\"continue-on-error\"] === true`) and `:761` (`e2e?.[\"continue-on-error\"] !== true`) compare for the JavaScript boolean `true`, but GitHub Actions accepts an expression value for this key (`continue-on-error: ${{ true }}` is GitHub's own canonical example), which parses to a string, so both comparisons stay green. Independently reproduced: added `continue-on-error: ${{ true }}` to the refusal step, ran the checker, got CHECKER-EXIT=0, `(NO FAIL LINE)`, reverted, confirmed byte-identical. Both mutations directly confirmed at the exact source lines the review cited. This is the identical defect class 19-13 itself exists to eliminate (\"a control documented as covering something it structurally cannot\"), reproduced inside the code this same plan shipped, one day after CR-01/CR-02 were closed."
    artifacts:
      - path: "scripts/verify-workflows.mjs"
        issue: "The widened 'unconditional' check (lines 751-767) has no conjunct for a step-level `shell:` override, and its `continue-on-error` conjuncts (756, 761) test for value equality against `true` rather than presence, unlike the adjacent `if:` conjunct which correctly tests presence (`!== undefined`)."
    missing:
      - "Assert the refusal step's full attribute surface via an allow-list (only `name`/`run` permitted; anything else, including a future Actions attribute nobody has heard of, is red) rather than a hand-picked deny-list, per 19-REVIEW.md CR-01's fix sketch — and add the same allow-list check for `defaults.run.shell` at job/workflow level, which nothing currently reads."
      - "Change both `continue-on-error` conjuncts from `=== true` / `!== true` to presence tests (`!== undefined`), exactly as `if:` already is tested, per 19-REVIEW.md CR-02's fix sketch. `continue-on-error: false` on a gate step is noise that should be deleted, not a value worth carving out."
      - "Add a standing test (per 19-REVIEW.md WR-02) that mutates a copy of `ci.yml` and spawns the checker against it, so future tightenings are proven by a test in the tree rather than by a hand-applied, reverted mutation that leaves no instrument behind — the concrete mechanism by which CR-01/CR-02 (round 1) and the shell-key/expression-value holes (round 2) all survived a full verification round each."
  - truth: "SC4's literal text ('opening a pull request runs the specs') is protected against a one-line regression by the invariant suite, not only demonstrated true of the current file"
    status: failed
    reason: "Nothing in `scripts/verify-workflows.mjs`'s `ci` section asserts `ci.yml`'s trigger set; `triggersOf(doc)` is read only for the printed diagnostic table, never compared in a `check()`. Independently reproduced this session: deleted `pull_request:` from `ci.yml`'s `on:` block and re-ran the checker — `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8)`, unchanged; every gate in the file, including `gate-e2e`, would silently detach from pull requests. Reverted; byte-identical confirmed. This predates 19-13 (it is not in its files_modified diff) but sits in a file 19-13 reviewed and edited this round, and it bears directly on CI-01/SC4's literal wording — a one-line regression here falsifies the requirement with the checker fully green."
    artifacts:
      - path: "scripts/verify-workflows.mjs"
        issue: "The `ci` section's baselines section asserts its own trigger set as an exact comparison (verify-workflows.mjs:305-310) but the mirroring assertion for `ci.yml`'s own triggers does not exist."
    missing:
      - "Add a `ci` section check asserting `triggersOf(doc)` includes both `push` and `pull_request`, per 19-REVIEW.md WR-01's fix sketch, and update the ci=29 count and the 'total stays 48' documentation in the same commit."
deferred: []
behavior_unverified_items: []
human_verification:
  - test: "Reconfirm with the PM whether CI-01's current closure state — `gate-e2e` runs the full functional suite and provably turns the workflow run red on a real failure, but (a) is not a required branch-protection check because branch protection is unreachable on this GitHub plan (403 — Free private repo), and (b) the `ci` workflow run is now red on EVERY push/PR because of 14 pre-existing, reproducible e2e failures with no expected-failure boundary — is acceptable to ship as-is, or should a follow-up phase (suite repair + baseline regen, the billing/visibility decision, and either a deliberate `continue-on-error` or a checked-in known-failures allowlist) be scheduled before this milestone ships."
    expected: "A recorded PM decision. Carried forward unchanged across three verification rounds — 19-13 did not touch this surface (out of scope by its own assumptions block) and this session found no new evidence changing it."
    why_human: "Repository visibility/GitHub-plan spend, whether to fund a suite-repair phase now versus later, and whether a permanently-red `ci` workflow run is an acceptable interim state for the whole project are product/business/scheduling decisions no codebase check can resolve."
  - test: "Have a person read the rendered D-03 notice on `/host/listings` after a genuine creation failure (e.g. by temporarily forcing `createDraftListing`'s insert to reject in a local/staging environment) and judge whether the calm, muted copy above the grid — naming the state, the reason and the way out — actually reads as adequate and non-alarming to a host who just lost a creation attempt."
    expected: "A human confirms the notice is legible, calm, and does not imply a verification problem, matching 19-07's design intent."
    why_human: "Carried forward unchanged across three verification rounds — reachability, routing and copy content are machine-proven, but whether the rendered sentence reads as calm and adequate is a UX judgement no assertion makes. 19-13 did not touch this surface."
---

# Phase 19: Host Listing Surfaces & Gates That Actually Run Verification Report

**Phase Goal:** A host's own listing grid renders honestly and creating a listing lands where it
should — and the specs that would catch a regression run in CI instead of only by hand.
**Verified:** 2026-09-05
**Status:** gaps_found
**Re-verification:** Yes — after gap closure (plan 19-13, the third gap-closure round following
19-09/19-10/19-11 and 19-12)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On `/host/listings`, cards in a row end at the same bottom edge and every control stays inside its card at 320px, two-column and three-column bands (HSURF-01, SC1) | ✓ VERIFIED (regression — untouched this round) | `src/components/listing/listing-card.tsx` not in 19-13's diff (`git diff --stat e1ccad3^..c9aa790` shows exactly the 4 declared files). Carried forward per this round's explicit scope instruction. |
| 2 | A host who presses *Create listing* lands on the edit wizard, not "We couldn't find that page" (HSURF-02, SC2) | ✓ VERIFIED (regression — untouched) | Not in 19-13's diff. Carried forward. |
| 3 | The 404's cause is reproduced and identified before any source file is touched; if it does not survive a clean production build, no application file changes (HSURF-02, SC3) | ✓ VERIFIED (regression — untouched) | Unchanged this round. |
| 4 | Opening a pull request runs the repository's functional Playwright specs, and a failing spec turns the run red — proven by watching one fail (CI-01, SC4, literal text, of the current configuration) | ✓ VERIFIED (regression) | Unaffected by 19-13's diff; `pull_request:` trigger and `gate-e2e`'s Playwright step confirmed present by direct read this session (`ci.yml:527-529`). Two real reverted mutations already proved the run-red property in actual CI (prior rounds). This truth is about the CURRENT committed file, which is correct — see truth 4b for whether that correctness is regression-protected. |
| 4b | SC4's property is protected against a one-line regression by the invariant suite (not merely true of today's file) | ✗ FAILED | See gaps: deleting `pull_request:` leaves all 48 invariants green — independently reproduced this session. |
| 5 | `gate-e2e` functions as a gate that blocks a regression from merging, not only one that reports it | ⚠️ Not a literal SC4 clause — informational, human-verification (unchanged) | Still not a required branch-protection check (403 — GitHub plan/visibility). See Human Verification item 1. |
| 6 | A draft the host has genuinely started editing is NEVER reused (D-02, underpins HSURF-02) | ✓ VERIFIED (regression — untouched) | `src/app/actions/listing.ts` not in 19-13's diff. Carried forward. |
| 7 | A host whose listing creation genuinely fails lands back on the grid with a sentence naming what happened (D-03, underpins HSURF-02) | ✓ VERIFIED (regression — untouched) | Carried forward. |
| 8a | D-14's runtime refusal (reads real `process.env`, no arguments accepted) and the round-2 CR-01/CR-02 mutations 19-VERIFICATION reproduced are now closed | ✓ VERIFIED — BOTH CLOSED GAPS CONFIRMED CLOSED | Independently re-verified this session, not read from SUMMARY prose: (a) `node scripts/refuse-mail-credential.mjs /tmp/decoy.mjs` now exits 1 with `::error::` lines (was exit 0); (b) appending an argument to `ci.yml`'s refusal step and running the checker now FAILs on Invariant A, exit 1 (was silent green); (c) adding literal `continue-on-error: true` to the refusal step now FAILs the unconditional invariant, exit 1 (was silent green). All three mutations reverted; `git status --porcelain` empty each time. `tests/design/mail-credential-refusal.test.ts`: 8/8 passed, re-run this session. `node scripts/verify-workflows.mjs` (clean tree): `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8)`. |
| 8b | The guard, and the invariant suite built specifically to make it "undriftable" and tampering "watched red," in fact cannot be silently disabled by a single-token workflow edit | ✗ FAILED — NEW GAPS, ROUND 2 OF THE SAME FINDING | Two new independently-reproduced defeats: a step-level `shell: cat {0}` on the refusal step (the script never executes, checker stays green) and `continue-on-error: ${{ true }}` (an Actions expression that parses to a string, defeating the `=== true`/`!== true` value comparisons at `scripts/verify-workflows.mjs:756,761`). Both reproduced fresh this session against the current tree, not taken from 19-REVIEW.md's prose. See gaps frontmatter. |

**Score:** 7/9 truths verified (row 5 excluded as informational; row 4 split into 4/4b and row 8 split
into 8a/8b for the same reason the prior round split: the property that is genuinely fixed and the
property that is newly falsified are different claims about the same control, and collapsing them
would hide one or the other)

### Judgment: is this round's narrow closure enough?

19-13's declared `must_haves.truths` are all true of what they specifically targeted: the exact
CR-01 (argument injection) and CR-02 (literal `continue-on-error: true`) mutations that
19-VERIFICATION.md (round 2) reproduced are now caught, watched red by this session directly, not
merely claimed. That is genuine, substantive work — the invariant total held at 48, both fixes are
tightenings of existing conjuncts rather than new ones bolted on, and the design-test suite grew from
5 to 8 cases with case 8 reproducing the measured fail-open verbatim. This is not a rubber stamp on a
narrow reading; the specific defects named in the prior round's `gaps:` block are gone.

**But the round's own `<objective>` claims more than that**, and the same over-claim pattern recurred:
"Make the guard's guard real" and a header comment stating a step-level `continue-on-error` "cannot"
detach the gate. `19-REVIEW.md` (read before this verification, and every material claim in it
independently reproduced rather than trusted) found two further single-attribute edits — a `shell:`
override and an expression-valued `continue-on-error` — that land in the exact same defect class:
present, wired-looking, and defeatable while the checker prints full green. This session reproduced
both from scratch against the working tree, confirmed the exact source lines the review cited
(`scripts/verify-workflows.mjs:756,761` for the value-comparison asymmetry; no `shell`/`defaults`
handling anywhere in the file, confirmed by direct read), and confirmed the tree was clean after each
mutation.

**Verdict: this is scored `gaps_found`, for the third consecutive round, on the same standard the
prior two rounds applied.** The honest-verifier question — "a green check is not proof a guard
works; ask whether it could have failed" — was applied and answered: yes, twice more, by two
single-key edits that the review's own root-cause diagnosis calls out directly ("the newly-widened
predicate was widened along the axis that was measured... rather than along the axis the prose
claims"). This is not a manufactured gap from unread review prose — every claim relied on here was
independently reproduced against the current tree in this session, with reversion confirmed by both
`git status --porcelain` and a byte diff.

A structural observation worth recording for whoever plans the next round: the pattern across three
rounds (round 1: `.includes()` vs exact match, job-only unconditional check; round 2: value-vs-presence
for `continue-on-error`, no attribute allow-list) is a deny-list chasing individually-measured mutations
rather than a positive specification of the step's entire permitted shape. 19-REVIEW.md's WR-01
(untested trigger set) and WR-02 (the checker's own tightenings have no standing regression test —
only hand-applied, reverted mutations) name the same root cause from two more angles. Closing CR-01
and CR-02 (round 2) by the same reactive method this session found two more instances of the identical
gap it was reacting to; a structural fix (allow-list the step's attribute surface; presence-test
`continue-on-error` everywhere `if:` already is; a standing mutation-test file replacing the
hand-verify-and-revert idiom) is what the review's fix sketches converge on, not another single-token
patch.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/refuse-mail-credential.mjs` | Runtime half of D-14, no arguments accepted, prefix source underivable from input | ✓ VERIFIED for its declared scope | Argument guard confirmed as the first executable statement; `argv[2]` fallback confirmed removed; `grep -c "Invariant A asserts that"` returns 0 (the false claim from round 2 is gone). WR-04 from 19-REVIEW.md (raw `process.argv` echoed to the build log at line 69, against the file's own line 40-41 rule) confirmed present by direct read — a Warning, not a Blocker, and not part of this round's declared scope. |
| `tests/design/mail-credential-refusal.test.ts` | Build-blocking, DB-free proof, 8 cases including the measured fail-open | ✓ VERIFIED, WIRED | Re-run this session: `npx vitest run --config vitest.design.config.ts tests/design/mail-credential-refusal.test.ts` → 1 file, 8 passed. `test:design` confirmed part of `npm run build` (`package.json:11,33`, direct read). |
| `scripts/verify-workflows.mjs` (Invariant A tightened, unconditional check widened) | Exact-invocation comparison; every step of `gate-e2e` covered, not only the job | ⚠️ PARTIAL — targeted mutations closed, two new ones open | Both round-2 mutations (argument injection, literal `continue-on-error: true`) confirmed caught (FAIL line, exit 1). The `shell:` attribute surface and the `continue-on-error` value-vs-presence asymmetry remain open — see gaps. |
| `.github/workflows/ci.yml` header prose | Falsify entries 3 and 5 of the numbered invariant list in place, per house style | ✓ VERIFIED | Two `FALSIFIED 2026-09-04 BY PLAN 19-13` markers present (`ci.yml:235`, `:251`, confirmed by direct grep), each attributing the historical claim and stating what replaced it. |
| `.planning/REQUIREMENTS.md` | Left byte-unchanged this round (plan's own stated assumption) | ✓ CONFIRMED UNCHANGED | `git log` shows the file's last touch was `c173195` (19-12), not any 19-13 commit. HSURF-01/HSURF-02/CI-01 traceability rows unchanged from the prior round: all read `Complete`. CI-01's row is still not considered fully earned by this verification — see Requirements Coverage below. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `gate-e2e` refusal step's arguments | Invariant A (exact-invocation conjunct) | `run.trim() === MAIL_REFUSAL_RUN` | ✓ WIRED (round-2 mutation) | Confirmed: appended argument now FAILs the invariant, exit 1. |
| `gate-e2e` refusal step's literal `continue-on-error: true` | the widened unconditional invariant | `conditionalSteps` scan over `stepsOf(e2e)` | ✓ WIRED (round-2 mutation) | Confirmed: literal boolean now FAILs, exit 1. |
| `gate-e2e` refusal step's `shell:` key | any invariant | none | ✗ NOT WIRED (new finding, reproduced) | `grep -n "shell\|defaults" scripts/verify-workflows.mjs` returns no matches; adding `shell: cat {0}` leaves the `run:` string, `env:`, `if:` and step position all unchanged, so every existing conjunct stays green while the script never executes. |
| `gate-e2e` refusal step's `continue-on-error: ${{ true }}` (expression, not literal) | the widened unconditional invariant | `=== true` / `!== true` value comparison | ✗ NOT WIRED (new finding, reproduced) | An expression parses to a string; the comparison at lines 756/761 is false for it in both directions, so the check stays green while the step is functionally soft-failing. |
| `ci.yml`'s `pull_request:` trigger | any `ci` section invariant | none | ✗ NOT WIRED (pre-existing, not introduced by 19-13, reproduced) | `triggersOf(doc)` is read only for the diagnostic printout; no `check()` compares it. Deleting the trigger leaves all 48 invariants green. |
| `gate-e2e` (job) | branch protection required-check list | GitHub repository setting | ✗ NOT WIRED (regression, unchanged across 3 rounds) | Still 403; recorded PM hold. |

### Data-Flow Trace (Level 4)

Not applicable — this round is CI configuration only (a Node script, two tightened invariants, two
comment blocks), not a data-rendering surface.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Design test suite (8 cases) | `npx vitest run --config vitest.design.config.ts tests/design/mail-credential-refusal.test.ts` | 1 file, 8 passed | ✓ PASS |
| Refusal script, clean environment, no arguments | `node scripts/refuse-mail-credential.mjs` | exit 0, `prefix=RESEND`, 83 vars scanned, source path | ✓ PASS |
| Refusal script, argument passed (round-2 CR-01 vector) | `node scripts/refuse-mail-credential.mjs /tmp/decoy.mjs` | exit 1, `::error::` lines, no completed-scan report | ✓ PASS — GAP CLOSED |
| Invariant suite, baseline | `node scripts/verify-workflows.mjs` | exit 0, `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8)` | ✓ PASS |
| Round-2 CR-01 reproduction — argument appended to `ci.yml`'s refusal `run:` | `node scripts/verify-workflows.mjs` (mutated) | CHECKER-EXIT=1, FAIL names Invariant A | ✓ PASS — GAP CLOSED |
| Round-2 CR-02 reproduction — literal `continue-on-error: true` on refusal step | `node scripts/verify-workflows.mjs` (mutated) | CHECKER-EXIT=1, FAIL names the unconditional invariant | ✓ PASS — GAP CLOSED |
| NEW — `shell: cat {0}` on the refusal step | `node scripts/verify-workflows.mjs` (mutated) | CHECKER-EXIT=0, `(NO FAIL LINE)`, `All 48 invariants hold...` unchanged | ✗ CONFIRMS NEW DEFECT |
| NEW — `continue-on-error: ${{ true }}` on the refusal step | `node scripts/verify-workflows.mjs` (mutated) | CHECKER-EXIT=0, `(NO FAIL LINE)`, `All 48 invariants hold...` unchanged | ✗ CONFIRMS NEW DEFECT |
| NEW — `pull_request:` trigger deleted from `ci.yml` | `node scripts/verify-workflows.mjs` (mutated) | CHECKER-EXIT=0, `All 48 invariants hold...` unchanged | ✗ CONFIRMS PRE-EXISTING DEFECT, BEARS ON SC4 |
| Post-mutation cleanup (5 mutations this session) | `git status --porcelain .github/workflows/` + byte diff against pre-mutation copy | empty / identical, every time | ✓ CONFIRMED REVERTED |
| Debt markers in the four files 19-13 touched | `grep -n -E "TBD|FIXME|XXX"` across all four | no matches | ✓ CLEAN |
| `TODO`/`HACK`/`PLACEHOLDER` scan | same four files | one hit: `ci.yml:778` `# ── BUILD-ONLY PLACEHOLDERS. NOT SECRETS. NEVER MAKE THEM SECRETS. ──` | ℹ️ Not a stub marker — a labeled comment about test-only env values, pre-existing, unrelated to this round |
| Build-blocking wiring | `grep -n '"build"\|"test:design"' package.json` | `build` runs `lint && test:design && next build` | ✓ CONFIRMED |
| WR-04 (raw argv echoed to build log) | Direct read of `scripts/refuse-mail-credential.mjs:69` | `console.log(\`::error::Received: ${process.argv.slice(2).join(" ")}\`)` present | ⚠️ CONFIRMS WARNING — not this round's declared scope, carried as anti-pattern |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention found in this repository; covered under Behavioral
Spot-Checks above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| HSURF-01 | 19-02, 19-03 | Cards align, controls stay inside card at every width | ✓ SATISFIED | Truth #1. Untouched this round. |
| HSURF-02 | 19-04..19-07, 19-09, 19-10 | Creating a listing lands on the wizard, not a 404 | ✓ SATISFIED | Truths #2/#3/#6/#7. Untouched this round. |
| CI-01 | 19-01, 19-08, 19-11, 19-12, 19-13 | Functional Playwright specs run in CI as a new job, with a fail-closed mail-credential refusal | ⚠️ PARTIALLY SATISFIED, THIRD ROUND | SC4's literal text (truth #4) is satisfied of the current file. D-14's original defect (truth #8a) and both round-2 CR-01/CR-02 defects are genuinely closed and independently reconfirmed this session. But two new single-attribute defeats of the same guard (`shell:` override, expression-valued `continue-on-error`) were independently reproduced this session, plus a pre-existing untested trigger deletion that falsifies SC4's literal requirement text with the checker fully green. `.planning/REQUIREMENTS.md` still marks this row "Complete" (byte-unchanged since 19-12) — this verification, for the third consecutive round, does not consider that fully earned and flags it rather than silently accepting it. |

No orphaned requirements — all three IDs declared across the 13 plans are exactly the three
`.planning/REQUIREMENTS.md` maps to Phase 19.

**REQUIREMENTS.md internal inconsistency, noted but out of this round's scope:** the HSURF-01 bullet
in the requirement body text (`- [ ] **HSURF-01**`, line 237) is still an unchecked checkbox, while the
traceability table (`| HSURF-01 | Phase 19 | Complete |`, line 313) reads Complete. This predates
19-13 (the file was last touched by 19-12) and is a documentation-consistency issue, not a functional
gap — flagged for whoever next edits that file rather than silently left.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/verify-workflows.mjs` | 751-767 | No conjunct constrains the refusal step's `shell:` key (or `defaults.run.shell` at job/workflow level); the file has no `shell`/`defaults` handling at all | 🛑 Blocker | A one-line step-level edit silently prevents the refusal script from ever executing, with the checker reporting full green. |
| `scripts/verify-workflows.mjs` | 756, 761 | `continue-on-error` conjuncts test for value equality (`=== true` / `!== true`) rather than presence, unlike the adjacent `if:` conjunct which correctly tests presence | 🛑 Blocker | `continue-on-error: ${{ true }}` (a documented, valid Actions expression) defeats both conjuncts while the step is functionally soft-failing. |
| `scripts/verify-workflows.mjs` | (ci section, whole) | No `check()` asserts `ci.yml`'s trigger set includes `pull_request` | ⚠️ Warning | Pre-existing, not introduced this round. Deleting the trigger detaches every gate in the file from PRs with the checker fully green — bears directly on SC4/CI-01's literal wording. |
| `scripts/refuse-mail-credential.mjs` | 69 | Raw `process.argv` echoed into the build log via `::error::Received: ...`, against the file's own stated rule at lines 40-41 ("PRINTS VARIABLE NAMES AND NEVER VARIABLE VALUES") | ⚠️ Warning | A developer probing the control by hand (e.g. `node scripts/refuse-mail-credential.mjs "$RESEND_API_KEY"`) gets the value echoed back with `::error::` framing. Not this round's declared scope; carried forward from 19-REVIEW.md WR-04. |
| `scripts/verify-workflows.mjs`, `tests/design/mail-credential-refusal.test.ts` | whole | The two round-2 tightenings (exact invocation, step quantifier) have no standing regression test — only hand-applied, reverted mutations proved them this session and during execution | ⚠️ Warning | This is the concrete mechanism by which the shell-key and expression-value holes survived: a checker with no test of its own regresses silently. Carried from 19-REVIEW.md WR-02. |
| `src/components/listing/listing-card.tsx` | :186-195, :345-357 | `ConfirmDialog`'s handlers lack `try`/`catch` around the awaited server action (WR-01, prior rounds) | ⚠️ Warning | Untouched by 19-13; carried forward, not re-derived this session. |
| Multiple files | multiple | ~11 stale `<file>:<line>` citations in guard failure messages (WR-04, prior rounds) | ⚠️ Warning | Untouched by 19-13; carried forward, not re-derived this session. |

No `TBD`/`FIXME`/`XXX` debt markers found in the four files 19-13 modified.

### Human Verification Required

See frontmatter `human_verification` — two items, both carried forward unchanged across three
verification rounds because 19-13 did not touch either surface: (1) the PM's reconfirmation of
CI-01's non-required/permanently-red closure state; (2) a human read of the D-03 grid notice's copy
quality.

### Gaps Summary

**19-13's declared scope — the two mutations 19-VERIFICATION.md (round 2) reproduced — is genuinely
closed.** Both were independently re-reproduced this session, against the current committed tree, and
confirmed caught: an appended argument now FAILs Invariant A's exact-invocation conjunct, and a literal
`continue-on-error: true` on the refusal step now FAILs the widened unconditional invariant. The
invariant total held at 48 as claimed (`baselines=11, ci=29, cross=8`). The design-test suite grew from
5 to 8 build-blocking cases, all passing. This is real, substantive work, not a cosmetic patch.

**Two new gaps were found and independently reproduced this session, in the same defect class the
round exists to eliminate.** `19-REVIEW.md` (read before this verification began) flagged both as
Critical, and every material claim relied on here was reproduced from scratch rather than trusted:

1. A step-level `shell: cat {0}` on the refusal step leaves the `run:` string, `env:`, `if:`,
   `continue-on-error:` and step position all untouched — every conjunct any invariant currently checks
   — while `cat` prints the script instead of executing it. `node scripts/verify-workflows.mjs` still
   reports `All 48 invariants hold`.
2. `continue-on-error: ${{ true }}` — a documented Actions expression, not merely a literal boolean —
   defeats the `=== true` / `!== true` value comparisons at `scripts/verify-workflows.mjs:756` and
   `:761`, which are asymmetric with the correctly presence-tested `if:` conjunct beside them. Same
   result: all 48 invariants stay green.

A third, pre-existing hole was also reproduced: nothing in the `ci` section asserts `ci.yml`'s trigger
set, so deleting `pull_request:` detaches every gate in the file from pull requests with the checker
fully green — directly relevant because CI-01/SC4's literal requirement text is specifically about
pull requests.

**Judged as genuine gaps, on the same standard the prior two rounds applied**, not accepted as a
narrow-reading technicality: they are fully within engineering control, require no human judgment to
confirm (each was mechanically reproduced and reverted, with `git status --porcelain` and a byte diff
both confirming a clean tree afterward), and they are round 3 of a pattern this phase has now
established across three consecutive rounds — a reactive, deny-list-shaped fix for each individually
measured mutation, rather than a positive specification of the step's permitted attribute surface. The
review's own diagnosis (the newly-widened predicate was widened along the axis that was *measured*
rather than the axis the prose *claims*) is the load-bearing finding for why this recurs, and it
predicts more instances of the same shape until the checker moves to an allow-list and a standing
mutation-test file replaces the hand-verify-and-revert idiom (19-REVIEW.md WR-01, WR-02).

**Everything else from the prior two rounds is unaffected and re-confirmed as regression-stable**
(truths #1-3, #6, #7; the two carried-forward human-verification items). 19-13 touched exactly the
four files it declared, confirmed by `git diff --stat` against the prior round's commit range, and
none of them intersect the listing-grid, wizard-routing, or reuse-predicate surfaces.

---

_Verified: 2026-09-05_
_Verifier: Claude (gsd-verifier)_
