---
phase: 07-bookings-management-cancellation-notifications
plan: 02
subsystem: ui
tags: [date-fns, tz, lucide, shadcn, booking-lifecycle, refactor, tdd]

# Dependency graph
requires:
  - phase: 04-booking-core-search-no-payment
    provides: windowHours / the frozen quotedTotalCents (D-49) the fullDay re-derivation reads
  - phase: 05-payments-payouts
    provides: derivePayoutLedgerView / PayoutStateBadge — the pure-derivation + badge-recipe shape cloned here
  - phase: 06-full-booking-payment-integration
    provides: the three duplicated composeWhenLabel call sites and the requested/approved status vocabulary
provides:
  - "composeWhenLabel / composeWhenLabelShort — the SINGLE venue-local booking-window formatter"
  - "deriveDisplayStatus — read-time derived `completed` (D-102), never stored"
  - "deriveBookingStatusView — the exhaustive, side-specific booking status view"
  - "BookingStatusBadge — the icon+text lifecycle badge shared by both sides"
affects: [07-05, 07-06, 07-09, 07-10, 07-11, 07-12, 07-13, bookings-views, cancellation, notifications, reminders]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One shared pure formatter per display concern — a fourth copy is forbidden (07-RESEARCH § Don't Hand-Roll)"
    - "Pure, directive-free derivation modules callable from RSCs, server actions AND Inngest functions"
    - "Exhaustive switch with no fallthrough clause so a new enum value is a compile error"

key-files:
  created:
    - src/lib/booking/when-label.ts
    - src/components/booking/booking-status.ts
    - src/components/booking/booking-status-badge.tsx
    - tests/booking/when-label.test.ts
    - tests/booking/booking-status.test.ts
  modified:
    - src/app/actions/host-requests.ts
    - src/inngest/functions/request-expiry.ts
    - src/app/(host)/host/requests/page.tsx

key-decisions:
  - "Task 1 gained a test file (tests/booking/when-label.test.ts) not listed in the plan's files_modified — the task carries tdd=\"true\" and a <behavior> block, which cannot be honoured without one"
  - "host-requests.ts keeps a tiny local whenLabelInput(row) projection rather than repeating the six-field object literal at both call sites; the FORMATTER is shared, only the row→input projection is local"
  - "Header comments were reworded to avoid the literal tokens \"use client\", \"default:\" and a second \"Full day\" so the plan's grep-based acceptance criteria hold literally as written"

patterns-established:
  - "Venue-local time: every new time surface imports composeWhenLabel / composeWhenLabelShort — never re-inlines the tz+fullDay derivation"
  - "Booking status: every surface renders from deriveBookingStatusView; `now` is passed in from the DB clock, never Date.now() inside the module"
  - "D-79 badge grammar: the badge returns ONLY the badge; refund detail is a caller-composed sibling line"

requirements-completed: [MANAGE-01, MANAGE-02, HOST-02]

# Metrics
duration: 10min
completed: 2026-07-21
---

# Phase 7 Plan 02: Shared Time Formatter & Booking Status Derivation Summary

**One venue-local `{date}, {time} ({City} time)` formatter replacing three verbatim duplicates, plus the pure exhaustive booking-status derivation and icon+text badge that all Phase-7 booking surfaces render from.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-21T17:19:00Z
- **Completed:** 2026-07-21T17:29:00Z
- **Tasks:** 2 (both TDD: RED → GREEN)
- **Files modified:** 8 (5 created, 3 modified)

## Accomplishments

- **Killed the triplicate time formatter.** `composeWhenLabel` existed verbatim in `host-requests.ts:122-133`, `request-expiry.ts:144-155` and `host/requests/page.tsx:84-97`. All three are deleted and now import `@/lib/booking/when-label`. Phase 7's ~6 new time surfaces have exactly one place to import from.
- **Pinned the format before moving it.** The RED test asserts the exact output strings (`Thursday, Jul 2, 8:00 AM – 10:00 AM (Makati time)`, the `Full day` fallback, the omitted city suffix, the EN dash, the `EEEE` vs `EEE` split) so the refactor is provably byte-identical rather than assumed to be.
- **Built the single status source of truth.** `deriveDisplayStatus` implements D-102 — a `confirmed` booking whose `endsAt` has passed derives as `completed` at read time, never stored, so the `completed` enum value stays unused and the GiST `EXCLUDE` predicate is untouched. Proven AT the boundary (`endsAt === now` → completed) and proven to apply to `confirmed` only.
- **Locked the badge grammar.** `deriveBookingStatusView` is an exhaustive switch with no fallthrough clause — a new `booking_status` enum value becomes a compile error here. `success` is returned for `confirmed` alone; no label contains a currency symbol or a digit (D-79, fuzz-asserted across every status × side × time).

## Task Commits

1. **Task 1 (RED): failing test for the shared formatter** — `2766f7b` (test)
2. **Task 1 (GREEN): extract the venue-local when-label formatter** — `bd07474` (refactor)
3. **Task 2 (RED): failing test for the status derivation** — `ad71d54` (test)
4. **Task 2 (GREEN): status derivation + badge** — `0a205be` (feat)

## Files Created/Modified

- `src/lib/booking/when-label.ts` (new) — `composeWhenLabel` / `composeWhenLabelShort`; pure/isomorphic, no directive. Owns venue-tz rendering, the `fullDay` re-derivation from the frozen quote, and the city-suffix rule.
- `src/components/booking/booking-status.ts` (new) — `deriveDisplayStatus` (D-102) + `deriveBookingStatusView` (side-specific, exhaustive). No directive, server-callable.
- `src/components/booking/booking-status-badge.tsx` (new) — `BookingStatusBadge`; per-display-status `BADGE_RECIPES`, icon + text, `bg-success` on the `confirmed` recipe only.
- `tests/booking/when-label.test.ts` (new) — 9 assertions pinning the exact rendered strings.
- `tests/booking/booking-status.test.ts` (new) — 16 assertions: boundary, side labels, tone reservation, no-money-in-badge.
- `src/app/actions/host-requests.ts` (mod) — local formatter deleted; imports the shared one via a `whenLabelInput(row)` projection.
- `src/inngest/functions/request-expiry.ts` (mod) — duplicate deleted from `sendDeclinedNotice`; now calls the shared formatter.
- `src/app/(host)/host/requests/page.tsx` (mod) — inline derivation in `displayRows.map` replaced with `composeWhenLabelShort`.

## Decisions Made

- **Added an unplanned test file for Task 1.** The task is `tdd="true"` with a `<behavior>` block but lists no test file in `<files>`. A TDD gate needs a RED commit, so `tests/booking/when-label.test.ts` was created. It is also the only thing that makes "behaviour must be byte-identical" a checkable claim rather than an assertion.
- **A local row→input projection, not a local formatter.** `host-requests.ts` calls the shared formatter from two places (approve + decline); rather than repeat the six-field object literal, it keeps a one-expression `whenLabelInput(row)` helper. The formatting logic is fully shared — only the ORM-row projection is local, which is the point of the structural `WhenLabelInput` type.
- **Comment wording bent to the acceptance greps.** Three of the plan's grep criteria (`use client` → 0, `default:` → 0, `Full day` → 1) were initially violated by *header comments* describing the rules, not by code — the same way the `commission.ts` pattern file would fail its own criterion. Comments were reworded (e.g. "carries NO client and NO server directive", "no fallthrough clause") to preserve the documented intent while making the assertions literally true.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added the Task-1 TDD test file**
- **Found during:** Task 1
- **Issue:** Task 1 is marked `tdd="true"` and specifies behaviours, but no test file appears in its `<files>` list — the RED gate had no artifact and the "byte-identical refactor" claim had no proof.
- **Fix:** Created `tests/booking/when-label.test.ts` (9 assertions) and committed it as the RED gate before the extraction.
- **Files modified:** `tests/booking/when-label.test.ts`
- **Verification:** Failed with "Cannot find package '@/lib/booking/when-label'" pre-implementation; 9/9 pass post-implementation.
- **Committed in:** `2766f7b`

**2. [Rule 1 - Bug] Header comments broke three grep-based acceptance criteria**
- **Found during:** Tasks 1 and 2
- **Issue:** `grep -c "use client"` returned 1, `grep -c "Full day"` returned 2, and `grep -c "default:"` returned 1 — all from explanatory header/doc comments, not from code. The criteria are the plan's mechanical proof of T-07-07 (no client directive) and of switch exhaustiveness; leaving them failing would have made those controls unverifiable.
- **Fix:** Reworded the offending comments while preserving their meaning.
- **Files modified:** `src/lib/booking/when-label.ts`, `src/components/booking/booking-status.ts`
- **Verification:** All three greps now return the specified counts; `tsc`, `eslint` and both suites re-run green.
- **Committed in:** `bd07474`, `0a205be`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both were necessary to make the plan's own verification meaningful. No scope creep — no behaviour was added beyond the plan's interfaces.

## Unverified — Blocked on Database

The local Postgres container is down (Docker engine stuck initializing; `docker info` hangs). Plan 07-01's migrations are committed to source but **not applied to a live database**. Every DB-dependent test fails at connection (`ECONNREFUSED ::1:5432` / `127.0.0.1:5432`), not at assertion.

**These gates were NOT run and must NOT be treated as passed:**

```bash
# Task 1 <verify> — the full suites (10 of 14 files are DB-backed and did not execute)
npx vitest run tests/booking tests/payments

# The two files that specifically regression-test the refactored call sites:
npx vitest run tests/booking/request-expiry.test.ts      # exercises sendDeclinedNotice → composeWhenLabel
npx vitest run tests/booking/request-lifecycle.test.ts   # exercises approve/decline → composeWhenLabel

# Full-suite confirmation
npx vitest run
```

**What this leaves unproven:** the refactor is verified as a *pure function* (exact strings pinned by the new unit test) but the *integration path* — a real DB row projected onto `WhenLabelInput` and rendered inside the Inngest email step — did not execute. `request-expiry.test.ts:138` asserts `{ status: "declined", emailed: true }`, and `sendDeclinedNotice` swallows its own exceptions, so a throw introduced by the projection would surface there as `emailed: false` and nowhere else. That is the single most valuable unrun assertion in this plan.

**Also unrun (pre-existing, unrelated to this plan):** `tests/auth/rate-limit.test.ts` and `tests/auth/secret-config.test.ts` time out at 5000 ms because Better Auth boot blocks on the same unreachable Postgres. Neither imports anything this plan touched.

**Non-DB gates — all executed and green:**

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0, whole project) |
| `npx eslint` on all 5 touched source files + 2 test files | PASS (no output) |
| `npx vitest run tests/booking/when-label.test.ts` | PASS — 9/9 |
| `npx vitest run tests/booking/booking-status.test.ts` | PASS — 16/16 |
| `npx vitest run tests/booking/pricing.test.ts` | PASS (shared `windowHours` unaffected) |
| `npx vitest run tests/payments/commission.test.ts` | PASS |
| All Task-1 acceptance greps (6) | PASS |
| All Task-2 acceptance greps (7) | PASS |

Full-suite tally with the DB down: **20 test files passed, 39 failed — every failure a connection error or a connection-induced timeout.**

## Issues Encountered

- **Grep-vs-comment collision (resolved).** Documented above as deviation 2. Worth noting for future plans: acceptance criteria of the form `grep -c "use client" … returns 0` conflict with the repo's own convention of *documenting* the no-directive rule in the header. The pattern file this plan clones (`payout-ledger-status.ts`) would itself fail that grep. Future plans should either assert on the first line (`head -1`) or accept the comment.

## User Setup Required

None for this plan — but **the environment blocker stands**: Docker Desktop's engine must come up and `npm run db:migrate` must apply 07-01's migrations before the DB-backed gates above can run.

## Next Phase Readiness

- **Wave 2-4 unblocked.** `deriveBookingStatusView` / `BookingStatusBadge` are the single status source of truth for `/bookings`, `/host/bookings` and `/bookings/[id]`; `composeWhenLabel` / `composeWhenLabelShort` are the single time formatter for the cancel review, notification payloads and all four reminder emails. Both interfaces match the plan's `<interfaces>` block verbatim, so downstream plans can consume them as written.
- **One contract downstream callers must honour:** `now` is a required parameter on both status functions and must come from the DB clock (`SELECT now()`), never `Date.now()`. The module deliberately cannot source it itself (T-07-10).
- **Carry the unrun gates forward.** The two integration files listed above should be run as soon as Postgres is back, before any Wave-2 plan builds on the refactored call sites.

## Self-Check: PASSED (resolved — see addendum)

All claimed artifacts and commits verified present:

- FOUND: `src/lib/booking/when-label.ts`, `src/components/booking/booking-status.ts`, `src/components/booking/booking-status-badge.tsx`, `tests/booking/when-label.test.ts`, `tests/booking/booking-status.test.ts`
- FOUND: commits `2766f7b`, `bd07474`, `ad71d54`, `0a205be`

**Originally recorded FAILED** — not for a missing artifact, but because the plan's Task-1 `<verify>` block (`npx vitest run tests/booking tests/payments`) could not execute against a live database. Per the environment handling rule, an unrun required gate is never recorded as passed.

### Addendum — gate resolved by the orchestrator (2026-07-21)

Docker was recovered and plan 07-01's migration applied, so the owed gate was run rather than left outstanding:

- `npx vitest run tests/booking` — first run surfaced **1 failure**, `tests/booking/request-lifecycle.test.ts:671`, asserting a hardcoded 23–25h approval window. Traced to plan 07-01's D-95 change of `APPROVAL_PAYMENT_WINDOW_HOURS` from 24 → 12, **not** to this plan's refactor. Fixed by 07-01 in `d98da80`, which made the assertion read the constant instead of a literal.
- The specific integration exposure this SUMMARY called out — `tests/booking/request-expiry.test.ts:138` asserting `{ status: "declined", emailed: true }`, the one path where a projection throw inside `sendDeclinedNotice` would be swallowed and surface nowhere else — **executed and passed**.
- Full suite after Wave 1: **59 files / 401 tests, all passing**, clean working tree.

The `tests/auth/` failures noted below were the same dead-DB boot timeouts and now pass. Self-check flipped to PASSED on that evidence.

### Correction to this SUMMARY's closing notes

The two items recorded as unresolved — "07-01 has no SUMMARY.md on disk" and "its migration is unapplied" — were true when written and are now both resolved. 07-01 completed with `07-01-SUMMARY.md` and `Self-Check: PASSED`. The Blockers section this plan added to STATE.md has been cleared by the orchestrator.

---
*Phase: 07-bookings-management-cancellation-notifications*
*Completed: 2026-07-21*
