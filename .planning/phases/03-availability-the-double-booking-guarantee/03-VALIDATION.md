---
phase: 3
slug: availability-the-double-booking-guarantee
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-11
validated: 2026-08-01
audited: 2026-08-01
audit_scope: "Retroactive close-out during the v1.0 milestone audit — the contract was seeded pre-planning and never updated after Phase 3 shipped. Every row and every Wave-0 item below was re-checked and re-run first-hand on 2026-08-01."
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `03-RESEARCH.md` § Validation Architecture. Per-task rows are finalized once `*-PLAN.md` task IDs exist.
>
> **STATUS UPDATE (2026-08-01, v1.0 milestone audit).** This file sat at `status: draft` /
> `nyquist_compliant: false` for the whole milestone — it was seeded before planning and never
> refreshed, which mattered because Phase 3 owns the double-booking guarantee, so it read as the one
> load-bearing phase with unfinished validation. That reading was wrong: `03-VERIFICATION.md` passed
> **12/12** on 2026-07-14, and every Wave-0 artifact and every target file named below now exists.
> Re-run first-hand on 2026-08-01: **`npx vitest run tests/availability` → 18 files / 168 tests
> passed**, and **`npx playwright test e2e/availability.spec.ts` → 4/4 passed**.

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
| **SC#4** | Two concurrent overlapping inserts (same listing+unit) → exactly one wins, other `23P01` | integration (2 conns) | `npx vitest run tests/availability/exclusion-race.test.ts` | `tests/availability/exclusion-race.test.ts` | ✅ | ✅ green |
| **SC#4** | Multi-unit: unit 1 & unit 2 same window both succeed; 3rd on unit 1 → `23P01` | integration | `npx vitest run tests/availability/exclusion-race.test.ts` | same file | ✅ | ✅ green |
| **SC#4** | Back-to-back 10–11 & 11–12 both succeed (`'[)'`); 10–11 & 10:30–11:30 → `23P01` | integration | `npx vitest run tests/availability/exclusion-race.test.ts` | same file | ✅ | ✅ green |
| **SC#4** / D-28 | Partial WHERE: cancelled/declined row frees the slot (overlapping insert succeeds) | integration | `npx vitest run tests/availability/exclusion-race.test.ts` | same file | ✅ | ✅ green |
| **SC#4** | Server action maps `23P01` → clean "That time was just taken" | unit | `npx vitest run tests/availability/error-map.test.ts` | `tests/availability/error-map.test.ts` | ✅ | ✅ green |
| **SC#4** / D-21 | `createBooking` auto-assigns lowest free unit + retries on `23P01` bounded by `unitCount` (unit 1 occupied → returns unit 2; `unitCount=1` exhaustion → mapped "just taken", no raw throw) | integration | `npx vitest run tests/availability/units.test.ts` | `tests/availability/units.test.ts` | ✅ | ✅ green |
| **AVAIL-03** | Read model: hours − blocks − bookings → correct free-unit count; whole-listing block ⇒ 0 free | integration | `npx vitest run tests/availability/read-model.test.ts` | `tests/availability/read-model.test.ts` | ✅ | ✅ green |
| **AVAIL-03** / SC#2 | tz/DST: a venue-local slot maps to the right UTC instant + right calendar day | unit | `npx vitest run tests/availability/slots.test.ts` | `tests/availability/slots.test.ts` | ✅ | ✅ green |
| **AVAIL-01** | Operating-hours validation: close > open, no window overlap | unit | `npx vitest run tests/availability/hours-validation.test.ts` | `tests/availability/hours-validation.test.ts` | ✅ | ✅ green |
| **AVAIL-02** | Block add/remove; unit-scoped vs whole-listing subtract correctly | integration | `npx vitest run tests/availability/blocks.test.ts` | `tests/availability/blocks.test.ts` | ✅ | ✅ green |
| **AVAIL-04** / **AVAIL-05** | Calendar in venue tz (tz note visible); blocked/occupied slots `aria-disabled` & unselectable; read-only when `!bookable`; consecutive-run selection | E2E | `npx playwright test e2e/availability.spec.ts` | `e2e/availability.spec.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Re-run evidence (2026-08-01):** `npx vitest run tests/availability` → **18 files / 168 tests passed**
(the directory has grown from the 8 files this contract anticipated to 18, absorbing the Phase-9
open-capacity race and read-model suites). `npx playwright test e2e/availability.spec.ts` →
**4 passed (22.1s)**, covering the venue-tz note, unselectable booked/blocked hours, adjacent and
non-adjacent range fill, and the read-only calendar on a published-but-not-payable listing.

**On SC#4, the phase's one non-negotiable gate:** `03-VERIFICATION.md` recorded that the live
`booking_no_overlap` EXCLUDE constraint was queried directly out of the catalog and matched the spec,
and that a genuine two-connection race yields `40P01` **or** `23P01` — both of which prevent the
double-book, and both of which the server action maps cleanly. Phase 9 later narrowed the same
constraint to `… AND open_capacity = false` and re-inspected it live via `psql`; the exclusive path is
unchanged.

---

## Wave 0 Requirements

- [x] `tests/helpers/db.ts` — `makeRacingClients(schema, n)` **present at line 59**, so the race test opens ≥2 real connections on ONE isolated schema. **Load-bearing for SC#4** — the plain `makeClient` uses `max: 1`, which would serialize "concurrent" inserts and prove nothing.
- [x] `drizzle/0004_availability_tables.sql` (generated) + `drizzle/0005_booking_exclusion.sql` (hand-authored: `CREATE EXTENSION btree_gist` + the `EXCLUDE` constraint) — **both present**; live DB confirms `postgis` and `btree_gist` are installed.
- [x] `tests/availability/exclusion-race.test.ts` — SC#4 (two-connection race), multi-unit, back-to-back boundary, partial-WHERE freeing.
- [x] `tests/availability/read-model.test.ts` — hours − blocks − bookings free-unit math.
- [x] `tests/availability/slots.test.ts` — TZDate slot enumeration / DST / horizon + `start > now` gating.
- [x] `tests/availability/units.test.ts` — `createBooking` unit auto-assignment + `23P01`-retry loop (bounded by `unitCount`); proves the must_have truth, not just the pure error-map.
- [x] `tests/availability/hours-validation.test.ts` (incl. the `"HH:mm:ss"` round-trip regression + off-the-hour reject), `tests/availability/blocks.test.ts`, `tests/availability/error-map.test.ts`.
- [x] `e2e/availability.spec.ts` — venue-tz note, unselectable blocked slots, `!bookable` read-only, consecutive-run selection.

*All eight Wave-0 items confirmed present 2026-08-01.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| — | — | — | — |

*All phase behaviors have automated verification (integration for the constraint + read model, unit for slot/tz/validation math, Playwright E2E for the calendar interaction).*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (racing-clients helper + migrations + test stubs) — **all eight closed**
- [x] No watch-mode flags
- [x] Feedback latency < 30s — measured **21.65s** for `npx vitest run tests/availability` on 2026-08-01
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** retroactively signed off 2026-08-01 during the v1.0 milestone audit. Every row in the
verification map has a real backing file that was re-run and is green; every Wave-0 dependency is
present; the phase's own `03-VERIFICATION.md` passed 12/12 on 2026-07-14 including a direct catalog
inspection of the live EXCLUDE constraint and a genuine two-connection race. The only thing that was
ever missing here was this file's own bookkeeping.
