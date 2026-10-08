---
phase: 27-app-subdomain-marketing-website
plan: "01"
subsystem: routing
tags: [nextjs, proxy, origins, marketing, playwright, vitest]
requires:
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    provides: Isolated ops host, server guards and response gateway
  - phase: 24-search-bar-rework
    provides: Real anonymous progressive application search
provides:
  - Explicit checked app, marketing and ops origin authorities
  - Same-tab marketing Home to real anonymous application search
  - Segment-aware legacy, method, query and signed-receiver routing policy
affects: [27-02, 27-03, 27-04, 27-05, 27-06, 27-07, 27-08, 27-09]
tech-stack:
  added: []
  patterns: [Exact full authority classification, configured-origin redirects, enumerated marketing asset exceptions]
key-files:
  created:
    - src/lib/host-route-policy.ts
    - src/app/marketing/page.tsx
    - e2e/marketing-tracer.spec.ts
    - tests/auth/marketing-host-routing.test.ts
    - .planning/phases/27-app-subdomain-marketing-website/27-01-RED.json
  modified:
    - src/lib/app-origins.ts
    - src/proxy.ts
    - playwright.config.ts
    - tests/auth/ops-host-routing.test.ts
    - tests/auth/public-origin-callers.test.ts
key-decisions:
  - PUBLIC_APP_ORIGIN and absolutePublicUrl remain compatibility aliases of application behavior.
  - Only nonempty current application search discriminators redirect an apex root; all query entries survive.
  - Seven exact planned screenshot PNG paths are marketing GET/HEAD asset exceptions; internal namespace pages remain denied.
  - Browser server always uses the existing local fitout_test database and explicit local origins, preserving real-email opt-out.
requirements-completed: [DOMAIN-01, DOMAIN-02, MKT-03]
coverage:
  - id: D1
    description: Checked app/marketing/ops authority partition and fail-closed host policy
    requirement: DOMAIN-01
    verification:
      - kind: unit
        ref: tests/auth/marketing-host-routing.test.ts
        status: pass
      - kind: unit
        ref: tests/auth/ops-host-routing.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Legacy GET/HEAD path/query continuity, unsafe-method denial and direct signed receivers
    requirement: DOMAIN-02
    verification:
      - kind: unit
        ref: tests/auth/marketing-host-routing.test.ts#marketing route and method policy
        status: pass
    human_judgment: false
  - id: D3
    description: Home Open App reaches real anonymous search in the same browser tab
    requirement: MKT-03
    verification:
      - kind: e2e
        ref: e2e/marketing-tracer.spec.ts#apex Home opens real anonymous app search in the same tab
        status: pass
    human_judgment: false
actuals:
  tokens: 15246
  tasks: 2
  commits: 3
plan_head_before: edec99b89bffa62df9ba47b4cf85c12f96acfa3f
duration: 16m24s implementation and verification; prerequisite recovery additional
completed: 2026-10-09
status: complete
---

# Phase 27 Plan 01: Exact Host Routing and Marketing Tracer Summary

**A checked apex Home opens real anonymous app search in one tab, with complete-query legacy redirects, explicit method boundaries and preserved ops isolation.**

## Performance

- Implementation artifact created: 2026-10-08T16:49:41Z (2026-10-09 00:49:41 Asia/Manila).
- Verification and task commits completed: 2026-10-08T17:06:05Z.
- Measured artifact-to-completion interval: 16m24s. Initial prerequisite recovery preceded this interval; an executor dispatch start clock was not recorded, so total wall time is not invented.
- Tasks: 2/2. Files created/modified: 10 before this summary.
- Actual tokens use 60,981 characters / 4, rounded up, over the realized committed diff; this is the estimate's scale, not model token usage.
- Three task/TDD commits measured with `git rev-list --count` from the persisted plan ledger before the separate summary commit.

## Accomplishments

- Added APP_ORIGIN, MARKETING_ORIGIN, purpose-specific absolute URL helpers and app-directed compatibility aliases. Reject conflicting app env values, unsafe origin syntax, missing deployment configuration, overlapping purpose authorities, malformed Host values, wrong ports and unconfigured previews. Normalize a configured protocol's explicit default port without broadening other ports. Auth host/origin allowlists exclude marketing.
- Implemented the centered Court Home with its confirmed headline, equal audience entry points and an absolute same-tab Open App anchor. No sketch photograph, fabricated product capture or generative image was copied.
- Extracted segment-aware policy for six visible marketing pages, approved legacy links, full repeated-query preservation, discriminator-based root search routing, app page collisions, exact signed receiver methods, marketing-only Contact POST, metadata resources and narrow image exceptions. Unknown hosts fail closed. Incoming private markers are removed; ops gateway handoff verification, session deferral and server authorization remain intact.
- Playwright uses the installed Next Node CLI, explicit local app/marketing/ops origins and the existing local `_test` database. Existing real-email opt-out, non-adoption of arbitrary running servers and Linux-only visual baseline policy remain in place.

## Task Commits

1. Task 27-01-01, production tracer: `edf5139d` — `feat(27-01): trace marketing Home into anonymous app search`.
2. Task 27-01-02, intentional RED: `dee36b6f` — `test(27-01): prove legacy host routing fails before expansion`.
3. Task 27-01-02, GREEN: `06ae5d22` — `feat(27-01): enforce exact marketing and legacy host policy`.

The summary is committed separately before the orchestrator updates shared planning state. Executor did not modify STATE.md, ROADMAP.md or REQUIREMENTS.md.

## Verification

All gates ran sequentially.

| Check | Actual result |
|---|---|
| Read-only prerequisite DB proof | Existing local `fitout_test` reached; migrated listing/audit/settlement tables; zero listings, safe cold-start state; no migration or fixture write needed |
| Current app prerequisite GET | Explicit test-DB server returned 200, real search heading/group present, no database-error UI |
| Task 1 browser tracer, before expansion | 2/2 passed, exit 0, 2.1m including Windows teardown recovery; same-tab search case 4.5s |
| Intentional RED target | Legacy `/login` expected 307 but returned 404; exit 1; GSD `RED_EVIDENCE_OK` |
| Final focused policy/origin/ops matrix | 126/126 passed in 3 files; Vitest duration 1.50s, command 2.315s; isolated DB reported no escaped writes |
| Final browser tracer after expansion | 2/2 passed, exit 0, 47.3s; real same-tab search case 1.6s, denial case 149ms |
| Scoped ESLint on all nine source/test/config files | Exit 0, 4.477s on final run |
| `node node_modules/typescript/bin/tsc --noEmit` | Exit 0, 8.576s after regenerated runtime types and scoped type fixes |
| Scoped `git diff --check` | Passed; no deletions in task commits |

Focused verification command:
`node node_modules/vitest/vitest.mjs run tests/auth/marketing-host-routing.test.ts tests/auth/ops-host-routing.test.ts tests/auth/public-origin-callers.test.ts`.

Browser verification command:
`node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts --project=chromium`.

## TDD Gate Compliance

The test-marked second task followed RED → GREEN. The initial full matrix failed on missing routing behavior. Its targeted real legacy-login assertion failed 404 versus 307 before production expansion and was committed before GREEN.

The installed GSD RED classifier parses Node TAP summary fields and rejects Vitest's nested TAP. Vitest's installed `tap-flat` reporter supplies actual flat test results but omits that summary footer. `27-01-RED.json` retains the raw reporter output verbatim and documents the adapter: summary counts are computed only from actual non-SKIP/non-TODO TAP result lines (one executed target, zero passes, one failure). The resulting record passes the classifier for the exact fully qualified target test. No failure, approval or receipt was fabricated. Filtered-out tests in the RED command are not source-level skipped tests; the final matrix ran all 126 tests.

## Deviations from Plan

### Recovered local prerequisites — Rule 3

Docker was installed but its backend could not initialize because stale runtime socket files were inaccessible. The orchestrator preserved exact runtime directories as backups, restarted Desktop hidden and started only the existing `fitout-db-1` container. Containers, volumes and product data were not reset. Existing alternate PostgreSQL container remained untouched. Backups: `Docker/run.phase27-backup-20261009-004355`, `Docker/run.phase27-backup-20261009-004443`, and `docker-secrets-engine.phase27-backup-20261009-004443` under the operator's Docker runtime directory. Existing test database was already migrated; no schema, package or production changes occurred.

### Browser environment isolation — Rule 2

The existing Playwright environment inherited DATABASE_URL, while Vitest isolated its own database. The browser server now explicitly targets the repository's local `fitout_test` with constant local-only credentials and checked local origins, preventing `.env.local` from supplying a different DB or deployment host during this tracer. Existing safe cold-start data was sufficient.

### Narrow namespace/asset clarification

Plan 27-04 publishes seven PNG files at `/marketing/screenshots/`. Task 2's approved-assets allowance therefore enumerates exactly those filenames for marketing GET/HEAD. This does not open internal namespace pages, manifest JSON, arbitrary filenames or app/ops/unknown-host namespace access. The orchestrator confirmed the interpretation.

### Tooling and runtime repairs — Rule 3

- Git metadata is read-only in the executor sandbox; orchestrator performed narrowly scoped ledger/staging/commits, preserving all unrelated dirty files.
- Windows browser server teardown remained pending after actual tests passed. Stopped only owned webServer Node children identified in each run's startup logs; Playwright then printed its final passing summary and returned exit 0.
- Generated `.next/dev/types/validator.ts` had a duplicated partial block. Preserved it as `.next/dev/types/validator.ts.phase27-backup` and regenerated through the owned final Next browser server. Product source/config was not changed for the generated-file repair.
- Updated the owned origin-caller test's obsolete retired payout-onboarding expectation to prove its inert retired return instead. No PayMongo onboarding integration was revived.
- Adapted real flat TAP output to the installed RED parser as documented above.

### Corrected task-local bugs — Rule 1

Expanded matrices exposed explicit-default-port normalization and unsafe normalized origin path edge cases. Corrected these in the checked origin authority. Typecheck exposed two new task-local type errors; corrected the checked pathname template type and test environment-map optional value type. Final gates pass.

## Known Stubs

None in this plan's routing/tracer goal. The full six-page content, screenshot files, Contact receiver implementation, hosting-auth resume and explicit auth callback bridge are intentionally owned by dependent plans. Their routes/asset destinations are reserved here; this summary does not claim those later deliverables are rendered or delivered.

## Next Phase Readiness

27-02 can consume the checked purpose-specific origins and add its narrowly tested auth token/OAuth bridge. 27-04 can publish the seven reserved authentic screenshot images; 27-05/06 can replace the tracer Home and supply the other marketing destinations; 27-07 can implement the marketing-only Contact receiver. Full phase tests, account inventory, inbox evidence and live cutover remain later gates.

Requirement coverage here is this plan's assigned slice: app origin/host routing, legacy routing and the Open App handoff. Authentication/hosting resume, received mail and live deployment evidence remain dependent work. Shared requirement checkboxes were not changed by this executor.

`deriveBookable`, host eligibility, signatures, cookies, schema and authorization guards were not moved or weakened. Phase 25.1/26 money/legal HOLD is unchanged. No live deployment, DNS/provider cutover, external messaging or payment release was performed.

## Self-Check: PASSED

Verified all five created artifacts exist and all three listed task/TDD commits exist. Final focused matrix, browser tracer, scoped lint and TypeScript checks passed; task commits contain no deletions. Summary is the canonical disk artifact and must be committed before shared state advances.
