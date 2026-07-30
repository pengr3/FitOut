---
phase: 09-open-capacity-bookings
plan: 08
subsystem: ui
tags: [when-label, open-capacity, drop-in-pass, date-fns, type-safety, compiler-census, raw-sql-projection]

requires:
  - phase: 09-01
    provides: "booking.open_capacity (boolean NOT NULL DEFAULT false) — the persisted OC-03 mode snapshot this plan renders from"
  - phase: 08-15
    provides: "the REQUIRED-field contract (#2) and the CR-01 grep tripwire this plan repeats verbatim"
provides:
  - "WhenLabelInput.openCapacity as a REQUIRED field — omitting it at any new time surface is a compile error"
  - "The two OC-03 drop-in label variants: long `{date} · Drop-in pass, any time {open} – {close} ({City} time)` and short `{date} · Drop-in pass`"
  - "A completed compiler-driven census of all 15 composeWhenLabel/composeWhenLabelShort call sites (7 Rule-A projections, 8 Rule-B documented literals)"
  - "booking.open_capacity projected through bookings-query (both SELECTs), cancel-booking's loadBookingRow, the paymongo receipt webhook and the reminders sweep"
  - "DB-backed mutation-verified coverage of the two RAW-SQL open_capacity aliases (the only links tsc cannot check)"
affects: [09-09, 09-10, 09-12, 09-13, 09-14, 09-15, 09-16]

tech-stack:
  added: []
  patterns:
    - "REQUIRED-field census: widen a shared input type with a required field, let tsc enumerate the call sites, then clear them under one deterministic rule (Rule A project / Rule B documented literal / Rule C never invent a fallback)"
    - "Rule-B literals carry the deciding decision ID (OC-10 / D-110) on the line DIRECTLY ABOVE the literal, so a grep can audit every one of them"
    - "A raw-SQL column alias that feeds a REQUIRED type field gets a DB-backed test, because tsc cannot check it and a missing alias fails silently to falsy"

key-files:
  created: []
  modified:
    - src/lib/booking/when-label.ts
    - src/lib/booking/bookings-query.ts
    - src/lib/group/rsvp.ts
    - src/app/actions/booking.ts
    - src/app/actions/cancel-booking.ts
    - src/app/actions/group.ts
    - src/app/actions/host-requests.ts
    - src/app/actions/re-request.ts
    - src/app/api/paymongo/webhook/route.ts
    - src/app/invite/[token]/page.tsx
    - src/app/(app)/bookings/page.tsx
    - src/app/(app)/bookings/[id]/cancel/page.tsx
    - src/app/(app)/bookings/[id]/group/page.tsx
    - src/app/(host)/host/bookings/page.tsx
    - src/app/(host)/host/bookings/[id]/page.tsx
    - src/app/(host)/host/requests/page.tsx
    - src/components/booking/booking-row.tsx
    - src/inngest/functions/reminders.ts
    - src/inngest/functions/request-expiry.ts
    - tests/booking/when-label.test.ts
    - tests/booking/views.test.ts
    - tests/notifications/reminders.test.ts

key-decisions:
  - "openCapacity is REQUIRED on WhenLabelInput, never optional and never defaulted — an optional field lets one surface silently keep the bug (08-15 contract #2 applied verbatim)"
  - "The open branch is resolved FIRST in compose(), before the fullDay resolution and the pre-0016 price fallback — an open row's price fields describe a per-head freeze and can never be evidence about a duration"
  - "The SHORT variant carries no hours and no city suffix (`Fri, Aug 8 · Drop-in pass`) per 09-UI-SPEC § 5a; the LONG variant keeps the entry window but frames it as 'any time'"
  - "Rule B (a documented literal false) applies to exactly two flows: request-to-book (OC-10, instant-only) and group/RSVP (D-110, not combined with open capacity in v1) — 8 call sites, each tagged on the line above"
  - "booking-row.tsx and lib/group/rsvp.ts deliberately do NOT carry the field: the former receives a finished string and formats no dates, the latter is D-110-bound. Both say so in a comment so the absence reads as a decision, not an oversight"

patterns-established:
  - "Compiler-as-reviewer: make the field required, run tsc, work the error list top to bottom — the census is produced by the build, not by grep-and-reason"
  - "Mutation-kill a raw-SQL alias: delete the `AS \"openCapacity\"` line, prove the new DB-backed case goes RED, restore"

metrics:
  duration: ~35 min
  completed: 2026-07-30
  tasks: 3
  files-modified: 22
  commits: 3
---

# Phase 9 Plan 08: `composeWhenLabel` tells the truth about a drop-in pass — Summary

`WhenLabelInput` gained a **REQUIRED** `openCapacity` field, the shared formatter forked on it before any
price-derived resolution, and `tsc` enumerated all **15 call sites across 14 source files** — cleared under
one deterministic rule with **no invented fallbacks**. A drop-in booking now reads
`Friday, Aug 8 · Drop-in pass, any time 6:00 AM – 10:00 PM (Makati time)` (long) and
`Fri, Aug 8 · Drop-in pass` (short) on every surface, instead of a sixteen-hour range it never bought.

## What shipped

**Task 1 — the required field and the two variants** (`357a7e0`)

`compose()` now takes a third `short` parameter and resolves the open branch FIRST:

- long → `{date} · Drop-in pass, any time {open} – {close}{ (City time)}`
- short → `{date} · Drop-in pass` (no hours, no city suffix — 09-UI-SPEC § 5a)

Placed above the `fullDay` resolution deliberately: an open row's `spacePriceCents` / `dayRateCents` describe
a per-head freeze and say nothing true about a duration, so the exclusive branch's inputs must never be
consulted. Six new unit cases, including the **OC-03 ORDERING regression** (price inputs that WOULD make the
exclusive path answer "Full day" still render the pass) and an explicit byte-identity guard for the exclusive
labels. The 08-15 grep tripwire still holds (`grep -c hourlyRate` → 0).

**Task 2 — the census** (`948c5a3`)

`tsc` reported **15 errors / 14 files**. Cleared as:

| Rule | Count | Sites |
|---|---|---|
| **A** — project the persisted column | 7 label sites (+5 feeding query projections) | `bookings-query.ts` (both raw SELECTs + `BookingListRow`), `cancel-booking.ts` (`loadBookingRow` + `whenLabelInput`), `(app)/bookings/[id]/cancel/page.tsx`, `(app)/bookings/page.tsx`, `(host)/host/bookings/page.tsx`, `(host)/host/bookings/[id]/page.tsx`, `api/paymongo/webhook/route.ts`, `inngest/functions/reminders.ts` (SQL + `DueReminder` + `hydrate` + `buildEvent`) |
| **B** — documented literal `false` | 8 | **OC-10 (request-to-book is instant-only):** `actions/booking.ts` request branch, `actions/host-requests.ts`, `actions/re-request.ts`, `(host)/host/requests/page.tsx`, `inngest/functions/request-expiry.ts` · **D-110 (groups are exclusive-only in v1):** `actions/group.ts`, `invite/[token]/page.tsx`, `(app)/bookings/[id]/group/page.tsx` |
| **C** — never invent a fallback | 0 violations | `grep -rEn "openCapacity: .*\?\? false" src/` → 0 |

Two files were touched for documentation only, so their *absence* of the field reads as a decision:
`lib/group/rsvp.ts` (the group read model is D-110-bound) and `components/booking/booking-row.tsx` (it
receives a finished `whenLabel` string and formats no dates — nothing there could mis-render a mode).

**Task 3 — tests** (`768b7cb`)

The plan predicted three test files needing `openCapacity: false` added to `WhenLabelInput` fixtures. **None
did** — only `when-label.test.ts` builds those literals directly (fixed in Task 1); `notify-emission`,
`request-lifecycle` and `reminders` drive the label through the app code, so the suite was already green
after Task 2. That green was itself the "no shipped label moved" proof: every one of those suites asserts
exclusive/full-day strings and none of them moved.

The genuine residual risk was the inverse one, so the task was redirected (deviation 2 below): the two
`open_capacity` projections in **raw SQL** are the only links `tsc` cannot check. Drop or mis-spell an alias
and `openCapacity` arrives `undefined` → falsy → every drop-in row silently reverts to a sixteen-hour range,
with a green type-check and no failing test — CR-01's exact failure mode. Both now have DB-backed cases:

- `tests/booking/views.test.ts` — `queryBookerBookings` **and** `queryHostBookings` project `true` for a
  drop-in row and `false` for an exclusive one.
- `tests/notifications/reminders.test.ts` — the due-query hydrates `openCapacity`, the emitted payload reads
  `… · Drop-in pass, any time …`, and an exclusive counter-case is pinned to the shipped
  `{date}, {start} – {end} ({City} time)` shape.

Both **mutation-verified**: deleting either `AS "openCapacity"` line turns the new case RED (restored after).

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** (was 15 after Task 1 — the census) |
| `npx vitest run` | **908 passed / 4 skipped** (100 files); baseline before this plan was 899/4 → +9 new cases |
| `npm run lint` | **0 errors**, 7 baseline warnings |
| `npm run build` | **0** — full route table |
| `grep -c "openCapacity: boolean;" when-label.ts` / `grep -c "openCapacity?:"` | `1` / `0` — REQUIRED, not optional |
| `grep -c "Drop-in pass" when-label.ts` | `2` — long + short, nothing else |
| `grep -c "hourlyRate" when-label.ts` | `0` — the 08-15 tripwire holds |
| open branch precedes `fullDay ??` | line 108 vs line 119 ✓ |
| Rule-B literals with `OC-10`/`D-110` on the line above | **8 / 8** |
| `grep -rEn "openCapacity: .*\?\? false" src/` | `0` |

## Deviations from Plan

### Auto-fixed / adjusted

**1. [Rule 1 — Bug] The plan's (and 09-UI-SPEC's) example date is a calendar slip**

- **Found during:** Task 1 (writing the test literals)
- **Issue:** Both the plan and 09-UI-SPEC § 5a specify `Friday, Aug 8` rendered from a **2026**-08-08 window.
  2026-08-08 is a **Saturday**, so the prescribed fixture could never produce the prescribed string.
- **Fix:** The fixture is anchored on **2025**-08-08 (`2025-08-07T22:00:00Z` → `2025-08-08T14:00:00Z`), the
  year in which Aug 8 genuinely falls on a Friday. Both spec literals are therefore pinned **byte-for-byte**
  (`Friday, Aug 8 · Drop-in pass, any time 6:00 AM – 10:00 PM (Makati time)` and `Fri, Aug 8 · Drop-in pass`)
  rather than approximately. The reason is stated in a comment on the fixture.
- **Files modified:** `tests/booking/when-label.test.ts`
- **Commit:** `357a7e0`

**2. [Rule 2 — Missing critical coverage] Task 3's predicted work list was empty; the real gap was elsewhere**

- **Found during:** Task 3
- **Issue:** No existing test needed repair (see above). Taking the acceptance criteria literally would have
  meant shipping the plan with **zero** coverage of the two raw-SQL `open_capacity` aliases — the only
  openCapacity sources in the codebase that fail *silently* and *falsy*, i.e. straight back to the defect.
- **Fix:** Added drop-in + exclusive DB-backed cases to `views.test.ts` and `reminders.test.ts`, each
  mutation-verified against deletion of the alias line. `makeBooking`/`seedBooking` gained an optional
  `openCapacity` (defaulting to `false`, so every pre-existing fixture is untouched).
- **Files modified:** `tests/booking/views.test.ts`, `tests/notifications/reminders.test.ts`
- **Commit:** `768b7cb`

**3. [Rule 3 — Blocking] One acceptance grep is unsatisfiable as written**

- `grep -rn "openCapacity" src/ | grep -c "composeWhenLabel\|whenLabelInput\|booking.openCapacity\|open_capacity"`
  → expected `≥ 13`, actual **9**. The pipeline requires BOTH tokens on the SAME line, which only the
  drizzle/raw-SQL projection lines satisfy — the 8 Rule-B literals and the `openCapacity: row.openCapacity`
  pass-throughs cannot match it by construction. This is the same class of self-defeating grep 09-02 and
  09-06 hit (an imported/aliased symbol changes the line shape).
- **The census as actually measured:** 15 compile errors → 15 call sites across 14 source files; 18 source
  files modified; `grep -rn "openCapacity:" src/` → **25 field lines** (23 excluding `schema.ts` + `units.ts`,
  which predate this plan). A usable replacement grep: `grep -rn "openCapacity:" src/ | wc -l`.
- No code was reshaped to satisfy the broken grep — the counting expression was wrong, not the work.

**4. [Presentational] Rule-B comment placement**

The plan's acceptance requires `OC-10`/`D-110` on the literal's line *or the line directly above it*, while
its suggested comment shape put the tag on the first line of a multi-line block. All 8 sites were reworded so
the decision ID lands on the line **directly above** the literal — the audit grep now passes 8/8 while the
fuller "why" is preserved above it.

**5. [Presentational] One comment defeated its own tripwire**

A docblock on `composeWhenLabelShort` quoted the short literal verbatim, which pushed
`grep -c "Drop-in pass"` to 3 (expected 2). Reworded to describe the shape without spelling it — the same
lesson 09-01/09-02/09-06 each recorded, now stated inline in the file so the next editor does not repeat it.

## Threat Model Outcomes

| Threat ID | Disposition | Outcome |
|---|---|---|
| T-09-28 (Repudiation — mis-stated booking window) | mitigate | **Closed.** The label branches on the persisted `booking.open_capacity` snapshot only; a drop-in pass never renders as a reservation on any of the 15 surfaces. |
| T-09-29 (Tampering — a future surface forgetting the drop-in case) | mitigate | **Closed.** The field is REQUIRED (omission = compile error); Rule C's `?? false` escape hatch is greped to 0; the two raw-SQL aliases — the only non-compiler-checked links — are mutation-verified. |
| T-09-30 (Info disclosure — label content on public surfaces) | accept | Unchanged; the drop-in variant exposes strictly less than the exclusive one. |

## Notes for the next plans

- **Any new time surface** must supply `openCapacity`. If it reads a booking row, project
  `booking.openCapacity`; if the flow is structurally exclusive, pass `false` with the deciding decision ID
  on the line directly above. Never `?? false`.
- **Raw SQL is the blind spot.** If you add another raw projection feeding `WhenLabelInput`, add a DB-backed
  assertion for the alias — `tsc` will not save you, and the failure is silent and falsy.
- **09-15/09-16 (cancel copy + walkthrough):** the *label* fork is done, but 09-UI-SPEC § 5b's remaining
  drop-in copy forks (the cancel review context line, the tier rationale wording "before the space opens",
  the generic policy disclosure) are NOT in this plan's scope and are still owed.
- `lib/group/rsvp.ts` will need the column projected if open capacity ever combines with groups (the D-110
  assumption is stated in both of its read-model docblocks).

## Self-Check: PASSED

- `src/lib/booking/when-label.ts` — FOUND (openCapacity REQUIRED, 2 drop-in literals, tripwire clean)
- `tests/booking/when-label.test.ts`, `tests/booking/views.test.ts`, `tests/notifications/reminders.test.ts` — FOUND
- Commits `357a7e0`, `948c5a3`, `768b7cb` — all FOUND in `git log`
- Working tree clean apart from untracked `.claude/`
