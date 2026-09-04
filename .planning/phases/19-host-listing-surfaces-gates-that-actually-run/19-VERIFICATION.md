---
phase: 19-host-listing-surfaces-gates-that-actually-run
verified: 2026-09-04T15:20:00Z
status: gaps_found
score: 6/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 6/7
  gaps_closed:
    - "D-14's runtime mail-credential refusal was structurally inert (read the Actions `${{ env.X }}` expression context, which can never see the process/container/service environment). Plan 19-12 replaced it with `scripts/refuse-mail-credential.mjs`, a committed Node script that reads `Object.keys(process.env)` — independently re-verified this session: `RESEND_API_KEY=fake_probe_value node scripts/refuse-mail-credential.mjs` (no arguments, matching how `ci.yml` actually invokes it) exits 1 with an `::error::` line naming the offending variable and the measured fourteen-sends-per-run finding; a clean shell exits 0. This closes the ORIGINAL gap — the guard is no longer structurally incapable of firing under the configuration actually shipped."
  gaps_remaining: []
  new_gaps:
    - "The guard shipped this round can be silently defeated by two separate single-token edits that leave `node scripts/verify-workflows.mjs`'s all-48-invariants-green report unchanged — see gaps below (CR-01, CR-02, both independently reproduced this session, not merely read from the review)."
  regressions: []
gaps:
  - truth: "D-14's runtime refusal, and the invariant suite built specifically to keep it undriftable, cannot be silently defeated by a single-token workflow edit (CR-01: argument injection)"
    status: failed
    reason: "scripts/refuse-mail-credential.mjs:61 resolves its prefix source as `process.argv[2] ?? <verify-workflows.mjs path>`. The script's own header (lines 43-46) states, as a factual claim about the codebase: 'ci.yml invokes this script with no arguments, and Invariant A asserts that.' This is FALSE. Invariant A's four conjuncts (scripts/verify-workflows.mjs:766-775) are: the step exists, its `run` string `.includes(MAIL_REFUSAL_SCRIPT)`, its `run` contains no `${{`, and its `env` is undefined — none of these constrains the ARGUMENT LIST. Independently reproduced this session in two steps: (1) `RESEND_API_KEY=live_secret_abc node scripts/refuse-mail-credential.mjs /tmp/decoy.mjs` (decoy carrying `const MAIL_KEY_PREFIX = \"ZZUNUSED\";`) exits 0 — the live credential is present and the script reports clean. (2) Editing `ci.yml`'s refusal step to `run: node scripts/refuse-mail-credential.mjs /tmp/decoy.mjs` and running `node scripts/verify-workflows.mjs` still prints `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8)` — exit 0, zero red lines. Both mutations were reverted; `git status --porcelain` was empty afterward. This is the same defect CLASS D-14 was built this round to eliminate (a control documented as covering something it structurally cannot), reproduced inside the code this same plan shipped."
    artifacts:
      - path: "scripts/refuse-mail-credential.mjs"
        issue: "Accepts an unvalidated `process.argv[2]` override of the prefix-declaration source in a script that also runs unmodified in production (ci.yml); the header asserts a guarantee ('Invariant A asserts that [no arguments]') that the referenced invariant does not implement."
      - path: "scripts/verify-workflows.mjs"
        issue: "Invariant A (lines 766-775) checks the run string `.includes(MAIL_REFUSAL_SCRIPT)`, which is satisfied by any argument list appended after the script path; it does not check for an exact `run` string or otherwise forbid arguments."
    missing:
      - "Tighten Invariant A to an exact match (`e2eMailRun.trim() === \"node \" + MAIL_REFUSAL_SCRIPT`) or otherwise assert zero arguments, per 19-REVIEW.md CR-01's fix sketch, so a supported/documented override cannot reach the production step undetected."
      - "Correct the script's header claim to match what Invariant A actually checks, or make the claim true by implementing the check — not both left in their current mismatched state."
  - truth: "The 'gate-e2e is unconditional' invariant covers every step that carries the mail-refusal gate, not only the job (CR-02: step-level continue-on-error)"
    status: failed
    reason: "scripts/verify-workflows.mjs:731-736's 'is unconditional' check reads only `e2e?.if` and `e2e?.[\"continue-on-error\"]` — JOB-level fields. Invariants A and C (the two invariants 19-12 added specifically to assert the refusal step's shape and position) read the step's `name`, `run`, `env` and index, but never the step's own `if:` or `continue-on-error:`. Independently reproduced this session: adding `continue-on-error: true` as a third line under the refusal step's existing `name:`/`run:` pair, then running `node scripts/verify-workflows.mjs`, still prints `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8)` — exit 0, zero red lines, despite the step's non-zero exit no longer being able to fail the job. Reverted; `git status --porcelain` was empty afterward. This is round 1's WR-02 in a materially worse position: there it detached a test runner, here it detaches the only half of D-14 that protects the CURRENT run — the exact property `ci.yml`'s own header and this plan's must_haves state is the entire reason the step exists."
    artifacts:
      - path: "scripts/verify-workflows.mjs"
        issue: "The unconditional check at lines 731-736 is scoped to the job (`e2`), not to `gate-e2e`'s individual steps; a step-level `continue-on-error: true` or `if:` on the mail-refusal step specifically is invisible to it and to every other invariant in the file."
    missing:
      - "Quantify the unconditional check over every step in `gate-e2e` (or at minimum the mail-refusal step by name), per 19-REVIEW.md CR-02's fix sketch, so a step-level `continue-on-error`/`if:` fails the checker exactly as a job-level one already does."
human_verification:
  - test: "Reconfirm with the PM whether CI-01's current closure state — `gate-e2e` runs the full functional suite and provably turns the workflow run red on a real failure (two watched, reverted mutations in real CI runs), but (a) is not a required branch-protection check because branch protection is unreachable on this GitHub plan (403 — Free private repo), and (b) the `ci` workflow run is now red on EVERY push/PR because of 14 pre-existing, reproducible e2e failures with no expected-failure boundary — is acceptable to ship as-is, or should a follow-up phase (suite repair + baseline regen, the billing/visibility decision, and either a deliberate `continue-on-error` or a checked-in known-failures allowlist) be scheduled before this milestone ships."
    expected: "A recorded PM decision. Carried forward unchanged from the prior verification round — 19-12 did not touch this (it is explicitly out of scope in the plan's own assumptions block), and this session found no new evidence changing it."
    why_human: "Repository visibility/GitHub-plan spend, whether to fund a suite-repair phase now versus later, and whether a permanently-red `ci` workflow run is an acceptable interim state for the whole project are product/business/scheduling decisions no codebase check can resolve."
  - test: "Have a person read the rendered D-03 notice on `/host/listings` after a genuine creation failure (e.g. by temporarily forcing `createDraftListing`'s insert to reject in a local/staging environment) and judge whether the calm, muted copy above the grid — naming the state, the reason and the way out — actually reads as adequate and non-alarming to a host who just lost a creation attempt."
    expected: "A human confirms the notice is legible, calm, and does not imply a verification problem, matching 19-07's design intent."
    why_human: "Carried forward unchanged from the prior verification round — reachability, routing and copy content are machine-proven, but whether the rendered sentence reads as calm and adequate is a UX judgement no assertion makes. 19-12 did not touch this surface."
---

# Phase 19: Host Listing Surfaces & Gates That Actually Run Verification Report

**Phase Goal:** A host's own listing grid renders honestly and creating a listing lands where it
should — and the specs that would catch a regression run in CI instead of only by hand.
**Verified:** 2026-09-04
**Status:** gaps_found
**Re-verification:** Yes — after gap closure (plan 19-12, following the prior round's 19-09/19-10/19-11)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On `/host/listings`, cards in a row end at the same bottom edge and every control stays inside its card at 320px, two-column and three-column bands (HSURF-01, SC1) | ✓ VERIFIED (regression — untouched this round) | `src/components/listing/listing-card.tsx` not in 19-12's `files_modified` (only `.github/workflows/ci.yml`, `scripts/refuse-mail-credential.mjs`, `scripts/verify-workflows.mjs`, `tests/design/mail-credential-refusal.test.ts`, `.planning/REQUIREMENTS.md`). Carried forward from the prior verification round per this round's explicit scope instruction. |
| 2 | A host who presses *Create listing* lands on the edit wizard, not "We couldn't find that page" (HSURF-02, SC2) | ✓ VERIFIED (regression — untouched) | `19-FINDING-404.md` reproduction gate unchanged; not in 19-12's file set. |
| 3 | The 404's cause is reproduced and identified before any source file is touched; if it does not survive a clean production build, no application file changes (HSURF-02, SC3) | ✓ VERIFIED (regression — untouched) | Unchanged this round. |
| 4 | Opening a pull request runs the repository's functional Playwright specs, and a failing spec turns the run red — proven by watching one fail (CI-01, SC4, literal text) | ✓ VERIFIED (regression, strengthened by prior round's 19-11) | Unaffected by 19-12: `gate-e2e` still runs `npx playwright test --project=chromium` on `pull_request`/`push` (confirmed present at `.github/workflows/ci.yml:1368`+ during this session's direct reads), and two real reverted mutations already proved the run-red property in actual CI (`33843226846`, `33842567618`) per the prior round. |
| 5 | `gate-e2e` functions as a gate that blocks a regression from merging, not only one that reports it | ⚠️ Not a literal SC4 clause — informational, human-verification (unchanged) | Still not a required branch-protection check (403 — GitHub plan/visibility). Not in 19-12's scope. See Human Verification item 1. |
| 6 | A draft the host has genuinely started editing is NEVER reused (D-02, underpins HSURF-02) | ✓ VERIFIED (regression — untouched) | `src/app/actions/listing.ts` not in 19-12's `files_modified`. Carried forward unchanged. |
| 7 | A host whose listing creation genuinely fails lands back on the grid with a sentence naming what happened (D-03, underpins HSURF-02) | ✓ VERIFIED (regression — untouched) | Carried forward unchanged. |
| 8a | D-14 — `gate-e2e`'s refusal step, as actually invoked by `ci.yml` (no arguments), reads the job's REAL process environment and refuses with an `::error::` line when a live mail credential is present, before migrate/seed/Playwright | ✓ VERIFIED — ORIGINAL GAP CLOSED | Independently re-verified this session by direct invocation, not by trusting SUMMARY prose: `RESEND_API_KEY=fake_probe_value node scripts/refuse-mail-credential.mjs` (no args, matching `ci.yml:1368`'s exact invocation) → 8 `::error::` lines including the offending variable name and the `[17-D28]` fourteen-sends measurement, exit 1. Clean shell → exit 0, reports prefix, count scanned, source path. `node scripts/verify-workflows.mjs` → `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8)`, re-run directly. `tests/design/mail-credential-refusal.test.ts` re-run: 5/5 passed, build-blocking via `package.json:11,33`'s `test:design` step (confirmed by direct read). This is a genuine, substantive fix — the guard is no longer structurally incapable of ever firing (the original defect: reading `${{ env.RESEND_API_KEY }}`, which can never see the process environment). |
| 8b | D-14's guard, and the invariant suite plan 19-12 built specifically to make its two halves "undriftable" and to make tampering "watched red," in fact catches tampering — a single-token edit cannot silently disable the guard while the checker stays green | ✗ FAILED — NEW GAP | See `gaps` frontmatter (two independently reproduced mutations: CR-01 argument injection, CR-02 step-level `continue-on-error`). Both leave `node scripts/verify-workflows.mjs` reporting all 48 invariants green while the guard's actual protection is void. |

**Score:** 6/8 truths verified (excluding row 5, informational; row 8 split into 8a/8b because this round's central finding is that the ORIGINAL gap and a NEWLY-DISCOVERED gap are genuinely different properties of the same control — collapsing them would either hide that the inert-forever defect is truly fixed, or hide that the "undriftable" claim is not)

### Judgment on CR-01 / CR-02 vs. 19-12's declared must_haves

19-12-PLAN.md's `must_haves.truths` are all technically true of the **currently committed configuration**:
`ci.yml` invokes the script with no arguments today, the script does read `process.env` today, and
Invariant B's prefix-drift check does hold. None of the ten quoted truth bullets literally promises
"cannot be defeated by adding an argument" or "no step can carry `continue-on-error`". Read at the
narrowest, most literal level, the declared must_haves are not falsified.

**That reading is too narrow for what this phase is.** The plan's own `<objective>` states the intended
output is invariants that make the two halves "undriftable, each watched red under a real reverted
mutation," and the script's own header makes a specific, checkable factual claim — "Invariant A asserts
that [ci.yml invokes with no arguments]" — that this session proved false by running the exact invariant
and reading its four conjuncts. A comment asserting a guarantee that the code beside it does not
implement is precisely the CR-01-round-1 defect class (a control documented as covering something it
structurally cannot) that this entire gap-closure round exists to eliminate, reproduced inside the code
this same plan shipped, in the same file, on the same day. CR-02 is the same shape one level out: the
"unconditional" invariant's own inline comment says it exists so that a job "cannot fail... without every
parsed invariant staying intact" — and a step-level `continue-on-error` does exactly that while leaving
all 48 invariants green, which is the property the comment says cannot happen.

**Verdict: these are gaps, not accepted deviations.** They are freshly-introduced, fully within
engineering control, machine-reproducible without any human judgment call, and about a security/privacy
control whose entire subject this round is "a control that looked correct and did nothing." The
honest-verifier standard this round was explicitly held to — "a green check is not proof a guard works —
ask whether it could have failed" — was applied and the guard could be made to fail silently, twice,
independently. This is scored as `gaps_found`, not `human_needed`: no human judgment is required to see
that `All 48 invariants hold` after either mutation is not true "coverage."

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/refuse-mail-credential.mjs` | Runtime half of D-14, reads real `process.env`, no default/fallback on unreadable prefix | ⚠️ VERIFIED-BUT-DEFEATABLE | Core behavior confirmed correct and fail-closed for its two named hard-stop paths (unreadable source, unparseable declaration) and for the actual measured vector (a live credential with no argument override). But its unvalidated `argv[2]` override (present for the design test's benefit) is reachable in production and its header's claim that "Invariant A asserts" no-arguments is false — see gap CR-01. |
| `tests/design/mail-credential-refusal.test.ts` | Build-blocking, DB-free proof of both directions | ✓ VERIFIED, WIRED | Re-run this session: 5/5 passed under `vitest.design.config.ts`, which is part of `npm run build` (`package.json:11,33`, confirmed by direct read). |
| `scripts/verify-workflows.mjs` (4 new invariants: A, B, C, D) | Make the refusal step's shape, the prefix's undriftability, its ordering, and the workflow directory's token-count all machine-asserted | ⚠️ PARTIAL | Invariant B (prefix drift) and Invariant D (zero-token audit) hold as designed — not contested by either review finding. Invariant A (real-environment shape) and Invariant C (ordering) are correctly shaped for the properties they DO check, but neither constrains arguments or step-level `if`/`continue-on-error`, which are exactly the two properties this session found undefended — see gaps. |
| `.github/workflows/ci.yml` header prose | Names which half covers what, deletes the false timing claim | ✓ VERIFIED | `grep -c "browser starts"` returns 0 in both files (re-run this session); `the RUNTIME half is the one that observes container.env` present at `ci.yml:288` (re-run this session); two `FALSIFIED 2026-09-04 BY PLAN 19-12` markers present in `ci.yml`, one in `verify-workflows.mjs` (re-run this session). |
| `.planning/REQUIREMENTS.md` | HSURF-01 traceability cell corrected from "Gaps Found" to "Complete" | ✓ VERIFIED | `grep -n "^| HSURF-01 "` → `Complete`, re-run this session. CI-01's row also now reads `Complete` — see the judgment above for why this session does not consider that fully earned; flagged rather than silently accepted. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `scripts/refuse-mail-credential.mjs` | `MAIL_KEY_PREFIX` in `scripts/verify-workflows.mjs` | Regex-read of the declaration, not a copy | ✓ WIRED | `node -e` occurrence check (from 19-12's own acceptance criteria) re-run conceptually via direct source read: `refuse-mail-credential.mjs` contains the pattern source text and no copy of `RESEND`. |
| `gate-e2e` refusal step | container's real process environment | `Object.keys(process.env)` | ✓ WIRED (for the deployed, no-argument invocation) | Confirmed by direct invocation matching `ci.yml`'s exact `run:` string. |
| `gate-e2e` refusal step's arguments | Invariant A (`scripts/verify-workflows.mjs`) | `run` string `.includes()` check | ✗ NOT WIRED (new finding, CR-01) | An appended argument passes `.includes(MAIL_REFUSAL_SCRIPT)` undetected — reproduced this session by editing `ci.yml` and re-running the checker; reverted. |
| `gate-e2e` refusal step's own `if:`/`continue-on-error:` | the "unconditional" invariant | job-level field read only | ✗ NOT WIRED (new finding, CR-02) | Reproduced this session by adding `continue-on-error: true` to the step and re-running the checker; reverted. |
| `gate-e2e` (job) | branch protection required-check list | GitHub repository setting | ✗ NOT WIRED (regression, unchanged) | Still 403; recorded PM hold. |

### Data-Flow Trace (Level 4)

Not applicable — this round is CI configuration only (a Node script, four parse invariants, two comment
blocks, one traceability cell), not a data-rendering surface.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Design test for the mail refusal | `npx vitest run --config vitest.design.config.ts tests/design/mail-credential-refusal.test.ts` | 1 file, 5 passed | ✓ PASS |
| Refusal script, clean environment, no arguments (matches `ci.yml`'s actual invocation) | `node scripts/refuse-mail-credential.mjs` | exit 0, reports prefix=RESEND, 83 vars scanned, source path | ✓ PASS |
| Refusal script, live credential, no arguments | `RESEND_API_KEY=fake_probe_value node scripts/refuse-mail-credential.mjs` | exit 1, 8 `::error::` lines, offending variable named, no value printed | ✓ PASS |
| Invariant suite, baseline | `node scripts/verify-workflows.mjs` | exit 0, `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8)` | ✓ PASS |
| CR-01 reproduction — script with a decoy prefix source and a live credential | `RESEND_API_KEY=live_secret_abc node scripts/refuse-mail-credential.mjs /tmp/decoy.mjs` | exit 0 despite live credential present | ✗ CONFIRMS DEFECT |
| CR-01 reproduction — `ci.yml` edited to pass the decoy path as an argument | `node scripts/verify-workflows.mjs` (against mutated `ci.yml`) | exit 0, `All 48 invariants hold...` unchanged | ✗ CONFIRMS DEFECT — checker does not see the injected argument |
| CR-02 reproduction — `continue-on-error: true` added to the refusal step only | `node scripts/verify-workflows.mjs` (against mutated `ci.yml`) | exit 0, `All 48 invariants hold...` unchanged | ✗ CONFIRMS DEFECT — checker does not see the step-level override |
| Post-mutation cleanup | `git status --porcelain .github/workflows/ci.yml` | empty, both times | ✓ CONFIRMED REVERTED |
| Debt markers in the five files 19-12 touched | `grep -n -E "TBD|FIXME|XXX"` across all five | no matches | ✓ CLEAN |
| Build-blocking wiring | `grep -n '"build"\|"test:design"' package.json` | `build` runs `lint && test:design && next build` | ✓ CONFIRMED |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention found in this repository; covered under Behavioral Spot-Checks above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| HSURF-01 | 19-02, 19-03 | Cards align, controls stay inside card at every width | ✓ SATISFIED | Truth #1. Untouched this round. `.planning/REQUIREMENTS.md`'s stale "Gaps Found" cell was bookkeeping-corrected to "Complete" this round by 19-12 (it was never actually a failed must_have in either round) — correctly closes a documentation drift, not a code gap. |
| HSURF-02 | 19-04..19-07, 19-09, 19-10 | Creating a listing lands on the wizard, not a 404 | ✓ SATISFIED | Truths #2/#3/#6/#7. Untouched this round. |
| CI-01 | 19-01, 19-08, 19-11, 19-12 | Functional Playwright specs run in CI as a new job, with a fail-closed mail-credential refusal | ⚠️ PARTIALLY SATISFIED | SC4's literal text (truth #4) is satisfied. D-14's original inert-forever defect is genuinely closed (truth #8a). But the guard shipped this round can be silently disabled by two independently reproduced single-token edits that the invariant suite built to prevent exactly that does not catch (truth #8b, gaps CR-01/CR-02). `.planning/REQUIREMENTS.md` now marks this row "Complete" — this verification does not consider that fully earned and flags it rather than silently accepting it. |

No orphaned requirements — all three IDs declared across the 12 plans are exactly the three
`.planning/REQUIREMENTS.md` maps to Phase 19.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/refuse-mail-credential.mjs` | 43-46, 61 | Header comment makes a specific, checkable false claim about invariant coverage ("Invariant A asserts that [no arguments]"); the referenced invariant does not implement that check | 🛑 Blocker | Same defect class the whole gap-closure round exists to eliminate: a security control documented as covering something it does not. Reproduced live (exit 0 with a live credential present, via a documented input path). |
| `scripts/verify-workflows.mjs` | 731-736 | "Unconditional" invariant is scoped to the job, not to `gate-e2e`'s individual steps; the mail-refusal step's own `if:`/`continue-on-error:` is unchecked by any of the 48 invariants | 🛑 Blocker | A one-line step-level edit silently disables the only half of D-14 that protects the current run, with the checker reporting full green. |
| `src/components/listing/listing-card.tsx` | :186-195, :345-357 | `ConfirmDialog`'s handlers lack `try`/`catch` around the awaited server action (WR-01) | ⚠️ Warning | Untouched by 19-12; carried forward per the prior verification round, not re-derived this session. |
| Multiple files | multiple | ~11 stale `<file>:<line>` citations in guard failure messages (WR-04) | ⚠️ Warning | Untouched by 19-12; carried forward, not re-derived this session. |

No `TBD`/`FIXME`/`XXX` debt markers found in the five files 19-12 modified.

### Human Verification Required

See frontmatter `human_verification` — two items, both carried forward unchanged from the prior
verification round because 19-12 did not touch either surface: (1) the PM's reconfirmation of CI-01's
non-required/permanently-red closure state; (2) a human read of the D-03 grid notice's copy quality.

### Gaps Summary

**The gap this round set out to close is genuinely closed.** D-14's runtime mail-credential refusal
previously shipped structurally incapable of ever firing — it tested a GitHub Actions expression context
that is built exclusively from workflow-file `env:` maps and can never see the process environment. Plan
19-12 replaced it with a committed Node script that reads `Object.keys(process.env)`, and this session
independently confirmed, by direct invocation matching `ci.yml`'s exact deployed `run:` string (no
arguments), that it correctly refuses with an `::error::` line on a live credential and passes clean on a
clean environment. This is a real, substantive fix, not a cosmetic one.

**Two NEW gaps were found this session, both independently reproduced rather than taken from the fresh
code review's prose.** The review (`19-REVIEW.md`, written after 19-12's execution) flagged both as
Critical (CR-01: unvalidated `argv[2]` prefix-source override reachable via a single-token workflow edit
that the checker's Invariant A does not detect; CR-02: the "unconditional" invariant is job-scoped only,
so a step-level `continue-on-error: true` on the refusal step specifically silently detaches D-14's only
current-run protection while all 48 invariants stay green). This verification reproduced both from
scratch:

1. **CR-01** — ran `RESEND_API_KEY=live_secret_abc node scripts/refuse-mail-credential.mjs
   /tmp/decoy.mjs` and got exit 0 with a live credential present. Then edited `ci.yml`'s refusal step to
   pass that same decoy path as an argument and re-ran `node scripts/verify-workflows.mjs`: still `All
   48 invariants hold`. Reverted; tree confirmed clean.
2. **CR-02** — added `continue-on-error: true` to only the refusal step in `ci.yml` and re-ran `node
   scripts/verify-workflows.mjs`: still `All 48 invariants hold`. Reverted; tree confirmed clean.

Both are judged as genuine gaps rather than accepted narrow-reading technicalities: they are freshly
introduced by the plan that was supposed to close exactly this class of defect, they are fully within
engineering control, they require no human judgment to confirm, and the script's own header makes a
specific false claim about what the invariant suite checks. This phase's stated subject is "a control
that looked correct and did nothing" — the same finding now applies to two properties of the control
built to fix the first instance of it.

**Everything else from the prior verification round is unaffected and re-confirmed as regression-stable**
(truths #1-4, #6, #7; the two carried-forward human-verification items). 19-12 touched exactly five
files and none of them intersect the listing-grid, wizard-routing, or reuse-predicate surfaces.

---

_Verified: 2026-09-04_
_Verifier: Claude (gsd-verifier)_
