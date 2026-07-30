---
phase: 09-open-capacity-bookings
plan: 02
subsystem: booking-correctness
tags: [postgres, advisory-lock, admissions-counter, pricing, drizzle, open-capacity, concurrency]

# Dependency graph
requires:
  - phase: 09-open-capacity-bookings
    plan: 01
    provides: "booking.open_capacity + listing.per_head_price_cents + the narrowed booking_no_overlap (without the narrow, the SECOND open row on a date is rejected 23P01)"
  - phase: 04-booking-flow
    provides: "createPendingHold's transaction idioms — 40P01 outer retry, in-tx listing read, D-42 own-hold pre-check, lazy-expiry sweep, DB-computed expiry, frozen-triple .returning()"
  - phase: 08-group-bookings
    provides: "seat-claim.ts's lock -> count-under-lock -> conditional-write shape (D-112) and booking.declared_pax"
provides:
  - "src/lib/availability/open-capacity.ts — THE single occupying predicate for open rows (openTakenSql / OPEN_OCCUPYING_STATUS_SQL), the OC-03 day window (openDayWindow + loadOpenDayWindow), the OC-11 threshold/state (lowStockThreshold, spotsState, OPEN_LOW_STOCK_MAX), and the OC-13 / past-date literals"
  - "quoteOpenCapacity — the OC-08 linear per-head freeze (perHead x heads, no duration term), plus OpenCapacityQuote / OpenCapacityQuoteInput types"
  - "createOpenCapacityHold — the per-(listing,date) advisory-lock admissions claim: min(requested, remaining) granted and REPORTED, sold-out refusal, one ordinary booking row"
  - "OpenHoldSuccess / OpenHoldResult / CreateOpenCapacityHoldInput — the claim's public contract"
affects: [09-03 race gate (drives this exact function), 09-04 read model (imports openTakenSql + spotsState), 09-05 search, 09-07 reserve/claim action, 09-10 day panel, 09-11 spots chip, 09-12 pricing surfaces]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Advisory-lock admissions counter: pg_advisory_xact_lock(hashtextextended(key)) as the FIRST in-tx statement, spanning sweep -> SUM -> INSERT, with zero external I/O inside the lock window"
    - "One-module occupancy predicate: the SQL fragment the claim counts is exported and imported, never re-inlined, so the read model cannot drift from the arbiter"
    - "Hold expiry capped at ends_at (not starts_at) for whole-session bookings — the D-94 invariant re-anchored to where the session actually ends"

key-files:
  created:
    - src/lib/availability/open-capacity.ts
    - tests/booking/open-capacity-pricing.test.ts
  modified:
    - src/lib/booking/pricing.ts
    - src/lib/availability/units.ts

key-decisions:
  - "The advisory lock is taken BEFORE the D-42 own-hold pre-check (the plan sketched the pre-check as step 0): the 'lock is the first in-tx statement' rule stays literal, and a replay observes the same serialized view as a fresh claim"
  - "A listing with NULL max_occupancy fails CLOSED to zero admissions (remaining = 0 - taken) rather than selling unbounded passes — the same fail-closed rule as createPendingHold's paxCap fallback"
  - "granted = Math.max(1, Math.floor(Math.min(requestedHeads, remaining))) — the floor keeps a crafted non-integer/non-positive body from reaching quoteOpenCapacity as a throw; remaining >= 1 at that point so the floor can never over-grant"
  - "quoteOpenCapacity's return/input shapes are NAMED types (OpenCapacityQuote / OpenCapacityQuoteInput) rather than inline literals — an inline multi-line return type put a column-0 `} {` inside the function, which broke the plan's own sed-based body greps"

patterns-established:
  - "Pattern: when a plan's acceptance grep counts an imported symbol, count CALL SITES (`grep -c 'sym('`) — a named import always adds one more matching line, so `grep -c 'sym'` == 1 is unsatisfiable"
  - "Pattern: a sed-extracted function body (`sed -n '/export function X/,/^}/p'`) stops at the FIRST column-0 `}` — multi-line inline return types silently truncate the range and make body greps lie"

requirements-completed: [OPEN-02, OPEN-03]

# Metrics
duration: 25min
completed: 2026-07-30
---

# Phase 9 Plan 02: The Open-Capacity Claim Summary

**`createOpenCapacityHold` — a per-`(listing, date)` admissions claim serialized by `pg_advisory_xact_lock`, counting a drift-free `SUM(declared_pax)` over an occupying predicate that exists in exactly one place in the codebase, granting and reporting `min(requested, remaining)`, and freezing a purely linear per-head price into ONE ordinary `booking` row.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-30T08:55:00Z
- **Completed:** 2026-07-30T09:20:00Z
- **Tasks:** 2
- **Files created/modified:** 4 (2 created, 2 modified)

## Accomplishments

- **The phase's one genuinely new correctness surface ships.** The claim takes a transaction-scoped advisory lock as its FIRST statement and holds it across sweep → SUM → INSERT, so the "count then insert" race CLAUDE.md forbids is closed by serialization rather than by hope. The lock auto-releases on commit *and* rollback (Pitfall 6), so a crashed claim can never wedge a date.
- **Pitfall 4 is structurally prevented, not merely documented.** `grep -rn "SUM(b.declared_pax)" src/ | wc -l` prints `1`. The claim imports `openTakenSql`; 09-04's read model, 09-05's search and the month map will import the same fragment. The calendar and the counter cannot disagree because there is only one predicate.
- **OC-07's partial fill is pre-money and always reported.** `granted` and `requested` both ride on the success result, so a caller can say "only 2 of the 4 you asked for are left" *before* a peso is quoted, and the frozen price is for the granted heads only. The PayMongo single-payer rail is untouched (OC-09).
- **A same-day drop-in pass is actually bookable.** The hold's `expires_at` caps at `ends_at`, not `starts_at`. This is the plan's flagged silent showstopper: a pass's `starts_at` is the venue's OPENING instant, so `LEAST(now() + 15m, starts_at)` would mint an already-expired hold for every claim made after the venue opened, and the booker could never reach checkout. Verified live — the returned `expiresAt` is a real future instant ≤ the closing instant.
- **The zero-JS-clock rule survived a 295-line addition.** `grep -c "new Date()\|Date.now()" src/lib/availability/units.ts` still prints `0`; both date guards (`day_open_ok`, `horizon_ok`), the expiry `LEAST(...)` and the lazy-expiry sweep are all SQL evaluated against the DB clock in the same transaction as the rows they gate.
- **The exclusive path is byte-unchanged.** The entire diff of `units.ts` is 295 insertions and **one** deletion — the `import { quoteWindow }` line widened to `import { quoteOpenCapacity, quoteWindow }`. `createPendingHold`, `findOwnActiveHold`, `pickLowestFreeUnit`, `createBooking` and `mapBookingError` are untouched.

## Task Commits

1. **Task 1: the shared open-capacity module + the linear per-head quote** — `40e7e88` (feat)
2. **Task 2: createOpenCapacityHold — the advisory-lock admissions claim** — `82fc07c` (feat)

**Plan metadata:** see the final `docs(09-02)` commit.

## Files Created/Modified

- `src/lib/availability/open-capacity.ts` (new, 172 lines) — `OPEN_OCCUPYING_STATUS_SQL` + `openTakenSql` (the ONE occupying predicate and its drift-free heads SUM), `openDayWindow` + `loadOpenDayWindow` (OC-03 date → UTC opening/closing instants, MIN(open)/MAX(close) so a split-shift day is one pass), `lowStockThreshold` / `spotsState` / `OPEN_LOW_STOCK_MAX` (OC-11, server-only), `SOLD_OUT_MESSAGE` + `PAST_DATE_MESSAGE`.
- `src/lib/booking/pricing.ts` — added `quoteOpenCapacity` (+ its two named types). `quoteWindow` and `paxSurcharge` untouched.
- `src/lib/availability/units.ts` — added the two-arbiter header paragraph, `findOwnOpenHold`, `createOpenCapacityHold`, and the `OpenHoldSuccess` / `OpenHoldResult` / `CreateOpenCapacityHoldInput` types.
- `tests/booking/open-capacity-pricing.test.ts` (new) — 18 pure assertions: the linear quote and both throw cases, the 09-UI-SPEC threshold table verbatim (cap 1→1, 2→1, 4→2, 6→3, 10→5, 40→5), the five `spotsState` cases, both `openDayWindow` cases (Manila 06:00–22:00 → `2026-08-07T22:00:00.000Z` / `2026-08-08T14:00:00.000Z`, and the after-midnight close rolling to Aug 9 Manila), and the OC-13 literal.

## The claim, in order (what a future reader needs)

| Step | What | Why it is where it is |
|------|------|-----------------------|
| 1 | `pg_advisory_xact_lock(hashtextextended(listing_id \|\| ':' \|\| dayOpenIso, 0))` | FIRST statement. Only same-date claimers contend (D-112's "per-parent-row lock is too coarse" answered without a physical capacity row). A hash collision only OVER-serializes two unrelated dates, so it is correctness-safe by construction. |
| 2 | D-42 own-hold pre-check (`findOwnOpenHold`) | Inside the lock. A double-click returns the SAME booking with the SAME granted heads (T-09-08). Occupying set drops `requested`/`approved` — open capacity is instant-only (OC-10). |
| 3 | In-tx lazy-expiry sweep, scoped to (listing, date) | A lapsed hold must leave the counted set inside THIS transaction. Always `cancelled` — there is no requested→declined branch to mirror. |
| 4 | One statement: cap + per-head rate + tier + `openTakenSql` SUM + `day_open_ok` + `horizon_ok` | Everything the grant depends on is read under the lock, on the DB clock, in one round trip. |
| 5 | `PAST_DATE_MESSAGE` on a closed/out-of-horizon date | Not a race loss, so no `soldOut` flag. The picker is a courtesy, never the gate (Security V4). |
| 6 | `remaining = (cap ?? 0) − taken`; 0 ⇒ `SOLD_OUT_MESSAGE` + `soldOut: true`; else `granted = min(requested, remaining)` | The clamp is the server's, from the DB's own SUM. A client number can only ever request LESS (T-09-05). |
| 7 | `quoteOpenCapacity` → `computeServiceFee` → ONE `.insert(booking).returning(...)` | `unit: 1` sentinel, `open_capacity: true`, `declared_pax: granted` **always**, `full_day: false`, `booking_mode: 'instant'`, D-67 tier snapshot, frozen triple read back out of the insert. |

## Verification Evidence

- `npx vitest run tests/booking/open-capacity-pricing.test.ts` → **18 passed**, exit 0.
- `npx tsc --noEmit` → exit 0.
- `npx vitest run tests/availability tests/booking tests/group` → **40 files / 415 tests passed**, exit 0 (exclusive path and the Phase-8 seat claim unregressed).
- `npm test` (full suite) → **98 files passed / 1 skipped; 879 tests passed / 4 skipped**, exit 0. Baseline at Phase-8 close was 861 passed / 4 skipped; +18 is exactly this plan's new test file.
- `npx eslint` on all four touched files → clean.
- Acceptance greps: `openTakenSql(` call sites in `units.ts` = **1**; `SUM(b.declared_pax)` in `units.ts` = **0**, in all of `src/` = **1**; `Just sold out` in `src/` = **1**; `pg_advisory_xact_lock` = **1**, `pg_advisory_lock(` = **0**; `new Date()\|Date.now()` in `units.ts` = **0**; `closeIso` inside the claim = **3**, `LEAST` capped on the opening instant = **0**; `NEXT_PUBLIC` in `open-capacity.ts` = **0**.

### Live-database smoke run (temporary, then deleted)

The plan assigns the genuine two-connection race proof to 09-03, but a throwaway integration test was run against the real containerised Postgres (isolated test schema, all 23 migrations replayed) so the claim's SQL was proven to execute rather than merely typecheck. Listing: `max_occupancy = 5`, `per_head_price_cents = 35000`, `unit_count = 1`.

| Case | Result |
|------|--------|
| booker A requests 3 | `granted 3`, `unit 1`, `space 105000`, `quoted 110250` (space + 5% D-74 fee), `expiresAt` a real Date ≤ the closing instant |
| booker B requests 4 with 2 left | `granted 2`, `requested 4` — the OC-07 partial fill, reported |
| booker C requests 1 at 0 remaining | `{ error: "Just sold out — pick another date.", soldOut: true }` |
| booker A re-submits the same date | `replayed: true`, `granted 3` — no second set of seats claimed |
| a date two days in the past | `{ error: "That day has already passed — pick another date." }` |
| an unknown listing id | `{ error: "That time was just taken. Pick another slot." }` (NoUnitAvailableError → mapBookingError, unchanged) |

The smoke file was deleted before the Task-2 commit — `git status` is clean apart from the pre-existing untracked `.claude/`.

## Deviations from Plan

### Auto-fixed / adjusted (no user decision required)

**1. [Rule 3 - Blocking] Lock-first vs. the plan's "step 0" own-hold pre-check**
- **Found during:** Task 2
- **Issue:** The plan numbers the D-42 own-hold pre-check as step 0 and then states the advisory lock is "the FIRST statement inside the transaction" — the two cannot both be literally true.
- **Fix:** The lock is taken first; the pre-check runs immediately after it, still inside the same transaction (which is what threat T-09-08 actually requires). Correctness-neutral for the replay, and it keeps the acceptance rule and the race-test mutation gate literal. A comment at the call site records the resolution.
- **Files modified:** `src/lib/availability/units.ts`
- **Commit:** `82fc07c`

**2. [Rule 2 - Missing critical guard] `max_occupancy IS NULL` fails CLOSED**
- **Found during:** Task 2
- **Issue:** `listing.max_occupancy` is nullable and the plan's `remaining = cap - taken` says nothing about a NULL cap. A NULL would make `remaining` NaN, and `Math.min(requested, NaN)` is NaN — the sold-out branch would not fire and the insert would carry a NaN head count.
- **Fix:** `const remaining = (cap ?? 0) - taken` — a listing with no recorded capacity sells zero passes, mirroring `createPendingHold`'s fail-closed `paxCap` fallback (units.ts:453). The 09-06 publish gate will make the column present for every open listing, so this is a defense-in-depth floor, not a live path.
- **Files modified:** `src/lib/availability/units.ts`
- **Commit:** `82fc07c`

**3. [Rule 2 - Missing critical guard] Head-count shape floor before the quote**
- **Found during:** Task 2
- **Issue:** `quoteOpenCapacity` throws on a non-integer/non-positive head count (correct), but a crafted `requestedHeads` of `0` or `2.5` reaching it would surface as a re-thrown 500 rather than a clean result.
- **Fix:** `granted = Math.max(1, Math.floor(Math.min(input.requestedHeads, remaining)))`. `remaining >= 1` is already guaranteed at that line, so the floor can never over-grant. The literal `Math.min(input.requestedHeads, remaining)` the acceptance criteria greps for is preserved verbatim inside it.
- **Files modified:** `src/lib/availability/units.ts`
- **Commit:** `82fc07c`

**4. [Rule 3 - Blocking] Named types for `quoteOpenCapacity` (the plan's inline return type broke its own greps)**
- **Found during:** Task 1
- **Issue:** The plan's prescribed signature spells the return type inline across five lines, ending in a column-0 `} {`. `sed -n '/export function quoteOpenCapacity/,/^}/p'` stops at that brace, so the plan's own body greps (`DISPLAY_CURRENCY` = 1, `hours` = 0) read an EMPTY body — `DISPLAY_CURRENCY` printed `0`.
- **Fix:** Extracted `OpenCapacityQuote` and `OpenCapacityQuoteInput` as named exported types; the signature is now one line and the sed range covers the real body. Behaviour identical; the greps now print `1` and `0` as intended.
- **Files modified:** `src/lib/booking/pricing.ts`
- **Commit:** `40e7e88`

### Unsatisfiable acceptance criteria (reworded, intent preserved — the 09-01 precedent)

**5. `grep -c "NEXT_PUBLIC" src/lib/availability/open-capacity.ts` prints `0`** — but the same task prescribes a comment containing the literal `NEXT_PUBLIC_`. The comment was reworded to "it must NEVER be given a browser-public env prefix"; the meaning and the D-75 citation are intact and the grep tripwire stays usable for 09-04 / 09-11, which re-assert it.

**6. `grep -c "openTakenSql" src/lib/availability/units.ts` prints `1`** — unsatisfiable with a named import: the import statement and the call site are always two distinct lines (the actual count is 3, the third being the comment that names the fragment). The criterion's INTENT — imported, never copied, exactly one call site — is verified instead by `grep -c "openTakenSql(" src/lib/availability/units.ts` = **1** and `grep -c "SUM(b.declared_pax)" src/lib/availability/units.ts` = **0**. Later plans should use the `sym(` form when counting call sites of an imported symbol.

## Known Stubs

None. Every export in this plan is fully wired and exercised: `openTakenSql` by the claim, `quoteOpenCapacity` by the claim and the unit test, `openDayWindow` by the unit test, and `loadOpenDayWindow` / `spotsState` / `lowStockThreshold` / `OPEN_LOW_STOCK_MAX` by the unit test pending their 09-04 (read model) and 09-11 (chip) consumers — they are shared primitives this plan is contracted to *provide*, not deferred work.

## Threat Register Status

| Threat ID | Disposition | How it is met in the shipped code |
|-----------|-------------|-----------------------------------|
| T-09-05 | mitigated | `granted` is `min(requested, remaining)` where `remaining` comes from `listing.max_occupancy` and the DB's own SUM, both read inside the locked transaction. |
| T-09-06 | mitigated | `quoteOpenCapacity` takes `per_head_price_cents` from the in-tx `listing` row; `CreateOpenCapacityHoldInput` has no amount field at all; the frozen triple is read back off `.returning()`. |
| T-09-07 | mitigated | Transaction-scoped advisory lock as the first statement, spanning sweep → SUM → INSERT. **Proof is 09-03's job** — this plan ships the code that test drives. |
| T-09-08 | mitigated | `findOwnOpenHold` runs inside the same transaction and returns the same booking with `replayed: true`; `booking_idem_uq` remains the DB backstop. |
| T-09-09 | mitigated | Only local SQL inside the critical section (grep for `fetch(`/`emitNotify` inside the claim = 0); transaction-scoped release on rollback. |
| T-09-10 | mitigated | No stored counter — `remaining` is a live SUM behind the in-tx sweep, so a cancelled booking or a lapsed hold frees its heads with no worker and no release code. |

## Self-Check: PASSED

All four source files and this SUMMARY exist on disk; both task commits (`40e7e88`, `82fc07c`) are present in `git log`.

## Notes for Future Plans

- **09-03 (race gate):** drive `createOpenCapacityHold` over `makeRacingClients`. The mutation kill is deleting the `SELECT pg_advisory_xact_lock(...)` statement — nothing in the schema objects to its removal, which is exactly why the test must exist. Note the claim needs a listing with `max_occupancy` set; a NULL cap now fails closed to sold-out and would make a race test pass for the wrong reason.
- **09-04 (read model):** import `openTakenSql` and `spotsState` from `@/lib/availability/open-capacity` — do NOT re-implement either. `remaining = cap − taken`, `state = spotsState(remaining, cap)`.
- **09-07 (claim action):** the sold-out branch is a RETURN VALUE (`{ error, soldOut: true }`), not a thrown error — do not route it through `mapBookingError`. The `granted` vs `requested` pair is what the OC-07 "only N left, continue?" copy keys off.
- **09-13 (`updateDeclaredPax`):** D-126 refuses open bookings outright; the head count is fixed at claim time because a re-price that does not re-enter this locked claim is both an overbook and a price-tamper vector.
- The claim deliberately has **no lead-time guard** (`MIN_LEAD_INSTANT_MINUTES` is not applied): a drop-in pass is bookable while the venue is open, which is the entire point of the product. The only time gate is `day_open_ok` (the venue has not closed yet).
