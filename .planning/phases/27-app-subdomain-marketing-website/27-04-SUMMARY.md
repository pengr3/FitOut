---
phase: 27-app-subdomain-marketing-website
plan: "04"
subsystem: ui
tags: [marketing, playwright, screenshots, provenance, synthetic-fixtures]
requires:
  - phase: 27-03
    provides: Local app origin partition and authenticated hosting journeys
provides:
  - Seven genuine inspected app screenshots with dated, hashed provenance
  - Explicit opt-in hero, hosts and players capture runner
  - Guarded local synthetic fixtures and automatic cleanup
  - Parsed marketing image source and asset integrity contract
affects: [27-05, 27-06, 27-08]
tech-stack:
  added: []
  patterns: [actual app element screenshots, explicit local test database, hash-bound pixel review]
key-files:
  created:
    - e2e/helpers/marketing-fixtures.ts
    - e2e/marketing-captures.spec.ts
    - scripts/capture-marketing.mjs
    - tests/design/marketing-assets.test.ts
    - public/marketing/screenshots/search.png
    - public/marketing/screenshots/account.png
    - public/marketing/screenshots/verification.png
    - public/marketing/screenshots/listing.png
    - public/marketing/screenshots/bookable.png
    - public/marketing/screenshots/session.png
    - public/marketing/screenshots/booking.png
    - public/marketing/screenshots/manifest.json
  modified: []
key-decisions:
  - "Capture actual safe app regions with no photographs; retain genuine empty-photo UI where present."
  - "Use the host verification/payout roadmap without opening the provider-backed banking settings page."
  - "Capture the real seeded draft edit wizard after approval gates; do not claim the intermittently failing creation route passed."
  - "Bookability comes from the existing eligibility gates; booking evidence stops at a pending unpaid hold."
patterns-established:
  - "Capture writes require FITOUT_CAPTURE_MARKETING=1; ordinary browser tests assert actual states without writing images."
  - "Every retained image requires a matching SHA-256 pixel review in the manifest."
requirements-completed: []
requirements-addressed: [MKT-02, MKT-01]
actuals:
  tokens: 8360
  tasks: 3
  commits: 3
plan_head_before: 12738ad3733d7e73dc3fe5b7ad949fdbb74c39c7
coverage:
  - id: D1
    description: Seven real app captures with safe fixtures, current dates and reviewed provenance
    requirement: MKT-02
    verification:
      - kind: e2e
        ref: "node scripts/capture-marketing.mjs --group hero; --group hosts; --group players (separate runs)"
        status: pass
      - kind: automated_ui
        ref: "tests/design/marketing-assets.test.ts#contains exactly seven inspected browser captures with matching PNG bytes and safe provenance"
        status: pass
    human_judgment: true
    rationale: "Codex inspected the exact retained pixels; final marketing presentation and user visual acceptance belong to later page/UAT plans."
  - id: D2
    description: Published marketing image sources are restricted to the capture manifest
    verification:
      - kind: other
        ref: "tests/design/marketing-assets.test.ts#published marketing image sources use only manifest screenshots"
        status: pass
    human_judgment: false
duration: 24min
completed: 2026-10-09
status: complete
---

# Phase 27 Plan 04: Authentic Marketing Captures Summary

**Seven actual app screenshots show progressive search, four host setup states, future availability and an unpaid booking review, with hash-bound pixel inspection and isolated local fixtures.**

## Performance

- Implementation timing anchor: first owned helper creation, **2026-10-08T18:03:40Z**.
- Verification completed: **2026-10-08T18:27:32Z** / **2026-10-09 Asia/Manila**.
- Duration: **24 minutes from the first implementation artifact**. Initial reading time was not recorded and is excluded.
- Tasks: **3**; owned task artifacts: **12**.
- Actual tokens: **8,360**, measured as ceil(33,437 textual git-diff characters / 4) over the twelve owned task files. Git represents PNGs with binary-file diff notices; this is the plan estimate's textual-diff scale, not harness usage.
- Commits: **3**, measured with `git rev-list --count` from the persisted plan ledger base before this separate summary commit.

## Accomplishments

The runner invokes the installed Playwright CLI and selects exactly one named capture group. Its child environment binds the existing local `fitout_test` database, disables real email, clears payment/identity provider credentials and enables asset writes explicitly. Fixtures reuse the existing test database safety guard, reject configured nonlocal/non-test targets and use their own exact-local connection. Existing synthetic account signup, fixture eligibility columns and browser UI are exercised; no schema, dependency, policy or product code changed.

The fixture checks email verification, activated payouts, approved host verification, publication, approved listing review and real weekly operating hours. The host screenshot's Live badge comes from the unchanged application derivation. All photographs are omitted. External browser requests are aborted, and safe DOM regions are captured directly with Playwright element screenshots; no replacement HTML, phone illustration, photo generation or visual-baseline writes occur.

Every PNG was opened with `view_image`, including the final recaptures. Manifest entries record exact safe routes, asserted states, capture instant, Manila date, fixture IDs, provenance, dimensions, SHA-256 and a reviewer disposition tied to the retained hash. Signup shows the real empty fields and example placeholders. Verification shows the existing four-step roadmap with account and payout work outstanding. Listing shows a real draft wizard; bookable shows a real fixture-backed Live listing. Player capture selects **2026-10-12, 14:00–15:00 Asia/Manila**, three days after capture. Booking shows the real review screen; SQL confirms **pending**, no checkout session and no payment ID. Confirm & pay was never clicked; hold query credentials are excluded from manifest routes.

## Inspected Capture Inventory

All paths below are inside `public/marketing/screenshots/`; complete hashes and exact routes are in `manifest.json`.

| Asset | Dimensions | Actual surface and review |
|---|---|---|
| search.png | 1120 × 578 | Activity/location/party answers and safe demo search result; no photo |
| account.png | 384 × 682 | Host account signup with empty personal fields |
| verification.png | 736 × 530 | Actual account-check/payout/listing roadmap; no identity/banking values |
| listing.png | 1280 × 610 | Guarded draft edit wizard, first space-type step and actual checklist |
| bookable.png | 1280 × 541 | Your listings with Live demo listing and genuine eligibility |
| session.png | 584 × 521 | Actual availability calendar/hour picker with future 14:00–15:00 selection |
| booking.png | 896 × 508 | Pending unpaid review with actual frozen total and confirmation control |

All seven capture dates are **2026-10-09 Asia/Manila**. Inspection found no real personal contact, banking data, identity documents, bearer URLs, staff screens or photographs. Local fixture approval and readiness are explicitly demo context; they prove neither production onboarding nor provider approval.

## Task Commits

1. **27-04-01:** `05691d3c` — `feat(27-04): capture genuine safe app search`.
2. **27-04-02:** `234cbed7` — `feat(27-04): capture four genuine host setup states`.
3. **27-04-03:** `8d04f9fa` — `feat(27-04): capture safe player session and booking provenance`.

Summary is committed separately. Shared STATE.md, ROADMAP.md and REQUIREMENTS.md remain orchestrator-owned. All phase requirements remain pending dependent page, engineering and live evidence.

## Verification

- Hero group: **1 passed**, real UI/cleanup **2.4s**, terminal exit **0**.
- Final hosts group: **1 passed**, real UI/cleanup **11.7s**, terminal exit **0**.
- Final players group: **1 passed**, real UI/cleanup **12.3s**, terminal exit **0**.
- Asset contract: **3/3 passed**, terminal exit **0**, final runtime **776ms**. It checks exact inventory, PNG dimensions/hashes, safe route/state/date/provenance/review, future-session validity and parsed marketing image sources. Parser cases reject generated/stock/sketch image usage while explanatory comments contribute no image sources. The marketing module scan becomes populated when later plans wire pages.
- Scoped ESLint on all four owned source files: exit **0**, no warnings.
- Installed Next `typegen`: exit **0**; final `tsc --noEmit`: exit **0**.
- Owned diff whitespace check passed; no task commit deletes tracked files.
- Read-only final local DB check: **0** remaining marketing host/account fixtures. Each passing group also asserts its own account/listing cleanup.

The groups ran separately, with no concurrent gates or broad phase suite. Windows Playwright teardown hung after browser results; the orchestrator inspected process ancestry and killed only each owned Next root so the runner emitted its true final summary/exit. Final logs are local runtime files under `%TEMP%/fitout-marketing-{hero2,hosts4,players2}.log`; they are not published assets.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected new capture assumptions against actual UI/schema.** Hero now supplies the shared progressive-search helper's required category; listing asserts the first space-type step; booking asserts the real pending status. The parser deduplicates a literal visited both through JSX and its string node. Final capture/design assertions pass; product code is untouched.

**2. [Rule 2 - Missing Critical] Isolated the owned fixture connection from the shared development fallback.** Task 2 replaces static shared seeder binding with the same synthetic seed SQL behind the existing guard and an exact local test connection. This permits ordinary safe browser assertion runs without asset writes while preserving fail-closed handling of configured unsafe targets. Verified by the final hosts/player groups and cleanup.

**3. [Rule 3 - Blocking] Used the actual seeded draft wizard for the listing asset.** The existing `/host/listings/new` route reached the wizard once, then returned a local 404 on another run. With orchestrator approval, the owned listing is temporarily a draft with empty title/description, captured at its genuine `/host/listings/{demo-id}/edit` route, then restored to published for the Live capture. The manifest names the actual route/state. The failing creation route is not claimed green.

**4. [Rule 3 - Blocking] Recovered obsolete generated development types after canonical type generation.** Windows dev cache first contained a malformed generated route file, then disagreed with installed typegen over encoded ops paths. After reading the installed CLI guide and successful `next typegen`, only the gitignored `.next/dev/types/routes.d.ts` and `validator.ts` were removed. Current canonical generated types and the unchanged TypeScript configuration then passed `tsc`.

## Deferred Issues

**Existing intermittent `/host/listings/new` 404 remains unresolved.** Plan 27-08 must record and investigate the actual creation journey. This capture plan provides the real draft setup UI through an isolated fixture; it does not verify that failing entry route or conceal its failure. No unrelated product fix was made.

No auth gate, skipped source test, unrun plan verification, new product stub or undeclared threat surface occurred. Empty photo states in captured app UI are intentional under the no-unverified-imagery constraint. Payment, payout and binding-terms HOLD remain unchanged.

## Next Phase Readiness

Plans 27-05/06 can consume these seven manifest-listed screenshots. Keep demo approvals contextual and exclude claims of live payment, immediate approval, guaranteed bookability or released funds. A deliberate recapture resets pixel review to pending until its exact new bytes are inspected. Marketing layout/user visual acceptance and full engineering gates remain downstream.

## Self-Check: PASSED

All twelve owned task artifacts exist; all seven retained PNGs were inspected and match the passing provenance contract. The three task commits exist and the persisted ledger measures three commits from its recorded base. Final capture groups, asset tests, scoped lint, canonical type generation, TypeScript and owned diff checks passed. No unrelated existing edits or visual baselines were modified.
