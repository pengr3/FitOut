---
phase: 09-open-capacity-bookings
plan: 24
subsystem: availability
tags: [postgres, drizzle, timezone, tzdate, read-model, open-capacity, env-validation]

# Dependency graph
requires:
  - phase: 09-18
    provides: "the CR-03 counter re-anchor — OpenDayWindow now carries what a pass COVERS (dayOpenUtc/dayCloseUtc, host-mutable) separately from what it COUNTS AGAINST (dayStartUtc/dayEndUtc/dateKey, calendar-fixed); the month query grouped by venue-local date"
  - phase: 09-20
    provides: "openBlockedSql / OPEN_BLOCK_UNIT_SCOPE_SQL evaluated in the same statement as the heads SUM, and the month grid's block-to-date expansion"
  - phase: 09-21
    provides: "the fail-closed money guards on the claim path, which the split-shift claim case runs through unchanged"
provides:
  - "loadOpenDayWindow reduces the operating-hours envelope over real INSTANTS, so a split shift that rolls past midnight sells one pass covering the whole day"
  - "OPEN_LOW_STOCK_MAX is validated (finite integer >= 1) with a documented fallback to 5, closing the accepted-risk precondition AR-16"
  - "getOpenMonthAvailability withdraws the whole month when the cap is unusable, so the month grid and the day panel fail closed the same way"
  - "5 new DB-backed cases in tests/availability/open-capacity-readmodel.test.ts (12-16), all mutation-measured"
affects: [09-23, phase-09-verification, availability, open-capacity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An envelope over host-supplied wall clocks is reduced over INSTANTS, never over the wall-clock strings themselves — SQL MIN/MAX on a `time` column cannot express a next-day roll"
    - "A server-only env constant is parse-then-validate with a documented default (fail-to-default, never fail-to-off)"
    - "Two projections of the same fact are asserted to AGREE in one case, on one sampled date, rather than each checked alone"

key-files:
  created: []
  modified:
    - src/lib/availability/open-capacity.ts
    - src/lib/availability/read-model.ts
    - tests/availability/open-capacity-readmodel.test.ts

key-decisions:
  - "The WR-02 envelope is reduced by calling the existing pure `openDayWindow` per row rather than re-deriving the next-day roll inside loadOpenDayWindow, so the `close <= open => next day` rule and the DST-safe TZDate construction stay defined in exactly one place"
  - "The CR-03 counter anchor (dayStartUtc/dayEndUtc/dateKey) is deliberately NOT moved to follow an overnight envelope — a pass running to 02:00 still counts against, and locks on, the date it opened on"
  - "OPEN_LOW_STOCK_MAX below 1 is refused (falls back to 5) rather than clamped up to 1, because a sub-1 ceiling is a typo and lowStockThreshold already clamps its own floor at 1"
  - "The NT-02 fix withdraws the month through the shipped `fullDates` channel and short-circuits BEFORE the aggregate query, so a mis-configured listing costs one fewer round trip rather than one more"
  - "Case 15 does NOT assert `bookable === false` on a zero-cap date: `bookable` is the past-date/horizon verdict about the WINDOW, not about capacity, and the CTA already requires both (`oc.bookable && oc.state !== \"full\"`)"

patterns-established:
  - "Pattern 1: a same-day fixture is the only way to observe an expiry defect — on a future date even a truncated closing instant is still ahead of the real clock, so a future-dated case goes green over a live defect"
  - "Pattern 2: when a symptom is hour-dependent (a hold born expired) but its cause is not (a truncated persisted ends_at), assert the CAUSE in persisted state as well as the symptom"

requirements-completed: [OPEN-04, OPEN-02]

# Metrics
duration: 38min
completed: 2026-08-01
---

# Phase 09 Plan 24: Read-model gap closure (WR-02 / WR-03 / NT-02) Summary

**A split shift that rolls past midnight now sells one pass covering the whole envelope and mints a payable hold; a mistyped `OPEN_LOW_STOCK_MAX` falls back to 5 instead of switching the scarcity signal off platform-wide; and a listing with no usable capacity offers no dates anywhere, so the month grid and the day panel can no longer disagree.**

## Performance

- **Duration:** 38 min
- **Started:** 2026-08-01T02:28Z+08 (venue-local Makati)
- **Completed:** 2026-08-01T03:06+08
- **Tasks:** 3 (plus a preceding branch-A gate commit)
- **Files modified:** 3

## Accomplishments

- **WR-02 closed.** `loadOpenDayWindow` selects every `(open_time, close_time)` row for the weekday and reduces the envelope over real instants. A gym storing Saturday as `06:00–12:00` **and** `18:00–02:00` now yields `06:00 → 02:00 next day` instead of collapsing to `06:00–12:00`.
- **WR-03 closed.** `OPEN_LOW_STOCK_MAX` is accepted only when finite and `>= 1`, floored to an integer; anything else falls back to the documented default of `5`. This makes **AR-16's PENDING precondition true** — the accepted-risk entry for **T-09-86** was filed on the rationale that the value is server-only *and* clamped; the server-only half was already true, the clamp half is now.
- **NT-02 closed.** `getOpenMonthAvailability` returns every venue-local date of the month in `fullDates` when `cap <= 0`, matching what `getOpenDay` has always said (`remaining = 0`, "Fully booked").
- **5 new DB-backed cases**, every one of them mutation-measured, and the phase's first case that asserts two projections **agree** rather than checking each alone.
- **No schema change and no migration** — `drizzle/` untouched, next number still **0023**.

## Task Commits

Each task was committed atomically:

1. **Branch A — the confirming gate** - `276535e` (test)
2. **Task 1: WR-02 — envelope over instants** - `6a972c5` (fix)
3. **Task 2: WR-03 — validated scarcity ceiling** - `11c9cd5` (fix)
4. **Task 3: NT-02 — month grid fails closed visibly** - `3fd06bb` (fix)

## Files Created/Modified

- `src/lib/availability/open-capacity.ts` — `loadOpenDayWindow` reduces over instants (`+orderBy`, per-row `openDayWindow`, earliest-open / latest-close reduction); `OPEN_LOW_STOCK_MAX` parse-then-validate.
- `src/lib/availability/read-model.ts` — `getOpenMonthAvailability` short-circuits a `cap <= 0` listing into a full month of `fullDates`.
- `tests/availability/open-capacity-readmodel.test.ts` — cases 12-16 plus the recorded mutation output in the file header (11 → 16 cases, 504 → 783 lines).

## Confirm-then-fix: the gate was written FIRST

All four assertions failed against **unchanged `src/`**, and that pre-fix state **is** the state the plan's mandated WR-02 mutation asks for ("restore the SQL `min()`/`max()` envelope"). Case 16 — the positive-cap control — stayed GREEN throughout, which is what makes case 15's red attributable to the cap branch rather than to the month grid breaking outright.

```
 Tests  4 failed | 12 passed (16)

[1/4] 12. covers the WHOLE envelope of a split shift that rolls past midnight (WR-02)
AssertionError: expected '2026-09-14T04:00:00.000Z' to be '2026-09-14T18:00:00.000Z' // Object.is equality
Expected: "2026-09-14T18:00:00.000Z"
Received: "2026-09-14T04:00:00.000Z"
 ❯ tests/availability/open-capacity-readmodel.test.ts:597:44

[2/4] 13. mints a PAYABLE hold on a same-day split shift — not one born expired (WR-02)
AssertionError: expected '2026-08-01T04:00:00.000Z' to be '2026-08-01T18:00:00.000Z' // Object.is equality
Expected: "2026-08-01T18:00:00.000Z"
Received: "2026-08-01T04:00:00.000Z"
 ❯ tests/availability/open-capacity-readmodel.test.ts:653:53

[3/4] 14. falls back to the documented ceiling when OPEN_LOW_STOCK_MAX is unusable (WR-03)
AssertionError: expected 'open' to be 'low' // Object.is equality
Expected: "low"
Received: "open"
 ❯ tests/availability/open-capacity-readmodel.test.ts:674:34

[4/4] 15. offers NO date at all when the cap is unusable — grid and panel agree (NT-02)
AssertionError: expected [] to deeply equal [ '2026-08-01', '2026-08-02', …(29) ]

- Expected
+ Received

- [
-   "2026-08-01",
-   "2026-08-02",
-   "2026-08-03",
-   "2026-08-04",
-   "2026-08-05",
-   "2026-08-06",
-   "2026-08-07",
-   "2026-08-08",
-   "2026-08-09",
-   "2026-08-10",
-   "2026-08-11",
-   "2026-08-12",
-   "2026-08-13",
-   "2026-08-14",
-   "2026-08-15",
-   "2026-08-16",
-   "2026-08-17",
-   "2026-08-18",
-   "2026-08-19",
-   "2026-08-20",
-   "2026-08-21",
-   "2026-08-22",
-   "2026-08-23",
-   "2026-08-24",
-   "2026-08-25",
-   "2026-08-26",
-   "2026-08-27",
-   "2026-08-28",
-   "2026-08-29",
-   "2026-08-30",
-   "2026-08-31",
- ]
+ []
 ❯ tests/availability/open-capacity-readmodel.test.ts:699:29
```

*(This is the full untouched dump the test-file header points at; the header elides the middle 27 identically-shaped lines for length and names the elision at the point of elision. Nothing describing a failure is elided.)*

### The artifact worth keeping: which assertion in case 13 went red, and which did not

`still_live` **PASSED under the defect.** The run happened at ~03:00 venue-local, and `expires_at = LEAST(now() + 15min, ends_at)` with `ends_at` = today's noon is still in the future at 3 AM. **The dead-hold symptom is hour-dependent; the truncated `ends_at` that causes it is not.** A case asserting only the expiry would therefore have gone green over a live defect for the first half of every day, and reported a pass. That is why case 13 asserts the persisted **envelope** as well as the persisted **expiry** — and it is a second instance of this phase's recurring lesson (09-16: "a test that takes a shortcut the user cannot take will confirm a claim the user will not experience"), here in the form "a test run at a lucky hour will confirm a claim the user will not experience".

The same reasoning fixes the fixture's shape: **case 13 has to be TODAY.** On a future date even the truncated noon is still ahead of the real clock, so the unpayable hold cannot form at all and a future-dated case would be green over a live defect at every hour.

## The mandated mutation, re-run explicitly against the landed fix

Per the plan's letter, the SQL `min()`/`max()` envelope was restored **after** the fix landed and the file re-run:

```
 Tests  2 failed | 14 passed (16)

[1/2] 12. covers the WHOLE envelope of a split shift that rolls past midnight (WR-02)
AssertionError: expected '2026-09-14T04:00:00.000Z' to be '2026-09-14T18:00:00.000Z' // Object.is equality
Expected: "2026-09-14T18:00:00.000Z"
Received: "2026-09-14T04:00:00.000Z"
 ❯ tests/availability/open-capacity-readmodel.test.ts:651:44

[2/2] 13. mints a PAYABLE hold on a same-day split shift — not one born expired (WR-02)
AssertionError: expected '2026-08-01T04:00:00.000Z' to be '2026-08-01T18:00:00.000Z' // Object.is equality
Expected: "2026-08-01T18:00:00.000Z"
Received: "2026-08-01T04:00:00.000Z"
 ❯ tests/availability/open-capacity-readmodel.test.ts:707:53
```

`04:00Z` is venue-local **noon** on the picked date, where the venue-local **02:00 of the next day** (`18:00Z`) was expected — the truncated envelope, exactly. **Cases 14 and 15 stayed GREEN under this mutation**, confirming the three fixes are genuinely independent and each individually revertible, as the plan claimed.

Restored: `git diff --exit-code src/` → **exit 0**, `git status --short` → **empty**.

## Decisions Made

1. **The envelope reuses `openDayWindow` per row rather than re-deriving the roll.** The plan asked for this and it is load-bearing: `rollsPastMidnight` and the TZDate/epoch normalisation now have exactly one definition, so the reduction in the read path cannot drift from what the claim path persists. The acceptance grep proves nothing carrying `rollsPastMidnight` or `TZDate` was deleted (`0`).
2. **The counter's anchor does not follow the envelope.** `dayStartUtc`/`dayEndUtc`/`dateKey` remain the venue-local calendar day. Case 12 asserts this explicitly (`dateKey === ymd(SPLIT_DAY)`, bounds exactly 24h) precisely so a future reader who "fixes" the apparent inconsistency re-opens CR-03 in a red test rather than in production.
3. **A sub-1 ceiling falls back to 5 rather than clamping to 1.** `OPEN_LOW_STOCK_MAX=0` and `OPEN_LOW_STOCK_MAX=-3` are typos, not intentions; `lowStockThreshold` already clamps its own floor at 1, so clamping here would silently honour a value nobody meant. Fail-to-default, never fail-to-off.
4. **The month short-circuit does not touch `monthPrefix`.** The dates are built directly in `YYYY-MM-DD` from the requested year/month, so the existing month filter and the unknown-listing `EMPTY_MONTH` path are byte-untouched (both acceptance greps print `0` deletions). The day count comes from `Date.UTC(year, month, 0)` — a pure Gregorian fact that needs no timezone, since which month a venue-local date belongs to is settled by construction.
5. **The WR-03 case drives the public functions.** `spotsState` **and** the shipped `getAvailability`, both re-imported under `vi.stubEnv` + `vi.resetModules` (the repo's existing idiom for a server-only constant — `tests/auth/secret-config.test.ts`, `tests/auth/email-dev-fallback.test.ts`). A test asserting on the constant would still pass if the fallback never reached `spotsState`.

## Deviations from Plan

### 1. [Design] Case 12 was split in two, so the unpayable-hold half is independently observable

- **Found during:** Task 1, at the first branch-A run.
- **Issue:** The plan specifies one case carrying the window assertion, the `bookable` assertion **and** the claim/expiry assertion. Written that way, the case aborts at its first failing assertion — so under the mutation the persisted-hold half produced **no output at all**, and the recorded evidence was one symptom where two exist.
- **Fix:** Split into case **12** (window + day panel, injected clock, deterministic at any hour) and case **13** (the same split shift on TODAY, driving the real claim and reading the row back). Both go red under the mutation, independently and with different messages.
- **Why this is stronger, not merely different:** the two halves fail for different reasons — 12 because the projection is wrong, 13 because the **persisted row** is wrong — and only 13 can distinguish "the calendar lies" from "the booking is unpayable". This is the same argument 09-20 made about its case 3 (only the case that reads the `booking` table back can say the claim leaked) and 09-21 made about its case 5.
- **Verification:** both cases red under the mutation, both green after restore; case 16 green throughout.

### 2. [Rule 1 - Bug, in the TEST] Case 15 dropped an over-reaching `bookable === false` assertion

- **Found during:** Task 3, first run after the read-model fix.
- **Issue:** The month-grid half of case 15 went green immediately, but my own extra assertion `expect(day.openCapacity?.bookable).toBe(false)` failed: `expected true to be false`. This was **my assertion being wrong, not the source**.
- **Analysis:** `bookable` is `!blocked && dayCloseUtc > now && isWithinHorizon(...)` — the server's **past-date / horizon** verdict about the window. It is deliberately *not* a capacity verdict: a genuinely saturated date carries `bookable: true` too (case 6, shipped, does not assert it), and the CTA is gated by **both** facts — `date-pass-picker.tsx:216` requires `oc.bookable && oc.state !== "full"`. Asserting it false would have demanded that the two facts be merged, which is the opposite of what this phase keeps learning (it is the same shape as 09-20's refusal to invent a fourth `SpotsState`).
- **Fix:** Replaced with `expect(day.openCapacity?.cap).toBe(0)` and a comment recording *why* `bookable` is not asserted here, so the next reader does not re-add it.
- **Files modified:** `tests/availability/open-capacity-readmodel.test.ts` only. **No source change was made to accommodate it** — the plan's success criterion "every UI component is byte-unchanged" holds, and `git diff --stat` on `availability-calendar.tsx`, `spots-left-chip.tsx`, `date-pass-picker.tsx` and `e2e/open-capacity.spec.ts` is empty.
- **Committed in:** `3fd06bb` (Task 3 commit).

---

**Total deviations:** 2 (1 test-design improvement, 1 Rule-1 fix to a test assertion I had written).
**Impact on plan:** No scope creep, no source change outside the three planned files, no relitigation of accepted design.

## Do-not-relitigate compliance

- `lowStockThreshold(cap) = clamp(floor(cap / 2), 1, OPEN_LOW_STOCK_MAX)` is **byte-identical** — the acceptance grep for the exact expression prints `1`. OC-11 / T-09-39 (invented urgency is a dark pattern) is untouched, and WR-03 was treated strictly as "the ceiling must be **parsed** safely", never as a question about what the formula computes.
- `e2e/open-capacity.spec.ts` case 2 — the mutation-measured pin on the intentionally invisible 3→2 transition — is byte-unchanged (`git diff --stat` empty).
- The `openBlockedSql` docblock's own rejection of a pass-window block rule "because it would make the grid and the panel disagree — the NT-02 class of bug" is now literally true of a *closed* NT-02 rather than an open one. No change was made there.

## Acceptance criteria

| Criterion | Result |
|---|---|
| `grep -c "sql<string \| null>"` open-capacity.ts | **0** (was 2) |
| `grep -c "orderBy(operatingHours.openTime)"` | **1** (was 0) |
| `grep -c "openDayWindow("` | **2** (>= 2) |
| `grep -c "return null; // venue closed"` | **1** |
| deleted lines matching `rollsPastMidnight\|TZDate` | **0** |
| `grep -c "Number.isFinite"` | **1** |
| `grep -c "export const OPEN_LOW_STOCK_MAX"` | **1** |
| `grep -c "Math.min(Math.max(Math.floor(cap / 2), 1), OPEN_LOW_STOCK_MAX)"` | **1** |
| `grep -c "NEXT_PUBLIC"` | **0** — the server-only rule is stated without spelling the token, following the shipped docblock's own convention |
| `grep -c "cap <= 0"` read-model.ts | **1** |
| `grep -c "maxOccupancy ?? 0"` | **2** — both fail-closed defaults exist and now agree |
| deleted lines matching `monthPrefix\|EMPTY_MONTH` | **0** |
| `git diff --stat` on the 4 UI/e2e files | **empty** |
| `git diff --exit-code src/` after mutation restore | **exit 0** |

Every acceptance grep in the plan was satisfiable in its load-bearing form. **No deviation was needed for a broken gate on this plan** — unlike 09-18/09-19/09-20/09-21, all 13 greps here are honest.

## Gates

- `npx vitest run tests/availability/open-capacity-readmodel.test.ts` → **16/16**
- `npx vitest run tests/availability tests/booking tests/search` → **498 tests / 53 files**, zero failures
- **Full suite** `npx vitest run` → **1079 passed / 4 skipped, ZERO failures** across 120 files. Baseline entering this plan was 1073 passed **+ 1 known failure** = 1074; 1074 + exactly these 5 new cases = 1079. **The known `date-pass-picker` case-4 multi-suite timeout (deferred item 3) did not reproduce this run** — the same thing 09-18 observed. Not chased, per instruction.
- `npx tsc --noEmit` → **0**
- `npm run lint` → **0 errors / 7 baseline warnings** (unchanged: 1 `react-hooks/incompatible-library` in `wizard.tsx`, 5 unused-arg warnings in `tests/helpers/mocks.ts`, 1 other — all pre-existing)
- `drizzle/` untouched; **next migration number still 0023**

## Issues Encountered

- **`bookable` vs `remaining` on a zero-cap date** — resolved as deviation 2 above: the test was wrong, the source was right.
- Nothing else. The DB was up (`docker compose exec -T db psql -U fitout -d fitout`), no package was installed, and no architectural question arose.

## Security

- **T-09-83** (a hold born already expired on a split-shift day) → **mitigated**. The envelope covers the true closing time, so `LEAST(now() + TTL, ends_at)` yields a live expiry; case 13 asserts the persisted `expires_at` is in the future **and** the persisted `ends_at` is the real closing instant.
- **T-09-84** (the OPEN-04 scarcity signal silently off from a config typo) → **mitigated**, driven through the public functions.
- **T-09-85** (a month grid offering dates the day panel refuses) → **mitigated**, with the two projections asserted to agree.
- **T-09-86 / AR-16** (an operator env value reaching arithmetic unvalidated) → the accepted-risk entry's **PENDING precondition is now satisfied**: the value is server-only (no browser-public prefix — grep `0`) **and** clamped to a finite integer >= 1. `09-SECURITY.md` should move AR-16 from PENDING to ACTIVE and close T-09-86.
- **T-09-SC** — no package was installed by this plan.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary. The only new external input surface — `OPEN_LOW_STOCK_MAX` — is the one this plan *bounds*.

## Known Stubs

None.

## User Setup Required

None — no external service configuration required. `OPEN_LOW_STOCK_MAX` remains optional; when unset it now provably resolves to `5`.

## Next Phase Readiness

- **Gap position: 8 of 9** (`09-17` … `09-25`). **One gap plan remains: `09-23`** — `findOwnOpenHold`'s `confirmed` branch (CR-06) and the unscoped `idempotency_key` arm (WR-01), both left explicitly open with pointer comments by 09-18 and re-stated in `units.ts`'s own docblock.
- `src/lib/availability/open-capacity.ts` is now stable for 09-23: that plan touches `findOwnOpenHold` in `units.ts` and needs nothing from this file beyond `OPEN_OCCUPYING_STATUS_SQL`, which is untouched here.
- After 09-23, all 14 findings in `09-REVIEW.md` are closed except NT-03 (the deliberate non-action), and the phase is ready for orchestrator-owned verification and close.

## Self-Check: PASSED

All four modified/created files exist on disk; all four commit hashes (`276535e`, `6a972c5`, `11c9cd5`, `3fd06bb`) resolve in `git log`.

---
*Phase: 09-open-capacity-bookings*
*Completed: 2026-08-01*
