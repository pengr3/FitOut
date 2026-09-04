---
phase: 14
slug: host-tooling
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-23
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `14-RESEARCH.md` § Validation Architecture. Every command below was measured against the
> tree at `e59f10e`, not estimated.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 (`vitest.config.ts`, node env; jsdom per-file via `// @vitest-environment jsdom`) |
| **Design gate** | Vitest, `vitest.design.config.ts` — DB-free and **build-blocking** |
| **E2E** | Playwright 1.60.0, `playwright.config.ts`, project `chromium` |
| **Visual regression** | Playwright, project `visual` — **Linux-only, CI-only** (does not exist on win32, `playwright.config.ts:39`) |
| **Quick run command** | `npm run test:design` |
| **Full suite command** | `npm test` (needs Docker) · `npm run test:design` · `npx tsc --noEmit` |
| **Build gate** | `npm run build` = `lint && test:design && next build` |
| **Estimated runtime** | design suite **47.8s / 816 tests**; the five touched dirs **116s / 1031 tests / 98 files** |

**Measured green baseline (before any Phase-14 edit):**
`npm run test:design` → 48 files / 816 passed / 3 skipped / 0 failed · `npx tsc --noEmit` → exit 0 ·
`npx vitest run tests/{listing,host,booking,availability,security}` → 98 files / 1031 passed.

---

## Sampling Rate

- **After every task commit:** `npm run test:design` (48s) **plus** `npx vitest run <the touched dir>`.
  If the task touched a gated inventory, name the gate: `npm run test:design -- <name>`.
- **After every plan wave:** `npx tsc --noEmit` **+** `npm run test:design` **+**
  `npx vitest run tests/listing tests/host tests/booking tests/availability tests/security`.
- **E2E, per wave merge:** at most **three named spec files per Playwright invocation**. Never a bare
  `npx playwright test` — four DB-seeding specs in one invocation exhaust the Postgres connection ceiling
  and produce timing-shaped failures on shipped, untouched specs (`12/deferred-items.md` `[12-02]`,
  `[12-03]`, `[12-06]`). A red from a bare invocation is not evidence of a defect.
- **Before `/gsd:verify-work`:** `npm run build` green, full `npm test` green.
- **Phase gate:** a **CI** run. A phase must not close on a locally-green design suite alone — deferred
  item `[13-16]` is the record of what that costs.
- **Max feedback latency:** 48 seconds (the design suite), which is the gate that fails the build.

---

## Per-Task Verification Map

The requirement → behaviour → command map lives in `14-RESEARCH.md` § Validation Architecture and is the
authority; it is not duplicated here. Its shape, by requirement:

| Req | Behaviours validated | New test files | Existing coverage |
|-----|----------------------|----------------|-------------------|
| HFLOW-03 | venue-local `today` predicate across two zones at midnight · owner-scope in the WHERE · D-142's "next" from the same statement · three agenda states · one accent element on `/host` · three consumers report the same N | `tests/booking/agenda-query.test.ts`, `tests/host/agenda-states.test.tsx`, `e2e/host-dashboard.spec.ts` | `brand-recipe` (pin must not move), `tests/security/bookings-owner-scope.test.ts` (extend) |
| HFLOW-01 | countdown digits are strictly the largest computed font-size in the row at 3 widths · zero links inside a request row · `lead` branch adds no alarm token · refusal renders one `role="status"` and zero error toasts · inbox-zero adopts `EmptyState` | `tests/host/request-row.test.tsx`, `tests/host/request-refusal.test.tsx`, `e2e/host-inbox-hierarchy.spec.ts` | `tests/booking/{request-countdown,host-requests,request-lifecycle}`, `phase13-surface-gates`, `empty-state-adoption` |
| HFLOW-02 | **D-151 no-regression: 8 markers / "of 8" drop-in, 9 / "of 9" whole-space** · visited-by-key survives a mid-flow mode switch · one accent marker, never a `<button>` · every visited marker named and ≥24×24, zero future markers in tab order · checklist appears exactly once per document · save state reads the real result with zero `setTimeout` | `tests/listing/wizard-rail.test.tsx`, `tests/listing/publish-checklist.test.tsx`, `tests/listing/wizard-save-state.test.tsx` | `tests/listing/wizard-occupancy.test.tsx` cases (3)+(4) — **already covers D-151** |
| HFLOW-04 | `deriveWeekStrip` returns 7 entries for every input including `[]` · segments match the sentence · editing one time changes that day's sentence with zero network calls · bars compute `aria-hidden`, a11y tree has 7 sentences and 0 bars · both editors leave `ALLOWED_RAW_CARD` · tab partition / filter / page size / owner-scope unchanged | `tests/availability/week-strip.test.ts`, `tests/availability/week-strip.test.tsx` | `card-pattern-coverage`, `tests/availability/*`, `tests/booking/views.test.ts` |
| HFLOW-05 | only the shell constant, `PageHeader` and type-role classes changed — **every string literal unchanged** | `tests/design/earnings-freeze.test.ts` (AST) | `type-scale.test.ts:534` pins `payout-summary.tsx` at 2 Display uses — **do not "fix" it** |
| Cross | one `<h1>` per document on all five surfaces in every state and both modes, all five the same size · `scrollWidth <= clientWidth` at 320px, controls ≥24px, primaries ≥44px · `LIVE_REGION_EXCLUSIONS.length === 0` · row heights within tolerance of the skeleton · `drizzle/` unchanged | `e2e/host-headings.spec.ts` | `e2e/overflow-320.spec.ts` (extend ROUTES), `live-regions` (**rewrite `:491`**), `e2e/skeleton-geometry.spec.ts` (extend), `loading-coverage` |

---

## Wave 0 Requirements

Wave 0 is larger than usual because five committed gates assert the CURRENT shape and must be amended in
the same commit that changes it. The inventory amendments are Wave-0-shaped even though they are not
tests: everything else depends on them.

- [ ] `tests/booking/agenda-query.test.ts` — the day-boundary predicate against real Postgres, including
      the **two-zone straddling-midnight** fixture (HFLOW-03 / D-141)
- [ ] `tests/host/agenda-states.test.tsx` — the three agenda states and their hooks (HFLOW-03)
- [ ] `tests/host/request-row.test.tsx` — D-144 terminality, D-146 hierarchy in the DOM (HFLOW-01)
- [ ] `tests/host/request-refusal.test.tsx` — one region, zero error toasts (HFLOW-01)
- [ ] `tests/listing/wizard-rail.test.tsx` — visited-by-key, accessible names, tab order, mode switch (HFLOW-02)
- [ ] `tests/listing/publish-checklist.test.tsx` — exactly one instance per document (HFLOW-02)
- [ ] `tests/listing/wizard-save-state.test.tsx` — real result, no timer (HFLOW-02)
- [ ] `tests/availability/week-strip.test.ts` — the pure derivation (HFLOW-04)
- [ ] `tests/availability/week-strip.test.tsx` — the rendered strip and its sr-only equivalent (HFLOW-04)
- [ ] `tests/design/earnings-freeze.test.ts` — the AST string-literal freeze (HFLOW-05)
- [ ] `e2e/host-inbox-hierarchy.spec.ts` — computed font-size comparison at three widths (HFLOW-01)
- [ ] `e2e/host-dashboard.spec.ts` — the three-consumer N, and the agenda answered without a second click (HFLOW-03)
- [ ] `e2e/host-headings.spec.ts` — one `<h1>` per document across five surfaces (cross-cutting)
- [ ] **Inventory amendments, same commit as the change they describe:**
      `measurements.ts` +5 · `selector-contract.ts` +9 ·
      `live-regions.ts` rename + 3 rows + exclusion list → 0 + the numeric type-alias rename, **and the
      rewrite of `tests/design/live-regions.test.tsx:491`, whose `toBeGreaterThan(0)` and the UI-SPEC's
      `=== 0` cannot both hold** · `accent-uses.ts` entry 7 · `contrast-pairs.ts` two `reason` fields ·
      the three checklist gates that pin the success marker **by the file path `wizard.tsx`**
      (`status-vocab.test.ts:654`, `:662`, `empty-state-adoption.test.ts:458`) if D-149 extracts it
- [ ] **Framework install:** none — Vitest and Playwright are both present and current

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The nine visual-regression baselines | Cross (GATE-VRT) | `--project=visual` does not exist on win32 (`playwright.config.ts:39`); baselines are generated only inside the pinned `mcr.microsoft.com/playwright:v1.60.0-noble` image with `updateSnapshots: "none"` in CI | Extend `scripts/seed-baseline-fixtures.ts` — `vrt_host_1` ("Vera") already exists at `:189-200` with `can_host`, an activated payout wallet and 5 published listings with hours; what is missing is bookings at fixed instants and a host sign-in re-point. Then generate in CI. **If the fixture is not built in-phase, the baselines are DECLARED AND BLOCKED, and the phase says so rather than claiming coverage.** |
| The agenda reads correctly for a real two-timezone host | HFLOW-03 / D-141 | The integration test proves the predicate; only a human confirms the sentence reads right | UAT walk on a seeded two-venue host at a venue-local midnight boundary |
| The week strip makes a mistyped window obvious before saving | HFLOW-04 | This is the strip's entire purpose and it is a perceptual claim | UAT: set Monday 6 PM → 6 AM and confirm the strip shows it wrong at a glance, without saving |

---

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify
- [ ] Wave 0 covers all MISSING references, **including the five inventory amendments**
- [ ] No watch-mode flags
- [ ] Feedback latency < 48s
- [ ] E2E invocations name at most three spec files each
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
