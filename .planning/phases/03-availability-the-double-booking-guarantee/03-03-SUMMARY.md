---
phase: 03-availability-the-double-booking-guarantee
plan: 03
subsystem: availability
tags: [zod, validation, server-actions, idor, ownership, timezone, tzdate, timestamptz, operating-hours, availability-block, vitest]

# Dependency graph
requires:
  - phase: 03-availability-the-double-booking-guarantee (Plan 01)
    provides: "operating_hours + availability_block tables; listing.unitCount/timezone; @date-fns/tz installed; per-worker isolated-schema test harness"
  - phase: 02-listings-host-onboarding (Plan 03)
    provides: "src/app/actions/listing.ts — the session + assertOwnership (IDOR) + safeParse + replace-the-set server-action contract cloned here; tests/helpers/auth.ts makeTestAuth + signUp; the real-server-action test harness (crud.test.ts)"
provides:
  - "src/lib/validation/availability.ts — shared Zod: weeklyHoursSchema (close>open, no same-day overlap '[)', on-the-hour, :ss-tolerant), hoursWindowSchema, blockSchema (whole-day/partial, unit/whole-listing); WeeklyHoursInput/HoursWindowInput/BlockInput types"
  - "src/app/actions/operating-hours.ts — saveOperatingHours(listingId, WeeklyHoursInput): session + ownership + safeParse + replace-the-set upsert (D-25 multiple windows/day)"
  - "src/app/actions/blocks.ts — addBlock(listingId, BlockInput) + removeBlock(listingId, blockId): session + ownership + venue-tz→UTC timestamptz via TZDate; owner-scoped unblock (D-24 close-only)"
affects: [03-04-host-availability-editor-ui, Phase-4-booking-core]

# Tech tracking
tech-stack:
  added: []
  patterns: ["shared Zod validated in RHF form + re-validated server-side (never trust the client)", ":ss-tolerant time regex + on-the-hour refine on the normalized 'HH:mm' prefix (DB round-trip seam)", "clone listing.ts session+assertOwnership+safeParse+replace-the-set contract into new availability actions", "venue-local wall clock → UTC timestamptz via TZDate normalized through the epoch for the drizzle insert"]

key-files:
  created:
    - src/lib/validation/availability.ts
    - src/app/actions/operating-hours.ts
    - src/app/actions/blocks.ts
    - tests/availability/hours-validation.test.ts
    - tests/availability/blocks.test.ts
  modified: []

key-decisions:
  - "The on-the-hour refine is applied to the NORMALIZED 'HH:mm' prefix (t.slice(0,5).endsWith(':00')) with a :ss-tolerant regex, so a DB-read 'HH:mm:ss' window re-validates on an edit re-save (06:00:00 → pass) while an off-hour :ss value is still rejected (06:15:00 → '06:15' → reject). This closes the 03-04 edit round-trip seam (the plan BLOCKER) — proven both purely and end-to-end through saveOperatingHours."
  - "session + requireUserId + assertOwnership were CLONED LOCALLY into each new action file (matching listing.ts, which clones from capability.ts) rather than extracted to a shared helper — the PATTERNS 'exact' clone relationship and the plan's explicit instruction; the (host) route group alone is never the gate (T-03-IDOR-HOURS)."
  - "saveOperatingHours is a 'replace the set' full-state save (delete all windows for the listing → insert the parsed set in one tx) so the editor is stateless per save and clearing all windows = closed (D-25)."
  - "removeBlock's DELETE is scoped to (blockId AND listingId) behind assertOwnership so a non-owner can never unblock someone's listing (T-03-BLOCK-UNBLOCK); blocks are close-only/subtractive with NO positive-override path (D-24)."
  - "Block times are stored as timestamptz (UTC) derived from the venue-local date via TZDate (listing.timezone), normalized through the epoch to a plain Date for the drizzle insert (reusing the 03-02 finding); whole-day = venue-local 00:00 → next-day 00:00."

patterns-established:
  - "Shared availability Zod: the SAME weeklyHoursSchema/blockSchema validate in the Plan-04 RHF editor and re-validate in these server actions — the client is never trusted for times/units"
  - "Every host availability write: requireUserId → assertOwnership(listingId, userId) → schema.safeParse → tx write re-scoped to the owner → revalidatePath(host + public routes) → { ok }"
  - ":ss-tolerant HH:mm time contract so Postgres/Drizzle `time` DB round-trips ('HH:mm:ss') never false-reject on re-save"

requirements-completed: []  # AVAIL-01/02 host write path is complete here, but the host editor UI (03-04) surfaces it; REQUIREMENTS.md is flipped at the Phase-3 transition per repo convention (matches 03-01/03-02)

# Metrics
duration: 6min
completed: 2026-07-11
---

# Phase 3 Plan 03: Host Availability Write Path (Hours + Blocks) Summary

**The shared Zod contract for weekly operating hours (close>open, no same-day overlap '[)', on-the-hour, :ss-tolerant for the DB round-trip) and close-only blocks (whole-day/partial, unit or whole-listing), plus the `saveOperatingHours` / `addBlock` / `removeBlock` server actions — each session-checked, ownership-guarded (IDOR), server-revalidated, and (for blocks) storing venue-local times as UTC timestamptz via TZDate.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-11T04:49:32Z
- **Completed:** 2026-07-11T04:56:00Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments

- **Shared availability Zod (`src/lib/validation/availability.ts`):** `weeklyHoursSchema` (array of windows; close>open, no same-day overlap with '[)' touching-endpoints allowed, on-the-hour enforced), `hoursWindowSchema`, and `blockSchema` (whole-day or partial range; unit>=1 or null = whole listing). All UI-SPEC error copy verbatim ("Close time must be after open time.", "These hours overlap. Adjust them so each block stands on its own.", "Hours must start on the hour.", "Pick a start and end time to block.", "Pick an end time that's after the start time.").
- **The 03-04 round-trip seam closed:** the time regex is `:ss`-tolerant and the on-the-hour refine runs on the normalized `HH:mm` prefix, so a DB-read `06:00:00` re-validates while `06:15:00` is still rejected — proven purely (`hours-validation.test.ts`) AND end-to-end through `saveOperatingHours` (read back `06:00:00` → re-save → ok).
- **`saveOperatingHours` (`operating-hours.ts`):** session + `assertOwnership` (IDOR) + `weeklyHoursSchema.safeParse` + replace-the-set upsert (delete all windows for the listing → insert the parsed set in one tx) + revalidate host & public routes (D-25 multiple windows/day).
- **`addBlock` / `removeBlock` (`blocks.ts`):** `addBlock` converts the venue-local date (+ start/end, or 00:00→next-day 00:00 for whole day) to UTC timestamptz via `TZDate` and inserts one subtractive row (unit-scoped or whole-listing); `removeBlock` deletes scoped to `(blockId AND listingId)` behind ownership. Close-only (D-24) — no positive-override path.
- **Tests green:** `hours-validation.test.ts` (18 pure cases) + `blocks.test.ts` (11 integration cases through the REAL actions — tz conversion, unit scoping, non-owner add/unblock rejected, replace-the-set, off-hour reject, `HH:mm:ss` re-save). Full `tests/availability` = 7 files / 62 tests green; full suite 36 files / 200 tests green; `tsc --noEmit` + eslint clean.

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD): shared availability Zod** — RED `5646af2` (test) → GREEN `cfb83bc` (feat). No refactor needed.
2. **Task 2: host availability write path (actions + integration test)** — `3a7525b` (feat).

## Files Created

- `src/lib/validation/availability.ts` — shared Zod (`weeklyHoursSchema` / `hoursWindowSchema` / `blockSchema` + inferred types)
- `src/app/actions/operating-hours.ts` — `saveOperatingHours` (session + ownership + safeParse + replace-the-set)
- `src/app/actions/blocks.ts` — `addBlock` + `removeBlock` (session + ownership + TZDate venue-tz→UTC, owner-scoped unblock)
- `tests/availability/hours-validation.test.ts` — 18 pure validation cases (close>open, overlap, on-the-hour, :ss round-trip, block ranges)
- `tests/availability/blocks.test.ts` — 11 integration cases through the real actions (tz conversion, unit scoping, IDOR, replace-the-set)

## Decisions Made

- **On-the-hour refine on the normalized `HH:mm` prefix + `:ss`-tolerant regex** so the DB `time` round-trip (`HH:mm:ss`) never false-rejects an untouched window on re-save, while off-hour values (`06:15:00`) are still rejected. This is the explicit BLOCKER seam for 03-04.
- **Cloned `requireUserId` / `assertOwnership` locally** into each action file (matching listing.ts's clone-from-capability.ts precedent and the PATTERNS 'exact' relationship) rather than extracting a shared helper — keeps the security contract co-located and greppable per file.
- **`saveOperatingHours` = replace-the-set** (full-state save) so the editor stays stateless per save (D-25).
- **`removeBlock` scoped to `(blockId AND listingId)` behind ownership** (T-03-BLOCK-UNBLOCK); **blocks are close-only** — no positive-override / open-normally-closed path (D-24).
- **Block times are UTC timestamptz derived from the venue tz via TZDate** (T-03-TZNAIVE), normalized through the epoch to a Date for the drizzle insert (reusing the 03-02 finding).

## Deviations from Plan

None — plan executed exactly as written. All acceptance-criteria greps matched, both verification commands are green, and no auto-fix (Rule 1/2/3) or architectural (Rule 4) deviations were required. The plan's Task-1 snippet was used essentially verbatim (only the overlap-grouping one-liner was rewritten into a lint-clean multi-line form with the same behavior).

## Threat Model Coverage

All four registered threats mitigated and test-guarded:

- **T-03-IDOR-HOURS** (EoP) — `assertOwnership(listingId, userId)` before every write in both action files; non-owner save/add/unblock all rejected (blocks.test.ts IDOR cases).
- **T-03-VALIDATE** (Tampering) — `weeklyHoursSchema`/`blockSchema` `safeParse` server-side → fieldErrors; off-hour + invalid-range writes rejected with no DB effect.
- **T-03-BLOCK-UNBLOCK** (Tampering) — `removeBlock` DELETE scoped `(blockId AND listingId)` behind ownership; non-owner unblock leaves the block intact.
- **T-03-TZNAIVE** (Tampering) — block start/end stored as timestamptz UTC via TZDate; Manila +8 conversion asserted (10:00 → 02:00Z; whole day 00:00 → prior-day 16:00Z).

## Issues Encountered

None. `git`'s LF→CRLF warnings on commit are the expected Windows line-ending normalization (non-blocking).

## Next Phase Readiness

- **Ready for 03-04 (host availability editor UI):** `weeklyHoursSchema`/`blockSchema` are the exact schemas the RHF editor binds via `@hookform/resolvers/zod`; `saveOperatingHours`/`addBlock`/`removeBlock` are the wired server actions; the `:ss` round-trip seam is closed and proven so the editor can safely read DB `HH:mm:ss` windows, normalize via `.slice(0,5)`, and re-save without false rejects.
- **Carry-forward for Phase 4:** `availability_block` rows are subtractive/close-only here; block-vs-booking is intentionally NOT DB-enforced (RESEARCH Q1) — the Phase-4 `createBooking` insert tx must guard block-vs-booking. AVAIL-01/02 host write path is complete but stays "Pending" in REQUIREMENTS.md until the Phase-3 transition (the 03-04 editor UI surfaces it), matching the 03-01/03-02 convention.

## Self-Check: PASSED

- All 5 created files present on disk.
- Both Task commits (`cfb83bc`, `3a7525b`) plus the RED test commit (`5646af2`) found in git log.
- `tests/availability/hours-validation.test.ts` + `tests/availability/blocks.test.ts` green; full `tests/availability` 62/62; full suite 200/200; tsc + eslint clean.

---
*Phase: 03-availability-the-double-booking-guarantee*
*Completed: 2026-07-11*
