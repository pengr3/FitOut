---
phase: 3
slug: availability-the-double-booking-guarantee
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-11
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `03-RESEARCH.md` § Validation Architecture. Per-task rows are finalized once `*-PLAN.md` task IDs exist.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (unit + integration, node env) + Playwright 1.x (E2E) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npx vitest run tests/availability` |
| **Full suite command** | `npm test` (Vitest) + `npm run test:e2e` (Playwright) |
| **DB isolation** | `tests/helpers/db.ts` — per-worker Postgres schema, replays `./drizzle` (incl. hand-authored `0005` exclusion migration) |
| **Estimated runtime** | ~30s (availability integration subset); full suite longer |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/availability` (fast; < 30s target for the integration subset)
- **After every plan wave:** Run `npm test` (full Vitest suite — must stay green with the new `0005` migration replayed)
- **Before `/gsd-verify-work`:** Full Vitest + `npm run test:e2e` green. **SC#4 (exclusion race) is the non-negotiable phase gate.**
- **Max feedback latency:** 30 seconds (availability subset)

---

## Per-Task Verification Map

> Requirement → test rows from research. `Task ID` / `Plan` / `Wave` are assigned when plans are created; the plan-checker (Dimension 8) enforces that every task carries one of these `<automated>` commands.

| Requirement / SC | Behavior | Test Type | Automated Command | Target File | File Exists | Status |
|------------------|----------|-----------|-------------------|-------------|-------------|--------|
| **SC#4** | Two concurrent overlapping inserts (same listing+unit) → exactly one wins, other `23P01` | integration (2 conns) | `npx vitest run tests/availability/exclusion-race.test.ts` | `tests/availability/exclusion-race.test.ts` | ❌ W0 | ⬜ pending |
| **SC#4** | Multi-unit: unit 1 & unit 2 same window both succeed; 3rd on unit 1 → `23P01` | integration | `npx vitest run tests/availability/exclusion-race.test.ts` | same file | ❌ W0 | ⬜ pending |
| **SC#4** | Back-to-back 10–11 & 11–12 both succeed (`'[)'`); 10–11 & 10:30–11:30 → `23P01` | integration | `npx vitest run tests/availability/exclusion-race.test.ts` | same file | ❌ W0 | ⬜ pending |
| **SC#4** / D-28 | Partial WHERE: cancelled/declined row frees the slot (overlapping insert succeeds) | integration | `npx vitest run tests/availability/exclusion-race.test.ts` | same file | ❌ W0 | ⬜ pending |
| **SC#4** | Server action maps `23P01` → clean "That time was just taken" | unit | `npx vitest run tests/availability/error-map.test.ts` | `tests/availability/error-map.test.ts` | ❌ W0 | ⬜ pending |
| **SC#4** / D-21 | `createBooking` auto-assigns lowest free unit + retries on `23P01` bounded by `unitCount` (unit 1 occupied → returns unit 2; `unitCount=1` exhaustion → mapped "just taken", no raw throw) | integration | `npx vitest run tests/availability/units.test.ts` | `tests/availability/units.test.ts` | ❌ W0 | ⬜ pending |
| **AVAIL-03** | Read model: hours − blocks − bookings → correct free-unit count; whole-listing block ⇒ 0 free | integration | `npx vitest run tests/availability/read-model.test.ts` | `tests/availability/read-model.test.ts` | ❌ W0 | ⬜ pending |
| **AVAIL-03** / SC#2 | tz/DST: a venue-local slot maps to the right UTC instant + right calendar day | unit | `npx vitest run tests/availability/slots.test.ts` | `tests/availability/slots.test.ts` | ❌ W0 | ⬜ pending |
| **AVAIL-01** | Operating-hours validation: close > open, no window overlap | unit | `npx vitest run tests/availability/hours-validation.test.ts` | `tests/availability/hours-validation.test.ts` | ❌ W0 | ⬜ pending |
| **AVAIL-02** | Block add/remove; unit-scoped vs whole-listing subtract correctly | integration | `npx vitest run tests/availability/blocks.test.ts` | `tests/availability/blocks.test.ts` | ❌ W0 | ⬜ pending |
| **AVAIL-04** / **AVAIL-05** | Calendar in venue tz (tz note visible); blocked/occupied slots `aria-disabled` & unselectable; read-only when `!bookable`; consecutive-run selection | E2E | `npx playwright test e2e/availability.spec.ts` | `e2e/availability.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/helpers/db.ts` — add `makeRacingClients(schema, n)` (or export a non-`max:1` client) so the race test can open ≥2 connections on ONE isolated schema. **Load-bearing for SC#4** — the existing `makeClient` uses `max: 1`, which would serialize "concurrent" inserts and prove nothing.
- [ ] `drizzle/0004_availability_tables.sql` (generated) + `drizzle/0005_booking_exclusion.sql` (hand-authored: `CREATE EXTENSION btree_gist` + the `EXCLUDE` constraint) — both must exist before these tests can replay in the harness.
- [ ] `tests/availability/exclusion-race.test.ts` — SC#4 (two-connection race), multi-unit, back-to-back boundary, partial-WHERE freeing.
- [ ] `tests/availability/read-model.test.ts` — hours − blocks − bookings free-unit math.
- [ ] `tests/availability/slots.test.ts` — TZDate slot enumeration / DST / horizon + `start > now` gating.
- [ ] `tests/availability/units.test.ts` — `createBooking` unit auto-assignment + `23P01`-retry loop (bounded by `unitCount`); proves the must_have truth, not just the pure error-map.
- [ ] `tests/availability/hours-validation.test.ts` (incl. the `"HH:mm:ss"` round-trip regression + off-the-hour reject), `tests/availability/blocks.test.ts`, `tests/availability/error-map.test.ts`.
- [ ] `e2e/availability.spec.ts` — venue-tz note, unselectable blocked slots, `!bookable` read-only, consecutive-run selection.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| — | — | — | — |

*All phase behaviors have automated verification (integration for the constraint + read model, unit for slot/tz/validation math, Playwright E2E for the calendar interaction).*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (racing-clients helper + migrations + test stubs)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
