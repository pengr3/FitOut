---
phase: quick-260805-nb7
plan: 01
subsystem: testing
tags: [testing, time-bomb, fixtures, timezone, tzdate, d-48, book-02, mutation-testing, def-ir9-01]
status: complete
requires:
  - "@date-fns/tz (TZDate) — already a project dependency"
  - "local Postgres (isolated-schema integration harness, tests/helpers/db.ts)"
provides:
  - "tests/booking/hold-expiry.test.ts — green again, with clock-relative fixtures and a fixture self-check"
  - "a recorded, verbatim 3-mutation proof that the D-48 pair + sweep coverage is non-vacuous"
  - "deferred-items.md — a tiered inventory of the 6 remaining Tier-1 date time bombs"
affects:
  - tests/booking/hold-expiry.test.ts
  - "the DEF-IR9-01 red suite (now 0 failures)"
tech-stack:
  added: []
  patterns:
    - "test fixture dates are DERIVED from real now, never pinned, whenever the path under test has a SQL now() guard"
    - "one source value (the computed Monday) → day parts AND both UTC instants, so they cannot drift apart"
    - "TZDate venue-local→UTC mapping in tests, mirroring src/lib/availability/slots.ts; never a hardcoded +8"
    - "a beforeAll FIXTURE SELF-CHECK asserts the derivation clears the guards it claims to clear"
key-files:
  created:
    - .planning/quick/260805-nb7-fix-def-ir9-01-time-bomb-make-hold-expir/deferred-items.md
  modified:
    - tests/booking/hold-expiry.test.ts
decisions:
  - "Fixed test-side only — src/ is byte-unchanged across the whole task (verified: `git diff 55058f9..HEAD -- src/` is empty). The production behaviour was correct; only the fixture had rotted."
  - "Target the next STRICTLY-future Monday (1..7 days out) rather than a fixed offset: the `|| 7` is what stops a run ON a Monday landing on a 06:00 slot that has already passed."
  - "The injected read-model `NOW` is real `new Date()`, not a frozen literal — because DAY is derived from real now, so the JS display clock and the SQL guard clock now reason about the same era. That divergence WAS the defect."
  - "Kept the TZDate helpers local to the test rather than importing venueDayOfWeek/slotsForWindow from src: the fixture stays an independent second opinion on the module under test, matching this repo's existing convention."
  - "Mutation-measured with THREE mutations, not two: A and B cover case 1's two halves, and C was added to prove case 2 (the live-hold inverse) is also non-vacuous — no mutation of case 1's behaviour touches it."
  - "Sibling time bombs logged and NOT fixed, per brief. 6 Tier-1 sites across 5 files; nearest fuse is 2026-09-01, which breaks two files at once."
metrics:
  tasks-completed: 3 of 3
  commits: 2
  duration: ~15m
completed: 2026-08-05
---

# Quick Task 260805-nb7: Fix DEF-IR9-01 Time Bomb Summary

Made `tests/booking/hold-expiry.test.ts` derive its fixture dates from real now via TZDate instead of three
rotting calendar literals, and proved with three executed mutations that the fix did not hollow the test out.

## The Defect

`tests/booking/hold-expiry.test.ts` failed 2 cases, in isolation and in the full suite, despite being
untouched by recent work and importing nothing that changed. It carried three **independent** calendar
literals:

```js
const NOW = new Date("2026-07-15T00:00:00.000Z");   // injected fake clock
const DAY = { year: 2026, month: 8, day: 3 };        // Mon 3 Aug 2026
const SLOT_0600_START = "2026-08-02T22:00:00.000Z";  // 06:00 Asia/Manila that day
```

The root cause is that **two different clocks** govern the two halves of the test, and only one of them is
injectable:

- `NOW` is a JS value that reaches `getAvailability` **only** — it drives the `past` / `beyond_horizon` /
  `too_soon` **display** states and nothing else.
- `createPendingHold` takes **no clock at all**. Its D-96 lead-time guard is a SQL expression evaluated
  against Postgres's `now()`, in the same transaction as the rows it compares against. `src/lib/availability/units.ts`
  documents this as deliberate ("computed by POSTGRES (never the JS clock)"), and 07-05's acceptance criteria
  assert the absence of a JS clock read there by grep. It is correct, and it is not negotiable.

So on 2026-08-03 real time passed the pinned window and the SQL guard began refusing it. The two observed
failures were both downstream of that one fact:

```
AssertionError: expected 'That start time is too soon to book. …' to match /just taken/i
AssertionError: expected false to be true
```

The three literals being *independent* is the actual defect — one of them rotting silently is exactly what
happened.

## The Fix

Test-side only. `src/` is byte-unchanged.

1. **Target the next strictly-future Monday**, computed from real now in the venue's own calendar.
   `((MONDAY - venueDow(today) + 7) % 7) || 7` yields 1..7 days out; the `|| 7` is load-bearing — without
   it a run on a Monday would target *today*, whose 06:00 slot may already have passed.
   Monday is required because `makeListing()` seeds `operating_hours` on `dayOfWeek: 1` only.
2. **Derive `DAY`, `S`, `E` and `SLOT_0600_START` from that one computed value.** Three literals became one
   source, so they can never disagree again.
3. **Build every instant with `TZDate`**, mirroring `slotsForWindow`'s exact idiom (TZDate for the DST-correct
   venue-local→UTC mapping, then normalize through the epoch so it renders as a true `…Z` string). No `+8`
   arithmetic anywhere — Manila is UTC+8 with no DST, but a hardcoded offset is the same class of rot as a
   hardcoded date.
4. **Seed the listing's `timezone` from the same `TZ` constant** the instants were derived in, closing the
   last place two copies of the zone could drift.
5. **Added a `beforeAll` fixture self-check** — the derivation is asserted, not assumed: the target is a
   Monday, the slot clears `max(MIN_LEAD_INSTANT_MINUTES, MIN_LEAD_REQUEST_HOURS)` against real now, it sits
   inside `BOOKING_HORIZON_DAYS`, and the window is exactly one on-the-hour slot. A future break is now a
   loud, readable suite failure at setup rather than a confusing assertion about "just taken" three cases later.
6. **Left a header comment explaining WHY** the dates are computed, naming the two-clock asymmetry, so the
   next reader does not "simplify" it back to literals.

The test count is unchanged (2 cases) — the self-check rides in `beforeAll` deliberately, so it strengthens
the file without inflating the suite.

## Mutation Measurement (the constraint that actually mattered)

A test that passes because it stopped asserting is worse than a failing one. Three mutations were **executed**
against the production behaviour this file guards; each was observed RED on the exact case that behaviour
belongs to, then restored by editing the file back (never via git). Verbatim output is recorded in the test
file's header comment.

| Mutation | Production behaviour broken | Case that went RED | Verbatim |
|----------|----------------------------|--------------------|----------|
| **A** | `units.ts` — in-tx stale-hold sweep neutered (`AND false`) | case 1 (b), the sweep half | `AssertionError: expected false to be true // Object.is equality` at `expect("ok" in res && res.ok).toBe(true)` |
| **B** | `read-model.ts` — D-48a lazy-expiry treatment deleted (`AND expires_at > now()` removed) | case 1 (a), the lazy-read half | `AssertionError: expected 'unavailable' to be 'available'` |
| **C** | `units.ts` — the SAME sweep widened to ignore expiry (`AND expires_at <= now()` removed) | case 2, the live-hold inverse | `AssertionError: expected false to be true // Object.is equality` at `expect("error" in res).toBe(true)` |

**Mutation C was not in the brief and was added deliberately.** A and B both break case 1; neither touches
case 2. Without C there would have been no evidence that the live-hold inverse — the case that proves a
stranger cannot take an occupied slot — still asserts anything. Under C, a stranger's `createPendingHold`
**cancelled a live hold and took the slot**: the double-book itself, named.

All three mutations turned the file red. The fix is **not** vacuous.

`git diff --exit-code src/` was verified clean after each restore, and `git diff 55058f9..HEAD -- src/` is
empty for the task as a whole.

## Sibling Time Bombs (logged, not fixed)

Scanned all of `tests/` and `e2e/`. **`e2e/` is clean** — zero hardcoded date literals.

Tiered by the failure mode that actually bites: a pinned date only rots when it meets a guard evaluated
against Postgres `now()`. A pinned date in a `vi.setSystemTime` test, a Zod shape test, or an EXCLUDE-constraint
test cannot rot (the GiST constraint has no time awareness at all — that is the whole reason the D-48 sweep exists).

- **Tier 1 — will go red on a known date:** 6 sites across 5 files.
  `pending-hold.test.ts:34-35` and `state-machine.test.ts:57-58` **both** break on **2026-09-01** — the nearest
  fuse, ~4 weeks out, two files at once. Then `request-lifecycle.test.ts:120-121` (2026-10-01),
  `request-expiry.test.ts:69-70,77-78` (2026-11-01), `request-lifecycle.test.ts:628-629` (2026-11-02),
  `notify-emission.test.ts:505-506` (2027-03-01).
- **Tier 2 — already-past literals, green today, latent:** 4 files. They pass only because their injected `NOW`
  is pinned right beside the pinned day, keeping the pair internally consistent forever. One added
  `createPendingHold`/`placeHold` call in any of them reproduces DEF-IR9-01 with no warning.
- **Tier 3 — benign:** ~6 groups, listed so a future sweep does not re-litigate them.

Full file:line inventory in `deferred-items.md` in this directory, with the suggested fix (a mechanical port of
either this file's TZDate pattern or `open-capacity-hold.test.ts`'s existing `daysOut(n)` helpers).

## Deviations from Plan

None — the brief was executed as written, with one addition: **Mutation C**. The brief specified two mutations
(the sweep and the lazy-expiry treatment), both of which target case 1. C was added because without it case 2's
non-vacuousness would have been unproven, and case 2 is one of the two cases that was failing.

## Gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run` | **1123 passed / 0 failed / 4 skipped** (125 files passed, 1 skipped) — was 1121 passed / 2 failed |
| `src/` byte-unchanged | verified — `git diff 55058f9..HEAD -- src/` empty |

## Commits

- `ec20a77` — `test(quick-260805-nb7): derive hold-expiry's fixture dates from real now (DEF-IR9-01)`
- `4d71879` — `docs(quick-260805-nb7): log the sibling date time bombs found alongside DEF-IR9-01`

## Self-Check: PASSED

- `tests/booking/hold-expiry.test.ts` — FOUND (modified, committed in `ec20a77`)
- `.planning/quick/260805-nb7-fix-def-ir9-01-time-bomb-make-hold-expir/deferred-items.md` — FOUND (committed in `4d71879`)
- commit `ec20a77` — FOUND in `git log`
- commit `4d71879` — FOUND in `git log`
- `src/lib/availability/units.ts` — unmodified vs `55058f9` (verified)
- `src/lib/availability/read-model.ts` — unmodified vs `55058f9` (verified)
