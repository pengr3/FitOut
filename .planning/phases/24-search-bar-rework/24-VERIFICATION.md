---
phase: 24-search-bar-rework
verified: 2026-09-15T00:03:14Z
status: gaps_found
score: 28/42 must-haves verified
covered_files:
  - .github/workflows/baselines.yml
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - .planning/phases/24-search-bar-rework/24-01-PLAN.md
  - .planning/phases/24-search-bar-rework/24-01-SUMMARY.md
  - .planning/phases/24-search-bar-rework/24-02-PLAN.md
  - .planning/phases/24-search-bar-rework/24-02-SUMMARY.md
  - .planning/phases/24-search-bar-rework/24-03-PLAN.md
  - .planning/phases/24-search-bar-rework/24-03-SUMMARY.md
  - .planning/phases/24-search-bar-rework/24-04-PLAN.md
  - .planning/phases/24-search-bar-rework/24-04-SUMMARY.md
  - .planning/phases/24-search-bar-rework/24-05-PLAN.md
  - .planning/phases/24-search-bar-rework/24-05-SUMMARY.md
  - .planning/phases/24-search-bar-rework/24-06-PLAN.md
  - .planning/phases/24-search-bar-rework/24-06-SUMMARY.md
  - .planning/phases/24-search-bar-rework/24-07-PLAN.md
  - .planning/phases/24-search-bar-rework/24-07-SUMMARY.md
  - .planning/phases/24-search-bar-rework/24-08-PLAN.md
  - .planning/phases/24-search-bar-rework/24-08-SUMMARY.md
  - .planning/phases/24-search-bar-rework/24-REVIEW.md
  - e2e/axe-sweep.spec.ts
  - e2e/helpers/booker-seed.ts
  - e2e/helpers/visual-drive.ts
  - e2e/one-tree.spec.ts
  - e2e/price-parity.spec.ts
  - e2e/progressive-search.spec.ts
  - e2e/search-and-book.spec.ts
  - src/app/(public)/loading.tsx
  - src/app/(public)/page.tsx
  - src/app/dev/theme/page.tsx
  - src/components/listing/address-autocomplete.tsx
  - src/components/search/activity-step.tsx
  - src/components/search/location-step.tsx
  - src/components/search/party-step.tsx
  - src/components/search/search-experience.tsx
  - src/components/search/search-results.tsx
  - src/lib/design/live-regions.ts
  - src/lib/design/selector-contract.ts
  - src/lib/design/visual-baselines.ts
  - src/lib/search/query.ts
  - src/lib/validation/booking.ts
  - tests/design/brand-recipe.test.ts
  - tests/design/elevation-z.test.ts
  - tests/design/live-regions.test.tsx
  - tests/design/selector-contract.test.ts
  - tests/search/party-size-filter.test.ts
  - tests/search/progressive-search.test.tsx
  - tests/search/search-results-states.test.tsx
  - tests/validation/booking-schemas.test.ts
covered_digest: "v1:sha256:b1c9e81d354c69fd045f8dd23bc26a1e2fa76ae91325c4da64045ce49d5b45f3"
behavior_unverified: 12
overrides_applied: 0
gaps:
  - truth: "The public home reveals the progressive search experience only after engagement."
    status: failed
    reason: "A completed search followed by browser Back to / preserves answer chips in the client boundary, so the cold browse URL displays a completed search without new engagement."
    artifacts:
      - path: src/components/search/search-experience.tsx
        issue: "The prop-sync effect returns whenever hasCompletedSearch is false; it never clears resultsVisible or answers on completed-to-cold navigation."
      - path: tests/search/progressive-search.test.tsx
        issue: "It tests only false-to-true hydration. No completed-to-false rerender or browser Back test exists."
    missing:
      - "Synchronize the canonical props in both directions without resetting ordinary local correction state."
      - "Add a regression test that rerenders a completed tuple to empty initial answers/hasCompletedSearch=false and asserts only the idle pill remains."
  - truth: "The final repository lint gate is green after Phase 24."
    status: failed
    reason: "The Phase 24 file lint command exits non-zero on SearchExperience. The reported final release claim is therefore not supported by the current codebase."
    artifacts:
      - path: src/components/search/search-experience.tsx
        issue: "ESLint reports react-hooks/set-state-in-effect at line 115 and a missing initialAnswers dependency warning at line 129."
    missing:
      - "Use a lint-compliant synchronization design and re-run the Phase 24 lint/release gates."
behavior_unverified_items:
  - truth: "The one idle-pill tree reflows as the same usable flow at desktop and 375 px widths."
    test: "Run the declared Chromium journey at 1280×800 and 375×812."
    expected: "Exactly one journey tree is usable at both widths, with activity, location, and party reached in order."
    why_human: "The browser test exists but was not run because it requires a web server; source inspection cannot prove responsive interaction."
  - truth: "Both viewport journeys preserve Back/Edit/Cancel and solo/group completion."
    test: "Run the desktop and mobile progressive-search journey matrix."
    expected: "Back/Edit retain answers, Cancel returns to cold browse, and valid solo/group values reach canonical results."
    why_human: "The relevant Playwright proof was not run in this verification pass."
  - truth: "Both viewport journeys keep unmatched catalogue typing local."
    test: "Run the desktop and mobile progressive-search journey matrix and type a non-catalogue value."
    expected: "No navigation occurs and the no-match state appears."
    why_human: "The relevant Playwright proof was not run in this verification pass."
  - truth: "Address and browser-location browser paths are recoverable end to end."
    test: "Run the selected-address, allowed-location, denied-location, and stale-callback browser paths."
    expected: "Only successful resolved locations advance; failed attempts leave usable address input."
    why_human: "The relevant Playwright proof was not run in this verification pass."
  - truth: "Canonical solo/group results survive reload and a fresh shared page."
    test: "Run the group reload/share Chromium test."
    expected: "Capacity-eligible results and the same three chips appear after reload and in a new browser context."
    why_human: "The relevant Playwright proof was not run in this verification pass."
  - truth: "Keyboard order, focus, status ownership, reduced motion, axe, and one-tree behavior hold in browsers."
    test: "Run the declared desktop and 375 px keyboard/axe/reduced-motion browser cases."
    expected: "Focus moves to each new heading, one status owner is mounted, axe is clean, and the settled tree is singular."
    why_human: "These are browser and visual behaviors; the spec was inspected but not executed."
  - truth: "Retained booking, one-tree, price-parity, and axe suites enter through the production progressive flow."
    test: "Run the four migrated dependent Chromium suites."
    expected: "Each starts from the progressive search helper and preserves its independent booking, parity, one-tree, and accessibility assertions."
    why_human: "The browser suites were not run because this verification does not start application services."
  - truth: "The dev theme gallery presents the final capacity-honest result and calm empty-state language."
    test: "Open the dev theme page and inspect populated and empty examples."
    expected: "No date/time/radius refinement promise or capacity/remaining-place claim appears."
    why_human: "Source text is consistent, but visual presentation is not proven by source inspection."
  - truth: "The pinned-Linux workflow owns the twelve intended visual references and repeat-runs without a diff."
    test: "Dispatch the baseline workflow twice from the same ref."
    expected: "It succeeds both times and the second run produces no PNG change."
    why_human: "The local inventory has the twelve expected files, but remote workflow execution/repeatability was not independently observed."
  - truth: "Progressive step transitions are visually smooth and respect reduced motion."
    test: "Interact through all three steps with normal and reduced-motion preferences at both target widths."
    expected: "Transitions are calm and unclipped; reduced motion removes animation without breaking focus or flow."
    why_human: "Classes use the expected tokens, but perceived motion and layout cannot be proven from source."
  - truth: "The completed empty and populated visual baselines accurately represent their live states."
    test: "Open the twelve snapshots at original size and compare them with the driven browser states."
    expected: "Correct step/result state is visible with readable, unclipped controls and no stale legacy claims."
    why_human: "PNG presence and filenames do not prove image content."
  - truth: "The final production build and complete Chromium gate are green."
    test: "After resolving lint, run the production build and full declared Chromium suite."
    expected: "Both exit zero without updating unrelated baselines."
    why_human: "The final gate cannot be green now because lint is red; build and full Chromium were therefore not started."
---

# Phase 24: Search Bar Rework Verification Report

**Phase Goal:** Replace the always-expanded search controls with a simple, progressive search flow: reveal the search experience only when the user engages with it, then ask for activity, location, and party size one question at a time with smooth transitions.

**Verified:** 2026-09-15T00:03:14Z  
**Status:** gaps_found  
**Re-verification:** No — initial verification

## Goal Achievement

The implementation is substantive and most client/server wiring is present. It does not meet the phase goal yet: browser Back from a completed search to the cold `/` URL leaves the preserved client coordinator in its completed state, exposing stale answer chips before a new engagement. The Phase 24 lint gate also fails in that coordinator.

### Observable Truths

| Plan | # | Truth | Status | Evidence |
| --- | --- | --- | --- | --- |
| 24-01 | 1 | Idle public home reveals search only after engagement | ✗ FAILED | `SearchExperience` returns early for `hasCompletedSearch=false`; completed state survives browser Back. |
| 24-01 | 2 | Exact closed-catalogue selection, not typed text, advances | ✓ VERIFIED | `ActivityStep` filters `CATALOGUE` and only `CommandItem.onSelect` calls the reducer; focused test run passed. |
| 24-01 | 3 | Address/geolocation success reaches party with retained location | ✓ VERIFIED | Controlled location callbacks and focused tests for success/unavailable/denial passed. |
| 24-01 | 4 | Solo submits canonical server-validated partySize=1 | ✓ VERIFIED | `safeParse` then literal `/?` URL construction; focused component test passed. |
| 24-01 | 5 | SQL excludes null/below capacity before pagination, without result capacity claims | ✓ VERIFIED | Predicate is before `LIMIT/OFFSET`; database-backed party-size tests passed. |
| 24-01 | 6 | Completed results expose three direct-edit chips | ✓ VERIFIED | Coordinator renders the three buttons outside server children; focused state tests passed. |
| 24-02 | 1 | One responsive idle→activity→location→party tree | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | One component tree is evident in source; declared cross-viewport browser test was not run. |
| 24-02 | 2 | In-journey Back retains answers; Cancel clears and goes to `/` | ✓ VERIFIED | Reducer and component assertions passed in the focused test run. |
| 24-02 | 3 | Direct Edit retains answers and resumes fixed progression | ✓ VERIFIED | Reducer wiring plus focused chip/correction coverage passed. |
| 24-02 | 4 | Catalogue filtering is exact and has a calm no-match state | ✓ VERIFIED | Closed list and exact selection verified in source and focused tests. |
| 24-02 | 5 | Failed/stale location attempts remain recoverable | ✓ VERIFIED | Attempt-token guard and focused callback tests passed. |
| 24-02 | 6 | Solo/group input accepts only bounded whole counts | ✓ VERIFIED | `parseGroupPartySize` and component tests passed. |
| 24-02 | 7 | Focus, status owner, tokenized/reduced motion transitions | ✓ VERIFIED | Source has a single named status owner, heading focus effect, motion tokens, and reduced-motion class; focused checks passed. |
| 24-03 | 1 | Server accepts optional bounded scalar partySize | ✓ VERIFIED | Schema tests passed, including scalar, bounds, and omitted values. |
| 24-03 | 2 | Engaged query ignores retired refinements | ✓ VERIFIED | `superRefine` normalizes retired values; page projects only canonical fields. |
| 24-03 | 3 | Capacity predicate is pre-pagination and occupancy-mode-neutral | ✓ VERIFIED | `l.max_occupancy >= partySize` precedes pagination; DB test passed. |
| 24-03 | 4 | Null/below excluded; equal/above included; omission has no predicate | ✓ VERIFIED | Database-backed test passed. |
| 24-03 | 5 | Capacity remains a predicate, not result data | ✓ VERIFIED | Page supplies no date; Phase 24 result path has no capacity projection/claim. |
| 24-04 | 1 | Hard-navigation fallback is inert single-tree geometry | ✓ VERIFIED | `loading.tsx` is server markup; focused results-state test passed. |
| 24-04 | 2 | Populated and empty results share the three chips | ✓ VERIFIED | Chips are coordinator-owned around all rendered children; focused tests passed. |
| 24-04 | 3 | Empty state keeps edits rather than reset/broaden controls | ✓ VERIFIED | `SearchResults` is child-only; no broadening control found; state tests passed. |
| 24-04 | 4 | Page makes one canonical query without retired public refinements | ✓ VERIFIED | Page validates URL then builds its restricted server input before `searchListings`. |
| 24-04 | 5 | Errors/loading have honest single owners | ✓ VERIFIED | Page catches generic failure; results and fallback tests passed. |
| 24-04 | 6 | No Phase 24 date/capacity/remaining-place claim | ✓ VERIFIED | Canonical public input omits date; results path receives no searched window. |
| 24-05 | 1 | Both browser widths prove journey, correction, and completion | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Declared Playwright matrix exists but was not run. |
| 24-05 | 2 | Both widths keep unmatched typing local | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Declared Playwright assertions exist but were not run. |
| 24-05 | 3 | Browser address/geolocation paths are recoverable | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Declared Playwright assertions exist but were not run. |
| 24-05 | 4 | Solo/group URLs survive reload/share with honest results | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Declared Playwright assertions exist but were not run. |
| 24-05 | 5 | Both result states retain edits and Cancel clears state | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Declared Playwright assertions exist but were not run. |
| 24-05 | 6 | Browser keyboard/focus/status/motion/axe/one-tree proof | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Declared Playwright assertions exist but were not run. |
| 24-06 | 1 | Retained browser suites use progressive entry | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Sources call the shared progressive helper, but suites were not executed. |
| 24-06 | 2 | Price parity and accessibility remain intact | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Browser assertions were not independently executed. |
| 24-06 | 3 | Shared seed preserves dependent booking semantics | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Browser assertions were not independently executed. |
| 24-07 | 1 | Fresh census finds no supported legacy runtime/test consumer | ✓ VERIFIED | All five named retired paths are absent from the workspace. |
| 24-07 | 2 | Obsolete expanded/relaxation paths are absent, not shims | ✓ VERIFIED | `Test-Path` is false for all five paths. |
| 24-07 | 3 | Dev theme presents capacity-honest final language | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Source has no retired refinement copy; visual rendering was not inspected. |
| 24-07 | 4 | Residual registry/visual references were enumerated for Plan 24-08 | ✓ VERIFIED | Ledger links and Plan 24-08 contract rows exist. |
| 24-08 | 1 | Fixed accessibility/selector/brand/elevation contracts retain positive guards | ✓ VERIFIED | Four focused design files: 116 tests passed. |
| 24-08 | 2 | Six visual states declare 375/1280 deterministic hooks | ✓ VERIFIED | `visual-baselines.ts` and twelve exact snapshot filenames are present. |
| 24-08 | 3 | Result/empty states use party-aware input with no legacy claims | ✓ VERIFIED | Static driver/baseline contracts use canonical party-aware states and no legacy selector. |
| 24-08 | 4 | Pinned-Linux workflow repeatability has no diff | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Twelve local PNGs exist; remote same-ref repeat was not independently run. |
| 24-08 | 5 | Final unit/design/type/lint/build/Chromium release gate is green | ✗ FAILED | Focused lint exits non-zero in `search-experience.tsx`; later gates were not started. |

**Score:** 28/42 truths verified (12 present but behavior-unverified).

### Required Artifacts

| Artifact group | Levels 1–3 | Data flow / details |
| --- | --- | --- |
| Progressive coordinator and three step components | ✓ VERIFIED | Real state/reducer/handlers and UI primitives; imports and rendered branches are wired. The coordinator's reverse prop synchronization is defective (see gap). |
| Public page, validation, and query | ✓ VERIFIED | Page validates URL, passes `partySize` to `searchListings`, and the query uses a parameterized pre-pagination predicate. |
| Focused unit/integration tests | ✓ VERIFIED | 49 focused UI/validation/results tests and 3 database filtering tests passed. |
| Browser suites and helpers | ✓ PRESENT | Substantive and wired, but their runtime assertions were not executed here. |
| Design registry and visual inventory | ✓ VERIFIED | Four design files pass; all twelve named progressive-search PNGs are present. The artifact helper reports `EISDIR` for the snapshots directory, so the directory was manually enumerated. |

### Key Link Verification

All 28 declared Plan 24 key links report as wired through `verify.key-links`: server page→coordinator/query, coordinator→step components/schema/results, validation→query/schema, and the migrated browser/design links. Manual data-flow tracing confirms the important runtime chain:

`searchParams` → `searchParamsSchema` → `activeSearch` → `searchListings(db, …)` → `SearchResults` server child → `SearchExperience`.

The data source is the real database query, not a static result: `page.tsx:58` awaits `searchListings(db, …)`, and `query.ts:271` binds the party-size predicate before `LIMIT/OFFSET` at line 281.

### Behavioral Spot-Checks

| Check | Result |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run tests/search/progressive-search.test.tsx tests/validation/booking-schemas.test.ts tests/search/search-results-states.test.tsx --reporter=dot` | ✓ PASS — 49 tests passed. |
| `node node_modules/vitest/vitest.mjs run tests/search/party-size-filter.test.ts --reporter=dot` | ✓ PASS — 3 database-backed tests passed. |
| `node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/live-regions.test.tsx tests/design/selector-contract.test.ts tests/design/brand-recipe.test.ts tests/design/elevation-z.test.ts --reporter=dot` | ✓ PASS — 116 tests passed. |
| Focused Phase 24 ESLint command | ✗ FAIL — `react-hooks/set-state-in-effect` error and `exhaustive-deps` warning in `search-experience.tsx`. |
| Declared Playwright/browser lanes | ? SKIP — they require a web server; no service was started by this verifier. |

### Test Quality Audit

The requirement-linked focused test files have no disabled/skipped/todo test marker. Their active assertions are behavioral/value-level (URL, rendered chips, reducer state, DB rows, focus/status). There is no circular expected-value generator in the inspected focused tests.

The important coverage hole is concrete: `tests/search/progressive-search.test.tsx` exercises only cold→completed hydration at lines 113–132. `rg` finds no `goBack`, `history.back`, or completed→cold rerender test in that file or `e2e/progressive-search.spec.ts`. The passing test suite therefore does not prove the browser-Back transition.

### Requirements Coverage

Plans declare D-01 through D-08, but `.planning/REQUIREMENTS.md` contains no definitions or Phase 24 mapping for those IDs and the Phase 24 roadmap entry says `Requirements: TBD`. This is a planning-metadata coverage gap, not evidence that a separate implementation requirement failed. The observable contracts were assessed from the Plan must-haves and phase goal.

### Decision Coverage

`check.decision-coverage-verify` reports all 8 trackable `24-CONTEXT.md` decisions honored. This is advisory and does not override the code and lint failures above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/components/search/search-experience.tsx` | 113–129 | One-way prop synchronization | 🛑 Blocker | Cold browse can render stale completed-search chips after browser Back. |
| `src/components/search/search-experience.tsx` | 115, 129 | Effect-state lint violation | 🛑 Blocker | Phase 24 lint/release gate is red. |

No unreferenced `TBD`, `FIXME`, or `XXX` marker was found in the inspected Phase 24 implementation files. The apparent placeholder matches are UI placeholders or registry commentary, not incomplete implementation.

### Human Verification Required

The behavior-unverified items in the frontmatter are retained for end-of-phase UAT after the blockers are fixed. In particular, verify the real responsive journey and visual motion at 1280 and 375 widths, inspect all twelve image references, and run the declared Chromium/remote baseline gates.

### Gaps Summary

Two blockers prevent acceptance:

1. The coordinator does not synchronize from completed search state back to cold browse state, so browser Back violates the engagement-only entry point and leaves stale answer chips at `/`.
2. The same coordinator fails lint, so the claimed final release gate cannot be green.

The lint failure is introduced in a Phase 24 file and the browser-Back defect is confirmed by the current source and the absence of the reverse-transition test; neither is an unrelated pre-existing failure.

---

_Verified: 2026-09-15T00:03:14Z_  
_Verifier: Codex (gsd-verifier)_
