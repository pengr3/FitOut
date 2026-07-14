---
phase: 03-availability-the-double-booking-guarantee
verified: 2026-07-14T03:15:00Z
status: passed
score: 12/12 must-haves verified
overrides_applied: 0
---

# Phase 3: Availability & the Double-Booking Guarantee Verification Report

**Phase Goal:** A listing exposes a real, up-to-date availability calendar driven by host operating hours and blocks, and the database itself makes two overlapping bookings for the same listing structurally impossible — the architectural keystone, proven before any money is involved.
**Verified:** 2026-07-14T03:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Merged per Step 2c: the 4 ROADMAP Success Criteria (the contract) plus supporting PLAN-frontmatter must-haves that add depth without reducing scope. Every truth below was checked against actual code/DB/test evidence — not SUMMARY.md narrative.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A host can define recurring weekly operating hours and block/unblock specific dates/times as overrides (AVAIL-01, AVAIL-02) | ✓ VERIFIED | `src/lib/validation/availability.ts` (`weeklyHoursSchema`/`blockSchema`); `src/app/actions/operating-hours.ts` (`saveOperatingHours`), `src/app/actions/blocks.ts` (`addBlock`/`removeBlock`); `src/components/availability/weekly-hours-editor.tsx` + `blocks-editor.tsx` wired to those actions; host RSC page seeds both editors. Human-verify checkpoint (03-04) approved by user 2026-07-14 (commit `c6ee277`). |
| 2 | A listing detail page shows a real, up-to-date availability calendar reflecting operating hours, blocks, and existing bookings, in the venue's local timezone (AVAIL-03) | ✓ VERIFIED | `src/lib/availability/read-model.ts` `getAvailability` composes hours − blocks − occupying bookings; `src/app/listings/[id]/page.tsx` — confirmed the old "Availability coming soon" text is fully removed (`grep` exit 1) and `<AvailabilityCalendar>` is wired in with `getAvailability` seeding the first day server-side. tz note "Times shown in {city} time ({GMT±N})" renders (`availability-calendar.tsx:157-158`). Human-verify checkpoint (03-05) approved 2026-07-14, explicitly including a non-Manila-browser DevTools timezone-emulation check per session notes. |
| 3 | A booker can select an hourly window or a full day from availability, and occupied/unavailable times are visibly blocked and cannot be selected (AVAIL-04, AVAIL-05) | ✓ VERIFIED | `src/components/availability/slot-picker.tsx` + `slot-selection.ts` (range-fill gesture core, `resolveClick` no-ops on an unavailable index, "Book full day" toggle). Unavailable chips render `disabled` + `aria-disabled="true"` + `line-through`, never red (grep for `bg-red|text-red|--destructive` in slot-picker.tsx returns nothing). `e2e/availability.spec.ts` asserts the booked/blocked hour is `toBeDisabled()` + `aria-disabled=true` and cannot be added to a selection. |
| 4 | Two concurrent overlapping booking inserts for the same listing cannot both succeed — the second is rejected at the DB level (23P01, or 40P01 deadlock — both DB-atomic) | ✓ VERIFIED | Live-DB query (`docker exec fitout-db-1 psql`) confirms `booking_no_overlap`: `EXCLUDE USING gist (listing_id WITH =, unit WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status = ANY (ARRAY['pending','confirmed']))` — exact match to spec. `tests/availability/exclusion-race.test.ts` fires a GENUINE two-connection race (`makeRacingClients` + `Promise.allSettled`) and asserts exactly one survivor + the loser rejected with `23P01` or `40P01`. **Independently re-run this session:** `npx vitest run tests/availability` → 8 files / 82 tests passed, including this race test. |
| 5 | Every hours/blocks write re-checks `listing.hostId === session.userId` server-side (IDOR) — not just the (host) route-group gate | ✓ VERIFIED | `operating-hours.ts`/`blocks.ts` both define local `assertOwnership(listingId, userId)` called before every write; `availability/page.tsx` additionally 404s via `notFound()` when `row.hostId !== session.user.id` (existence not leaked). Human-verified: IDOR → 404 confirmed as part of the approved 03-04 checkpoint. |
| 6 | Back-to-back hours (e.g. 10–11, 11–12) both insert successfully (half-open `'[)'`); a cancelled/declined booking frees its slot | ✓ VERIFIED | `exclusion-race.test.ts` "allows back-to-back hours ('[)' half-open) but rejects a genuine partial overlap" and "frees the slot when the occupying row leaves the partial WHERE (cancelled)" — both passed in this session's live re-run. |
| 7 | All availability timestamps are `timestamptz` (UTC); the read model's overlap filter uses the identical `tstzrange('[)')` bound as the EXCLUDE constraint | ✓ VERIFIED | `drizzle/0004_availability_tables.sql` — every `starts_at`/`ends_at`/`created_at` column is `timestamp with time zone`. `read-model.ts` and `units.ts` both filter with `tstzrange(starts_at, ends_at, '[)') && tstzrange(${...}, ${...}, '[)')` — byte-identical bound to `drizzle/0005_booking_exclusion.sql`. |
| 8 | Operating-hours open/close are enforced on-the-hour server-side, and DB round-tripped `"HH:mm:ss"` values re-validate after normalization (no false rejects on untouched windows) | ✓ VERIFIED | `availability.ts` `hourOnly` refine operates on the `.slice(0,5)`-normalized prefix with a `:ss`-tolerant regex; `availability/page.tsx` normalizes DB reads via `.slice(0, 5)` before seeding `initialWindows`. `tests/availability/hours-validation.test.ts` covers the exact round-trip case. Human-verified: the reload-then-re-save round-trip was part of the approved 03-04 checkpoint. |
| 9 | `createBooking` auto-assigns the lowest free unit and retries on 23P01/40P01 bounded by `unitCount`; a violation maps to "That time was just taken. Pick another slot.", never a raw 500 | ✓ VERIFIED | `src/lib/availability/units.ts` — `createBooking` catches `isPgError(e,"23P01")\|\|isPgError(e,"40P01")` and retries; `mapBookingError` returns the exact clean copy for `NoUnitAvailableError`/23P01/40P01 and re-throws unknown errors. `tests/availability/units.test.ts` + `error-map.test.ts` passed in this session's re-run. |
| 10 | Slot selection is enabled only when the listing is bookable (`deriveBookable`); a published-but-not-payable listing shows real availability read-only; the book CTA stays a Phase-4 placeholder that never bypasses `deriveBookable` | ✓ VERIFIED | `src/app/listings/[id]/page.tsx` computes `bookable` via `deriveBookable(...)` and passes it to `<AvailabilityCalendar bookable={bookable}>` → `SlotPicker disabled={!bookable}`; the `bookable ? coral CTA : disabled "Not bookable yet"` fork is unchanged from Phase 2. `e2e/availability.spec.ts` "published-but-not-payable listing" test confirms the calendar renders but all chips are `toBeDisabled()`. |
| 11 | A host can add a close-only block (partial range or whole day) targeting a single unit or the whole listing, and remove it with a reversible, neutral confirmation | ✓ VERIFIED | `blocks-editor.tsx` `AddBlockDialog` (calendar + whole-day/partial radio + whole-listing/unit selector shown only when `unitCount>1`) → `addBlock`; `RemoveBlockButton` confirm dialog "Remove this block? Those times will open for booking again." → `removeBlock`; grep for `destructive` in blocks-editor.tsx returns nothing (all-neutral, confirmed). |
| 12 | Times are always displayed in the venue's local timezone (never the browser's) with a visible tz note | ✓ VERIFIED | `slots.ts`/`read-model.ts` build every instant via `TZDate` normalized through the epoch; `availability-calendar.tsx` uses react-day-picker `timeZone={timezone}` + `date-fns`/`@date-fns/tz` `format(..., {in: tz(timezone)})`; tz note is `aria-describedby`-associated. `e2e/availability.spec.ts` asserts `"Times shown in .*Makati.*\(GMT\+8\)"` regardless of the machine running the test. Human-verified 2026-07-13 via DevTools timezone emulation to a non-Manila browser tz (per session continuity notes), re-confirmed as part of the 2026-07-14 03-05 approval. |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `drizzle/0005_booking_exclusion.sql` | Hand-authored `EXCLUDE USING gist` constraint | ✓ VERIFIED | Present, applied to live DB (`pg_constraint` query confirms exact definition), replays idempotently via `IF NOT EXISTS`/`WITH SCHEMA public`. |
| `drizzle/0004_availability_tables.sql` | `operating_hours`/`availability_block`/`booking` tables + `booking_status` enum + `listing.unit_count`/`timezone` | ✓ VERIFIED | All present with correct FKs, indexes, `timestamptz` columns. |
| `src/lib/db/schema.ts` | Drizzle definitions for the 3 tables + enum + listing columns | ✓ VERIFIED | `export const booking`, `bookingStatus`, `operatingHours`, `availabilityBlock`, `unitCount`, `timezone` all present and match the SQL. |
| `src/lib/availability/slots.ts` | DST-correct TZDate slot enumeration | ✓ VERIFIED | `slotsForWindow`/`venueDayOfWeek`/`isWithinHorizon`/`slotStartsInFuture`; no fixed-ms arithmetic (grep for `3600000` returns nothing). |
| `src/lib/availability/read-model.ts` | `getAvailability` on-the-fly free-unit composition | ✓ VERIFIED | Queries real `operatingHours`/`availabilityBlock`/`booking` rows via Drizzle + raw `sql`, composes per-slot state/freeUnits in TS. |
| `src/lib/availability/units.ts` | `createBooking` + `mapBookingError` | ✓ VERIFIED | Retry-on-conflict bounded by `unitCount`; clean error mapping. |
| `src/lib/pg.ts` | `isPgError` SQLSTATE helper | ✓ VERIFIED | Present, used consistently across `units.ts` and tests. |
| `src/lib/validation/availability.ts` | `weeklyHoursSchema`/`blockSchema` | ✓ VERIFIED | Close>open, no-overlap, on-the-hour (`:ss`-tolerant), block whole-day/partial + unit/whole-listing. |
| `src/lib/validation/booking.ts` | `slotSelectionSchema` | ✓ VERIFIED | Client selection contract; `endUtc > startUtc` refine. |
| `src/app/actions/operating-hours.ts` | `saveOperatingHours` | ✓ VERIFIED | Session + `assertOwnership` + `safeParse` + replace-the-set tx + `revalidatePath`. |
| `src/app/actions/blocks.ts` | `addBlock`/`removeBlock` | ✓ VERIFIED | Session + ownership + TZDate venue→UTC conversion; `removeBlock` scoped `(blockId AND listingId)`. |
| `src/app/actions/availability.ts` | `getDayAvailability` (public read-only) | ✓ VERIFIED | Thin wrapper delegating to `getAvailability`; no mutation, no ownership gate (by design — public data). |
| `src/components/availability/weekly-hours-editor.tsx` | Client hours editor | ✓ VERIFIED | RHF+Zod, live overlap-prevention (disabled Select options), neutral Save, tz note. |
| `src/components/availability/blocks-editor.tsx` | Client blocks editor | ✓ VERIFIED | List + `AddBlockDialog`; reversible neutral remove. |
| `src/components/availability/availability-calendar.tsx` | Booker calendar composite | ✓ VERIFIED | react-day-picker `timeZone` + `SlotPicker` + always-visible tz note + loading/empty states. |
| `src/components/availability/slot-picker.tsx` + `slot-selection.ts` | Range-fill hour selection | ✓ VERIFIED | Pure gesture core (20 unit tests) + DOM shell; `aria-disabled`/`aria-pressed` correct. |
| `src/app/(host)/host/listings/[id]/availability/page.tsx` | Gated host RSC | ✓ VERIFIED | `notFound()` IDOR gate; `.slice(0,5)` HH:mm normalization before seeding the form. |
| `src/app/listings/[id]/page.tsx` | Public page, placeholder replaced | ✓ VERIFIED | "Availability coming soon" fully removed; `<AvailabilityCalendar>` wired; rail selection summary added. |
| `tests/availability/*.test.ts` (8 files) | Unit + integration coverage | ✓ VERIFIED | `exclusion-race`, `slots`, `read-model`, `error-map`, `units`, `hours-validation`, `blocks`, `slot-selection` — all present, all substantive (not stubs), all independently re-run green this session (82/82). |
| `e2e/availability.spec.ts` | Playwright booker-calendar E2E | ✓ VERIFIED | 4 tests; genuinely exercises tz note, unselectable booked/blocked hours, range-fill (adjacent, non-adjacent, gap-truncation), not-bookable read-only — not vacuous assertions. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `drizzle/0005_booking_exclusion.sql` | `booking` table | `EXCLUDE USING gist (...) WHERE status IN ('pending','confirmed')` | ✓ WIRED | Confirmed live via `psql` — exact constraint definition matches spec. |
| `src/lib/availability/units.ts` `createBooking` | `src/lib/pg.ts isPgError` | catch-and-retry on `23P01`/`40P01` | ✓ WIRED | Both codes retried; both mapped to the clean message. |
| `src/lib/availability/read-model.ts` | `booking` + `availability_block` rows | `tstzrange('[)')` overlap in raw SQL | ✓ WIRED | Identical bound to the constraint; proven by `read-model.test.ts` (whole-block ⇒ 0 free, cancelled doesn't occupy). |
| `src/app/actions/operating-hours.ts` / `blocks.ts` | `listing.hostId === session.userId` | `assertOwnership` before every write | ✓ WIRED | Non-owner write rejected in `blocks.test.ts`; page-level `notFound()` is defense-in-depth on top. |
| `weekly-hours-editor.tsx` | `saveOperatingHours` | server action call on submit | ✓ WIRED | `form.handleSubmit` → `saveOperatingHours(listingId, values)` → toast + field-error surfacing. |
| `blocks-editor.tsx` | `addBlock`/`removeBlock` | dialog submit / confirm | ✓ WIRED | Both call sites present; `router.refresh()` re-seeds from the revalidated RSC. |
| `availability/page.tsx` | ownership gate | `notFound()` | ✓ WIRED | `if (!row \|\| row.hostId !== session.user.id) notFound();` |
| `listings/[id]/page.tsx` | `AvailabilityCalendar` | placeholder replacement | ✓ WIRED | Confirmed the old text is gone and the component receives real `initialDay`/`bookable`/`timezone` props. |
| `availability-calendar.tsx` | `getDayAvailability` action | day-change fetch | ✓ WIRED | `handleDaySelect` calls the action and updates `dayAvail` state, re-rendering `SlotPicker`. |
| `slot-picker.tsx` | `bookable` (deriveBookable result) | `disabled={!bookable}` prop | ✓ WIRED | Confirmed in both the component and the not-payable E2E case (`toBeDisabled()`). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `read-model.ts getAvailability` | `slots[]` (state/freeUnits) | 3 parallel real queries: `operatingHours` (Drizzle `.select()`), `availability_block` + `booking` (raw `sql` with `tstzrange` WHERE) | Yes — real DB rows drive `freeUnits`/`state`; the one static fallback (`{unitCount:0, hasHours:false, slots:[]}`) triggers ONLY for a listing that doesn't exist, a legitimate defensive guard, not a masking stub | ✓ FLOWING |
| `availability-calendar.tsx` `dayAvail.slots` | `SlotPicker slots` prop | `getDayAvailability` server action → `getAvailability` read model | Yes — E2E confirms the seeded 08:00 booking and 10:00 block render as distinct disabled chips | ✓ FLOWING |
| `listings/[id]/page.tsx` `initialDay` | seeded server-side | `await getAvailability(db, id, initialDate)` (real DB call, not mocked) | Yes | ✓ FLOWING |
| `availability/page.tsx` `initialWindows`/`initialBlocks` | seeded server-side | `db.select().from(operatingHours\|availabilityBlock).where(eq(...listingId))` | Yes — real per-listing rows, normalized before use | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| DB EXCLUDE constraint live with the exact expected definition | `docker exec fitout-db-1 psql -U fitout -d fitout -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='booking_no_overlap';"` | `EXCLUDE USING gist (listing_id WITH =, unit WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status = ANY (ARRAY['pending','confirmed']))` | ✓ PASS |
| Full availability test suite (incl. the genuine 2-connection race) | `npx vitest run tests/availability` | 8 files / 82 tests passed | ✓ PASS |
| Typecheck clean | `npx tsc --noEmit` | no output (clean) | ✓ PASS |
| Lint clean on all phase-3 touched files | `npx eslint src/lib/availability/ src/lib/validation/availability.ts src/lib/validation/booking.ts src/app/actions/{operating-hours,blocks,availability}.ts src/components/availability/ "src/app/(host)/host/listings/[id]/availability/page.tsx" "src/app/listings/[id]/page.tsx" src/lib/pg.ts` | no output (clean) | ✓ PASS |
| Old placeholder text fully removed from the public page | `grep -n "Availability coming soon" "src/app/listings/[id]/page.tsx"` | no match (exit 1) | ✓ PASS |

### Probe Execution

Not applicable — this is not a migration/tooling phase with `scripts/*/tests/probe-*.sh` conventions. No probe scripts exist in the repo (`find scripts -path '*/tests/probe-*.sh'` returned nothing) and no PLAN/SUMMARY docs reference probe-based verification for this phase; the "probe" hits found are unrelated (an SQL "occupancy probe" code comment, and a RESEARCH doc's live-DB extension probe). Skipped per Step 7c's own scoping rule.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|--------------|----------------|--------------|--------|----------|
| AVAIL-01 | 03-01, 03-03, 03-04 | Host can define recurring weekly operating hours | ✓ SATISFIED | `weeklyHoursSchema` + `saveOperatingHours` + `WeeklyHoursEditor`; human-verified. |
| AVAIL-02 | 03-01, 03-03, 03-04 | Host can block/unblock specific dates/times | ✓ SATISFIED | `blockSchema` + `addBlock`/`removeBlock` + `BlocksEditor`; human-verified. |
| AVAIL-03 | 03-01, 03-02, 03-05 | Real, up-to-date calendar reflecting bookings/hours/blocks, venue tz | ✓ SATISFIED | `getAvailability` + `AvailabilityCalendar` wired into the public page; E2E + human-verified. |
| AVAIL-04 | 03-05 | Booker can select an hourly window or a full day | ✓ SATISFIED | `slot-picker.tsx`/`slot-selection.ts` range-fill + full-day toggle; E2E-proven. |
| AVAIL-05 | 03-05 | Occupied/unavailable times visibly blocked, cannot be selected | ✓ SATISFIED | `aria-disabled` + DOM `disabled` + reducer no-op; E2E-proven. |

**Orphaned requirements check:** REQUIREMENTS.md maps exactly AVAIL-01..05 to Phase 3; all five appear in at least one plan's `requirements:` frontmatter field (03-01: 01/02/03; 03-02: 03; 03-03: 01/02; 03-04: 01/02; 03-05: 03/04/05). No orphans.

**Bookkeeping note (not a gap):** `.planning/REQUIREMENTS.md`'s traceability table still shows AVAIL-01..05 as unchecked/"Pending". This is expected at this point in the workflow — every one of the five 03-0X-SUMMARY.md files explicitly documents "REQUIREMENTS.md is flipped at the Phase-3 transition per repo convention," and `.planning/ROADMAP.md` already reflects Phase 3 as `Complete (2026-07-14)` with all 5 plans checked (confirmed via `git show c6ee277`). The REQUIREMENTS.md checkbox flip is administrative bookkeeping that occurs during the `phase.complete` step (after this verification), not evidence of an unmet requirement. Recommend the orchestrator flip AVAIL-01..05 to `[x]`/"Complete" as part of closing this phase. Similarly, `.planning/STATE.md`'s prose (`stopped_at`/"Stopped at:" body text) is stale — still describing Wave 2 — while its own `Session Continuity` section and `.planning/ROADMAP.md` are current; this is cosmetic and was already flagged in `.continue-here.md` as remaining housekeeping.

### Anti-Patterns Found

None. Scanned all phase-3 touched files (`src/lib/availability/`, `src/lib/validation/{availability,booking}.ts`, `src/app/actions/{operating-hours,blocks,availability}.ts`, `src/components/availability/`, the host availability page, and the public listing page) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`, "coming soon"/"not yet implemented" copy, and empty-implementation patterns (`return null`/`return {}`/`return []`/`=> {}`). Zero matches (the two "coming soon" hits found are unrelated: one is the Phase-2 map/location placeholder, the other is a code comment describing what this phase's calendar *replaced*).

### Human Verification Required

None outstanding. Both Wave-3 `checkpoint:human-verify` gates for this phase — 03-04 (host availability editor: weekly-hours overlap-prevention, blocks add/remove, IDOR→404, tz note, save round-trip) and 03-05 (booker availability calendar, including the range-fill slot-picker gesture from quick task 260713-nz3) — were run and approved by the user on 2026-07-14, evidenced by:
- Git commit `c6ee277` "docs(phase-03): mark 03-04/03-05 complete after Wave-3 human-verify approval"
- `.planning/ROADMAP.md` Phase 3 now shows all 5 plans checked `[x]` and the phase marked `Complete (2026-07-14)`
- No `<verify><human-check>` blocks were found embedded in any `auto` task across the 5 plans (checked via grep) — there are no deferred human-verification items beyond the two already-approved blocking checkpoints.

### Gaps Summary

No gaps. Every ROADMAP Success Criterion for Phase 3 is backed by first-hand codebase evidence gathered in this verification pass (not SUMMARY.md narrative alone): the live Postgres EXCLUDE constraint was queried directly and matches the spec exactly; the full `tests/availability` suite (8 files / 82 tests, including the genuine two-connection race test) was independently re-run and passed; `tsc --noEmit` and `eslint` were independently re-run clean on every phase-3 file; the "Availability coming soon" placeholder was confirmed removed by direct grep; and every server action, validation schema, UI component, and page wiring described in the five plans' `must_haves` was read in full and confirmed substantive (not stubbed) and wired end-to-end. The two Wave-3 human-verify checkpoints are independently confirmed approved via git history and ROADMAP.md state, not merely asserted by SUMMARY.md. The phase goal — a real availability calendar plus a DB-enforced double-booking guarantee — is achieved.

---

*Verified: 2026-07-14T03:15:00Z*
*Verifier: Claude (gsd-verifier)*
