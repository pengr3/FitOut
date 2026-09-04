---
phase: 11-quality-gates-pattern-layer-app-shell
verified: 2026-08-17T11:56:34Z
status: human_needed
score: 11/11 requirement truths verified (1 with a recorded structural exception); 2 additional documentation-accuracy findings (non-blocking)
overrides_applied: 0
human_verification:
  - test: "Supply a real, monitored FitOut support address"
    expected: "src/lib/site.ts's SUPPORT_EMAIL flips from null to a real address; tests/design/site-contacts.test.ts's non-null branch goes green and the null branch's guard tests skip"
    why_human: "Business fact FitOut does not yet have (no owned domain/inbox). Cannot be verified or fabricated by code."
  - test: "Set NEXT_PUBLIC_APP_URL to the deployed production origin, then paste a listing/invite link into Slack/Messenger/iMessage and confirm the unfurl renders"
    expected: "metadataBase resolves to the real origin instead of http://localhost:3000; a pasted link shows a correct title, description and 1200x630 image"
    why_human: "Requires an owned, deployed domain plus an external crawler (Slack/Meta/X) that cannot reach localhost. Verified in this pass only as far as shape (absolute URL, 200 image/png at 1200x630 against localhost) — end-to-end unfurl is unprovable from this environment."
  - test: "Legal review of /terms and /privacy before they are treated as real policy"
    expected: "A qualified person supplies the six missing business facts (legal entity, registered address, governing law/forum, monitored contact, retention schedule, data-protection contact/regulator) and reviews the resulting copy"
    why_human: "Six facts are business/legal decisions outside what a codebase can supply; both pages are explicit, gated placeholders today (tests/design/legal-copy.test.ts enforces the placeholder notice and bans agreement language)."
  - test: "Decide whether DS-11's requirement text (and 11-UI-SPEC.md's 'Replaces' lists for ResultCard/RowCard) should be amended to reflect two structural refusals, the way D-26 formally amended AC#8"
    expected: "Either the requirement text is corrected to say '...every card surface uses one of the three, with two named, measured exceptions' and REQUIREMENTS.md's DS-11 row is flipped to Complete, or DS-11 is deliberately left Pending until a later phase resolves listing-card.tsx / notification-item.tsx"
    why_human: "This is a product/process decision (does a measured structural refusal count as satisfying the requirement, the way D-26 explicitly amended AC#8), not something a static check can settle. REQUIREMENTS.md itself currently disagrees with the other 10 IDs in this phase: DS-11 is the only one of the 11 still marked '[ ] Pending' rather than '[x] Complete'."
---

# Phase 11: Quality Gates, Pattern Layer & App Shell Verification Report

**Phase Goal:** Every later phase inherits gates that can actually fail, patterns it uses rather than grows, and an app shell that already has a header, a footer and all four state families — instead of inventing its own.
**Verified:** 2026-08-17T11:56:34Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Central Claim Verification — GATE-01's Four CI Runs

This is the phase's headline evidence and got the deepest scrutiny. Every run ID in `.github/workflows/ci.yml`'s header was independently re-fetched from the GitHub Actions API (`gh run view`, `gh api .../jobs`), not read from the file's own narrative or from a SUMMARY.

| # | Run | Claimed | API-verified | Match |
|---|-----|---------|--------------|-------|
| 1 | `32020141784` | `gate-db-free` RED — `detected dubious ownership`, caught by `gitignore-baselines.test.ts`'s guard-the-guard | `conclusion: failure`; log contains the exact string `AssertionError: \`git ls-files *-win32.png *-darwin.png\` could not be run ... fatal: detected dubious ownership` | ✓ EXACT |
| 2 | `32021215330` | GREEN, first real comparison, 32 passed / 2 skipped | `conclusion: success` | ✓ |
| 3 | `32021666395` | RED — missing baseline, no `, writing actual.` clause, zero PNGs written, attempt 2 ("Re-run failed jobs", no code change) also FAILURE | `conclusion: failure`, `run_attempt: 2`; attempt-1 jobs show `gate-db-free: failure`, attempt-2 jobs (fetched separately) also show `gate-db-free: failure`; `retries: process.env.CI ? 2 : 0` in `playwright.config.ts` confirms the "initial attempt, Retry #1, Retry #2" language is Playwright-internal retries inside attempt 1, distinct from the GH Actions re-run that produced attempt 2 | ✓ EXACT |
| 4 | `32022459245` | GREEN, revert of #3 | `conclusion: success` | ✓ |
| 5 | `32022921641` | RED — footer border 1px→3px, 18 failed / 2 skipped / 14 passed, `root-not-found-1280-{court,grove}` PASS while `root-not-found-320-{court,grove}` and `auth-login` FAIL | `conclusion: failure`; job log line-by-line: `18 failed`, `14 passed (3.1m)`; test list confirms `✓ 47 root-not-found-1280-court.png`, `✓ 48 root-not-found-1280-grove.png` PASS while `✘ 41-46 root-not-found-320-*` and `✘ 50-61 auth-login-*` FAIL, and `terms-*`/`privacy-*` fail at all three widths | ✓ EXACT |
| 6 | `32023529691` | GREEN, revert of #5 | `conclusion: success` | ✓ |
| 7 | `32024712530` | Final green, all three jobs, matches HEAD `f57de18` | `conclusion: success`; all 3 jobs (`gate-db-free`, `gate-db`, `gate-price-parity`) `success` | ✓ |

**Conclusion: the central claim is true, not merely narrated.** GATE-01 has been driven to a real, reproducible failure four separate times (a genuine accidental one plus three deliberate probes), each with a distinct, correctly-predicted-or-corrected failure signature, and each restored to green afterward. This is the opposite of a rubber stamp.

**One qualification found during this verification, not in the phase's own record:** the ci.yml header states the `--border`/`--background` blind spot (finding 5, condition (c)) has a compensating control — *"Divider geometry is asserted by `tests/design/**` on the emitted stylesheet instead."* Searching the actual test suite (`tests/design/*.test.ts`, `config/design-leak-patterns.mjs`'s 5 pattern ids: `raw-hex`, `color-function`, `arbitrary-text-px`, `palette-class`, `white-black-class`) found **no test that would catch a border-width change** such as the `border-t` → `border-t-[3px]` mutation used to drive this exact probe — DS-13's leak gate bans arbitrary hex/colour-function/text-px/palette values but not arbitrary border-width utilities, and no `tests/design/*.test.ts` file asserts `site-footer.tsx`'s border class or width. **The stated compensating control does not exist today.** This does not invalidate GATE-01 (its actual roadmap text — baselines exist, generated only in Docker, CI fails on a missing baseline — is fully proven above) but the specific sentence claiming a second line of defense for this named blind spot is inaccurate and should be corrected or the blind spot should be given a real regression test. Flagged as a WARNING, not a BLOCKER — see Anti-Patterns below.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GATE-01 — VR baselines exist, generated only in the pinned Docker image, CI fails on a missing baseline | ✓ VERIFIED | 7/7 CI runs independently re-verified via `gh api` (see table above); `grep -c -- "--update-snapshots" .github/workflows/ci.yml` = 0; `git ls-files "*-win32.png" "*-darwin.png"` empty; 25 `*-linux.png` baselines committed |
| 2 | GATE-04 — a structural-selector (`data-testid`) inventory exists and is checked | ✓ VERIFIED | `src/lib/design/selector-contract.ts` (110+ lines, real inventory, "zero at baseline" measured); `tests/design/selector-contract.test.ts` — 7/7 passed on direct run |
| 3 | GATE-05 — money/availability computation cannot cross into a client component; DOM price equals the DB's frozen price | ✓ VERIFIED | `import "server-only"` present in `src/lib/booking/{all-in-rate,pricing}.ts`, `src/lib/payments/{commission,fees}.ts`; `e2e/price-parity.spec.ts` exists, reads rendered total vs `postgres.js`-queried persisted total, runs as CI job 3 (`gate-price-parity`, green on final run) |
| 4 | STATE-01 — every data-backed route has a loading skeleton built from shared measurement constants, no layout shift | ✓ VERIFIED | 20 `loading.tsx` files under `src/app/`; `tests/design/loading-coverage.test.ts` passed; `e2e/skeleton-geometry.spec.ts` run live against a real browser and Postgres — 6/6 passed (panel, row-list, card-grid geometry, both themes) |
| 5 | STATE-02 — every route group has an error boundary (retry + route out), a global error page, not-found for a missing listing and for the root | ✓ VERIFIED | 5 `error.tsx` (root, app, host, auth, legal) + `global-error.tsx` + 3 `not-found.tsx` (root, listing detail, invite token) all present; `e2e/error-leak.spec.ts` run live — 3/3 passed (no server error text in DOM, two keyboard-reachable actions); `tests/design/error-boundaries.test.ts` and `global-error.test.ts` passed |
| 6 | STATE-04 — every list surface has a designed empty state; host inbox-zero reads positive | ✓ VERIFIED | `tests/design/empty-state-adoption.test.ts` passed; `NON_EMPTY_STATE_DASHED` carries the one deliberate non-conversion (`search-results.tsx`'s inline fetch error) with an argued reason, closed by 11-18's own record, and a count-pinned anti-vacuity guard |
| 7 | SHELL-01 — public routes have a real site header, one nav landmark, geometry that does not move when the auth slot resolves | ✓ VERIFIED | `e2e/shell.spec.ts` run live — 18/18 passed: header 56px/64px in both themes across 3 compositions, byte-identical header/brand boxes before/after auth slot resolution, exactly 1 nav landmark at 320/1280px, checkout composition renders 0 header anchors and no footer, host composition visually distinct |
| 8 | SHELL-02 — a footer with policy, support and contact links exists across the app | ✓ VERIFIED (with a recorded, gated exception) | `SiteFooter` mounted in 7 files (`(app)`, `(auth)`, `(host)/host`, `(legal)`, `(public)`, `listings/[id]/(detail)`, `not-found.tsx`) — matches `(legal)/layout.tsx`'s own "SEVENTH mount site" claim; `SUPPORT_EMAIL` is `null` by D-26 (a formally recorded UI-SPEC amendment — see below), footer renders no support entry; `tests/design/site-contacts.test.ts` run directly — 23 passed / 3 skipped, gating **both** the null and non-null states |
| 9 | SHELL-04 — a pasted listing/invite link renders correct title, description and a token-driven share image | ✓ VERIFIED IN SHAPE; BLOCKED FOR END-TO-END PROOF (recorded, not claimed) | `curl http://localhost:3000/opengraph-image` → `200 image/png`, PNG header decoded to exactly `1200x630`; `og:image` meta tag present and absolute; `NEXT_PUBLIC_APP_URL` confirmed unset (`grep -c` = 0), so the emitted URL is `http://localhost:3000/...` — unreachable to any real crawler. 11-20-SUMMARY.md states this as "BLOCKED... not merely untested," not as complete |
| 10 | RESP-01 — one mobile-overlay primitive (`responsive-dialog`) adopted app-wide, no second sheet mechanism | ✓ VERIFIED | `src/components/patterns/responsive-dialog.tsx` exists; imported and used by `site-chrome.tsx`'s host nav drawer; no `ui/sheet.tsx` file exists; `src/lib/design/selector-contract.ts` and `site-chrome.tsx` both assert the absence |
| 11 | DS-11 — three named card patterns exist, every card surface uses one of them | ⚠ VERIFIED WITH RECORDED STRUCTURAL EXCEPTION | `ResultCard`, `RowCard`, `PanelCard` exist and are adopted on 10 of 12 targeted surfaces; `tests/design/card-pattern-coverage.test.ts` (11/11 passed) declares `listing-card.tsx` and `notification-item.tsx` as `status: "refused"` with a measured, argued reason each (jsdom adoption-agency parse for the former, four independent structural reasons for the latter) rather than silently skipping them. **However:** `REQUIREMENTS.md` itself still marks DS-11 `[ ]` / "Pending" — the only one of this phase's 11 requirement IDs not flipped to `[x]` / "Complete" — and `11-UI-SPEC.md`'s own "Replaces" lists (lines 703, 727-728) were never corrected to remove the two refused surfaces, unlike D-26's formal, four-place amendment of AC#8. See human_verification item 4. |

**Score:** 11/11 truths hold (10 cleanly, 1 with a well-measured, well-recorded but formally un-amended exception).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.github/workflows/ci.yml` | GATE-01/04/05 CI enforcement, DB-free job proven DB-free | ✓ VERIFIED | 429+ lines, extensively documented; all claims cross-checked against live GitHub API data, not just read |
| `src/components/patterns/site-chrome.tsx`, `public-header.tsx` | SHELL-01 header compositions | ✓ VERIFIED, WIRED | Live e2e proof (18/18 shell.spec.ts) |
| `src/components/patterns/site-footer.tsx` | SHELL-02 footer | ✓ VERIFIED, WIRED | 7 mount sites confirmed by grep; contains 2 stale doc-drift comments (WR-02, already flagged by 11-REVIEW.md, unfixed at HEAD) |
| `src/app/opengraph-image.tsx`, `listings/[id]/opengraph-image.tsx`, `(public)/invite/[token]/opengraph-image.tsx` | SHELL-04 OG images | ✓ VERIFIED, WIRED, DATA FLOWS | Live HTTP fetch confirmed 200/image/png/1200x630 |
| `src/components/patterns/{empty-state,error-state,card-grid-skeleton,row-list-skeleton,panel-skeleton,page-header,responsive-dialog}.tsx` | STATE-01/02/04 + RESP-01 pattern layer | ✓ VERIFIED, WIRED | All present; adoption confirmed by passing gates + live e2e |
| `src/components/patterns/{result-card,row-card,panel-card}.tsx` | DS-11 card patterns | ✓ VERIFIED, WIRED (10/12 surfaces); 2 refused with recorded reasons | See Observable Truth 11 |
| `tests/design/*.test.ts` (39 files) | The design gate | ✓ VERIFIED | 39 files / 697 passed / 3 skipped, run directly by this verifier, matches orchestrator's independent measurement exactly |
| `e2e/visual/surfaces.spec.ts` + 25 committed baselines | GATE-01 visual regression | ✓ VERIFIED | Cannot run locally (win32 — Playwright's own guard refuses non-Linux `visual` project, confirmed live: "project 'visual' is NOT collected on win32"); verified instead via the 7-run CI API cross-check above, which is stronger evidence than a local run would be |
| `e2e/price-parity.spec.ts` | GATE-05 DB-vs-DOM check | ✓ VERIFIED, WIRED | File exists, real DB query + rendered-DOM comparison, runs as CI job 3, green on final run |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `ci.yml` job 1 (`gate-db-free`) | `mcr.microsoft.com/playwright:v1.60.0-noble` container | same tag as `baselines.yml` | ✓ WIRED | Confirmed by reading both workflow files; version pin matches `@playwright/test` in `package.json` |
| `site-footer.tsx` | `src/lib/site.ts`'s `SUPPORT_EMAIL` | conditional guard, no else-branch | ✓ WIRED | `site-contacts.test.ts` run directly — 23/23 relevant assertions passed against the live `null` state |
| `(legal)/layout.tsx`, `not-found.tsx`, 5 group layouts | `SiteFooter` | direct JSX composition | ✓ WIRED (7/7 sites) | `grep -rln "SiteFooter" src/app/` returned exactly 7 files |
| `site-chrome.tsx` host drawer | `responsive-dialog.tsx` | `<ResponsiveDialog>` JSX | ✓ WIRED | Confirmed by direct grep + import |
| `card-pattern-coverage.test.ts` | `ResultCard`/`RowCard`/`PanelCard` adopters | AST-parsed JSX call sites | ✓ WIRED | 11/11 tests passed live |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `opengraph-image.tsx` (root) | static card render | `THEME_TOKENS` + hardcoded copy | N/A (static image) | ✓ FLOWING — confirmed byte size (25,844) and pixel dimensions (1200x630) via direct HTTP fetch |
| `e2e/price-parity.spec.ts` | rendered price vs. `postgres.js` query | `SELECT` against a real seeded booking | ✓ real DB row, not a stub | ✓ FLOWING — file reads confirm a live query, not a static return |
| `site-footer.tsx` support entry | `SUPPORT_EMAIL` | `src/lib/site.ts` constant | Correctly `null` today, no fabricated fallback | ✓ FLOWING (honest null, not hollow) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Design gate runs and passes | `npx vitest run --config vitest.design.config.ts` | 39 files / 697 passed / 3 skipped | ✓ PASS |
| SUPPORT_EMAIL null-branch gate | `npx vitest run --config vitest.design.config.ts tests/design/site-contacts.test.ts` | 23 passed / 3 skipped | ✓ PASS |
| Card pattern coverage gate | `npx vitest run --config vitest.design.config.ts tests/design/card-pattern-coverage.test.ts` | 11 passed | ✓ PASS |
| Header geometry, auth-slot stability, nav landmark count, checkout carve-out, host distinctness | `npx playwright test e2e/shell.spec.ts --project=chromium` (live dev server + Postgres) | 18 passed | ✓ PASS |
| 320px floor, no horizontal scroll | `npx playwright test e2e/overflow-320.spec.ts --project=chromium` | 16 passed / 8 skipped (the 4 undthrowable error boundaries × 2 themes — matches deferred-items.md [11-21]) | ✓ PASS |
| Skeleton/resolved geometry match (±2px) | `npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium` | 6 passed | ✓ PASS |
| No server error text leaks to DOM | `npx playwright test e2e/error-leak.spec.ts --project=chromium` | 3 passed | ✓ PASS |
| OG image is real, correct-sized PNG | `curl http://localhost:3000/opengraph-image` + PNG header decode | `200 image/png`, `1200x630`, `25844` bytes | ✓ PASS |
| `NEXT_PUBLIC_APP_URL` genuinely unset (not just claimed) | `grep -c NEXT_PUBLIC_APP_URL .env.local` + live meta tag read | `0`; `og:image` resolves to `http://localhost:3000/...` | ✓ PASS (confirms the recorded blocker is real, not softened) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention is used by this phase; its "probes" are the four CI runs analyzed under Central Claim Verification above, which were executed as real GitHub Actions runs (not a local dry-run driver) and independently re-fetched via `gh api`/`gh run view` rather than trusted from the workflow file's own narrative.

### Requirements Coverage

| Requirement | Source Plan | Description (abridged) | Status | Evidence |
|---|---|---|---|---|
| DS-11 | 11-08, 11-10, 11-11, 11-13, 11-19 | Three card patterns, universal adoption | ⚠ SATISFIED WITH RECORDED EXCEPTION | See Observable Truth 11; REQUIREMENTS.md still shows `Pending` |
| STATE-01 | 11-08, 11-09, 11-17 | Loading states, no layout shift | ✓ SATISFIED | Live e2e geometry match |
| STATE-02 | 11-09, 11-18 | Error boundaries + not-found + global-error | ✓ SATISFIED | Live e2e leak test, file inventory |
| STATE-04 | 11-16, 11-21 | Empty states, positive inbox-zero | ✓ SATISFIED | Gate passed, exclusion argued and closed |
| SHELL-01 | 11-10, 11-12 | Real site header | ✓ SATISFIED | Live e2e, 18/18 |
| SHELL-02 | 11-14, 11-15 | Footer with policy/support/contact | ✓ SATISFIED (SUPPORT_EMAIL human_needed by explicit D-26 amendment) | site-contacts.test.ts, 7-site grep |
| SHELL-04 | 11-20 | Correct share preview | ✓ SATISFIED IN SHAPE, BLOCKED FOR PROOF (recorded, not overclaimed) | curl+PNG-decode; NEXT_PUBLIC_APP_URL confirmed unset |
| RESP-01 | 11-09 | One mobile-overlay primitive | ✓ SATISFIED | grep/import confirmation |
| GATE-01 | 11-02, 11-03, 11-22 | VR baselines, Docker-only, CI fails on missing baseline | ✓ SATISFIED, THOROUGHLY | 7-run GitHub API cross-check |
| GATE-04 | 11-01 | Structural-selector inventory | ✓ SATISFIED | Direct test run |
| GATE-05 | 11-01, 11-06 | Server-only money boundary + DOM-DB price parity | ✓ SATISFIED | server-only imports + live spec file |

**No orphaned requirements found** — all 11 IDs in `11-UI-SPEC.md`'s frontmatter and all 11 IDs given for this verification match `.planning/REQUIREMENTS.md`'s phase-11 row exactly (`DS-11, STATE-01/02/04, SHELL-01/02/04, RESP-01, GATE-01/04/05`, count 11).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/patterns/panel-card.tsx` | 3-6 | Stale "nobody yet adopts this" header comment; all 5 named surfaces adopted; cites a file path that no longer exists | ⚠ Warning (already flagged by `11-REVIEW.md` WR-01, confirmed still present at HEAD by this verifier) | Misleads a future reader into thinking adoption never happened or into adding a duplicate wrapper |
| `src/components/patterns/site-footer.tsx` | 16-19, 111-112 | Stale "SIX mount sites" / "`/terms`, `/privacy` DO NOT EXIST YET" comments; actual count is 7, both routes exist | ⚠ Warning (already flagged by `11-REVIEW.md` WR-02, confirmed still present at HEAD by this verifier) | Cross-file-inconsistent with `(legal)/layout.tsx`'s own "SEVENTH mount site" claim in the same diff |
| `.github/workflows/ci.yml` | 264-269 | Claims a compensating test ("Divider geometry is asserted by `tests/design/**` on the emitted stylesheet") for the `--border`/`--background` VR blind spot; no such test exists in the current suite (checked `config/design-leak-patterns.mjs`'s 5 pattern ids and grepped all of `tests/design/` for border-width assertions) | ⚠ Warning (new finding, not previously recorded) | A future border-width regression confined to that colour pair is invisible to BOTH the VR gate (measured, documented) AND to the design gate (claimed, not actually true) — the blind spot is larger than stated |
| `.planning/REQUIREMENTS.md` | 26, 186 | DS-11 checkbox `[ ]` / status `Pending`, the only one of phase 11's 11 IDs not flipped to `[x]` / `Complete`, with no formal amendment note (unlike D-26/AC#8's 4-place amendment) | ℹ️ Info / process gap | Not a code defect — a tracking-consistency question for the developer (see human_verification item 4) |

## Human Verification Required

### 1. Supply a real support address

**Test:** Set `src/lib/site.ts`'s `SUPPORT_EMAIL` to a real, monitored address.
**Expected:** The footer's support entry appears automatically (guard is `SUPPORT_EMAIL !== null`); `tests/design/site-contacts.test.ts` flips to its non-null branch and stays green.
**Why human:** FitOut owns no domain/inbox yet — this is a business fact, not a code gap. `carry-both` was explicitly selected at plan 11-14's checkpoint rather than fabricating a value.

### 2. Set `NEXT_PUBLIC_APP_URL` and confirm a real unfurl

**Test:** Deploy with `NEXT_PUBLIC_APP_URL` set to the real origin, then paste a listing or invite link into Slack/Messenger/X and observe the preview card.
**Expected:** Title, description and a correctly-sized image render from the real domain, not `localhost`.
**Why human:** Confirmed live during this verification that the env var is unset and every `og:image` resolves to `http://localhost:3000/...`, which no external crawler can reach. The shape (absolute URL, 200, 1200x630) is proven; the end-to-end unfurl is not provable from this environment, and 11-20-SUMMARY.md says so explicitly rather than claiming success.

### 3. Legal review of `/terms` and `/privacy`

**Test:** Have a qualified person supply the six missing facts (legal entity, registered address, governing law/forum, monitored contact, retention schedule, data-protection contact/regulator) and review the resulting copy.
**Expected:** Real ToS/Privacy content replaces the current gated placeholder, and `tests/design/legal-copy.test.ts` is deleted in the same commit (its own AC#4 requirement).
**Why human:** Fact-gathering and legal judgment outside what a codebase can supply or verify.

### 4. Decide DS-11's final status

**Test:** Review `tests/design/card-pattern-coverage.test.ts`'s two `"refused"` rows (`listing-card.tsx`, `notification-item.tsx`) and their measured reasons, then decide whether DS-11's requirement text and `11-UI-SPEC.md`'s "Replaces" lists should be formally amended (the way D-26 amended AC#8 in four places) or left open for a later phase.
**Expected:** Either `.planning/REQUIREMENTS.md`'s DS-11 row flips to `[x]`/"Complete" with an amendment citation, or it stays `Pending` with an owning phase named.
**Why human:** This is the one requirement of the 11 in this phase whose own tracking file disagrees with "Complete," and it is a product/process judgment call, not a fact a test can settle.

### Gaps Summary

No BLOCKER-level gaps were found. All 11 requirement truths for this phase hold, most of them proven directly against a live browser, a live Postgres and the real GitHub Actions API rather than taken from SUMMARY narrative. The phase's headline claim — that GATE-01 can actually fail — is the most thoroughly evidenced claim in the report: all 7 referenced CI run IDs were independently re-fetched and their conclusions, job-level results, and even individual test-line pass/fail markers matched the workflow file's documentation exactly, including a subtle prediction-was-wrong detail (`root-not-found-1280` passing while `root-not-found-320` failed under the same mutation).

Three items are carried forward as genuine, already-acknowledged human_needed business/infra dependencies (support address, deployed origin, legal content) — none of them a coding gap, all three explicitly recorded as blocked-not-claimed in their owning SUMMARYs. A fourth item asks the developer to make an explicit call on DS-11's formal status, since its own two structural refusals are excellently measured and argued but were never given the same formal amendment treatment SUPPORT_EMAIL's AC#8 received, leaving `REQUIREMENTS.md` internally inconsistent about whether phase 11's 11th requirement is done.

Two pre-existing Warning-level documentation-drift defects (stale "nobody adopts this" / "SIX mount sites" comments) were already caught by `11-REVIEW.md` and independently reconfirmed still present at HEAD by this verifier. One new Warning was found during this pass: a code comment in `ci.yml` claims a compensating test exists for GATE-01's known `--border`/`--background` blind spot, and no such test exists in the current suite — the blind spot is real and larger than the file currently admits.

None of these findings block the phase goal. The gates exist and can fail; the pattern layer exists and is adopted everywhere it structurally can be; the app shell has a header, a footer and all four state families, live-tested rather than assumed.

---

_Verified: 2026-08-17T11:56:34Z_
_Verifier: Claude (gsd-verifier)_
