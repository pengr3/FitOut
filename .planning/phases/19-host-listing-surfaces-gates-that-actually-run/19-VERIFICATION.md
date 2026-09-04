---
phase: 19-host-listing-surfaces-gates-that-actually-run
verified: 2026-09-04T16:10:00Z
status: gaps_found
score: 5/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "A draft the host has genuinely started editing is NEVER reused (D-02, 19-06 must_have)"
    status: failed
    reason: "The reuse-then-mint predicate in createDraftListing checks NOT EXISTS against listing_photo and operating_hours but not availability_block. src/app/actions/blocks.ts:129-135 (addBlock) inserts an availability_block row and never touches the listing row's updated_at, title, or any other column the predicate reads. A host who creates a draft, blocks a date on it via the shipped Availability page (reachable in two clicks from the grid), then presses Create listing again silently receives listing #1 back — with the blocked dates inherited into what they believe is a brand-new listing. This is the third instance of the exact class of loophole the two existing NOT EXISTS conjuncts were written to close (verified this run: CR-02 in 19-REVIEW.md, and confirmed independently by reading src/app/actions/listing.ts:226-250 and src/app/actions/blocks.ts:110-140)."
    artifacts:
      - path: "src/app/actions/listing.ts"
        issue: "Reuse predicate's NOT EXISTS set omits availability_block; the docblock's writer census (grep -n 'update(listing)' src/) also misses two raw-SQL UPDATE listing statements in ops-review.ts:667,751 (harmless today, but the stated verification method will keep missing writers)."
      - path: "src/app/actions/blocks.ts"
        issue: "addBlock writes a child row and performs no db.update(listing), so it does not bump updated_at and is invisible to the reuse predicate's staleness check."
    missing:
      - "A third NOT EXISTS conjunct: sql`NOT EXISTS (SELECT 1 FROM availability_block WHERE listing_id = ${listing.id})` alongside the listing_photo and operating_hours conjuncts."
      - "A fourth case in tests/listing/crud.test.ts's D-02 describe block, mirroring the existing photo-loophole case: insert an availability_block directly, assert updated_at === created_at still holds as the premise, then assert a second create returns a different id."
  - truth: "A host whose listing creation fails lands back on the grid with a sentence naming what happened and telling them they can try again (D-03, 19-07 must_have)"
    status: failed
    reason: "createDraftListing (src/app/actions/listing.ts:177-260) has no try/catch anywhere in the function. The only two { ok: false } paths are the no-session check and the verification-refusal check, both of which new/page.tsx redirects away from BEFORE calling the action. The db.select() reuse read and the db.insert() mint both throw uncaught on any infrastructure failure (dead connection, constraint violation, timeout), which propagates to Next's error boundary — the host sees a generic error page, not the D-03 sentence the grid was built to show. Confirmed independently by reading the full function body: every 'ok: true' path unconditionally sets an id, so the sibling `!res.id` check in new/page.tsx:84 is dead code. This is CR-01 in 19-REVIEW.md."
    artifacts:
      - path: "src/app/actions/listing.ts"
        issue: "No try/catch around the db.select()/db.insert() calls at :226 and :253 — the one failure mode the D-03 copy module, query token and grid notice were built to catch can never reach the branch that renders them."
      - path: "src/app/(host)/host/listings/new/page.tsx"
        issue: "!res.id at :84 is dead code (ok:true always carries an id); the two live windows this branch actually catches (session expiring between the page's and action's getSession reads; a suspension landing between the two loadHostVerification reads) both produce copy that create-signal.ts itself bans by name, because those refusals ARE verification refusals rendered as generic infra failure."
    missing:
      - "A try/catch around the reuse-read + insert in createDraftListing that returns { ok: false, error: <a distinct constant> } instead of throwing, per the fix sketched in 19-REVIEW.md CR-01."
      - "A test that stubs the DB layer to a rejecting insert and asserts createDraftListing() resolves { ok: false } rather than rejecting — none exists today; tests/listing/create-signal.test.ts only renders the destination with a hand-supplied searchParams, and tests/host/verification-surface.test.ts only greps page source for the token."
deferred: []
human_verification:
  - test: "Confirm with the PM whether CI-01's non-required gate-e2e (branch protection unreachable on this GitHub plan; 14 pre-existing e2e failures + stale visual baselines block a green run) is an acceptable phase-19 closure state, or whether it should route to a follow-up phase before ship."
    expected: "A recorded PM decision either accepting the non-required state (already partially recorded in 19-08-SUMMARY.md 'Decisions Made' §1) or scheduling the suite-repair/billing-plan follow-up."
    why_human: "This is a product/business decision (repository visibility or GitHub plan spend) and a scheduling decision (fund a suite-repair phase), neither of which a codebase check can resolve. The PM already made this call once mid-phase; this item asks it be reconfirmed at phase close since it materially affects whether 'the Playwright specs run in CI' functions as a real safety net or as a report nobody is forced to read."
---

# Phase 19: Host Listing Surfaces & Gates That Actually Run Verification Report

**Phase Goal:** A host's own listing grid renders honestly and creating a listing lands where it
should — and the specs that would catch a regression run in CI instead of only by hand.
**Verified:** 2026-09-04
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On `/host/listings`, cards in a row end at the same bottom edge and every control stays inside its card at 320px, two-column and three-column bands (HSURF-01, SC1) | ✓ VERIFIED | `src/components/listing/listing-card.tsx:471` — `CardFooter` carries `gap-2 mt-auto flex-wrap` appended last via `cn()`; `Card` at `:360` is byte-unchanged (`gap-0 pt-0`). `e2e/host-listing-grid.spec.ts` (guards A+B, three viewport bands) is watched RED pre-fix (19-02-SUMMARY) and GREEN post-fix (19-03-SUMMARY), and is **not** among the 14 tests failing in the real CI run recorded in `evidence/gate-e2e-wallclock.txt` — it passed in an actual GitHub Actions execution, not only locally. `tests/design/listing-card-merge-order.test.ts` (14 of the 61 vitest tests re-run this session, all green) structurally pins the append order so a future class edit cannot silently delete `mt-auto`/`flex-wrap`. |
| 2 | A host who presses *Create listing* lands on the edit wizard, not "We couldn't find that page" (HSURF-02, SC2) | ✓ VERIFIED | `19-FINDING-404.md` — VERDICT A: not reproduced under a clean dev server or a clean production build across all 11 anonymous probe URLs (rows 3-6, the subject rows, all serve `307 → /login`, meaning the module runs). Real behavioral proof beyond the reproduction gate: `e2e/axe-sweep.spec.ts`'s `mintDraftListing()` drives an **authenticated** host through `/host/listings/new` and asserts `page.waitForURL(/\/host\/listings\/[^/]+\/edit/)` — this spec is **not** among the 14 failures in the real CI run. `e2e/host-route-reachability.spec.ts` (19-06, new) adds a 2-second anonymous routing guard so a regression surfaces immediately with a diagnostic message rather than being re-diagnosed from scratch a third time; also not among the 14 failures. |
| 3 | The 404's cause is reproduced and identified before any source file is touched; if it does not survive a clean production build, no application file changes (HSURF-02, SC3) | ✓ VERIFIED | `19-FINDING-404.md` §1-5 — the reproduction gate ran exactly as specified: `.next/dev` evidence archived before any clean (19-04), 11-URL matrices run against both a clean dev server and a clean production build (19-05), verdict A reached, and per D-09 zero application files under `src/app/(host)/host/listings/[id]/` were touched — confirmed in the finding by `git status --porcelain` returning empty on that directory as an acceptance criterion. Two items (a) and (c) are left honestly OPEN with no cause invented; this is the finding's own stated scope, not a gap in verification. |
| 4 | Opening a pull request runs the repository's functional Playwright specs, and a failing spec turns the run red — proven by watching one fail (CI-01, SC4, literal text) | ✓ VERIFIED | `gate-e2e` exists in `.github/workflows/ci.yml:1105` as a new fifth job (`gate-price-parity`'s run command byte-unchanged), runs `npx playwright test --project=chromium` (the full functional set by project name), and fires on `pull_request`/`push`. Proven by watching, not by reading the file: two real, reverted mutations both went red in real CI runs — `e2e/host-listing-grid.spec.ts` assertion mutation caught by `gate-e2e` (run `33843226846`), and a dummy `RESEND_API_KEY` caught by `gate-db-free`'s parse-based check in ~1 minute (run `33842567618`). `node scripts/verify-workflows.mjs` exits 0 at 41 invariants including a hard-stop + display-name check that would catch silent job deletion/rename. |
| 5 | `gate-e2e` functions as a gate that blocks a regression from merging, not only one that reports it | ⚠️ (not a literal SC4 clause, recorded for completeness — see Human Verification) | `gate-e2e` is deliberately **not** a required status check. `19-08-SUMMARY.md` §"Task 3" records this as a PM decision (option 2: hold the flip), not an omission: branch protection is unreachable (`403 — Upgrade to GitHub Pro or make this repository public`, confirmed via `gh api` in the summary) and there is no green run to justify requiring it (14 reproducible e2e failures across ~10 spec files, plus stale visual baselines since 2026-08-30). SC4's literal text ("runs... and a failing spec turns the run red — proven by watching") is satisfied; the stronger property of actually blocking a merge is not, and is openly disclaimed in the summary ("Do not read CI-01's closure as 'the gate blocks', because it does not"). |
| 6 | A draft the host has genuinely started editing is never reused by the create-then-reuse branch (D-02, 19-06 must_have, underpins "creating a listing lands where it should") | ✗ FAILED | See `gaps` frontmatter. `src/app/actions/blocks.ts:129-135` writes an `availability_block` row without updating the `listing` row; the reuse predicate in `src/app/actions/listing.ts:226-250` does not check for one. Reachable in two clicks from the shipped grid (CR-02, `19-REVIEW.md`, independently confirmed by reading both files). |
| 7 | A host whose listing creation genuinely fails (infrastructure failure) lands back on the grid with a sentence naming what happened (D-03, 19-07 must_have) | ✗ FAILED | See `gaps` frontmatter. `createDraftListing` has no `try`/`catch`; the one failure mode the D-03 signal was built for (an insert that does not land) throws instead of returning `{ ok: false }` and never reaches the branch that renders the sentence (CR-01, `19-REVIEW.md`, independently confirmed by reading `src/app/actions/listing.ts:177-260`). |

**Score:** 5/7 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.github/workflows/ci.yml` | `gate-e2e` job, D-14 mail refusal step | ✓ VERIFIED | Present at `:1105-1253`, matches PLAN 19-01/19-08 must_haves. |
| `scripts/verify-workflows.mjs` | Mail-prefix env-key refusal, `gate-e2e` existence + display-name invariants | ✓ VERIFIED | 41 invariants, exit 0 (orchestrator-supplied fact, cross-checked against 19-08-SUMMARY's own count). |
| `src/components/listing/listing-card.tsx` | Footer-flush fix, icon-only Delete, Card byte-unchanged | ✓ VERIFIED | Read directly; matches D-05/D-06/D-07 as claimed. |
| `tests/design/listing-card-merge-order.test.ts` | Standing gate on `cn()` append order | ✓ VERIFIED | Present, 61-test file (shared with 3 others) all green this session. |
| `e2e/host-listing-grid.spec.ts` | Guards A+B, three bands | ✓ VERIFIED, WIRED | Rides `gate-e2e` automatically via `testMatch`; passes in real CI run. |
| `.planning/.../evidence/*` (19-04, 19-05) | Archived manifests, mtimes, orphan-draft record, probe matrices | ✓ VERIFIED | Present on disk (`19-FINDING-404.md` references and quotes them). |
| `e2e/host-route-reachability.spec.ts` | Anonymous routing guard, 4 routes | ✓ VERIFIED, WIRED | Present, joins `chromium` project, passes in real CI run. |
| `src/app/actions/listing.ts` (`createDraftListing`) | Reuse-then-mint + verification gate + failure signal | ⚠️ STUB (partial) — see gaps 6, 7 | Verification gate and reuse-read exist and are wired, but two of the three behaviors the file's own docblock claims (complete reuse coverage, infra-failure signal reachability) are not actually true. |
| `src/lib/listing/create-signal.ts`, `.../new/page.tsx`, `.../listings/page.tsx` | D-03 copy module + query-param plumbing + render slot | ⚠️ ORPHANED for its stated purpose | The plumbing is real and wired (query param → rendered notice, verified via `tests/listing/create-signal.test.ts`), but the one caller that was supposed to reach it (a genuine infra failure) cannot, per gap 7. |
| `evidence/gate-e2e-wallclock.txt` | D-13 measurement | ✓ VERIFIED | Present, contains run IDs, per-step durations, and the 14-failure list. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `e2e/host-listing-grid.spec.ts` | `gate-e2e` job | `playwright.config.ts` `testMatch: e2e/*.spec.ts` | ✓ WIRED | No workflow edit needed; confirmed by the spec count moving 37→39 as both new specs joined automatically (19-08-SUMMARY). |
| `new/page.tsx` `!res.ok` branch | `src/lib/listing/create-signal.ts` | Query param `LISTING_CREATE_FAILED_PARAM` | ✓ WIRED (plumbing) / ✗ UNREACHABLE (for its stated purpose) | The wiring is real, but per gap 7 the branch it's wired to is dead for genuine infra failures — only reachable for the two verification-refusal races described in CR-01, both of which render the wrong copy. |
| `createDraftListing` reuse predicate | `availability_block` table | `NOT EXISTS` conjunct | ✗ NOT WIRED | Per gap 6 — the conjunct does not exist; `blocks.ts`'s writer is invisible to the predicate. |
| `gate-e2e` (job) | branch protection required-check list | GitHub repository setting | ✗ NOT WIRED | Confirmed via `gh api .../branches/main/protection` returning 403 in `19-08-SUMMARY.md`; this is a repository-setting gap, not a code gap, and is a recorded PM hold rather than an oversight. |

### Data-Flow Trace (Level 4)

Not separately applicable — this phase is CI config + a card layout fix + a server-action branch, not a data-rendering surface with a DB-vs-UI chain beyond what's covered in Key Link Verification above.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CardFooter/Card/merge-order unit tests | `npx vitest run tests/design/listing-card-merge-order.test.ts tests/listing/create-signal.test.ts tests/listing/crud.test.ts` | 61 passed | ✓ PASS |
| `tests/host/verification-surface.test.ts` (isolated) | `npx vitest run tests/host/verification-surface.test.ts` | 11 passed | ✓ PASS |
| `createDraftListing` code inspection for CR-01 | Read `src/app/actions/listing.ts:177-260` | No `try`/`catch` present; confirms 19-REVIEW.md CR-01 | ✓ CONFIRMED (defect present) |
| Reuse predicate code inspection for CR-02 | Read `listing.ts:226-250` and `blocks.ts:110-140` | No `availability_block` conjunct; `addBlock` does not touch `listing` row | ✓ CONFIRMED (defect present) |
| `gate-e2e` job body | Read `.github/workflows/ci.yml:1105-1253` | Runs `--project=chromium`, seeds, migrates, refuses live mail key first | ✓ CONFIRMED as claimed |
| Real CI e2e run outcome | Read `evidence/gate-e2e-wallclock.txt` | 14 failed / 2 flaky / 366 passed / 39 specs; `host-listing-grid`, `host-route-reachability`, `axe-sweep` not among the 14 | ✓ CONFIRMED — phase-19 specs green in a real run |

Full suite / full CI run was **not** re-executed by this verification (per orchestrator-supplied facts already measured this run: build exit 0, vitest 2711/2711 non-skipped passed, `e2e/host-verification.spec.ts` 3/1 skip, `verify-workflows.mjs` 41 invariants exit 0). This verification instead read the source directly to confirm the two CRITICAL review findings and re-ran the four targeted vitest files as a spot check.

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention found in this repository; the phase's own reproduction-gate probes (11-URL matrices in `19-FINDING-404.md`) are treated as evidence documents rather than standing probes and are covered under Behavioral Spot-Checks / Key Link Verification above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| HSURF-01 | 19-02, 19-03 | Cards align, controls stay inside card at every width | ✓ SATISFIED | Truth #1 above. |
| HSURF-02 | 19-04, 19-05, 19-06, 19-07 | Creating a listing lands on the wizard, not a 404 | ⚠️ PARTIALLY SATISFIED | The named requirement text (lands on wizard, not 404) is SATISFIED — truths #2/#3. But two must_haves from the plans that ship under this requirement's banner (D-02 idempotent reuse, D-03 failure signal) are FAILED — truths #6/#7. The requirement's own literal text does not mention these, but the plans that closed it declared them as must_haves and the phase's own code review confirms both are unmet. |
| CI-01 | 19-01, 19-08 | Functional Playwright specs run in CI as a new job | ✓ SATISFIED (literal text) | Truth #4. Not required-check status — see truth #5 and Human Verification. |

No orphaned requirements — all three IDs declared across the 8 plans are exactly the three REQUIREMENTS.md maps to Phase 19.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/actions/listing.ts` | 226-260 | Missing try/catch — infrastructure failure throws instead of returning `{ ok: false }` | 🛑 Blocker | The D-03 signal (copy module, query token, grid notice) built specifically for this case can never fire for it (CR-01). |
| `src/app/actions/listing.ts` | 226-250 | Incomplete reuse predicate — `availability_block` writer invisible to the `NOT EXISTS` set | 🛑 Blocker | A host's second "new listing" can silently return an already-touched draft, inheriting blocked dates the host does not expect (CR-02). |
| `src/app/(host)/host/listings/new/page.tsx` | 84 | Dead code — `!res.id` can never be true given `createDraftListing`'s current return shape | ⚠️ Warning | Not independently harmful, but is a symptom of CR-01 rather than a separate issue. |
| `scripts/verify-workflows.mjs` | 622-664 | `gate-e2e` invariants assert job existence/shape but not that it runs the suite by name or is unconditional (WR-01, 19-REVIEW.md) | ⚠️ Warning | A future edit could detach the job from actually running Playwright while every invariant here stays green. Noted but not independently re-verified line-by-line this session; taken from 19-REVIEW.md, which read the actual script. |
| `.github/workflows/ci.yml` | 11-50 | Header prose describes 4 jobs / "eleven of twelve specs not run" — now false since `gate-e2e` runs the full functional set (WR-05, 19-REVIEW.md) | ⚠️ Warning | Documentation drift, not a functional defect; flagged by the phase's own review, not independently re-confirmed line-by-line here. |

No `TBD`/`FIXME`/`XXX` debt markers found in the files this phase modified that reviewer/verifier read directly.

### Human Verification Required

### 1. CI-01's non-required gate — reconfirm at phase close

**Test:** Ask the PM whether the phase-19 closure state for CI-01 (gate runs and turns red on a real failure, but is not a required status check, because branch protection needs GitHub Pro/public visibility and there is no green run yet) is acceptable to ship as-is, or whether a follow-up phase (suite repair + baseline regen, and the billing/visibility decision) should be scheduled before this milestone ships.
**Expected:** A recorded decision — either explicit acceptance (the PM already made a version of this call mid-phase per `19-08-SUMMARY.md`) or a scheduled follow-up.
**Why human:** Repository visibility / GitHub plan spend and phase-scheduling priority are product/business decisions no codebase check can resolve, and the phase's own summary explicitly declines to claim SC4's blocking property is met.

### Gaps Summary

Two of the phase's plan-declared must-haves are FAILED, both confirmed independently by reading the actual code (not merely trusting `19-REVIEW.md`):

1. **D-02's reuse predicate has a real, reachable hole (CR-02).** `addBlock` (`src/app/actions/blocks.ts:129-135`) writes an `availability_block` row without updating the parent `listing` row, and the reuse predicate in `createDraftListing` does not check for that table. A host can silently have their "new" listing be their old draft, with blocked dates inherited, via a two-click path from the shipped grid.

2. **D-03's failure-signal branch is unreachable for the one case it exists to catch (CR-01).** `createDraftListing` has no `try`/`catch`; a genuine infrastructure failure throws rather than returning `{ ok: false }`, so the host sees a raw error page instead of the calm, informative sentence the phase built for exactly this scenario.

Both are CRITICAL findings from this run's own code review (`19-REVIEW.md`), and both were independently re-confirmed by reading the relevant source files directly rather than trusting the review's or the SUMMARY's prose. Neither defect blocks the phase's headline claims (cards align, creation reaches the wizard, CI runs the specs) — all three of those are genuinely true and behaviorally proven in a real CI run. But both defects sit inside the same `createDraftListing` function that HSURF-02's plans (19-06, 19-07) declared specific, testable must-haves for, and those must-haves are not met as shipped.

CI-01's non-required-check state is recorded as a human-verification item rather than a gap: it is a known, PM-acknowledged limitation with two named external prerequisites (a GitHub billing/visibility decision, and a separate suite-repair phase), not a silent omission, and the requirement's own literal text ("specs run in CI, as a new job") is satisfied.

---

_Verified: 2026-09-04_
_Verifier: Claude (gsd-verifier)_
