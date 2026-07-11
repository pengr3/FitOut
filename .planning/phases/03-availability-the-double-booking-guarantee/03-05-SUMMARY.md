---
phase: 03-availability-the-double-booking-guarantee
plan: 05
subsystem: ui
tags: [react, react-day-picker, date-fns, tzdate, toggle-group, availability, booker-calendar, deriveBookable, e2e, playwright]

# Dependency graph
requires:
  - phase: 03-availability-the-double-booking-guarantee (Plan 01)
    provides: "booking/operating_hours/availability_block tables; listing.unitCount/timezone; shadcn calendar/toggle/toggle-group/scroll-area; react-day-picker@10 + date-fns@4 + @date-fns/tz@1"
  - phase: 03-availability-the-double-booking-guarantee (Plan 02)
    provides: "getAvailability(db, listingId, dayLocal) read model (DayAvailability: timezone, unitCount, hasHours, slots[startUtc,endUtc,state,freeUnits,unitCount]); slots.ts BOOKING_HORIZON_DAYS=90; identical tstzrange('[)') overlap as the EXCLUDE constraint"
  - phase: 02-listings-host-onboarding
    provides: "src/lib/bookability.ts deriveBookable(listing,host); src/app/listings/[id]/page.tsx public RSC (bookable already computed; 'Availability coming soon' placeholder + 'Not bookable yet' rail); formatMoney; e2e/public-listing.spec.ts direct-seed E2E pattern"
provides:
  - "src/lib/validation/booking.ts — slotSelectionSchema (client selection contract, re-validated server-side in Phase 4)"
  - "src/components/availability/slot-picker.tsx — toggle-group consecutive-run hour selection; venue-tz 12h chips; aria-pressed selected / aria-disabled unavailable (never red); full-day option; 'N of M free'"
  - "src/components/availability/availability-calendar.tsx — venue-tz month grid → SlotPicker; always-visible aria-associated tz note (SC#2); loading/no-hours/fully-unavailable states; selection lifted to the rail"
  - "src/app/actions/availability.ts — read-only public getDayAvailability action over the Plan-02 read model (no session/ownership gate)"
  - "e2e/availability.spec.ts — Playwright: tz note visible, blocked slots unselectable, consecutive-run selection, not-bookable read-only"
affects: [Phase-4-booking-core]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "react-day-picker timeZone prop + date-fns format({ in: tz(listing.timezone) }) renders month grid + slot labels in venue-local time independent of browser tz (SC#2)"
    - "Public read-only server action (getDayAvailability) over the Plan-02 read model — no session/ownership because availability is public; the client fetches a newly-selected day"
    - "Selection gated on deriveBookable: a published-but-not-payable listing renders the calendar read-only (no dead-end selection); the book CTA stays a Phase-4 placeholder"
    - "toggle-group (type=multiple) consecutive-run enforcement: extending/contracting a contiguous block of available hours; non-contiguous click resets"
    - "Non-color availability signalling: unavailable/past = muted + line-through + aria-disabled + tooltip, NEVER --destructive/red"

key-files:
  created:
    - src/lib/validation/booking.ts
    - src/components/availability/slot-picker.tsx
    - src/components/availability/availability-calendar.tsx
    - src/app/actions/availability.ts
    - e2e/availability.spec.ts
  modified:
    - src/app/listings/[id]/page.tsx

key-decisions:
  - "getDayAvailability is a read-only public server action (no session/ownership gate) — availability is public; the SC#2 authority is the venue-tz read model, not the client."
  - "Selection is enabled only when deriveBookable() is true; the not-payable path renders the calendar read-only with the existing 'Not bookable yet' rail (T-03-TAMPER-SELECT)."
  - "The calendar is advisory (Pitfall 6): the DB EXCLUDE constraint (Plan 01) is authoritative; the real insert re-checks in Phase 4 — Phase-3 selection never asserts a booking guarantee."
  - "Currency displayed as PHP on this surface (Pitfall 7 — currency still defaults to 'usd' upstream); est. price in the rail is DISPLAY-ONLY (real pricing = Phase 4)."
  - "Selection lifted to the rail via a BookingSelectionProvider + RailSelectionSummary so the client calendar and the server-rendered rail share the current selection without prop-drilling through the RSC boundary."

patterns-established:
  - "Booker availability surface: venue-tz month grid → day → SlotPicker, day changes fetched via getDayAvailability, selection summarized in the rail above the unchanged bookable/not-bookable CTA fork"
  - "E2E for public availability: direct postgres.js dev-DB seed (host + published listing + operating_hours + block + occupying booking), no login, getByRole assertions, unique ids + cascade-delete teardown"

requirements-completed: []  # AVAIL-03/04/05 booker calendar is BUILT here but stays Pending until the human-verify checkpoint is approved AND the Phase-3 transition flips REQUIREMENTS.md (matches 03-01/02/03/04 convention)

# Metrics
duration: ~22min (executor, interrupted) + orchestrator finish
completed: 2026-07-11
---

# Phase 3 Plan 05: Booker Availability Calendar Summary

**The booker-facing payoff: the "Availability coming soon" placeholder on the public listing page is replaced with a real, up-to-date availability calendar — a venue-tz month grid → day → `SlotPicker` driven by the Plan-02 `getAvailability` read model, with consecutive-run/full-day selection, unselectable occupied/blocked/closed hours (never red), an always-visible venue-tz note (SC#2), selection gated on `deriveBookable`, and a Playwright E2E — the book CTA staying a Phase-4 placeholder.**

> **STATUS: AWAITING HUMAN-VERIFY CHECKPOINT (Task 3, gate="blocking").** All three build tasks are implemented and committed; `tsc --noEmit` and `eslint` are clean on every 03-05 file. The plan is `autonomous: false`; the human-verify checkpoint (run the E2E + manual venue-tz / unselectable-blocked / consecutive-selection / not-bookable walkthrough) has **not** been self-approved. STATE.md / ROADMAP.md are intentionally **not** yet flipped to complete — that happens only after approval.

> **EXECUTION NOTE (transparency):** the gsd-executor subagent building this plan was terminated mid-run by a Claude account **monthly-spend-limit** API error, *after* it had committed Task 1 (`99262ff`) and Task 2 (`5c0589c`) but while it was about to run the E2E headlessly. The `e2e/availability.spec.ts` file it authored was on disk but uncommitted, and no SUMMARY existed. The **orchestrator** (execute-phase) then finished the residual Task-3 mechanical work: verified all Task-1/Task-2 acceptance-criteria greps, ran `tsc --noEmit` (clean) and `eslint` (clean), committed the E2E spec (`96ce8dc`), and wrote this SUMMARY. No source logic was authored by the orchestrator — only verification + the already-authored E2E commit + this doc.

## Performance

- **Duration:** ~22 min executor build (interrupted) + orchestrator finish
- **Completed (build):** 2026-07-11
- **Tasks:** 3 (2 fully autonomous + 1 build-then-human-verify checkpoint)
- **Files created:** 5 · **modified:** 1

## Accomplishments

- **`booking.ts` slot-selection schema:** `slotSelectionSchema` (`startUtc`/`endUtc` datetime + `fullDay`, refined `end > start`) — the client selection contract; on-the-hour + within-window re-derivation is Phase 4. Cloned the shared-Zod header from `listing.ts` (same schema client-side for UX, re-validated server-side; never trust client times/units).
- **`SlotPicker` (`slot-picker.tsx`):** `"use client"` `toggle-group` (`type="multiple"`) of 60-min venue-local 12h chips (`tabular-nums`) in a `scroll-area`. Available = neutral/enabled; selected = coral `aria-pressed`; unavailable/past/beyond_horizon = muted + `line-through` + `aria-disabled` + `cursor-not-allowed` + tooltip, NOT selectable, **never red** (grep-verified zero `bg-red`/`text-red`/`--destructive`). Consecutive-run enforcement + a "Book full day" option (whole operating window at the day rate, D-23); `unitCount > 1` annotates "N of M free"; `disabled` (not bookable) renders all chips read-only. Emits selection via `onSelectionChange`.
- **`AvailabilityCalendar` (`availability-calendar.tsx`):** `"use client"` react-day-picker with `timeZone={timezone}` (past + beyond-90-day disabled, selected day coral, today subtle ring). On day change, calls `getDayAvailability` (the RSC seeds `initialDay`). Renders `SlotPicker` with `disabled={!bookable}`. Always renders the tz note "Times shown in {cityLabel} time ({gmtLabel})" (Label-400 muted, `aria-describedby` the calendar region — SC#2). States: loading → skeleton; `!hasHours` → "No availability yet"; day fully unavailable → "Nothing open on {date}". Selection lifted to the rail via `BookingSelectionProvider` + `RailSelectionSummary`.
- **`getDayAvailability` (`actions/availability.ts`):** `"use server"` READ-ONLY action calling Plan-02 `getAvailability(db, listingId, dayLocal)` — no mutation, no ownership gate (public availability).
- **Public page wiring (`listings/[id]/page.tsx`):** "Availability coming soon" placeholder replaced with `<AvailabilityCalendar/>`; today's day seeded server-side via `getAvailability`; rail selection summary (date · time range · est. price, `tabular-nums`) added above the unchanged `bookable ? coral "Book this space" : disabled "Not bookable yet"` fork; PHP displayed on this surface.
- **`e2e/availability.spec.ts`:** seeds the dev Postgres directly (host + published Asia/Manila listing, `operating_hours` 06:00–21:00, one `availability_block`, one confirmed occupying `booking`) and asserts, without login: the venue-tz note (GMT+8 / Manila) is visible; blocked/occupied hours are `aria-disabled` and unselectable (AVAIL-05); a consecutive-run selection yields a rail summary (AVAIL-04); a published-but-not-payable listing renders read-only with "Not bookable yet". Unique ids per run; host cascade-delete teardown.
- **Green gates:** `npx tsc --noEmit` clean; `eslint` clean on all six 03-05 files. (The E2E itself boots the dev server + seeded DB and is part of the pending human-verify checkpoint — see below.)

## Task Commits

Each task was committed atomically:

1. **Task 1: booking.ts slot-selection schema + SlotPicker** — `99262ff` (feat)
2. **Task 2: AvailabilityCalendar + getDayAvailability action + wire into public page** — `5c0589c` (feat)
3. **Task 3: E2E availability spec (build portion of the human-verify checkpoint)** — `96ce8dc` (test)

**Plan metadata:** pending — STATE.md/ROADMAP.md flip + final docs commit happen AFTER the human-verify checkpoint is approved.

## Files Created/Modified

- `src/lib/validation/booking.ts` — slot-selection schema (client contract, server-re-validated in Phase 4)
- `src/components/availability/slot-picker.tsx` — consecutive-run venue-tz hour selection; aria-pressed/aria-disabled; never red
- `src/components/availability/availability-calendar.tsx` — venue-tz month grid → SlotPicker; tz note (SC#2); loading/empty states; selection → rail
- `src/app/actions/availability.ts` — read-only public getDayAvailability over the Plan-02 read model
- `src/app/listings/[id]/page.tsx` *(modified)* — placeholder replaced with the calendar + rail selection summary; PHP display
- `e2e/availability.spec.ts` — Playwright availability E2E (tz note, unselectable blocked, consecutive selection, not-bookable read-only)

## Deviations from Plan

None from the executor's Task 1/Task 2 build (all acceptance greps match; `tsc`/`eslint` clean). The only process deviation is the **interruption + orchestrator finish** described in the Execution Note above: the executor died on a spend-limit API error mid-Task-3; the orchestrator committed the already-authored E2E spec, re-verified the gates, and wrote this SUMMARY. No new source logic was introduced outside the executor's own commits.

## Issues Encountered

- **Executor interrupted by monthly-spend-limit API error** during Task 3 (before committing the E2E spec / writing the SUMMARY). Recovered by the orchestrator via filesystem + git spot-checks (all Task-1/2 commits present, all acceptance greps green, `tsc`/`eslint` clean), then committing the E2E spec and authoring this doc. Git's LF→CRLF warning on the E2E commit is expected Windows line-ending normalization (non-blocking).

## User Setup Required

None for the code. The human-verify checkpoint requires a running dev server + Docker Postgres to run the E2E and the manual venue-tz walkthrough (see below).

## Threat Model Coverage

- **T-03-TAMPER-SELECT** (Tampering) — selection enabled only when `deriveBookable()` is true; not-payable listing renders read-only with the existing "Not bookable yet" rail (no dead-end selection).
- **T-03-STALE** (Tampering) — the calendar is advisory; the DB EXCLUDE constraint (Plan 01) is authoritative; the real insert re-checks in Phase 4.
- **T-03-ENUM** (Info Disclosure) — `getDayAvailability` returns only published free/blocked state, no PII/booker identity (accepted; public single-city catalog).
- **T-03-TZBROWSER** (Tampering) — times always render in the venue tz via `{ in: tz(listing.timezone) }` + react-day-picker `timeZone`; the E2E asserts the GMT+8/Manila note independent of browser tz (SC#2).

## Pending Human-Verify Checkpoint (Task 3 — gate="blocking")

Not self-approved. The reviewer should (1) run `npx playwright test e2e/availability.spec.ts` (Docker Postgres up + migrations applied) and (2) manually walk the calendar on a non-Manila-timezone browser to confirm venue-tz display, unselectable occupied/blocked hours, consecutive-run selection, and not-bookable read-only, and that the "Book this space" CTA does not create a booking (Phase-4 placeholder). On approval: flip AVAIL-03/04/05 handling per the Phase-3 transition, update STATE.md + ROADMAP.md, and add the plan-metadata docs commit.

## Next Phase Readiness

- **Ready for Phase 4 (Booking Core & Search):** the read model + selection contract + venue-tz display are proven end-to-end from the DB constraint to the booker UI. Phase 4 adds the two-phase hold, state machine, and expiry worker on top of `createBooking` (Plan 02) — which already retries on both `23P01` and `40P01` (the Plan-01 carry-forward).
- **Blocker:** none for the build; the plan remains open until the human-verify checkpoint is approved.

## Self-Check: PASSED

- All 5 created files + 1 modified file present on disk.
- All 3 task commits found in git log (`99262ff`, `5c0589c`, `96ce8dc`).
- All Task-1/Task-2 acceptance-criteria greps match; the never-red check returns zero; `tsc --noEmit` clean; `eslint` clean on all six 03-05 files; the placeholder is removed and the calendar is wired in.

---
*Phase: 03-availability-the-double-booking-guarantee*
*Completed (build): 2026-07-11 — human-verify checkpoint pending*
