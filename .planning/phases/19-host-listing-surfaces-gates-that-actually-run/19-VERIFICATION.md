---
phase: 19-host-listing-surfaces-gates-that-actually-run
verified: 2026-09-04T21:10:00Z
status: gaps_found
score: 6/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/7
  gaps_closed:
    - "D-02 — a draft the host has genuinely started editing is NEVER reused. Closed by 19-09: a third `NOT EXISTS` conjunct on `availability_block`, plus `tests/design/listing-reuse-predicate-census.test.ts`, a DB-free build-blocking gate that derives every child table of `listing` from schema source and requires each one covered-or-exempted. Independently re-verified by reading `src/app/actions/listing.ts:340-349` and by running `tests/listing/crud.test.ts -t availability_block` (1 passed) and the census (`vitest.design.config.ts`, 11 passed) against the live tree, not merely by trusting 19-09-SUMMARY.md."
    - "D-03 — a host whose listing creation genuinely fails lands back on the grid with a sentence naming what happened. Closed by 19-10: `createDraftListing`'s reuse-read and insert are now wrapped in a `try`/`catch` that returns `{ ok: false, error: LISTING_CREATE_FAILED_STATE }` instead of throwing, and `new/page.tsx` routes the two verification/session races to their own destinations so only a genuine infra failure reaches the grid sentence. Independently re-verified by reading `src/app/actions/listing.ts:270-370` and by running `tests/listing/create-failure.test.ts` (5 passed) against the live tree."
  gaps_remaining: []
  regressions: []
gaps:
  - truth: "gate-e2e refuses to run when a live mail credential is present in its environment, and says so with an ::error:: line before anything boots (D-14, 19-01-PLAN must_have, requirement CI-01)"
    status: failed
    reason: "NEWLY DISCOVERED this session — not one of the two gaps 19-09/19-10 closed, and not raised in the prior 19-VERIFICATION.md (which took the runtime step's existence at face value). The fresh code review (19-REVIEW.md CR-01, dated after gap closure) found, and this verification independently confirmed by reading `.github/workflows/ci.yml:1305-1321`, that the step reads `env: MAIL_KEY_UNDER_TEST: ${{ env.RESEND_API_KEY }}`. `${{ env.X }}` is a GitHub Actions EXPRESSION resolved from the accumulated workflow/job/step `env:` maps ONLY — it is not the process environment and does not see repository/organization secrets, `vars.*`, `container.env`, or `services.*.env`. So this step can only ever fire for the ONE case that is already, separately and completely caught by `scripts/verify-workflows.mjs`'s parse-based scan (any workflow/job/step `env` KEY beginning with the mail-provider prefix) — a case that check already rejects the workflow file for, before this step could ever run. There is no live input for which the runtime step catches something the parser missed. Worse: the header at `:249-255` names `container.env`/`services.*.env` as a known parser blind spot and implicitly relies on the runtime half to cover it — but the runtime half structurally cannot see those either, so a mail credential injected through a container or service `env:` block is caught by NEITHER half, and the suite would send real mail (measured at 14 sends/run) with no failure of any kind."
    artifacts:
      - path: ".github/workflows/ci.yml"
        issue: "Line ~1321: `MAIL_KEY_UNDER_TEST: ${{ env.RESEND_API_KEY }}` reads the Actions `env` context, which is populated only from `env:` maps at workflow/job/step level — never from secrets, vars, or container/service env. The runtime refusal step is therefore 100% redundant with the parse-based check and adds zero real coverage, contrary to the must-have's literal claim that it refuses 'when a live mail credential is present in its environment'."
    missing:
      - "Read the actual process/container environment instead of the Actions `env` expression context — e.g. `if env | grep -qE \"^${PREFIX}\"; then ... exit 1; fi` inside the shell step (`env |` reads real process env, which DOES include container/service-injected variables), sourcing the prefix from `scripts/verify-workflows.mjs`'s `MAIL_KEY_PREFIX` so the two halves cannot drift, per the fix sketched in 19-REVIEW.md CR-01."
      - "Correct the header at `.github/workflows/ci.yml:241-255` once fixed: state which half now actually closes the container/service blind spot, and correct the 'fires a minute before any browser starts' claim — jobs 1 and 5 declare no `needs:` and start in parallel, so job 1 failing does not stop job 5 from booting the app and sending mail."
human_verification:
  - test: "Reconfirm with the PM whether CI-01's current closure state — `gate-e2e` runs the full functional suite and provably turns the workflow run red on a real failure (two watched, reverted mutations in real CI runs), but (a) is not a required branch-protection check because branch protection is unreachable on this GitHub plan (403 — Free private repo), and (b) the `ci` workflow run is now red on EVERY push/PR because of 14 pre-existing, reproducible e2e failures with no expected-failure boundary — is acceptable to ship as-is, or should a follow-up phase (suite repair + baseline regen, the billing/visibility decision, and — per the fresh review's CR-02 — either a deliberate `continue-on-error` or a checked-in known-failures allowlist) be scheduled before this milestone ships."
    expected: "A recorded PM decision, updated from the mid-phase call in 19-08-SUMMARY.md to account for the new information in 19-REVIEW.md CR-02: the file's own header claims `gate-e2e` 'REPORTS; IT DOES NOT BLOCK', but the workflow's `ci` RUN (not just the required-check status) is provably red on every push today, which is in tension with the same file's binding rule #1 ('a phase cannot be marked complete with CI red') — a rule that predates and is not scoped to phase 19, but that phase 19's own gate now triggers on every run."
    why_human: "Repository visibility/GitHub-plan spend, whether to fund a suite-repair phase now versus later, and whether a permanently-red `ci` workflow run is an acceptable interim state for the whole project (not just phase 19) are product/business/scheduling decisions no codebase check can resolve. This item updates rather than duplicates the identical item already raised in the prior 19-VERIFICATION.md, now carrying the new CR-02 evidence (no `continue-on-error`, no known-failure boundary, and the binding-rule-#1 tension) so the PM decision is made against complete information."
  - test: "Have a person read the rendered D-03 notice on `/host/listings` after a genuine creation failure (e.g. by temporarily forcing `createDraftListing`'s insert to reject in a local/staging environment) and judge whether the calm, muted copy above the grid — naming the state, the reason and the way out — actually reads as adequate and non-alarming to a host who just lost a creation attempt."
    expected: "A human confirms the notice is legible, calm, and does not imply a verification problem, matching 19-07's design intent."
    why_human: "19-10-SUMMARY.md's own coverage (item D8) marks this explicitly `human_judgment: true` with no automated verification: reachability, routing and copy content are all machine-proven (via `tests/listing/create-failure.test.ts`, `tests/listing/create-routing.test.ts`, and the byte-unchanged `create-signal.ts` diff), but whether the rendered sentence reads as calm and adequate is a UX judgement no assertion makes. This is a newly-reachable surface (the branch was unreachable before 19-10), so it has never been looked at by a person."
---

# Phase 19: Host Listing Surfaces & Gates That Actually Run Verification Report

**Phase Goal:** A host's own listing grid renders honestly and creating a listing lands where it
should — and the specs that would catch a regression run in CI instead of only by hand.
**Verified:** 2026-09-04
**Status:** gaps_found
**Re-verification:** Yes — after gap closure (plans 19-09, 19-10, 19-11)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On `/host/listings`, cards in a row end at the same bottom edge and every control stays inside its card at 320px, two-column and three-column bands (HSURF-01, SC1) | ✓ VERIFIED (regression check — unaffected by gap closure) | `src/components/listing/listing-card.tsx` unchanged by plans 19-09/19-10/19-11 (not in their `files_modified`). `CardFooter` still carries `gap-2 mt-auto flex-wrap` at `:471`; `tests/design/listing-card-merge-order.test.ts` still passes structurally pinning the append order. |
| 2 | A host who presses *Create listing* lands on the edit wizard, not "We couldn't find that page" (HSURF-02, SC2) | ✓ VERIFIED (regression check) | `19-FINDING-404.md` reproduction gate unchanged; `e2e/axe-sweep.spec.ts`'s `mintDraftListing()` and `e2e/host-route-reachability.spec.ts` unaffected by the gap-closure plans, which touched `src/app/actions/listing.ts`, `new/page.tsx`, `create-signal.ts`, `scripts/verify-workflows.mjs` and `ci.yml` only. |
| 3 | The 404's cause is reproduced and identified before any source file is touched; if it does not survive a clean production build, no application file changes (HSURF-02, SC3) | ✓ VERIFIED (regression check) | `19-FINDING-404.md` unchanged this round; `git status --porcelain "src/app/(host)/host/listings/[id]/"` still empty (asserted by 19-09/19-10's own verification steps). |
| 4 | Opening a pull request runs the repository's functional Playwright specs, and a failing spec turns the run red — proven by watching one fail (CI-01, SC4, literal text) | ✓ VERIFIED | Unaffected by, and strengthened by, 19-11: `gate-e2e` still runs `npx playwright test --project=chromium` on `pull_request`/`push`, and two real reverted mutations already proved the run-red property in actual CI (`33843226846`, `33842567618`). 19-11 additionally added three parse-based invariants that make the gate harder to silently detach (run-by-name, unconditional, seed-before-suite by index), each watched red under a real, reverted mutation — re-verified this session: `node scripts/verify-workflows.mjs` exits 0 at 44 invariants (baselines=11, ci=26, cross=7), confirmed by direct execution. |
| 5 | `gate-e2e` functions as a gate that blocks a regression from merging, not only one that reports it | ⚠️ (not a literal SC4 clause, recorded for completeness — see Human Verification) | Still not a required branch-protection check (403 — GitHub plan/visibility, unchanged). NEW this round: `19-REVIEW.md` CR-02, independently re-verified — `gate-e2e` carries no `continue-on-error` (confirmed: `grep -n "continue-on-error" .github/workflows/ci.yml` matches only a comment in the invariant description, not the job), so the `ci` WORKFLOW RUN itself (distinct from required-check status) is genuinely red on every push today, per the phase's own evidence (`evidence/gate-e2e-wallclock.txt:20`: `job conclusion failure`, 14 real test failures). The header's "IT REPORTS; IT DOES NOT BLOCK" claim is true of branch protection and imprecise about workflow-run status — see Human Verification item 1. |
| 6 | A draft the host has genuinely started editing is NEVER reused (D-02, 19-06/19-09 must_have, underpins "creating a listing lands where it should") | ✓ VERIFIED — GAP 1 CLOSED | `src/app/actions/listing.ts:347` — third `NOT EXISTS` conjunct on `availability_block`, confirmed present by direct read. `tests/design/listing-reuse-predicate-census.test.ts` (369 lines, DB-free, build-blocking, wired into `npm run build` via `test:design`) derives all 7 children of `listing` from `src/lib/db/schema.ts` at runtime and requires each covered-or-exempted; re-run this session (`vitest run --config vitest.design.config.ts`, 11/11 passed). `tests/listing/crud.test.ts`'s `(D-02 · case 4)` re-run this session against the live test DB: 1 passed. |
| 7 | A host whose listing creation genuinely fails (infrastructure failure) lands back on the grid with a sentence naming what happened (D-03, 19-07/19-10 must_have) | ✓ VERIFIED — GAP 2 CLOSED | `src/app/actions/listing.ts:270-370` — `try` opens after both refusal checks return, wraps the reuse-read AND the insert, `catch` logs under `[listing:create]` and returns `{ ok: false, error: LISTING_CREATE_FAILED_STATE }`; confirmed present by direct read. `tests/listing/create-failure.test.ts` re-run this session against the live test DB: 5/5 passed (rejecting insert, sync-throw insert, throwing reuse read, control, refusal-not-swallowed). `!res.id` dead code in `new/page.tsx` is now type-impossible via `CreateDraftListingResult`. |
| 8 | `gate-e2e` refuses to run when a live mail credential is present in its environment, and says so with an `::error::` line before anything boots (D-14, 19-01-PLAN must_have, requirement CI-01) | ✗ FAILED — NEW GAP | See `gaps` frontmatter. `.github/workflows/ci.yml`'s runtime mail-refusal step reads `${{ env.RESEND_API_KEY }}`, the Actions expression `env` context (workflow/job/step `env:` maps only) — never the real process/container/service environment. It is 100% redundant with the separately-existing parse check and adds zero real coverage; the one blind spot the header names as carried-forward (`container.env`/`services.*.env`) is covered by neither half. |

**Score:** 6/7 truths verified (excluding row 5, which is explicitly non-literal and carried as an informational/human-verification row, consistent with the prior verification round's treatment)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.github/workflows/ci.yml` | `gate-e2e` job, D-14 mail refusal step, honest header | ⚠️ PARTIAL | `gate-e2e` job present and unconditional (confirmed); header now states 5 jobs and falsifies the old exclusion claim in place (19-11, re-verified: parsed tree identical to HEAD, comment-only diff). The D-14 runtime step is present but **inert** — see gap 8. |
| `scripts/verify-workflows.mjs` | Mail-prefix env-key refusal, `gate-e2e` existence + display-name + run-by-name + unconditional + seed-order invariants | ✓ VERIFIED | 44 invariants, exit 0 — re-run directly this session, not merely trusted from a SUMMARY. |
| `src/app/actions/listing.ts` (`createDraftListing`) | Reuse-then-mint (complete, censused) + verification gate + failure signal (reachable) | ✓ VERIFIED, WIRED | Both prior gaps closed; re-verified by direct read and by re-running the relevant test files against the live tree. |
| `tests/design/listing-reuse-predicate-census.test.ts` | Standing, build-blocking completeness gate on the reuse predicate | ✓ VERIFIED, WIRED | New this round (19-09); 369 lines; runs under `vitest.design.config.ts`, which is part of `npm run build` → `lint && test:design && next build`, confirmed via `package.json:11,33`. |
| `tests/design/listing-create-refusal-routing.test.ts` | Standing, build-blocking census keeping the refusal set and the page router in agreement | ✓ VERIFIED, WIRED | New this round (19-10); re-run this session alongside the reuse-predicate census (11 tests total, both files, all passed). |
| `tests/listing/create-failure.test.ts`, `tests/listing/create-routing.test.ts` | D-03 behavioral proof: resolves `{ ok: false }`, correct three-way routing | ✓ VERIFIED | Re-run this session against the live test DB: 5/5 passed (create-failure). |
| `src/lib/listing/create-signal.ts`, `.../new/page.tsx`, `.../listings/page.tsx` | D-03 copy module + query-param plumbing + render slot, now REACHABLE | ✓ VERIFIED, WIRED | The branch this plumbing serves is reachable for the one case (genuine infra failure) it was built for, per gap 7's closure. `create-signal.ts`'s five exported constants are byte-unchanged (confirmed by 19-10's own diff evidence, not independently re-diffed this session). |
| `e2e/host-listing-grid.spec.ts`, `e2e/host-route-reachability.spec.ts` | Guards A+B, three bands; anonymous routing guard | ✓ VERIFIED, WIRED (regression) | Unaffected by gap-closure plans. |
| `evidence/gate-e2e-wallclock.txt` | D-13 measurement | ✓ VERIFIED (regression) | Unchanged; also the source evidence for gap 8's Human Verification item 1 (job conclusion `failure`, 14 real failures). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `e2e/host-listing-grid.spec.ts` | `gate-e2e` job | `playwright.config.ts` `testMatch: e2e/*.spec.ts` | ✓ WIRED (regression) | Unchanged. |
| `new/page.tsx` failure branch | `src/lib/listing/create-signal.ts` | Query param `LISTING_CREATE_FAILED_PARAM` | ✓ WIRED AND REACHABLE | Previously wired-but-unreachable (gap 7); now reachable per the try/catch closure — re-verified via `tests/listing/create-routing.test.ts` claim in 19-10-SUMMARY and independently by reading the guarded region. |
| `createDraftListing` reuse predicate | `availability_block` table | `NOT EXISTS` conjunct | ✓ WIRED | Previously NOT WIRED (gap 6); now present at `listing.ts:347`, re-verified by direct read and by re-running `tests/listing/crud.test.ts -t availability_block`. |
| `gate-e2e` runtime mail step | Actual process/container/service environment | `env:` shell substitution | ✗ NOT WIRED (new finding) | The step reads the Actions `env` EXPRESSION context, not the real process environment — see gap 8. It cannot observe a credential injected via `container.env`, `services.*.env`, or any channel other than the one the parse-based check already independently catches. |
| `gate-e2e` (job) | branch protection required-check list | GitHub repository setting | ✗ NOT WIRED (regression, unchanged) | Still 403; still a recorded PM hold, not an oversight. |
| `gate-e2e` job conclusion | `ci` workflow run status | (no `continue-on-error`) | ⚠️ WIRED, BUT PERMANENTLY TRIPPED | 19-11 deliberately made this unconditional (correct per its own must-haves), but the consequence — `ci` red on every push, given 14 pre-existing failures — is now in tension with the file's own binding rule #1. See Human Verification item 1. |

### Data-Flow Trace (Level 4)

Not separately applicable — this phase is CI config + a card layout fix + server-action branches, not a data-rendering surface with a DB-vs-UI chain beyond what's covered in Key Link Verification above.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| D-02 case 4 (availability_block loophole closed) against the live test DB | `npx vitest run tests/listing/crud.test.ts -t "availability_block"` | 1 passed | ✓ PASS |
| D-03 failure signal (try/catch, three-way routing) against the live test DB | `npx vitest run tests/listing/create-failure.test.ts` | 5 passed | ✓ PASS |
| Both new gap-closure design gates, DB-free | `npx vitest run --config vitest.design.config.ts tests/design/listing-reuse-predicate-census.test.ts tests/design/listing-create-refusal-routing.test.ts` | 11 passed | ✓ PASS |
| Full workflow-verifier invariant set | `node scripts/verify-workflows.mjs` | exit 0, "All 44 invariants hold across 3 section(s) (baselines=11, ci=26, cross=7)" | ✓ PASS |
| Type-check the whole tree | `npx tsc --noEmit` | exit 0, no diagnostics | ✓ PASS |
| `gate-e2e` runtime mail step reads real env vs. Actions `env` context | Read `.github/workflows/ci.yml:1305-1321` directly | Confirmed: `${{ env.RESEND_API_KEY }}` resolves only from workflow/job/step `env:` maps, never real process/container/service env | ✓ CONFIRMED (defect present — CR-01) |
| `gate-e2e` `continue-on-error` presence | `grep -n "continue-on-error" .github/workflows/ci.yml` | Only a comment in the invariant's description string matches; the job itself carries none | ✓ CONFIRMED (CR-02's technical premise holds) |
| `unlistListing`/`softDeleteListing` + `ConfirmDialog`'s `onConfirm` try/catch (WR-01, fresh review, NOT assigned to gap closure) | Read `listing-card.tsx:186-195`, `:345-357` and `listing.ts:794-808` directly | No `try`/`catch` anywhere in the chain; a rejecting action leaves the dialog reading "Working…" forever | ✓ CONFIRMED (defect present, WARNING severity, carried forward — not part of this phase's declared must-haves) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention found in this repository; covered under Behavioral Spot-Checks above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| HSURF-01 | 19-02, 19-03 | Cards align, controls stay inside card at every width | ✓ SATISFIED | Truth #1. Unaffected by this round's gap-closure or new findings. |
| HSURF-02 | 19-04..19-07, 19-09, 19-10 | Creating a listing lands on the wizard, not a 404 | ✓ SATISFIED | The named requirement's literal text (truths #2/#3) was already satisfied. The two plan-declared must-haves that were previously FAILED (D-02, D-03 — truths #6/#7) are now VERIFIED, closed by 19-09/19-10 and independently re-confirmed this session. |
| CI-01 | 19-01, 19-08, 19-11 | Functional Playwright specs run in CI as a new job | ⚠️ PARTIALLY SATISFIED | SC4's literal text (truth #4) is SATISFIED and 19-11 strengthened the gate's tamper-resistance. But a plan-declared must-have under this same requirement — D-14's fail-closed mail-credential refusal (truth #8) — is FAILED, newly discovered this session. The "blocks, not just reports" property (truth #5) remains unmet and is a recorded PM hold, now reinforced by CR-02's finding that the `ci` run is permanently red. |

No orphaned requirements — all three IDs declared across the 11 plans are exactly the three REQUIREMENTS.md maps to Phase 19. (Note: `.planning/REQUIREMENTS.md`'s own traceability table at the time of this verification shows `HSURF-01 | Phase 19 | Gaps Found`, which is STALE — HSURF-01 was never one of the failed must-haves in either verification round; both `19-VERIFICATION.md` rounds' gaps were against HSURF-02 and CI-01 only. This is a documentation-tracking drift in REQUIREMENTS.md itself, not a code defect, and is flagged here rather than silently corrected.)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.github/workflows/ci.yml` | ~1305-1321 | D-14 runtime mail-credential refusal reads the Actions `env` expression context, not real process/container/service env — 100% redundant with the parse-based check, zero real coverage | 🛑 Blocker | The one blind spot the file's own header names as carried-forward (`container.env`/`services.*.env`) is covered by NEITHER of the "two halves" D-14 claims to have; a credential injected that way sends real mail (measured: 14/run) with no failure of any kind. |
| `.github/workflows/ci.yml` | :50, :437 | Header states "IT REPORTS; IT DOES NOT BLOCK" without distinguishing required-check status (true) from workflow-RUN status (false — the run is provably red on every push given 14 pre-existing failures, no `continue-on-error`) | ⚠️ Warning | In tension with the same file's binding rule #1 ("a phase cannot be marked complete with CI red"). Reinforces, rather than replaces, the already-recorded PM hold — routed to Human Verification item 1 rather than treated as a new blocking gap, since the underlying substantive fact (14 pre-existing failures, non-required check) was already disclosed before this round. |
| `src/components/listing/listing-card.tsx` | :186-195, :345-357 | `ConfirmDialog`'s `onClick` and `runAction` have no `try`/`catch` around the awaited server action | ⚠️ Warning | A rejecting `unlistListing`/`softDeleteListing` call (both themselves also missing `try`/`catch` at `listing.ts:794-899`) leaves the confirm button reading "Working…" forever with no toast and no way to retry without a reload. Same defect CLASS as the D-03 fix this phase shipped, not applied to these two sibling actions. Not a declared must-have of any phase-19 plan; carried forward per the fresh review, not closed this round. |
| `e2e/host-listing-grid.spec.ts` (guard failure messages), several other files | multiple | At least 11 verified-stale `<file>:<line>` citations, several inside gate failure messages read while the gate is red (WR-04, fresh review) | ⚠️ Warning | Cosmetic/misdirection risk for a future fixer, not a functional defect. Not independently line-by-line re-verified this session beyond spot-checking that the review's methodology (resolving each citation against HEAD) is sound; carried forward, not closed this round. |

No `TBD`/`FIXME`/`XXX` debt markers found in the files this phase modified that were read directly this session.

### Human Verification Required

See frontmatter `human_verification` — two items: (1) reconfirm the CI-01 non-required/permanently-red closure state with the PM, now carrying CR-02's additional evidence; (2) a human read of the D-03 grid notice's actual copy quality, newly reachable and never yet looked at by a person.

### Gaps Summary

**Both of the two gaps from the prior verification round are genuinely closed, independently re-confirmed** (not merely trusted from SUMMARY.md prose):

1. **GAP 1 (D-02, `availability_block` loophole) — CLOSED.** The third `NOT EXISTS` conjunct is present in `src/app/actions/listing.ts:347`, re-confirmed by direct read and by re-running `tests/listing/crud.test.ts`'s `(D-02 · case 4)` against the live test database (1 passed). Beyond the instance fix, 19-09 shipped a standing, build-blocking, DB-free census (`tests/design/listing-reuse-predicate-census.test.ts`) that derives every child table of `listing` from schema source and requires each be covered-or-exempted — closing the CLASS, not just this instance. Re-run this session: 11/11 passed across both new design gates.
2. **GAP 2 (D-03, unreachable failure signal) — CLOSED.** `createDraftListing` now wraps its reuse-read and insert in a `try`/`catch` that returns `{ ok: false, error: LISTING_CREATE_FAILED_STATE }`, re-confirmed by direct read of `src/app/actions/listing.ts:270-370` and by re-running `tests/listing/create-failure.test.ts` against the live test database (5 passed). The dead `!res.id` branch is now type-impossible rather than merely unreachable, via a narrowed `CreateDraftListingResult` type.

**One NEW gap was found this session**, surfaced by a fresh code review conducted after gap closure (`19-REVIEW.md`, committed `2123cad`) and independently re-verified by reading the actual workflow YAML directly rather than trusting the review's prose:

3. **D-14's runtime mail-credential refusal is inert (CR-01).** The step's `env: MAIL_KEY_UNDER_TEST: ${{ env.RESEND_API_KEY }}` resolves from the GitHub Actions expression `env` context — which is populated only from workflow/job/step `env:` maps, never from the real process, container, or service environment. This makes the runtime half 100% redundant with the separately-existing parse-based check, and means the ONE blind spot the file's own header names as carried-forward (`container.env`/`services.*.env`) is actually covered by NEITHER half — contrary to the header's implicit claim and contrary to the literal must-have text ("refuses to run when a live mail credential is present in its environment"). This is a genuine, verifiable defect in a security-relevant (privacy/cost) control, not a documentation nicety, and it was not part of either gap-closure plan's scope (19-09/19-10/19-11 touched `listing.ts`, `new/page.tsx`, `create-signal.ts`, `scripts/verify-workflows.mjs` and `ci.yml`'s header comments — none of them touched the runtime step's `env:` key).

**A second CRITICAL finding from the fresh review (CR-02) was evaluated and NOT treated as a new blocking gap**, on the reasoning that its underlying substantive fact — the `ci` workflow run is red on every push because of 14 pre-existing, reproducible e2e failures, and `gate-e2e` is not a required branch-protection check because branch protection is unreachable on this GitHub plan — was already fully disclosed in the prior verification round's Human Verification item and explicitly identified by this task's own orchestrator context as a known PM hold, scoped to a separate suite-repair effort, and not something to re-derive as a phase-19 gap. CR-02 adds real, useful detail (no `continue-on-error`, no expected-failure boundary, and a specific tension with the file's own binding rule #1) that was independently re-verified this session and is now folded into Human Verification item 1 so the PM's reconfirmation is made against complete information — but it does not, on its own, falsify SC4's literal text or any declared must-have, so it is not scored as a FAILED truth.

A WARNING-severity finding (WR-01, `ConfirmDialog`/`runAction` missing try/catch on the two sibling listing actions) was independently confirmed as real by direct code read but is not a declared must-have of any phase-19 plan and is carried forward rather than blocking this phase's closure.

---

_Verified: 2026-09-04_
_Verifier: Claude (gsd-verifier)_
