---
phase: 07-bookings-management-cancellation-notifications
plan: 20
subsystem: ui
tags: [availability, formatMoney, intl, block-reason, jsdom, vitest, host-listings]

# Dependency graph
requires:
  - phase: 07-bookings-management-cancellation-notifications
    provides: "/host/listings/[id]/availability editor (owner-gated route), shared formatMoney (IN-02), BlocksEditor, HOST_CANCEL_BLOCK_REASON sentinel"
provides:
  - "Discoverable Availability link on the Your-listings card → /host/listings/[id]/availability (closes the T4-hours discoverability gap)"
  - "formatMoney pinned to two fraction digits everywhere (₱307.50, ₱300.00)"
  - "blockReasonLabel — pure mapper turning the host_cancellation sentinel into human copy, passing free text through trimmed"
affects: [group-bookings, notifications, host-earnings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional host-action props gate host-only card affordances (availabilityHref mirrors editHref) — search cards omit them"
    - "Pure directive-free lib module (block-reason.ts) re-labels a stored sentinel so a client component can import it without pulling a use-server graph"

key-files:
  created:
    - src/lib/availability/block-reason.ts
    - tests/listing/listing-card.test.tsx
    - tests/booking/money.test.ts
    - tests/availability/block-reason.test.ts
  modified:
    - src/components/listing/listing-card.tsx
    - src/app/(host)/host/listings/page.tsx
    - src/lib/money.ts
    - src/components/availability/blocks-editor.tsx
    - tests/payments/host-cancel.test.ts

key-decisions:
  - "T4-hours closed with a persistent Availability LINK from the Your-listings card, NOT by making operating hours a hard publish requirement (the heavier option touches the two-place publish gate and would strand hours-less published listings — deferred as a product decision)"
  - "blockReasonLabel duplicates the 'host_cancellation' literal rather than importing HOST_CANCEL_BLOCK_REASON, to keep the module free of cancel-booking.ts's use-server graph so the client blocks-editor can import it"

patterns-established:
  - "Money surfaces render two decimals unconditionally via the single shared formatMoney (minimumFractionDigits: 2)"

requirements-completed: [HOST-02, MANAGE-02]

# Metrics
duration: 11min
completed: 2026-07-24
---

# Phase 7 Plan 20: UAT Gap Closure (T4-hours / T7 / T9) Summary

**A discoverable Availability link on the Your-listings card, formatMoney pinned to two decimals everywhere, and human copy for the host-cancellation block label — the three Phase-7 UAT nits, closed red-first.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-07-24T04:20:43Z
- **Completed:** 2026-07-24T04:31:48Z
- **Tasks:** 3
- **Files modified:** 9 (4 created, 5 modified)

## Accomplishments

- **T4-hours** — the weekly-hours / availability editor at `/host/listings/[id]/availability` is now reachable directly from the Your-listings grid via a neutral `CalendarClock` "Availability" link next to Edit. The optional `availabilityHref` prop gates it: search cards (which omit it) render no such link. No gate touched — the target RSC keeps its session + canHost + IDOR-404 ownership check.
- **T7** — `formatMoney` no longer drops a trailing zero: `minimumFractionDigits` 0 → 2. `₱307.50` (not `₱307.5`) and `₱300.00` (not `₱300`) now render across the checkout summary, cancelled-state copy, the `refundLabel` notification payload, and the listing cards — one shared formatter, one fix.
- **T9** — the blocked-dates list shows "Cancelled by host" for a host-cancellation block instead of the raw enum `host_cancellation`, via a new pure `blockReasonLabel`. A host's own free-text reason still passes through, trimmed; blank reasons emit no ` · ` fragment.

## Task Commits

Each task was committed atomically:

1. **Task 1: discoverable Availability link on the Your-listings card (T4-hours)** — `6582fc9` (feat)
2. **Task 2: pin formatMoney to two fraction digits (T7)** — `d5a4863` (fix)
3. **Task 3: human copy for the host-cancellation block label (T9)** — `6e37158` (feat)

_Tasks 2 and 3 are TDD; each landed as a single commit bundling the RED-first test with its minimal fix (per-task atomicity)._

## Files Created/Modified

- `src/lib/availability/block-reason.ts` (created) — pure `blockReasonLabel(reason)`: sentinel → "Cancelled by host", free text → trimmed, blank → null.
- `tests/listing/listing-card.test.tsx` (created) — jsdom render test: link present with the prop, absent on a search card.
- `tests/booking/money.test.ts` (created) — pins the decimal substrings and both fallback paths.
- `tests/availability/block-reason.test.ts` (created) — the three `blockReasonLabel` behaviours.
- `src/components/listing/listing-card.tsx` — new `availabilityHref` prop + footer link; `hasActions` true when it is set.
- `src/app/(host)/host/listings/page.tsx` — passes `availabilityHref={`/host/listings/${r.id}/availability`}`.
- `src/lib/money.ts` — `minimumFractionDigits: 0` → `2`.
- `src/components/availability/blocks-editor.tsx` — renders `b.reason` through `blockReasonLabel`.
- `tests/payments/host-cancel.test.ts` — the one rippled assertion: `refundLabel` `"₱1,050"` → `"₱1,050.00"`.

## Decisions Made

- **T4-hours: link, not a publish gate.** Added a persistent Availability link from the listing-management surface rather than making operating hours a hard publish-checklist requirement. The forcing option touches the load-bearing two-place publish gate (07-15), would strand already-published hours-less listings, and needs a new "has hours" validation — a heavier product decision, deferred. The link solves the reported discoverability defect directly and touches no gate.
- **block-reason.ts duplicates the sentinel literal.** It hard-codes `"host_cancellation"` (commented as the mirror of `HOST_CANCEL_BLOCK_REASON` in cancel-booking.ts) instead of importing it, so the module stays free of the `"use server"` graph and the client `blocks-editor` can import it.

## Deviations from Plan

### Test-spec corrections (no source deviation)

**1. [Rule 1 - Bug] The plan's `formatMoney(30750, "zzz") → "307.50"` fallback example was factually wrong**
- **Found during:** Task 2 (formatMoney RED test)
- **Issue:** The plan's `<behavior>` claimed the unknown-currency case `"zzz"` exercises the catch fallback and yields a bare `"307.50"`. In reality `Intl.NumberFormat` does NOT reject the well-formed 3-letter code `"ZZZ"` — it renders it as the symbol (`"ZZZ 307.50"`), so the catch is never hit for `"zzz"`. Asserting `toBe("307.50")` would have been un-satisfiable after the fix.
- **Fix:** Split the case into two accurate ones — (a) `"zzz"` still renders two decimals via the Intl path (`/307\.50/`), preserving the "always 2 decimals" property; (b) a genuinely malformed code `"x"` (not 3 ASCII letters) makes Intl throw → the catch fallback returns the bare `"307.50"`, exercising the fallback the plan intended.
- **Files modified:** tests/booking/money.test.ts (test only; the one-line source fix is exactly as planned)
- **Verification:** money.test.ts green (6 cases); full suite green.
- **Committed in:** `d5a4863` (Task 2 commit)

**2. [Rule 1 - Robustness] listing-card test used native matchers, not jest-dom**
- **Found during:** Task 1 (listing-card RED test)
- **Issue:** The repo has no `@testing-library/jest-dom` setup (tests/setup.ts registers none), so `toHaveAttribute` is unavailable.
- **Fix:** Asserted via `container.querySelectorAll("a")` + `getAttribute("href")` and native vitest matchers, mirroring `tests/notifications/notification-render.test.tsx`. Also corrected the fixture's `primarySpaceType` to a valid `SpaceTypeValue` (`pickleball_court`) after tsc flagged it.
- **Files modified:** tests/listing/listing-card.test.tsx (test only)
- **Verification:** listing-card test green (2 cases); tsc clean.
- **Committed in:** `6582fc9` (Task 1 commit)

**T9(b) copy-spacing verify — no change needed.** Both the earnings fee-debt line (`src/app/(host)/host/earnings/page.tsx:169`) and `host-cancel-dialog.tsx:199` render `{amount} in cancellation fees` on a single line with the space intact behind their `{/* prettier-ignore */}` / single-line guards. No prettier re-wrap had collapsed the space, so — per the plan's "if and only if" clause — no `{" "}` was inserted and those files were left untouched.

---

**Total deviations:** 2 test-spec corrections (both Rule 1, test-only). No source deviation — every source change is exactly as planned.
**Impact on plan:** None on scope. The corrections make the tests match observable ICU behaviour and the repo's actual matcher set; the source fixes (one-line formatMoney, new pure module, prop + wiring) landed verbatim.

## Issues Encountered

- `Intl.NumberFormat` treats any well-formed 3-letter code as a valid currency and uses it as the symbol rather than throwing — surfaced by the RED money test and handled (see Deviation 1).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All three UAT nits (T4-hours discoverability, T7 money decimals, T9 block label) are closed. Full suite green: **81 files / 686 tests, exit 0**; tsc clean; eslint clean on touched files; env-prefixed `npm run build` exit 0.
- No new contracts or blockers. The deferred hard-publish-gate option for operating hours remains a product decision for a future plan if forcing is ever wanted.

## Self-Check: PASSED

- All 4 created files + 2 key modified files present on disk.
- All 3 task commits (`6582fc9`, `d5a4863`, `6e37158`) present in git log.

---
*Phase: 07-bookings-management-cancellation-notifications*
*Completed: 2026-07-24*
