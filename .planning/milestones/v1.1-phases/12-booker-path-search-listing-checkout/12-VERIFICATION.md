---
phase: 12-booker-path-search-listing-checkout
verified: 2026-08-20T00:15:00Z
status: passed
score: 17/17 must-haves verified
overrides_applied: 0
---

# Phase 12: Booker Path — Search → Listing → Checkout Verification Report

**Phase Goal:** The route from an empty search box to the payment redirect reads as one designed
product, and never leaves a booker at a dead end.
**Verified:** 2026-08-20T00:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Search-result card: photo → title/price on one baseline, same unit checkout charges (BFLOW-01) | ✓ VERIFIED | `src/components/search/search-result-card.tsx` renders cover photo, then title+price on one optical column; `PriceBreakdown`/`AllInTable` server-compute the same all-in figure used at checkout. `tests/search/search-card-open.test.tsx` (18 tests) and `e2e/skeleton-geometry.spec.ts` pass. |
| 2 | Listing page: conventional order, hero-grid→lightbox (not carousel), 44px calendar cells + skeleton + motion budget, mobile CTA reachable w/o scroll (BFLOW-02/03/05, RESP-02) | ✓ VERIFIED | `src/components/listing/photo-gallery.tsx` + `photo-lightbox.tsx` (grid + full-screen keyboard-pageable dialog); `src/lib/design/measurements.ts` declares `CALENDAR_CELL`/`SLOT_CHIP_BOX` at 44px; `booking-sticky-bar.tsx` gives a 44px CTA. Live e2e: `e2e/photo-lightbox.spec.ts` (18/18 pass), `e2e/calendar-hit-area.spec.ts` (44px measured via `boundingBox`, 4/4 pass), `e2e/mobile-booker-path.spec.ts` (8/8 pass, incl. 320px floor and one-fetch dedup). |
| 3 | Price breakdown: same component in rail and checkout; fee explains itself on demand (BFLOW-04) | ✓ VERIFIED | `PriceBreakdown` (`src/components/booking/price-breakdown.tsx`) is imported and rendered in both `availability-calendar.tsx` (rail/sheet) and `book/page.tsx` (checkout) — one component, `surface` prop only differs. `service-fee-popover.tsx` is mounted inside it, click-triggered, no `%` in copy. `e2e/price-one-fact.spec.ts` (RESP-02/BFLOW-04 case) passes; `e2e/price-parity.spec.ts` passes when run in isolation (see Anti-Patterns/notes for a contention caveat). |
| 4 | Checkout: single column + disclosure + sticky confirm bar; minimal header (wordmark+countdown, no nav that loses hold); live regions announce once; redirect told before leaving (BFLOW-06/07, SHELL-03, GATE-03) | ✓ VERIFIED | `price-disclosure.tsx` (Radix `Collapsible`) wired via `itemsDisclosure` in `book/page.tsx`; `checkout-sticky-bar.tsx` renders the sticky confirm bar; `book/layout.tsx` renders `brandHref={null}`, no nav, no footer, countdown in the `actions` slot. Live e2e: `e2e/hold-countdown.spec.ts` (GATE-03 "announces exactly once" case passes; "digits exist exactly once" passes), `e2e/shell.spec.ts` (AC#5/SHELL-03 "no way out of the page" passes), `e2e/mobile-booker-path.spec.ts` (BFLOW-06/07 375px case passes). `reserve-actions.tsx` names PayMongo and the redirect before navigating. |
| 5 | Zero results and slot-collision are handled in place, never a dead end (STATE-03, STATE-07) | ✓ VERIFIED | `relax-band.tsx` + `src/lib/search/relaxation.ts` (ladder), `collision-notice.tsx` + `refreshDay()` (Seam A). Live e2e: `e2e/zero-result-relax.spec.ts` (8/8 pass, incl. Undo/relax=0 and cold-start no-band case), `e2e/collision-in-place.spec.ts` (2/2 pass — the same-paint flip, one live region, no `23P01` leak). Unit: `tests/search/relaxation-ladder.test.ts`, `tests/search/search-results-states.test.tsx`, `tests/availability/availability-calendar.test.tsx`, `tests/booking/*` all pass. |

**Score:** 5/5 ROADMAP success criteria verified.

### Requirement ID Coverage (12 claimed: BFLOW-01..07, STATE-03/07, SHELL-03, RESP-02, GATE-03)

| Requirement | Owning Plan(s) | Status | Evidence |
|---|---|---|---|
| BFLOW-01 | 12-01 | ✓ SATISFIED | `search-result-card.tsx`; `tests/search/search-card-open.test.tsx` (18 pass) |
| BFLOW-02 | 12-08 | ✓ SATISFIED | Conventional order in `(detail)/page.tsx`; `tests/listing/key-facts.test.tsx` (pass); `e2e/public-listing.spec.ts` (see note below on one pre-existing red) |
| BFLOW-03 | 12-07 | ✓ SATISFIED | `photo-gallery.tsx` + `photo-lightbox.tsx`; `e2e/photo-lightbox.spec.ts` 18/18 live-pass |
| BFLOW-04 | 12-04, 12-05 | ✓ SATISFIED | `PriceBreakdown` single component, both surfaces; `service-fee-popover.tsx`; `e2e/price-one-fact.spec.ts`, `tests/booking/all-in-table.test.ts` pass |
| BFLOW-05 | 12-09 | ✓ SATISFIED | `CALENDAR_CELL`/`SLOT_CHIP_BOX` = 44px in `measurements.ts`; `e2e/calendar-hit-area.spec.ts` 4/4 live-pass (measured via `boundingBox`, not asserted) |
| BFLOW-06 | 12-11 | ✓ SATISFIED | `price-disclosure.tsx` (Collapsible) + `checkout-sticky-bar.tsx`; `e2e/mobile-booker-path.spec.ts` BFLOW-06/07 case live-pass |
| BFLOW-07 | 12-11 | ✓ SATISFIED | `reserve-actions.tsx` at-rest copy names PayMongo/destination before redirect; `e2e/search-and-book.spec.ts` documents the redirect (see note) |
| STATE-03 | 12-12 | ✓ SATISFIED | `relax-band.tsx`, `relaxation.ts`, WR-01 fix (`ladderFailed`) applied; `e2e/zero-result-relax.spec.ts` 8/8 live-pass |
| STATE-07 | 12-13, 12-14 | ✓ SATISFIED (see note) | `collision-notice.tsx`, `refreshDay()`; `e2e/collision-in-place.spec.ts` 2/2 live-pass. **Note:** `REQUIREMENTS.md` line 47/201 still shows STATE-07 as `[ ]`/"Pending" — stale bookkeeping, not a code gap (see Anti-Patterns). |
| SHELL-03 | 12-03 | ✓ SATISFIED | `book/layout.tsx` minimal composition; `e2e/shell.spec.ts` AC#5/SHELL-03 cases live-pass |
| RESP-02 | 12-02, 12-10 | ✓ SATISFIED | `booking-sticky-bar.tsx`, sheet; `e2e/mobile-booker-path.spec.ts` 8/8 live-pass (incl. 320px floor, one-fetch) |
| GATE-03 | 12-03, 12-06, 12-13 | ✓ SATISFIED | `src/lib/design/live-regions.ts` (`DeclaredFileCountIsEleven`, no `assertive`); `e2e/hold-countdown.spec.ts` "announces exactly once" live-pass; `tests/design/live-regions.test.tsx` 20/20 pass |

No orphaned requirements — REQUIREMENTS.md's Phase 12 row (`BFLOW-01..07, STATE-03/07, SHELL-03, RESP-02, GATE-03`, 12 count) matches exactly the union of all 15 plans' `requirements:` frontmatter.

### Required Artifacts (spot-checked, not exhaustive — see Requirements Coverage above for full requirement→artifact mapping)

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/components/booking/hold-expired-state.tsx` | Focus move to recovery CTA on hold expiry (CR-01 fix) | ✓ VERIFIED | `useRef` + `useEffect(() => recoveryRef.current?.focus(), [])` on the `Link`; matches the review's required fix (deviated correctly — focuses the CTA, not the region, per the resolution's documented rationale) |
| `tests/booking/hold-expired-state.test.tsx` | Runtime `document.activeElement` assertion (not a static scan) | ✓ VERIFIED | 3 cases, all pass live: direct mount, `ReserveView` live-expiry swap, and the negative (live hold moves no focus) |
| `.github/workflows/ci.yml` `gate-visual` job | postgis service, mirrors `baselines.yml` | ✓ VERIFIED | `services.postgres.image: postgis/postgis:18-3.6`, health check present, addresses by label `postgres:5432` |
| `.github/workflows/ci.yml` `gate-db-free` job | No `services:`, unreachable `DATABASE_URL` | ✓ VERIFIED | No `services:` block; `DATABASE_URL: postgres://unreachable:unreachable@127.0.0.1:59999/nope` still present |
| `scripts/verify-workflows.mjs` | Runs in CI, asserts cross-file invariants | ✓ VERIFIED | Invoked at `ci.yml:599` inside `gate-db-free`; run locally — 38/38 invariants hold (`baselines=11, ci=20, cross=7`) |
| `src/lib/design/visual-baselines.ts` | 53 declared rows, exactly 1 blocked | ✓ VERIFIED | `BaselineCountIsFiftyThree` type assertion compiles (confirmed via clean `npx tsc --noEmit`, 0 errors); only `global-error` row has non-null `blocked` |
| 52 committed baseline PNGs | `e2e/visual/surfaces.spec.ts-snapshots/*.png` | ✓ VERIFIED | `git ls-files` returns exactly 52 tracked `*-visual-linux.png`; `git status` clean on that directory |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `book-cta.tsx` | `availability-calendar.tsx` | `refreshDay()` (not `router.refresh()`) | WIRED | Confirmed by watched-red R1 recorded in 12-13-SUMMARY and re-confirmed live: `e2e/collision-in-place.spec.ts` passes with the same-paint flip |
| `collision-notice.tsx` | `src/lib/design/live-regions.ts` | Declared row, one-region rule | WIRED | `DeclaredFileCountIsEleven`; live e2e confirms exactly one region mounts (`hold-countdown.spec.ts` "announces exactly once", `collision-in-place.spec.ts`) |
| `search-bar.tsx` / `search-results.tsx` | `src/lib/validation/booking.ts` | `RADIUS_PRESETS`/`MAX_RADIUS_KM` import (WR-03 fix) | WIRED | Both files now `import { RADIUS_PRESETS, MAX_RADIUS_KM } from "@/lib/validation/booking"` — no local re-declaration |
| `(public)/page.tsx` | `runRelaxationLadder` | `ladderFailed` flag (WR-01 fix) | WIRED | `relaxExhausted` now gated on `!ladderFailed`; confirmed in source and covered by the ladder's own test suite |
| `hold-countdown.tsx` | `HoldProvider` (`markExpired`) | `onExpireRef.current()` (WR-02 fix, sync-on-mount) | WIRED | `React.useEffect` calling `onExpireRef.current?.()` added ahead of the interval-only path; `hold-countdown.spec.ts` live-pass |

### Behavioral Spot-Checks (live-executed, not inferred from SUMMARY)

| Behavior | Command | Result | Status |
|---|---|---|---|
| Type-check whole repo (incl. `BaselineCountIsFiftyThree`) | `npx tsc --noEmit` (after clearing stale `.next/dev/types`) | exit 0 | ✓ PASS |
| Full build | `npm run build` | exit 0, 0 lint errors | ✓ PASS |
| Lint | `npm run lint` | 0 errors, 12 warnings (matches claim) | ✓ PASS |
| Full unit/integration suite | `npx vitest run` | 141 files passed / 1 skipped, 1307 tests passed / 4 skipped | ✓ PASS |
| Design gate | `npx vitest run --config vitest.design.config.ts` | 41 files, 749 passed / 3 skipped | ✓ PASS |
| CR-01 regression test | `npx vitest run tests/booking/hold-expired-state.test.tsx` | 3/3 pass | ✓ PASS |
| Workflow invariants | `node scripts/verify-workflows.mjs` | 38/38 hold | ✓ PASS |
| STATE-07 collision e2e | `npx playwright test e2e/collision-in-place.spec.ts --project=chromium` | 2/2 pass (both themes) | ✓ PASS |
| SHELL-03 / GATE-03 e2e | `npx playwright test e2e/hold-countdown.spec.ts e2e/shell.spec.ts --project=chromium` | 23/23 pass | ✓ PASS |
| RESP-02 / BFLOW-06/07 e2e | `npx playwright test e2e/mobile-booker-path.spec.ts --project=chromium` | 8/8 pass | ✓ PASS |
| BFLOW-03 / BFLOW-05 e2e | `npx playwright test e2e/photo-lightbox.spec.ts e2e/calendar-hit-area.spec.ts --project=chromium` | 18/18 pass | ✓ PASS |
| STATE-03 e2e | `npx playwright test e2e/zero-result-relax.spec.ts --project=chromium` | 8/8 pass | ✓ PASS |
| BFLOW-04 e2e (price parity, GATE-05) | `npx playwright test e2e/price-parity.spec.ts --project=chromium` (isolated) | 1/1 pass | ✓ PASS |
| Committed baseline PNG count | `git ls-files "e2e/visual/surfaces.spec.ts-snapshots/*.png" \| wc -l` | 52 | ✓ PASS |
| GATE-06 tripwire | `ls drizzle/*.sql \| sort \| tail -1` | `0025_audit_resolved_by.sql` (unchanged) | ✓ PASS |

### Requirements Coverage

See "Requirement ID Coverage" table above — all 12 claimed requirement IDs SATISFIED with direct code and live-test evidence. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `.planning/REQUIREMENTS.md` | 47, 201 | STATE-07 checkbox/table still show `[ ]`/"Pending" | ℹ️ Info | Stale documentation only — STATE-07 is independently confirmed delivered in code (`collision-notice.tsx`, `e2e/collision-in-place.spec.ts` live-passes both themes). 12-13-SUMMARY itself flags this ("STATE-07 is not marked complete in REQUIREMENTS.md — 12-14 also claims it"). Recommend a follow-up doc fix, not a phase gap. |
| `e2e/search-and-book.spec.ts` | 263 | Strict-mode locator match on 2 "km away" elements | ℹ️ Info | Caused by leftover `vrt_listing_far_tennis` (a committed CI baseline-seed row, `scripts/seed-baseline-fixtures.ts`) present in the LOCAL dev Postgres (`fitout` db) from a prior local run of the seed script, colliding with this spec's own seeded tennis-court fixture within the same 25km radius. This is local-environment data pollution, not a product or phase-12 code defect — the CI dispatch runs against an ephemeral, destroyed-after-use database and cannot hit this. Not fixed (out of verifier scope — no source/DB mutation performed). |
| `e2e/public-listing.spec.ts` | 387 | `notFound()` on `/listings/[id]` returns HTTP 200 | ℹ️ Info | Pre-existing, documented standing red (`deferred-items.md` `[12-02]`), explicitly called out as NOT introduced by this phase and awaiting a Rule-4 architectural decision. Reproduced live, matches the documented symptom exactly. |
| test DB | — | `recordAudit` singleton leaks 2 rows to public schema per suite run | ℹ️ Info | Measured live during the full vitest run (`action=guest-email 1`, `action=notify 1`) — matches the documented, contained, pre-existing issue exactly (not phase-12 scope). |

No Critical or Warning-severity anti-patterns found in Phase 12's own delivered code. The one Critical (CR-01) and three Warnings (WR-01/02/03) from `12-REVIEW.md` were independently re-verified fixed in source, with CR-01's fix additionally proven by a live-passing runtime test.

### Human Verification Required

None. All seven Part-B manual walks (product-seam read, reduced motion, collision announcement, lightbox reachability, PayMongo destination match, baseline pixel judgment, collision calm-not-failure) were already performed and recorded by the operator in `12-14-SUMMARY.md` § Task 3 Part B, with verdicts "okay" on all seven (item 6 resolved via a fixture fix and a verified second mint, comparison run `32271124959` green). No new item surfaced during this verification that requires human judgment.

### Gaps Summary

No gaps. All 5 ROADMAP success criteria and all 12 claimed requirement IDs are independently verified against the actual codebase — not inferred from SUMMARY claims. Verification included live re-execution (not just reading) of: `npx tsc --noEmit`, `npm run build`, `npm run lint`, the full Vitest suite (1307 tests), the design gate (749 tests), the CR-01 regression test, the workflow-invariant parser (38 checks), and 8 targeted Playwright e2e specs covering STATE-03, STATE-07, SHELL-03, GATE-03, RESP-02, BFLOW-03/04/05/06/07 end-to-end against a real seeded Postgres and dev server — all green. The 52 committed baseline PNGs and the 53-row/1-blocked `visual-baselines.ts` inventory were confirmed directly (git-tracked file count, and the type-level assertion compiling clean). The `gate-visual`/`gate-db-free` CI job split, the postgis service, and the unreachable-DB sentinel were all read directly from `.github/workflows/ci.yml` and cross-checked by the parser script.

Two informational items are worth the next session's attention but do not block this phase: (1) `REQUIREMENTS.md`'s STATE-07 checkbox/table entry is stale (says "Pending" despite code + live tests proving it shipped) — a one-line doc fix; (2) the local dev Postgres carries leftover `vrt_*` baseline-seed rows from local testing that collide with `search-and-book.spec.ts`'s own fixture — a local `DELETE FROM listing WHERE id LIKE 'vrt_%'` (or a fresh `docker compose down -v && up`) would clear it; this does not affect CI, which uses an ephemeral database.

---

*Verified: 2026-08-20T00:15:00Z*
*Verifier: Claude (gsd-verifier)*
