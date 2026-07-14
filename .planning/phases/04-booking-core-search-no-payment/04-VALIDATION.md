---
phase: 04
slug: booking-core-search-no-payment
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-14
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `04-RESEARCH.md` § Validation Architecture. Task IDs are now filled
> from the 8 PLAN.md files produced by `/gsd:plan-phase`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 (integration, per-worker isolated Postgres schema) + Playwright 1.60 (E2E) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` (both present) |
| **Quick run command** | `npx vitest run tests/booking tests/search` (targeted to touched area) |
| **Full suite command** | `npm test` (Vitest integration) + `npm run test:e2e` (Playwright) |
| **Estimated runtime** | ~30 s targeted · ~2–3 min full Vitest · ~1–2 min Playwright |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/booking` or `tests/search` for the touched area (< 30 s).
- **After every plan wave:** Run `npm test` (full Vitest integration suite).
- **Before `/gsd:verify-work`:** Full Vitest **and** Playwright suites must be green.
- **Max feedback latency:** ~30 seconds (targeted run).

---

## Per-Requirement Verification Map

> Behaviors + automated commands from RESEARCH § "Phase Requirements → Test Map".
> `Plan · Task · Wave` references are filled from the 8 PLAN.md files. All test files
> remain Wave-0 gaps (created during execution — ❌ = not yet on disk).

| Requirement | Behavior (must be TRUE) | Test Type | Automated Command | Created by (Plan · Task · Wave) | File Exists | Status |
|-------------|-------------------------|-----------|-------------------|--------------------------------|-------------|--------|
| BOOK-03 | Concurrent overlapping holds → exactly one wins; loser `23P01`/`40P01` → "just taken" | integration (race) | `npx vitest run tests/booking/pending-hold.test.ts -t "concurrent"` | 04-04 · T2 · W2 | ❌ W0 | ⬜ pending |
| BOOK-03 | Double-click / same idempotency key → exactly ONE booking, returns SAME id (never "just taken") | integration (race) | `npx vitest run tests/booking/pending-hold.test.ts -t "idempoten"` | 04-04 · T2 · W2 | ❌ W0 | ⬜ pending |
| BOOK-02 | WR-03: `23P01` in savepoint retries next unit within one outer tx (no `25P02`); `40P01` → outer retry | integration | `npx vitest run tests/booking/pending-hold.test.ts -t "savepoint"` | 04-04 · T2 · W2 | ❌ W0 | ⬜ pending |
| BOOK-02 | Stale hold (`expiresAt` past) → read model shows free (lazy) AND a new hold succeeds (sweep) | integration | `npx vitest run tests/booking/hold-expiry.test.ts` | 04-04 · T3 · W2 | ❌ W0 | ⬜ pending |
| SEARCH-03 | True free-window filter: no-free listing excluded; free listing included; date-only vs date+time; block honored; venue-tz | integration | `npx vitest run tests/search/availability-filter.test.ts` | 04-03 · T2 · W2 | ❌ W0 | ⬜ pending |
| SEARCH-01 | Radius: `::geography` returns within-N-km, excludes beyond; distance value correct | integration | `npx vitest run tests/search/radius.test.ts` | 04-03 · T1 · W2 | ❌ W0 | ⬜ pending |
| SEARCH-02 / SEARCH-04 | Activity type OR tag match (single `category`, incl. activity-tag-only); price filter bounds | integration | `npx vitest run tests/search/filters.test.ts` | 04-03 · T1 · W2 | ❌ W0 | ⬜ pending |
| SEARCH-05 (D-16) | Non-bookable (draft / unverified email / payouts-off) never appears in search | integration | `npx vitest run tests/search/bookable-gate.test.ts` | 04-03 · T1 · W2 | ❌ W0 | ⬜ pending |
| BOOK-01 (SC#2) | Server re-derives price (hours×hourly \| dayRate); tampered client price ignored; PHP display | unit + integration | `npx vitest run tests/booking/pricing.test.ts` | 04-04 · T1 · W2 | ❌ W0 | ⬜ pending |
| BOOK-01 | State machine: pending→confirmed; pending→cancelled on expiry; confirm re-checks expiry; idempotent re-confirm | integration | `npx vitest run tests/booking/state-machine.test.ts` | 04-06 · T1 · W3 | ❌ W0 | ⬜ pending |
| BOOK-02 / BOOK-03 | Confirmation page owner-gated (non-owner → 404/gated) | integration + E2E | `npx vitest run tests/booking/state-machine.test.ts -t "owner"` (+ E2E) | 04-06 · T1 · W3 + 04-08 · T1 · W5 | ❌ W0 | ⬜ pending |
| SEARCH-05 + full flow | search → filter → card → listing → Book → reserve (countdown) → Confirm → confirmation; + expiry UX | E2E | `npm run test:e2e -- search-and-book` | 04-08 · T1 · W5 | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Each gap is created during execution by the plan/task noted; boxes stay unchecked until `wave_0_complete: true`.

- [ ] `src/lib/validation/booking.ts` — add `searchParamsSchema` (single combined `category`) + `bookingCreateSchema` (scaffold `slotSelectionSchema` already exists) — **04-02 · T1 · W1**
- [ ] `tests/booking/pending-hold.test.ts` — concurrency + idempotency + savepoint (extend `makeRacingClients` from `exclusion-race.test.ts`) — **04-04 · T2 · W2**
- [ ] `tests/booking/hold-expiry.test.ts` — lazy read + sweep (BOOK-02) — **04-04 · T3 · W2**
- [ ] `tests/booking/pricing.test.ts` (**04-04 · T1 · W2**) + `tests/booking/state-machine.test.ts` (**04-06 · T1 · W3**)
- [ ] `tests/search/{availability-filter (04-03 · T2),radius,filters,bookable-gate (04-03 · T1)}.test.ts` (+ a geo-seed helper with known coords/distances via **04-02 · T2 · W1**) — **W2**
- [ ] `e2e/search-and-book.spec.ts` (reuse the UAT seed host `host@fitout.test` + a bookable seed set, D-38; mirror `e2e/availability.spec.ts`) — **04-08 · T1 · W5**
- [ ] `scripts/seed.ts` (D-38) — the search tests and E2E depend on it — **04-02 · T2 · W1**
- [ ] No framework install needed (Vitest + Playwright already present)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live hold countdown visual ("held for 14:59…") ticking + final "expired" copy | BOOK-01 / D-44 | Real-time visual timing precision is awkward to assert deterministically; E2E covers the state transition, not the per-second visual | On the reserve page, confirm the countdown decrements and, at expiry, shows the "your hold expired — the slot was released" state with a path back |

*E2E (`search-and-book.spec.ts`) covers the full flow incl. the expiry state transition; the item above is an optional per-second visual spot-check only.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
</content>
